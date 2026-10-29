# AUNEA Internal — IA PG10 → PG11 · contrato de piloto
**Estado: REVIEW — 29/10/2026. No CANONICAL, FROZEN ni PRODUCTION.**

## Fuentes vinculantes
Master Index v1.59; PROJECT_RULES.md v1.7; DEC-034, DEC-050, DEC-052, DEC-053, DEC-055, DEC-068, DEC-074; AUNEA_SYSTEM_SIMULATOR_CANONICAL v1.14; Diagnostic Master v1.2; Architecture Contract CANONICAL v1.7. El contrato integral Trabajo Interno → Modo Resultados (23/10/2026) permanece REVIEW y no sustituye las fuentes anteriores.

## Alcance exacto implementado
La primera capacidad de IA es **PG10 análisis vigente → PG11 propuesta TO-BE por paso**, con activación manual. No genera recomendaciones oficiales, ahorros, valores de riesgo, pricing, escenarios ni publicación de resultados. No se han modificado DF001–DF100, los catálogos, cinco decisiones de motor, OPTIMAL ni los engines.

**Entrada**: `EngagementInput` normalizado desde AS-IS confirmado, versión del snapshot y `DiagnosticOutput` oficial vigente. Se comprueba igualdad de `engagement_id`, hash del input y versión de rule bundle; todos los pasos activos deben tener IDs estables únicos.

**Salida**: estado `DRAFT`, vínculo con Engagement y versión de snapshot, modelo usado y una propuesta por paso AS-IS. Cada propuesta contiene transformación dentro del catálogo ya existente, explicación, responsable futuro, herramienta verificada, entradas y salidas, automatización/IA, supervisión humana, controles, justificación, referencias de fuente y limitaciones. Las referencias a pasos/fricciones/riesgos deben existir. No incluye números, tiempos, ahorro o promesa de capacidad del ERP.

**Control humano**: el resultado se muestra como previsualización no persistida. La acción explícita «Aplicar a campos vacíos» sólo completa propiedades TO-BE DRAFT ya existentes, sin sobrescribir correcciones del consultor; no aprueba, no publica y no altera el AS-IS. Después el consultor revisa/guarda según el circuito existente. La explicación del proveedor es transitoria en este piloto; la persistencia versionada de la justificación y el fingerprint compuesto se mantienen como gap para un contrato canónico posterior.

## Seguridad, proveedor y disponibilidad
Backend: `aunea_backend/internal_ai.py`, `internal_ai_provider.py`, `api.py`. Frontend: `domain/internal-ai-pilot.js` (registrado en manifest y cargado antes de boot). Endpoints de piloto: `GET /v1/internal-ai/status` y `POST /v1/internal-ai/tobe-draft`.

El proveedor está **UNAVAILABLE por defecto**, sin llamadas de pago. Para habilitar el piloto local hacen falta `AUNEA_INTERNAL_AI_ENABLED=1`, `AUNEA_INTERNAL_AI_DATA_AUTHORIZED=1` y una credencial `OPENAI_API_KEY` configurada únicamente en el servidor; modelo parametrizable por `AUNEA_INTERNAL_AI_MODEL`, por defecto `gpt-6-luna`. El POST sólo admite tráfico de loopback/test local; no se autoriza exposición remota ni clientes reales sin autenticación, base jurídica y tratamiento de datos formalizados. La API se invoca únicamente al pulsar el botón, sin reintentos automáticos y con `store=false` en el proveedor.

El servicio utiliza Structured Outputs y valida de nuevo todas las referencias recibidas. Un proveedor ausente o inválido detiene la operación; jamás se finge una propuesta IA. Los outputs del motor oficial siguen siendo server-owned.

## QA técnico realizado
En la rama `work/as-is-ux-simplification-20260930`, GitHub Actions Acceptance Gate run **40911658235** sobre commit `0673c5327144e5ca7bfed62ee7c38eb5e7087168`:
- Backend: **350 passed** (1 warning).
- Frontend: **728 passed, 0 failed**.
- Browser UAT automatizada: **SUCCESS**.
- Regresiones añadidas: `test_internal_ai_pilot_review.py`, `internal-ai-pilot-review.test.cjs`.
- CODE_BLOCK_INDEX actualizado con bloques 190/191/192/193.

**No probado**: llamada real a proveedor, calidad semántica de propuestas, validación humana de los cuatro pasos actuales ni UAT completa Windows/Edge/Chromium después de usar el botón IA. El gate verde no certifica ninguno de esos puntos.

## Criterios para salida de REVIEW
1. Confirmar contrato de atribución intervención→paso→Pain/EconomicInput, y no-solapamiento antes de escenarios cuantitativos.
2. Incorporar persistencia/auditoría de propuestas y fuentes, tratamiento de errores y de outputs obsoletos bajo una fuente única.
3. Revisar política de tratamiento de datos, autenticación, autorización y presupuesto máximo; no usar datos de un cliente real con flags de prueba.
4. Validar precisión, citas, abstenciones, ausencia de valores inventados y conservación de decisiones humanas con fixtures y varias muestras reales autorizadas.
5. Completar UAT humana PG10→PG11→PG12, incluyendo guardado, reentrada, aprobación y cambios de snapshot.

**No se promocionan documentos canónicos, reglas de negocio ni main por esta entrega.** Esta prueba técnica es una base aislada para el diseño posterior.
