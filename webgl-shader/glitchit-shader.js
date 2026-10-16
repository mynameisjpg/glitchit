/**
 * ==============================================================================
 * GLITCHIT — REAL-TIME WEBGL GLITCH ART SHADER & RENDERER
 * Aesthetic: [ Untitled.jpg ] Editorial Digital Surrealism × Computational Psychophysics
 * Authors: Juan Pablo Giusepponi (@mynameisjpg) & Antigravity
 * ==============================================================================
 */

export class GlitchitRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: false }) ||
              canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true, alpha: false });

    if (!this.gl) {
      throw new Error('WebGL is not supported on this browser/hardware.');
    }

    // Default configuration matching Untitled.jpg's design tokens
    this.params = {
      distortion: options.distortion !== undefined ? options.distortion : 5, // 0 to 10
      mode: options.mode || 'duotone', // 'duotone' or 'color'
      seed: options.seed !== undefined ? options.seed : 42.0,
      scanlines: options.scanlines !== undefined ? options.scanlines : 0.65, // 0 to 1
      dither: options.dither !== undefined ? options.dither : 0.45,       // 0 to 1
      rgbShift: options.rgbShift !== undefined ? options.rgbShift : 0.75,   // 0 to 1
      // 4 Key Visual Signatures
      grid: options.grid !== undefined ? options.grid : 0.0,             // 0 to 1
      waveform: options.waveform !== undefined ? options.waveform : 0.0, // 0 to 1
      threshold: options.threshold !== undefined ? options.threshold : 0.0, // 0 to 1
      boxes: options.boxes !== undefined ? options.boxes : 0.0,          // 0 to 1
      // Hex colors for 2-tone duotone mode
      colorShadow: options.colorShadow || '#101010',
      colorHighlight: options.colorHighlight || options.colorAccent || '#E84A5F',
    };

    this.image = null;
    this.texture = null;
    this.program = null;
    this.uniforms = {};

    this._initWebGL();
  }

  _hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return [
      ((bigint >> 16) & 255) / 255.0,
      ((bigint >> 8) & 255) / 255.0,
      (bigint & 255) / 255.0
    ];
  }

  _initWebGL() {
    const gl = this.gl;

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        // Map quad from [-1, 1] to UV [0, 1] with Y flipped for canvas convention
        v_uv = vec2((a_position.x + 1.0) * 0.5, (1.0 - a_position.y) * 0.5);
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 v_uv;

      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_distortion;   // 0.0 to 10.0
      uniform int u_mode;           // 0 = Duotone, 1 = Color
      uniform float u_seed;
      uniform float u_scanlines;     // Intensity 0.0 to 1.0
      uniform float u_dither;        // Intensity 0.0 to 1.0
      uniform float u_rgb_shift;     // Intensity 0.0 to 1.0

      // 4 Key Visual Signatures
      uniform float u_grid;          // Cartesian Grid 0.0 to 1.0
      uniform float u_waveform;      // Oscilloscope Waveform 0.0 to 1.0
      uniform float u_threshold;     // Zine Contrast Threshold 0.0 to 1.0
      uniform float u_boxes;         // Specimen Boxes 0.0 to 1.0

      uniform vec3 u_col_shadow;
      uniform vec3 u_col_highlight;

      // 1D / 2D Hash & Noise Functions
      float hash11(float p) {
        p = fract(p * 0.1031);
        p *= p + 33.33;
        p *= p + p;
        return fract(p);
      }

      float hash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      // 4x4 Bayer Dither Matrix
      float bayer4(vec2 p) {
        int x = int(mod(p.x, 4.0));
        int y = int(mod(p.y, 4.0));
        int index = x + y * 4;
        
        if (index == 0) return 0.0 / 16.0;
        if (index == 1) return 8.0 / 16.0;
        if (index == 2) return 2.0 / 16.0;
        if (index == 3) return 10.0 / 16.0;
        if (index == 4) return 12.0 / 16.0;
        if (index == 5) return 4.0 / 16.0;
        if (index == 6) return 14.0 / 16.0;
        if (index == 7) return 6.0 / 16.0;
        if (index == 8) return 3.0 / 16.0;
        if (index == 9) return 11.0 / 16.0;
        if (index == 10) return 1.0 / 16.0;
        if (index == 11) return 9.0 / 16.0;
        if (index == 12) return 15.0 / 16.0;
        if (index == 13) return 7.0 / 16.0;
        if (index == 14) return 13.0 / 16.0;
        return 5.0 / 16.0;
      }

      void main() {
        vec2 uv = v_uv;
        float normDist = clamp(u_distortion / 10.0, 0.0, 1.0);

        // --- 1. MACROBLOCK 2D CHUNK DISPLACEMENT (FROM BENCHMARKS) ---
        if (normDist > 0.08) {
          vec2 blockGrid = floor(v_uv * vec2(16.0, 24.0));
          float blockNoise = hash21(blockGrid + u_seed * 4.19);
          if (blockNoise > (1.0 - normDist * 0.40)) {
            float bShiftX = (hash11(blockNoise * 17.31) - 0.5) * (0.04 + normDist * 0.14);
            float bShiftY = (hash11(blockNoise * 31.7) - 0.5) * (0.01 + normDist * 0.04);
            uv = clamp(uv + vec2(bShiftX, bShiftY), 0.0, 1.0);
          }
        }

        // --- 2. VERTICAL PIXEL MELTING / DROP STREAKS ---
        if (normDist > 0.12) {
          float colRand = hash11(floor(v_uv.x * 52.0) + u_seed * 8.37);
          if (colRand > (1.0 - normDist * 0.26)) {
            float dropStart = hash11(colRand * 43.19);
            if (v_uv.y > dropStart) {
              uv.y = mix(uv.y, dropStart, 0.78);
            }
          }
        }

        // --- 3. HORIZONTAL SLICE DISPLACEMENT (MULTI-SCALE TEARING) ---
        float sliceFlash = 0.0;
        if (normDist > 0.02) {
          float sliceCount = mix(16.0, 56.0, normDist);
          float sliceIndex = floor(uv.y * sliceCount);
          float sliceRand = hash11(sliceIndex + u_seed * 13.37);
          float tearThreshold = 1.0 - (normDist * 0.72);
          if (sliceRand > tearThreshold) {
            float shiftMagnitude = (hash11(sliceRand * 91.13) - 0.5) * 2.0;
            float tearOffset = shiftMagnitude * (0.015 + normDist * 0.11);
            uv.x = clamp(uv.x + tearOffset, 0.0, 1.0);
            if (sliceRand > 0.90 && normDist > 0.15) {
              sliceFlash = 1.0;
            }
          }
        }

        // --- 4. CHROMATIC ABERRATION (RGB CHANNEL SPLIT) ---
        float rgbOffsetAmount = (0.002 + normDist * 0.042) * u_rgb_shift;
        vec2 rUv = vec2(clamp(uv.x + rgbOffsetAmount, 0.0, 1.0), uv.y);
        vec2 gUv = uv;
        vec2 bUv = vec2(clamp(uv.x - rgbOffsetAmount, 0.0, 1.0), uv.y);

        float r = texture2D(u_image, rUv).r;
        float g = texture2D(u_image, gUv).g;
        float b = texture2D(u_image, bUv).b;
        vec3 color = vec3(r, g, b);

        // Highlight scan bar flash (from reference imagery)
        if (sliceFlash > 0.5) {
          color = clamp(color * 1.45 + vec3(0.22), 0.0, 1.0);
        }

        // --- 5. COLOR TREATMENT (2-TONE DUOTONE VS COLOR + SIGNATURE 3: ZINE THRESHOLDING) ---
        if (u_mode == 0) {
          float lum = dot(color, vec3(0.299, 0.587, 0.114));
          
          // Signature 3: High-Contrast Zine Thresholding
          if (u_threshold > 0.01) {
            float tVal = u_threshold * 0.94;
            float low = 0.5 - (1.0 - tVal) * 0.5;
            float high = 0.5 + (1.0 - tVal) * 0.5;
            lum = smoothstep(low, high, lum);
          } else {
            lum = smoothstep(0.04, 0.96, lum);
          }

          if (u_dither > 0.01) {
            float bayer = bayer4(gl_FragCoord.xy) - 0.5;
            lum = clamp(lum + bayer * (0.22 * u_dither), 0.0, 1.0);
          }

          // Strict 2-Tone Palette Interpolation: Shadow -> Highlight
          color = mix(u_col_shadow, u_col_highlight, lum);
        } else {
          if (u_threshold > 0.01) {
            float tVal = u_threshold * 0.94;
            vec3 low = vec3(0.5 - (1.0 - tVal) * 0.5);
            vec3 high = vec3(0.5 + (1.0 - tVal) * 0.5);
            color = smoothstep(low, high, color);
          } else {
            color = smoothstep(vec3(0.02), vec3(0.98), color);
          }

          if (u_dither > 0.01) {
            float bayer = bayer4(gl_FragCoord.xy) - 0.5;
            color = clamp(color + bayer * (0.14 * u_dither), 0.0, 1.0);
          }
        }

        // --- 6. PHOTOCOPY / FILM NOISE & DUST ---
        if (normDist > 0.04) {
          float grain = (hash21(gl_FragCoord.xy + fract(u_seed)) - 0.5) * (0.15 * normDist);
          color = clamp(color + vec3(grain), 0.0, 1.0);
        }

        // --- 7. INTERLACED CRT SCANLINES ---
        if (u_scanlines > 0.01) {
          float scanline = sin(gl_FragCoord.y * 1.5) * 0.5 + 0.5;
          float scanDim = mix(1.0, 0.80, scanline * u_scanlines);
          color *= scanDim;
        }

        // --- SIGNATURE 1: Cartesian Grids & Tech Schematics ---
        if (u_grid > 0.01) {
          float gridSize = max(24.0, min(u_resolution.x, u_resolution.y) / 16.0);
          vec2 gridCoord = mod(gl_FragCoord.xy, gridSize);
          float lineX = step(gridCoord.x, 1.0);
          float lineY = step(gridCoord.y, 1.0);
          float isLine = max(lineX, lineY);

          // 5px crosshairs at intersections
          float isCross = (step(gridCoord.x, 3.0) + step(gridSize - 3.0, gridCoord.x)) * step(abs(gridCoord.y - 0.5), 1.0)
                        + (step(gridCoord.y, 3.0) + step(gridSize - 3.0, gridCoord.y)) * step(abs(gridCoord.x - 0.5), 1.0);
          float gridFactor = clamp(isLine * 0.28 + isCross * 0.65, 0.0, 1.0) * u_grid;
          vec3 gridCol = (u_mode == 0) ? u_col_highlight : vec3(1.0);
          color = mix(color, gridCol, gridFactor);
        }

        // --- SIGNATURE 2: Oscilloscope Waveforms ---
        if (u_waveform > 0.01) {
          float waveY = u_resolution.y * 0.58;
          float pulseCenter = fract(u_seed * 0.37 + 0.42);
          float pulseDist = abs(v_uv.x - pulseCenter);
          float pulse = exp(-pulseDist * pulseDist * 320.0) * sin((v_uv.x - pulseCenter) * 120.0) * (u_resolution.y * 0.16);
          float carrier = sin(v_uv.x * 24.0 + u_seed) * (u_resolution.y * 0.02);
          float targetY = waveY + pulse + carrier;
          float distToWave = abs(gl_FragCoord.y - targetY);
          float waveLine = smoothstep(1.5, 0.0, distToWave) * u_waveform * 0.85;
          vec3 waveCol = (u_mode == 0) ? u_col_highlight : vec3(1.0, 0.25, 0.35);
          color = mix(color, waveCol, waveLine);
        }

        // --- SIGNATURE 4: Window / Specimen Frame Cascades ---
        if (u_boxes > 0.01) {
          vec2 b1_min = vec2(0.14, 0.18) * u_resolution;
          vec2 b1_max = vec2(0.54, 0.66) * u_resolution;
          vec2 b2_min = vec2(0.44, 0.38) * u_resolution;
          vec2 b2_max = vec2(0.86, 0.82) * u_resolution;

          vec2 p = gl_FragCoord.xy;
          float inB1 = step(b1_min.x, p.x) * step(p.x, b1_max.x) * step(b1_min.y, p.y) * step(p.y, b1_max.y);
          float edgeB1 = inB1 * max(
            step(p.x - b1_min.x, 1.0) + step(b1_max.x - p.x, 1.0),
            step(p.y - b1_min.y, 1.0) + step(b1_max.y - p.y, 1.0)
          );
          float inB2 = step(b2_min.x, p.x) * step(p.x, b2_max.x) * step(b2_min.y, p.y) * step(p.y, b2_max.y);
          float edgeB2 = inB2 * max(
            step(p.x - b2_min.x, 1.0) + step(b2_max.x - p.x, 1.0),
            step(p.y - b2_min.y, 1.0) + step(b2_max.y - p.y, 1.0)
          );
          float boxLines = clamp(edgeB1 + edgeB2, 0.0, 1.0) * u_boxes * 0.80;
          vec3 boxCol = (u_mode == 0) ? u_col_highlight : vec3(0.96);
          color = mix(color, boxCol, boxLines);
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compile error: ' + info);
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error('Program link error: ' + info);
    }

    this.program = program;
    gl.useProgram(program);

    // Setup full-screen quad buffer [-1, 1]
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    this.uniforms = {
      image: gl.getUniformLocation(program, 'u_image'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      distortion: gl.getUniformLocation(program, 'u_distortion'),
      mode: gl.getUniformLocation(program, 'u_mode'),
      seed: gl.getUniformLocation(program, 'u_seed'),
      scanlines: gl.getUniformLocation(program, 'u_scanlines'),
      dither: gl.getUniformLocation(program, 'u_dither'),
      rgbShift: gl.getUniformLocation(program, 'u_rgb_shift'),
      grid: gl.getUniformLocation(program, 'u_grid'),
      waveform: gl.getUniformLocation(program, 'u_waveform'),
      threshold: gl.getUniformLocation(program, 'u_threshold'),
      boxes: gl.getUniformLocation(program, 'u_boxes'),
      colShadow: gl.getUniformLocation(program, 'u_col_shadow'),
      colHighlight: gl.getUniformLocation(program, 'u_col_highlight'),
    };

    // Create 2D Texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /**
   * Load an image from an HTMLImageElement, File, Blob, or URL string
   * @param {HTMLImageElement|File|Blob|string} source
   * @returns {Promise<HTMLImageElement>}
   */
  async loadImage(source) {
    let img;
    if (source instanceof HTMLImageElement && source.complete) {
      img = source;
    } else if (source instanceof HTMLCanvasElement) {
      img = source;
    } else if (source instanceof File || source instanceof Blob) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('FileReader failed to read the image file.'));
        reader.readAsDataURL(source);
      });
      img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to decode image file.'));
        img.src = dataUrl;
      });
    } else if (typeof source === 'string') {
      img = new Image();
      if (!source.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.src = source;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image from URL.'));
      });
    } else {
      throw new Error('Unsupported image source type.');
    }

    this.image = img;
    this.canvas.width = img.naturalWidth || img.width;
    this.canvas.height = img.naturalHeight || img.height;

    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    this.render();
    return img;
  }

  /**
   * Update distortion parameters and re-render
   * @param {Object} newParams
   */
  setParams(newParams = {}) {
    Object.assign(this.params, newParams);
    this.render();
  }

  /**
   * Render the glitched frame onto the canvas
   */
  render() {
    if (!this.image || !this.gl || !this.program) return;

    const gl = this.gl;
    gl.useProgram(this.program);

    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.distortion, parseFloat(this.params.distortion));
    gl.uniform1i(this.uniforms.mode, this.params.mode === 'color' ? 1 : 0);
    gl.uniform1f(this.uniforms.seed, parseFloat(this.params.seed));
    gl.uniform1f(this.uniforms.scanlines, parseFloat(this.params.scanlines));
    gl.uniform1f(this.uniforms.dither, parseFloat(this.params.dither));
    gl.uniform1f(this.uniforms.rgbShift, parseFloat(this.params.rgbShift));
    gl.uniform1f(this.uniforms.grid, parseFloat(this.params.grid || 0.0));
    gl.uniform1f(this.uniforms.waveform, parseFloat(this.params.waveform || 0.0));
    gl.uniform1f(this.uniforms.threshold, parseFloat(this.params.threshold || 0.0));
    gl.uniform1f(this.uniforms.boxes, parseFloat(this.params.boxes || 0.0));

    const shadowRgb = this._hexToRgb(this.params.colorShadow);
    const highlightRgb = this._hexToRgb(this.params.colorHighlight || this.params.colorAccent || '#E84A5F');

    gl.uniform3f(this.uniforms.colShadow, shadowRgb[0], shadowRgb[1], shadowRgb[2]);
    gl.uniform3f(this.uniforms.colHighlight, highlightRgb[0], highlightRgb[1], highlightRgb[2]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.image, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Export the current glitched output to data URL or Blob
   * @param {string} [format='image/png']
   * @param {number} [quality=0.95]
   * @returns {string} dataURL
   */
  exportDataURL(format = 'image/png', quality = 0.95) {
    this.render();
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * Export to downloadable Blob
   * @param {string} [format='image/png']
   * @param {number} [quality=0.95]
   * @returns {Promise<Blob>}
   */
  exportBlob(format = 'image/png', quality = 0.95) {
    this.render();
    return new Promise((resolve) => {
      this.canvas.toBlob(resolve, format, quality);
    });
  }

  destroy() {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
      this.gl.deleteTexture(this.texture);
    }
  }
}

if (typeof window !== 'undefined') {
  window.GlitchitRenderer = GlitchitRenderer;
}
