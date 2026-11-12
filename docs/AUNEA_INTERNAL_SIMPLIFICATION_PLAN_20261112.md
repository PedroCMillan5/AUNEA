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

## 11. Inventario completo del manifiesto (lectura estática) · 12/11/2026
Se han leído los **44 archivos JavaScript del manifiesto activo** en tres lotes. Total: **17.503 líneas de JS**, contabilizadas como saltos de línea + 1 por archivo (incluye comentarios y espacios). CSS principal: 5.041 + 285 = **5.326 líneas**; JS + estos dos CSS = **22.829 líneas**. No incluye backend, HTML, pruebas, archivos auxiliares ni archivados; por tanto no representa todo el repositorio.

Mayores módulos JS activos (líneas):
- `pages/tobe.js` 2.545, `domain/process.js` 2.081, `pages/results.js` 1.592, `domain/internal-ai-pilot.js` 1.576.
- `ui/renderer.js` 774, `core/state.js` 671, `domain/no-reask.js` 661, `domain/analysis-workbench.js` 661, `pages/diagnostic-stages.js` 643, `domain/process-lifecycle.js` 612.

**Priorización revisada:** los grandes módulos de dominio (`process.js` y `internal-ai-pilot.js`) deben entrar en el inventario de dependencias, pero **no** se deben dividir sólo por su tamaño. `tobe.js` y `results.js` siguen candidatos por mezcla de vista/eventos. Lo relevante es reducción de acoplamiento y duplicación, no el tamaño bruto.

**QA y cierre:** análisis estático realizado. No se ha confirmado que FROZEN, UAT Windows o backend sean equivalentes en ejecución. Fases 0–6 siguen abiertas, sin afirmación de finalización integral.

## 12. Consolidación de superficies y estructuras compartidas · 12/11/2026
**Cambios implementados en REVIEW, sin cambio de reglas de negocio:**
- `styles.css` / Block_ID existente `AUNEA-FE-SHARED-COMPONENTS-311`: nuevo componente opt-in `.aunea-ui-work-surface` para geometría de tarjeta (display, gap, padding, border, radio, fondo y color). Un único propietario, sin aplicar reglas globales a FROZEN.
- El mismo bloque define `.aunea-ui-work-stage` con grid/gap/min-width compartidos por las tres actividades 03.1, 03.2 y 03.3.
- `ui-system.css`: retiradas las declaraciones duplicadas de geometría y display/gap de esos seis consumidores, manteniendo selectores específicos necesarios para el contrato de pruebas. Los layout/estados concretos siguen en la hoja de composición.
- `pages/tobe.js`: 01 Información general, 02 Análisis IA global y 03 cabecera de diseño consumen `.aunea-ui-work-surface`; 03.1 Entender AS-IS, 03.2 Oportunidades y 03.3 Configuración consumen `.aunea-ui-work-stage`. No se modifica ninguna acción, evento, input ni transacción.
- `tests/design-system-common.test.cjs` (Block_ID existente 312): añade gate estático explícito para impedir que estas superficies vuelvan a tener propietarios locales de geometría.

**QA realizado:** comprobación de 12 invariantes estáticas (presencia de clases, consumidores, ausencia de reglas locales duplicadas y balance de llaves) PASS. No equivale a `npm test`, a la suite backend o a UAT visual; no se afirma identidad pixel a pixel porque las reglas ahora se cargan antes en la cascada CSS. Los tests completos y captura comparativa desktop/tablet/móvil siguen pendientes.

**Cobertura real:** consolidación inicial de seis superficies/estructuras de Trabajo interno; NO se ha unificado aún toda la UI. CRM y diagnóstico FROZEN permanecen sin modificaciones de markup y no se modifica el sistema de datos/reglas. La reducción de líneas netas de este lote no es un objetivo cumplido por sí misma: se ha cambiado ownership de estilo para evitar duplicidades futuras.

## 12. Consolidación visual y estructural incremental · 12/11/2026
- `45debdfbfa1d`: añadidas seis clases **opt-in** al bloque canónico compartido `AUNEA-FE-SHARED-COMPONENTS-311` de `styles.css`: espaciado de trabajo, bloque visible, textarea de resumen y tipografía de estado. Sin reglas globales nuevas ni modificaciones a las páginas FROZEN.
- `2a976f36b8b`: `pages/results.js` reutiliza esas clases. Eliminados **10 estilos inline** de la página (0 restantes), conservando los mismos atributos de espaciado, dimensiones y tipografía. No se alteran los contratos de datos, eventos ni las funciones de negocio.
- `7c5a8b350990`: test de regresión añadido a `tests/design-system-common.test.cjs` para comprobar ownership compartido y evitar reintroducir estilos inline en Resultados.
- **Límite de alcance:** la unificación integral de todas las estructuras del software NO está terminada. Ya existían primitivas compartidas en `styles.css` y `tobe.js` las consumía; este cambio incorpora `results.js` a la misma capa visual, pero no reestructura los grandes módulos ni modifica los estilos históricos de pantallas FROZEN.
- **QA:** inspección estática y comprobación de reemplazos realizada; test automatizado añadido pero **no ejecutado** en runner. No declarar PASS ni promover a PRODUCTION hasta ejecutar suite y UAT visual. F1/F2 en progreso.
