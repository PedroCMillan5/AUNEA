// [AUNEA-FE-RISK-CAPTURE-030] START — Riesgos del estudio, gestión privada y contexto desde pasos.
// SOURCE: Diagnostic Master v1.2; DEC-050/055/065; RiskInput canónico.
// The client display never receives scores or editing controls. Backend owns risk classification.
function riskDropdown(id,opts,value='',placeholder='Selecciona…'){
  return auneaSelectControl(id,opts,value,{placeholder});
}
function riskRelatedFrictions(e,r){
  const ids=normalizeArray(r.step_ids);
  return (typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[])
    .filter(f=>normalizeArray(f.affected_steps).some(id=>ids.includes(id)));
}
function riskBuilder(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):[];
  return section('Riesgos','Aquí puedes añadir, editar o eliminar riesgos del estudio.',
    '<div class="process-list">'+((e.risks||[]).length?e.risks.map((r,i)=>
      '<div class="process-row"><div class="process-index">'+(i+1)+'</div><div><b>'+esc(r.description||labelFrom('OS_RISK_CATEGORY',r.category))+'</b>'
      +'<p>'+esc(labelFrom('OS_RISK_CATEGORY',r.category))+' · Probabilidad '+esc(r.likelihood_1_5||'—')+'/5 · Consecuencia '+esc(r.impact_1_5||'—')+'/5</p>'
      +'<p>Pasos: '+normalizeArray(r.step_ids).map(id=>steps.find(s=>s.id===id)?.step_name||id).map(esc).join(', ')+'</p>'
      +'<p>Problemas observados en esos pasos: '+riskRelatedFrictions(e,r).map(f=>esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))).join(', ')+'</p></div>'
      +'<div class="row-actions"><button class="btn btn-small" data-edit-risk-index="'+i+'">Editar</button><button class="btn btn-small btn-danger" data-delete-risk-index="'+i+'">Eliminar</button></div></div>'
    ).join(''):'<div class="empty"><p>Todavía no hay riesgos registrados.</p></div>')+'</div>',
    '<button class="btn btn-primary" id="addRisk">Añadir riesgo</button>');
}
function addRisk(preselectedSteps=[],editIndex=null){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),existing=Number.isInteger(editIndex)?e.risks?.[editIndex]:null;
  if(existing)preselectedSteps=normalizeArray(existing.step_ids);
  const cats=fieldOptions('OS_RISK_CATEGORY'),rev=fieldOptions('OS_REVERSIBILITY'),
    sensitive=normalizeArray(e.answers?.DF073).filter(x=>x!=='NONE'),
    steps=typeof activeSteps==='function'?activeSteps(e):[],
    frictions=typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[];
  const selected=existing||{},num=v=>String(v??'1');
  openModal(existing?'Editar riesgo':'Añadir riesgo',
    '<div class="step-groups process-modal-form risk-modal-form"><details class="step-group" open><summary>¿Qué podría salir mal?</summary><div class="form-grid">'
    +'<div class="field full"><label>¿En qué pasos podría ocurrir?</label><div class="choice-grid">'
    +steps.map(s=>'<div class="choice"><input type="checkbox" id="risk_step_'+attr(s.id)+'" data-risk-step="'+attr(s.id)+'" '+(preselectedSteps.includes(s.id)?'checked':'')+'><label for="risk_step_'+attr(s.id)+'">'+esc(s.step_name||s.id)+'</label></div>').join('')+'</div></div>'
    +'<div class="field full"><label>Problemas ya observados en los pasos elegidos</label><div class="field-help">Esta lista es contexto; no añade pasos ni crea una relación que no pueda guardarse.</div><div class="choice-grid">'
    +frictions.map(f=>'<div class="choice" data-risk-friction-row data-affected-steps="'+attr(normalizeArray(f.affected_steps).join('|'))+'"><span>'+esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))+'</span></div>').join('')+'</div></div>'
    +'<div class="field"><label>¿De qué tipo es este riesgo? '+requiredMark()+'</label>'+riskDropdown('riskCat',[{value:'',label:'Selecciona…'},...cats],selected.category||'','Selecciona…')+'</div>'
    +'<div class="field"><label>¿Qué podría salir mal? '+requiredMark()+'</label><input id="riskDesc" value="'+attr(selected.description||'')+'" placeholder="Describe qué podría ocurrir"></div>'
    +'<div class="field"><label>¿Qué probabilidad hay de que ocurra? (1–5)</label>'+riskDropdown('riskLike',[1,2,3,4,5].map(x=>({value:String(x),label:String(x)})),num(selected.likelihood_1_5),'1')+'</div>'
    +'<div class="field"><label>¿Qué consecuencias tendría? (1–5)</label>'+riskDropdown('riskImpact',[1,2,3,4,5].map(x=>({value:String(x),label:String(x)})),num(selected.impact_1_5),'1')+'</div></div></details>'
    +'<details class="step-group" open><summary>Controles y condiciones</summary><div class="form-grid">'
    +'<div class="field"><label>Si ocurre, ¿se puede corregir?</label>'+riskDropdown('riskRev',rev,selected.reversibility||rev[0]?.value||'','Selecciona…')+'</div>'
    +'<div class="field"><label>¿Existen medidas para evitarlo o detectarlo?</label>'+riskDropdown('riskControls',[{value:'1',label:'Presentes'},{value:'0',label:'Ausentes / insuficientes'}],existing?(selected.controls_present?'1':'0'):'1','Selecciona…')+'</div>'
    +'<div class="field"><label>¿Afecta a datos sensibles o de alto impacto?</label>'+riskDropdown('riskSensitive',[{value:sensitive.length?'1':'0',label:sensitive.length?'Sí — reutilizado de DF073':'No indicado en DF073'},{value:'1',label:'Sí'},{value:'0',label:'No'}],existing?(selected.sensitive_or_high_impact?'1':'0'):(sensitive.length?'1':'0'),'Selecciona…')+'</div>'
    +'<div class="field"><label>¿Puede tener consecuencias económicas o de cumplimiento importantes?</label>'+riskDropdown('riskMat',[{value:'0',label:'No'},{value:'1',label:'Sí'}],selected.material_financial_or_compliance?'1':'0','No')+'</div>'
    +'<div class="field"><label>¿Es un evento crítico?</label>'+riskDropdown('riskCritical',[{value:'0',label:'No'},{value:'1',label:'Sí'}],selected.critical_trigger?'1':'0','No')+'</div></div></details></div>',
    ()=>{
      const cat=document.getElementById('riskCat').value,description=document.getElementById('riskDesc').value.trim();
      const step_ids=[...document.querySelectorAll('[data-risk-step]:checked')].map(x=>x.dataset.riskStep);
      if(!cat||!description)return toast('Indica el tipo de riesgo y explica qué podría ocurrir.');
      if(steps.length&&!step_ids.length)return toast('Selecciona al menos un paso relacionado.');
      const rv=document.getElementById('riskRev').value;
      const draft={step_ids,category:cat,description,likelihood_1_5:Number(document.getElementById('riskLike').value),
        impact_1_5:Number(document.getElementById('riskImpact').value),
        reversible:!['HARD','IRREVERSIBLE'].includes(rv),reversibility:rv,
        controls_present:document.getElementById('riskControls').value==='1',
        sensitive_or_high_impact:document.getElementById('riskSensitive').value==='1',
        material_financial_or_compliance:document.getElementById('riskMat').value==='1',
        critical_trigger:document.getElementById('riskCritical').value==='1'};
      if(existing)Object.assign(existing,draft);else e.risks.push(draft);
      if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'risks');
      markDirty(existing?'Riesgo modificado':'Riesgo añadido');closeModal();render();
    },existing?'Guardar cambios':'Añadir riesgo');
  function refreshRelatedProblems(){
    const chosen=[...document.querySelectorAll('[data-risk-step]:checked')].map(x=>x.dataset.riskStep);
    document.querySelectorAll('[data-risk-friction-row]').forEach(row=>{
      const affected=String(row.dataset.affectedSteps||'').split('|').filter(Boolean);
      row.hidden=!chosen.length||!affected.some(id=>chosen.includes(id));
      row.style.display=row.hidden?'none':'';
    });
  }
  document.querySelectorAll('[data-risk-step]').forEach(el=>el.addEventListener('change',refreshRelatedProblems));
  refreshRelatedProblems();
}
function deleteRisk(index){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),item=e?.risks?.[index];if(!item)return;
  if(!confirm('¿Eliminar este riesgo del estudio? Los informes históricos confirmados no se modificarán.'))return;
  if(typeof persistRecoverySnapshot==='function')persistRecoverySnapshot('eliminar-riesgo');
  e.risks.splice(index,1);if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'risks');
  markDirty('Riesgo eliminado del estudio');render();
}
// [AUNEA-FE-RISK-CAPTURE-030] END
