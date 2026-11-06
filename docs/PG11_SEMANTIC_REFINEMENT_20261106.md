# PG11 — Coherencia y consolidación semántica (REVIEW)

**Fecha:** 06/11/2026 · **Rama:** `work/as-is-ux-simplification-20260930` · **Owner:** PG11 `aiGlobal` DRAFT (sin crear otro owner).

## Fuentes de gobierno

`00_AUNEA_INTERNAL_MASTER_INDEX` v1.59, `PROJECT_RULES.md` v1.7, `DECISIONES_AUNEA` DEC-034/050/052/055, `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14 y contrato de arquitectura AUNEA Internal. La implementación sigue REVIEW: no modifica el contrato canónico, preguntas DF, outputs aprobados ni métricas comerciales.

## Cambios implantados

- Clasificación read-only de intervenciones por **finalidad operativa**: captura y validación, consulta de estado, recordatorios de aprobación, trazabilidad y preparación de tareas. Las etiquetas de estado *Aprobada/Rechazada* y *pendiente de aprobación* por sí solas no prueban una intervención de aprobación.
- Agrupación candidata por finalidad, dominio y condición de viabilidad. **Ninguna intervención se borra ni fusiona**: se conservan sus `objective`, `how`, `why`, `source_refs`, `related`, evaluaciones y alternativas originales.
- Incoherencias objetivo–acción o acción–fuente marcadas con `quality.status=REVIEW` y `issues[]` en la salida backend. No se corrige automáticamente la intervención. Los resultados previos sin este campo reciben únicamente un chequeo heurístico de lectura en frontend; un silencio de la heurística no es una validación semántica.
- La UI canónica `results.js` muestra líneas candidatas, objetivo operacional/resultado esperado como **hipótesis**, comprobación técnica principal si existe, avisos de coherencia, e indicador independiente de integridad del texto. Evidencias y restricciones completas permanecen en los desplegables.
- La prioridad sigue **sin fijar** cuando no hay medida y validación de impacto/dependencias. El orden visual no constituye una prioridad aprobada.
- El usuario debe conservar un borrador original antes de usar **Volver a analizar**; ver la nueva agrupación no requiere llamar a Ollama otra vez. No se altera el AS-IS confirmado ni la revisión por actividad.

## Owners y pruebas

- `AUNEA-FE-PG11-GLOBAL-QUALITY-300` — `3_SYSTEM/frontend/domain/internal-ai-global-quality.js`.
- `AUNEA-FE-PG11-GLOBAL-OVERVIEW-284` — `3_SYSTEM/frontend/pages/results.js`.
- `AUNEA-BE-PG11-GLOBAL-REVIEW-292` + `AUNEA-BE-PG11-GLOBAL-AI-282` — evaluación conservadora de fuente vinculada y DRAFT.
- `AUNEA-UAT-PG11-GLOBAL-QUALITY-302` — pruebas de 5 propuestas/4 líneas relacionadas, no cuotas, objetivos incoherentes y no mutación; backend `test_internal_ai_global.py` — alertas de calidad con snapshot y fuente.

La Acceptance Gate consta de backend, frontend y Chromium. **El éxito de CI con mocks no sustituye el UAT de Ollama real en Windows**. El QA de comportamiento real permanece en REVIEW y no acredita la idoneidad de automatizaciones del ERP ni resultados de ahorro.

## Criterios de cierre funcional

Una captura antigua debe pasar de 5 acciones independientes a líneas candidatas pertinentes (captura, estado, aprobación y trazabilidad) sin perder 5 acciones ni sus referencias. Un objetivo de captura asociado a recordatorios debe mostrar aviso en vez de presentarse como válido. Las decisiones y revisiones humanas se mantienen independientes. La salida no se presenta como completada ni publicada; para pilotaje real es obligatorio contrastar la calidad con evidencias del cliente y capacidad técnica verificada.
