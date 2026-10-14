// [AUNEA-DATA-PROCESS-SUGGESTIONS-010] START — Runtime registration for the governed rule projection
// SOURCE FILE: data/process-suggestion-rules.js; canonical source remains Drive document v1.0.
// [AUNEA-DATA-PROCESS-SUGGESTIONS-010] END
// [AUNEA-FE-PROCESS-SUGGESTION-ENGINE-010] START — Governed deterministic assistance for AS-IS steps
// SOURCE: AUNEA_PROCESS_SUGGESTION_RULES_CANONICAL v1.2; DEC-009/031/032; Diagnostic Master v1.2.
// PURPOSE: reuse, derive, infer and flag coherence without auto-confirming client reality.
// CHANGE_RISK: HIGH.

function processSuggestionTypeLabel(type){return ({REUSE:'Reutilizado',DERIVED:'Derivado',INFERRED:'Inferido',COHERENCE:'Revisar coherencia',CONTEXT:'Contexto'})[type]||'Sugerencia'}
function processSuggestionIdList(values){return [...new Set(normalizeArray(values).filter(Boolean).map(String))]}
function processSuggestionLabels(setId,values){return processSuggestionIdList(values).map(v=>labelFrom(setId,v)||v)}
function processSuggestionSyntheticContext(e){const marker=String(e?.answers?.DF100||'');return !!(e?._uat||e?.uat||/\bUAT\b|sint[eé]tic/i.test(marker))}
function processSuggestionFirstStep(e,s,existing){const steps=activeSteps(e);if(existing?.id)return steps.findIndex(x=>x.id===existing.id)===0;return steps.length===0}
function processSuggestionPreviousStep(e,s,existing,linkFromStepId){const steps=activeSteps(e);if(linkFromStepId)return steps.find(x=>x.id===linkFromStepId)||null;if(existing?.id){const i=steps.findIndex(x=>x.id===existing.id);return i>0?steps[i-1]:null}return steps[steps.length-1]||null}
function processSuggestionStartArtifacts(e){const text=String(e?.answers?.DF014||'').toLocaleLowerCase('es'),out=[];if(/email|correo/.test(text))out.push('EMAIL');if(/\bpdf\b/.test(text))out.push('PDF');return out}
function processSuggestionHasEmailStart(e){return /email|correo/i.test(String(e?.answers?.DF014||''))}
function processSuggestionHasPdfStart(e){return /\bpdf\b|adjunt/i.test(String(e?.answers?.DF014||''))}
function processSuggestionAdd(map,field,suggestion){(map[field]||(map[field]=[])).push(suggestion);return map}
function processStepSuggestions(e,s,{existing=null,linkFromStepId=null}={}){
  const out={},first=processSuggestionFirstStep(e,s,existing),prev=processSuggestionPreviousStep(e,s,existing,linkFromStepId);
  const actorValues=processContextValues(e,'OS_ACTOR_ROLE',{linkFromStepId});
  if(actorValues.length)processSuggestionAdd(out,'actor',{ruleId:'PSR-001',type:'REUSE',values:actorValues,setId:'OS_ACTOR_ROLE',text:actorValues.length===1?'Este rol ya está identificado en el proceso.':'Estos roles ya están identificados en el proceso; elige explícitamente el que realiza este paso.',apply:false});
  const toolValues=processContextValues(e,'OS_TOOL_CATEGORY',{linkFromStepId});
  if(toolValues.length)processSuggestionAdd(out,'tool',{ruleId:'PSR-002',type:'REUSE',values:toolValues,setId:'OS_TOOL_CATEGORY',text:toolValues.length===1?'Esta herramienta ya está utilizada en el proceso.':'Herramientas ya utilizadas en el proceso. Elige la que corresponda en el desplegable; no se recomienda una automáticamente.',apply:false});
  const prevOutputs=processSuggestionIdList(prev?.outputs);
  if(prevOutputs.length)processSuggestionAdd(out,'inputs',{ruleId:'PSR-003',type:'DERIVED',values:prevOutputs,setId:'OS_ARTIFACT_TYPE',text:'El paso anterior produce estos artefactos; pueden reutilizarse como entradas de este paso.',apply:true});
  else if(first){const artifacts=processSuggestionStartArtifacts(e);if(artifacts.length)processSuggestionAdd(out,'inputs',{ruleId:'PSR-004',type:'DERIVED',values:artifacts,setId:'OS_ARTIFACT_TYPE',text:'Se han identificado explícitamente en el inicio del proceso.',apply:true})}
  if(first&&processSuggestionHasEmailStart(e)){
    processSuggestionAdd(out,'tool',{ruleId:'PSR-006',type:'DERIVED',values:['EMAIL'],setId:'OS_TOOL_CATEGORY',text:'El proceso comienza con una recepción por email.',apply:true});
    processSuggestionAdd(out,'communication_channels',{ruleId:'PSR-005',type:'DERIVED',values:['EMAIL'],setId:'OS_COMM_CHANNEL',text:'El canal de entrada declarado es email.',apply:true});
  }
  if(first&&processSuggestionHasEmailStart(e)&&processSuggestionHasPdfStart(e)){
    processSuggestionAdd(out,'manual_actions',{ruleId:'PSR-007',type:'INFERRED',values:['DOWNLOAD'],setId:'OS_MANUAL_ACTION',text:'En un patrón de recepción de PDF adjunto por email puede existir una descarga manual antes de continuar. Confirma si ocurre realmente.',apply:true});
    processSuggestionAdd(out,'evidence',{ruleId:'PSR-014',type:'INFERRED',values:['EV07'],setId:'OS_EVIDENCE_TYPE',text:'Hay una propuesta basada únicamente en patrón; si la confirmas como parte del paso, puede clasificarse como Inferido.',apply:true});
  }
  if(processSuggestionSyntheticContext(e))processSuggestionAdd(out,'evidence',{ruleId:'PSR-013',type:'DERIVED',values:['EV04'],setId:'OS_EVIDENCE_TYPE',text:'Este engagement está identificado como escenario sintético/UAT.',apply:true});
  const scopeDecisionValues=typeof decisionCriteriaPresetFromScope==='function'?processSuggestionIdList(decisionCriteriaPresetFromScope(e)):[];
  if(scopeDecisionValues.length)processSuggestionAdd(out,'decision_criteria',{ruleId:'PSR-010',type:'DERIVED',values:scopeDecisionValues,setId:'OS_DECISION_CRITERIA',text:'Las variantes declaradas en Alcance del proceso apuntan a estos criterios de decisión.',apply:true});
  const origin=linkFromStepId?activeSteps(e).find(x=>x.id===linkFromStepId):null;
  if(origin&&processDecisionStep(origin)){
    const condition=String(origin?._details?.decision_criteria||origin?.exception_path?.condition||'').trim();
    if(condition)processSuggestionAdd(out,'applies_to',{ruleId:'PSR-009',type:'DERIVED',value:{mode:'CONDITION',condition},display:condition,text:'Este paso nace de una ruta de decisión; puede heredar la condición de esa ruta.',apply:true});
  }else{
    const currentMode=s?.applies_to?.mode||s?.applies_to||'';
    if(!currentMode||currentMode==='ALL')processSuggestionAdd(out,'applies_to',{ruleId:'PSR-008',type:'DERIVED',value:{mode:'ALL'},display:'Todos los casos',text:'El paso está en el flujo principal y no depende de una condición previa.',apply:true});
  }
  const volumeKnown=e?.answers?.DF021!==undefined&&e?.answers?.DF021!==null&&String(e.answers.DF021)!==''&&e?.answers?.DF022;
  if(volumeKnown)processSuggestionAdd(out,'active_time',{ruleId:'PSR-015',type:'CONTEXT',text:'El proceso tiene volumen habitual informado. Este tiempo activo se utilizará junto con ese volumen para anualizar carga y esfuerzo; AUNEA no propone minutos sin una fuente.',apply:false});
  if(e?.answers?.DF025||e?.answers?.DF026)processSuggestionAdd(out,'wait_time',{ruleId:'PSR-016',type:'CONTEXT',text:'Existe contexto global de SLA o tiempo end-to-end. La espera de este paso contribuirá al tiempo de ciclo, pero se mantiene separada del trabajo activo y no se monetiza como trabajo.',apply:false});
  const stepHasFailure=Number(s?.rework_time||0)>0||Number(s?.error_rate?.value??s?.error_rate??0)>0;
  const globalFailure=e?.answers?.DF028;
  if(stepHasFailure||globalFailure){
    const failureText=globalFailure?'Existe una proporción global de error/retrabajo para el proceso. Úsala sólo como contraste; no se copia como tasa específica de este paso. Tiempo de retrabajo y frecuencia describen el mismo mecanismo desde dimensiones distintas.':'Tiempo de retrabajo y frecuencia describen el mismo mecanismo de fallo desde dimensiones distintas: tiempo de corrección y frecuencia.';
    processSuggestionAdd(out,'rework_time',{ruleId:'PSR-017',type:'CONTEXT',text:failureText,apply:false});
    processSuggestionAdd(out,'error_rate',{ruleId:'PSR-017',type:'CONTEXT',text:failureText,apply:false});
  }
  if(String(s?.automation_state||'')==='AUTOMATED'&&normalizeArray(s?.manual_actions).length)processSuggestionAdd(out,'automation_state',{ruleId:'PSR-011',type:'COHERENCE',text:'Has indicado Automatizado, pero también existen acciones manuales. Revisa ambos datos.',apply:false});
  if(s?.step_type&&!['ST06','ST07','ST09'].includes(String(s.step_type))&&!normalizeArray(s?.outputs).length)processSuggestionAdd(out,'outputs',{ruleId:'PSR-012',type:'COHERENCE',text:'Este tipo de paso suele generar o actualizar algo. Confirma el output o valida que realmente no exista.',apply:false});
  return out;
}
function processSuggestionValueText(s){if(s.display)return s.display;const labels=s.setId?processSuggestionLabels(s.setId,s.values):processSuggestionIdList(s.values);return labels.join(' · ')}
function processSuggestionHtml(field,suggestions){
  const rows=normalizeArray(suggestions).filter(Boolean);if(!rows.length)return '';
  return rows.map((s,i)=>{
    const value=processSuggestionValueText(s),type=processSuggestionTypeLabel(s.type),values=processSuggestionIdList(s.values);
    let actions='';
    if(s.apply&&value)actions=`<button type="button" class="btn btn-small step-suggestion-toggle" data-step-suggestion-field="${attr(field)}" data-step-suggestion-index="${i}" data-step-suggestion-action="apply">Aplicar</button>`;
    return `<div class="step-suggestion step-suggestion-${String(s.type||'').toLowerCase()}" data-step-suggestion-rule="${attr(s.ruleId)}" data-step-suggestion-row-field="${attr(field)}" data-step-suggestion-row-index="${i}"><div class="step-suggestion-copy"><strong>${esc(type)}</strong><span>${esc(s.text||'')}</span>${value?`<b>${esc(value)}</b>`:''}</div>${actions||s.apply?`<div class="step-suggestion-action-state"><em class="step-suggestion-status" data-step-suggestion-status></em>${actions}</div>`:''}</div>`;
  }).join('');
}
function processSuggestionTrace(s,suggestion,accepted){s._suggestion_trace=Array.isArray(s._suggestion_trace)?s._suggestion_trace:[];const entry={rule_id:suggestion.ruleId,type:suggestion.type,target_field:suggestion.targetField||'',proposed_value:suggestion.values||suggestion.value||null,accepted:!!accepted,timestamp:now()};const i=s._suggestion_trace.findIndex(x=>x.rule_id===entry.rule_id&&x.target_field===entry.target_field);if(i>=0)s._suggestion_trace[i]=entry;else s._suggestion_trace.push(entry)}
function processSuggestionSetSingle(id,value){const input=document.getElementById(id);if(!input)return false;input.value=value;const box=document.querySelector?.(`details[data-aunea-select="${id}"]`);const option=box?.querySelector?.(`[data-aunea-select-option="${id}"][data-value="${value}"]`);if(box&&option){box.querySelectorAll(`[data-aunea-select-option="${id}"]`).forEach(x=>x.classList.toggle('selected',x===option));const label=box.querySelector('summary span');if(label)label.textContent=option.dataset.label||option.textContent||value}input.dispatchEvent?.(new Event('change',{bubbles:true}));return true}
function processSuggestionSetMulti(id,values,{replace=false}={}){const wanted=new Set(processSuggestionIdList(values)),nodes=[...document.querySelectorAll?.(`[data-v1-multi="${id}"]`)||[]];let changed=false,matched=wanted.size===0;nodes.forEach(x=>{const hit=wanted.has(String(x.value));if(hit)matched=true;const next=replace?hit:(x.checked||hit);if(x.checked!==next){x.checked=next;changed=true;x.dispatchEvent?.(new Event('change',{bubbles:true}))}});return changed||matched}
function processSuggestionFieldControl(field){return ({actor:'step_actor',tool:'step_tool',inputs:'step_inputs',decision_criteria:'step_decisions',manual_actions:'step_manual',communication_channels:'step_channels',evidence:'step_evidence'})[field]||''}
function processSuggestionSnapshot(field){
  if(field==='applies_to')return {kind:'applies',mode:document.getElementById('step_applies_mode')?.value||'ALL',value:document.getElementById('step_applies_value')?.value||''};
  const id=processSuggestionFieldControl(field);if(!id)return null;
  if(['actor','tool'].includes(field)){const input=document.getElementById(id);return {kind:'single',id,value:input?.value||'',other:document.getElementById(id+'_other')?.value||''}}
  return {kind:'multi',id,values:[...document.querySelectorAll?.(`[data-v1-multi="${id}"]:checked`)||[]].map(x=>x.value)};
}
function processSuggestionRestore(field,snapshot){
  if(!snapshot)return false;
  if(snapshot.kind==='single'){const ok=processSuggestionSetSingle(snapshot.id,snapshot.value);const other=document.getElementById(snapshot.id+'_other');if(other)other.value=snapshot.other||'';return ok}
  if(snapshot.kind==='multi')return processSuggestionSetMulti(snapshot.id,snapshot.values,{replace:true});
  if(snapshot.kind==='applies'){const mode=document.getElementById('step_applies_mode'),detail=document.getElementById('step_applies_value');if(!mode||!detail)return false;mode.value=snapshot.mode;mode.dispatchEvent?.(new Event('change',{bubbles:true}));detail.value=snapshot.value;return true}
  return false;
}
function applyProcessStepSuggestion(field,suggestion,s,choiceValue=''){
  if(!suggestion)return false;let changed=false;suggestion.targetField=field;
  const chosen=choiceValue||suggestion.values?.[0]||'';
  if(field==='actor')changed=processSuggestionSetSingle('step_actor',chosen);
  else if(field==='tool')changed=processSuggestionSetSingle('step_tool',chosen);
  else if(field==='inputs')changed=processSuggestionSetMulti('step_inputs',suggestion.values,{replace:true});
  else if(field==='decision_criteria')changed=processSuggestionSetMulti('step_decisions',suggestion.values,{replace:true});
  else if(field==='manual_actions')changed=processSuggestionSetMulti('step_manual',suggestion.values,{replace:true});
  else if(field==='communication_channels')changed=processSuggestionSetMulti('step_channels',suggestion.values,{replace:true});
  else if(field==='evidence')changed=processSuggestionSetMulti('step_evidence',suggestion.values,{replace:true});
  else if(field==='applies_to'){const mode=suggestion.value?.mode||'ALL',input=document.getElementById('step_applies_mode'),detail=document.getElementById('step_applies_value');if(input){input.value=mode;input.dispatchEvent?.(new Event('change',{bubbles:true}));if(detail&&mode==='CONDITION')detail.value=suggestion.value?.condition||'';changed=true}}
  if(changed){processSuggestionTrace(s,{...suggestion,values:choiceValue?[choiceValue]:suggestion.values},true);if(typeof toast==='function')toast('Sugerencia aplicada. Confirma el paso para guardarla.')}return changed;
}
function processSuggestionSetRowState(row,state){
  if(!row)return;
  const status=row.querySelector?.('[data-step-suggestion-status]'),toggle=row.querySelector?.('.step-suggestion-toggle');
  if(state==='applied'){if(status)status.textContent='Aplicado';if(toggle){toggle.textContent='Deshacer';toggle.dataset.stepSuggestionAction='undo'}row.dataset.suggestionApplied='1'}
  else{if(status)status.textContent='Deshecho';if(toggle){toggle.textContent='Aplicar';toggle.dataset.stepSuggestionAction='apply'}delete row.dataset.suggestionApplied}
}
function processSuggestionFieldNodes(field){
  if(field==='applies_to')return [document.getElementById('step_applies_mode'),document.getElementById('step_applies_value')].filter(Boolean);
  const id=processSuggestionFieldControl(field);if(!id)return [];
  if(['actor','tool'].includes(field))return [document.getElementById(id),document.getElementById(id+'_other')].filter(Boolean);
  return [...document.querySelectorAll?.(`[data-v1-multi="${id}"]`)||[]];
}
function bindProcessStepSuggestions(s,suggestionMap){
  document.querySelectorAll?.('[data-step-suggestion-row-field]').forEach(row=>{
    row.__auneaSuggestionState=null;row.__auneaSuggestionMutating=false;
    const toggle=row.querySelector?.('.step-suggestion-toggle');
    toggle?.addEventListener?.('click',()=>{
      const field=toggle.dataset.stepSuggestionField,index=Number(toggle.dataset.stepSuggestionIndex||0),suggestion=normalizeArray(suggestionMap[field])[index];
      if(toggle.dataset.stepSuggestionAction==='undo'){
        const state=row.__auneaSuggestionState;if(!state)return;
        row.__auneaSuggestionMutating=true;const restored=processSuggestionRestore(state.field,state.snapshot);row.__auneaSuggestionMutating=false;
        if(restored){processSuggestionTrace(s,{...state.suggestion,targetField:state.field},false);processSuggestionSetRowState(row,'undone');row.__auneaSuggestionState=null;if(typeof toast==='function')toast('Sugerencia deshecha.')}
        return;
      }
      const snapshot=processSuggestionSnapshot(field);row.__auneaSuggestionMutating=true;const applied=applyProcessStepSuggestion(field,suggestion,s);row.__auneaSuggestionMutating=false;if(!applied)return;
      row.__auneaSuggestionState={snapshot,field,suggestion};processSuggestionSetRowState(row,'applied');
    });
    const field=row.dataset.stepSuggestionRowField;
    processSuggestionFieldNodes(field).forEach(node=>{
      const manualChange=()=>{if(row.__auneaSuggestionMutating||row.dataset.suggestionApplied!=='1')return;processSuggestionTrace(s,{...row.__auneaSuggestionState?.suggestion,targetField:field},false);processSuggestionSetRowState(row,'undone');row.__auneaSuggestionState=null};
      node.addEventListener?.('change',manualChange);if(node.tagName==='INPUT'&&node.type==='text')node.addEventListener?.('input',manualChange);
    });
  });
}
// [AUNEA-FE-PROCESS-SUGGESTION-ENGINE-010] END
