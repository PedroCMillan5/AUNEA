// [AUNEA-FE-RISK-CAPTURE-030] START — Captura estructurada de riesgos
// PURPOSE: Render and capture RiskInput records only; risk classification R0-R3 remains server-owned.
// SOURCE: Diagnostic Master v1.2 risk option sets; DEC-033/034/040/065; CF-04 REVIEW.
// INPUTS: current Engagement, OS_RISK_CATEGORY, OS_REVERSIBILITY and reused DF073 context.
// OUTPUTS: engagement.risks records matching the backend RiskInput contract.
// SIDE_EFFECTS: modal DOM and engagement state mutation; no risk-level calculation.
// CHANGE_RISK: HIGH.
function riskDropdown(id,opts,value='',placeholder='Selecciona…'){
  return auneaSelectControl(id,opts,value,{placeholder});
}

function riskRelatedFrictions(e,r){
  const ids=normalizeArray(r.step_ids);
  return (typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[]).filter(f=>normalizeArray(f.affected_steps).some(id=>ids.includes(id)));
}
function riskBuilder(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):[];
  return section('¿Qué podría salir mal?','Indica en qué paso podría ocurrir y qué se hace hoy para evitarlo. AUNEA aplica las reglas de evaluación existentes.',`<div class="result-list">${e.risks.length?e.risks.map((r,i)=>`<div class="result-item"><b>${esc(r.description||r.category)}</b><p>${esc(r.category)} · Prob. ${r.likelihood_1_5}/5 · Impacto ${r.impact_1_5}/5 · Controles ${r.controls_present?'sí':'no'}</p><p>Pasos: ${(Array.isArray(r.step_ids)?r.step_ids:(r.step_ids?[r.step_ids]:[])).map(id=>steps.find(s=>s.id===id)?.step_name||id).map(esc).join(', ')||'Sin anclar'}</p><p>Problemas observados en esos pasos: ${riskRelatedFrictions(e,r).map(f=>esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))).join(', ')||'Ninguna registrada'}</p></div>`).join(''):'<div class="empty"><p>Todavía no se han registrado riesgos.</p></div>'}</div>`,`<button class="btn btn-outline" id="addRisk">Añadir riesgo</button>`)
}

// Layer 1 (riesgo/probabilidad/impacto) vs layer 2 (controles/resto), same governed RiskInput shape.
// RiskInput has no step-link or evidence_type field; those are not invented here.
function addRisk(preselectedSteps=[]){
  const e=currentEng(),cats=fieldOptions('OS_RISK_CATEGORY'),rev=fieldOptions('OS_REVERSIBILITY'),sensitive=normalizeArray(e.answers?.DF073).filter(x=>x!=='NONE'),steps=typeof activeSteps==='function'?activeSteps(e):[],frictions=typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[];
  openModal('Añadir riesgo',`<div class="step-groups process-modal-form risk-modal-form"><details class="step-group" open><summary>Riesgo</summary><div class="form-grid"><div class="field full"><label>¿En qué pasos podría ocurrir?</label><div class="choice-grid">${steps.map(s=>`<div class="choice"><input type="checkbox" id="risk_step_${attr(s.id)}" data-risk-step="${attr(s.id)}" ${preselectedSteps.includes(s.id)?'checked':''}><label for="risk_step_${attr(s.id)}">${esc(s.step_name||s.id)}</label></div>`).join('')}</div></div><div class="field full"><label>Problemas ya observados en los pasos elegidos</label>
  <div class="field-help">Son datos de contexto. Un riesgo también puede existir aunque todavía no se haya observado un problema.</div>
  <div class="choice-grid">${frictions.map(f=>`<div class="choice" data-risk-friction-row data-affected-steps="${attr(normalizeArray(f.affected_steps).join('|'))}"><span>${esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))}</span></div>`).join('')}</div>
  ${frictions.length?'':'<div class="field-help">Todavía no hay problemas registrados. Puedes añadir el riesgo directamente al paso.</div>'}
</div><div class="field"><label>¿De qué tipo es este riesgo? ${requiredMark()}</label>${riskDropdown('riskCat',[{value:'',label:'Selecciona…'},...cats],'','Selecciona…')}</div><div class="field"><label>¿Qué podría salir mal? ${requiredMark()}</label><input id="riskDesc" placeholder="Describe qué podría ocurrir"></div><div class="field"><label>¿Qué probabilidad hay de que ocurra? (1–5)</label>${riskDropdown('riskLike',[1,2,3,4,5].map(x=>({value:String(x),label:String(x)})),'1','1')}</div><div class="field"><label>¿Qué consecuencias tendría? (1–5)</label>${riskDropdown('riskImpact',[1,2,3,4,5].map(x=>({value:String(x),label:String(x)})),'1','1')}</div></div></details><details class="step-group" open><summary>Controles y condiciones</summary><div class="form-grid"><div class="field"><label>Si ocurre, ¿se puede corregir?</label>${riskDropdown('riskRev',rev,rev[0]?.value||'','Selecciona…')}</div><div class="field"><label>¿Qué se hace hoy para evitarlo o detectarlo?</label>${riskDropdown('riskControls',[{value:'1',label:'Presentes'},{value:'0',label:'Ausentes / insuficientes'}],'1','Selecciona…')}</div><div class="field"><label>¿Afecta a datos sensibles o de alto impacto?</label>${riskDropdown('riskSensitive',[{value:sensitive.length?'1':'0',label:sensitive.length?'Sí — reutilizado de DF073':'No indicado en DF073'},{value:'1',label:'Sí'},{value:'0',label:'No'}],sensitive.length?'1':'0','Selecciona…')}</div><div class="field"><label>¿Puede tener consecuencias económicas o de cumplimiento importantes?</label>${riskDropdown('riskMat',[{value:'0',label:'No'},{value:'1',label:'Sí'}],'0','No')}</div><div class="field"><label>¿Se trata de un evento crítico?</label>${riskDropdown('riskCritical',[{value:'0',label:'No'},{value:'1',label:'Sí'}],'0','No')}</div></div></details></div>`,()=>{
    const cat=document.getElementById('riskCat').value,desc=document.getElementById('riskDesc').value.trim();
    if(!cat||!desc)return toast('Elige una categoría y explica qué podría salir mal.');
    const rv=document.getElementById('riskRev').value;
    const step_ids=typeof document.querySelectorAll==='function'?[...document.querySelectorAll('[data-risk-step]:checked')].map(x=>x.dataset.riskStep):[];
    // CF-04: friction list is contextual; canonical RiskInput persists step_ids, not friction_ids.
    e.risks.push({step_ids,category:cat,description:desc,likelihood_1_5:Number(document.getElementById('riskLike').value),impact_1_5:Number(document.getElementById('riskImpact').value),reversible:!['HARD','IRREVERSIBLE'].includes(rv),reversibility:rv,controls_present:document.getElementById('riskControls').value==='1',sensitive_or_high_impact:document.getElementById('riskSensitive').value==='1',material_financial_or_compliance:document.getElementById('riskMat').value==='1',critical_trigger:document.getElementById('riskCritical').value==='1'});
    if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'risks');markDirty('Riesgo estructurado añadido');closeModal();render();
  });
  // CF-04: keep the choices in sync with selected steps; hidden choices are cleared.
  function refreshRiskFrictionChoices(){
    const selected=[...document.querySelectorAll('[data-risk-step]:checked')].map(x=>x.dataset.riskStep);
    document.querySelectorAll('[data-risk-friction-row]').forEach(row=>{
      const affected=String(row.dataset.affectedSteps||'').split('|').filter(Boolean);
      row.hidden=!selected.length||!affected.some(id=>selected.includes(id));row.style.display=row.hidden?'none':'';
    });
  }
  document.querySelectorAll('[data-risk-step]').forEach(chip=>chip.addEventListener('change',refreshRiskFrictionChoices));
  refreshRiskFrictionChoices();

}
// [AUNEA-FE-RISK-CAPTURE-030] END
