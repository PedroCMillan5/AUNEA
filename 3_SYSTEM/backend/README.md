# AUNEA Backend v0.8

Backend determinista para AUNEA Internal. Implementa la especificación cerrada en `AUNEA_DIAGNOSTIC_DATABASE_v0.8_PRE_FRONTEND_RULES_COMPLETE.xlsx`.

## Principios
- Drive/workbook v0.8 = especificación humana y fuente de reglas versionada.
- `data/registry_v08.json` = snapshot runtime consumible por código de las tablas canónicas necesarias.
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
Backend v0.8 funcional para el contrato pre-frontend. Los pilotos reales, la calibración de esfuerzo y la persistencia productiva externa (Airtable/DB) son capas de despliegue/validación, no reglas pendientes del engine.
