# [AUNEA-BE-REGISTRY-010] START — Registry loader and table lookup
# PURPOSE: Decode/cache the compressed registry (reference tables, mappings, pricing config) and expose table()/by_id()/rule_bundle_version() lookups used by every engine.
# SOURCE: data/registry_v08.json.gz.b64 (registry snapshot).
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
    return json.loads(raw.decode("utf-8"))

def table(name: str) -> list[dict[str, Any]]:
    return load_registry()["tables"].get(name, [])

def by_id(table_name: str, field: str) -> dict[str, dict[str, Any]]:
    return {str(row.get(field)): row for row in table(table_name) if row.get(field) is not None}

def rule_bundle_version() -> str:
    return load_registry().get("version", "v0.8")
# [AUNEA-BE-REGISTRY-010] END
