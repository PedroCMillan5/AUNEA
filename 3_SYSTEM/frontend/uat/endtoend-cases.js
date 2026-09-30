// [AUNEA-UAT-ENDTOEND-110] START — Three fully captured synthetic diagnostics.
// SOURCE: Diagnostic Master v1.2, Simulator CANONICAL v1.14, DEC-041/050/065/068.
// All scenario data is explicitly simulated, CLIENT_DECLARED, never measured client evidence.
// Derived DF fields are not copied into answers, and no study is pre-confirmed.
const UAT3_PREFIX='UAT3-CASE-';
const UAT3_DATE='2026-09-30T09:00:00.000Z';
const UAT3_FILES=['uat/cases/invoices.json','uat/cases/unified-requests.json','uat/cases/email-orders.json'];
const uat3Id=(key,type,index=1)=>UAT3_PREFIX+key+'-'+type+'-'+String(index).padStart(3,'0');
const isUat3Id=value=>String(value||'').startsWith(UAT3_PREFIX);
function uat3Step(c,step,i){
  const id=uat3Id(c.key,'STEP',i+1),ids=n=>uat3Id(c.key,'STEP',n+1),share=step.share??100;
  const isDecision=step.type==='ST04'||step.type==='ST05';
  const next=step.next==='END'?'__END__':Number.isInteger(step.next)?ids(step.next):ids(i+1);
  let exception_path=null;
  if(step.type==='ST04')exception_path={type:'OTHER',condition:step.condition||'No cumple la condición afirmativa',destination_step:ids(step.no),owner:step.actor};
  if(step.type==='ST05')exception_path={type:'MANUAL_OVERRIDE',condition:'Aprobación denegada o no emitida: cerrar sin ejecutar la operación autorizable',destination_step:'__END__',owner:step.actor};
  return {id,status:'ACTIVE',step_name:step.name,step_type:step.type,actor:step.actor,tool:step.tool,
    inputs:step.inputs,outputs:step.outputs,applies_to:{mode:share===100?'ALL':'PERCENT',value:share,condition:''},occurrences_per_case:1,
    active_time:step.active,wait_time:step.wait,rework_time:step.rework,error_rate:{mode:'percent',value:step.error,period:'case'},
    decision_criteria:step.decision|| (step.type==='ST05'?['AUTHORITY']:[]),normal_next_step:step.type==='ST04'?ids(step.yes):next,exception_path,
    manual_actions:step.manual,automation_state:step.auto,communication_channels:step.channels,evidence:['EV02'],notes:step.condition||'',
    _ui:{has_decision:isDecision,active_unit:'min',wait_unit:'min',rework_unit:'min'},
    _details:{inputs:'',outputs:'',decision_criteria:'',manual_actions:'',communication_channels:''}};
}
function uat3Friction(c,fr,i,steps){
  return {id:uat3Id(c.key,'FRI',i+1),status:'ACTIVE',friction_type:fr.type,client_label:fr.signal,
    affected_steps:fr.steps.map(n=>steps[n].id),cause:fr.cause,observable_signal:fr.signal,
    frequency:{value:fr.frequency,mode:'percent',period:'case'},impact:String(fr.impact),
    active_time_loss:{value:fr.minutes,unit:'min',source_unit:'min',mode:''},
    time_attribution:{mode:fr.mode,step_id:steps[fr.owner].id},
    wait_time_loss:{value:0,unit:'min',source_unit:'min',mode:''},
    direct_loss:{value:0,unit:'EUR',period:'year',mode:'NONE'},
    non_time_impact:fr.nonTime,workaround:fr.workaround,evidence_ids:[],evidence_type:'EV02',
    priority_client:i+1,derived_pain_id:typeof painForFriction==='function'?painForFriction(fr.type):null,
    _details:{cause:'',workaround:''},notes:''};
}
function uat3Risk(c,r,i,steps){
  return {id:uat3Id(c.key,'RISK',i+1),step_ids:r.steps.map(n=>steps[n].id),category:r.category,description:r.description,
    likelihood_1_5:r.likelihood,impact_1_5:r.impact,reversible:!['HARD','IRREVERSIBLE'].includes(r.reversibility),
    reversibility:r.reversibility,controls_present:r.controls,sensitive_or_high_impact:true,
    material_financial_or_compliance:r.material,critical_trigger:r.impact===5};
}
function uat3Seed(c){
  const prefix=type=>uat3Id(c.key,type),companyId=prefix('CMP'),contactIds=[uat3Id(c.key,'CON',1),uat3Id(c.key,'CON',2)];
  const opportunityId=prefix('OPP'),engagementId=prefix('ENG');
  const company={...c.company,id:companyId,primaryContactId:contactIds[0],createdAt:UAT3_DATE};
  const contacts=c.contacts.map((ct,i)=>({...ct,id:contactIds[i],companyId,status:'Activo',createdAt:UAT3_DATE}));
  const opportunity={...c.opportunity,id:opportunityId,companyId,contactIds,createdAt:UAT3_DATE,updatedAt:UAT3_DATE};
  const interaction={id:prefix('INT'),companyId,contactIds,opportunityId,engagementId,occurredAt:UAT3_DATE,
    type:'Reunión',channel:'Videollamada',direction:'Interna',subject:'Diagnóstico sintético · '+c.label,
    summary:c.opportunity.notes,outcome:'Avanza',nextFollowUpAt:c.details.DF098__date+'T10:00:00.000Z',
    evidenceRef:'UAT3: declaración de escenario sintético, no existen registros reales de cliente.',createdAt:UAT3_DATE};
  const steps=c.steps.map((x,i)=>uat3Step(c,x,i)),frictions=c.frictions.map((x,i)=>uat3Friction(c,x,i,steps)),risks=c.risks.map((x,i)=>uat3Risk(c,x,i,steps));
  const answers={...c.answers,DF001:company.name,DF002:company.sector,DF003:company.employeeCount,DF005:'ES',
    DF006:contactIds[0],DF007:[contactIds[1]],DF016:contactIds[0],
    DF051:{from:steps[c.finding[0]].id,to:steps[c.finding[1]].id},
    DF053:c.search.map(n=>steps[n].id),
    DF054:['manual:'+steps[c.integration[1]].id],DF096:frictions.map(x=>x.id),DF098:c.followup};
  const details={...c.details,DF075__steps:[steps.find(x=>x.step_type==='ST05')?.id||steps[2].id]};
  const economics=[
    {step_ids:[],driver_id:'ED14',annual_active_hours:0,annual_wait_hours:0,capacity_cost_rate_eur_hour:c.economics.rate,
      direct_loss_eur_annual:0,current_tool_cost_eur_annual:0,realized_cash_saving_eur_annual:0,evidence_type:'CLIENT_DECLARED',deduplication_key:null},
    {step_ids:[],driver_id:'ED12',annual_active_hours:0,annual_wait_hours:0,capacity_cost_rate_eur_hour:null,
      direct_loss_eur_annual:0,current_tool_cost_eur_annual:c.economics.toolAnnual,realized_cash_saving_eur_annual:0,
      evidence_type:'CLIENT_DECLARED',deduplication_key:null}
  ];
  const engagement={id:engagementId,companyId,contactIds,opportunityId,title:'UAT integral · '+c.label,
    processName:answers.DF011,businessAreaId:c.businessAreaId,priority:c.priority,contextSummary:c.opportunity.notes,
    status:'Sesión 1',lifecycleLog:[{from:'Preparación',to:'Sesión 1',at:UAT3_DATE,reason:'Carga explícita de UAT integral'}],
    stageId:'S01',answers,answerDetails:details,processSteps:steps,frictions,risks,economicInputs:economics,
    processTab:'cliente',layerConfirmations:{map:false,frictions:false,risks:false,impact:false},
    confirmedAsIs:false,confirmedSnapshots:[],diagnosticOutput:null,scenarioResults:[],selectedScenario:null,selectedScenarioIndex:0,
    engineGates:{},createdAt:UAT3_DATE,updatedAt:UAT3_DATE,
    uatProvenance:'Caso sintético, con valores coherentes para revisar el recorrido y encontrar incoherencias; no es evidencia medida.'};
  return {company,contacts,opportunity,interaction,engagement,source:c};
}
function uat3Cases(){return (state.engagements||[]).filter(e=>isUat3Id(e.id))}
function clearUat3({ask=true}={}){
  if(ask&&!confirm('Eliminar únicamente los tres expedientes UAT integrales y sus fichas CRM sintéticas. ¿Continuar?'))return false;
  const removedIds=new Set(uat3Cases().map(e=>e.id));
  for(const key of ['companies','contacts','opportunities','interactions','engagements'])
    state[key]=(state[key]||[]).filter(x=>!isUat3Id(x.id));
  if(removedIds.has(state.activeEngagementId))state.activeEngagementId=null;
  markDirty('Tres expedientes UAT integrales retirados; UAT1/UAT2 y registros reales intactos');
  const ok=persistRecoverySnapshot('uat3-clear');
  if(ask){render();toast(ok?'Expedientes UAT integrales retirados.':'Hay un conflicto de guardado; comprueba ambas ventanas.')}
  return ok;
}
async function loadUat3(){
  if(!phase1CrmCompletenessReport()?.pass||!phase2StudyAssociationReport()?.pass)
    return toast('Primero carga y valida la Fase 1 CRM y la Fase 2 Estudios.');
  try{
    const fixtures=await Promise.all(UAT3_FILES.map(async path=>{const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error('No se ha podido leer '+path);return response.json()}));
    // Parse all three first: no partial dataset is committed on a failed download.
    const records=fixtures.map(uat3Seed);
    clearUat3({ask:false});
    records.forEach(row=>{
      state.companies.push(row.company);state.contacts.push(...row.contacts);
      state.opportunities.push(row.opportunity);state.interactions.push(row.interaction);state.engagements.push(row.engagement);
    });
    state.activePage='uat';state.activeEngagementId=null;
    markDirty('UAT3: facturas, peticiones unificadas y tickets desde email, todos los owners y relaciones capturados');
    const ok=persistRecoverySnapshot('uat3-load');
    if(!ok)return toast('Los estudios están en memoria, pero existe un conflicto de persistencia; no se declara carga guardada.');
    render();toast('Tres casos integrales guardados; ábrelos desde UAT / QA.');
  }catch(err){toast('No se han cargado los tres casos: '+err.message)}
}
function uat3Audit(e){
  const c=companyById(e.companyId),steps=(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    stepIds=new Set(steps.map(x=>x.id)),checks=[],findings=[];
  const add=(label,pass,detail)=>checks.push({label,pass:!!pass,detail});
  add('Owner CRM y referencias',!!c&&e.answers.DF001===c.name&&e.answers.DF002===c.sector&&e.answers.DF006===e.contactIds[0]&&e.contactIds.every(id=>contactById(id)?.companyId===c.id),'DF001/002/006 son referencias al CRM, no segundas fichas editables.');
  add('Demanda reutilizable',Number(e.answers.DF021)>0&&e.answers.DF022==='MONTH'&&Number(e.answers.DF023?.value)>=Number(e.answers.DF021),'DF021+DF022 sustentan la proyección del backend.');
  add('Mapa coherente',steps.length===6&&steps.every(s=>s.step_name&&s.step_type&&s.actor&&s.tool&&Number.isFinite(s.active_time)&&Number.isFinite(s.wait_time)&&Number.isFinite(s.rework_time)&&(s.normal_next_step==='__END__'||stepIds.has(s.normal_next_step))&&(!s.exception_path||s.exception_path.destination_step==='__END__'||stepIds.has(s.exception_path.destination_step))),'Todas las rutas tienen destino real o fin; hay tiempos separados.');
  add('Fricciones vinculadas una sola vez',e.frictions.length===3&&e.frictions.every(f=>f.affected_steps.length&&f.affected_steps.every(id=>stepIds.has(id))&&f.affected_steps.includes(f.time_attribution?.step_id)&&['INCLUDED','BREAKDOWN','ADDITIONAL'].includes(f.time_attribution?.mode)),'Una fricción tiene un owner temporal y puede afectar a varios pasos.');
  add('Riesgos asociados al mismo AS-IS',e.risks.length===2&&e.risks.every(r=>r.step_ids?.length&&r.step_ids.every(id=>stepIds.has(id))),'No crea otro mapa de pasos.');
  add('Costes declarados sin ahorro ficticio',e.economicInputs.length===2&&e.economicInputs.every(x=>x.evidence_type==='CLIENT_DECLARED'&&!x.realized_cash_saving_eur_annual&&!x.direct_loss_eur_annual),'ED12 y ED14 son datos del escenario; DF078/079 pertenecen al backend.');
  add('No hay falsa confirmación de cierre',!e.confirmedAsIs&&!e.answers.DF093&&!e.confirmedSnapshots?.length,'Las cuatro capas requieren validación real en el editor.');
  for(const fid of ['DF017','DF046','DF047','DF049','DF050','DF057','DF066','DF067','DF078','DF079','DF085','DF093','DF094','DF095'])
    if(Object.prototype.hasOwnProperty.call(e.answers,fid))findings.push(fid+' está indebidamente copiado en answers; debería proceder de su owner.');
  // Findings reflect actual, existing model wiring; they are NOT fixed by the fixture.
  findings.push('Duplicidad estructural: reusedValue(DF047) y reusedValue(DF049) consumen exactamente inputs+outputs de todos los pasos, aunque sus preguntas distinguen fuentes de datos frente a documentos.');
  findings.push('Posible doble captura: DF028 exige proporción global de error y DF040 ya registra frecuencia por paso. No hay reconciliación canónica automática de ambos universos.');
  findings.push('DF080/081 preguntan tiempos de seguimiento/reporting aunque los pasos contienen acciones CHASE/REPORT y sus tiempos activos. Debe aclararse el solapamiento antes de sumar.');
  findings.push('El formulario de riesgos conserva referencias a pasos pero RiskInput del backend no tiene step_ids; verificar trazabilidad de punta a punta en el adapter.');
  findings.push('DF078/079 no se rellenan desde datos de UAT: necesitan proyección real del backend. No se simula ROI, ahorro ni evidencia medida.');
  findings.push('La versión AS-IS sigue pendiente de confirmación humana. Ningún estudio cargado se presenta como histórico validado.');
  return {checks,findings,passed:checks.filter(x=>x.pass).length,total:checks.length};
}
const __uat3PostBindBase=postBind;
postBind=function(){
  __uat3PostBindBase();
  const load=document.getElementById('loadUat3'),clear=document.getElementById('clearUat3');
  if(load)load.onclick=loadUat3;
  if(clear)clear.onclick=()=>clearUat3({ask:true});
  document.querySelectorAll('[data-uat3-open]').forEach(button=>button.onclick=()=>{
    const e=state.engagements.find(x=>x.id===button.dataset.uat3Open);if(!e)return;
    state.activeEngagementId=e.id;
    e.stageId=button.dataset.uat3Stage||'S01';
    state.activePage=button.dataset.uat3Page||'diagnostico';render();
  });
};
// [AUNEA-UAT-ENDTOEND-110] END
