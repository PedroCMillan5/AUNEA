// [AUNEA-FE-INTERNAL-AI-PILOT-193] START — PG11 preview of optional backend AI suggestions
// SOURCE: DEC-034/050/052/055; Simulator CANONICAL PG11; REVIEW contract 2026-10-29.
// INPUTS: current confirmed snapshot and official diagnostic; OUTPUTS: DRAFT suggestions.
// SIDE_EFFECTS: external provider only after click, local DRAFT updates only after acceptance.
// CHANGE_RISK: HIGH. Never auto-approve, invent numerical benefits, or alter engine results.
const __auneaAiPreview=new Map();
function internalAiPilotKey(e){
  const snap=confirmedSnapshot(e),diagnostic=currentDiagnosticOutput(e);
  return e?.confirmedAsIs===true&&snap&&diagnostic
    ?String(e.id)+'|'+String(snap.version)+'|'+String(diagnostic.input_snapshot_hash):null;
}
function internalAiPilotPanel(e){
  const key=internalAiPilotKey(e),draft=key?__auneaAiPreview.get(key):null;
  if(!draft)return '<div class="notice info">La IA es opcional. Para usarla hay que habilitar el proveedor y autorizar el tratamiento de los datos del estudio. No se generan resultados de IA simulados.</div>';
  return '<div class="notice info"><b>Propuesta IA sin aprobar — '+esc(draft.model)+'</b>'+
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
async function generateTobeAiPilot(e){
  const key=internalAiPilotKey(e);
  if(!key||!tobeEditable(latestTobe(e)))return toast('El estudio no tiene un borrador vigente.');
  const button=document.getElementById('generateTobeAiPilot');
  if(button){button.disabled=true;button.textContent='Generando propuesta…'}
  try{
    if(!state.backendOnline&&!(await checkBackend()))throw Error('Backend no conectado.');
    const check=await fetch(state.backendUrl+'/v1/internal-ai/status');
    if(!check.ok||(await check.json()).status!=='AVAILABLE')
      throw Error('Servicio IA no configurado o sin autorización para tratar datos.');
    const snap=confirmedSnapshot(e);
    if(!AiAgentService.available()){
      AiAgentService.register({name:'AUNEA Backend — piloto local',
        async propose({kind,engagement}){
          if(kind!=='TOBE_DRAFT')throw Error('Capacidad IA no habilitada.');
          const response=await fetch(state.backendUrl+'/v1/internal-ai/tobe-draft',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({engagement:buildBackendPayload(engagement),
              diagnostic:currentDiagnosticOutput(engagement),
              confirmed_as_is:engagement.confirmedAsIs===true,
              snapshot_version:confirmedSnapshot(engagement).version})});
          if(!response.ok)throw Error('La propuesta IA no se generó ('+response.status+').');
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
    __auneaAiPreview.set(key,data);render();
    toast('Propuesta recibida como borrador pendiente de revisión.');
  }catch(error){
    if(AiAgentService.available())AiAgentService.clear();
    toast(String(error.message||error));render();
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
const __originalRegisterInternalAi=registerInternalWorkPages;
registerInternalWorkPages=function(){
  __originalRegisterInternalAi();
  const previousPostBind=postBind;
  postBind=function(){
    previousPostBind();
    const e=currentEng();
    const generate=document.getElementById('generateTobeAiPilot');
    if(generate)generate.onclick=()=>generateTobeAiPilot(e);
    const apply=document.getElementById('applyTobeAiPilot');
    if(apply)apply.onclick=()=>applyTobeAiPilot(e);
  };
};
// [AUNEA-FE-INTERNAL-AI-PILOT-193] END
