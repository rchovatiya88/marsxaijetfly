#!/usr/bin/env python3
"""Create review JPGs for the Red Horizon premium Blender scene."""

from __future__ import annotations

import hashlib
import json
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "art" / "concepts" / "red-horizon-premium-blender"
RAW = OUT / "raw"
DOC_IMAGES = ROOT / "docs" / "images"
MANIFEST = OUT / "manifest.json"

WEB_NAMES = {
    "01_bridgehead_start": "red-horizon-premium-blender-01-bridgehead-start.jpg",
    "02_route_choice": "red-horizon-premium-blender-02-route-choice.jpg",
    "03_warden_combat": "red-horizon-premium-blender-03-warden-combat.jpg",
    "04_extraction": "red-horizon-premium-blender-04-extraction.jpg",
}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(path: str, size: int) -> ImageFont.ImageFont:
    p = Path(path)
    return ImageFont.truetype(str(p), size=size) if p.exists() else ImageFont.load_default()

TITLE = font("C:/Windows/Fonts/segoeuib.ttf", 46)
SUB = font("C:/Windows/Fonts/segoeui.ttf", 24)
BOLD = font("C:/Windows/Fonts/segoeuib.ttf", 22)
BODY = font("C:/Windows/Fonts/segoeui.ttf", 21)
SMALL = font("C:/Windows/Fonts/segoeui.ttf", 18)


def wrap(text: str, width: int) -> list[str]:
    return textwrap.wrap(text, width=width) or [""]


def main() -> int:
    DOC_IMAGES.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    web_records = []
    for shot in manifest["shots"]:
        raw = ROOT / shot["raw"]
        web = DOC_IMAGES / WEB_NAMES[shot["id"]]
        Image.open(raw).convert("RGB").save(web, quality=91, optimize=True)
        shot["web"] = rel(web)
        shot["webSha256"] = sha256(web)
        web_records.append({"id": shot["id"], "web": rel(web), "webSha256": shot["webSha256"]})

    # Beauty proof contact sheet.
    thumb_w, thumb_h = 880, 495
    margin, header, gap_x, gap_y = 70, 118, 50, 96
    caption_h = 100
    sheet_h = header + margin + 2 * thumb_h + gap_y + 2 * caption_h + margin
    sheet = Image.new("RGB", (1920, sheet_h), (11, 10, 10))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 28), "Red Horizon — Premium Blender Scene", font=TITLE, fill=(255, 238, 206))
    draw.text((margin, 86), "Concept art rebuilt into the real supplied level scene: source textures preserved, lighting/fog/route dressing added.", font=SUB, fill=(222, 197, 163))
    for i, shot in enumerate(manifest["shots"]):
        x = margin + (i % 2) * (thumb_w + gap_x)
        y = header + margin + (i // 2) * (thumb_h + caption_h + gap_y)
        img = Image.open(ROOT / shot["web"]).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(img, (x, y))
        draw.rectangle((x, y, x + thumb_w, y + thumb_h), outline=(126, 86, 50), width=3)
        draw.text((x, y + thumb_h + 12), f"{shot['id']}  {shot['title']}", font=BOLD, fill=(255, 238, 206))
        for line_index, line in enumerate(wrap(shot["buildIntent"], 78)[:2]):
            draw.text((x, y + thumb_h + 42 + line_index * 24), line, font=BODY, fill=(208, 185, 151))
    contact = DOC_IMAGES / "red-horizon-premium-blender-contact.jpg"
    sheet.save(contact, quality=90, optimize=True)

    # Concept-to-Blender comparison sheet.
    row_h = 330
    concept_w, concept_h = 500, 281
    blender_w, blender_h = 620, 349
    guide_h = 140 + len(manifest["shots"]) * (row_h + 54) + 36
    guide = Image.new("RGB", (1920, guide_h), (11, 10, 10))
    draw = ImageDraw.Draw(guide)
    draw.text((margin, 28), "Red Horizon — Concept Recreated in Blender", font=TITLE, fill=(255, 238, 206))
    draw.text((margin, 86), "Left: premium concept. Center: Blender rebuild in supplied model space with source textures preserved. Right: implementation read.", font=SUB, fill=(222, 197, 163))
    for i, shot in enumerate(manifest["shots"]):
        y = 140 + i * (row_h + 54)
        x_concept = margin
        x_blender = margin + concept_w + 34
        x_text = x_blender + blender_w + 42
        concept = Image.open(ROOT / shot["conceptReference"]).convert("RGB").resize((concept_w, concept_h), Image.Resampling.LANCZOS)
        blender = Image.open(ROOT / shot["web"]).convert("RGB").resize((blender_w, blender_h), Image.Resampling.LANCZOS)
        draw.text((x_concept, y - 24), "CONCEPT TARGET", font=BOLD, fill=(255, 178, 78))
        draw.text((x_blender, y - 24), "REAL BLENDER REBUILD", font=BOLD, fill=(95, 222, 204))
        guide.paste(concept, (x_concept, y))
        guide.paste(blender, (x_blender, y))
        draw.rectangle((x_concept, y, x_concept + concept_w, y + concept_h), outline=(126, 86, 50), width=2)
        draw.rectangle((x_blender, y, x_blender + blender_w, y + blender_h), outline=(52, 135, 130), width=2)
        draw.text((x_text, y), shot["title"].upper(), font=BOLD, fill=(255, 238, 206))
        text_y = y + 34
        for label, content, color in [
            ("Built", shot["buildIntent"], (244, 238, 221)),
            ("Boundary", "Real source model space with preserved level textures; added dressing, collision and runtime export remain separate.", (208, 185, 151)),
        ]:
            draw.text((x_text, text_y), label.upper(), font=BOLD, fill=color)
            text_y += 26
            for line in wrap(content, 47)[:4]:
                draw.text((x_text, text_y), line, font=BODY, fill=color)
                text_y += 24
            text_y += 10
    guide_path = DOC_IMAGES / "red-horizon-premium-blender-concept-match.jpg"
    guide.save(guide_path, quality=90, optimize=True)

    manifest["output"]["webImages"] = web_records
    manifest["output"]["contactSheet"] = rel(contact)
    manifest["output"]["contactSheetSha256"] = sha256(contact)
    manifest["output"]["conceptMatchSheet"] = rel(guide_path)
    manifest["output"]["conceptMatchSheetSha256"] = sha256(guide_path)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"contactSheet": rel(contact), "conceptMatchSheet": rel(guide_path), "images": web_records}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
