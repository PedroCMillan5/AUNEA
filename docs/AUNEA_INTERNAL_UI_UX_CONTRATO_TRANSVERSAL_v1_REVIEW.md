# AUNEA Internal — Contrato transversal de interfaz y experiencia
**Versión:** 1.0 · **Estado:** REVIEW (propuesta de normalización, no sustituye fuentes CANONICAL) · **Fecha:** 2026-10-22
**Alcance:** Consola interna, diagnóstico de 90 minutos, páginas de AS-IS y vistas con cliente.
**Responsabilidad:** Capa de presentación y comportamiento de controles; no define campos, reglas económicas, productos ni decisiones del diagnóstico.

## 1. Jerarquía y trazabilidad
1. `IDENTIDAD_AUNEA`, `DESIGN_SYSTEM_AUNEA` v1.0 y `TOKENS_AUNEA` gobiernan identidad y tokens. `CATALOGO_COMPONENTES_AUNEA` gobierna los patrones autorizados.
2. `AUNEA_SYSTEM_SIMULATOR_CANONICAL` gobierna orquestación y superficies; Diagnostic Master v1.2 gobierna DF001–DF100, opciones, requiredness, ownership, condiciones y consumidores.
3. `PROJECT_RULES.md`, decisiones activas y bloques de componente del repositorio gobiernan implementación. Esta especificación **no reescribe** ninguna de esas fuentes.
4. En caso de contradicción, documentar discrepancia y resolver en su fuente propietaria. No alterar una pantalla FROZEN mediante este contrato.
5. Cada excepción de una regla visual debe indicar componente, motivo, fuente canónica, responsable y prueba de aceptación.

## 2. Identidad visual comprobada
- Una sola gramática: AUNEA Solutions y skin System; ninguna estética SaaS añadida por defecto.
- **Tipografía de marca:** Sora para titulares (600/700), Inter para texto (400/500). Jerarquía digital de referencia: H1 36/44, H2 28/36, H3 22/30, cuerpo 16/24, pequeño 14/20, nota 12/16. Las pantallas densas pueden usar un master adaptado coherente, no tamaños arbitrarios por página.
- **Colores base:** carbón #1E1E1E, dorado #D4AF37 como acento; superficie clara #FAFAF8, gris estructural #E6E6E6. **System:** #0F3B2E / #6FA885 / #EAF2ED. Éxito #2E7D32, información #2F5DA8, aviso #A66300, error #B42318: semántica, no decoración.
- **Unidad espacial:** 4 px. Escala 4/8/12/16/24/32/48/64/96. Referencia: 12–16 entre elementos del componente; 24–32 entre bloques; 48–64 entre secciones cuando el espacio disponible lo permita.
- **Bordes:** 1 px neutro, 2 px solo énfasis justificado. Radio estándar: tarjeta 12 px; input y botón 8 px; chip completo. Sombras suaves y excepcionales.
- **Grid maestro:** desktop de 12 columnas, contenido máximo de referencia 1200–1280 px, gutters 24–32 px; móvil 4 columnas, márgenes 20–24 px. La consola puede necesitar anchos mayores por tablas/mapas, pero debe documentar esa excepción.

## 3. Reglas obligatorias de maquetación de AUNEA Internal
**R01 — Grid consistente.** Dos campos emparejados se distribuyen en columnas de igual ancho. Los controles de una misma fila se alinean verticalmente aunque uno contenga más texto explicativo; la ayuda irá por debajo del control. Nunca forzar anchuras dispares sin una razón funcional.
**R02 — Alturas coherentes.** Inputs, desplegables y botones de la misma jerarquía tendrán el mismo alto de interacción (valor exacto definido en token del componente, no hardcodeado por vista). Los campos condicionales conservan unidad/modo/opciones aunque cambie la cuadrícula.
**R03 — Jerarquía común.** Página → sección numerada → bloque → etiqueta → control → ayuda → fuente/contexto → acciones. Títulos y metadatos repiten la misma escala por rol; no mostrar códigos DF/PG al usuario.
**R04 — Explicaciones.** Significado debajo de la pregunta o junto a la información que aclara. **Ejemplo en la línea/párrafo siguiente** al significado en todo el producto, no fusionado con él. Contexto recuperado en zona diferenciada; nunca una etiqueta vacía o botón sin efecto.
**R05 — Estado confirmado compacto.** Las tarjetas confirmadas no conservan huecos de edición; valor y origen siguen visibles, «Deshacer confirmación» es una acción secundaria compacta alineada a la derecha (a la siguiente línea en móvil). No sustituir Confirmar por Guardar.
**R06 — Consistencia de iconos.** Una sola familia lineal, nunca iconos meramente decorativos que imiten estados. Describir el estado además del color/icono.
**R07 — Cabecera.** Nombre de empresa y estudio activos disponen de espacio suficiente; título de pantalla y acciones no se solapan ni cambian de línea arbitrariamente en desktop; en responsive se prioriza legibilidad y menú accesible.
**R08 — Responsive.** Dos columnas → una cuando no haya espacio real para los controles completos. Sin truncar valores críticos ni esconder condicionales. No usar scroll horizontal de página para formularios normales; tablas/mapas pueden tener viewport propio.
**R09 — Sin saltos de pantalla.** Abrir/cerrar detalles, confirmar, modificar opciones y guardar no mueve el scroll sin acción expresa. No bucles de rerender/MutationObserver ni pérdida de foco al escribir. Conservar estado de desplegables cuando proceda.

## 4. Contrato de controles
**C01 — Composición única.** Text, number+unit, select, multiselect, checkbox, date, repeatable record y textarea se construyen con componentes compartidos. No crear variantes por página para resolver casos visuales.
**C02 — Condiciones.** Si un valor habilita campos dependientes, su aparición/ocultación no descarta silenciosamente el valor previo. La validez y persistencia siguen el contrato de la fuente canónica.
**C03 — «Otro/Otra».** Si hay texto no vacío en el detalle propietario, «Otro/Otra» aparece marcado, el detalle visible y el control no se puede desmarcar hasta vaciarlo. Vaciar el texto habilita desmarcar. Aplicar a selects simples, múltiples y pasos, no solo un renderer; si el estado legado es inconsistente, preservarlo y recuperarlo sin borrado. Esta regla requiere QA transversal para su adopción general.
**C04 — Confirmación y reversibilidad.** Una selección explícita válida habilita «Confirmar selección»; después debe aparecer «Deshacer confirmación». Si no existe selección ni valores derivados aplicables, ofrecer **solo** «No hay validación que hacer». No confirmar datos inexistentes ni convertir propuestas en hechos.
**C05 — Evidencia y procedencia.** Distinguir capturado, recuperado, propuesto/derivado y validado; mostrar fuente. Los candidatos se editan/rechazan y no crean nuevos registros confirmados sin intervención explícita.
**C06 — Guardado por campo.** El icono del campo cambiado señala su propio estado; los demás no pasan a «guardando» por un `dirty` global. La cabecera mantiene estado global. «Guardado» solo si el almacenamiento real fue confirmado; error local o remoto es visible y recuperable.
**C07 — Dependencias.** Modificar un propietario invalida únicamente las derivaciones/confirmaciones que consumen ese dato. No pedir la misma pregunta de nuevo por cambiar de página.
**C08 — Relaciones obligatorias.** Cuando el catálogo exige relación a pasos, la confirmación queda bloqueada si no existe al menos una referencia válida. No seleccionar todos por defecto.
**C09 — Accesibilidad.** Label programático, foco visible, estado textual, manejo por teclado, contraste suficiente, mensajes de error próximos al control; no depender de hover para información esencial.

## 5. Patrones comunes por tipo de pantalla
- **Captura de demanda:** actual y objetivo juntos; backlog y proporción de error juntos; altura y anchura de controles homogéneas; condiciones de backlog intactas; SLA, end-to-end actual y mejora deseada semánticamente independientes.
- **Pasos:** número, nombre, rol, herramienta, entradas/salidas y tiempos en la vista resumida; detalle desplegable sin perder estado. Hallazgos derivados y confirmaciones individuales reversibles. Barra temporal presenta valores, desviación y umbral juntos.
- **Fricciones:** fricción ligada a pasos, evidencias claras y campos de intensidad/frecuencia; no volver a sumar tiempos ya incluidos en el paso.
- **Riesgos:** situación que podría suceder, categoría, probabilidad, impacto, controles y pasos relacionados; separar dato derivado de elección humana.
- **Impacto:** capacidades, unidades, periodos y evidencias legibles; no ocultar datos importados por incompatibilidad de mayúsculas; costes, horas y ahorros no se mezclan.
- **Vistas con cliente:** capturan/guardan, pero no confirman unilateralmente la revisión interna. Guardar y salir no es Confirmar.

## 6. Estados y microcopy
- Estados: «Pendiente», «Recuperado», «Sugerido · pendiente de validar», «Confirmado», «Cambios pendientes», «Guardado», «Error al guardar», «No hay validación que hacer».
- Un único verbo por acción: Añadir, Editar, Guardar, Confirmar, Deshacer, Descartar, Continuar. No usar el mismo texto para resultados distintos.
- Consecuencias explícitas en acciones destructivas; no confirmar automáticamente al navegar.
- Solo español en superficie de usuario, con términos técnicos aclarados una vez cuando sean inevitables.

## 7. QA verificable y criterio de cierre
1. **Visual desktop:** comprobar grid, alineación de controles, espaciado, tamaños/jerarquías, botones, tarjetas confirmadas y cabecera a anchos representativos (por ejemplo 1440, 1280, 1100 px).
2. **Responsive:** comprobar 900, 760, 540 y 390 px sin solapamientos, ocultación de selectores ni saltos de viewport.
3. **Estados:** vacío, precargado, sugerido, incompleto, válido, confirmado, deshecho y error de persistencia para cada tipo de control.
4. **Interacciones:** teclado y ratón, foco, scroll estable, cambio de opciones, «Otro/Otra» con texto, condicionales y validación bloqueada cuando corresponde.
5. **Persistencia:** guardar, recargar, cerrar/abrir, mantener fuente y relaciones; comparación antes/después de datos.
6. **Dependencias:** confirmar, editar origen, comprobar invalidación exacta sin cascadas erróneas.
7. **No regresión:** capturas aprobadas, JS sin excepciones, pruebas frontend/backend relevantes, UAT manual en navegador.
8. **Evidencia:** capturas antes/después, tests, commit y lista de excepciones; un bloque no se declara FROZEN con pruebas visuales ausentes.

## 8. Implantación controlada
1. Auditar componentes y CSS actuales frente a este contrato sin cambiar datos ni reglas.
2. Extraer tokens/patrones compartidos del CSS y **reutilizarlos**, evitando nuevas reglas globales superpuestas al final del archivo.
3. Corregir primero componentes comunes; luego excepciones justificadas en cada pantalla.
4. Reejecutar pruebas de comportamiento por cada cambio, empezando por la pantalla en UAT.
5. Mantener apartadas las pantallas FROZEN salvo fallo crítico validado.
6. Promocionar este contrato a CANONICAL únicamente tras contrastarlo con catálogo de componentes, tokens e identidad, resolver discrepancias, registrar decisión de gobierno y completar QA.

## 9. Clasificación de este documento
**Proveniente de fuentes vigentes:** identidad/skin, tipografía, colores, escala espacial, radios/grid de referencia, reutilización de componentes, accesibilidad, ownership y no-reask.
**Normalización propuesta sobre UAT observada:** alineación 2×2, posiciones de ayuda/ejemplo, tarjetas confirmadas compactas, iconos por campo, botones condicionales, scroll sin saltos y criterios específicos de QA.
**No implica:** aprobación canónica de nuevos campos, cumplimiento de UAT, ni rediseño de módulos FROZEN.
