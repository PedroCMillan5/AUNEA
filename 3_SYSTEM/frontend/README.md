# AUNEA Internal V1 — candidato funcional en REVIEW

Status: REVIEW / automated acceptance PASS; native browser/Windows UAT pending
Date: 2026-09-10

## Fuente de verdad

El frontend y el backend ejecutables viven en GitHub. La interfaz no gobierna reglas de negocio.

La captura canónica vigente procede de:
`AUNEA_DIAGNOSTIC_DATABASE_v0.9.1_DIAGNOSTIC_MASTER_V1.1.xlsx`

Drive ID: `1qKjbJviEvUQnHOGCHy4VkIx0dbdkoJj1`

El runtime efectivo conserva la proyección aceptada y aplica únicamente el delta gobernado de Master v1.1 mediante `app-schema-v11.js`. El resultado validado contiene 100 campos, 25 dominios, 249 países y 20 atributos de Process Step, incluido `communication_channels`.

## Qué incluye esta rama

- CRM local de revisión: empresas y contactos vinculados a engagements y proyectos.
- Diagnóstico de 90 minutos schema-driven en español.
- Renderer canónico para controles estructurados; un control estructurado desconocido no degrada silenciosamente a texto libre.
- No-Reask NR01–NR15: CRM, roles, herramientas, artefactos, canales, tiempos, aprobaciones, excepciones y fricciones se reutilizan o derivan cuando corresponde.
- Editor AS-IS con los 20 atributos canónicos de Process Step.
- Tiempo activo, espera y retrabajo separados.
- Fricciones vinculadas obligatoriamente a al menos un paso; Pain_ID derivado internamente.
- Captura estructurada de riesgos e inputs económicos.
- Adapter frontend → backend sin cálculo oficial de negocio en JavaScript.
- Secuencia server-owned: Pain → Economics → Risk → Recommendation → Pricing → Scenario.
- Modo Sesión y Modo Interno sobre el mismo estado y la misma lógica.
- Persistencia local recuperable, autosave y backup/restauración JSON.
- UAT visible one-click con 5 fixtures canónicos y 26 assertions expected/actual/PASS/FAIL/refs, ejecutadas de forma aislada.

## Regla de cálculo

Pain, Economics, Risk, Recommendation, Pricing y Scenario oficiales se calculan exclusivamente en AUNEA Backend. El navegador prepara inputs, llama al backend y representa outputs. La recomendación óptima no se sobrescribe al comparar escenarios.

## Ejecutar localmente

Desde la raíz del repositorio, instalar y arrancar backend:

```sh
python -m pip install -e 3_SYSTEM/backend
python -m uvicorn aunea_backend.api:app --host 127.0.0.1 --port 8000
```

En otro terminal, desde la raíz:

```sh
python -m http.server 5180 --bind 127.0.0.1 --directory 3_SYSTEM/frontend
```

Abrir `http://localhost:5180`.

Recorrido mínimo: Contactos → empresa → contacto → crear estudio → Diagnóstico → Proceso y fricciones → Resultados. Desde la cabecera se puede alternar entre Modo Sesión y Modo Interno. La página `UAT / QA` sólo aparece en Modo Interno.

## QA automatizada vigente

El workflow `AUNEA V1 Acceptance Gate` ejecuta backend y frontend sobre el mismo commit.

Último gate automatizado antes de esta actualización documental:

- Frontend: 23/23 PASS.
- Backend: 22/22 PASS.
- UAT canónica incluida en backend: 5 fixtures / 26 assertions / 26 PASS / 0 FAIL.
- Runtime frontend: carga HTTP de módulos, CRM, No-Reask, cambio Sesión/Interno, Process Steps, Frictions, Pain derivado, persistencia y recovery snapshot.

Los tests DOM/HTTP no sustituyen una comprobación visual real en Chromium/Edge ni la prueba nativa final en Windows.

## Estado de promoción

Esta rama permanece en `REVIEW`. No se debe fusionar a `main` ni declarar `PRODUCTION` hasta completar el gate visual/nativo final de la nueva V1. El histórico Windows-validado de v1.0.4 demuestra la baseline anterior, pero no sustituye la validación visual de los módulos incorporados ahora.
