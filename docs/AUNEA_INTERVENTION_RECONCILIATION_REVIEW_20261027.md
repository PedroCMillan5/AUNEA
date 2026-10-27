# Conciliación intervención → componente → evento → Pain (REVIEW)

Base verificada: `2627a197ed3a22dda9dfecbc34a797e1abec5336`, rama `work/as-is-ux-simplification-20260930`.
Clasificación: contrato técnico de datos/reglas candidato, aditivo y exclusivamente REVIEW.
No modifica Diagnostic Master v1.2, Simulator v1.14, DF001–DF100, Economics,
Recommendation, Pricing, Scenario Comparator ni OPTIMAL. No crea captura diagnóstica.

## Fuentes y criterio de aceptación

Master Index v1.58; PROJECT_RULES v1.7; DECISIONES vigente v1.34 (el índice aún
cita v1.31), DEC-034/050/052/053/055/065/068/074; Diagnostic Master v1.2,
EAR-001/004/009/012 y SE-01/02/09; Simulator CANONICAL v1.14; contratos Drive
`1K1V53bQSOplc6m34zGVwV92UcKY4JZFHKaVusoakg1w` y
`1-44uXJI8RfMtkGDu3GZ5Q0_mHNkLTCObC76t0BnK_nw`.

Aceptación: ninguna hipótesis temporal se convierte en hipótesis económica por
coincidencia nominal de Pain. Debe existir evento único, línea base equivalente,
alcance revisado y ausencia de propagación a otros inputs. El snapshot, los
motores y el óptimo conservan su estado. Faltantes y empeoramientos son visibles.

## Hallazgo en el comparador existente

`ScenarioAssumption` está indexado por Pain. `_scenario_econ` aplica su
`future_active_hours` a **cada** EconomicInput del Pain y recorta recuperaciones
negativas mediante `max(0, ...)`. No ofrece selección de evento ni representación
de deltas negativos. `EconomicInput.step_ids` aporta trazabilidad, no identidad
de evento; `deduplication_key` identifica el evento. Igualdad numérica de horas
no acredita por sí sola igualdad de población, frecuencia o periodo.

## Contrato ejecutable

`POST /v1/diagnostic/interventions/reconcile-review`

- `engagement_id`: Engagement existente; referencia técnica, no nuevo DF.
- `projection`: contrato InterventionProjectionRequest vigente, AS-IS completo,
  snapshot versión/hash declarado y propuestas revisadas por componente.
- `economics` / `pains`: colecciones originales de esa versión, sin recaptura.
- `bindings`: revisión técnica de correspondencia; clave de intervención/paso/
  dimensión, índice del EconomicInput dentro de la colección exacta, event_key,
  fundamento, fuente, estado y equivalencia explícita
  `EXACT_COMPONENT_SAME_POPULATION_PERIOD`.

Primera llamada sin bindings devuelve `basis_fingerprint` y pendientes. Una
revisión usa esa huella; cambiar Engagement, snapshot, hipótesis, evidencia,
orden/contenido de inputs o fricciones invalida la atribución. El índice es
necesario porque el modelo actual EconomicInput no tiene ID de registro; nunca
se utiliza sin su huella. `review_fingerprint` incluye además las atribuciones
y su procedencia, y se incorpora al source_or_rule_id de las hipótesis candidatas.
Ninguna huella suministrada demuestra por sí misma un sellado PG09.

## Restricciones del puente candidato v1

1. Reutiliza la proyección temporal existente: volumen, rutas, repeticiones y
   error/retrabajo. Cada fila conserva línea base, futuro del componente y delta
   firmado; no suma ACTIVE y REWORK como un nuevo total del proceso.
2. Fricciones referenciadas deben existir y pertenecer al paso; INCLUDED se
   explica dentro del trabajo/espera, BREAKDOWN dentro de REWORK. No aporta una
   segunda cantidad. ADDITIONAL queda pendiente de contrato propio.
3. Se reutiliza `economic_overlap_issues`. Event key e input únicos, un único
   paso propietario y Pain confirmado. Se rechazan eventos duplicados, ámbitos
   múltiples y otros registros de trabajo del mismo paso o sin ámbito.
4. ACTIVE admite drivers activos existentes excepto ED05; REWORK usa ED05.
   Las horas anuales del owner deben coincidir con el componente calculado
   (tolerancia técnica absoluta 0,0001 h, misma precisión de la proyección).
   La equivalencia de población/periodo requiere revisión explícita con fuente.
5. Por limitación del comparador actual se exige **un solo EconomicInput por
   Pain**. No se distribuyen horas ni inventan factores para franquear un fan-out.
6. WAIT conserva su exposición temporal y queda pendiente de equivalencia con
   espera económica. No produce reducción E2E ni valor laboral.
7. Un empeoramiento conserva delta negativo; no se exporta a un comparador que
   lo ocultaría. Riesgos referenciados quedan pendientes de validación contra su
   owner; este contrato no altera autoridad, controles ni scoring de riesgo.
8. Solo si todas las intervenciones tienen atribución compatible se preparan
   `candidate_assumptions` del tipo existente ScenarioAssumption. Sin exportación
   parcial de un plan global. Estas hipótesis **no se ejecutan ni se guardan**.

La respuesta siempre declara `official=false`, `snapshot_seal_verified=false`,
`publication_allowed=false`, `comparator_executed=false`. Precio, caja, valoración
económica, E2E futuro y óptimo son null. La compatibilidad se prueba invocando el
comparador real exclusivamente en tests; no constituye autorización de PG14.

## Caso facturas y evidencia de pruebas

Se reutiliza `frontend/uat/cases/invoices.json`, incluida la ruta de aprobación
del 25% y las fricciones INCLUDED/BREAKDOWN. La fixture por sí sola no contiene
una atribución económica revisada: se conserva el delta temporal y el puente
queda PENDING. Las pruebas positivas añaden **evidencia de atribución sintética
explícita**, sin modificar el fichero original ni afirmar que la empresa la haya
validado.

- Registro 5→3 min: componente anual 160→96 h; diferencia 64 h. El endpoint
  prepara la hipótesis; el comparador real la acepta y preserva OPTIMAL.
- Aprobación 720→600 min, 25%: diferencia 960 caso-horas de exposición; sin E2E.
- Retrabajo 10→6 min, 8%: componente 25,6→15,36 h; diferencia 10,24 h.
- Registro 5→7 min: futuro 224 h y delta −64 h, sin ocultación ni exportación.

35 nuevas pruebas: HTTP→conciliación→contrato→comparador, fuente inmutable,
ausencia de escrituras/audit runs, fingerprint, datos obsoletos, fan-out por Pain,
eventos/inputs duplicados, alcance, fricciones, desconocidos, cero explícito,
empeoramiento, fuentes y números no finitos. QA local: backend **338 PASS**;
frontend **682 PASS**. Chromium local no ejecutado por fallo de descarga del
binario; validar el Acceptance Gate sobre el commit publicado.

## Pendientes concretos

- Promoción canónica del contrato antes de integrarlo en PG14 oficial.
- Resolver identidad persistente de evento y reparto múltiple por Pain; no
  ampliar ScenarioAssumption sin gobernar la migración del comparador.
- Tratar empeoramientos en economía oficial, sin recorte silencioso.
- Sellado PG09 verificable en backend y carga atómica de owners desde esa versión.
- Modelo de rutas/concurrencias, calendarios, población estadística y partes no
  reconstruidas antes de calcular E2E futuro comparable con DF026.
- Tarifa vinculada al recurso exacto para valorar capacidad; mecanismo financiero
  acreditado para caja, alcance/quote vigente para precio y payback.
- Compatibilidad técnica entre intervenciones, controles, aprobación humana y
  capacidades ERP/IA: no se certifican mediante la mera ausencia de doble conteo.
- Integración UI, revisión/publicación y aceptación nativa del propietario.
- Incidencia de captura de pantalla Diagnóstico: sin causa reproducida; no se
  cambia su renderizado ni se declara resuelta.

El estado general sigue REVIEW. No cambia el orden del ROADMAP ni se promueve
main, CANONICAL o producción. Se actualizan contrato REVIEW y BITACORA; el índice
registra esta implementación candidata, sin convertirla en regla oficial.
