#!/usr/bin/env python3
"""Verify the Red Horizon premium concept image package.

This intentionally validates the reviewable web JPGs and source-reference links
rather than treating the generated paintovers as runtime evidence.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "art" / "concepts" / "red-horizon-premium" / "manifest.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rel(path_text: str) -> Path:
    return ROOT / path_text.replace("/", "\\")


def require(condition: bool, failures: list[str], message: str) -> None:
    if not condition:
        failures.append(message)


def verify_hash(
    manifest: dict[str, Any],
    path_key: str,
    hash_key: str,
    failures: list[str],
    *,
    required: bool = True,
) -> None:
    path_text = manifest.get(path_key)
    expected_hash = manifest.get(hash_key)
    require(isinstance(path_text, str) and bool(path_text), failures, f"Missing {path_key}")
    require(
        isinstance(expected_hash, str) and len(expected_hash) == 64,
        failures,
        f"Missing or invalid {hash_key}",
    )
    if not isinstance(path_text, str) or not isinstance(expected_hash, str):
        return

    path = rel(path_text)
    if not path.exists():
        if required:
            failures.append(f"Missing required file: {path_text}")
        return

    actual_hash = sha256(path)
    require(
        actual_hash == expected_hash,
        failures,
        f"Hash mismatch for {path_text}: expected {expected_hash}, got {actual_hash}",
    )


def main() -> int:
    failures: list[str] = []
    require(MANIFEST.exists(), failures, f"Missing manifest: {MANIFEST.relative_to(ROOT)}")
    if failures:
        print(json.dumps({"ok": False, "failures": failures}, indent=2))
        return 1

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    verify_hash(manifest, "contactSheet", "contactSheetSha256", failures)
    verify_hash(manifest, "truthMapSheet", "truthMapSheetSha256", failures)
    require(manifest.get("negativePromptPolicy"), failures, "Missing negativePromptPolicy")

    source_truth = manifest.get("sourceTruth", {})
    layout_path = rel(source_truth.get("layout", ""))
    require(layout_path.exists(), failures, f"Missing layout source truth: {source_truth.get('layout')}")

    model_references = source_truth.get("modelReferences", [])
    require(len(model_references) >= 4, failures, "Expected level, navmesh, AVI jetbike, and Warden references")
    for model_reference in model_references:
        require(rel(model_reference).exists(), failures, f"Missing model reference: {model_reference}")

    items = manifest.get("items", [])
    require(len(items) == 4, failures, f"Expected 4 concept plates, found {len(items)}")
    for item in items:
        item_id = item.get("id", "<missing>")
        verify_hash(item, "webPath", "webSha256", failures)
        verify_hash(item, "png", "pngSha256", failures, required=False)
        require(item.get("fullPrompt"), failures, f"{item_id}: missing fullPrompt")
        require(item.get("generationMode"), failures, f"{item_id}: missing generationMode")
        require(item.get("truthLevel"), failures, f"{item_id}: missing truthLevel")
        require(item.get("use"), failures, f"{item_id}: missing use")
        require(
            "Do not" in item.get("fullPrompt", "") or "do not" in item.get("fullPrompt", ""),
            failures,
            f"{item_id}: prompt does not record source-preservation constraints",
        )
        for reference in item.get("references", []):
            require(rel(reference).exists(), failures, f"{item_id}: missing Blender/source reference {reference}")

    result = {
        "ok": not failures,
        "manifest": str(MANIFEST.relative_to(ROOT)).replace("\\", "/"),
        "conceptPlates": len(items),
        "requiredWebImages": [
            manifest.get("contactSheet"),
            manifest.get("truthMapSheet"),
            *[item.get("webPath") for item in items],
        ],
        "failures": failures,
    }
    print(json.dumps(result, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
