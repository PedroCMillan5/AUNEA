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
function migrateRiskCaptureIntegrity(engagements=[]){
  let changed=0;
  (engagements||[]).forEach(e=>{
    let engagementChanged=false;
    (e.risks||[]).forEach(r=>{
      if(Object.prototype.hasOwnProperty.call(r,'current_controls'))return;
      r.current_controls=[];
      r.controls_present=null;
      r.reversibility='';
      r.reversible=null;
      r.sensitive_or_high_impact=null;
      r.material_financial_or_compliance=null;
      r.critical_trigger=null;
      engagementChanged=true;
    });
    if(engagementChanged){
      changed++;
      if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'risks');
      else{e.confirmedAsIs=false;if(e.layerConfirmations){e.layerConfirmations.risks=false;e.layerConfirmations.impact=false}}
      if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,'revisión de riesgos legacy con valores implícitos');
    }
  });
  return changed;
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
    '<button type="button" class="btn btn-primary" id="addRisk" data-add-risk-global>Añadir riesgo</button>');
}
function addRisk(preselectedSteps=[],editIndex=null){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),existing=Number.isInteger(editIndex)?e.risks?.[editIndex]:null;
  if(existing)preselectedSteps=normalizeArray(existing.step_ids);
  const cats=fieldOptions('OS_RISK_CATEGORY'),rev=fieldOptions('OS_REVERSIBILITY'),controlOptions=fieldOptions('OS_CONTROL_TYPE'),
    sensitiveRaw=normalizeArray(e.answers?.DF073),sensitive=sensitiveRaw.filter(x=>x!=='NONE'),
    steps=typeof activeSteps==='function'?activeSteps(e):[],
    frictions=typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[];
  const selected=existing||{},num=v=>v===undefined||v===null?'':String(v),storedControls=normalizeArray(selected.current_controls),otherControl=storedControls.find(x=>String(x).startsWith('OTHER:'))||'',selectedControlIds=storedControls.map(x=>String(x).startsWith('OTHER:')?'OTHER':String(x));
  openModal(existing?'Editar riesgo':'Añadir riesgo',
    '<div class="step-groups process-modal-form risk-modal-form"><details class="step-group" open><summary>¿Qué podría salir mal?</summary><div class="form-grid">'
    +'<div class="field full"><label>¿En qué pasos podría ocurrir?</label><div class="choice-grid">'
    +steps.map(s=>'<div class="choice"><input type="checkbox" id="risk_step_'+attr(s.id)+'" data-risk-step="'+attr(s.id)+'" '+(preselectedSteps.includes(s.id)?'checked':'')+'><label for="risk_step_'+attr(s.id)+'">'+esc(s.step_name||s.id)+'</label></div>').join('')+'</div></div>'
    +'<div class="field full"><label>Problemas ya observados en los pasos elegidos</label><div class="field-help">Esta lista es contexto; no añade pasos ni crea una relación que no pueda guardarse.</div><div class="choice-grid">'
    +frictions.map(f=>'<div class="choice" data-risk-friction-row data-affected-steps="'+attr(normalizeArray(f.affected_steps).join('|'))+'"><span>'+esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))+'</span></div>').join('')+'</div></div>'
    +'<div class="field"><label>¿De qué tipo es este riesgo? '+requiredMark()+'</label>'+riskDropdown('riskCat',[{value:'',label:'Selecciona…'},...cats],selected.category||'','Selecciona…')+'</div>'
    +'<div class="field"><label>¿Qué podría salir mal? '+requiredMark()+'</label><input id="riskDesc" value="'+attr(selected.description||'')+'" placeholder="Describe qué podría ocurrir"></div>'
    +'<div class="field"><label>¿Qué probabilidad hay de que ocurra? (1–5) '+requiredMark()+'</label>'+riskDropdown('riskLike',[{value:'',label:'Selecciona…'},... [1,2,3,4,5].map(x=>({value:String(x),label:String(x)}))],num(selected.likelihood_1_5),'Selecciona…')+'</div>'
    +'<div class="field"><label>¿Qué consecuencias tendría? (1–5) '+requiredMark()+'</label>'+riskDropdown('riskImpact',[{value:'',label:'Selecciona…'},... [1,2,3,4,5].map(x=>({value:String(x),label:String(x)}))],num(selected.impact_1_5),'Selecciona…')+'</div></div></details>'
    +'<details class="step-group" open><summary>Controles y condiciones</summary><div class="form-grid">'
    +'<div class="field"><label>Si ocurre, ¿se puede corregir? '+requiredMark()+'</label>'+riskDropdown('riskRev',[{value:'',label:'Selecciona…'},...rev],selected.reversibility||'','Selecciona…')+'</div>'
    +'<div class="field"><label>¿Existen controles actuales? '+requiredMark()+'</label>'+riskDropdown('riskControls',[{value:'',label:'Selecciona…'},{value:'1',label:'Sí'},{value:'0',label:'No'}],existing?(selected.controls_present===true?'1':selected.controls_present===false?'0':''):(storedControls.length?'1':''),'Selecciona…')+'</div>'
    +'<div class="field full"><label>Controles actuales</label><div class="choice-grid">'+controlOptions.map(o=>'<div class="choice"><input type="checkbox" id="risk_control_'+attr(o.value)+'" data-risk-control="'+attr(o.value)+'" '+(selectedControlIds.includes(String(o.value))?'checked':'')+'><label for="risk_control_'+attr(o.value)+'">'+esc(o.label)+'</label></div>').join('')+'</div><div class="detail-wrap" id="riskControlOtherWrap" '+(selectedControlIds.includes('OTHER')?'':'style="display:none"')+'><input id="riskControlOther" value="'+attr(otherControl.replace(/^OTHER:\s*/,''))+'" placeholder="Describe el otro control"></div></div>'
    +'<div class="field"><label>¿Afecta a datos sensibles o de alto impacto? '+requiredMark()+'</label>'+riskDropdown('riskSensitive',[{value:'',label:'Selecciona…'},{value:'1',label:sensitive.length?'Sí — reutilizado de DF073':'Sí'},{value:'0',label:'No'}],existing?(selected.sensitive_or_high_impact===true?'1':selected.sensitive_or_high_impact===false?'0':''):(sensitive.length?'1':sensitiveRaw.includes('NONE')?'0':''),'Selecciona…')+'</div>'
    +'<div class="field"><label>¿Puede tener consecuencias económicas o de cumplimiento importantes? '+requiredMark()+'</label>'+riskDropdown('riskMat',[{value:'',label:'Selecciona…'},{value:'0',label:'No'},{value:'1',label:'Sí'}],existing?(selected.material_financial_or_compliance===true?'1':selected.material_financial_or_compliance===false?'0':''):'','Selecciona…')+'</div>'
    +'<div class="field"><label>¿Es un evento crítico? '+requiredMark()+'</label>'+riskDropdown('riskCritical',[{value:'',label:'Selecciona…'},{value:'0',label:'No'},{value:'1',label:'Sí'}],existing?(selected.critical_trigger===true?'1':selected.critical_trigger===false?'0':''):'','Selecciona…')+'</div></div></details></div>',
    ()=>{
      const cat=document.getElementById('riskCat').value,description=document.getElementById('riskDesc').value.trim();
      const step_ids=[...document.querySelectorAll('[data-risk-step]:checked')].map(x=>x.dataset.riskStep);
      const like=Number(document.getElementById('riskLike').value),impact=Number(document.getElementById('riskImpact').value);
      if(!cat||!description)return toast('Indica el tipo de riesgo y explica qué podría ocurrir.');
      if(!Number.isInteger(like)||like<1||like>5||!Number.isInteger(impact)||impact<1||impact>5)return toast('Selecciona probabilidad e impacto entre 1 y 5.');
      if(steps.length&&!step_ids.length)return toast('Selecciona al menos un paso relacionado.');
      const rv=document.getElementById('riskRev').value,controls=document.getElementById('riskControls').value,sensitiveValue=document.getElementById('riskSensitive').value,materialValue=document.getElementById('riskMat').value,criticalValue=document.getElementById('riskCritical').value;
      if(!rv||controls===''||sensitiveValue===''||materialValue===''||criticalValue==='')return toast('Completa reversibilidad, controles y condiciones del riesgo; no se aplican valores por defecto.');
      const controlIds=[...document.querySelectorAll('[data-risk-control]:checked')].map(x=>x.dataset.riskControl),otherDetail=(document.getElementById('riskControlOther')?.value||'').trim();
      if(controls==='1'&&!controlIds.length)return toast('Selecciona al menos un control actual o indica que no existen.');
      if(controls==='0'&&controlIds.length)return toast('Si no existen controles actuales, desmarca los controles seleccionados.');
      if(controlIds.includes('OTHER')&&!otherDetail)return toast('Describe el control indicado como «Otro».');
      const current_controls=controls==='1'?controlIds.map(x=>x==='OTHER'?'OTHER: '+otherDetail:x):[];
      const draft={step_ids,category:cat,description,likelihood_1_5:like,
        impact_1_5:impact,
        reversible:!['HARD','IRREVERSIBLE'].includes(rv),reversibility:rv,
        controls_present:controls==='1',current_controls,
        sensitive_or_high_impact:sensitiveValue==='1',
        material_financial_or_compliance:materialValue==='1',
        critical_trigger:criticalValue==='1'};
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
  document.querySelectorAll('[data-risk-control]').forEach(el=>el.addEventListener('change',()=>{
    const other=document.querySelector('[data-risk-control="OTHER"]'),wrap=document.getElementById('riskControlOtherWrap');
    if(wrap)wrap.style.display=other?.checked?'':'none';
    if(other&&!other.checked){const input=document.getElementById('riskControlOther');if(input)input.value=''}
  }));
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
