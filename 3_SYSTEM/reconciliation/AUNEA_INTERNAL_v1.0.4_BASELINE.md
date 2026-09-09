# AUNEA Internal v1.0.4 — reconciliation baseline

Status: RECONCILIATION_BASELINE
Date: 2026-09-09
Source artifact: AUNEA_INTERNAL_v1.0.4_REVIEW_CANDIDATE.zip
Artifact SHA256: a9fb7400b000d6289224610c88d4b7dc51f75f8ae97e20e4c3873a3a8e01d6e7

## Acceptance evidence
- Native Windows user gate: PASS (confirmed by owner).
- Backend regression: 21/21 tests PASS on 2026-09-09.
- Frontend runtime QA previously passed with 0 JS global collisions / page errors.
- Fixes included: top() -> pageTop(); status() -> statusBadge(); run.bat rebuilt with real CRLF.

## Source hashes
- index.html: a053848eddf005d548b2ae2a055f2e85bcd501e2f7cd884bc286c5f540d226b0
- app.js: 431af7d6c37a67d5cdfc45cfab4d2cc39eb3f4d28e82da1e53bea4b9dd6b0a5e
- styles.css: f7edf743d088eddb477b5fa6e0954300f84c2fe42d23f971fa831195418a2ff3
- backend/pyproject.toml: 195e6e15d686364cdd47dcf2b7ea2bde7fab190d6c5e20c59e0fcb4365fc1214

## Reconciliation rule
The tested v1.0.4 artifact is the technical baseline to reconcile. Existing `3_SYSTEM/frontend/` on main must not be treated as the current runtime until source equivalence is proven. Do not tag stale frontend code as current.

## Known blockers after baseline reconciliation
- Recommendation/Pricing frontend adapter remains unresolved (GAP-002).
- Rich schema-driven controls/runtime materialization remain to implement (GAP-010 and related control audit findings).
- Diagnostic Master v1.1 physical Drive publication remains blocked by connector file-reference import (GAP-012).

## Promotion gate
Do not replace main blindly. Reconcile source-by-source against this baseline, preserve GitHub-only governance files, run regression/E2E, then merge/promote and update Drive governance.