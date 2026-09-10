# Índice de bloques de AUNEA Internal

AUNEA Internal V1 está en `REVIEW` con runtime Master v1.1, renderer, No-Reask, AS-IS/fricciones, adapter oficial a motores, modos Sesión/Interno, persistencia recuperable, UAT visible y descubrimiento robusto del backend local implementados. Pain → Economics → Risk → Recommendation → Pricing → Scenario permanece server-owned. El acceptance gate automatizado pasa; la promoción a `main` queda condicionada al UAT visual/nativo final.

| Block_ID | Archivo | Responsabilidad | Fuente | Inputs | Outputs | Efectos | Riesgo | Regresión | Estado |
|---|---|---|---|---|---|---|---|---|---|
| AUNEA-BE-SCEN-CALC-020 | 3_SYSTEM/backend/aunea_backend/engines.py | Scenario Comparator. | DEC-034 | backend | scenario | none | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-SCEN-MODEL-010 | 3_SYSTEM/backend/aunea_backend/models.py | Contrato escenario. | runtime contract | request | result | none | HIGH | test_regression_v101.py | REVIEW |
| AUNEA-DATA-DIAG-ADAPTER-010 | 3_SYSTEM/frontend/app-schema-v11.js | Master v1.1 runtime. | Master v1.1 | base | schema | init | HIGH | schema-v11.test.cjs | REVIEW |
| AUNEA-FE-DIAG-RENDER-040 | 3_SYSTEM/frontend/app-renderer-v1.js | Renderer canónico. | REQ-DIAG-005 | schema | controls | state | HIGH | renderer-v1.test.cjs | REVIEW |
| AUNEA-FE-DIAG-NOREASK-050 | 3_SYSTEM/frontend/app-no-reask-v1.js | NR01–NR15/branching. | DEC-040 | engagement | effective values | state | HIGH | no-reask-v1.test.cjs | REVIEW |
| AUNEA-FE-DIAG-NOREASK-055 | 3_SYSTEM/frontend/app-no-reask-capacity-v1.js | Corregir BR-CAPACITY al campo canónico `capacity_cost_rate_eur_hour`. | EconomicInput / DF076-077 | economics | branch state | none | MEDIUM | capacity-branch-v1.test.cjs | REVIEW |
| AUNEA-FE-PROC-EDITOR-020 | 3_SYSTEM/frontend/app-process-v1.js | AS-IS y fricciones. | Process/Friction Models | engagement | RT records | state | HIGH | process-v1.test.cjs | REVIEW |
| AUNEA-FE-ENGINE-ADAPTER-020 | 3_SYSTEM/frontend/app-engine-adapter-v1.js | Preparar inputs canónicos y consumir outputs oficiales; cinco gates internos trazados. | MAP_QUESTION_ENGINE_INPUT; RULE_RECOMMENDATION; DEC-034 | capture + confirmations | EngagementInput / DiagnosticOutput | HTTP/state | CRITICAL | engine-adapter-v1.test.cjs + backend test_e2e.py | REVIEW |
| AUNEA-FE-BACKEND-DISCOVERY-060 | 3_SYSTEM/frontend/app-backend-discovery-v1.js | Detectar una instancia real de AUNEA Backend en puertos locales alternativos cuando 8000 está ocupado/reservado. | REQ-UAT-003; /health backend | state.backendUrl + puertos locales | backendUrl/online/version | HTTP local + localStorage | HIGH | backend-discovery-v1.test.cjs + test_cors_local_ports.py | REVIEW |
| AUNEA-FE-UX-MODE-040 | 3_SYSTEM/frontend/app-mode-v1.js | Modo Sesión / Modo Interno sobre un único state. | REQ-UX-001 | state/pages | UX layer | DOM/pref | HIGH | mode-v1.test.cjs + runtime.test.cjs | REVIEW |
| AUNEA-FE-PERSIST-UAT-050 | 3_SYSTEM/frontend/app-persistence-uat-v1.js | Recovery, autosave, backup/restore y UAT visible. | REQ-ENG-001; REQ-UAT-001/002/003 | state + UAT API | recovery/UAT view | localStorage/HTTP | HIGH | runtime.test.cjs | REVIEW |
| AUNEA-FE-SHELL-NAV-010 | 3_SYSTEM/frontend/app-shell.js | Shell/pantallas. | baseline | state | DOM | DOM | HIGH | runtime.test.cjs | REVIEW |
| AUNEA-FE-BOOT-INIT-010 | 3_SYSTEM/frontend/app.js | Arranque. | Master v1.1 | modules | UI | HTTP | HIGH | runtime.test.cjs | REVIEW |
| AUNEA-UAT-ENGINE-ONECLICK-010 | 3_SYSTEM/backend/aunea_backend/uat.py | 5 fixtures / 26 assertions canónicas aisladas. | TEST_E2E; TEST_E2E_ASSERTION | fixtures | PASS/FAIL detail | none | HIGH | test_uat.py | REVIEW |
| AUNEA-UAT-API-010 | 3_SYSTEM/backend/aunea_backend/api.py | Endpoint `/v1/uat/run`. | REQ-UAT-001 | none | UAT result | HTTP only | HIGH | test_uat.py | REVIEW |
| AUNEA-UAT-RUNTIME-TEST-010 | 3_SYSTEM/frontend/tests/runtime.test.cjs | Recorrido HTTP/DOM integrado de la V1. | REQ CRM/DIAG/PROC/FRIC/UX/UAT | synthetic state | assertions | ephemeral HTTP | HIGH | AUNEA V1 Acceptance Gate | REVIEW |
| AUNEA-UAT-SCHEMA-V11-010 | 3_SYSTEM/frontend/tests/schema-v11.test.cjs | Schema v1.1. | Master | fixture | assertions | none | HIGH | node test | REVIEW |
| AUNEA-UAT-RENDER-010 | 3_SYSTEM/frontend/tests/renderer-v1.test.cjs | Renderer. | REQ-DIAG-005 | fixture | assertions | none | HIGH | node test | REVIEW |
| AUNEA-UAT-NOREASK-010 | 3_SYSTEM/frontend/tests/no-reask-v1.test.cjs | No-Reask. | NR01–15 | fixture | assertions | none | HIGH | node test | REVIEW |
| AUNEA-UAT-PROC-010 | 3_SYSTEM/frontend/tests/process-v1.test.cjs | Process/friction. | REQ-PROC/FRIC | fixture | assertions | none | HIGH | node test | REVIEW |
| AUNEA-UAT-ENGINE-020 | 3_SYSTEM/frontend/tests/engine-adapter-v1.test.cjs | Adapter/guardrail. | DEC-034 | fixture | assertions | none | CRITICAL | node test | REVIEW |
| AUNEA-UAT-GATE-010 | .github/workflows/aunea-v1-gate.yml | Gate conjunto backend/frontend sobre el mismo commit. | PROJECT_RULES / acceptance criteria | repo head | CI status | GitHub Actions | CRITICAL | 27 backend + 26 frontend | REVIEW |
