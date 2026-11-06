# PG11 — Plan de modificaciones y ejecución del bloque 1

Fecha: 06/11/2026 · Estado: **REVIEW** · Rama: `work/as-is-ux-simplification-20260930`

## Fuentes y alcance

Fuentes de gobierno consultadas: `00_AUNEA_INTERNAL_MASTER_INDEX` v1.59; `PROJECT_RULES.md` v1.7; decisiones DEC-034/050/052/055; `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14 y `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL` v1.7. Este documento es un registro técnico de ejecución; **no sustituye ningún activo CANONICAL**.

Acuerdo de producto: conservar la composición visual, tarjetas, justificaciones expandibles, alertas de frases incompletas, persistencia incremental y validación humana de PG11. La solución continúa siendo DRAFT; no altera datos confirmados ni outputs de economics/risk/pricing/recommendation.

## Bloque 1 implementado (puntos 1, 2, 3 y 9)

1. **Sin máximo de recomendaciones por fuente.** Cada respuesta de Ollama conserva un límite técnico de dos intervenciones para no saturar el contexto, pero el contrato incorpora `has_more` y `seen_interventions`: el frontend solicita sucesivos lotes por fuente hasta que el proveedor indique que ya no hay más intervenciones justificadas. No existe cuota fija por fuente ni global. Se conserva la barrera de tamaño de entrada; si se alcanza, el análisis queda parcial y trazable en vez de fingir completitud.
2. **Textos incompletos.** El backend rechaza síntesis, acciones o justificaciones que terminen a mitad de una frase, incluso cuando el JSON sea sintácticamente válido. El frontend reintenta **sólo el lote afectado** ante ese error; si persiste, conserva los lotes anteriores y muestra incidencia, sin recortar ni aprobar silenciosamente.
3. **Duplicados y equivalencias.** El frontend unifica acciones idénticas y agrupa redactados muy próximos respaldados por fuentes coincidentes. Conserva referencias del AS-IS y versiones relacionadas en el desplegable de la tarjeta. Se evita agrupar acciones independientes sólo porque usan expresiones parecidas.
9. **Objetivos legibles.** El prompt exige un resultado operativo concreto en español y rechaza claves como `REDUCE_TIME`, `LESS_MANUAL` o `TRACEABILITY` cuando aparecen como objetivo aislado, sin inventar metas cuantificadas.

## Contrato técnico y archivos

- `3_SYSTEM/backend/aunea_backend/internal_ai_global.py`: contrato `GlobalBatchRequest`, esquema `GlobalBrief`, continuación, validaciones de integridad y objetivo.
- `3_SYSTEM/backend/aunea_backend/api.py`: handshake de compatibilidad `pg11_global_strategy=SCOPED_V2`.
- `3_SYSTEM/frontend/domain/internal-ai-pilot.js`: iteraciones por fuente, comprobación de versión, retry selectivo, merge y guardado progresivo.
- `3_SYSTEM/frontend/pages/results.js`: muestra variantes relacionadas en el desplegable ya existente, con trazabilidad.
- `3_SYSTEM/backend/tests/test_internal_ai_global.py`, `3_SYSTEM/frontend/tests/pg11-global-overview.test.cjs` y `3_SYSTEM/frontend/tests/uat-browser-smoke.cjs`: regresiones.
- `CODE_BLOCK_INDEX.md`: responsabilidades de los bloques existentes actualizadas, sin crear owners paralelos.

## Condiciones de aceptación y límites de la evidencia

- Más de dos recomendaciones en una misma fuente, sin perder las anteriores.
- Reintento localizado cuando Ollama devuelve una frase cortada; si falla, borrador parcial y error visible.
- No perder evidencias/variantes por la consolidación de duplicados; no unir acciones de fuentes independientes por parecido léxico.
- Objetivos concretos, sin códigos de categorización como título.
- No alterar PG10, las decisiones humanas por actividad, la estructura de tarjetas, ni publicar contenido sin revisión.
- **QA automatizado:** los workflows de frontend/backend/Gate del HEAD de la rama gobiernan el resultado; cotejar los últimos resultados GitHub Actions, no inferirlo de un commit antiguo.
- **UAT real pendiente:** probar con Ollama local `aunea-qwen3-4b:latest` en Windows/puerto 8010 y con el AS-IS confirmado. El pipeline CI usa mocks; no certifica calidad semántica del modelo en producción.

## Pendientes aprobados — no incluidos en bloque 1

- **Bloque 2 (puntos 4–7):** verificación detallada de restricciones y capacidades reales; incompatibilidades y alternativas viables.
- **Bloque 3 (11–13):** consolidación funcional global, trazabilidad completa y conexión con revisión individual TO-BE.
- **Bloque 4 (8, 10, 14):** estados, simplificación visual y robustez adicional de persistencia.
- **Bloque 5 (15):** QA final con procesos heterogéneos y Ollama real.

## Gobierno

No se modifica el Diagnostic Master, los campos DF, precios, productos, KPIs ni reglas de aprobación. El runtime y el plan permanecen **REVIEW**. No se promociona `main`, no se archiva ningún CANONICAL y no se modifica el Master Index, DECISIONES o ROADMAP salvo un cambio posterior de versión, decisión de negocio o dependencia.
