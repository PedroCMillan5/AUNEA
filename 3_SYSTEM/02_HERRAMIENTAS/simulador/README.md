# Simulador AUNEA System

Clasificación: **HERRAMIENTA**.

El simulador se utiliza para analizar un proceso end-to-end y orquestar AS-IS → diagnóstico → TO-BE → solución → escenarios → entregables. No constituye por sí mismo un producto comercial.

## Gobierno funcional

Fuente CANONICAL en Drive: `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.3, Drive ID `1l_RorZjsKztsCErnGzRdIevrPya5-kuQ3CFvPOIbbtI`.

El Diagnostic Master v0.9.1 / Master v1.1 continúa gobernando preguntas, Field_ID, requiredness, branches, option sets, evidencia, write targets y engine consumers. El frontend no inventa ni recalcula reglas server-owned.

## Estado técnico en esta rama

- `AUNEA_System_Simulador_v3.html`: versión técnica legacy actualmente preservada. Su flujo de 5 pasos y lógica embebida no se consideran implementación del CANONICAL v1.3.
- `interface-review/index.html`: **REVIEW de INTERFACE** para PG01–PG15. Materializa shell, jerarquía, layout, componentes, Modo Interno/Sesión, canvas, comparativas y responsive sin lógica de negocio, persistencia ni engines.

El prototipo REVIEW no sustituye v3 ni se promociona como vigente hasta integrar las fuentes canónicas y superar QA automatizada + UAT visual/nativa.

Las versiones sustituidas se conservan en `3_SYSTEM/99_ARCHIVO_TECNICO/simulador/`.
