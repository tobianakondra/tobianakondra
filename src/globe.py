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
LANDMASK_PATH = ROOT / "data" / "landmask.png"
SVG_PATH = ROOT / "assets" / "virus.svg"
OUTPUT_PATH = ROOT / "assets" / "dashboard.gif"
WIDTH, HEIGHT = 375, 205
CX, CY, RADIUS = 188, 92, 80
CANVAS_SIZE = (800, 400)
PANEL_ORIGIN = (405, 80)
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


def land_pixel(lon, lat):
    x = int((lon + 180) * 2) % 720
    y = max(0, min(359, int((90 - lat) * 2)))
    return x, y


def is_land(land_mask, lon, lat):
    return land_mask.getpixel(land_pixel(lon, lat)) > 0


def is_coast(land_mask, lon, lat):
    x, y = land_pixel(lon, lat)
    neighbors = ((x - 1) % 720, y), ((x + 1) % 720, y), (x, max(0, y - 1)), (x, min(359, y + 1))
    return any(land_mask.getpixel(point) == 0 for point in neighbors)


def make_frame(frame_index, infection_rate, land_mask):
    rotation = frame_index * (360 / FRAME_COUNT)
    image = Image.new("RGB", (WIDTH, HEIGHT), "#0a0b10")
    draw = ImageDraw.Draw(image)

    # Globe halo and sphere
    for radius, color, width in ((RADIUS + 7, "#12323d", 2), (RADIUS, "#00f0ff", 2)):
        draw.ellipse((CX - radius, CY - radius, CX + radius, CY + radius), outline=color, width=width)
    draw.ellipse((CX - RADIUS + 2, CY - RADIUS + 2, CX + RADIUS - 2, CY + RADIUS - 2), fill="#0b151e")

    # Sparse ocean dots, with accurate Natural Earth country outlines as land dots.
    for latitude in range(-75, 76, 15):
        for longitude in range(-180, 180, 15):
            x, y, visible = project(longitude, latitude, rotation)
            if visible and not is_land(land_mask, longitude, latitude):
                draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill="#12414d")

    for latitude in range(-78, 79, 4):
        for longitude in range(-180, 180, 4):
            if not is_land(land_mask, longitude, latitude):
                continue
            x, y, visible = project(longitude, latitude, rotation)
            if not visible:
                continue
            coast = is_coast(land_mask, longitude, latitude)
            radius = 2.6 if coast else 1.8
            color = "#43f5ff" if coast else "#00a8c8"
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)

    # City markers rotate with their longitude and fade on the far side.
    for code, _name, longitude, latitude, threshold in NODES:
        x, y, visible = project(longitude, latitude, rotation)
        infected = infection_rate >= threshold
        color = "#ff0055" if infected else "#00f0ff"
        if not visible:
            color = "#632139" if infected else "#14505b"
        draw.ellipse((x - 10, y - 10, x + 10, y + 10), outline=color, width=2)
        draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=color)
        if visible:
            draw.text((x + 13, y - 9), code, font=font(14), fill=color)

    # Fixed city key keeps full place names readable as markers move.
    draw.text((WIDTH // 2, 185), "DAKAR, SENEGAL · NEW YORK, USA · LONDON, UK", font=font(10), fill="#aab4c8", anchor="mm")
    draw.text((WIDTH // 2, 199), "TOKYO, JAPAN · JOHANNESBURG, SOUTH AFRICA", font=font(10), fill="#aab4c8", anchor="mm")
    return image


def animate_dashboard(image, frame_index, state):
    """Recreate the SVG dashboard's motion in the GIF, which GitHub can animate."""
    draw = ImageDraw.Draw(image)
    phase = frame_index / FRAME_COUNT

    def left_x(value):
        return round(1.15 * value - 7.25)

    def left_y(value):
        return round(1.05 * value - 11.25)

    # Sweep highlights through both live meter bars without changing their values.
    infection = max(0, min(100, float(state.get("infectionRate", 0))))
    infection_end = 40 + 2.6 * infection
    draw.rounded_rectangle((left_x(40), left_y(108), left_x(300), left_y(114)), radius=3, fill="#1a1c24")
    draw.rounded_rectangle((left_x(40), left_y(108), left_x(infection_end), left_y(114)), radius=3, fill="#ff0055")
    if infection_end > 44:
        sweep_x = 40 + (infection_end - 40) * ((frame_index % 36) / 35)
        glint = Image.new("RGBA", image.size, (0, 0, 0, 0))
        ImageDraw.Draw(glint).rounded_rectangle((left_x(sweep_x - 3), left_y(107), left_x(sweep_x + 3), left_y(115)), radius=2, fill=(255, 210, 230, 220))
        image_rgba = image.convert("RGBA")
        image_rgba.alpha_composite(glint)
        image.paste(image_rgba.convert("RGB"))

    integrity = max(0, min(100, float(state.get("integrity", 100))))
    segments = round(integrity / 100 * 17)
    integrity_color = "#00ff66" if integrity > 75 else "#ffaa00" if integrity > 40 else "#ff0055"
    draw = ImageDraw.Draw(image)
    for index in range(17):
        x0 = 70 + index * 15
        draw.rounded_rectangle((left_x(x0), left_y(158), left_x(x0 + 10), left_y(173)), radius=2,
                               fill=integrity_color if index < segments else "#1a1c24")
    if segments:
        sweep_x = 70 + (segments * 15 - 5) * ((frame_index % 36) / 35)
        glint = Image.new("RGBA", image.size, (0, 0, 0, 0))
        ImageDraw.Draw(glint).rounded_rectangle((left_x(sweep_x - 3), left_y(157), left_x(sweep_x + 3), left_y(174)), radius=2, fill=(235, 255, 255, 190))
        image_rgba = image.convert("RGBA")
        image_rgba.alpha_composite(glint)
        image.paste(image_rgba.convert("RGB"))

    # CPU waveform: preserve the panel and make its signal travel continuously.
    draw.rounded_rectangle((left_x(40), left_y(208), left_x(300), left_y(233)), radius=3, fill="#16171f")
    local_points = [(5, 15), (40, 15), (50, 5), (60, 20), (70, 12),
                    (100, 12), (110, 2), (120, 23), (130, 10), (160, 10),
                    (170, 20), (180, 5), (190, 15), (255, 15)]
    points = [(left_x(40 + x), left_y(208 + y)) for x, y in local_points]
    cyan = (0, 180, 255)
    draw.line(points, fill=cyan, width=2, joint="curve")
    travel = ((frame_index % 12) / 12) * (len(points) - 1)

    def along_path(distance):
        distance = max(0, min(len(points) - 1, distance))
        segment = min(int(distance), len(points) - 2)
        fraction = distance - segment
        return tuple(points[segment][axis] + (points[segment + 1][axis] - points[segment][axis]) * fraction for axis in (0, 1))

    head = along_path(travel)
    draw.ellipse((head[0] - 4, head[1] - 4, head[0] + 4, head[1] + 4), fill="#00f0ff")
    draw.ellipse((head[0] - 2, head[1] - 2, head[0] + 2, head[1] + 2), fill="#ffffff")

    # Pulsing shield badge gives the firewall stat a visible animation of its own.
    defense = max(0, min(100, int(state.get("defense", 10))))
    pulse = int(90 + 130 * (0.5 + 0.5 * math.sin(phase * math.tau)))
    shield_color = (0, pulse, 255)
    draw.rounded_rectangle((left_x(214), left_y(247), left_x(321), left_y(278)), radius=4, fill="#0a0b10", outline=shield_color, width=1)
    draw.text((left_x(221), left_y(253)), f"SHIELD {defense:02d}", font=font(9), fill=shield_color)
    draw.rounded_rectangle((left_x(221), left_y(266), left_x(313), left_y(271)), radius=2, fill="#1a1c24")
    draw.rounded_rectangle((left_x(221), left_y(266), left_x(221 + 0.92 * defense), left_y(271)), radius=2, fill="#00f0ff")
    shield_glint_x = 221 + (0.92 * defense) * ((frame_index % 30) / 29)
    draw.rectangle((left_x(shield_glint_x - 1), left_y(265), left_x(shield_glint_x + 1), left_y(272)), fill="#d5ffff")

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
    land_mask = Image.open(LANDMASK_PATH).convert("L")
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
        frame.paste(make_frame(index, infection_rate, land_mask), PANEL_ORIGIN)
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
