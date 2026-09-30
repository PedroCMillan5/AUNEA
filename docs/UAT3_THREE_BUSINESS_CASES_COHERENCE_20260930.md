# UAT3 — Tres diagnósticos integrales y revisión de continuidad de datos

**ARCHIVED — revisión inicial sustituida por [`UAT3_END_TO_END_AUDIT_12_MILESTONES_20260930.md`](./UAT3_END_TO_END_AUDIT_12_MILESTONES_20260930.md).** Esta versión documenta hallazgos antes de corregir RiskInput.step_ids y antes de ejecutar Chromium nativo; no debe utilizarse como estado vigente.
Fecha: 2026-09-30 · Estado: REVIEW / PILOT · Código: `reconcile/frontend-v1.0.4-source`

## Alcance real
Tres expedientes de negocio sintéticos, específicos y separados de las UAT1 (12 empresas, 24 contactos, 24 interacciones, 16 oportunidades) y UAT2 (12 estudios en Preparación). Carga explícita desde UAT / QA, sin sobrescribir datos reales. Cada expediente incorpora su Company, dos Contacts, Opportunity, Interaction, respuestas capturables de S01–S09, seis ProcessSteps, tres Frictions, dos Risks y dos EconomicInputs declarados. Los datos medidos que no existen no se hacen pasar por evidencia medible. El cierre y las confirmaciones permanecen pendientes.

### Acceso dentro de la aplicación
1. Ejecutar el servidor frontend vigente del repositorio y backend vigente.
2. UAT / QA → Fase 1, «Reiniciar y cargar Fase 1 CRM»; comprobar PASS.
3. Fase 2, «Generar Fase 2 Estudios»; comprobar PASS.
4. Fase 3, «Generar los tres casos completos».
5. Cada tarjeta permite «Abrir diagnóstico completo», «Ver demanda» y «Abrir mapa AS-IS». Los estudios también figuran en P05 Estudios.
6. Eliminar únicamente UAT3 con «Eliminar sólo estos tres casos»; un reinicio UAT general sí reinicia las UAT (comportamiento preexistente).

## Caso A: facturas de proveedor
- Levante Instalaciones Técnicas; responsable Elena Vidal; dirección Marcos Soto.
- Entrada: email con factura PDF; salida: cotejo, aprobación si importe superior a 1.500 € o discrepancia, registro en ERP y archivo.
- Demanda declarada: 160/mes, pico 230/mes, 8 % de error global, objetivo 48 h, ciclo habitual declarado 72 h.
- Flujo de seis pasos: recibir → validar → cotejar → determinar aprobación; SÍ → aprobar (25 % de casos) → registrar y archivar; NO → registrar y archivar. No se valida una factura rechazada.
- Tres fricciones: documentos incompletos (BREAKDOWN del retrabajo de validación), cola de dirección (espera, sin tratarla como coste directo), reintroducción en ERP (INCLUDED en tiempo activo del paso).
- Dos riesgos: factura duplicada y omisión de aprobación.

## Caso B: peticiones unificadas
- Nexo Gestión Empresarial; responsable Marta Carrasco; dirección Pablo Serrano.
- Entrada: petición por email, llamada o formulario; salida: un único registro clasificado/asignado con aviso al solicitante.
- Demanda: 110/mes, pico 145/mes, error global 18 %, objetivo 24 h, ciclo declarado 40 h.
- Seis pasos: recibir → completar datos → clasificar; SÍ si compromiso >2.000 € → validar presupuesto (25 %); NO → crear registro; ambas vías convergen en asignar → avisar.
- Tres fricciones: hilos separados para un mismo caso, datos incompletos, owner poco claro. Dos riesgos: clasificación incorrecta y permisos interdepartamentales.

## Caso C: email → ticket de pedido
- Costa Sur Distribución; responsable Sara Romero; operaciones David Marín.
- Entrada: email con referencias, cantidades y fecha; salida: ticket único con vínculo al hilo y acuse tras revisar disponibilidad.
- Demanda: 310/mes, pico 420/mes, error global 11 %, objetivo 8 h, ciclo habitual declarado 15 h.
- Seis pasos: localizar hilo → extraer líneas → comprobar; SÍ si stock/referencia correctos → crear ticket → enviar acuse; NO → resolver excepción (12 %) → crear ticket → enviar acuse.
- Tres fricciones: referencias ambiguas, doble mecanización en ERP y espera de stock. Dos riesgos: prometer plazo no verificado y tickets duplicados por respuesta a un hilo.

## Hallazgos del modelo vigente, no resueltos mediante maquillaje de UAT
| Código | Incidencia verificable | Efecto en los tres expedientes | Acceso |
|---|---|---|---|
| H01 | `reusedValue(DF047)` y `reusedValue(DF049)` devuelven la misma colección `inputs + outputs` de los pasos. | «Fuentes de datos» y «Documentos» presentan resultados indistintos. | Diagnóstico S04 |
| H02 | `DF028` se captura como tasa global, mientras `ProcessStep.error_rate` (DF040) tiene universo por paso; no existe reconciliación automática comprobada. | 8 %, 18 % y 11 % globales no deben compararse ni sumarse sin definir población/base. | Demanda S03 / mapa |
| H03 | `DF080/DF081` piden seguimiento/reporting mientras los pasos ya contienen acciones manuales con tiempo activo; sin desglose validado, sumar sería doble conteo. | Las tres UAT llevan declaración explícita de estos tiempos pero no se computan como ahorro adicional. | S07 / mapa |
| H04 | El editor conserva `Risk.step_ids`, pero `RiskInput` del backend no tiene ese campo: verificar cómo se conserva el vínculo en resultados. | Dos riesgos por caso ligados al mapa en interfaz; posible pérdida de trazabilidad en proyección hacia backend. | Riesgos / resultados |
| H05 | `DF026` declarado supera las esperas observadas en los pasos sin explicación de la diferencia. | Facturas: 72 h frente a esperas 90/60 min + 720 min sólo para 25 %; peticiones: 40 h frente a 120 min + 480 min sólo para 25 %; pedidos: 15 h frente a 30/45 min + 240 min sólo para 12 %. No sustituir cifras declaradas por una suma ingenua. | Demanda S03 / AS-IS |
| H06 | La tasa de coste por hora ED14 y coste de herramienta ED12 son declaraciones sintéticas, sin tiempo anual acreditado ni deduplicación de eventos de pérdida. | No fabricar valores derivados DF078/DF079 ni ROI, ahorro de caja o cuantificación oficial. | S07 |
| H07 | DF093/PG09 y confirmaciones de mapa, fricciones, riesgos e impacto requieren la interacción humana. | Ningún caso se crea «cerrado» ni con snapshot validado artificialmente. | PG09 |

## Regla de datos aplicada a la UAT
No se copia un valor al `answers` del estudio cuando es propiedad de `ProcessStep`, `Friction`, `Risk` o backend (por ejemplo DF017, DF046, DF047, DF049, DF050, DF057, DF066, DF067, DF078, DF079, DF085, DF093, DF094 y DF095). La empresa y el contacto se enlazan desde CRM. Todos los valores ficticios se identifican como escenario sintético declarado (`CLIENT_DECLARED`), nunca como histórico observado de un cliente.

## Limitaciones de esta validación
El gate automático comprueba que los generadores reales crean los tres estudios, sus referencias, catálogos, rutas, propietarios y conflictos explícitos. No equivale a una UAT manual con navegador, tiempos del backend comprobados caso a caso ni autorización real de cliente. H01–H06 son elementos del producto a corregir/validar; no se considera cerrado el diagnóstico por el mero hecho de poblar datos.
