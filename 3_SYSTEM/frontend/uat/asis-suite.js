// [AUNEA-UAT-ASIS-SUITE-060] START — 25 estudios UAT de Mapa AS-IS, fricciones, riesgo e impacto
// PURPOSE: Proveer 25 estudios sintéticos cargables que ejercitan las cuatro capas AS-IS sin presentarlos como casos reales ni alterar reglas/engines.
// SOURCE: Diagnostic Master v1.2 (S04-S07 / DF031-DF085); Process Step Model; Friction Model; DEC-064/065; Simulator CANONICAL v1.14.
// INPUTS: schema canónico y helpers UAT existentes (uatBundle/uatStep/uatFriction/uatRisk/uatEconomic).
// OUTPUTS: bundles Company/Contact/Engagement con ProcessStep, Friction, RiskInput y EconomicInput; catálogo y controles internos de carga.
// SIDE_EFFECTS: sólo cuando el usuario pulsa Cargar/Cargar los 25 se insertan registros con prefijo UAT-ASIS en colecciones locales.
// CHANGE_RISK: HIGH.

const ASIS_UAT_REQUIRED_DFS=Object.freeze(Array.from({length:55},(_,i)=>`DF${String(i+31).padStart(3,'0')}`));
const ASIS_UAT_PROCESS_FIELDS=Object.freeze((schema?.process_step_model||[]).map(x=>x.Field_Key));
const ASIS_UAT_FRICTION_FIELDS=Object.freeze((schema?.friction_model||[]).map(x=>x.Field_Key));
const ASIS_UAT_RISK_FIELDS=Object.freeze(['step_ids','category','description','likelihood_1_5','impact_1_5','reversible','reversibility','controls_present','sensitive_or_high_impact','material_financial_or_compliance','critical_trigger']);
const ASIS_UAT_ECONOMIC_FIELDS=Object.freeze(['step_ids','driver_id','annual_active_hours','annual_wait_hours','capacity_cost_rate_eur_hour','direct_loss_eur_annual','current_tool_cost_eur_annual','realized_cash_saving_eur_annual','evidence_type','deduplication_key']);

const ASIS_UAT_STUDIES=Object.freeze([
  ['Intake de cliente','Recepción → validación → decisión → alta','Equilibrado: flujo, decisión, fricción y coste'],
  ['Onboarding de cliente','Preparar acceso → recopilar datos → aprobar → activar','Dependencias, documentos y espera'],
  ['Kickoff de proyecto','Recibir alcance → preparar plan → validar → arrancar','Handoff, decisión y capacidad'],
  ['Preparación de propuesta','Recibir necesidad → estimar → aprobar → enviar','Versiones, aprobación y retrabajo'],
  ['Facturación y cobro','Preparar factura → revisar → emitir → seguir cobro','Pérdida directa, espera y seguimiento'],
  ['Alta de proveedor','Recibir datos → validar → aprobar → registrar','Datos maestros, compliance y duplicidad'],
  ['Selección inicial de candidato','Recibir candidatura → filtrar → entrevistar → decidir','Decisión humana, datos sensibles y riesgo'],
  ['Gestión de ticket de soporte','Registrar → clasificar → resolver → cerrar','Volumen, excepciones y tiempos'],
  ['Aprobación de contenido','Crear borrador → revisar → aprobar → publicar','Versionado, feedback y retrabajo'],
  ['Inscripción a evento','Recibir inscripción → validar → cobrar → confirmar','Canales, datos y excepciones'],
  ['Solicitud de formación','Recibir petición → evaluar → aprobar → inscribir','Aprobación y restricciones'],
  ['Solicitud de compra','Solicitar → comparar → aprobar → ordenar','Umbrales, decisión y control'],
  ['Validación de gastos','Recibir gasto → comprobar → aprobar → contabilizar','Errores, reentrada y compliance'],
  ['Revisión contractual','Recibir contrato → revisar → negociar → aprobar','Riesgo, irreversibilidad y evidencias'],
  ['Provisionamiento de acceso','Solicitar acceso → validar rol → aprobar → activar','Seguridad, control y acción irreversible'],
  ['Reporting recurrente','Extraer datos → consolidar → revisar → distribuir','Búsqueda, calidad y reporting manual'],
  ['Cualificación de lead','Registrar lead → enriquecer → puntuar → asignar','Datos, decisión y CRM'],
  ['Seguimiento documental','Solicitar documento → perseguir → validar → archivar','Seguimiento, espera y workaround'],
  ['Renovación de cliente','Revisar uso → preparar propuesta → aprobar → renovar','Revenue impact y decisión'],
  ['Gestión de incidencia','Detectar → diagnosticar → escalar → resolver','Excepciones, riesgo alto y esperas'],
  ['Preparación de campaña','Brief → producir → revisar → lanzar','Múltiples actores, archivos y calidad'],
  ['Validación de partes de horas','Recibir horas → revisar → corregir → aprobar','Retrabajo, frecuencia y capacidad'],
  ['Control de calidad de entrega','Preparar entrega → revisar → corregir → liberar','Calidad, evidencia y pérdida evitada'],
  ['Planificación de citas','Solicitar cita → buscar hueco → confirmar → recordar','Búsqueda, canales y espera'],
  ['Flujo mixto complejo','Entrada → enriquecer → decidir → excepción → cierre','Stress funcional combinado de las cuatro capas']
].map((x,i)=>Object.freeze({id:i+1,title:x[0],process:x[1],focus:x[2]})));

function asisUatPick(setId,index=0){
  const opts=uatOptions(setId);return opts.length?opts[index%opts.length]?.value||opts[0]?.value||'':'';
}
function asisUatProfile(n){return ASIS_UAT_STUDIES[n-1]||null}
function asisUatIds(n){
  const z=String(n).padStart(2,'0');
  return {z,cid:`UAT-ASIS-CMP-${z}`,pid:`UAT-ASIS-CON-${z}`,eid:`UAT-ASIS-ENG-${z}`};
}
function asisUatStudyBundle(n){
  const profile=asisUatProfile(n);if(!profile)return null;
  const ids=asisUatIds(n),b=uatBundle(100+n,profile.title),e=b.engagement;
  b.company.id=ids.cid;b.company.name=`${profile.title} · Empresa sintética UAT-ASIS-${ids.z}`;b.company.notes='Estudio sintético UAT AS-IS — no es un cliente ni un caso real.';
  const sector=fieldOptions('REF_INDUSTRY_CNAE25');if(sector.length)b.company.sector=sector[(n-1)%sector.length].value;
  b.contact.id=ids.pid;b.contact.companyId=ids.cid;b.contact.name=`Contacto UAT AS-IS ${ids.z}`;b.contact.status='Activo';
  e.id=ids.eid;e.companyId=ids.cid;e.contactIds=[ids.pid];e.title=`UAT-ASIS-${ids.z} · ${profile.title}`;e.processName=profile.title;e.stageId='S04';e.processTab='cliente';
  e.layerConfirmations={map:false,frictions:false,risks:false,impact:false};e.confirmedAsIs=false;e.answers=e.answers||{};e.answerDetails=e.answerDetails||{};
  Object.assign(e.answers,{DF001:b.company.name,DF002:b.company.sector,DF006:ids.pid,DF011:profile.title,DF014:'Entrada del proceso',DF015:'Resultado completado'});

  const stepType=uatOptions('OS_STEP_TYPE'),actors=uatOptions('OS_ACTOR_ROLE'),tools=uatOptions('OS_TOOL_CATEGORY'),artifacts=uatOptions('OS_ARTIFACT_TYPE'),manual=uatOptions('OS_MANUAL_ACTION'),channels=uatOptions('OS_COMM_CHANNEL'),auto=uatOptions('OS_AUTOMATION_STATE'),criteria=uatOptions('OS_DECISION_CRITERIA'),evidence=uatOptions('OS_EVIDENCE_TYPE'),exceptions=uatOptions('OS_EXCEPTION_TYPE');
  const verbs=profile.process.split('→').map(x=>x.trim()).filter(Boolean);while(verbs.length<4)verbs.push(`Paso ${verbs.length+1}`);
  const steps=verbs.slice(0,n===25?5:4).map((name,i)=>uatStep(`ASIS-${ids.z}-${i+1}`,{
    step_name:name,step_type:(stepType[(n+i)%Math.max(stepType.length,1)]||stepType[0])?.value||'',
    actor:(actors[(n+i)%Math.max(actors.length,1)]||actors[0])?.value||'',
    tool:(tools[(n+i)%Math.max(tools.length,1)]||tools[0])?.value||'',
    applies_to:i===1&&n%3===0?{mode:'PERCENT',value:String(60+(n%4)*10),condition:''}:i===2&&n%4===0?{mode:'CONDITION',value:'',condition:'Sólo cuando existe excepción material'}:{mode:'ALL',value:'',condition:''},
    occurrences_per_case:i===1&&n%5===0?2:1,
    inputs:[(artifacts[(n+i)%Math.max(artifacts.length,1)]||artifacts[0])?.value].filter(Boolean),
    outputs:[(artifacts[(n+i+1)%Math.max(artifacts.length,1)]||artifacts[0])?.value].filter(Boolean),
    active_time:5+n+i*3,wait_time:i===1?30+n*4:(i===2&&n%2===0?120+n*3:0),rework_time:i===2?5+(n%7):0,
    error_rate:{value:i===2?2+(n%12):0,mode:'percent',period:'case'},
    manual_actions:[(manual[(n+i)%Math.max(manual.length,1)]||manual[0])?.value].filter(Boolean),
    automation_state:(auto[(n+i)%Math.max(auto.length,1)]||auto[0])?.value||'',
    communication_channels:[(channels[(n+i)%Math.max(channels.length,1)]||channels[0])?.value].filter(Boolean),
    evidence:[(evidence[(n+i)%Math.max(evidence.length,1)]||evidence[0])?.value].filter(Boolean),
    notes:i===0?`UAT-ASIS-${ids.z}: ${profile.focus}`:''
  }));
  if(steps.length>=3){
    steps[2].step_type=(stepType.find(x=>['ST04','ST05'].includes(String(x.value)))||stepType[2]||stepType[0])?.value||steps[2].step_type;
    steps[2].decision_criteria=[(criteria[n%Math.max(criteria.length,1)]||criteria[0])?.value].filter(Boolean);
    steps[2]._ui={has_decision:true};
    steps[2].exception_path={type:(exceptions[n%Math.max(exceptions.length,1)]||exceptions[0])?.value||'',condition:`Excepción UAT AS-IS ${ids.z}`,destination_step:steps[0].id,owner:steps[2].actor};
  }
  uatChain(steps);e.processSteps=steps;

  const toolValues=[...new Set(steps.map(s=>s.tool).filter(Boolean))],inputValues=[...new Set(steps.flatMap(s=>s.inputs||[]))],channelValues=[...new Set(steps.flatMap(s=>s.communication_channels||[]))];
  const controls=uatOptions('OS_CONTROL_TYPE'),dq=uatOptions('OS_DATA_QUALITY_ISSUE');
  Object.assign(e.answers,{
    DF046:toolValues,DF047:inputValues.slice(0,3),DF048:inputValues.slice(0,2),DF049:inputValues.slice(0,3),DF050:channelValues,
    DF051:{from:steps[0].id,to:steps[1]?.id||steps[0].id},
    DF052:[(controls[n%Math.max(controls.length,1)]||controls[0])?.value].filter(Boolean),
    DF053:[steps[1]?.id||steps[0].id],
    DF054:steps[1]?`pair:${steps[0].id}:${steps[1].id}`:'',
    DF055:[(dq[n%Math.max(dq.length,1)]||dq[0])?.value].filter(Boolean)
  });
  e.answers.DF054=e.answers.DF054?[e.answers.DF054]:[];e.answerDetails.DF055__steps=[steps[1]?.id||steps[0].id];

  const frTypes=uatOptions('OS_FRICTION_TYPE'),frCauses=uatOptions('OS_FRICTION_CAUSE'),nonTime=uatOptions('OS_NON_TIME_IMPACT'),work=uatOptions('OS_WORKAROUND');
  e.frictions=[0,1].map(i=>uatFriction(`ASIS-${ids.z}-${i+1}`,{
    affected_steps:i===0?[steps[1]?.id||steps[0].id]:[steps[2]?.id||steps[0].id,steps[3]?.id||steps.at(-1).id],
    friction_type:(frTypes[(n+i)%Math.max(frTypes.length,1)]||frTypes[0])?.value||'',
    cause:[(frCauses[(n+i)%Math.max(frCauses.length,1)]||frCauses[0])?.value].filter(Boolean),
    client_label:i===0?`Problema operativo UAT ${ids.z}`:'',
    observable_signal:i===0?`${15+n}% de casos necesitan seguimiento o corrección`:`Casos con espera superior a ${2+(n%5)} horas`,
    frequency:{value:i===0?15+n:2+(n%6),mode:i===0?'percent':'count',period:i===0?'case':'month'},
    impact:String(1+((n+i)%5)),active_time_loss:{value:4+n+i,unit:'min',source_unit:'min',mode:''},
    wait_time_loss:{value:30+n*3+i*15,unit:'min',source_unit:'min',mode:''},
    direct_loss:{value:(n%5===0||i===1)?50+n*10:0,unit:'EUR',period:'month',mode:''},
    non_time_impact:[(nonTime[(n+i)%Math.max(nonTime.length,1)]||nonTime[0])?.value].filter(Boolean),
    workaround:[(work[(n+i)%Math.max(work.length,1)]||work[0])?.value].filter(Boolean),
    evidence_ids:[`UAT-ASIS-EV-${ids.z}-${i+1}`],evidence_type:(evidence[(n+i)%Math.max(evidence.length,1)]||evidence[0])?.value||'EV02',
    confidence:i===0?'MEDIUM':'HIGH',priority_client:i+1,status:'ACTIVE',notes:i===1?'Nota sintética de contraste UAT':''
  }));
  e.frictions.forEach(f=>{f.derived_pain_id=typeof painForFriction==='function'?painForFriction(f.friction_type):null});

  const riskCats=uatOptions('OS_RISK_CATEGORY'),reversibility=uatOptions('OS_REVERSIBILITY'),sensitive=uatOptions('OS_SENSITIVE_DATA'),noAuto=uatOptions('OS_NO_AUTOMATE');
  e.risks=[
    uatRisk({step_ids:[steps[2]?.id||steps[0].id],category:(riskCats[n%Math.max(riskCats.length,1)]||riskCats[0])?.value||'',description:`Riesgo UAT AS-IS ${ids.z} A`,likelihood_1_5:1+(n%5),impact_1_5:1+((n+2)%5),controls_present:n%2===0,sensitive_or_high_impact:n%3===0,material_financial_or_compliance:n%4===0,critical_trigger:n%5===0,reversibility:(reversibility[n%Math.max(reversibility.length,1)]||reversibility[0])?.value||''}),
    uatRisk({step_ids:[steps.at(-1).id],category:(riskCats[(n+1)%Math.max(riskCats.length,1)]||riskCats[0])?.value||'',description:`Riesgo UAT AS-IS ${ids.z} B`,likelihood_1_5:2+((n+1)%4),impact_1_5:2+((n+2)%4),controls_present:n%2!==0,sensitive_or_high_impact:n%4===0,material_financial_or_compliance:n%3===0,critical_trigger:n===25,reversibility:(reversibility[(n+1)%Math.max(reversibility.length,1)]||reversibility[0])?.value||''})
  ];
  e.risks.forEach(r=>{r.reversible=!['HARD','IRREVERSIBLE'].includes(String(r.reversibility||''))});
  Object.assign(e.answers,{
    DF066:[steps[2]?.exception_path?.type].filter(Boolean),DF067:[steps[2]?.id].filter(Boolean),DF069:[...new Set(e.risks.map(r=>r.category).filter(Boolean))],
    DF070:String(e.risks[0].likelihood_1_5),DF071:String(e.risks[0].impact_1_5),
    DF072:[(controls[(n+1)%Math.max(controls.length,1)]||controls[0])?.value].filter(Boolean),
    DF073:[(sensitive[n%Math.max(sensitive.length,1)]||sensitive[0])?.value].filter(Boolean),
    DF074:e.risks[0].reversibility,DF075:[(noAuto[n%Math.max(noAuto.length,1)]||noAuto[0])?.value].filter(Boolean)
  });
  e.answerDetails.DF074__step=steps[2]?.id||steps[0].id;e.answerDetails.DF075__steps=[steps[2]?.id||steps[0].id];

  const drivers=schema?.tables?.REF_ECON_DRIVER||[],evidenceQualities=['MEASURED','CLIENT_DECLARED','AUNEA_ESTIMATE','SPECIFIC_BENCHMARK','HYPOTHESIS'];
  e.economicInputs=[
    uatEconomic({step_ids:[steps[0].id,steps[1]?.id||steps[0].id],driver_id:(drivers[n%Math.max(drivers.length,1)]||drivers[0])?.Economic_Driver_ID||'D1',annual_active_hours:80+n*7,annual_wait_hours:20+n*4,capacity_cost_rate_eur_hour:25+(n%6)*5,direct_loss_eur_annual:n%3===0?600+n*40:0,current_tool_cost_eur_annual:300+n*25,realized_cash_saving_eur_annual:n%4===0?200+n*20:0,evidence_type:evidenceQualities[n%evidenceQualities.length],deduplication_key:`UAT-ASIS-${ids.z}-ECON-A`}),
    uatEconomic({step_ids:[steps[2]?.id||steps[0].id],driver_id:(drivers[(n+1)%Math.max(drivers.length,1)]||drivers[0])?.Economic_Driver_ID||'D1',annual_active_hours:30+n*3,annual_wait_hours:10+n*2,capacity_cost_rate_eur_hour:35+(n%5)*5,direct_loss_eur_annual:250+n*30,current_tool_cost_eur_annual:n%2===0?900+n*10:0,realized_cash_saving_eur_annual:0,evidence_type:evidenceQualities[(n+1)%evidenceQualities.length],deduplication_key:`UAT-ASIS-${ids.z}-ECON-B`})
  ];
  Object.assign(e.answers,{
    DF076:{value:25+(n%6)*5,unit:'EUR',period:'h',mode:''},DF077:{value:120+n*5,unit:'h',period:'year',mode:''},
    DF078:{value:110+n*8,unit:'h',period:'year',mode:''},DF079:{value:20+n*2,unit:'h',period:'year',mode:''},
    DF080:{value:12+n,unit:'h',period:'year',mode:''},DF081:{value:8+n,unit:'h',period:'year',mode:''},
    DF082:{value:500+n*50,unit:'EUR',period:'year',mode:''},DF083:{value:600+n*25,unit:'EUR',period:'year',mode:''},
    DF084:{value:n%4===0?1200+n*60:0,unit:'EUR',period:'year',mode:''},DF085:e.economicInputs[0].evidence_type
  });

  e.uatAsisProfile={id:profile.id,focus:profile.focus,synthetic:true,coverage:['S04','S05','S06','S07']};
  return b;
}

function asisUatCoverageReport(){
  const bundles=ASIS_UAT_STUDIES.map(x=>asisUatStudyBundle(x.id));
  const stepFields=new Set(),frictionFields=new Set(),riskFields=new Set(),economicFields=new Set(),dfs=new Set();
  bundles.forEach(b=>{
    const e=b.engagement;
    (e.processSteps||[]).forEach(s=>Object.keys(s||{}).forEach(k=>stepFields.add(k)));
    (e.frictions||[]).forEach(f=>Object.keys(f||{}).forEach(k=>frictionFields.add(k)));
    (e.risks||[]).forEach(r=>Object.keys(r||{}).forEach(k=>riskFields.add(k)));
    (e.economicInputs||[]).forEach(x=>Object.keys(x||{}).forEach(k=>economicFields.add(k)));
    Object.keys(e.answers||{}).filter(k=>/^DF\d{3}$/.test(k)&&Number(k.slice(2))>=31&&Number(k.slice(2))<=85).forEach(k=>dfs.add(k));
    (schema?.process_step_model||[]).forEach(m=>{if(m.Canonical_Field_ID&&(e.processSteps||[]).some(s=>s[m.Field_Key]!==undefined))dfs.add(m.Canonical_Field_ID)});
    (schema?.friction_model||[]).forEach(m=>{if(m.Canonical_Field_ID&&(e.frictions||[]).some(f=>f[m.Field_Key]!==undefined))dfs.add(m.Canonical_Field_ID)});
    if((e.frictions||[]).some(f=>f.derived_pain_id))dfs.add('DF057');
    if((e.risks||[]).length)dfs.add('DF068');
  });
  return {
    studies:bundles.length,
    missing_dfs:ASIS_UAT_REQUIRED_DFS.filter(x=>!dfs.has(x)),
    missing_process_fields:ASIS_UAT_PROCESS_FIELDS.filter(x=>!stepFields.has(x)),
    missing_friction_fields:ASIS_UAT_FRICTION_FIELDS.filter(x=>!frictionFields.has(x)),
    missing_risk_fields:ASIS_UAT_RISK_FIELDS.filter(x=>!riskFields.has(x)),
    missing_economic_fields:ASIS_UAT_ECONOMIC_FIELDS.filter(x=>!economicFields.has(x))
  };
}

function removeAsisUatStudyRecords(){
  state.companies=state.companies.filter(x=>!String(x.id||'').startsWith('UAT-ASIS-'));
  state.contacts=state.contacts.filter(x=>!String(x.id||'').startsWith('UAT-ASIS-'));
  state.engagements=state.engagements.filter(x=>!String(x.id||'').startsWith('UAT-ASIS-'));
  if(String(state.activeEngagementId||'').startsWith('UAT-ASIS-'))state.activeEngagementId=null;
}
function insertAsisUatBundle(b){
  const ids=[b.company.id,b.contact.id,b.engagement.id];
  state.companies=state.companies.filter(x=>x.id!==ids[0]);state.contacts=state.contacts.filter(x=>x.id!==ids[1]);state.engagements=state.engagements.filter(x=>x.id!==ids[2]);
  state.companies.push(b.company);state.contacts.push(b.contact);state.engagements.unshift(b.engagement);
}
function loadAsisUatStudy(n){
  const b=asisUatStudyBundle(n);if(!b)return toast('Estudio UAT AS-IS no encontrado.');
  insertAsisUatBundle(b);state.activeEngagementId=b.engagement.id;state.activePage='proceso';
  markDirty(`UAT-ASIS-${String(n).padStart(2,'0')} cargado: ${b.engagement.title}`);persistRecoverySnapshot('uat-asis-study-load');render();
  toast(`UAT-ASIS-${String(n).padStart(2,'0')} cargado. Revisa las cuatro capas desde el editor.`);
}
function loadAllAsisUatStudies(){
  removeAsisUatStudyRecords();
  ASIS_UAT_STUDIES.forEach(def=>insertAsisUatBundle(asisUatStudyBundle(def.id)));
  state.activeEngagementId=asisUatIds(1).eid;state.activePage='estudios';
  markDirty('Suite UAT AS-IS: 25 estudios cargados');persistRecoverySnapshot('uat-asis-suite-load');render();
  toast('25 estudios UAT AS-IS cargados. Ábrelos desde Estudios para revisar la plataforma.');
}
function asisUatSuiteHtml(){
  const report=asisUatCoverageReport(),ok=!report.missing_dfs.length&&!report.missing_process_fields.length&&!report.missing_friction_fields.length&&!report.missing_risk_fields.length&&!report.missing_economic_fields.length;
  return section('Suite UAT AS-IS · 25 estudios','Estudios sintéticos para probar Mapa AS-IS, Fricciones y evidencia, Riesgos y controles e Impacto económico. No son casos reales ni referencias comerciales.',
    `<div class="notice ${ok?'good':'warn'}"><b>Cobertura:</b> ${report.studies} estudios · DF031–DF085 ${report.missing_dfs.length?'con gaps: '+report.missing_dfs.join(', '):'cubiertos'} · ProcessStep ${report.missing_process_fields.length?'con gaps':'completo'} · Friction ${report.missing_friction_fields.length?'con gaps':'completo'} · RiskInput ${report.missing_risk_fields.length?'con gaps':'completo'} · EconomicInput ${report.missing_economic_fields.length?'con gaps':'completo'}.</div><div class="result-list" style="margin-top:12px">${ASIS_UAT_STUDIES.map(x=>`<div class="result-item"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><b>UAT-ASIS-${String(x.id).padStart(2,'0')} · ${esc(x.title)}</b><p>${esc(x.process)} · ${esc(x.focus)}</p></div><button class="btn btn-outline" data-load-asis-uat="${x.id}">Cargar estudio</button></div></div>`).join('')}</div>`,
    '<button class="btn btn-primary" id="loadAllAsisUat">Cargar los 25 estudios</button>');
}

const __auneaUatPageBeforeAsisSuite=pages.uat;
pages.uat=function(){return __auneaUatPageBeforeAsisSuite()+asisUatSuiteHtml()};
const __auneaPostBindBeforeAsisSuite=postBind;
postBind=function(){
  __auneaPostBindBeforeAsisSuite();
  document.querySelectorAll('[data-load-asis-uat]').forEach(b=>b.onclick=()=>loadAsisUatStudy(Number(b.dataset.loadAsisUat)));
  const all=document.getElementById('loadAllAsisUat');if(all)all.onclick=loadAllAsisUatStudies;
};
// [AUNEA-UAT-ASIS-SUITE-060] END
