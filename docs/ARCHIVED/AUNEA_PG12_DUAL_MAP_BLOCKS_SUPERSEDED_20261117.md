# ARCHIVED — PG12 obsolete dual-map blocks (2026-11-17)

**Status:** ARCHIVED — historical traceability only. Not executed or referenced by the current module manifest.

These CODE_BLOCK_INDEX.md rows were retired when PG12 was redesigned around ONE immutable AS-IS native process map with a read-only TO-BE overlay. Their markers and old behavior were removed by the previously approved PG12 single-map implementation. The active row audit must not treat them as live code responsibilities.

| Historical Block_ID | Retired responsibility | Active successor |
| --- | --- | --- |
| AUNEA-FE-PG12-TOBE-GRAPH-234 | Two separate derived actual/proposed maps | AUNEA-FE-PG12-OVERLAY-MODEL-469 + AUNEA-FE-PG12-OVERLAY-VIEW-470 |
| AUNEA-FE-PG12-MAP-SELECT-235 | Selection synchronized between two map panes | AUNEA-FE-PG12-OVERLAY-EVENTS-471, single-map node selection |

Current owners: `3_SYSTEM/frontend/pages/comparison.js` and native process renderer in `domain/process.js`. Sources: Simulator CANONICAL PG12; DEC-050/055/075; master UI/UX contract L1. Active tests: `pg12-overlay.test.cjs`, `uat-browser-smoke.cjs`, `internal-work-p0.test.cjs`.

No functional change is made by archiving these stale Block_ID references. Do not restore a dual-map layout to satisfy historical tests.
