# AUNEA Internal — reconciliación modular de v1.0.4

Status: REVIEW / reconciliación técnica; V1 funcional pendiente
Date: 2026-09-09

## Fuente de verdad

El frontend vive en GitHub. Las reglas de negocio no.

La captura canónica procede de:
`AUNEA_DIAGNOSTIC_DATABASE_v0.9_DIAGNOSTIC_MASTER_V1.xlsx`

Drive conserva el workbook canónico y el artefacto ZIP de revisión. El frontend consume una exportación estructurada del Diagnostic Master para construir la UI, pero no define preguntas, pricing, recommendation, economics ni risk rules.

## Qué incluye v1.0

- CRM local de revisión: empresas, contactos y estado comercial.
- Estudios/engagements históricos por contacto y empresa.
- Biblioteca de proyectos vinculados a engagements.
- Diagnóstico de 90 minutos schema-driven.
- 100 campos canónicos en español con objetivo, control, ejemplo, requiredness y reutilización.
- Editor estructurado de pasos del proceso.
- Fricciones vinculadas a uno o varios pasos.
- Revisión visual del AS-IS con edición in situ y confirmación.
- Captura estructurada de riesgos e inputs económicos.
- Results / Recommendation / Scenarios / Quote preparados para consumir backend v1.1.
- Guardado local explícito y auditoría básica de cambios.

## Regla de cálculo

El navegador no replica los motores de negocio. Pain, Economics, Risk, Recommendation, Scenario y Pricing oficiales sólo se muestran cuando se reciben de AUNEA Backend.

## Ejecutar localmente

```bash
python -m http.server 5180
```

Abrir `http://localhost:5180`.

En el paquete distribuido existe también `run.bat` para Windows.

## Estado

v1.0 es `REVIEW`, no `PRODUCTION`. Falta QA funcional con usuario, conexión completa del contrato de captura al backend, persistencia productiva/AUNEA Operations, autenticación y pilotaje real de los 90 minutos.

## Runtime vigente de esta rama

`index.html` carga en orden `app-core.js`, `app-diagnostic-fields.js`, `app-process-editor.js`, `app-results.js`, `app-shell.js` y el arranque mínimo `app.js`. No hay JS ni schema embebidos en HTML. El único Diagnostic Master runtime es `data/diagnostic-master.min.json`, contrastado con el activo CANONICAL de Drive.

Se conservan las correcciones `pageTop`/`statusBadge` y el bloqueo de Recommendation/Pricing de la baseline aceptada. La reconciliación no equivale al cierre de REQ-DIAG/UX/UAT ni cambia el master a v1.1.

Desde la raíz del repositorio, en un terminal:

```sh
cd 3_SYSTEM/backend
python -m pip install -e ".[test]"
python -m uvicorn aunea_backend.api:app --host 127.0.0.1 --port 8000
```

En otro terminal desde la raíz:

```sh
python -m http.server 5180 --bind 127.0.0.1 --directory 3_SYSTEM/frontend
```

Abrir `http://localhost:5180`. Crear empresa en Contactos, crear contacto y pulsar Crear estudio.

Pruebas: `python -m pytest -q` en backend; `npm ci && npm test` en frontend. La prueba frontend ejecuta los recursos HTTP, las once páginas, CRM, pasos, fricciones y guardado en un DOM aislado. No sustituye Chromium ni UAT integral.

Bloqueo de datos verificado: NR03/DF050 exige derivar canales desde pasos, pero Process Step Model v1 no incluye ese atributo; DF005 referencia REF_COUNTRY_ISO3166 ausente. Requirements OPEN_GAPS los sitúa en el candidato v0.9.1/Master v1.1 pendiente de publicación/promoción. No se activa ese candidato como canónico de forma implícita.
