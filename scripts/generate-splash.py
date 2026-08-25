#!/usr/bin/env python3
"""Capacitor / web splash: SV monogram, radar ring, no baked rounded-rect."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG = (11, 15, 12)
GOLD = (196, 165, 116)
SAGE = (124, 154, 114)
PAPER = (232, 226, 214)


def font(size: int, mono: bool = False):
    paths = (
        [r"C:\Windows\Fonts\consola.ttf"]
        if mono
        else [r"C:\Windows\Fonts\georgia.ttf", r"C:\Windows\Fonts\times.ttf"]
    )
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw_centered(draw, text, y, fnt, fill, width):
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text(((width - (box[2] - box[0])) / 2, y), text, font=fnt, fill=fill)


def compose(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, int(h * 0.44)
    r = int(min(w, h) * 0.16)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=GOLD, width=max(2, w // 400))
    draw.ellipse(
        (cx - int(r * 0.72), cy - int(r * 0.72), cx + int(r * 0.72), cy + int(r * 0.72)),
        outline=(*SAGE, ),
        width=max(1, w // 700),
    )
    draw.ellipse(
        (cx - int(r * 0.42), cy - int(r * 0.42), cx + int(r * 0.42), cy + int(r * 0.42)),
        outline=GOLD,
        width=max(1, w // 700),
    )
    mark = font(max(28, r // 2))
    box = draw.textbbox((0, 0), "SV", font=mark)
    draw.text((cx - (box[2] - box[0]) / 2, cy - (box[3] - box[1]) / 2 - 4), "SV", font=mark, fill=PAPER)
    word = font(max(14, w // 48), mono=True)
    draw_centered(draw, "VOLUNTEER SCRATCH VAULT", cy + r + int(h * 0.04), word, GOLD, w)
    return img


def main() -> None:
    out = ROOT / "store" / "splash"
    out.mkdir(parents=True, exist_ok=True)
    icon = compose((1024, 1024))
    icon.save(out / "splash-icon.png", "PNG")
    full = compose((2732, 2732))
    full.save(out / "splash-2732.png", "PNG")
    phone = compose((1284, 2778))
    phone.save(out / "splash-phone.png", "PNG")

    ios = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"
    if ios.exists():
        for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
            full.save(ios / name, "PNG")

    android = ROOT / "android" / "app" / "src" / "main" / "res"
    if android.exists():
        phone.save(android / "drawable" / "splash.png", "PNG")
        for folder in android.iterdir():
            if folder.name.startswith("drawable-") and (folder / "splash.png").exists():
                phone.save(folder / "splash.png", "PNG")

    print("wrote splash assets")


if __name__ == "__main__":
    main()
