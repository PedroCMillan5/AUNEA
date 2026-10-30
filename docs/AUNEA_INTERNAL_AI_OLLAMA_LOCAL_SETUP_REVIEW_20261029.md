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
   $env:AUNEA_OLLAMA_MODEL = "aunea-qwen3-4b:latest"
   cd 3_SYSTEM/backend
   python -m uvicorn aunea_backend.api:app --host 127.0.0.1 --port 8010
   ```
4. Comprobar en `http://127.0.0.1:8010/v1/internal-ai/status` que aparezca `provider: ollama`, `status: AVAILABLE`. El frontend debe conectarse a ese mismo backend local.
5. En el TO-BE DRAFT de un estudio **sintético y confirmado**, usar «Preparar propuesta con IA»; revisar fuentes y aceptar explícitamente las sugerencias antes de guardar. No generar un informe como si fuera un caso real.

Para desactivar la IA: `$env:AUNEA_INTERNAL_AI_ENABLED = "0"` y reiniciar el backend. La autorización exige un acto consciente; no debe ponerse a 1 con información de clientes reales sin comprobar base jurídica y controles de acceso.

## Incidencia 30/10 — arranque con 16 GB RAM

Al ejecutar `ollama run qwen3:4b-instruct` en Windows CMD, el motor informó que necesitaba reservar 19.327.352.832 bytes (18 GiB) para la KV cache, más que los 16 GB físicos disponibles. Es un error de contexto al inicializar, no una prueba de que los pesos de 2,5 GB no puedan ejecutarse en ese equipo.

**Corrección de prueba en CMD (no modifica el modelo original)**:
```cmd
echo FROM qwen3:4b-instruct > "%TEMP%\Modelfile-aunea"
echo PARAMETER num_ctx 4096 >> "%TEMP%\Modelfile-aunea"
ollama create aunea-qwen3-4b -f "%TEMP%\Modelfile-aunea"
ollama run aunea-qwen3-4b
```
Si aún falla, repetir con `PARAMETER num_ctx 2048` y revisar memoria disponible/cargas. No aumentar contexto hasta que el arranque y las pruebas sean estables.

En el adaptador del backend (`internal_ai_ollama.py`) se reduce el perfil inicial de `num_ctx=16384` a `4096` y `num_predict=2048`. Esto **no** garantiza que quepa el expediente completo en un solo contexto: si la entrada y el esquema de salida superan la capacidad disponible, la siguiente iteración debe diseñar segmentación validada por paso y rechazar cualquier resultado truncado. La respuesta generada sigue requiriendo revisión humana.

Para probar el alias con AUNEA, usar `AUNEA_OLLAMA_MODEL=aunea-qwen3-4b:latest` en el proceso backend local. El servidor Ollama continúa en `127.0.0.1:11434` y AUNEA en `127.0.0.1:8010`. El cambio no crea costes API.

## Incidencia 30/10 — petición de inferencia HTTP 503 pese a estado AVAILABLE

En la UAT real de Windows/Visual Studio Code, el endpoint de estado devolvió `AVAILABLE` y la UI `Preparar propuesta con IA` alcanzó el backend, pero la generación retornó HTTP 503 con el mensaje genérico «Ollama local no pudo completar la propuesta». **El 503 no acredita por sí solo la causa**: puede proceder de error HTTP del motor local, memoria, tamaño de contexto o timeout. El adaptador anterior ocultaba el detalle útil.

Corrección REVIEW en `internal_ai_ollama.py`: traducción controlada de los errores del proveedor local (sin mostrar trazas ni prompt ni datos del cliente): memoria insuficiente, contexto excedido, esquema JSON rechazado, modelo no encontrado, timeout de 240 s, interrupción de red u otro HTTP concreto. La interfaz PG11 conserva el mensaje hasta nueva solicitud. Las pruebas simulan los casos HTTP 500 con OOM, HTTP 400 por contexto y timeout y verifican que los cuerpos no clasificados no filtran datos.

**Operación**: tras actualizar la rama de GitHub en VS Code con cambios locales protegidos, reiniciar el backend Python para cargar el adaptador nuevo; mantener las variables del proveedor Ollama y modelo `aunea-qwen3-4b:latest`. Recargar TO-BE y repetir una sola vez sobre el expediente sintético. Si devuelve «ventana de contexto», la decisión de producto es analizar el estudio por segmentos con fuentes y validación, no ampliar `num_ctx` más allá de la RAM disponible ni ocultar truncamientos. El estado `AVAILABLE` verifica disponibilidad del servidor/modelo, **no** generación válida.

## Prueba 30/10 — ventana opt-in de 24K para el caso sintético Levante

Evidencia real del fallo anterior, aportada por el operador desde Ollama Windows:
`request (17739 tokens) exceeds the available context size (4096 tokens)` (HTTP 400 del servidor local; AUNEA lo traduce a 503). Ollama pudo cargar el modelo con `num_ctx=4096`, KV cache 576 MiB y CPU compute buffer ~86 MiB. **Esta prueba no demuestra OOM**; prueba un rechazo por tamaño del contexto antes de generar.

**Cambio acotado a REVIEW**: el backend admite `AUNEA_OLLAMA_NUM_CTX` desde 1024 hasta 24576 (24K de prueba; exactamente 24.576 tokens). Mantiene 4096 si la variable no se fija, para evitar picos de memoria involuntarios en máquinas de 16 GB. La opción `num_ctx` se envía expresamente en la petición `/api/chat` y prevalece para esa llamada sobre el Modelfile local de 4096. El estado `/v1/internal-ai/status` informa de `num_ctx` configurado; NO certifica RAM disponible ni que la generación se complete. Sigue vigente `num_predict=2048`, salida estructurada y revisión humana. Se incorpora también `AUNEA_OLLAMA_TIMEOUT_SECONDS`, de 60 a 900, con 240 por defecto, para poder ensayar entradas largas en CPU sin reducir la petición silenciosamente. Configuración inválida → UNAVAILABLE, sin fallback ni generación.

**Ejemplo para el ensayo local exclusivo con datos sintéticos**, desde la terminal PowerShell de `3_SYSTEM/backend` con el entorno virtual activo:

```powershell
$env:AUNEA_INTERNAL_AI_PROVIDER = "ollama"
$env:AUNEA_INTERNAL_AI_ENABLED = "1"
$env:AUNEA_INTERNAL_AI_DATA_AUTHORIZED = "1"
$env:AUNEA_OLLAMA_MODEL = "aunea-qwen3-4b:latest"
$env:AUNEA_OLLAMA_NUM_CTX = "24576"
$env:AUNEA_OLLAMA_TIMEOUT_SECONDS = "900"
python -m uvicorn aunea_backend.api:app --host 127.0.0.1 --port 8010
```

Verificar `http://127.0.0.1:8010/v1/internal-ai/status`, que debe incluir `"num_ctx":24576`, con el modelo seleccionado y estado AVAILABLE. Después probar una sola vez en TO-BE, sin aplicar al borrador hasta revisar el contenido. Para revertir a 4K y timeout estándar: asignar `"4096"` a `AUNEA_OLLAMA_NUM_CTX` y `"240"` a `AUNEA_OLLAMA_TIMEOUT_SECONDS`, y reiniciar backend.

**Riesgo y limitación**: ampliar el contexto de 4096 a 24576 multiplica aproximadamente por seis la KV cache observada en ese modelo (576 MiB → ~3456 MiB), además de los pesos, buffers y la RAM utilizada por Windows. No se ha verificado físicamente el consumo final ni la calidad en el portátil. Si hay OOM, detener, volver a 4096 y diseñar segmentación. Tampoco se garantiza que el JSON de todas las actividades quepa en 2048 tokens o que el modelo razone con fiabilidad sobre 17.739 tokens. El camino de producto sigue siendo preparar y segmentar contexto con cobertura de fuentes. Ningún dato de cliente real debe usarse antes de revisión de privacidad y autorización.

## Coste y rendimiento
El modelo local no incurre en una tarifa por token o llamada a una API externa. Sí consume RAM, CPU, almacenamiento y electricidad del equipo, y su calidad debe evaluarse. Con 16 GB RAM e Intel i5-1145G7, puede ser lento; la descarga del modelo publicado ocupa alrededor de 2,5 GB. Se han limitado los presupuestos de contexto y salida, evitando la generación ilimitada. No se certifica rendimiento ni calidad hasta ejecutar el modelo físico.

## QA
Pruebas con respuesta Ollama simulada (sin conexión externa): disponibilidad desactivada, respuesta estructurada, preservación de IDs, rechazo de referencias no existentes, rechazo de modelo cloud y ausencia de fallback a OpenAI.
- `3_SYSTEM/backend/tests/test_internal_ai_ollama_review.py`
- `CODE_BLOCK_INDEX.md`: AUNEA-BE-INTERNAL-AI-OLLAMA-194, AUNEA-UAT-INTERNAL-AI-OLLAMA-194.
- QA GitHub Actions **Acceptance Gate 40918259145, SUCCESS** (commit `3c3684f616ea16947ad121042c8bc54f470172c9`): backend **356 passed, 1 warning**, frontend **728 passed, 0 failed**, browser UAT **SUCCESS**. Incluye la regresión Ollama simulada y auditoría de Block_ID.
- Sigue pendiente una UAT con inferencia real y aceptación humana del TO-BE en el ordenador Windows del operador.
**Actualización 30/10:** el usuario ejecutó el modelo local en CLI y recibió una respuesta general en español; también confirmó disponibilidad del modelo y un intento real desde el frontend (HTTP 503 durante generación). Aún **no existe** UAT correcta de generación TO-BE con revisión humana.

Fuentes técnicas: https://docs.ollama.com/windows, https://docs.ollama.com/api/chat, https://docs.ollama.com/api/tags, https://ollama.com/library/qwen3:4b-instruct.
