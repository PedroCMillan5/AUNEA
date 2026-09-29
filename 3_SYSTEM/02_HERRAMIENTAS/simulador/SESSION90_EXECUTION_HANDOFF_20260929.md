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
No hay UAT visual/nativa en Windows o Edge. No se ha conectado aún el editor económico
al endpoint de proyección, ni se ha retirado `economicTimeProjection()` de frontend.
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

## B03. Conexión del servicio a pantallas REVIEW

Retirar la anualización paralela DAY×365 / WEEK×52 del navegador, que no está
gobernada. Consumir el endpoint sin defaults de calendario y sin nuevos campos
en páginas FROZEN. Antes de guardar EconomicInputs derivados, respetar estado
incompleto y comprobar no duplicar ED01 con ED02–ED08 ni ED05. QA de frontend.

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
