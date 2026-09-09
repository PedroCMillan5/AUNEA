# Índice de bloques de AUNEA Internal

Reconciliación modular en REVIEW. Conserva la baseline aceptada; no cierra los 29 requisitos.

| Block_ID | Archivo | Responsabilidad | Fuente | Inputs | Outputs | Efectos | Riesgo | Regresión | Estado |
|---|---|---|---|---|---|---|---|---|---|
| AUNEA-BE-SCEN-CALC-020 | 3_SYSTEM/backend/aunea_backend/engines.py | Conservar nombre y valorar capacidad por sus horas y tarifa de origen. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | CRITICAL. | tests/test_regression_v101.py | REVIEW |
| AUNEA-BE-SCEN-MODEL-010 | 3_SYSTEM/backend/aunea_backend/models.py | Mantener el nombre del escenario en la respuesta tipada. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | tests/test_regression_v101.py | REVIEW |
| AUNEA-FE-CORE-STATE-020 | 3_SYSTEM/frontend/app-core.js | Estado, CRM y navegación. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | frontend/tests/runtime.test.cjs (DOM; Chromium pendiente) | REVIEW |
| AUNEA-FE-DIAG-CONTROL-030 | 3_SYSTEM/frontend/app-diagnostic-fields.js | Captura Diagnostic Master v1. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | frontend/tests/runtime.test.cjs (DOM; Chromium pendiente) | REVIEW |
| AUNEA-FE-PROC-STEP-010 | 3_SYSTEM/frontend/app-process-editor.js | Edición de pasos, fricciones y evidencia. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | frontend/tests/runtime.test.cjs (DOM; Chromium pendiente) | REVIEW |
| AUNEA-FE-RESULTS-VIEW-010 | 3_SYSTEM/frontend/app-results.js | Resultados y adaptador bloqueado GAP-002. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | frontend/tests/runtime.test.cjs (DOM; Chromium pendiente) | REVIEW |
| AUNEA-FE-SHELL-NAV-010 | 3_SYSTEM/frontend/app-shell.js | Pantallas y eventos. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | frontend/tests/runtime.test.cjs (DOM; Chromium pendiente) | REVIEW |
| AUNEA-FE-BOOT-INIT-010 | 3_SYSTEM/frontend/app.js | Iniciar los módulos cargados en orden por index.html. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | frontend/tests/runtime.test.cjs (DOM; Chromium pendiente) | REVIEW |
| AUNEA-UAT-RUNTIME-TEST-010 | 3_SYSTEM/frontend/tests/runtime.test.cjs | Ejecutar recursos reales y recorrido de captura en un DOM aislado. | v1.0.4 aceptada / Diagnostic Master v1 | Ver INPUTS | Ver OUTPUTS | Ver SIDE_EFFECTS | HIGH. | frontend/tests/runtime.test.cjs (DOM; Chromium pendiente) | REVIEW |
