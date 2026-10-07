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
function confirmedDuplicateEntryValuePresent(v){
  const rows=Array.isArray(v)?v:(v&&typeof v==='object'?[v]:[]);
  return rows.some(row=>!!String(row?.data||'').trim()&&!!row?.from&&!!row?.to);
}
function canonicalFieldValidationIssue(f,v,e){
  if(!f)return '';
  const control=String(f.Control_UI||'').toUpperCase(),mode=v&&typeof v==='object'?String(v.mode||'').toUpperCase():'',detail=String(e?.answerDetails?.[f.Field_ID]||'').trim();
  const opts=typeof fieldOptions==='function'?fieldOptions(f.Option_Set_ID):[],other=(opts||[]).find(o=>String(o.value).toUpperCase()==='OTHER'||['otro','otra'].includes(String(o.label||'').trim().toLowerCase()));
  const selected=normalizeArray(v).map(String);
  if(other&&selected.includes(String(other.value))&&!detail)return 'Completa el detalle de la opción «Otro».';
  if((control==='CONTACT_OR_ROLE_REFERENCE'||control.includes('DROPDOWN_WITH_DETAIL'))&&String(v)==='OTHER'&&!detail)return 'Completa el detalle de la opción «Otro».';
  if(f.Field_ID==='DF099'&&String(v)==='YES'&&!detail)return 'Indica el alcance o condición del permiso.';
  if(!valuePresent(v))return '';
  if(['UNKNOWN','NONE'].includes(mode))return '';
  if(control.includes('NUMBER')&&v&&typeof v==='object'){
    const raw=v.value;
    if(raw===''||raw===null||raw===undefined)return 'Falta el valor numérico.';
    const n=Number(raw);
    if(!Number.isFinite(n)||n<0)return 'El valor debe ser un número igual o mayor que 0.';
    if((control.includes('TIME_UNIT')||control==='NUMBER_WITH_UNIT')&&!v.unit)return 'Falta la unidad.';
    if(control.includes('PERCENT')){
      if(v.unit==='percent'&&(n<0||n>100))return 'El porcentaje debe estar entre 0 y 100.';
      if(v.unit==='count'&&!v.period)return 'Cuando se registra un número de casos debe indicarse el periodo.';
    }
  }
  if(f.Field_ID==='DF025'&&v&&typeof v==='object'&&!['NONE','UNKNOWN'].includes(mode)){
    if(!(Number(v.value)>0))return 'El tiempo objetivo debe ser mayor que 0 o indicarse que no existe.';
    if(!v.unit)return 'Falta la unidad del tiempo objetivo.';
  }
  if(e){
    const steps=typeof activeSteps==='function'?activeSteps(e):(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),stepIds=new Set(steps.map(x=>String(x.id))),control=String(f.Control_UI||'').toUpperCase();
    const linkedOne=String(e.answerDetails?.[f.Field_ID+'__step']||'');
    const linkedMany=normalizeArray(e.answerDetails?.[f.Field_ID+'__steps']).map(String);
    if(control==='DROPDOWN_WITH_STEP_LINK'&&valuePresent(v)&&String(v)!=='UNKNOWN'){
      if(!linkedOne)return 'Selecciona también el paso afectado.';
      if(!stepIds.has(linkedOne))return 'El paso vinculado ya no está activo.';
    }
    if(['MULTISELECT_WITH_STEP_LINK','MULTISELECT_WITH_STEP_REFERENCE','STEP_ACTION_MULTISELECT'].includes(control)&&linkedMany.some(id=>!stepIds.has(id)))
      return 'Uno de los pasos vinculados ya no está activo.';
    if(control==='STEP_PAIR_SELECTOR'&&v&&typeof v==='object'){
      if((v.from&&!stepIds.has(String(v.from)))||(v.to&&!stepIds.has(String(v.to))))return 'Uno de los pasos seleccionados ya no está activo.';
    }
    if(control==='STEP_PAIR_LIST_SELECTOR'){
      // Incomplete rows are UI drafts, not confirmed diagnostic findings. They must not block the
      // layer or activate downstream logic until datum + source + destination are all present.
      const rows=(Array.isArray(v)?v:(v&&typeof v==='object'?[v]:[])).filter(row=>!!String(row?.data||'').trim()&&!!row?.from&&!!row?.to);
      for(const row of rows){
        if(String(row.from)===String(row.to))return 'El origen y el destino de una reintroducción deben ser pasos distintos.';
        if(!stepIds.has(String(row.from))||!stepIds.has(String(row.to)))return 'Una reintroducción contiene un paso que ya no está activo.';
      }
    }
    if(control==='STEP_SYSTEM_PAIR_SELECTOR'){
      const bad=normalizeArray(v).some(token=>{
        const m=String(token).match(/^pair:([^:]+):([^:]+)$/);return !!m&&(!stepIds.has(m[1])||!stepIds.has(m[2]));
      });
      if(bad)return 'Una relación seleccionada contiene un paso que ya no está activo.';
    }
  }
  if(f.Field_ID==='DF023'&&v&&typeof v==='object'&&e){
    const habitual=Number(e.answers?.DF021),period=String(e.answers?.DF022||'');
    if(Number.isFinite(habitual)&&habitual>=0&&v.period&&period&&String(v.period)===period&&Number(v.value)<habitual)
      return 'El volumen máximo no puede ser inferior al volumen habitual cuando usan el mismo periodo.';
  }
  return '';
}
function canonicalFieldValuePresent(f,v,e){const mode=String(f?.Ask_Mode||''),detail=String(e?.answerDetails?.[f?.Field_ID]||'').trim(),syntheticOther=/WITH_OTHER/.test(String(f?.Control_UI||'').toUpperCase())&&!valuePresent(v)&&!!detail;if(mode==='DERIVE_AND_CONFIRM'){const reuse=reusedValue(f.Field_ID,e);return reuse!==undefined&&!canonicalFieldValidationIssue(f,reuse,e)&&isDerivedConfirmed(f,e,reuse)}const valid=(valuePresent(v)||syntheticOther)&&!canonicalFieldValidationIssue(f,v,e);return !!valid}
function canonicalFieldRequiredNow(f,e){
  if(!f||!questionVisible(f,e))return false;
  return f.Requiredness==='REQUIRED_90M'&&!['SYSTEM_GENERATED','DERIVED'].includes(String(f.Ask_Mode||''));
}
function canonicalFieldIntegrityIssues(e){
  return (schema?.fields||[]).filter(f=>questionVisible(f,e)).map(f=>{
    const v=effectiveValue(f,e),message=canonicalFieldValidationIssue(f,v,e);
    return message?{type:'FIELD_INTEGRITY',id:f.Field_ID,label:`${f.Pregunta_o_etiqueta_ES||f.Field_ID}: ${message}`,stage:f.Stage_ID,navigationTarget:'diagnostico'}:null;
  }).filter(Boolean);
}

// The write-through that used to live here as a hardcoded wrapper over setAnswer, listing DF001/DF002/
// DF005 by hand, is now derived from each field's canonical Write_Target in writeThroughToOwner below
// and called from setAnswer itself. One mechanism, and it covers every Company-owned field rather than
// the three someone remembered to add.

// [AUNEA-FE-DIAG-OWNER-053] START — Distinct canonical views over one ProcessStep owner.
// DF047 records source inputs and structured outputs that can supply downstream data;
// DF049 records documentary artifacts seen on either side of the same steps.
// The artifact catalog is shared by both fields; an actual PDF can legitimately appear in both.
// No invented evidence attachment or second editable Process record is created here.
const DOCUMENT_ARTIFACT_TYPES=new Set(['FORM','EMAIL','TEXT','PDF','DOC','SHEET','IMAGE']);
const STRUCTURED_OUTPUT_TYPES=new Set(['RECORD','MASTER_DATA','API']);
function processDataSources(steps){return unique(steps.flatMap(s=>[
  ...normalizeArray(s.inputs).filter(x=>x!=='APPROVAL'),
  ...normalizeArray(s.outputs).filter(x=>STRUCTURED_OUTPUT_TYPES.has(x))
]));}
function processDocumentArtifacts(steps){return unique(steps.flatMap(s=>[
  ...normalizeArray(s.inputs),...normalizeArray(s.outputs)
].filter(x=>DOCUMENT_ARTIFACT_TYPES.has(x))));}
function globalFailureReview(e){
  const global=e.answers?.DF028,steps=activeSteps(e);
  const granular=steps.filter(x=>x.error_rate&&x.error_rate.value!==undefined&&x.error_rate.value!==null)
    .map(x=>({name:x.step_name||x.id,value:x.error_rate.value,mode:x.error_rate.mode||'percent'}));
  if(!granular.length)return '';
  const globalValue=valuePresent(global)?formatContextValue({Option_Set_ID:null},global):'No declarado';
  return 'Tasa global declarada: '+globalValue+'. Frecuencias por paso: '+granular.map(x=>x.name+' ('+x.value+(x.mode==='percent'?' %':' '+x.mode)+')').join('; ')+'. No se suman ni sustituyen: una misma incidencia puede afectar a varios pasos y las poblaciones deben verificarse.';
}
// [AUNEA-FE-DIAG-OWNER-053] END
function reusedValue(fid,e){
  const steps=activeSteps(e),fr=activeFrictions(e),c=companyById(e.companyId);
  if(fid==='DF001')return c?.name||e.answers?.DF001||'';
  if(fid==='DF002')return canonicalValueFromLabel('REF_INDUSTRY_CNAE25',c?.sector||e.answers?.DF002||'');
  if(fid==='DF005')return canonicalValueFromLabel('REF_COUNTRY_ISO3166',c?.country||e.answers?.DF005||'');
  if(fid==='DF006')return e.contactIds?.[0]||e.answers?.DF006||'';
  if(fid==='DF017')return unique(steps.map(x=>x.actor));
  if(fid==='DF046')return unique(steps.map(x=>x.tool));
  if(fid==='DF047')return processDataSources(steps);
  if(fid==='DF049')return processDocumentArtifacts(steps);
  if(fid==='DF050')return unique(steps.flatMap(x=>normalizeArray(x.communication_channels)));
  if(fid==='DF053')return unique(steps.filter(x=>normalizeArray(x.manual_actions).some(a=>String(a)==='SEARCH')).map(x=>x.id).concat(fr.filter(x=>['P09','P20'].includes(x.friction_type)).flatMap(x=>normalizeArray(x.affected_steps))));
  if(fid==='DF066')return unique(steps.filter(x=>valuePresent(x.exception_path)).map(x=>typeof x.exception_path==='object'?(x.exception_path.type||x.exception_path.label||JSON.stringify(x.exception_path)):x.exception_path));
  if(fid==='DF067')return unique(steps.filter(x=>x.step_type==='ST05'||normalizeArray(x.decision_criteria).length).map(x=>x.step_name||x.id));
  if(fid==='DF078'||fid==='DF079'){
    // DF078/DF079 must be backed by the exact server-calculated AS-IS version.
    // A missing or stale projection is unknown, never a browser-side sum.
    const cache=e._sessionTimeProjection;
    const key=typeof economicTimeRequest==='function'?JSON.stringify(economicTimeRequest(e)):null;
    if(!cache||!key||cache.requestKey!==key)return undefined;
    const measure=fid==='DF078'?cache.output.active_minutes_per_case:cache.output.rework_minutes_per_case;
    return measure==null?undefined:{value:measure,unit:'min',period:'case'};
  }
  if(fid==='DF085'){const types=unique((e.economicInputs||[]).map(x=>x.evidence_type));return types.length?types:['Sin inputs económicos materiales'];}
  if(fid==='DF093')return e.confirmedAsIs?'YES':'';
  if(fid==='DF057')return 'Se deriva de la fricción registrada; no se pregunta al cliente.';
  if(fid==='DF094')return canonicalMissingRequired(e).map(x=>{
    const field=(schema?.fields||[]).find(f=>f.Field_ID===x);
    return field?.Pregunta_o_etiqueta_ES||x;
  });
  if(fid==='DF095')return unique(fr.filter(x=>x.evidence_type!=='EV01').map(x=>`Evidencia de ${labelFrom('OS_FRICTION_TYPE',x.friction_type)}`).concat(canonicalMissingRequired(e).map(x=>{
    const field=(schema?.fields||[]).find(f=>f.Field_ID===x);
    return `Completar ${field?.Pregunta_o_etiqueta_ES||x}`;
  })));
  return undefined;
}
function effectiveValue(f,e){
  const explicit=e.answers?.[f.Field_ID],reuse=reusedValue(f.Field_ID,e),mode=String(f.Ask_Mode||'');
  if(['DERIVED','SYSTEM_GENERATED','DERIVE_AND_CONFIRM','SYSTEM_SUGGEST_THEN_CONFIRM','PREFILL_CONFIRM'].includes(mode)&&valuePresent(reuse))return reuse;
  if(valuePresent(explicit))return explicit;
  if(valuePresent(reuse))return reuse;
  return explicit??'';
}

const RISK_DISCOVERY_FIELDS=new Set(['DF073','DF074','DF090']);
const AI_DISCOVERY_FIELDS=new Set(['DF088']);
const DATA_DISCOVERY_FIELDS=new Set(['DF055']);
const RISK_RELEVANT_INITIAL_CONSTRAINTS=new Set(['SECURITY','COMPLIANCE','DATA_RESIDENCY','OWNERSHIP']);
function riskBranchSignal(e,steps,fr,answers){
  const critical=['4','5',4,5].includes(answers.DF018);
  const knownRiskConstraint=normalizeArray(answers.DF010).some(v=>RISK_RELEVANT_INITIAL_CONSTRAINTS.has(String(v)));
  const nonTimeImpact=valuePresent(answers.DF064)||fr.some(x=>normalizeArray(x.non_time_impact).length>0);
  const sensitiveData=normalizeArray(answers.DF073).some(v=>String(v).toUpperCase()!=='NONE');
  const reversibility=valuePresent(answers.DF074)&&String(answers.DF074).toUpperCase()!=='REVERSIBLE';
  const securityConstraint=valuePresent(answers.DF090);
  const existingRisk=(e.risks||[]).some(x=>x.status!=='SUPERSEDED');
  return existingRisk||critical||knownRiskConstraint||nonTimeImpact||sensitiveData||reversibility||securityConstraint;
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
    case 'BR-DATA':return valuePresent(answers.DF055)||confirmedDuplicateEntryValuePresent(answers.DF051)||steps.some(x=>normalizeArray(x.manual_actions).some(a=>['REKEY','COPY'].includes(String(a))))||frTypes.has('P13')||frTypes.has('P03');
    case 'BR-EXCEPTION':return steps.some(x=>valuePresent(x.exception_path));
    case 'BR-VISIBILITY':return valuePresent(answers.DF027)||valuePresent(answers.DF053)||valuePresent(answers.DF081)||steps.some(x=>normalizeArray(x.manual_actions).some(a=>String(a)==='SEARCH'))||frTypes.has('P09')||frTypes.has('P14')||frTypes.has('P20');
    case 'BR-KNOWLEDGE':return frTypes.has('P20')||answers.DF019==='NO';
    case 'BR-RISK':return riskBranchSignal(e,steps,fr,answers);
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

function structuredCaptureOwner(f){
  const target=String(f?.Write_Target||'');
  if(target.startsWith('RT_PROCESS_STEP.'))return 'PROCESS_STEP';
  if(target.startsWith('RT_PAIN.'))return 'FRICTION';
  if(target.startsWith('RT_RISK.'))return 'RISK';
  if(target==='RT_ECONOMIC_INPUT'||target.startsWith('RT_ECONOMIC_INPUT.'))return 'ECONOMIC';
  return null;
}
function questionVisible(f,e){
  // Single-owner rule: structured builders own ProcessStep/Friction/RiskInput/EconomicInput.
  // Their fields must never reappear in a generic stage form, regardless of Ask_Mode.
  if(structuredCaptureOwner(f))return false;
  // DF025 is itself the canonical question that establishes whether an SLA/target exists.
  // It must remain askable in S03; otherwise BR-SLA creates a circular visibility dependency.
  if(f.Field_ID==='DF025'&&f.Stage_ID==='S03')return true;
  // DF073/DF074/DF090 are canonical discovery probes: their answers can reveal that BR-RISK applies.
  // Keeping these CONDITIONAL_90M questions available does not make them required and prevents the
  // branch from needing a pre-existing RiskInput (or the answer itself) before the exposure is discoverable.
  if(RISK_DISCOVERY_FIELDS.has(f.Field_ID))return true;
  // DF088 is the canonical automation/AI boundary. S08 is intentionally before the AS-IS map (DEC-065),
  // so later evidence cannot be allowed to make this guardrail undiscoverable. Keep it available as a
  // CONDITIONAL_90M probe without treating mere visibility as proof that BR-AI is active.
  if(AI_DISCOVERY_FIELDS.has(f.Field_ID)&&f.Stage_ID==='S08'&&String(f.Write_Target||'')==='RT_PROCESS.Must_Not_Automate')return true;
  // DF055 is the canonical data-quality discovery question. Leaving it visible as a non-blocking
  // CONDITIONAL_90M probe prevents BR-DATA from requiring a pre-existing data-quality finding first.
  if(DATA_DISCOVERY_FIELDS.has(f.Field_ID)&&f.Stage_ID==='S04'&&String(f.Write_Target||'')==='RT_FINDING')return true;
  // DF052 is only useful when the current map already contains multiple documentary artifacts or an
  // existing pain signal. This follows its canonical re-ask trigger without opening every BR-PAIN question.
  if(f.Field_ID==='DF052'&&f.Stage_ID==='S04')return processDocumentArtifacts(activeSteps(e)).length>1||branchActive('BR-PAIN',e)||valuePresent(e.answers?.DF052);
  if(['CAPTURE_IN_PROCESS_STEP','CONDITIONAL_IN_STEP'].includes(f.Ask_Mode))return false;
  if(['CAPTURE_IN_FRICTION','CONDITIONAL_IN_FRICTION'].includes(f.Ask_Mode))return false;
  if(f.Ask_Mode==='CAPTURE_IN_RISK')return false;
  // S08 now precedes the map (DEC-065): show future outcomes/constraints before ProcessSteps exist.
  // BR-FUTURE stays visible here; BR-RISK and BR-AI have dedicated discovery probes above.
  if(f.Stage_ID==='S08'&&f.Branch_Rule_ID==='BR-FUTURE')return true;
  return branchActive(f.Branch_Rule_ID,e);
}
function canonicalMissingRequired(e){
  const skip=new Set(['DF094','DF095']);const misses=[];
  (schema?.fields||[]).filter(f=>!skip.has(f.Field_ID)&&canonicalFieldRequiredNow(f,e)).forEach(f=>{if(!canonicalFieldValuePresent(f,effectiveValue(f,e),e))misses.push(f.Field_ID)});
  const startField=(schema?.fields||[]).find(f=>f.Field_ID==='DF014'),endField=(schema?.fields||[]).find(f=>f.Field_ID==='DF015');
  const hasBoundaries=!!startField&&!!endField&&valuePresent(effectiveValue(startField,e))&&valuePresent(effectiveValue(endField,e));
  if(!hasBoundaries&&!activeSteps(e).length)misses.push('Mapa AS-IS');
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
  // A Reuse_From declaration describes where a prefill may come from; it does not make a manual
  // answer "reused". Only collapse to contextual/prefill UX when a real reused value exists.
  if(f.Reuse_From&&!valuePresent(reusedValue(f.Field_ID,e)))return false;
  return ['NO_REASK','CONFIRM_ONLY_IF_CHANGED','DERIVE_THEN_CONFIRM'].includes(policy)||['PREFILL_CONFIRM','DERIVE_AND_CONFIRM'].includes(mode);
}
function requiresDerivedConfirmation(f){return String(f.Ask_Mode||'')==='DERIVE_AND_CONFIRM'||String(f.Reask_Policy||'')==='DERIVE_THEN_CONFIRM'}
function derivedFingerprint(v){try{return JSON.stringify(v)}catch{return String(v)}}
function derivedConfirmation(f,e,reuse=reusedValue(f.Field_ID,e)){const details=e?.answerDetails||{};return details[`${f.Field_ID}__derived_confirmation`]||null}
function isDerivedConfirmed(f,e,reuse=reusedValue(f.Field_ID,e)){const m=derivedConfirmation(f,e,reuse);return !!m&&m.fingerprint===derivedFingerprint(reuse)}
function confirmDerivedValue(fid){
  const e=currentEng(),f=schema?.fields?.find(x=>x.Field_ID===fid);if(!e||!f)return;
  const reuse=reusedValue(fid,e);if(reuse===undefined)return toast('No hay una derivación disponible que confirmar.');
  const details=e.answerDetails||(e.answerDetails={});details[`${fid}__derived_confirmation`]={fingerprint:derivedFingerprint(reuse),confirmedAt:now()};
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
  const m=raw.match(/(RT_[A-Z_]+)(?:\.([A-Za-z0-9_]+))?/);
  if(!m)return {label:'un dato ya capturado en el estudio',page:null,entity:null,attribute:null};
  const srcField=m[2]?reuseWriteTargetIndex()[`${m[1]}.${m[2]}`]:null;
  const page=Object.prototype.hasOwnProperty.call(ENTITY_PAGE_MAP,m[1])?ENTITY_PAGE_MAP[m[1]]:null;
  return {label:srcField?srcField.Pregunta_o_etiqueta_ES:'datos ya capturados del proceso',page,entity:m[1],attribute:m[2]||null};
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
// [AUNEA-FE-DIAG-ECON-CONTEXT-054] START — Existing manual time is not an additive benefit.
function economicConditionalTimeContext(fid,e){
  if(fid!=='DF080'&&fid!=='DF081')return '';
  const followup=fid==='DF080',manual=followup?'CHASE':'REPORT';
  const types=followup?['P06','P07','P12','P18']:['P09','P14'];
  const steps=activeSteps(e).filter(x=>normalizeArray(x.manual_actions).includes(manual));
  const frictions=activeFrictions(e).filter(x=>types.includes(x.friction_type));
  const refs=unique([...steps.map(x=>x.step_name||x.id),...frictions.map(x=>x.client_label||x.id)]);
  const label=followup?'Seguimiento':'Consolidación/reporting';
  return refs.length
    ?label+' ya figura en AS-IS: '+refs.join('; ')+'. Antes de sumar, verifica si el valor declarado está incluido en tiempo activo, retrabajo o fricción y concilia el mismo ámbito. No se considera ahorro ni tiempo adicional por defecto.'
    :label+': verificar si está cuantificado en pasos o fricciones. Sólo valorar un ámbito adicional material cuando se haya acreditado que no está contabilizado.';
}
// [AUNEA-FE-DIAG-ECON-CONTEXT-054] END
function renderQuestion(f,e){
  const val=effectiveValue(f,e),opts=fieldOptions(f.Option_Set_ID),required=f.Requiredness==='REQUIRED_90M',mode=String(f.Ask_Mode||'');
  // A Control_UI starting with "DERIVED" (e.g. DERIVED_OR_CONDITIONAL) only means system-generated when
  // Ask_Mode itself says so. DF080/DF081 are Ask_Mode:CONDITIONAL_ASK — the canonical contract is
  // "derive when possible, otherwise ask" — so the broad prefix match must not force them read-only:
  // that silently made a genuinely askable field permanently unanswerable.
  const systemOnly=['DERIVED','SYSTEM_GENERATED'].includes(mode)||(String(f.Control_UI).startsWith('DERIVED')&&!['CONDITIONAL_ASK','DERIVE_AND_CONFIRM'].includes(mode))||(String(f.Control_UI).startsWith('SYSTEM_GENERATED')&&mode!=='DERIVE_AND_CONFIRM');
  // The references put the requiredness mark and the provenance chip beside the label, and show no
  // Field_ID on the field itself — coverage is stated once, in the stage inspector.
  const source=f.Reuse_From?reuseSourceInfo(f):null,reuse=reusedValue(f.Field_ID,e);
  const chip=(source&&valuePresent(reuse))?prefillChip(source.label):'';
  const meta=`${required?requiredMark():''}${f.Requiredness==='CONDITIONAL_90M'?'<span class="conditional-tag">condicional</span>':''}${chip}`;
  let body='';
  if(mode==='DERIVE_AND_CONFIRM'){
    const src=reuseSourceInfo(f),confirmed=isDerivedConfirmed(f,e,reuse),derivedText=valuePresent(reuse)?formatContextValue(f,reuse):'Sin elementos derivados';
    const confirmUi=confirmed?'<span class="status green">Derivación confirmada</span>':`<button type="button" class="btn btn-small btn-primary" data-confirm-derived="${f.Field_ID}">Confirmar valor</button>`;
    const editUi=src.page?`<button type="button" class="btn btn-small" data-goto-source="${attr(src.page)}">Revisar en ${esc(pageLabelEs(src.page))}</button>`:'';
    body=`<div class="reuse-context"><div><strong>${esc(derivedText)}</strong><small>Derivado de: ${esc(src.label)}</small></div><div class="row-actions">${confirmUi}${editUi}</div></div>`;
  }
  else if(systemOnly)body=`<div class="readonly-box">${esc(formatContextValue(f,val)||'Se completará automáticamente cuando existan datos suficientes.')}</div>`;
  else if(f.Field_ID==='DF007')body=renderControl(f,val,opts,e);
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
  const consistencyNote=f.Field_ID==='DF028'?globalFailureReview(e):'';
  const economicNote=economicConditionalTimeContext(f.Field_ID,e);
  // Example and validation stay available — they are canonical guidance — but behind the existing
  // discreet help popover, because the reference shows a single explanatory line under the control.
  const detail=[f.Objetivo_concreto?`<div><b>Para qué sirve:</b> ${esc(f.Objetivo_concreto)}</div>`:'',f.Ejemplo_ES?`<div><b>Ejemplo:</b> ${esc(f.Ejemplo_ES)}</div>`:'',
                f.Validation?`<div><b>Validación:</b> ${esc(f.Validation)}</div>`:'',
                `<div class="internal-only"><b>${esc(f.Field_ID)}</b> · ${esc(f.Write_Target||'—')}</div>`,
                f.Reuse_From?`<div class="internal-only technical-provenance"><b>Reuse_From:</b> ${esc(f.Reuse_From)} · <b>Reask_Policy:</b> ${esc(f.Reask_Policy||'—')}</div>`:''].join('');
  const popId=`help_${f.Field_ID}`;
  const help=detail?`<button type="button" class="help-icon" data-help-toggle="${attr(popId)}" aria-expanded="false" aria-controls="${attr(popId)}" title="Ayuda">?</button><div class="help-popover" id="${attr(popId)}" role="tooltip">${detail}</div>`:'';
  const wide=['TEXT_LONG_INTERNAL','MULTISELECT','MULTISELECT_WITH_OTHER','MULTISELECT_WITH_DETAIL','MULTISELECT_WITH_PRIORITY','MULTISELECT_WITH_STEP_LINK','MULTISELECT_WITH_STEP_REFERENCE','STEP_MULTISELECT_WITH_FRICTION','SYSTEM_GENERATED_MULTISELECT','DERIVED_ARTIFACT_LIST','FRICTION_MULTISELECT_PRIORITY','RISK_BUILDER','CLIENT_CONFIRMATION_WITH_INLINE_EDIT','STEP_PAIR_SELECTOR','STEP_PAIR_LIST_SELECTOR','STEP_SYSTEM_PAIR_SELECTOR','DROPDOWN_WITH_OWNER_DATE','BOOLEAN_UNKNOWN_WITH_SCOPE'].includes(String(f.Control_UI));
  const clarificationUnderLabel=['DF020','DF029'].includes(f.Field_ID)&&clarification;
  return `<div class="field${wide?' full':''}" data-field="${attr(f.Field_ID)}"><label>${esc(f.Pregunta_o_etiqueta_ES)}${meta}${help}</label>${clarificationUnderLabel?`<div class="field-help clarification-note">${esc(clarification)}</div>`:''}${body}<div class="field-help">${esc(f.Objetivo_concreto||'')}</div>${clarification&&!clarificationUnderLabel?`<div class="field-help clarification-note">${esc(clarification)}</div>`:''}${consistencyNote?`<div class="field-help clarification-note" data-global-failure-review="DF028">${esc(consistencyNote)}</div>`:''}${economicNote?`<div class="field-help clarification-note" data-economic-overlap-review="${f.Field_ID}">${esc(economicNote)}</div>`:''}</div>`;
}

function bindNoReask(){
  document.querySelectorAll('[data-edit-context]').forEach(b=>b.onclick=()=>{const e=currentEng();reaskState(e)[b.dataset.editContext]=true;markDirty(`Edición explícita habilitada ${b.dataset.editContext}`);render()});
  document.querySelectorAll('[data-close-context]').forEach(b=>b.onclick=()=>{const e=currentEng();delete reaskState(e)[b.dataset.closeContext];markDirty(`Edición explícita cerrada ${b.dataset.closeContext}`);render()});
  document.querySelectorAll('[data-goto-source]').forEach(b=>b.onclick=()=>setPage(b.dataset.gotoSource));
  document.querySelectorAll('[data-confirm-derived]').forEach(b=>b.onclick=()=>confirmDerivedValue(b.dataset.confirmDerived));
  if(typeof bindHelpToggles==='function')bindHelpToggles();
}
const __auneaRendererBindForms=bindForms;
bindForms=function(){__auneaRendererBindForms();bindNoReask();};

// addCompany moved to domain/company.js: creating a Company is Company's responsibility, not
// No-Reask's. The reference-driven form there captures the full CRM record.
// [AUNEA-FE-DIAG-NOREASK-050] END
