# AUNEA Internal — Continuidad AS-IS → puntos críticos → alternativas → escenarios (REVIEW)

## Actualización vigente — 27/10/2026

Implementado el puente candidato de conciliación por evento, sin activarlo en PG14:
[Contrato técnico y QA](AUNEA_INTERVENTION_RECONCILIATION_REVIEW_20261027.md).
Endpoint `/v1/diagnostic/interventions/reconcile-review`, bloques 156. Comprueba
propietario, huella, alcance y línea base antes de preparar ScenarioAssumptions.
Fan-out por Pain, espera sin equivalencia, empeoramientos y solapes quedan
pendientes explícitos. Los apartados del 23/10 siguientes conservan el historial
de implementación; la atribución ya cuenta con este incremento REVIEW, pero su
promoción, integración oficial y publicación siguen pendientes.

Fecha: 23/10/2026  
Estado: **REVIEW — alcance analítico implantado; generación completa de tres escenarios cuantificados no autorizada sin hipótesis y alcance**.  
Rama: `work/as-is-ux-simplification-20260930`.

## Fuentes y límites

Revisión iniciada desde `00_AUNEA_INTERNAL_MASTER_INDEX` v1.58, `PROJECT_RULES.md` v1.7, `DECISIONES_AUNEA` (DEC-034, DEC-052, DEC-053, DEC-065), `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14 y Diagnostic Master v1.2 vigente.

**No se modifican los DF001–DF100, modalidades, requiredness, reglas de captación, pantallas FROZEN, snapshots, preguntas, Engine Consumers, reglas económicas ni pricing.** El cierre histórico PG09 sigue exigiendo confirmación humana y persistencia. La ruta PG11–PG15 no puede publicar un análisis exploratorio como resultado aprobado.

## Secuencia funcional: fuente única

| Paso | Input dueño | Operación | Salida y condición |
|---|---|---|---|
| Contexto AS-IS | Snapshot PG09, Company, Contact, 100 DF y modelos | Examinar todos los DF; respetar valor efectivo / derivado; no reinterpretar ausencia de opcionales como bloqueo | Inventario privado de fuentes/valores por etapa |
| Puntos críticos | ProcessStep, Friction.affected_steps, RiskInput.step_ids, EconomicInput.step_ids | Mostrar las relaciones existentes, tiempos declarados por paso y registros sin ancla | Panel de puntos críticos navegable en el mismo AS-IS; no duplica modelos |
| Línea base | Backend InputCoverage/Pain/Economics/Risk/SessionTime | Nuevo endpoint **read-only** `POST /v1/diagnostic/asis-analysis`, sin Recommendation/Pricing/Scenario; omite cómputos derivados si falta base crítica o integridad | Resultados de origen, brechas y advertencias sin cinco decisiones comerciales |
| Alternativas condicionadas | Hallazgos del AS-IS + REF_ACTION/REF_LEVEL_AI | Tres vías de intervención como **hipótesis de contraste**, con pros, contras y dependencias | Sin decisión automática sobre IA, rediseño o posibilidades de ERP |
| TO-BE | Snapshot y diagnóstico oficial vigente | Se mantiene trazabilidad de cada ProcessStep y se requiere revisión humana para un TO-BE aprobable | Alternativas visualizables antes; edición/aprobación oficial aún gobernada |
| Escenarios oficiales | Recommendation/Scenario Comparator/CommercialScope y EconomicInput | Desde tres vías se puede abrir el comparador con acción y nivel IA tomados del catálogo vigente; el consultor debe documentar los supuestos | `quote`, tiempo futuro, valor de capacidad, ahorro de caja, payback solo cuando el backend los calcule y autorice |
| Resultado al cliente | OutputReview, TO-BE aprobado, misma versión del AS-IS | La presentación consume exclusivamente resultados y escenarios aprobados | No se muestran borradores internos ni inferencias no comprobadas |

## Las cinco dimensiones dejan de bloquear la lectura del AS-IS

Las dimensiones «rediseño», «herramientas actuales», «interpretación IA», «agente acotado» y «seguimiento» se recuperan de `ENGINE_GATE_CONTRACT` como **evidencia/propuesta/por determinar**, sin autoaceptar las sugerencias. La exigencia de respuestas Sí/No permanece únicamente en la ruta **actual** de recomendación y cotización oficiales porque el backend espera cinco booleanos; el endpoint nuevo permite diagnosticar los problemas antes de esta selección.

Este trabajo **no ha reescrito el Recommendation Engine** para admitir trivalencia, porque eso requiere aprobación y modificación coordinada del contrato canónico de reglas y comparador. El condicionamiento de la selección tecnológica se ha expresado en la capa exploratoria, no mediante el envío ficticio de «No».

## Tres vías a comparar (no tres resultados inventados)

1. **Optimización sin IA** — referencia del catálogo `ACT03`, `I0`. Verificar datos estructurados, integraciones y reglas.
2. **Optimización asistida por IA** — `ACT04`, `I1`. Verificar muestras documentales, calidad, supervisión y coste operativo. No se presupone que usar PDF implique necesitar IA.
3. **Rediseño / tecnología existente** — punto de partida `ACT02`, `I0`, revisable hacia `ACT01` cuando se demuestre necesaria una modificación organizativa. Verificar las capacidades reales, licencias y responsables.

Los niveles funcionales y todas las cotizaciones se obtienen de catálogo/reglas canónicas. No se crea un nuevo producto, tarifa, ahorro o tasa de mejora. El escenario óptimo sigue inmutable y los alternativos deben pasar por el Scenario Comparator con hipótesis explícitas.

## Fuentes económicas y gaps

- `DF025` = SLA/plazo de servicio, **no** mejora objetivo implícita.
- `DF026` = end-to-end actual declarado; no sustituye tiempos de trabajo/espera/retrabajo.
- `ProcessStep.active_time/wait_time/rework_time` = atribución por paso; las rutas condicionadas impiden sumar ciegamente tiempos para obtener un end-to-end.
- `EconomicInput` = impacto económico parcial, con owner, driver, evidencias y atribución. No se presenta como total de tiempo del proceso.
- `SessionTime` server-owned = línea base anualizada cuando haya volumen/periodo soportados; la espera es exposición, no horas laborales.
- `Scenario Economics` server-owned = tiempo futuro y capacidad recuperable **sólo con hipótesis documentadas**; el valor de capacidad no implica cash saving.
- `Quote` = sólo producto/alcance/costes canónicos, nunca una cifra propuesta por la IA.
- El registro de brechas distingue fuentes no capturadas, campos opcionales/condicionales, faltas de integridad, ausencia de evidencia, integración ERP no comprobada y dependencias de cada variante.

## QA / criterios de aceptación

- Test unitario: los 100 DF se examinan sin cambiar el modelo y se conserva su etapa/consumer.
- Test relacional: cada punto conserva IDs de Friction, Risk y EconomicInput y no crea ahorro automático.
- Test endpoint: el análisis AS-IS no requiere resolver decisiones de solución, no modifica capturas/almacén y no devuelve recomendación, escenario óptimo ni precio.
- Test E2E de facturas: confirmar realmente DF017 + PG09, entrar a Diagnóstico con cinco decisiones sin resolver, mostrar mapa, cobertura de 100 campos y tres vías, sin modificar el snapshot.
- Tests anteriores PG01–PG09, snapshots, persistencia, riesgos, backend y Chromium siguen siendo obligatorios y no se sustituyen por pruebas aisladas.

## Pendientes explícitos para un circuito PG10–PG15 plenamente automático

1. Motor IA de orquestación con proveedor gobernado: actualmente `AiAgentService.status()` indica `UNAVAILABLE` cuando no hay proveedor. Los enfoques exploratorios proceden de reglas y fuentes, **no son generación autónoma de IA**.
2. Simulación de mejoras **por cada intervención** y consolidación sin solapes (rutas, esperas y retrabajo): falta un contrato de hipótesis TO-BE por punto con trazabilidad propia al backend. No se calculan mejoras ficticias en el frontend.
3. Generación/validación de **tres escenarios globales con números y precios**: el backend ya dispone de comparator y pricing canónicos; solo devolverá cantidades cuando haya supuestos económicos, alcance y reglas válidos. La UI propone tres vías y abre el configurador de alternativa, pero no inventa supuestos.
4. La matriz cualitativa por paso ya tiene tres alternativas visibles, ventajas, inconvenientes y dependencias (incremento REVIEW descrito abajo); siguen pendientes los scores basados en evidencia, la simulación cuantitativa y la publicación PG15 con tres escenarios aprobados, sin duplicar Snapshot ni crear un nuevo estudio.

Hasta cerrar estos puntos, el proyecto sigue **REVIEW**, sin promoción a CANONICAL/PRODUCTION y sin cambio de DECISIONES/ESTADO/ROADMAP por mera disponibilidad de una interfaz exploratoria.


## Incremento validado — 23/10/2026

En la rama de trabajo, sin alterar capturas ni preguntas del AS-IS, cada paso crítico (definido sólo por sus vínculos existentes a Friction, RiskInput o EconomicInput) dispone ahora de tres alternativas condicionadas, derivadas de las líneas de intervención ya registradas. Cada tarjeta reutiliza el nombre del paso y el contexto de fricciones/riesgos/impactos del snapshot sellado; expone cuándo podría aplicar, intervención a examinar, ventajas, limitaciones y comprobaciones. La evaluación es cualitativa, nunca se presenta como recomendación del engine ni valoración demostrada de viabilidad. Se distingue que las cifras futuras y la contribución por punto están **sin calcular**.

Se amplían los bloques técnicos existentes AUNEA-FE-ASIS-WORKBENCH-152 y AUNEA-FE-ASIS-WORKBENCH-STYLE-152, y la UAT AUNEA-UAT-ASIS-WORKBENCH-152 (3 alternativas por cada paso, dos pasos, escaping y fuente inmutable). La aceptación en commit \`6e6e9e87de2b6602a79408430da59b606b35360d\` ha sido PASS en frontend **672/672**, backend PASS y Chromium PASS, run 39948427691. No constituye UAT visual/nativa del propietario ni simula tiempos TO-BE.

**Siguiente contrato pendiente (no implementado ni aprobado):** distinguir supuestos futuros por intervención/punto, vincular cada uno a su fuente y a la medida temporal propietaria; conciliar rutas excluyentes y solapes de esperas/retrabajo; agregar efectos individuales sin duplicar magnitudes; entregar esos resultados al Scenario Comparator y pricing sólo mediante inputs, alcance y catálogo autorizados. El contrato existente ScenarioAssumption está relacionado con Pain/EconomicInput y no determina por sí solo una atribución temporal por ProcessStep. No se añaden campos DF ni porcentajes universales para resolverlo.

Continúa REVIEW; no se promueven escenarios, entregables, fuentes canónicas ni estado de producto.


## Contrato integral y recorrido interno — 23/10/2026 (REVIEW)

- **Especificación humana detallada:** [AUNEA Internal — Contrato integral Trabajo Interno → Modo Resultados — REVIEW](https://docs.google.com/document/d/1K1V53bQSOplc6m34zGVwV92UcKY4JZFHKaVusoakg1w/edit). No sustituye AUNEA_SYSTEM_SIMULATOR_CANONICAL ni el Diagnostic Master hasta aprobación expresa. Cubre contratos de información, orquestación IA, hipótesis por intervención, síntesis backend y publicación versionada.
- **Prueba UAT de diseño:** fixture sintético actual 3_SYSTEM/frontend/uat/cases/invoices.json (Levante Instalaciones Técnicas). Demanda declarada 160/mes, DF026 E2E 72 h y DF025 SLA 48 h; aprobación 25%, 720 min de espera solo en esa rama; reintroducción de 5 min INCLUDED dentro del paso de ERP, no tiempo adicional. Cualquier mejora futura es hipótesis sin prueba: no se publica E2E TO-BE, ahorro, coste o recomendación óptima basada solo en esta lectura. El fixture no representa un cliente real confirmado ni tiene PG09 aprobado.
- **Resultado funcional incremental:** bloque AUNEA-FE-WORKFLOW-READINESS-153 muestra desde PG10 el recorrido PG10–PG15 con estado dependiente del mismo snapshot, diagnóstico actual, TO-BE versionado y OutputReview. Enlaces a etapas existentes; botón a Modo Resultados solo si ya existe revisión vigente APPROVED_FOR_CLIENT/PUBLISHED. El bloque no crea un nuevo gate, no altera modelos, no decide IA, no valida hipótesis ni cambia ningún output backend. Regresión AUNEA-UAT-WORKFLOW-READINESS-153 comprueba captura sin confirmar, AS-IS confirmado con recomendación no calculada, obsolescencia del motor/TO-BE, aprobación de cliente y ausencia de escritura.
- **Pendiente crítico para completar el circuito:** proveedor y política de IA, schema gobernado de intervención/supuesto/atribución y deduplicación por evento, cálculo TO-BE por rutas, puente al comparator por Pain/EconomicInput, comparación de alternativas globales y pruebas de publicación end-to-end. Requiere aprobación canónica de reglas nuevas; no introducir defaults de ahorro ni falsear cinco booleanos.
- **Gobierno:** se conserva estado REVIEW; ninguna promoción de CANONICAL/PRODUCTION ni cambios automáticos a DECISIONES, ESTADO, ROADMAP o Master Index al limitarse este incremento a diseño REVIEW y guía UI read-only.


## Motor de proyección por intervención (REVIEW) — 23/10/2026

- Contrato técnico humano (no canónico): [AUNEA — Contrato de simulación por intervención y conciliación — REVIEW v0.1](https://docs.google.com/document/d/1-44uXJI8RfMtkGDu3GZ5Q0_mHNkLTCObC76t0BnK_nw/edit). Complementa el contrato integral de Trabajo Interno, no modifica Diagnostic Master v1.2 ni AUNEA_SYSTEM_SIMULATOR_CANONICAL v1.14 ni DECISIONES.
- Backend experimental puro, bloque AUNEA-BE-INTERVENTION-REVIEW-155: módulo 3_SYSTEM/backend/aunea_backend/intervention_projection.py. Entrada: TimeProjectionRequest AS-IS vigente y propuestas tipadas con step_id, dimension ACTIVE/WAIT/REWORK, future_minutes explícitos, clase/fuente/evidencia, estado DRAFT/REVIEWED, referencia versionada. Su proyección reutiliza la anualización, proporción de ruta, repeticiones y tasa de retrabajo del backend existente. La salida es un delta PARCIAL por componente y contribuciones auditables; no E2E TO-BE, SLA futuro, efectivo, precio, payback ni ScenarioResult.
- Endpoint de pruebas AUNEA-BE-INTERVENTION-API-155: POST /v1/diagnostic/interventions/review. Indica official=false y snapshot_seal_verified=false: una versión/hash proporcionados por el caller NO prueban sellado PG09. No guarda estados, no llama a Scenario Comparator y no ofrece publicación.
- Protección no-solape: para cada (step_id, dimension), cualquier doble atribución entre intervenciones causa conflicto y no suma ni sustituye la hipótesis final. Una hipótesis DRAFT, sin evidencia/confirmación o con denominador incompleto no aporta cifra; un negativo se informa como empeoramiento real. Los gaps de baseline permanecen visibles. Una dimensión sin hipótesis se devuelve null, no 0.
- Regresión: AUNEA-UAT-INTERVENTION-REVIEW-155 en test_intervention_projection_review_v1.py prueba UAT sintética de facturas, volumen mensual, rama 25%, reintroducción INCLUDED, retrabajo 8%, conflictos, rutas sin base, calendario semanal sin default, empeoramiento, borradores, finitud y endpoint no oficial; se conserva la integridad inmutable del fixture. Se incorpora el escaneo de backend/tests Python al índice de Block_ID y se registran sus tres bloques históricos previamente no escaneados.
- Cálculos sólo como sensibilidad de hipótesis sintéticas: 5→3 min de registro = 64 h/año activas; espera de aprobación 720→600 min al 25% = 960 caso-horas/año de exposición; retrabajo validación 10→6 min con error del 8% = 10,24 h/año. No equivalen a mejora end-to-end, beneficios reales, ROI ni precio.
- Pendientes gobernados: esquema final de intervención y estado de revisión/provenance; verificar hash sellado PG09 en backend; reconciliar dueños de eventos con Friction/EconomicInput y ScenarioAssumption por Pain; modelar futuro por rutas críticas, solapamientos y tiempo transcurrido; orquestar IA y habilitar comparación oficial PG14 solo tras nueva aprobación canónica. Ningún resultado de este REVIEW puede exponerse en Modo Resultados.

## Incremento REVIEW — 27/10/2026 · UAT de Diagnóstico interno (primeras tres prioridades)

**Alcance:** únicamente lectura/presentación PG10 y su suite de regresión; no altera AS-IS confirmado, DF001–DF100, backend canónico, estados de aprobación, escenario Óptimo, pricing ni PG14 oficial.

1. **Cobertura:** `asisFieldInventory` distingue valor disponible, derivación accesible, derivación sin valor, ausencia condicional/no exigible y ausencia exigible según las reglas de captura existentes. `asisCoverageHtml` distingue ese inventario (100 DF) de las 55 entradas de `InputCoverageEngine`, muestra el nombre español del DF fuente y si cada dependencia del motor es bloqueante. El número sin valor accesible nunca equivale automáticamente a respuestas obligatorias pendientes. La prioridad cliente `priority_pains` se corresponde con DF096, condicional y no bloqueante según el contrato de entrada.
2. **Hallazgos:** encabezados de Pain derivados del `Label_ES` canónico de `friction_pain_map` (no se presentan rótulos técnicos ingleses), causas capturadas, prioridad de cliente separada de estado/confianza del motor, distinción explícita entre relación contextual de EconomicInput y causalidad, acceso al punto de análisis enlazado en la misma página y consulta de origen del AS-IS. Estos vínculos NO demuestran ahorro ni una causa definitiva.
3. **Tiempo y economía:** tarjetas de línea base procedentes de `project_session_time` distinguen trabajo activo de pasos, adicionales `ADDITIONAL` ya conciliados, total activo con adicionales, caso-horas de espera, retrabajo y duración DF026 declarada. El contraste NO acredita equivalencia con el end-to-end ni ahorro de caja. Tarjetas `EconomicInput` distinguen `null` de cero; costes actuales no se presumen eliminables.
4. **QA alcanzado:** lectura y parser JavaScript de los dos módulos modificados `PASS`; ocho smoke assertions V8 sobre cobertura, idioma y proyección temporal `PASS`, además de smoke de semántica de ceros económicos `PASS`; JSON Levante original contrastado: 4 pasos, 3 fricciones, 2 riesgos, 3 EconomicInput, DF096 sin valor en la **exportación previa al cierre**, que no representa necesariamente el estado vivo. Regresiones nuevas versionadas en `tests/internal-work-p0.test.cjs`.
5. **QA pendiente:** ejecución completa de las pruebas Node/backend, UAT de navegador y contraste del snapshot de Levante después de la confirmación (DF096, materialidad y estado vigente). Por tanto **no se declara la pantalla PG10 validada ni se modifica su estado CANONICAL/FROZEN**.

**Límites conocidos:** la navegación añadida lleva a la ficha de punto de análisis asociada dentro de PG10 y el botón original abre la página AS-IS, sin selección automática del paso en el mapa fuente. Las alternativas genéricas repetitivas y limpieza visual corresponden a las prioridades 4–5, fuera de este incremento.
