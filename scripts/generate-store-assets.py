#!/usr/bin/env python3
"""Rasterize store + PWA icons, splashes, and screenshot placeholders.

SV lettering is drawn in code so it cannot come out misspelled.
Backgrounds are the editorial desk textures generated for this brand.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SESSION_IMAGES = Path.home() / ".grok" / "sessions"
BG_ICON = SESSION_IMAGES / r"C%3A%5CUsers%5Cchris.woodmore\01a008ec-5c0e-7023-ae28-f634ec5b310e" / "images" / "1.jpg"
BG_SPLASH = SESSION_IMAGES / r"C%3A%5CUsers%5Cchris.woodmore\01a008ec-5c0e-7023-ae28-f634ec5b310e" / "images" / "2.jpg"

# Fallback: look next to this script if session paths move
LOCAL_ICON = ROOT / "store" / "_src" / "icon-bg.jpg"
LOCAL_SPLASH = ROOT / "store" / "_src" / "splash-bg.jpg"

INK = (241, 241, 242)
MUTED = (154, 154, 163)
FAINT = (109, 109, 118)
LINE = (42, 42, 48)
BG = (10, 10, 11)
SURFACE = (18, 18, 20)
RAISED = (26, 26, 30)
GOLD = (243, 193, 91)
WARM = (224, 138, 44)
ACCENT = (213, 216, 222)


def font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        [r"C:\Windows\Fonts\consola.ttf", r"C:\Windows\Fonts\cour.ttf"]
        if mono
        else [
            r"C:\Windows\Fonts\georgia.ttf",
            r"C:\Windows\Fonts\times.ttf",
            r"C:\Windows\Fonts\segoeui.ttf",
        ]
    )
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def load_bg(path: Path, size: tuple[int, int]) -> Image.Image:
    src = path if path.exists() else None
    if src is None:
        img = Image.new("RGB", size, BG)
        return img
    img = Image.open(src).convert("RGB")
    img = img.resize(size, Image.Resampling.LANCZOS)
    return img


def flatten_rgb(img: Image.Image) -> Image.Image:
    if img.mode == "RGB":
        return img
    base = Image.new("RGB", img.size, BG)
    if img.mode == "RGBA":
        base.paste(img, mask=img.split()[-1])
        return base
    return img.convert("RGB")


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, fnt, fill, width: int) -> None:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) / 2, y), text, font=fnt, fill=fill)


def make_icon(size: int, padded: bool = False) -> Image.Image:
    bg_path = LOCAL_ICON if LOCAL_ICON.exists() else BG_ICON
    canvas = load_bg(bg_path, (size, size))
    draw = ImageDraw.Draw(canvas)
    mark = font(int(size * (0.22 if padded else 0.28)))
    sub = font(max(10, int(size * 0.045)), mono=True)
    draw_centered(draw, "SV", int(size * (0.38 if padded else 0.34)), mark, INK, size)
    draw_centered(draw, "SCRATCH VAULT", int(size * 0.66), sub, GOLD, size)
    return flatten_rgb(canvas)


def make_adaptive_fg(size: int = 1024) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    mark = font(int(size * 0.2))
    sub = font(int(size * 0.04), mono=True)
    # Stay inside the 66% safe zone
    draw_centered(draw, "SV", int(size * 0.40), mark, (*INK, 255), size)
    draw_centered(draw, "SCRATCH VAULT", int(size * 0.62), sub, (*GOLD, 255), size)
    return img


def make_splash(size: tuple[int, int]) -> Image.Image:
    bg_path = LOCAL_SPLASH if LOCAL_SPLASH.exists() else BG_SPLASH
    canvas = load_bg(bg_path, size)
    draw = ImageDraw.Draw(canvas)
    w, h = size
    mark = font(int(w * 0.14))
    title = font(int(w * 0.055))
    sub = font(int(w * 0.028), mono=True)
    draw_centered(draw, "SV", int(h * 0.38), mark, INK, w)
    draw_centered(draw, "Scratch Vault", int(h * 0.50), title, INK, w)
    draw_centered(draw, "INDEPENDENT REMAINING-PRIZE DESK", int(h * 0.56), sub, GOLD, w)
    draw_centered(draw, "18+", int(h * 0.86), sub, FAINT, w)
    return flatten_rgb(canvas)


def rounded_rect(draw: ImageDraw.ImageDraw, box, fill, radius: int) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def make_screenshot(size: tuple[int, int], kind: str, label: str) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.06)
    display = font(int(w * 0.07))
    body = font(int(w * 0.038))
    mono = font(int(w * 0.028), mono=True)
    small = font(int(w * 0.024), mono=True)

    # Status bar
    draw.rectangle((0, 0, w, int(h * 0.04)), fill=BG)
    draw.text((pad, int(h * 0.012)), "9:41", font=small, fill=MUTED)

    y = int(h * 0.06)
    draw.text((pad, y), "SV", font=display, fill=INK)
    draw.text((pad, y + int(h * 0.055)), "Scratch Vault", font=body, fill=INK)
    draw.text((pad, y + int(h * 0.095)), "INDEPENDENT REMAINING-PRIZE DESK", font=mono, fill=GOLD)

    y = int(h * 0.20)
    if kind == "desk":
        draw.text((pad, y), "Highest remaining-prize heat", font=display, fill=INK)
        y += int(h * 0.08)
        for chip, x in (("All", pad), ("$5", pad + int(w * 0.18)), ("$10", pad + int(w * 0.36)), ("$20", pad + int(w * 0.56))):
            rounded_rect(draw, (x, y, x + int(w * 0.15), y + int(h * 0.04)), RAISED if chip != "All" else ACCENT, 8)
            fill = BG if chip == "All" else MUTED
            draw.text((x + 14, y + 8), chip, font=small, fill=fill)
        y += int(h * 0.08)
        for name, heat in (
            ("Giant Jumbo Bucks", "HOT"),
            ("Jumbo Bucks Triple Play", "WARM"),
            ("Money Rush", "COOL"),
        ):
            card_h = int(h * 0.12)
            rounded_rect(draw, (pad, y, w - pad, y + card_h), SURFACE, 16)
            draw.text((pad + 28, y + int(card_h * 0.22)), name, font=body, fill=INK)
            draw.text(
                (pad + 28, y + int(card_h * 0.58)),
                "Remaining top  ·  remaining mid  ·  heat",
                font=small,
                fill=FAINT,
            )
            color = GOLD if heat == "HOT" else WARM if heat == "WARM" else MUTED
            tw = draw.textbbox((0, 0), heat, font=small)
            draw.text((w - pad - 28 - (tw[2] - tw[0]), y + int(card_h * 0.24)), heat, font=small, fill=color)
            y += card_h + int(h * 0.02)
    else:
        draw.text((pad, y), "Full Access", font=display, fill=INK)
        y += int(h * 0.07)
        draw.text((pad, y), "$4.99 / month   or   $49.99 / year", font=body, fill=INK)
        y += int(h * 0.05)
        draw.text((pad, y), "7-day free trial  ·  card required  ·  cancel anytime", font=small, fill=MUTED)
        y += int(h * 0.08)
        for title, price in (("Monthly", "$4.99"), ("Annual · Best value", "$49.99")):
            rounded_rect(draw, (pad, y, w - pad, y + int(h * 0.16)), SURFACE, 16)
            draw.text((pad + 24, y + 20), title, font=body, fill=INK)
            draw.text((pad + 24, y + 64), price, font=display, fill=INK)
            y += int(h * 0.19)
        draw.text((pad, y), "Website uses Stripe. Stores use IAP.", font=small, fill=FAINT)

    # Footer help
    fy = h - int(h * 0.12)
    draw.rectangle((0, fy, w, h), fill=SURFACE)
    draw.text((pad, fy + 16), "18+  ·  1-800-GAMBLER  ·  TN REDLINE", font=small, fill=MUTED)
    draw.text((pad, fy + 48), "Not affiliated with the Tennessee Education Lottery.", font=small, fill=FAINT)
    draw.text((pad, h - 36), f"PLACEHOLDER  {label}", font=small, fill=LINE)
    return img


def save_rgb(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    flatten_rgb(img).save(path, "PNG", optimize=True)
    print("wrote", path.relative_to(ROOT))


def save_rgba(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print("wrote", path.relative_to(ROOT))


def main() -> None:
    # Keep source textures in-repo so later regenerations do not depend on session paths
    src_dir = ROOT / "store" / "_src"
    src_dir.mkdir(parents=True, exist_ok=True)
    if BG_ICON.exists() and not LOCAL_ICON.exists():
        Image.open(BG_ICON).convert("RGB").save(LOCAL_ICON, "JPEG", quality=92)
    if BG_SPLASH.exists() and not LOCAL_SPLASH.exists():
        Image.open(BG_SPLASH).convert("RGB").save(LOCAL_SPLASH, "JPEG", quality=92)

    ios_icon = make_icon(1024, padded=False)
    save_rgb(ios_icon, ROOT / "store" / "ios" / "icon-1024.png")
    save_rgb(make_icon(512, padded=False), ROOT / "store" / "android" / "icon-512.png")
    save_rgb(Image.new("RGB", (1024, 1024), BG), ROOT / "store" / "android" / "adaptive-background.png")
    save_rgba(make_adaptive_fg(1024), ROOT / "store" / "android" / "adaptive-foreground.png")

    save_rgb(make_splash((1290, 2796)), ROOT / "store" / "ios" / "splash-1290x2796.png")
    save_rgb(make_splash((1179, 2556)), ROOT / "store" / "ios" / "splash-1179x2556.png")
    save_rgb(make_splash((1080, 1920)), ROOT / "store" / "android" / "splash-1080x1920.png")

    save_rgb(
        make_screenshot((1290, 2796), "desk", "iPhone 6.7-inch"),
        ROOT / "store" / "ios" / "screenshots" / "6.7-desk.png",
    )
    save_rgb(
        make_screenshot((1290, 2796), "pricing", "iPhone 6.7-inch"),
        ROOT / "store" / "ios" / "screenshots" / "6.7-pricing.png",
    )
    save_rgb(
        make_screenshot((1179, 2556), "desk", "iPhone 6.1-inch"),
        ROOT / "store" / "ios" / "screenshots" / "6.1-desk.png",
    )
    save_rgb(
        make_screenshot((1179, 2556), "pricing", "iPhone 6.1-inch"),
        ROOT / "store" / "ios" / "screenshots" / "6.1-pricing.png",
    )
    save_rgb(
        make_screenshot((1080, 1920), "desk", "Play phone 1080x1920"),
        ROOT / "store" / "android" / "screenshots" / "phone-desk.png",
    )
    save_rgb(
        make_screenshot((1080, 1920), "pricing", "Play phone 1080x1920"),
        ROOT / "store" / "android" / "screenshots" / "phone-pricing.png",
    )

    # PWA / web install
    icons = ROOT / "public" / "icons"
    save_rgb(make_icon(192), icons / "icon-192.png")
    save_rgb(make_icon(512), icons / "icon-512.png")
    save_rgb(make_icon(512, padded=True), icons / "icon-512-maskable.png")
    save_rgb(make_icon(180), icons / "apple-touch-icon.png")


if __name__ == "__main__":
    main()
