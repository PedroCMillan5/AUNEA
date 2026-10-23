# AUNEA Internal — Auditoría de las cinco decisiones del consultor (PG10)
Estado: REVIEW · 23/10/2026 · Rama: `work/as-is-ux-simplification-20260930`

## Fuentes y límites de autoridad
- Jerarquía: `PROJECT_RULES.md`, Master Index vigente, `AUNEA_DIAGNOSTIC_DATABASE_v0.9.2_DIAGNOSTIC_MASTER_V1.2.xlsx` (pestaña `MAP_QUESTION_ENGINE_INPUT`), `AUNEA_SYSTEM_SIMULATOR_CANONICAL`, `DEC-034`, `DEC-052`, `DEC-065`, contratos `RULE_RECOMMENDATION RR-03/RR-04` y `RULE_LEVEL_AI`.
- El snapshot confirmado de PG09 es el propietario de los datos; los cinco valores Sí/No pertenecen a la revisión del consultor en Trabajo interno, no a DF001–DF100.
- Las cinco propiedades del backend son las mismas que antes; ninguna nueva pregunta de captura ni nueva regla comercial se crea aquí. La interfaz no calcula Pain, Economics, Risk, Recommendation, Pricing ni Scenario.

## Mapeo canónico, fuentes e interpretación

| Decisión visible | Entrada gobernada | Fuentes canónicas (No-Reask) | Qué aporta el diagnóstico | Qué **no** demuestra |
|---|---|---|---|---|
| Cambios de reglas/responsabilidades antes de automatizar | RR-03 / IN-R-09: `process_design_first` (invierte `process_design_preconditions_ok`) | DF041, DF042, DF067; pasos de decisión/aprobación; señales P04/P10 según regla vigente | Criterios, flujo normal y responsabilidades de aprobación; posibles anomalías | Que el rediseño sea imprescindible solo porque exista una aprobación |
| Capacidades de herramientas existentes | RR-04 / IN-R-02: `existing_tool_can_close` | DF034, DF046, DF054, DF089; herramientas de ProcessStep | Herramientas declaradas, integraciones faltantes, preferencias tecnológicas | Disponibilidad de licencias, funciones o conectores sin comprobación técnica |
| Necesidad de interpretación no estructurada | IN-R-12: `unstructured_interpretation_need` | DF035, DF049, DF050, DF086; entradas/salidas documentales | Documentos y comunicaciones presentes, resultados esperados | Que el PDF o email obligue a usar IA |
| Acciones dentro de límites definidos | IN-R-13: `bounded_action_space` | DF041, DF043, DF074, DF075, DF088; rutas excepcionales/decisiones y restricciones humanas | Acciones y decisiones susceptibles de límites y controles | Que toda decisión o autorización requiera un agente IA |
| Visibilidad y gestión de carga/esperas | IN-R-11: `management_visibility_need` | DF027, DF053, DF081, DF086; señales P09/P14/P17 según regla vigente | Datos declarados de backlog, búsquedas, reporting, fricciones y resultados deseados | Que tiempos, porcentajes o costes simulados estén medidos o acreditados |

## Estados de revisión
- **Información insuficiente:** no se infiere ninguna respuesta negativa ni se rellena el selector. La pantalla explica qué dato falta.
- **Información para revisar:** existen hechos asociados, pero son insuficientes para afirmar Sí/No. El consultor decide si procede verificar o acreditar el criterio.
- **Propuesta para contrastar:** únicamente las reglas de sugerencia preexistentes `RR-03` e `IN-R-11` permiten mostrar una propuesta Sí; nunca se marca automáticamente como respuesta. Las hipótesis conservan su origen.
- **Confirmada:** solo cuando el consultor pulsa la acción de confirmar las cinco decisiones como Sí/No. `Pendiente` no se convierte en No. La operación es atómica (no guarda una confirmación parcial como válida).
- **Cambio de snapshot:** se invalidan las confirmaciones internas ligadas a una versión anterior. Las selecciones no aparecen preconfirmadas.
- **Cambio posterior de decisión:** se marca obsoleto el output de motores calculado con decisiones anteriores, incluso si el snapshot AS-IS no cambia; no puede aprobarse para el cliente hasta recalcular.

## UAT Levante (ficticia) — alcance de las conclusiones
1. **Rediseño:** las decisiones de aprobación y la regla pendiente de confirmar aportan contexto; no acreditan por sí mismas una obligación de rediseño. Mantener pendiente salvo juicio del consultor documentado.
2. **Herramientas:** correo y ERP están declarados; no constan pruebas de viabilidad de funciones/licencias. Mantener pendiente hasta revisión técnica.
3. **IA documental:** el uso de facturas/PDF no acredita necesidad de IA. No convertir falta de prueba en respuesta No.
4. **Agente:** las aprobaciones requieren control humano; falta definir una acción delegable acotada. No deducir agente por el simple diagrama.
5. **Seguimiento:** existen señales sobre visibilidad y espera; AUNEA puede proponer Sí si se cumple la condición gobernada, pero el consultor debe confirmar y sus cifras siguen siendo hipótesis de UAT.

## QA requerido
- Sintaxis de módulos y suite `3_SYSTEM/frontend/tests/engine-gates-review.test.cjs`.
- Cinco estados iniciales pendientes, sugerencias no seleccionadas, No nunca inferido, respuesta parcial sin persistencia, persistencia tras cinco respuestas, payload binario con polaridad original y auditoría de snapshot.
- Después de modificar decisiones, resultado anterior obsoleto, bloqueado para publicación y recalculado desde el backend.
- QA visual de la ventana con datos de Levante y otro expediente sin datos suficientes.
- Estado actual: implementación REVIEW; **suite y navegador no ejecutados ni declarados aprobados** en esta sesión. No promover a CANONICAL ni modificar la matriz maestra sin aprobación.

## UAT visual — revisión real de las cinco tarjetas (23/10/2026)
- Capturas de Levante: las cinco tarjetas existen, pero mostraban `[object Object]` en DF027 y DF081, claves de paso `UAT-LIT-Px` en DF053/054, datos repetidos en herramientas y una falsa alerta de criterio faltante en «Aprobar factura» por no usar herencia de «Determinar si procede aprobación».
- Corrección de presentación `3_SYSTEM/frontend/services/engine-adapter.js`: decodificación conservadora de valores estructurados (38 casos; 3 min/caso en fixture), IDs de paso y pares de herramienta traducidos a nombres, fuentes resumidas sin códigos técnicos, aprobación heredada a través de `approvalCriteriaSource` sin duplicar la regla, política UAT simulada indicada explícitamente como no validada. La pregunta RR-03 recupera su semántica exacta de **rediseñar**, no simplemente aclarar.
- Tarjetas: detalle apilado a ancho completo; evidencias en dos columnas compactas con adaptación móvil; evaluación presentada como **provisional** y «decisión pendiente de comprobar», sin aprobación implícita.
- QA específico: `engine-gates-review.test.cjs` incluye 4 regresiones nuevas para objetos, unidades, IDs y herencia; **todos esos tests pasan en GitHub Actions** (ejecución `39930060841`). El frontend completo conserva **36 fallos** en pruebas más amplias, incluidos hallazgos anteriores de PG05/PG09; NO afirmar suite verde ni cerrar UAT visual final. Código REVIEW.


## Continuidad PG01–PG15 — control de frontera PG09→PG10 y salida a cliente (23/10/2026)

**Estado: REVIEW, sin promoción a CANONICAL ni PRODUCTION.** La revisión del popup forma parte del circuito captura→AS-IS confirmado→cinco decisiones técnicas→backend→PG10→TO-BE→revisión→Modo Resultados/entregables. La corrección no añade DF, reglas de motor, preguntas de discovery, precios, productos ni KPIs; se reutilizan exclusivamente `engineGates`, `engineGateReview`, el snapshot y los outputs existentes.

**Correcciones técnicas verificables:**
1. `engine-adapter.js` exige un conjunto de cinco valores binarios **confirmado conjuntamente por el consultor para la versión del snapshot**. Cinco flags precargados o cinco respuestas sin el acta `engineGateReview.decisions` no son confirmación suficiente. La UI distingue propuesta de AUNEA, decisión pendiente y respuesta efectivamente confirmada.
2. Si cambia el snapshot entre abrir y confirmar la revisión, se rechaza el guardado; no se infieren respuestas negativas ni se guardan aprobaciones parciales como válidas. El conflicto de persistencia devuelve los valores y el audit a su estado previo.
3. `runDiagnosis()` conserva desde el inicio la versión de snapshot y la huella de las decisiones. Si alguno cambia durante el preflight/HTTP, descarta la respuesta del backend. Antes de entregar un resultado a PG10/TO-BE exige persistencia correcta; si falla, restaura el resultado anterior y bloquea la continuación.
4. `engineGateOutputFresh()` exige que cualquier `diagnosticOutput` tenga la huella original y la confirmación técnica todavía vigente. Esto se consume por `currentDiagnosticOutput()`, `diagnosticOutputFreshness()` y `reviewSources()`: una decisión modificada, una aprobación perdida o un nuevo snapshot impiden utilizar el resultado para escenarios, revisión o publicación.
5. `results.js` añade el detalle interno de las cinco respuestas utilizadas por el backend, con distinción entre propuesta aceptada, propuesta rechazada, contexto registrado y afirmación del consultor no acreditada; no altera la recomendación calculada. La preparación de PG10 no aparece como lista para calcular con decisiones sin confirmar. `CODE_BLOCK_INDEX.md` registra `AUNEA-FE-RESULT-GATE-TRACE-151`.

**QA automatizado del bloque:** `engine-gates-review.test.cjs` incorpora pruebas de atomicidad, cambio de snapshot, respuesta no confirmada, huella, relectura del popup, persistencia fallida y ejecución simulada del **código real de runDiagnosis()**. También comprueba que la autorización humana posterior deja de estar vigente si se modifican los inputs técnicos. En el workflow del commit `2a308f7`, las regresiones específicas pasan; la suite frontend completa permanece **613/664 PASS, 51 FAIL**, por tanto el gate NO está verde. Las pruebas y la instrumentación completas del frontend incluyen fallos de PG05/PG09, auditoría de Block_ID y UAT de runtime: deben evaluarse/reconciliarse antes de promoción. En el workflow del commit previo `ed5219f`, el backend finalizó SUCCESS. El navegador Chromium general no estaba validado con éxito; la ejecución anterior mostró que PG03 visual PASS, pero el recorrido se interrumpió posteriormente en un estado de capa de proceso no esperado.

**Alcance y deuda de integración:** estas regresiones demuestran la integridad de la frontera PG09→PG10 con mocks controlados y guardas hasta la revisión para cliente. **No demuestran todavía la cadena real completa de una empresa** desde PG01 hasta PG15 ni que TO-BE, escenarios, aprobación y Modo Resultados se vean correctamente por un usuario. Se requiere recuperar un gate general verde o justificar cada discrepancia antigua, recorrer un único expediente representativo en navegador, contrastar diagnóstico y outputs del backend, confirmar fuentes/evidencias/hipótesis, revisar TO-BE y la publicación desde el mismo snapshot, y comprobar invalidación tras cambios y persistencia tras recarga. No publicar como caso de cliente real los datos UAT sintéticos de Levante.

**Gobierno:** DEC-034/041/052/053 y Diagnostic Master v1.2 no cambian. El estado sigue REVIEW; no corresponde crear una DEC nueva, cambiar ROADMAP ni declarar un hito de cierre definitivo en ESTADO. La siguiente decisión de promoción sólo procede con QA integral y aceptación de resultados verificados.


## Protección del AS-IS — reconciliación de la UAT tras endurecer PG10 (23/10/2026)

Comparativa de QA ejecutada sobre la rama vigente:
- Antes del ajuste a la UAT, en `2a308f7`: frontend 613/664 PASS y 51 FAIL; 15 fallos añadidos concentrados en la carga de la única UAT y pruebas de PG05/PG09 dependientes de esa carga.
- Causa demostrada: `singleUatAudit` requería que las cinco decisiones técnicas estuviesen confirmadas **antes del cierre PG09**, mientras el contrato vigente exige confirmación explícita sobre el snapshot **después del cierre**. Por ello el cargador no completaba la UAT y sus pruebas dependientes recibían un engagement nulo.
- Reparación acotada en `3_SYSTEM/frontend/uat/visible.js`: la preparación del AS-IS sintético no queda bloqueada por decisiones posteriores; no se crean decisiones humanas automáticas, ni se precargan valores Sí/No. Una vez sellado el AS-IS, las cinco decisiones siguen pendientes y bloquean el cálculo hasta su confirmación.
- Regresión en `3_SYSTEM/frontend/tests/uat-full-runtime-v1.test.cjs`: exige exactamente cinco decisiones pendientes antes del cierre, sin impedir que `singleUatAudit` considere preparada la captura.
- QA del commit `0024f9a0e`: frontend **628/664 PASS, 36 FAIL** (15 pruebas recuperadas); backend del acceptance gate **SUCCESS**. Los 36 fallos coinciden por nombre con los del antecedente `e3126ad` (623/659 PASS); las cinco regresiones nuevas de PG10 permanecen verdes.
- Chromium de `0024f9a0e`: las comprobaciones visuales PG03 vertical/layout PASS; el recorrido completo sigue bloqueado en un assertion posterior del estado de capa AS-IS, por lo que **no hay UAT integral aprobada**.

Control de alcance: se preservan Diagnostic Master v1.2, schema DF001–DF100, reglas/engines server-owned, snapshots y páginas FROZEN. El cambio reparó exclusivamente el **fixture y validación de UAT**; no introduce una condición nueva en la sesión del cliente ni altera los outputs del backend. **REVIEW**, sin autorización para promover el módulo a CANONICAL/PRODUCTION.

Próximo trabajo: resolver por causalidad los 36 fallos preexistentes; comparar el conjunto de errores y ejecutar QA tras cada cambio sin intervenir en pantallas congeladas, y validar la ruta PG01→PG15 en navegador antes de declarar cierre global.


## Resultado de la remediación de las 36 incidencias — 23/10/2026

**Estado de esta intervención: QA AUTOMATIZADO PASS / producto AUNEA Internal continúa REVIEW, no PRODUCTION.**

**Base de referencia:** `a1e07e37` con 628/664 pruebas frontend superadas y 36 fallos; la rama `work/as-is-ux-simplification-20260930` se ha actualizado sin introducir ningún nuevo campo DF, cambio de regla canónica, fórmula económica, esquema de backend, precio ni producto. No se ha ejecutado ninguna operación sobre el almacenamiento local del navegador del propietario.

**Remediación por causa:**
- Fixtures aislados del AS-IS/PG09 y completitud reconciliados con el contrato vigente de snapshot sellado y las cinco decisiones humanas confirmadas por versión; la ausencia de confirmación sigue bloqueando motores y publicación.
- Pruebas que comparaban textos anteriores (revisión de participantes, fricciones, riesgos, impactos, interfaz de fecha española y enlaces del cierre) adaptadas para exigir las señales funcionales y los estados vigentes, sin recuperar etiquetas técnicas ni autoconfirmaciones.
- `CODE_BLOCK_INDEX.md` reconciliado con los Block_ID existentes del código y la prueba de PG09; se eliminaron del fixture los marcadores de cierre que el auditor interpretaba erróneamente como bloques ejecutables.
- El cargador sintético de facturas sigue dejando las cinco decisiones técnicas pendientes **hasta después** de PG09; el recorrido ejecuta la confirmación explícita DF017 en el control real de la interfaz, no inserta respuestas confirmadas artificialmente.
- PG09 muestra recuentos ya capturados de fricciones con evidencia y riesgos con controles, con sus límites; no inventa magnitudes. Una versión realmente sellada no muestra el mensaje contradictorio de cierre pendiente. Los gaps obligatorios enlazan con su pregunta origen. CSS limitado a esa presentación.
- Las pruebas de mapa conservan la diferencia entre `layerConfirmations.map` y una revisión derivada PG05 pendiente; la acción visible permite confirmar o deshacer según el estado real. Una prueba de navegación deja de pulsar `Deshacer` cuando el mapa ya está confirmado.
- La prueba de barra temporal de Chromium exige el estado canónico «No conciliado» y su advertencia de no acreditación, en vez de una antigua cadena literal.
- El fixture de postdiagnóstico C07 incluye un snapshot sellado y la huella de las decisiones, como requiere `engineGateOutputFresh()`; no permite acceder a TO-BE usando resultados no trazables.

**Verificación en GitHub Actions sobre el commit `8978429a275726b8b5732dd77fad7d0aa0cdeb37`:**
- Frontend Tests run **39939004928**: **SUCCESS**, **666/666 PASS, 0 FAIL**.
- Acceptance Gate run **39939004942**: **SUCCESS**; trabajos `frontend`, `backend` y `browser_uat` los tres **SUCCESS**.
- Chromium UAT registra `PG01_CHROMIUM_GATE_PASS`, `PG03_CHROMIUM_VERTICAL_PASS`, `PG03_CHROMIUM_LAYOUT_PASS`, `PG05_VISUAL_INTEGRITY_PASS`, `DEC074_SEGMENT_RENDER_PASS`, `PG05_STABLE_IDLE_MAP_PASS`, `PG05_CLIENT_BOUNDARIES_PASS` y `CHROMIUM_UAT_PASS` (único estudio sintético creado, recorrido y recuperado tras recarga). La UAT de navegador no exige que un resultado fuera de la capa AS-IS se apruebe sin evidencia.
- Comparación de cambios `a1e07e37...8978429a`: cambios confinados a frontend `pages/diagnostic-stages.js`, `ui-system.css`, pruebas bajo `tests/` y `CODE_BLOCK_INDEX.md`; **sin cambios en el backend, schemas DF001–DF100 o las páginas/capturas FROZEN**.

**Límite de la afirmación:** los 36 fallos automáticos están remediados y la aceptación automatizada vigente es verde. Esta evidencia no sustituye la comprobación humana del expediente real guardado en el navegador del propietario ni demuestra que la experiencia completa PG10→PG15 en un entorno productivo sea satisfactoria. La promoción a CANONICAL/PRODUCTION y los cambios en DECISIONES/ROADMAP requieren evidencia y aprobación adicionales, no se realizan automáticamente. Los datos sintéticos UAT de Levante no son un caso real de cliente contratado.
