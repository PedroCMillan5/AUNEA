# AUNEA Backend v1.1.1

Backend determinista para AUNEA Internal. El contrato humano gobernante de captura diagnóstica es `AUNEA_DIAGNOSTIC_DATABASE_v0.9.1_DIAGNOSTIC_MASTER_V1.1.xlsx` (Drive ID `1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1`).

## Principios
- Drive / Diagnostic Master v0.9.1 / Master v1.1 = especificación humana canónica vigente para captura diagnóstica.
- `data/registry_v08.json.gz.b64` conserva un nombre legacy de snapshot runtime/storage; ese nombre no convierte v0.8 en fuente humana canónica ni cambia la versión funcional del backend.
- El frontend captura inputs y overrides gobernados; no edita resultados derivados.
- Los engines son deterministas. La IA explicativa nunca modifica estados ni números.
- Capacity value, cash saving, waiting y direct loss permanecen separados.
- Cambiar N/I/coverage no genera automáticamente porcentajes de beneficio.

## API
- `GET /health`
- `GET /registry/status`
- `POST /v1/diagnose`
- `POST /v1/scenarios/compare`
- `GET /v1/audit/runs`

## Ejecución local
```bash
uvicorn aunea_backend.main:app --reload
```

## Tests
```bash
pytest -q
```

## Flujo ejecutado
`Structured capture -> Pain -> Economics -> Risk -> Recommendation -> Product/Pricing -> Scenario Comparator`

## Estado
Backend component v1.1.1. Las reglas y motores continúan server-owned y deterministas. Los pilotos reales, la calibración de esfuerzo y la persistencia productiva externa (Airtable/DB) son capas de despliegue/validación, no una autorización para reabrir o duplicar el contrato canónico de captura.
