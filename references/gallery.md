# Glitchit Visual Reference Gallery & Benchmark Anchors

Use these visual anchors when guiding multimodal models (Midjourney, Imagen, Gemini, DALL-E) or calibrating distortion amounts.

---

## Local Calibrated Distortion Benchmarks (`skill/references/`)

These local benchmark series provide ground-truth before-and-after pairs across 4 distinct subject domains:

### 1. Human Portrait Series (`portrait.jpg`)
- **Original (Level 0)**: [`portrait.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/portrait.jpg)
- **Subtle (Level 1–3)**:
  - Level 1: [`portrait_distort_1.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/portrait_distort_1.jpg) — Hairline row displacements, faint CRT raster
  - Level 3: [`portrait_distort_3.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/portrait_distort_3.jpg) — Visible slice offsets across facial contours
- **Balanced (Level 5–7)**:
  - Level 5: [`portrait_distort_5.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/portrait_distort_5.jpg) — Signature Untitled.jpg look: balanced slice tears, Bayer dither
  - Level 7: [`portrait_distort_7.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/portrait_distort_7.jpg) — Prominent horizontal shear and edge chromatic split
- **Aggressive & Decay (Level 8–10)**:
  - Level 8: [`portrait_distort_8.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/portrait_distort_8.jpg) — Heavy horizontal block displacement
  - Level 9: [`portrait_distort_9.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/portrait_distort_9.jpg) — Severe facial fragmentation and pixel displacement
  - Level 10: [`portrait_distort_10.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/portrait_distort_10.jpg) — Total digital decay, abstract surrealist corruption

### 2. Industrial / Product Series (`product.jpg`)
- **Original (Level 0)**: [`product.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/product.jpg)
- **Subtle (Level 1–2)**:
  - Level 1: [`product_distort_1.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/product_distort_1.jpg)
  - Level 2: [`product_distort_2.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/product_distort_2.jpg)
- **Balanced (Level 5–7)**:
  - Level 5: [`product_distort_5.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/product_distort_5.jpg)
  - Level 6: [`product_distort_6.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/product_distort_6.jpg)
  - Level 7: [`product_distort_7.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/product_distort_7.jpg)
- **Aggressive & Decay (Level 9–10)**:
  - Level 9: [`product_distort_9.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/product_distort_9.jpg)
  - Level 10: [`product_distort_10.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/product_distort_10.jpg)

### 3. Classical Oil Painting Series (`painting.jpg`)
- **Original (Level 0)**: [`painting.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/painting.jpg)
- **Subtle (Level 2)**: [`painting_distort_2.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/painting_distort_2.jpg)
- **Balanced (Level 5)**: [`painting_distort_5.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/painting_distort_5.jpg)
- **Total Decay (Level 10)**: [`painting_distort_10.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/painting_distort_10.jpg)

### 4. Landscape / Nature Scape Series (`scape.jpg`)
- **Original (Level 0)**: [`scape.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/scape.jpg)
- **Balanced (Level 5)**: [`scape_distort_05.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/scape_distort_05.jpg)
- **Total Decay (Level 10)**: [`scape_distort_10.jpg`](file:///e:/GIT%20PAGE/glitchit/skill/references/scape_distort_10.jpg)

---

## Online Reference Anchors (from `mynameisjpg`)

The `mynameisjpg` project also hosts flagship online references:

### 1. Flagship Duotone Glitch (Distortion: 5 – 6)
- **Reference**: [`ai_tamagotchi.png`](https://mynameisjpg.github.io/mynameisjpg/assets/images/ai_tamagotchi.png)
- **Characteristics**:
  - Disciplined 2-tone duotone: Midnight Charcoal (`#101010`) and Coral Crimson (`#E84A5F`).
  - Discrete horizontal row tears across the center figures.
  - Fine Bayer halftone dots simulating photocopied zines.
  - High-frequency pixel scanline artifacts without muddy blur.

### 2. High-Density Archival Tearing (Distortion: 7 – 8)
- **Reference**: [`archival_glitch_1790477665220.png`](https://mynameisjpg.github.io/mynameisjpg/assets/images/archival_glitch_1790477665220.png)
- **Characteristics**:
  - Prominent horizontal slice offsets.
  - Channel displacement exposing stark Red/Coral boundaries.
  - Deep black background with sharp geometric clipping.

### 3. Philosophical Collage & Text Decay (Distortion: 4 – 5)
- **Reference**: [`foucault-borges.jpg`](https://mynameisjpg.github.io/mynameisjpg/assets/images/foucault-borges.jpg) & [`foucault-borges.gif`](https://mynameisjpg.github.io/mynameisjpg/assets/images/foucault-borges.gif)
- **Characteristics**:
  - Clean historical photographic figures overlaid with sharp fractured geometric frames.
  - Coral Crimson quote bars and monospace marginalia.
  - Subtle interlaced scanlines across the portrait.

### 4. Full Color Chromatic Glitch (Distortion: 6)
- **Reference**: [`glitch-rave.png`](https://mynameisjpg.github.io/mynameisjpg/assets/images/glitch-rave.png) & [`glitch-rave2.png`](https://mynameisjpg.github.io/mynameisjpg/assets/images/glitch-rave2.png)
- **Characteristics**:
  - Full RGB color spectrum retained.
  - Intense horizontal chromatic aberration (Red and Cyan/Blue offset).
  - High-contrast saturation curves with digital noise bursts.

---

## Calibration Guidelines by Distortion Level

```
Level 0:  Clean photographic base, neutral grade, zero tearing.
Level 2:  Faint interlaced scanlines, 1px chromatic fringe, subtle paper texture.
Level 5:  Signature Untitled.jpg look: balanced slice tearing, visible dither, crisp monospace legibility.
Level 8:  Aggressive horizontal displacement, channel splitting, digital block noise.
Level 10: Complete raster breakdown, abstract digital surrealism, heavy byte corruption.
```
