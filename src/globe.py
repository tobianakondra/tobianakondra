#!/usr/bin/env python3
"""Render the animated, dotted infection globe used in the profile README."""

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = ROOT / "data" / "state.json"
OUTPUT_PATH = ROOT / "assets" / "globe.gif"
WIDTH, HEIGHT = 840, 470
CX, CY, RADIUS = 420, 220, 150
FRAME_COUNT = 48
FRAME_DURATION_MS = 80

NODES = [
    ("DKR", "DAKAR, SENEGAL", -17.45, 14.69, 14),
    ("NYC", "NEW YORK, USA", -74.01, 40.71, 32),
    ("LON", "LONDON, UK", -0.12, 51.51, 50),
    ("TYO", "TOKYO, JAPAN", 139.69, 35.68, 70),
    ("JNB", "JOHANNESBURG, SOUTH AFRICA", 28.05, -26.20, 88),
]


def font(size):
    for candidate in ("DejaVuSansMono.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


def project(lon, lat, rotation):
    lat_r = math.radians(lat)
    lon_r = math.radians(lon - rotation)
    x = CX + RADIUS * math.cos(lat_r) * math.sin(lon_r)
    y = CY - RADIUS * math.sin(lat_r)
    visible = math.cos(lat_r) * math.cos(lon_r) >= 0
    return x, y, visible


def make_frame(frame_index, infection_rate):
    rotation = frame_index * (360 / FRAME_COUNT)
    image = Image.new("RGB", (WIDTH, HEIGHT), "#0b0c10")
    draw = ImageDraw.Draw(image)

    # Terminal frame and heading
    draw.rounded_rectangle((12, 12, WIDTH - 12, HEIGHT - 12), radius=10, outline="#1d2030", width=2)
    draw.line((12, 54, WIDTH - 12, 54), fill="#1d2030", width=2)
    draw.text((30, 28), "VASTOWORM.SYS  //  GLOBAL INFECTION TOPOLOGY", font=font(18), fill="#00f0ff", anchor="lm")
    draw.ellipse((WIDTH - 45, 28, WIDTH - 33, 40), fill="#ff0055" if infection_rate >= 15 else "#00ff66")

    # Globe halo and sphere
    for radius, color, width in ((RADIUS + 7, "#12323d", 2), (RADIUS, "#00f0ff", 2)):
        draw.ellipse((CX - radius, CY - radius, CX + radius, CY + radius), outline=color, width=width)
    draw.ellipse((CX - RADIUS + 2, CY - RADIUS + 2, CX + RADIUS - 2, CY + RADIUS - 2), fill="#0b151e")

    # Dotted latitude and longitude grid, with only the visible hemisphere drawn.
    for latitude in range(-72, 73, 12):
        for longitude in range(-180, 180, 8):
            x, y, visible = project(longitude, latitude, rotation)
            if visible:
                brightness = 90 if abs(latitude) < 50 else 55
                draw.ellipse((x - 1.5, y - 1.5, x + 1.5, y + 1.5), fill=(0, brightness, min(255, brightness + 35)))

    # City markers rotate with their longitude and fade on the far side.
    for code, _name, longitude, latitude, threshold in NODES:
        x, y, visible = project(longitude, latitude, rotation)
        infected = infection_rate >= threshold
        color = "#ff0055" if infected else "#00f0ff"
        if not visible:
            color = "#632139" if infected else "#14505b"
        draw.ellipse((x - 8, y - 8, x + 8, y + 8), outline=color, width=2)
        draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=color)
        if visible:
            draw.text((x + 11, y - 8), code, font=font(12), fill=color)

    # Fixed city key keeps full place names readable as markers move.
    draw.line((30, 400, WIDTH - 30, 400), fill="#1d2030", width=2)
    draw.text((WIDTH // 2, 420), "DAKAR, SENEGAL   ·   NEW YORK, USA   ·   LONDON, UK", font=font(13), fill="#aab4c8", anchor="mm")
    draw.text((WIDTH // 2, 444), "TOKYO, JAPAN   ·   JOHANNESBURG, SOUTH AFRICA", font=font(13), fill="#aab4c8", anchor="mm")
    return image


def main():
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    infection_rate = float(state.get("infectionRate", 0))
    frames = [make_frame(index, infection_rate) for index in range(FRAME_COUNT)]
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUTPUT_PATH,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        optimize=True,
    )
    print(f"Generated {OUTPUT_PATH.relative_to(ROOT)} ({FRAME_COUNT} frames, {infection_rate:.1f}% infection).")


if __name__ == "__main__":
    main()
