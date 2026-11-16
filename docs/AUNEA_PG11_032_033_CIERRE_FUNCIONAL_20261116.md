# PG11 03.2 / 03.3 — Cierre funcional acotado de alternativas y diseño TO-BE

**Fecha:** 16/11/2026  
**Rama:** `work/as-is-ux-simplification-20260930`  
**Estado:** REVIEW — CIERRE TÉCNICO del flujo determinista 03.2→03.3, sin promoción a `main` ni `PRODUCTION`.  
**Fuentes rectoras:** `PROJECT_RULES.md`, `00_AUNEA_INTERNAL_MASTER_INDEX`, `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14 (PG11), `DECISIONES_AUNEA` DEC-050/052/055/056/075, `CODE_BLOCK_INDEX.md`, arquitectura UI/UX global [informe 16/11](AUNEA_INTERNAL_GLOBAL_UI_UX_ARCHITECTURE_20261116.md).

## 1. Alcance y decisión operativa

**03.2** presenta hallazgos del AS-IS confirmado, agrupación de alternativas por fricción/riesgo, fuentes IA global/por actividad separadas, previsualización de candidatos por reglas, descarte/recuperación y acceso al único editor 03.3.  
**03.3** conserva el único propietario de los campos del TO-BE. La confirmación de una previsualización actualiza la versión editada y deja la intervención en el historial reversible. No importa automáticamente datos IA; no reescribe el AS-IS; no crea un segundo grafo ni reglas de negocio.

El cierre no implica que cualquier fricción tenga una alternativa automática: cuando el motor no encuentra una intervención específica la página permite diseño manual y dice exactamente qué ha ocurrido.

## 2. Cambios implementados

| Propietario / contrato | Resultado |
| --- | --- |
| `domain/tobe-transactions.js` 03.2 | Diferencia «aún no generado», «sin candidato», error, backend incompatible y resultado obsoleto; antes de ejecutar no declara que el motor no encontró una alternativa |
| `domain/tobe-transactions.js` 03.2 | Compara `input_hash` de la respuesta de reglas con `currentDiagnosticOutput(e).input_snapshot_hash` **antes de mostrar candidatos clicables**; los datos históricos obsoletos no se presentan como propuestas vigentes |
| `domain/tobe-transactions.js` 03.2 | Conserva las fricciones/riesgos visibles en versiones REVIEWED/solo lectura; se ocultan acciones de generar, aplicar, descartar, recuperar y deshacer si la versión no es DRAFT |
| `domain/tobe-transactions.js` + `internal-work-events.js` | Acción «Configurar en 03.3» abre el único editor; después de confirmar una intervención desde 03.2 vuelve a abrir y enfocar 03.3. No se crean campos ni decisiones duplicados |
| `domain/tobe-transactions.js` 03.3 | Para cambios estructurales `flow.addedSteps`, la tabla de comparación no muestra sólo «1 actividad añadida», sino también los campos reales propuestos, especialmente nombre, motivo y control/riesgo **incluidas las modificaciones del consultor** |
| `tests/pg11-dom-journey.cjs` | Verifica fuente vigente vs obsoleta, el estado antes de ejecutar, navegación 03.2→03.3 y una versión de solo lectura, además de previsualizar, editar, cancelar, descartar, recuperar, confirmar, recargar, deshacer y preservar AS-IS |
| `tests/pg11-browser-journey.cjs` | Verifica navegación real a 03.3 desde la acción de 03.2, disclosure compartido y geometría renderizada, además de los controles previos |
| `.github/workflows/aunea-v1-gate.yml` | Se incorpora al gate principal la ejecución real de `node tests/pg11-dom-journey.cjs`. Antes el archivo existía pero el gate sólo ejecutaba el recorrido Chromium; ya no se confunden los dos niveles de prueba |

## 3. Matriz de aceptación ejecutada

| Caso | Precondición y pasos | Esperado | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| 03.2-01 | Borrador DRAFT, reglas sin ejecutar; abrir una actividad con hallazgos | «Pendiente de generar», nunca «No hay alternativa» prematuro | DOM invoice/logistics + Chromium | **CONFIRMADO** |
| 03.2-02 | Generar alternativas con backend real; recorrer hallazgos | Propuestas agrupadas por fuente confirmada; IA diferenciada de reglas | DOM invoice/logistics | **CONFIRMADO** |
| 03.2-03 | Inyectar hash de diagnóstico distinto sobre respuesta guardada; renderizar | No existe botón para previsualizar alternativas obsoletas; aviso explícito | DOM invoice/logistics | **CONFIRMADO** |
| 03.2-04 | Descartar y recuperar; comprobar histórico | No cambia el TO-BE; reversibilidad conservada | DOM invoice/logistics | **CONFIRMADO** |
| 03.2-05 | Abrir «Configurar en 03.3» tras haber cerrado 03.3 | El mismo panel nativo se reabre; no aparece otro formulario | Chromium + DOM | **CONFIRMADO** |
| 03.3-01 | Editar control de un paso añadido en la vista previa | Tabla antes/después incluye el texto editado; el borrador aún no cambia | DOM invoice/logistics | **CONFIRMADO** |
| 03.3-02 | Confirmar sin reconocer condiciones; después reconocer | Confirmación bloqueada hasta decisión humana expresa; no equivale a validar viabilidad | DOM invoice/logistics | **CONFIRMADO** |
| 03.3-03 | Confirmar operación, recargar, deshacer | Intervención persistida, proyectada en mapa, recuperable sin sobrescribir cambios posteriores | Chromium, DOM y backend real | **CONFIRMADO** |
| 03.3-04 | Seleccionar «Mantener AS-IS» sobre propuesta transformada | Elimina del TO-BE una automatización previa sólo tras justificarla y reconocer hallazgos | DOM invoice/logistics | **CONFIRMADO** |
| 03.2/03.3-05 | Cambiar estado del borrador a REVIEWED en caso sintético | Consultas y campos visibles; sin acciones de escritura del módulo 03.2 | DOM invoice/logistics | **CONFIRMADO** |
| CROSS-01 | Chromium, Edge, snapshots FROZEN de otras páginas | Sin regresión de navegación ni cambios visuales en FROZEN | Gates enlazados abajo | **CONFIRMADO** |
| IA-LIVE-01 | Ejecutar con Ollama local real, fallos 409/503/OOM y recuperación | Calidad y robustez del motor IA individual/global sobre **esta** versión | No se ejecutó inferencia Ollama en este lote | **PENDIENTE / NO ACREDITADO** |
| VISUAL-01 | Revisión manual del propietario en Windows con el estudio real | Aceptación de claridad, espaciados, legibilidad y acciones por actividad | Captura sintética QA disponible, no aceptación del propietario | **PENDIENTE** |

## 4. Evidencia reproducible

**Último commit funcional:** `ceb627038ecad8300f1f7a6b29440fe26e034b55`.  
**Gate de aceptación con DOM incorporado:** [GitHub Actions #43851418986](https://github.com/PedroCMillan5/AUNEA/actions/runs/43851418986) — **SUCCESS**: backend **493 PASS** (1 warning), frontend **960/960 PASS**, Chromium **PASS** y 18/18 referencias técnicas FROZEN sin diferencias. El nuevo paso DOM imprime `PG11_DOM_INVOICE_PASS` y `PG11_DOM_LOGISTICS_PASS` tras ejecutar el ciclo completo.  
**Windows / Edge:** [GitHub Actions #43851418925](https://github.com/PedroCMillan5/AUNEA/actions/runs/43851418925) — **SUCCESS**, dos procesos sintéticos.  
**Frontend:** [GitHub Actions #43851418904](https://github.com/PedroCMillan5/AUNEA/actions/runs/43851418904) — **SUCCESS**.  
**Capturas:** artefacto `aunea-single-uat-chromium-evidence` en el gate; imágenes `pg11-aunea-consultant-desktop.png`, `pg11-section03-reviewed-fields-desktop.png`. La imagen usa un estudio sintético y **no** constituye validación manual del caso real.

**Reproducción local:** instalar el frontend (`npm ci`), iniciar backend v1 de la rama en `127.0.0.1:8017`, ejecutar `node tests/pg11-dom-journey.cjs` y `node tests/pg11-browser-journey.cjs` en `3_SYSTEM/frontend`. La prueba DOM usa jsdom y el backend real para alternativas; no llama a Ollama. Los tests `npm test` y `pytest` forman parte del gate.

## 5. Criterio de cierre y límites

**CIERRE TÉCNICO del comportamiento DRAFT, lectura, generación por reglas, previsualización, edición, confirmación, persistencia y reversión de 03.2–03.3: ACREDITADO.**

**NO ACREDITADO:** aceptación visual final del propietario, inferencia Ollama real en el último commit, completitud funcional global de PG11/PG12–PG15 o E2E total del producto. Mantener la rama en REVIEW y no declarar toda AUNEA Internal lista para producción por aprobar este lote. El trabajo realizado no cambia cuestionario, precios, engine de negocio ni nuevas reglas canónicas. DECISIONES y ROADMAP sólo se sincronizan si una decisión o fase de producto real cambia.

## 6. Reapertura por fallo real del botón «Confirmar intervención» · 16/11/2026

**Incidencia reportada:** el usuario ve la previsualización pero pulsa «Confirmar intervención» y no observa ningún efecto. La inspección del código demostró que el botón se renderizaba con el atributo HTML `disabled` mientras había condiciones o bloqueos pendientes, y que la causa se mostraba solamente en un bloque alejado del botón dentro de un diálogo largo. Un botón HTML disabled no emite el clic: no podía explicar nada al usuario.

**Corrección aplicada sin relajar DEC-075:**
- `domain/tobe-transactions.js` registra un único helper `tobeAlternativeConfirmFeedback` (Block_ID `AUNEA-FE-PG11-CONFIRM-FEEDBACK-461`), convierte el CTA en control siempre pulsable, añade estado visible contiguo con `role="status"` y `aria-describedby` y un `data-tobe-confirm-ready` únicamente presentacional (no decide autorizaciones).
- `pages/internal-work-events.js` intercepta el clic, valida `tobeAlternativeDecisionIssue` antes de guardar y explica el bloqueo. Desplaza/focaliza el checkbox de condiciones, el de hallazgos KEEP, el campo de justificación o el destino de ruta pendiente. El mismo contrato se vuelve a validar en `tobeCommitAlternative`; nada se guarda hasta tener la confirmación válida.
- Si falla una edición de previsualización, su error deja la intervención no confirmable hasta resolverlo; si falla el guardado o cambió el borrador, la causa queda visible en el propio diálogo, no solo en un toast transitorio.
- `ui-system.css` (Block_ID `AUNEA-FE-PG11-CONFIRM-FEEDBACK-462`) aplica exclusivamente el tratamiento visual del feedback contextual del diálogo. Los dos Block_ID están registrados en el índice.
- Pruebas DOM, Playwright Chromium y Edge: pulsar sin reconocer condiciones **debe responder y no modificar el TO-BE**, marcar las condiciones **debe permitir confirmar**, confirmar **debe persistir**, recargar y deshacer deben funcionar. También se verifica la variante con justificación y reconocimiento del AS-IS mantenido.

**QA de cierre de este defecto:** [Acceptance Gate 43866288499](https://github.com/PedroCMillan5/AUNEA/actions/runs/43866288499) **SUCCESS**, 960/960 frontend, 493 backend, Chromium PG11 invoice/logistics + DOM invoice/logistics PASS, 18/18 FROZEN intactas. [Windows Edge 43866288350](https://github.com/PedroCMillan5/AUNEA/actions/runs/43866288350) **SUCCESS**; [Frontend Tests 43866288410](https://github.com/PedroCMillan5/AUNEA/actions/runs/43866288410) **SUCCESS**. Commit funcional `0d67fa52bb4fef7d57fa57ae42bd85ef23eb4ead`.

**Límite:** incidencia de confirmación explicable y comprobada en casos sintéticos. No confirma aceptación visual manual del cliente ni inferencia Ollama real ni E2E total del producto. Rama REVIEW; no main/PRODUCTION.

## 7. Segundo fallo reportado: «El borrador o el AS-IS cambió» al confirmar · 16/11/2026

**Síntoma comunicado por el propietario:** tras intentar confirmar en la vista previa de 03.2, se muestra «Antes de confirmar: El borrador o el AS-IS cambió. Genera de nuevo la vista previa». **No se puede acreditar la diferencia exacta del estudio local sin leer sus datos**, pero el código anterior sí contenía una causa de falsos positivos: `tobeCommitAlternative()` exigía igualdad de dos cadenas `JSON.stringify(tobeDesignState(...))` completas, que depende del orden de inserción de propiedades y no distingue cambios relevantes de otros ajenos a la intervención.

**Corrección en la rama de trabajo:**
- La transacción conserva un **guard puro** que exige coincidencia del estudio y la versión DRAFT, y del snapshot AS-IS; también verifica el hash del diagnóstico cuando la vista previa lo conserva. Nunca rebasea ni escribe automáticamente.
- `tobeSameDesignState()` compara semánticamente objetos con claves ordenadas, sin ignorar valores ni cambiar el orden de arrays.
- El evento visible «Confirmar intervención» evalúa la diferencia entre `preview.before` y el borrador vivo con `tobeTransactionChanges()`. Si es idéntica semánticamente, confirma normalmente.
- Si existen ediciones nuevas **en campos que la propuesta no toca**, `tobeAlternativePreviewRevision()` calcula de nuevo la proyección desde el último borrador, actualiza el mismo diálogo (tabla antes/después, comprobaciones y mapa), **no guarda nada en ese primer clic** y pide revisar y confirmar de nuevo. Esto conserva tanto los campos editados fuera del diálogo como el texto temporal que el consultor haya editado dentro de la vista previa.
- Si existe conflicto **en el mismo campo o conexión**, otra versión, AS-IS diferente o cambio de hash del diagnóstico, la intervención **se bloquea con un motivo específico**. No se sobrescribe el trabajo del usuario.
- `tobePaintAlternativePreview()` es el único responsable de redibujar la proyección tanto al editar campos como al actualizar una comparación obsoleta; no se crea un segundo editor ni una segunda base de datos.
- Nuevos Block_ID `AUNEA-FE-PG11-PREVIEW-REVISION-463` y `AUNEA-FE-PG11-PREVIEW-REPAINT-464`, registrados en `CODE_BLOCK_INDEX.md`.

**QA y cobertura:** [Acceptance Gate #43872557854](https://github.com/PedroCMillan5/AUNEA/actions/runs/43872557854) **SUCCESS** con 960/960 frontend, 493 backend, Chromium PG11 invoice/logistics y DOM invoice/logistics, y FROZEN 18/18 intactas. [Windows/Edge #43872558314](https://github.com/PedroCMillan5/AUNEA/actions/runs/43872558314) **SUCCESS**. [Frontend Tests #43872557855](https://github.com/PedroCMillan5/AUNEA/actions/runs/43872557855) **SUCCESS**. Commit funcional `1202d53d85e1291bccac4663507f65e2c6127607`. La batería incluye un borrador que cambia un campo independiente mientras el modal está abierto: el primer clic actualiza sin escribir, el segundo confirma, la intervención persiste, se recarga y se deshace. La prueba aislada de transacciones también rechaza una modificación directa de campos durante un preview anterior.

**Estado:** corrección técnica **QA PASS / REVIEW**. **No acreditado:** repetición manual con el estado exacto almacenado en el navegador del propietario; no declarar que un cambio real de AS-IS debe aplicarse automáticamente. No merge a `main`, no PRODUCTION ni cierre del E2E total.

## 8. AS-IS fijado frente al vigente: segundo bloqueo de confirmación (16/11/2026)

**Incidencia real comunicada por el propietario:** tras el hotfix de concurrencia PG11 03.2, el modal muestra `Antes de confirmar: Cambió la versión confirmada del AS-IS. Revisa el diagnóstico antes de volver a previsualizar.`. No se ha leído el `localStorage` privado del estudio del usuario; por ello **no se afirma que el contenido de su AS-IS sea igual o diferente**.

**Causa estructural acreditada en código:** `tobeProposalSnapshot(e,p)` resolvía el snapshot pinneado del borrador por `sourceSnapshotVersion`, pero si no lo encontraba retornaba silenciosamente el AS-IS último confirmado. En cambio, `tobeAlternativePreviewRevision()`, `tobeCommitAlternative()`, `tobeReviewReadiness()` y `advanceTobeStatus()` aplicaban por separado igualdades estrictas sobre la versión del último snapshot. El mismo TO-BE podía verse con una fuente y bloquearse con otra al confirmar, incluso ante una segunda confirmación materialmente idéntica o diferencias número/cadena. No era un problema de CSS ni del tamaño de los archivos.

**Corrección del contrato de datos:** 
- `pages/tobe-flow.js`, propietario `AUNEA-FE-PG11-ASIS-VERSION-465`, resuelve siempre el AS-IS exacto que originó el TO-BE; la compatibilidad número/cadena es semántica. **No permite caer en una fuente más reciente distinta si falta la versión pinneada.**
- `tobeAsisCompatibility(e,p)` compara el snapshot origen y la última confirmación. Solo excluye del contraste material tres metadatos de cierre de primer nivel (`version`, `sealedAt`, `asIsConfirmedAt`); mantiene las respuestas, proceso, riesgos, fricciones, evidencia, contactos, esquema y demás datos, con claves ordenadas. Una segunda confirmación con idénticos datos es equivalente; un AS-IS realmente distinto sigue bloqueado.
- `domain/tobe-transactions.js` valida el mismo contrato al **abrir** la previsualización, antes de intentar confirmar y antes de persistir. Si hay conflicto real indica **vOrigen/vActual** y no aplica ni modifica el AS-IS.
- `domain/tobe-model.js` consume ese mismo propietario al evaluar requisitos y avanzar a revisión, evitando un guard paralelo contradictorio.
- No se añaden preguntas, campos, entidades, tasas, supuestos ni reglas comerciales.

**Pruebas añadidas:** `tests/pg11-transactions.test.cjs` verifica fuente v1 numérica con referencia almacenada `'1'`; re-sello de PG09 v2 con idéntico contenido que **sí permite ejecutar `tobeCommitAlternative` y persistir decisión humana**; y re-sello v2 con cambio material de un paso que se rechaza. Se integraron oráculos aislados de revisión con el propietario real `ASIS-VERSION-465` y se protegió la compatibilidad de los oráculos históricos con fuente confirmada de la misma versión. Se añadió Block_ID 465 al índice activo. Sin alteración de snapshots confirmados en runtime.

**Evidencia:** código funcional `7b8db8c3e7fccb93700698dc6679825966dc4a33`. [Acceptance Gate 43892410564](https://github.com/PedroCMillan5/AUNEA/actions/runs/43892410564) **SUCCESS**: 960/960 frontend, 493 backend, Chromium invoice/logistics, ciclo DOM completo y referencias FROZEN 18/18. [Edge Windows 43892410486](https://github.com/PedroCMillan5/AUNEA/actions/runs/43892410486) **SUCCESS**. [Frontend Tests 43892410408](https://github.com/PedroCMillan5/AUNEA/actions/runs/43892410408) **SUCCESS**.

**Cierre:** corrección de contrato compartido y regeneración de vista previa **QA TÉCNICO PASS / REVIEW**. No se garantiza que el estudio local del propietario tenga dos snapshots equivalentes; si el contenido del origen cambió realmente, no es válido aplicar automáticamente propuestas del AS-IS previo: el nuevo mensaje debe explicitar ambas versiones, no forzar aceptación. Queda UAT del estudio local real y aceptación humana. No merge `main`, ni `PRODUCTION`; Ollama real no ejecutado en este lote.
