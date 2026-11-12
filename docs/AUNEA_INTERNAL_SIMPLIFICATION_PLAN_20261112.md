# AUNEA Internal — Plan de reducción y simplificación técnica

Estado: EN EJECUCIÓN — Fase 0 (inventario inicial; no equivale a cierre de auditoría)
Fecha: 2026-11-12
Rama objetivo: `work/as-is-ux-simplification-20260930`
Ámbito: reducción y simplificación del software existente. Sin nuevas funciones ni cambios de reglas.
Naturaleza: plan técnico de trabajo, **no** fuente canónica de reglas de negocio ni promoción a PRODUCTION.

## 1. Fuentes y precedencia
- Master Index gobernante Drive `00_AUNEA_INTERNAL_MASTER_INDEX` v1.59 (27/10/2026); su espejo GitHub no gobierna.
- `PROJECT_RULES.md` v1.7; build order: datos → reglas/contratos → interfaz → entregables.
- `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14: owner único, snapshots y reglas server-owned.
- `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL_v1.7` (Drive, identificar las decisiones afectadas antes de tocar código).
- `module-manifest.json`: 44 scripts y orden contractual; el runtime comparte ámbito global.
- `FROZEN_PAGES.json`, `CODE_CONVENTIONS.md`, `CODE_BLOCK_INDEX.md` y pruebas aplicables.
- Antes de una modificación de código: contrastar también `DECISIONES_AUNEA` vigentes (en particular ownership, UI FROZEN y gobierno del cambio).

## 2. Propósito / límites
Reducir duplicación efectiva de CSS, HTML, eventos y lógica, mejorar cohesión y reutilización, sin reducir comportamiento ni romper cargas, snapshots, datos, resultados ni regresiones. No medir éxito solamente en líneas. No añadir frameworks, migraciones masivas, fuentes de verdad nuevas, ni rediseño creativo.

## 3. Línea base inicial verificable (lectura de la rama, 12/11/2026)
| Archivo | Líneas aproximadas |
| --- | ---: |
| `ui-system.css` | 5.041 |
| `pages/tobe.js` | 2.545 |
| `pages/results.js` | 1.592 |
| `domain/analysis-workbench.js` | 661 |
| `domain/tobe-transactions.js` | 586 |
| `styles.css` | 285 |
| `ui/shell.js` | 247 |
| `pages/comparison.js` | 148 |
| `domain/tobe-model.js` | 128 |

Suma de los tres mayores: **9.178 líneas**. En `ui-system.css`, un conteo exploratorio identificó aprox. **2.484 bloques de selectores** y **263 selectores con apariciones múltiples**. Estas cifras son indicios, NO 263 errores: incluyen posibles media queries, variantes y overrides válidos; comprobar cascada, contexto y uso antes de eliminar.

Otras observaciones de lectura:
- `pages/tobe.js` incluye captura DOM y edición de borrador; candidato a adelgazar su composición, sin mover ownership de operaciones de negocio.
- `pages/results.js` aglutina diagnóstico, recomendaciones, escenarios y cotización; revisar responsabilidades y duplicación antes de separar.
- `domain/tobe-transactions.js` ya centraliza previsualización y aplicación/undo; preservar ese owner y sus restricciones.
- `styles.css` define tokens/controles y `ui-system.css` layout; no crear tercera fuente de estilos genéricos.
- El backend es propietario de los cálculos oficiales: jamás trasladar fórmulas al navegador.
- El inventario de todo el repositorio, sus líneas totales y el uso real de clases sigue PENDIENTE.

## 4. Mapa de responsabilidades objetivo (sin crear aún archivos)
```
core/state + services/schema/backend-client/persistence (existentes)
        ↓
domain/result-context, tobe-model, tobe-transactions,
       process-suggestions, output-review (existentes)
        ↓
ui/renderer + styles.css + ui-system.css + shell.js (existentes)
        ↓
pages/results, tobe, comparison y otras páginas (existentes)
```
Los componentes compartidos sólo se extraerán cuando haya duplicación funcional demostrada. Conservar Block_ID de cada responsabilidad y el orden del manifiesto. No introducir `work-components.js` ni `work-pages.js` por anticipado.

## 5. Fases y gates
- **F0 Inventario:** registrar archivos activos vs archivados, tamaño, dependencias/consumidores, selectores repetidos y páginas FROZEN; identificar candidatos con prueba de uso. **Gate:** baseline completa y matriz de riesgos. Estado: INICIADA.
- **F1 CSS transversal:** eliminar sólo reglas duplicadas o sobrescritas sin efecto, respetando especificidad, orden y responsive. **Gate:** comparación visual de todas las pantallas afectadas, FROZEN intactas.
- **F2 UI compartida:** reutilizar controles/tarjetas/modales realmente equivalentes; preservar teclado, accesibilidad y estados. **Gate:** DOM/acciones equivalentes y regresión.
- **F3 Páginas:** simplificar `tobe.js` y `results.js` por partes, manteniendo funciones existentes hasta demostrar equivalencia. **Gate:** journeys completos y snapshots estables.
- **F4 Dominio:** centralizar derivaciones y validaciones duplicadas, nunca resultados server-owned. **Gate:** contratos, invariantes, pruebas de errores y undo.
- **F5 Limpieza:** retirar código muerto demostrado, mantener histórico en ARCHIVED cuando proceda, revisar manifiesto y Block_ID. **Gate:** auditoría de referencias.
- **F6 QA / cierre:** CI, UAT navegador Windows, persistencia, AS-IS→TO-BE→comparación→escenarios→revisión→entregables, informes antes/después. **Gate:** no regressions; doc/índices sincronizados cuando aplique.

## 6. Método de cambios
1. Identificar owner, contrato canónico, Block_ID y consumidores.
2. Capturar baseline de tests y del comportamiento.
3. Cambiar un bloque pequeño y reversible por commit; no mezclar semántica con CSS.
4. Actualizar tests que verifican comportamiento, no sólo cadenas de código.
5. Ejecutar los QA aplicables y inspeccionar diferencias.
6. Si falla, no avanzar ni descartar trabajo ajeno: investigar y corregir.
7. Medir líneas netas, duplicaciones, acoplamiento, performance y riesgo; guardar la evidencia.
8. Sincronizar Master Index, DECISIONES, ESTADO, ROADMAP y BITACORA sólo si lo exige el tipo de cambio.

## 7. Primer backlog controlado
| ID | Acción | Riesgo | Estado |
|---|---|---|---|
| SIM-00 | Identificar SHA base y árbol activo, contraste con archivos archivados | Bajo | PENDIENTE |
| SIM-01 | Matriz de selectores repetidos en `ui-system.css`, uso y cascada | Alto (FROZEN) | DETECTADO, PENDIENTE CLASIFICAR |
| SIM-02 | Inventario de responsabilidades/DOM/eventos de `tobe.js` | Alto | DETECTADO, PENDIENTE |
| SIM-03 | Inventario de responsabilidades/DOM/eventos de `results.js` | Alto | DETECTADO, PENDIENTE |
| SIM-04 | Mapa de dependencias de estado → transacciones → resultados | Crítico | PENDIENTE |
| SIM-05 | Línea base de tests/QA nativa para cada cambio | Crítico | PENDIENTE |

## 8. Criterios de cierre
No declarar simplificación terminada por bajar líneas, cambiar apariencia o pasar tests aislados. Exigir: propietario único por dato/regla, comportamiento equivalente, cero regresiones conocidas, tests aplicables PASS, revisión FROZEN, inventario actualizado y evidencia de mejoras medibles. Los límites de líneas orientativos NO son reglas canónicas.

## 9. Registro de ejecución
- **12/11/2026:** comprobadas fuentes de Drive (Master Index v1.59, Simulator v1.14), reglas de repositorio, rama existente y manifiesto de 44 scripts. Inspección inicial de 12 archivos de frontend y conteo de selectores CSS. Publicación de este plan = inicio documental F0; no se ha modificado runtime, no se ha ejecutado CI ni se ha cerrado F0.

## 10. Ejecución posterior · 12/11/2026
- `be45b42ce9b4`: se eliminan cinco bloques CSS **idénticos** que aparecían repetidos dentro del mismo contexto, preservando la última declaración vigente. Reducción mecánica: 7 líneas / 469 caracteres. Conteo de llaves equilibrado.
- Se experimentó con fusionar seis pares de selectores contiguos (`4f434ef830f7`), pero una inspección posterior de los tests detectó aserciones que dependen de selectores literales. Se **revirtió íntegramente** esa fusión mediante `670d0f9e73b2`. El estado final conserva únicamente la reducción segura anterior.
- QA realizado en este entorno: lectura comparativa y análisis estático de CSS, verificación de duplicación y estructura. **No** se ha ejecutado `npm test`, QA backend ni UAT visual: el repositorio privado no está clonable en el contenedor y no se dispone de un runner remoto con ejecución manual accesible aquí. Los cambios permanecen REVIEW y requieren gate automatizado antes de cierre.
- F0: inventario inicial y dependencias canónicas contrastadas; inventario global exhaustivo y matriz de selectores usados aún pendientes. F1: iniciada reducción conservadora, NO cerrada. F2–F6: pendientes.
- Riesgo técnico encontrado: tests como `tests/design-system-common.test.cjs` dependen de cadenas exactas de selectores CSS. Unificar selectores puede preservar el CSS computado y aun así romper estos tests. Antes de mayor refactorizar, migrar cuidadosamente esas aserciones a equivalencia de CSS si el contrato lo permite.
