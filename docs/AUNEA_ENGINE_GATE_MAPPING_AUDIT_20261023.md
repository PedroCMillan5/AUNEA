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
