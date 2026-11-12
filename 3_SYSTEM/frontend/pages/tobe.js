// [AUNEA-FE-PG11-GUIDED-NAV-266] START — navigation derives from selected owner.
function tobeGuidedNavHtml(e,p){
  const guidedItems=[...(p.items||[]),...tobeAddedSteps(p)],
    focused=tobeSelectedItem(e,p),selectedId=tobeFlowItemId(focused),
    focusedIndex=Math.max(0,guidedItems.findIndex(x=>tobeFlowItemId(x)===selectedId));
  const modeButton=(mode,label)=>'<button type="button" class="btn '+
    (__auneaTobeMode===mode?'btn-primary':'btn-outline')+
    '" data-tobe-mode-switch="'+mode+'" aria-pressed="'+String(__auneaTobeMode===mode)+'">'+label+'</button>';
  return '<nav class="tobe-guided-nav" aria-label="Navegación del diseño TO-BE">'+
    '<div class="tobe-guided-modes">'+modeButton('guided','Revisión por actividad')+
    modeButton('map','Mapa TO-BE')+'</div>'+
    '<div class="tobe-guided-tabs" aria-label="Actividades del proceso">'+
    guidedItems.map((step,i)=>'<button type="button" class="btn btn-outline btn-small '+
      (tobeFlowItemId(step)===selectedId?'is-selected':'')+'" data-tobe-select="'+
      attr(tobeFlowItemId(step))+'" aria-pressed="'+String(tobeFlowItemId(step)===selectedId)+'">'+
      '<b>P'+(i+1)+'</b> '+esc(tobeFlowItemName(step).split(/\s+/).slice(0,3).join(' '))+
      '</button>').join('')+'</div>'+
    '<div class="tobe-guided-switch"><span class="tobe-muted">Actividad '+
      (focusedIndex+1)+' de '+guidedItems.length+'</span>'+ 
    '</div></nav>';}
// [AUNEA-FE-PG11-GUIDED-NAV-266] END
function tobePage(){
  const e=currentEng(),snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  if(!snap)return pageTop('Diseño TO-BE','Necesita un AS-IS confirmado.',
    '<button class="btn" data-page="diagnostico">Volver al AS-IS</button>')+
    '<div class="notice warn">Confirma el cierre del AS-IS antes de diseñar el proceso futuro.</div>';
  if(!currentDiagnosticOutput(e))return pageTop('TO-BE preliminar',
    'Vista de orientación para preparar el diseño futuro; todavía no es un proceso propuesto ni una recomendación aprobada.',
    '<button class="btn btn-primary" data-page="resultados">Volver a revisión del AS-IS</button>')+
    section('Para qué sirve esta vista','Antes de diseñar, revisa el alcance de la transformación y las necesidades detectadas.',
      '<div class="notice info"><b>Qué puedes hacer ahora</b><p>Consultar problemas vinculados al AS-IS y vías de intervención pendientes de validar; no son pasos futuros aprobados.</p>'+
      '<p><b>Qué falta para diseñar:</b> revisar y confirmar las cinco decisiones técnicas internas desde PG10 y obtener la recomendación oficial vigente del backend.</p>'+
      '<p><b>Qué no sucede aquí:</b> no se modifican datos del AS-IS, no se crea ni aprueba un TO-BE y no se calculan ahorros o precios futuros.</p></div>')+
    section('Problemas de origen','Referencias AS-IS para orientar el diseño. No se editan aquí.',asisPointCardsHtml(asisAnalysisSource(e)))+
    section('Vías de intervención pendientes de validar','Opciones de análisis, no alternativas seleccionadas.',asisDirectionCardsHtml(e))+
    '<div class="notice warn">La edición y aprobación de un TO-BE definitivo requiere la recomendación oficial vigente. Regresa a PG10 para revisar las decisiones técnicas y comprobar requisitos.</div>';const p=latestTobe(e);
  if(!p)return pageTop('Diseño TO-BE','El proceso futuro parte del AS-IS confirmado.',
    '<button class="btn btn-primary" id="createTobeDraft">Crear borrador desde AS-IS confirmado</button>')+
    section('Fuente confirmada','El diseño comienza como propuesta sin aprobar.',
      '<div class="notice info">AS-IS confirmado v'+esc(snap.version)+
      '. El diagnóstico oficial se reutiliza; no se vuelve a capturar.</div>');
  const editable=tobeEditable(p),statusLabel={DRAFT:'Borrador',REVIEWED:'Revisado',APPROVED_FOR_CLIENT:'Aprobado para cliente',PUBLISHED:'Publicado'}[p.status]||p.status;
  const previousAudit=typeof document!=='undefined'?document.getElementById('tobeAiWorkspace'):null,
    keepAuditOpen=!!previousAudit?.open&&
      previousAudit.dataset?.engagementId===String(e.id)&&
      previousAudit.dataset?.tobeVersion===String(p.version);
  const actions='<button class="btn" data-page="resultados">Volver al diagnóstico</button>'+
    (['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'].includes(p.status)?'<button class="btn" data-page="comparacion">Ir a comparación PG12</button>':'')+
    (editable?'<button class="btn" id="saveTobe">Guardar borrador</button>':'')+
    (editable?'<button class="btn btn-primary" id="advanceTobe">Marcar como revisado</button>':
      p.status==='REVIEWED'?'<button class="btn btn-primary" id="advanceTobe">Aprobar para cliente</button>':'')+
    (!editable&&p.status!=='PUBLISHED'?'<button class="btn" id="newTobeVersion">Crear nueva versión</button>':'');
  const review=tobeHumanReviewRecord(e,p),reviewed=p.items.filter(it=>tobeActivityDecisionRecorded(e,p,it)).length;
  const savedAi=typeof internalAiSavedDraft==='function'?internalAiSavedDraft(e):null,
    pendingAi=!savedAi&&typeof internalAiPendingSteps==='function'&&
      typeof internalAiPilotKey==='function'?internalAiPendingSteps(e,internalAiPilotKey(e)):null,
    pastAi=!savedAi&&!pendingAi?.items?.size&&typeof internalAiHistoricalDraft==='function'?
      internalAiHistoricalDraft(e):null,
    activeItem=tobeSelectedItem(e,p),
    itemId=String(activeItem?.sourceStepId||''),
    itemAi=savedAi?.items?.find(x=>String(x.source_step_id)===itemId)||
      pendingAi?.items?.get(itemId)||pastAi?.proposal?.items?.find(x=>String(x.source_step_id)===itemId),
    proposedCount=itemAi?TOBE_AI_REVIEW_FIELDS.filter(([source])=>{
      const v=String(itemAi[source]??'').trim();
      return !!v&&!['no','n/a','ninguno','sin definir','pendiente','—'].includes(v.toLowerCase());
    }).length:0,
    pendingSteps=pendingAi?.items?.size?p.items.filter(step=>
      !pendingAi.items.has(String(step.sourceStepId))):[],
    pendingStepNames=pendingSteps.map(step=>step.sourceStepName||step.stepName||String(step.sourceStepId)),
    aiSummaryTitle=savedAi?'Propuesta IA vigente':
      pendingAi?.items?.size?'IA generada en '+(p.items.length-pendingSteps.length)+' de '+p.items.length+' pasos'+
      (pendingSteps.length?' · '+pendingSteps.length+(pendingSteps.length===1?' pendiente':' pendientes'):''):
      pastAi?'Propuesta IA histórica · v'+pastAi.version:'Sin propuesta IA vigente',
    aiSummaryDescription=savedAi?
      'Esta actividad contiene '+proposedCount+' campos sugeridos de 9. Contrasta cada valor y confirma únicamente los cambios útiles en 03.3.':
      pendingAi?.items?.size?'En esta actividad: '+proposedCount+' de 9 campos con valor propuesto.'+
      (pendingStepNames.length?' '+(pendingStepNames.length===1?'Paso pendiente de analizar: ':'Pasos pendientes de analizar: ')+pendingStepNames.join(' · ')+'.':''):
      pastAi?'La IA anterior propone '+proposedCount+' de 9 campos para esta actividad; son de consulta, no aplicables en v'+p.version+'.':
      'Analiza la actividad para obtener valores IA concretos sin modificar el AS-IS.';
  return pageTop('Diseño TO-BE','Versión '+p.version+' · '+statusLabel+
    ' · Origen AS-IS v'+esc(p.sourceSnapshotVersion)+'. Las decisiones pertenecen al consultor.',actions)+
    '<main class="tobe-workspace" data-tobe-version="'+p.version+
    '" data-tobe-mode="'+attr(__auneaTobeMode)+'">'+
      '<section class="tobe-task-guide" aria-label="Qué hacer en Diseño TO-BE">'+
        '<div class="tobe-task-guide-intro"><div><h2>Qué tienes que hacer aquí</h2>'+
          '<p>Construye el TO-BE actividad por actividad. El análisis global, la IA por actividad y las reglas aportan opciones; '+
          'tú decides una sola vez qué incorporas al borrador y después validas el diseño completo. El AS-IS nunca se modifica.</p></div>'+
          '<span class="tobe-task-guide-progress">'+reviewed+' de '+p.items.length+' actividades configuradas</span></div>'+
        '<div class="tobe-ia-guide-summary" role="status"><strong>'+esc(aiSummaryTitle)+'</strong>'+
          '<p>'+esc(aiSummaryDescription)+'</p></div>'+
        '<div class="tobe-task-guide-steps">'+
          '<span><b>03.1 · Entender el AS-IS</b></span>'+ 
          '<span><b>03.2 · Revisar propuestas IA</b></span>'+ 
          '<span><b>03.3 · Configurar la actividad futura</b></span>'+ 
          '<span><b>03.4 · Conectar el proceso futuro</b> (sólo en Mapa TO-BE)</span></div>'+ 
        '<p class="tobe-task-guide-result"><b>Resultado esperado:</b> un mapa TO-BE con actividades, responsables, datos y rutas definidos. Guarda el borrador, pulsa «Comprobar requisitos» y, cuando no existan bloqueos, «Marcar como revisado». Después podrás comparar AS-IS y TO-BE en PG12.</p>'+
      '</section>'+
      tobeContextOverviewHtml(e,p)+
      tobeGlobalOverviewHtml(e,p)+
      '<header class="tobe-review-section-head"><span class="tobe-eyebrow">03 · DISEÑO TO-BE</span>'+ 
        '<h2 class="aunea-ui-section-title">Revisión por actividad</h2>'+ 
        '<p class="aunea-ui-section-caption">Revisa el origen, la recomendación IA, los campos y las conexiones del proceso futuro.</p></header>'+
      tobeGuidedNavHtml(e,p)+
      '<section class="tobe-map-area"><header class="tobe-workspace-head"><div><span class="tobe-eyebrow">CONSTRUIR EL PROCESO FUTURO</span>'+
      '<h2>Mapa del proceso propuesto</h2></div><p>Selecciona una actividad para revisar su transformación y editar el TO-BE.</p></header>'+
      (editable?'<div class="tobe-flow-actions"><button type="button" class="btn btn-outline" id="addTobeStep">Añadir actividad vinculada al AS-IS</button>'+
        
        '<span class="tobe-muted">Selecciona una tarjeta para revisarla y arrástrala para moverla. Para conectar, pulsa «Conectar» o «Ruta NO» y selecciona el destino. «Retirar» sólo cambia el TO-BE.</span>'+
        '<span id="tobeFlowModeStatus" role="status" aria-live="polite"></span></div>':'')+
      tobeCanvasHtml(e,p)+
      '<div class="tobe-flow-start field"><label>Inicio del proceso futuro</label>'+
        (editable?auneaSelectControl('tobeFlowStart',tobeFutureSteps(e,p).map(x=>({value:String(x.id),label:x.step_name})),
          tobeFlowOwner(e,p).startStepId,{extra:'data-tobe-flow-start="1"',placeholder:'Selecciona actividad inicial'}):
          '<input disabled value="'+attr(tobeFutureSteps(e,p).find(x=>String(x.id)===tobeFlowOwner(e,p).startStepId)?.step_name||'Pendiente')+'">')+
      '<p class="field-help">Indica la actividad de inicio del TO-BE. El AS-IS no se modifica.</p></div>'+
      '<p class="tobe-map-note"><b>Rutas del TO-BE:</b> comienzan como copia del AS-IS confirmado, pero pueden rediseñarse en el inspector. Los pasos incorporados o eliminados sólo pertenecen a la versión TO-BE. Una ruta pendiente, desconectada o sin final bloquea la revisión.</p></section>'+
      '<section id="tobeInspector" class="tobe-inspector" aria-label="Decisión TO-BE por actividad">'+tobeInspectorHtml(e,p)+'</section>'+
      (editable?'<details class="tobe-ai-stage" id="tobeAiWorkspace" data-engagement-id="'+attr(e.id)+
        '" data-tobe-version="'+attr(p.version)+'"'+(keepAuditOpen?' open':'')+'>'+
        '<summary><strong class="aunea-ui-aux-heading">Auditoría IA · Detalle técnico (opcional)</strong>'+
        '<span class="tobe-muted">Opcional: consulta el detalle completo. Revisa cada propuesta desde el inspector de su actividad.</span></summary>'+
        '<div id="tobeAiMount"></div></details>':'')+
      '<section class="tobe-completion"><div><h2 class="aunea-ui-section-title">04 · Validación global</h2><p class="aunea-ui-section-caption">Vista rápida del estado y acciones pendientes. El detalle técnico sigue disponible.</p></div>'+
        '<button type="button" class="btn btn-outline" id="checkTobeReadiness">Comprobar requisitos</button>'+
        '<div id="tobeReadinessStatus" role="status" aria-live="polite"></div>'+
        tobeCoherencePanel(e,p)+'</section>'+
      '</main>';
}
