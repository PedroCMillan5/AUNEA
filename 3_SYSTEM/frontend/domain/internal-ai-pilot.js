// [AUNEA-FE-INTERNAL-AI-PILOT-193] START — PG11 preview of optional backend AI suggestions
// SOURCE: DEC-034/050/052/055; Simulator CANONICAL PG11; REVIEW contract 2026-10-29.
// INPUTS: current confirmed snapshot and official diagnostic; OUTPUTS: DRAFT suggestions.
// SIDE_EFFECTS: external provider only after click, local DRAFT updates only after acceptance.
// CHANGE_RISK: HIGH. Never auto-approve, invent numerical benefits, or alter engine results.
const __auneaAiPreview=new Map();
const __auneaAiFeedback=new Map();
const __auneaAiCompletedSteps=new Map(); // Transient, keyed by confirmed snapshot; no partial approval.
const __auneaAiWorking=new Set();
function internalAiPilotFeedback(e,message,type='info'){
  const key=internalAiPilotKey(e);
  if(key)__auneaAiFeedback.set(key,{message,type});
  const node=document.getElementById('tobeAiPilotStatus');
  if(node){node.className='notice '+(type==='warn'?'warn':'info');node.textContent=message}
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
function internalAiPilotPanel(e){
  const key=internalAiPilotKey(e),draft=key?__auneaAiPreview.get(key):null;
  const feedback=key?__auneaAiFeedback.get(key):null;
  if(!draft)return '<div id="tobeAiPilotStatus" role="status" aria-live="polite" class="notice '+(feedback?.type==='warn'?'warn':'info')+'">'+
    esc(feedback?.message||'La IA es opcional. Pulsa «Preparar propuesta con IA» para consultar el proveedor autorizado; no se generan resultados simulados.')+'</div>';
  return '<div id="tobeAiPilotStatus" role="status" aria-live="polite" class="notice info"><b>Propuesta IA sin aprobar — '+esc(draft.model)+'</b>'+
    '<p>Consulta las razones y las fuentes. Aplicar sólo completará campos vacíos del borrador.</p>'+
    draft.items.map(item=>'<p><b>'+esc(item.source_step_id)+' · '+esc(item.transformation)+'</b> — '+
      esc(item.rationale)+'<br><small>Fuentes: '+esc(item.source_refs.join(', '))+
      ' · Por comprobar: '+esc(item.limitations)+'</small></p>').join('')+
    '<button class="btn btn-outline" id="applyTobeAiPilot">Aplicar a campos vacíos</button></div>';
}
const __originalTobePagePilot=tobePage;
tobePage=function(){
  const html=__originalTobePagePilot(),e=currentEng();
  if(!e||!tobeEditable(latestTobe(e))||!internalAiPilotKey(e))return html;
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
    {stepSignature:stepIds.join('|'),items:new Map(),inputHash:null};
  __auneaAiCompletedSteps.set(key,completed);
  const request={
    engagement:buildBackendPayload(e),
    diagnostic:currentDiagnosticOutput(e),
    confirmed_as_is:e.confirmedAsIs===true,
    snapshot_version:snap.version
  };
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
      const detail=typeof error?.detail==='string'?error.detail:'Comprueba el registro del backend.';
      throw Error('Actividad '+stepId+' (HTTP '+response.status+'): '+detail+
        ' · '+done+' de '+stepIds.length+' completadas. Puedes reintentar.');
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
    completed.inputHash=result.input_hash;
    completed.items.set(stepId,result.item);
    internalAiPilotFeedback(e,'Actividad '+completed.items.size+' de '+stepIds.length+
      ' completadas y verificadas. Preparando siguiente actividad…');
  }
  if(completed.items.size!==stepIds.length)throw Error('Faltan actividades; propuesta incompleta.');
  const data={status:'DRAFT',engagement_id:e.id,snapshot_version:snap.version,
    input_hash:completed.inputHash,model:availability.model,
    items:stepIds.map(id=>completed.items.get(id))};
  __auneaAiPreview.set(key,data);
  __auneaAiCompletedSteps.delete(key);
  __auneaAiFeedback.delete(key);
  internalAiPilotRefreshPanel(e);
  toast('Propuesta IA completa, pendiente de revisión del consultor.');
}
// [AUNEA-FE-TOBE-SEGMENTED-197] END

async function generateTobeAiPilot(e){
  const key=internalAiPilotKey(e);
  if(!key||!tobeEditable(latestTobe(e)))return toast('El estudio no tiene un borrador vigente.');
  if(__auneaAiWorking.has(key))return;
  __auneaAiWorking.add(key);
  const button=document.getElementById('generateTobeAiPilot');
  if(button){button.disabled=true;button.textContent='Comprobando IA…'}
  internalAiPilotFeedback(e,'Comprobando disponibilidad del proveedor IA…');
  try{
    if(!state.backendOnline&&!(await checkBackend()))throw Error('Backend no conectado.');
    const check=await fetch(state.backendUrl+'/v1/internal-ai/status');
    if(!check.ok)throw Error('No se pudo consultar el proveedor IA.');
    const availability=await check.json();
    if(availability.status!=='AVAILABLE')
      throw Error(availability.reason||'Servicio IA no configurado o sin autorización para tratar datos.');
    if(button)button.textContent=availability.provider==='ollama'?'Analizando con IA local…':'Analizando con IA…';
    internalAiPilotFeedback(e,'Generando propuesta con '+(availability.provider==='ollama'?'Ollama local':'el proveedor autorizado')+'… No cierres el estudio durante el análisis.');
    const snap=confirmedSnapshot(e);
    if(availability.provider==='ollama'){
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
  const key=internalAiPilotKey(e),data=key?__auneaAiPreview.get(key):null,p=latestTobe(e);
  if(!data||!tobeEditable(p))return toast('La propuesta ya no está disponible.');
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
  __auneaAiPreview.delete(key);render();
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
    const generate=event.target?.closest?.('#generateTobeAiPilot');
    if(generate){
      event.preventDefault();
      if(!generate.disabled)void generateTobeAiPilot(currentEng());
      return;
    }
    const apply=event.target?.closest?.('#applyTobeAiPilot');
    if(apply){event.preventDefault();applyTobeAiPilot(currentEng())}
  },true);
};
// [AUNEA-FE-INTERNAL-AI-PILOT-193] END
