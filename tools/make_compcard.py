"""Build the two-sided A5 comp card PDF -> assets/Intazar-Akash-CompCard-2026.pdf

Usage (from repo root):  python tools/process_media.py && python tools/make_compcard.py
Edit STATS / FOOTER below when measurements or contacts change.
"""
from pathlib import Path
import itertools, tempfile
from PIL import Image
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parent.parent
T = ROOT / "tools"
OUT = ROOT / "assets/Intazar-Akash-CompCard-2026.pdf"

NAME = "INTAZAR AKASH"
TAGLINE = 'Model, Dhaka    6\'0" / 183 cm    Fashion, commercial, TVC, OVC, runway'
STATS = [("Height", '6\'0" / 183 cm'), ("Hair", "Black, curly, long"),
         ("Base", "Dhaka, Bangladesh"), ("Measurements", "On request")]
FOOTER = "Brand face, Hazzel Fashion"          # add email / WhatsApp / website here
BACK = [("bun", .5, .3), ("yellow", .45, .45), ("beach2", .5, .5), ("seated", .4, .3)]

for n, f in [("Bodoni", "bodoni500.ttf"), ("Inter", "inter400.ttf"), ("InterSB", "inter600.ttf")]:
    pdfmetrics.registerFont(TTFont(n, str(T / "fonts" / f)))

W, H = A5; INK = (.1, .1, .09); tmp = Path(tempfile.mkdtemp()); n = itertools.count()
c = canvas.Canvas(str(OUT), pagesize=A5)
c.setTitle("Intazar Akash — Comp Card"); c.setAuthor("S M Intazar Ahmed Akash")

def src(name): return T / f".cache_{name}.jpg"

def cover(name, x, y, w, h, fx=.5, fy=.5):
    im = Image.open(src(name)); iw, ih = im.size
    s = max(w / iw, h / ih); cw, ch = w / s, h / s; l = (iw - cw) * fx; t = (ih - ch) * fy
    crop = im.crop((int(l), int(t), int(l + cw), int(t + ch)))
    crop.thumbnail((int(w * 300 / 72), int(h * 300 / 72)))
    p = tmp / f"c{next(n)}.jpg"; crop.save(p, "JPEG", quality=84); c.drawImage(str(p), x, y, w, h)

def bg(): c.setFillColorRGB(.965, .96, .95); c.rect(0, 0, W, H, fill=1, stroke=0)

# Front: full-length suit shot (never crop the feet)
bg(); bottom = 78; ih = H - bottom - 18; iw = ih * 1012 / 1800
cover("suit", (W - iw) / 2, bottom, iw, ih)
c.setFillColorRGB(*INK); c.setFont("Bodoni", 34); c.drawString(22, 40, NAME)
c.setFont("Inter", 8.5); c.setFillColorRGB(.35, .34, .32); c.drawString(24, 22, TAGLINE)
c.showPage()

# Back: 2x2 grid + stats
bg(); m = 18; g = 8; gw = (W - 2 * m - g) / 2; gh = gw * 1.25; top = H - m
for i, (f, fx, fy) in enumerate(BACK):
    col, row = i % 2, i // 2
    cover(f, m + col * (gw + g), top - (row + 1) * gh - row * g, gw, gh, fx, fy)
y = top - 2 * gh - g - 30
c.setFillColorRGB(*INK); c.setFont("Bodoni", 20); c.drawString(m, y, NAME); y -= 20
colw = (W - 2 * m) / 4
for i, (k, v) in enumerate(STATS):
    x = m + i * colw
    c.setFont("Inter", 6.5); c.setFillColorRGB(.45, .44, .42); c.drawString(x, y, k)
    c.setFont("InterSB", 8); c.setFillColorRGB(*INK); c.drawString(x, y - 11, v)
c.setFont("Inter", 7); c.setFillColorRGB(.45, .44, .42); c.drawString(m, m, FOOTER)
c.save(); print("wrote", OUT)
