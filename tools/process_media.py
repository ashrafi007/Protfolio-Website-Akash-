"""Regenerate web assets from originals in source/.

Usage (from repo root):  python tools/process_media.py
Needs: Pillow, ffmpeg on PATH.
"""
import subprocess
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC_P, SRC_V = ROOT / "source/photos", ROOT / "source/video"
OUT_I, OUT_V = ROOT / "assets/images", ROOT / "assets/video"
OUT_I.mkdir(parents=True, exist_ok=True); OUT_V.mkdir(parents=True, exist_ok=True)

# web name -> (source file, long edge px)
PHOTOS = {
    "suit":    ("suit-sepia.jpg", 1800),
    "bun":     ("denim-bun.jpg", 1400),
    "seated":  ("denim-seated.jpg", 1400),
    "yellow":  ("yellow-wall.jpg", 1600),
    "beach1":  ("beach-sleeve.png", 1400),
    "beach2":  ("beach-smile.png", 1400),
    "panjabi": ("panjabi.jpg", 1400),
}
# web name -> (source file, ffmpeg video filter) ; all output 720x900 (4:5)
VIDEOS = {
    "leather": ("leather.mov", "scale=900:900,crop=720:900"),
    "suede":   ("suede.mov", "scale=720:900"),
    "panjabi": ("panjabi.mov", "scale=720:900"),
}

def photos():
    for name, (src, edge) in PHOTOS.items():
        im = ImageOps.exif_transpose(Image.open(SRC_P / src)).convert("RGB")  # also drops EXIF/location
        im.thumbnail((edge, edge), Image.LANCZOS)
        im.save(OUT_I / f"{name}.webp", "WEBP", quality=74, method=6)
        im.save(ROOT / "tools" / f".cache_{name}.jpg", "JPEG", quality=84)  # used by make_compcard.py
        print("image", name, im.size)

def videos():
    for name, (src, vf) in VIDEOS.items():
        out = OUT_V / f"{name}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SRC_V / src),
                        "-vf", f"{vf},fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow",
                        "-crf", "27", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k", str(out)], check=True)
        poster = ROOT / "tools" / f".cache_{name}_poster.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "1.2", "-i", str(out), "-frames:v", "1", str(poster)], check=True)
        Image.open(poster).save(OUT_I / f"{name}_poster.webp", "WEBP", quality=70)
        print("video", name, out.stat().st_size // 1024, "KB")

if __name__ == "__main__":
    photos(); videos()
