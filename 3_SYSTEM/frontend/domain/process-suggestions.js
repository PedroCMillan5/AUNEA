// [AUNEA-FE-PROCESS-SUGGESTION-ENGINE-010] START — Governed deterministic assistance for AS-IS steps
// SOURCE: AUNEA_PROCESS_SUGGESTION_RULES_CANONICAL v1.0; DEC-009/031/032; Diagnostic Master v1.2.
// PURPOSE: reuse, derive, infer and flag coherence without auto-confirming client reality.
// CHANGE_RISK: HIGH.

function processSuggestionTypeLabel(type){return ({REUSE:'Reutilizado',DERIVED:'Derivado',INFERRED:'Inferido',COHERENCE:'Revisar coherencia'})[type]||'Sugerencia'}
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
  if(actorValues.length)processSuggestionAdd(out,'actor',{ruleId:'PSR-001',type:'REUSE',values:actorValues,setId:'OS_ACTOR_ROLE',text:actorValues.length===1?'Este rol ya está identificado en el proceso.':'Estos roles ya están identificados en el proceso; elige el que realiza este paso.',apply:actorValues.length===1});
  const toolValues=processContextValues(e,'OS_TOOL_CATEGORY',{linkFromStepId});
  if(toolValues.length)processSuggestionAdd(out,'tool',{ruleId:'PSR-002',type:'REUSE',values:toolValues,setId:'OS_TOOL_CATEGORY',text:toolValues.length===1?'Esta herramienta ya está utilizada en el proceso.':'Herramientas ya utilizadas en el proceso.',apply:toolValues.length===1});
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
  if(String(s?.automation_state||'')==='AUTOMATED'&&normalizeArray(s?.manual_actions).length)processSuggestionAdd(out,'automation_state',{ruleId:'PSR-011',type:'COHERENCE',text:'Has indicado Automatizado, pero también existen acciones manuales. Revisa ambos datos.',apply:false});
  if(s?.step_type&&!['ST06','ST07','ST09'].includes(String(s.step_type))&&!normalizeArray(s?.outputs).length)processSuggestionAdd(out,'outputs',{ruleId:'PSR-012',type:'COHERENCE',text:'Este tipo de paso suele generar o actualizar algo. Confirma el output o valida que realmente no exista.',apply:false});
  return out;
}
function processSuggestionValueText(s){if(s.display)return s.display;const labels=s.setId?processSuggestionLabels(s.setId,s.values):processSuggestionIdList(s.values);return labels.join(' · ')}
function processSuggestionHtml(field,suggestions){
  const rows=normalizeArray(suggestions).filter(Boolean);if(!rows.length)return '';
  return rows.map((s,i)=>{const value=processSuggestionValueText(s),type=processSuggestionTypeLabel(s.type),apply=s.apply&&value?`<button type="button" class="btn btn-small step-suggestion-apply" data-step-suggestion-field="${attr(field)}" data-step-suggestion-index="${i}">Aplicar</button>`:'';
    return `<div class="step-suggestion step-suggestion-${String(s.type||'').toLowerCase()}" data-step-suggestion-rule="${attr(s.ruleId)}"><div><strong>${esc(type)}</strong><span>${esc(s.text||'')}</span>${value?`<b>${esc(value)}</b>`:''}</div>${apply}</div>`;
  }).join('');
}
function processSuggestionTrace(s,suggestion,accepted){s._suggestion_trace=Array.isArray(s._suggestion_trace)?s._suggestion_trace:[];const entry={rule_id:suggestion.ruleId,type:suggestion.type,target_field:suggestion.targetField||'',proposed_value:suggestion.values||suggestion.value||null,accepted:!!accepted,timestamp:now()};const i=s._suggestion_trace.findIndex(x=>x.rule_id===entry.rule_id&&x.target_field===entry.target_field);if(i>=0)s._suggestion_trace[i]=entry;else s._suggestion_trace.push(entry)}
function processSuggestionSetSingle(id,value){const input=document.getElementById(id);if(!input)return false;input.value=value;const box=document.querySelector?.(`details[data-aunea-select="${id}"]`);const option=box?.querySelector?.(`[data-aunea-select-option="${id}"][data-value="${value}"]`);if(box&&option){box.querySelectorAll(`[data-aunea-select-option="${id}"]`).forEach(x=>x.classList.toggle('selected',x===option));const label=box.querySelector('summary span');if(label)label.textContent=option.dataset.label||option.textContent||value}input.dispatchEvent?.(new Event('change',{bubbles:true}));return true}
function processSuggestionSetMulti(id,values){const wanted=new Set(processSuggestionIdList(values));let changed=false;document.querySelectorAll?.(`[data-v1-multi="${id}"]`).forEach(x=>{if(wanted.has(String(x.value))){x.checked=true;changed=true;x.dispatchEvent?.(new Event('change',{bubbles:true}))}});return changed}
function applyProcessStepSuggestion(field,suggestion,s){
  if(!suggestion)return false;let changed=false;suggestion.targetField=field;
  if(field==='actor')changed=processSuggestionSetSingle('step_actor',suggestion.values?.[0]||'');
  else if(field==='tool')changed=processSuggestionSetSingle('step_tool',suggestion.values?.[0]||'');
  else if(field==='inputs')changed=processSuggestionSetMulti('step_inputs',suggestion.values);
  else if(field==='manual_actions')changed=processSuggestionSetMulti('step_manual',suggestion.values);
  else if(field==='communication_channels')changed=processSuggestionSetMulti('step_channels',suggestion.values);
  else if(field==='evidence')changed=processSuggestionSetMulti('step_evidence',suggestion.values);
  else if(field==='applies_to'){const mode=suggestion.value?.mode||'ALL',input=document.getElementById('step_applies_mode'),detail=document.getElementById('step_applies_value');if(input){input.value=mode;input.dispatchEvent?.(new Event('change',{bubbles:true}));if(detail&&mode==='CONDITION')detail.value=suggestion.value?.condition||'';changed=true}}
  if(changed){processSuggestionTrace(s,suggestion,true);if(typeof toast==='function')toast('Sugerencia aplicada. Confirma el paso para guardarla.')}return changed;
}
function bindProcessStepSuggestions(s,suggestionMap){document.querySelectorAll?.('[data-step-suggestion-field]').forEach(btn=>btn.addEventListener?.('click',()=>{const field=btn.dataset.stepSuggestionField,index=Number(btn.dataset.stepSuggestionIndex||0),suggestion=normalizeArray(suggestionMap[field])[index];applyProcessStepSuggestion(field,suggestion,s)}))}
// [AUNEA-FE-PROCESS-SUGGESTION-ENGINE-010] END
