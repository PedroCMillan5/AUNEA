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
      if(Object.prototype.hasOwnProperty.call(r,'current_control'))return;
      r.current_control=[];
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
let __auneaRiskCandidates=[];
function riskIncompleteFields(r){
  const missing=[];
  if(!normalizeArray(r.step_ids).length)missing.push('paso relacionado');
  if(!r.category)missing.push('categoría');
  if(!String(r.description||'').trim())missing.push('qué podría salir mal');
  if(!Number.isInteger(Number(r.likelihood_1_5))||Number(r.likelihood_1_5)<1||Number(r.likelihood_1_5)>5)missing.push('probabilidad');
  if(!Number.isInteger(Number(r.impact_1_5))||Number(r.impact_1_5)<1||Number(r.impact_1_5)>5)missing.push('consecuencia');
  if(!r.reversibility)missing.push('reversibilidad');
  if(typeof r.controls_present!=='boolean')missing.push('controles actuales');
  if(typeof r.sensitive_or_high_impact!=='boolean')missing.push('sensibilidad');
  if(typeof r.material_financial_or_compliance!=='boolean')missing.push('materialidad');
  if(typeof r.critical_trigger!=='boolean')missing.push('criticidad');
  return missing;
}
function riskReviewActionPanel(e){
  const pending=(e.risks||[]).map((r,i)=>({r,i,missing:riskIncompleteFields(r)})).filter(x=>x.missing.length);
  if(!pending.length)return '';
  const count=pending.length;
  return '<div class="notice warn risk-review-summary"><b>'+count+' riesgo'+(count===1?'':'s')+' pendiente'+(count===1?'':'s')+' de completar</b><p>Este bloque resume únicamente los huecos pendientes; el riesgo completo se mantiene una sola vez en «Riesgos registrados».</p>'
    +pending.map(x=>'<div class="risk-review-row"><div><strong>Riesgo '+(x.i+1)+'</strong><div class="field-help"><b>Falta:</b> '+esc(x.missing.join(' · '))+'</div></div><button type="button" class="btn btn-small btn-primary" data-edit-risk-index="'+x.i+'">Completar riesgo</button></div>').join('')
    +'</div>';
}
async function reviewRiskCandidates(){
  const e=currentEng();if(!e||typeof fetchRiskCandidates!=='function')return toast('La revisión de posibles riesgos no está disponible.');
  try{
    const r=await fetchRiskCandidates(e),steps=typeof activeSteps==='function'?activeSteps(e):[];__auneaRiskCandidates=normalizeArray(r?.candidates);
    const body=__auneaRiskCandidates.length
      ?'<div class="notice info"><b>Situaciones que conviene validar con el cliente</b><p>AUNEA ha encontrado señales en el proceso. Son preguntas de revisión: no se crea ni puntúa ningún riesgo hasta que lo confirmes.</p></div><div class="result-list">'
        +__auneaRiskCandidates.map((x,i)=>{
          const names=normalizeArray(x.step_ids).map(id=>steps.find(s=>s.id===id)?.step_name||'').filter(Boolean);
          const qs=normalizeArray(x.review_questions).filter(Boolean);
          return '<div class="result-item risk-candidate-card"><div class="result-item-head"><div><b>'+esc(x.title||'Posible riesgo')+'</b><p>'+esc(x.rationale||'')+'</p>'
            +(names.length?'<p><b>Dónde revisar:</b> '+names.map(esc).join(', ')+'</p>':'')
            +(qs.length?'<div class="field-help"><b>Preguntas para validarlo:</b><br>'+qs.map(q=>'• '+esc(q)).join('<br>')+'</div>':'')
            +'</div><div class="result-actions"><button type="button" class="btn btn-small btn-primary" data-review-risk-candidate="'+i+'">Revisar con el cliente</button></div></div></div>';
        }).join('')+'</div>'
      :'<div class="empty"><h2>No hay nuevas situaciones que revisar</h2><p>Con la información disponible no se ha detectado otro escenario de riesgo material para revisar.</p></div>';
    openModal('Riesgos que conviene revisar',body,closeModal,'Cerrar');
    document.querySelectorAll('[data-review-risk-candidate]').forEach(b=>b.onclick=()=>{const x=__auneaRiskCandidates[Number(b.dataset.reviewRiskCandidate)];if(x){closeModal();addRisk(x.step_ids,null,x)}});
  }catch(err){toast('No se pudieron revisar los posibles riesgos: '+String(err?.message||err))}
}
function riskBuilder(e){
  const steps=typeof activeSteps==='function'?activeSteps(e):[];
  const frictions=typeof activeFrictions==='function'?activeFrictions(e):(e.frictions||[]);
  const approvalSteps=steps.filter(s=>s.step_type==='ST05'||normalizeArray(s.decision_criteria).length).length;
  const sensitive=normalizeArray(e.answers?.DF073).filter(x=>x!=='NONE').length;
  const known='<div class="notice info risk-known-context"><b>Hechos ya conocidos del AS-IS</b><p>'+steps.length+' pasos · '+frictions.length+' fricciones confirmadas · '+approvalSteps+' paso(s) de decisión/aprobación'+(sensitive?' · datos sensibles/regulados declarados':'')+'. AUNEA usa este contexto para revisar riesgos sin volver a preguntar lo ya capturado.</p></div>';
  const rows=(e.risks||[]).length
    ?(e.risks||[]).map((r,i)=>{
      const missing=riskIncompleteFields(r),related=riskRelatedFrictions(e,r);
      const stepNames=normalizeArray(r.step_ids).map(id=>steps.find(s=>s.id===id)?.step_name||id).filter(Boolean);
      const status=missing.length?'<span class="status amber">Pendiente · '+missing.length+' campo'+(missing.length===1?'':'s')+'</span>':'<span class="status green">Completo</span>';
      const category=labelFrom('OS_RISK_CATEGORY',r.category)||r.category||'Sin categoría';
      return '<div class="process-row risk-record-row"><div class="process-index">'+(i+1)+'</div><div class="risk-record-main"><b>'+esc(r.description||category)+'</b>'
        +'<div class="coverage-chips" style="margin-top:6px"><span class="chip">'+esc(category)+'</span><span class="chip">Prob. '+esc(r.likelihood_1_5||'—')+'/5</span><span class="chip">Consecuencia '+esc(r.impact_1_5||'—')+'/5</span>'+status+'</div>'
        +'<p><b>Pasos afectados:</b> '+(stepNames.length?stepNames.map(esc).join(', '):'Pendiente de vincular')+'</p>'
        +'<p><b>Contexto observado:</b> '+(related.length?related.map(f=>esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))).join(', '):'Sin fricciones relacionadas registradas')+'</p>'
        +(missing.length?'<div class="field-help"><b>Falta completar:</b> '+esc(missing.join(' · '))+'</div>':'')
        +'</div><div class="row-actions"><button class="btn btn-small" data-edit-risk-index="'+i+'">'+(missing.length?'Completar / editar':'Editar')+'</button><button class="btn btn-small btn-danger" data-delete-risk-index="'+i+'">Eliminar</button></div></div>';
    }).join('')
    :'<div class="empty"><p>Todavía no hay riesgos registrados.</p></div>';
  return section('Riesgos','Registra qué podría salir mal y en qué pasos. Las fricciones de esos pasos se muestran sólo como contexto para evitar duplicar información.',
    known+riskReviewActionPanel(e)+'<div class="field-help"><b>Riesgos registrados</b></div><div class="process-list">'+rows+'</div>',
    '<button type="button" class="btn btn-outline" id="reviewRiskCandidates">Revisar posibles riesgos</button><button type="button" class="btn btn-primary" id="addRisk" data-add-risk-global>Añadir riesgo</button>');
}
function addRisk(preselectedSteps=[],editIndex=null,candidate=null){
  if(typeof guardAsisMutation==='function'&&guardAsisMutation())return;
  const e=currentEng(),existing=Number.isInteger(editIndex)?e.risks?.[editIndex]:null;
  if(existing)preselectedSteps=normalizeArray(existing.step_ids);
  const cats=fieldOptions('OS_RISK_CATEGORY'),rev=fieldOptions('OS_REVERSIBILITY'),controlOptions=fieldOptions('OS_CONTROL_TYPE'),riskScale=fieldOptions('OS_SCALE_1_5'),
    sensitiveRaw=normalizeArray(e.answers?.DF073),sensitive=sensitiveRaw.filter(x=>x!=='NONE'),
    steps=typeof activeSteps==='function'?activeSteps(e):[],
    frictions=typeof activeFrictions==='function'?activeFrictions(e):e.frictions||[];
  const selected=existing||{description:candidate?.suggested_description||'',_candidate_id:candidate?.candidate_id||''},num=v=>v===undefined||v===null?'':String(v),storedControls=normalizeArray(selected.current_control),otherControl=storedControls.find(x=>String(x).startsWith('OTHER:'))||'',selectedControlIds=storedControls.map(x=>String(x).startsWith('OTHER:')?'OTHER':String(x));
  const candidateNotice=!existing&&candidate?'<div class="notice info risk-candidate-prefill"><b>Señal para revisar — no es un riesgo confirmado</b><p>'+esc(candidate.rationale||'')+'</p>'+(normalizeArray(candidate.review_questions).length?'<div class="field-help"><b>Comprueba antes de guardar:</b><br>'+normalizeArray(candidate.review_questions).map(q=>'• '+esc(q)).join('<br>')+'</div>':'')+'<p class="field-help">AUNEA ha preseleccionado los pasos y una redacción inicial. Tú debes decidir categoría, probabilidad, consecuencia, reversibilidad y controles.</p></div>':'';
  openModal(existing?'Editar riesgo':'Añadir riesgo',
    '<div class="step-groups process-modal-form risk-modal-form">'+candidateNotice+'<details class="step-group" open><summary>¿Qué podría salir mal?</summary><div class="form-grid">'
    +'<div class="field full"><label>¿En qué pasos podría ocurrir?</label><div class="choice-grid">'
    +steps.map(s=>'<div class="choice"><input type="checkbox" id="risk_step_'+attr(s.id)+'" data-risk-step="'+attr(s.id)+'" '+(preselectedSteps.includes(s.id)?'checked':'')+'><label for="risk_step_'+attr(s.id)+'">'+esc(s.step_name||s.id)+'</label></div>').join('')+'</div></div>'
    +'<div class="field full"><label>Problemas observados en los pasos elegidos</label><div class="field-help">Se reutilizan como contexto. No tienes que volver a seleccionarlos ni describirlos.</div><div class="choice-grid">'
    +frictions.map(f=>'<div class="choice" data-risk-friction-row data-affected-steps="'+attr(normalizeArray(f.affected_steps).join('|'))+'"><span>'+esc(f.client_label||labelFrom('OS_FRICTION_TYPE',f.friction_type))+'</span></div>').join('')+'</div><div class="field-help" id="riskNoRelatedFriction">Selecciona un paso para ver sus problemas ya registrados.</div></div>'
    +'<div class="field"><label>¿De qué tipo es este riesgo? '+requiredMark()+'</label>'+riskDropdown('riskCat',[{value:'',label:'Selecciona…'},...cats],selected.category||'','Selecciona…')+'</div>'
    +'<div class="field"><label>¿Qué podría salir mal? '+requiredMark()+'</label><input id="riskDesc" value="'+attr(selected.description||'')+'" placeholder="Describe qué podría ocurrir"></div>'
    +'<div class="field"><label>¿Qué probabilidad hay de que ocurra? '+requiredMark()+'</label>'+riskDropdown('riskLike',[{value:'',label:'Selecciona…'},...riskScale],num(selected.likelihood_1_5),'Selecciona…')+'<div class="field-help">Valora la probabilidad del escenario descrito; usa histórico o evidencia cuando exista.</div></div>'
    +'<div class="field"><label>¿Qué consecuencias tendría? '+requiredMark()+'</label>'+riskDropdown('riskImpact',[{value:'',label:'Selecciona…'},...riskScale],num(selected.impact_1_5),'Selecciona…')+'<div class="field-help">Valora la consecuencia si el riesgo llega a ocurrir, no la gravedad de la fricción.</div></div></div></details>'
    +'<details class="step-group" open><summary>Controles y condiciones</summary><div class="form-grid">'
    +'<div class="field"><label>Si ocurre, ¿se puede corregir? '+requiredMark()+'</label>'+riskDropdown('riskRev',[{value:'',label:'Selecciona…'},...rev],selected.reversibility||'','Selecciona…')+'<div class="field-help">Reversibilidad: cuánto cuesta o qué intervención exige volver a una situación segura.</div></div>'
    +'<div class="field"><label>¿Existen controles actuales? '+requiredMark()+'</label>'+riskDropdown('riskControls',[{value:'',label:'Selecciona…'},{value:'1',label:'Sí'},{value:'0',label:'No'}],existing?(selected.controls_present===true?'1':selected.controls_present===false?'0':''):(storedControls.length?'1':''),'Selecciona…')+'</div>'
    +'<div class="field full"><label>Controles actuales</label><div class="choice-grid">'+controlOptions.map(o=>'<div class="choice"><input type="checkbox" id="risk_control_'+attr(o.value)+'" data-risk-control="'+attr(o.value)+'" '+(selectedControlIds.includes(String(o.value))?'checked':'')+'><label for="risk_control_'+attr(o.value)+'">'+esc(o.label)+'</label></div>').join('')+'</div><div class="detail-wrap" id="riskControlOtherWrap" '+(selectedControlIds.includes('OTHER')?'':'style="display:none"')+'><input id="riskControlOther" value="'+attr(otherControl.replace(/^OTHER:\s*/,''))+'" placeholder="Describe el otro control"></div></div>'
    +'<div class="field"><label>¿Afecta a datos sensibles o de alto impacto? '+requiredMark()+'</label>'+riskDropdown('riskSensitive',[{value:'',label:'Selecciona…'},{value:'1',label:sensitive.length?'Sí — reutilizado de DF073':'Sí'},{value:'0',label:'No'}],existing?(selected.sensitive_or_high_impact===true?'1':selected.sensitive_or_high_impact===false?'0':''):(sensitive.length?'1':sensitiveRaw.includes('NONE')?'0':''),'Selecciona…')+'</div>'
    +'<div class="field"><label>¿Puede tener consecuencias económicas o de cumplimiento importantes? '+requiredMark()+'</label>'+riskDropdown('riskMat',[{value:'',label:'Selecciona…'},{value:'0',label:'No'},{value:'1',label:'Sí'}],existing?(selected.material_financial_or_compliance===true?'1':selected.material_financial_or_compliance===false?'0':''):'','Selecciona…')+'<div class="field-help">Marca Sí sólo si la consecuencia financiera, contractual o de cumplimiento puede ser material.</div></div>'
    +'<div class="field"><label>¿Es un evento crítico? '+requiredMark()+'</label>'+riskDropdown('riskCritical',[{value:'',label:'Selecciona…'},{value:'0',label:'No'},{value:'1',label:'Sí'}],existing?(selected.critical_trigger===true?'1':selected.critical_trigger===false?'0':''):'','Selecciona…')+'<div class="field-help">Evento crítico: una consecuencia que exige tratamiento especial aunque su probabilidad sea baja.</div></div></div></details></div>',
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
      const current_control=controls==='1'?controlIds.map(x=>x==='OTHER'?'OTHER: '+otherDetail:x):[];
      const draft={step_ids,category:cat,description,likelihood_1_5:like,
        impact_1_5:impact,
        reversible:!['HARD','IRREVERSIBLE'].includes(rv),reversibility:rv,
        controls_present:controls==='1',current_control,
        sensitive_or_high_impact:sensitiveValue==='1',
        material_financial_or_compliance:materialValue==='1',
        critical_trigger:criticalValue==='1',_candidate_id:selected._candidate_id||candidate?.candidate_id||null};
      if(existing)Object.assign(existing,draft);else e.risks.push(draft);
      if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'risks');
      markDirty(existing?'Riesgo modificado':'Riesgo añadido');closeModal();render();
    },existing?'Guardar cambios':'Añadir riesgo');
  function refreshRelatedProblems(){
    const chosen=[...document.querySelectorAll('[data-risk-step]:checked')].map(x=>x.dataset.riskStep);
    let visible=0;
    document.querySelectorAll('[data-risk-friction-row]').forEach(row=>{
      const affected=String(row.dataset.affectedSteps||'').split('|').filter(Boolean);
      row.hidden=!chosen.length||!affected.some(id=>chosen.includes(id));
      row.style.display=row.hidden?'none':'';
      if(!row.hidden)visible++;
    });
    const empty=document.getElementById('riskNoRelatedFriction');
    if(empty)empty.textContent=!chosen.length?'Selecciona un paso para ver sus problemas ya registrados.':visible?'':'No hay fricciones registradas en los pasos seleccionados.';
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
