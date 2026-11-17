# AUNEA Internal — Auditoría UI/UX F6 por pantalla y elemento

**Fecha de extracción:** 17/11/2026  
**Estado:** INVENTARIO PREPARADO / AUDITORÍA VISUAL PENDIENTE  
**Ámbito:** CRM, PG01–PG12, vistas posteriores y Administración  
**Gobierno:** PROJECT_RULES.md v1.7; Master Index v1.65; UI/UX Master Contract v0.5; registro UI/UX v0.5.0; DEC-056 y FROZEN_PAGES.json v10.

## Archivos creados

1. [Inventario por elemento CSS y módulo consumidor](AUNEA_F6_ELEMENTOS_CSS_POR_CONSUMIDOR_20261117.csv): **1.721 relaciones** entre clases CSS y módulos que las consumen, derivadas de **1.127 clases CSS** del inventario técnico `AUNEA_INTERNAL_DESIGN_CONSUMERS.json`. Cada fila identifica clase, fuentes CSS, cantidad de reglas, categoría de triage, consumidor, familia UI/UX candidata y owner esperado. **244** filas corresponden a clases sin consumidor detectado estáticamente: pueden ser dinámicas, HTML externo o CSS sin uso; no se declaran «huérfanas» sin DOM.
2. [Matriz pantalla × familia](AUNEA_F6_MATRIZ_PAGINA_FAMILIA_20261117.csv): **26 pantallas/ámbitos × 40 familias = 1.040 controles** de auditoría, con estados y owner canónicos. Incluye **9 pantallas FROZEN**. La coincidencia de una clase con un módulo fuente es **evidencia estática**, no confirmación de presencia en el DOM de esa pantalla.

También existe una versión `.xlsx` de la matriz editable en la entrega de esta conversación: pestañas RESUMEN, AUDITORIA_PAGINA_ELEMENTO, PANTALLAS_26, FAMILIAS_40, INCIDENCIAS_REALES, METODO_QA y FUENTES. La versión Excel está diseñada para introducir evidencia y clasificaciones de F6; el CSV conserva el inventario completo de clases por consumidor.

## Qué se considera un elemento

- **Candidato estático**: clase CSS referenciada en una fuente JavaScript, eventualmente compartida entre varias páginas; sin abrir la página no se puede demostrar que exista un nodo del DOM.
- **Elemento renderizado**: nodo real con selector, rol, texto, estado, clases y propiedades calculadas. Debe registrarse en F6 con `getComputedStyle`, `getBoundingClientRect` y evidencia visual / funcional.
- **Familia canónica**: una de las **40 familias** del contrato; una clase puede corresponder a más de un DS. Las coincidencias de nombre son **hipótesis**, no decisiones.
- **Incumplimiento**: diferencia reproducible respecto del contrato aplicable, con owner confirmado y evidencia. **No** considerar fallo una clase sin margen si su contenedor fija el espaciado mediante `gap` o `padding`.

## Secuencia de trabajo obligatoria

1. Abrir cada pantalla en estado **vacío**, **datos**, **error**, **bloqueado**, **seleccionado** y/o los estados que correspondan a cada familia. No marcar una combinación pantalla/familia como presente hasta localizar un nodo o un consumidor real.
2. Para cada elemento: selector, HTML/tag, familia, DS, owner, token, estilo computado, margen/padding/gap, borde/color/tipografía, tamaño, foco/teclado, responsive en **1365 / 768 / 390 px** y screenshot.
3. Clasificar resultado: `CONFORME`, `DESVIACIÓN`, `NO APLICA`, `EXCEPCIÓN APROBADA` o `PENDIENTE`. No usar «sin conflictos CSS sin clasificar» como sinónimo de UI homogénea.
4. Resolver desviaciones preferentemente desde el **propietario compartido**; si afecta a FROZEN, **no modificar sin reapertura explícita**. Todas las excepciones necesitan fuente y justificación.
5. Repetir QA Node, backend, Chromium/Edge, FROZEN 18/18 y revisión visual humana antes de cerrar F6.

## Defectos previos ya conocidos

- **PG10 – tarjetas al mapa AS-IS:** faltaban **16 px** de separación; corregido técnicamente en `ui-system.css` con `var(--space-4)`; [pruebas](https://github.com/PedroCMillan5/AUNEA/actions/runs/44122502295).
- **PG10 – enlace presentado como botón:** conservaba subrayado y carecía de separación transversal; corregido con `aunea-ui-action-link` y `aunea-ui-after-content` (12 px); [pruebas](https://github.com/PedroCMillan5/AUNEA/actions/runs/44124906258).

**No hay aprobación visual humana F6**, ni conformidad WCAG integral, ni decisión aprobada de porcentajes de color, ni promoción a CANONICAL/main/PRODUCTION.

## Limitaciones de este inventario preparado

El análisis de clases CSS/consumidores **no descubre todos los nodos dinámicos** creados durante la ejecución, no aporta geometrías reales, no cubre todos los estados, no asegura que una clase se utilice en la pantalla indicada y no acredita que un componente esté visualmente unificado. Por esa razón el Excel y ambos CSV mantienen `PENDIENTE` en las verificaciones que requieren Chromium/aceptación humana.

Para completar literalmente la auditoría **elemento por elemento**, el siguiente paso es capturar los DOM por ruta y estado y anexarlos al inventario con claves estables (pantalla, estado, selector y fuente). Hasta entonces, este paquete es una **base de auditoría exhaustiva de fuentes, no una certificación de interfaces**.
