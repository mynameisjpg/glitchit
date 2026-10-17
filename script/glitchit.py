#!/usr/bin/env python3
"""
Glitchit — Deterministic Image Glitch Processor
Aesthetic: Untitled.jpg (Editorial Digital Surrealism)
Architecture:
  - Data corruption clusters plotted behind distortions & textures for complete organic integration
  - Asymmetric horizontal slice tearing: calibrated band counts and diverse thickness (thin, med, thick)
  - Disciplined 2-tone duotone with punchy S-curve contrast & subtle edge-fringe accents
  - Calibrated high-contrast zine thresholding
  - Ordered 4x4 Bayer dithering
  - Gritty archival paper texture & CRT scanlines
"""

import os
import sys
import argparse
import random
from PIL import Image
import numpy as np

# Authentic Cluster Sheet Sprites (32 curated motifs from references/clusters-white.png)
CLUSTER_SHEET_DIMS = (3000, 1500)
CLUSTER_SPRITES = [
    # Checkerboards & Halftone Blocks
    [460, 1196, 496, 304], [1548, 76, 544, 192], [1204, 1084, 264, 288],
    [2596, 708, 296, 216], [2588, 76, 304, 160], [0, 1380, 284, 120],
    [1844, 348, 272, 104], [2700, 1172, 240, 104],
    # Horizontal Transmission Bars & Bursts
    [44, 844, 600, 104], [308, 604, 528, 64], [524, 1084, 376, 88],
    [892, 132, 448, 32], [1060, 380, 424, 32], [2692, 444, 308, 40],
    [1132, 164, 208, 56], [1580, 804, 176, 48],
    # Vertical Barcode Columns
    [1876, 548, 136, 320], [964, 844, 96, 200], [2524, 4, 56, 304],
    [2172, 1028, 40, 288], [2092, 1108, 48, 224], [396, 1068, 72, 136],
    [2444, 708, 32, 216], [1284, 844, 56, 112],
    # Stepped Byte Blocks & Pixel Constellations
    [2700, 1172, 240, 104], [1668, 1260, 200, 104], [2660, 972, 152, 128],
    [76, 76, 160, 104], [692, 316, 176, 80], [652, 844, 104, 104],
    [1988, 1060, 96, 104], [1980, 1268, 120, 80]
]

_SHEET_PATH = os.path.join(os.path.dirname(__file__), '..', 'references', 'clusters-white.png')
_CACHED_SHEET = None

def _get_cluster_sheet():
    global _CACHED_SHEET
    if _CACHED_SHEET is None:
        if os.path.exists(_SHEET_PATH):
            try:
                _CACHED_SHEET = Image.open(_SHEET_PATH).convert('RGBA')
            except Exception:
                _CACHED_SHEET = None
    return _CACHED_SHEET

# 4x4 Bayer Dithering Matrix
BAYER_4X4 = np.array([
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
], dtype=np.float32) / 16.0 - 0.5

HEX_SHADOW = (16, 16, 16)      # #101010
HEX_HIGHLIGHT = (232, 74, 95)  # #E84A5F

PRESETS = {
    "subtle": {
        "distortion": 2,
        "rgb_shift": 0.20,
        "dither": 0.30,
        "scanlines": 0.40,
        "clusters": 0.20,
        "threshold": 0.05,
    },
    "untitled": {
        "distortion": 5,
        "rgb_shift": 0.60,
        "dither": 0.65,
        "scanlines": 0.70,
        "clusters": 0.60,
        "threshold": 0.50,
    },
    "total-decay": {
        "distortion": 10,
        "rgb_shift": 1.0,
        "dither": 1.0,
        "scanlines": 1.0,
        "clusters": 1.0,
        "threshold": 1.0,
    },
    "total_decay": {
        "distortion": 10,
        "rgb_shift": 1.0,
        "dither": 1.0,
        "scanlines": 1.0,
        "clusters": 1.0,
        "threshold": 1.0,
    }
}

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def apply_glitch(img, distortion=5, mode='duotone', scanlines=0.6, dither=0.45, rgb_shift=0.35,
                 clusters=0.5, threshold=0.0,
                 shadow=HEX_SHADOW, highlight=HEX_HIGHLIGHT, seed=42):
    random.seed(seed)
    np.random.seed(int(seed) % (2**32 - 1))

    img = img.convert('RGB')
    w, h = img.size
    arr = np.array(img, dtype=np.float32)

    norm_dist = max(0.0, min(10.0, float(distortion))) / 10.0

    # ---------------------------------------------------------
    # 1. Authentic Data Corruption Pixel Clusters (Sampled from Cluster Sheet)
    # Stamped onto raw layer first so slice tears, chromatic aberration, duotone,
    # dither & scanlines affect and integrate them organically.
    # Calibrated: 10% (1-2 clusters), 50% (4-5 clusters), 100% (8-10 clusters).
    # ---------------------------------------------------------
    if clusters > 0.005:
        num_clusters = max(1, int(round(clusters * 9)))
        sheet_img = _get_cluster_sheet()

        if sheet_img is not None:
            checkerboards = [s for s in CLUSTER_SPRITES if (s[2]/s[3]) >= 0.9 and (s[2]/s[3]) <= 3.0 and (s[2]*s[3]) >= 8000]
            horiz_bars = [s for s in CLUSTER_SPRITES if (s[2]/s[3]) >= 3.5 and s[2] >= 120]
            vert_bars = [s for s in CLUSTER_SPRITES if (s[2]/s[3]) <= 0.6 and s[3] >= 60]
            medium_blocks = [s for s in CLUSTER_SPRITES if 0.7 <= (s[2]/s[3]) <= 2.5 and 3000 <= (s[2]*s[3]) < 25000]

            pool = []
            pool.extend(random.sample(checkerboards, min(2, len(checkerboards))))
            pool.extend(random.sample(horiz_bars, min(3, len(horiz_bars))))
            pool.extend(random.sample(vert_bars, min(2, len(vert_bars))))
            pool.extend(random.sample(medium_blocks, min(3, len(medium_blocks))))
            random.shuffle(pool)
            chosen = pool[:num_clusters]
            chosen.sort(key=lambda s: s[2] * s[3], reverse=True)

            palette = [
                np.array([255.0, 30.0, 60.0], dtype=np.float32),   # Vivid Crimson
                np.array([0.0, 235.0, 255.0], dtype=np.float32),   # Vivid Cyan
                np.array([255.0, 225.0, 20.0], dtype=np.float32),  # Technical Yellow
                np.array([255.0, 255.0, 255.0], dtype=np.float32), # Pure White
                np.array([30.0, 255.0, 110.0], dtype=np.float32),  # Digital Green
            ]

            for s in chosen:
                sx, sy, sw, sh = s
                aspect = sw / float(sh)
                crop = sheet_img.crop((sx, sy, sx + sw, sy + sh))

                if aspect > 4.0:
                    tw = random.randint(int(w * 0.12), int(w * 0.28))
                elif aspect < 0.6:
                    tw = random.randint(int(w * 0.025), int(w * 0.07))
                else:
                    tw = random.randint(int(w * 0.08), int(w * 0.18))

                th = max(4, int(tw / aspect))
                if th > int(h * 0.32):
                    th = int(h * 0.32)
                    tw = max(4, int(th * aspect))

                crop_scaled = crop.resize((tw, th), Image.NEAREST)
                crop_arr = np.array(crop_scaled)
                mask = crop_arr[:, :, 3] > 64

                bx = random.randint(0, max(0, w - tw))
                by = random.randint(0, max(0, h - th))

                if mode == 'duotone':
                    col = np.array([255.0, 255.0, 255.0], dtype=np.float32)
                else:
                    col = random.choice(palette)

                target = arr[by:by+th, bx:bx+tw]
                target[mask] = col
                arr[by:by+th, bx:bx+tw] = target

    # ---------------------------------------------------------
    # 2. Asymmetric Horizontal Slice Tearing
    # Calibrated: 20% fewer bands, diverse thickness.
    # Level 0: 2-3 bands (thin and med, no thick)
    # Level 10: 10-15 bands (5% thick, 25% med, 70% thin)
    # ---------------------------------------------------------
    min_bands = int(2 + norm_dist * 8)
    max_bands = int(3 + norm_dist * 12)
    total_bands = random.randint(min_bands, max_bands)

    num_thick = max(0, int(round(total_bands * 0.05))) if norm_dist > 0.4 else 0
    num_med = max(1, int(round(total_bands * 0.25)))
    num_thin = max(1, total_bands - num_thick - num_med)

    # A. Thin Hairline Slices (1 to 4 px)
    for _ in range(num_thin):
        y_pos = random.randint(0, h - 5)
        band_h = random.randint(1, 4)
        y_end = min(h, y_pos + band_h)

        max_shift = max(2, int((0.006 + norm_dist * 0.065) * w))
        shift = random.randint(-max_shift, max_shift)
        if shift != 0:
            arr[y_pos:y_end] = np.roll(arr[y_pos:y_end], shift, axis=1)
            if random.random() < 0.12 and norm_dist > 0.2:
                arr[y_pos:y_end] = np.clip(arr[y_pos:y_end] * 1.30 + 20.0, 0.0, 255.0)

    # B. Medium Thickness Displacement Bands (6 to 18 px)
    for _ in range(num_med):
        y_pos = random.randint(0, max(1, h - 20))
        band_h = random.randint(6, 18)
        y_end = min(h, y_pos + band_h)

        max_shift = max(4, int((0.012 + norm_dist * 0.09) * w))
        shift = random.randint(-max_shift, max_shift)
        if shift != 0:
            arr[y_pos:y_end] = np.roll(arr[y_pos:y_end], shift, axis=1)
            if random.random() < 0.20 and norm_dist > 0.3:
                arr[y_pos:y_end] = np.clip(arr[y_pos:y_end] * 1.25 + 25.0, 0.0, 255.0)

    # C. Thick Chunky Macro Bands (25 to 60 px) - only at higher distortion levels
    for _ in range(num_thick):
        chunk_h = random.randint(25, min(60, int(h * 0.12)))
        y_pos = random.randint(int(h * 0.08), max(int(h * 0.08) + 1, h - chunk_h - 10))
        y_end = min(h, y_pos + chunk_h)

        chunk_shift = int(random.choice([-1, 1]) * random.uniform(0.03, 0.08 + norm_dist * 0.08) * w)
        arr[y_pos:y_end] = np.roll(arr[y_pos:y_end], chunk_shift, axis=1)
        if random.random() < 0.35:
            arr[y_pos:y_end] = np.clip(arr[y_pos:y_end] * 1.20 + 30.0, 0.0, 255.0)

    # ---------------------------------------------------------
    # 3. Discrete 2D Macroblock Shifting (Selective Blocks)
    # ---------------------------------------------------------
    if norm_dist > 0.15:
        num_blocks = int(1 + norm_dist * 7)
        for _ in range(num_blocks):
            bw = random.randint(int(w * 0.06), int(w * 0.28))
            bh = random.randint(int(h * 0.03), int(h * 0.16))
            bx = random.randint(0, max(1, w - bw))
            by = random.randint(0, max(1, h - bh))
            
            shift_x = int(random.uniform(-0.10, 0.10) * w * norm_dist)
            src_x = np.clip(bx + shift_x, 0, w - bw)
            src_y = by
            
            chunk = arr[src_y:src_y+bh, src_x:src_x+bw].copy()
            if random.random() < 0.25 and norm_dist > 0.4:
                pix = max(2, int(3 + norm_dist * 8))
                c_img = Image.fromarray(np.uint8(np.clip(chunk, 0, 255)))
                c_img = c_img.resize((max(1, bw//pix), max(1, bh//pix)), Image.NEAREST).resize((bw, bh), Image.NEAREST)
                chunk = np.array(c_img, dtype=np.float32)
            arr[by:by+bh, bx:bx+bw] = chunk

    # ---------------------------------------------------------
    # 4. Chromatic Aberration (Vignette RGB Channel Split)
    # Dialed down ~20% (0.015 multiplier), stronger towards borders than center
    # ---------------------------------------------------------
    max_shift = int((1.0 + norm_dist * w * 0.015) * rgb_shift)
    r_channel = arr[:, :, 0]
    b_channel = arr[:, :, 2]

    if max_shift > 0:
        # Radial vignette weighting: ~0 near center, 1.0 at outer borders/corners
        x_coords = (np.arange(w, dtype=np.float32) - w * 0.5) / (w * 0.5)
        y_coords = (np.arange(h, dtype=np.float32) - h * 0.5) / (h * 0.5)
        r2 = x_coords[np.newaxis, :]**2 + y_coords[:, np.newaxis]**2
        vig = np.clip(r2 * 0.75, 0.05, 1.0)

        shift_map = (vig * max_shift).astype(np.int32)
        grid_x = np.arange(w, dtype=np.int32)[np.newaxis, :]
        grid_y = np.arange(h, dtype=np.int32)[:, np.newaxis]

        src_x_r = np.clip(grid_x + shift_map, 0, w - 1)
        src_x_b = np.clip(grid_x - shift_map, 0, w - 1)

        r_shifted = r_channel[grid_y, src_x_r]
        b_shifted = b_channel[grid_y, src_x_b]
        arr = np.stack([r_shifted, arr[:, :, 1], b_shifted], axis=2)
    else:
        r_shifted = r_channel
        b_shifted = b_channel

    chroma_fringe = np.clip(np.abs(r_shifted - b_shifted) / 255.0, 0.0, 1.0)

    # ---------------------------------------------------------
    # 5. Color Treatment (Duotone vs Color + S-Curve + Calibrated Threshold)
    # Threshold calibrated so current 50% is the max 100% level (factor: 0.47)
    # ---------------------------------------------------------
    t_val = threshold * 0.47

    if mode == 'duotone':
        lum = (0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]) / 255.0
        
        lum = np.clip(lum, 0.0, 1.0)
        lum = (lum - 0.5) * 1.35 + 0.5
        lum = np.clip(lum, 0.0, 1.0)
        lum = lum * lum * (3.0 - 2.0 * lum)

        if threshold > 0.005:
            low = 0.5 - (1.0 - t_val) * 0.5
            high = 0.5 + (1.0 - t_val) * 0.5
            lum = np.clip((lum - low) / max(1e-4, high - low), 0.0, 1.0)

        if dither > 0.01:
            tile_y = (h + 3) // 4
            tile_x = (w + 3) // 4
            dither_pattern = np.tile(BAYER_4X4, (tile_y, tile_x))[:h, :w]
            lum = np.clip(lum + dither_pattern * (0.24 * dither), 0.0, 1.0)

        s = np.array(shadow, dtype=np.float32)
        hi = np.array(highlight, dtype=np.float32)
        t = lum[:, :, np.newaxis]
        arr = s * (1.0 - t) + hi * t

        if rgb_shift > 0.01:
            fringe_col_r = np.array([255.0, 60.0, 80.0], dtype=np.float32)
            fringe_amount = chroma_fringe[:, :, np.newaxis] * (0.16 * rgb_shift)
            fringe_mask = (fringe_amount > 0.02)
            arr = np.where(fringe_mask, arr * (1.0 - fringe_amount) + fringe_col_r * fringe_amount, arr)

    else:
        if threshold > 0.005:
            low = 128.0 - (1.0 - t_val) * 128.0
            high = 128.0 + (1.0 - t_val) * 128.0
            arr = np.clip((arr - low) / max(1e-4, high - low) * 255.0, 0.0, 255.0)
        else:
            arr = np.clip((arr - 128.0) * (1.18 + norm_dist * 0.25) + 128.0, 0.0, 255.0)

        if dither > 0.01:
            tile_y = (h + 3) // 4
            tile_x = (w + 3) // 4
            dither_pattern = np.tile(BAYER_4X4, (tile_y, tile_x))[:h, :w]
            for c in range(3):
                arr[:, :, c] = np.clip(arr[:, :, c] + dither_pattern * (255.0 * 0.16 * dither), 0.0, 255.0)

    # ---------------------------------------------------------
    # 6. Gritty Archival Paper Texture (Continuous Grain, Zero White Dots)
    # ---------------------------------------------------------
    paper_noise = (np.random.rand(h, w, 1) - 0.5) * (14.0 + 16.0 * norm_dist)
    roller_tooth = (np.random.rand(1, w, 1) - 0.5) * (6.0 + 8.0 * norm_dist)
    arr = np.clip(arr + paper_noise + roller_tooth, 0.0, 255.0)

    # ---------------------------------------------------------
    # 7. CRT Interlacing Scanlines
    # ---------------------------------------------------------
    if scanlines > 0.01:
        y_indices = np.arange(h)
        scanline_mod = (np.sin(y_indices * 1.5) * 0.5 + 0.5)[:, np.newaxis, np.newaxis]
        dim = 1.0 - (scanline_mod * 0.22 * scanlines)
        arr = np.clip(arr * dim, 0.0, 255.0)

    result = Image.fromarray(np.uint8(np.clip(arr, 0, 255)))
    return result

def main():
    parser = argparse.ArgumentParser(description="Glitchit — Untitled.jpg Glitch Art Engine")
    parser.add_argument("input", help="Path to input image file")
    parser.add_argument("-o", "--output", default="output-glitch.png", help="Output path (default: output-glitch.png)")
    parser.add_argument("-p", "--preset", choices=["subtle", "untitled", "total-decay", "total_decay"], default=None,
                        help="Quick style preset: subtle, untitled, total-decay")
    parser.add_argument("-d", "--distortion", type=int, default=None, help="Distortion amount integer 0 to 10 (default: 5 or preset)")
    parser.add_argument("-m", "--mode", choices=["duotone", "color"], default="duotone", help="Color mode: duotone or color (default: duotone)")
    parser.add_argument("--scanlines", type=float, default=None, help="Scanlines intensity 0.0 to 1.0")
    parser.add_argument("--dither", type=float, default=None, help="Bayer dither intensity 0.0 to 1.0")
    parser.add_argument("--rgb-shift", type=float, default=None, help="Chromatic aberration split 0.0 to 1.0")
    parser.add_argument("--clusters", type=float, default=None, help="Data corruption pixel clusters intensity 0.0 to 1.0")
    parser.add_argument("--threshold", type=float, default=None, help="Zine high-contrast threshold intensity 0.0 to 1.0")
    parser.add_argument("--shadow", default="#101010", help="Duotone shadow hex color (default: #101010)")
    parser.add_argument("--highlight", default="#E84A5F", help="Duotone highlight hex color (default: #E84A5F)")
    parser.add_argument("-s", "--seed", type=int, default=42, help="Random seed for reproducibility (default: 42)")

    args = parser.parse_args()

    # Determine default values based on preset if provided, otherwise standard defaults
    preset_vals = PRESETS.get(args.preset, {
        "distortion": 5,
        "rgb_shift": 0.35,
        "dither": 0.45,
        "scanlines": 0.65,
        "clusters": 0.50,
        "threshold": 0.0,
    })

    distortion = args.distortion if args.distortion is not None else preset_vals["distortion"]
    rgb_shift = args.rgb_shift if args.rgb_shift is not None else preset_vals["rgb_shift"]
    dither = args.dither if args.dither is not None else preset_vals["dither"]
    scanlines = args.scanlines if args.scanlines is not None else preset_vals["scanlines"]
    clusters = args.clusters if args.clusters is not None else preset_vals["clusters"]
    threshold = args.threshold if args.threshold is not None else preset_vals["threshold"]

    try:
        img = Image.open(args.input)
    except Exception as e:
        print(f"Error opening image {args.input}: {e}", file=sys.stderr)
        sys.exit(1)

    result = apply_glitch(
        img,
        distortion=distortion,
        mode=args.mode,
        scanlines=scanlines,
        dither=dither,
        rgb_shift=rgb_shift,
        clusters=clusters,
        threshold=threshold,
        shadow=hex_to_rgb(args.shadow),
        highlight=hex_to_rgb(args.highlight),
        seed=args.seed
    )

    result.save(args.output)
    print(f"Glitch applied successfully -> {args.output}")

if __name__ == "__main__":
    main()
