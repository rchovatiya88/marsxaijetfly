"""Add readable design notes to Red Horizon real-model path renders."""

from __future__ import annotations

import hashlib
import json
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "real-path"
MANIFEST = ART / "manifest.json"


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    p = Path(path)
    if p.exists():
        return ImageFont.truetype(str(p), size=size)
    return ImageFont.load_default()


TITLE = font("C:/Windows/Fonts/segoeuib.ttf", 38)
SUB = font("C:/Windows/Fonts/segoeui.ttf", 22)
BODY = font("C:/Windows/Fonts/segoeui.ttf", 21)
BOLD = font("C:/Windows/Fonts/segoeuib.ttf", 21)
SMALL = font("C:/Windows/Fonts/segoeui.ttf", 18)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.ImageFont, width: int) -> list[str]:
    avg = max(1, draw.textlength("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", font=face) / 52)
    columns = max(14, int(width / avg))
    return textwrap.wrap(text, width=columns) or [""]


def draw_block(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, text: str, color: tuple[int, int, int], width: int) -> None:
    draw.text((x, y), label.upper(), font=BOLD, fill=color)
    y += 28
    for line in wrap(draw, text, BODY, width):
        draw.text((x, y), line, font=BODY, fill=(244, 238, 221))
        y += 25


def annotate(shot: dict[str, str]) -> Path:
    raw = Image.open(ROOT / shot["raw"]).convert("RGBA")
    W, H = raw.size
    overlay = Image.new("RGBA", raw.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((18, 18, W - 18, 108), radius=18, fill=(7, 8, 10, 212))
    draw.rounded_rectangle((18, H - 208, W - 18, H - 18), radius=18, fill=(7, 8, 10, 222))
    number = shot["id"].split("_", 1)[0]
    draw.rounded_rectangle((36, 36, 92, 90), radius=12, fill=(196, 42, 21, 238))
    draw.text((64, 47), number, font=BOLD, anchor="ma", fill=(255, 242, 214))
    draw.text((112, 30), shot["title"], font=TITLE, fill=(255, 242, 214))
    for i, line in enumerate(wrap(draw, shot["beat"], SUB, W - 150)[:2]):
        draw.text((114, 76 + i * 24), line, font=SUB, fill=(226, 204, 166))
    col = (W - 100) // 2
    y = H - 184
    draw_block(draw, 44, y, "Player action", shot["playerAction"], (0, 226, 203), col)
    draw_block(draw, W // 2 + 10, y, "Developer target", shot["developerTarget"], (255, 164, 68), col)
    output = ART / f"{shot['id']}.png"
    Image.alpha_composite(raw, overlay).convert("RGB").save(output, quality=94)
    return output


def contact_sheet(shots: list[dict[str, str]], images: list[Path]) -> Path:
    tw, th = 720, 405
    cols = 2
    rows = (len(images) + 1) // cols
    margin, gx, gy = 42, 28, 36
    header = 118
    W = margin * 2 + cols * tw + gx
    H = header + margin + rows * (th + 48) + (rows - 1) * gy
    sheet = Image.new("RGB", (W, H), (11, 11, 13))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 24), "Red Horizon — Real Model Path", font=TITLE, fill=(255, 242, 214))
    subtitle = "New route from supplied level geometry: cannon launch, chasm fork, high bridge, low pipe, Warden court, extraction."
    for i, line in enumerate(wrap(draw, subtitle, SMALL, W - margin * 2)):
        draw.text((margin, 70 + i * 21), line, font=SMALL, fill=(219, 204, 175))
    for i, (shot, path) in enumerate(zip(shots, images)):
        x = margin + (i % cols) * (tw + gx)
        y = header + margin + (i // cols) * (th + 48 + gy)
        img = Image.open(path).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        sheet.paste(img, (x, y))
        draw.rectangle((x, y, x + tw, y + th), outline=(95, 77, 55), width=2)
        title = f"{shot['id']}  {shot['title']}"
        for j, line in enumerate(wrap(draw, title, SMALL, tw)[:2]):
            draw.text((x, y + th + 10 + j * 20), line, font=SMALL, fill=(244, 238, 221))
    output = ART / "red-horizon-real-model-path-contact.png"
    sheet.save(output, quality=94)
    return output


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    images = [annotate(shot) for shot in manifest["shots"]]
    contact = contact_sheet(manifest["shots"], images)
    manifest["output"]["annotatedDirectory"] = rel(ART)
    manifest["output"]["contactSheet"] = rel(contact)
    manifest["output"]["contactSheetSha256"] = sha256(contact)
    for shot, path in zip(manifest["shots"], images):
        shot["annotated"] = rel(path)
        shot["annotatedSha256"] = sha256(path)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("RED_HORIZON_REAL_MODEL_PATH_ANNOTATED " + rel(contact))


if __name__ == "__main__":
    main()
