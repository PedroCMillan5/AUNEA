// [AUNEA-FE-DIAG-CONTROL-030] START — Stage navigation shell and process/friction capture prompts
// PURPOSE: Stage navigation shell and process/friction capture prompts for the guided diagnostic flow. Option-set lookup helper.
// SOURCE: v1.0.4 aceptada; Diagnostic Master v1.1; DEC-034/040/050/051/056/059; IMG90-01.
// INPUTS: schema canónico, estado de engagement y acciones del usuario.
// OUTPUTS: estado y vistas de captura/revisión.
// SIDE_EFFECTS: DOM, almacenamiento local y solicitudes HTTP según responsabilidad.
// CHANGE_RISK: HIGH.
function fieldOptions(setId){return schema?.option_sets?.[setId]?.options||[]}

function diagnosticFieldMeta(f){return f.Requiredness==='REQUIRED_90M'?requiredMark():''}
function habitualVolumeBlock(f21,f22,e){
  const value=numberParts(effectiveValue(f21,e)),period=effectiveValue(f22,e),periods=fieldOptions(f22.Option_Set_ID||'OS_PERIOD');
  return `<div class="field full volume-pair" data-uat="UAT-VIS-023"><label>Volumen habitual${diagnosticFieldMeta(f21)}</label><div><div class="compound-control volume-sentence"><input type="number" min="0" step="any" data-number-value="${f21.Field_ID}" value="${attr(value.value??'')}" placeholder="120"><input type="hidden" data-number-unit="${f21.Field_ID}" value="case"><span class="unit-label">casos por</span><select data-answer="${f22.Field_ID}"><option value="">periodo…</option>${periods.map(o=>`<option value="${attr(o.value)}" ${String(period)===String(o.value)?'selected':''}>${esc(String(o.label).toLowerCase())}</option>`).join('')}</select></div></div><div class="field-help">${esc(f21.Objetivo_concreto||'')} ${esc(f22.Objetivo_concreto||'')}</div></div>`;
}
function peakVolumeBlock(f,e){
  const value=numberParts(effectiveValue(f,e)),periods=fieldOptions('OS_PERIOD');
  return `<div class="field full volume-pair" data-uat="UAT-VIS-024"><label>${esc(f.Pregunta_o_etiqueta_ES)}${diagnosticFieldMeta(f)}</label><div><div class="compound-control volume-sentence"><input type="number" min="0" step="any" data-number-value="${f.Field_ID}" value="${attr(value.value??'')}" placeholder="200"><input type="hidden" data-number-unit="${f.Field_ID}" value="case"><span class="unit-label">casos por</span><select data-number-period="${f.Field_ID}"><option value="">periodo…</option>${periods.map(o=>`<option value="${attr(o.value)}" ${String(value.period)===String(o.value)?'selected':''}>${esc(String(o.label).toLowerCase())}</option>`).join('')}</select></div></div><div class="field-help">${esc(f.Objetivo_concreto||'')}</div></div>`;
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
    out.push(renderQuestion(f,e));
  }
  return out.join('');
}

// B02 / VR-01A: IMG90-01 governs the twelve top-level visible fields of PG01. The Diagnostic Master
// still governs S01 semantics (DF001-DF010). DEC-059 fixes the bridge: visible CRM/context fields write
// to their single owner. B03 adds the canonical S01 remainder as progressive disclosure below them.
const PG01_PRIORITY=Object.freeze(['Baja','Media','Alta','Crítica']);
function pg01Prefill(source){return `<span class="prefill-chip">Prellenado desde ${esc(source)}</span>`}
function pg01Field(label,control,help,{source='',required=true,full=false}={}){
  const canonical=(String(control).match(/data-pg01-df="(DF\d+)"/)||[])[1]||'';
  return `<div class="field${full?' full':''}"${canonical?` data-field="${canonical}"`:''} data-pg01-visible="${attr(label)}"><label>${esc(label)}${required?requiredMark():''}${source?pg01Prefill(source):''}</label>${control}<div class="field-help">${esc(help)}</div></div>`;
}
function pg01Select(options,value,attrs=''){
  return `<select ${attrs}><option value="">Selecciona…</option>${options.map(o=>`<option value="${attr(o.value)}" ${String(o.value)===String(value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`;
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
  // DF003 is Company-owned. Reuse the existing master value in the Engagement snapshot so the
  // canonical completion contract sees the same value without creating another editable size field.
  if((e.answers.DF003===undefined||e.answers.DF003==='')&&Number.isFinite(Number(co.employeeCount))&&Number(co.employeeCount)>0)e.answers.DF003=Number(co.employeeCount);
  const contactOpts=contacts.map(c=>({value:c.id,label:typeof contactFullName==='function'?contactFullName(c):(c.name||c.email||c.id)}));
  const sectorOpts=fieldOptions('REF_DOMAIN');
  const countryOpts=fieldOptions('REF_COUNTRY_ISO3166');
  const orgOpts=(typeof COMPANY_ORG_TYPE!=='undefined'?COMPANY_ORG_TYPE:[]).map(v=>({value:v,label:v}));
  const channelOpts=(typeof COMPANY_ENTRY_CHANNEL!=='undefined'?COMPANY_ENTRY_CHANNEL:[]).map(v=>({value:v,label:v}));
  const size=typeof companySizeBand==='function'?companySizeBand(co):'—';
  return [
    pg01Field('Empresa',`<input data-pg01-company="name" data-pg01-df="DF001" value="${attr(co.name||'')}">`,'Nombre legal o comercial de la empresa.',{source:'Empresas'}),
    pg01Field('Persona de contacto',pg01Select(contactOpts,selected?.id||'',`data-pg01-contact-ref="1" data-pg01-df="DF006"`),'Principal interlocutor de la sesión.',{source:'Contactos'}),
    pg01Field('Cargo',`<input data-pg01-contact="role" value="${attr(selected?.role||'')}">`,'Cargo o rol en la empresa.',{source:'Contactos'}),
    pg01Field('Email',`<input type="email" data-pg01-contact="email" value="${attr(selected?.email||'')}">`,'Email de contacto para comunicaciones posteriores.',{source:'Contactos'}),
    pg01Field('Teléfono',pg01PhoneCompound(selected?.phone||''),'Teléfono de contacto (opcional).',{source:'Contactos',required:false}),
    pg01Field('Sector',pg01Select(sectorOpts,co.sector||'',`data-pg01-company="sector" data-pg01-df="DF002"`),'Selecciona el sector principal de la empresa.',{source:'Empresas'}),
    pg01Field('Tamaño de empresa',`<select data-pg01-company-size="1" disabled><option>${esc(size==='—'?'Sin indicar':`${size} empleados`)}</option></select>`,'Rango aproximado de empleados. Se deriva del número registrado en Empresas.',{source:'Empresas'}),
    pg01Field('País / alcance',pg01Select(countryOpts,co.country||'',`data-pg01-company="country" data-pg01-df="DF005"`),'País principal o alcance de la operación.',{source:'Empresas'}),
    pg01Field('Tipo de organización',pg01Select(orgOpts,co.orgType||'',`data-pg01-company="orgType"`),'Estructura de la organización.',{source:'Empresas'}),
    pg01Field('Prioridad',`<div class="segmented">${PG01_PRIORITY.map(v=>`<button type="button" class="segment ${e.priority===v?'active':''}" data-pg01-engagement="priority" data-value="${attr(v)}">${esc(v)}</button>`).join('')}</div>`,'Nivel de urgencia percibido por el cliente.'),
    pg01Field('Canal de entrada',pg01Select(channelOpts,co.entryChannel||'',`data-pg01-company="entryChannel"`),'Cómo ha llegado el cliente a AUNEA System.',{source:'Empresas'}),
    pg01Field('Resumen del contexto',`<textarea maxlength="500" data-pg01-engagement="contextSummary">${esc(e.contextSummary||'')}</textarea>`,'Breve descripción de la situación actual y principales motivaciones.',{full:false})
  ].join('');
}

// B03 / VR-01B: the five canonical S01 fields not present in IMG90-01's twelve-field composition stay
// in PG01, but behind progressive disclosure. They use the existing renderer and therefore preserve
// Diagnostic Master controls, option sets, branching, write targets and No-Reask. The block auto-opens
// only while an active REQUIRED_90M field inside it is still missing; open/closed state itself is DOM-only.
const PG01_DISCLOSURE_IDS=Object.freeze(['DF004','DF007','DF008','DF009','DF010']);
const PG01_DISCLOSURE_TITLE='Objetivo, criterios y restricciones de la sesión';
function pg01DisclosureFields(fields){return PG01_DISCLOSURE_IDS.map(fid=>fields.find(f=>f.Field_ID===fid)).filter(Boolean)}
function pg01DisclosurePending(fields,e){return pg01DisclosureFields(fields).filter(f=>f.Requiredness==='REQUIRED_90M'&&questionVisible(f,e)&&!valuePresent(effectiveValue(f,e)))}
function pg01CanonicalDisclosure(fields,e){
  const folded=pg01DisclosureFields(fields);if(!folded.length)return '';
  const pending=pg01DisclosurePending(fields,e),open=pending.length?' open':'';
  const status=pending.length?`${pending.length} obligatorio${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}`:'Completo';
  return `<details class="step-group pg01-disclosure"${open}><summary><span>${esc(PG01_DISCLOSURE_TITLE)}</span><span class="conditional-tag">${esc(status)}</span></summary><div class="form-grid">${renderStageFields(folded,e)}</div></details>`;
}

// Continuar never skips a canonical obligation. Requiredness and branch activity are read from the
// Diagnostic Master, so nothing here decides what is mandatory: it only refuses to advance and points
// at the first field still missing, unfolding the progressive-disclosure block when it hides one.
function stagePendingRequired(e,stageId){
  const sid=stageId||e?.stageId||'S01';
  return (schema?.fields||[]).filter(f=>f.Stage_ID===sid&&f.Requiredness==='REQUIRED_90M'&&questionVisible(f,e)&&!valuePresent(effectiveValue(f,e)));
}
function focusPendingField(fid){
  const host=document.querySelector(`.field[data-field="${fid}"]`);
  if(!host)return false;
  const fold=host.closest&&host.closest('details.pg01-disclosure');
  if(fold)fold.open=true;
  host.classList.add('field-pending');
  const control=host.querySelector('input,select,textarea,button');
  if(control&&typeof control.focus==='function')control.focus();
  if(typeof host.scrollIntoView==='function')host.scrollIntoView({block:'center'});
  return true;
}
// PG01 only: the reference composition folds DF008 away, so advancing without it would hide a
// REQUIRED_90M capture behind a closed block. Later stages keep their existing behaviour.
function blockStageAdvance(e){
  if(!e||(e.stageId||'S01')!=='S01')return false;
  const pending=stagePendingRequired(e,'S01');
  if(!pending.length)return false;
  const first=pending[0];
  focusPendingField(first.Field_ID);
  toast(`Falta un campo obligatorio: ${first.Pregunta_o_etiqueta_ES||first.Field_ID}`);
  return true;
}

function bindPg01Context(){
  document.querySelectorAll('[data-pg01-company]').forEach(el=>{const event=el.tagName==='SELECT'?'change':'input';el.addEventListener(event,()=>{
    const e=currentEng(),co=e&&companyById(e.companyId);if(!e||!co)return;
    const key=el.dataset.pg01Company,fid=el.dataset.pg01Df||'';
    if(fid){setAnswer(fid,el.value);return}
    const before=co[key];if(String(before??'')===String(el.value??''))return;
    co[key]=el.value;e.updatedAt=now();audit(`Empresa ${co.name}: ${key} actualizado desde PG01`);markDirty(`PG01 actualizado: ${key}`);
  })});
  document.querySelectorAll('[data-pg01-contact]').forEach(el=>el.addEventListener('input',()=>{
    const e=currentEng(),ct=e&&contactById(e.contactIds?.[0]);if(!e||!ct)return;
    const key=el.dataset.pg01Contact,before=ct[key];if(String(before??'')===String(el.value??''))return;
    ct[key]=el.value;e.updatedAt=now();audit(`Contacto ${contactFullName(ct)}: ${key} actualizado desde PG01`);markDirty(`PG01 actualizado: contacto ${key}`);
  }));
  // Both boxes of the phone compound write the single Contact.Teléfono value.
  document.querySelectorAll('[data-pg01-phone]').forEach(el=>el.addEventListener('input',()=>{
    const e=currentEng(),ct=e&&contactById(e.contactIds?.[0]);if(!e||!ct)return;
    const part=p=>document.querySelector(`[data-pg01-phone="${p}"]`)?.value||'';
    const next=phoneJoin(part('prefix'),part('number'));
    if(String(ct.phone??'')===next)return;
    ct.phone=next;e.updatedAt=now();audit(`Contacto ${contactFullName(ct)}: phone actualizado desde PG01`);markDirty('PG01 actualizado: contacto phone');
  }));
  document.querySelectorAll('[data-pg01-contact-ref]').forEach(el=>el.addEventListener('change',()=>{if(el.value)setAnswer('DF006',el.value);render()}));
  document.querySelectorAll('[data-pg01-engagement]').forEach(el=>{
    const key=el.dataset.pg01Engagement;
    if(el.tagName==='BUTTON')el.onclick=()=>{const e=currentEng();if(!e)return;e[key]=el.dataset.value||'';e.updatedAt=now();markDirty(`PG01 actualizado: ${key}`);render()};
    else el.addEventListener('input',()=>{const e=currentEng();if(!e)return;e[key]=el.value;e.updatedAt=now();markDirty(`PG01 actualizado: ${key}`)});
  });
}

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
  S08:{id:'C90-03',shared:true,text:'El cliente mantiene el AS-IS enriquecido. El estado objetivo y las restricciones se capturan aquí, en privado.'},
  S09:{id:'C90-04',shared:true,text:'Validación final del AS-IS enriquecido más un cierre compacto junto al flujo.'}
};

// The inspector explains the stage from its own canonical attributes — objective, input, main
// interaction, output and exit criterion — instead of restating them as invented copy.
function stagePurposeCard(stage){
  const rows=[['Objetivo',stage.Objetivo],['Entrada',stage.Entrada],['Interacción principal',stage['Interacción_principal']],
              ['Salida',stage.Salida],['Criterio de salida',stage.Criterio_de_salida]].filter(([,v])=>v);
  return insCard('Qué prepara este paso',`<ul class="numbered-list">${rows.map(([k,v],i)=>
    `<li><span class="n">${i+1}</span><div><b>${esc(k)}</b><p>${esc(v)}</p></div></li>`).join('')}</ul>`,{icon:'▤'});
}
function stageCoverageCard(stage,fields){
  const ids=fields.map(f=>f.Field_ID).filter(Boolean).sort();
  const range=ids.length?(ids.length===1?ids[0]:`${ids[0]} – ${ids[ids.length-1]}`):'—';
  return insCard('Cobertura',
    `<div class="coverage-chips"><span class="chip">${esc(range)}</span><span class="chip">${esc(stage.Stage_ID)}</span><span class="chip gold">${esc(String(stage.Minutos_objetivo))} min</span></div>`
    +`<p class="ins-note">${esc(stage.Regla_de_tiempo||'')}</p>`,{icon:'◎'});
}
function stageClientCard(stage){
  const c=STAGE_CLIENT_STATE[stage.Stage_ID]||{id:'—',shared:false,text:''};
  return insCard('Vista de la sesión',`<p>${esc(c.text)}</p><div class="coverage-chips" style="margin-top:10px"><span class="chip">${esc(c.id)}</span><span class="chip ${c.shared?'gold':''}">${c.shared?'Compartida con el cliente':'No se comparte'}</span></div>`,
    {accent:true,icon:c.shared?'◉':'◌'});
}

function stagePage(){
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
  const main=`<div class="card stage-card">
      ${stage.Stage_ID==='S01'?REQUIRED_LEGEND_HTML:(fields.some(f=>f.Requiredness==='REQUIRED_90M')?REQUIRED_LEGEND_HTML:'')}
      <div class="form-grid">${stageFields}</div>
      ${pg01Disclosure}
      ${stage.Stage_ID==='S04'?processPrompt(e):''}${stage.Stage_ID==='S05'?frictionPrompt(e):''}
      ${stage.Stage_ID==='S06'?riskBuilder(e):''}${stage.Stage_ID==='S07'?economicBuilder(e):''}
      ${isLastStage?validationSummary(e,completion):''}
    </div>`;

  const inspector=stageClientCard(stage)+stagePurposeCard(stage)+stageCoverageCard(stage,fields)
    +insCard('Progreso de la captura',
      `<div class="completion-headline" style="margin-bottom:8px">${completion.readyToCalculate?'<span class="status green">Listo para calcular</span>':`<span class="status amber">${completion.missing.length} pendiente${completion.missing.length===1?'':'s'}</span>`}</div>`
      +kvRows([['En esta etapa',`${stageStat.answered} de ${stageStat.applicable} campo(s) con dato`],
               ['Etapas revisadas',`${completion.stagesReviewed} de ${completion.stagesTotal}`],
               ['Obligatorios',`${completion.requiredComplete} de ${completion.requiredApplicable}`],
               ['Evidencia pendiente',String(completion.evidencePending.length)]]),{icon:'▥'});

  // The last stage carries no second calculate button: validationSummary owns that CTA, together with
  // the blockers that explain why it is or is not available. Two of them was one too many.
  const bar=actionBar(
    `<button class="btn" id="saveDraft">Guardar borrador</button>`
    +`<button class="btn btn-outline" id="openSessionDisplay">Abrir vista de sesión</button>`,
    `<button class="btn" id="prevStage" ${stageIndex===0?'disabled':''}>Volver</button>`
    +(isLastStage?'':`<button class="btn btn-primary" id="nextStage">Continuar a ${esc(String(next.Stage_ES).toLowerCase())} →</button>`));

  const pageTitle=stage.Stage_ID==='S01'?'Contexto del cliente':stage.Stage_ES;
  const pageSubtitle=stage.Stage_ID==='S01'?'Recogemos la base operativa y empresarial antes de entrar en el flujo.':stage.Objetivo;
  return pageTop(pageTitle,pageSubtitle,'',STAGE_REFERENCE[stage.Stage_ID]||'')
    + workspace(main,inspector) + bar;
}
function processPrompt(e){return `<div class="notice info"><strong>Mapa AS-IS:</strong> los campos DF031–DF055 se capturan principalmente en el editor visual. Actualmente hay <b>${e.processSteps.filter(x=>x.status!=='SUPERSEDED').length}</b> pasos. <button class="btn btn-small" data-goto-process="1">Abrir editor</button></div>`}
function frictionPrompt(e){return `<div class="notice info"><strong>Fricciones:</strong> DF056–DF065 se capturan vinculando cada fricción a uno o varios pasos. Actualmente hay <b>${e.frictions.filter(x=>x.status!=='SUPERSEDED').length}</b> fricciones. <button class="btn btn-small" data-goto-process="1">Abrir fricciones</button></div>`}

// Real closing screen for the last stage (UAT-VIS-063/064/066/067): factual summary, never a proxy
// state ("revisada"/"confirmado") that the data model does not actually have (correction #3) — only
// e.confirmedAsIs is a real confirmed state; frictions/risks only ever report "con evidencia/controles
// registrados". CTA mirrors runDiagnosis()'s own gate exactly via completion.readyToCalculate.
function validationSummary(e,completion){
  const steps=activeSteps(e),fr=activeFrictions(e),risks=e.risks||[],econ=e.economicInputs||[];
  const frWithEvidence=fr.filter(x=>!!x.evidence_type).length;
  const risksWithControls=risks.filter(x=>x.controls_present===true).length;
  const econByType={};
  econ.forEach(x=>{const t=evidenceTypeBackend(x.evidence_type);econByType[t]=(econByType[t]||0)+1});
  const econLine=Object.keys(econByType).length?Object.entries(econByType).map(([k,v])=>`${v} ${engineLabel('evidence_quality',k)}`).join(', '):'Sin inputs económicos registrados';
  const nextStep=e.answers?.DF098||'',notes=e.answers?.DF100||'';
  // The sealed record internal work will read. It appears here because PG09 is where it is created.
  const snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null;
  const cta=completion.readyToCalculate
    ?`<button class="btn btn-primary" id="runDiag">${e.diagnosticOutput?'RECALCULAR DIAGNÓSTICO Y RECOMENDACIÓN':'CALCULAR DIAGNÓSTICO Y RECOMENDACIÓN'}</button>`
    :`<div class="blocker-list">${completion.blockers.map(b=>{
        const action=b.type==='GATE'?'<button type="button" class="btn btn-small" data-open-gate-review="1">Confirmar</button>'
          :(b.navigationTarget==='proceso'?'<button type="button" class="btn btn-small" data-goto-process="1">Ir a completar</button>'
          :`<button type="button" class="btn btn-small" data-goto-stage="${attr(b.stage||'')}">Ir a completar</button>`);
        return `<div class="notice warn"><span>${esc(b.label)}</span>${action}</div>`;
      }).join('')}</div>`;
  return section('Resumen antes de calcular','Revisión factual del estudio; ningún estado se afirma más allá de lo realmente capturado.',
    `<div class="grid g3">
      <div class="notice"><b>Proceso</b><br>${steps.length} paso(s) activo(s) · ${e.confirmedAsIs?'AS-IS confirmado':'AS-IS pendiente de confirmar'}</div>
      <div class="notice"><b>Fricciones</b><br>${fr.length} detectada(s), ${frWithEvidence} con evidencia registrada</div>
      <div class="notice"><b>Riesgos</b><br>${risks.length} registrado(s), ${risksWithControls} con controles registrados</div>
      <div class="notice"><b>Economics</b><br>${econ.length} input(s) — ${esc(econLine)}</div>
      <div class="notice"><b>Obligatorios</b><br>${completion.missing.length===0?'✓ completos':`${completion.missing.length} pendiente(s)`}</div>
      <div class="notice"><b>Siguiente paso</b><br>${nextStep?esc(nextStep):'Pendiente de acordar (DF098)'}</div>
      <div class="notice"><b>Snapshot sellado</b><br>${snap?`v${snap.version} · ${esc(formatDateEs(snap.sealedAt))}`:'Se sella al confirmar el AS-IS'}</div>
    </div>
    <div class="field-help internal-only" style="margin-top:10px"><b>Notas internas del consultor:</b> ${notes?esc(notes):'—'}</div>
    <div style="margin-top:16px">${cta}</div>`
  );
}
const __auneaDiagFieldsBindForms=bindForms;
bindForms=function(){
  __auneaDiagFieldsBindForms();
  bindPg01Context();
  document.querySelectorAll('[data-goto-stage]').forEach(b=>b.onclick=()=>{const e=currentEng();if(e)e.stageId=b.dataset.gotoStage;render()});
  document.querySelectorAll('[data-open-gate-review]').forEach(b=>b.onclick=()=>openEngineGateReview());
  const sd=document.getElementById('saveDraft');if(sd)sd.onclick=()=>saveState('Borrador guardado');
};
// [AUNEA-FE-DIAG-CONTROL-030] END