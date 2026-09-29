# AUNEA Internal — Sesión 90 min: ejecución secuencial

Estado: REVIEW · rama de integración `fix/session90-snapshot-invalidation-20260929`
Rama de partida: `reconcile/frontend-v1.0.4-source`, HEAD inicial `0ed29e1f6bb58739fe363ed80e078be7d25f6d8a`.
Esta rama NO sustituye automáticamente el trabajo local de Astra ni debe fusionarse sin inspeccionar su publicación posterior.
Fuente de verdad: Master Index + PROJECT_RULES.md + Diagnostic Master v1.2 + Simulador canónico v1.14 + decisiones activas.
Las páginas FROZEN y el diseño global quedan fuera del alcance.

## B01. Normalización determinista de tiempos — backend implementado; integración pendiente en B03

Archivos:
- `aunea_backend/session_time.py`: `TimeProjectionRequest` y `project_session_time`.
- `aunea_backend/api.py`: `POST /v1/diagnostic/time-projection`.
- `tests/test_session_time.py`: 8 casos de rutas, repeticiones, calendarios y solapamientos.
- `frontend/domain/engagement.js`, `process-lifecycle.js`, `core/state.js`,
  `pages/results.js`, `services/engine-adapter.js`: invalidación del snapshot actual
  y resultados derivados, sin borrar versiones históricas.
- `frontend/tests/engagement-lifecycle-v1.test.cjs` y `results-v1.test.cjs`: regresiones.

Resultados verificados de CI: frontend 347/347, backend 48/48, una advertencia de pytest.
No hay UAT visual/nativa en Windows o Edge. El editor de Impacto ya consulta asincrónicamente
el endpoint de proyección (B03 parcial), sin annualización local ni defaults DAY×365 / WEEK×52.
`economicTimeProjection()` permanece sólo como adaptador HTTP, no como fórmula.
El endpoint entrega proyección explicativa de actividad AS-IS, NO beneficio ni
ahorro de caja. La métrica de espera suma exposición por paso; no representa
automáticamente el tiempo de ciclo end-to-end.

### Reglas vigentes respetadas
- Volumen MONTH×12 y QUARTER×4 sólo para cadencia estable; YEAR directo.
- WEEK requiere semanas operativas explícitas; DAY por defecto requiere días
  operativos explícitos. Días naturales exige año calendario y declaración de
  proceso realmente operado en días naturales.
- Sin proporción verificable de una rama no hay total proyectado válido.
- Retrabajo por porcentaje de error sólo cuando el denominador es compatible;
  tasas expresadas en recuentos quedan condicionadas.
- DF062 nunca se añade al DF039 sin atribución aprobada.
- No inferir tiempo desperdiciado desde el trabajo activo ni ahorro desde capacidad.

## B02. Atribución de fricciones e impacto — guardrails backend parciales implementados

Cambios de esta rama:
- `aunea_backend/friction_review.py` revisa DF059–DF063 por fricción sin agregar horas ni pérdidas duplicadas; valida anclajes a pasos activos, id único y denominadores de frecuencia.
- El endpoint de B01 devuelve `friction_review` con los hallazgos conservadores.
- `tests/test_friction_review.py` contiene 5 pruebas específicas.
- Aún NO existe relación canónica de atribución DF039/DF062 ni semántica granular de evidencia; queda bloqueada su agregación hasta aprobar contrato de datos y reglas. No añadir campos desde UI.


Contratos existentes: RULE_ECON_AGGREGATION EAR-001–EAR-014, RULE_PAIN_OVERLAP,
RT_FRICTION y EconomicInput.deduplication_key. Revisar el contrato real antes
de introducir cualquier campo o relación. Hasta autorización de una semántica
de atribución entre DF039 y DF062, informar la fricción como posible
solapamiento; jamás agregarla silenciosamente.

Pruebas de aceptación:
1. Misma incidencia DF039 y DF062 se cuenta una vez.
2. Fricción en múltiples pasos no multiplica un mismo evento.
3. Diferenciar casos afectados e incidencias múltiples con periodos explícitos.
4. Pérdida directa reutilizada en DF082 no se duplica.
5. Evidencias distintas para frecuencia, duración y pérdida cuando existan.
6. Sin relación de atribución aprobada, outputs condicionados.

### Decisión del propietario · 29/09/2026 · ATRIBUCIÓN DF039↔DF062 (aprobada)

Gobierno: registrada como **DEC-068 en DECISIONES_AUNEA v1.27** (Drive), verificada. Sincronización de Master Index y cambios físicos en Diagnostic Master v1.2, Simulator CANONICAL y Architecture Contract pendientes; no presentar B02 como cerrado. QA tras la aprobación: backend 57/57, frontend 351/351. 

Se aprueban tres relaciones de tiempo entre una fricción y su paso propietario:

- **INCLUDED / Incluido:** los minutos de DF062 ya están incluidos en el tiempo capturado del paso y no se agregan.
- **BREAKDOWN / Desglose:** los minutos de DF062 explican una parte del retrabajo DF039 del paso y no se agregan.
- **ADDITIONAL / Adicional:** los minutos de DF062 describen trabajo no recogido en los tiempos del paso; sólo éstos incrementan el total si la frecuencia y los datos de calendario permiten estimar el número de eventos.

Modelo transitorio para sincronizar con el contrato de datos CANONICAL: `RT_FRICTION.time_attribution={mode: INCLUDED|BREAKDOWN|ADDITIONAL,step_id:<RT_PROCESS_STEP.id>}`. La fricción conserva `affected_steps` para todos los pasos implicados, pero `step_id` determina su único propietario económico; un mismo evento vinculado a varios pasos no se multiplica. Sin relación o propietario válidos, el importe temporal adicional permanece sin cuantificar y se registra un gap. No se altera el formulario de PG04: la selección se ofrece únicamente en el popup de fricción REVIEW, con sus desplegables actuales. Las pérdidas directas monetarias mantienen una conciliación independiente con DF082; clasificar el tiempo no autoriza agregar dinero.

Implementación en esta rama:
- `backend/aunea_backend/friction_review.py`: valida modos, propietario, frecuencias y anclajes.
- `backend/aunea_backend/session_time.py`: expone `annual_friction_additional_hours` y `annual_total_active_hours` diferenciados de `annual_rework_hours`, sin sumar INCLUDED/BREAKDOWN.
- `frontend/domain/process.js`: añade selectores de relación y único paso propietario en el popup de fricción; no modifica pantallas FROZEN.
- `tests/test_session_time.py` y `frontend/tests/process-layer-v2.test.cjs`: aceptan los tres tipos y la no multiplicación multi-paso.

Pendiente antes de cierre de B02: reconciliar el campo y enum con el Diagnostic Master canónico en Drive; verificar que el motor económico oficial respeta EAR-001–EAR-014 y que no se permite sumar entradas manuales duplicadas ED01/ED05/DF082. El resultado del servicio es una proyección informativa, no beneficio monetario calculado.

## B03. Conexión del servicio a pantallas REVIEW — Impacto conectado; resto pendiente

Implementado: la vista previa de `domain/economics.js` consulta `POST /v1/diagnostic/time-projection`
y sólo propone valores automáticos de ED01/ED05/ED13 cuando el backend devuelve `CALCULATED`.
En caso de calendario, ruta, frecuencia o atribución incompleta muestra el motivo y
permite captura explícita manual con evidencia; no convierte hipótesis en datos calculados.
Las pruebas del adaptador y UI mantienen los dos grupos actuales y los dropdowns. El adaptador conserva caché temporal verificada para DF078/DF079 (minutos por caso); No-Reask rechaza esa caché si ha cambiado cualquier entrada. El popup reutiliza las herramientas registradas en el mapa (DF046) y avisa de pérdidas directas DF063 ya declaradas antes de introducir DF082, sin inventar importes ni añadir un nuevo control.

Pendiente: cerrar atribución canónica DF039↔DF062; evitar que un EconomicInput manual
duplique ED01/ED02–ED08/ED05 bajo EAR-001/004; integrar coherentemente `DF078/079`
(consolidación desde backend o estado pendiente, nunca segunda fórmula del navegador),
reutilización de costes de herramientas desde el mapa, y test visual client-first.
No se ha añadido ningún campo a páginas FROZEN ni cambiado el diseño general.

### Estado verificable de B01–B03 a 29/09/2026
- Backend CI: 53/53 pruebas aprobadas para normalización y revisión de fricciones.
- Frontend CI: 350/350 pruebas aprobadas tras conectar Impacto con el backend, reutilizar DF078/DF079 sólo desde el cache versionado y mostrar procedencia de DF046/DF063.
- No se ha ejecutado UAT visual en Windows/Edge, por lo que las pantallas REVIEW no pasan a FROZEN.
- B02/B03 NO se consideran completados: el contrato canónico aún no define la relación de atribución del tiempo DF039↔DF062 ni la evidencia numérica por afirmación, y sigue pendiente la reconciliación oficial de drivers ED01 frente a ED02–ED08/ED05 para cada evento. Estas decisiones deberán aprobarse en DATA + RULES antes de ampliar la interfaz.
- Nunca deducir semanas o días operativos sin captura canónica; mientras tanto, el backend devuelve estado incompleto y la interfaz permite únicamente declaración manual evidenciada.

## B04. Editor client-first y Session Display

Mantener dropdowns y MULTICHECK originales; grafo izquierda→derecha, Fin en rutas
SÍ/NO y normal, reconvergencias, invalidación y persistencia. No tocar diseño global.

## B05. PG09: validación y cierre

Gaps materiales, datos/evidencia pendientes, prioridades, permisos,
confirmación y snapshot versionado. Nunca presentar históricos como vigentes.

## B06. Contrato de traspaso al futuro Trabajo interno con IA

Snapshot confirmado, procedencia, outputs deterministas y permisos; no implementar
aún la pantalla interna, HTML de cliente, generador PPT ni constructor agnóstico.

## B07. E2E de 90 minutos

Pruebas automatizadas completas + regresión FROZEN + UAT visual cuando haya
entorno nativo. Declarar por separado lo que no se pueda probar.

## B08. Consolidación y gobierno

Comparar HEAD de partida, HEAD de esta rama y cualquier commit posterior de
Astra; reconciliar sin force push. Actualizar índices/decisiones/estado/roadmap/
bitácora sólo para cambios aprobados que correspondan. No promover a main ni
PRODUCTION sin gate y UAT final.
