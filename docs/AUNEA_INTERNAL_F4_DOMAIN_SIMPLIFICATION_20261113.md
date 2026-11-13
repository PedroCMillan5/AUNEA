# AUNEA Internal — F4 · Simplificación y propiedad de dominio

**Fecha:** 13/11/2026
**Rama:** `work/as-is-ux-simplification-20260930` (REVIEW, sin merge a main).
**Estado:** **CLOSED TÉCNICO**, limitado a la simplificación conservadora de F4. F6 acepta el producto y el UAT manual Windows/Edge.
**Línea base:** F3 CLOSED TÉCNICO; primer commit F4 `7cde19d829a90df898cc6c19444d751fedbf3e0f`, último commit funcional/test F4 `8601c95b9eb9d16d2db87f1a4d6ba4f66e84a4b2`.
**Gobierno:** PROJECT_RULES.md; Master Index; Simulator CANONICAL v1.14; Architecture Contract CANONICAL v1.7; DEC-050/052/055/056; Plan F0–F6.
**Clasificación:** refactorización de implementación (ownership compartido y regresiones). Sin decisión de negocio nueva ni promoción de contratos.

## 1. Cambios implementados y propietarios

| Responsabilidad | Único owner vigente | Consumidores | Preservación |
|---|---|---|---|
| Campos TO-BE con valor operativo real (no NO, N/A, ninguno, sin definir, pendiente, raya ni vacío) | `domain/tobe-model.js` → `tobeMeaningfulDesignValue` | Previsualización de actividad y gate REVIEWED | Mismo criterio y mensajes de bloqueo; sin nuevos campos ni voto IA |
| Vigencia del DiagnosticOutput | `domain/result-context.js` → `currentDiagnosticOutput` | `domain/output-review.js` / `reviewSources` | Snapshot, huella engine gates y aprobación humana siguen obligatorios |
| Acumulación de evidencias de candidatos | `domain/risk.js` → `mergeReviewCandidateEvidence` | `risk.js` y `process.js` | Unicidad ordenada de step_ids, review_questions, source_signals y candidate_ids; sin confirmar ni crear un riesgo o fricción |
| Preview/apply/undo de TO-BE | `domain/tobe-transactions.js` | PG11; tests transaccionales | Sin cambios en operaciones, control de versión, stale gates, undo o rutas |
| Reglas y resultados oficiales | Backend | Adapter y vistas | Ningún cálculo ni regla server-owned trasladado al navegador |
| Proyecciones de IA | Módulos `domain/internal-ai-*` existentes y backend | PG11 | No se mezclan con aceptación humana ni se extrae otro motor |

Se corrigieron harnesses que extraían funciones aisladas para respetar sus nuevas dependencias; las pruebas siguen verificando comportamiento y no una segunda implementación.

## 2. Evidencia de dominio y duplicación

- Inspección de **16 módulos** principales de dominio/servicios, en dos lotes: process, risk, tobe-model, tobe-transactions, output-review, result-context, economics, no-reask, analysis-workbench, process-lifecycle, completion, session-snapshot, internal-ai-pilot, internal-ai-global-quality, process-suggestions y engine-adapter.
- No quedaron duplicados exactos de ventanas consecutivas de cuatro líneas en cada lote de ocho módulos tras los cambios F4. Este análisis estático **no prueba** ausencia de toda duplicación semántica ni analiza exhaustivamente todos los cruces entre los 16 archivos.
- Se mantienen módulos grandes cuando comparten una responsabilidad coherente: no se fragmenta `process.js` ni `internal-ai-pilot.js` sólo por longitud.
- No se crean nuevos formularios, preguntas DF, reglas de pain/risk, economías, precios, escenarios, APIs ni campos de persistencia. No se tocan estilos o pantallas FROZEN.
- `module-manifest.json` mantiene la precedencia: `risk.js` antes de `process.js`, y `result-context.js` antes de `output-review.js`.

## 3. QA final acreditado

- **Full Acceptance Gate [43434734788](https://github.com/PedroCMillan5/AUNEA/actions/runs/43434734788)**, commit funcional + índice `8601c95b9`: **SUCCESS** en frontend, backend, Chromium `browser_uat` y publicación del estado. La rama contiene posteriormente sólo commits generados por auditoría `[skip ci]`.
- `tests/tobe-review-readiness.test.cjs`: placeholders, revisión y fuente vigente.
- `tests/output-review-v1.test.cjs`: resultado actual, snapshot antiguo y engine gates obsoletos.
- `tests/f4-candidate-evidence.test.cjs`: agregación idempotente, deduplicación, conservación de orden y no aplicación automática.
- `tests/pg11-transactions.test.cjs` y otros tests integrales existentes: contratos de preview/confirm/undo protegidos por el Acceptance Gate.
- Integridad de Block_ID acreditada en el gate después de incorporar `AUNEA-UAT-F4-CANDIDATE-EVIDENCE-115` al `CODE_BLOCK_INDEX.md`.

## 4. Límites y siguiente fase

**F4 CLOSED TÉCNICO** significa que las duplicaciones acreditadas dentro del alcance se consolidaron y que el código vigente superó el gate aplicable. **No implica PRODUCTION, ni aceptación manual Windows/Edge, ni prueba formal de ausencia de toda duplicación semántica.**

**F5**: comprobación de referencias activas, código realmente muerto, manifiesto y archivado justificado; no eliminar por conteos de líneas.
**F6**: aceptación final visual/funcional, Windows/Edge, journeys AS-IS → TO-BE → comparación → escenarios → revisión → entregables y persistencia.

No merge a `main`. No cambio de DECISIONES ni ROADMAP: reglas y dependencias de las fases permanecen iguales. Master Index, ESTADO, BITACORA y Plan F0–F6 deben reflejar el cierre técnico.
