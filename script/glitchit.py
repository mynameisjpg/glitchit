#!/usr/bin/env python3
"""
Glitchit — Deterministic Image Glitch Processor
Aesthetic: Untitled.jpg (Editorial Digital Surrealism)
Supports:
  - Duotone vs Color mode
  - Distortion scale (0.0 to 10.0)
  - Horizontal slice tearing
  - Chromatic aberration (RGB channel shift)
  - Bayer ordered dithering & CRT scanlines
"""

import sys
import argparse
import random
from PIL import Image, ImageOps
import numpy as np

# 4x4 Bayer Dithering Matrix
BAYER_4X4 = np.array([
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
], dtype=np.float32) / 16.0 - 0.5

HEX_SHADOW = (16, 16, 16)      # #101010
HEX_HIGHLIGHT = (232, 74, 95)  # #E84A5F

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def apply_glitch(img, distortion=5, mode='duotone', scanlines=0.6, dither=0.45, rgb_shift=0.75,
                 grid=0.0, waveform=0.0, threshold=0.0, boxes=0.0,
                 shadow=HEX_SHADOW, highlight=HEX_HIGHLIGHT, seed=42):
    random.seed(seed)
    np.random.seed(int(seed) % (2**32 - 1))

    img = img.convert('RGB')
    w, h = img.size
    arr = np.array(img, dtype=np.float32)

    norm_dist = max(0.0, min(10.0, float(distortion))) / 10.0

    # 1. Macroblock / Rectangular Displacements (2D Chunky Glitch from references)
    if norm_dist > 0.1:
        num_blocks = int(2 + norm_dist * 20)
        for _ in range(num_blocks):
            bw = random.randint(int(w * 0.05), int(w * 0.35))
            bh = random.randint(int(h * 0.03), int(h * 0.22))
            bx = random.randint(0, max(1, w - bw))
            by = random.randint(0, max(1, h - bh))
            
            # Offset direction: mainly horizontal, subtle vertical
            shift_x = int(random.uniform(-0.16, 0.16) * w * (0.3 + norm_dist))
            shift_y = int(random.uniform(-0.04, 0.04) * h * norm_dist)
            
            src_x = np.clip(bx + shift_x, 0, w - bw)
            src_y = np.clip(by + shift_y, 0, h - bh)
            
            chunk = arr[src_y:src_y+bh, src_x:src_x+bw].copy()
            
            # Block variations matching reference benchmarks:
            rnd_effect = random.random()
            if rnd_effect < 0.28:
                # Local mosaic / pixelation
                pix_size = max(2, int(4 + norm_dist * 12))
                small_h = max(1, bh // pix_size)
                small_w = max(1, bw // pix_size)
                chunk_img = Image.fromarray(np.uint8(np.clip(chunk, 0, 255)))
                chunk_img = chunk_img.resize((small_w, small_h), Image.NEAREST).resize((bw, bh), Image.NEAREST)
                chunk = np.array(chunk_img, dtype=np.float32)
            elif rnd_effect < 0.46 and norm_dist > 0.35:
                # Solarization / negative inversion
                chunk = 255.0 - chunk
            elif rnd_effect < 0.62:
                # Exposure pop / brightness flash
                chunk = np.clip(chunk * 1.35 + 30.0, 0.0, 255.0)

            arr[by:by+bh, bx:bx+bw] = chunk

    # 2. Vertical Pixel Melting / Drop Streaks (as in product & portrait references)
    if norm_dist > 0.12:
        num_streaks = int(3 + norm_dist * 16)
        for _ in range(num_streaks):
            sw = random.randint(2, max(3, int(w * 0.05 * norm_dist)))
            sx = random.randint(0, max(1, w - sw))
            sy = random.randint(0, max(1, int(h * 0.65)))
            s_len = random.randint(int(h * 0.08), min(h - sy, int(h * (0.25 + norm_dist * 0.5))))
            
            if s_len > 2:
                sample_row = arr[sy, sx:sx+sw, :]
                streak = np.tile(sample_row, (s_len, 1, 1))
                fade = np.linspace(1.0, random.uniform(0.72, 0.95), s_len)[:, np.newaxis, np.newaxis]
                arr[sy:sy+s_len, sx:sx+sw, :] = streak * fade

    # 3. Horizontal Slice Tearing (Variable thickness bands & light scan bars)
    if norm_dist > 0.02:
        slice_count = int(14 + norm_dist * 48)
        slice_height = max(2, h // slice_count)
        
        for y_start in range(0, h, slice_height):
            y_end = min(h, y_start + slice_height)
            if random.random() < (norm_dist * 0.72):
                max_shift = int((0.02 + norm_dist * 0.12) * w)
                shift = random.randint(-max_shift, max_shift)
                if shift != 0:
                    arr[y_start:y_end] = np.roll(arr[y_start:y_end], shift, axis=1)
                    
                    # Highlight flash bar on select slices (as seen in camera reference)
                    if random.random() < (0.12 * norm_dist):
                        arr[y_start:y_end] = np.clip(arr[y_start:y_end] * 1.5 + 50.0, 0.0, 255.0)

    # 4. Chromatic Aberration (RGB Channel Split + Anaglyph Offset)
    shift_amount = int((1.0 + norm_dist * w * 0.04) * rgb_shift)
    if shift_amount > 0:
        r_channel = np.roll(arr[:, :, 0], shift_amount, axis=1)
        g_channel = arr[:, :, 1]
        b_channel = np.roll(arr[:, :, 2], -shift_amount, axis=1)
        arr = np.stack([r_channel, g_channel, b_channel], axis=2)

    # 5. Color Treatment (Duotone vs Color + Signature 3: Zine Thresholding)
    if mode == 'duotone':
        # Calculate standard perceptual luminance
        lum = (0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]) / 255.0
        
        # Signature 3: High-Contrast Zine Thresholding
        if threshold > 0.01:
            t_val = threshold * 0.94
            low = 0.5 - (1.0 - t_val) * 0.5
            high = 0.5 + (1.0 - t_val) * 0.5
            lum = np.clip((lum - low) / max(1e-4, high - low), 0.0, 1.0)

        # Apply Bayer Dither to luminance
        if dither > 0.01:
            tile_y = (h + 3) // 4
            tile_x = (w + 3) // 4
            dither_pattern = np.tile(BAYER_4X4, (tile_y, tile_x))[:h, :w]
            lum = np.clip(lum + dither_pattern * (0.22 * dither), 0.0, 1.0)

        # 2-Tone Palette Interpolation (Shadow -> Highlight)
        s = np.array(shadow, dtype=np.float32)
        hi = np.array(highlight, dtype=np.float32)
        t = lum[:, :, np.newaxis]
        arr = s * (1.0 - t) + hi * t
    else:
        # Full color: contrast boost, optional zine thresholding, and subtle dither
        if threshold > 0.01:
            t_val = threshold * 0.94
            low = 128.0 - (1.0 - t_val) * 128.0
            high = 128.0 + (1.0 - t_val) * 128.0
            arr = np.clip((arr - low) / max(1e-4, high - low) * 255.0, 0.0, 255.0)
        else:
            arr = np.clip((arr - 128.0) * (1.12 + norm_dist * 0.2) + 128.0, 0.0, 255.0)

        if dither > 0.01:
            tile_y = (h + 3) // 4
            tile_x = (w + 3) // 4
            dither_pattern = np.tile(BAYER_4X4, (tile_y, tile_x))[:h, :w]
            for c in range(3):
                arr[:, :, c] = np.clip(arr[:, :, c] + dither_pattern * (255.0 * 0.14 * dither), 0.0, 255.0)

    # 6. Photocopy / Film Noise & Xerox Dust Texture
    if norm_dist > 0.05:
        noise = (np.random.rand(h, w, 1) - 0.5) * (36.0 * norm_dist)
        arr = np.clip(arr + noise, 0.0, 255.0)
        
        # Sparse dust / scratch specks
        num_specks = int(8 + norm_dist * 60)
        for _ in range(num_specks):
            px = random.randint(0, w - 1)
            py = random.randint(0, h - 1)
            plen = random.randint(1, max(2, int(w * 0.015)))
            color_val = 245.0 if random.random() > 0.3 else 15.0
            arr[py, px:min(w, px+plen)] = color_val

    # 7. Scanlines & Interlacing
    if scanlines > 0.01:
        y_indices = np.arange(h)
        scanline_mod = (np.sin(y_indices * 1.5) * 0.5 + 0.5)[:, np.newaxis, np.newaxis]
        dim = 1.0 - (scanline_mod * 0.2 * scanlines)
        arr = np.clip(arr * dim, 0.0, 255.0)

    # --- SIGNATURE 1: Cartesian Grids & Tech Schematics ---
    if grid > 0.01:
        grid_step = max(24, int(min(w, h) / 16))
        x_idx = np.arange(w)
        y_idx = np.arange(h)
        x_mask = (x_idx % grid_step == 0)[np.newaxis, :]
        y_mask = (y_idx % grid_step == 0)[:, np.newaxis]
        line_mask = x_mask | y_mask

        # Crosshairs (+) at grid intersections (5px ticks)
        cross_mask = np.zeros((h, w), dtype=bool)
        inter_y = np.where(y_idx % grid_step == 0)[0]
        inter_x = np.where(x_idx % grid_step == 0)[0]
        for iy in inter_y:
            for ix in inter_x:
                y0 = max(0, iy - 2); y1 = min(h, iy + 3)
                x0 = max(0, ix - 2); x1 = min(w, ix + 3)
                cross_mask[y0:y1, ix] = True
                cross_mask[iy, x0:x1] = True

        target_col = np.array(highlight if mode == 'duotone' else (255, 255, 255), dtype=np.float32)
        line_factor = float(grid * 0.32)
        cross_factor = float(grid * 0.70)
        arr[line_mask] = arr[line_mask] * (1.0 - line_factor) + target_col * line_factor
        arr[cross_mask] = arr[cross_mask] * (1.0 - cross_factor) + target_col * cross_factor

    # --- SIGNATURE 2: Oscilloscope Waveforms ---
    if waveform > 0.01:
        y_base = int(h * 0.58)
        x_coords = np.arange(w)
        pulse_center = int(w * (0.35 + 0.3 * (seed % 100) / 100.0))
        pulse_width = max(8, int(w * 0.04))
        spike = np.exp(-((x_coords - pulse_center) / pulse_width) ** 2) * np.sin((x_coords - pulse_center) * 0.3) * (h * 0.16)
        carrier = np.sin(x_coords * 0.035 + seed) * (h * 0.02)
        y_wave = np.clip((y_base + spike + carrier).astype(int), 0, h - 1)

        target_col = np.array(highlight if mode == 'duotone' else (255, 65, 85), dtype=np.float32)
        wf_alpha = float(min(1.0, waveform * 0.85))

        for x in range(w):
            yw = y_wave[x]
            y_min = max(0, yw - 1)
            y_max = min(h, yw + 2)
            arr[y_min:y_max, x, :] = arr[y_min:y_max, x, :] * (1.0 - wf_alpha) + target_col * wf_alpha

    # --- SIGNATURE 4: Window / Specimen Frame Cascades ---
    if boxes > 0.01:
        target_col = np.array(highlight if mode == 'duotone' else (245, 245, 245), dtype=np.float32)
        box_alpha = float(min(1.0, boxes * 0.80))
        boxes_spec = [
            (int(w * 0.14), int(h * 0.18), int(w * 0.54), int(h * 0.66)),
            (int(w * 0.44), int(h * 0.38), int(w * 0.86), int(h * 0.82))
        ]
        for bx1, by1, bx2, by2 in boxes_spec:
            # 1px border lines
            arr[by1, bx1:bx2, :] = arr[by1, bx1:bx2, :] * (1.0 - box_alpha) + target_col * box_alpha
            arr[by2, bx1:bx2, :] = arr[by2, bx1:bx2, :] * (1.0 - box_alpha) + target_col * box_alpha
            arr[by1:by2, bx1, :] = arr[by1:by2, bx1, :] * (1.0 - box_alpha) + target_col * box_alpha
            arr[by1:by2, bx2, :] = arr[by1:by2, bx2, :] * (1.0 - box_alpha) + target_col * box_alpha

            # Corner brackets / ticks
            c_len = max(4, int(min(w, h) * 0.025))
            for cx, cy in [(bx1, by1), (bx2, by1), (bx1, by2), (bx2, by2)]:
                xa = max(0, cx - c_len); xb = min(w, cx + c_len)
                ya = max(0, cy - c_len); yb = min(h, cy + c_len)
                arr[cy, xa:xb, :] = arr[cy, xa:xb, :] * (1.0 - box_alpha) + target_col * box_alpha
                arr[ya:yb, cx, :] = arr[ya:yb, cx, :] * (1.0 - box_alpha) + target_col * box_alpha

    result = Image.fromarray(np.uint8(np.clip(arr, 0, 255)))
    return result

def main():
    parser = argparse.ArgumentParser(description="Glitchit — Untitled.jpg Glitch Art Engine")
    parser.add_argument("input", help="Path to input image file")
    parser.add_argument("-o", "--output", default="output-glitch.png", help="Output path (default: output-glitch.png)")
    parser.add_argument("-d", "--distortion", type=int, default=5, help="Distortion amount integer 0 to 10 (default: 5)")
    parser.add_argument("-m", "--mode", choices=["duotone", "color"], default="duotone", help="Color mode: duotone or color (default: duotone)")
    parser.add_argument("--scanlines", type=float, default=0.65, help="Scanlines intensity 0.0 to 1.0 (default: 0.65)")
    parser.add_argument("--dither", type=float, default=0.45, help="Bayer dither intensity 0.0 to 1.0 (default: 0.45)")
    parser.add_argument("--rgb-shift", type=float, default=0.75, help="Chromatic aberration split 0.0 to 1.0 (default: 0.75)")
    
    # 4 Key Visual Signatures
    parser.add_argument("--grid", type=float, default=0.0, help="Cartesian coordinate grid intensity 0.0 to 1.0 (default: 0.0)")
    parser.add_argument("--waveform", type=float, default=0.0, help="Oscilloscope frequency wave intensity 0.0 to 1.0 (default: 0.0)")
    parser.add_argument("--threshold", type=float, default=0.0, help="Zine high-contrast threshold intensity 0.0 to 1.0 (default: 0.0)")
    parser.add_argument("--boxes", type=float, default=0.0, help="Specimen framing boxes intensity 0.0 to 1.0 (default: 0.0)")

    parser.add_argument("--seed", type=int, default=42, help="Noise random seed")
    parser.add_argument("--shadow", default="#101010", help="Duotone shadow hex (default: #101010)")
    parser.add_argument("--highlight", default="#E84A5F", help="Duotone highlight hex (default: #E84A5F)")

    args = parser.parse_args()

    try:
        img = Image.open(args.input)
    except Exception as e:
        print(f"Error reading image '{args.input}': {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Processing '{args.input}' [Mode: {args.mode}, Distortion: {args.distortion}]...")
    out = apply_glitch(
        img,
        distortion=args.distortion,
        mode=args.mode,
        scanlines=args.scanlines,
        dither=args.dither,
        rgb_shift=args.rgb_shift,
        grid=args.grid,
        waveform=args.waveform,
        threshold=args.threshold,
        boxes=args.boxes,
        shadow=hex_to_rgb(args.shadow),
        highlight=hex_to_rgb(args.highlight),
        seed=args.seed
    )

    out.save(args.output)
    print(f"[OK] Saved glitched output to '{args.output}'")

if __name__ == "__main__":
    main()
