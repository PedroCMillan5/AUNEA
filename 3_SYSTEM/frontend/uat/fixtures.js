// [AUNEA-UAT-RUNTIME-FIXTURE-020] START — Runtime fixture aislado visible
// PURPOSE: Satisfy REQ-UAT-001 by generating identifiable Company/Contact/Engagement/Step/Friction test records without inserting them into operational collections.
// SOURCE: REQ-UAT-001; UAT-CORE-001; DEC-040/042.
// INPUTS: canonical runtime schema only.
// OUTPUTS: UAT-* record bundle attached to state.uatLastRun.runtime_fixture.
// SIDE_EFFECTS: QA result only; never pushes into state.companies/contacts/engagements/projects.
// CHANGE_RISK: HIGH.
function buildIsolatedRuntimeFixture(){
  const frictionOpt=fieldOptions('OS_FRICTION_TYPE')[0]||{value:'UAT-FRICTION',label:'Fricción UAT'};
  const causeOpt=fieldOptions('OS_FRICTION_CAUSE')[0]||{value:'UAT-CAUSE',label:'Causa UAT'};
  const stepType=fieldOptions('OS_STEP_TYPE')[0]||{value:'ST01',label:'Paso'};
  const channel=fieldOptions('OS_COMM_CHANNEL')[0]||{value:'EMAIL',label:'Email'};
  const pain=typeof painForFriction==='function'?painForFriction(frictionOpt.value):null;
  return {
    isolated:true,prefix:'UAT-',generated_at:now(),
    company:{id:'UAT-CMP-001',name:'Empresa UAT aislada'},
    contact:{id:'UAT-CON-001',company_id:'UAT-CMP-001',name:'Contacto UAT'},
    engagement:{id:'UAT-ENG-001',company_id:'UAT-CMP-001',contact_ids:['UAT-CON-001'],process_name:'Proceso UAT end-to-end'},
    process_steps:[
      {id:'UAT-STEP-001',step_name:'Recibir solicitud UAT',step_type:stepType.value,active_time:5,wait_time:0,rework_time:0,communication_channels:[channel.value],status:'ACTIVE'},
      {id:'UAT-STEP-002',step_name:'Validar solicitud UAT',step_type:stepType.value,active_time:10,wait_time:30,rework_time:2,communication_channels:[channel.value],status:'ACTIVE'}
    ],
    frictions:[{id:'UAT-FRI-001',friction_type:frictionOpt.value,cause:[causeOpt.value],affected_steps:['UAT-STEP-002'],observable_signal:'UAT: solicitud requiere retrabajo antes de continuar',derived_pain_id:pain,status:'ACTIVE'}]
  };
}
function runtimeFixtureHtml(f){if(!f)return'';return section('Fixture runtime aislado','Registros UAT identificables. Existen sólo dentro del resultado QA y no se insertan en Companies/Contacts/Engagements/Projects reales.',`<div class="notice good"><b>${esc(f.company.id)}</b> ${esc(f.company.name)} · <b>${esc(f.contact.id)}</b> ${esc(f.contact.name)} · <b>${esc(f.engagement.id)}</b> ${esc(f.engagement.process_name)}</div><div class="result-list" style="margin-top:12px">${f.process_steps.map(s=>`<div class="result-item"><b>${esc(s.id)} · ${esc(s.step_name)}</b><p>Activo ${esc(s.active_time)} min · Espera ${esc(s.wait_time)} min · Retrabajo ${esc(s.rework_time)} min</p></div>`).join('')}${f.frictions.map(x=>`<div class="result-item"><b>${esc(x.id)} · Fricción UAT</b><p>Paso: ${esc(x.affected_steps.join(', '))} · Pain derivado: ${esc(x.derived_pain_id||'—')}</p></div>`).join('')}</div>`)}
const __auneaUatPageBeforeRuntimeFixture=pages.uat;
pages.uat=function(){const base=__auneaUatPageBeforeRuntimeFixture();return base+runtimeFixtureHtml(state.uatLastRun?.runtime_fixture)};
const __auneaRunVisibleUatBeforeRuntimeFixture=runVisibleUAT;
runVisibleUAT=async function(){const counts={companies:state.companies.length,contacts:state.contacts.length,engagements:state.engagements.length,projects:state.projects.length};await __auneaRunVisibleUatBeforeRuntimeFixture();if(!state.uatLastRun)return;state.uatLastRun.runtime_fixture=buildIsolatedRuntimeFixture();const after={companies:state.companies.length,contacts:state.contacts.length,engagements:state.engagements.length,projects:state.projects.length};state.uatLastRun.operational_collections_unchanged=JSON.stringify(counts)===JSON.stringify(after);if(!state.uatLastRun.operational_collections_unchanged)throw new Error('UAT isolation breach: operational collections changed');persistRecoverySnapshot('uat-runtime-fixture');audit('Fixture runtime UAT aislado generado sin alterar colecciones operativas');render();};

// ---- Fase 8: catálogo temporal de 15 casos UAT cargables (Internal Mode únicamente — la página `uat`
// ya está fuera de SESSION_PAGES, así que este bloque entero es inalcanzable en Modo Sesión) ----
// Ninguno de los 15 casos precarga diagnosticOutput/scenarioResults: son datos de captura (Company/
// Contact/ProcessSteps/Frictions/Risks/EconomicInputs) construidos con valores reales de option_sets/
// tablas canónicas (fieldOptions/REF_ECON_DRIVER), nunca inventados — el cálculo real sigue disparándose
// sólo contra el backend cuando el consultor pulsa "Calcular diagnóstico y recomendación".
function uatOptions(setId){return fieldOptions(setId)||[]}
function uatVal(setId,n=0){return uatOptions(setId)[n]?.value||''}
function uatLabel(setId,n=0){return uatOptions(setId)[n]?.label||''}
function uatBundle(n,title){
  const cid=`UAT-CMP-${n}`,pid=`UAT-CON-${n}`,eid=`UAT-ENG-${n}`;
  const company={id:cid,name:`${title} · Empresa UAT-${n}`,sector:'Servicios profesionales',country:'España',notes:'Caso sintético UAT — no es un cliente real.',createdAt:now()};
  const contact={id:pid,companyId:cid,name:'Contacto UAT',role:'Operaciones',email:'',phone:'',status:'Diagnóstico',source:'Otro',nextAction:'',lastInteraction:now(),createdAt:now()};
  const engagement={id:eid,companyId:cid,contactIds:[pid],title:`UAT-${String(n).padStart(2,'0')} · ${title}`,processName:'',status:'En preparación',stageId:'S01',answers:{DF001:company.name,DF002:company.sector,DF005:company.country,DF006:pid},answerDetails:{},processSteps:[],frictions:[],risks:[],economicInputs:[],processTab:'',confirmedAsIs:false,diagnosticOutput:null,scenarioResults:[],selectedScenario:null,selectedScenarioIndex:0,engineGates:{},createdAt:now(),updatedAt:now()};
  return {company,contact,engagement};
}
function uatStep(suffix,overrides={}){
  return Object.assign({
    id:`UAT-STEP-${suffix}`,status:'ACTIVE',step_name:`Paso UAT ${suffix}`,
    step_type:uatVal('OS_STEP_TYPE',0),actor:uatLabel('OS_ACTOR_ROLE',0)||'Responsable UAT',
    tool:uatLabel('OS_TOOL_CATEGORY',0)||'Herramienta UAT',occurrences_per_case:1,
    inputs:[],outputs:[],manual_actions:[],decision_criteria:[],
    communication_channels:[uatVal('OS_COMM_CHANNEL',0)].filter(Boolean),evidence:[],
    active_time:10,wait_time:5,rework_time:0,normal_next_step:'',exception_path:null,
    automation_state:uatVal('OS_AUTOMATION_STATE',0),notes:''
  },overrides);
}
function uatChain(steps){steps.forEach((s,i)=>{if(i<steps.length-1)s.normal_next_step=steps[i+1].id});return steps}
function uatFriction(suffix,overrides={}){
  return Object.assign({
    id:`UAT-FRI-${suffix}`,status:'ACTIVE',affected_steps:[],
    friction_type:uatVal('OS_FRICTION_TYPE',0),cause:[uatVal('OS_FRICTION_CAUSE',0)].filter(Boolean),
    non_time_impact:[],workaround:[],evidence_ids:[],evidence_type:uatVal('OS_EVIDENCE_TYPE',1)||'EV02',
    frequency:{},active_time_loss:{},wait_time_loss:{},direct_loss:{},impact:3,
    observable_signal:`UAT: señal observable de fricción ${suffix}`,
    derived_pain_id:typeof painForFriction==='function'?painForFriction(uatVal('OS_FRICTION_TYPE',0)):null
  },overrides);
}
function uatRisk(overrides={}){
  return Object.assign({
    category:uatVal('OS_RISK_CATEGORY',0),description:'Riesgo sintético UAT',
    likelihood_1_5:3,impact_1_5:3,reversible:true,reversibility:uatVal('OS_REVERSIBILITY',0),
    controls_present:false,sensitive_or_high_impact:false,material_financial_or_compliance:false,critical_trigger:false
  },overrides);
}
function uatEconomic(overrides={}){
  const drivers=schema?.tables?.REF_ECON_DRIVER||[];
  return Object.assign({
    driver_id:drivers[0]?.Economic_Driver_ID||'D1',annual_active_hours:100,annual_wait_hours:20,
    capacity_cost_rate_eur_hour:30,direct_loss_eur_annual:0,current_tool_cost_eur_annual:0,
    realized_cash_saving_eur_annual:0,evidence_type:'CLIENT_DECLARED',deduplication_key:id('ECON')
  },overrides);
}
// UAT-12/13 usan exactamente el conjunto mínimo de respuestas REQUIRED_90M ya verificado contra el
// Diagnostic Master real en tests/completion-model-v1.test.cjs ("a fully worked, already-calculable
// case…") — no se reinventa un algoritmo de auto-relleno genérico, se reutiliza la misma receta probada,
// sustituyendo los literales de test por los valores reales de option_sets vía fieldOptions().
function uatE2eReadyBundle(n,title){
  const b=uatBundle(n,title),e=b.engagement;
  Object.assign(e.answers,{
    DF008:[uatVal('OS_SESSION_OBJECTIVE',0)],
    DF011:`Proceso UAT-${n}`,
    DF012:uatVal('OS_TRIGGER_TYPE',0),DF013:uatVal('OS_OUTCOME_TYPE',0),
    DF021:{value:10,unit:'case',period:'',mode:''},DF022:uatVal('OS_PERIOD',0),
    DF086:[uatVal('OS_FUTURE_OUTCOME',0)]
  });
  const actionOpt=uatOptions('OS_NEXT_STEP')[0]||{value:'',label:'Acción UAT'},owner='Ana Consultora',dateIso=now().slice(0,10);
  e.answerDetails['DF098__action']=actionOpt.value;e.answerDetails['DF098__owner']=owner;e.answerDetails['DF098__date']=dateIso;
  e.answers.DF098=`${actionOpt.label} — ${owner} — ${formatDateEs(dateIso)}`;
  e.processSteps=[uatStep(`${n}-1`,{step_name:'Alta de caso',active_time:10,occurrences_per_case:1})];
  e.frictions=[uatFriction(`${n}-1`,{affected_steps:[e.processSteps[0].id]})];
  e.risks=[uatRisk({controls_present:true})];
  e.economicInputs=[uatEconomic({evidence_type:'MEASURED'})];
  e.confirmedAsIs=true;e.asIsConfirmedAt=now();
  e.engineGates={process_design_first:'NO',existing_tool_can_close:'NO',unstructured_interpretation_need:'NO',bounded_action_space:'NO',management_visibility_need:'NO'};
  return b;
}
const UAT_CATALOG=[
  {title:'Proceso lineal simple',purpose:'Flujo básico sin ramas: normal_next_step encadenado, sin exception_path.',build(){
    const b=uatBundle(1,'Proceso lineal simple');
    b.engagement.processSteps=uatChain([uatStep('1-1',{step_name:'Recibir solicitud'}),uatStep('1-2',{step_name:'Validar datos'}),uatStep('1-3',{step_name:'Cerrar caso'})]);
    return b;
  }},
  {title:'Branching',purpose:'exception_path desviando a un paso fuera de la secuencia normal.',build(){
    const b=uatBundle(2,'Branching');
    const s1=uatStep('2-1',{step_name:'Recibir solicitud'}),s2=uatStep('2-2',{step_name:'Revisar excepción'}),s3=uatStep('2-3',{step_name:'Tramitar estándar'}),s4=uatStep('2-4',{step_name:'Tramitar excepción'});
    s1.normal_next_step=s2.id;s2.normal_next_step=s3.id;
    s2.exception_path={type:uatVal('OS_EXCEPTION_TYPE',0),condition:'Caso fuera de umbral estándar',destination_step:s4.id,owner:uatLabel('OS_ACTOR_ROLE',0)};
    b.engagement.processSteps=[s1,s2,s3,s4];
    return b;
  }},
  {title:'Múltiples excepciones',purpose:'Varios exception_path con tipos/condiciones/destinos distintos.',build(){
    const b=uatBundle(3,'Múltiples excepciones');
    const types=uatOptions('OS_EXCEPTION_TYPE');
    const s1=uatStep('3-1',{step_name:'Paso base 1'}),s2=uatStep('3-2',{step_name:'Paso base 2'}),s3=uatStep('3-3',{step_name:'Paso base 3'}),s4=uatStep('3-4',{step_name:'Ruta excepción A'}),s5=uatStep('3-5',{step_name:'Ruta excepción B'});
    uatChain([s1,s2,s3]);
    s1.exception_path={type:types[0]?.value||'',condition:'Condición UAT A',destination_step:s4.id,owner:uatLabel('OS_ACTOR_ROLE',0)};
    s2.exception_path={type:types[1]?.value||types[0]?.value||'',condition:'Condición UAT B',destination_step:s5.id,owner:uatLabel('OS_ACTOR_ROLE',1)||uatLabel('OS_ACTOR_ROLE',0)};
    b.engagement.processSteps=[s1,s2,s3,s4,s5];
    return b;
  }},
  {title:'Alto volumen',purpose:'occurrences_per_case elevado en varios pasos.',build(){
    const b=uatBundle(4,'Alto volumen');
    b.engagement.processSteps=uatChain([uatStep('4-1',{step_name:'Recepción masiva',occurrences_per_case:500}),uatStep('4-2',{step_name:'Procesamiento',occurrences_per_case:1200}),uatStep('4-3',{step_name:'Cierre por lote',occurrences_per_case:1200})]);
    return b;
  }},
  {title:'Múltiples herramientas y canales',purpose:'tool y communication_channels distintos por paso.',build(){
    const b=uatBundle(5,'Múltiples herramientas y canales');
    const tools=uatOptions('OS_TOOL_CATEGORY'),channels=uatOptions('OS_COMM_CHANNEL');
    const steps=[0,1,2,3].map(i=>uatStep(`5-${i+1}`,{step_name:`Paso con canal ${i+1}`,tool:(tools[i%tools.length]||tools[0])?.value||'',communication_channels:[(channels[i%channels.length]||channels[0])?.value].filter(Boolean)}));
    b.engagement.processSteps=uatChain(steps);
    return b;
  }},
  {title:'Muchas fricciones',purpose:'Alta densidad de fricciones vinculadas al flujo.',build(){
    const b=uatBundle(6,'Muchas fricciones');
    const steps=uatChain([uatStep('6-1',{step_name:'Paso 1'}),uatStep('6-2',{step_name:'Paso 2'}),uatStep('6-3',{step_name:'Paso 3'})]);
    b.engagement.processSteps=steps;
    const types=uatOptions('OS_FRICTION_TYPE'),causes=uatOptions('OS_FRICTION_CAUSE');
    b.engagement.frictions=steps.flatMap((s,si)=>[0,1].map((_,fi)=>uatFriction(`6-${si+1}-${fi+1}`,{affected_steps:[s.id],friction_type:(types[(si+fi)%types.length]||types[0])?.value,cause:[(causes[(si+fi)%causes.length]||causes[0])?.value].filter(Boolean)})));
    return b;
  }},
  {title:'Riesgos elevados',purpose:'Riesgos con probabilidad/impacto altos y controles ausentes.',build(){
    const b=uatBundle(7,'Riesgos elevados');
    b.engagement.processSteps=uatChain([uatStep('7-1',{step_name:'Paso con riesgo A'}),uatStep('7-2',{step_name:'Paso con riesgo B'})]);
    const cats=uatOptions('OS_RISK_CATEGORY'),rev=uatOptions('OS_REVERSIBILITY');
    b.engagement.risks=[
      uatRisk({category:cats[0]?.value,description:'Riesgo material UAT — alto impacto',likelihood_1_5:5,impact_1_5:5,controls_present:false,critical_trigger:true,sensitive_or_high_impact:true,reversibility:(rev[rev.length-1]||rev[0])?.value}),
      uatRisk({category:(cats[1]||cats[0])?.value,description:'Riesgo material UAT — compliance',likelihood_1_5:4,impact_1_5:5,controls_present:false,material_financial_or_compliance:true,reversibility:rev[0]?.value})
    ];
    return b;
  }},
  {title:'Economics mixtos',purpose:'evidence_type variado en economicInputs (MEASURED/CLIENT_DECLARED/AUNEA_ESTIMATE/SPECIFIC_BENCHMARK/HYPOTHESIS).',build(){
    const b=uatBundle(8,'Economics mixtos');
    b.engagement.processSteps=uatChain([uatStep('8-1',{step_name:'Paso con coste A',active_time:20}),uatStep('8-2',{step_name:'Paso con coste B',active_time:15})]);
    const drivers=schema?.tables?.REF_ECON_DRIVER||[],evidences=['MEASURED','CLIENT_DECLARED','AUNEA_ESTIMATE','SPECIFIC_BENCHMARK','HYPOTHESIS'];
    b.engagement.economicInputs=evidences.map((ev,i)=>uatEconomic({driver_id:(drivers[i%drivers.length]||drivers[0])?.Economic_Driver_ID||'D1',annual_active_hours:80+i*10,evidence_type:ev}));
    return b;
  }},
  {title:'No-Reask / reutilización',purpose:'Datos de proceso/fricción ya capturados para ejercitar campos con Reuse_From ("Tomado de: …").',build(){
    const b=uatBundle(9,'No-Reask / reutilización');
    const steps=uatChain([uatStep('9-1',{step_name:'Paso con tiempo activo',active_time:30,rework_time:10}),uatStep('9-2',{step_name:'Paso con retrabajo',active_time:20,rework_time:15,wait_time:25})]);
    b.engagement.processSteps=steps;
    b.engagement.frictions=[uatFriction('9-1',{affected_steps:[steps[1].id]})];
    return b;
  }},
  {title:'Caso incompleto con blockers',purpose:'readyToCalculate=false con bloqueos reales: sin pasos, sin AS-IS confirmado, obligatorios sin responder.',build(){
    return uatBundle(10,'Caso incompleto con blockers');
  }},
  {title:'DF098 completo',purpose:'Siguiente paso (DF098) ya serializado como acción + owner + fecha.',build(){
    const b=uatBundle(11,'DF098 completo');
    b.engagement.processSteps=uatChain([uatStep('11-1',{step_name:'Paso único'})]);
    const actionOpt=uatOptions('OS_NEXT_STEP')[0]||{value:'',label:'Acción UAT'},owner='Ana Consultora',dateIso=now().slice(0,10);
    b.engagement.answerDetails['DF098__action']=actionOpt.value;b.engagement.answerDetails['DF098__owner']=owner;b.engagement.answerDetails['DF098__date']=dateIso;
    b.engagement.answers.DF098=`${actionOpt.label} — ${owner} — ${formatDateEs(dateIso)}`;
    return b;
  }},
  {title:'Preparado para cálculo E2E',purpose:'Todos los obligatorios REQUIRED_90M respondidos, AS-IS confirmado, gates resueltos — listo para disparar el backend de verdad. No se precarga diagnosticOutput: el cálculo debe ejecutarse de verdad.',build(){
    return uatE2eReadyBundle(12,'Preparado para cálculo E2E');
  }},
  {title:'Escenario alternativo',purpose:'Igual que UAT-12: tras calcular de verdad, crea una alternativa desde Escenarios para poblar scenarioResults con datos reales del backend. No se precarga diagnosticOutput ni scenarioResults.',build(){
    return uatE2eReadyBundle(13,'Escenario alternativo');
  }},
  {title:'Gran cantidad de Process Steps',purpose:'20 pasos encadenados para probar el mapa AS-IS y la navegación con volumen.',build(){
    const b=uatBundle(14,'Gran cantidad de Process Steps');
    const steps=[];for(let i=1;i<=20;i++)steps.push(uatStep(`14-${i}`,{step_name:`Paso ${i}`}));
    b.engagement.processSteps=uatChain(steps);
    return b;
  }},
  {title:'Múltiples actores/contactos',purpose:'Varios Contact vinculados al mismo estudio.',build(){
    const b=uatBundle(15,'Múltiples actores/contactos');
    const roles=['Sponsor','Operaciones','TI','Finanzas'];
    b.contact.role=roles[0];
    b.extraContacts=roles.slice(1).map((role,i)=>({id:`UAT-CON-15-${i+2}`,companyId:b.company.id,name:`Contacto UAT ${i+2}`,role,email:'',phone:'',status:'Diagnóstico',source:'Otro',nextAction:'',lastInteraction:now(),createdAt:now()}));
    b.engagement.contactIds=[b.contact.id,...b.extraContacts.map(c=>c.id)];
    b.engagement.processSteps=uatChain([uatStep('15-1',{step_name:'Paso con varios actores'})]);
    return b;
  }}
];
function uatCatalog(){return UAT_CATALOG}
function loadUatCase(n){
  const def=UAT_CATALOG[n-1];if(!def)return toast('Caso UAT no encontrado.');
  const b=def.build();
  state.companies.push(b.company);state.contacts.push(b.contact);
  if(Array.isArray(b.extraContacts))b.extraContacts.forEach(c=>state.contacts.push(c));
  state.engagements.unshift(b.engagement);
  state.activeEngagementId=b.engagement.id;state.activePage='diagnostico';
  markDirty(`Caso UAT-${String(n).padStart(2,'0')} cargado: ${def.title}`);
  persistRecoverySnapshot('uat-case-load');render();
  toast(`Caso UAT-${String(n).padStart(2,'0')} cargado: ${def.title}.`);
}
function clearUatData(){
  if(!confirm('¿Eliminar todos los datos UAT (empresas/contactos/estudios con prefijo UAT-)? Los datos reales no se tocan.'))return;
  const before={companies:state.companies.length,contacts:state.contacts.length,engagements:state.engagements.length};
  state.companies=state.companies.filter(c=>!String(c.id).startsWith('UAT-'));
  state.contacts=state.contacts.filter(c=>!String(c.id).startsWith('UAT-'));
  state.engagements=state.engagements.filter(e=>!String(e.id).startsWith('UAT-'));
  if(state.activeEngagementId&&String(state.activeEngagementId).startsWith('UAT-'))state.activeEngagementId=null;
  const removed={companies:before.companies-state.companies.length,contacts:before.contacts-state.contacts.length,engagements:before.engagements-state.engagements.length};
  markDirty(`Datos UAT eliminados: ${removed.companies} empresas, ${removed.contacts} contactos, ${removed.engagements} estudios`);
  persistRecoverySnapshot('uat-cleanup');render();
  toast(`Datos UAT eliminados: ${removed.engagements} estudios, ${removed.companies} empresas, ${removed.contacts} contactos.`);
}
function generateUatStressSteps(n){
  const e=currentEng();if(!e)return toast('Abre o crea un estudio antes de generar pasos de stress.');
  const stepTypes=uatOptions('OS_STEP_TYPE'),startIndex=e.processSteps.length,newSteps=[];
  for(let i=1;i<=n;i++){
    const idx=startIndex+i;
    newSteps.push(uatStep(`STRESS-${idx}`,{step_name:`Paso UAT stress ${idx}`,step_type:(stepTypes[idx%stepTypes.length]||stepTypes[0])?.value||'',active_time:5,wait_time:0,tool:'',actor:'',communication_channels:[],automation_state:''}));
  }
  uatChain(newSteps);
  const prevLast=e.processSteps[e.processSteps.length-1];
  if(prevLast&&!prevLast.normal_next_step)prevLast.normal_next_step=newSteps[0].id;
  e.processSteps=e.processSteps.concat(newSteps);
  e.confirmedAsIs=false;e.diagnosticOutput=null;
  markDirty(`Stress UAT: ${n} pasos generados (total ${e.processSteps.length})`);
  persistRecoverySnapshot('uat-stress');render();
  toast(`${n} pasos UAT-STEP generados. Total en el estudio: ${e.processSteps.length}.`);
}
function uatCatalogHtml(){
  return section('Cargar caso UAT','Catálogo de 15 casos sintéticos aislados (prefijo UAT- en toda la jerarquía), exclusivamente para pruebas internas — nunca se presentan como clientes reales.',`<div class="result-list">${UAT_CATALOG.map((c,i)=>`<div class="result-item"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><b>UAT-${String(i+1).padStart(2,'0')} · ${esc(c.title)}</b><p>${esc(c.purpose)}</p></div><button class="btn btn-outline" data-load-uat-case="${i+1}">Cargar</button></div></div>`).join('')}</div>`);
}
function uatCleanupHtml(){
  const n={companies:state.companies.filter(c=>String(c.id).startsWith('UAT-')).length,contacts:state.contacts.filter(c=>String(c.id).startsWith('UAT-')).length,engagements:state.engagements.filter(e=>String(e.id).startsWith('UAT-')).length};
  return section('Limpiar datos UAT','Elimina exclusivamente empresas/contactos/estudios con prefijo UAT- (nunca datos reales).',`<div class="notice">Empresas UAT: ${n.companies} · Contactos UAT: ${n.contacts} · Estudios UAT: ${n.engagements}</div>`,`<button class="btn btn-outline" id="clearUatData">Limpiar datos UAT</button>`);
}
function uatStressHtml(){
  const e=currentEng();
  return section('Generar N pasos UAT (stress test)','Herramienta QA separada de "Añadir varios pasos": genera pasos UAT-STEP-STRESS-N encadenados en el estudio abierto, para probar render, mapa AS-IS, scroll, edición, routing, navegación, rendimiento y persistencia con volumen.',`<div class="notice">${e?`Estudio abierto: ${esc(e.title||e.id)} · Pasos actuales: ${e.processSteps.length}`:'Abre o crea un estudio antes de generar pasos de stress.'}</div>`,`<select id="uatStressCount"><option value="10">10 pasos</option><option value="25">25 pasos</option><option value="50">50 pasos</option></select> <button class="btn btn-outline" id="genUatStress">Generar pasos UAT</button>`);
}
const __auneaUatPageBeforeCatalog=pages.uat;
pages.uat=function(){return __auneaUatPageBeforeCatalog()+uatCatalogHtml()+uatCleanupHtml()+uatStressHtml()};
const __auneaPostBindBeforeCatalog=postBind;
postBind=function(){
  __auneaPostBindBeforeCatalog();
  document.querySelectorAll('[data-load-uat-case]').forEach(b=>b.onclick=()=>loadUatCase(Number(b.dataset.loadUatCase)));
  const clr=document.getElementById('clearUatData');if(clr)clr.onclick=clearUatData;
  const gen=document.getElementById('genUatStress');if(gen)gen.onclick=()=>{const cnt=Number(document.getElementById('uatStressCount').value||10);generateUatStressSteps(cnt)};
};
// [AUNEA-UAT-RUNTIME-FIXTURE-020] END
