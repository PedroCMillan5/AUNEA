// [AUNEA-FE-PROC-HELP-025] START — Canonical contextual help (Process Step + Friction)
// PURPOSE: Add business-readable contextual help to the Process Step and Friction editors, sourced
// exclusively from the canonical Process/Friction Model plus the matching Diagnostic Field's
// Objetivo_concreto — never inventing new copy or semantics. Presented as a discreet info icon next to
// each field's label with a keyboard-accessible popover, so the newly-reorganized progressive-disclosure
// forms (Fase 3/4) stay uncluttered instead of always showing a text block under every field.
// SOURCE: Diagnostic Master v1.1 00_PROCESS_STEP_MODEL_V1 / 00_FRICTION_MODEL_V1 plus matching
// Diagnostic Field Objetivo_concreto when Canonical_Field_ID exists; UAT-VIS-031; DEC-040.
// INPUTS: schema.process_step_model, schema.friction_model, schema.fields and the already-rendered
// Process Step / Friction modal DOM.
// OUTPUTS: info-icon + popover pairs appended next to each field's label.
// SIDE_EFFECTS: presentation-only DOM augmentation after openStepModal()/openFrictionModal(); no
// engagement/state values are changed.
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
// Risk/Economics have no equivalent canonical "_model" table (only process_step_model and
// friction_model exist in the Diagnostic Master) — no source, so no contextual help mechanism is added
// for those two forms here; logged as a GAP rather than inventing one.
const FRICTION_HELP_ANCHORS=Object.freeze({
  friction_type:'#fr_type',
  affected_steps:'[data-v1-multi="fr_steps"]',
  cause:'[data-v1-multi="fr_causes"]',
  observable_signal:'#fr_signal',
  frequency:'#fr_frequency',
  impact:'#fr_impact',
  active_time_loss:'#fr_active',
  wait_time_loss:'#fr_wait',
  direct_loss:'#fr_direct',
  non_time_impact:'[data-v1-multi="fr_non_time"]',
  workaround:'[data-v1-multi="fr_workaround"]',
  evidence_type:'#fr_evidence_type',
  priority_client:'#fr_priority',
  client_label:'#fr_label',
  notes:'#fr_notes'
});

function modelContract(modelKey,fieldKey){
  return (schema?.[modelKey]||[]).find(x=>x.Field_Key===fieldKey)||null;
}
function modelObjective(contract){
  if(!contract?.Canonical_Field_ID)return '';
  return (schema?.fields||[]).find(x=>x.Field_ID===contract.Canonical_Field_ID)?.Objetivo_concreto||'';
}
function helpContent(modelKey,fieldKey){
  const c=modelContract(modelKey,fieldKey);if(!c)return null;
  const objective=modelObjective(c),validation=c.Validacion||'',example=c.Ejemplo||'';
  const visible=[objective,validation?`Qué se espera: ${validation}`:'',example?`Ejemplo: ${example}`:''].filter(Boolean);
  const internal=[c.Canonical_Field_ID?`Campo ${c.Canonical_Field_ID}`:'',c.Engine_Use?`Uso: ${c.Engine_Use}`:''].filter(Boolean).join(' · ');
  if(!visible.length&&!internal)return null;
  return {visible,internal};
}
function helpIconHtml(modelKey,fieldKey){
  const content=helpContent(modelKey,fieldKey);if(!content)return '';
  const popId=`help-pop-${modelKey}-${fieldKey}`;
  const body=content.visible.map(x=>`<div>${esc(x)}</div>`).join('')+(content.internal?`<div class="internal-only">${esc(content.internal)}</div>`:'');
  return `<button type="button" class="help-icon" data-help-toggle="${attr(popId)}" aria-expanded="false" aria-controls="${attr(popId)}" title="Ayuda">?</button><div class="help-popover" id="${attr(popId)}" role="tooltip">${body}</div>`;
}
function decorateHelp(modelKey,anchors){
  Object.entries(anchors).forEach(([fieldKey,selector])=>{
    const control=document.querySelector(selector);if(!control)return;
    const field=control.closest?.('.field');if(!field)return;
    if(field.querySelector(`#help-pop-${modelKey}-${fieldKey}`))return;
    const html=helpIconHtml(modelKey,fieldKey);if(!html)return;
    const label=field.querySelector('label');
    if(label)label.insertAdjacentHTML('beforeend',html);else field.insertAdjacentHTML('afterbegin',html);
  });
  bindHelpToggles();
}
function bindHelpToggles(){
  document.querySelectorAll('[data-help-toggle]').forEach(btn=>{
    if(btn.dataset.helpBound)return;btn.dataset.helpBound='1';
    btn.onclick=(ev)=>{
      ev.preventDefault();
      const pop=document.getElementById(btn.dataset.helpToggle);if(!pop)return;
      const wasOpen=pop.classList.contains('open');
      document.querySelectorAll('.help-popover.open').forEach(p=>p.classList.remove('open'));
      document.querySelectorAll('[data-help-toggle]').forEach(b=>b.setAttribute('aria-expanded','false'));
      if(!wasOpen){pop.classList.add('open');btn.setAttribute('aria-expanded','true')}
    };
  });
}
function decorateProcessStepHelp(){decorateHelp('process_step_model',PROCESS_STEP_HELP_ANCHORS)}
function decorateFrictionHelp(){decorateHelp('friction_model',FRICTION_HELP_ANCHORS)}

const __auneaProcessOpenStepModal=openStepModal;
openStepModal=function(...args){
  const result=__auneaProcessOpenStepModal(...args);
  decorateProcessStepHelp();
  return result;
};
const __auneaProcessOpenFrictionModal=openFrictionModal;
openFrictionModal=function(...args){
  const result=__auneaProcessOpenFrictionModal(...args);
  decorateFrictionHelp();
  return result;
};
// [AUNEA-FE-PROC-HELP-025] END
