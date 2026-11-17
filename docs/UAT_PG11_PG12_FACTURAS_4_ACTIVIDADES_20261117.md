# AUNEA Internal — UAT integrada PG11 → PG12: facturas (4 actividades)

**Estado:** REVIEW, guía ejecutable de pruebas; no fuente canónica de datos ni reglas.
**Fuentes:** AS-IS confirmado v2 y TO-BE revisado v4 visibles en las capturas del estudio de prueba «Levante Instalaciones Técnicas»; DEC-050, DEC-075, AUNEA_SYSTEM_SIMULATOR_CANONICAL. La compañía es un **caso sintético de UAT**, no un cliente real entregado.
**Advertencia:** el fixture genérico `uat/cases/invoices.json` tiene **6 pasos** y **NO debe usarse** para completar este estudio de 4 pasos. No importar desde él validaciones, umbrales, tiempos ni nombres de actividades.

## 1. Contexto comprobable en el estudio de cuatro pasos

- Nombre: **Recepción y registro de facturas de proveedores**.
- Flujo: **P1 Recibir factura del proveedor → P2 Determinar si procede aprobación → (SÍ) P3 Aprobar factura → P4 Registrar en ERP y archivar expediente**. La rama de **NO requiere aprobación** de P2 enlaza directamente con P4.
- Las restricciones confirmadas son: **DF075** autorización humana, **DF087** mantener políticas/decisión humana/herramientas, **DF088** no automatizar decisión final ni acción financiera, **DF089** mantener herramientas/preferir funciones nativas, **DF090** permisos/auditoría/MFA, **DF091** formación/sin interrupciones.
- Los tiempos, frecuencias, fricciones, riesgos y métricas **deben leerse del AS-IS confirmado**, no rellenarse desde esta guía.
- **Punto crítico sin inventar:** el rechazo por dirección en P3 **no puede desembocar en un registro en ERP como factura aprobada**. Si el flujo actual no expresa cómo se detiene/cierra o se devuelve el expediente, se debe documentar como bloqueo pendiente de decisión humana. No inventar ruta ni umbral.

## 2. PG11 — Relleno completo del ejemplo (propuestas del consultor)

Estos valores son un **diseño futuro de prueba** para comprobar coherencia; no certifican integraciones. En cada actividad abrir 03.1 (origen), 03.2 (opciones, sin aplicar automáticamente) y 03.3 (decisión). Conservar el responsable/herramienta/catálogos ya confirmados cuando coincidan.

### P1 · Recibir factura del proveedor

| Campo real de 03.3 | Valor propuesto |
|---|---|
| Qué cambia | Se modifica |
| Motivo de la modificación y problema que resuelve | Reducir la falta de visibilidad del estado de las facturas recibidas y facilitar su seguimiento desde el inicio del proceso. |
| Automatización e IA | Se propone registrar cada factura recibida con una referencia y un estado identificables mediante reglas fijas. La automatización queda condicionada a disponer de una integración viable con el correo y el sistema de registro. No necesita IA para esta función. |
| Supervisión humana | Administración revisará las facturas incompletas, duplicadas o no reconocidas y resolverá las excepciones antes de continuar. |
| Control / riesgo | Registrar el estado, responsable y cambios del expediente; conservar la referencia al documento original y permitir consultar su último estado validado. |
| Responsable futuro | Administración, como en AS-IS. |
| Herramienta | Email, como canal original; no presentar un registro automatizado como integración confirmada. |
| Entradas | Email / mensaje y PDF (conservar las fichas originales). |
| Salidas | Documento y Registro estructurado, según el borrador actual. |
| Tiempo futuro | Sin estimación sin evidencia verificable. |

**Dependencia a verificar:** P2 debe recibir los datos/documentos que le permiten comprobar la necesidad de aprobación.

### P2 · Determinar si procede aprobación

| Campo real de 03.3 | Valor propuesto |
|---|---|
| Qué cambia | Se incorpora control |
| Motivo de la modificación y problema que resuelve | Garantizar que cada factura se evalúe conforme a las reglas de aprobación vigentes y evitar que continúe sin la autorización exigida. |
| Automatización e IA | Las reglas podrán identificar si una factura debe remitirse a aprobación, siempre que los criterios estén confirmados. No se automatiza la decisión financiera. |
| Supervisión humana | Finanzas comprobará las condiciones de aprobación y resolverá los casos que requieran interpretación o presenten información incompleta. |
| Control / riesgo | Registrar el criterio aplicado y el resultado de la comprobación. Bloquear la continuación cuando falte una autorización obligatoria. No considerar una regla no validada como decisión aprobada. |
| Responsable futuro | Administración, como aparece en el TO-BE del estudio; la revisión de condiciones por Finanzas es una supervisión propuesta, no reasignación confirmada. |
| Herramienta | Email, como origen; viabilidad del registro de decisiones pendiente. |
| Entradas | Mantener las categorías ya seleccionadas en AS-IS/TO-BE; según el detalle visible, PDF y Registro estructurado. |
| Salidas | Mantener Registro estructurado si así consta en el diseño y registrar explícitamente el resultado de la decisión en el circuito. |
| Tiempo futuro | No estimar. |

**Rutas obligatorias en Mapa TO-BE:** **SÍ requiere aprobación → P3**; **NO requiere aprobación → P4**. «NO» significa *no exigible*, **no** *aprobación rechazada*. No definir un umbral económico que no exista en el AS-IS v2.

### P3 · Aprobar factura

| Campo real de 03.3 | Valor propuesto |
|---|---|
| Qué cambia | Se modifica |
| Motivo de la modificación y problema que resuelve | Mejorar el seguimiento de aprobaciones pendientes y reducir la falta de visibilidad del estado. |
| Automatización e IA | Se propone registrar el estado de la solicitud y generar avisos de seguimiento mediante reglas definidas. La decisión de aprobación seguirá siendo humana. |
| Supervisión humana | El responsable autorizado aprobará o rechazará las facturas. Administración realizará el seguimiento de las solicitudes pendientes. |
| Control / riesgo | Registrar responsable, resultado, fecha de decisión y excepciones. Impedir que una factura que necesita aprobación continúe sin la autorización requerida. |
| Responsable futuro | Manager / dirección, como en AS-IS. |
| Herramienta | Email, sin afirmar que por sí solo proporciona registro/auditoría. |
| Entradas | PDF y Registro estructurado, como en la captura. |
| Salidas | Aprobación / decisión, como en la captura. |
| Tiempo futuro | Sin estimación. El tiempo AS-IS sigue siendo histórico declarado. |

**Caso de aceptación de ruta:** decisión *aprobada* → P4. **Rechazo** → no contabilizar; determinar con el cliente si se devuelve para subsanación o se cierra sin registro, y representar una ruta explícita antes de declarar el proceso revisado. No equiparar rechazo con «NO requiere aprobación» de P2.

### P4 · Registrar en ERP y archivar expediente

| Campo real de 03.3 | Valor propuesto |
|---|---|
| Qué cambia | Se modifica |
| Motivo de la modificación y problema que resuelve | Reducir la reintroducción manual de datos de facturas en el ERP y los riesgos de errores asociados, manteniendo la trazabilidad entre el documento recibido y el expediente. |
| Automatización e IA | Se propone transferir al ERP los datos de facturas previamente validados mediante una integración compatible, pendiente de comprobación técnica. La ejecución puede basarse en reglas y no requiere IA para el registro básico. |
| Supervisión humana | Administración revisará registros incompletos, rechazados o duplicados y resolverá las excepciones antes de confirmar su tratamiento. |
| Control / riesgo | Validar campos obligatorios, detectar duplicados, registrar errores y conservar la referencia entre factura, registro ERP y expediente. No registrar si falta autorización exigible. |
| Responsable futuro | Administración, como en AS-IS. |
| Herramienta | ERP actual. Integración nueva únicamente si se acredita técnicamente. |
| Entradas y salidas | Conservar los datos del AS-IS v2 y verificar en el mapa el consumo del PDF, registro y aprobación condicional; salida: registro ERP y evidencia de archivo. No introducir opciones de catálogo fuera de su fuente. |
| Tiempo futuro | Sin estimación hasta medir el trabajo automatizable. |

**Dos variantes técnicas, no dos productos de PG11:** si la integración ERP no es viable, se mantiene registro manual con control y expediente; si es viable, se valida transferencia por reglas. No calcular ahorro de caja ni ROI desde PG11.

## 3. Pruebas de 03.2 y 03.3 sin perder decisiones

1. En **03.2**, abrir una alternativa, leer fuentes y límites, **Previsualizar**. Comprobar que el borrador 03.3 no se modifica hasta **Confirmar intervención**.
2. Si se confirma una intervención, verificar el cambio en 03.3, en Mapa TO-BE y en historial. Si se deshace, comprobar que otras actividades conservan sus decisiones.
3. En **03.3**, recorrer P1 a P4, guardar borrador y recargar. Confirmar que los textos, catálogos, rutas y advertencias permanecen.
4. **04 · Validación global**: comprobar requisitos. Las advertencias DF089/DF090 representan *viabilidad por acreditar*; un bloqueo de aprobación humana o flujo incompleto sí impide finalizar.
5. **Marcar como revisado** solo si las rutas de aprobación/rechazo, integridad del mapa y restricciones están resueltas. El estado REVIEWED no certifica viabilidad del ERP.

## 4. PG12 — Prueba de los contadores

En el caso de cuatro actividades **tal como se mostró en la captura de PG12** (antes de modificar el borrador):

| Indicador | Esperado en esa versión |
|---|---:|
| Se mantienen | 0 |
| Modificadas / control | 4 |
| Añadidas | 0 |
| Eliminadas | 0 |
| Observaciones PG11 | 8, **si no cambian las comprobaciones de PG11** |
| Bloqueos | 0, si está realmente REVIEWED |
| Paso fuente | 4 actividades del AS-IS v2 |
| Mapa | **1 solo `processGraphHtml`**, con decoraciones TO-BE, no otro grafo |

En **PG12 → «Comprobar contadores y procedencia»** se desglosan por paso el número de advertencias, fricciones/riesgos vinculados y esperas/retrabajos **declarados**.

**Métricas backend que aparecían en la captura:** trabajo activo AS-IS **403,2 h/año**; espera **5.529,6 caso-horas/año**; retrabajo **9,6 h/año**. Deben coincidir con los outputs backend del **mismo estudio/versionado**, no recalcularse a ojo ni sustituirse por el fixture de seis pasos. Los beneficios futuros permanecen «No disponible con evidencia suficiente».

### Prueba de cambio controlado en una COPIA del estudio, no en el registro validado

- Cambiar P1 de *Se modifica* a *Se mantiene*, conservando las demás condiciones y completando su justificación. Tras revisar la **nueva versión**, el contador cambia de **0 a 1 mantenida** y de **4 a 3 modificadas**.
- Agregar una **actividad nueva** en PG11 con origen, propósito, responsable, datos y rutas explícitos. Tras revisión, **Añadidas** sube a 1; la actividad aparece en el **mismo mapa nativo**.
- Marcar una actividad como *Se elimina* en una versión de prueba y resolver sus conexiones antes de revisión. **Eliminadas** sube a 1 y el original queda visible, pero marcado retirado.
- Resolver una advertencia **con evidencia nueva y confirmada** modifica el contador en la versión posterior, no por pulsar «Guardar».
- Los totales de mantenidas, modificadas, añadidas y eliminadas deben sumar el total de actividades del TO-BE de la versión revisada.

## 5. QA técnica

```bash
cd /workspaces/AUNEA/3_SYSTEM/frontend
npm test
```

Para ejecutar la regresión de PG12 por separado:

```bash
node --test tests/pg12-overlay.test.cjs
```

Para verificar toda la interfaz y los circuitos afectados deben ejecutarse además las UAT existentes de PG11 y la prueba manual del navegador (mapa, zoom/desplazamiento, rutas, botones centrados y legibilidad). **No confundir las pruebas unitarias con homologación visual**.

### Regresión PG12 · Modos Actual / Propuesto / Comparación (17/11/2026)

En el estudio de **cuatro actividades** el modo «Propuesto» omitía visualmente la ruta NO de P2. Se ha corregido en rama REVIEW para que `drawProcessGraph()` (el renderizador original) dibuje las rutas en los tres modos; la vista Comparación incorpora una segunda capa nativa sólo cuando hay diferencias de conexiones.

**UAT visual pendiente:** comprobar en cada modo las rutas P2 SÍ → P3 y P2 NO → P4; la persistencia de nodos originales; la ausencia de avisos TO-BE en Actual; los colores en Propuesto; y que no aparezca un segundo mapa. En el estudio visualizado, el reparto esperado es **0 mantenidas, 4 modificadas, 0 añadidas, 0 eliminadas y 8 advertencias** (dos por actividad) siempre que no cambien las fuentes de PG11. La espera AS-IS de P3 indicada en este estudio es **768 min**, distinta del fixture genérico de seis pasos (720 min): no mezclar datasets.

QA técnica: **9/9 pruebas dirigidas PASS** en harness V8. Faltan ejecución `node --test tests/pg12-overlay.test.cjs` en entorno de usuario y comprobación visual real antes del cierre.

## 6. Condición de cierre

No cerrar como «funciona todo» mientras alguna factura rechazada pueda continuar a P4 como aprobada, existan rutas pendientes, se contradiga DF075/DF088, se invente integración ERP, o un contador no pueda reconciliarse con su fuente. PG12 es *solo lectura* y no debe modificar PG11 ni el AS-IS.
