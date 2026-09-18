// [AUNEA-FE-DIAG-NOREASK-050] START — No-Reask, reuse and canonical branching
// PURPOSE: Apply NR01–NR15 so previously captured/derived information is reused, contextualized and only reopened for an allowed reason.
// SOURCE: Diagnostic Master v1.2 00_NO_REASK_RULES_V1; RULE_QUESTION_BRANCHING; REQ-DIAG-004/006; DEC-040.
// INPUTS: Company/Contact/Engagement answers, Process Steps, Frictions, risks and evidence-tagged economics.
// OUTPUTS: effective values, branch visibility, contextual rendering and branch-aware required gaps.
// SIDE_EFFECTS: explicit corrections write through to the owning CRM/engagement source; derived confirmations are audit/UI metadata only; no engine outputs are calculated.
// CHANGE_RISK: HIGH.

const NO_REASK_RULE_IDS=Object.freeze(['NR01','NR02','NR03','NR04','NR05','NR06','NR07','NR08','NR09','NR10','NR11','NR12','NR13','NR14','NR15']);
function activeSteps(e){return (e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED')}
function activeFrictions(e){return (e.frictions||[]).filter(x=>x.status!=='SUPERSEDED')}
function unique(values){return [...new Set(values.filter(v=>v!==undefined&&v!==null&&v!==''))]}
function scalarNumber(v){if(v&&typeof v==='object'){if(v.mode==='UNKNOWN'||v.mode==='NONE')return 0;return Number(v.value||0)}return Number(v||0)}
// Provenance for DF078 (active-time aggregate) — the step names that actually contributed, so the
// economics builder can show "Calculado desde: <pasos>" as informational context. This is NOT a new
// derivation: DF078 itself (reusedValue below) already aggregates these same steps; no annualization
// (minutes/caso -> horas/año) is computed here or anywhere, since no governed conversion rule exists.
function activeTimeContributors(e){return activeSteps(e).filter(x=>scalarNumber(x.active_time)>0).map(x=>x.step_name||x.id)}
// Same informational-provenance pattern for wait_time — there is no governed aggregate for it (unlike
// DF078/DF079, no Field_ID derives a total from wait_time), so this only surfaces which steps recorded
// wait_time as evidence; it never sums or annualizes it.
function waitTimeContributors(e){return activeSteps(e).filter(x=>scalarNumber(x.wait_time)>0).map(x=>x.step_name||x.id)}
function canonicalValueFromLabel(setId,value){if(value===undefined||value===null||value==='')return value;const opts=fieldOptions(setId),m=opts.find(o=>String(o.value)===String(value)||String(o.label).toLowerCase()===String(value).toLowerCase());return m?m.value:value}
function reaskState(e){e.reaskOverrides=e.reaskOverrides||{};return e.reaskOverrides}
function explicitReaskAllowed(fid,e){return !!reaskState(e)[fid]}
function valuePresent(v){if(v===undefined||v===null||v==='')return false;if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.values(v).some(valuePresent);return true}

// The write-through that used to live here as a hardcoded wrapper over setAnswer, listing DF001/DF002/
// DF005 by hand, is now derived from each field's canonical Write_Target in writeThroughToOwner below
// and called from setAnswer itself. One mechanism, and it covers every Company-owned field rather than
// the three someone remembered to add.

function reusedValue(fid,e){
  const steps=activeSteps(e),fr=activeFrictions(e),c=companyById(e.companyId);
  if(fid==='DF001')return c?.name||e.answers?.DF001||'';
  if(fid==='DF002')return canonicalValueFromLabel('REF_INDUSTRY_CNAE25',c?.sector||e.answers?.DF002||'');
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
    case 'BR-CAPACITY':return valuePresent(answers.DF076)||valuePresent(answers.DF077)||(e.economicInputs||[]).some(x=>scalarNumber(x.capacity_cost_rate_eur_hour)>0);
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
function requiresDerivedConfirmation(f){return String(f.Ask_Mode||'')==='DERIVE_AND_CONFIRM'||String(f.Reask_Policy||'')==='DERIVE_THEN_CONFIRM'}
function derivedFingerprint(v){try{return JSON.stringify(v)}catch{return String(v)}}
function derivedConfirmation(f,e,reuse=reusedValue(f.Field_ID,e)){return answerDetails(e)[`${f.Field_ID}__derived_confirmation`]||null}
function isDerivedConfirmed(f,e,reuse=reusedValue(f.Field_ID,e)){const m=derivedConfirmation(f,e,reuse);return !!m&&m.fingerprint===derivedFingerprint(reuse)}
function confirmDerivedValue(fid){
  const e=currentEng(),f=schema?.fields?.find(x=>x.Field_ID===fid);if(!e||!f)return;
  const reuse=reusedValue(fid,e);if(!valuePresent(reuse))return toast('No hay un valor derivado que confirmar.');
  answerDetails(e)[`${fid}__derived_confirmation`]={fingerprint:derivedFingerprint(reuse),confirmedAt:now()};
  audit(`Valor derivado confirmado ${fid}`);markDirty(`Confirmación derivada ${fid}`);render();
}

// Provenance UI — human-readable in normal use, full technical contract only in Internal mode.
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
  if(!raw)return {label:'un dato ya capturado en el estudio',page:null,entity:null,attribute:null};
  const m=raw.match(/^(RT_[A-Z_]+)\.([A-Za-z0-9_]+)/);
  if(!m)return {label:'un dato ya capturado en el estudio',page:null,entity:null,attribute:null};
  const srcField=reuseWriteTargetIndex()[`${m[1]}.${m[2]}`];
  const page=Object.prototype.hasOwnProperty.call(ENTITY_PAGE_MAP,m[1])?ENTITY_PAGE_MAP[m[1]]:null;
  return {label:srcField?srcField.Pregunta_o_etiqueta_ES:'un dato ya capturado en el estudio',page,entity:m[1],attribute:m[2]};
}

// DEC-050 allows a secondary surface to correct a reused value in exactly two ways: write through to
// the owner, or navigate to the owner. Never a parallel editable copy. These are the Company
// attributes whose owner is unambiguous, so editing them from the diagnostic writes straight to the
// Company master; the engagement keeps its own snapshot of the value it used, which DEC-050 requires.
// Keyed on Write_Target, not Reuse_From: the Diagnostic Master's write target IS the canonical owner
// of the value, while Reuse_From only says where the prefill came from. DF002 now reuses and writes RT_COMPANY.Sector, so only the write target identifies the owner.
const COMPANY_WRITE_THROUGH=Object.freeze({
  'RT_COMPANY.Company_Name':'name','RT_COMPANY.Sector':'sector','RT_COMPANY.Country':'country',
  'RT_COMPANY.Employee_Count':'employeeCount','RT_COMPANY.Revenue_Band':'revenueBand'
});
function writeThroughTarget(f){
  if(!f||!f.Reuse_From)return null;
  const attr=COMPANY_WRITE_THROUGH[String(f.Write_Target||'')];
  return attr?{kind:'company',attr,label:reuseSourceInfo(f).label}:null;
}
// Called by setAnswer. Returns true when the edit was propagated to the owning record.
function writeThroughToOwner(fid,value,e){
  if(!e)return false;
  // DF006 is a relation, not an attribute: confirming the session's main contact reorders the
  // engagement's participants rather than overwriting a field on anything (DEC-051).
  if(fid==='DF006'&&value){e.contactIds=[value,...(e.contactIds||[]).filter(x=>x!==value)];return true}
  const f=(schema?.fields||[]).find(x=>x.Field_ID===fid);
  if(!f)return false;
  const target=writeThroughTarget(f);
  if(!target||target.kind!=='company')return false;
  const co=companyById(e.companyId);
  if(!co)return false;
  const before=co[target.attr];
  const next=target.attr==='employeeCount'?(value===''||value==null?null:Number(value)):value;
  if(String(before??'')===String(next??''))return false;
  co[target.attr]=next;
  audit(`Empresa ${co.name}: ${esc(f.Pregunta_o_etiqueta_ES||fid)} actualizado desde el diagnóstico "${before??'—'}"→"${next??'—'}"`);
  return true;
}

// UI-only clarifications grounded in the current Diagnostic Master field objective/validation and option sets.
// They do not alter Field_ID, Write_Target, branching or engine consumers.
const FIELD_CLARIFICATION_ES=Object.freeze({
  DF010:'Incluye restricciones de presupuesto, seguridad, plataforma o herramientas, plazo, compliance, residencia de datos, ownership, recursos, compras o adopción. Se capturan aquí una sola vez para acotar la solución y evitar recomendaciones incompatibles con los límites conocidos.',
  DF014:'Indica dónde empieza exactamente lo que vamos a analizar. Debe ser coherente con el evento que inicia el proceso y con el primer paso del mapa.',
  DF015:'Indica dónde termina exactamente lo que vamos a analizar. Debe ser coherente con el resultado final esperado y con el último paso del mapa.',
  DF016:'Este es el responsable end-to-end del proceso. Puede coincidir o no con el interlocutor principal de la sesión o con quien aprueba la inversión; selecciona una persona existente o indica el rol si aún no se conoce.',
  DF020:'A diferencia de DF029: esto son variantes que cambian la RUTA del proceso (pasos distintos), no sólo cómo se trata un caso.',
  DF029:'A diferencia de DF020: esto son clases que cambian el TRATAMIENTO operativo o económico de un caso, sin cambiar la ruta del proceso en sí.',
  DF052:'Se refiere al método general de control de versión del proceso (¿cómo se sabe cuál es la versión correcta?), no a versionar cada documento o artefacto por separado.'
});
function renderQuestion(f,e){
  const val=effectiveValue(f,e),opts=fieldOptions(f.Option_Set_ID),required=f.Requiredness==='REQUIRED_90M',mode=String(f.Ask_Mode||'');
  // A Control_UI starting with "DERIVED" (e.g. DERIVED_OR_CONDITIONAL) only means system-generated when
  // Ask_Mode itself says so. DF080/DF081 are Ask_Mode:CONDITIONAL_ASK — the canonical contract is
  // "derive when possible, otherwise ask" — so the broad prefix match must not force them read-only:
  // that silently made a genuinely askable field permanently unanswerable.
  const systemOnly=['DERIVED','SYSTEM_GENERATED'].includes(mode)||(String(f.Control_UI).startsWith('DERIVED')&&mode!=='CONDITIONAL_ASK')||String(f.Control_UI).startsWith('SYSTEM_GENERATED');
  // The references put the requiredness mark and the provenance chip beside the label, and show no
  // Field_ID on the field itself — coverage is stated once, in the stage inspector.
  const source=f.Reuse_From?reuseSourceInfo(f):null;
  const chip=(source&&val!=null&&val!==''&&!(Array.isArray(val)&&!val.length))?prefillChip(source.label):'';
  const meta=`${required?requiredMark():''}${f.Requiredness==='CONDITIONAL_90M'?'<span class="conditional-tag">condicional</span>':''}${chip}`;
  let body='';
  if(systemOnly)body=`<div class="readonly-box">${esc(formatContextValue(f,val)||'Se completará automáticamente cuando existan datos suficientes.')}</div>`;
  else if(contextOnly(f,e,val)){
    if(!f.Reuse_From){
      // Reask_Policy=NO_REASK only means "don't re-ask this session" — it does NOT mean the value
      // came from elsewhere (Reuse_From is empty: this is the field's own first-hand answer). Collapsing
      // it to a "Tomado de" box invented a source that doesn't exist and hid a control that, for
      // multi-step compound fields like DF098, needs 3 separate interactions to complete — the very
      // next unrelated render() made it vanish behind a small "Editar aquí" link. Keep it fully
      // editable; just mark visibly that it already has a value.
      body=`<div class="answered-inline"><span class="answered-badge">✓ Guardado</span>${renderControl(f,val,opts,e)}</div>`;
    } else {
      const src=reuseSourceInfo(f),needsConfirm=requiresDerivedConfirmation(f),confirmed=needsConfirm&&isDerivedConfirmed(f,e);
      const confirmUi=needsConfirm?(confirmed?'<span class="status green">Derivación confirmada</span>':`<button type="button" class="btn btn-small btn-primary" data-confirm-derived="${f.Field_ID}">Confirmar valor</button>`):'';
      if(writeThroughTarget(f)){
        // The references render a prefilled value as an ordinary filled control carrying a provenance
        // chip, not a read-only panel. Editing it writes through to the owning record, so this is a
        // single owner being edited from a second surface — not a parallel copy (DEC-050).
        body=`${renderControl(f,val,opts,e)}${confirmUi?`<div class="detail-wrap">${confirmUi}</div>`:''}`;
      } else {
        const editBtn=src.page
          ?`<button type="button" class="btn btn-small" data-goto-source="${attr(src.page)}">Editar en ${esc(pageLabelEs(src.page))}</button>`
          :`<button type="button" class="btn btn-small" data-edit-context="${f.Field_ID}">Editar aquí</button>`;
        // No unambiguous owner attribute to write through to, so the only DEC-050-safe correction is
        // to navigate to the owner.
        body=`<div class="reuse-context"><div><strong>${esc(formatContextValue(f,val))}</strong><small>Tomado de: ${esc(src.label)}</small></div><div class="row-actions">${confirmUi}${editBtn}</div></div>`;
      }
    }
  }
  else body=`${renderControl(f,val,opts,e)}${explicitReaskAllowed(f.Field_ID,e)?`<div class="field-help"><button type="button" class="link-btn" data-close-context="${f.Field_ID}">Cerrar edición y volver a reutilizar el dato</button></div>`:''}`;
  const clarification=FIELD_CLARIFICATION_ES[f.Field_ID];
  // Example and validation stay available — they are canonical guidance — but behind the existing
  // discreet help popover, because the reference shows a single explanatory line under the control.
  const detail=[f.Ejemplo_ES?`<div><b>Ejemplo:</b> ${esc(f.Ejemplo_ES)}</div>`:'',
                f.Validation?`<div><b>Validación:</b> ${esc(f.Validation)}</div>`:'',
                `<div class="internal-only"><b>${esc(f.Field_ID)}</b> · ${esc(f.Write_Target||'—')}</div>`,
                f.Reuse_From?`<div class="internal-only technical-provenance"><b>Reuse_From:</b> ${esc(f.Reuse_From)} · <b>Reask_Policy:</b> ${esc(f.Reask_Policy||'—')}</div>`:''].join('');
  const popId=`help_${f.Field_ID}`;
  const help=detail?`<button type="button" class="help-icon" data-help-toggle="${attr(popId)}" aria-expanded="false" aria-controls="${attr(popId)}" title="Ayuda">?</button><div class="help-popover" id="${attr(popId)}" role="tooltip">${detail}</div>`:'';
  const wide=['TEXT_LONG_INTERNAL','MULTISELECT','MULTISELECT_WITH_OTHER','MULTISELECT_WITH_DETAIL','MULTISELECT_WITH_PRIORITY','FRICTION_MULTISELECT_PRIORITY','RISK_BUILDER','CLIENT_CONFIRMATION_WITH_INLINE_EDIT','STEP_PAIR_SELECTOR','STEP_SYSTEM_PAIR_SELECTOR','DROPDOWN_WITH_OWNER_DATE'].includes(String(f.Control_UI));
  return `<div class="field${wide?' full':''}" data-field="${attr(f.Field_ID)}"><label>${esc(f.Pregunta_o_etiqueta_ES)}${meta}${help}</label>${body}<div class="field-help">${esc(f.Objetivo_concreto||'')}</div>${clarification?`<div class="field-help clarification-note">${esc(clarification)}</div>`:''}</div>`;
}

function bindNoReask(){
  document.querySelectorAll('[data-edit-context]').forEach(b=>b.onclick=()=>{const e=currentEng();reaskState(e)[b.dataset.editContext]=true;markDirty(`Edición explícita habilitada ${b.dataset.editContext}`);render()});
  document.querySelectorAll('[data-close-context]').forEach(b=>b.onclick=()=>{const e=currentEng();delete reaskState(e)[b.dataset.closeContext];markDirty(`Edición explícita cerrada ${b.dataset.closeContext}`);render()});
  document.querySelectorAll('[data-goto-source]').forEach(b=>b.onclick=()=>setPage(b.dataset.gotoSource));
  document.querySelectorAll('[data-confirm-derived]').forEach(b=>b.onclick=()=>confirmDerivedValue(b.dataset.confirmDerived));
}
const __auneaRendererBindForms=bindForms;
bindForms=function(){__auneaRendererBindForms();bindNoReask();};

// addCompany moved to domain/company.js: creating a Company is Company's responsibility, not
// No-Reask's. The reference-driven form there captures the full CRM record.
// [AUNEA-FE-DIAG-NOREASK-050] END
