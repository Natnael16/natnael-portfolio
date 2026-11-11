#!/usr/bin/env python3
"""Turn the intro clip into a seamless looping hero video plus stills.

The source voice runs edge to edge, so instead of cross-fading speech into speech
(which would garble the last word into "Hi"), the loop plays the clip once, holds the
last frame, dissolves back to the first frame over GAP seconds of silence, and repeats.
Lips are never retimed.

usage: build-hero-assets.py SOURCE.mp4 OUT_DIR [--crop W:H:X:Y] [--photo PORTRAIT.jpg]
"""
import argparse
import subprocess
from pathlib import Path

GAP = 0.6  # seconds of silent dissolve between loops
# Lift the light-grey backdrop (~226-238) to pure white without touching darks.
WHITEN = "curves=all='0/0 0.5/0.53 0.88/1'"


def run(*args: str) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(out.strip())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("out_dir")
    ap.add_argument("--crop", default="616:768:374:0", help="crop around the person, head to toe")
    ap.add_argument("--photo", help="real photo for the ID-card portrait")
    a = ap.parse_args()

    src = Path(a.source)
    out = Path(a.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    d = duration(src)

    graph = (
        f"[0:v]crop={a.crop},{WHITEN},setsar=1,fps=24,format=yuv420p,split[a][b];"
        # A: whole clip, then the last frame held for GAP seconds.
        f"[a]tpad=stop_mode=clone:stop_duration={GAP}[held];"
        # B: the first frame as a still, long enough to cover the dissolve.
        f"[b]trim=end_frame=1,loop=loop=-1:size=1,trim=duration={GAP + 0.1},setpts=PTS-STARTPTS[first];"
        f"[held][first]xfade=transition=fade:duration={GAP}:offset={d:.3f},trim=duration={d + GAP:.3f}[v];"
        # Voice once, short edge fades against clicks, then silence through the dissolve.
        f"[0:a]afade=t=in:d=0.01,afade=t=out:st={d - 0.03:.3f}:d=0.03,apad=whole_dur={d + GAP:.3f}[aud]"
    )
    common = ["-i", str(src), "-filter_complex", graph, "-map", "[v]", "-map", "[aud]"]

    run(*common, "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-ar", "48000", "-movflags", "+faststart", str(out / "hero.mp4"))
    run(*common, "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1",
        "-c:a", "libopus", "-b:a", "80k", "-ar", "48000", str(out / "hero.webm"))

    # Social card: the closing smile, on white.
    run("-ss", "5.1", "-i", str(src), "-frames:v", "1",
        "-vf", f"crop={a.crop},{WHITEN},scale=-1:600,pad=1200:630:(ow-iw)/2:15:white",
        "-q:v", "3", str(out / "og.jpg"))

    if a.photo:
        # Head-to-shirt crop at 480x600 for the ID card.
        run("-i", a.photo, "-frames:v", "1",
            "-vf", "crop='min(iw,ih*0.8)':'min(ih,iw/0.8)',scale=480:600",
            "-quality", "85", str(out / "portrait-bust.webp"))


if __name__ == "__main__":
    main()
