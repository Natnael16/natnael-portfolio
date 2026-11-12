#!/usr/bin/env python3
"""Cut the hero character out of its white backdrop for a dark page.

Reads the white-background loop made by build-hero-assets.py and writes, next to it:
  hero-alpha.webm  VP9 with an alpha channel (Chrome, Edge, Firefox, Android)
  hero-dark.mp4    the same frames blended onto the page colour (Safari / iOS, which
                   cannot play transparent WebM)
  poster-alpha.webp, poster-dark.webp  first frames for each

Only white that is connected to the frame's edge is removed, and strong outlines stop the
fill, so the white T-shirt stays solid. White sneakers sit on a white floor and partly lose
their edges; the page fades the bottom of the video out to hide that.

usage: build-dark-hero.py public/hero [--bg 120a09]
"""
import argparse
import subprocess
from pathlib import Path

import numpy as np

THRESHOLD = 26  # how far from pure white still counts as backdrop (0-255)
EDGE = 6  # local contrast that stops the fill


def probe(path: Path) -> tuple[int, int, str]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip().split(",")
    return int(out[0]), int(out[1]), out[2]


def alpha_for(frame: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    f = frame.astype(np.float32)
    d = 255 - f.min(axis=2)
    m = f.mean(axis=2)
    gy = np.abs(np.diff(m, axis=0, prepend=m[:1]))
    gx = np.abs(np.diff(m, axis=1, prepend=m[:, :1]))
    cand = (d < THRESHOLD) & ~(np.maximum(gx, gy) > EDGE)
    bg = np.zeros_like(cand)
    bg[0, :] = cand[0, :]
    bg[:, 0] = cand[:, 0]
    bg[:, -1] = cand[:, -1]
    while True:
        grown = bg.copy()
        grown[1:] |= bg[:-1]
        grown[:-1] |= bg[1:]
        grown[:, 1:] |= bg[:, :-1]
        grown[:, :-1] |= bg[:, 1:]
        grown &= cand
        if np.array_equal(grown, bg):
            break
        bg = grown
    # Close one-pixel gaps the outline test left inside the backdrop.
    neighbours = sum(np.roll(np.roll(bg, dy, 0), dx, 1).astype(np.uint8) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    bg |= (neighbours >= 3) & (d < THRESHOLD * 1.6)
    solid = np.where(bg, 0.0, 1.0)
    soft = solid.copy()
    soft[1:-1, 1:-1] = (solid[1:-1, 1:-1] * 4 + solid[:-2, 1:-1] + solid[2:, 1:-1] + solid[1:-1, :-2] + solid[1:-1, 2:]) / 8
    shadow = np.clip((d - 2) / 40, 0, 0.45) * bg  # the floor shadow, kept as a soft dark patch
    a = np.maximum(soft, shadow)
    rgb = np.where((bg & (soft <= 0))[..., None], 0, f)
    return rgb, a


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("hero_dir")
    ap.add_argument("--bg", default="120a09", help="page colour for the Safari version, hex without #")
    args = ap.parse_args()
    root = Path(args.hero_dir)
    src = root / "hero.mp4"
    w, h, fps = probe(src)
    bg = np.array([int(args.bg[i : i + 2], 16) for i in (0, 2, 4)], np.float32)

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    common_in = ["-f", "rawvideo", "-s", f"{w}x{h}", "-r", fps]
    alpha_enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", *common_in, "-pix_fmt", "rgba", "-i", "-", "-i", str(root / "hero.webm"),
         "-map", "0:v", "-map", "1:a", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0",
         "-crf", "34", "-b:v", "0", "-row-mt", "1", "-c:a", "copy", "-shortest", str(root / "hero-alpha.webm")],
        stdin=subprocess.PIPE,
    )
    dark_enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", *common_in, "-pix_fmt", "rgb24", "-i", "-", "-i", str(src),
         "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-pix_fmt", "yuv420p",
         "-c:a", "copy", "-movflags", "+faststart", "-shortest", str(root / "hero-dark.mp4")],
        stdin=subprocess.PIPE,
    )
    size = w * h * 3
    n = 0
    while True:
        buf = dec.stdout.read(size)
        if len(buf) < size:
            break
        rgb, a = alpha_for(np.frombuffer(buf, np.uint8).reshape(h, w, 3))
        rgba = np.dstack([rgb, a * 255]).astype(np.uint8)
        alpha_enc.stdin.write(rgba.tobytes())
        dark = rgb * a[..., None] + bg * (1 - a[..., None])
        dark_enc.stdin.write(dark.astype(np.uint8).tobytes())
        if n == 0:
            for name, data, fmt in (("poster-alpha.webp", rgba, "rgba"), ("poster-dark.webp", dark.astype(np.uint8), "rgb24")):
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", fmt, "-s", f"{w}x{h}", "-i", "-",
                                "-quality", "82", str(root / name)], input=data.tobytes(), check=True)
        n += 1
    for enc in (alpha_enc, dark_enc):
        enc.stdin.close()
        enc.wait()
    dec.wait()
    print(f"{n} frames → hero-alpha.webm, hero-dark.mp4")


if __name__ == "__main__":
    main()
