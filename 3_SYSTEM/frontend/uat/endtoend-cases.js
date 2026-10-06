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
  const isDecision=step.type==='ST04'||step.isDecision===true;
  const next=step.next==='END'?'__END__':Number.isInteger(step.next)?ids(step.next):ids(i+1);
  let exception_path=null;
  if(isDecision&&step.type==='ST04')exception_path={type:'OTHER',condition:step.exceptionCondition||'No cumple la condición afirmativa',destination_step:ids(step.no),owner:step.actor};
  return {id,status:'ACTIVE',step_name:step.name,step_type:step.type,actor:step.actor,tool:step.tool,
    inputs:step.inputs,outputs:step.outputs,applies_to:{mode:share===100?'ALL':'PERCENT',value:share,condition:''},occurrences_per_case:1,
    active_time:step.active,wait_time:step.wait,rework_time:step.rework,error_rate:{mode:'percent',value:step.error,period:'case'},
    decision_criteria:step.decision||[],normal_next_step:isDecision&&step.type==='ST04'?ids(step.yes):next,exception_path,
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
    reversibility:r.reversibility,controls_present:r.controls,current_control:r.controls?['OTHER: Control actual declarado en escenario UAT']:[],sensitive_or_high_impact:true,
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
  const controlStepIndex=c.key==='INVOICE'?4:c.key==='INTAKE'?3:4;
  const details={...c.details,DF075__steps:[steps[controlStepIndex].id]};
  const economics=[
    {step_ids:steps.map(s=>s.id),driver_id:'ED14',annual_active_hours:0,annual_wait_hours:0,capacity_cost_rate_eur_hour:c.economics.rate,
      direct_loss_eur_annual:0,current_tool_cost_eur_annual:0,realized_cash_saving_eur_annual:0,evidence_type:'CLIENT_DECLARED',deduplication_key:null},
    {step_ids:steps.filter(s=>s.tool).map(s=>s.id),driver_id:'ED12',annual_active_hours:0,annual_wait_hours:0,capacity_cost_rate_eur_hour:null,
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
function reconcileLoadedUat3InvoiceFlow(){
  const e=(state.engagements||[]).find(x=>x.id===uat3Id('INVOICE','ENG'));
  if(!e)return false;
  const approval=e.processSteps?.find(x=>x.id===uat3Id('INVOICE','STEP',5));
  const register=e.processSteps?.find(x=>x.id===uat3Id('INVOICE','STEP',6));
  const decision=e.processSteps?.find(x=>x.id===uat3Id('INVOICE','STEP',4));
  if(!approval||!register||!decision)return false;
  let changed=false;
  if(approval._ui?.has_decision!==false){approval._ui={...(approval._ui||{}),has_decision:false};changed=true}
  if(approval.exception_path){approval.exception_path=null;changed=true}
  if(approval.normal_next_step!==register.id){approval.normal_next_step=register.id;changed=true}
  if(decision.normal_next_step!==approval.id){decision.normal_next_step=approval.id;changed=true}
  if(decision.exception_path?.destination_step!==register.id){decision.exception_path={...(decision.exception_path||{}),destination_step:register.id};changed=true}
  if(changed)e.updatedAt=now();
  return changed;
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
// [AUNEA-UAT-ENDTOEND-115] START — Observable, independently executable Phase 3 loader.
let uat3LoadStatus='Pulsa Generar para cargar los tres casos independientes.';
let __uat3Loading=false;
function uat3ShowStatus(message){
  uat3LoadStatus=message;
  const target=document.getElementById('uat3LoadStatus');
  if(target)target.textContent=message;
}
async function loadUat3(){
  if(__uat3Loading)return;
  __uat3Loading=true;
  const button=document.getElementById('loadUat3');
  if(button)button.disabled=true;
  uat3ShowStatus('Leyendo y comprobando los tres expedientes…');
  try{
    const fixtures=await Promise.all(UAT3_FILES.map(async file=>{
      const url=new URL(file,document.baseURI);
      const response=await fetch(url.href,{cache:'no-store'});
      if(!response.ok)throw new Error(file+': HTTP '+response.status);
      return response.json();
    }));
    const expected=['INVOICE','INTAKE','EMAIL'];
    if(fixtures.length!==3||fixtures.some((x,i)=>x.key!==expected[i]||x.steps?.length!==6||x.frictions?.length!==3||x.risks?.length!==2))
      throw new Error('Los archivos de los tres casos están incompletos o no corresponden a su versión.');
    const records=fixtures.map(uat3Seed);
    // One replacement without a second intermediate write or autosave of an empty dataset.
    const before=JSON.parse(JSON.stringify(state));
    for(const key of ['companies','contacts','opportunities','interactions','engagements'])
      state[key]=(state[key]||[]).filter(x=>!isUat3Id(x.id));
    records.forEach(row=>{
      state.companies.push(row.company);state.contacts.push(...row.contacts);
      state.opportunities.push(row.opportunity);state.interactions.push(row.interaction);state.engagements.push(row.engagement);
    });
    if(uat3Cases().length!==3){
      state=before;
      throw new Error('La carga no ha producido exactamente tres estudios.');
    }
    const previousPage=state.activePage;
    state.activePage='uat';state.activeEngagementId=null;
    // Explicit persistence runs once, after all records are ready.
    if(!persistRecoverySnapshot('uat3-load')){
      state=before;
      throw new Error('No se ha podido guardar porque existe una edición simultánea pendiente en otra ventana.');
    }
    uat3LoadStatus='Cargados y guardados: 3 estudios, 18 pasos, 9 fricciones y 6 riesgos. Abre cualquiera de las tarjetas inferiores.';
    render();
    toast('Tres casos UAT integrales guardados.');
  }catch(err){
    uat3ShowStatus('Error al generar los casos: '+(err?.message||String(err))+' Comprueba que estás abriendo AUNEA desde el servidor del proyecto y no como archivo local.');
    console.error('AUNEA_UAT3_LOAD_ERROR',err);
  }finally{
    __uat3Loading=false;
    const current=document.getElementById('loadUat3');
    if(current)current.disabled=false;
  }
}
// [AUNEA-UAT-ENDTOEND-115] END
function uat3Audit(e){
  const c=companyById(e.companyId),steps=(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    stepIds=new Set(steps.map(x=>x.id)),checks=[],findings=[];
  const add=(label,pass,detail)=>checks.push({label,pass:!!pass,detail});
  add('Owner CRM y referencias',!!c&&e.answers.DF001===c.name&&e.answers.DF002===c.sector&&e.answers.DF006===e.contactIds[0]&&e.contactIds.every(id=>contactById(id)?.companyId===c.id),'DF001/002/006 son referencias al CRM, no segundas fichas editables.');
  add('Demanda reutilizable',Number(e.answers.DF021)>0&&e.answers.DF022==='MONTH'&&Number(e.answers.DF023?.value)>=Number(e.answers.DF021),'DF021+DF022 sustentan la proyección del backend.');
  add('Mapa coherente',steps.length===6&&steps.every(s=>s.step_name&&s.step_type&&s.actor&&s.tool&&Number.isFinite(s.active_time)&&Number.isFinite(s.wait_time)&&Number.isFinite(s.rework_time)&&(s.normal_next_step==='__END__'||stepIds.has(s.normal_next_step))&&(!s.exception_path||s.exception_path.destination_step==='__END__'||stepIds.has(s.exception_path.destination_step))),'Todas las rutas tienen destino real o fin; hay tiempos separados.');
  add('Fricciones vinculadas una sola vez',e.frictions.length===3&&e.frictions.every(f=>f.affected_steps.length&&f.affected_steps.every(id=>stepIds.has(id))&&f.affected_steps.includes(f.time_attribution?.step_id)&&['INCLUDED','BREAKDOWN','ADDITIONAL'].includes(f.time_attribution?.mode)),'Una fricción tiene un owner temporal y puede afectar a varios pasos.');
  add('Riesgos asociados al mismo AS-IS y enviados al backend',e.risks.length===2&&e.risks.every(r=>r.step_ids?.length&&r.step_ids.every(id=>stepIds.has(id)))&&(typeof normalizeRiskInputs!=='function'||normalizeRiskInputs(e).every((r,i)=>JSON.stringify(r.step_ids)===JSON.stringify(e.risks[i].step_ids))),'DEC-065: step_ids viaja hasta RiskInput sin crear otro mapa ni cambiar la fórmula de riesgo.');
  add('Costes declarados sin ahorro ficticio',e.economicInputs.length===2&&e.economicInputs.every(x=>x.evidence_type==='CLIENT_DECLARED'&&!x.realized_cash_saving_eur_annual&&!x.direct_loss_eur_annual),'ED12 y ED14 son datos del escenario; DF078/079 pertenecen al backend.');
  add('No hay falsa confirmación de cierre',!e.confirmedAsIs&&!e.answers.DF093&&!e.confirmedSnapshots?.length,'Las cuatro capas requieren validación real en el editor.');
  for(const fid of ['DF017','DF046','DF047','DF049','DF050','DF057','DF066','DF067','DF078','DF079','DF085','DF093','DF094','DF095'])
    if(Object.prototype.hasOwnProperty.call(e.answers,fid))findings.push(fid+' está indebidamente copiado en answers; debería proceder de su owner.');
  // Concrete differences between client-declared global figures and owner-level records.
  const caseKey=String(e.id).includes('INVOICE')?'INVOICE':String(e.id).includes('INTAKE')?'INTAKE':'EMAIL';
  const headline=caseKey==='INVOICE'
    ?'Facturas: DF026 declara 72 h end-to-end, pero el mapa registra 90 y 60 min de espera en validación/cotejo y 720 min sólo en el 25 % sujeto a aprobación. Falta explicar o evidenciar el tiempo restante; no se igualan por decreto.'
    :caseKey==='INTAKE'
    ?'Peticiones: DF026 declara 40 h end-to-end; el mapa contiene 120 min en completar datos y 480 min sólo para el 25 % que necesita presupuesto. Falta delimitar otras colas o verificar el dato global.'
    :'Pedidos: DF026 declara 15 h end-to-end; el mapa registra 30 y 45 min de espera y 240 min sólo para el 12 % con excepción. Validar el resto de ciclo antes de anualizar espera.';
  findings.push(headline);
  const permission=e.answers?.DF099;
  if(permission!=='UNKNOWN')findings.push('DF099 no puede representar un permiso real en una UAT sintética: debe quedar desconocido hasta verificar su alcance.');
  const protectedStep=(e.answerDetails?.DF075__steps||[]).map(id=>steps.find(x=>x.id===id)?.step_name||id);
  findings.push('Control humano DF075 asociado al paso: '+protectedStep.join(', ')+'. Comprobar en el editor que la restricción afecta realmente a ese acto.');
  // Findings reflect actual, existing model wiring; they are NOT fixed by the fixture.
  const sources=typeof reusedValue==='function'?(reusedValue('DF047',e)||[]):[];
  const documents=typeof reusedValue==='function'?(reusedValue('DF049',e)||[]):[];
  findings.push('DF047 (fuentes): '+sources.map(v=>labelFrom('OS_ARTIFACT_TYPE',v)).join(', ')+'; DF049 (documentos): '+documents.map(v=>labelFrom('OS_ARTIFACT_TYPE',v)).join(', ')+'. Ambas vistas reutilizan ProcessStep, no son copias editables. Tipos mixtos como email, PDF y Excel pueden aparecer en ambas según su uso; verificar documentos concretos/evidencias antes de cerrar H01.');
  findings.push('DF028: tasa global declarada '+(e.answers.DF028?.value??'pendiente')+' %; DF040: '+steps.filter(x=>x.error_rate?.value!=null).map(x=>x.step_name+' '+x.error_rate.value+' %').join('; ')+'. No se suman porcentajes por paso ni se sustituyen automáticamente: los casos pueden solaparse y falta conciliación de población/evidencia.');
  for(const fid of ['DF080','DF081']){
    const declared=e.answers?.[fid],context=typeof economicConditionalTimeContext==='function'?economicConditionalTimeContext(fid,e):'Revisar tiempos de pasos y fricciones antes de agregarlos.';
    findings.push(fid+': declaración sintética '+(declared?.value??'desconocida')+' '+(declared?.unit||'')+' por '+(declared?.period||'periodo no acreditado')+'. '+context);
  }
  findings.push('Risk.step_ids y RiskInput.step_ids ahora conservan la misma referencia técnica al paso (DEC-065); el scoring no se modifica.');
  findings.push('DF078/079 no se rellenan desde datos de UAT: necesitan proyección real del backend. No se simula ROI, ahorro ni evidencia medida.');
  findings.push('La versión AS-IS sigue pendiente de confirmación humana. Ningún estudio cargado se presenta como histórico validado.');
  return {checks,findings,passed:checks.filter(x=>x.pass).length,total:checks.length};
}

function restoreCurrentInvoiceUatSteps234(){
  const e=currentEng();
  if(!e)return toast('Abre primero el estudio que quieres reparar.');
  const active=(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
  const step1=active[0];
  if(!step1)return toast('El estudio actual no conserva el paso 1; no se aplica la recuperación automática.');
  if(!confirm('Recuperar automáticamente los pasos 2, 3 y 4 del caso de facturas en el estudio actual? El paso 1 se conserva.'))return;
  const upsert=(name,data)=>{
    let step=(e.processSteps||[]).find(x=>x.status!=='SUPERSEDED'&&x.step_name===name);
    if(!step){step={id:id('STEP'),status:'ACTIVE'};e.processSteps.push(step)}
    Object.assign(step,{
      status:'ACTIVE',occurrences_per_case:1,applies_to:{mode:'PERCENT',value:'100',condition:''},
      inputs:[],outputs:[],manual_actions:[],communication_channels:[],evidence:['EV02'],
      active_time:0,wait_time:0,rework_time:0,error_rate:{value:0,mode:'percent',period:''},
      automation_state:'MANUAL',decision_criteria:[],exception_path:null,normal_next_step:'',_details:{},_ui:{},
      ...data
    });
    return step;
  };
  const s2=upsert('Validar datos de la factura',{
    step_type:'ST02',actor:'FINANCE',tool:'ERP',
    inputs:['PDF','MASTER_DATA'],outputs:['RECORD'],
    active_time:8,wait_time:90,rework_time:10,error_rate:{value:8,mode:'percent',period:''},
    manual_actions:['SEARCH','CHECK','COMPARE'],communication_channels:['EMAIL']
  });
  const s3=upsert('Cotejar pedido y albarán',{
    step_type:'ST02',actor:'FINANCE',tool:'ERP',
    inputs:['PDF','RECORD','MASTER_DATA'],outputs:['RECORD'],
    active_time:7,wait_time:60,rework_time:15,error_rate:{value:6,mode:'percent',period:''},
    manual_actions:['SEARCH','COMPARE'],communication_channels:['EMAIL']
  });
  const s4=upsert('Determinar si procede aprobación',{
    step_type:'ST04',actor:'FINANCE',tool:'ERP',
    inputs:['RECORD'],outputs:['APPROVAL'],
    active_time:2,wait_time:0,rework_time:0,error_rate:{value:0,mode:'percent',period:''},
    manual_actions:['CHECK'],communication_channels:['EMAIL'],
    decision_criteria:['THRESHOLD','CATEGORY'],
    exception_path:{type:'',condition:'Importe ≤ 1.500 € y sin discrepancias',destination_step:'',owner:'FINANCE'},
    _details:{decision_criteria:'El importe supera 1.500 € o existe una discrepancia'},
    _ui:{has_decision:true}
  });
  step1.normal_next_step=s2.id;s2.normal_next_step=s3.id;s3.normal_next_step=s4.id;
  s4.normal_next_step='';
  if(typeof invalidateProcessLayers==='function')invalidateProcessLayers(e,'map');
  e.updatedAt=now();markDirty('UAT: recuperados pasos 2-4 del flujo de facturas');
  const ok=typeof persistRecoverySnapshot==='function'?persistRecoverySnapshot('uat-recover-invoice-steps-234'):true;
  render();
  toast(ok?'Pasos 2, 3 y 4 recuperados. La decisión queda con destinos pendientes para continuar la UAT.':'Los pasos se han reconstruido en memoria, pero no se pudieron persistir; revisa si hay otra ventana editando.');
}

const __uat3PostBindBase=postBind;
postBind=function(){
  __uat3PostBindBase();
  const load=document.getElementById('loadUat3'),clear=document.getElementById('clearUat3'),recover=document.getElementById('recoverInvoiceSteps234');
  if(load)load.onclick=loadUat3;
  if(clear)clear.onclick=()=>clearUat3({ask:true});
  if(recover)recover.onclick=restoreCurrentInvoiceUatSteps234;
  document.querySelectorAll('[data-uat3-open]').forEach(button=>button.onclick=()=>{
    const e=state.engagements.find(x=>x.id===button.dataset.uat3Open);if(!e)return;
    state.activeEngagementId=e.id;
    e.stageId=button.dataset.uat3Stage||'S01';
    state.activePage=button.dataset.uat3Page||'diagnostico';render();
  });
};
// [AUNEA-UAT-ENDTOEND-110] END
