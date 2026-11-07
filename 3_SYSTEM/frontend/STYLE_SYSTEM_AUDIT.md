# AUNEA Internal — Auditoría del sistema visual compartido

**Estado:** REVIEW — auditoría de código y normalización inicial realizadas; aceptación visual nativa pendiente.  
**Fecha:** 2026-11-07  
**Rama:** `work/as-is-ux-simplification-20260930`  
**Alcance:** software activo en `3_SYSTEM/frontend`, desde CRM y PG01 hasta PG11; no modifica PG12+ ni artefactos históricos.  
**Gobierno:** `00_AUNEA_INTERNAL_MASTER_INDEX`, `PROJECT_RULES.md`, `DECISIONES_AUNEA` (DEC-027, DEC-056), `AUNEA_SYSTEM_SIMULATOR_CANONICAL` v1.14, `DESIGN_SYSTEM_AUNEA`, `TOKENS_AUNEA` y `CATALOGO_COMPONENTES_AUNEA`.

## 1. Arquitectura constatada (fuente única por responsabilidad)

| Archivo | Owner | Regla |
|---|---|---|
| `styles.css` | Tokens globales y primitivas visuales reutilizables: tipografía Sora/Inter, colores, espacios, bordes, botones `.btn`, `.btn-primary`, `.btn-outline`, `.btn-small` | **Único CSS base de componentes**. No copiar su apariencia en otras pantallas |
| `ui-system.css` | Composición del App Shell, estructura de páginas, layouts por modo, geometría del mapa, responsive, estados específicos | Puede ajustar **distribución y estados**, no redefinir fuentes/tamaños/colores de botones genéricos |
| `index.html` | Orden de hojas: primero `styles.css`, después `ui-system.css` | Una carga de cada hoja; no CSS inline global |
| `pages/*.js`, `ui/*.js`, `domain/*.js` | Markup, reglas/estados y composición semántica | Usar componentes existentes; no crear estilos aislados en cada botón |
| `tests/design-system-common.test.cjs` | Contract tests de CSS común | Evitar regresiones de propiedad, tokens y PG11 |
| `FROZEN_PAGES.json` y `tests/frozen/` | Baselines aprobadas | No modificar sin autorización y UAT de reapertura |

No se introduce una segunda definición de tokens ni otro sistema de componentes. Los ajustes nuevos son **opt-in**, sin selector global sobre pantallas congeladas.

## 2. Cobertura de inventario

Se han inspeccionado los archivos ejecutables de `pages` (8), `domain` (18), `ui` (3), `core` (2) y `services` (4): **35 módulos JS**, además de ambas hojas CSS, manifiesto, entrada HTML y registros FROZEN.

| Área | Situación del CSS | Clasificación |
|---|---|---|
| Shell / navegación | Controles propios de navegación y barra; reutilización de tokens compartidos, con excepciones de composición | Revisado en código; mantener baseline |
| CRM: inicio, empresas, contactos, interacciones y oportunidades | Varios `button` sin `.btn` son opciones de selectores custom o menús, no CTA estándar | FROZEN; no cambiar apariencia |
| CRM: estudios y proyectos | Acciones sobre clases `.btn`; estados y navegación específicos | Revisado; estudios FROZEN |
| PG01–PG09 / diagnóstico 90 min | UI del renderer compartido, segmentos, ayudas y controles de entrada; algunas excepciones de captura | Las pantallas FROZEN requieren reapertura para cambios visuales |
| PG10 / AS-IS | Mapa, inspector, grafo y controles semánticos de proceso; ciertos estilos dinámicos de posición/tamaño justificables | Revisado en código; UAT visual pendiente |
| PG11 / TO-BE | Encabezados de sección no homogéneos, botones de acción con tipografía/espaciado repetidos, auditoría técnica como etapa numerada | **Primer lote corregido**; UAT visual pendiente |
| Session Display | Canvas de lectura, layout y variables dinámicas de grafo | Mantener separación visual; no aplicar aspecto de formulario a nodos |
| Ayudas, selectores y chips | Son controles funcionales, no botones genéricos | Conservar semántica y accesibilidad |

**Excepción importante:** los botones `role="option"`, iconos de ayuda, menús flotantes, navegación lateral, segmentos y nodos de grafo pueden tener estilo especializado. No deben llevar `.btn` indiscriminadamente. Las modificaciones de `top`/`left` de menús, `--graph-cols` y parámetros de la visualización son estilos calculados, no necesariamente deuda de diseño.

## 3. Deuda técnica detectada

Recuento preliminar de inspección estática, no equivalente a errores de usuario:

- `ui-system.css`: cerca de **250 KB**, ~80 bloques etiquetados y **105 referencias a `!important`**. Requieren clasificación por motivo y riesgo antes de retirarlas.
- Apariciones repetidas de selectores, especialmente PG11, topbar, responsive y vistas de diagnóstico. La repetición entre media queries es ocasionalmente necesaria; no borrar reglas por coincidencia literal.
- Numerosos tamaños en px y estilos inline repartidos por páginas y domain; algunos son cosméticos, otros son necesarios para render dinámico. Hay que separar ambos tipos antes de migrar.
- Mezcla de `h2`, `h3` y `strong` como encabezados, en ocasiones con tamaños locales. Esto debe convertirse progresivamente en **roles visuales compartidos**, sin alterar estructura semántica funcional.
- Variantes `btn` genéricas correctas en `styles.css`, pero varias pantallas acumulan CSS de apariencia sobre `.btn` por clase local. Necesitan limpieza dirigida y QA por pantalla.

No se considera correcto sustituir las dos hojas por una de golpe: el riesgo sobre pantallas FROZEN es alto y el frontend depende de una cascada ya existente.

## 4. Normalización implementada en este lote

**Bloque `AUNEA-FE-SHARED-COMPONENTS-311` — `styles.css`**

Primitivas opt-in: `.aunea-ui-section-title`, `.aunea-ui-section-caption`, `.aunea-ui-aux-heading`, `.aunea-ui-button-row`. Consumen tokens canónicos y proporcionan las reglas de aspecto/alineación para futuras páginas. No modifican `:root` ni el aspecto global de pantallas FROZEN.

**PG11 — `pages/results.js` y `ui-system.css`**

- Encabezados 01, 02 y 04 consumen el mismo primitivo compartido; se retiran las modificaciones locales que impedían su aplicación.
- Auditoría IA se mantiene accesible en su desplegable con el mismo `id` y montura, pero como **detalle técnico no numerado**, no como una etapa principal. Validación global pasa a **04**.
- `Aplicar IA`, `Mantener` y `Editar` conservan sus eventos y `.btn btn-outline btn-small`, pero ahora usan `.aunea-ui-button-row` para centrado y línea única. Se eliminan tres reglas de apariencia de botones solapadas y se mantiene el layout contextual.
- Se retiran cuatro márgenes inline de botones de navegación dentro del inspector. Ninguna ruta ni decisión humana cambia.

**Bloque `AUNEA-UAT-DESIGN-COMMON-312` — pruebas nuevas**

Verifica orden y unicidad de CSS, tokens/variantes, opt-in de componentes nuevos, numeración de PG11, botón compartido y conservación de IDs/acciones. Coexiste con pruebas `FROZEN` anteriores, `style-tokens.test.cjs` y pruebas funcionales PG11.

## 5. Gates de aceptación

| Gate | Estado |
|---|---|
| Lectura de fuentes canónicas y decisiones vigentes | Hecho |
| Inventario estático de módulos y propietarios CSS | Hecho |
| Primitivas comunes definidas y conectadas en PG11 | Implementado |
| Eliminación de reglas de apariencia duplicadas **identificadas en PG11** | Implementado |
| Proteger interfaces FROZEN sin cambio implícito | Por diseño; requiere ejecutar suites FROZEN |
| Ejecutar `npm test` completo en CI/Windows | **Pendiente de confirmación** |
| UAT visual página a página en navegador, desktop/tablet/móvil | **Pendiente** |
| Reducir globalmente el resto de excepciones históricas `ui-system.css` | **Pendiente de clasificación y pruebas** |
| Validación usuario del sistema visual consolidado | Pendiente |

**Comando de QA:** desde `3_SYSTEM/frontend`, ejecutar `npm ci` y `npm test`; después comprobar las páginas CRM y PG01–PG11 en Chrome/Edge con los datos existentes.

## 6. Política permanente para cambios de UI

1. Identificar si el elemento corresponde a DS-002 (encabezado), DS-003 (texto), DS-004 (card), DS-017 (acción), DS-019 (estado) o DS-020 (control).
2. Utilizar la clase compartida `styles.css`; añadir solo layout contextual en `ui-system.css`.
3. No crear nuevos `font-size`, `padding`, `border-radius`, `background` para un `.btn` ya cubierto por el sistema.
4. Usar `--font-*`, `--space-*` y colores funcionales; no repetir hexadecimales en los componentes.
5. No modificar páginas FROZEN sin autorización expresa de reapertura, nuevas capturas y aceptación.
6. Mantener semántica HTML y estados de accesibilidad; controles especiales no son botones CTA.
7. Ejecutar pruebas CSS y funcionales antes de cerrar una pantalla. Código actualizado ≠ pantalla validada.
8. Mantener excepciones justificadas en este registro y retirar reglas antiguas **solo** con evidencia de que ya no se consumen.

**Estado final:** consolidación estructural parcial aplicada con trazabilidad. No marcar sistema visual completo como `PRODUCTION` hasta pasar las UAT y revisión de excepciones.
