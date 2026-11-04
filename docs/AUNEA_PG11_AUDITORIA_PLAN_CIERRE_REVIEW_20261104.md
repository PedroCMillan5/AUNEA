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
