# PG11 — Bloque 3: consolidación global, trazabilidad y revisión por actividad

Fecha: 06/11/2026 · Estado: **REVIEW** · Rama: `work/as-is-ux-simplification-20260930`
Fuente de alcance: `docs/PG11_BLOCK1_CONTINUATION_20261106.md`, puntos **11–13**.
Fuentes gobernantes consultadas: Master Index v1.59, `PROJECT_RULES.md` v1.7, DEC-034/050/052/055 y `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14. Esta nota documenta la implementación, **no sustituye el CANONICAL**.

## Bloque 3 — entregables

**11. Consolidación global:** la sección 02 muestra una línea derivada de síntesis con intervenciones consolidadas, incompatibilidades detectadas, alternativas propuestas, intervenciones pendientes de verificar y variantes relacionadas. Las tarjetas, avisos por texto incompleto, progreso por fuentes y botón existente se conservan. Las incompatibilidades son comprobaciones automáticas, no decisiones finales del consultor.

**12. Trazabilidad:** cada intervención conserva `source_refs` del AS-IS y `related[]` con acciones y justificaciones equivalentes. La alternativa incluye `objective`, `how`, `why`, `constraints`, `source_refs` y `review` en el mismo owner `aiGlobal` del TO-BE. La UI presenta referencias de la propuesta principal, variantes y alternativas y enumera verificaciones y restricciones cuando existan. Sólo se vinculan fricciones y riesgos a un paso mediante relaciones confirmadas del snapshot; no se deducen por proximidad visual ni por una secuencia de pantalla.

**13. Conexión global → actividad:** cada tarjeta puede listar las actividades vinculadas en el AS-IS confirmado. Los controles existentes `data-tobe-select` abren el inspector de la actividad y lo llevan a primer plano. En el bloque de análisis individual aparece un desplegable compacto con recomendaciones globales relacionadas: objetivo, intervención, revisión de viabilidad, alternativa y referencias. Es **solo lectura**: no sustituye el análisis específico, ni escribe campos, rutas, revisión humana o aprobación.

## Owner y consistencia

- `3_SYSTEM/frontend/pages/results.js` / `AUNEA-FE-PG11-GLOBAL-OVERVIEW-284`: `tobeGlobalStored()` controla Engagement, versión, hash de diagnóstico y AS-IS. `tobeGlobalSourceIdsForStep()` y `tobeGlobalLinksForStep()` vinculan únicamente fuentes confirmadas. `tobeGlobalLinkedStepHtml()` compone la vista de contexto dentro del inspector y la sección global añade enlaces a los pasos.
- `3_SYSTEM/frontend/domain/internal-ai-pilot.js` / `AUNEA-FE-PG11-GLOBAL-AI-285`: conserva la trazabilidad de alternativas y de variantes de una intervención con distintas justificaciones; `internalAiGlobalRefresh()` actualiza únicamente la zona read-only asociada al paso sin reconstruir el formulario editable.
- `3_SYSTEM/frontend/tests/pg11-global-overview.test.cjs` / `AUNEA-UAT-PG11-GLOBAL-OVERVIEW-288`: regresiones de resumen de propuestas, enlaces por fricciones y riesgos, aislamiento de actividades, versiones obsoletas y prohibición de aplicar directamente.
- `CODE_BLOCK_INDEX.md`: actualiza descripciones de responsabilidades existentes. No se crean owners alternativos.

## Gates y limitaciones

Se exige validación frontend, backend y Chromium en GitHub Actions sobre el HEAD final. Los ensayos de integración usan datos sintéticos y proveedores HTTP simulados; **no prueban calidad semántica de Ollama real en Windows**. Se mantiene el gate humano de DEC-052/055. El bloque 2 sigue siendo parcialmente implementado y no se declara cerrado por esta integración; las comprobaciones detalladas sólo se muestran si constan en la salida guardada.

No se modifica AS-IS, PG10, PG12–PG15, reglas de negocio, campos DF, pricing, productos, KPIs, fuentes CANONICAL ni interfaz aprobada. El bloque 4 (estados, compactación y persistencia) y bloque 5 (QA final y Ollama real) permanecen pendientes.
