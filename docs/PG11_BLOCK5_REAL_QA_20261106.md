# AUNEA Internal PG11 — Bloque 5: validación integral (REVIEW)

Fecha: 06/11/2026 · Rama: `work/as-is-ux-simplification-20260930`.
Clasificación: QA y evidencia de implementación existente; **no implica promoción a CANONICAL, PILOT ni PRODUCTION**.

## Fuentes canónicas y contrato

Revisados `00_AUNEA_INTERNAL_MASTER_INDEX` v1.59, `PROJECT_RULES.md` v1.7, DEC-034/050/052/055, `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14 y `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL` v1.7. El motor sigue consumiendo exclusivamente el AS-IS confirmado y diagnóstico correspondiente. Las propuestas de IA son borradores con aprobación humana obligatoria. No se altera el modelo canónico, los DF, el pricing ni se envían datos reales.

## Criterios de aceptación de bloque 5

| Dimensión | Prueba / fuente | Criterio |
|---|---|---|
| Procesos heterogéneos | 1, 2 y 5 fuentes deterministas; registro de facturas y solicitud cliente con Ollama real | No se limita el total global; se permiten 0, 1 o varias intervenciones justificadas y un lote acotado por respuesta |
| Integridad | JSON completo, frases, referencias y control `done_reason` | Sin frases recortadas aprobadas y sin IDs que no estén en el AS-IS confirmado |
| Restricciones | Aprobación humana, roles, auditoría, privacidad, continuidad y preferencia por herramientas existentes | Conflicto `INCOMPATIBLE` sólo con límite declarado; preferencia `CONDITIONED`; capacidad técnica `UNVERIFIED` |
| Alternativas | Propuesta inicialmente bloqueada por límite real | Conservar propuesta incompatible y su fuente; alternativa diferente y verificada como `CONDITIONED` o declarar que no existe alternativa justificable |
| Persistencia | HTTP 503 tras un lote, fallo de `saveState`, recarga | Conservar recomendaciones anteriores; reintentar sólo los pendientes; rollback ante fallo de escritura |
| Revisión individual | Contrato PG11 y Chromium UAT | Propuestas y vínculos globales de sólo lectura; nunca escribir TO-BE ni aprobar automáticamente |
| Recurso real | CI Linux con Ollama en `127.0.0.1:11434`, Qwen3 4B instruct (alias local `aunea-qwen3-4b`) | Registrar versión/contexto, resultados reales, fallos, tiempos e informe JSON; datos **sólo sintéticos** |
| Entorno usuario | PowerShell Windows, modelo local exacto `aunea-qwen3-4b:latest` | Verificar con la máquina del consultor; la prueba en CI **no equivale** al pilotaje local en 16 GB de RAM |

## Activos ejecutables

- `3_SYSTEM/backend/tests/test_pg11_block5_matrix.py` — matriz determinista, sin Ollama.
- `3_SYSTEM/backend/tests/pg11_live_ollama_gate.py` — prueba de inferencia real con dos procesos sintéticos y conflicto de aprobación, con informe JSON y sin datos de clientes.
- `.github/workflows/aunea-pg11-live-ollama-uat.yml` — despliega Ollama sólo en runner aislado y crea el alias técnico local a partir de `qwen3:4b-instruct`.
- `3_SYSTEM/backend/scripts/pg11_block5_local_uat.ps1` — reproducción local con el modelo instalado por el consultor, sin descarga ni alteración de fuente.
- Acceptance Gate normal de GitHub — backend, frontend y Chromium, incluyendo persistencia, navegación, acciones de campos y reintento.

## Resultado y límites actuales

**El estado de la UAT real se determina por GitHub Actions y el JSON generado, no por crear el workflow.**
Live workflow: https://github.com/PedroCMillan5/AUNEA/actions/runs/42241254540.
Acceptance Gate final de rama: consultar GitHub Actions en el HEAD vigente.
El test de inferencia real en CI es una prueba de capacidades del modelo en condiciones sintéticas y hardware distinto. Un formato correcto y un resultado técnicamente viable NO acreditan beneficios económicos, integraciones ERP/CRM reales, que una recomendación sea óptima ni aprobación humana de la propuesta.

**Gates pendientes según el resultado:** si la inferencia falla, documentar la fuente de fallo y corregir sin perder datos; en cualquier caso permanece pendiente ejecutar el script PowerShell en el Windows del consultor para comprobar memoria, latencia y configuración real. No elevar a PRODUCTION sin ese pilotaje.

El alcance no incluye iniciar PG12, reescribir PG11, alterar funciones comerciales ni construir otro producto.
