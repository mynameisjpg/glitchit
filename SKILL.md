---
name: glitchit
description: Transform, edit, distort, or generate images in the editorial digital surrealism, halftone dither, and disciplined glitch-art aesthetic of Untitled.jpg. Use this skill whenever the user asks to "glitch", distort, corrupt, or stylize an image, apply CRT scanlines, Bayer matrix dithering, duotone quantization, chromatic aberration, or add technical overlays like coordinate grids, oscilloscope waves, zine contrast thresholds, or specimen framing boxes. Also trigger when generating editorial artwork or album/publication covers with analog photocopy/risograph textures, even if "glitchit" or "Untitled.jpg" is not explicitly mentioned.
metadata:
  version: 1.2.0
---

# Glitchit — Editorial Digital Surrealism & Glitch Art Engine

`glitchit` is an authoritative image processor, prompt design framework, and agent skill inspired by the visual identity of **Untitled.jpg** (`@mynameisjpg`). It combines disciplined mid-century broadside editorial layout, analog photocopy/zine print culture, and computational psychophysics with digital signal corruption.

---

## 1. Aesthetic Anatomy & Design Principles

The `Untitled.jpg` aesthetic operates on deliberate, mathematically disciplined visual foundations. Understanding *why* each principle exists ensures consistent execution across code and AI prompt generation:

1. **Strict 2-Tone Duotone (or Saturated Editorial Full-Color)**:
   - Duotone mode strictly interpolates between **two tonal anchors**: a deep neutral shadow (`#101010` default) and a luminous primary highlight (`#E84A5F` coral crimson default).
   - *Rationale*: Intermediate tertiary colors and smooth gradients destroy the harsh, tactile print tension characteristic of risograph and photocopier presses.
2. **Discrete Horizontal Step-Tears (Never Rubbery Ripples)**:
   - Glitch displacements execute as sharp, rectangular pixel-row offsets (`np.roll`), chunk shearing, and scan-bar brightness pops.
   - *Rationale*: Digital signal loss and memory buffer overruns happen along raster lines, not fluid or wavy distortions.
3. **Structured 4x4 Bayer Halftone Dithering**:
   - Luminance transitions are quantized through an ordered 4x4 Bayer dither threshold matrix rather than smooth alpha blending.
   - *Rationale*: Dithering introduces tactile micro-texture, evoking archival newspaper and xerox printing.
4. **Integer Distortion Calibration (`0` to `10`)**:
   - Distortion levels are strictly whole integers (`0` through `10`) without decimal fractions.
   - *Rationale*: Each step represents an intentional threshold of signal decay, keeping benchmarks repeatable and legible.

---

## 2. Parameter System

Every glitch operation is parameterized across primary composition controls and fine-tuning telemetry sliders:

### Primary Controls

| Parameter | CLI Flag | Default | Description & Visual Impact |
| :--- | :--- | :--- | :--- |
| **`mode`** | `-m, --mode` (`duotone` \| `color`) | `duotone` | **`duotone`**: Pure 2-tone quantization between `shadow` and `highlight`.<br>**`color`**: Full-spectrum RGB with amplified contrast and chromatic channel separation. |
| **`distortion`** | `-d, --distortion` (Integer `0`–`10`) | `5` | Master corruption scale. Controls horizontal row tears, block displacement rate, pixel melt streaks, and noise bursts. |
| **`shadow`** | `--shadow` (Hex string) | `#101010` | Dark tonal anchor for duotone mode (default: Midnight Charcoal). |
| **`highlight`** | `--highlight` (Hex string) | `#E84A5F` | Light tonal anchor for duotone mode (default: Coral Crimson). |

### Fine-Tuning & Telemetry Parameters

| Parameter | CLI Flag | Range | Default | Description & Visual Impact |
| :--- | :--- | :---: | :---: | :--- |
| **`preset`** | `-p, --preset` | `subtle` \| `untitled` \| `total-decay` | `None` | Quick curated aesthetic preset: **`subtle`** (aberration 20%, dither 30%, scanlines 40%, clusters 20%, threshold 5%), **`untitled`** (balanced mid-range), **`total-decay`** (max saturation and corruption). |
| **`scanlines`** | `--scanlines` | `0.0`–`1.0` | `0.65` | CRT raster line modulation. Sinusoidally dims alternating pixel rows. |
| **`dither`** | `--dither` | `0.0`–`1.0` | `0.45` | Bayer 4x4 matrix halftone dither intensity. Converts continuous gradients into risograph dots. |
| **`rgb_shift`** | `--rgb-shift` | `0.0`–`1.0` | `0.35` | Chromatic aberration split with vignette weighting. Offsets Red channel to the right and Blue channel to the left; centers stay sharp while borders and corners receive strong optical lens separation. |
| **`clusters`** | `--clusters` | `0.0`–`1.0` | `0.5` | Data corruption pixel clusters plotted behind distortions and textures so they are sheared by tears, split by chromatic aberration, and textured by paper grain. |
| **`threshold`** | `--threshold` | `0.0`–`1.0` | `0.0` | High-contrast zine thresholding calibrated so 100% matches the maximum stylistic ceiling. |
| **`seed`** | `--seed` | Integer | `42` | Pseudo-random seed ensuring deterministic, reproducible tear patterns across runs. |

---

## 3. The Distortion Scale (`0` to `10`)

Use these benchmarks to align user intent with corruption intensity:

| Level | Tier | Visual Characteristics | Best Applications |
| :---: | :--- | :--- | :--- |
| **0 – 2** | *Subtle Archival* | Clean tones, faint CRT raster lines, 1px chromatic fringe. Core subject fully legible. | Executive portraits, UI screenshots, corporate identity. |
| **3 – 5** | *Editorial Balanced* | **Signature Untitled look**: 2–5 horizontal slice tears, Bayer 4x4 dither, RGB shift. | Publication covers, essay headers, product features, album art. |
| **6 – 8** | *Aggressive Tear* | Heavy horizontal row displacement, channel splits, 2D block shifts, dense noise bursts. | Avant-garde posters, experimental journals, festival visuals. |
| **9 – 10** | *Total Decay* | Radical digital abstraction, severe raster fragmentation, chaotic byte corruption bursts. | Hero background textures, error screens, abstract digital art. |

---

## 4. Execution Modalities

Select the execution modality matching the user's environment:

### Modality A: Deterministic Python Processing (`script/glitchit.py`)

Execute local processing with zero external API tokens and full parameter control:

```bash
# Style Presets
python script/glitchit.py photo.jpg -o output.png --preset subtle
python script/glitchit.py photo.jpg -o output.png --preset untitled
python script/glitchit.py photo.jpg -o output.png --preset total-decay

# Signature Duotone (Level 5) with Custom Data Clusters
python script/glitchit.py photo.jpg -o output.png --mode duotone --distortion 5 --clusters 0.4

# Custom Two-Color Palette (e.g., Terminal Phosphor Green)
python script/glitchit.py photo.jpg -o output.png --mode duotone --distortion 6 \
  --shadow "#050505" --highlight "#00FF66"

# High-Voltage Full Color Glitch (Level 8)
python script/glitchit.py photo.jpg -o output.png --mode color --distortion 8

# Subtle Archival Portrait with Faint Scanlines
python script/glitchit.py portrait.png -o output.png --distortion 2 \
  --scanlines 0.3 --dither 0.2
```

---

### Modality B: Real-Time WebGL Shader & Live Studio

For interactive visual tuning, real-time 60 FPS GPU parameter scrubbing, and browser-based export:

- **Launching Locally**:
  - **Direct Offline Launch**: Open [`webgl-shader/glitchit-live.html`](webgl-shader/glitchit-live.html) directly in any browser (`file:///...`). The studio is fully self-contained with zero CDN dependencies and an inlined WebGL engine to avoid CORS issues on local files.
  - **Local HTTP Server**: Run `python -m http.server 8000` or `npx serve .` and navigate to `http://localhost:8000/webgl-shader/glitchit-live.html`.
  - **Live Online Studio**: Also accessible directly via [GitHub Pages](https://mynameisjpg.github.io/mynameisjpg/glitchit/webgl-shader/glitchit-live.html).
- **Interactive Controls**:
  - **Loading**: Drag & drop any image (`.png`, `.jpg`, `.webp`) onto the canvas, or click **📂 LOAD IMAGE**. Click **🎲 TEST SAMPLE** to instantly generate an editorial test layout.
  - **Tuning**: Scrub the master integer **Distortion Scale** (`0`–`10`), tweak parameters in the unified **Telemetry & Overlays** panel, and click **⟳ REROLL SEED** to re-seed slice positions.
  - **Palette**: Select between **Untitled Coral** (`#101010` & `#E84A5F`) or **Monochrome Silver** (`#0a0a0a` & `#FFFFFF`), or enter custom hex values in **SHADOW** and **HIGHLIGHT**.
  - **Exporting**: Click **⬇ EXPORT HI-RES PNG** to download the rendered image at full native source resolution, or click **📋 COPY TO CLIPBOARD**.

**Programmatic WebGL Integration**:
```javascript
import { GlitchitShader } from './glitchit-shader.js';

const canvas = document.getElementById('myCanvas');
const renderer = new GlitchitShader(canvas, {
  distortion: 5,
  mode: 'duotone',
  colorShadow: '#101010',
  colorHighlight: '#E84A5F',
  clusters: 0.5,
  threshold: 0.3
});

await renderer.loadSource('my-photo.jpg');
```

---

### Modality C: AI Diffusion Generation Prompting

When prompting image generation models (Midjourney, Imagen, Gemini `generate_image`, Flux, DALL-E 3), reference up to 3 visual anchors from [`references/gallery.md`](references/gallery.md) and construct prompts using these calibrated formulas:

#### Duotone Mode Formulas (Default `#101010` / `#E84A5F` or Custom `[HEX_SHADOW]` / `[HEX_HIGHLIGHT]`):

- **Distortion 0–3 (Subtle / Archival)**:
  > *"Editorial digital surrealism glitch artwork in the disciplined aesthetic of Untitled.jpg. Strict two-tone duotone palette of deep shadow ([HEX_SHADOW, default: #101010]) and primary highlight ([HEX_HIGHLIGHT, default: #E84A5F]). Features [SUBJECT DESCRIPTION]. Minimal horizontal micro-slice displacements along fine row segments, ordered 4x4 Bayer halftone dithering, delicate interlaced CRT scanlines, faint hairline chromatic edge split, subtle Cartesian coordinate grid lines with crosshair ticks, crisp high-contrast silhouette, tactile matte archival broadside print texture, zero neon purple, zero cyberpunk tropes."*

- **Distortion 4–7 (Signature / Balanced)**:
  > *"Editorial digital surrealism glitch artwork in the signature aesthetic of Untitled.jpg. Strict two-tone duotone palette of deep shadow ([HEX_SHADOW, default: #101010]) and primary highlight ([HEX_HIGHLIGHT, default: #E84A5F]). Features [SUBJECT DESCRIPTION]. Moderate horizontal slice tearing with distinct row displacement bands, structured 4x4 Bayer matrix halftone dithering, crisp interlaced CRT scanlines, calibrated red/cyan chromatic aberration channel split on high-contrast edges, fine Cartesian coordinate grid overlay, horizontal oscilloscope waveform pulse across slice boundary, asymmetric 1px wireframe specimen box frames, discrete step offsets, tactile archival paper texture, high mathematical contrast, zero neon purple, zero cyberpunk tropes."*

- **Distortion 8–10 (Heavy / Corrupted)**:
  > *"Aggressive editorial digital surrealism glitch artwork in the stark aesthetic of Untitled.jpg. Strict two-tone duotone palette of deep shadow ([HEX_SHADOW, default: #101010]) and primary highlight ([HEX_HIGHLIGHT, default: #E84A5F]). Features [SUBJECT DESCRIPTION]. Violent horizontal slice shearing across wide pixel blocks, dense stochastic digital corruption bursts, intense 4x4 Bayer matrix dither quantization, extreme zine high-contrast thresholding crushing midtones into pure ink, sharp interlaced CRT scanline degradation, fragmented technical schematics and cascading specimen bounding boxes, pronounced chromatic phase split with displaced ghost channels, high-contrast fragmented forms, raw photocopy xerox grain, zero neon purple, zero cyberpunk tropes."*

#### Full-Color Mode Formulas:

- **Distortion 0–3 (Subtle / Archival)**:
  > *"Tactile digital surrealism glitch artwork featuring [SUBJECT DESCRIPTION]. Vibrant, high-contrast natural color palette preserved with subtle editorial grading. Hairline horizontal slice displacements along discrete pixel rows, faint Red/Cyan chromatic channel separation on high-contrast contours, delicate interlaced CRT scanlines, subtle ordered 4x4 Bayer matrix grain, fine technical schematic grid overlay, crisp mathematical geometry, clean archival paper surface, zero muddy blur."*

- **Distortion 4–7 (Signature / Balanced)**:
  > *"Tactile digital surrealism glitch artwork featuring [SUBJECT DESCRIPTION]. Saturated high-contrast color palette corrupted by signature horizontal pixel row displacement tears, calibrated Red/Cyan chromatic aberration channel split along the X-axis, controlled digital block noise fragments, structured 4x4 Bayer matrix halftone dither raster, interlaced CRT scanlines, horizontal oscilloscope wave trace, 1px rectangular specimen framing borders, crisp mathematical composition, archival photocopy print texture, zero neon synthwave tropes."*

- **Distortion 8–10 (Heavy / Corrupted)**:
  > *"High-voltage digital surrealism glitch artwork featuring [SUBJECT DESCRIPTION]. Hyper-saturated high-contrast color palette shattered by aggressive horizontal shear tears across wide image bands, extreme RGB chromatic aberration split with wide channel displacement, chaotic digital block corruption bursts and inverted bit-crush fragments, crunchy zine contrast thresholding, dense coordinate grid schematics, intense 4x4 Bayer dither rasterization, heavy interlaced CRT scanline degradation, raw visceral xerox noise, crisp mathematical tension."*

---

## 5. Interactive Agent Workflow & Decision Protocol

When activated via terminal or chat with an image input, **always first determine the user's environment and ask which execution modality they prefer**:

```
[Agent Receives User Image Input]
       │
       ▼
[Step 1: Ask User for Preferred Execution Modality]
       ├── Modality 1: Live WebGL Studio (webgl-shader/glitchit-live.html)
       │     └── Direct user to open the studio immediately (interactive visual tuning)
       │
       ├── Modality 2: Python Command-Line Script (script/glitchit.py)
       │     └── Activate Step 2: Clarification Checklist → Run command
       │
       └── Modality 3: Generative AI with Image-to-Image / Editing Capabilities
             └── Activate Step 2: Clarification Checklist → Construct diffusion prompt
```

---

### Step 1: Modality Selection Prompt

Present these 3 options to the user:
1. **Interactive Live WebGL Studio** (Recommended for visual tuning): Zero setup, works in any browser, drag-and-drop image loading, real-time 60 FPS parameter sliders, and 1-click high-res export. Open [`webgl-shader/glitchit-live.html`](webgl-shader/glitchit-live.html).
2. **Local Python CLI Script** (`script/glitchit.py`): Deterministic terminal-based processing with NumPy & Pillow.
3. **Generative AI Editing** (Midjourney, Gemini `generate_image`, Flux, etc.): Multimodal image-to-image prompt engineering using calibrated visual anchors.

> **Note**: If the user selects **Modality 1 (Live Studio)**, direct them to open the HTML file immediately. No parameter checklist is needed since all parameters are scrubbed interactively.

---

### Step 2: Clarification Checklist (for Python CLI or Generative AI)

If the user selects **Python Script** or **Generative AI**, confirm any underspecified parameters before executing:
1. **Distortion Level (`0` to `10`)**: Default recommendation is `5` (Balanced Editorial).
2. **Color Mode**:
   - `Duotone` (Default: Midnight Charcoal `#101010` & Coral Crimson `#E84A5F`, or custom hexes).
   - `Full Color` (Preserves RGB spectrum with high contrast & chromatic splits).
3. **Optional Parameters & Overlays (Intensity `0.0` to `1.0`)**:
   - Data corruption pixel clusters (`--clusters`, default `0.5`, plotted behind distortions & textures)
   - Calibrated zine contrast thresholding (`--threshold`, default `0.0`)
   - Curated presets (`--preset subtle`, `--preset untitled`, `--preset total-decay`)

---

## 6. Style Invariants: Strict Do's and Don'ts

### ✅ Do:
- **Anchor duotone palettes strictly in 2 tones** (`shadow` and `highlight`).
- **Use whole integer distortion levels** (`0` through `10`).
- **Keep slice displacements horizontal and discrete** via row-based offsets with diverse thicknesses (thin, med, chunky).
- **Maintain high mathematical contrast** using ordered Bayer dithering.
- **Plot data corruption clusters behind distortions and textures** so they are sheared by tears and textured by paper grain.

### ❌ Don't:
- **Do not introduce a 3rd "accent" color or intermediate gradient ramps** in duotone mode.
- **Do not use decimal distortion values** (e.g. `5.3`, `7.8`).
- **Do not default to neon purple/cyan 80s synthwave, vaporwave sunsets, or Matrix code rain** unless explicitly requested.
- **Do not apply wavy, rubbery, or organic liquify distortions**.
- **Do not add rounded bubbly corners, 3D clay materials, or glassmorphic drop shadows**.
- **Do not apply gaussian blur** that destroys the crisp dither grain and raster lines.

---

## 7. Curated References & Benchmark Anchors

- [`references/gallery.md`](references/gallery.md): Visual benchmarks and before/after progressions for portrait, product, painting, and scape images across distortion levels 1–10.
- [`references/style-cache.json`](references/style-cache.json): Pre-compiled machine-readable style invariants, color tables, Bayer dither matrix, and parameter specs.
- `references/untitled_references`: 27 authentic editorial references from the Untitled.jpg archives detailing Cartesian coordinate grids, oscilloscope waveforms, zine contrast thresholding, and specimen frame cascades.