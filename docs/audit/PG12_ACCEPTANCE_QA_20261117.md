# PG12 — Auditoría de aceptación integral (17/11/2026)

**Estado:** REVIEW — **no promover a CLOSED/PRODUCTION sin gate actual y UAT visual de Chromium**.
**Proyecto:** AUNEA Internal, rama `work/as-is-ux-simplification-20260930`.
**Fuentes de gobierno:** `PROJECT_RULES.md`, `00_AUNEA_INTERNAL_MASTER_INDEX`, `DECISIONES_AUNEA` (DEC-050/055/075), `AUNEA_SYSTEM_SIMULATOR_CANONICAL`, `CODE_BLOCK_INDEX.md`.
**Fuente funcional:** mismo `processGraphHtml` + `drawProcessGraph` de AUNEA; `pages/comparison.js` solo añade capas de comparación.
**Origen de QA:** estudio sintético de 4 actividades, no datos reales de cliente.

## Matriz de aceptación

| Requisito | Validación | Estado comprobado |
|---|---|---|
| Un solo mapa, los mismos nodos AS-IS en las tres vistas | Aserciones sobre `.process-graph-board`, geometría y nodos | PASS en regresión dirigida; navegador en gate pendiente |
| Rutas SÍ/NO originales | Comparar aristas AS-IS y render nativo | PASS en regresión dirigida; navegador en gate pendiente |
| Rutas futuras en Propuesto | `drawProcessGraph` compartido con rutas TO-BE y geometría de bifurcación | PASS en regresión dirigida; navegador en gate pendiente |
| Comparación superpuesta sin aristas duplicadas | Segunda capa solo cuando cambia conjunto de rutas | PASS en regresión dirigida; navegador en gate pendiente |
| Identidad visual Actual frente a transformaciones TO-BE | Actual oculta avisos y conserva incluso nodos eliminados en TO-BE | Corregido; navegador en gate pendiente |
| Contadores mantenidas, modificadas, añadidas, eliminadas | Clasificación excluyente | PASS en regresión dirigida |
| Advertencias vs bloqueos | Contabilizados por separado | PASS en regresión dirigida |
| Desglose que suma el contador global de advertencias | Filas por actividad AS-IS, actividad añadida y global | PASS en regresión dirigida; navegador en gate pendiente |
| Fricciones, riesgos, espera y retrabajo | Leídos exclusivamente del AS-IS confirmado | PASS en regresión dirigida; navegador en gate pendiente |
| Métricas anuales del backend | Comparación en browser con `currentDiagnosticOutput`, sin ahorros inventados | En gate Chromium |
| Selección de actividad, detalle, navegación, búsqueda | Click y teclado, tabla filtrada | En gate Chromium |
| Persistencia del TO-BE revisado e inmutabilidad AS-IS | Guardado/recarga y comparación de snapshots serializados | En gate Chromium |
| Actividades incorporadas y eliminadas | Un solo mapa, origen intacto, diferencias visibles | PASS regresión; navegador en gate pendiente |
| Versiones AS-IS incompatibles | Reutiliza `tobeAsisCompatibility` de PG11; no mezcla diagnósticos | PASS regresión; navegador en gate pendiente |
| PG11 → PG12 con aprobación auténtica | `tobeReviewReadiness` + `advanceTobeStatus` en caso sintético, no asignación forzada de `REVIEWED` | En gate Chromium |
| Responsive/sin errores JS | Capturas Chromium en `tests/browser-evidence/pg12-*.png` y escucha de excepciones | En gate Chromium |

## Resultados obtenidos

- **Regresión de modelo y UI:** 11/11 PASS en harness de ejecución V8 contra fuentes de la rama.
- **Prueba real de Node:** `cd 3_SYSTEM/frontend && node --test tests/pg12-overlay.test.cjs`; incluida en `npm test` de CI; el gate *de la revisión actual* debe verificarse.
- **E2E Chromium:** `node tests/pg12-browser-acceptance.cjs`, conectado al job `browser_uat` de `.github/workflows/aunea-v1-gate.yml`. **No confundir estar conectado con haber pasado**.
- **Backend:** `python -m pytest -q` en el gate existente; pendiente confirmación del source_head actual.
- **Histórico de gate:** el registro `docs/audit/AUNEA_INTERNAL_ACCEPTANCE_GATE.json` anterior a estos cambios era PASS, pero no sirve como prueba del código nuevo.
- **Estado de publicación:** revisión de integración; no modificar main ni forzar promocionar estado.

## Caso visible de Levante Instalaciones Técnicas

AS-IS v2, TO-BE v4, cuatro actividades. Las capturas indicaban 0 mantenidas, 4 modificadas, 0 añadidas, 0 eliminadas y 8 observaciones. En el detalle confirmado visualmente, P3 mostraba **768 min de espera AS-IS** y P4 **5 min de retrabajo AS-IS**. No reutilizar tiempos de un fixture genérico de seis pasos.

**Dependencia fuera de PG12:** el proceso diseñado en PG11 requiere aclarar el tratamiento de una factura rechazada antes de considerarse una solución TO-BE operativamente completa. La página PG12 es una comparación de fuentes revisadas, no valida por sí sola la viabilidad del ERP ni el rechazo financiero.

## Criterio objetivo de cierre

La página se puede promover de REVIEW únicamente con resultado **PASS** en el commit que contiene la última corrección de PG12, jobs backend/frontend/Chromium independientes, screenshots de las tres vistas y de los casos estructurales, fuente inmutable y sin errores de runtime. Si falta alguno de ellos, el estado permanece REVIEW y la matriz identifica la verificación pendiente.

**Bloques registrados:** `AUNEA-FE-PG12-OVERLAY-MODEL-469`, `AUNEA-FE-PG12-OVERLAY-VIEW-470`, `AUNEA-FE-PG12-OVERLAY-EVENTS-471`, `AUNEA-UAT-PG12-OVERLAY-472`, `AUNEA-UAT-PG12-CHROMIUM-495`.
