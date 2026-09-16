# Simulador AUNEA System

Clasificación: **HERRAMIENTA**.

El simulador se utiliza para analizar un proceso end-to-end y orquestar AS-IS → diagnóstico → TO-BE → solución → escenarios → entregables. No constituye por sí mismo un producto comercial.

## Gobierno funcional

Fuente CANONICAL en Drive: `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.7, Drive ID `1aPc5BIKBxvhsxJQIt-MkgQPEJWUX9PaJuxU2h2bh3SM`, ubicación `04_SYSTEM/01_METODOLOGIA`.

La v1.3 (`1l_RorZjsKztsCErnGzRdIevrPya5-kuQ3CFvPOIbbtI`) queda sustituida y no gobierna implementación. `PROJECT_RULES.md` v1.5 y el Master Index v1.15 registran la misma combinación vigente.

El Diagnostic Master v0.9.1 / Master v1.1 continúa gobernando preguntas, Field_ID, requiredness, branches, option sets, evidencia, write targets y engine consumers. El frontend no inventa ni recalcula reglas server-owned.

## Estado técnico en esta rama

- `AUNEA_System_Simulador_v3.html`: versión técnica legacy actualmente preservada. Su flujo de 5 pasos y lógica embebida no se consideran implementación del CANONICAL vigente.
- `interface-review/index.html`: **REVIEW de INTERFACE** para PG01–PG15. Materializa shell, jerarquía, layout, componentes, Modo Interno/Sesión, canvas, comparativas y responsive sin lógica de negocio, persistencia ni engines.

El prototipo REVIEW no sustituye v3 ni se promociona como vigente hasta integrar las fuentes canónicas y superar QA automatizada + UAT visual/nativa.

Precedencia: ante contradicción, las referencias visuales aprobadas del set 21+2 gobiernan por DEC-056 y el prototipo cede. La matriz 90 min lo registra explícitamente en su fila `DOC-10`.

El runtime único de AUNEA Internal vive en `3_SYSTEM/frontend/`. El prototipo es referencia de layout, no una segunda aplicación: se reconcilia dentro del runtime y se archiva al cerrar la implementación end-to-end.

Las versiones sustituidas se conservan en `3_SYSTEM/99_ARCHIVO_TECNICO/simulador/`.
