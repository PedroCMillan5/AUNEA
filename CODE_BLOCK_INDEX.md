# Índice de bloques de AUNEA Internal

Reconciliación modular en REVIEW. Runtime v1.1, renderer, No-Reask y editor AS-IS/fricciones canónico están implementados en la rama. La V1 funcional aún depende de engines, modos, persistencia y UAT.

| Block_ID | Archivo | Responsabilidad | Fuente | Inputs | Outputs | Efectos | Riesgo | Regresión | Estado |
|---|---|---|---|---|---|---|---|---|---|
| AUNEA-BE-SCEN-CALC-020 | 3_SYSTEM/backend/aunea_backend/engines.py | Conservar nombre y valorar capacidad por sus horas y tarifa de origen. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | CRITICAL. | tests/test_regression_v101.py | REVIEW |
| AUNEA-BE-SCEN-MODEL-010 | 3_SYSTEM/backend/aunea_backend/models.py | Mantener el nombre del escenario en la respuesta tipada. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | tests/test_regression_v101.py | REVIEW |
| AUNEA-FE-CORE-STATE-020 | 3_SYSTEM/frontend/app-core.js | Estado, CRM y navegación. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | frontend/tests/runtime.test.cjs | REVIEW |
| AUNEA-DATA-DIAG-ADAPTER-010 | 3_SYSTEM/frontend/app-schema-v11.js | Proyectar runtime sobre Diagnostic Master v1.1, materializando REF_DOMAIN, ISO3166 y Communication_Channels. | Drive 1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1; DEC-038/040 | Runtime base + delta | schema v1.1 | Inicialización | HIGH. | schema-v11.test.cjs | REVIEW |
| AUNEA-FE-DIAG-RENDER-040 | 3_SYSTEM/frontend/app-renderer-v1.js | Renderer especializado sin fallback libre silencioso. | Diagnostic Master v1.1; REQ-DIAG-005 | Field contract | controles | answers/details | HIGH. | renderer-v1.test.cjs | REVIEW |
| AUNEA-FE-DIAG-NOREASK-050 | 3_SYSTEM/frontend/app-no-reask-v1.js | NR01–NR15, reutilización y branching. | 00_NO_REASK_RULES_V1; DEC-040 | CRM+engagement+AS-IS | effective values | Correcciones | HIGH. | no-reask-v1.test.cjs | REVIEW |
| AUNEA-FE-PROC-STEP-010 | 3_SYSTEM/frontend/app-process-editor.js | Baseline editor reconciliado. | v1.0.4 aceptada | state | state | DOM | HIGH. | runtime.test.cjs | REVIEW |
| AUNEA-FE-PROC-EDITOR-020 | 3_SYSTEM/frontend/app-process-v1.js | Editor canónico de 20 atributos de paso + fricciones ancladas + revisión visual. | Process Step Model v1.1; Friction Model v1; MAP_FRICTION_PAIN_V1 | engagement + option sets | RT_PROCESS_STEP/RT_FRICTION local | state/audit | HIGH. | process-v1.test.cjs | REVIEW |
| AUNEA-FE-RESULTS-VIEW-010 | 3_SYSTEM/frontend/app-results.js | Resultados y adaptador bloqueado GAP-002. | DEC-034 | capture | backend outputs | HTTP | HIGH. | runtime.test.cjs | REVIEW |
| AUNEA-FE-SHELL-NAV-010 | 3_SYSTEM/frontend/app-shell.js | Pantallas y eventos. | v1.0.4 | state | DOM | DOM | HIGH. | runtime.test.cjs | REVIEW |
| AUNEA-FE-BOOT-INIT-010 | 3_SYSTEM/frontend/app.js | Arranque único con schema v1.1. | Master v1.1 | modules | UI | HTTP | HIGH. | runtime + schema tests | REVIEW |
| AUNEA-UAT-RUNTIME-TEST-010 | 3_SYSTEM/frontend/tests/runtime.test.cjs | Recorrido runtime aislado. | baseline | resources | assertions | none | HIGH. | runtime.test.cjs | REVIEW |
| AUNEA-UAT-SCHEMA-V11-010 | 3_SYSTEM/frontend/tests/schema-v11.test.cjs | Deltas v1.1. | Master v1.1 | base | assertions | none | HIGH. | schema-v11.test.cjs | REVIEW |
| AUNEA-UAT-RENDER-010 | 3_SYSTEM/frontend/tests/renderer-v1.test.cjs | Renderer canónico. | REQ-DIAG-005 | contract | assertions | none | HIGH. | renderer-v1.test.cjs | REVIEW |
| AUNEA-UAT-NOREASK-010 | 3_SYSTEM/frontend/tests/no-reask-v1.test.cjs | No-Reask/branching. | NR01–NR15 | fixture | assertions | none | HIGH. | no-reask-v1.test.cjs | REVIEW |
| AUNEA-UAT-PROC-010 | 3_SYSTEM/frontend/tests/process-v1.test.cjs | Proceso/fricción v1.1. | REQ-PROC/FRIC | helpers/code contract | assertions | none | HIGH. | process-v1.test.cjs | REVIEW |
