// [AUNEA-UAT-STUDY-SUITE-050] START — 120-case full Study UAT suite
// PURPOSE: Manual acceptance suite for the complete Engagement/Study lifecycle PG01–PG15, Session 2 and E2E robustness.
// SOURCE: Diagnostic Master v1.2; AUNEA_SYSTEM_SIMULATOR_CANONICAL v1.11; Architecture Contract v1.6; DEC-050/051/052/053/054/055/059/060.
// INPUTS: current UI/runtime; tester actions. This catalogue does not create business data by itself.
// OUTPUTS: STUDY-UAT-001..120 catalogue and QA-only PASS/FAIL/PENDING progress.
// SIDE_EFFECTS: QA progress only in state.studyUatResults; no CRM/business mutation.
// CHANGE_RISK: MEDIUM.

const STUDY_UAT_GROUPS = Object.freeze([
  {id:'PG01',label:"Contexto y objetivo",cases:[
    {id:'STUDY-UAT-001',page:'PG01',title:"Composición principal de 12 campos",steps:"Abrir PG01 con un estudio nuevo y revisar la composición principal.",expected:"Aparecen exactamente los 12 campos gobernados, en el orden aprobado, sin duplicados."},
    {id:'STUDY-UAT-002',page:'PG01',title:"Owners Company/Contact/Engagement",steps:"Editar Empresa, contacto y contexto desde PG01.",expected:"Cada cambio escribe en su owner real; no se crea una copia paralela en Engagement."},
    {id:'STUDY-UAT-003',page:'PG01',title:"Preselección de Company y Contact",steps:"Crear estudio desde una oportunidad/contacto y abrir PG01.",expected:"Empresa y persona de contacto llegan preseleccionadas por referencia."},
    {id:'STUDY-UAT-004',page:'PG01',title:"Tamaño derivado",steps:"Cambiar employeeCount en Empresa y volver a PG01.",expected:"Tamaño se actualiza como proyección; no existe un segundo campo editable."},
    {id:'STUDY-UAT-005',page:'PG01',title:"No-Reask en contexto",steps:"Volver a PG01 tras completar datos ya conocidos.",expected:"Los datos existentes se reutilizan y no se repreguntan salvo validación/corrección."},
    {id:'STUDY-UAT-006',page:'PG01',title:"Progressive disclosure S01",steps:"Completar la composición principal y revisar campos S01 adicionales.",expected:"DF008–DF010 permanecen disponibles sin alterar los 12 campos principales."}
  ]},
  {id:'PG02',label:"Alcance del proceso",cases:[
    {id:'STUDY-UAT-007',page:'PG02',title:"Área funcional del Engagement",steps:"Seleccionar Business_Area_ID en PG02.",expected:"El área se guarda en Engagement y no modifica Company.Sector."},
    {id:'STUDY-UAT-008',page:'PG02',title:"Nombre del proceso",steps:"Capturar DF011.",expected:"El nombre queda asociado al proceso del estudio."},
    {id:'STUDY-UAT-009',page:'PG02',title:"Trigger",steps:"Capturar DF012.",expected:"El inicio del proceso queda estructurado conforme al option set."},
    {id:'STUDY-UAT-010',page:'PG02',title:"Outcome",steps:"Capturar DF013.",expected:"El resultado final delimita correctamente el proceso."},
    {id:'STUDY-UAT-011',page:'PG02',title:"Límites condicionales",steps:"Activar condiciones que requieran DF014/DF015.",expected:"Los límites solo se solicitan cuando aplica el branch."},
    {id:'STUDY-UAT-012',page:'PG02',title:"Owner y participantes",steps:"Capturar DF016/DF017.",expected:"Responsable y participantes quedan vinculados al proceso sin duplicar Contact."},
    {id:'STUDY-UAT-013',page:'PG02',title:"Criticidad/documentación/variantes",steps:"Completar DF018–DF020.",expected:"Los tres datos se guardan y condicionan las etapas posteriores cuando corresponde."}
  ]},
  {id:'PG03',label:"Demanda, volumen y servicio",cases:[
    {id:'STUDY-UAT-014',page:'PG03',title:"Volumen y periodo",steps:"Completar DF021/DF022.",expected:"Volumen y periodo forman una baseline coherente."},
    {id:'STUDY-UAT-015',page:'PG03',title:"Pico y estacionalidad",steps:"Activar y completar DF023/DF024.",expected:"Los campos aparecen y se guardan solo cuando corresponden."},
    {id:'STUDY-UAT-016',page:'PG03',title:"SLA y ciclo real",steps:"Completar DF025/DF026.",expected:"SLA y tiempo actual permanecen diferenciados."},
    {id:'STUDY-UAT-017',page:'PG03',title:"Backlog y retrabajo",steps:"Completar DF027/DF028.",expected:"Cola y proporción de error/retrabajo quedan disponibles para economics/pains."},
    {id:'STUDY-UAT-018',page:'PG03',title:"Clases y tendencia",steps:"Completar DF029/DF030.",expected:"Prioridades y tendencia se guardan sin convertirlas en forecast financiero."}
  ]},
  {id:'PG04',label:"Mapa AS-IS",cases:[
    {id:'STUDY-UAT-019',page:'PG04',title:"Crear primer paso",steps:"Añadir un Process Step desde PG04.",expected:"El paso aparece en el mapa y conserva identidad estable."},
    {id:'STUDY-UAT-020',page:'PG04',title:"Crear varios pasos",steps:"Añadir varios pasos consecutivos.",expected:"El flujo se representa en orden y sin IDs duplicados."},
    {id:'STUDY-UAT-021',page:'PG04',title:"Editar paso",steps:"Modificar nombre, actor, herramienta y tiempos.",expected:"El mismo Step se actualiza; no se crea otro."},
    {id:'STUDY-UAT-022',page:'PG04',title:"Reordenar pasos",steps:"Mover un paso dentro del flujo.",expected:"El orden y normal_next_step quedan coherentes."},
    {id:'STUDY-UAT-023',page:'PG04',title:"Eliminar paso",steps:"Eliminar un paso no histórico de prueba.",expected:"Se retira del mapa y se reparan referencias permitidas."},
    {id:'STUDY-UAT-024',page:'PG04',title:"Ruta normal",steps:"Construir una cadena lineal de 4 pasos.",expected:"normal_next_step recorre la secuencia completa."},
    {id:'STUDY-UAT-025',page:'PG04',title:"Ruta de excepción",steps:"Añadir exception_path a un paso.",expected:"La excepción conserva condición, destino y owner."},
    {id:'STUDY-UAT-026',page:'PG04',title:"Múltiples excepciones",steps:"Configurar excepciones en distintos pasos.",expected:"Cada excepción mantiene su ruta sin sobrescribir las demás."},
    {id:'STUDY-UAT-027',page:'PG04',title:"Tiempos activos/espera/retrabajo",steps:"Capturar los tres tipos de tiempo.",expected:"Esperas no se suman como trabajo activo y retrabajo queda separado."},
    {id:'STUDY-UAT-028',page:'PG04',title:"Herramientas y canales",steps:"Asignar herramientas/canales distintos por paso.",expected:"Los valores se mantienen por Step y se muestran correctamente."},
    {id:'STUDY-UAT-029',page:'PG04',title:"Session Display AS-IS",steps:"Abrir la vista de sesión desde PG04.",expected:"El cliente ve el AS-IS permitido, sin IDs internos ni outputs futuros."},
    {id:'STUDY-UAT-030',page:'PG04',title:"Stress de pasos",steps:"Cargar/generar 20–50 pasos UAT.",expected:"Mapa, edición, scroll, persistencia y navegación siguen operativos."}
  ]},
  {id:'PG05',label:"Fricciones y evidencia",cases:[
    {id:'STUDY-UAT-031',page:'PG05',title:"Crear fricción",steps:"Añadir una fricción vinculada a un Step.",expected:"Se crea RT_FRICTION y queda ligada al paso."},
    {id:'STUDY-UAT-032',page:'PG05',title:"Fricción multi-step",steps:"Vincular una fricción a varios Steps.",expected:"affected_steps conserva todas las referencias."},
    {id:'STUDY-UAT-033',page:'PG05',title:"Tipo y causa",steps:"Seleccionar tipo y causa gobernados.",expected:"Se guardan valores de option sets canónicos."},
    {id:'STUDY-UAT-034',page:'PG05',title:"Pain derivado",steps:"Crear una fricción con mapping conocido.",expected:"Pain_ID se deriva; no se captura manualmente."},
    {id:'STUDY-UAT-035',page:'PG05',title:"Frecuencia",steps:"Capturar frecuencia de la fricción.",expected:"La frecuencia queda estructurada y trazable."},
    {id:'STUDY-UAT-036',page:'PG05',title:"Pérdidas de tiempo",steps:"Capturar active/wait loss.",expected:"Trabajo perdido y espera perdida se mantienen separados."},
    {id:'STUDY-UAT-037',page:'PG05',title:"Pérdida directa",steps:"Capturar direct_loss con evidencia.",expected:"El valor queda etiquetado con su naturaleza/evidencia."},
    {id:'STUDY-UAT-038',page:'PG05',title:"Evidencia",steps:"Asociar evidencia o referencia.",expected:"La fricción conserva la referencia sin duplicar el documento."},
    {id:'STUDY-UAT-039',page:'PG05',title:"Overlay de sesión",steps:"Abrir Session Display tras confirmar fricciones.",expected:"Las fricciones confirmadas se superponen al AS-IS sin mostrar Pain interno."}
  ]},
  {id:'PG06',label:"Riesgo y controles",cases:[
    {id:'STUDY-UAT-040',page:'PG06',title:"Crear riesgo",steps:"Añadir un riesgo desde el proceso.",expected:"El riesgo queda vinculado a su target correcto."},
    {id:'STUDY-UAT-041',page:'PG06',title:"Probabilidad e impacto",steps:"Capturar likelihood/impact.",expected:"Ambos valores permanecen separados y estructurados."},
    {id:'STUDY-UAT-042',page:'PG06',title:"Controles existentes",steps:"Indicar controles presentes.",expected:"El dato modifica el contexto de riesgo sin borrar el riesgo."},
    {id:'STUDY-UAT-043',page:'PG06',title:"Reversibilidad",steps:"Capturar reversibilidad.",expected:"Se mantiene conforme al catálogo gobernado."},
    {id:'STUDY-UAT-044',page:'PG06',title:"Trigger crítico",steps:"Marcar condición crítica cuando proceda.",expected:"El flag queda disponible para engines/gates."},
    {id:'STUDY-UAT-045',page:'PG06',title:"Riesgo cliente vs scoring interno",steps:"Abrir Session Display.",expected:"Cliente ve lenguaje de negocio, no scoring/metadatos internos."},
    {id:'STUDY-UAT-046',page:'PG06',title:"Múltiples riesgos",steps:"Añadir riesgos de categorías distintas.",expected:"Cada riesgo mantiene su identidad, categoría y referencias."}
  ]},
  {id:'PG07',label:"Impacto económico",cases:[
    {id:'STUDY-UAT-047',page:'PG07',title:"Economic input básico",steps:"Añadir un EconomicInput.",expected:"El registro se persiste separado de outputs calculados."},
    {id:'STUDY-UAT-048',page:'PG07',title:"Horas activas",steps:"Capturar annual_active_hours.",expected:"Se registra capacidad activa sin mezclar espera."},
    {id:'STUDY-UAT-049',page:'PG07',title:"Horas de espera",steps:"Capturar annual_wait_hours.",expected:"Espera permanece separada de trabajo activo."},
    {id:'STUDY-UAT-050',page:'PG07',title:"Cost rate",steps:"Capturar capacity_cost_rate.",expected:"El valor se conserva como input, no como ahorro realizado."},
    {id:'STUDY-UAT-051',page:'PG07',title:"Pérdida directa",steps:"Capturar direct_loss.",expected:"Se registra como driver económico distinto."},
    {id:'STUDY-UAT-052',page:'PG07',title:"Coste herramienta actual",steps:"Capturar current_tool_cost.",expected:"El coste queda disponible para comparativas posteriores."},
    {id:'STUDY-UAT-053',page:'PG07',title:"Clases de evidencia",steps:"Probar MEASURED/CLIENT_DECLARED/AUNEA_ESTIMATE/HYPOTHESIS.",expected:"Cada input conserva su evidence_type."},
    {id:'STUDY-UAT-054',page:'PG07',title:"Deduplificación",steps:"Crear inputs equivalentes con misma clave lógica.",expected:"No se produce doble contabilización silenciosa."}
  ]},
  {id:'PG08',label:"Objetivo y restricciones",cases:[
    {id:'STUDY-UAT-055',page:'PG08',title:"Resultados deseados",steps:"Completar DF086.",expected:"Target se guarda sin diseñar todavía el TO-BE."},
    {id:'STUDY-UAT-056',page:'PG08',title:"Restricciones",steps:"Completar restricciones aplicables.",expected:"Las restricciones quedan disponibles para Recommendation."},
    {id:'STUDY-UAT-057',page:'PG08',title:"Contexto reutilizado",steps:"Revisar datos previos mostrados en PG08.",expected:"Se reutiliza información de etapas anteriores sin repregunta."},
    {id:'STUDY-UAT-058',page:'PG08',title:"Sin TO-BE en Sesión 1",steps:"Abrir Session Display durante PG08.",expected:"No aparece propuesta TO-BE ni herramientas recomendadas."},
    {id:'STUDY-UAT-059',page:'PG08',title:"Cambio de target",steps:"Modificar un target antes del cierre.",expected:"Se invalida/recalcula únicamente lo downstream que corresponda."},
    {id:'STUDY-UAT-060',page:'PG08',title:"Múltiples restricciones",steps:"Combinar restricciones técnicas/operativas.",expected:"Todas se conservan de forma estructurada/trazable."}
  ]},
  {id:'PG09',label:"Validación y cierre",cases:[
    {id:'STUDY-UAT-061',page:'PG09',title:"Confirmación AS-IS",steps:"Confirmar DF093 con mapa material completo.",expected:"El Engagement queda confirmado con timestamp/snapshot."},
    {id:'STUDY-UAT-062',page:'PG09',title:"Bloqueo por faltantes",steps:"Intentar cerrar con required fields incompletos.",expected:"El sistema bloquea avance y muestra faltantes reales."},
    {id:'STUDY-UAT-063',page:'PG09',title:"Pendientes/evidencias",steps:"Cerrar con información pendiente permitida.",expected:"Los pendientes quedan visibles y no se inventan valores."},
    {id:'STUDY-UAT-064',page:'PG09',title:"Prioridades",steps:"Seleccionar prioridades de fricciones existentes.",expected:"Solo se priorizan elementos previamente capturados."},
    {id:'STUDY-UAT-065',page:'PG09',title:"Siguiente paso DF098",steps:"Capturar acción + owner + fecha.",expected:"Se serializa y persiste la estructura completa."},
    {id:'STUDY-UAT-066',page:'PG09',title:"Snapshot de Sesión 1",steps:"Cerrar una sesión válida.",expected:"Se conserva snapshot confirmado independiente de cambios futuros del master."},
    {id:'STUDY-UAT-067',page:'PG09',title:"Visibilidad de cierre",steps:"Revisar Session Display final.",expected:"No aparecen diagnóstico derivado, TO-BE, pricing ni recomendación."}
  ]},
  {id:'PG10',label:"Diagnóstico",cases:[
    {id:'STUDY-UAT-068',page:'PG10',title:"Ejecutar diagnóstico",steps:"Lanzar cálculo sobre un Engagement listo.",expected:"Se crea DiagnosticOutput real desde backend."},
    {id:'STUDY-UAT-069',page:'PG10',title:"Trazabilidad de finding",steps:"Abrir un finding.",expected:"Se muestran referencias a inputs/steps/evidencia origen."},
    {id:'STUDY-UAT-070',page:'PG10',title:"Corrección upstream",steps:"Usar Corregir origen.",expected:"Navega/escribe en el owner; el output no se edita directamente."},
    {id:'STUDY-UAT-071',page:'PG10',title:"Recalcular",steps:"Modificar un input material y recalcular.",expected:"Se genera un nuevo output/run coherente."},
    {id:'STUDY-UAT-072',page:'PG10',title:"Stale",steps:"Modificar input tras un cálculo sin recalcular.",expected:"El output queda marcado stale y no se presenta como vigente."},
    {id:'STUDY-UAT-073',page:'PG10',title:"Confidence/provenance interna",steps:"Abrir detalle interno.",expected:"Confidence/provenance se muestran solo en superficie interna."}
  ]},
  {id:'PG11',label:"TO-BE",cases:[
    {id:'STUDY-UAT-074',page:'PG11',title:"Crear propuesta DRAFT",steps:"Generar/instanciar una propuesta TO-BE.",expected:"Se crea versión DRAFT sin auto-confirmación."},
    {id:'STUDY-UAT-075',page:'PG11',title:"Relación con AS-IS",steps:"Seleccionar un cambio TO-BE.",expected:"Puede explicarse qué Step/finding AS-IS lo origina."},
    {id:'STUDY-UAT-076',page:'PG11',title:"Mantener paso",steps:"Marcar un paso como Se mantiene.",expected:"La relación entre origen y propuesta se conserva."},
    {id:'STUDY-UAT-077',page:'PG11',title:"Modificar paso",steps:"Modificar un paso en TO-BE.",expected:"AS-IS original permanece inmutable."},
    {id:'STUDY-UAT-078',page:'PG11',title:"Eliminar paso",steps:"Proponer eliminación.",expected:"Se registra como propuesta, no como borrado del AS-IS."},
    {id:'STUDY-UAT-079',page:'PG11',title:"Automatizar/asistir IA",steps:"Asignar estado de cambio correspondiente.",expected:"El estado textual refleja la propuesta sin prometer autonomía no gobernada."},
    {id:'STUDY-UAT-080',page:'PG11',title:"Revisión consultor",steps:"Editar propuesta DRAFT.",expected:"Se crea/actualiza versión gobernada antes de exposición."},
    {id:'STUDY-UAT-081',page:'PG11',title:"Aprobación TO-BE",steps:"Aprobar una versión.",expected:"Solo la versión aprobada queda disponible para resultados cliente."}
  ]},
  {id:'PG12',label:"AS-IS vs TO-BE",cases:[
    {id:'STUDY-UAT-082',page:'PG12',title:"Comparación por origen",steps:"Abrir comparación.",expected:"Cada cambio TO-BE se alinea con su elemento AS-IS."},
    {id:'STUDY-UAT-083',page:'PG12',title:"Tiempos comparables",steps:"Comparar tiempos soportados.",expected:"Los deltas usan magnitudes compatibles y no mezclan espera con trabajo."},
    {id:'STUDY-UAT-084',page:'PG12',title:"Elementos añadidos/eliminados",steps:"Revisar altas/bajas.",expected:"Se distinguen visualmente sin alterar fuentes."},
    {id:'STUDY-UAT-085',page:'PG12',title:"Sin captura duplicada",steps:"Intentar editar desde comparación.",expected:"La comparación remite al owner; no crea un tercer dato editable."},
    {id:'STUDY-UAT-086',page:'PG12',title:"Versiones correctas",steps:"Cambiar versión TO-BE seleccionada.",expected:"La comparación usa AS-IS confirmado + versión TO-BE elegida."}
  ]},
  {id:'PG13',label:"Solución / recomendación / pricing",cases:[
    {id:'STUDY-UAT-087',page:'PG13',title:"Recommendation backend",steps:"Abrir recomendación tras cálculo.",expected:"Se consume output del engine; no se reinterpreta en frontend."},
    {id:'STUDY-UAT-088',page:'PG13',title:"Resultado antes que stack",steps:"Revisar narrativa.",expected:"Primero se expresa capability/resultado; stack técnico queda en segundo nivel."},
    {id:'STUDY-UAT-089',page:'PG13',title:"CommercialScope",steps:"Ajustar alcance permitido.",expected:"El ajuste se guarda como scope interno separado de outputs del engine."},
    {id:'STUDY-UAT-090',page:'PG13',title:"Exclusiones",steps:"Definir qué queda fuera.",expected:"Las exclusiones se conservan y aparecen en propuesta/resultado."},
    {id:'STUDY-UAT-091',page:'PG13',title:"Producto gobernado",steps:"Revisar producto recomendado.",expected:"Solo aparece un producto/capability existente en fuente canónica."},
    {id:'STUDY-UAT-092',page:'PG13',title:"Pricing válido",steps:"Revisar inversión.",expected:"Solo se muestra pricing cuando existe output canónico válido."},
    {id:'STUDY-UAT-093',page:'PG13',title:"No preguntas nuevas 90m",steps:"Revisar inputs de PG13.",expected:"No se introducen preguntas adicionales de discovery de Sesión 1."},
    {id:'STUDY-UAT-094',page:'PG13',title:"Cambio upstream y stale",steps:"Modificar input material previo.",expected:"Recommendation/pricing quedan stale hasta recalcular."}
  ]},
  {id:'PG14',label:"Escenarios",cases:[
    {id:'STUDY-UAT-095',page:'PG14',title:"Escenario Optimal",steps:"Generar escenarios.",expected:"Existe un escenario Optimal identificado explícitamente."},
    {id:'STUDY-UAT-096',page:'PG14',title:"Optimal inmutable",steps:"Intentar modificar Optimal.",expected:"No se muta; cualquier cambio crea alternativa."},
    {id:'STUDY-UAT-097',page:'PG14',title:"Crear alternativa",steps:"Crear escenario alternativo.",expected:"Se genera ScenarioRequest/Result separado."},
    {id:'STUDY-UAT-098',page:'PG14',title:"Supuestos",steps:"Editar supuestos permitidos de alternativa.",expected:"Los supuestos quedan trazables por escenario."},
    {id:'STUDY-UAT-099',page:'PG14',title:"Comparación económica",steps:"Comparar escenarios.",expected:"Solo se comparan métricas soportadas y homogéneas."},
    {id:'STUDY-UAT-100',page:'PG14',title:"Seleccionar escenario",steps:"Seleccionar alternativa u Optimal.",expected:"selectedScenario referencia el elegido sin borrar Optimal."},
    {id:'STUDY-UAT-101',page:'PG14',title:"Override consultor",steps:"Crear override sobre una recomendación.",expected:"Se registra como alternativa gobernada, nunca reemplazo silencioso."},
    {id:'STUDY-UAT-102',page:'PG14',title:"Persistencia de escenarios",steps:"Guardar/reabrir Engagement.",expected:"Los escenarios conservan inputs/versión y selección."}
  ]},
  {id:'PG15',label:"Resultados / entregables",cases:[
    {id:'STUDY-UAT-103',page:'PG15',title:"Síntesis ejecutiva",steps:"Abrir PG15.",expected:"La historia sigue Contexto→AS-IS→findings→TO-BE→solución→escenario→siguiente paso."},
    {id:'STUDY-UAT-104',page:'PG15',title:"Gate DRAFT",steps:"Generar un pack inicial.",expected:"El entregable nace DRAFT."},
    {id:'STUDY-UAT-105',page:'PG15',title:"REVIEWED",steps:"Marcar revisión completada.",expected:"El estado avanza sin publicar aún al cliente."},
    {id:'STUDY-UAT-106',page:'PG15',title:"APPROVED_FOR_CLIENT",steps:"Aprobar contenido.",expected:"Solo contenido autorizado queda elegible para superficies cliente."},
    {id:'STUDY-UAT-107',page:'PG15',title:"PUBLISHED",steps:"Publicar versión aprobada.",expected:"Se conserva versión publicada y snapshot origen."},
    {id:'STUDY-UAT-108',page:'PG15',title:"Bloqueo por stale",steps:"Intentar generar/publicar con outputs stale.",expected:"La acción se bloquea o advierte según regla; nunca publica silenciosamente."},
    {id:'STUDY-UAT-109',page:'PG15',title:"Coherencia del pack",steps:"Comparar PG15 con snapshot/outputs.",expected:"El pack coincide con fuentes versionadas y escenario seleccionado."}
  ]},
  {id:'S2',label:"Sesión 2 / Modo Resultados",cases:[
    {id:'STUDY-UAT-110',page:'S2',title:"Narrativa read-only",steps:"Abrir Modo Resultados.",expected:"Se presenta la narrativa aprobada sin controles de edición."},
    {id:'STUDY-UAT-111',page:'S2',title:"Sin discovery",steps:"Navegar toda la Sesión 2.",expected:"No aparecen preguntas de captura de PG01–PG09."},
    {id:'STUDY-UAT-112',page:'S2',title:"Sin recálculo",steps:"Interactuar con la vista.",expected:"No se disparan engines ni se modifican outputs."},
    {id:'STUDY-UAT-113',page:'S2',title:"Solo contenido aprobado",steps:"Comparar con PG15.",expected:"Solo se muestran outputs APPROVED_FOR_CLIENT/PUBLISHED."},
    {id:'STUDY-UAT-114',page:'S2',title:"Siguiente paso",steps:"Registrar una decisión/siguiente paso permitido.",expected:"La escritura se dirige al owner correspondiente, no al snapshot mostrado."}
  ]},
  {id:'E2E',label:"Lifecycle, persistencia y robustez",cases:[
    {id:'STUDY-UAT-115',page:'E2E',title:"Lifecycle completo",steps:"Recorrer Preparación→Sesión1→Trabajo interno→Listo resultados→Sesión2→Cerrado.",expected:"Los estados avanzan de forma coherente y auditable."},
    {id:'STUDY-UAT-116',page:'E2E',title:"Persistencia reload",steps:"Completar varias etapas, recargar navegador y volver.",expected:"Engagement, Steps, outputs y selección se recuperan sin pérdida."},
    {id:'STUDY-UAT-117',page:'E2E',title:"Backup/restore",steps:"Exportar backup, alterar estado y restaurar.",expected:"Se recupera el snapshot esperado con IDs/relaciones intactos."},
    {id:'STUDY-UAT-118',page:'E2E',title:"Master vivo vs snapshot",steps:"Cambiar un master después de cerrar Sesión 1.",expected:"El snapshot histórico del Engagement no se reescribe."},
    {id:'STUDY-UAT-119',page:'E2E',title:"Proyecto solo tras decisión",steps:"Intentar crear Project antes/después del gate permitido.",expected:"Solo una decisión de implementación sobre Engagement habilita Project."},
    {id:'STUDY-UAT-120',page:'E2E',title:"E2E completo",steps:"Ejecutar un estudio UAT desde PG01 hasta publicación/Sesión2.",expected:"El ciclo completo termina sin duplicar owners, romper referencias ni usar datos CRM dummy."}
  ]}
]);
const STUDY_UAT_CATALOG = Object.freeze(STUDY_UAT_GROUPS.flatMap(g=>g.cases));
function studyUatResults(){state.studyUatResults=state.studyUatResults||{};return state.studyUatResults}
function studyUatSet(id,status){
  if(!['PASS','FAIL','PENDING'].includes(status))return;
  const r=studyUatResults();
  if(status==='PENDING')delete r[id];else r[id]={status,updatedAt:now()};
  markDirty('UAT de Estudio actualizado: '+id+' '+status);
  persistRecoverySnapshot('study-uat-progress');
  render();
}
function studyUatReset(){
  if(!confirm('¿Reiniciar el progreso de las 120 UATs de Estudio? No se eliminará ningún dato del estudio ni del CRM.'))return;
  state.studyUatResults={};markDirty('Progreso UAT de Estudio reiniciado');persistRecoverySnapshot('study-uat-reset');render();
}
function studyUatSummary(){
  const r=studyUatResults(),all=STUDY_UAT_CATALOG;
  const pass=all.filter(x=>r[x.id]?.status==='PASS').length,fail=all.filter(x=>r[x.id]?.status==='FAIL').length;
  return {total:all.length,pass,fail,pending:all.length-pass-fail};
}
function studyUatCard(c){
  const st=studyUatResults()[c.id]?.status||'PENDING';
  return `<div class="result-item study-uat-item" data-study-uat="${esc(c.id)}"><div class="result-item-head"><div><b>${esc(c.id)} · ${esc(c.title)}</b><p><strong>Prueba:</strong> ${esc(c.steps)}</p><p><strong>Esperado:</strong> ${esc(c.expected)}</p></div><span class="status ${st==='PASS'?'green':st==='FAIL'?'red':''}">${esc(st==='PENDING'?'PENDIENTE':st)}</span></div><div class="result-actions"><button class="btn btn-small" data-study-uat-status="${esc(c.id)}" data-value="PENDING">Pendiente</button><button class="btn btn-small" data-study-uat-status="${esc(c.id)}" data-value="FAIL">FAIL</button><button class="btn btn-small btn-primary" data-study-uat-status="${esc(c.id)}" data-value="PASS">PASS</button></div></div>`;
}
function studyUatHtml(){
  const s=studyUatSummary();
  const groups=STUDY_UAT_GROUPS.map(g=>{
    const gr=g.cases,pass=gr.filter(x=>studyUatResults()[x.id]?.status==='PASS').length,fail=gr.filter(x=>studyUatResults()[x.id]?.status==='FAIL').length;
    return `<details class="uat-group"><summary><b>${esc(g.id)} · ${esc(g.label)}</b><span>${pass}/${gr.length} PASS${fail?' · '+fail+' FAIL':''}</span></summary><div class="result-list">${gr.map(studyUatCard).join('')}</div></details>`;
  }).join('');
  return section('ESTUDIO · 120 UATs','Suite de aceptación completa del Engagement: Sesión 1, trabajo interno, Sesión 2 y E2E. Los 15 fixtures históricos permanecen abajo únicamente como herramientas de carga/stress.',
    `<div class="grid g4"><div class="card metric"><small>Total</small><strong>${s.total}</strong><span>casos</span></div><div class="card metric"><small>PASS</small><strong>${s.pass}</strong><span>validados</span></div><div class="card metric"><small>FAIL</small><strong>${s.fail}</strong><span>requieren corrección</span></div><div class="card metric"><small>Pendientes</small><strong>${s.pending}</strong><span>por ejecutar</span></div></div><div class="result-list" style="margin-top:14px">${groups}</div>`,
    '<button class="btn btn-outline" id="resetStudyUat">Reiniciar progreso UAT Estudio</button>');
}
const __auneaUatPageBeforeStudySuite=pages.uat;
pages.uat=function(){return __auneaUatPageBeforeStudySuite()+studyUatHtml()};
const __auneaPostBindBeforeStudySuite=postBind;
postBind=function(){
  __auneaPostBindBeforeStudySuite();
  document.querySelectorAll('[data-study-uat-status]').forEach(b=>b.onclick=()=>studyUatSet(b.dataset.studyUatStatus,b.dataset.value));
  const reset=document.getElementById('resetStudyUat');if(reset)reset.onclick=studyUatReset;
};
// [AUNEA-UAT-STUDY-SUITE-050] END
