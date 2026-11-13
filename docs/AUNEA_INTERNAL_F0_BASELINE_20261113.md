# AUNEA Internal — F0 · Inventario, propietarios, consumidores y riesgos

**Fecha de corte:** 13/11/2026. **Rama:** `work/as-is-ux-simplification-20260930`. **Referencia técnica de la auditoría:** `d26cb0337ea21c2fa715c3c0944ce7ff4b78d8a6` (los siguientes commits añaden documentación).  
**Estado:** AUDITORÍA ESTÁTICA CONTRASTADA. La verificación automática del árbol completo se publica en `.github/workflows/aunea-f0-inventory.yml`, pero su resultado todavía no está acreditado. **No promover F0 a CLOSED sin el JSON de esa ejecución y sus controles PASS.**

## A. Fuentes verificadas
- `00_AUNEA_INTERNAL_MASTER_INDEX` (Drive, v1.59), `PROJECT_RULES.md` (v1.7), `DECISIONES_AUNEA` (v1.34), `AUNEA_SYSTEM_SIMULATOR_CANONICAL` (v1.14), `AUNEA_INTERNAL_ARCHITECTURE_CONTRACT_CANONICAL_v1.7`.
- GitHub: `module-manifest.json`, `index.html`, `FROZEN_PAGES.json`, `CODE_BLOCK_INDEX.md`, CSS, los 46 módulos JS manifestados y las 49 rutas simples de backend registradas en el índice.
- **Precedencia:** fuentes canónicas de datos y decisiones → reglas → UI → entregables. El backend y los owners de dominio no pueden reemplazarse por lógica en vistas.
- Las 512 filas de `CODE_BLOCK_INDEX.md` corresponden a 512 Block_ID diferentes. El campo Archivo combina a veces varios archivos o texto de retirada; no tratar cada celda como una ruta física.

## B. Línea base del runtime vigente

| Métrica | Resultado | Evidencia/alcance |
|---|---:|---|
| Módulos JS en manifiesto | **46** | `module-manifest.json` y `index.html` |
| Líneas JS de esos 46 módulos | **17.527** | lectura de archivos, `split("\\n").length`, incluye blancos/comentarios |
| Líneas CSS compartido `styles.css` | **305** | lectura del archivo |
| Líneas CSS de layout `ui-system.css` | **5.028** | lectura del archivo |
| JS + los dos CSS | **22.860** | no incluye backend, HTML ni pruebas |
| Archivos Python de paquete backend referenciados | **33** | índice técnico; no confundir con toda la carpeta |
| Líneas de esos 33 archivos Python | **7.445** | lectura de los archivos indexados |
| Otras rutas backend simples del índice | **16** | 13 pruebas y 3 archivos de configuración/script |
| Bloques de reglas analizados en `ui-system.css` | **2.672** | parser de llaves/contextos |
| Grupos de selectores repetidos en el mismo contexto | **123** | 136 apariciones adicionales; **NO equivalen a 136 errores** |
| Atributos `style="` en los 46 JS | **35** | búsqueda literal, incluye páginas FROZEN/UAT |
| Páginas FROZEN | **9** | `FROZEN_PAGES.json` v10 |
| Snapshots FROZEN distintos verificados accesibles | **13/13** | comprobación individual de ruta |
| Block_ID registrados | **512** | 512 únicos |
| Celdas Archivo compuestas/multirruta o descriptivas | **24** | requieren normalización documental antes de automatizar ownership |

**No se inventarían cantidades que no se han podido obtener:** el número total de archivos de todo el repositorio y el desglose exacto activos/archivados requieren ejecutar `tools/aunea-f0-audit.cjs` sobre un checkout real. El script cuenta el árbol completo, excluye `node_modules` y temporales, y declara expresamente la incertidumbre de consumidores por nombres dinámicos. Un conteo basado sólo en el índice sería incompleto.

### Módulos mayores y acoplamiento detectado
| Archivo | Líneas | Indicadores observados | Destino de trabajo |
|---|---:|---|---|
| `domain/process.js` | 2.081 | 91 funciones y 277 referencias DOM (medida heurística) | F4: separar modelo/flujo de UI sólo tras mapear consumidores |
| `pages/tobe.js` | 2.058 | 58 funciones, 19 referencias `latestTobe` | F3: separar composición sin alterar datos |
| `domain/internal-ai-pilot.js` | 1.576 | 45 funciones, 55 referencias DOM, 42 `latestTobe` | F4: orquestación vs presentación |
| `pages/results.js` | 871 | 37 funciones, 0 estilos inline | F2/F3: vistas y componentes |
| `ui/renderer.js` | 784 | 57 funciones, 185 referencias DOM | F2: componentes compartidos |
| `pages/internal-work-events.js` | 730 | 22 registros `addEventListener` textuales, 24 `saveState` | F3: mantener evento/acción en owner único |
| `core/state.js` | 671 | 67 funciones, 123 referencias DOM | F4: acoplamiento UI/estado |
| `domain/analysis-workbench.js` | 661 | vista/asistencia sobre fuentes | F4, solo con pruebas de equivalencia |
| `domain/tobe-transactions.js` | 586 | owner de transacción/undo; 4 `saveState` | PROTEGER invariantes |
| `pages/tobe-global.js` | 492 | proyección global IA read-only | No duplicar IA en vistas |

Los indicadores DOM cuentan menciones de `document.`, `querySelector` o `addEventListener(`; no constituyen automáticamente incidencias.

## C. Ownership y rutas consumidoras relevantes

| Responsabilidad | Fuente propietaria | Consumidores clave | Límite del refactor |
|---|---|---|---|
| Datos canónicos, DF001–100, relaciones | Diagnostic Master + propietarios de datos | servicios/schema, páginas de captura, engines | no añadir ni duplicar captura |
| Snapshots AS-IS y versionado | `domain/session-snapshot.js`, ciclo de proceso | Diagnóstico, PG10, TO-BE, backend | mantener inmutabilidad histórica |
| Cálculos oficiales y reglas | `3_SYSTEM/backend/aunea_backend/` | `services/engine-adapter.js`, `pages/results.js`, `pages/tobe-global.js` | no mover cálculos al frontend |
| Versiones TO-BE y validación | `domain/tobe-model.js`, `domain/tobe-transactions.js` | `pages/tobe.js`, `pages/internal-work-events.js` | previews/confirmación/undo se mantienen |
| IA de apoyo | `domain/internal-ai-pilot.js` + backend IA | `pages/tobe-global.js`, actividad TO-BE | IA nunca aprueba sola |
| Estado local y persistencia | `core/state.js`, `services/persistence.js` | páginas, eventos, UAT | no múltiples writers paralelos |
| Controles y estilos generales | `styles.css` + `ui/renderer.js` | vistas que utilicen `aunea-ui-*` | propiedad compartida única |
| Layout y excepciones visuales | `ui-system.css` | pantallas específicas y FROZEN | analizar cascada, responsive y selectores |
| Navegación y acciones de interfaz | `ui/shell.js`, `pages/internal-work-events.js` | registro de páginas, PG10/PG11 | no duplicar listeners |
| Visualización de resultados | `pages/results.js` | PG10 y resultados posteriores | sólo proyección, no nuevo engine |

**Contrato de carga:** 46 scripts clásicos `defer` comparten el ámbito global y están ordenados por manifiesto. Una extracción exige preservar orden e invariantes. La auditoría de consumidores de CSS es **heurística**: ausencia de referencia textual no prueba código muerto; también hay HTML, clases dinámicas y snapshots.

## D. Clasificación de CSS: investigación, NO borrado

- Prioridad F1: `.topbar`, `.topbar-right`, `.topbar-left`, `.aunea-select` y `.aunea-select-menu`; intervienen superficies globales o FROZEN. No modificar sin comparar computed styles en pantallas afectadas.
- Prioridad F1/TO-BE: `.tobe-alternative-dialog`, `.tobe-inspector`, `.tobe-ai-row-actions`, `.pg10-review-actions`. Resolver especificidad, contexto y media queries antes de fusionar.
- Prioridad F2: títulos, botones, inputs, tarjetas y modales con apariencia equivalente; reutilizar owner existente (`styles.css` + `ui/renderer.js`), sin imponer una estructura única a comportamientos diferentes.
- `aunea-ui-work-surface`, `aunea-ui-work-stage` y `aunea-ui-work-disclosure` ya disponen de owner compartido; proteger sus consumidores.

## E. FROZEN y límites de intervención
Pantallas bloqueadas: **Inicio, Empresas, Contactos, Interacciones, Oportunidades, Estudios, Contexto y objetivos, Alcance del proceso, Estado objetivo y restricciones**. `FROZEN_PAGES.json` v10; **13 archivos de snapshot** accesibles. No modificar código ni estilo que altere su presentación sin reapertura explícita. Los estilos transversales requieren prueba visual contra estos snapshots aunque el selector modificado parezca general.

## F. Matriz de riesgo con gates de entrada a F1–F6

| Riesgo | Severidad | Control previo |
|---|---|---|
| Regresión en pantallas FROZEN por CSS global | CRÍTICO | tests FROZEN y capturas comparables; no refactor visual sin PASS |
| Cambio involuntario de orden global de scripts | CRÍTICO | `module-manifest.test.cjs`, validación HTML↔manifest |
| Mutación de snapshot o output server-owned | CRÍTICO | tests de ownership, `tobe-transactions`, recuperación/undo |
| Duplicar listeners o acciones al separar UI | ALTO | UAT de eventos PG10/PG11 en navegador |
| Eliminar override CSS legítimo | ALTO | contexto selector, especificidad, media, imágenes antes/después |
| Desacoplar IA sin preservar estados parciales | ALTO | UAT Ollama/proveedores, respuestas vacías, errores y persistencia |
| Romper tests atados a cadenas fuente | ALTO | revisar `pg11-source.cjs` y tests de source-oracle |
| Confundir archivo archivado con runtime | MEDIO | inventario de árbol con `archived` y manifiesto |
| Confundir celdas del índice compuestas con rutas | MEDIO | normalizar propietarios del índice sólo cuando proceda |
| Fusionar rama con main muy divergente | ALTO | reconciliación controlada y gates; no merge automático |

## G. Gates y estado

- **Hecho:** lectura de fuentes canónicas; inventario manifestado JS completo; lectura de 49 rutas backend indexadas; CSS escaneado; propietarios clave; matriz de riesgos; FROZEN 9 páginas / 13 snapshots verificados.
- **Automatizado y publicado:** `tools/aunea-f0-audit.cjs` (inventario integral + dependencias léxicas + candidatos CSS) y `.github/workflows/aunea-f0-inventory.yml` (Node 22, chequeos y artefacto `aunea-f0-inventory`).
- **Sin evidencia de ejecución recuperada:** archivo `f0-inventory.json` de Actions, recuentos completos activo/ARCHIVED y verificación de integridad del árbol completo. Por esta razón, el gate F0 permanece **PENDING AUTOMATED EVIDENCE**, aunque la auditoría estática esté terminada. El gate de F0 no es equivalente a los tests funcionales de F6.
- **F1–F6:** permanecen abiertos; nadie puede declarar equivalencia de UI únicamente por estas métricas.

## H. Reproducción y cierre del gate F0

Desde raíz de checkout de la rama:

```bash
node tools/aunea-f0-audit.cjs > f0-inventory.json
node -e "const r=require('./f0-inventory.json'); if(r.errors.length||r.counts.runtimeModules!==46||r.counts.frozenPages!==9) process.exit(1); console.log(r.counts)"
```

Para validar F0 deben constar **(1)** ejecución PASS del job `AUNEA F0 Inventory`, **(2)** artefacto JSON descargable que enumere activos/archivados, **(3)** errores vacíos, **(4)** referencias indexadas y FROZEN revisadas. Sólo entonces actualizar el encabezado del plan a **F0 CLOSED**. El cierre de F0 no requiere que `npm test` o `pytest` sean PASS: esos gates pertenecen a estabilización/F6 y condicionan los cambios de código de F1–F5.
