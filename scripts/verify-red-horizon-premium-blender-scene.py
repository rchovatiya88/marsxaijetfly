#!/usr/bin/env python3
"""Verify the Red Horizon premium Blender visual-target scene package.

The heavy .blend scene copy and raw PNG renders are intentionally ignored by Git.
This verifier checks the tracked evidence that proves the scene package was built
from the supplied model sources and that the published review JPGs match the
manifest receipts.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "art" / "concepts" / "red-horizon-premium-blender" / "manifest.json"
EXPECTED_SOURCE_HASHES = {
    "fullLevelBlend": "0d1eb630800765fba4fe157805f10eded7ba3f7e462f5e9b4f290bb15a07047c",
    "layout": "8add53d948d04aca790ff5ebb706e3ce06dd0ca847e3c80e39b849c3ccd2761b",
    "levelModel": "44de04d5ad33ccfd7f3e7ccab24040c6901a543306f1d2bdfa7c2330347455db",
    "player": "5c3941953eb7ff6aa45f0faaebe24ed529f085d95e6ecbf752941f4981b6a244",
    "warden": "16415bf5a5b8dfa0440c7689451eb68f5a4b724ab74bb862a1cec7ceb54cdb69",
}
EXPECTED_SHOTS = [
    "01_bridgehead_start",
    "02_route_choice",
    "03_warden_combat",
    "04_extraction",
]
REQUIRED_BOUNDARY_PHRASES = [
    "not shipped runtime geometry",
    "assets are preserved",
    "material slots and image textures are preserved",
    "must be rebuilt/exported deliberately",
    "Collision remains governed",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def read_manifest(errors: list[str]) -> dict:
    if not MANIFEST.exists():
        errors.append(f"missing manifest: {MANIFEST}")
        return {}
    try:
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"manifest is invalid JSON: {exc}")
        return {}


def verify_file_hash(path_value: str | None, hash_value: str | None, label: str, errors: list[str]) -> None:
    require(bool(path_value), f"{label} path missing", errors)
    require(bool(hash_value), f"{label} hash missing", errors)
    if not path_value or not hash_value:
        return
    path = ROOT / path_value
    require(path.exists(), f"{label} file missing: {path_value}", errors)
    if path.exists():
        actual = sha256(path)
        require(actual == hash_value, f"{label} hash mismatch: expected {hash_value}, got {actual}", errors)


def main() -> int:
    errors: list[str] = []
    manifest = read_manifest(errors)
    if not manifest:
        print("RED_HORIZON_PREMIUM_BLENDER_SCENE_VERIFY failed")
        for error in errors:
            print(f"- {error}")
        return 1

    source = manifest.get("source") or {}
    output = manifest.get("output") or {}
    shots = manifest.get("shots") or []
    render_receipts = manifest.get("renderReceipts") or []
    grounding = manifest.get("groundingReceipts") or {}
    level_material_receipts = manifest.get("levelMaterialReceipts") or {}

    require(manifest.get("name") == "Red Horizon premium Blender visual target", "unexpected manifest name", errors)
    require(manifest.get("engine") == "BLENDER_EEVEE", "unexpected render engine receipt", errors)

    for key, expected_hash in EXPECTED_SOURCE_HASHES.items():
        path_value = source.get(key)
        manifest_hash = source.get(f"{key}Sha256")
        require(manifest_hash == expected_hash, f"{key} source receipt changed: {manifest_hash}", errors)
        verify_file_hash(path_value, manifest_hash, f"source.{key}", errors)

    shot_ids = [shot.get("id") for shot in shots]
    require(shot_ids == EXPECTED_SHOTS, f"shot order mismatch: {shot_ids}", errors)
    require([receipt.get("id") for receipt in render_receipts] == EXPECTED_SHOTS, "render receipt order mismatch", errors)

    web_records = output.get("webImages") or []
    require([record.get("id") for record in web_records] == EXPECTED_SHOTS, "web image order mismatch", errors)
    for record in web_records:
        verify_file_hash(record.get("web"), record.get("webSha256"), f"web.{record.get('id')}", errors)

    verify_file_hash(output.get("contactSheet"), output.get("contactSheetSha256"), "contactSheet", errors)
    verify_file_hash(output.get("conceptMatchSheet"), output.get("conceptMatchSheetSha256"), "conceptMatchSheet", errors)

    for shot in shots:
        require(bool(shot.get("conceptReference")), f"{shot.get('id')} concept reference missing", errors)
        require(bool(shot.get("truthReference")), f"{shot.get('id')} truth reference missing", errors)
        if shot.get("conceptReference"):
            require((ROOT / shot["conceptReference"]).exists(), f"{shot.get('id')} concept reference missing on disk", errors)
        if shot.get("truthReference"):
            require((ROOT / shot["truthReference"]).exists(), f"{shot.get('id')} truth reference missing on disk", errors)
        require(bool(shot.get("buildIntent")), f"{shot.get('id')} build intent missing", errors)

    for route_key in ["highRoute", "lowRoute", "extractionPath"]:
        receipts = grounding.get(route_key)
        require(isinstance(receipts, list) and len(receipts) >= 4, f"{route_key} has too few grounding receipts", errors)
        if isinstance(receipts, list):
            attached = [item for item in receipts if item.get("mode") == "surface-attached"]
            require(len(attached) == len(receipts), f"{route_key} includes ungrounded receipt", errors)

    require(
        level_material_receipts.get("policy") == "preserve-source-level-material-slots-and-image-textures",
        "level material preservation policy missing",
        errors,
    )
    require(level_material_receipts.get("chunkMeshCount") == 4, "expected four full-level chunk mesh material receipts", errors)
    require(level_material_receipts.get("uniqueMaterialCount", 0) >= 13, "expected source level material receipts", errors)
    require(level_material_receipts.get("uniqueImageTextureCount", 0) >= 10, "expected preserved source level image texture receipts", errors)

    material_names = set((level_material_receipts.get("materials") or {}).keys())
    for key in ["Ground_material", "Glass_01", "PolygonScifiWorlds_Mat_03_A", "PolygonSciFiWorlds_Env_Triplanar_Corp"]:
        require(key in material_names, f"source material missing from preservation receipt: {key}", errors)

    boundaries = "\n".join(manifest.get("acceptanceBoundary") or [])
    for phrase in REQUIRED_BOUNDARY_PHRASES:
        require(phrase in boundaries, f"acceptance boundary missing phrase: {phrase}", errors)

    blend_path = output.get("blend")
    if blend_path and (ROOT / blend_path).exists():
        blend_status = "present locally"
    else:
        blend_status = "not tracked; rebuild with scripts/build-red-horizon-premium-blender-scene.py"

    if errors:
        print("RED_HORIZON_PREMIUM_BLENDER_SCENE_VERIFY failed")
        for error in errors:
            print(f"- {error}")
        return 1

    print(json.dumps({
        "status": "passed",
        "shots": EXPECTED_SHOTS,
        "contactSheet": output.get("contactSheet"),
        "conceptMatchSheet": output.get("conceptMatchSheet"),
        "blend": blend_status,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
