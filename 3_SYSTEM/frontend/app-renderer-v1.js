// [AUNEA-FE-DIAG-RENDER-040] START — Canonical control renderer
// PURPOSE: Render Diagnostic Master controls without degrading structured semantics to generic text.
// SOURCE: Diagnostic Master v1.1 CANONICAL; REQ-DIAG-003/005/006; DEC-040.
// INPUTS: field contract, canonical option sets, engagement state.
// OUTPUTS: HTML controls bound to canonical Field_ID values and structured detail metadata.
// SIDE_EFFECTS: DOM listeners write engagement.answers / engagement.answerDetails only.
// CHANGE_RISK: HIGH.

function answerDetails(e=currentEng()){
  if(!e)return {};
  e.answerDetails=e.answerDetails||{};
  return e.answerDetails;
}
function getAnswerDetail(fid,e=currentEng()){return answerDetails(e)[fid]||''}
function setAnswerDetail(fid,value){const e=currentEng();if(!e)return;answerDetails(e)[fid]=value;e.updatedAt=now();markDirty(`Detalle ${fid} actualizado`)}
function optionLabel(setId,value){return labelFrom(setId,value)}
function selectedValues(v){return normalizeArray(v).map(String)}
function isOtherAllowed(f){return /OTHER/i.test(String(f.Control_UI||''))||/Otro/i.test(String(f.Validation||''))}
function dataListId(fid){return `list_${String(fid).replace(/[^a-zA-Z0-9_-]/g,'_')}`}
function detailInput(fid,placeholder='Detalle breve'){
  return `<input class="detail-input" data-detail-answer="${fid}" value="${attr(getAnswerDetail(fid))}" placeholder="${attr(placeholder)}">`;
}
function canonicalSelect(fid,opts,val,extra=''){
  return `<select data-answer="${fid}" ${extra}><option value="">Selecciona…</option>${opts.map(x=>`<option value="${attr(x.value)}" ${String(val)===String(x.value)?'selected':''}>${esc(x.label)}</option>`).join('')}</select>`;
}
function searchableSelect(f,val,opts){
  const id=dataListId(f.Field_ID),label=opts.find(x=>String(x.value)===String(val))?.label||(isOtherAllowed(f)?String(val||''):'');
  return `<div class="compound-control"><input data-search-answer="${f.Field_ID}" data-option-set="${attr(f.Option_Set_ID||'')}" data-allow-other="${isOtherAllowed(f)?'1':'0'}" list="${id}" value="${attr(label)}" placeholder="Buscar o seleccionar…"><datalist id="${id}">${opts.map(x=>`<option value="${attr(x.label)}" data-value="${attr(x.value)}"></option>`).join('')}</datalist></div>`;
}
// Ninguno/No-existe exclusivity is NOT derived by parsing Validation prose at runtime — it is a small,
// hand-curated table citing the exact canonical Validation text for each entry. Extend this table only
// after confirming the corresponding Field_ID's Validation in the Diagnostic Master v1.1; never generalize
// with a regex over Validation text.
const EXCLUSIVE_OPTION_BY_FIELD=Object.freeze({
  DF065:{value:'NO_WORKAROUND'}, // OS_WORKAROUND — Validation: "0..N; 'No existe' excluye el resto."
  DF073:{value:'NONE'} // OS_SENSITIVE_DATA — Validation: "'Ninguno' excluye otras opciones."
});
function exclusiveValueFor(fid){return EXCLUSIVE_OPTION_BY_FIELD[fid]?.value}
function multiChoices(fid,items,val,{detail=false,other=false}={}){
  const arr=selectedValues(val);
  const exclusiveValue=exclusiveValueFor(fid);
  const html=items.map(x=>{
    const isExclusive=exclusiveValue!==undefined&&String(x.value)===String(exclusiveValue);
    return `<div class="choice"><input type="checkbox" id="${fid}_${attr(x.value)}" value="${attr(x.value)}" data-multi="${fid}" ${isExclusive?'data-exclusive="1"':''} ${arr.includes(String(x.value))?'checked':''}><label for="${fid}_${attr(x.value)}">${esc(x.label)}</label></div>`;
  }).join('');
  const otherOpen=other&&!!getAnswerDetail(fid);
  const otherToggle=other?`<div class="choice"><input type="checkbox" id="${fid}__other_toggle" data-other-toggle="${fid}" ${otherOpen?'checked':''}><label for="${fid}__other_toggle">+ Otro</label></div>`:'';
  const detailBox=other
    ?`<div class="detail-wrap" data-detail-wrap="${fid}"${otherOpen?'':' style="display:none"'}>${detailInput(fid,'Otro / detalle no cubierto por el catálogo')}</div>`
    :(detail?detailInput(fid,'Detalle / condición relevante'):'');
  return `<div class="choice-grid">${html}${otherToggle}</div>${detailBox}`;
}
function segmented(fid,opts,val){
  const items=opts.length?opts:[{value:'YES',label:'Sí'},{value:'NO',label:'No'},{value:'UNKNOWN',label:'No sabe'}];
  return `<div class="segmented">${items.map(x=>`<button type="button" class="segment ${String(val)===String(x.value)?'active':''}" data-segment="${fid}" data-value="${attr(x.value)}">${esc(x.label)}</button>`).join('')}</div>`;
}
function numberParts(val){return (val&&typeof val==='object')?val:{value:val??'',unit:'',period:'',mode:''}}
function numberCompound(f,val){
  const c=String(f.Control_UI||'').toUpperCase(),p=numberParts(val),fid=f.Field_ID;
  let units=[];
  if(c.includes('TIME_UNIT'))units=[['min','min'],['h','h'],['day','días'],['week','semanas']];
  else if(c.includes('EUR'))units=[['EUR','€']];
  else if(c.includes('PERCENT'))units=[['percent','%'],['count','casos']];
  else if(c.includes('UNIT'))units=[['case','casos'],['item','elementos'],['request','solicitudes'],['person','personas']];
  const periodNeeded=c.includes('PERIOD')||c.includes('COUNT');
  const special=[];if(c.includes('UNKNOWN'))special.push(['UNKNOWN','No disponible']);if(c.includes('NONE'))special.push(['NONE','No aplica']);if(c.includes('ZERO'))special.push(['ZERO','0']);
  return `<div class="compound-control"><input type="number" step="any" min="0" data-number-value="${fid}" value="${attr(p.value)}" placeholder="Valor">${units.length?`<select data-number-unit="${fid}"><option value="">Unidad…</option>${units.map(([v,l])=>`<option value="${v}" ${String(p.unit)===v?'selected':''}>${l}</option>`).join('')}</select>`:''}${periodNeeded?`<select data-number-period="${fid}"><option value="">Periodo…</option><option value="case" ${p.period==='case'?'selected':''}>por caso</option><option value="day" ${p.period==='day'?'selected':''}>por día</option><option value="week" ${p.period==='week'?'selected':''}>por semana</option><option value="month" ${p.period==='month'?'selected':''}>por mes</option><option value="year" ${p.period==='year'?'selected':''}>por año</option></select>`:''}${special.length?`<select data-number-mode="${fid}"><option value="">Dato disponible</option>${special.map(([v,l])=>`<option value="${v}" ${p.mode===v?'selected':''}>${l}</option>`).join('')}</select>`:''}</div>`;
}
function stepOptions(e,exclude=''){return e.processSteps.filter(x=>x.status!=='SUPERSEDED'&&x.id!==exclude).map(x=>({value:x.id,label:x.step_name||x.id}))}
function stepMulti(fid,e,val){return multiChoices(fid,stepOptions(e),val)}
function stepSingle(fid,e,val){return canonicalSelect(fid,stepOptions(e),val)}
function stepPair(fid,e,val){
  const p=(val&&typeof val==='object')?val:{};const opts=stepOptions(e);
  return `<div class="compound-control">${canonicalSelect(`${fid}__from`,opts,p.from||'','data-pair-part="from" data-pair-field="'+fid+'"')}${canonicalSelect(`${fid}__to`,opts,p.to||'','data-pair-part="to" data-pair-field="'+fid+'"')}</div>`;
}
function stepSystemPair(fid,e,val){
  const p=(val&&typeof val==='object')?val:{};return `<div class="compound-control">${canonicalSelect(`${fid}__step`,stepOptions(e),p.step||'','data-step-system-part="step" data-step-system-field="'+fid+'"')}<input data-step-system-part="system" data-step-system-field="${fid}" value="${attr(p.system||'')}" placeholder="Sistema / integración"></div>`;
}
function frictionPriority(fid,e,val){
  const items=e.frictions.filter(x=>x.status!=='SUPERSEDED').map(x=>({value:x.id,label:labelFrom('OS_FRICTION_TYPE',x.friction_type)}));return multiChoices(fid,items,val);
}
function structuredRedirect(label,page){return `<div class="notice info"><strong>${esc(label)}</strong><br>Se gestiona en su editor estructurado para conservar trazabilidad. <button type="button" class="btn btn-small" data-page="${page}">Abrir editor</button></div>`}

function renderControl(f,val,opts,e){
  const c=String(f.Control_UI||'').toUpperCase(),fid=f.Field_ID;
  if(c==='CRM_REFERENCE_OR_TEXT')return canonicalSelect(fid,state.companies.map(x=>({value:x.name,label:x.name})),val);
  if(c==='CONTACT_REFERENCE')return canonicalSelect(fid,state.contacts.filter(x=>x.companyId===e.companyId).map(x=>({value:x.id,label:`${x.name}${x.role?' · '+x.role:''}`})),val);
  if(c==='CONTACT_MULTISELECT')return multiChoices(fid,state.contacts.filter(x=>x.companyId===e.companyId).map(x=>({value:x.id,label:`${x.name}${x.role?' · '+x.role:''}`})),val);
  if(c==='CONTACT_OR_ROLE_REFERENCE')return `<div class="compound-control">${canonicalSelect(fid,state.contacts.filter(x=>x.companyId===e.companyId).map(x=>({value:x.id,label:`${x.name}${x.role?' · '+x.role:''}`})),val)}${detailInput(fid,'Rol si aún no se conoce la persona')}</div>`;
  if(c==='SEARCHABLE_DROPDOWN')return searchableSelect(f,val,opts);
  if(c==='DROPDOWN')return canonicalSelect(fid,opts,val);
  if(c==='DROPDOWN_WITH_DETAIL')return canonicalSelect(fid,opts,val)+detailInput(fid,'Detalle si aplica');
  if(c==='DROPDOWN_WITH_OWNER_DATE')return canonicalSelect(fid,opts,val)+`<div class="compound-control">${detailInput(fid,'Owner / responsable')}<input type="date" data-detail-date="${fid}" value="${attr(answerDetails(e)[`${fid}__date`]||'')}"></div>`;
  if(c==='DROPDOWN_WITH_STEP_LINK')return canonicalSelect(fid,opts,val)+stepSingle(`${fid}__step`,e,answerDetails(e)[`${fid}__step`]||'');
  if(c==='COMBOBOX_WITH_DETAIL')return canonicalSelect(fid,opts,val)+detailInput(fid,'Detalle / nombre concreto');
  if(c==='COMBOBOX_REFERENCE')return canonicalSelect(fid,opts,val)+detailInput(fid,'Nueva referencia sólo si no existe');
  if(c==='MULTISELECT'||c==='MULTICHECK'||c==='MULTISELECT_REFERENCE'||c==='SYSTEM_GENERATED_MULTISELECT')return multiChoices(fid,opts,val);
  if(c==='MULTISELECT_WITH_OTHER'||c==='MULTICHECK_WITH_OTHER')return multiChoices(fid,opts,val,{other:true});
  if(c==='MULTISELECT_WITH_DETAIL'||c==='MULTICHECK_WITH_DETAIL'||c==='MULTISELECT_WITH_REFERENCE')return multiChoices(fid,opts,val,{detail:true});
  if(c==='MULTISELECT_WITH_PRIORITY')return multiChoices(fid,opts,val,{detail:true});
  if(c==='MULTISELECT_WITH_STEP_LINK'||c==='MULTISELECT_WITH_STEP_REFERENCE'||c==='STEP_ACTION_MULTISELECT')return multiChoices(fid,opts,val,{detail:true})+stepMulti(`${fid}__steps`,e,answerDetails(e)[`${fid}__steps`]||[]);
  if(c==='STEP_MULTISELECT_VISUAL'||c==='STEP_MULTISELECT_WITH_FRICTION')return stepMulti(fid,e,val);
  if(c==='STEP_REFERENCE_SINGLE')return stepSingle(fid,e,val);
  if(c==='STEP_PAIR_SELECTOR')return stepPair(fid,e,val);
  if(c==='STEP_SYSTEM_PAIR_SELECTOR')return stepSystemPair(fid,e,val);
  if(c==='FRICTION_MULTISELECT_PRIORITY')return frictionPriority(fid,e,val);
  if(c==='BOOLEAN_UNKNOWN'||c==='BOOLEAN_UNKNOWN_WITH_SCOPE'||c==='SEGMENTED'||c==='SEGMENTED_SCALE')return segmented(fid,opts,val)+(c.includes('SCOPE')?detailInput(fid,'Alcance / condición'): '');
  if(c==='DATE_WITH_UNKNOWN')return `<div class="compound-control"><input type="date" data-answer="${fid}" value="${attr(val||'')}"><button type="button" class="btn btn-small" data-set-unknown="${fid}">No disponible</button></div>`;
  if(c.startsWith('NUMBER')||c.startsWith('PERCENT'))return numberCompound(f,val);
  if(c==='REFERENCE_OR_SHORT_TEXT'||c==='TEXT_SHORT')return `<input data-answer="${fid}" value="${attr(val||'')}" maxlength="200" placeholder="Respuesta breve">`;
  if(c==='TEXT_LONG_INTERNAL')return `<textarea data-answer="${fid}" class="internal-only" placeholder="Notas internas; no se muestran en Modo Sesión">${esc(val||'')}</textarea>`;
  if(c==='CLIENT_CONFIRMATION_WITH_INLINE_EDIT')return `<div class="notice ${e.confirmedAsIs?'good':'warn'}">${e.confirmedAsIs?'Flujo AS-IS confirmado.':'Pendiente de confirmar el AS-IS.'} <button type="button" class="btn btn-small" data-page="proceso">Revisar / editar</button></div>`;
  if(c==='RISK_BUILDER')return structuredRedirect('Riesgo estructurado','diagnostico');
  if(['ROLE_CAPACITY_TABLE','ROLE_RATE_TABLE','MONETARY_EVENT_TABLE','TOOL_COST_TABLE'].includes(c))return structuredRedirect('Input económico estructurado','diagnostico');
  if(c==='FRICTION_TYPE_SELECT_WITH_CLIENT_LABEL'||c==='EXCEPTION_BUILDER')return structuredRedirect('Registro estructurado','proceso');
  if(c.startsWith('DERIVED')||c.startsWith('SYSTEM_GENERATED'))return `<div class="readonly-box">${esc(val||'Se completará automáticamente cuando existan datos suficientes.')}</div>`;
  return `<div class="notice warn control-error"><strong>Control canónico no renderizado:</strong> ${esc(c||'SIN_CONTROL')} · ${esc(fid)}. No se degrada a texto libre.</div>`;
}

function bindCanonicalRenderer(){
  document.querySelectorAll('[data-detail-answer]').forEach(el=>el.addEventListener('input',()=>setAnswerDetail(el.dataset.detailAnswer,el.value)));
  document.querySelectorAll('[data-detail-date]').forEach(el=>el.addEventListener('change',()=>{const e=currentEng();answerDetails(e)[`${el.dataset.detailDate}__date`]=el.value;markDirty(`Fecha detalle ${el.dataset.detailDate} actualizada`)}));
  document.querySelectorAll('[data-search-answer]').forEach(el=>el.addEventListener('change',()=>{const setId=el.dataset.optionSet,opts=fieldOptions(setId),typed=el.value.trim(),match=opts.find(o=>String(o.label).toLowerCase()===typed.toLowerCase()||String(o.value).toLowerCase()===typed.toLowerCase());if(match){el.value=match.label;setAnswer(el.dataset.searchAnswer,match.value)}else if(el.dataset.allowOther==='1'){setAnswer(el.dataset.searchAnswer,typed)}else{el.value='';setAnswer(el.dataset.searchAnswer,'');toast('Selecciona una opción del catálogo canónico.')}}));
  const numberFids=[...new Set([...document.querySelectorAll('[data-number-value],[data-number-unit],[data-number-period],[data-number-mode]')].map(x=>x.dataset.numberValue||x.dataset.numberUnit||x.dataset.numberPeriod||x.dataset.numberMode))];
  numberFids.forEach(fid=>{const sync=()=>{const value=document.querySelector(`[data-number-value="${fid}"]`)?.value??'',unit=document.querySelector(`[data-number-unit="${fid}"]`)?.value??'',period=document.querySelector(`[data-number-period="${fid}"]`)?.value??'',mode=document.querySelector(`[data-number-mode="${fid}"]`)?.value??'';setAnswer(fid,{value:value===''?'':Number(value),unit,period,mode})};document.querySelectorAll(`[data-number-value="${fid}"],[data-number-unit="${fid}"],[data-number-period="${fid}"],[data-number-mode="${fid}"]`).forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',sync))});
  document.querySelectorAll('[data-set-unknown]').forEach(b=>b.onclick=()=>{setAnswer(b.dataset.setUnknown,'UNKNOWN');render()});
  const pairFids=[...new Set([...document.querySelectorAll('[data-pair-field]')].map(x=>x.dataset.pairField))];pairFids.forEach(fid=>document.querySelectorAll(`[data-pair-field="${fid}"]`).forEach(el=>el.addEventListener('change',()=>{const p={};document.querySelectorAll(`[data-pair-field="${fid}"]`).forEach(x=>p[x.dataset.pairPart]=x.value);setAnswer(fid,p)})));
  const ssFids=[...new Set([...document.querySelectorAll('[data-step-system-field]')].map(x=>x.dataset.stepSystemField))];ssFids.forEach(fid=>document.querySelectorAll(`[data-step-system-field="${fid}"]`).forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{const p={};document.querySelectorAll(`[data-step-system-field="${fid}"]`).forEach(x=>p[x.dataset.stepSystemPart]=x.value);setAnswer(fid,p)})));
  document.querySelectorAll('[data-other-toggle]').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.otherToggle,wrap=document.querySelector(`[data-detail-wrap="${fid}"]`);
    if(!wrap)return;
    wrap.style.display=el.checked?'':'none';
    if(!el.checked)setAnswerDetail(fid,'');
  }));
  document.querySelectorAll('[data-multi][data-exclusive]').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.multi;
    if(el.checked)document.querySelectorAll(`[data-multi="${fid}"]`).forEach(other=>{if(other!==el)other.checked=false});
    setAnswer(fid,[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value));
  }));
  document.querySelectorAll('[data-multi]:not([data-exclusive])').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.multi,exclusiveEl=document.querySelector(`[data-multi="${fid}"][data-exclusive]`);
    if(!el.checked||!exclusiveEl||!exclusiveEl.checked)return;
    exclusiveEl.checked=false;
    setAnswer(fid,[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value));
  }));
}
const __auneaBaseBindForms=bindForms;
bindForms=function(){__auneaBaseBindForms();bindCanonicalRenderer();};
// [AUNEA-FE-DIAG-RENDER-040] END
