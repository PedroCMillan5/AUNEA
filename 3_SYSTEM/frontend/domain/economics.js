// [AUNEA-FE-ECON-CAPTURE-030] START — Captura de inputs económicos
// PURPOSE: Render and capture explicit EconomicInput records while preserving active/wait/direct-loss/tool/cash categories; never annualize Process Step time or calculate official economics in the browser.
// SOURCE: DEC-021/033/034/040; REF_ECON_DRIVER; governed evidence labels.
// INPUTS: current Engagement, explicit consultant-entered annual values and evidence quality.
// OUTPUTS: engagement.economicInputs records matching the backend EconomicInput contract.
// SIDE_EFFECTS: modal DOM and engagement state mutation; no official economics calculation.
// CHANGE_RISK: HIGH.
function econDriverLabel(driverId){
  const drivers=schema?.tables?.REF_ECON_DRIVER||[];
  const d=drivers.find(x=>x.Economic_Driver_ID===driverId);
  return d?.Name||driverId;
}

function economicBuilder(e){
  return section('Inputs económicos materiales','Los inputs se mantienen separados: trabajo activo, espera, pérdida directa, herramienta y ahorro de caja realizado. No se inventan porcentajes de recuperación.',`<div class="result-list">${e.economicInputs.length?e.economicInputs.map(x=>`<div class="result-item"><b>${esc(econDriverLabel(x.driver_id))}</b><p>Activo ${x.annual_active_hours||0} h/año · Espera ${x.annual_wait_hours||0} h/año · Pérdida directa ${x.direct_loss_eur_annual||0} €/año · Evidencia: ${esc(engineLabel('evidence_quality',x.evidence_type))}</p></div>`).join(''):'<div class="empty"><p>Sin inputs económicos explícitos añadidos.</p></div>'}</div>`,`<button class="btn btn-outline" id="addEconomic">Añadir input económico</button>`)
}

function addEconomic(){
  const eng=currentEng();
  const drivers=schema.tables.REF_ECON_DRIVER||[];
  const activeContributors=activeTimeContributors(eng),waitContributors=waitTimeContributors(eng);
  // Annual active/wait hours are explicit EconomicInput values. Process Step minutes/case are shown
  // only as provenance; no governed annualization rule exists, so the UI never pre-fills them.
  const activeHelp=activeContributors.length?`<div class="field-help">Pasos con tiempo activo registrado: ${esc(activeContributors.join(', '))} (dato en minutos/caso, visible en Proceso). Introduce tú el total anual en horas — no se calcula ni se rellena automáticamente.</div>`:'<div class="field-help">Introduce tú el total anual en horas — no se calcula ni se rellena automáticamente.</div>';
  const waitHelp=waitContributors.length?`<div class="field-help">Pasos con tiempo de espera registrado: ${esc(waitContributors.join(', '))} (dato en minutos/caso, visible en Proceso). Introduce tú el total anual en horas — no se calcula ni se rellena automáticamente.</div>`:'<div class="field-help">Introduce tú el total anual en horas — no se calcula ni se rellena automáticamente.</div>';
  const evidenceOptions=Object.entries(I18N_LABELS_ES.evidence_quality).map(([v,l])=>`<option value="${attr(v)}">${esc(l)}</option>`).join('');
  openModal('Añadir input económico',`<div class="step-groups"><details class="step-group" open><summary>Driver, valor y evidencia</summary><div class="form-grid"><div class="field full"><label>Concepto económico</label>${auneaDropdownControl('econDriver',drivers.map(d=>({value:d.Economic_Driver_ID,label:d.Name||d.Economic_Driver_ID})),drivers[0]?.Economic_Driver_ID||'','Selecciona…')}</div><div class="field"><label>Trabajo activo anual (h)</label><input id="econActive" inputmode="decimal">${activeHelp}</div><div class="field"><label>Tipo de evidencia</label>${auneaDropdownControl('econEvidence',Object.entries(I18N_LABELS_ES.evidence_quality).map(([value,label])=>({value,label})),Object.keys(I18N_LABELS_ES.evidence_quality)[0]||'','Selecciona…')}</div></div></details><details class="step-group"><summary>Resto de inputs económicos</summary><div class="form-grid"><div class="field"><label>Espera anual (h)</label><input id="econWait" inputmode="decimal">${waitHelp}</div><div class="field"><label>Coste capacidad €/h</label><input id="econRate" inputmode="decimal"></div><div class="field"><label>Pérdida directa €/año</label><input id="econDirect" inputmode="decimal"></div><div class="field"><label>Coste actual herramientas €/año</label><input id="econTool" inputmode="decimal"></div><div class="field"><label>Ahorro de caja realizado €/año</label><input id="econCash" inputmode="decimal"></div></div></details></div>`,()=>{
    const activeHours=+document.getElementById('econActive').value||0,waitHours=+document.getElementById('econWait').value||0;
    eng.economicInputs.push({driver_id:document.getElementById('econDriver').value,annual_active_hours:activeHours,annual_wait_hours:waitHours,capacity_cost_rate_eur_hour:+document.getElementById('econRate').value||null,direct_loss_eur_annual:+document.getElementById('econDirect').value||0,current_tool_cost_eur_annual:+document.getElementById('econTool').value||0,realized_cash_saving_eur_annual:+document.getElementById('econCash').value||0,evidence_type:document.getElementById('econEvidence').value,deduplication_key:id('ECON')});
    markDirty('Input económico añadido');closeModal();render();
    const zeroWithEvidence=[];
    if(activeHours===0&&activeContributors.length)zeroWithEvidence.push('trabajo activo');
    if(waitHours===0&&waitContributors.length)zeroWithEvidence.push('espera');
    if(zeroWithEvidence.length)toast(`Guardado con ${zeroWithEvidence.join(' y ')} anual en 0h aunque Proceso registra tiempo en esos pasos — revisa si falta transcribirlo.`);
  });
}
// [AUNEA-FE-ECON-CAPTURE-030] END
