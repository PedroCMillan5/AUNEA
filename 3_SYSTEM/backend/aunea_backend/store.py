from __future__ import annotations
import json, sqlite3
from pathlib import Path
from typing import Any
from .models import EngagementInput, DiagnosticOutput

class SQLiteStore:
    """Replaceable persistence adapter for AUNEA Internal runtime snapshots."""
    def __init__(self, path: str | Path = "aunea_runtime.db"):
        self.path=str(path)
        self._init()

    def _connect(self):
        con=sqlite3.connect(self.path)
        con.row_factory=sqlite3.Row
        return con

    def _init(self):
        with self._connect() as con:
            con.executescript('''
            CREATE TABLE IF NOT EXISTS engagements (
              engagement_id TEXT PRIMARY KEY,
              payload_json TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS diagnostic_outputs (
              engagement_id TEXT NOT NULL,
              input_hash TEXT NOT NULL,
              rule_bundle_version TEXT NOT NULL,
              output_json TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (engagement_id, input_hash, rule_bundle_version)
            );
            CREATE TABLE IF NOT EXISTS engine_runs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              engagement_id TEXT,
              engine TEXT NOT NULL,
              input_hash TEXT NOT NULL,
              output_hash TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            ''')

    def save_engagement(self, value: EngagementInput):
        payload=json.dumps(value.model_dump(mode="json"),ensure_ascii=False,sort_keys=True)
        with self._connect() as con:
            con.execute('''INSERT INTO engagements(engagement_id,payload_json,updated_at)
              VALUES(?,?,CURRENT_TIMESTAMP)
              ON CONFLICT(engagement_id) DO UPDATE SET payload_json=excluded.payload_json,updated_at=CURRENT_TIMESTAMP''',(value.engagement_id,payload))

    def get_engagement(self, engagement_id: str) -> EngagementInput | None:
        with self._connect() as con:
            row=con.execute('SELECT payload_json FROM engagements WHERE engagement_id=?',(engagement_id,)).fetchone()
        return EngagementInput.model_validate_json(row['payload_json']) if row else None

    def save_output(self, out: DiagnosticOutput):
        payload=json.dumps(out.model_dump(mode="json"),ensure_ascii=False,sort_keys=True)
        with self._connect() as con:
            con.execute('''INSERT OR REPLACE INTO diagnostic_outputs(engagement_id,input_hash,rule_bundle_version,output_json)
              VALUES(?,?,?,?)''',(out.engagement_id,out.input_snapshot_hash,out.rule_bundle_version,payload))

    def latest_output(self, engagement_id: str) -> DiagnosticOutput | None:
        with self._connect() as con:
            row=con.execute('SELECT output_json FROM diagnostic_outputs WHERE engagement_id=? ORDER BY created_at DESC LIMIT 1',(engagement_id,)).fetchone()
        return DiagnosticOutput.model_validate_json(row['output_json']) if row else None

    def add_run(self, engagement_id: str | None, engine: str, input_hash: str, output_hash: str, status: str="COMPLETED"):
        with self._connect() as con:
            con.execute('INSERT INTO engine_runs(engagement_id,engine,input_hash,output_hash,status) VALUES(?,?,?,?,?)',(engagement_id,engine,input_hash,output_hash,status))

    def list_runs(self, engagement_id: str | None=None) -> list[dict[str,Any]]:
        with self._connect() as con:
            if engagement_id:
                rows=con.execute('SELECT * FROM engine_runs WHERE engagement_id=? ORDER BY id',(engagement_id,)).fetchall()
            else:
                rows=con.execute('SELECT * FROM engine_runs ORDER BY id').fetchall()
        return [dict(r) for r in rows]
