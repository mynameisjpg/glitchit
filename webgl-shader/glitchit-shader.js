/**
 * Glitchit — Untitled.jpg WebGL Shader Engine
 * Standalone, dependency-free WebGL fragment shader implementation.
 *
 * Architecture:
 * - Data corruption pixel clusters plotted behind distortions and textures
 * - Asymmetric horizontal slice tearing with diverse thicknesses (thin, med, thick)
 * - Calibrated Zine Contrast Threshold (50% is now 100% max)
 * - Ordered 4x4 Bayer dithering
 * - Gritty archival paper texture & CRT scanlines
 */

const DEFAULT_CLUSTER_SPRITES = [
  // [x, y, w, h] on 3000x1500 cluster sheet
  // Checkerboards & Halftone Blocks
  [460, 1196, 496, 304], [1548, 76, 544, 192], [1204, 1084, 264, 288],
  [2596, 708, 296, 216], [2588, 76, 304, 160], [0, 1380, 284, 120],
  [1844, 348, 272, 104], [2700, 1172, 240, 104],
  // Horizontal Transmission Bars & Bursts
  [44, 844, 600, 104], [308, 604, 528, 64], [524, 1084, 376, 88],
  [892, 132, 448, 32], [1060, 380, 424, 32], [2692, 444, 308, 40],
  [1132, 164, 208, 56], [1580, 804, 176, 48],
  // Vertical Barcode Columns
  [1876, 548, 136, 320], [964, 844, 96, 200], [2524, 4, 56, 304],
  [2172, 1028, 40, 288], [2092, 1108, 48, 224], [396, 1068, 72, 136],
  [2444, 708, 32, 216], [1284, 844, 56, 112],
  // Stepped Byte Blocks & Pixel Constellations
  [2700, 1172, 240, 104], [1668, 1260, 200, 104], [2660, 972, 152, 128],
  [76, 76, 160, 104], [692, 316, 176, 80], [652, 844, 104, 104],
  [1988, 1060, 96, 104], [1980, 1268, 120, 80]
];

class GlitchitShader {
  constructor(canvas, options = {}) {
    if (!canvas) {
      throw new Error('A valid HTML5 canvas element must be provided.');
    }

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
      rgbShift: options.rgbShift !== undefined ? options.rgbShift : 0.35,   // 0 to 1
      clusters: options.clusters !== undefined ? options.clusters : 0.5,     // 0 to 1
      threshold: options.threshold !== undefined ? options.threshold : 0.0, // 0 to 1
      // Hex colors for 2-tone duotone mode
      colorShadow: options.colorShadow || '#101010',
      colorHighlight: options.colorHighlight || options.colorAccent || '#E84A5F',
    };

    this.image = null;
    this.texture = null;
    this.clusterTexture = null;
    this.program = null;
    this.uniforms = {};

    this._initWebGL();
    this._initClusterTexture();
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
      uniform float u_clusters;      // Data corruption pixel clusters 0.0 to 1.0
      uniform float u_threshold;     // Zine Contrast Threshold 0.0 to 1.0

      uniform vec3 u_col_shadow;
      uniform vec3 u_col_highlight;

      uniform sampler2D u_cluster_sheet;
      uniform vec4 u_cluster_pos[12];
      uniform vec4 u_cluster_src[12];
      uniform vec3 u_cluster_col[12];
      uniform int u_num_clusters;

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

        // --- 1. ASYMMETRIC HORIZONTAL SLICE TEARING (HAIRLINES + MED + CHUNKY BANDS) ---
        // Calibrated: 20% fewer bands, diverse thickness.
        // Level 0: 2-3 bands (thin & med). Level 10: 10-15 bands (5% thick, 25% med, 70% thin).
        float sliceFlash = 0.0;
        
        // A. Thin hairline slices (1 to 4 px)
        float hairlineCount = u_resolution.y * 0.28;
        float hairlineIdx = floor(uv.y * hairlineCount);
        float hairlineRand = hash11(hairlineIdx + u_seed * 17.31);
        float thinThreshold = 1.0 - (0.015 + normDist * 0.045);
        if (hairlineRand > thinThreshold) {
          float hShift = (hash11(hairlineRand * 43.19) - 0.5) * (0.008 + normDist * 0.045);
          uv.x = clamp(uv.x + hShift, 0.0, 1.0);
          if (hairlineRand > 0.98 && normDist > 0.2) sliceFlash = 0.3;
        }

        // B. Medium displacement bands (6 to 18 px)
        float medBandCount = 35.0;
        float medIdx = floor(uv.y * medBandCount);
        float medRand = hash11(medIdx + u_seed * 29.13);
        float medThreshold = 1.0 - (0.028 + normDist * 0.08);
        if (medRand > medThreshold) {
          float mShift = (hash11(medRand * 61.47) - 0.5) * (0.015 + normDist * 0.07);
          uv.x = clamp(uv.x + mShift, 0.0, 1.0);
          if (medRand > 0.96 && normDist > 0.3) sliceFlash = 0.6;
        }

        // C. Thick chunky macro band (25 to 60 px) - only at higher distortion levels
        if (normDist > 0.40) {
          float band1Center = fract(u_seed * 0.382 + 0.23);
          float band1HalfH = mix(0.015, 0.038, normDist);
          if (abs(uv.y - band1Center) < band1HalfH) {
            float b1Shift = (hash11(floor(band1Center * 100.0) + u_seed) > 0.5 ? 1.0 : -1.0) * (0.03 + normDist * 0.08);
            uv.x = clamp(uv.x + b1Shift, 0.0, 1.0);
            sliceFlash = 1.0;
          }
        }

        // --- 2. DISCRETE 2D MACROBLOCK SHIFTING ---
        if (normDist > 0.16) {
          vec2 blockGrid = floor(v_uv * vec2(12.0, 18.0));
          float blockNoise = hash21(blockGrid + u_seed * 4.19);
          if (blockNoise > (1.0 - normDist * 0.28)) {
            float bShiftX = (hash11(blockNoise * 17.31) - 0.5) * (0.03 + normDist * 0.09);
            uv.x = clamp(uv.x + bShiftX, 0.0, 1.0);
          }
        }

        // --- 3. AUTHENTIC DATA CORRUPTION CLUSTER SAMPLING ---
        // Sampled at displaced uv so horizontal slice tears naturally slice cleanly through them.
        vec4 clusterOverlay = vec4(0.0);
        if (u_clusters > 0.005) {
          for (int i = 0; i < 12; i++) {
            if (i >= u_num_clusters) break;
            vec4 cpos = u_cluster_pos[i];
            if (uv.x >= cpos.x && uv.x < (cpos.x + cpos.z) &&
                uv.y >= cpos.y && uv.y < (cpos.y + cpos.w)) {
              vec2 localUV = (uv - cpos.xy) / cpos.zw;
              vec4 csrc = u_cluster_src[i];
              vec2 sheetUV = csrc.xy + localUV * csrc.zw;
              vec4 sTex = texture2D(u_cluster_sheet, sheetUV);
              if (sTex.a > 0.25) {
                clusterOverlay = vec4(u_cluster_col[i], 1.0);
                break;
              }
            }
          }
        }

        // --- 4. CHROMATIC ABERRATION (VIGNETTE RGB CHANNEL SPLIT) ---
        // Dialed down ~20% (0.015 multiplier), stronger towards borders than center
        vec2 toCenter = uv - vec2(0.5);
        float vig = clamp(dot(toCenter, toCenter) * 3.0, 0.05, 1.0);
        float rgbOffsetAmount = (0.001 + normDist * 0.015) * u_rgb_shift * vig;
        vec2 rUv = vec2(clamp(uv.x + rgbOffsetAmount, 0.0, 1.0), uv.y);
        vec2 gUv = uv;
        vec2 bUv = vec2(clamp(uv.x - rgbOffsetAmount, 0.0, 1.0), uv.y);

        float r = texture2D(u_image, rUv).r;
        float g = texture2D(u_image, gUv).g;
        float b = texture2D(u_image, bUv).b;
        vec3 color = vec3(r, g, b);

        if (clusterOverlay.a > 0.5) {
          color = clusterOverlay.rgb;
        }

        if (sliceFlash > 0.5) {
          color = clamp(color * 1.30 + vec3(0.18), 0.0, 1.0);
        } else if (sliceFlash > 0.2) {
          color = clamp(color * 1.15 + vec3(0.08), 0.0, 1.0);
        }

        float chromaFringe = abs(r - b);

        // --- 5. COLOR TREATMENT (2-TONE DUOTONE VS COLOR + S-CURVE + CALIBRATED THRESHOLD) ---
        // Threshold calibrated so 100% matches previous 50% max level (0.47 factor)
        float tVal = u_threshold * 0.47;

        if (u_mode == 0) {
          float lum = dot(color, vec3(0.299, 0.587, 0.114));

          lum = clamp(lum, 0.0, 1.0);
          lum = (lum - 0.5) * 1.35 + 0.5;
          lum = clamp(lum, 0.0, 1.0);
          lum = lum * lum * (3.0 - 2.0 * lum);

          if (u_threshold > 0.005) {
            float low = 0.5 - (1.0 - tVal) * 0.5;
            float high = 0.5 + (1.0 - tVal) * 0.5;
            lum = smoothstep(low, high, lum);
          }

          if (u_dither > 0.01) {
            float bayer = bayer4(gl_FragCoord.xy) - 0.5;
            lum = clamp(lum + bayer * (0.24 * u_dither), 0.0, 1.0);
          }

          color = mix(u_col_shadow, u_col_highlight, lum);

          if (u_rgb_shift > 0.01) {
            vec3 fringeColor = vec3(1.0, 0.23, 0.31);
            float fringeAmount = chromaFringe * (0.16 * u_rgb_shift);
            color = mix(color, fringeColor, clamp(fringeAmount * 3.5, 0.0, 0.32));
          }
        } else {
          if (u_threshold > 0.005) {
            vec3 low = vec3(0.5 - (1.0 - tVal) * 0.5);
            vec3 high = vec3(0.5 + (1.0 - tVal) * 0.5);
            color = smoothstep(low, high, color);
          } else {
            color = clamp((color - 0.5) * (1.18 + normDist * 0.25) + 0.5, 0.0, 1.0);
          }

          if (u_dither > 0.01) {
            float bayer = bayer4(gl_FragCoord.xy) - 0.5;
            color = clamp(color + bayer * (0.15 * u_dither), 0.0, 1.0);
          }
        }

        // --- 6. GRITTY ARCHIVAL PAPER TEXTURE (ZERO WHITE DOTS) ---
        float paperGrain = (hash21(gl_FragCoord.xy + fract(u_seed)) - 0.5) * (0.05 + 0.06 * normDist);
        float rollerTooth = (hash11(gl_FragCoord.x + u_seed * 7.7) - 0.5) * (0.02 + 0.03 * normDist);
        color = clamp(color + vec3(paperGrain + rollerTooth), 0.0, 1.0);

        // --- 7. INTERLACED CRT SCANLINES ---
        if (u_scanlines > 0.01) {
          float scanline = sin(gl_FragCoord.y * 1.5) * 0.5 + 0.5;
          float scanDim = mix(1.0, 0.78, scanline * u_scanlines);
          color *= scanDim;
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const vs = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`WebGL Program Link Error: ${err}`);
    }

    this.program = program;

    // Quad geometry covering [-1, -1] to [1, 1]
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
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations lookup
    this.uniforms = {
      image: gl.getUniformLocation(program, 'u_image'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      distortion: gl.getUniformLocation(program, 'u_distortion'),
      mode: gl.getUniformLocation(program, 'u_mode'),
      seed: gl.getUniformLocation(program, 'u_seed'),
      scanlines: gl.getUniformLocation(program, 'u_scanlines'),
      dither: gl.getUniformLocation(program, 'u_dither'),
      rgbShift: gl.getUniformLocation(program, 'u_rgb_shift'),
      clusters: gl.getUniformLocation(program, 'u_clusters'),
      threshold: gl.getUniformLocation(program, 'u_threshold'),
      colShadow: gl.getUniformLocation(program, 'u_col_shadow'),
      colHighlight: gl.getUniformLocation(program, 'u_col_highlight'),
      clusterSheet: gl.getUniformLocation(program, 'u_cluster_sheet'),
      clusterPos: gl.getUniformLocation(program, 'u_cluster_pos'),
      clusterSrc: gl.getUniformLocation(program, 'u_cluster_src'),
      clusterCol: gl.getUniformLocation(program, 'u_cluster_col'),
      numClusters: gl.getUniformLocation(program, 'u_num_clusters'),
    };
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error (${type === gl.VERTEX_SHADER ? 'VS' : 'FS'}): ${err}`);
    }

    return shader;
  }

  loadSource(imageSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.image = img;
        this.canvas.width = img.naturalWidth || img.width;
        this.canvas.height = img.naturalHeight || img.height;

        this._uploadTexture(img);
        this.render();
        resolve(this);
      };

      img.onerror = (e) => reject(new Error('Failed to load image source. Check path or CORS settings.'));

      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else if (imageSource instanceof HTMLImageElement) {
        img.src = imageSource.src;
      } else {
        reject(new Error('Unsupported image source type. Pass a URL string or HTMLImageElement.'));
      }
    });
  }

  _uploadTexture(image) {
    const gl = this.gl;
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    this.texture = texture;
  }

  _initClusterTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Initial 1x1 transparent placeholder pixel
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    this.clusterTexture = texture;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.clusterTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      if (this.image) {
        this.render();
      }
    };

    if (typeof CLUSTER_SHEET_DATA !== 'undefined' && CLUSTER_SHEET_DATA) {
      img.src = CLUSTER_SHEET_DATA;
    } else {
      img.src = '../references/clusters-white.png';
    }
  }

  _computeClusters() {
    const clustersVal = parseFloat(this.params.clusters !== undefined ? this.params.clusters : 0.5);
    if (clustersVal <= 0.005) {
      return { numClusters: 0, pos: new Float32Array(48), src: new Float32Array(48), col: new Float32Array(36) };
    }

    const sprites = (typeof CLUSTER_SPRITES !== 'undefined' && CLUSTER_SPRITES) ? CLUSTER_SPRITES : DEFAULT_CLUSTER_SPRITES;
    const seed = parseFloat(this.params.seed || 42.0);
    let s = (Math.abs(Math.floor(seed * 1000)) % 2147483647) || 1;
    const nextRng = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const range = (min, max) => min + nextRng() * (max - min);

    // Categorized pools
    const checkerboards = sprites.filter(sp => (sp[2]/sp[3]) >= 0.9 && (sp[2]/sp[3]) <= 3.0 && (sp[2]*sp[3]) >= 8000);
    const horizBars = sprites.filter(sp => (sp[2]/sp[3]) >= 3.5 && sp[2] >= 120);
    const vertBars = sprites.filter(sp => (sp[2]/sp[3]) <= 0.6 && sp[3] >= 60);
    const mediumBlocks = sprites.filter(sp => 0.7 <= (sp[2]/sp[3]) && (sp[2]/sp[3]) <= 2.5 && 3000 <= (sp[2]*sp[3]) && (sp[2]*sp[3]) < 25000);

    const pool = [];
    const pickN = (arr, n) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(nextRng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, n);
    };

    pool.push(...pickN(checkerboards, 2));
    pool.push(...pickN(horizBars, 3));
    pool.push(...pickN(vertBars, 2));
    pool.push(...pickN(mediumBlocks, 3));

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(nextRng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const numClusters = Math.min(12, Math.max(1, Math.round(clustersVal * 9)));
    const chosen = pool.slice(0, numClusters);
    chosen.sort((a, b) => (b[2]*b[3]) - (a[2]*a[3]));

    const pos = new Float32Array(48);
    const src = new Float32Array(48);
    const col = new Float32Array(36);

    const canvasW = this.canvas.width || 800;
    const canvasH = this.canvas.height || 600;

    const colorPalette = [
      [1.0, 0.12, 0.24], // Vivid Crimson
      [0.0, 0.92, 1.0],  // Vivid Cyan
      [1.0, 0.88, 0.08], // Technical Yellow
      [1.0, 1.0, 1.0],   // Pure White
      [0.12, 1.0, 0.43]  // Digital Green
    ];

    for (let i = 0; i < chosen.length; i++) {
      const sp = chosen[i];
      const sx = sp[0], sy = sp[1], sw = sp[2], sh = sp[3];
      const aspect = sw / sh;

      // Source in normalized sheet UV (3000 x 1500)
      src[i * 4 + 0] = sx / 3000.0;
      src[i * 4 + 1] = sy / 1500.0;
      src[i * 4 + 2] = sw / 3000.0;
      src[i * 4 + 3] = sh / 1500.0;

      let twNorm;
      if (aspect > 4.0) {
        twNorm = range(0.12, 0.28);
      } else if (aspect < 0.6) {
        twNorm = range(0.025, 0.07);
      } else {
        twNorm = range(0.08, 0.18);
      }

      let thNorm = Math.max(0.01, (twNorm / aspect) * (canvasW / canvasH));
      if (thNorm > 0.32) {
        thNorm = 0.32;
        twNorm = Math.max(0.01, (thNorm * aspect) * (canvasH / canvasW));
      }

      const bxNorm = range(0.0, Math.max(0.0, 1.0 - twNorm));
      const byNorm = range(0.0, Math.max(0.0, 1.0 - thNorm));

      pos[i * 4 + 0] = bxNorm;
      pos[i * 4 + 1] = byNorm;
      pos[i * 4 + 2] = twNorm;
      pos[i * 4 + 3] = thNorm;

      if (this.params.mode === 'duotone') {
        col[i * 3 + 0] = 1.0;
        col[i * 3 + 1] = 1.0;
        col[i * 3 + 2] = 1.0;
      } else {
        const c = colorPalette[Math.floor(nextRng() * colorPalette.length)];
        col[i * 3 + 0] = c[0];
        col[i * 3 + 1] = c[1];
        col[i * 3 + 2] = c[2];
      }
    }

    return { numClusters: chosen.length, pos, src, col };
  }

  setParams(newParams = {}) {
    Object.assign(this.params, newParams);
    this.render();
  }

  render() {
    if (!this.image || !this.program) return;

    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.image, 0);

    if (this.clusterTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.clusterTexture);
      gl.uniform1i(this.uniforms.clusterSheet, 1);
    }

    gl.uniform2f(this.uniforms.resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(this.uniforms.distortion, parseFloat(this.params.distortion));
    gl.uniform1i(this.uniforms.mode, this.params.mode === 'color' ? 1 : 0);
    gl.uniform1f(this.uniforms.seed, parseFloat(this.params.seed || 42.0));
    gl.uniform1f(this.uniforms.scanlines, parseFloat(this.params.scanlines !== undefined ? this.params.scanlines : 0.65));
    gl.uniform1f(this.uniforms.dither, parseFloat(this.params.dither !== undefined ? this.params.dither : 0.45));
    gl.uniform1f(this.uniforms.rgbShift, parseFloat(this.params.rgbShift !== undefined ? this.params.rgbShift : 0.35));
    gl.uniform1f(this.uniforms.clusters, parseFloat(this.params.clusters !== undefined ? this.params.clusters : 0.5));
    gl.uniform1f(this.uniforms.threshold, parseFloat(this.params.threshold || 0.0));

    const shadowRgb = this._hexToRgb(this.params.colorShadow || '#101010');
    const highlightRgb = this._hexToRgb(this.params.colorHighlight || '#E84A5F');

    gl.uniform3f(this.uniforms.colShadow, shadowRgb[0], shadowRgb[1], shadowRgb[2]);
    gl.uniform3f(this.uniforms.colHighlight, highlightRgb[0], highlightRgb[1], highlightRgb[2]);

    const clusterData = this._computeClusters();
    gl.uniform1i(this.uniforms.numClusters, clusterData.numClusters);
    gl.uniform4fv(this.uniforms.clusterPos, clusterData.pos);
    gl.uniform4fv(this.uniforms.clusterSrc, clusterData.src);
    gl.uniform3fv(this.uniforms.clusterCol, clusterData.col);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  toDataURL(format = 'image/png', quality = 1.0) {
    return this.canvas.toDataURL(format, quality);
  }

  rerollSeed() {
    this.setParams({ seed: Math.random() * 1000.0 });
  }
}

if (typeof window !== 'undefined') {
  window.GlitchitShader = GlitchitShader;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GlitchitShader };
}
