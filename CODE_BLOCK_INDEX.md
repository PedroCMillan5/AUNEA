# Índice de bloques de AUNEA Internal

AUNEA Internal V1 está en `REVIEW` con runtime Master v1.1, renderer, No-Reask, AS-IS/fricciones, adapter oficial a motores, modos Sesión/Interno, persistencia recuperable, UAT visible y descubrimiento robusto del backend local implementados. Pain → Economics → Risk → Recommendation → Pricing → Scenario permanece server-owned. El acceptance gate automatizado pasa; la promoción a `main` queda condicionada al UAT visual/nativo final. Desde el refactor UX/funcional en curso, este índice cubre el runtime vigente completo (frontend + backend + build/launcher) y se audita automáticamente con `3_SYSTEM/frontend/tests/block-id-audit.test.cjs`.

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
| AUNEA-UAT-BLOCK-INDEX-010 | 3_SYSTEM/frontend/tests/block-id-audit.test.cjs | Auditoría repo-wide de marcadores Block_ID vs este índice. | CODE_CONVENTIONS.md §5-7 | runtime vigente | pass/fail + diagnóstico | none | HIGH | node test | REVIEW |
| AUNEA-FE-CORE-STATE-020 | 3_SYSTEM/frontend/app-core.js | Estado global, CRM local y navegación compartida. | baseline v1.0.4 | user actions | state/DOM | localStorage/DOM | HIGH | runtime.test.cjs | REVIEW |
| AUNEA-FE-DIAG-CONTROL-030 | 3_SYSTEM/frontend/app-diagnostic-fields.js | Shell de navegación por etapas y prompts de proceso/fricción. | Master v1.1 | schema/state | stage UI | DOM | HIGH | runtime.test.cjs | REVIEW |
| AUNEA-FE-PROC-STEP-010 | 3_SYSTEM/frontend/app-process-editor.js | Risk/economic builders, confirmación AS-IS y archivado (supersede) de pasos/fricciones. | Process/Friction Models | engagement | RT records | state | HIGH | process-v1.test.cjs | REVIEW |
| AUNEA-FE-RESULTS-VIEW-010 | 3_SYSTEM/frontend/app-results.js | Resultados, recomendación, escenarios y cotización — vistas de sólo lectura sobre DiagnosticOutput. | DEC-034 | DiagnosticOutput | UI | DOM | HIGH | runtime.test.cjs | REVIEW |
| AUNEA-UAT-RUNTIME-FIXTURE-020 | 3_SYSTEM/frontend/app-uat-fixtures-v1.js | Fixtures UAT aisladas visibles en Modo Interno. | TEST_E2E fixtures | none | fixture defs | none | MEDIUM | uat-runtime-fixture-v1.test.cjs | REVIEW |
| AUNEA-BE-ENGINE-PAIN-010 | 3_SYSTEM/backend/aunea_backend/engines.py | Pain Engine. | DEC-034 | EngagementInput | PainResult[] | none | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-ENGINE-ECON-010 | 3_SYSTEM/backend/aunea_backend/engines.py | Economics Engine. | DEC-034 | EngagementInput | EconomicResult | none | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-ENGINE-RISK-010 | 3_SYSTEM/backend/aunea_backend/engines.py | Risk Engine. | DEC-034 | EngagementInput | RiskResult | none | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-ENGINE-RECOMMEND-010 | 3_SYSTEM/backend/aunea_backend/engines.py | Recommendation Engine. | DEC-034 | pain/risk results | Recommendation | none | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-ENGINE-PRICING-010 | 3_SYSTEM/backend/aunea_backend/engines.py | Pricing Engine. | DEC-034 | Recommendation/Risk | Quote | none | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-ORCH-DIAG-010 | 3_SYSTEM/backend/aunea_backend/orchestrator.py | Orquestación determinista Pain→Economics→Risk→Recommendation→Pricing→Scenario. | DEC-034 | EngagementInput | DiagnosticOutput | store/audit writes | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-ORCH-DELIVERY-010 | 3_SYSTEM/backend/aunea_backend/orchestrator.py | Dispatch a Deliverables/Solution Spec/System Builder. | DEC-034 | DiagnosticOutput/spec | packs/plans | store/audit writes | HIGH | test_deliverables.py + test_solution_spec.py + test_system_builder.py | REVIEW |
| AUNEA-BE-API-CORE-010 | 3_SYSTEM/backend/aunea_backend/api.py | Superficie HTTP (resto de endpoints fuera de UAT). | REQ-ENGN-001/REC-001/SCEN-001 | HTTP requests | HTTP responses | store/HTTP | CRITICAL | test_api.py | REVIEW |
| AUNEA-BE-STORE-010 | 3_SYSTEM/backend/aunea_backend/store.py | Adaptador de persistencia SQLite. | REQ-ENG-001 | EngagementInput/DiagnosticOutput | filas persistidas | SQLite writes | HIGH | test_store.py | REVIEW |
| AUNEA-BE-REGISTRY-010 | 3_SYSTEM/backend/aunea_backend/registry.py | Carga/caché del registry y lookups por tabla. | data/registry_v08.json.gz.b64 | none | tablas/rule_bundle_version | lru_cache | HIGH | test_e2e.py | REVIEW |
| AUNEA-BE-UTILS-010 | 3_SYSTEM/backend/aunea_backend/utils.py | Hash canónico y ranking de niveles. | n/a | valores | hash/rank | none | LOW | test_e2e.py | REVIEW |
| AUNEA-BE-BOOT-INIT-010 | 3_SYSTEM/backend/aunea_backend/main.py | Entry point ASGI. | n/a | none | app instance | none | LOW | test_api.py | REVIEW |
| AUNEA-BE-MODEL-CORE-010 | 3_SYSTEM/backend/aunea_backend/models.py | Contrato de datos de entrada/salida de motores. | DEC-034 | n/a | n/a | none | CRITICAL | test_e2e.py | REVIEW |
| AUNEA-BE-COMPONENT-LIB-010 | 3_SYSTEM/backend/aunea_backend/component_library.py | Biblioteca semilla de componentes reutilizables. | Component Library seed v1.1 | none | ComponentDefinition[] | none | MEDIUM | test_system_builder.py | REVIEW |
| AUNEA-BE-DELIVERABLES-MODEL-010 | 3_SYSTEM/backend/aunea_backend/deliverable_models.py | Contrato de datos de Deliverables. | DEC-034 | n/a | n/a | none | HIGH | test_deliverables.py | REVIEW |
| AUNEA-BE-DELIVERABLES-010 | 3_SYSTEM/backend/aunea_backend/deliverables.py | Deliverables Engine. | DEC-034 | DiagnosticOutput | DeliverablePack | none | HIGH | test_deliverables.py | REVIEW |
| AUNEA-BE-SOLUTION-MODEL-010 | 3_SYSTEM/backend/aunea_backend/solution_models.py | Contrato de datos de Solution Specification. | DEC-034 | n/a | n/a | none | HIGH | test_solution_spec.py | REVIEW |
| AUNEA-BE-SOLUTION-SPEC-010 | 3_SYSTEM/backend/aunea_backend/solution_spec.py | Solution Specification Engine. | DEC-034 | EngagementInput/DiagnosticOutput | SolutionSpecification | none | HIGH | test_solution_spec.py | REVIEW |
| AUNEA-BE-SYSBUILD-MODEL-010 | 3_SYSTEM/backend/aunea_backend/system_builder_models.py | Contrato de datos de System Builder. | DEC-034 | n/a | n/a | none | HIGH | test_system_builder.py | REVIEW |
| AUNEA-BE-SYSTEM-BUILDER-010 | 3_SYSTEM/backend/aunea_backend/system_builder.py | System Builder Engine. | DEC-034 | SolutionSpecification | SystemBuildPlan/Package | none | HIGH | test_system_builder.py | REVIEW |
| AUNEA-BUILD-BACKEND-DOCKER-010 | 3_SYSTEM/backend/Dockerfile | Imagen de contenedor del backend. | n/a | n/a | imagen | none | LOW | block-id-audit.test.cjs | REVIEW |
| AUNEA-BUILD-BACKEND-PYPROJECT-010 | 3_SYSTEM/backend/pyproject.toml | Config de paquete/build del backend. | n/a | n/a | paquete instalable | none | LOW | block-id-audit.test.cjs | REVIEW |
| AUNEA-BUILD-CI-BACKEND-010 | .github/workflows/aunea-backend-tests.yml | CI del backend (pytest en push/PR). | n/a | repo head | CI status | GitHub Actions | LOW | block-id-audit.test.cjs | REVIEW |
| AUNEA-BUILD-CI-FRONTEND-010 | .github/workflows/aunea-frontend-tests.yml | CI del frontend (node --test en push/PR). | n/a | repo head | CI status | GitHub Actions | LOW | block-id-audit.test.cjs | REVIEW |
| AUNEA-FE-I18N-LABELS-010 | 3_SYSTEM/frontend/app-i18n-labels-v1.js | Traducción ES de enums del backend (Pain/Risk/Quote) para vistas de sólo lectura. | aunea_backend/models.py | category+raw | label ES | none | LOW | i18n-labels-v1.test.cjs | REVIEW |
| AUNEA-FE-STYLE-TOKENS-010 | 3_SYSTEM/frontend/styles.css | Tokens de diseño AUNEA (color/tipografía/espaciado/radios) + reset. | TOKENS_AUNEA v1.0; DESIGN_SYSTEM_AUNEA v1.0 | n/a | CSS custom properties | DOM styling | MEDIUM | style-tokens.test.cjs | REVIEW |
| AUNEA-FE-STYLE-SHELL-010 | 3_SYSTEM/frontend/styles.css | Chrome de shell (sidebar/topbar/content) y primitivas compartidas (card/btn/grid/table/status). | CATALOGO_COMPONENTES_AUNEA DS-004/005/008/019 | n/a | DOM styling | DOM styling | MEDIUM | style-tokens.test.cjs | REVIEW |
| AUNEA-FE-STYLE-FORMS-010 | 3_SYSTEM/frontend/styles.css | Controles de formulario compartidos (DS-020). | CATALOGO_COMPONENTES_AUNEA DS-020 | n/a | DOM styling | DOM styling | MEDIUM | style-tokens.test.cjs | REVIEW |
| AUNEA-FE-STYLE-STAGE-010 | 3_SYSTEM/frontend/styles.css | Navegación de etapas, question-card y progreso. | DESIGN_SYSTEM_AUNEA v1.0 | n/a | DOM styling | DOM styling | MEDIUM | style-tokens.test.cjs | REVIEW |
| AUNEA-FE-STYLE-PROCESS-010 | 3_SYSTEM/frontend/styles.css | Lista de pasos y flow canvas AS-IS (DS-012). | CATALOGO_COMPONENTES_AUNEA DS-012 | n/a | DOM styling | DOM styling | MEDIUM | style-tokens.test.cjs | REVIEW |
| AUNEA-FE-STYLE-RESULTS-010 | 3_SYSTEM/frontend/styles.css | Resultados/escenarios/empty-state (DS-005/DS-010). | CATALOGO_COMPONENTES_AUNEA DS-005/010 | n/a | DOM styling | DOM styling | MEDIUM | style-tokens.test.cjs | REVIEW |
| AUNEA-FE-STYLE-MODAL-010 | 3_SYSTEM/frontend/styles.css | Modal y toast. | n/a | n/a | DOM styling | DOM styling | LOW | style-tokens.test.cjs | REVIEW |
| AUNEA-FE-STYLE-RESPONSIVE-010 | 3_SYSTEM/frontend/styles.css | Breakpoints responsive y print. | TOKENS_AUNEA grid.web.* | n/a | DOM styling | DOM styling | MEDIUM | style-tokens.test.cjs | REVIEW |
| AUNEA-UAT-I18N-010 | 3_SYSTEM/frontend/tests/i18n-labels-v1.test.cjs | Regresión de engineLabel(). | n/a | fixture | assertions | none | LOW | node test | REVIEW |
| AUNEA-UAT-STYLE-010 | 3_SYSTEM/frontend/tests/style-tokens.test.cjs | Regresión de tokens de diseño. | n/a | fixture | assertions | none | MEDIUM | node test | REVIEW |
| AUNEA-FE-DIAG-COMPLETION-070 | 3_SYSTEM/frontend/app-completion-model-v1.js | Modelo de completitud compuesto (etapas revisadas, obligatorios aplicables, pendientes concretos, gates de motor, listo para calcular). | canonicalMissingRequired/unresolvedEngineGates; corrección post-revisión #7 | engagement + schema | engagementCompletion(e) | none | HIGH | completion-model-v1.test.cjs | REVIEW |
| AUNEA-UAT-COMPLETION-010 | 3_SYSTEM/frontend/tests/completion-model-v1.test.cjs | Regresión del modelo de completitud y navegación de retorno Proceso↔Etapa. | n/a | fixture | assertions | none | HIGH | node test | REVIEW |

## Retired Block_IDs (do not reuse)

_(vacío — ningún Block_ID ha sido retirado todavía en este refactor)_
