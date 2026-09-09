# Índice de bloques de AUNEA Internal

Runtime v1.1, renderer, No-Reask, editor AS-IS/fricciones y adapter oficial a motores están implementados en REVIEW. La lógica Pain → Economics → Risk → Recommendation → Pricing → Scenario permanece server-owned. La V1 funcional aún depende de modos, persistencia/UAT y QA final.

| Block_ID | Archivo | Responsabilidad | Fuente | Inputs | Outputs | Efectos | Riesgo | Regresión | Estado |
|---|---|---|---|---|---|---|---|---|---|
| AUNEA-BE-SCEN-CALC-020 | 3_SYSTEM/backend/aunea_backend/engines.py | Scenario Comparator. | DEC-034 | backend | scenario | none | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-SCEN-MODEL-010 | 3_SYSTEM/backend/aunea_backend/models.py | Contrato escenario. | runtime contract | request | result | none | HIGH | test_regression_v101.py | REVIEW |
| AUNEA-DATA-DIAG-ADAPTER-010 | 3_SYSTEM/frontend/app-schema-v11.js | Master v1.1 runtime. | Master v1.1 | base | schema | init | HIGH | schema-v11.test.cjs | REVIEW |
| AUNEA-FE-DIAG-RENDER-040 | 3_SYSTEM/frontend/app-renderer-v1.js | Renderer canónico. | REQ-DIAG-005 | schema | controls | state | HIGH | renderer-v1.test.cjs | REVIEW |
| AUNEA-FE-DIAG-NOREASK-050 | 3_SYSTEM/frontend/app-no-reask-v1.js | NR01–NR15/branching. | DEC-040 | engagement | effective values | state | HIGH | no-reask-v1.test.cjs | REVIEW |
| AUNEA-FE-PROC-EDITOR-020 | 3_SYSTEM/frontend/app-process-v1.js | AS-IS y fricciones. | Process/Friction Models | engagement | RT records | state | HIGH | process-v1.test.cjs | REVIEW |
| AUNEA-FE-ENGINE-ADAPTER-020 | 3_SYSTEM/frontend/app-engine-adapter-v1.js | Preparar inputs canónicos y consumir outputs oficiales; cinco gates internos trazados. | MAP_QUESTION_ENGINE_INPUT; RULE_RECOMMENDATION; DEC-034 | capture + confirmations | EngagementInput / DiagnosticOutput | HTTP/state | CRITICAL | engine-adapter-v1.test.cjs + backend test_e2e.py | REVIEW |
| AUNEA-FE-SHELL-NAV-010 | 3_SYSTEM/frontend/app-shell.js | Shell/pantallas. | baseline | state | DOM | DOM | HIGH | runtime.test.cjs | REVIEW |
| AUNEA-FE-BOOT-INIT-010 | 3_SYSTEM/frontend/app.js | Arranque. | Master v1.1 | modules | UI | HTTP | HIGH | runtime.test.cjs | REVIEW |
| AUNEA-UAT-SCHEMA-V11-010 | frontend/tests/schema-v11.test.cjs | Schema v1.1. | Master | fixture | assertions | none | HIGH | node test | REVIEW |
| AUNEA-UAT-RENDER-010 | frontend/tests/renderer-v1.test.cjs | Renderer. | REQ-DIAG-005 | fixture | assertions | none | HIGH | node test | REVIEW |
| AUNEA-UAT-NOREASK-010 | frontend/tests/no-reask-v1.test.cjs | No-Reask. | NR01–15 | fixture | assertions | none | HIGH | node test | REVIEW |
| AUNEA-UAT-PROC-010 | frontend/tests/process-v1.test.cjs | Process/friction. | REQ-PROC/FRIC | fixture | assertions | none | HIGH | node test | REVIEW |
| AUNEA-UAT-ENGINE-020 | frontend/tests/engine-adapter-v1.test.cjs | Adapter/guardrail. | DEC-034 | fixture | assertions | none | CRITICAL | node test | REVIEW |
