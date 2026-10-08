// [AUNEA-FE-DIAG-RENDER-040] START — Canonical control renderer
// PURPOSE: Render Diagnostic Master controls without degrading structured semantics to generic text.
// SOURCE: Diagnostic Master v1.2 CANONICAL; REQ-DIAG-003/005/006; DEC-040/061/062.
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
function setAnswerDetail(fid,value){const e=currentEng();if(!e)return;answerDetails(e)[fid]=value;e.updatedAt=now();markDirty(`Detalle ${fid} actualizado`);if(typeof refreshCaptureProgress==='function')refreshCaptureProgress();if(typeof refreshPendingFieldVisual==='function')refreshPendingFieldVisual(fid,e)}
function optionLabel(setId,value){return labelFrom(setId,value)}
function selectedValues(v){return normalizeArray(v).map(String)}
function isOtherAllowed(f){return /OTHER/i.test(String(f.Control_UI||''))||/Otro/i.test(String(f.Validation||''))}
function dataListId(fid){return `list_${String(fid).replace(/[^a-zA-Z0-9_-]/g,'_')}`}
function detailInput(fid,placeholder='Detalle breve'){
  return `<input class="detail-input" data-detail-answer="${fid}" value="${attr(getAnswerDetail(fid))}" placeholder="${attr(placeholder)}">`;
}
function auneaSelectControl(id,opts,val,{extra='',placeholder='Selecciona…',searchable=false}={}){
  const normalized=(opts||[]).map(x=>({value:String(x.value??''),label:String(x.label??x.value??'')}));
  const selected=normalized.find(x=>x.value===String(val??'')),shown=selected?.label||placeholder;
  return `<div class="canonical-aunea-select"><input type="hidden" id="${attr(id)}" value="${attr(val??'')}" ${extra}><details class="aunea-select" data-aunea-select="${attr(id)}"><summary><span>${esc(shown)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox">${searchable?`<div class="aunea-select-search"><input type="search" data-aunea-select-search="${attr(id)}" placeholder="Buscar…"></div>`:''}${normalized.map(o=>`<button type="button" role="option" class="${o.value===String(val??'')?'selected':''}" data-aunea-select-option="${attr(id)}" data-value="${attr(o.value)}" data-label="${attr(o.label)}">${esc(o.label)}</button>`).join('')}</div></details></div>`;
}
function canonicalSelect(fid,opts,val,extra=''){
  return auneaSelectControl(fid,opts,val,{extra:`data-answer="${fid}" ${extra}`});
}
function selectWithConditionalDetail(fid,opts,val,placeholder='Detalle si aplica'){
  const other=opts.find(x=>String(x.value).toUpperCase()==='OTHER'||['otro','otra'].includes(String(x.label||'').trim().toLowerCase()));
  if(!other)return canonicalSelect(fid,opts,val)+`<div class="detail-wrap">${detailInput(fid,placeholder)}</div>`;
  const open=String(val)===String(other.value);
  return canonicalSelect(fid,opts,val,`data-conditional-other-select="${fid}" data-other-value="${attr(other.value)}"`)+
    `<div class="detail-wrap" data-detail-wrap="${fid}"${open?'':' style="display:none"'}>${detailInput(fid,placeholder)}</div>`;
}
function searchableSelect(f,val,opts){
  return auneaSelectControl(f.Field_ID,opts,val,{extra:`data-answer="${f.Field_ID}" data-option-set="${attr(f.Option_Set_ID||'')}" data-allow-other="${isOtherAllowed(f)?'1':'0'}"`,placeholder:'Buscar o seleccionar…',searchable:true});
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
function hasCanonicalOtherOption(items){return (items||[]).some(x=>String(x.value).toUpperCase()==='OTHER'||['otro','otra'].includes(String(x.label||'').trim().toLowerCase()))}
function multiChoices(fid,items,val,{detail=false,other=false,linkedSteps=null}={}){
  const arr=selectedValues(val);
  const exclusiveValue=exclusiveValueFor(fid);
  const catalogOther=other?items.find(x=>String(x.value).toUpperCase()==='OTHER'||String(x.label).trim().toLowerCase()==='otro'||String(x.label).trim().toLowerCase()==='otra'):null;
  const html=(linkedSteps&&catalogOther?items.filter(x=>x!==catalogOther):items).map(x=>{
    const isExclusive=exclusiveValue!==undefined&&String(x.value)===String(exclusiveValue);
    const isOther=!!catalogOther&&x===catalogOther;
    return `<div class="choice"><input type="checkbox" id="${fid}_${attr(x.value)}" value="${attr(x.value)}" data-multi="${fid}" ${isExclusive?'data-exclusive="1"':''} ${isOther?`data-other-toggle="${fid}"`:''} ${arr.includes(String(x.value))?'checked':''}><label for="${fid}_${attr(x.value)}">${esc(x.label)}</label></div>`;
  }).join('');
  // DF088 joins the existing process-step checkboxes in the same flex flow, while preserving
  // their distinct data-multi key / answerDetails write target. Only the visual row is shared.
  const linkedHtml=linkedSteps?(linkedSteps.items||[]).map(x=>`<div class="choice"><input type="checkbox" id="${linkedSteps.fid}_${attr(x.value)}" value="${attr(x.value)}" data-multi="${linkedSteps.fid}" ${selectedValues(linkedSteps.val).includes(String(x.value))?'checked':''}><label for="${linkedSteps.fid}_${attr(x.value)}">${esc(x.label)}</label></div>`).join(''):'';
  const relocatedOther=linkedSteps&&catalogOther?`<div class="choice"><input type="checkbox" id="${fid}_${attr(catalogOther.value)}" value="${attr(catalogOther.value)}" data-multi="${fid}" data-other-toggle="${fid}" ${arr.includes(String(catalogOther.value))?'checked':''}><label for="${fid}_${attr(catalogOther.value)}">${esc(catalogOther.label)}</label></div>`:'';
  const syntheticOther=other&&!catalogOther;
  const otherOpen=other&&(catalogOther?arr.includes(String(catalogOther.value)):!!getAnswerDetail(fid));
  const otherToggle=syntheticOther?`<div class="choice"><input type="checkbox" id="${fid}__other_toggle" data-other-toggle="${fid}" ${otherOpen?'checked':''}><label for="${fid}__other_toggle">Otro</label></div>`:'';
  const detailBox=other
    ?`<div class="detail-wrap" data-detail-wrap="${fid}"${otherOpen?'':' style="display:none"'}>${detailInput(fid,'Especifica la opción')}</div>`
    :(detail?detailInput(fid,'Detalle / condición relevante'):'');
  return `<div class="choice-grid">${html}${linkedHtml}${relocatedOther}${otherToggle}</div>${detailBox}`;
}
function prioritySelectionOrder(fid,val,e=currentEng()){
  const selected=selectedValues(val);
  const saved=selectedValues(answerDetails(e)[`${fid}_priority`]).filter(v=>selected.includes(v));
  return [...saved,...selected.filter(v=>!saved.includes(v))];
}
function multiChoicesWithPriority(fid,items,val,e){
  const base=multiChoices(fid,items,val,{other:hasCanonicalOtherOption(items)});
  const selected=selectedValues(val);
  if(selected.length<2)return base;
  const ordered=prioritySelectionOrder(fid,val,e);
  const rows=ordered.map((value,index)=>{
    const item=items.find(x=>String(x.value)===String(value));
    const rank=index<3?`${index+1}ª prioridad`:'Sin prioridad';
    const up=index>0?`<button type="button" class="btn btn-small" data-priority-move="${fid}" data-priority-value="${attr(value)}" data-priority-direction="-1" aria-label="Subir ${attr(item?.label||value)}">↑</button>`:'';
    const down=index<ordered.length-1?`<button type="button" class="btn btn-small" data-priority-move="${fid}" data-priority-value="${attr(value)}" data-priority-direction="1" aria-label="Bajar ${attr(item?.label||value)}">↓</button>`:'';
    return `<div class="priority-row"><span class="priority-rank">${esc(rank)}</span><strong>${esc(item?.label||value)}</strong><span class="row-actions">${up}${down}</span></div>`;
  }).join('');
  return base+`<div class="priority-order" data-priority-order="${fid}"><div class="field-help"><strong>Ordena las 3 prioridades principales</strong></div>${rows}</div>`;
}

// attrName lets a caller reuse this markup outside the generic answers-writing [data-segment] binder
// (app-core.js) — e.g. the Process Step modal's automation_state, which must write to the step object,
// not e.answers, and keeps its own [data-step-auto] binder. Sharing this one render function is what
// consolidates the two segmented-control implementations; the different write targets stay separate.
function segmented(fid,opts,val,attrName='data-segment'){
  const items=opts.length?opts:[{value:'YES',label:'Sí'},{value:'NO',label:'No'},{value:'UNKNOWN',label:'No sabe'}];
  return `<div class="segmented">${items.map(x=>`<button type="button" class="segment ${String(val)===String(x.value)?'active':''}" ${attrName}="${fid}" data-value="${attr(x.value)}">${esc(x.label)}</button>`).join('')}</div>`;
}
function numberParts(val){return (val&&typeof val==='object')?val:{value:val??'',unit:'',period:'',mode:''}}
function numberCompound(f,val){
  const c=String(f.Control_UI||'').toUpperCase(),p=numberParts(val),fid=f.Field_ID,isBacklog=fid==='DF027';
  let units=[];
  if(c.includes('TIME_UNIT'))units=[['min','min'],['h','h'],['day','días'],['week','semanas']];
  else if(c.includes('EUR'))units=[['EUR','€']];
  else if(c.includes('PERCENT'))units=[['percent','%'],['count','casos']];
  else if(c.includes('UNIT'))units=[['case','casos'],['item','elementos'],['request','solicitudes'],['person','personas']];
  const periodNeeded=c.includes('PERIOD')||c.includes('COUNT');
  const special=[];
  if(isBacklog)special.push(['UNKNOWN','No se mide']);
  else{if(c.includes('UNKNOWN'))special.push(['UNKNOWN','No disponible']);if(c.includes('NONE'))special.push(['NONE','No aplica']);if(c.includes('ZERO'))special.push(['ZERO','0']);}
  const unitOpts=units.map(([value,label])=>({value,label}));
  const periodOpts=[{value:'day',label:'por día'},{value:'week',label:'por semana'},{value:'month',label:'por mes'},{value:'year',label:'por año'}];
  const modeOpts=[{value:'',label:'Dato disponible'},...special.map(([value,label])=>({value,label}))];
  const percentOrCount=c==='NUMBER_PERCENT_OR_COUNT';
  const unitExtra=`data-number-unit="${fid}"${percentOrCount?` data-percent-count-unit="${fid}"`:''}`;
  const periodControl=periodNeeded?auneaSelectControl(`${fid}__period`,periodOpts,p.period,{extra:`data-number-period="${fid}"`,placeholder:'Periodo…'}):'';
  const periodHtml=percentOrCount?`<div class="number-count-period" data-count-period-wrap="${fid}"${p.unit==='count'?'':' hidden'}>${periodControl}</div>`:periodControl;
  const fixedUnit=isBacklog?'<span class="unit-label">casos</span>':'';
  return `<div class="compound-control${percentOrCount?' percent-count-control':''}"><input type="number" step="${isBacklog?'1':'any'}" min="0" data-number-value="${fid}" value="${attr(p.value)}" placeholder="Valor">${fixedUnit}${units.length?auneaSelectControl(`${fid}__unit`,unitOpts,p.unit,{extra:unitExtra,placeholder:'Unidad…'}):''}${periodHtml}${special.length?auneaSelectControl(`${fid}__mode`,modeOpts,p.mode,{extra:`data-number-mode="${fid}"`,placeholder:'Dato disponible'}):''}</div>`;
}
// Excludes contacts marked 'Perdido' from reference pickers (DF007/DF016), reusing the same criterion
// as the CRM's own "ocultar perdidos" filter — not a new archived flag, just consistent status reuse.
function referenceableContacts(e){return state.contacts.filter(x=>x.companyId===e.companyId&&x.status!=='Inactivo')}
function referenceContactLabel(x){return typeof contactFullName==='function'?contactFullName(x):(x?.name||x?.email||x?.id||'Contacto')}
function stepOptions(e,exclude=''){return e.processSteps.filter(x=>x.status!=='SUPERSEDED'&&x.id!==exclude).map(x=>({value:x.id,label:x.step_name||x.id}))}
function stepMulti(fid,e,val){return multiChoices(fid,stepOptions(e),val)}
function stepSingle(fid,e,val){return canonicalSelect(fid,stepOptions(e),val)}
function linkedStepSingle(fid,e,val){
  return auneaSelectControl(fid,stepOptions(e),val,{extra:`data-linked-step-single="${fid}"`,placeholder:'Selecciona un paso…'});
}
function linkedStepMulti(fid,e,val){
  const arr=selectedValues(val);
  return `<div class="choice-grid">${stepOptions(e).map(x=>`<div class="choice"><input type="checkbox" id="${fid}_${attr(x.value)}" value="${attr(x.value)}" data-linked-step-multi="${fid}" ${arr.includes(String(x.value))?'checked':''}><label for="${fid}_${attr(x.value)}">${esc(x.label)}</label></div>`).join('')}</div>`;
}
function linkedStepSingle(fid,e,val){
  return auneaSelectControl(fid,stepOptions(e),val,{extra:`data-linked-step-single="${fid}"`,placeholder:'Selecciona un paso…'});
}
function linkedStepMulti(fid,e,val){
  const arr=selectedValues(val);
  return `<div class="choice-grid">${stepOptions(e).map(x=>`<div class="choice"><input type="checkbox" id="${fid}_${attr(x.value)}" value="${attr(x.value)}" data-linked-step-multi="${fid}" ${arr.includes(String(x.value))?'checked':''}><label for="${fid}_${attr(x.value)}">${esc(x.label)}</label></div>`).join('')}</div>`;
}
function stepPair(fid,e,val){
  const p=(val&&typeof val==='object')?val:{};const opts=stepOptions(e);
  return `<div class="compound-control">${canonicalSelect(`${fid}__from`,opts,p.from||'','data-pair-part="from" data-pair-field="'+fid+'"')}${canonicalSelect(`${fid}__to`,opts,p.to||'','data-pair-part="to" data-pair-field="'+fid+'"')}</div>`;
}

// DF051 is a repeatable Finding: the governed validation already requires affected datum + source step +
// destination step. The former two-select renderer could not capture the datum and could only represent
// one re-entry. Keep suggestions neutral: only explicit Confirmar writes a finding.
function duplicateEntryRawRows(val){
  if(Array.isArray(val))return val.filter(x=>x&&typeof x==='object');
  if(val&&typeof val==='object'&&(val.from||val.to||val.data))return [val];
  return [];
}
function duplicateEntryComplete(x){return !!String(x?.data||'').trim()&&!!x?.from&&!!x?.to}
function duplicateEntryRows(val){return duplicateEntryRawRows(val).filter(duplicateEntryComplete)}
function duplicateEntryDraftRows(e,fid,val){
  const legacy=duplicateEntryRawRows(val).filter(x=>!duplicateEntryComplete(x));
  const stored=normalizeArray(answerDetails(e)[`${fid}__drafts`]).filter(x=>x&&typeof x==='object');
  return [...legacy,...stored];
}
function saveDuplicateEntryDraftRows(e,fid,rows){
  answerDetails(e)[`${fid}__drafts`]=rows;
  e.updatedAt=now();markDirty('Borradores de reintroducción actualizados');
}
function migrateDuplicateEntryDrafts(e,fid='DF051'){
  const raw=duplicateEntryRawRows(e?.answers?.[fid]),legacy=raw.filter(x=>!duplicateEntryComplete(x));
  if(!legacy.length)return false;
  const d=answerDetails(e),stored=normalizeArray(d[`${fid}__drafts`]).filter(x=>x&&typeof x==='object');
  d[`${fid}__drafts`]=[...legacy,...stored];
  e.answers[fid]=raw.filter(duplicateEntryComplete);
  e.updatedAt=now();markDirty('Reintroducciones incompletas migradas a borrador');
  return true;
}
function duplicateEntryCandidates(e){
  const steps=(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),out=[];
  const artifactLabel=v=>optionLabel('OS_ARTIFACT_TYPE',v);
  // A suggestion is only useful when the process data points to ONE unambiguous handoff.
  // Generic artifacts shared by many earlier steps are not evidence of re-entry and must not
  // explode into a Cartesian list for the consultant to dismiss.
  for(let j=0;j<steps.length;j++){
    const dest=steps[j],manual=normalizeArray(dest.manual_actions).map(String);
    if(!manual.some(x=>x==='REKEY'||x==='COPY'))continue;
    const matches=[];
    normalizeArray(dest.inputs).map(String).forEach(dataKey=>{
      for(let i=j-1;i>=0;i--){
        const src=steps[i];
        if(normalizeArray(src.outputs).map(String).includes(dataKey)){
          matches.push({id:`${dataKey}:${src.id}:${dest.id}`,data:artifactLabel(dataKey),dataKey,from:src.id,to:dest.id});
          break; // nearest actual producer only
        }
      }
    });
    if(matches.length===1)out.push(matches[0]); // ambiguity => ask, never guess
  }
  return out;
}
function duplicateEntryControl(fid,e,val){
  const rows=duplicateEntryRows(val),drafts=duplicateEntryDraftRows(e,fid,val),opts=stepOptions(e),d=answerDetails(e),dismissed=new Set(normalizeArray(d[`${fid}__dismissed`])),confirmedKeys=new Set(rows.map(x=>`${x.dataKey||x.data}:${x.from}:${x.to}`));
  const suggestions=duplicateEntryCandidates(e).filter(x=>!dismissed.has(x.id)&&!confirmedKeys.has(x.id));
  const suggestionHtml=suggestions.length?`<div class="duplicate-entry-suggestions"><div class="duplicate-entry-heading"><b>Posibles reintroducciones detectadas</b><span>Confirma sólo las que ocurren realmente.</span></div>${suggestions.map(x=>`<div class="duplicate-entry-suggestion" data-duplicate-suggestion="${attr(x.id)}"><div><b>${esc(x.data)}</b><span>${esc(stepOptions(e).find(o=>o.value===x.from)?.label||x.from)} → ${esc(stepOptions(e).find(o=>o.value===x.to)?.label||x.to)}</span></div><div class="row-actions"><button type="button" class="btn btn-small btn-primary" data-duplicate-confirm="${attr(x.id)}" data-duplicate-data="${attr(x.data)}" data-duplicate-data-key="${attr(x.dataKey)}" data-duplicate-from="${attr(x.from)}" data-duplicate-to="${attr(x.to)}">Confirmar</button><button type="button" class="btn btn-small" data-duplicate-dismiss="${attr(x.id)}">No es una reintroducción</button></div></div>`).join('')}</div>`:'';
  const rowHtml=rows.length?rows.map((x,i)=>`<div class="duplicate-entry-row" data-duplicate-row="${i}"><div class="duplicate-entry-heading"><b>Reintroducción confirmada ${i+1}</b></div><div class="duplicate-entry-fields"><label><span>Información afectada</span><input class="detail-input" data-duplicate-part="data" data-duplicate-index="${i}" value="${attr(x.data||'')}" placeholder="Ej. Datos de la factura"></label><label><span>Disponible originalmente en</span>${canonicalSelect(`${fid}__from_${i}`,opts,x.from||'',`data-duplicate-part="from" data-duplicate-index="${i}"`)}</label><label><span>Se vuelve a introducir en</span>${canonicalSelect(`${fid}__to_${i}`,opts,x.to||'',`data-duplicate-part="to" data-duplicate-index="${i}"`)}</label></div><button type="button" class="btn btn-small duplicate-entry-remove" data-duplicate-remove="${i}">Eliminar</button></div>`).join(''):'<div class="empty duplicate-entry-empty"><p>No hay reintroducciones confirmadas.</p></div>';
  const draftHtml=drafts.length?`<div class="duplicate-entry-drafts"><div class="duplicate-entry-heading"><b>Pendientes de confirmar</b><span>Completa los tres datos antes de convertirlos en una reintroducción real.</span></div>${drafts.map((x,i)=>`<div class="duplicate-entry-row duplicate-entry-draft" data-duplicate-draft-row="${i}"><div class="duplicate-entry-fields"><label><span>Información afectada</span><input class="detail-input" data-duplicate-draft-part="data" data-duplicate-draft-index="${i}" value="${attr(x.data||'')}" placeholder="Ej. Datos de la factura"></label><label><span>Disponible originalmente en</span>${canonicalSelect(`${fid}__draft_from_${i}`,opts,x.from||'',`data-duplicate-draft-part="from" data-duplicate-draft-index="${i}"`)}</label><label><span>Se vuelve a introducir en</span>${canonicalSelect(`${fid}__draft_to_${i}`,opts,x.to||'',`data-duplicate-draft-part="to" data-duplicate-draft-index="${i}"`)}</label></div><div class="row-actions duplicate-entry-draft-actions"><button type="button" class="btn btn-small btn-primary" data-duplicate-draft-confirm="${i}" ${duplicateEntryComplete(x)?'':'disabled'}>Confirmar reintroducción</button><button type="button" class="btn btn-small" data-duplicate-draft-remove="${i}">Descartar</button></div></div>`).join('')}</div>`:'';
  return `<div class="duplicate-entry-control" data-duplicate-field="${fid}"><div class="field-help">Una reintroducción sólo se registra cuando están identificados la información, el origen y el destino. Las detecciones incompletas permanecen como pendientes.</div>${suggestionHtml}${draftHtml}<div class="duplicate-entry-list">${rowHtml}</div><button type="button" class="btn btn-small btn-outline duplicate-entry-add" data-duplicate-add="${fid}">+ Añadir reintroducción</button></div>`;
}
// DF054 (Integration_Gaps): SYSTEM_SUGGEST_THEN_CONFIRM authorizes the suggest+confirm interaction
// pattern, not any inference algorithm — the canonical Reuse_From only names the SOURCES (tools per
// step, handoffs/communication channels, manual actions/copy-rekey), not a gap-detection rule. This
// builds a NEUTRAL candidate list from exactly those sources; it never labels a pair a "gap" itself —
// only the consultant's checkbox confirmation writes into DF054 (an array of confirmed candidate ids,
// re-describable from live process-step data — no new stored object shape).
function stepSystemHandoffCandidates(e){
  const steps=(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const duplicatePairs=new Set(duplicateEntryRows(e.answers?.DF051).map(x=>String(x.from)+':'+String(x.to)));
  const items=[];
  // DF054 is not another duplicate-entry question. Surface only actual cross-system handoffs.
  // Manual actions/channels are evidence for review, not standalone "integration gaps".
  for(let i=0;i<steps.length-1;i++){
    const a=steps[i],b=steps[i+1];
    if(!a.tool||!b.tool||String(a.tool)===String(b.tool))continue;
    if(duplicatePairs.has(String(a.id)+':'+String(b.id)))continue; // already captured by DF051
    items.push({value:`pair:${a.id}:${b.id}`,label:`${optionLabel('OS_TOOL_CATEGORY',a.tool)} → ${optionLabel('OS_TOOL_CATEGORY',b.tool)} · ${a.step_name||a.id} → ${b.step_name||b.id}`});
  }
  return items;
}
function stepSystemPairSelector(fid,e,val){
  const items=stepSystemHandoffCandidates(e);
  if(!items.length)return '<div class="empty integration-empty"><p>No hay intercambios manuales entre sistemas distintos pendientes de revisar.</p></div>';
  return `<div class="notice info integration-guidance"><b>Intercambios entre sistemas detectados</b><br>Selecciona únicamente aquellos en los que hoy una persona tiene que trasladar información manualmente. Las reintroducciones del mismo dato se registran en el bloque anterior y no se duplican aquí.</div><div class="integration-candidates">${multiChoices(fid,items,val)}</div>`;
}
function frictionPriority(fid,e,val){
  const items=e.frictions.filter(x=>x.status!=='SUPERSEDED').map(x=>({value:x.id,label:labelFrom('OS_FRICTION_TYPE',x.friction_type)}));return multiChoices(fid,items,val);
}
function structuredRedirect(label,page){return `<div class="notice info"><strong>${esc(label)}</strong><br>Se gestiona en su editor estructurado para conservar trazabilidad. <button type="button" class="btn btn-small" data-page="${page}">Abrir editor</button></div>`}

// DF098 (Next_Step): DROPDOWN_WITH_OWNER_DATE confirms the acción+owner+fecha UX, but the confirmed
// physical contract (deliverable_models.py: next_step: str | None) expects a plain string, not an
// object — so this composes 3 sub-controls (dedicated data-nextstep-* attributes, not the generic
// data-answer/data-detail-answer binders, to avoid them fighting over the same field) but serializes to
// the canonical "<acción> — <owner> — <fecha dd/mm/aaaa>" string (matching Ejemplo_ES) only once all
// three pieces are present. Nothing is written to answers.DF098 while incomplete.
function currentSelectedConsultantName(){
  if(typeof currentAuneaOwnerName==='function'){
    const value=currentAuneaOwnerName();
    if(value)return value;
  }
  const visible=typeof document!=='undefined'?document.querySelector?.('.user-chip b')?.textContent?.trim():'';
  if(visible)return visible;
  if(typeof AUNEA_DEFAULT_PROJECT_OWNER!=='undefined'&&AUNEA_DEFAULT_PROJECT_OWNER?.name)return AUNEA_DEFAULT_PROJECT_OWNER.name;
  return 'Consultor AUNEA';
}
function nextStepWithOwnerDate(f,opts,e){
  const fid=f.Field_ID,d=answerDetails(e);
  const actionValue=d[`${fid}__action`]||'',owner=currentSelectedConsultantName(),dateVal=d[`${fid}__date`]||'',otherDetail=d[`${fid}__other`]||'';
  const actionSelect=canonicalSelect(`${fid}__action`,opts,actionValue,`data-nextstep-action="${fid}"`);
  const otherBox=actionValue==='OTHER'?`<div class="nextstep-other-wrap"><input class="detail-input" data-nextstep-other="${fid}" value="${attr(otherDetail)}" placeholder="Detalle corto de la acción"></div>`:'';
  return `<div class="nextstep-inline" data-nextstep-row="${fid}">
    <div class="nextstep-cell nextstep-action"><span class="nextstep-cell-label">Acción acordada</span>${actionSelect}</div>
    <div class="nextstep-cell nextstep-owner"><span class="nextstep-cell-label">Responsable</span><input class="detail-input" data-nextstep-owner="${fid}" value="${attr(owner)}" readonly aria-readonly="true" title="Consultor AUNEA seleccionado en la cabecera"></div>
    <div class="nextstep-cell nextstep-date"><span class="nextstep-cell-label">Fecha objetivo</span><input type="date" lang="es-ES" data-nextstep-date="${fid}" value="${attr(dateVal)}"><small class="date-es-preview" data-nextstep-date-preview="${fid}">${dateVal?esc(formatDateEs(dateVal)):''}</small></div>
  </div>${otherBox}`;
}
function nextStepActionText(fid,e){
  const d=answerDetails(e),actionValue=d[`${fid}__action`]||'';
  if(!actionValue)return '';
  if(actionValue==='OTHER')return d[`${fid}__other`]||'';
  const box=document.querySelector(`[data-aunea-select="${fid}__action"]`);
  const label=box?.querySelector('summary span')?.textContent?.trim();
  return label||actionValue;
}
function syncNextStep(fid){
  const e=currentEng();if(!e)return;
  const d=answerDetails(e),actionText=nextStepActionText(fid,e),owner=currentSelectedConsultantName(),dateVal=d[`${fid}__date`]||'';
  d[`${fid}__owner`]=owner;
  const dateEs=dateVal?formatDateEs(dateVal):'';
  const preview=typeof document!=='undefined'?document.querySelector(`[data-nextstep-date-preview="${fid}"]`):null;
  if(preview)preview.textContent=dateEs;
  setAnswer(fid,(actionText&&owner&&dateEs)?`${actionText} — ${owner} — ${dateEs}`:'');
}

function permissionWithScope(fid,opts,val){
  const yes=String(val)==='YES';
  return `<div class="permission-inline" data-permission-row="${fid}">
    <div class="permission-choice">${segmented(fid,opts,val,'data-permission-segment')}</div>
    <div class="permission-scope" data-permission-scope="${fid}"${yes?'':' hidden'}>${detailInput(fid,'Alcance / condición del permiso')}</div>
  </div>`;
}


function s08PriorContext(e){
  const values=selectedValues(e?.answers?.DF010).filter(Boolean);
  if(!values.length)return '';
  const labels=values.map(v=>labelFrom('OS_CONSTRAINT_TYPE',v)||v);
  return '<div class="reuse-context s08-prior-context"><div><strong>Restricciones ya declaradas en Contexto</strong><small>'+labels.map(esc).join(' · ')+'</small></div></div>';
}
function s08ReferenceControl(fid,items,val,e){
  const base=multiChoices(fid,items,val,{other:hasCanonicalOtherOption(items)});
  const selected=selectedValues(val),details=answerDetails(e),refs=details[`${fid}__references`]||{};
  if(!selected.length)return base+s08PriorContext(e);
  const rows=selected.map(v=>{
    const label=items.find(x=>String(x.value)===String(v))?.label||v;
    return '<label class="s08-detail-row"><span>'+esc(label)+' — referencia concreta</span><input type="text" data-s08-reference="'+fid+'" data-s08-key="'+attr(v)+'" value="'+attr(refs[v]||'')+'" placeholder="Elemento existente que debe mantenerse"></label>';
  }).join('');
  return base+s08PriorContext(e)+'<div class="linked-field-block"><div class="linked-step-label">Referencia el elemento existente; no se crea uno nuevo aquí.</div>'+rows+'</div>';
}
function s08PreferenceControl(fid,items,val,e,modes){
  const base=multiChoices(fid,items,val,{other:hasCanonicalOtherOption(items)});
  const selected=selectedValues(val),details=answerDetails(e),saved=details[`${fid}__preference`]||{};
  if(!selected.length)return base+s08PriorContext(e);
  const modeOpts=modes.map(([value,label])=>({value,label}));
  const rows=selected.map(v=>{
    const label=items.find(x=>String(x.value)===String(v))?.label||v;
    return '<div class="s08-detail-row"><span>'+esc(label)+'</span>'+auneaSelectControl(`${fid}__pref__${v}`,modeOpts,saved[v]||'',{extra:`data-s08-preference="${fid}" data-s08-key="${attr(v)}"`,placeholder:'Clasifica…'})+'</div>';
  }).join('');
  return base+s08PriorContext(e)+'<div class="linked-field-block"><div class="linked-step-label">Clasificación de cada restricción seleccionada</div>'+rows+'</div>';
}
function s08ChangeDetailControl(fid,items,val,e){
  const base=multiChoices(fid,items,val,{other:hasCanonicalOtherOption(items)});
  const selected=selectedValues(val),details=answerDetails(e),saved=details[`${fid}__details`]||{};
  if(!selected.length)return base+s08PriorContext(e);
  const rows=selected.map(v=>{
    const label=items.find(x=>String(x.value)===String(v))?.label||v;
    return '<label class="s08-detail-row"><span>'+esc(label)+' — detalle si cambia el plan</span><input type="text" data-s08-change-detail="'+fid+'" data-s08-key="'+attr(v)+'" value="'+attr(saved[v]||'')+'" placeholder="Detalle opcional"></label>';
  }).join('');
  return base+s08PriorContext(e)+'<div class="linked-field-block">'+rows+'</div>';
}
function renderControl(f,val,opts,e){
  const c=String(f.Control_UI||'').toUpperCase(),fid=f.Field_ID;
  if(fid==='DF087')return s08ReferenceControl(fid,opts,val,e);
  if(fid==='DF089')return s08PreferenceControl(fid,opts,val,e,[['REQUIRED','Obligatorio'],['PREFERRED','Preferido'],['INDIFFERENT','Indiferente']]);
  if(fid==='DF090')return s08PreferenceControl(fid,opts,val,e,[['REQUIRED','Obligatorio'],['PREFERRED','Preferido']]);
  if(fid==='DF091')return s08ChangeDetailControl(fid,opts,val,e);
  if(c==='CRM_REFERENCE_OR_TEXT')return canonicalSelect(fid,state.companies.map(x=>({value:x.name,label:x.name})),val);
  if(c==='CONTACT_REFERENCE')return canonicalSelect(fid,referenceableContacts(e).map(x=>({value:x.id,label:`${referenceContactLabel(x)}${x.role?' · '+x.role:''}`})),val);
  if(c==='CONTACT_MULTISELECT'){
    const choices=multiChoices(fid,referenceableContacts(e).map(x=>({value:x.id,label:`${referenceContactLabel(x)}${x.role?' · '+x.role:''}`})),val);
    return choices+(fid==='DF007'?'<div class="detail-wrap"><button type="button" class="btn btn-small" data-create-contact-for-field="DF007">Crear contacto y añadirlo</button></div>':'');
  }
  if(c==='CONTACT_OR_ROLE_REFERENCE'){
    const ownerOpts=referenceableContacts(e).map(x=>({value:x.id,label:`${referenceContactLabel(x)}${x.role?' · '+x.role:''}`}));
    ownerOpts.push({value:'OTHER',label:'Otro'});
    const otherSelected=String(val)==='OTHER';
    return `<div class="compound-control owner-reference-control">${canonicalSelect(fid,ownerOpts,val,`data-owner-reference="${fid}"`)}</div><div class="detail-wrap" data-owner-other-wrap="${fid}"${otherSelected?'':' style="display:none"'}>${detailInput(fid,'Nombre o rol del responsable del proceso')}</div>`;
  }
  if(c==='SEARCHABLE_DROPDOWN')return searchableSelect(f,val,opts);
  if(c==='DROPDOWN')return canonicalSelect(fid,opts,val);
  if(c==='DROPDOWN_WITH_DETAIL'){
    if(fid==='DF024'){
      const material=['PREDICTABLE','IRREGULAR','STRONG'].includes(String(val||''));
      return canonicalSelect(fid,opts,val,`data-seasonality-select="${fid}"`)
        +`<div class="detail-wrap" data-seasonality-detail="${fid}"${material?'':' style="display:none"'}>${detailInput(fid,'Periodo / causa si aplica')}</div>`;
    }
    return selectWithConditionalDetail(fid,opts,val,'Detalle si aplica');
  }
  if(c==='DROPDOWN_WITH_OWNER_DATE')return nextStepWithOwnerDate(f,opts,e);
  if(c==='DROPDOWN_WITH_STEP_LINK')return canonicalSelect(fid,opts,val)+stepSingle(`${fid}__step`,e,answerDetails(e)[`${fid}__step`]||'');
  if(c==='COMBOBOX_WITH_DETAIL')return selectWithConditionalDetail(fid,opts,val,'Detalle / nombre concreto');
  if(c==='COMBOBOX_REFERENCE')return selectWithConditionalDetail(fid,opts,val,'Nueva referencia sólo si no existe');
  if(c==='MULTISELECT'||c==='MULTICHECK'||c==='MULTISELECT_REFERENCE'||c==='SYSTEM_GENERATED_MULTISELECT')return multiChoices(fid,opts,val,{other:hasCanonicalOtherOption(opts)});
  if(c==='MULTISELECT_WITH_OTHER'||c==='MULTICHECK_WITH_OTHER')return multiChoices(fid,opts,val,{other:true});
  if(c==='MULTISELECT_WITH_DETAIL'||c==='MULTICHECK_WITH_DETAIL'||c==='MULTISELECT_WITH_REFERENCE')return hasCanonicalOtherOption(opts)?multiChoices(fid,opts,val,{other:true}):multiChoices(fid,opts,val,{detail:true});
  if(c==='MULTISELECT_WITH_PRIORITY')return multiChoicesWithPriority(fid,opts,val,e);
  if(fid==='DF088'&&c==='MULTISELECT_WITH_STEP_REFERENCE')return multiChoices(fid,opts,val,{other:true,linkedSteps:{fid:`${fid}__steps`,items:stepOptions(e),val:answerDetails(e)[`${fid}__steps`]||[]}});
  if(fid==='DF075'&&c==='STEP_ACTION_MULTISELECT'){
    const choices=multiChoices(fid,opts,val,{other:hasCanonicalOtherOption(opts)});
    const linked=answerDetails(e).DF075__steps||e.answers?.DF075__steps||[];
    const steps=linkedStepMulti('DF075__steps',e,linked);
    return '<div class="linked-field-block"><div class="linked-step-label">Acciones que requieren validación humana</div>'+choices
      +'<div class="linked-step-group"><div class="linked-step-label">Pasos donde aplica</div>'+steps+'</div></div>';
  }
  if(c==='MULTISELECT_WITH_STEP_LINK'||c==='MULTISELECT_WITH_STEP_REFERENCE'||c==='STEP_ACTION_MULTISELECT'){
    const choices=multiChoices(fid,opts,val,hasCanonicalOtherOption(opts)?{other:true}:{detail:true});
    const showSteps=fid!=='DF055'||valuePresent(val);
    return choices+(showSteps?`<div class="linked-step-group"><div class="linked-step-label">${fid==='DF055'?'¿En qué pasos ocurre?':'Pasos afectados'}</div>${stepMulti(`${fid}__steps`,e,answerDetails(e)[`${fid}__steps`]||[])}</div>`:'');
  }
  if(c==='STEP_MULTISELECT_VISUAL'||c==='STEP_MULTISELECT_WITH_FRICTION')return stepMulti(fid,e,val);
  if(c==='STEP_REFERENCE_SINGLE')return stepSingle(fid,e,val);
  if(c==='STEP_PAIR_SELECTOR')return stepPair(fid,e,val);
  if(c==='STEP_PAIR_LIST_SELECTOR')return duplicateEntryControl(fid,e,val);
  if(c==='STEP_SYSTEM_PAIR_SELECTOR')return stepSystemPairSelector(fid,e,val);
  if(c==='FRICTION_MULTISELECT_PRIORITY')return frictionPriority(fid,e,val);
  if(c==='BOOLEAN_UNKNOWN_WITH_SCOPE')return permissionWithScope(fid,opts,val);
  if(c==='BOOLEAN_UNKNOWN'||c==='SEGMENTED'||c==='SEGMENTED_SCALE')return segmented(fid,opts,val);
  if(c==='DATE_WITH_UNKNOWN'){
    const unknown=val==='UNKNOWN';
    return `<div class="compound-control date-with-preview"><input type="date" lang="es-ES" data-answer="${fid}" value="${attr(unknown?'':val||'')}" ${unknown?'disabled aria-disabled="true"':''}><button type="button" class="btn btn-small ${unknown?'is-selected':''}" aria-pressed="${unknown}" data-set-unknown="${fid}">${unknown?'✓ No disponible':'No disponible'}</button>${val&&!unknown?'<small class="date-es-preview">'+esc(formatDateEs(val))+'</small>':''}</div>`;
  }
  if(c.startsWith('NUMBER')||c.startsWith('PERCENT'))return numberCompound(f,val);
  // DF080/DF081: Ask_Mode:CONDITIONAL_ASK means "ask when it can't be derived and it's material" — no
  // governed formula aggregates manual_actions=CHASE/REPORT or friction types P06/P07/P09/P12/P14/P18
  // into hours (same class of gap already documented for wait_time annualization), so this stays a
  // manual entry. It reuses the existing NUMBER_WITH_TIME_UNIT widget (min/h/día/semana), the same one
  // already canonical for equivalent time-quantification fields — Validation/Ejemplo_ES below the
  // control already state the case/period convention, so no new unit vocabulary is introduced.
  if(c==='DERIVED_OR_CONDITIONAL')return numberCompound({...f,Control_UI:'NUMBER_WITH_TIME_UNIT'},val);
  if(c==='REFERENCE_OR_SHORT_TEXT'||c==='TEXT_SHORT')return `<input data-answer="${fid}" value="${attr(val||'')}" maxlength="200" placeholder="Respuesta breve">`;
  if(c==='TEXT_LONG')return `<textarea data-answer="${fid}" placeholder="Describe las decisiones o acciones difíciles de revertir">${esc(val||'')}</textarea>`;
  if(c==='TEXT_LONG_INTERNAL')return `<textarea data-answer="${fid}" class="internal-only" placeholder="Notas internas; no se muestran en Modo Sesión">${esc(val||'')}</textarea>`;
  if(c==='CLIENT_CONFIRMATION_WITH_INLINE_EDIT')return `<div class="notice ${e.confirmedAsIs?'good':'warn'}">${e.confirmedAsIs?'Flujo AS-IS confirmado.':'Pendiente de confirmar el AS-IS.'} <button type="button" class="btn btn-small" data-page="proceso">Revisar / editar</button></div>`;
  if(c==='RISK_BUILDER')return structuredRedirect('Riesgo estructurado','diagnostico');
  if(['ROLE_CAPACITY_TABLE','ROLE_RATE_TABLE','MONETARY_EVENT_TABLE','TOOL_COST_TABLE'].includes(c))return structuredRedirect('Input económico estructurado','diagnostico');
  if(c==='FRICTION_TYPE_SELECT_WITH_CLIENT_LABEL'||c==='EXCEPTION_BUILDER')return structuredRedirect('Registro estructurado','proceso');
  if(c==='SYSTEM_GENERATED_CHECKLIST'){
    const items=normalizeArray(val).filter(Boolean);
    const followup=fid==='DF095'&&e?.answers?.DF098?'<small class="readonly-checklist-followup"><b>Seguimiento acordado:</b> '+esc(e.answers.DF098)+'</small>':'';
    return '<div class="readonly-checklist">'+(items.length?'<ul class="readonly-checklist-list">'+items.map(x=>'<li class="readonly-checklist-item">'+esc(x)+'</li>').join('')+'</ul>':'<div class="readonly-checklist-item">Sin elementos pendientes</div>')+followup+'</div>';
  }
  if(c.startsWith('DERIVED')||c.startsWith('SYSTEM_GENERATED'))return `<div class="readonly-box">${esc(val||'Se completará automáticamente cuando existan datos suficientes.')}</div>`;
  return `<div class="notice warn control-error"><strong>Control canónico no renderizado:</strong> ${esc(c||'SIN_CONTROL')} · ${esc(fid)}. No se degrada a texto libre.</div>`;
}

if(typeof document!=='undefined'&&typeof document.addEventListener==='function'&&!document.__auneaCanonicalDelegatedBound){
  document.__auneaCanonicalDelegatedBound=true;
  document.addEventListener('click',ev=>{
    const option=ev.target.closest?.('[data-aunea-select-option]');
    if(option){
      ev.preventDefault();ev.stopPropagation();
      const id=option.dataset.auneaSelectOption,input=document.getElementById(id),box=option.closest('details.aunea-select');
      if(input){
        input.value=option.dataset.value||'';
        box?.querySelectorAll('[data-aunea-select-option]').forEach(x=>x.classList.toggle('selected',x===option));
        const label=box?.querySelector('summary span');if(label)label.textContent=option.dataset.label||option.textContent||'';
        if(box)box.open=false;
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }
      return;
    }
    const btn=ev.target.closest?.('[data-create-contact-for-field]');
    if(!btn)return;
    ev.preventDefault();ev.stopPropagation();
    if(typeof addContactForEngagementField==='function')addContactForEngagementField(btn.dataset.createContactForField);
  });
  document.addEventListener('input',ev=>{
    const search=ev.target.closest?.('[data-aunea-select-search]');
    if(!search)return;
    const box=search.closest('details.aunea-select'),term=search.value.trim().toLocaleLowerCase('es');
    box?.querySelectorAll('[data-aunea-select-option]').forEach(btn=>{btn.style.display=!term||String(btn.dataset.label||btn.textContent||'').toLocaleLowerCase('es').includes(term)?'':'none'});
  });
  document.addEventListener('toggle',ev=>{
    const box=ev.target?.matches?.('details.aunea-select')?ev.target:null;
    if(!box||!box.open)return;
    document.querySelectorAll('details.aunea-select[open]').forEach(other=>{if(other!==box)other.open=false});
    const search=box.querySelector('[data-aunea-select-search]');if(search){search.value='';box.querySelectorAll('[data-aunea-select-option]').forEach(btn=>btn.style.display='');setTimeout(()=>search.focus(),0)}
  },true);
  document.addEventListener('click',ev=>{
    if(ev.target.closest?.('details.aunea-select'))return;
    document.querySelectorAll('details.aunea-select[open]').forEach(box=>box.open=false);
  });
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')document.querySelectorAll('details.aunea-select[open]').forEach(box=>box.open=false)});
  document.addEventListener('input',ev=>{
    const el=ev.target.closest?.('[data-s08-reference],[data-s08-change-detail]');
    if(!el)return;
    const fid=el.dataset.s08Reference||el.dataset.s08ChangeDetail,key=el.dataset.s08Key,e=currentEng(),d=answerDetails(e);
    const bucket=el.dataset.s08Reference?`${fid}__references`:`${fid}__details`;
    d[bucket]={...(d[bucket]||{}),[key]:el.value};e.updatedAt=now();markDirty(`Detalle ${fid} actualizado`);
  });
  document.addEventListener('change',ev=>{
    const el=ev.target.closest?.('[data-s08-preference]');
    if(!el)return;
    const fid=el.dataset.s08Preference,key=el.dataset.s08Key,e=currentEng(),d=answerDetails(e);
    d[`${fid}__preference`]={...(d[`${fid}__preference`]||{}),[key]:el.value};e.updatedAt=now();markDirty(`Clasificación ${fid} actualizada`);
  });
  document.addEventListener('change',ev=>{
    const el=ev.target.closest?.('[data-other-toggle]');
    if(!el)return;
    const fid=el.dataset.otherToggle,wrap=document.querySelector(`[data-detail-wrap="${fid}"]`);
    if(!wrap)return;
    wrap.hidden=!el.checked;
    wrap.style.display=el.checked?'':'none';
    if(!el.checked)setAnswerDetail(fid,'');
  });
  document.addEventListener('change',ev=>{
    const el=ev.target.closest?.('[data-seasonality-select]');
    if(!el)return;
    const fid=el.dataset.seasonalitySelect,wrap=document.querySelector(`[data-seasonality-detail="${fid}"]`);
    if(!wrap)return;
    const material=['PREDICTABLE','IRREGULAR','STRONG'].includes(String(el.value||''));
    wrap.hidden=!material;wrap.style.display=material?'':'none';
    if(!material)setAnswerDetail(fid,'');
  });
  document.addEventListener('change',ev=>{
    const el=ev.target.closest?.('[data-conditional-other-select]');
    if(!el)return;
    const fid=el.dataset.conditionalOtherSelect,wrap=document.querySelector(`[data-detail-wrap="${fid}"]`);
    if(!wrap)return;
    const isOther=String(el.value)===String(el.dataset.otherValue||'OTHER');
    wrap.hidden=!isOther;wrap.style.display=isOther?'':'none';
    if(!isOther)setAnswerDetail(fid,'');
  });
}

function bindCanonicalRenderer(){
  document.querySelectorAll('[data-owner-reference]').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.ownerReference,wrap=document.querySelector(`[data-owner-other-wrap="${fid}"]`);
    if(wrap)wrap.style.display=el.value==='OTHER'?'':'none';
    if(el.value!=='OTHER')setAnswerDetail(fid,'');
    if(typeof refreshCaptureProgress==='function')refreshCaptureProgress();
  }));

  document.querySelectorAll('[data-detail-answer]').forEach(el=>el.addEventListener('input',()=>setAnswerDetail(el.dataset.detailAnswer,el.value)));
  document.querySelectorAll('[data-linked-step-single]').forEach(el=>el.addEventListener('change',()=>{
    const e=currentEng(),fid=el.dataset.linkedStepSingle,d=answerDetails(e);
    d[fid]=el.value||'';e.updatedAt=now();markDirty('Ámbito de paso actualizado');
    if(typeof refreshCaptureProgress==='function')refreshCaptureProgress();
  }));
  document.querySelectorAll('[data-linked-step-multi]').forEach(el=>el.addEventListener('change',()=>{
    const e=currentEng(),fid=el.dataset.linkedStepMulti,d=answerDetails(e);
    d[fid]=[...document.querySelectorAll(`[data-linked-step-multi="${fid}"]:checked`)].map(x=>x.value);
    e.updatedAt=now();markDirty('Ámbito de pasos actualizado');
    if(typeof refreshCaptureProgress==='function')refreshCaptureProgress();
  }));
  document.querySelectorAll('[data-linked-step-single]').forEach(el=>el.addEventListener('change',()=>{
    const e=currentEng(),fid=el.dataset.linkedStepSingle,d=answerDetails(e);
    d[fid]=el.value||'';
    if(fid==='DF074__step'){delete d.DF074__steps;delete e.answers?.DF074__steps;}
    e.updatedAt=now();markDirty('Ámbito de paso actualizado');if(typeof refreshCaptureProgress==='function')refreshCaptureProgress();
  }));
  document.querySelectorAll('[data-linked-step-multi]').forEach(el=>el.addEventListener('change',()=>{
    const e=currentEng(),fid=el.dataset.linkedStepMulti,d=answerDetails(e);
    d[fid]=[...document.querySelectorAll(`[data-linked-step-multi="${fid}"]:checked`)].map(x=>x.value);
    if(Object.prototype.hasOwnProperty.call(e.answers||{},fid))delete e.answers[fid];
    e.updatedAt=now();markDirty('Ámbito de pasos actualizado');if(typeof refreshCaptureProgress==='function')refreshCaptureProgress();
  }));
  document.querySelectorAll('[data-multi="DF086"]').forEach(el=>el.addEventListener('change',()=>{
    const fid='DF086';
    let selected=[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value);
    if(selected.length>5){
      el.checked=false;
      selected=[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value);
      setAnswer(fid,selected);
      if(typeof toast==='function')toast('Selecciona como máximo 5 resultados.');
    }
    const e=currentEng(),details=answerDetails(e),before=selectedValues(details[`${fid}_priority`]);
    const ordered=[...before.filter(v=>selected.includes(v)),...selected.filter(v=>!before.includes(v))];
    const next=ordered.slice(0,Math.min(3,selected.length));
    if(JSON.stringify(before)!==JSON.stringify(next)){details[`${fid}_priority`]=next;e.updatedAt=now();markDirty('Prioridades DF086 actualizadas');}
    render();
  }));
  document.querySelectorAll('[data-priority-move]').forEach(btn=>btn.onclick=()=>{
    const fid=btn.dataset.priorityMove,e=currentEng(),selected=selectedValues(e?.answers?.[fid]);
    const ordered=prioritySelectionOrder(fid,selected,e),value=btn.dataset.priorityValue;
    const from=ordered.indexOf(value),to=from+Number(btn.dataset.priorityDirection||0);
    if(from<0||to<0||to>=ordered.length)return;
    [ordered[from],ordered[to]]=[ordered[to],ordered[from]];
    answerDetails(e)[`${fid}_priority`]=ordered.slice(0,Math.min(3,selected.length));
    e.updatedAt=now();markDirty(`Prioridad ${fid} reordenada`);render();
  });
  document.querySelectorAll('[data-permission-segment]').forEach(btn=>btn.onclick=()=>{
    const fid=btn.dataset.permissionSegment,value=btn.dataset.value||'';
    setAnswer(fid,value);
    if(value!=='YES')setAnswerDetail(fid,'');
    render();
  });
  document.querySelectorAll('[data-nextstep-action]').forEach(el=>el.addEventListener('change',()=>{const fid=el.dataset.nextstepAction;answerDetails(currentEng())[`${fid}__action`]=el.value;syncNextStep(fid);render()}));
  document.querySelectorAll('[data-nextstep-other]').forEach(el=>el.addEventListener('input',()=>{const fid=el.dataset.nextstepOther;answerDetails(currentEng())[`${fid}__other`]=el.value;syncNextStep(fid)}));
  document.querySelectorAll('[data-nextstep-date]').forEach(el=>el.addEventListener('change',()=>{const fid=el.dataset.nextstepDate;answerDetails(currentEng())[`${fid}__date`]=el.value;syncNextStep(fid)}));
  const safeNumericValue=el=>{
    if(!el||String(el.value??'').trim()==='')return '';
    const native=Number(el.valueAsNumber);
    if(Number.isFinite(native))return native;
    const fallback=Number(String(el.value).replace(',','.'));
    return Number.isFinite(fallback)?fallback:null;
  };
  document.querySelectorAll('[data-sla-mode]').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.slaMode,wrap=document.querySelector(`[data-sla-value-wrap="${fid}"]`);
    if(!wrap)return;
    const none=el.value==='NONE';
    wrap.hidden=none;
    if(none){
      const valueEl=document.querySelector(`[data-number-value="${fid}"]`);
      const unitEl=document.querySelector(`[data-number-unit="${fid}"]`);
      if(valueEl)valueEl.value='';
      if(unitEl)unitEl.value='';
    }
  }));
  document.querySelectorAll('[data-percent-count-unit]').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.percentCountUnit,wrap=document.querySelector(`[data-count-period-wrap="${fid}"]`),period=document.querySelector(`[data-number-period="${fid}"]`);
    const count=el.value==='count';
    if(wrap)wrap.hidden=!count;
    if(!count&&period)period.value='';
  }));
  const numberFids=[...new Set([...document.querySelectorAll('[data-number-value],[data-number-unit],[data-number-period],[data-number-mode]')].map(x=>x.dataset.numberValue||x.dataset.numberUnit||x.dataset.numberPeriod||x.dataset.numberMode))];
  numberFids.forEach(fid=>{const sync=()=>{
    const valueEl=document.querySelector(`[data-number-value="${fid}"]`),value=safeNumericValue(valueEl),unit=document.querySelector(`[data-number-unit="${fid}"]`)?.value??'',rawPeriod=document.querySelector(`[data-number-period="${fid}"]`)?.value??'',period=unit==='percent'?'':rawPeriod,mode=document.querySelector(`[data-number-mode="${fid}"]`)?.value??'';
    if(value===null)return;
    if(fid==='DF021'){setAnswer(fid,value);return}
    if(value===''&&!mode){setAnswer(fid,'');return}
    const semanticEmpty=mode==='UNKNOWN'||mode==='NONE',normalizedValue=mode==='ZERO'?0:semanticEmpty?'':value,normalizedUnit=semanticEmpty?'':unit,normalizedPeriod=semanticEmpty?'':period;
    if(semanticEmpty&&valueEl)valueEl.value='';
    setAnswer(fid,{value:normalizedValue,unit:normalizedUnit,period:normalizedPeriod,mode});
  };document.querySelectorAll(`[data-number-value="${fid}"]`).forEach(el=>el.addEventListener('input',sync));document.querySelectorAll(`[data-number-unit="${fid}"],[data-number-period="${fid}"],[data-number-mode="${fid}"]`).forEach(el=>el.addEventListener('change',sync))});
  document.querySelectorAll('[data-set-unknown]').forEach(b=>b.onclick=()=>{const fid=b.dataset.setUnknown;setAnswer(fid,currentEng()?.answers?.[fid]==='UNKNOWN'?'':'UNKNOWN');render()});
  const pairFids=[...new Set([...document.querySelectorAll('[data-pair-field]')].map(x=>x.dataset.pairField))];pairFids.forEach(fid=>document.querySelectorAll(`[data-pair-field="${fid}"]`).forEach(el=>el.addEventListener('change',()=>{const p={};document.querySelectorAll(`[data-pair-field="${fid}"]`).forEach(x=>p[x.dataset.pairPart]=x.value);setAnswer(fid,p)})));
  document.querySelectorAll('[data-duplicate-add]').forEach(btn=>btn.onclick=()=>{const fid=btn.dataset.duplicateAdd,e=currentEng(),drafts=duplicateEntryDraftRows(e,fid,e.answers?.[fid]);setAnswer(fid,duplicateEntryRows(e.answers?.[fid]));saveDuplicateEntryDraftRows(e,fid,[...drafts,{data:'',from:'',to:''}]);render()});
  document.querySelectorAll('[data-duplicate-part]').forEach(el=>el.addEventListener(el.tagName==='INPUT'?'input':'change',()=>{const e=currentEng(),fid='DF051',rows=duplicateEntryRows(e.answers?.[fid]),i=Number(el.dataset.duplicateIndex);if(!rows[i])return;rows[i]={...rows[i],[el.dataset.duplicatePart]:el.value};setAnswer(fid,rows)}));
  document.querySelectorAll('[data-duplicate-remove]').forEach(btn=>btn.onclick=()=>{const e=currentEng(),fid='DF051',rows=duplicateEntryRows(e.answers?.[fid]);rows.splice(Number(btn.dataset.duplicateRemove),1);setAnswer(fid,rows);render()});
  document.querySelectorAll('[data-duplicate-draft-part]').forEach(el=>el.addEventListener(el.tagName==='INPUT'?'input':'change',()=>{const e=currentEng(),fid='DF051',drafts=duplicateEntryDraftRows(e,fid,e.answers?.[fid]),i=Number(el.dataset.duplicateDraftIndex);if(!drafts[i])return;drafts[i]={...drafts[i],[el.dataset.duplicateDraftPart]:el.value};setAnswer(fid,duplicateEntryRows(e.answers?.[fid]));saveDuplicateEntryDraftRows(e,fid,drafts);if(el.tagName!=='INPUT')render()}));
  document.querySelectorAll('[data-duplicate-draft-confirm]').forEach(btn=>btn.onclick=()=>{const e=currentEng(),fid='DF051',drafts=duplicateEntryDraftRows(e,fid,e.answers?.[fid]),i=Number(btn.dataset.duplicateDraftConfirm),row=drafts[i];if(!duplicateEntryComplete(row))return;const rows=duplicateEntryRows(e.answers?.[fid]);rows.push(row);drafts.splice(i,1);setAnswer(fid,rows);saveDuplicateEntryDraftRows(e,fid,drafts);render()});
  document.querySelectorAll('[data-duplicate-draft-remove]').forEach(btn=>btn.onclick=()=>{const e=currentEng(),fid='DF051',drafts=duplicateEntryDraftRows(e,fid,e.answers?.[fid]);drafts.splice(Number(btn.dataset.duplicateDraftRemove),1);setAnswer(fid,duplicateEntryRows(e.answers?.[fid]));saveDuplicateEntryDraftRows(e,fid,drafts);render()});
  document.querySelectorAll('[data-duplicate-confirm]').forEach(btn=>btn.onclick=()=>{const e=currentEng(),fid='DF051',rows=duplicateEntryRows(e.answers?.[fid]);rows.push({data:btn.dataset.duplicateData||'',dataKey:btn.dataset.duplicateDataKey||'',from:btn.dataset.duplicateFrom||'',to:btn.dataset.duplicateTo||''});setAnswer(fid,rows);render()});
  document.querySelectorAll('[data-duplicate-dismiss]').forEach(btn=>btn.onclick=()=>{const e=currentEng(),d=answerDetails(e),key='DF051__dismissed',items=new Set(normalizeArray(d[key]));items.add(btn.dataset.duplicateDismiss);d[key]=[...items];e.updatedAt=now();markDirty('Candidato de reintroducción descartado');render()});
  document.querySelectorAll('[data-multi][data-exclusive]').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.multi;
    if(el.checked)document.querySelectorAll(`[data-multi="${fid}"]`).forEach(other=>{if(other!==el)other.checked=false});
    setAnswer(fid,[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value));
  }));
  document.querySelectorAll('[data-multi]:not([data-exclusive])').forEach(el=>el.addEventListener('change',()=>{
    const fid=el.dataset.multi,exclusiveEl=document.querySelector(`[data-multi="${fid}"][data-exclusive]`);
    if(el.checked&&exclusiveEl&&exclusiveEl.checked){
      exclusiveEl.checked=false;
      setAnswer(fid,[...document.querySelectorAll(`[data-multi="${fid}"]:checked`)].map(x=>x.value));
    }
    if(fid==='DF055'){
      const hasSelection=!!document.querySelector('[data-multi="DF055"]:checked');
      if(!hasSelection){
        const e=currentEng(),d=answerDetails(e);delete d.DF055__steps;e.updatedAt=now();markDirty('Pasos afectados DF055 limpiados');
      }
      render();
    }
  }));
}
const __auneaBaseBindForms=bindForms;
bindForms=function(){__auneaBaseBindForms();bindCanonicalRenderer();};
// [AUNEA-FE-DIAG-RENDER-040] END
