// [AUNEA-FE-DIAG-CONTROL-030] START — Stage navigation shell and process/friction capture prompts
// PURPOSE: Stage navigation shell and process/friction capture prompts for the guided diagnostic flow. Option-set lookup helper.
// SOURCE: v1.0.4 aceptada; Diagnostic Master v1.2; DEC-034/040/050/051/056/059/060/062; IMG90-01 refined by DEC-062.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.
function fieldOptions(setId){return schema?.option_sets?.[setId]?.options||[]}

function diagnosticFieldMeta(f){return f.Requiredness==='REQUIRED_90M'?requiredMark():''}
function habitualVolumeBlock(f21,f22,e){
  const raw=effectiveValue(f21,e),value=(raw&&typeof raw==='object')?raw.value:raw,period=effectiveValue(f22,e),periods=fieldOptions(f22.Option_Set_ID||'OS_PERIOD');
  return `<div class="field full volume-pair demand-volume-primary" data-uat="UAT-VIS-023"><label>Volumen habitual${diagnosticFieldMeta(f21)}</label><div class="compound-control volume-sentence"><input type="number" inputmode="decimal" min="0" step="any" data-number-value="${f21.Field_ID}" value="${attr(value??'')}" placeholder="120" aria-label="Volumen habitual de casos"><span class="unit-label">casos por</span>${auneaSelectControl(f22.Field_ID,periods.map(o=>({value:o.value,label:String(o.label).toLowerCase()})),period,{extra:`data-answer="${f22.Field_ID}"`,placeholder:'Selecciona periodo…'})}</div><div class="field-help">${esc(f21.Objetivo_concreto||'')} ${esc(f22.Objetivo_concreto||'')}</div></div>`;
}
// [AUNEA-FE-DEMAND-SLA-CYCLE-143] START — Compare two distinct time measures, without interpreting compliance.
// SOURCE: Diagnostic Master DF025 SLA_Target vs DF026 Actual_Cycle_Time; Simulator CANONICAL PG03.
// INPUTS: existing RT_PROCESS answer owners; OUTPUT: read-only contextual comparison.
// SIDE EFFECTS: none; no new question, SLA rule, derived answer, or economic projection.
function s03ServiceTimeComparisonHtml(e){
  const target=numberParts(e?.answers?.DF025),cycle=numberParts(e?.answers?.DF026);
  const factor={min:1,h:60};
  const a=Number(cycle.value),b=Number(target.value);
  const comparable=target.mode!=='NONE'&&target.value!==''&&target.value!=null
    &&cycle.value!==''&&cycle.value!=null&&Number.isFinite(a)&&Number.isFinite(b)
    &&a>=0&&b>0&&factor[target.unit]&&factor[cycle.unit];
  let sentence='';
  if(target.mode==='NONE')sentence='No se ha declarado un SLA: no existe un objetivo con el que comparar el tiempo real.';
  else if(comparable){
    const comparison=a*factor[cycle.unit]<b*factor[target.unit]?'inferior al':
      a*factor[cycle.unit]>b*factor[target.unit]?'superior al':'igual al';
    sentence='En esta captura, el tiempo habitual declarado ('+esc(String(cycle.value))+' '+esc(cycle.unit)+') es '+comparison
      +' objetivo ('+esc(String(target.value))+' '+esc(target.unit)+').';
  } else if(target.value!==''&&target.value!=null&&!factor[target.unit])sentence='El SLA tiene un valor numérico, pero falta seleccionar una unidad válida (minutos u horas) antes de compararlo con el tiempo real.';
  else if(cycle.value!==''&&cycle.value!=null&&!factor[cycle.unit])sentence='El tiempo end-to-end necesita una unidad comparable (minutos u horas) para hacer el contraste.';
  else if(target.value!==''&&cycle.value!=='')sentence='Hay valores de tiempo, pero no pueden compararse automáticamente con una base temporal homogénea.';
  return '<strong>SLA frente a tiempo end-to-end</strong>'
    +'<p><b>SLA:</b> plazo objetivo de servicio. <b>Tiempo real end-to-end:</b> duración habitual transcurrida desde el evento inicial hasta el resultado final, incluyendo esperas; no es sólo tiempo de trabajo.</p>'
    +(sentence?'<p class="demand-service-observation">'+sentence+'</p>':'')
    +'<p>Que el valor habitual sea inferior al objetivo no demuestra el cumplimiento de todos los casos. Antes de concluirlo hay que contrastar límites del proceso, calendario natural o laboral, variabilidad y evidencia del dato.</p>';
}
function refreshS03ServiceTimeComparison(e){
  if(typeof document==='undefined')return;
  const host=document.querySelector('[data-s03-service-time-compare]');
  if(host)host.innerHTML=s03ServiceTimeComparisonHtml(e);
}
// [AUNEA-FE-DEMAND-SLA-CYCLE-143] END
function slaTargetBlock(f,e){
  const p=numberParts(effectiveValue(f,e));
  const units=[{value:'min',label:'min'},{value:'h',label:'horas'},{value:'day',label:'días'},{value:'week',label:'semanas'}];
  const modeOpts=[{value:'',label:'Sí, existe'},{value:'NONE',label:'No existe'}];
  const none=p.mode==='NONE',unset=!p.mode&&(p.value===''||p.value===undefined||p.value===null);
  const modeValue=unset?'__PENDING__':p.mode;
  return `<div class="field full demand-sla-target" data-field="${attr(f.Field_ID)}" data-uat="UAT-VIS-025">
    <div class="demand-sla-head">
      <div><label>${esc(f.Pregunta_o_etiqueta_ES)}<span class="conditional-tag">condicional</span></label>
      <div class="field-help">Indica si existe un SLA o tiempo objetivo. Si existe, registra el valor; si no, queda cerrado explícitamente como “No existe”.</div></div>
      <div class="demand-sla-exists">${auneaSelectControl(`${f.Field_ID}__mode`,modeOpts,modeValue,{extra:`data-number-mode="${f.Field_ID}" data-sla-mode="${f.Field_ID}"`,placeholder:'¿Existe?'})}</div>
    </div>
    <div class="demand-sla-value" data-sla-value-wrap="${f.Field_ID}"${none||unset?' hidden':''}>
      <span class="demand-sla-value-label">Tiempo objetivo</span>
      <input type="number" inputmode="decimal" min="0" step="any" data-number-value="${f.Field_ID}" value="${attr(p.value??'')}" placeholder="Ej. 24" aria-label="Tiempo objetivo">
      ${auneaSelectControl(`${f.Field_ID}__unit`,units,p.unit,{extra:`data-number-unit="${f.Field_ID}"`,placeholder:'Unidad'})}
    </div>
    <div class="demand-service-comparison" data-s03-service-time-compare="1" aria-live="polite">${s03ServiceTimeComparisonHtml(e)}</div>
  </div>`;
}

// Demand-only operational extension pending formal Diagnostic Master field governance.
// Stored separately from DF025 (SLA), DF026 (actual), and DF086 (qualitative desired outcome).
function demandTargetTimeBlock(e){
  const saved=e?.answerDetails?.demand_target_end_to_end||{};
  const cycle=numberParts(e?.answers?.DF026);
  const factors={min:1,h:60,day:1440,week:10080};
  const actual=Number(cycle.value)*factors[cycle.unit];
  const target=Number(saved.value)*factors[saved.unit];
  const validActual=cycle.value!==''&&cycle.value!=null&&Number.isFinite(actual)&&actual>0;
  const validTarget=saved.value!==''&&saved.value!=null&&Number.isFinite(target)&&target>0;
  const reduction=validActual&&validTarget?(1-target/actual)*100:null;
  const units=[{value:'min',label:'minutos'},{value:'h',label:'horas'},{value:'day',label:'días'},{value:'week',label:'semanas'}];
  return '<div class="field full demand-target-cycle" data-demand-target-cycle="1">'
    +'<label>Tiempo end-to-end objetivo del proceso <span class="conditional-tag">objetivo de mejora</span></label>'
    +'<div class="compound-control"><input type="number" min="0" step="any" inputmode="decimal" data-demand-target-value="1" value="'+attr(saved.value??'')+'" placeholder="Ej. 175" aria-label="Tiempo end-to-end objetivo">'
    +auneaSelectControl('demandTargetUnit',units,saved.unit||'min',{extra:'data-demand-target-unit="1"',placeholder:'Unidad'})+'</div>'
    +'<div class="field-help">Duración que se desea alcanzar desde el inicio hasta el final del proceso, incluidas las esperas. No es el SLA ni el tiempo actual.</div>'
    +'<div class="field-help" data-demand-target-comparison="1">'+(reduction===null?'Indica un objetivo y un tiempo actual comparable para calcular la reducción deseada.':'Reducción deseada respecto al tiempo actual: '+(reduction>=0?'+':'')+reduction.toLocaleString('es-ES',{maximumFractionDigits:2})+' %.')+'</div>'
    +'</div>';
}
function peakVolumeBlock(f,e){
  const value=numberParts(effectiveValue(f,e)),periods=fieldOptions('OS_PERIOD');
  return `<div class="field full volume-pair demand-volume-peak" data-uat="UAT-VIS-024"><label>${esc(f.Pregunta_o_etiqueta_ES)}${diagnosticFieldMeta(f)}</label><div class="compound-control volume-sentence"><input type="number" inputmode="decimal" min="0" step="any" data-number-value="${f.Field_ID}" value="${attr(value.value??'')}" placeholder="200" aria-label="Volumen de pico"><input type="hidden" data-number-unit="${f.Field_ID}" value="case"><span class="unit-label">casos por</span>${auneaSelectControl(`${f.Field_ID}__period`,periods.map(o=>({value:o.value,label:String(o.label).toLowerCase()})),value.period,{extra:`data-number-period="${f.Field_ID}"`,placeholder:'Selecciona periodo…'})}</div><div class="field-help">${esc(f.Objetivo_concreto||'')}</div></div>`;
}
function renderStageFields(fields,e){
  const out=[];
  for(let i=0;i<fields.length;i++){
    const f=fields[i];
    if(f.Field_ID==='DF021'){
      const f22=fields.find(x=>x.Field_ID==='DF022');
      if(f22){out.push(habitualVolumeBlock(f,f22,e));continue}
    }
    if(f.Field_ID==='DF022'&&fields.some(x=>x.Field_ID==='DF021'))continue;
    if(f.Field_ID==='DF023'){out.push(peakVolumeBlock(f,e));continue}
    if(f.Field_ID==='DF026'){out.push(renderQuestion(f,e));out.push(demandTargetTimeBlock(e));continue}
    if(f.Field_ID==='DF025'){out.push(slaTargetBlock(f,e));continue}
    out.push(renderQuestion(f,e));
  }
  return out.join('');
}

// B02 / VR-01A: IMG90-01 governs the twelve top-level visible fields of PG01. The Diagnostic Master
// still governs S01 semantics (DF001-DF010). DEC-059 fixes the bridge: visible CRM/context fields write
// to their single owner. B03 adds the canonical S01 remainder as progressive disclosure below them.
// [AUNEA-FROZEN-STAGE-S01-001] START — S01 Contexto y objetivos
const PG01_PRIORITY=Object.freeze(['Baja','Media','Alta','Crítica']);
function pg01Prefill(source){return typeof fieldStatusIcon==='function'?fieldStatusIcon('reused',source):''}
function pg01Field(label,control,help,{source='',required=null,full=false}={}){
  const canonical=(String(control).match(/data-pg01-df="(DF\d+)"/)||[])[1]||'';
  const canonicalField=canonical?(schema?.fields||[]).find(f=>f.Field_ID===canonical):null;
  const isRequired=required===null?canonicalField?.Requiredness==='REQUIRED_90M':required===true;
  return `<div class="field${full?' full':''}"${canonical?` data-field="${canonical}"`:''} data-pg01-visible="${attr(label)}"><label>${esc(label)}${isRequired?requiredMark():''}${source?pg01Prefill(source):''}</label>${control}<div class="field-help">${esc(help)}</div></div>`;
}
function pg01Select(options,value,attrs=''){
  const key=(String(attrs).match(/data-pg01-df="([^"]+)"/)||String(attrs).match(/data-pg01-company="([^"]+)"/)||String(attrs).match(/data-pg01-contact-ref="([^"]+)"/)||[])[1]||'field';
  return auneaSelectControl(`pg01_${String(key).replace(/[^a-zA-Z0-9_-]/g,'_')}`,options,value,{extra:attrs,placeholder:'Selecciona…'});
}
// IMG90-01 draws the phone as a prefix box plus a number box. DEC-057 keeps Contact.Teléfono as one
// field, so the two boxes are a presentation of the same stored string, not a second attribute. The
// prefix stays free text because no canonical catalogue of dialling codes exists to populate a list.
function phoneParts(v){
  const s=String(v??'').trim(),m=/^(\+\d{1,4})[\s-]*(.*)$/.exec(s);
  return m?{prefix:m[1],number:m[2].trim()}:{prefix:'',number:s};
}
function phoneJoin(prefix,number){return [String(prefix||'').trim(),String(number||'').trim()].filter(Boolean).join(' ')}
function pg01PhoneCompound(value){
  const p=phoneParts(value);
  return `<div class="compound-control phone-compound">`
    +`<input class="phone-prefix" data-pg01-phone="prefix" value="${attr(p.prefix)}" placeholder="+34" aria-label="Prefijo internacional">`
    +`<input data-pg01-phone="number" value="${attr(p.number)}" placeholder="612 345 678" aria-label="Número de teléfono"></div>`;
}
function pg01ContextFields(e){
  const co=companyById(e.companyId)||{};
  const contacts=(state.contacts||[]).filter(c=>c.companyId===e.companyId&&c.status!=='Inactivo');
  const selected=(typeof contactById==='function'?contactById(e.contactIds?.[0]):null)||contacts[0]||null;
  e.answers=e.answers||{};
  if(e.priority===undefined)e.priority='';
  if(e.contextSummary===undefined)e.contextSummary='';
  // DF003 is read from Company by effectiveValue; no write into Engagement.answers during render.
  const contactOpts=contacts.map(c=>({value:c.id,label:typeof contactFullName==='function'?contactFullName(c):(c.name||c.email||c.id)}));
  const sectorOpts=fieldOptions('REF_INDUSTRY_CNAE25');
  const orgOpts=(typeof COMPANY_ORG_TYPE!=='undefined'?COMPANY_ORG_TYPE:[]).map(v=>({value:v,label:v}));
  const channelOpts=(typeof COMPANY_ENTRY_CHANNEL!=='undefined'?COMPANY_ENTRY_CHANNEL:[]).map(v=>({value:v,label:v}));
  const size=typeof companySizeBand==='function'?companySizeBand(co):'—';
  return [
    pg01Field('Empresa',`<input data-pg01-company="name" data-pg01-df="DF001" value="${attr(co.name||'')}">`,'Empresa sobre la que se realiza el estudio. Si detectas un error, corrígelo aquí y se actualizará su ficha maestra.',{source:'Empresas'}),
    pg01Field('Persona de contacto',pg01Select(contactOpts,selected?.id||'',`data-pg01-contact-ref="1" data-pg01-df="DF006"`),'Persona que participa como interlocutor principal en esta sesión. Solo se muestran contactos activos de la empresa.',{source:'Contactos'}),
    pg01Field('Cargo',`<input data-pg01-contact="role" value="${attr(selected?.role||'')}">`,'Rol profesional de la persona seleccionada. Se reutiliza desde Contactos y cualquier corrección actualiza su ficha.',{source:'Contactos'}),
    pg01Field('Email',`<input type="email" data-pg01-contact="email" value="${attr(selected?.email||'')}">`,'Correo de la persona seleccionada para seguimiento del estudio y comunicaciones posteriores.',{source:'Contactos'}),
    pg01Field('Teléfono',pg01PhoneCompound(selected?.phone||''),'Teléfono de la persona seleccionada. Es opcional y se guarda en su ficha de Contacto.',{source:'Contactos',required:false}),
    pg01Field('Sector',pg01Select(sectorOpts,canonicalValueFromLabel('REF_INDUSTRY_CNAE25',co.sector||''),`data-pg01-company="sector" data-pg01-df="DF002"`),'Actividad económica principal de la empresa según el catálogo CNAE-2025.',{source:'Empresas'}),
    pg01Field('Tamaño de empresa',`<input data-pg01-company-size="1" value="${attr(size==='—'?'Sin indicar':`${size} empleados`)}" disabled>`,'Tamaño derivado automáticamente del número de empleados registrado en Empresas; no se edita desde el estudio.',{source:'Empresas'}),
    pg01Field('Tipo de organización',pg01Select(orgOpts,co.orgType||'',`data-pg01-company="orgType"`),'Tipo de organización registrado para la empresa; se reutiliza para contextualizar el diagnóstico.',{source:'Empresas'}),
    pg01Field('Prioridad',`<div class="segmented">${PG01_PRIORITY.map(v=>`<button type="button" class="segment ${e.priority===v?'active':''}" data-pg01-engagement="priority" data-value="${attr(v)}">${esc(v)}</button>`).join('')}</div>`,'Urgencia del estudio para priorizar el trabajo y el siguiente paso; no altera por sí sola la recomendación.'),
    pg01Field('Canal de entrada',pg01Select(channelOpts,co.entryChannel||'',`data-pg01-company="entryChannel"`),'Origen comercial de la relación con AUNEA; se conserva como dato de la empresa.',{source:'Empresas'}),
    pg01Field('Resumen del contexto',`<textarea maxlength="500" data-pg01-engagement="contextSummary">${esc(e.contextSummary||'')}</textarea>`,'Resume por qué se abre este estudio, qué situación se quiere entender y qué motivación existe para actuar.',{full:false})
  ].join('');
}

// B03 / VR-01B: the five canonical S01 fields not present in the principal PG01 composition stay
// in PG01 as a second always-visible block separated only by a horizontal rule. They reuse the existing
// renderer and preserve Diagnostic Master controls, option sets, branching, write targets and No-Reask.
const PG01_DISCLOSURE_IDS=Object.freeze(['DF004','DF007','DF008','DF009','DF010']);
const PG01_DISCLOSURE_TITLE='Objetivo, criterios y restricciones de la sesión';
function pg01DisclosureFields(fields){return PG01_DISCLOSURE_IDS.map(fid=>fields.find(f=>f.Field_ID===fid)).filter(Boolean)}
function pg01DisclosurePending(fields,e){return pg01DisclosureFields(fields).filter(f=>f.Requiredness==='REQUIRED_90M'&&questionVisible(f,e)&&!canonicalFieldValuePresent(f,effectiveValue(f,e),e))}
function pg01DisclosureValidation(fields,e){
  const folded=pg01DisclosureFields(fields),pending=pg01DisclosurePending(fields,e);
  const errors=folded.map(f=>({f,message:canonicalFieldValidationIssue(f,effectiveValue(f,e),e)})).filter(x=>x.message);
  const status=errors.length?`${errors.length} dato${errors.length===1?'':'s'} por corregir`
    :pending.length?`${pending.length} obligatorio${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}`:'Completo';
  const warnings=errors.map(({f,message})=>`<div><b>${esc(f.Pregunta_o_etiqueta_ES||f.Field_ID)}:</b> ${esc(message)}</div>`).join('');
  return {status,warnings};
}
function pg01CanonicalDisclosure(fields,e){
  const folded=pg01DisclosureFields(fields);if(!folded.length)return '';
  const validation=pg01DisclosureValidation(fields,e);
  return `<section class="pg01-disclosure pg01-disclosure-open"><div class="pg01-disclosure-head"><span>${esc(PG01_DISCLOSURE_TITLE)}</span><span class="conditional-tag">${esc(validation.status)}</span></div><div class="form-grid">${renderStageFields(folded,e)}</div><div class="pg01-validation-issues notice warn" ${validation.warnings?'':'hidden'}>${validation.warnings}</div></section>`;
}
function refreshPg01DisclosureValidation(){
  const e=currentEng();if(!e||e.stageId!=='S01')return;
  const result=pg01DisclosureValidation(schema.fields.filter(f=>f.Stage_ID==='S01'&&questionVisible(f,e)),e);
  const tag=document.querySelector('.pg01-disclosure .conditional-tag'),warnings=document.querySelector('.pg01-validation-issues');
  if(tag)tag.textContent=result.status;
  if(warnings){warnings.hidden=!result.warnings;warnings.innerHTML=result.warnings}
}
// [AUNEA-FROZEN-STAGE-S01-001] END

// Continuar never skips a canonical obligation. Requiredness and branch activity are read from the
// Diagnostic Master, so nothing here decides what is mandatory: it only refuses to advance and points
// at the first field still missing, unfolding the progressive-disclosure block when it hides one.
function stagePendingRequired(e,stageId){
  const sid=stageId||e?.stageId||'S01';
  // Presence alone is not completion: an imported value that breaks canonical validation
  // (e.g. DF008 with four choices) remains pending even if it is nonempty.
  return (schema?.fields||[]).filter(f=>f.Stage_ID===sid&&canonicalFieldRequiredNow(f,e)
    &&!canonicalFieldValuePresent(f,effectiveValue(f,e),e));
}
function focusPendingField(fid){
  const host=document.querySelector(`.field[data-field="${fid}"]`);
  if(!host)return false;
  host.classList.add('field-pending');
  const control=host.querySelector('input,select,textarea,button');
  if(control&&typeof control.focus==='function')control.focus();
  if(typeof host.scrollIntoView==='function')host.scrollIntoView({block:'center'});
  return true;
}
// Continuar applies the same canonical required/applicable contract to every session stage.
function stageAdvanceProblem(e,stageId){
  if(!e)return {id:null,message:'Abre un estudio antes de avanzar.'};
  const sid=stageId||e.stageId||'S01';
  // Same pure result is consumed by the Continue button AND by the session rail.
  // A filled but invalid OPTIONAL_90M field blocks; an unanswered optional one does not.
  const invalid=(schema?.fields||[])
    .filter(f=>f.Stage_ID===sid&&questionVisible(f,e))
    .map(f=>({field:f,reason:canonicalFieldValidationIssue(f,effectiveValue(f,e),e)}))
    .find(item=>item.reason);
  if(invalid)return {id:invalid.field.Field_ID,message:`${invalid.field.Pregunta_o_etiqueta_ES||invalid.field.Field_ID}: ${invalid.reason}`};
  const first=stagePendingRequired(e,sid)[0];
  return first?{id:first.Field_ID,message:`Falta un campo obligatorio: ${first.Pregunta_o_etiqueta_ES||first.Field_ID}`}:null;
}
function blockStageAdvance(e){
  const problem=stageAdvanceProblem(e);
  if(!problem)return false;
  if(problem.id)focusPendingField(problem.id);
  toast(problem.message);
  return true;
}

function bindPg01Context(){
  document.querySelectorAll('[data-pg01-company]').forEach(el=>{const event=el.type==='hidden'?'change':'input';el.addEventListener(event,()=>{
    const e=currentEng(),co=e&&companyById(e.companyId);if(!e||!co)return;
    const key=el.dataset.pg01Company,fid=el.dataset.pg01Df||'';
    if(fid){setAnswer(fid,el.value);return}
    const before=co[key];if(String(before??'')===String(el.value??''))return;
    co[key]=el.value;e.updatedAt=now();audit(`Empresa ${co.name}: ${key} actualizado desde PG01`);markDirty(`PG01 actualizado: ${key}`);refreshCaptureProgress();
  })});
  document.querySelectorAll('[data-pg01-contact]').forEach(el=>el.addEventListener('input',()=>{
    const e=currentEng(),ct=e&&contactById(e.contactIds?.[0]);if(!e||!ct)return;
    const key=el.dataset.pg01Contact,before=ct[key];if(String(before??'')===String(el.value??''))return;
    ct[key]=el.value;e.updatedAt=now();audit(`Contacto ${contactFullName(ct)}: ${key} actualizado desde PG01`);markDirty(`PG01 actualizado: contacto ${key}`);refreshCaptureProgress();
  }));
  // Both boxes of the phone compound write the single Contact.Teléfono value.
  document.querySelectorAll('[data-pg01-phone]').forEach(el=>el.addEventListener('input',()=>{
    const e=currentEng(),ct=e&&contactById(e.contactIds?.[0]);if(!e||!ct)return;
    const part=p=>document.querySelector(`[data-pg01-phone="${p}"]`)?.value||'';
    const next=phoneJoin(part('prefix'),part('number'));
    if(String(ct.phone??'')===next)return;
    ct.phone=next;e.updatedAt=now();audit(`Contacto ${contactFullName(ct)}: phone actualizado desde PG01`);markDirty('PG01 actualizado: contacto phone');refreshCaptureProgress();
  }));
  document.querySelectorAll('[data-pg01-contact-ref]').forEach(el=>el.addEventListener('change',()=>{if(el.value)setAnswer('DF006',el.value);render()}));
  document.querySelectorAll('[data-pg01-engagement]').forEach(el=>{
    const key=el.dataset.pg01Engagement;
    if(el.tagName==='BUTTON')el.onclick=()=>{const e=currentEng();if(!e)return;e[key]=el.dataset.value||'';e.updatedAt=now();markDirty(`PG01 actualizado: ${key}`);render()};
    else el.addEventListener('input',()=>{const e=currentEng();if(!e)return;e[key]=el.value;e.updatedAt=now();markDirty(`PG01 actualizado: ${key}`);refreshCaptureProgress()});
  });
}


// [AUNEA-FROZEN-STAGE-S02-001] START — S02 Alcance del proceso
function engagementBusinessAreaBlock(e){
  const options=fieldOptions('REF_DOMAIN');
  return `<div class="field full engagement-business-area" data-runtime-field="RT_ENGAGEMENT.Business_Area_ID">
    <label>Área de la empresa ${e.businessAreaId?fieldStatusIcon('saved'):''}</label>
    ${auneaSelectControl('engagement_business_area',options,e.businessAreaId||'',{extra:'data-engagement-business-area="1"',placeholder:'Selecciona el área principal del estudio…'})}
    <div class="field-help">Área o dominio funcional sobre el que se realiza este diagnóstico. Puede ser distinta en otros estudios de la misma empresa.</div>
  </div>`;
}
// [AUNEA-FROZEN-STAGE-S02-001] END

// Which approved reference each stage reproduces, and what the client is looking at while it is
// being captured. Both come from the 90-min UI Spec (§5 client states, §17 inventory), not from here.
const STAGE_REFERENCE = {S01:'I90-01',S02:'I90-02',S03:'I90-03',S04:'I90-04',S05:'I90-05',S06:'I90-06',S07:'I90-07',S08:'I90-08',S09:'I90-09'};
const STAGE_CLIENT_STATE = {
  S01:{id:'C90-00',shared:false,text:'Esta información es sólo para tu preparación interna. Aún no se muestra al cliente.'},
  S02:{id:'C90-00',shared:false,text:'Esta información es sólo para tu preparación interna. Aún no se muestra al cliente.'},
  S03:{id:'C90-00',shared:false,text:'Esta información es sólo para tu preparación interna. Aún no se muestra al cliente.'},
  S04:{id:'C90-01 / C90-02',shared:true,text:'El cliente ve el mapa AS-IS construyéndose. Seleccionar un paso abre su detalle sin salir del mismo canvas.'},
  S05:{id:'C90-03',shared:true,text:'El mismo AS-IS, ahora con las fricciones confirmadas superpuestas sobre los pasos afectados.'},
  S06:{id:'C90-03',shared:true,text:'El mismo AS-IS con los riesgos confirmados en lenguaje de negocio. El scoring y la categoría interna no salen de esta consola.'},
  S07:{id:'C90-03',shared:true,text:'El mismo AS-IS con los impactos confirmados. No se muestra business case, ROI ni ahorro final durante la sesión.'},
  S08:{id:'C90-00',shared:false,text:'El estado objetivo y las restricciones se capturan en la consola antes de construir el mapa. Esta pantalla no se comparte con el cliente.'},
  S09:{id:'C90-04',shared:true,text:'Validación final del AS-IS enriquecido más un cierre compacto junto al flujo.'}
};

// The inspector explains the stage from its own canonical attributes — objective, input, main
// interaction, output and exit criterion — instead of restating them as invented copy.
// Narrative labels for the 90-minute session. The schema keeps every technical
// stage/field identifier; only the consultant-facing wording is made understandable.
const STAGE_PLAIN_COPY=Object.freeze({
  S01:{Criterio_de_salida:'Empresa, persona de contacto y objetivos completos; criterios de éxito opcionales y restricciones cuando correspondan.'},
  S02:{Regla_de_tiempo:'Si el inicio y el resultado final ya delimitan el proceso, no volver a preguntar por sus límites.'},
  S03:{Criterio_de_salida:'Volumen habitual y período obligatorios; resto de información según corresponda.'},
  S04:{Salida:'Mapa del proceso y pasos estructurados.'},
  S06:{Salida:'Riesgos estructurados para su evaluación.',Regla_de_tiempo:'Profundizar en riesgos únicamente cuando existan señales que lo justifiquen.'},
  S08:{Entrada:'Contexto, alcance y demanda completados.',Interacción_principal:'Objetivos y restricciones con reutilización de la información anterior.',Criterio_de_salida:'Resultados deseados definidos; restricciones relevantes reutilizadas o confirmadas.'},
  S09:{Criterio_de_salida:'Cierre validado, siguiente paso acordado y evidencias pendientes identificadas.'}
});
function stageNarrative(stage,property){
  return STAGE_PLAIN_COPY[stage.Stage_ID]?.[property]||stage[property]||'';
}
function stagePurposeCard(stage){
  const rows=[['Objetivo',stageNarrative(stage,'Objetivo')],['Entrada',stageNarrative(stage,'Entrada')],['Interacción principal',stageNarrative(stage,'Interacción_principal')],
              ['Salida',stageNarrative(stage,'Salida')],['Criterio de salida',stageNarrative(stage,'Criterio_de_salida')]].filter(([,v])=>v);
  return insCard('Qué prepara este paso',`<ul class="numbered-list">${rows.map(([k,v],i)=>
    `<li><span class="n">${i+1}</span><div><b>${esc(k)}</b><p>${esc(v)}</p></div></li>`).join('')}</ul>`,{icon:'▤'});
}
function stageCoverageCard(stage,fields){
  const ids=fields.map(f=>f.Field_ID).filter(Boolean).sort();
  const questionCount=ids.length;
  return insCard('Cobertura',
    `<div class="coverage-chips"><span class="chip">${questionCount} preguntas</span><span class="chip gold">${esc(String(stage.Minutos_objetivo))} min</span></div>`
    +`<p class="ins-note">${esc(stageNarrative(stage,'Regla_de_tiempo'))}</p>`,{icon:'◎'});
}
function stageClientCard(stage){
  const c=STAGE_CLIENT_STATE[stage.Stage_ID]||{id:'—',shared:false,text:''};
  return insCard('Vista de la sesión',`<p>${esc(c.text)}</p><div class="coverage-chips" style="margin-top:10px"><span class="chip ${c.shared?'gold':''}">${c.shared?'Compartida con el cliente':'No se comparte'}</span></div>`,
    {accent:true,icon:c.shared?'◉':'◌'});
}

function captureProgressHtml(e,stage){
  const completion=engagementCompletion(e);
  const stat=completion.stage[stage.Stage_ID]||{applicable:0,answered:0,pct:100};
  return `<div class="completion-headline" style="margin-bottom:8px">${completion.readyToCalculate?'<span class="status green">Listo para calcular</span>':`<span class="status amber">${completion.missing.length} pendiente${completion.missing.length===1?'':'s'} del diagnóstico</span>`}</div>`
    +kvRows([['En esta etapa',`${stat.answered} de ${stat.applicable} campo(s) con dato`],['Etapas con requisitos cumplidos',`${completion.stagesReviewed} de ${completion.stagesTotal}`],['Obligatorios',`${completion.requiredComplete} de ${completion.requiredApplicable}`],['Evidencia pendiente',String(completion.evidencePending.length)]]);
}
function refreshCaptureProgress(){
  if(typeof document==='undefined')return;
  const e=currentEng(),host=document.getElementById('captureProgressLive');if(!e||!host)return;
  const stage=schema.flow.find(x=>x.Stage_ID===(e.stageId||'S01'))||schema.flow[0];
  host.innerHTML=captureProgressHtml(e,stage);
}

function stagePage(){
  const asisPage={S04:processPage,S05:consultantFrictionsPage,S06:consultantRisksPage,S07:consultantImpactPage}[currentEng()?.stageId];
  if(asisPage)return asisPage();
  const e=currentEng(),stage=schema.flow.find(x=>x.Stage_ID===(e.stageId||'S01'))||schema.flow[0];
  const fields=schema.fields.filter(f=>f.Stage_ID===stage.Stage_ID&&questionVisible(f,e));
  const stageIndex=schema.flow.findIndex(x=>x.Stage_ID===stage.Stage_ID),isLastStage=stageIndex===schema.flow.length-1;
  const completion=engagementCompletion(e);
  const stageStat=completion.stage[stage.Stage_ID]||{applicable:0,answered:0,pct:100};
  const next=schema.flow[stageIndex+1];

  // PG01 has the approved IMG90-01 twelve-field composition plus B03's folded canonical remainder.
  // Every other stage remains schema-driven.
  const stageFields=stage.Stage_ID==='S01'?pg01ContextFields(e):renderStageFields(fields,e);
  const pg01Disclosure=stage.Stage_ID==='S01'?pg01CanonicalDisclosure(fields,e):'';
  const engagementArea=stage.Stage_ID==='S02'?engagementBusinessAreaBlock(e):'';
  const main=stage.Stage_ID==='S09'?pg09CaptureContent(e,fields,completion):stage.Stage_ID==='S01'
    ? `<div class="card stage-card">
        ${REQUIRED_LEGEND_HTML}
        <div class="form-grid">${stageFields}</div>
      </div>
      ${pg01Disclosure}`
    : `<div class="card stage-card">
      ${fields.some(f=>f.Requiredness==='REQUIRED_90M')?REQUIRED_LEGEND_HTML:''}
      <div class="form-grid">${engagementArea}${stageFields}</div>
      ${stage.Stage_ID==='S04'?processPrompt(e):''}${stage.Stage_ID==='S05'?frictionPrompt(e):''}
      ${stage.Stage_ID==='S06'?riskBuilder(e):''}${stage.Stage_ID==='S07'?economicBuilder(e):''}
      ${isLastStage?validationSummary(e,completion):''}
    </div>`;

  const inspector=stageClientCard(stage)+stagePurposeCard(stage)+stageCoverageCard(stage,fields)
    +insCard('Progreso de la captura',`<div id="captureProgressLive">${captureProgressHtml(e,stage)}</div>`,{icon:'▥'});

  // The last stage carries no second calculate button: validationSummary owns that CTA, together with
  // the blockers that explain why it is or is not available. Two of them was one too many.
  const bar=actionBar(
    `<button class="btn" id="saveDraft">Guardar borrador</button>`
    +(isLastStage&&typeof CLIENT_DISPLAY_PAUSED!=='undefined'&&CLIENT_DISPLAY_PAUSED?'':`<button class="btn btn-outline" id="openSessionDisplay" ${typeof CLIENT_DISPLAY_PAUSED!=='undefined'&&CLIENT_DISPLAY_PAUSED?'disabled aria-disabled="true" title="Vista cliente en pausa: revisión de coherencia del flujo"':''}>${typeof CLIENT_DISPLAY_PAUSED!=='undefined'&&CLIENT_DISPLAY_PAUSED?'Vista cliente en pausa':'Abrir vista de sesión'}</button>`),
    `<button class="btn" id="prevStage" ${stageIndex===0?'disabled':''}>Volver</button>`
    +(isLastStage?'':`<button class="btn btn-primary" id="nextStage">Continuar a ${esc(String(next.Stage_ES).toLowerCase())} →</button>`));

  const pageTitle=stage.Stage_ID==='S01'?'Contexto del cliente':stage.Stage_ES;
  const pageSubtitle=stage.Stage_ID==='S09'?'Comprueba los pendientes, confirma el diagnóstico y deja acordado el siguiente paso.':stage.Stage_ID==='S01'?'Recogemos la base operativa y empresarial antes de entrar en el flujo.':stage.Objetivo;
  const stageMarker=`<span class="diagnostic-stage-marker diagnostic-stage-${String(stage.Stage_ID).toLowerCase()}" data-diagnostic-stage="${attr(stage.Stage_ID)}" hidden></span>`;
  return stageMarker+pageTop(pageTitle,pageSubtitle,'',STAGE_REFERENCE[stage.Stage_ID]||'')
    +(stage.Stage_ID==='S09'?'<div class="pg09-final-page">'+main+'</div>':workspace(main,inspector)) + bar;
}
function processPrompt(e){return `<div class="notice info"><strong>Mapa AS-IS:</strong> los pasos y sus datos se capturan principalmente en el editor visual. Actualmente hay <b>${e.processSteps.filter(x=>x.status!=='SUPERSEDED').length}</b> pasos. <button class="btn btn-small btn-primary" data-open-process-editor="1">Abrir editor con el cliente ↗</button><button class="btn btn-small" data-goto-process="1">Abrir aquí</button></div>`}
function frictionPrompt(e){return `<div class="notice info"><strong>Fricciones:</strong> las fricciones se capturan vinculándolas a uno o varios pasos. Actualmente hay <b>${e.frictions.filter(x=>x.status!=='SUPERSEDED').length}</b> fricciones. <button class="btn btn-small" data-goto-process="1">Abrir fricciones</button></div>`}

// [AUNEA-FE-DF017-FINAL-137] START — Confirm PG02 participants against step actors at PG09.
// PG02 owns the initial answer; ProcessStep owns actors. The review keeps both sources,
// saves the confirmed final DF017 without changing ProcessSteps, and invalidates stale outputs.
function df017FinalReviewPanel(e){
  const steps=activeSteps(e), mapped=[...new Set(steps.map(s=>String(s.actor||'')).filter(Boolean))];
  const details=e.answerDetails||{},initial=normalizeArray(details.DF017__initial_scope??e.answers?.DF017).map(String);
  const final=normalizeArray(e.answers?.DF017).map(String);
  const sign=JSON.stringify({declared:[...new Set(final)].sort(),mapped:[...mapped].sort()});
  const confirmed=details.DF017__final_scope_confirmation?.fingerprint===sign;
  const choices=[...new Set([...initial,...mapped,...final])];
  if(!choices.length)return '';
  const fmt=arr=>arr.length?arr.map(v=>labelFrom('OS_ACTOR_ROLE',v)||v).join(' · '):'Ninguno declarado';
  const current=confirmed?final:(initial.length?initial:mapped);
  const opts=choices.map(v=>'<label class="df017-final-choice"><input type="checkbox" data-df017-final-option="'+attr(v)+'" '+(current.includes(v)?'checked':'')+'><span>'+esc(labelFrom('OS_ACTOR_ROLE',v)||v)+'</span></label>').join('');
  return '<div class="df017-final-review" data-df017-final-review="1"><h3>Validación de participantes</h3>'
    +'<p>En la página 2 seleccionaste <strong>'+initial.length+' perfil(es)</strong>: '+esc(fmt(initial))+'.</p>'
    +'<p>En el mapa AS-IS aparecen <strong>'+mapped.length+' perfil(es)</strong>: '+esc(fmt(mapped))+'.</p>'
    +'<p class="field-help">Compara ambas listas y confirma qué perfiles deben quedar como participantes finales. Los responsables de cada paso no cambian.</p>'
    +(confirmed?'<div class="pg09-participant-confirmed">'+current.map(v=>'<span>'+esc(labelFrom('OS_ACTOR_ROLE',v)||v)+'</span>').join('')+'<strong>Confirmado</strong></div>':'<div class="df017-final-options" role="group" aria-label="Perfiles finales del proceso">'+opts+'</div><button type="button" class="btn btn-small btn-primary" data-confirm-df017-final="1">Confirmar listado final</button>')
    +'</div>';
}
function confirmDf017FinalSelection(){
  const e=currentEng();if(!e)return false;
  const selected=[...document.querySelectorAll('[data-df017-final-option]:checked')].map(el=>String(el.dataset.df017FinalOption));
  if(!selected.length){toast('Selecciona al menos un perfil para confirmar el listado final.');return false}
  const allowed=new Set(fieldOptions('OS_ACTOR_ROLE').map(x=>String(x.value)));
  if(selected.some(x=>!allowed.has(x))){toast('Existe un perfil no reconocido en el catálogo.');return false}
  const before=JSON.parse(JSON.stringify(e)),priorAudit=[...(state.audit||[])],priorDirty=state.dirty;
  const details=e.answerDetails||(e.answerDetails={});
  const initial=normalizeArray(details.DF017__initial_scope??e.answers?.DF017).map(String);
  if(!Object.prototype.hasOwnProperty.call(details,'DF017__initial_scope'))details.DF017__initial_scope=[...initial];
  const mapped=[...new Set(activeSteps(e).map(s=>String(s.actor||'')).filter(Boolean))];
  const changed=JSON.stringify(e.answers?.DF017)!==JSON.stringify(selected);
  e.answers=e.answers||{};e.answers.DF017=selected;
  details.DF017__final_scope_confirmation={
    fingerprint:JSON.stringify({declared:[...new Set(selected)].sort(),mapped:[...mapped].sort()}),
    confirmedAt:now(),initial:[...initial],mapped:[...mapped],final:[...selected]
  };
  if(changed){
    if(e.confirmedAsIs&&typeof invalidateAsIsClosure==='function')invalidateAsIsClosure(e,'participantes finales DF017 actualizados');
    invalidateDerivedState(e,'confirmación final de participantes DF017','DF017');
  }
  e.updatedAt=now();markDirty('DF017: listado final de participantes confirmado');
  if(typeof persistRecoverySnapshot==='function'&&!persistRecoverySnapshot('confirmación DF017')){
    Object.keys(e).forEach(k=>delete e[k]);Object.assign(e,before);
    state.audit=priorAudit;state.dirty=priorDirty;
    toast('No se ha guardado la confirmación de participantes. Revisa la sincronización.');
    render();return false;
  }
  render();return true;
}
// [AUNEA-FE-DF017-FINAL-137] END

// [AUNEA-FE-PG09-FINAL-UX-138] START — One owner for capture; concise final review.
function pg09EvidenceItems(e,fid){
  const f=(schema?.fields||[]).find(x=>x.Field_ID===fid);
  const value=f&&typeof effectiveValue==='function'?effectiveValue(f,e):e.answers?.[fid];
  return normalizeArray(value).map(x=>String(x||'').trim()).filter(x=>x&&x!=='No hay evidencias pendientes'&&x!=='No hay información crítica pendiente');
}
function pg09HumanNextStep(e){
  const text=String(e.answers?.DF098||'').trim();if(!text)return 'Pendiente de acordar';
  const f=(schema?.fields||[]).find(x=>x.Field_ID==='DF098');
  const options=f&&typeof fieldOptions==='function'?fieldOptions(f.Option_Set_ID):[];
  const token=text.split(/\s+[—–-]\s+/)[0].trim();
  const match=options.find(x=>String(x.value)===token);
  return match?String(match.label)+text.slice(token.length):text;
}
function pg09ReadOnlyGroup(label,items,empty){
  return '<div class="pg09-readgroup"><h3>'+esc(label)+'</h3>'
    +(items.length?'<div class="pg09-readrows">'+items.map(x=>'<div class="pg09-readrow">'+esc(x)+'</div>').join('')+'</div>'
      :'<div class="pg09-readempty">'+esc(empty)+'</div>')+'</div>';
}
function pg09CaptureContent(e,fields,completion){
  const item=id=>{const f=fields.find(x=>x.Field_ID===id);return f?renderStageFields([f],e):'';};
  const conf=typeof processLayerConfirmations==='function'?processLayerConfirmations(e):{};
  const ready=!!(conf.map&&conf.frictions&&conf.risks&&conf.impact);
  const current=e.confirmedAsIs?'Cierre confirmado y registrado':ready?'Las cuatro capas están confirmadas':'Falta confirmar alguna capa del AS-IS';
  return '<section class="pg09-section"><div class="pg09-section-heading"><h2>Información para el cierre</h2><p>Revisa únicamente lo que sigue pendiente y los acuerdos para continuar. Los pasos, las fricciones, los riesgos y los impactos no se vuelven a capturar.</p></div>'
    +'<div class="pg09-asis-state '+(ready?'is-ready':'is-pending')+'"><b>'+esc(current)+'</b><span>'+(ready?'La aceptación final se realizará al cerrar el diagnóstico; no hay que volver a confirmar el mapa.':'Revisa las confirmaciones anteriores antes del cierre.')+'</span></div>'
    +'<div class="pg09-pending-grid">'
    +pg09ReadOnlyGroup('Información crítica pendiente',pg09EvidenceItems(e,'DF094'),'No se ha identificado información crítica pendiente.')
    +pg09ReadOnlyGroup('Evidencias por recibir',pg09EvidenceItems(e,'DF095'),'No hay evidencias pendientes de solicitar.')
    +'</div>'
    +'<div class="pg09-formblock"><h3>Prioridades y fechas</h3><div class="pg09-fields pg09-fields-two">'+item('DF096')+item('DF097')+'</div></div>'
    +'<div class="pg09-formblock"><h3>Siguiente paso acordado</h3><div class="pg09-fields">'+item('DF098')+'</div></div>'
    +'<div class="pg09-formblock"><h3>Uso de datos y notas internas</h3><div class="pg09-fields">'+item('DF099')+item('DF100')+'</div></div>'
    +'</section>'+validationSummary(e,completion);
}
// [AUNEA-FE-PG09-FINAL-UX-138] END

// Real closing screen for the last stage (UAT-VIS-063/064/066/067): factual summary, never a proxy
// state ("revisada"/"confirmado") that the data model does not actually have (correction #3) — only
// e.confirmedAsIs is a real confirmed state; frictions/risks only ever report "con evidencia/controles
// registrados". PG09 ends by confirming the AS-IS; engines belong exclusively to internal work.
function validationSummary(e,completion){
  const steps=activeSteps(e),fr=activeFrictions(e),risks=e.risks||[],econ=e.economicInputs||[];
  const frWithEvidence=fr.filter(x=>!!x.evidence_type).length;
  const risksWithControls=risks.filter(x=>x.controls_present===true).length;
  const econByType={};
  econ.forEach(x=>{const t=evidenceTypeBackend(x.evidence_type)||'UNVERIFIED';econByType[t]=(econByType[t]||0)+1});
  const econLine=Object.keys(econByType).length?Object.entries(econByType).map(([k,v])=>`${v} ${k==='UNVERIFIED'?'sin evidencia validada':engineLabel('evidence_quality',k)}`).join(', '):'Sin inputs económicos registrados';
  const nextStep=e.answers?.DF098||'',notes=e.answers?.DF100||'';
  // The sealed record internal work will read. It appears here because PG09 is where it is created.
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  const layers=typeof processLayerConfirmations==='function'?processLayerConfirmations(e):{},layersReady=!!(layers.map&&layers.frictions&&layers.risks&&layers.impact);
  const consistency=typeof preCloseConsistencyReview==='function'?preCloseConsistencyReview(e,completion):{items:[],blockers:[],reviews:[],information:[],clear:true};
  const evidenceField=(schema?.fields||[]).find(f=>f.Field_ID==='DF095');
  const evidencePending=normalizeArray(evidenceField&&typeof effectiveValue==='function'?effectiveValue(evidenceField,e):[]).filter(x=>x&&x!=='No hay evidencias pendientes');
  const captureMissing=(completion.missing||[]).filter(x=>(x.id||x)!=='DF093'&&(x.id||x)!=='Confirmación AS-IS');
  const primaryCta=snap?'<span class="status green">✓ Cierre confirmado y snapshot generado</span><button class="btn btn-primary" data-page="resultados">Continuar a Trabajo interno →</button>':((!layersReady||consistency.blockers.length||captureMissing.length)?'':'<button class="btn btn-primary" id="confirmClosingAsIs">Confirmar cierre y generar snapshot</button>');
  const cta=primaryCta+((!layersReady||consistency.blockers.length||captureMissing.length)?'<div class="pg09-close-warning">Resuelve los elementos pendientes antes de confirmar el cierre.</div>':'');
  const proceed=layersReady&&!consistency.blockers.length&&!captureMissing.length;
  const layerTiles=[
    ['Pasos',steps.length+' registrados',layers.map],
    ['Fricciones',fr.length+' registradas',layers.frictions],
    ['Riesgos',risks.length+' registrados',layers.risks],
    ['Impactos',econ.length+' registrados',layers.impact]
  ].map(([title,detail,ok])=>'<div class="pg09-layer-tile"><span>'+esc(title)+'</span><b>'+esc(detail)+'</b><small>'+(ok?'Confirmado':'Pendiente de confirmar')+'</small></div>').join('');
  const findings=consistency.items.filter(x=>x.severity!=='INFO'&&!String(x.code||'').startsWith('EVIDENCE_'));
  const issuesHtml=findings.length?'<div class="pg09-review-list">'+findings.map(item=>{
    const evidence=String(item.code||'').startsWith('EVIDENCE_');
    const raw=String(item.message||'');
    const message=evidence?raw.replace(/^Evidencia pendiente:\s*/i,'').split('. Solicita el soporte')[0]:raw;
    const stage=(item.navigationTarget==='proceso')?'proceso':item.stage||'';
    const action=stage&&stage!=='S09'
      ?(stage==='proceso'?'<button type="button" class="btn btn-small btn-outline" data-goto-process="1">Revisar origen</button>':'<button type="button" class="btn btn-small btn-outline" data-goto-stage="'+attr(stage)+'">Revisar origen</button>')
      :'';
    return '<div class="pg09-review-row '+(item.severity==='BLOCKER'?'is-blocker':'is-observation')+'">'
      +'<div><span>'+esc(message)+'</span><small>'+(evidence?'Evidencia pendiente de recibir':item.severity==='BLOCKER'?'Requiere corrección para cerrar':'Revisión pendiente')+'</small></div>'+action+'</div>';
  }).join('')+'</div>':'<p class="pg09-clean-review">'+(consistency.reviews.length?'Las evidencias pendientes figuran en el bloque superior y quedarán documentadas tras el cierre.':'No hay bloqueos ni observaciones pendientes.')+'</p>';
  return section('Revisión y confirmación final',
    'Esta revisión comprueba las confirmaciones anteriores y los datos pendientes, sin volver a capturar el proceso.',
    '<div class="pg09-confirm-section">'
      +'<h3>Capas del AS-IS</h3><div class="pg09-layer-grid">'+layerTiles+'</div>'
      +df017FinalReviewPanel(e)
      +'<div class="pg09-validation-section"><div class="pg09-validation-title"><h3>Comprobaciones antes del cierre</h3>'
      +'<p>Los bloqueos deben resolverse. Las observaciones no bloqueantes permanecen registradas para el trabajo interno.</p></div>'
      +'<div class="pg09-consistency-summary">'
        +'<div><b>'+consistency.blockers.length+'</b><span>Bloqueos</span></div>'
        +'<div><b>'+consistency.reviews.length+'</b><span>Observaciones</span></div>'
        +'<div class="'+(proceed?'is-ready':'is-pending')+'"><b>'+(proceed?'Puede cerrarse':'Requiere revisión')+'</b><span>Resultado de la comprobación</span></div>'
      +'</div>'+issuesHtml+'</div>'
      +(captureMissing.length?'<div class="pg09-missing-required"><b>Información obligatoria pendiente</b><p>'+captureMissing.map(x=>esc(x.label||'Dato obligatorio pendiente')).join(' · ')+'</p></div>':'')
      +'<div class="pg09-close-footer"><div><h3>'+(snap?'Diagnóstico cerrado':'Cerrar diagnóstico y guardar versión')+'</h3>'
        +'<p>'+(snap?'La versión final ha quedado registrada.':'Al confirmar se guarda la versión revisada con sus observaciones y evidencias pendientes.')+'</p>'
        +(snap?'<p class="pg09-snapshot-meta">Versión '+esc(snap.version)+' · '+esc(formatDateEs(snap.sealedAt))+'</p>':'')
      +'</div><div class="pg09-close-actions">'+cta+'</div></div>'
    +'</div>');

}
const __auneaDiagFieldsBindForms=bindForms;
bindForms=function(){
  __auneaDiagFieldsBindForms();
  bindPg01Context();
  document.querySelectorAll('[data-engagement-business-area]').forEach(el=>el.onchange=()=>{
    const e=currentEng();if(!e)return;
    const before=e.businessAreaId||'',next=el.value||'';if(before===next)return;
    e.businessAreaId=next;e.updatedAt=now();
    invalidateDerivedState(e,'área del estudio actualizada');
    markDirty('Área del estudio actualizada');
  });
  document.querySelectorAll('[data-goto-stage]').forEach(b=>b.onclick=()=>{const e=currentEng();if(e)e.stageId=b.dataset.gotoStage;render()});
  document.querySelectorAll('[data-consistency-stage]').forEach(b=>b.onclick=()=>{const e=currentEng();if(!e)return;e.stageId=b.dataset.consistencyStage;render()});
  document.querySelectorAll('[data-open-gate-review]').forEach(b=>b.onclick=()=>openEngineGateReview());
  document.querySelectorAll('[data-pg09-confirm-layer]').forEach(b=>b.onclick=()=>confirmProcessLayer(({map:'cliente',frictions:'fricciones',risks:'riesgos',impact:'impacto'})[b.dataset.pg09ConfirmLayer]));
  const df017Final=document.querySelector('[data-confirm-df017-final]');if(df017Final)df017Final.onclick=()=>confirmDf017FinalSelection();
  const finalConfirm=document.getElementById('confirmClosingAsIs');if(finalConfirm)finalConfirm.onclick=()=>confirmClosingAsIs();
  const sd=document.getElementById('saveDraft');if(sd)sd.onclick=()=>saveState('Borrador guardado');
};
// [AUNEA-FE-DIAG-CONTROL-030] END