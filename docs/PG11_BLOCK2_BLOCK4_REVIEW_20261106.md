# PG11 — Bloques 2 y 4: restricciones y recuperación

Fecha: 06/11/2026 · Estado del software: **REVIEW** · Rama: `work/as-is-ux-simplification-20260930`.

Fuentes revisadas: `00_AUNEA_INTERNAL_MASTER_INDEX` v1.59; `PROJECT_RULES.md` v1.7; decisiones DEC-034/050/052/055; `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14; contrato arquitectónico CANONICAL v1.7. El documento no reemplaza ningún CANONICAL.

## Bloque 2 — Incompatibilidades, límites y alternativas

- `internal_ai_global_review.py` sigue siendo el evaluador determinista de las condiciones confirmadas: aprobación humana, pagos, eliminación, continuidad, RBAC, auditoría, MFA, restricciones expresas sobre herramientas y datos externos. Cada incompatibilidad conserva la fuente DF y el motivo.
- Las preferencias por usar funciones nativas o mantener herramientas no se confunden con prohibiciones. Si el texto IA las describe como vetos sin sustento, el sistema solicita corregirlo sin descartar por ese motivo la intervención operativa.
- La disponibilidad de integraciones, permisos, licencias, formatos y avisos permanece como **no verificada**; ni la propuesta inicial ni la alternativa pueden presentarse como técnicamente factibles sin prueba en el entorno cliente.
- `internal_ai_global_alternative.py` es un helper sin dueño de datos propio del bloque `AUNEA-BE-PG11-GLOBAL-AI-282`: antes de pedir una alternativa, exige que la acción original choque con una restricción confirmada; proporciona a Ollama la fuente de conflicto y rechaza acciones sustancialmente repetidas. `internal_ai_global.py` vuelve a evaluar cada alternativa sin aprobarla.
- El frontend conserva la propuesta incompatible, presenta alternativa condicionada sólo cuando existe revisión sin conflicto y mantiene el motivo, la trazabilidad y la aprobación del consultor.

## Bloque 4 — Estados, tarjetas y persistencia

- El runtime de `internal-ai-pilot.js` conserva en el owner versionado `aiGlobal` cada lote correcto, `source_batches`, fuentes finalizadas e incidencias. La continuación comprueba Engagement, versión TO-BE, snapshot, hash del diagnóstico y hash del inventario. No repite fuentes ya completadas ni lotes guardados de una fuente interrumpida.
- El botón existente «Volver a analizar» conserva su semántica de análisis nuevo; el nuevo botón **«Reintentar fuentes pendientes»** aparece sólo con borrador vigente e incompleto, y utiliza la ruta de recuperación sin borrar recomendaciones conservadas.
- La vista expone por separado fuentes completadas, integridad de las recomendaciones (también variantes relacionadas) y decisiones humanas por actividad. Los avisos originales de frases posiblemente cortadas se preservan, sin ocultarlas.
- El tamaño de las tarjetas se reduce usando reglas CSS ya existentes de AUNEA System. Se mantiene la información completa en los desplegables, sin truncamiento ni modificaciones de componentes canónicos.
- La capa de estado se registra en el `boot.js` existente, tras cargar `results.js`, para conservar el manifiesto y el orden de módulos. No crea un dueño de datos o duplicado de UI.
- Si falla el guardado del reinicio, el objeto anterior se restaura. Si falla un lote, se conservan los anteriores; el TO-BE y el AS-IS no se modifican automáticamente.

## QA y cierre

Pruebas creadas/extendidas:
- `test_internal_ai_global.py`: incompatibilidad real frente a preferencia, evidencia de restricciones en prompt de alternativa y rechazo de intervenciones parafraseadas.
- `pg11-global-overview.test.cjs`: reanudación después de 503, integridad, estados, botón sólo en borradores con fuentes pendientes, recuperación/rollback de persistencia.
- `uat-browser-smoke.cjs`: ruta real de reintento desde PG11 conservando intervención existente y sin reiniciar el progreso.

Los workflows del último HEAD deben finalizar SUCCESS para considerar **cerrados técnicamente** los bloques 2 y 4. La validación semántica con Ollama real en Windows y pruebas integrales de procesos heterogéneos corresponden al bloque 5, que NO se inicia aquí.

Sin cambios en precios, KPIs, capturas DF, AS-IS confirmado, decisiones de aprobación, PG10 ni PG12–PG15; no se promueve el software de REVIEW a CANONICAL.
