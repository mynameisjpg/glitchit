# Glitchit ⚡

> **Glitch-ify any image with authentic editorial digital surrealism.**  
> Inspired by the aesthetic of [Untitled.jpg](https://mynameisjpg.github.io/mynameisjpg/).

[![License: CC0](https://img.shields.io/badge/License-MIT-E84A5F.svg)](LICENSE)
[![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0_Shader-101010.svg?logo=webgl&logoColor=E84A5F)](webgl-shader/glitchit-live.html)
[![Python CLI](https://img.shields.io/badge/Python-3.8+-E84A5F.svg?logo=python&logoColor=white)](script/glitchit.py)

---

## 👁️ Overview

**Glitchit** is an open-source visual engine and agent skill designed to transform photographs, diagrams, artworks and any image into a glitch-y, out-of-distribution visual language. Inspired by the aesthetics of **Untitled.jpg**:
- **Duotone & Full Color Modes**: Quantize images into a duotonal gradient ramp or retain high-contrast RGB channels with chromatic splits.
- **Parametric Distortion (0 to 10)**: Smoothly dial the glitch-iness from subtle archival grain to aggressive horizontal slice tearing and complete digital decay.
- **Hardware-Accelerated WebGL Playground**: Real-time browser studio running at 60 FPS with drag-and-drop, interactive sliders, and one-click high-res export.
- **Autonomous Agent Skill**: Structured prompt guidelines, mathematical specifications, and benchmark anchors for AI image models and coding agents.
- **Deterministic Python CLI**: Local script powered by NumPy and Pillow for batch processing with zero external API dependencies.

---

## 🛠️ Three Operational Runtimes

| Runtime | Purpose | Stack |
| :--- | :--- | :--- |
| **1. [Live WebGL Studio](webgl-shader/glitchit-live.html)** | Real-time 60 FPS GPU parameter scrubbing, drag-and-drop canvas, spacebar pan/zoom, and one-click hi-res export. | Vanilla HTML5 + GLSL Fragment Shader (0 dependencies, 100% offline). |
| **2. [Python CLI Tool](script/glitchit.py)** | Deterministic batch processing for print production, editorial layouts, and automated CI pipelines. | Python 3 + NumPy + Pillow (runs in <300ms). |
| **3. [Agent Skill](SKILL.md)** | Structured design heuristics and parameter anchors for AI coding agents (`Antigravity`, `Claude Code`, `Cursor`). | Markdown heuristics and mathematical constants. |


---

## 🏛️ Repository Structure

```
glitchit/
├── references/
│   ├── images               # Reference images for distortion scales and signature aesthetic
│   ├── style-cache.json     # Mathematical formulas, Bayer matrix & step noise
│   └── gallery.md           # Visual anchors & distortion scale benchmarks
├── script/
│   └── glitchit.py          # Standalone Python CLI image processor
├── webgl-shader/
│   ├── glitchit-live.html   # Interactive browser studio & live shader playground
│   └── glitchit-shader.js   # Modular GlitchitRenderer class & GLSL fragment shader
├── SKILL.md                 # Agent skill instructions & multimodal prompt formulas
├── LICENSE                  # CC0 License
└── README.md                # Documentation
```

---

## 🚀 Quickstart

### 1. Live Browser Studio (WebGL Shader)

The interactive studio (`webgl-shader/glitchit-live.html`) provides real-time 60 FPS GPU parameter tuning and high-resolution export.

#### Running Locally
You can launch the studio in two ways:
- **Direct Offline Launch (Recommended)**: Simply double-click [`webgl-shader/glitchit-live.html`](webgl-shader/glitchit-live.html) or open it directly in Chrome, Edge, Firefox, or Safari. The studio is fully self-contained with zero external CDN dependencies, allowing drag-and-drop and export without CORS errors.
- **Local Web Server**: If your environment has local file sandbox restrictions, serve the directory:
  ```bash
  # Python 3
  python -m http.server 8000
  # or Node.js
  npx serve .
  ```
  Then navigate to: `http://localhost:8000/webgl-shader/glitchit-live.html`

#### How to Use:
1. **Upload**: Drag & drop any image (`.png`, `.jpg`, `.webp`) directly onto the canvas stage, or click **📂 LOAD IMAGE** to choose a file from your disk. Click **🎲 TEST SAMPLE** to instantly generate an editorial test poster.
2. **Tune**: Select between **Duotone** and **Full Color**, adjust the master **Distortion Scale** (`0` to `10`), or pick one of the 3 calibrated style presets (**SUBTLE**, **UNTITLED**, **TOTAL DECAY**). Fine-tune via **Telemetry & Overlays** sliders (`scanlines`, `dither`, `rgbShift`, `clusters`, `threshold`), and click **⟳ REROLL SEED** to randomize tears.
3. **Palette**: Pick between the **Untitled Coral** (black-crimson) or **Monochrome Silver** (black-white) pills, or enter custom hex codes in the **SHADOW** and **HIGHLIGHT** fields.
4. **Download**: Click **⬇ EXPORT HI-RES PNG** to instantly save the rendered glitch at full native source resolution, or click **📋 COPY TO CLIPBOARD** to paste directly into design tools.


### 2. Using as an Agent Skill

Add `glitchit/` to your AI coding agent (e.g. Antigravity, Claude Code, Cursor) to enable automated generation and editing of images in this aesthetic. See [SKILL.md](SKILL.md) for complete instructions.

### 3. Python Command-Line Interface
Process images directly from your terminal:

```bash
# Install requirements
pip install pillow numpy

# Run quick style preset: subtle, untitled, or total-decay
python script/glitchit.py your_photo.jpg -o output.png --preset subtle
python script/glitchit.py your_photo.jpg -o output.png --preset untitled
python script/glitchit.py your_photo.jpg -o output.png --preset total-decay

# Run signature Duotone at Level 5 with custom clusters
python script/glitchit.py your_photo.jpg -o output.png --mode duotone --distortion 5 --clusters 0.4

# Aggressive Color Glitch at Level 8
python script/glitchit.py your_photo.jpg -o output.png --mode color --distortion 8

# Subtle Portrait with Fine Scanlines
python script/glitchit.py your_portrait.png -o output.png --distortion 2 --scanlines 0.3 --dither 0.2
```

---

## ⚙️ Parameters Reference (`glitchit.py`)

Every parameter supported by the `glitchit.py` command-line interface:

| Parameter | Type / Flag | Default | Description & Visual Impact |
| :--- | :--- | :--- | :--- |
| **`input`** | Positional | *Required* | Path to the source image file (`.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`). |
| **`-o, --output`** | String | `output-glitch.png` | Destination file path for the glitched output image. |
| **`-p, --preset`** | `subtle` \| `untitled` \| `total-decay` | `None` | Quick curated aesthetic preset: **`subtle`** (aberration 20%, dither 30%, scanlines 40%, clusters 20%, threshold 5%), **`untitled`** (balanced mid-range), **`total-decay`** (max saturation and corruption). |
| **`-d, --distortion`** | Integer (`0` to `10`) | `5` | Master corruption scale. Calibrates horizontal displacement bands (Level 0: 2–3 bands; Level 10: 10–15 bands with 5% thick, 25% medium, 70% thin hairlines), discrete block displacements, and noise bursts. |
| **`-m, --mode`** | `duotone` \| `color` | `duotone` | **`duotone`**: Pure 2-tone quantization interpolating between `--shadow` and `--highlight` with punchy S-curve contrast and subtle tear fringe bleed.<br>**`color`**: Preserves full RGB color spectrum with high-contrast saturation and chromatic separation. |
| **`--shadow`** | Hex string | `#101010` | Darkest tonal anchor for duotone mode (default: Midnight Charcoal). |
| **`--highlight`** | Hex string | `#E84A5F` | Brightest tonal anchor for duotone mode (default: Coral Crimson). |
| **`--scanlines`** | Float (`0.0` – `1.0`) | `0.65` | CRT television raster line intensity. Applies alternating horizontal row dimming based on a sine modulation wave. |
| **`--dither`** | Float (`0.0` – `1.0`) | `0.45` | Bayer 4x4 ordered matrix halftone dither intensity. Converts smooth gradient ramps into crisp, tactile risograph/photocopy dots. |
| **`--rgb-shift`** | Float (`0.0` – `1.0`) | `0.35` | Calibrated chromatic aberration split with vignette weighting. Offsets Red channel to the right and Blue channel to the left; centers remain sharp while outer borders and corners receive strong optical lens separation. In duotone mode, leaves subtle registration plate fringe accents along slice tears. |
| **`--clusters`** | Float (`0.0` – `1.0`) | `0.5` | Data corruption pixel clusters plotted behind distortions and textures. Multi-scale rectangular byte blocks scattered across elevation bands; affected by horizontal tears, RGB splits, halftone dither, and paper grain. |
| **`--threshold`** | Float (`0.0` – `1.0`) | `0.0` | Calibrated high-contrast zine thresholding. Crushes midtones into deep raw ink shadows and blown paper highlights (calibrated so 100% matches the maximum stylistic ceiling). |
| **`--seed`** | Integer | `42` | Pseudo-random number generator seed. Ensures 100% deterministic, repeatable slice tears, block offsets, and noise patterns across runs. |

---

## 🎨 The Distortion Scale (0 to 10)

| Level | Name | Visual Characteristics | Best For |
| :---: | :--- | :--- | :--- |
| **0 – 2** | *Subtle Archival* | Clean tones, faint CRT scanlines, 1px chromatic fringe. | Portraits, readable UI mockups. |
| **3 – 5** | *Editorial Balanced* | Signature style: 2–4 slice tears, Bayer 4x4 dither, RGB shift. | Publication covers, field notes. |
| **6 – 8** | *Aggressive Tear* | Heavy horizontal displacement, channel splitting, block noise. | Philosophical essays, collages. |
| **9 – 10** | *Total Decay* | Abstract digital surrealism, severe raster breakdown. | Background textures, 404 pages. |

---

## 📜 License & Attribution

Designed and created by **Juan Pablo Giusepponi** ([@mynameisjpg](https://github.com/mynameisjpg)) for **Untitled.jpg**.  
Distributed under the [CC0 1.0 Universal License](LICENSE).
