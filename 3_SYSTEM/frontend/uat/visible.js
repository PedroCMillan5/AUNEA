// [AUNEA-FE-UAT-VISIBLE-055] START — UAT única end-to-end
// PURPOSE: Exponer una sola UAT integral, completamente precargada, desde CRM hasta PG09 y Trabajo interno.
// SOURCE: instrucción de producto 2026-10-07; Diagnostic Master v1.2 CANONICAL; DEC-050/065/068.
// INPUTS: uat3Seed() + uat/cases/invoices.json.
// OUTPUTS: un único expediente sintético visible y navegable.
// SIDE_EFFECTS: la carga sustituye únicamente datos UAT sintéticos; no toca registros reales.
// CHANGE_RISK: HIGH.
if(!SYSTEM_NAV.some(x=>x.length>1&&x[0]==='uat')){
  const i=SYSTEM_NAV.findIndex(x=>x.length>1&&x[0]==='admin');
  SYSTEM_NAV.splice(i<0?SYSTEM_NAV.length:i,0,['uat','✓','UAT / QA']);
}
function uatSingleBadge(ok){return `<span class="status ${ok?'green':'red'}">${ok?'PASS':'PENDIENTE'}</span>`}
function isAnyUatSyntheticId(v){return /^UAT[123]-/.test(String(v||''))}
function singleUatEngagement(){
  return (state.engagements||[]).find(e=>e.id===uat3Id('INVOICE','ENG'))||null;
}
function singleUatAudit(e){
  if(!e)return {pass:false,checks:[]};
  const required=typeof canonicalMissingRequired==='function'?canonicalMissingRequired(e):[];
  const layers=typeof processLayerConfirmations==='function'?processLayerConfirmations(e):(e.layerConfirmations||{});
  const risksOk=(e.risks||[]).length>0&&(e.risks||[]).every(r=>
    !!r.category&&Number.isInteger(Number(r.likelihood_1_5))&&Number.isInteger(Number(r.impact_1_5))&&
    !!r.reversibility&&typeof r.reversible==='boolean'&&typeof r.controls_present==='boolean'&&
    typeof r.sensitive_or_high_impact==='boolean'&&typeof r.material_financial_or_compliance==='boolean'&&typeof r.critical_trigger==='boolean'
  );
  const requiredBeforeClose=required.filter(x=>x!=='DF093'&&x!=='Confirmación AS-IS');
  const checks=[
    ['CRM completo',!!companyById(e.companyId)&&normalizeArray(e.contactIds).length>=1&&!!e.opportunityId],
    ['Contexto, alcance y demanda completos',requiredBeforeClose.filter(x=>/^DF0(0[1-9]|1[0-9]|2[0-9]|30)$/.test(String(x))).length===0],
    ['Mapa AS-IS completo',(typeof activeSteps==='function'?activeSteps(e):e.processSteps||[]).length>=1&&!!layers.map],
    ['Fricciones completas',(typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[]).length>=1&&!!layers.frictions],
    ['Riesgos completos',risksOk&&!!layers.risks],
    ['Impacto completo',(e.economicInputs||[]).length>=1&&!!layers.impact],
    ['PG09 lista para confirmación final',e.confirmedAsIs!==true&&requiredBeforeClose.length===0&&!!layers.map&&!!layers.frictions&&!!layers.risks&&!!layers.impact],
    ['Snapshot pendiente hasta confirmar cierre',typeof hasConfirmedSnapshot==='function'?!hasConfirmedSnapshot(e):true],
    ['Inputs internos resueltos',typeof unresolvedEngineGates==='function'?unresolvedEngineGates(e).length===0:true]
  ].map(([label,ok])=>({label,ok:!!ok}));
  return {pass:checks.every(x=>x.ok),checks};
}
function clearSingleUat({renderAfter=true}={}){
  for(const key of ['companies','contacts','opportunities','interactions','engagements','projects'])
    state[key]=(state[key]||[]).filter(x=>!isAnyUatSyntheticId(x.id));
  if(isAnyUatSyntheticId(state.activeEngagementId))state.activeEngagementId=null;
  if(renderAfter){markDirty('UAT sintética limpiada');persistRecoverySnapshot('uat-single-clear');render()}
}
let singleUatLoadStatus='Pulsa «Cargar UAT completa» para generar el único ejemplo end-to-end.';
async function loadSingleUat(){
  const status=document.getElementById('singleUatLoadStatus');
  const button=document.getElementById('loadSingleUat');
  if(button)button.disabled=true;
  const say=m=>{singleUatLoadStatus=m;if(status)status.textContent=m};
  say('Cargando el único expediente UAT completo…');
  try{
    const response=await fetch(new URL('uat/cases/invoices.json',document.baseURI).href,{cache:'no-store'});
    if(!response.ok)throw new Error('No se pudo leer el caso UAT: HTTP '+response.status);
    const fixture=await response.json();
    if(fixture.key!=='INVOICE'||fixture.steps?.length!==6||fixture.frictions?.length!==3||fixture.risks?.length!==2)
      throw new Error('El caso integral de facturas no coincide con el contrato UAT esperado.');
    const row=uat3Seed(fixture);
    clearSingleUat({renderAfter:false});
    state.companies.push(row.company);
    state.contacts.push(...row.contacts);
    state.opportunities.push(row.opportunity);
    state.interactions.push(row.interaction);
    state.engagements.push(row.engagement);
    const e=row.engagement;
    e.layerConfirmations={map:true,frictions:true,risks:true,impact:true};
    e.confirmedAsIs=false;
    e.answers.DF093='';
    e.asIsConfirmedAt=null;
    e.confirmedSnapshots=[];
    e.stageId='S09';
    e.engineGates={
      process_design_first:'NO',
      existing_tool_can_close:'NO',
      unstructured_interpretation_need:'NO',
      bounded_action_space:'NO',
      management_visibility_need:'YES'
    };
    const missing=typeof canonicalMissingRequired==='function'?canonicalMissingRequired(e).filter(x=>x!=='DF093'&&x!=='Confirmación AS-IS'):[];
    if(missing.length)throw new Error('La UAT no está completa antes del cierre. Pendientes: '+missing.join(', '));
    const audit=singleUatAudit(e);
    if(!audit.pass)throw new Error('La UAT no supera todos los controles de integridad del recorrido.');
    state.activeEngagementId=e.id;
    state.activePage='uat';
    if(!persistRecoverySnapshot('uat-single-load'))throw new Error('No se pudo guardar la UAT por conflicto de edición.');
    say('UAT completa y guardada: 1 estudio · 6 pasos · 3 fricciones · 2 riesgos · PG09 lista para confirmar · snapshot pendiente del cierre final.');
    render();
    toast('UAT única cargada y lista para recorrer.');
  }catch(err){
    say('Error al cargar la UAT: '+(err?.message||String(err)));
    console.error('AUNEA_SINGLE_UAT_LOAD_ERROR',err);
  }finally{
    const current=document.getElementById('loadSingleUat');
    if(current)current.disabled=false;
  }
}
function uatPhasePage(){
  const e=singleUatEngagement(),audit=singleUatAudit(e),company=e?companyById(e.companyId):null;
  const stages=[['S01','1 · Contexto'],['S02','2 · Alcance'],['S03','3 · Demanda'],['S08','4 · Estado objetivo'],['S04','5 · Mapa AS-IS'],['S05','6 · Fricciones'],['S06','7 · Riesgos'],['S07','8 · Impacto'],['S09','9 · Validación y cierre']];
  const checks=e?'<div class="table-wrap"><table class="data-table"><thead><tr><th>Control</th><th>Estado</th></tr></thead><tbody>'+audit.checks.map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+uatSingleBadge(x.ok)+'</td></tr>').join('')+'</tbody></table></div>':'';
  const stageButtons=e?'<div class="row" style="display:flex;gap:8px;flex-wrap:wrap">'+stages.map(([id,label])=>'<button class="btn btn-small btn-outline" data-single-uat-stage="'+id+'">'+label+'</button>').join('')+'</div>':'';
  const card=e?section('Única UAT · Recepción y aprobación de facturas',
    'Empresa sintética: '+esc(company?.name||e.companyId)+' · todos los datos aplicables están precargados; PG09 queda deliberadamente pendiente de confirmación final.',
    '<div class="notice '+(audit.pass?'good':'warn')+'"><b>Estado end-to-end:</b> '+(audit.pass?'PASS · lista para revisar desde Contexto hasta Trabajo interno':'hay datos pendientes de reconciliar')+'.</div>'+
    '<div class="grid g4" style="margin-top:12px"><div class="card metric"><small>Estudios</small><strong>1</strong></div><div class="card metric"><small>Pasos</small><strong>'+activeSteps(e).length+'</strong></div><div class="card metric"><small>Fricciones</small><strong>'+activeFrictions(e).length+'</strong></div><div class="card metric"><small>Riesgos</small><strong>'+e.risks.length+'</strong></div></div>'+
    '<h3 style="margin-top:16px">Recorrer las 9 pantallas</h3>'+stageButtons+
    '<div style="margin-top:16px">'+checks+'</div>',
    '<button class="btn btn-primary" id="openSingleUatStart">Abrir desde pantalla 1</button> '+((typeof hasConfirmedSnapshot==='function'&&hasConfirmedSnapshot(e))?'<button class="btn btn-outline" id="openSingleUatInternal">Ir a Trabajo interno</button>':'<button class="btn btn-outline" disabled aria-disabled="true">Trabajo interno pendiente de cierre</button>')+' <button class="btn btn-danger" id="clearSingleUat">Eliminar UAT</button>')
    :'<div class="empty"><h2>No hay UAT cargada</h2><p>Carga un único expediente integral con todo el recorrido precargado.</p></div>';
  return pageTop('UAT / QA','Una sola UAT integral. Sin fases, sin doce estudios y sin tres casos paralelos.',
    '<button class="btn btn-primary" id="loadSingleUat">Cargar UAT completa</button>')
    +section('Control UAT único','Este es el único ejemplo visible de QA funcional. No modifica datos reales.',
      '<div id="singleUatLoadStatus" class="notice info" role="status" aria-live="polite">'+esc(singleUatLoadStatus)+'</div>')
    +card;
}
pages.uat=uatPhasePage;
const __singleUatPostBindBase=postBind;
postBind=function(){
  __singleUatPostBindBase();
  const load=document.getElementById('loadSingleUat');if(load)load.onclick=loadSingleUat;
  const clear=document.getElementById('clearSingleUat');if(clear)clear.onclick=()=>clearSingleUat({renderAfter:true});
  const start=document.getElementById('openSingleUatStart');if(start)start.onclick=()=>{const e=singleUatEngagement();if(!e)return;state.activeEngagementId=e.id;e.stageId='S01';state.activePage='diagnostico';render()};
  const internal=document.getElementById('openSingleUatInternal');if(internal)internal.onclick=()=>{const e=singleUatEngagement();if(!e||!(typeof hasConfirmedSnapshot==='function'&&hasConfirmedSnapshot(e)))return;state.activeEngagementId=e.id;state.activePage='resultados';render()};
  document.querySelectorAll('[data-single-uat-stage]').forEach(b=>b.onclick=()=>{const e=singleUatEngagement();if(!e)return;state.activeEngagementId=e.id;e.stageId=b.dataset.singleUatStage;state.activePage=['S04','S05','S06','S07'].includes(e.stageId)?'diagnostico':'diagnostico';render()});
};
// [AUNEA-FE-UAT-VISIBLE-055] END
