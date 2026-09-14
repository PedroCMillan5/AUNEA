// [AUNEA-FE-PROC-STEP-010] START — Risk/economic builders, AS-IS confirmation, and step/friction archive (supersede)
// PURPOSE: Risk/economic builders, AS-IS confirmation, and step/friction archive (supersede). (Narrowed from the original "Edición de pasos, fricciones y evidencia" scope — step/friction modal editing now lives exclusively in app-process-v1.js, which loads after this file and always won at runtime; the dead duplicate modal implementations that used to live here were removed.)
// SOURCE: v1.0.4 aceptada, SHA256 a9fb7400b000d6289224610c88d4b7dc51f75f8ae97e20e4c3873a3a8e01d6e7; Diagnostic Master v1; DEC-034/038/040.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.
function riskBuilder(e){
  return section('Riesgos estructurados','Se crea un registro por riesgo material. El nivel R0–R3 lo decide el backend, no el frontend.',`<div class="result-list">${e.risks.length?e.risks.map((r,i)=>`<div class="result-item"><b>${esc(r.description||r.category)}</b><p>${esc(r.category)} · Prob. ${r.likelihood_1_5}/5 · Impacto ${r.impact_1_5}/5 · Controles ${r.controls_present?'sí':'no'}</p></div>`).join(''):'<div class="empty"><p>Sin riesgos materiales capturados.</p></div>'}</div>`,`<button class="btn btn-outline" id="addRisk">Añadir riesgo</button>`)
}
function econDriverLabel(driverId){
  const drivers=schema?.tables?.REF_ECON_DRIVER||[];
  const d=drivers.find(x=>x.Economic_Driver_ID===driverId);
  return d?.Name||driverId;
}
function economicBuilder(e){
  return section('Inputs económicos materiales','Los inputs se mantienen separados: trabajo activo, espera, pérdida directa, herramienta y ahorro de caja realizado. No se inventan porcentajes de recuperación.',`<div class="result-list">${e.economicInputs.length?e.economicInputs.map(x=>`<div class="result-item"><b>${esc(econDriverLabel(x.driver_id))}</b><p>Activo ${x.annual_active_hours||0} h/año · Espera ${x.annual_wait_hours||0} h/año · Pérdida directa ${x.direct_loss_eur_annual||0} €/año · Evidencia: ${esc(engineLabel('evidence_quality',x.evidence_type))}</p></div>`).join(''):'<div class="empty"><p>Sin inputs económicos explícitos añadidos.</p></div>'}</div>`,`<button class="btn btn-outline" id="addEconomic">Añadir input económico</button>`)
}

function supersedeStep(stepId){const e=currentEng(),x=e.processSteps.find(s=>s.id===stepId);if(!x)return;if(!confirm('El paso no se borrará físicamente: quedará SUPERSEDED para conservar trazabilidad. ¿Continuar?'))return;x.status='SUPERSEDED';e.confirmedAsIs=false;markDirty(`Paso ${stepId} superseded`);render()}

function supersedeFriction(frId){const e=currentEng(),x=e.frictions.find(s=>s.id===frId);if(!x)return;if(!confirm('La fricción quedará SUPERSEDED para conservar trazabilidad. ¿Continuar?'))return;x.status='SUPERSEDED';e.confirmedAsIs=false;markDirty(`Fricción ${frId} superseded`);render()}
function confirmAsIs(){const e=currentEng();if(!e.processSteps.filter(x=>x.status!=='SUPERSEDED').length)return toast('Añade al menos un paso.');e.confirmedAsIs=true;e.answers.DF093='YES';e.asIsConfirmedAt=now();markDirty('AS-IS confirmado por revisión');render();toast('Flujo AS-IS confirmado. Si se edita después, volverá a quedar pendiente.')}

function addEconomic(){
  const eng=currentEng();
  const drivers=schema.tables.REF_ECON_DRIVER||[];
  const activeContributors=activeTimeContributors(eng),waitContributors=waitTimeContributors(eng);
  // Trabajo activo anual / Espera anual NUNCA se calculan aquí ni en ningún sitio del frontend: no existe
  // una regla canónica que convierta minutos/caso (Process Step) en horas/año (EconomicInput) — por eso
  // "Trabajo activo anual = 0h" en Resultados no es, por sí solo, un bug de pérdida de datos: significa
  // que este campo, que es de introducción manual, se dejó en 0. El texto de abajo hace explícito que el
  // consultor debe transcribir el valor él mismo; el aviso al guardar (más abajo) lo refuerza sin bloquear.
  const activeHelp=activeContributors.length?`<div class="field-help">Pasos con tiempo activo registrado: ${esc(activeContributors.join(', '))} (dato en minutos/caso, visible en Proceso). Introduce tú el total anual en horas — no se calcula ni se rellena automáticamente.</div>`:'<div class="field-help">Introduce tú el total anual en horas — no se calcula ni se rellena automáticamente.</div>';
  const waitHelp=waitContributors.length?`<div class="field-help">Pasos con tiempo de espera registrado: ${esc(waitContributors.join(', '))} (dato en minutos/caso, visible en Proceso). Introduce tú el total anual en horas — no se calcula ni se rellena automáticamente.</div>`:'<div class="field-help">Introduce tú el total anual en horas — no se calcula ni se rellena automáticamente.</div>';
  const evidenceOptions=Object.entries(I18N_LABELS_ES.evidence_quality).map(([v,l])=>`<option value="${attr(v)}">${esc(l)}</option>`).join('');
  // Layer 1 (driver/valor/unidad/evidencia) vs layer 2 (resto) — same fields/ids/save logic, only the
  // grouping changes. No "fuente"/"periodo"/"notas" fields exist on EconomicInput to place in layer 2;
  // not invented here.
  openModal('Añadir input económico',`<div class="step-groups"><details class="step-group" open><summary>Driver, valor y evidencia</summary><div class="form-grid"><div class="field full"><label>Concepto económico</label><select id="econDriver">${drivers.map(d=>`<option value="${attr(d.Economic_Driver_ID)}">${esc(d.Name||d.Economic_Driver_ID)}</option>`).join('')}</select></div><div class="field"><label>Trabajo activo anual (h)</label><input id="econActive" inputmode="decimal">${activeHelp}</div><div class="field"><label>Tipo de evidencia</label><select id="econEvidence">${evidenceOptions}</select></div></div></details><details class="step-group"><summary>Resto de inputs económicos</summary><div class="form-grid"><div class="field"><label>Espera anual (h)</label><input id="econWait" inputmode="decimal">${waitHelp}</div><div class="field"><label>Coste capacidad €/h</label><input id="econRate" inputmode="decimal"></div><div class="field"><label>Pérdida directa €/año</label><input id="econDirect" inputmode="decimal"></div><div class="field"><label>Coste actual herramientas €/año</label><input id="econTool" inputmode="decimal"></div><div class="field"><label>Ahorro de caja realizado €/año</label><input id="econCash" inputmode="decimal"></div></div></details></div>`,()=>{
    const activeHours=+document.getElementById('econActive').value||0,waitHours=+document.getElementById('econWait').value||0;
    currentEng().economicInputs.push({driver_id:document.getElementById('econDriver').value,annual_active_hours:activeHours,annual_wait_hours:waitHours,capacity_cost_rate_eur_hour:+document.getElementById('econRate').value||null,direct_loss_eur_annual:+document.getElementById('econDirect').value||0,current_tool_cost_eur_annual:+document.getElementById('econTool').value||0,realized_cash_saving_eur_annual:+document.getElementById('econCash').value||0,evidence_type:document.getElementById('econEvidence').value,deduplication_key:id('ECON')});
    markDirty('Input económico añadido');closeModal();render();
    const zeroWithEvidence=[];
    if(activeHours===0&&activeContributors.length)zeroWithEvidence.push('trabajo activo');
    if(waitHours===0&&waitContributors.length)zeroWithEvidence.push('espera');
    if(zeroWithEvidence.length)toast(`Guardado con ${zeroWithEvidence.join(' y ')} anual en 0h aunque Proceso registra tiempo en esos pasos — revisa si falta transcribirlo.`);
  })
}
// [AUNEA-FE-PROC-STEP-010] END
