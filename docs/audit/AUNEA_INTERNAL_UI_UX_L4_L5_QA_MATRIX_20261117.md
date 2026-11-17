# AUNEA Internal — L4/L5 QA técnico · 17/11/2026

**Estado:** CLOSED_TECHNICAL_REVIEW, sin aprobación humana F6. **Runtime probado:** `b677605f17a3205e800660f85536a3c48491e086`. Fuentes: PROJECT_RULES.md, Master Index, DEC-050/055/056/075, Simulator CANONICAL v1.14, TOKENS_AUNEA y contrato UI/UX v0.5.

| Gate | Alcance real | Resultado |
|---|---|---|
| L4 contraste computado | Botones de modo PG11/PG12, 1365/768/390px, text/background ≥4.5:1 | PASS 6 contextos |
| L4 teclado/accesibilidad | Foco visible ≥3px, selección aria-pressed, tamaño objetivo ≥24px, reduced-motion | PASS |
| L4 integridad/responsive | Sin scroll horizontal global en PG11/12; answers/items/projects sin mutación | PASS |
| L5 FROZEN | 9 páginas x 2 viewport (1365/390), SHA256 versionado | PASS 18/18 |
| L5 flujo diagnóstico | PG01–PG09, PG10→PG11→PG12, mapa único y overlay, recarga/undo, caso sintético | PASS |
| L5 otras vistas | PG10, PG11, PG12, Proyectos, Implementación; responsive 1365/768/390 en PG10/delivery; propietarios inmutables | PASS |
| Frontend/backend | 1021 Node / 493 pytest | PASS |
| Edge/Chromium/inventario | navegadores y propiedad CSS | PASS |

**Evidencia:** [Acceptance Gate](https://github.com/PedroCMillan5/AUNEA/actions/runs/44118610311) · [Frontend](https://github.com/PedroCMillan5/AUNEA/actions/runs/44118610047) · [Edge](https://github.com/PedroCMillan5/AUNEA/actions/runs/44118610404) · [Design Inventory](https://github.com/PedroCMillan5/AUNEA/actions/runs/44118610187). Artefactos Chromium: `l4-computed-accessibility.json`, `l5-technical-journey-matrix.json`, PNG PG11/12 y móviles PG10/Proyectos/Implementación.

**Código:** `ui-system.css` Block_ID 486 (foco/reduced motion solo no-FROZEN); `tests/ui-l4-l5-browser.cjs` Blocks 487/488; `tests/uat-browser-smoke.cjs` ejecuta la matriz. Identidad, colores corporativos y `styles.css` sin modificar. No se crea un segundo owner de datos o procesos.

**Límites:** No se certifican todos los estados, colores y componentes frente a WCAG, ni porcentajes cromáticos 60/30/10, 70/20/10 o 80/14/5,5/0,5. FROZEN 18/18 significa equivalencia técnica, no aceptación visual. El caso es sintético y no representa entrevista real con Ollama, todos los PG13–PG15 ni producción.

**F6 pendiente:** propietario debe revisar visualmente referencias y estados, teclado/screen reader, usuario/cliente real, comparativa de color y funcionamiento global antes de autorizar CANONICAL/main/PRODUCTION. Ninguna decisión corporativa se modifica.

## Anexo PG10 — gap entre datos y mapa AS-IS (17/11/2026)

Tras la primera pasada L4–L5 se detectó en captura real la ausencia de margen entre las tres tarjetas DF026 / DF025 / DF086 y el mapa AS-IS de PG10. El HTML concatena `reference + map` y `.diagnosis-reference-grid` no tenía `margin-bottom`. Corregido en `ui-system.css` bajo Block_ID 159 mediante `var(--space-4)` (16px). La nueva prueba Chromium en `tests/ui-l4-l5-browser.cjs` mide **marginBottom=16px y visualGap=16px** y valida el umbral de gap en 1365/768/390. Backend, frontend 1.022/1.022, Chromium y Edge PASS, FROZEN 18/18 equivalentes.

**Evidencia de regresión:** https://github.com/PedroCMillan5/AUNEA/actions/runs/44122502295. Esta prueba puntual no convierte L4/L5 en aceptación visual transversal. Es una entrada obligatoria del checklist F6: inspeccionar separaciones verticales entre tarjetas/bloques/mapas en todas las superficies y tamaños.

## Anexo F6 — enlaces visualmente botón (17/11/2026)

**Regresión aportada por el propietario:** en PG10 la acción «Ver punto de análisis en esta página» estaba subrayada. Fuente `pages/results.js`: elemento HTML `<a>` con `btn btn-outline`, pero ningún reset de `text-decoration` ni owner transversal de separación post-dato. Los separadores `border-top` de la cuadrícula son independientes y no se modifican.

**Corrección compartida:** Block_ID `AUNEA-FE-UI-ACTION-LINK-489` en `styles.css`, clases opt-in `aunea-ui-action-link` (sin subrayado) y `aunea-ui-after-content` (margin-block-start token `--space-3=12px`); `results.js` consume esas dos clases sin cambiar el `href` ni la lógica. Ninguna página FROZEN alterada.

**Prevención automática:** Block_ID `AUNEA-UAT-UI-ACTION-OWNERSHIP-490` audita 9 módulos no FROZEN, comprueba los enlaces `a.btn`, los owners y FROZEN; Block_ID `AUNEA-UAT-UI-ACTION-COMPUTED-491` mide `textDecorationLine` y `marginBlockStart` en la UAT Chromium de PG10–PG12 y delivery. El hallazgo concreto no se emitió en el caso sintético; el ensayo de estilo fue un elemento efímero declarado como tal. QA: Node **1026/1026 PASS**, backend/Chromium PASS, FROZEN **18/18**; `overall=PASS` para head `c5e860fce6329291f9377f976422a5506f91a236`. Referencia: https://github.com/PedroCMillan5/AUNEA/actions/runs/44124906258.

**Deuda residual F6:** auditoría transversal de todas las familias, márgenes/gaps, tipos de control, sus estados y combinaciones de página; no equiparar «sin conflictos CSS sin clasificar» a «homogeneidad visual aprobada». No se modifica CANONICAL ni DECISIONES.
