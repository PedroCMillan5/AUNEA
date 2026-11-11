# PG11 — Auditoría, estado y plan de cierre paso a paso

**Fecha de registro:** 2026-11-04  
**Estado:** REVIEW / referencia de trabajo, **no** validación ni norma canónica.  
**Ámbito:** AUNEA Internal, Trabajo interno, PG11 «Diseño TO-BE».  
**Origen:** revisión de la pantalla de Levante Instalaciones Técnicas (4 actividades), respuesta de auditoría acordada en conversación.  
**Rama de trabajo:** `work/as-is-ux-simplification-20260930`.  
**Fuentes rectoras:** `00_AUNEA_INTERNAL_MASTER_INDEX`; `PROJECT_RULES.md` v1.7; `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14, PG11/PG12; `DECISIONES_AUNEA` DEC-050, DEC-052, DEC-055 y DEC-056. Esta nota **no modifica** las fuentes canónicas ni decide datos de cliente.

## Dictamen de la auditoría que se conservará como línea base

**Las cuatro propuestas IA se han recuperado y son visibles, pero PG11 no está terminada y no puede enviarse todavía a PG12.** La recuperación de la generación no constituye validación semántica ni diseño futuro aprobado.

| Elemento | Estado observado al 04-11-2026 | Razón |
|---|---|---|
| Recuperación de cuatro actividades IA | Verificada visualmente | Se ven P1–P4 con intervención, resultado y justificación. |
| Guardado de propuestas verificadas | Comprobado en la recuperación del estudio; requiere seguir preservándolo | Persistencia de checkpoints de IA, aún no equivalen a revisión. |
| Revisión global IA | Pendiente | Timeout HTTP 503; reintento del revisor sin repetir los cuatro pasos. |
| Calidad de las recomendaciones | Parcial; necesita corrección | Contradicciones, condiciones y cifras no validadas. |
| Mapa TO-BE | Incompleto | Cuatro pasos etiquetados «Se mantiene», aunque se proponen cambios. |
| Inspector de actividad | Incompleto | Persisten campos «NO», valores heredados, y no visualiza el checkpoint IA de la actividad seleccionada. |
| Aplicación de recomendaciones | Incompleta | «Aplicar a campos vacíos» no reemplaza los valores heredados y no implementa aceptación/modificación/descarte gobernados por actividad. |
| Cierre para PG12 | No apto | Diseño futuro sin revisión y sin trazabilidad estructurada suficiente. |

## Análisis de las cuatro actividades — sugerencias, NO decisiones aprobadas

| Paso | Sugerencia IA visible | Evaluación del auditor | Transformación a estudiar, sin guardar automáticamente |
|---|---|---|---|
| P1 — Recibir factura | Registro automático de recepción/etiquetado de correo | Posible trazabilidad; falta precisar herramienta, estados y registro | «Se automatiza» o «Se incorpora control» |
| P2 — Determinar si procede aprobación | Indicador visible del estado de aprobación | Puede mejorar la visibilidad; no implica reducir la espera | «Se incorpora control» |
| P3 — Aprobar factura | Reglas y excepciones para casos sin aprobación | Requiere confirmar política y propietario de la decisión | «Se modifica» / «Requiere decisión humana» |
| P4 — Registrar en ERP | Entrada automática con control de integridad | Potencial reducción de reintroducción manual, sujeta a viabilidad | «Se automatiza», sólo si se verifica |

**Contradicción clave:** «Se mantiene» no puede interpretarse como diseño confirmado mientras la sugerencia contiene implantar medidas, cambiar reglas, añadir controles o automatizar. La revisión humana debe resolver cada caso.

**Datos por verificar:** umbral de aprobación de 1.500 €, estimación del 8 % de esperas de dos días, 30 % de seguimientos adicionales y minutos de reintroducción manual. No convertir hipótesis en hechos, capacidades del ERP o beneficios medidos. Tiempo de espera ≠ tiempo de trabajo; capacidad liberada ≠ ahorro de caja.

## Pendientes de cierre — orden de trabajo acordado

### A · Recomendar IA dentro de la ficha de la actividad (primer paso)

**Incidencia:** `aiDraft.checkpoint` contiene cuatro `PilotAIItem` verificados, pero `tobeAiAdviceHtml` busca solamente propuestas completas o históricas y muestra «Todavía no hay una sugerencia de IA».

**Criterios de aceptación:**
- Seleccionar P1 muestra su propia sugerencia, intervención, resultado y fuente, con etiqueta «Pendiente de revisión global»; P2–P4 muestran la suya y nunca la de otra actividad.
- Si la sugerencia viene del checkpoint, no se puede aplicar ni aprobar como revisión superada.
- Refrescar/recuperar estudio mantiene la misma correspondencia por `source_step_id`; sin alterar el owner ni el origen AS-IS.
- Conservar texto y checkpoint actual; ninguna regeneración de Ollama en este paso.

### B · Revisor global y tratamiento de bloqueos

- Reintentar sólo `/v1/internal-ai/tobe-review` sin repetir cuatro inferencias de actividad, siempre que el provider esté disponible.
- Detectar contradicciones «Se mantiene»/intervención, fuentes, cifras, roles, riesgos, viabilidad, dependencias y ruta explícita.
- Tras HTTP 503, conservar las cuatro propuestas verificadas, enseñar su estado y reintentar.
- No simular ni inferir aprobación de una respuesta incompleta; revisión humana documentada si no se completa la validación automática.

### C · Revisión y aceptación individual por el consultor

- Consultar propuesta IA junto a situación AS-IS y diseño futuro.
- Aceptar, modificar o descartar cada sugerencia de manera deliberada y trazable, respetando contratos y dueños de datos existentes.
- Evitar que valores prellenados («Se mantiene», «NO», entradas/salidas heredadas) hagan que el consultor crea que la transformación ya está resuelta.
- Proteger ediciones humanas y guardar la decisión; la IA no sobrescribe automáticamente un valor confirmado.

### D · Completar el diseño TO-BE y su representación

- Definir cambio, problema resuelto, responsable futuro, herramientas, datos de entrada/salida, automatización/IA, supervisión humana, control/riesgo y supuestos de tiempo con evidencia.
- Mapa y diseño deben ser coherentes: las rutas visibles heredadas del AS-IS no constituyen topología futura editable.
- No inventar pasos, conexiones ni capacidades de herramientas. Determinar primero el contrato aplicable si hace falta modificar topología futura.

### E · Gate de revisión y transferencia a PG12

- Comprobar vigencia AS-IS/diagnóstico/TO-BE, cobertura y coherencia semántica, fuentes, estados y bloqueos resueltos.
- La comprobación actual `tobeReviewReadiness` es estructural y **no** prueba calidad de recomendaciones; debe quedar reforzada antes de declarar REVIEWED.
- Guardar y recuperar exactamente la versión revisada; PG12 consume esa versión sin reinterpretar beneficios ni duplicar owners.
- La publicación/entregable para cliente sigue gobernada por estados posteriores; REVIEWED no equivale a APPROVED_FOR_CLIENT.

## Criterios finales de aceptación (pendientes salvo evidencia específica)

- [x] Cuatro propuestas recuperadas y visibles tras reabrir el estudio (evidencia de la captura del usuario).
- [ ] Revisión global superada o alternativa de revisión humana formal, con pendientes resueltos.
- [ ] Recomendación IA de cada actividad vinculada a su inspector y hallazgos.
- [ ] Aceptación, edición y descarte individual con trazabilidad y guardado.
- [ ] Transformaciones coherentes con intervenciones aceptadas.
- [ ] Responsables, herramientas, datos, controles y supervisión definidos o justificadamente pendientes.
- [ ] Mapa coherente con decisiones y rutas realmente confirmadas.
- [ ] Cifras/beneficios respaldados por evidencia o marcados como hipótesis.
- [ ] Gate REVIEWED impide diseños incoherentes o incompletos.
- [ ] PG12 recibe el TO-BE revisado sin pérdida ni doble interpretación.

## Protocolo de trabajo incremental

1. Trabajar **un punto A–E cada vez**. Confirmar fallo concreto con datos y fuente de verdad antes de modificar código.
2. Para cada punto: diagnóstico → contrato/owner → cambio mínimo → tests → captura/UAT del operador → aceptación o corrección.
3. No regenerar las cuatro propuestas ni editar el AS-IS sellado para arreglar un fallo visual.
4. Guardar y verificar persistencia antes de recargar, especialmente si el proveedor IA falla.
5. No pasar a otro punto ni declarar PG11 cerrada hasta que la prueba del punto actual sea positiva; registrar defectos residuales.
6. Si una corrección altera el contrato de negocio, seguir gobierno y actualizar activos canónicos según corresponda. Esta nota REVIEW se actualiza como bitácora de la revisión, no sustituye decisiones.

**Punto activo:** B · revisión global IA y tratamiento de bloqueos. **Punto A:** cerrado funcionalmente tras UAT visual de P1–P4 el 04/11/2026; siguen pendientes los demás bloques de PG11.


## Avance del punto A — 2026-11-04 (implementado; UAT visual local pendiente)

**Cambio mínimo:** `tobeAiAdviceHtml` consulta `internalAiPendingSteps(e,key)` del piloto IA, que valida el checkpoint vigente según origen AS-IS, versión TO-BE DRAFT, huella de diagnóstico y cobertura de IDs. Sólo si no existe propuesta completa del mismo estudio se representa la sugerencia individual `source_step_id` correspondiente al nodo seleccionado, con la etiqueta visible **«Propuesta IA verificada por actividad · Pendiente de revisión global»** y contenido sólo lectura: problema, intervención, resultado, justificación, fuentes y condiciones.

**No cambia:** AS-IS confirmado, campos del consultor, TO-BE versionado, engine, servidor/backend, revisor, botón «Aplicar a campos vacíos» (sigue bloqueado para un checkpoint), ni genera nuevas llamadas a Ollama. Una sugerencia de otra actividad no aparece en el inspector actual. La vista nunca representa una propuesta parcial como revisada/aprobada. Las propuestas históricas siguen en sólo lectura.

**Cambios de código:** `AUNEA-FE-PG11-INSPECTOR-CHECKPOINT-214` en `3_SYSTEM/frontend/pages/results.js`; `AUNEA-UAT-PG11-INSPECTOR-CHECKPOINT-215` en `3_SYSTEM/frontend/tests/uat-browser-smoke.cjs`. Registrados en `CODE_BLOCK_INDEX.md`.

**QA automatizado exitoso:** `AUNEA Internal V2 REVIEW Acceptance Gate` [41855315325](https://github.com/PedroCMillan5/AUNEA/actions/runs/41855315325), SHA `ff64de4f55601e7a8c3dff38cf97fee2ba0b4ca9`; 401 tests backend, 752 frontend, Chromium real PASS. Chromium recorre las actividades sintéticas, comprueba correspondencia exclusiva por step ID, estado pendiente, ausencia de mutación de los campos TO-BE, persistencia, recarga y recuperación. Sin Ollama real ni inferencia nueva.

**Aceptación pendiente del operador:** actualizar rama sin perder cambios locales, recargar el estudio Levante, seleccionar P1, P2, P3 y P4, verificar que cada inspector presenta su propia recomendación, estado provisional y fuentes, sin alterar los campos de diseño ni volver a generar. Hasta esa comprobación, el punto A permanece **QA automático PASS / UAT visual pendiente**, no cerrado comercialmente. No se avanza a B sin la comprobación del usuario.


## Cierre del punto A — UAT visual del operador (2026-11-04)

**Resultado: ACEPTADO para su alcance limitado (vinculación visual IA → inspector).** Se revisaron cuatro capturas del estudio Levante Instalaciones Técnicas: P1 en la conversación anterior y P2, P3, P4 en el turno de comprobación posterior, tras ejecutar la versión corregida.

- **P1 · Recibir factura:** en inspector aparece la sugerencia de registro automático del estado de recepción/etiquetado, junto al problema de visibilidad y resultado esperado.
- **P2 · Determinar si procede aprobación:** aparece la propuesta de indicador visible de estado de aprobación, ligada al problema de espera/seguimiento.
- **P3 · Aprobar factura:** aparece la propuesta de revisar excepciones/criterios de aprobación, ligada a la espera en aprobación.
- **P4 · Registrar en ERP y archivar expediente:** aparece la propuesta de integración/entrada automatizada, ligada a reintroducción manual.
- En las cuatro, la etiqueta visible indica «Propuesta IA verificada por actividad · Pendiente de revisión global», y el inspector conserva los datos DRAFT anteriores; las sugerencias no se aplican ni aprueban. La navegación resalta el nodo seleccionado. Las fuentes detalladas siguen bajo «Justificación, fuentes y aspectos por revisar», plegado en las capturas; su suficiencia semántica se analizará en B.
- QA automatizado ya registrado: 401 backend PASS, 752 frontend PASS y Chromium PASS; lectura/switch/reload comprobados con datos sintéticos.

**Alcance del cierre:** sólo se cierra el defecto de correspondencia entre checkpoint por actividad e inspector. **No se declara PG11 terminada**. La revisión global IA sigue pendiente; las cuatro transformaciones «Se mantiene» contradicen cambios propuestos; los campos «NO» no describen todavía un diseño futuro válido. Pueden existir cifras no respaldadas (umbral de 1.500 €, porcentajes y tiempos) y se mantienen como elementos por revisar, no como decisiones aprobadas.

**Siguiente punto a comprobar (B):** reintento **exclusivo** de revisión global `/v1/internal-ai/tobe-review`, conservación del checkpoint P1–P4 y recepción de informe de coherencia/bloqueos, sin lanzar cuatro nuevas generaciones ni aceptar intervenciones. Si devuelve 503, conservar íntegro el borrador y diagnosticar el revisor; no pasar a C hasta resolver el tratamiento de bloqueos y la revisión humana.


## Punto B — Corrección del botón «Reintentar sólo la revisión global» (2026-11-04)

**Incidencia visual del operador:** al hacer clic en «Reintentar sólo la revisión global» la pantalla aparentemente no reaccionaba. En el código anterior el botón reutilizaba `generateTobeAiPilot(currentEng())`, que es una operación general, no un revisor aislado. La protección contra operaciones IA simultáneas devolvía en silencio sin mostrar un estado; la UI no tenía trazabilidad propia del clic de reintento.

**Corrección acotada:**
- `retryTobeAiReviewOnly()` constituye una acción específica: confirma identidad del estudio, vigencia de TO-BE/snapshot/diagnóstico, cobertura N/N de propuestas verificadas y guardado local del checkpoint.
- Desde el clic presenta inmediatamente «Comprobando disponibilidad del revisor global…», inhabilita temporalmente el botón para evitar doble ejecución y muestra explicación si hay una operación IA activa.
- Si el proveedor está disponible y el protocolo coincide, llama una vez al endpoint de revisión `/v1/internal-ai/tobe-review` usando las N actividades **ya guardadas**. La ruta de reintento no invoca `/v1/internal-ai/tobe-step`.
- El revisor utiliza el mismo procedimiento de validación y persistencia que la consolidación ordinaria (`internalAiConsolidateVerified`), no una segunda copia de reglas.
- Si el backend devuelve 503 o el servicio Ollama no está disponible, aparece el error en el panel IA, las N actividades siguen guardadas, el botón vuelve a estar disponible y la edición manual del TO-BE permanece intacta.
- Ningún resultado automático cambia el TO-BE a REVIEWED ni aplica las sugerencias.

**Trazabilidad del cambio:** `AUNEA-FE-PG11-REVIEW-ONLY-216` en `domain/internal-ai-pilot.js`; regresión sintética `AUNEA-UAT-PG11-REVIEW-ONLY-217`; Chromium `AUNEA-UAT-PG11-REVIEW-ONLY-BROWSER-218`. Índice de Block_ID actualizado, sin alterar fuentes canónicas.

**QA automatizado:** [AUNEA Internal V2 REVIEW Acceptance Gate 41857816696](https://github.com/PedroCMillan5/AUNEA/actions/runs/41857816696) **SUCCESS**, 401 backend PASS, 754 frontend PASS, Chromium nativo PASS; evidencia explícita `PG11_REVIEW_ONLY_CLICK_PASS: {"status":1,"review":1,"steps":0}`. El test sintético también verifica 503 sin pérdida de cuatro propuestas.

**Pendiente:** confirmar el clic en el navegador Windows del operador, verificar que se muestra progreso o error y, si responde el modelo real, examinar las observaciones del revisor. El punto B continúa en **REVIEW**; no pasar a C ni tratar los 1.500 € / 8 % u otras hipótesis como datos confirmados.

## Punto B — Comprobación básica sin Ollama (2026-11-04)

**Diagnóstico real:** el revisor agotó su tiempo (HTTP 503). Las cuatro actividades siguen guardadas; no existe revisión aprobada. La comprobación básica nueva utiliza reglas, no una segunda inferencia de Ollama.

**Implementación REVIEW:** motor `internal_ai_review_basic.py` (220), endpoint local `tobe-review-basic` (221), test backend (222), y frontal con botón «Comprobar coherencia básica (sin Ollama)». El chequeo valida el origen y muestra conflictos explícitos, información pendiente y cifras por verificar. El resultado indica `review_mode=RULES_ONLY`, siempre requiere revisión humana y permanece DRAFT. Se conserva el checkpoint P1–P4 sin regeneración. Se usa también después de generar propuestas nuevas.

**Aceptación pendiente:** QA automatizado y verificación en el navegador del operador; no se considera análisis semántico IA terminado ni PG11 listo para PG12. El motor LLM largo permanece aislado, no se emplea en este botón.


## UAT visual de comprobación básica y ajuste del estado final (2026-11-04)

La captura del operador confirma que el botón sin Ollama devuelve revisión por reglas guardada con **4 propuestas, 3 actividades bloqueadas y 16 observaciones**. No supone aceptación de la calidad del TO-BE. Se mantiene `RULES_ONLY` y la necesidad de decisiones humanas. Se observa una etiqueta errónea `Generación en curso…` después de recibir revisión terminada: el render del panel ocurría antes de retirar la clave `__auneaAiWorking`.

Corrección: `internalAiPilotRefreshPanel` se ejecuta al finalizar, después de retirar la clave activa, tanto en el reintento como tras generación de propuestas. Se conserva `Engagement.tobeProposals` y ningún campo se autoaprueba. Para `RULES_ONLY`, rótulos específicos `Comprobación con bloqueos`, `Comprobación por reglas completada` y `Resultado de la comprobación`; cada actividad muestra desglose de bloqueos versus asuntos pendientes sin ocultar el detalle. Regresión Chromium añadida para impedir que el panel muestre un estado de generación tras recibir el resultado.

La clasificación de tres bloqueos es el resultado conservador del detector de nuevas medidas: una actividad que propone clarificar criterios puede aparecer como pendiente y no bloqueada si la regla no puede demostrar un cambio. No convertir automáticamente ese pendiente en bloqueo sin validación semántica. Las cifras y la viabilidad continúan como hipótesis por revisar.

**QA:** validación estática de sintaxis y marcadores de bloque superada; GitHub Actions en cola a la hora del registro. Queda pendiente la comprobación visual tras actualizar el frontend. El punto B está operativo pero no se declara cerrado hasta revisar las observaciones y confirmar la nueva pantalla.

## Punto C — revisión humana implementada (2026-11-04)

Se han añadido elecciones por actividad (Aceptar, Modificar y Descartar), una justificación y persistencia en el owner versionado TO-BE. El registro de decisión queda vinculado a estudio, fuente AS-IS, diagnóstico, versión y contenido de las propuestas. No copia automáticamente los valores IA a los campos humanos.

El gate REVIEWED exige, cuando existe una propuesta IA, decisiones y fundamentos por cada actividad, transformaciones válidas, datos operativos y controles. No acepta un marcador heredado «NO» como diseño completo y bloquea eliminar nodos sin futura topología confirmada. La revisión por reglas no habilita aplicación automática. C implementado y pendiente de UAT del operador.

**QA confirmado:** [GitHub Run 41869093011](https://github.com/PedroCMillan5/AUNEA/actions/runs/41869093011): 405 backend PASS, 758 frontend PASS, Chromium PASS, incluido clic de decisión con persistencia sin sobrescribir campos.

Estado: A cerrado; B revisión básica operativa, sin revisión semántica Ollama; C implementado y probado sintéticamente; D diseño por consultor y topología futura pendientes; E gate reforzado, transferencia PG12 pendiente. No marcar PG11 completo ni regenerar P1–P4.


## Actualización verificable — 11/11/2026 — Sección 03 PG11

**Estado técnico:** QA automatizado PASS; **estado de producto: REVIEW** hasta UAT visual y funcional del estudio local del propietario. La presente actualización **no** modifica los contratos CANONICAL, ni promociona PG11 a CLOSED o PRODUCTION.

**Rama:** `work/as-is-ux-simplification-20260930`. Implementación inicial de Astra: `8af8562`; corrección del test de confirmación de reemplazo global: `746eae35`; reducción de repetición de tarjetas IA sin candidato: `752948e0`; regresión de campos sin candidato: `fe0781b8`; aserción y captura de densidad real en navegador: `27a5c4e8`.

**Evidencias automáticas ejecutadas:**
- Frontend: **894 PASS, 0 FAIL**. `https://github.com/PedroCMillan5/AUNEA/actions/runs/43012366884`.
- Backend: **467 PASS, 1 warning**, sin fallos. `https://github.com/PedroCMillan5/AUNEA/actions/runs/43012367147`.
- Chromium: **PASS**, incluye selección, revisión humana, Mantener/Editar/Aplicar, persistencia/reload, reanálisis global, rutas nuevas y fuente AS-IS inmutable, comparación PG11/PG12, responsive y comprobación de que campos sin candidato no repiten nueve bloques de fuentes. `https://github.com/PedroCMillan5/AUNEA/actions/runs/43012367147`.
- UAT sintética con modelo Ollama real: **PASS** en el commit `8af8562`. `https://github.com/PedroCMillan5/AUNEA/actions/runs/43010345831`. Los cambios posteriores son solo de frontend/test y no cambian el motor IA.
- Oráculos de prueba: `invoices.json`, `unified-requests.json`, `email-orders.json` de `3_SYSTEM/frontend/uat/cases/`. No equivalen al JSON del estudio local del propietario.

**Diagnóstico de fallo Chromium previo:** el test intentaba sustituir una propuesta global guardada sin aceptar el diálogo de confirmación; Playwright descarta diálogos no atendidos. Se acepta ese diálogo únicamente en la prueba; producción mantiene la confirmación humana.

**Cierre visual de 03.3:** se preservan las fuentes detalladas en 03.2 y las justificaciones por campo cuando hay candidato. En campos sin recomendación válida ya no se repite una tarjeta completa con las mismas justificaciones, fuentes y límites. La UI continúa utilizando los controles canónicos de diseño y edición.

**Límite de aceptación restante:** comprobar en Windows, tras `git pull --ff-only` y recarga, que los datos AS-IS y las recomendaciones coinciden con el **snapshot confirmado vigente de cuatro actividades** (no sustituir por el oráculo sintético histórico de seis), que las acciones y decisiones persisten con Ollama y backend 8010 conectados y que el propietario acepta visualmente la sección 03 completa. Para P1 en la captura del propietario: Administración/Email; correo y PDF; 3 min activos, 0 de espera y 0 de retrabajo; fricción de visibilidad (30 % y 10 min por caso afectado); riesgo de pérdida de trazabilidad entre correo y ERP. Estas últimas observaciones exigen verificar origen/versiones antes de certificar datos.

**Criterio de cierre:** 03.1–03.4 sin defectos críticos en sesión real, trazabilidad correcta del mismo snapshot, guardado/reapertura, aprobación humana y aceptación visual del propietario. Hasta entonces conservar REVIEW; no declarar ahorro, viabilidad tecnológica ni aprobación automática. No cambian Master Index, DECISIONES, ESTADO ni ROADMAP: no hay modificación de versión canónica, regla o secuencia de producto. Registrar el hito de QA en BITACORA.


## 11/11/2026 — Ajuste final de densidad y estados PG11.03 tras captura del propietario — REVIEW

**Evidencia recibida:** la pantalla real de P1 mostraba 4/4 actividades con IA analizada, aviso de análisis global por fuentes incompleto, «Se mantiene» de IA frente a «Se modifica» del consultor y varias tarjetas de justificación global repetidas dentro de 03.3. Las decisiones humanas permanecían pendientes. Este contraste no convierte el 4/4 en aprobación ni valida las capacidades de Email/ERP.

**Corrección:**
- `results.js`: en 03.2, el aviso parcial refiere expresamente al análisis global por fuentes de la sección 02 e indica el número de fuentes completadas cuando existe metadata; diferencia explícitamente ese contador de la cobertura de actividades por IA de 03.3. No altera resultados ni decisiones.
- `results.js`: en 03.3, la propuesta específica por campo conserva el candidato y su trazabilidad, pero no reitera la justificación y acción generales ya consultables en 03.2; cada detalle muestra solo referencias y condiciones verificables. En campos sin valor IA estructurado dice «sin propuesta específica para este campo», no declara que el análisis global carezca de recomendaciones. Continúan los nueve controles propietarios y las acciones humanas sin aplicación automática.
- `ui-system.css`: columna de acciones dimensionada por contenido con los botones comunes; el espacio recuperado se destina a leer la propuesta y no a una columna vacía fija.
- Regresión `pg11-guided-inline.test.cjs` sobre relación de scopes y fuentes; `uat-browser-smoke.cjs` introduce temporalmente un campo IA vacío exclusivamente durante la prueba visual, lo verifica y restaura el candidato original antes de continuar.

**Evidencias:** código hasta `b57746ca`; `AUNEA Frontend Tests` 895 PASS / 0 FAIL; backend 467 PASS / 1 warning; `AUNEA Internal V2 REVIEW Acceptance Gate` con Chromium PASS. URL: https://github.com/PedroCMillan5/AUNEA/actions/runs/43015078534. Indice de Block_ID actualizado sin introducir fuentes nuevas.

**Estado:** revisión técnica automatizada PASS, **PG11 sección 03 sigue REVIEW** hasta contrastar la versión actual contra el snapshot AS-IS confirmado de cuatro actividades y aceptación visual/funcional en el equipo Windows del propietario. No tocar Master Index, DECISIONES, ESTADO ni ROADMAP por esta corrección UX sin cambio de regla/contrato/orden; reflejar el hito en BITACORA.

## 11/11/2026 — Aclaración de candidato IA no estructurado (captura P1) — REVIEW

**Hallazgo:** la revisión individual P1 contiene en el texto narrativo de `rationale` una intervención automatizada, mientras que el campo estructurado `automation_ai` de esa propuesta puede estar vacío. La sección 03.3 lo mostraba como «sin propuesta específica» sin explicar que en 03.2 sí había una orientación narrativa. Esto no es necesariamente un bug de mapeo: el contrato `PilotAIItem` distingue ambas fuentes; un valor vacío no es aplicable.

**Corrección:** `results.js` ahora muestra una advertencia no bloqueante **sólo en Automatización e IA**, cuando el campo estructurado no tiene candidato y la acción narrativa propone automatización. La advertencia remite a 03.2 y exige completar el borrador manualmente; no fabrica una propuesta, no ejecuta `Aplicar IA`, no altera datos AS-IS/TO-BE ni decisiones. Se prueba que el aviso no aparezca en campos ajenos o cuando la acción narrativa no mencione automatización.

**Commits:** `390adef4` (render de diferencia), `d1837a04` (test funcional). **QA**: 896/896 frontend PASS, 467/467 backend PASS con 1 advertencia, Acceptance Gate Chromium PASS. https://github.com/PedroCMillan5/AUNEA/actions/runs/43017207760

**Estado:** PG11.03 REVIEW. Cobertura 4/4 de actividades IA y 4/5 de fuentes del análisis global son contadores independientes. La contradicción «Se mantiene» frente a «Se modifica» requiere decisión del consultor; no automatizar esa decisión. La UAT del estudio local y aceptación visual siguen pendientes. No se cambian decisiones canónicas, reglas ni versión del modelo.


## 11/11/2026 — Navegación guiada 03.1–03.3 y lógica de decisiones P2 — REVIEW

**Origen:** revisión de la sección 03 con el propietario. La navegación duplicada mostraba «Entender / Revisar IA / Configurar / Conectar» con nombres diferentes de los encabezados, aunque la conexión de rutas pertenece al modo Mapa TO-BE. Además, P2 es una actividad condicional con reglas SÍ/NO y la revisión por actividad no presentaba sus criterios ni sus rutas.

**Corrección genérica de interfaz:** los botones de revisión coinciden literalmente con «03.1 · Entender el AS-IS», «03.2 · Revisar propuestas IA» y «03.3 · Configurar la actividad futura». Se retira 03.4 de la navegación guiada. «03.4 · Conectar el proceso futuro» permanece exclusivamente en el modo Mapa TO-BE, donde ya existe el editor versionado de destinos SÍ/NO. Reutiliza el mismo flow owner y los estilos AUNEA System; no se ha creado una navegación o modelo de rutas paralelo.

**Lógica por actividad de decisión:** la nueva lectura `tobeDecisionReadoutHtml` identifica actividades ST04, recupera `DF041/decision_criteria` desde el snapshot AS-IS confirmado, proyecta destinos originales SÍ/NO y destinos de la versión TO-BE, y presenta el contraste sin convertirlo en regla ni decisión aprobada. Las rutas TO-BE se cambian sólo en Mapa, con los controles existentes y validación de destinos, alcance y conexión a Fin. Los pasos no decisionales no presentan una bifurcación ficticia; las decisiones incorporadas nuevas no heredan rutas de decisión del AS-IS.

**IA y datos insuficientes:** el contrato de salida IA requiere campos estructurados como `automation_ai`, pero sus cadenas pueden ser vacías. La ausencia de candidato no acredita por sí sola carencia de información del cliente; también puede ser una salida IA incompleta. Valores no incluidos en catálogos se muestran como candidatos no aplicables, nunca se autocorrigen silenciosamente. No se han inventado reglas de umbral ni enlaces específicos de facturas.

**Pruebas:** `pg11-future-flow.test.cjs` comprueba con caso sintético que P2 usa criterio y rutas declaradas, que modificar destinos TO-BE no altera AS-IS y que una nueva decisión no hereda rutas inexistentes. Chromium comprueba que los tres botones están visibles en revisión guiada, que Conectar no aparece allí y que el editor de rutas aparece al entrar en Mapa TO-BE. **QA del commit `23eaefb0`: 897 frontend PASS, 467 backend PASS (1 warning), Chromium integral PASS.** https://github.com/PedroCMillan5/AUNEA/actions/runs/43025824916. La UAT en Windows con el snapshot real de cuatro actividades continúa pendiente de acreditación. **No se promueve PG11.03 a CLOSED.**

**Rama:** `work/as-is-ux-simplification-20260930`. Commits de implementación hasta `9ec66ad0`. Estado de QA se registra con el último Acceptance Gate satisfactorio. No cambian reglas canónicas, Master Index, DECISIONES, ESTADO ni ROADMAP por estos ajustes de presentación y proyección de datos ya existentes.


## 11/11/2026 — Cierre técnico de defectos funcionales en PG11.03 — REVIEW

**Motivo:** la sección presentaba 4/4 actividades con análisis individual, pero campos IA vacíos pese a recomendar automatizaciones, y P2 sólo permitía visualizar las bifurcaciones sin definir el criterio futuro de enrutamiento. La navegación 03.1–03.3 y el mapa ya se habían separado; este cambio aborda los defectos funcionales sin reconstruir el producto.

**Datos y reglas (orden de cambio):**
- Se reutiliza el campo **DF041 del modelo ProcessStep** como base de la condición de decisión; el criterio TO-BE opcional se almacena exclusivamente en `tobeProposal.flow.decisionCriteria[stepId]` del DRAFT versionado. No hay nueva pregunta DF, no se escribe en AS-IS ni se modifica el Diagnóstico. El mapa sigue siendo propietario de rutas SÍ/NO.
- En una decisión original el campo vacío significa **conservar la condición AS-IS**, y se muestra el valor de origen. Una **nueva decisión** ST04 requiere condición explícita y ambas rutas conectadas antes de revisión; no hereda falsos destinos o condiciones de la actividad de origen.
- La validación de flujo comprueba accesibilidad y salida a Fin. Una modificación de ruta que deja aislada la actividad de aprobación se bloquea por desconexión, no se reconecta silenciosamente.

**Motor IA:**
- El prompt orienta a llenar `automation_ai` cuando su acción narrativa propone implantar/crear automatización; los demás campos pueden quedarse vacíos si no existe evidencia específica, sin inventar software ni permisos.
- El revisor deterministicamente identifica una acción inequívoca de automatización cuyo `automation_ai` esté vacío o sea no aplicable. Esta **incoherencia interna de la propuesta**, distinta de una discrepancia legítima IA–consultor, se clasifica como defecto de aplicación; `consolidate` reutiliza el reintento **selectivo y acotado a esa actividad**, seguido de verificación. Si no hay candidato válido, bloquea aplicar IA y conserva la propuesta original y la evidencia; no fabrica campos.
- El revisor básico RULES_ONLY advierte sobre la misma incoherencia sin iniciar Ollama. Protocolo de compatibilidad actualizado a `PG11_REVIEW_20261111_4`; es obligatorio **reiniciar el backend local** después del pull.
- La propuesta IA almacenada con protocolo previo se conserva; no se reescribe por refrescar el navegador. Para comprobar nuevas correcciones se debe ejecutar el análisis de la actividad afectada.

**Interfaz y UX:**
- 03.3 muestra **cobertura estructurada por actividad** sobre nueve campos, con categorías `con candidato` / `requiere corrección` / `sin candidato`; se especifica que la IA no informa la causa de cada omisión. Es distinta del contador 4/4 de actividades y del inventario global 4/5 fuentes.
- Las filas sin candidato dejan de mostrar tarjetas de evidencia grandes. «Mantener» conserva el valor del DRAFT, «Editar» lo modifica y «Aplicar IA» sólo aparece tras decisión humana y candidato compatible.
- El mapa permite editar la condición futura de un paso de decisión y sus rutas SÍ/NO; la revisión guiada sigue con tres apartados y sólo muestra la lectura comparativa de criterios y rutas.

**QA y evidencia:** regresiones nuevas en `test_internal_ai_review_consolidation.py` (bloqueo y reparación selectiva), `pg11-future-flow.test.cjs` (decisión nueva sin criterio, vista y preservación de datos, prueba de cuatro pasos y ruta de aprobación), `pg11-guided-inline.test.cjs` (cobertura de campos) y `uat-browser-smoke.cjs` (prueba de guardado del criterio en localStorage y fuente AS-IS inmutable). Resultado comprobado por GitHub Actions: **469 backend PASS, 899 frontend PASS** a la fecha de esta actualización; Chromium integral del código actual todavía requiere la ejecución de su paso final en el runner.

**Estado:** PG11.03 en **REVIEW técnico de aceptación real**, sin declaración de CLOSED. Los únicos gates no acreditados desde GitHub son la inferencia en el **Ollama instalado en Windows con la sesión actual de cuatro actividades** y la aceptación visual final. El JSON de octubre localizado en la Library contiene seis actividades y no es el snapshot vigente de la captura; no puede sustituirlo ni utilizarse para declarar ese caso PASS. No cambian Master Index, decisiones comerciales, catálogo, pricing, ESTADO ni ROADMAP. Bloques y responsabilidades actualizados en `CODE_BLOCK_INDEX.md`.
