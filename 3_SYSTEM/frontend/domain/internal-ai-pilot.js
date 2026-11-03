// [AUNEA-FE-INTERNAL-AI-PILOT-193] START — PG11 preview of optional backend AI suggestions
// SOURCE: DEC-034/050/052/055; Simulator CANONICAL PG11; REVIEW contract 2026-10-29.
// INPUTS: current confirmed snapshot and official diagnostic; OUTPUTS: DRAFT suggestions.
// SIDE_EFFECTS: external provider only after click, local DRAFT updates only after acceptance.
// CHANGE_RISK: HIGH. Never auto-approve, invent numerical benefits, or alter engine results.
const __auneaPg11ReviewProtocol='PG11_REVIEW_20261103_3'; // Technical backend/UI compatibility; no business owner.
const __auneaAiPreview=new Map();
const __auneaAiFeedback=new Map();
const __auneaAiCompletedSteps=new Map(); // Transient, keyed by confirmed snapshot; no partial approval.
const __auneaAiWorking=new Set();
function internalAiPilotFeedback(e,message,type='info'){
  const key=internalAiPilotKey(e);
  if(key)__auneaAiFeedback.set(key,{message,type});
  const node=document.getElementById('tobeAiPilotStatus');
  if(currentEng()?.id!==e?.id||internalAiPilotKey(e)!==key)return;
  if(node){if(!String(node.className||'').includes('pg11-ai-panel'))node.className='notice '+(type==='warn'?'warn':'info');const label=document.getElementById('tobeAiProgress');if(label)label.textContent=message;else node.textContent=message}
}
function internalAiPilotRefreshPanel(e){
  const panel=document.getElementById('tobeAiPilotStatus');
  if(panel)panel.outerHTML=internalAiPilotPanel(e);
}
function internalAiPilotKey(e){
  const snap=confirmedSnapshot(e),diagnostic=currentDiagnosticOutput(e),p=latestTobe(e);
  return e?.confirmedAsIs===true&&snap&&diagnostic&&p
    ?String(e.id)+'|'+String(snap.version)+'|'+String(diagnostic.input_snapshot_hash)+
      '|TOBE:'+String(p.version):null;
}
// [AUNEA-FE-PG11-AI-DRAFT-SAVE-202] START — save concise AI suggestion in versioned TO-BE owner.
// SOURCE: Simulator CANONICAL PG11 (versioned TO-BE proposal); DEC-050/052/055.
// This is an internal, unapproved proposal, not the approved TO-BE item or a new business master.
// Only functional suggestions/review are stored. Technical HTTP audits and prompts stay ephemeral.
const __auneaAiDraftItemKeys=Object.freeze([
  'source_step_id','transformation','problem_resolved','rationale',
  'future_actor','tool','inputs','outputs','automation_ai','human_supervision',
  'controls_risk','source_refs','limitations'
]);
function internalAiBoundedDraftItem(item){
  const saved={};
  for(const field of __auneaAiDraftItemKeys){
    const value=item?.[field];
    if(typeof value==='string')saved[field]=value;
    else if(field==='source_refs'&&Array.isArray(value))
      saved[field]=value.filter(v=>typeof v==='string');
  }
  return saved;
}
function internalAiBoundedReview(review){
  return {
    status:String(review?.status||''),
    summary:String(review?.summary||''),
    protocol_revision:String(review?.protocol_revision||''),
    requires_human_review:true,
    blocking_step_ids:Array.isArray(review?.blocking_step_ids)?
      review.blocking_step_ids.filter(x=>typeof x==='string'):[],
    issues:Array.isArray(review?.issues)?review.issues.map(issue=>({
      step_id:String(issue?.step_id||''),
      category:String(issue?.category||'WARNING'),
      issue:String(issue?.issue||''),
      evidence:String(issue?.evidence||''),
      action:String(issue?.action||'')
    })):[]
  };
}
function internalAiDraftMatchesTobe(e,data){
  const p=latestTobe(e),snap=confirmedSnapshot(e),diag=currentDiagnosticOutput(e);
  const stepIds=p?.items?.map(x=>String(x.sourceStepId));
  return !!(p?.status==='DRAFT'&&snap&&diag&&Array.isArray(stepIds)&&stepIds.length&&
    p.sourceSnapshotVersion===snap.version&&
    data?.status==='DRAFT'&&data.engagement_id===e.id&&
    data.snapshot_version===snap.version&&
    typeof data.input_hash==='string'&&!!data.input_hash&&
    Array.isArray(data.items)&&data.items.length===stepIds.length&&
    data.items.every(x=>stepIds.includes(String(x.source_step_id)))&&
    new Set(data.items.map(x=>String(x.source_step_id))).size===stepIds.length);
}
function internalAiSavedDraft(e){
  const p=latestTobe(e),entry=p?.aiDraft;
  if(!entry||entry.sourceSnapshotVersion!==p.sourceSnapshotVersion)return null;
  const proposal=entry.proposal;
  return entry.diagnosticInputHash===currentDiagnosticOutput(e)?.input_snapshot_hash&&
    internalAiDraftMatchesTobe(e,proposal)?proposal:null;
}
function persistTobeAiDraft(e){
  const key=internalAiPilotKey(e),p=latestTobe(e);
  if(!key||!tobeEditable(p))return false;
  const proposal=__auneaAiPreview.get(key);
  if(!proposal)return true; // Re-save existing version without clearing the stored AI draft.
  if(!internalAiDraftMatchesTobe(e,proposal)){
    toast('La propuesta IA no coincide con el estudio confirmado; no se ha guardado.');
    return false;
  }
  // Attach a single read-only AI suggestion to the canonical TO-BE DRAFT owner/version.
  // Blocked suggestions are saved as proposals, never copied to approved business fields.
  const bounded={
    status:'DRAFT',engagement_id:e.id,snapshot_version:proposal.snapshot_version,
    input_hash:proposal.input_hash,model:String(proposal.model||''),
    items:proposal.items.map(internalAiBoundedDraftItem),
    review:internalAiBoundedReview(proposal.review),
    applied:proposal.applied===true
  };
  p.aiDraft={
    sourceSnapshotVersion:p.sourceSnapshotVersion,
    diagnosticInputHash:currentDiagnosticOutput(e).input_snapshot_hash,
    savedAt:now(),
    proposal:bounded
  };
  return true;
}
// [AUNEA-FE-PG11-AI-DRAFT-SAVE-202] END
// A saved marker is shown only after localStorage confirms this exact proposal.
function internalAiSavedInBrowser(e,draft){
  if(!draft||typeof localStorage==='undefined'||typeof STORAGE_KEY==='undefined')return false;
  try{
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    const p=latestTobe(e);
    const copy=stored?.engagements?.find(x=>x.id===e.id)?.tobeProposals?.
      find(x=>x.version===p?.version)?.aiDraft;
    if(!copy||copy.sourceSnapshotVersion!==p.sourceSnapshotVersion||
       copy.diagnosticInputHash!==currentDiagnosticOutput(e)?.input_snapshot_hash||
       !internalAiDraftMatchesTobe(e,copy.proposal))return false;
    const normalized={
      items:draft.items.map(internalAiBoundedDraftItem),
      review:internalAiBoundedReview(draft.review),
      applied:draft.applied===true
    };
    const onDisk={
      items:copy.proposal.items,review:copy.proposal.review,
      applied:copy.proposal.applied===true
    };
    return copy.proposal.input_hash===draft.input_hash&&
      JSON.stringify(normalized)===JSON.stringify(onDisk);
  }catch(_){return false}
}
function internalAiPilotNarrative(value){
  const text=String(value||'');
  const match=text.match(/Acci[oó]n propuesta:\s*([\s\S]*?)\s*Resultado esperado:\s*([\s\S]*?)\s*Justificaci[oó]n:\s*([\s\S]*)/i);
  return match?{action:match[1].trim(),expected:match[2].trim(),reason:match[3].trim()}
    :{action:'',expected:'',reason:text};
}
// [AUNEA-FE-PG11-AI-UX-201] START — summary-first consultant UI; audit rendered on demand.
// SOURCE: PG11 Simulator CANONICAL; DEC-050/052/055. No new capture or persistence.
function internalAiAuditJson(value,label='JSON técnico'){
  if(value==null)return '<p class="field-help">No disponible en esta ejecución.</p>';
  return '<details><summary>'+esc(label)+'</summary><button type="button" class="btn btn-outline" data-ai-copy>Copiar JSON</button>'+
    '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:30rem;overflow:auto">'+esc(JSON.stringify(value,null,2))+'</pre></details>';
}
function internalAiAuditValues(value){
  if(value==null)return 'No transmitido';
  if(Array.isArray(value))return value.length?'<ul>'+value.map(v=>'<li>'+internalAiAuditValues(v)+'</li>').join('')+'</ul>':'Ninguno';
  if(typeof value==='object')return '<dl>'+Object.entries(value).map(([k,v])=>'<dt><b>'+esc(k)+'</b></dt><dd>'+internalAiAuditValues(v)+'</dd>').join('')+'</dl>';
  return esc(String(value));
}
function internalAiAuditContext(trace,index){
  if(!trace?.attempts)return internalAiAuditJson(trace,'Inventario anterior: sólo IDs');
  const attempt=trace.attempts[index];
  if(!attempt)return '<p>Intento no disponible.</p>';
  let context=null;
  try{context=JSON.parse(attempt.request?.messages?.[1]?.content?.split('\n').slice(1).join('\n'))}catch(_){}
  return '<div class="card card-pad">'+
    '<p><b>Intento '+(index+1)+'</b> · '+esc(attempt.validation_status||'Validación pendiente')+'</p>'+
    (attempt.error?'<p class="notice warn">'+esc(attempt.error)+'</p>':'')+
    '<p class="field-help">Auditoría de la ejecución actual: datos redactados cuando corresponde; bytes medidos antes de la redacción. No contiene razonamiento interno.</p>'+
    '<details><summary>Entrada y fuentes enviadas</summary>'+
    [['Actividad',context?.current_activity],['Fricciones',context?.explicit_linked_frictions],
     ['Riesgos',context?.explicit_linked_risks],['Evidencias',context?.linked_evidence],
     ['Hallazgos diagnósticos',context?.official_diagnostic_findings],
     ['Decisiones y rutas',context?.process_flow],
     ['Restricciones',context?.analysis_constraints],
     ['Corrección solicitada',context?.targeted_correction]].map(([label,value])=>
       '<details><summary>'+label+'</summary>'+internalAiAuditValues(value)+'</details>').join('')+
    '<p class="field-help">Se envió la proyección indicada, no el diagnóstico oficial completo.</p>'+
    '</details>'+
    '<details><summary>Salida y validación</summary>'+
    (attempt.response_note?'<p>'+esc(attempt.response_note)+'</p>':'')+
    internalAiAuditJson(attempt.original_response,'Respuesta original (redactada)')+
    internalAiAuditJson(attempt.validated_proposal,'Propuesta validada estructuralmente')+
    '</details>'+
    '<details><summary>Medición, instrucciones y solicitud HTTP</summary>'+
    '<p><b>Tamaño:</b> '+esc(attempt.request_bytes??'No disponible')+' / '+esc(attempt.budget_bytes??'No disponible')+' bytes. '+
    '<b>Tokens de entrada:</b> '+esc(attempt.prompt_eval_count??'No disponibles')+' / '+esc(attempt.input_token_limit??'No disponible')+'</p>'+
    internalAiAuditJson({components:attempt.component_bytes,instructions_bytes:attempt.instructions_bytes,
      schema_bytes:attempt.schema_bytes,model:attempt.request?.model,options:attempt.request?.options},'Desglose técnico')+
    internalAiAuditJson({instructions:attempt.request?.messages?.[0]?.content},'Instrucciones recibidas')+
    internalAiAuditJson(attempt.request,'Solicitud y esquema enviados (redactados)')+
    '</details></div>';
}
function internalAiPilotTracePanel(traces){
  const values=Object.entries(traces||{});
  if(!values.length)return '';
  return '<details class="step-group internal-only"><summary>Auditoría técnica IA · '+values.length+
    ' actividades (ver entradas, respuestas y JSON)</summary>'+
    '<p class="field-help">Detalle para diagnóstico interno. Cerrado por defecto; sólo se representa al solicitarlo. '+
    'Los datos sensibles pueden aparecer redactados. La validación del contrato no equivale a aprobación humana.</p>'+
    values.map(([sid,trace])=>{
      const attempts=trace?.attempts||[];
      const count=attempts.length||1;
      return '<details><summary>'+esc(sid)+' · '+count+' intento'+(count===1?'':'s')+'</summary>'+
        (attempts.length?attempts.map((attempt,index)=>
          '<div class="card card-pad"><p><b>Intento '+(index+1)+'</b> · '+
          esc(attempt.validation_status||(attempt.error?'Error':'Pendiente'))+
          (attempt.prompt_eval_count==null?'':' · '+esc(attempt.prompt_eval_count)+' tokens')+'</p>'+
          '<button type="button" class="btn btn-outline" data-ai-audit-step="'+esc(sid)+
          '" data-ai-audit-attempt="'+index+'">Examinar entrada y salida</button>'+
          '<div data-ai-audit-slot></div></div>').join(''):
          '<button type="button" class="btn btn-outline" data-ai-audit-step="'+esc(sid)+
          '" data-ai-audit-attempt="legacy">Ver inventario anterior</button><div data-ai-audit-slot></div>')+
      '</details>';
    }).join('')+'</details>';
}
function internalAiReviewIssue(issue){
  return '<li><b>'+esc(issue.category==='BLOCKING'?'Bloqueo':issue.category==='PENDING'?'Pendiente':'Observación')+
    ':</b> '+esc(issue.issue||'Sin descripción')+
    (issue.evidence?'<p><b>Motivo:</b> '+esc(issue.evidence)+'</p>':'')+
    (issue.action?'<p><b>Para resolverlo:</b> '+esc(issue.action)+'</p>':'')+'</li>';
}
function internalAiReviewPanel(review){
  if(!review)return '<p class="field-help">La revisión global aún no ha concluido.</p>';
  const global=(review.issues||[]).filter(i=>i.step_id==='GLOBAL'||!i.step_id);
  return '<details><summary>Observaciones generales · '+global.length+'</summary>'+
    (global.length?'<ul>'+global.map(internalAiReviewIssue).join('')+'</ul>':
      '<p class="field-help">No se han comunicado observaciones globales.</p>')+
    ((Array.isArray(review.audit)&&review.audit.length)||review.initial_review?
      '<button type="button" class="btn btn-outline" data-ai-review-audit>Examinar auditoría del revisor</button>'+
      '<div data-ai-review-slot></div>':
      '<p class="field-help">El registro técnico detallado de la revisión no se conserva tras recargar.</p>')+
    '</details>';
}
function internalAiPilotPanel(e){
  if(typeof isClientDisplay==='function'&&isClientDisplay())return '';
  const key=internalAiPilotKey(e),cached=key?__auneaAiPreview.get(key):null;
  const persisted=key?internalAiSavedDraft(e):null;
  const draft=cached||persisted;
  const feedback=key?__auneaAiFeedback.get(key):null;
  const partial=key?__auneaAiCompletedSteps.get(key):null;
  if(!draft)return '<section id="tobeAiPilotStatus" class="pg11-ai-panel pg11-ai-empty card card-pad section">'+
    '<header class="pg11-ai-header"><div><p class="pg11-ai-eyebrow">TRABAJO INTERNO · PG11</p>'+
    '<h2>Diseño TO-BE asistido por IA</h2>'+
    '<p class="pg11-ai-subtitle">La IA prepara sugerencias, pero el consultor revisa y decide.</p></div></header>'+
    '<p id="tobeAiProgress" role="status" aria-live="polite" class="pg11-ai-message'+(feedback?.type==='warn'?' pg11-ai-message-warn':'')+'">'+
    esc(feedback?.message||'Pulsa «Preparar propuesta con IA» para comenzar. No se aplica ningún cambio automáticamente.')+'</p>'+
    internalAiPilotTracePanel(Object.fromEntries(partial?.traces||new Map()))+'</section>';
  const review=draft.review||null;
  const items=Array.isArray(draft.items)?draft.items:[];
  const issues=Array.isArray(review?.issues)?review.issues:[];
  const blockedIds=new Set(Array.isArray(review?.blocking_step_ids)?review.blocking_step_ids:[]);
  for(const issue of issues)if(issue.category==='BLOCKING'&&issue.step_id!=='GLOBAL')blockedIds.add(issue.step_id);
  const blocked=blockedIds.size>0||issues.some(i=>i.category==='BLOCKING'&&(!i.step_id||i.step_id==='GLOBAL'));
  const saved=internalAiSavedInBrowser(e,draft);
  const traces=partial?Object.fromEntries(partial.traces||new Map()):draft.context_traces;
  const sourceNames=new Map((latestTobe(e)?.items||[]).map(it=>[String(it.sourceStepId),String(it.sourceStepName||'')]));
  const cards=items.map((item,index)=>{
    const sid=String(item.source_step_id||'');
    const related=issues.filter(i=>i.step_id===sid);
    const hasBlock=blockedIds.has(sid);
    const narrative=internalAiPilotNarrative(item.rationale);
    return '<article class="pg11-ai-step" aria-label="Propuesta '+esc(sid)+'">'+
      '<header class="pg11-ai-step-head">'+
        '<div class="pg11-ai-step-identity"><span class="pg11-ai-step-number">'+(index+1)+'</span>'+
        '<div class="pg11-ai-step-heading"><span class="pg11-ai-step-code">AS-IS · '+esc(sid)+'</span>'+
        '<h4>'+esc(sourceNames.get(sid)||sid)+'</h4></div></div>'+
        '<span class="pg11-ai-transformation">'+esc(item.transformation||'Sin clasificar')+'</span>'+
      '</header>'+
      '<div class="pg11-ai-step-main">'+
        '<div class="pg11-ai-problem"><span>Problema identificado</span><p>'+esc(item.problem_resolved||'No concretado')+'</p></div>'+
        '<div class="pg11-ai-proposal-grid">'+
          '<div><span>Intervención propuesta</span><p>'+esc(narrative.action||'No concretada')+'</p></div>'+
          '<div><span>Resultado esperado</span><p>'+esc(narrative.expected||'No declarado')+'</p></div>'+
        '</div>'+
        (hasBlock?'<p class="pg11-ai-issue-flag">Requiere corrección antes de aplicar.</p>':'')+
        (related.length?'<details class="pg11-ai-details pg11-ai-review-details"><summary>Aspectos por revisar · '+
          related.length+'</summary><ul class="pg11-ai-review-list">'+related.map(internalAiReviewIssue).join('')+'</ul></details>':
          '<p class="pg11-ai-muted">Sin observaciones individuales; pendiente de revisión humana.</p>')+
        '<details class="pg11-ai-details"><summary>Justificación, fuentes y condiciones</summary>'+
          '<div class="pg11-ai-detail-content">'+
          '<p><b>Justificación:</b> '+esc(narrative.reason||'No declarada')+'</p>'+
          '<p><b>Fuentes:</b> '+esc((item.source_refs||[]).join(', ')||'Ninguna')+'</p>'+
          '<p><b>Condiciones por validar:</b> '+esc(item.limitations||'No declaradas')+'</p>'+
          '<p><b>Responsable futuro:</b> '+esc(item.future_actor||'No definido')+'</p>'+
          '<p><b>Supervisión humana:</b> '+esc(item.human_supervision||'No definida')+'</p>'+
          '<p><b>Controles y riesgos:</b> '+esc(item.controls_risk||'No definidos')+'</p>'+
          '</div></details>'+
      '</div></article>';
  }).join('');
  return '<section id="tobeAiPilotStatus" class="pg11-ai-panel card card-pad section">'+
    '<header class="pg11-ai-header">'+
      '<div><p class="pg11-ai-eyebrow">TRABAJO INTERNO · PG11</p>'+
      '<h2>Diseño TO-BE asistido por IA</h2>'+
      '<p class="pg11-ai-subtitle">Borrador de propuestas para revisión del consultor · '+esc(draft.model||'Modelo no indicado')+'</p></div>'+
      '<span class="pg11-ai-top-status">'+(blocked?'Revisión con bloqueos':'Revisión pendiente')+'</span>'+
    '</header>'+
    '<div class="pg11-ai-save-state'+(saved?' pg11-ai-save-state-saved':' pg11-ai-save-state-pending')+'">'+
      '<span class="pg11-ai-save-indicator" aria-hidden="true"></span>'+
      '<div><b>'+(saved?'Propuesta IA guardada en el borrador.':'Propuesta IA pendiente de guardar.')+'</b>'+
        '<p>'+(saved?'Recuperable al volver a abrir este estudio en el mismo navegador.':
          'Pulsa «Guardar propuesta y borrador» para conservar la generación y la revisión.')+'</p></div>'+
    '</div>'+
    '<p id="tobeAiProgress" role="status" aria-live="polite" class="pg11-ai-message">'+
      esc(__auneaAiWorking.has(key)?feedback?.message||'Generación en curso…':
        'Generación completada · Revisión automática '+(review?'recibida':'pendiente')+'.')+'</p>'+
    (feedback?.type==='warn'?'<p class="pg11-ai-message pg11-ai-message-warn">'+esc(feedback.message)+'</p>':'')+
    '<div class="pg11-ai-metrics" aria-label="Resumen de revisión">'+
      '<div><strong>'+items.length+'</strong><span>Actividades generadas</span></div>'+
      '<div><strong>'+blockedIds.size+'</strong><span>Actividades bloqueadas</span></div>'+
      '<div><strong>'+issues.length+'</strong><span>Aspectos por revisar</span></div>'+
    '</div>'+
    (blocked?'<div class="pg11-ai-blocked"><b>No apta para aplicar.</b><p>La revisión encontró incoherencias. Puedes guardar y consultar la propuesta sin aprobarla.</p></div>':'')+
    (review?.summary?'<div class="pg11-ai-summary"><b>Resultado de la revisión</b><p>'+esc(review.summary)+'</p></div>':'')+
    '<div class="pg11-ai-section-title"><div><p class="pg11-ai-eyebrow">PROPUESTA DE DISEÑO</p>'+
      '<h3>Propuestas por actividad</h3></div><span>'+items.length+' actividades</span></div>'+
    '<div class="pg11-ai-step-list">'+cards+'</div>'+
    '<section class="pg11-ai-review-area"><h3>Revisión y trazabilidad</h3>'+
      internalAiReviewPanel(review)+internalAiPilotTracePanel(traces)+'</section>'+
    '<footer class="pg11-ai-footer">'+
      '<p>La IA no aprueba ni publica resultados. Los registros HTTP y prompts técnicos son temporales.</p>'+
      '<div class="pg11-ai-actions">'+
        '<button type="button" class="btn btn-primary" id="saveTobeAiPilot">Guardar propuesta y borrador</button>'+
        (draft.applied?'':blocked?'':'<button class="btn btn-outline" id="applyTobeAiPilot">Aplicar a campos vacíos</button>')+
        '<button type="button" class="btn btn-outline" id="regenerateTobeAiPilot">Generar propuestas nuevas</button>'+
      '</div>'+
      (draft.applied?'<p class="pg11-ai-muted">Se aplicó a campos vacíos del TO-BE; revisa y guarda los cambios.</p>':'')+
    '</footer></section>';
}
// [AUNEA-FE-PG11-AI-UX-201] END
const __originalTobePagePilot=tobePage;
tobePage=function(){
  const html=__originalTobePagePilot(),e=currentEng();
  if((typeof isClientDisplay==='function'&&isClientDisplay())||!e||!tobeEditable(latestTobe(e))||!internalAiPilotKey(e))return html;
  const button='<button class="btn btn-outline" id="generateTobeAiPilot">Preparar propuesta con IA</button>';
  return html.replace('<button class="btn" id="saveTobe">',button+'<button class="btn" id="saveTobe">')
    .replace('<div class="card card-pad section">',internalAiPilotPanel(e)+'<div class="card card-pad section">');
};
// [AUNEA-FE-TOBE-SEGMENTED-197] START — true progress by confirmed activity.
async function generateTobeBySteps(e,key,snap,availability){
  const draft=latestTobe(e);
  const stepIds=draft.items.map(x=>String(x.sourceStepId));
  if(!stepIds.length||stepIds.some(x=>!x)||new Set(stepIds).size!==stepIds.length)
    throw Error('El borrador no tiene actividades de origen únicas y válidas.');
  const previous=__auneaAiCompletedSteps.get(key);
  const completed=previous?.stepSignature===stepIds.join('|')?previous:
    {stepSignature:stepIds.join('|'),items:new Map(),traces:new Map(),inputHash:null};
  __auneaAiCompletedSteps.set(key,completed);
  if(completed.items.size){
    internalAiPilotFeedback(e,'Reutilizando '+completed.items.size+' actividades verificadas de esta sesión. '+
      'Para volver a generar todo, usa «Generar propuestas nuevas».');
  }
  const request={
    engagement:buildBackendPayload(e),
    diagnostic:currentDiagnosticOutput(e),
    confirmed_as_is:e.confirmedAsIs===true,
    snapshot_version:snap.version
  };
  const failures=[];
  for(const stepId of stepIds){
    if(completed.items.has(stepId))continue;
    if(internalAiPilotKey(e)!==key||currentEng()?.id!==e.id||
       !tobeEditable(latestTobe(e)))throw Error('El estudio cambió; no se continuará esta ejecución.');
    const done=completed.items.size;
    internalAiPilotFeedback(e,'Actividad '+(done+1)+' de '+stepIds.length+
      ' · '+done+' completadas y verificadas. Analizando '+stepId+
      ' con Ollama local…');
    const response=await fetch(state.backendUrl+'/v1/internal-ai/tobe-step',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({request,source_step_id:stepId})
    });
    if(!response.ok){
      const error=await response.json().catch(()=>null);
      const detail=typeof error?.detail==='string'?error.detail:(error?.detail?.message||'Comprueba el registro del backend.');
      if(error?.detail?.context_trace?.source_step_id===stepId)completed.traces.set(stepId,error.detail.context_trace);
      failures.push('Actividad '+stepId+' (HTTP '+response.status+'): '+detail);
      internalAiPilotRefreshPanel(e);
      continue;
    }
    const result=await response.json();
    if(internalAiPilotKey(e)!==key||currentEng()?.id!==e.id||
       !tobeEditable(latestTobe(e)))throw Error('El estudio cambió durante la generación.');
    if(result?.status!=='DRAFT'||result.engagement_id!==e.id||
       result.snapshot_version!==snap.version||
       result.item?.source_step_id!==stepId||
       !Array.isArray(result.item?.source_refs)||!result.item.source_refs.includes(stepId)||
       (completed.inputHash&&completed.inputHash!==result.input_hash))
       throw Error('El backend devolvió una actividad o versión incoherente: '+stepId);
    if(result.context_trace){
      if(result.context_trace.source_step_id!==stepId)
        throw Error('La trazabilidad de la IA no corresponde a la actividad '+stepId);
      if(!completed.traces)completed.traces=new Map();
      completed.traces.set(stepId,result.context_trace);
    }
    completed.inputHash=result.input_hash;
    completed.items.set(stepId,result.item);
    internalAiPilotRefreshPanel(e);
    internalAiPilotFeedback(e,'Actividad '+completed.items.size+' de '+stepIds.length+
      ' completadas y verificadas. Preparando siguiente actividad…');
  }
  if(failures.length)throw Error(failures.join(' · ')+' · '+completed.items.size+' de '+stepIds.length+' completadas. Puedes reintentar.');
  if(completed.items.size!==stepIds.length)throw Error('Faltan actividades; propuesta incompleta.');
  // Review cross-step coherence only after every source step is validated.
  // If review fails, retain every completed step; retry only the review call.
  let items=stepIds.map(id=>completed.items.get(id));
  internalAiPilotFeedback(e,'Generación individual completada: '+stepIds.length+
    ' de '+stepIds.length+' actividades verificadas. Consolidando coherencia global…');
  const reviewed=await fetch(state.backendUrl+'/v1/internal-ai/tobe-review',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({request,items,correction_attempted_ids:[...completed.traces].filter(([,t])=>t.correction_attempted).map(([id])=>id)})
  });
  if(!reviewed.ok){
    const err=await reviewed.json().catch(()=>null);
    throw Error('La revisión global no se completó (HTTP '+reviewed.status+'): '+
      (typeof err?.detail==='string'?err.detail:'Revisa el backend.')+
      ' · '+completed.items.size+' actividades conservadas.');
  }
  const review=await reviewed.json();
  if(!review||review.protocol_revision!==__auneaPg11ReviewProtocol||
     !['CHECKED','CHECKED_WITH_NOTES'].includes(review.status)||
     review.requires_human_review!==true||!Array.isArray(review.issues)||
     internalAiPilotKey(e)!==key||currentEng()?.id!==e.id||
     !tobeEditable(latestTobe(e)))
    throw Error('La consolidación no corresponde al estudio vigente.');
  if(review.corrected_items){
    if(review.corrected_items.length!==items.length||review.corrected_items.some((it,i)=>it.source_step_id!==items[i].source_step_id))throw Error('Corrección fuera del conjunto de actividades.');
    items=review.corrected_items;
    for(const [sid,trace] of Object.entries(review.correction_traces||{})){
      const initial=completed.traces.get(sid);
      completed.traces.set(sid,{...trace,attempts:[...(initial?.attempts||[]),...(trace.attempts||[])]});
    }
  }
  const data={status:'DRAFT',engagement_id:e.id,snapshot_version:snap.version,
    input_hash:completed.inputHash,model:availability.model,review,items,
    context_traces:Object.fromEntries(completed.traces||new Map())};
  delete review.corrected_items;delete review.correction_traces;
  __auneaAiPreview.set(key,data);
  __auneaAiCompletedSteps.delete(key);
  __auneaAiFeedback.delete(key);
  internalAiPilotRefreshPanel(e);
  toast('Propuesta IA completa, pendiente de revisión del consultor.');
}
// [AUNEA-FE-TOBE-SEGMENTED-197] END

async function generateTobeAiPilot(e,fresh=false){
  const key=internalAiPilotKey(e);
  if((typeof isClientDisplay==='function'&&isClientDisplay())||!key||!tobeEditable(latestTobe(e)))return toast('El estudio no tiene un borrador vigente.');
  if(__auneaAiWorking.has(key))return;
  for(const cache of [__auneaAiPreview,__auneaAiFeedback,__auneaAiCompletedSteps])
    for(const oldKey of cache.keys())if(oldKey!==key)cache.delete(oldKey);
  __auneaAiWorking.add(key);
  const button=document.getElementById('generateTobeAiPilot');
  if(button){button.disabled=true;button.textContent='Comprobando IA…'}
  internalAiPilotFeedback(e,'Comprobando disponibilidad del proveedor IA…');
  try{
    if(!state.backendOnline&&!(await checkBackend()))throw Error('Backend no conectado.');
    const check=await fetch(state.backendUrl+'/v1/internal-ai/status',{cache:'no-store'});
    if(!check.ok)throw Error('No se pudo consultar el proveedor IA.');
    const availability=await check.json();
    if(availability.status!=='AVAILABLE')
      throw Error(availability.reason||'Servicio IA no configurado o sin autorización para tratar datos.');
    if(availability.provider==='ollama'&&
       availability.pg11_review_protocol!==__auneaPg11ReviewProtocol)
      throw Error('Versiones incompatibles de PG11: el backend no tiene el revisor actualizado ('+
        __auneaPg11ReviewProtocol+'). Actualiza la rama y reinicia Uvicorn; después recarga el navegador.');
    if(button)button.textContent=availability.provider==='ollama'?'Analizando con IA local…':'Analizando con IA…';
    internalAiPilotFeedback(e,'Generando propuesta con '+(availability.provider==='ollama'?'Ollama local':'el proveedor autorizado')+'… No cierres el estudio durante el análisis.');
    const snap=confirmedSnapshot(e);
    if(availability.provider==='ollama'){
      if(fresh){
        // Explicit user action; only transient cached steps are cleared.
        // Keep the last successful preview until a replacement completes.
        __auneaAiCompletedSteps.delete(key);
      }
      await generateTobeBySteps(e,key,snap,availability);
      return;
    }
    if(!AiAgentService.available()){
      AiAgentService.register({name:'AUNEA Backend — proveedor gobernado',
        async propose({kind,engagement}){
          if(kind!=='TOBE_DRAFT')throw Error('Capacidad IA no habilitada.');
          const response=await fetch(state.backendUrl+'/v1/internal-ai/tobe-draft',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({engagement:buildBackendPayload(engagement),
              diagnostic:currentDiagnosticOutput(engagement),
              confirmed_as_is:engagement.confirmedAsIs===true,
              snapshot_version:confirmedSnapshot(engagement).version})});
          if(!response.ok){
            const errorPayload=await response.json().catch(()=>null);
            const detail=typeof errorPayload?.detail==='string'?errorPayload.detail:'Comprueba el registro del backend.';
            throw Error('La propuesta IA no se generó (HTTP '+response.status+'): '+detail);
          }
          return response.json();
        }});
    }
    const result=await AiAgentService.propose('TOBE_DRAFT',e);
    const data=result.proposal;
    if(internalAiPilotKey(e)!==key||currentEng()?.id!==e.id||!tobeEditable(latestTobe(e)))
      throw Error('El estudio cambió durante la generación: propuesta descartada.');
    const p=latestTobe(e),stepIds=new Set(p.items.map(it=>String(it.sourceStepId)));
    if(!data||data.status!=='DRAFT'||data.engagement_id!==e.id||data.snapshot_version!==snap.version
      ||!Array.isArray(data.items)||data.items.length!==p.items.length
      ||data.items.some(it=>!stepIds.has(String(it.source_step_id))))
      throw Error('La respuesta no es coherente con el TO-BE vigente.');
    __auneaAiPreview.set(key,data);
    __auneaAiFeedback.delete(key);
    // Replace only the feedback panel: never discard unsaved consultant edits in TO-BE cards.
    internalAiPilotRefreshPanel(e);
    toast('Propuesta recibida como borrador pendiente de revisión.');
  }catch(error){
    if(AiAgentService.available())AiAgentService.clear();
    const message=String(error?.message||error||'Error desconocido al generar la propuesta.');
    internalAiPilotFeedback(e,'No se ha generado la propuesta: '+message,'warn');
    console.error('PG11: solicitud IA no completada',error);
  }finally{
    __auneaAiWorking.delete(key);
    const currentButton=document.getElementById('generateTobeAiPilot');
    if(currentButton){currentButton.disabled=false;currentButton.textContent='Preparar propuesta con IA'}
  }
}
function applyTobeAiPilot(e){
  if(typeof isClientDisplay==='function'&&isClientDisplay())return;
  const key=internalAiPilotKey(e),data=key?(__auneaAiPreview.get(key)||internalAiSavedDraft(e)):null,p=latestTobe(e);
  if(!data||!tobeEditable(p))return toast('La propuesta ya no está disponible.');
  if((Array.isArray(data.review?.blocking_step_ids)&&data.review.blocking_step_ids.length)||
     (Array.isArray(data.review?.issues)&&data.review.issues.some(i=>i.category==='BLOCKING')))
    return toast('Esta propuesta contiene bloqueos de revisión. Corrige el diseño antes de aplicar.');
  if(data.items.length!==p.items.length||data.items.some(x=>!p.items.some(it=>String(it.sourceStepId)===String(x.source_step_id))))
    return toast('La estructura del proceso ha cambiado; no se aplica la propuesta.');
  if(!saveTobeFromDom(e))return;
  const fields={transformation:'transformation',problem_resolved:'problemResolved',
    future_actor:'futureActor',tool:'tool',inputs:'inputs',outputs:'outputs',
    automation_ai:'automationAi',human_supervision:'humanSupervision',controls_risk:'controlsRisk'};
  for(const proposal of data.items){
    const target=p.items.find(x=>String(x.sourceStepId)===String(proposal.source_step_id));
    for(const [src,dst] of Object.entries(fields)){
      if(!String(target[dst]||'').trim()&&String(proposal[src]||'').trim())target[dst]=proposal[src];
    }
  }
  p.updatedAt=now();markDirty('Propuesta IA aceptada sólo en campos vacíos de TO-BE DRAFT');
  data.applied=true; // Retain expected outcomes in the read-only review panel.
  if(p.aiDraft?.proposal?.input_hash===data.input_hash)p.aiDraft.proposal.applied=true;
  render();
  toast('Aplicado a campos vacíos. Revisa y guarda antes de enviar a revisión.');
}
// Bind once through event delegation, as in PG11 draft creation. A postBind wrapper
// can be replaced by other modules and must not be the only way the button works.
const __originalRegisterInternalAi=registerInternalWorkPages;
registerInternalWorkPages=function(){
  __originalRegisterInternalAi();
  if(document.__auneaAiPilotDelegatedBound)return;
  document.__auneaAiPilotDelegatedBound=true;
  document.addEventListener('click',event=>{
    const audit=event.target?.closest?.('[data-ai-audit-step]');
    if(audit){
      event.preventDefault();
      const host=audit.parentElement?.querySelector('[data-ai-audit-slot]');
      if(!host)return;
      if(host.innerHTML){host.innerHTML='';audit.textContent='Examinar entrada y salida';return}
      const e=currentEng(),key=internalAiPilotKey(e);
      const partial=__auneaAiCompletedSteps.get(key);
      const stored=partial?.traces?.get(audit.getAttribute('data-ai-audit-step'))||
        __auneaAiPreview.get(key)?.context_traces?.[audit.getAttribute('data-ai-audit-step')];
      if(!stored)return toast('Auditoría no disponible para esta ejecución.');
      const index=Number(audit.getAttribute('data-ai-audit-attempt'));
      host.innerHTML=internalAiAuditContext(stored,Number.isInteger(index)?index:0);
      audit.textContent='Ocultar detalle técnico';
      return;
    }
    const reviewAudit=event.target?.closest?.('[data-ai-review-audit]');
    if(reviewAudit){
      event.preventDefault();
      const host=reviewAudit.parentElement?.querySelector('[data-ai-review-slot]');
      if(!host)return;
      if(host.innerHTML){host.innerHTML='';reviewAudit.textContent='Examinar auditoría del revisor';return}
      const e=currentEng(),key=internalAiPilotKey(e);
      const review=__auneaAiPreview.get(key)?.review;
      if(!review)return toast('Revisión no disponible.');
      host.innerHTML=internalAiAuditJson(review.audit||[],'Solicitudes y respuestas del revisor (redactadas)')+
        (review.initial_review?internalAiAuditJson(review.initial_review,'Revisión previa a corrección'):'');
      reviewAudit.textContent='Ocultar auditoría del revisor';
      return;
    }
    const copy=event.target?.closest?.('[data-ai-copy]');
    if(copy){event.preventDefault();const text=copy.parentElement?.querySelector('pre')?.textContent;
      if(text&&typeof navigator!=='undefined')void navigator.clipboard.writeText(text).then(()=>toast('JSON copiado.')).catch(()=>toast('No se pudo copiar; selecciona el JSON.'));return;}

    const saveAi=event.target?.closest?.('#saveTobeAiPilot');
    if(saveAi){
      event.preventDefault();
      const e=currentEng();
      if(e&&saveTobeFromDom(e)&&saveState('Guardar borrador TO-BE')){
        internalAiPilotRefreshPanel(currentEng());
      }else toast('No se pudo guardar el borrador. Conserva esta pestaña abierta.');
      return;
    }

    const generate=event.target?.closest?.('#generateTobeAiPilot');
    if(generate){
      event.preventDefault();
      if(!generate.disabled)void generateTobeAiPilot(currentEng());
      return;
    }
    const fresh=event.target?.closest?.('#regenerateTobeAiPilot');
    if(fresh){
      event.preventDefault();
      if(!fresh.disabled)void generateTobeAiPilot(currentEng(),true);
      return;
    }
    const apply=event.target?.closest?.('#applyTobeAiPilot');
    if(apply){event.preventDefault();applyTobeAiPilot(currentEng())}
  },true);
};
// [AUNEA-FE-INTERNAL-AI-PILOT-193] END
