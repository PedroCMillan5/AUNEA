// [AUNEA-FE-RISK-CAPTURE-030] START — Captura estructurada de riesgos
// PURPOSE: Render and capture RiskInput records only; risk classification R0-R3 remains server-owned.
// SOURCE: Diagnostic Master v1.1 risk option sets; DEC-033/034/040.
// INPUTS: current Engagement, OS_RISK_CATEGORY, OS_REVERSIBILITY and reused DF073 context.
// OUTPUTS: engagement.risks records matching the backend RiskInput contract.
// SIDE_EFFECTS: modal DOM and engagement state mutation; no risk-level calculation.
// CHANGE_RISK: HIGH.
function riskBuilder(e){
  return section('Riesgos estructurados','Se crea un registro por riesgo material. El nivel R0–R3 lo decide el backend, no el frontend.',`<div class="result-list">${e.risks.length?e.risks.map((r,i)=>`<div class="result-item"><b>${esc(r.description||r.category)}</b><p>${esc(r.category)} · Prob. ${r.likelihood_1_5}/5 · Impacto ${r.impact_1_5}/5 · Controles ${r.controls_present?'sí':'no'}</p></div>`).join(''):'<div class="empty"><p>Sin riesgos materiales capturados.</p></div>'}</div>`,`<button class="btn btn-outline" id="addRisk">Añadir riesgo</button>`)
}

// Layer 1 (riesgo/probabilidad/impacto) vs layer 2 (controles/resto), same governed RiskInput shape.
// RiskInput has no step-link or evidence_type field; those are not invented here.
function addRisk(){
  const e=currentEng(),cats=fieldOptions('OS_RISK_CATEGORY'),rev=fieldOptions('OS_REVERSIBILITY'),sensitive=normalizeArray(e.answers?.DF073).filter(x=>x!=='NONE');
  openModal('Añadir riesgo',`<div class="step-groups"><details class="step-group" open><summary>Riesgo</summary><div class="form-grid"><div class="field"><label>Categoría</label>${auneaDropdownControl('riskCat',[{value:'',label:'Selecciona…'},...cats],'','Selecciona…')}</div><div class="field"><label>Descripción concreta</label><input id="riskDesc" placeholder="Evento/consecuencia material"></div><div class="field"><label>Probabilidad 1–5</label>${auneaDropdownControl('riskLike',[1,2,3,4,5].map(x=>({value:String(x),label:String(x)})),'1','1')}</div><div class="field"><label>Impacto 1–5</label>${auneaDropdownControl('riskImpact',[1,2,3,4,5].map(x=>({value:String(x),label:String(x)})),'1','1')}</div></div></details><details class="step-group"><summary>Controles y resto</summary><div class="form-grid"><div class="field"><label>Reversibilidad</label>${auneaDropdownControl('riskRev',rev,rev[0]?.value||'','Selecciona…')}</div><div class="field"><label>Controles actuales</label>${auneaDropdownControl('riskControls',[{value:'1',label:'Presentes'},{value:'0',label:'Ausentes / insuficientes'}],'1','Selecciona…')}</div><div class="field"><label>Datos sensibles / alto impacto</label>${auneaDropdownControl('riskSensitive',[{value:sensitive.length?'1':'0',label:sensitive.length?'Sí — reutilizado de DF073':'No indicado en DF073'},{value:'1',label:'Sí'},{value:'0',label:'No'}],sensitive.length?'1':'0','Selecciona…')}</div><div class="field"><label>Financiero/compliance material</label>${auneaDropdownControl('riskMat',[{value:'0',label:'No'},{value:'1',label:'Sí'}],'0','No')}</div><div class="field"><label>Trigger crítico</label>${auneaDropdownControl('riskCritical',[{value:'0',label:'No'},{value:'1',label:'Sí'}],'0','No')}</div></div></details></div>`,()=>{
    const cat=document.getElementById('riskCat').value,desc=document.getElementById('riskDesc').value.trim();
    if(!cat||!desc)return toast('Categoría y descripción son obligatorias.');
    const rv=document.getElementById('riskRev').value;
    e.risks.push({category:cat,description:desc,likelihood_1_5:Number(document.getElementById('riskLike').value),impact_1_5:Number(document.getElementById('riskImpact').value),reversible:!['HARD','IRREVERSIBLE'].includes(rv),reversibility:rv,controls_present:document.getElementById('riskControls').value==='1',sensitive_or_high_impact:document.getElementById('riskSensitive').value==='1',material_financial_or_compliance:document.getElementById('riskMat').value==='1',critical_trigger:document.getElementById('riskCritical').value==='1'});
    markDirty('Riesgo estructurado añadido');closeModal();render();
  });
}
// [AUNEA-FE-RISK-CAPTURE-030] END
