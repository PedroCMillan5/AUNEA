# AUNEA Internal — Ollama local como segundo proveedor de IA
**Estado: REVIEW / PILOT · 29/10/2026.** Dependencia: `AUNEA_INTERNAL_AI_PG10_PG11_PILOT_REVIEW_20261029.md`.

## Alcance y contrato
Se mantiene un único servicio IA y el mismo contrato de salida `PilotAIResult`. Proveedores admitidos por configuración explícita del backend: `openai` (compatibilidad) y `ollama` (ejecución local). `AUNEA_INTERNAL_AI_PROVIDER` elige uno; no existe fallback de pago. El selector no añade nuevos campos de negocio ni modifica los motores Pain, Economics, Risk, Recommendation, Pricing o Scenario.

El adaptador Ollama se conecta **únicamente a `http://127.0.0.1:11434`** del sistema que ejecuta el backend. No admite host proporcionado por usuario ni proxy HTTP, no descarga automáticamente modelos y rechaza etiquetas `-cloud`. Consulta `GET /api/tags` antes de utilizar `POST /api/chat`. Usa `stream=false`, `format` JSON schema, límite de respuesta, temperatura 0 y descarga de memoria tras la operación. El resultado atraviesa la misma validación de IDs, campos y snapshot que las respuestas OpenAI; sigue siendo DRAFT pendiente de aprobación.

**Limitación fundamental:** el ordenador con Ollama y el proceso Python del backend deben ejecutarse en el mismo equipo. Si el backend se aloja en GitHub Codespaces o una nube, su `127.0.0.1` no es el PC Windows del usuario. No habilitar el proveedor local por red pública ni abrir el puerto 11434 a Internet.

## Preparación en Windows (requiere ejecución local por el operador)
1. Instalar Ollama desde https://ollama.com/download y abrir la aplicación. Windows inicia la API local al quedar el servicio activo.
2. En PowerShell ejecutar:
   ```powershell
   ollama pull qwen3:4b-instruct
   ollama list
   Invoke-RestMethod http://127.0.0.1:11434/api/tags
   ```
3. En **la misma sesión de PowerShell que lanzará AUNEA Backend**:
   ```powershell
   $env:AUNEA_INTERNAL_AI_PROVIDER = "ollama"
   $env:AUNEA_INTERNAL_AI_ENABLED = "1"
   $env:AUNEA_INTERNAL_AI_DATA_AUTHORIZED = "1"
   $env:AUNEA_OLLAMA_MODEL = "qwen3:4b-instruct"
   cd 3_SYSTEM/backend
   python -m uvicorn aunea_backend.main:app --host 127.0.0.1 --port 8000
   ```
4. Comprobar en `http://127.0.0.1:8000/v1/internal-ai/status` que aparezca `provider: ollama`, `status: AVAILABLE`. El frontend debe conectarse a ese mismo backend local.
5. En el TO-BE DRAFT de un estudio **sintético y confirmado**, usar «Preparar propuesta con IA»; revisar fuentes y aceptar explícitamente las sugerencias antes de guardar. No generar un informe como si fuera un caso real.

Para desactivar la IA: `$env:AUNEA_INTERNAL_AI_ENABLED = "0"` y reiniciar el backend. La autorización exige un acto consciente; no debe ponerse a 1 con información de clientes reales sin comprobar base jurídica y controles de acceso.

## Coste y rendimiento
El modelo local no incurre en una tarifa por token o llamada a una API externa. Sí consume RAM, CPU, almacenamiento y electricidad del equipo, y su calidad debe evaluarse. Con 16 GB RAM e Intel i5-1145G7, puede ser lento; la descarga del modelo publicado ocupa alrededor de 2,5 GB. Se han limitado los presupuestos de contexto y salida, evitando la generación ilimitada. No se certifica rendimiento ni calidad hasta ejecutar el modelo físico.

## QA
Pruebas con respuesta Ollama simulada (sin conexión externa): disponibilidad desactivada, respuesta estructurada, preservación de IDs, rechazo de referencias no existentes, rechazo de modelo cloud y ausencia de fallback a OpenAI.
- `3_SYSTEM/backend/tests/test_internal_ai_ollama_review.py`
- `CODE_BLOCK_INDEX.md`: AUNEA-BE-INTERNAL-AI-OLLAMA-194, AUNEA-UAT-INTERNAL-AI-OLLAMA-194.
- QA GitHub Actions **Acceptance Gate 40918259145, SUCCESS** (commit `3c3684f616ea16947ad121042c8bc54f470172c9`): backend **356 passed, 1 warning**, frontend **728 passed, 0 failed**, browser UAT **SUCCESS**. Incluye la regresión Ollama simulada y auditoría de Block_ID.
- Sigue pendiente una UAT con inferencia real y aceptación humana del TO-BE en el ordenador Windows del operador.
**No se realizó una llamada al modelo del ordenador del usuario**: instalación, evaluación de calidad y aceptación real siguen pendientes.

Fuentes técnicas: https://docs.ollama.com/windows, https://docs.ollama.com/api/chat, https://docs.ollama.com/api/tags, https://ollama.com/library/qwen3:4b-instruct.
