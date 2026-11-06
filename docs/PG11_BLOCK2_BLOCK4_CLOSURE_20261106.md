# PG11 — Cierre de implementación de bloques 2 y 4

Fecha: 06/11/2026 · Rama: `work/as-is-ux-simplification-20260930` · Estado: **REVIEW técnico** (sin promoción del software ni aprobación del TO-BE).

## Gobierno y fuentes consultadas

`00_AUNEA_INTERNAL_MASTER_INDEX` v1.59; `PROJECT_RULES.md` v1.7; DEC-034/050/052/055; `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14; contrato de arquitectura canónico; y alcance documentado en `docs/PG11_BLOCK1_CONTINUATION_20261106.md` y `docs/PG11_BLOCK3_GLOBAL_TO_ACTIVITY_20261106.md`.

No se han añadido preguntas DF, registros de negocio, precios, productos, KPIs, permisos, reglas deterministas ni fuentes CANONICAL. PG11 sigue usando la propuesta TO-BE DRAFT del Engagement y exige revisión humana.

## Bloque 2 — Restricciones y alternativas (puntos 4–7)

- El evaluador servidor `internal_ai_global_review.py` contrasta cada intervención con límites DF explícitos: decisión/aprobación humana, acciones financieras, borrado irreversible, continuidad, trazabilidad, accesos y medidas existentes. Identifica **fuentes concretas** declaradas, sin atribuir falsamente otros DF. Separa incompatibilidad efectiva de preferencia de herramientas nativas/existentes.
- La viabilidad de APIs, integraciones, permisos, licencias o automatizaciones de ERP/CRM **permanece UNVERIFIED**. La salida `CONDITIONED` lleva preguntas específicas que debe confirmar el responsable; nunca se traduce en capacidad ya acreditada.
- Se solicita otra intervención cuando la inicial recibe `INCOMPATIBLE` con conflicto verdadero; se conserva la descartada y su motivo. El backend `internal_ai_global_alternative.py` incorpora conflicto fuente y prohibición de repetir/parafrasear la propuesta rechazable; una preferencia no constituye veto. El frontend transmite las condiciones originales mediante `blocked_constraints` y verifica fuente, diagnóstico, versión, revisión `CONDITIONED` y ausencia de nuevos conflictos antes de conservar una alternativa como DRAFT.
- Si no se obtiene alternativa defendible o falla la evaluación, se muestra una observación y la intervención original permanece visible como incompatible; no se aprueba ninguna intervención.

## Bloque 4 — Estados, interfaz y persistencia (puntos 8, 10 y 14)

- `results.js` conserva las tarjetas nativas PG11, pero presenta **generación por fuentes**, **integridad real del texto** y **revisión humana de actividades** por separado. Los textos cortados permanecen íntegros y el aviso original se conserva. El detalle, los conflictos específicos y la evidencia quedan en el desplegable canónico; el resumen permanece compacto.
- El botón **Reintentar fuentes pendientes**, distinto de **Volver a analizar**, aparece sólo para una propuesta DRAFT parcial con fuentes identificables todavía sin completar. Mientras se analiza, los controles quedan deshabilitados. No se crean estados ni controles comerciales nuevos.
- `internal-ai-pilot.js` guarda `source_batches` por fuente dentro del mismo `aiGlobal` versionado; al reintentar, comprueba TO-BE, AS-IS, hash de diagnóstico e inventario, conserva las recomendaciones y las fuentes terminadas y solicita sólo los lotes pendientes. Un fallo HTTP 503 o corte de Ollama no obliga a repetir el análisis completo.
- Un error de persistencia revierte el objeto temporal al último estado guardado; los errores de guardado no se disfrazan de error recuperable de modelo. El frontend no toca el AS-IS confirmado ni sobrescribe campos TO-BE.
- Se ha eliminado un decorador temporal duplicado de `boot.js`; toda la interfaz del análisis global vuelve a vivir exclusivamente en su owner `results.js`. `ui-system.css` modifica sólo espaciados y componentes existentes sin truncar recomendaciones.

## QA y alcance del cierre

Contratos automáticos: `backend/tests/test_internal_ai_global.py` verifica conflictos fuente, preferencias no vinculantes, capacidades desconocidas y evaluación de alternativas; `frontend/tests/pg11-global-overview.test.cjs` verifica estados independientes, persistencia progresiva, reintento, rollback y no escritura; `frontend/tests/uat-browser-smoke.cjs` ejecuta en Chromium la navegación/reintento sin borrar borradores. Gates oficiales: GitHub Actions AUNEA Backend Tests, AUNEA Frontend Tests y AUNEA Internal V2 REVIEW Acceptance Gate sobre el HEAD de la rama.

**Exclusión explícita:** la UAT con Ollama real en el Windows del consultor y procesos de complejidad heterogénea pertenece al **bloque 5** y no se ha ejecutado como parte de esta finalización. Los workflows usan fixtures sintéticos/mocks. Se mantienen el software y PG11 en REVIEW, sin promover CANONICAL ni declarar viabilidad de herramientas de cliente.

## Archivos responsables

- Backend: `3_SYSTEM/backend/aunea_backend/internal_ai_global.py`; `internal_ai_global_review.py`; `internal_ai_global_alternative.py`.
- Frontend: `3_SYSTEM/frontend/pages/results.js`; `3_SYSTEM/frontend/domain/internal-ai-pilot.js`; `3_SYSTEM/frontend/ui-system.css`; `3_SYSTEM/frontend/boot.js` (sin segundo owner).
- QA: `3_SYSTEM/backend/tests/test_internal_ai_global.py`; `3_SYSTEM/frontend/tests/pg11-global-overview.test.cjs`; `3_SYSTEM/frontend/tests/uat-browser-smoke.cjs`.
- Inventario técnico: `CODE_BLOCK_INDEX.md`.

Revisión humana final, autorizar capacidades efectivas e implantar un proceso futuro continúan fuera del alcance automático de este bloque.
