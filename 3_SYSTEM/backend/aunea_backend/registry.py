from __future__ import annotations
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "data" / "registry_v08.json"

@lru_cache(maxsize=1)
def load_registry() -> dict[str, Any]:
    with REGISTRY_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)

def table(name: str) -> list[dict[str, Any]]:
    return load_registry()["tables"].get(name, [])

def by_id(table_name: str, field: str) -> dict[str, dict[str, Any]]:
    return {str(row.get(field)): row for row in table(table_name) if row.get(field) is not None}

def rule_bundle_version() -> str:
    return load_registry().get("version", "v0.8")
