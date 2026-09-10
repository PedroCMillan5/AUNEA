// [AUNEA-FE-DIAG-NOREASK-050] START — No-Reask, reuse and canonical branching
// PURPOSE: Apply NR01–NR15 so previously captured/derived information is reused, contextualized and only reopened for an allowed reason.
// SOURCE: Diagnostic Master v1.1 00_NO_REASK_RULES_V1; RULE_QUESTION_BRANCHING; REQ-DIAG-004/006; DEC-040.
// INPUTS: Company/Contact/Engagement answers, Process Steps, Frictions, risks and evidence-tagged economics.
// OUTPUTS: effective values, branch visibility, contextual rendering and branch-aware required gaps.
// SIDE_EFFECTS: explicit corrections write through to the owning CRM/engagement source; no engine outputs are calculated.
// CHANGE_RISK: HIGH.

const NO_REASK_RULE_IDS=Object.freeze(['NR01','NR02','NR03','NR04','NR05','NR06','NR07','NR08','NR09','NR10','NR11','NR12','NR13','NR14','NR15']);
function activeSteps(e){return (e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED')}
function activeFrictions(e){return (e.frictions||[]).filter(x=>x.status!=='SUPERSEDED')}
function unique(values){return [...new Set(values.filter(v=>v!==undefined&&v!==null&&v!==''))]}
function scalarNumber(v){if(v&&typeof v==='object'){if(v.mode==='UNKNOWN'||v.mode==='NONE')return 0;return Number(v.value||0)}return Number(v||0)}
function canonicalValueFromLabel(setId,value){if(value===undefined||value===null||value==='')return value;const opts=fieldOptions(setId),m=opts.find(o=>String(o.value)===String(value)||String(o.label).toLowerCase()===String(value).toLowerCase());return m?m.value:value}
function reaskState(e){e.reaskOverrides=e.reaskOverrides||{};return e.reaskOverrides}
function explicitReaskAllowed(fid,e){return !!reaskState(e)[fid]}
function valuePresent(v){if(v===undefined||v===null||v==='')return false;if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.values(v).some(valuePresent);return true}

const __auneaBaseSetAnswer=setAnswer;
setAnswer=function(fid,value){
  const e=currentEng();if(!e)return;
  const c=companyById(e.companyId);
  if(fid==='DF001'&&c)c.name=value;
  if(fid==='DF002'&&c)c.sector=value;
  if(fid==='DF005'&&c)c.country=value;
  if(fid==='DF006'&&value){e.contactIds=[value,...(e.contactIds||[]).filter(x=>x!==value)];}
  __auneaBaseSetAnswer(fid,value);
};

function reusedValue(fid,e){
  const steps=activeSteps(e),fr=activeFrictions(e),c=companyById(e.companyId);
  if(fid==='DF001')return c?.name||e.answers?.DF001||'';
  if(fid==='DF002')return canonicalValueFromLabel('REF_DOMAIN',c?.sector||e.answers?.DF002||'');
  if(fid==='DF005')return canonicalValueFromLabel('REF_COUNTRY_ISO3166',c?.country||e.answers?.DF005||'');
  if(fid==='DF006')return e.contactIds?.[0]||e.answers?.DF006||'';
  if(fid==='DF017')return unique(steps.map(x=>x.actor));
  if(fid==='DF046')return unique(steps.map(x=>x.tool));
  if(fid==='DF047'||fid==='DF049')return unique(steps.flatMap(x=>[...normalizeArray(x.inputs),...normalizeArray(x.outputs)]));
  if(fid==='DF050')return unique(steps.flatMap(x=>normalizeArray(x.communication_channels)));
  if(fid==='DF066')return unique(steps.filter(x=>valuePresent(x.exception_path)).map(x=>typeof x.exception_path==='object'?(x.exception_path.type||x.exception_path.label||JSON.stringify(x.exception_path)):x.exception_path));
  if(fid==='DF067')return unique(steps.filter(x=>x.step_type==='ST05'||normalizeArray(x.decision_criteria).length).map(x=>x.step_name||x.id));
  if(fid==='DF078')return {value:steps.reduce((s,x)=>s+scalarNumber(x.active_time)*(scalarNumber(x.occurrences_per_case)||1),0),unit:'min',period:'case'};
  if(fid==='DF079')return {value:steps.reduce((s,x)=>s+scalarNumber(x.rework_time)*(scalarNumber(x.occurrences_per_case)||1),0),unit:'min',period:'case'};
  if(fid==='DF085'){const types=unique((e.economicInputs||[]).map(x=>x.evidence_type));return types.length?types:['Sin inputs económicos materiales'];}
  if(fid==='DF093')return e.confirmedAsIs?'YES':'';
  if(fid==='DF057')return 'Se deriva de la fricción registrada; no se pregunta al cliente.';
  if(fid==='DF094')return canonicalMissingRequired(e);
  if(fid==='DF095')return unique(fr.filter(x=>x.evidence_type!=='EV01').map(x=>`Evidencia de ${labelFrom('OS_FRICTION_TYPE',x.friction_type)}`).concat(canonicalMissingRequired(e).map(x=>`Completar ${x}`)));
  return undefined;
}
function effectiveValue(f,e){
  const explicit=e.answers?.[f.Field_ID],reuse=reusedValue(f.Field_ID,e),mode=String(f.Ask_Mode||'');
  if(['DERIVED','SYSTEM_GENERATED','DERIVE_AND_CONFIRM','SYSTEM_SUGGEST_THEN_CONFIRM','PREFILL_CONFIRM'].includes(mode)&&valuePresent(reuse))return reuse;
  if(valuePresent(explicit))return explicit;
  if(valuePresent(reuse))return reuse;
  return explicit??'';
}
function derivedValue(fid,e){const f=schema?.fields?.find(x=>x.Field_ID===fid);return f?effectiveValue(f,e):(e.answers?.[fid]??'')}

function branchActive(ruleId,e){
  const steps=activeSteps(e),fr=activeFrictions(e),answers=e.answers||{},tools=unique(steps.map(x=>x.tool)),frTypes=new Set(fr.map(x=>x.friction_type));
  switch(ruleId){
    case 'BR-BASE':case 'BR-CLOSE':return true;
    case 'BR-STEP':return true;
    case 'BR-PAIN':return fr.length>0||valuePresent(answers.DF056);
    case 'BR-ECON':return (e.economicInputs||[]).length>0||steps.some(x=>scalarNumber(x.active_time)>0)||fr.some(x=>scalarNumber(x.active_time_loss)>0||scalarNumber(x.direct_loss)>0);
    case 'BR-WAIT':return steps.some(x=>scalarNumber(x.wait_time)>0)||fr.some(x=>scalarNumber(x.wait_time_loss)>0)||frTypes.has('P07')||frTypes.has('P06');
    case 'BR-FAIL':return steps.some(x=>scalarNumber(x.rework_time)>0||scalarNumber(x.error_rate)>0)||valuePresent(answers.DF028)||frTypes.has('P11');
    case 'BR-SLA':return valuePresent(answers.DF025)||valuePresent(answers.DF026)||frTypes.has('P06');
    case 'BR-APPROVAL':return steps.some(x=>x.step_type==='ST05'||normalizeArray(x.decision_criteria).length>0)||frTypes.has('P07');
    case 'BR-TOOLS':return tools.length>=2||steps.some(x=>normalizeArray(x.manual_actions).length>0)||valuePresent(answers.DF054);
    case 'BR-DATA':return valuePresent(answers.DF055)||frTypes.has('P13')||frTypes.has('P03');
    case 'BR-EXCEPTION':return steps.some(x=>valuePresent(x.exception_path));
    case 'BR-VISIBILITY':return valuePresent(answers.DF027)||valuePresent(answers.DF053)||valuePresent(answers.DF081)||frTypes.has('P09')||frTypes.has('P14');
    case 'BR-KNOWLEDGE':return frTypes.has('P20')||answers.DF019==='NO';
    case 'BR-RISK':return (e.risks||[]).length>0||['4','5',4,5].includes(answers.DF018)||valuePresent(answers.DF073)||valuePresent(answers.DF074)||valuePresent(answers.DF090);
    case 'BR-AI':return valuePresent(answers.DF088)||normalizeArray(answers.DF008).some(v=>/AI|IA/i.test(String(v)));
    case 'BR-AGENT':return valuePresent(answers.DF075)&&valuePresent(answers.DF088);
    case 'BR-CAPACITY':return valuePresent(answers.DF076)||valuePresent(answers.DF077)||(e.economicInputs||[]).some(x=>scalarNumber(x.capacity_rate_eur_hour)>0);
    case 'BR-DIRECTLOSS':return valuePresent(answers.DF063)||fr.some(x=>scalarNumber(x.direct_loss)>0)||(e.economicInputs||[]).some(x=>scalarNumber(x.direct_loss_eur_annual)>0);
    case 'BR-TOOLCOST':return valuePresent(answers.DF083)||(e.economicInputs||[]).some(x=>scalarNumber(x.current_tool_cost_eur_annual)>0);
    case 'BR-REVENUE':return valuePresent(answers.DF084);
    case 'BR-FUTURE':return steps.length>0||e.confirmedAsIs;
    default:return true;
  }
}

function questionVisible(f,e){
  if(['CAPTURE_IN_PROCESS_STEP','CONDITIONAL_IN_STEP'].includes(f.Ask_Mode))return false;
  if(['CAPTURE_IN_FRICTION','CONDITIONAL_IN_FRICTION'].includes(f.Ask_Mode))return false;
  if(f.Ask_Mode==='CAPTURE_IN_RISK')return false;
  if(f.Stage_ID==='S06'&&['DF068','DF069','DF070','DF071','DF072'].includes(f.Field_ID))return false;
  if(f.Stage_ID==='S07'&&['DF076','DF077','DF082','DF083','DF084'].includes(f.Field_ID))return false;
  return branchActive(f.Branch_Rule_ID,e);
}
function canonicalMissingRequired(e){
  const skip=new Set(['DF094','DF095']);const misses=[];
  (schema?.fields||[]).filter(f=>f.Requiredness==='REQUIRED_90M'&&!skip.has(f.Field_ID)&&questionVisible(f,e)).forEach(f=>{if(!valuePresent(effectiveValue(f,e)))misses.push(f.Field_ID)});
  if(!activeSteps(e).length)misses.push('Mapa AS-IS');
  if(!e.confirmedAsIs)misses.push('Confirmación AS-IS');
  return unique(misses);
}
function missingRequired(e){return canonicalMissingRequired(e)}
function formatContextValue(f,v){
  if(Array.isArray(v))return v.map(x=>labelFrom(f.Option_Set_ID,x)).join(', ')||'—';
  if(v&&typeof v==='object')return [v.value,v.unit,v.period].filter(x=>x!==''&&x!==undefined&&x!==null).join(' ')||'—';
  return f.Option_Set_ID?labelFrom(f.Option_Set_ID,v):String(v??'—');
}
function contextOnly(f,e,val){
  const policy=String(f.Reask_Policy||''),mode=String(f.Ask_Mode||'');
  if(explicitReaskAllowed(f.Field_ID,e))return false;
  if(!valuePresent(val))return false;
  return ['NO_REASK','CONFIRM_ONLY_IF_CHANGED','DERIVE_THEN_CONFIRM'].includes(policy)||['PREFILL_CONFIRM','DERIVE_AND_CONFIRM'].includes(mode);
}

// Provenance UI — "Tomado de: <label>" + "Editar en <página>" replacing the raw No-Reask/Reuse_From leak.
// The human label is DERIVED, not hand-authored per field: a one-time reverse index (Write_Target -> Field)
// resolves Reuse_From values shaped like "RT_ENTITY.Column" to the canonical Pregunta_o_etiqueta_ES of the
// field that owns that Write_Target. ENTITY_PAGE_MAP is the only hand-authored table here, and it is pure UI
// routing (which page owns which entity), not business semantics.
let __reuseWriteTargetIndex=null;
function reuseWriteTargetIndex(){
  if(__reuseWriteTargetIndex)return __reuseWriteTargetIndex;
  __reuseWriteTargetIndex={};
  (schema?.fields||[]).forEach(f=>{if(f.Write_Target)__reuseWriteTargetIndex[f.Write_Target]=f});
  return __reuseWriteTargetIndex;
}
const ENTITY_PAGE_MAP=Object.freeze({
  RT_COMPANY:'contactos',
  RT_CONTACT:'contactos',
  RT_PROCESS_STEP:'proceso',
  RT_FRICTION:'proceso'
});
const PAGE_LABEL_ES=Object.freeze({contactos:'Contactos',proceso:'Proceso y fricciones'});
function pageLabelEs(page){return PAGE_LABEL_ES[page]||page}
function reuseSourceInfo(f){
  const raw=String(f.Reuse_From||'');
  if(!raw)return {label:'un dato ya capturado en el estudio',page:null};
  const m=raw.match(/^(RT_[A-Z_]+)\.([A-Za-z0-9_]+)/);
  if(!m)return {label:'un dato ya capturado en el estudio',page:null};
  const srcField=reuseWriteTargetIndex()[`${m[1]}.${m[2]}`];
  const page=Object.prototype.hasOwnProperty.call(ENTITY_PAGE_MAP,m[1])?ENTITY_PAGE_MAP[m[1]]:null;
  return {label:srcField?srcField.Pregunta_o_etiqueta_ES:'un dato ya capturado en el estudio',page};
}

// DF020 (Known_Variants → RT_PROCESS.Known_Variants, Engine_Consumers incl. Risk) and DF029
// (Service_Priority → RT_PROCESS.Service_Priority, Engine_Consumers: Pain/Economics) are canonically
// distinct fields with distinct Write_Targets — never merge them. This is a UI-only disambiguation
// hint grounded in that existing difference; it adds no new Field_ID/Option_Set_ID/Write_Target.
// DF052 (Version_Control → RT_FINDING, Entity_Scope: Process) is a single process-level question
// ("método para identificar la versión correcta") — the canonical model has no per-artifact
// cardinality, so it never asks about each document individually (UAT-VIS-042 stays BLOQUEADO for
// that reason; this is copy-only, no Field_ID/Write_Target change).
const FIELD_CLARIFICATION_ES=Object.freeze({
  DF020:'A diferencia de DF029: esto son variantes que cambian la RUTA del proceso (pasos distintos), no sólo cómo se trata un caso.',
  DF029:'A diferencia de DF020: esto son clases que cambian el TRATAMIENTO operativo o económico de un caso, sin cambiar la ruta del proceso en sí.',
  DF052:'Se refiere al método general de control de versión del proceso (¿cómo se sabe cuál es la versión correcta?), no a versionar cada documento o artefacto por separado.'
});
function renderQuestion(f,e){
  const val=effectiveValue(f,e),opts=fieldOptions(f.Option_Set_ID),required=f.Requiredness==='REQUIRED_90M',mode=String(f.Ask_Mode||'');
  const systemOnly=['DERIVED','SYSTEM_GENERATED'].includes(mode)||String(f.Control_UI).startsWith('DERIVED')||String(f.Control_UI).startsWith('SYSTEM_GENERATED');
  const meta=`<span class="canonical-id">${f.Field_ID}</span>${required?'<span class="required-dot" title="Obligatoria"></span>':''}${f.Requiredness==='CONDITIONAL_90M'?'<span class="conditional-tag">condicional</span>':''}`;
  let body='';
  if(systemOnly)body=`<div class="readonly-box">${esc(formatContextValue(f,val)||'Se completará automáticamente cuando existan datos suficientes.')}</div>`;
  else if(contextOnly(f,e,val)){
    const src=reuseSourceInfo(f);
    const editBtn=src.page
      ?`<button type="button" class="btn btn-small" data-goto-source="${attr(src.page)}">Editar en ${esc(pageLabelEs(src.page))}</button><div class="field-help">Este cambio actualizará el dato en todo el diagnóstico.</div>`
      :`<button type="button" class="btn btn-small" data-edit-context="${f.Field_ID}">Editar aquí</button>`;
    body=`<div class="reuse-context"><div><span class="context-label">Dato reutilizado</span><strong>${esc(formatContextValue(f,val))}</strong><small>Tomado de: ${esc(src.label)}</small></div>${editBtn}</div>`;
  }
  else body=`${renderControl(f,val,opts,e)}${explicitReaskAllowed(f.Field_ID,e)?`<div class="field-help"><button type="button" class="link-btn" data-close-context="${f.Field_ID}">Cerrar edición y volver a reutilizar el dato</button></div>`:''}`;
  const clarification=FIELD_CLARIFICATION_ES[f.Field_ID];
  return `<div class="question-card"><div class="question-head"><div><div class="question-title">${esc(f.Pregunta_o_etiqueta_ES)}</div><div class="question-purpose">${esc(f.Objetivo_concreto||'')}</div></div><div class="question-meta">${meta}</div></div><div class="question-body">${body}</div><div class="field-help"><b>Ejemplo:</b> ${esc(f.Ejemplo_ES||'—')} · <b>Validación:</b> ${esc(f.Validation||'—')}</div>${clarification?`<div class="field-help clarification-note">${esc(clarification)}</div>`:''}</div>`;
}

function bindNoReask(){
  document.querySelectorAll('[data-edit-context]').forEach(b=>b.onclick=()=>{const e=currentEng();reaskState(e)[b.dataset.editContext]=true;markDirty(`Edición explícita habilitada ${b.dataset.editContext}`);render()});
  document.querySelectorAll('[data-close-context]').forEach(b=>b.onclick=()=>{const e=currentEng();delete reaskState(e)[b.dataset.closeContext];markDirty(`Edición explícita cerrada ${b.dataset.closeContext}`);render()});
  document.querySelectorAll('[data-goto-source]').forEach(b=>b.onclick=()=>setPage(b.dataset.gotoSource));
}
const __auneaRendererBindForms=bindForms;
bindForms=function(){__auneaRendererBindForms();bindNoReask();};

function addCompany(){
  const sectors=fieldOptions('REF_DOMAIN'),countries=fieldOptions('REF_COUNTRY_ISO3166');
  openModal('Nueva empresa',`<div class="form-grid"><div class="field full"><label>Empresa</label><input id="mCompany" placeholder="Ej. ACME Servicios"></div><div class="field"><label>Sector</label><select id="mSector"><option value="">Selecciona…</option>${sectors.map(o=>`<option value="${attr(o.value)}">${esc(o.label)}</option>`).join('')}<option value="OTHER">Otro</option></select></div><div class="field"><label>País</label><select id="mCountry"><option value="">Selecciona…</option>${countries.map(o=>`<option value="${attr(o.value)}" ${o.value==='ES'?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div><div class="field full"><label>Notas</label><input id="mCompanyNotes" placeholder="Opcional"></div></div>`,()=>{const name=document.getElementById('mCompany').value.trim();if(!name)return toast('Indica la empresa.');state.companies.push({id:id('CMP'),name,sector:document.getElementById('mSector').value,country:document.getElementById('mCountry').value,notes:document.getElementById('mCompanyNotes').value,createdAt:now()});markDirty('Empresa creada');closeModal();render()});
}
// [AUNEA-FE-DIAG-NOREASK-050] END
