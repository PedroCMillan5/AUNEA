# [AUNEA-BE-REGISTRY-010] START — Registry loader and table lookup
# PURPOSE: Decode/cache the compressed registry (reference tables, mappings, pricing config) and expose table()/by_id()/rule_bundle_version() lookups used by every engine.
# SOURCE: data/registry_v08.json.gz.b64 (registry snapshot); PROJECT_RULES one-rule/one-source.
# INPUTS: none (reads packaged data file).
# OUTPUTS: registry dict; per-table row lists; by-id row maps; rule_bundle_version string.
# SIDE_EFFECTS: in-process lru_cache.
# CHANGE_RISK: HIGH.
from __future__ import annotations
import base64, gzip, json
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_B64_PATH = ROOT / "data" / "registry_v08.json.gz.b64"

@lru_cache(maxsize=1)
def load_registry() -> dict[str, Any]:
    encoded = REGISTRY_B64_PATH.read_text(encoding="utf-8").strip()
    raw = gzip.decompress(base64.b64decode(encoded))
    reg = json.loads(raw.decode("utf-8"))
    if not isinstance(reg, dict) or not isinstance(reg.get("tables"), dict):
        raise RuntimeError("AUNEA registry is invalid or missing tables")
    return reg

def table(name: str) -> list[dict[str, Any]]:
    return load_registry()["tables"].get(name, [])

def by_id(table_name: str, field: str) -> dict[str, dict[str, Any]]:
    return {str(row.get(field)): row for row in table(table_name) if row.get(field) is not None}

def rule_bundle_version() -> str:
    version = load_registry().get("version")
    if version in (None, ""):
        raise RuntimeError("AUNEA registry rule bundle version is missing")
    return str(version)
# [AUNEA-BE-REGISTRY-010] END
