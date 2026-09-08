from __future__ import annotations
import hashlib, json
from typing import Any

def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)

def stable_hash(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()

def level_rank(level: str | None, prefix: str) -> int:
    if not level or not level.startswith(prefix):
        return 0
    try:
        return int(level[1:])
    except Exception:
        return 0
