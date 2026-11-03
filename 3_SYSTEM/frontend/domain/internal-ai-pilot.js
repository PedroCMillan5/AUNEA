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
  if(node){node.className='notice '+(type==='warn'?'warn':'info');const label=document.getElementById('tobeAiProgress');if(label)label.textContent=message;else node.textContent=message}
}
function internalAiPilotRefreshPanel(e){
  const panel=document.getElementById('tobeAiPilotStatus');
  if(panel)panel.outerHTML=internalAiPilotPanel(e);
}
function internalAiPilotKey(e){
  const snap=confirmedSnapshot(e),diagnostic=currentDiagnosticOutput(e);
  return e?.confirmedAsIs===true&&snap&&diagnostic
    ?String(e.id)+'|'+String(snap.version)+'|'+String(diagnostic.input_snapshot_hash):null;
}
function internalAiPilotNarrative(value){
  const text=String(value||'');
  const match=text.match(/Acci[oó]n propuesta:\s*([\s\S]*?)\s*Resultado esperado:\s*([\s\S]*?)\s*Justificaci[oó]n:\s*([\s\S]*)/i);
  return match?{action:match[1].trim(),expected:match[2].trim(),reason:match[3].trim()}
    :{action:'',expected:'',reason:text};
}
function internalAiAuditJson(value,label='JSON técnico'){
  return '<details><summary>'+esc(label)+'</summary><button type="button" class="btn btn-outline" data-ai-copy>Copiar JSON</button>'+
    '<pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(value,null,2))+'</pre></details>';
}
function internalAiAuditValues(value){
  if(value==null)return 'No transmitido';
  if(Array.isArray(value))return value.length?'<ul>'+value.map(v=>'<li>'+internalAiAuditValues(v)+'</li>').join('')+'</ul>':'Ninguno';
  if(typeof value==='object')return '<dl>'+Object.entries(value).map(([k,v])=>'<dt><b>'+esc(k)+'</b></dt><dd>'+internalAiAuditValues(v)+'</dd>').join('')+'</dl>';
  return esc(String(value));
}
function internalAiPilotTracePanel(traces){
  const values=Object.entries(traces||{});
  if(!values.length)return '';
  return '<details class="step-group internal-only"><summary>Qué información recibió Ollama (trazabilidad)</summary>'+
    '<p class="field-help">Auditoría temporal del estudio activo. Vista redactada: oculta patrones de credenciales y correo. '+
    'Sólo las entradas marcadas como enviadas llegaron a una solicitud HTTP; no se muestra razonamiento interno. '+
    'Los tamaños corresponden a los bytes originales, antes de redactar.</p>'+values.map(([sid,trace])=>{
    if(!trace.attempts)return '<details><summary>'+esc(sid)+'</summary>'+internalAiAuditJson(trace,'Inventario anterior: sólo IDs; diagnóstico como hash')+'</details>';
    return '<details><summary>'+esc(sid)+'</summary>'+trace.attempts.map((attempt,index)=>{
      let context=null;try{context=JSON.parse(attempt.request?.messages?.[1]?.content?.split('\n').slice(1).join('\n'))}catch(_){}
      return '<section class="card card-pad"><b>Intento '+(index+1)+(index?' · Corrección dirigida':'')+'</b>'+
        '<details><summary>ENTRADA — '+(attempt.sent?(attempt.original_response?'Solicitud enviada y respuesta recibida':'Envío intentado; recepción sin confirmar'):'Preparada, no enviada')+'</summary>'+
        '<p><b>Actividad:</b> '+esc(context?.current_activity?.step_name||context?.current_activity?.name||sid)+'</p>'+
        [['Actividad',context?.current_activity],['Fricciones',context?.explicit_linked_frictions],
         ['Riesgos',context?.explicit_linked_risks],['Evidencias',context?.linked_evidence],
         ['Hallazgos diagnósticos enviados',context?.official_diagnostic_findings],
         ['Decisiones y rutas explícitas',context?.process_flow],['Restricciones',context?.analysis_constraints],
         ['Corrección solicitada',context?.targeted_correction]].map(([label,value])=>
          '<details><summary>'+label+'</summary>'+internalAiAuditValues(value)+'</details>').join('')+
        '<p>Disponible en AUNEA: diagnóstico completo. Enviado: únicamente la proyección indicada y su referencia; no el informe completo.</p>'+
        '<p><b>Instrucciones recibidas:</b> '+esc(attempt.request?.messages?.[0]?.content||'No disponibles')+'</p>'+
        '<p><b>Tamaño:</b> '+esc(attempt.request_bytes)+' / '+esc(attempt.budget_bytes)+' bytes. '+
        '<b>Tokens de entrada medidos por Ollama:</b> '+esc(attempt.prompt_eval_count??'No disponibles')+' / '+esc(attempt.input_token_limit)+'</p>'+
        internalAiAuditJson({components:attempt.component_bytes,instructions:attempt.instructions_bytes,schema:attempt.schema_bytes,model:attempt.request?.model,options:attempt.request?.options},'Medición y configuración efectiva')+
        internalAiAuditJson(attempt.request,'Solicitud y esquema enviados (redactados)')+'</details>'+
        '<details><summary>SALIDA — Respuesta y validación</summary><p><b>Estado:</b> '+esc(attempt.validation_status||'Sin respuesta validada')+'</p>'+
        (attempt.error?'<p class="notice warn">'+esc(attempt.error)+'</p>':'')+
        (attempt.response_note?'<p>'+esc(attempt.response_note)+'</p>':'')+
        internalAiAuditJson(attempt.original_response,'Respuesta estructurada original (redactada)')+
        internalAiAuditJson(attempt.validated_proposal,'Propuesta que supera el contrato; aprobación humana pendiente')+'</details></section>';
    }).join('')+'</details>';
  }).join('')+'</details>';
}
function internalAiReviewPanel(review){
  if(!review)return '';
  return '<details open><summary>REVISIÓN — Aspectos por revisar</summary>'+[
    ['BLOCKING','Bloqueantes'],['WARNING','Advertencias'],['PENDING','Información pendiente']
  ].map(([category,label])=>{
    const issues=(review.issues||[]).filter(i=>(i.category||'WARNING')===category);
    return issues.length?'<h4>'+label+'</h4><ul>'+issues.map(i=>'<li><b>'+esc(i.step_id)+'</b>: '+esc(i.issue)+
      (i.evidence?'<p><b>Motivo:</b> '+esc(i.evidence)+'</p>':'')+
      (i.action?'<p><b>Acción necesaria:</b> '+esc(i.action)+'</p>':'')+'</li>').join('')+'</ul>':'';
  }).join('')+internalAiAuditJson(review.audit||[],'Solicitud y respuesta del revisor (redactadas)')+
    (review.initial_review?internalAiAuditJson(review.initial_review,'Revisión anterior a la corrección'):'')+'</details>';
}
function internalAiPilotPanel(e){
  if(typeof isClientDisplay==='function'&&isClientDisplay())return '';
  const key=internalAiPilotKey(e),draft=key?__auneaAiPreview.get(key):null;
  const feedback=key?__auneaAiFeedback.get(key):null;
  const partial=key?__auneaAiCompletedSteps.get(key):null;
  if(!draft)return '<div id="tobeAiPilotStatus" role="status" aria-live="polite" class="notice '+(feedback?.type==='warn'?'warn':'info')+'">'+
    '<p id="tobeAiProgress">'+esc(feedback?.message||'La IA es opcional. Pulsa «Preparar propuesta con IA» para consultar el proveedor autorizado; no se generan resultados simulados.')+'</p>'+
    internalAiPilotTracePanel(Object.fromEntries(partial?.traces||new Map()))+'</div>';
  const review=draft.review||null;
  const blocked=Array.isArray(review?.blocking_step_ids)&&review.blocking_step_ids.length>0;
  const reviewProtocolLabel=review?.protocol_revision?
    '<p class="field-help">Revisor PG11: '+esc(review.protocol_revision)+'</p>':'';
  const warning=feedback?.type==='warn'?'<p class="notice warn">'+esc(feedback.message)+'</p>':'';
  const contextTraceHtml=internalAiPilotTracePanel(partial?Object.fromEntries(partial.traces):draft.context_traces);
  const overview=review?'<p><b>Consolidación automática '+(review.status==='CHECKED'?'sin observaciones':'con observaciones')+
    '</b> — '+esc(review.summary||'')+'</p>'+
    internalAiReviewPanel(review):'';
  const sections=draft.items.map(item=>{
    const narrative=internalAiPilotNarrative(item.rationale);
    return '<div class="card card-pad section"><p><b>'+esc(item.source_step_id)+' · '+esc(item.transformation)+'</b></p>'+
      '<p><b>Área de mejora:</b> '+esc(item.problem_resolved||'No concretada')+'</p>'+
      (narrative.action?'<p><b>Intervención propuesta:</b> '+esc(narrative.action)+'</p>':'')+
      (narrative.expected?'<p><b>Resultado esperado:</b> '+esc(narrative.expected)+'</p>':'')+
      (narrative.reason?'<p><b>Justificación:</b> '+esc(narrative.reason)+'</p>':'')+
      (item.future_actor?'<p><b>Responsable futuro:</b> '+esc(item.future_actor)+'</p>':'')+
      (item.controls_risk?'<p><b>Control y riesgo:</b> '+esc(item.controls_risk)+'</p>':'')+
      '<p><small><b>Fuentes:</b> '+esc((item.source_refs||[]).join(', '))+
      ' · <b>Condiciones por validar:</b> '+esc(item.limitations||'Sin condiciones adicionales declaradas')+
      '</small></p></div>';
  }).join('');
  return '<div id="tobeAiPilotStatus" role="status" aria-live="polite" class="notice info">'+
    '<b>Propuesta TO-BE IA sin aprobar — '+esc(draft.model)+'</b>'+
    '<p>Intervenciones y resultados esperados son hipótesis de diseño. La revisión automática no equivale a aprobación humana.</p>'+
    '<p id="tobeAiProgress">'+esc(feedback?.message||'Generación completada; pendiente de aprobación humana.')+'</p>'+warning+overview+reviewProtocolLabel+contextTraceHtml+sections+
    '<p>Aplicar sólo completará campos vacíos del borrador y requiere revisión del consultor.</p>'+
    (blocked?'<p class="notice warn"><b>No apta para aplicar:</b> revisar las clasificaciones de '+
      esc(review.blocking_step_ids.join(', '))+'. Puedes corregir el TO-BE manualmente o generar nuevas sugerencias.</p>':'')+
    (draft.applied?'<p><b>Aplicado a los campos disponibles del TO-BE DRAFT.</b> Se conserva esta explicación en la sesión para revisión; no es un nuevo campo persistente.</p>':
    blocked?'':'<button class="btn btn-outline" id="applyTobeAiPilot">Aplicar a campos vacíos</button>')+
    '<button class="btn btn-outline" id="regenerateTobeAiPilot">Generar propuestas nuevas</button>'+
    '<p class="field-help">Generar nuevas sugerencias vuelve a analizar todas las actividades con Ollama. '+
    'Conserva los campos del borrador ya editados; sustituye únicamente esta previsualización cuando finaliza.</p></div>';
}
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
  const key=internalAiPilotKey(e),data=key?__auneaAiPreview.get(key):null,p=latestTobe(e);
  if(!data||!tobeEditable(p))return toast('La propuesta ya no está disponible.');
  if(Array.isArray(data.review?.blocking_step_ids)&&data.review.blocking_step_ids.length)
    return toast('Esta propuesta tiene transformaciones contradictorias. Revisa el diseño antes de aplicar.');
  if(data.items.length!==p.items.length||data.items.some(x=>!p.items.some(it=>String(it.sourceStepId)===String(x.source_step_id))))
    return toast('La estructura del proceso ha cambiado; no se aplica la propuesta.');
  saveTobeFromDom(e);
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
    const copy=event.target?.closest?.('[data-ai-copy]');
    if(copy){event.preventDefault();const text=copy.parentElement?.querySelector('pre')?.textContent;
      if(text&&typeof navigator!=='undefined')void navigator.clipboard.writeText(text).then(()=>toast('JSON copiado.')).catch(()=>toast('No se pudo copiar; selecciona el JSON.'));return;}

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
