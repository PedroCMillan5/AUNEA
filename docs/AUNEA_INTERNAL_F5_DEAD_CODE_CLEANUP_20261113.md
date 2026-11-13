# AUNEA Internal — F5 · Limpieza técnica conservadora

**Fecha:** 13/11/2026
**Estado:** F5 CLOSED TÉCNICO / REVIEW, no merge en `main`, sin declarar producto listo.
**Fuente:** PROJECT_RULES.md; Master Index vigente v1.63; Simulator CANONICAL v1.14; Architecture Contract CANONICAL v1.7; DEC-050/052/055/056; Plan F0–F6.

## 1. Auditoría de referencias y propietarios

- Se ha revisado el `module-manifest.json`: **50 módulos runtime** declarados. El gate `tests/module-manifest.test.cjs` verifica que todos existan, que no haya módulos JS activos sin declarar, que los 50 se carguen una sola vez desde `index.html` y en el orden definido, y que sus Block_ID estén presentes.
- Se inspeccionaron las declaraciones `function` de esos 50 módulos buscando redefiniciones del mismo nombre en un mismo archivo. En `ui/renderer.js` se encontraron **dos pares repetidos literalmente**: `linkedStepSingle` y `linkedStepMulti`. No se hallaron otras redeclaraciones de este patrón tras la corrección. El chequeo está ahora automatizado en `tests/module-manifest.test.cjs`.
- Esta comprobación **no es un análisis exhaustivo del alcance de todas las funciones, imports dinámicos, callbacks, nombres de propiedad u otros estilos de declaración**. No sirve para borrar por ausencia de referencias léxicas. Los candidatos inseguros se conservan.

## 2. Limpieza implementada

- `ui/renderer.js`: retirada exclusivamente la primera copia de `linkedStepSingle` y `linkedStepMulti`. El segundo par era idéntico y permanece como único propietario efectivo. **−7 líneas, −564 caracteres**.
- `tests/renderer-v1.test.cjs`: regresión para exigir una sola declaración por función y conservar atributos HTML/estado marcado.
- `tests/module-manifest.test.cjs`: gate adicional contra redeclaraciones a nivel de archivo.
- Sin nuevos campos, reglas, formularios, precios, motores, cálculos ni estilos. Se preservan los nueve FROZEN y su referencia técnica fija. Ninguna ruta de producto se ha archivado porque no se ha demostrado que sea obsoleta.

## 3. Evidencia

- Refactor: commit `70f4e349cc2c463f01787e9b184358dbb05fa427`.
- Tests: commits `6864437cfc4f4f02273cb3d2edc05ca41332fa61` y `22bbd653fa7ef3e9e9df9c05ff7b73ab2d79c214`.
- Acceptance Gate posterior al test F5 corregido: [43438492322](https://github.com/PedroCMillan5/AUNEA/actions/runs/43438492322) SUCCESS (backend, frontend, Chromium y publicación). Otros commits posteriores incorporan la extensión F6 Windows/Edge y su índice; se validan por separado.

## 4. Resultado y límite

F5 CLOSED TÉCNICO significa que se eliminó código realmente redundante y se introdujeron controles de no-regresión sobre los propietarios y el manifiesto. **No se afirma que todos los posibles fragmentos de código inactivo del repositorio estén identificados.** Una eliminación adicional exige demostrar alcance y consumidores, no sólo contar apariciones.

La siguiente fase F6 exige QA integral, recorridos reales automatizados, evidencia FROZEN y validación manual antes de promover el producto. Ningún cambio de DECISIONES/ROADMAP; sin merge a main.
