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

El agente está **UNAVAILABLE por defecto**. Selección en backend con `AUNEA_INTERNAL_AI_PROVIDER=ollama|openai` (por compatibilidad, si se omite conserva `openai`). Ambos exigen `AUNEA_INTERNAL_AI_ENABLED=1` y `AUNEA_INTERNAL_AI_DATA_AUTHORIZED=1`. OpenAI necesita `OPENAI_API_KEY`, usa `AUNEA_INTERNAL_AI_MODEL` y remite `store=false`; Ollama NO necesita clave de API, requiere servicio local en `127.0.0.1:11434` y modelo instalado, elegido con `AUNEA_OLLAMA_MODEL` (por defecto `qwen3:4b-instruct`). Ollama sólo conecta a loopback y nunca se sustituye automáticamente por la API de pago de OpenAI. El POST de piloto no se habilita para acceso público; no se autoriza exposición remota ni clientes reales sin autenticación, base jurídica y controles de tratamiento. La llamada sólo se hace por acción explícita, sin reintentos automáticos. Guía técnica: `docs/AUNEA_INTERNAL_AI_OLLAMA_LOCAL_SETUP_REVIEW_20261029.md`.

El servicio utiliza Structured Outputs y valida de nuevo todas las referencias recibidas. Un proveedor ausente o inválido detiene la operación; jamás se finge una propuesta IA. Los outputs del motor oficial siguen siendo server-owned.

## QA técnico realizado
En la rama `work/as-is-ux-simplification-20260930`, GitHub Actions Acceptance Gate run **40911658235** sobre commit `0673c5327144e5ca7bfed62ee7c38eb5e7087168`:
- Backend: **350 passed** (1 warning).
- Frontend: **728 passed, 0 failed**.
- Browser UAT automatizada: **SUCCESS**.
- Regresiones añadidas: `test_internal_ai_pilot_review.py`, `internal-ai-pilot-review.test.cjs`.
- Segundo proveedor local Ollama incorporado el mismo 29/10, con regresión `test_internal_ai_ollama_review.py`. Gate actualizado en CI posterior; no implica prueba de inferencia real en Windows.
- CODE_BLOCK_INDEX actualizado con bloques 190/191/192/193.

**No probado**: llamada real a proveedor, calidad semántica de propuestas, validación humana de los cuatro pasos actuales ni UAT completa Windows/Edge/Chromium después de usar el botón IA. El gate verde no certifica ninguno de esos puntos.

## Criterios para salida de REVIEW
1. Confirmar contrato de atribución intervención→paso→Pain/EconomicInput, y no-solapamiento antes de escenarios cuantitativos.
2. Incorporar persistencia/auditoría de propuestas y fuentes, tratamiento de errores y de outputs obsoletos bajo una fuente única.
3. Revisar política de tratamiento de datos, autenticación, autorización y presupuesto máximo; no usar datos de un cliente real con flags de prueba.
4. Validar precisión, citas, abstenciones, ausencia de valores inventados y conservación de decisiones humanas con fixtures y varias muestras reales autorizadas.
5. Completar UAT humana PG10→PG11→PG12, incluyendo guardado, reentrada, aprobación y cambios de snapshot.

**No se promocionan documentos canónicos, reglas de negocio ni main por esta entrega.** Esta prueba técnica es una base aislada para el diseño posterior.

## Actualización REVIEW 30/10/2026 — calidad consultiva y consolidación TO-BE

**Evidencia de UAT local posterior a la nota inicial:** el operador completó realmente las cuatro actividades sintéticas Levante con Qwen3 4B y obtuvo un DRAFT con IDs/citas válidas. La calidad era insuficiente: las cuatro proponían `Se mantiene`, predominaban las cautelas de QA y no se formulaban intervenciones/beneficios operativos útiles. Esta UAT valida el transporte y generación segmentada, **no la aceptación de la calidad consultiva**.

**Cambios implementados en la rama REVIEW, no en canon:**
- Estabilidad: la autorización explícita se verifica en cada endpoint/actividad sin imponer otro `GET /api/tags` de 2 segundos entre llamadas CPU. El modelo/ventana de contexto se verifican localmente y `/api/chat` identifica errores operativos reales. `keep_alive=5m` en pasos y consolidación; sin nube, sin fallback, no cambia los motores.
- Contexto: cada actividad recibe el paso íntegro, orden compacto del proceso y fuentes explícitamente enlazadas, junto a índices técnicos del resto de fricciones/riesgos con sus vínculos. Un ID no enlazado no prueba que una fricción afecte a ese paso: el backend rechaza citas espurias.
- Instrucciones: `problem_resolved` expresa una oportunidad de mejora; `rationale` pide **Acción propuesta / Resultado esperado / Justificación** (texto dentro del campo existente); `limitations` enumera solo validaciones de viabilidad. Una carencia de medidas reales no impide sugerir mejoras como **hipótesis**, y un `Se mantiene` justificado es permitido.
- Consolidación: contrato efímero `PilotAIConsolidationRequest`, nuevo `internal_ai_review.py`, endpoint local `/v1/internal-ai/tobe-review` y revisión de coherencia/citas/decisiones con Ollama. La revisión particiona lotes por bytes sin truncar propuestas, comprueba tokens reales reportados cuando hay respuesta y nunca aprueba una salida. Los lotes múltiples añaden aviso explícito de revisión humana de dependencias entre lotes. Detecta falta de intervención/resultado y señaliza si todas las actividades permanecen iguales pese a fricciones con vínculo.
- Interfaz: PG11 ahora presenta Área de mejora, Intervención propuesta, Resultado esperado, Justificación, controles, fuentes y condiciones por validar. Muestra observaciones de consolidación, y distingue revisión automática de aprobación humana. Mantiene todas las propuestas por actividad si falla la consolidación; un reintento no repite segmentos. Tras `Aplicar a campos vacíos` mantiene el panel explicativo para consulta durante la sesión, sin sobreescribir campos editados por el consultor.
- Contrato de seguridad: no se añade un campo persistente nuevo para `resultado esperado`. **La narrativa y justificación del modelo son efímeras en el panel IA**, mientras el TO-BE vigente solo almacena los campos originales; su persistencia estructurada exige una modificación posterior de owner/canon. No falsear que PG12/14 puedan consumir un beneficio que todavía no es output canónico.

**Alcance de pruebas:** backend unitario de segmentación, vínculos y consolidación; frontend comportamiento de avances, reintentos y panel; browser UAT automatizada de regresión. Falta una nueva **UAT real de calidad con Ollama Windows** tras estas instrucciones y revisión; probar Levante y un proceso de otro sector, comprobar que genera intervenciones útiles y resultados cualitativos prudentes, validar branching, ausencia de ahorros inventados y control del tiempo/memoria de cada lote. No usar datos reales de cliente con la habilitación local de pruebas.

**Límites:** no se obtiene porcentaje interno exacto de inferencia (sigue `stream:false`), no hay persistencia durable del progreso al recargar y el número de tokens previo al envío no es medido con tokenizer. El objetivo de 4K de entrada se verifica contra `prompt_eval_count` solo tras recibir respuesta; previo existe control por bytes conservador. El monitor de actividad muestra estados reales N/M, no porcentaje simulado. El motor oficial de economía, riesgo, pricing y recomendación sigue siendo determinista y server-owned.

**Gobierno:** todos los cambios permanecen REVIEW; no alteran DF001–DF100, productos, precios, KPIs ni estados de aprobación. No se promueve a CANONICAL hasta superar UAT funcional de calidad y decidir el almacenamiento correcto de resultados esperados.

