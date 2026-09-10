// [AUNEA-FE-PROC-HELP-025] START — Canonical contextual help for Process Step editor
// PURPOSE: Add business-readable help to the existing Process Step modal without duplicating or redefining Process Step semantics.
// SOURCE: Diagnostic Master v1.1 00_PROCESS_STEP_MODEL_V1 plus matching Diagnostic Field Objetivo_concreto when Canonical_Field_ID exists; UAT-VIS-031; DEC-040.
// INPUTS: schema.process_step_model, schema.fields and the already-rendered Process Step modal DOM.
// OUTPUTS: contextual help blocks appended beside the existing controls.
// SIDE_EFFECTS: presentation-only DOM augmentation after openStepModal(); no engagement/state values are changed.
// CHANGE_RISK: MEDIUM.

const PROCESS_STEP_HELP_ANCHORS=Object.freeze({
  step_name:'#step_name',
  step_type:'#step_type',
  actor:'#step_actor',
  tool:'#step_tool',
  occurrences_per_case:'#step_occ',
  applies_to:'#step_applies_mode',
  inputs:'[data-v1-multi="step_inputs"]',
  outputs:'[data-v1-multi="step_outputs"]',
  active_time:'#step_active',
  wait_time:'#step_wait',
  rework_time:'#step_rework',
  error_rate:'#step_error',
  decision_criteria:'[data-v1-multi="step_decisions"]',
  normal_next_step:'#step_next',
  exception_path:'#step_exc_type',
  manual_actions:'[data-v1-multi="step_manual"]',
  automation_state:'[data-step-auto]',
  communication_channels:'[data-v1-multi="step_channels"]',
  evidence:'[data-v1-multi="step_evidence"]',
  notes:'#step_notes'
});

function processStepContract(fieldKey){
  return (schema?.process_step_model||[]).find(x=>x.Field_Key===fieldKey)||null;
}
function processStepObjective(contract){
  if(!contract?.Canonical_Field_ID)return '';
  return (schema?.fields||[]).find(x=>x.Field_ID===contract.Canonical_Field_ID)?.Objetivo_concreto||'';
}
function processStepHelpHtml(fieldKey){
  const c=processStepContract(fieldKey);if(!c)return '';
  const objective=processStepObjective(c),validation=c.Validacion||'',example=c.Ejemplo||'';
  const visible=[objective,validation?`Qué se espera: ${validation}`:'',example?`Ejemplo: ${example}`:''].filter(Boolean);
  const internal=[c.Canonical_Field_ID?`Campo ${c.Canonical_Field_ID}`:'',c.Engine_Use?`Uso: ${c.Engine_Use}`:''].filter(Boolean).join(' · ');
  if(!visible.length&&!internal)return '';
  return `<div class="field-help process-field-help" data-process-help="${attr(fieldKey)}">${visible.map(x=>`<span>${esc(x)}</span>`).join(' ')}${internal?` <span class="internal-only">${esc(internal)}</span>`:''}</div>`;
}
function processHelpAnchor(fieldKey){
  const selector=PROCESS_STEP_HELP_ANCHORS[fieldKey];if(!selector)return null;
  const control=document.querySelector(selector);return control?.closest?.('.field')||null;
}
function decorateProcessStepHelp(){
  Object.keys(PROCESS_STEP_HELP_ANCHORS).forEach(fieldKey=>{
    const field=processHelpAnchor(fieldKey);if(!field||field.querySelector?.(`[data-process-help="${fieldKey}"]`))return;
    const html=processStepHelpHtml(fieldKey);if(html)field.insertAdjacentHTML('beforeend',html);
  });
}

const __auneaProcessOpenStepModal=openStepModal;
openStepModal=function(...args){
  const result=__auneaProcessOpenStepModal(...args);
  decorateProcessStepHelp();
  return result;
};
// [AUNEA-FE-PROC-HELP-025] END
