#!/usr/bin/env python3
"""SV Vault Scope icon — no baked rounded-rect, no wordmark."""

from math import cos, radians, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG = (11, 15, 12)
GOLD = (196, 165, 116)
SAGE = (124, 154, 114)
CREAM = (232, 226, 214)


def font(size: int):
    for p in (r"C:\Windows\Fonts\georgia.ttf", r"C:\Windows\Fonts\times.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def paint(size: int, *, padded: bool = False) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    cx = int(size * 0.47)
    cy = int(size * 0.52)
    r = int(size * (0.28 if padded else 0.34))
    width = max(2, size // 42)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=GOLD, width=width)
    # sage blip at 2 o'clock on the ring
    ang = radians(60)  # from 12, clockwise
    bx = cx + r * sin(ang)
    by = cy - r * cos(ang)
    br = max(3, size // 36)
    draw.ellipse((bx - br, by - br, bx + br, by + br), fill=SAGE)
    mark = font(max(18, int(size * 0.22)))
    box = draw.textbbox((0, 0), "SV", font=mark)
    draw.text(
        (cx - (box[2] - box[0]) / 2, cy - (box[3] - box[1]) / 2 - size * 0.02),
        "SV",
        font=mark,
        fill=GOLD,
    )
    return img


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print("wrote", path.relative_to(ROOT))


def main() -> None:
    master = paint(1024)
    save(master, ROOT / "store" / "icon-1024.png")
    save(paint(512), ROOT / "store" / "icon-512.png")
    save(paint(192), ROOT / "public" / "pwa-192.png")
    save(paint(512), ROOT / "public" / "pwa-512.png")
    save(paint(180), ROOT / "public" / "apple-touch-icon.png")
    save(paint(192), ROOT / "public" / "icons" / "icon-192.png")
    save(paint(512), ROOT / "public" / "icons" / "icon-512.png")
    save(paint(512, padded=True), ROOT / "public" / "icons" / "icon-512-maskable.png")
    save(paint(180), ROOT / "public" / "icons" / "apple-touch-icon.png")
    save(paint(1024), ROOT / "store" / "ios" / "icon-1024.png")
    save(paint(512), ROOT / "store" / "android" / "icon-512.png")
    save(Image.new("RGB", (1024, 1024), BG), ROOT / "store" / "android" / "adaptive-background.png")
    save(paint(1024, padded=True), ROOT / "store" / "android" / "adaptive-foreground.png")

    # Favicon: gold SV on dark vault
    (ROOT / "public" / "favicon.svg").write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="6" fill="#0B0F0C"/>
  <circle cx="16" cy="16.5" r="11" stroke="#c4a574" stroke-width="1.5"/>
  <text x="16" y="21" text-anchor="middle" fill="#c4a574" font-family="Georgia, 'Times New Roman', serif" font-size="11" font-weight="600">SV</text>
</svg>
""",
        encoding="utf-8",
    )
    print("wrote public/favicon.svg")

    og = Image.new("RGB", (1200, 630), BG)
    d = ImageDraw.Draw(og)
    cx, cy = 600, 250
    r = 120
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=GOLD, width=4)
    mark = font(72)
    box = d.textbbox((0, 0), "SV", font=mark)
    d.text((cx - (box[2] - box[0]) / 2, cy - (box[3] - box[1]) / 2 - 8), "SV", font=mark, fill=GOLD)
    title = font(48)
    tbox = d.textbbox((0, 0), "Scratch Vault", font=title)
    d.text((600 - (tbox[2] - tbox[0]) / 2, 420), "Scratch Vault", font=title, fill=CREAM)
    sub = font(20)
    sbox = d.textbbox((0, 0), "Independent remaining-prize desk", font=sub)
    d.text((600 - (sbox[2] - sbox[0]) / 2, 490), "Independent remaining-prize desk", font=sub, fill=GOLD)
    og_path = ROOT / "public" / "og.jpg"
    og.save(og_path, "JPEG", quality=88, optimize=True)
    print("wrote", og_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
