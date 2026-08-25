#!/usr/bin/env python3
"""Store screenshot frames: hook, skip, desk, trip, alert, trust."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BG = (11, 15, 12)
RAISED = (20, 26, 22)
LINE = (42, 51, 44)
GOLD = (196, 165, 116)
SAGE = (124, 154, 114)
DANGER = (196, 92, 74)
PAPER = (232, 226, 214)
MUTED = (154, 163, 148)


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


def frame(size, caption, body_fn):
    w, h = size
    img = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(img)
    pad = int(w * 0.07)
    # device chrome
    draw.rounded_rectangle((18, 18, w - 18, h - 18), radius=40, outline=LINE, width=3)
    draw.rounded_rectangle((int(w * 0.35), 28, int(w * 0.65), 42), radius=8, fill=RAISED)
    y = int(h * 0.08)
    draw.text((pad, y), "SV", font=font(int(w * 0.08)), fill=PAPER)
    y += int(h * 0.07)
    draw.text((pad, y), caption, font=font(int(w * 0.07)), fill=GOLD)
    y += int(h * 0.10)
    body_fn(draw, pad, y, w, h)
    draw.rectangle((20, h - int(h * 0.11), w - 20, h - 22), fill=RAISED)
    draw.text(
        (pad, h - int(h * 0.08)),
        "18+  ·  1-800-GAMBLER  ·  independent",
        font=font(int(w * 0.028), mono=True),
        fill=MUTED,
    )
    return img


def hook(draw, pad, y, w, h):
    draw.ellipse((pad, y, pad + int(w * 0.38), y + int(w * 0.38)), outline=GOLD, width=3)
    draw.text((pad + int(w * 0.44), y + 20), "$10 still posted", font=font(int(w * 0.045)), fill=PAPER)
    draw.text((pad + int(w * 0.44), y + 80), "Giant Jumbo Bucks", font=font(int(w * 0.038)), fill=SAGE)
    draw.text((pad + int(w * 0.44), y + 130), "613 mid-tier · heat 71", font=font(int(w * 0.03), True), fill=MUTED)


def skip(draw, pad, y, w, h):
    for i, name in enumerate(("Jumbo Bucks Triple Play", "Money Rush", "Cashword")):
        top = y + i * int(h * 0.09)
        draw.rounded_rectangle((pad, top, w - pad, top + int(h * 0.075)), radius=12, outline=LINE)
        draw.text((pad + 20, top + 18), name, font=font(int(w * 0.036)), fill=PAPER)
        draw.text((w - pad - 90, top + 22), "SKIP", font=font(int(w * 0.028), True), fill=DANGER)


def desk(draw, pad, y, w, h):
    draw.text((pad, y), "WEEK OF AUG 11  ·  50 GAMES", font=font(int(w * 0.028), True), fill=GOLD)
    x = pad
    for chip, on in (("$5", False), ("$10", True), ("$20", False), ("$25+", False)):
        fill = GOLD if on else RAISED
        ink = BG if on else MUTED
        draw.rounded_rectangle((x, y + 50, x + int(w * 0.18), y + 110), radius=10, fill=fill)
        draw.text((x + 18, y + 66), chip, font=font(int(w * 0.032)), fill=ink)
        x += int(w * 0.2)
    draw.text((pad, y + 150), "Heat chips. Not a slot reel.", font=font(int(w * 0.036)), fill=PAPER)


def trip(draw, pad, y, w, h):
    draw.text((pad, y), "If you’re buying $10s,", font=font(int(w * 0.04)), fill=PAPER)
    draw.text((pad, y + 50), "review these 3. Then stop.", font=font(int(w * 0.04)), fill=PAPER)
    for i, name in enumerate(("1  Giant Jumbo", "2  Crossword", "3  Multiplier")):
        draw.text((pad, y + 130 + i * 48), name, font=font(int(w * 0.036)), fill=SAGE)


def alert(draw, pad, y, w, h):
    draw.ellipse((pad, y, pad + int(w * 0.36), y + int(w * 0.36)), outline=GOLD, width=4)
    draw.text((pad + int(w * 0.08), y + int(w * 0.16)), "CONTACT", font=font(int(w * 0.03), True), fill=GOLD)
    draw.text((pad + int(w * 0.42), y + 40), "New desk drop", font=font(int(w * 0.042)), fill=PAPER)
    draw.text((pad + int(w * 0.42), y + 100), "Review rankings", font=font(int(w * 0.032)), fill=MUTED)


def trust(draw, pad, y, w, h):
    draw.text((pad, y), "Independent desk.", font=font(int(w * 0.045)), fill=PAPER)
    draw.text((pad, y + 60), "Not the Lottery.", font=font(int(w * 0.045)), fill=PAPER)
    draw.text((pad, y + 140), "7 days free, then $4.99/mo", font=font(int(w * 0.034)), fill=GOLD)
    draw.text((pad, y + 200), "or $49.99/yr. Cancel anytime.", font=font(int(w * 0.034)), fill=GOLD)
    draw.text((pad, y + 280), "Then put the phone away.", font=font(int(w * 0.04)), fill=SAGE)


def save(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print("wrote", path.relative_to(ROOT))


def main():
    shots = [
        ("hook", "See what’s still posted.", hook),
        ("skip", "Skip the drained ones.", skip),
        ("desk", "Heat. Price. Week stamp.", desk),
        ("trip", "Review these 3. Then stop.", trip),
        ("alert", "New counts on the desk.", alert),
        ("trust", "Independent. 18+.", trust),
    ]
    for slug, cap, fn in shots:
        save(frame((1290, 2796), cap, fn), ROOT / "store" / "ios" / "screenshots" / f"6.7-{slug}.png")
        save(frame((1179, 2556), cap, fn), ROOT / "store" / "ios" / "screenshots" / f"6.1-{slug}.png")
        save(frame((1080, 1920), cap, fn), ROOT / "store" / "android" / "screenshots" / f"phone-{slug}.png")


if __name__ == "__main__":
    main()
