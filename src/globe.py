#!/usr/bin/env python3
"""Render the animated, dotted infection globe used in the profile README."""

import json
import math
import subprocess
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = ROOT / "data" / "state.json"
SVG_PATH = ROOT / "assets" / "virus.svg"
OUTPUT_PATH = ROOT / "assets" / "dashboard.gif"
WIDTH, HEIGHT = 420, 205
CX, CY, RADIUS = 210, 100, 68
CANVAS_SIZE = (800, 400)
PANEL_ORIGIN = (350, 85)
FRAME_COUNT = 60
FRAME_DURATION_MS = 100

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
    image = Image.new("RGB", (WIDTH, HEIGHT), "#0a0b10")
    draw = ImageDraw.Draw(image)

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
    draw.text((WIDTH // 2, 187), "DAKAR, SENEGAL · NEW YORK, USA · LONDON, UK", font=font(8), fill="#aab4c8", anchor="mm")
    draw.text((WIDTH // 2, 199), "TOKYO, JAPAN · JOHANNESBURG, SOUTH AFRICA", font=font(8), fill="#aab4c8", anchor="mm")
    return image


def animate_dashboard(image, frame_index, state):
    """Recreate the SVG dashboard's motion in the GIF, which GitHub can animate."""
    draw = ImageDraw.Draw(image)
    phase = frame_index / FRAME_COUNT

    # CPU waveform: preserve the panel and make its signal travel continuously.
    draw.rounded_rectangle((65, 208, 325, 233), radius=3, fill="#16171f")
    points = [(70, 223), (105, 223), (115, 213), (125, 228), (135, 220),
              (165, 220), (175, 210), (185, 231), (195, 218), (225, 218),
              (235, 228), (245, 213), (255, 223), (320, 223)]
    intensity = 130 + int(80 * (0.5 + 0.5 * math.sin(phase * math.tau)))
    cyan = (0, intensity, 255)
    draw.line(points, fill=cyan, width=2, joint="curve")
    travel = (frame_index / FRAME_COUNT) * (len(points) - 1)
    segment = min(int(travel), len(points) - 2)
    fraction = travel - segment
    x = points[segment][0] + (points[segment + 1][0] - points[segment][0]) * fraction
    y = points[segment][1] + (points[segment + 1][1] - points[segment][1]) * fraction
    draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill="#b9ffff")

    # System status light blinks once per second.
    stage = state.get("stage", "DORMANT")
    status = "#00ff66" if stage == "DORMANT" else "#ffaa00" if stage == "MUTATING" else "#ff0055"
    draw.ellipse((724, 14, 736, 26), fill="#0b0c10")
    light = 1 if frame_index % 10 < 5 else 0.2
    draw.ellipse((726, 16, 734, 24), fill=status if light > 0.5 else "#272a34")

    # The terminal scanline travels through the log window; the command cursor blinks.
    scan_y = 310 + int((frame_index % 40) / 39 * 64)
    scan = Image.new("RGBA", image.size, (0, 0, 0, 0))
    scan_draw = ImageDraw.Draw(scan)
    scan_draw.line((25, scan_y, 775, scan_y), fill=(0, 240, 255, 100), width=1)
    image_rgba = image.convert("RGBA")
    image_rgba.alpha_composite(scan)
    image.paste(image_rgba.convert("RGB"))
    draw = ImageDraw.Draw(image)
    draw.rectangle((758, 348, 770, 364), fill="#0a0b10")
    if frame_index % 10 < 5:
        draw.rectangle((760, 350, 768, 362), fill="#00ff66")

    # Brief color split recreates the header's original glitch animation.
    if frame_index % 40 in (38, 39):
        draw.text((27, 13), "VASTOWORM.SYS :: INFILTRATION_PROTOCOL_ACTIVE", font=font(12), fill="#00f0ff")
        draw.text((23, 15), "VASTOWORM.SYS :: INFILTRATION_PROTOCOL_ACTIVE", font=font(12), fill="#ff0055")


def main():
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    infection_rate = float(state.get("infectionRate", 0))
    try:
        import cairosvg
        background_png = cairosvg.svg2png(url=str(SVG_PATH), output_width=CANVAS_SIZE[0], output_height=CANVAS_SIZE[1])
    except ImportError:
        background_png = subprocess.run(
            ["rsvg-convert", "--width", str(CANVAS_SIZE[0]), "--height", str(CANVAS_SIZE[1]), str(SVG_PATH)],
            check=True,
            capture_output=True,
        ).stdout
    background = Image.open(BytesIO(background_png)).convert("RGB")
    frames = []
    for index in range(FRAME_COUNT):
        frame = background.copy()
        frame.paste(make_frame(index, infection_rate), PANEL_ORIGIN)
        animate_dashboard(frame, index, state)
        frames.append(frame)
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
