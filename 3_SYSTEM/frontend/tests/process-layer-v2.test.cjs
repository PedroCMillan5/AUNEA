// [AUNEA-UAT-PROC-LAYERS-045] START — four-layer increment, restored dropdowns, horizontal routed graph
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const process=fs.readFileSync(path.join(root,'domain/process.js'),'utf8');
const risk=fs.readFileSync(path.join(root,'domain/risk.js'),'utf8');
const econ=fs.readFileSync(path.join(root,'domain/economics.js'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
function setup(){
  const e={processSteps:[],frictions:[],risks:[],economicInputs:[],answers:{DF014:'Inicio',DF015:'Fin'},processTab:'cliente'};
  const fields={},events={},label={textContent:''},help={textContent:''};
  const document={
    addEventListener(){},
    getElementById:id=>fields[id]||null,
    querySelector:selector=>selector==='[data-process-applies-label]'?label:selector==='[data-process-applies-help]'?help:null,
    querySelectorAll:()=>[]
  };
  const ctx={
    console,document,state:{returnTo:null},schema:{friction_pain_map:[],flow:[]},
    bindForms:()=>{},normalizeArray:v=>Array.isArray(v)?v:v==null||v===''?[]:[v],
    activeSteps:x=>x.processSteps.filter(s=>s.status!=='SUPERSEDED'),
    activeFrictions:x=>x.frictions.filter(f=>f.status!=='SUPERSEDED'),
    currentEng:()=>e,fieldOptions:()=>[],labelFrom:(set,v)=>v||'—',
    section:(title,description,body)=>body,attr:v=>String(v??'').replaceAll('"','&quot;'),esc:v=>String(v??''),
    num:v=>Number(v||0),pageTop:()=>'',requiredMark:()=>'*',
    auneaSelectControl:(id,opts,val)=>'<input id="'+id+'" value="'+(val||'')+'">',
    audit:()=>{},id:p=>p+'-TEST',now:()=>'',markDirty:()=>{},render:()=>{},toast:()=>{},
    closeModal:()=>{},openModal:()=>{},segmented:()=>'',riskBuilder:()=>'<div>Riesgos</div>',economicBuilder:()=>'<div>Impacto</div>',structuredClone
  };
  vm.createContext(ctx);vm.runInContext(process,ctx);
  return {ctx,e,fields,events,label,help};
}

test('previously single-select controls remain dropdowns while existing multiple choices wrap',()=>{
  const {ctx}=setup();
  assert.match(ctx.auneaDropdownControl('fr_impact',[{value:'1',label:'1'},{value:'2',label:'2'}],'2'),/id="fr_impact"/);
  assert.doesNotMatch(ctx.auneaDropdownControl('fr_impact',[{value:'1',label:'1'}],'1'),/process-chip-list/);
  assert.match(ctx.auneaDropdownControl('step_next',[{value:'__END__',label:'Fin del proceso'}],'__END__'),/id="step_next"/);
  assert.match(ctx.selectedHtml('step_inputs',[{value:'DOC',label:'Documento'}],[],{wrapped:true}),/choice-grid-wrapped/);
  assert.match(ctx.selectedHtml('fr_steps',[{value:'S',label:'Paso'}],[]),/choice-grid/);
  assert.match(risk,/return auneaSelectControl\(id,opts,value,\{placeholder\}\)/);
  assert.match(econ,/return auneaSelectControl\(id,opts,value,\{placeholder\}\)/);
  assert.match(css,/\.process-modal-form \.choice-grid\{display:flex;flex-wrap:wrap/);
});
test('ALL blocks 100 percent; percentage and conditional modes are editable only in their own mode',()=>{
  const {ctx,fields,label,help}=setup();
  const html=ctx.appliesControl({applies_to:{mode:'ALL',value:''}});
  assert.match(html,/id="step_applies_value"[^>]*value="100" disabled/);
  assert.match(html,/Se aplica al 100 % de los casos/);
  const mode={value:'ALL',addEventListener(name,fn){this.listener=fn}},input={
    disabled:true,type:'number',value:'100',placeholder:'',removeAttribute(){}
  };
  fields.step_applies_mode=mode;fields.step_applies_value=input;
  ctx.bindProcessAppliesControl();
  mode.value='PERCENT';mode.listener();
  assert.equal(input.disabled,false);assert.equal(input.type,'number');assert.equal(input.value,'');
  mode.value='CONDITION';mode.listener();
  assert.equal(input.type,'text');assert.equal(label.textContent,'Condición');
  mode.value='ALL';mode.listener();
  assert.equal(input.disabled,true);assert.equal(input.value,'100');
  assert.match(help.textContent,/bloqueado/);
});

test('step, friction, risk and impact are one connected, reviewable progression',()=>{
  const {ctx,e}=setup();
  e.processSteps=[{id:'A',status:'ACTIVE',step_name:'Recibir'}];
  e.frictions=[{id:'F',status:'ACTIVE',affected_steps:['A'],client_label:'Demora'}];
  e.risks=[{step_ids:['A'],description:'Riesgo de retraso'}];
  e.economicInputs=[{step_ids:['A'],driver_id:'ED01'}];
  const html=ctx.clientProcessView(e,e.processSteps,e.frictions,'fricciones');
  assert.match(html,/client-process-sequence/);
  for(const [tab,title] of [['cliente','Pasos'],['fricciones','Fricciones'],['riesgos','Riesgos'],['impacto','Impacto']]){
    assert.match(html,new RegExp('data-process-tab="'+tab+'"'));
    assert.match(html,new RegExp(title));
  }
  assert.match(html,/Lo que ya sabemos del proceso/);
  assert.match(html,/data-process-tab="riesgos">Continuar a Riesgos/);
  assert.match(css,/\.client-process-sequence:before/);
});

test('real SÍ/NO routes, merges and unconnected future destinations are visual graph edges',()=>{
  const {ctx,e}=setup();
  e.processSteps=[
    {id:'D',status:'ACTIVE',step_name:'Decidir',step_type:'ST04',normal_next_step:'Y',exception_path:{destination_step:'N'}},
    {id:'Y',status:'ACTIVE',step_name:'Aprobar',normal_next_step:'M'},
    {id:'N',status:'ACTIVE',step_name:'Solicitar datos',normal_next_step:'M'},
    {id:'M',status:'ACTIVE',step_name:'Continuar'}
  ];
  const graph=ctx.processGraphData(e,e.processSteps);
  const yes=graph.edges.find(x=>x.from==='D'&&x.label==='SÍ');
  const no=graph.edges.find(x=>x.from==='D'&&x.label==='NO');
  assert.equal(yes.to,'Y');assert.equal(no.to,'N');
  assert.equal(graph.positions.get('Y').col,graph.positions.get('N').col);
  assert.notEqual(graph.positions.get('Y').row,graph.positions.get('N').row);
  assert.ok(graph.positions.get('__END__').col>graph.positions.get('M').col);
  assert.equal(graph.edges.filter(x=>x.to==='M').length,2);
  const html=ctx.processGraphHtml(e,e.processSteps,e.frictions,'Inicio','Fin');
  assert.match(html,/process-graph-board/);
  assert.match(html,/process-graph-lines/);
  assert.match(html,/data-graph-edit-route="D"/);
  ctx.relinkNormalFlow(e);
  assert.equal(e.processSteps[0].normal_next_step,'Y');
  assert.equal(e.processSteps[0].exception_path.destination_step,'N');
  e.processSteps[0].normal_next_step='__END__';
  e.processSteps[0].exception_path={destination_step:'__END__'};
  const ending=ctx.processGraphData(e,e.processSteps);
  assert.equal(ending.edges.find(x=>x.from==='D'&&x.label==='SÍ').to,'__END__');
  assert.equal(ending.edges.find(x=>x.from==='D'&&x.label==='NO').to,'__END__');
  e.processSteps[0]._ui={has_decision:false};
  assert.equal(ctx.processDecisionStep(e.processSteps[0]),false,'decision toggle may be disabled without changing step type');
  e.processSteps[0]._ui={has_decision:true};
  e.processSteps[0].normal_next_step='';
  e.processSteps[0].exception_path={destination_step:''};
  const pending=ctx.processGraphData(e,e.processSteps);
  assert.ok(pending.nodes.some(x=>x.kind==='pending'&&x.route==='SÍ'));
  assert.ok(pending.nodes.some(x=>x.kind==='pending'&&x.route==='NO'));
  assert.match(ctx.processGraphHtml(e,e.processSteps,e.frictions,'Inicio','Fin'),/Elegir o crear destino/);
});

test('risk inherits confirmed friction locations via existing step_ids; economic context reuses upstream without invented costs',()=>{
  assert.match(risk,/data-risk-friction/);
  assert.match(risk,/normalizeArray\(f\.affected_steps\)/);
  assert.match(risk,/riskRelatedFrictions/);
  assert.doesNotMatch(risk,/friction_ids\s*:/);
  assert.match(econ,/Contexto reutilizado del AS-IS/);
  assert.match(econ,/linkedFrictions\.length/);
  assert.match(econ,/linkedRisks\.length/);
  assert.match(econ,/economicTimeProjection/);
  assert.match(econ,/No sumaremos dos veces un mismo problema/);
  assert.match(css,/\.client-inherited-context\{/);
});
test('friction popup captures approved time attribution without changing existing dropdowns',()=>{
  assert.ok(process.includes("auneaDropdownControl('fr_time_mode'"));
  assert.ok(process.includes("auneaDropdownControl('fr_time_owner'"));
  assert.ok(process.includes("INCLUDED"));
  assert.ok(process.includes("BREAKDOWN"));
  assert.ok(process.includes("ADDITIONAL"));
  assert.ok(process.includes("f.time_attribution={mode:"));
  assert.ok(process.includes("f.affected_steps.includes(f.time_attribution.step_id)"));
  assert.ok(process.includes("Sólo Adicional podrá incrementar"));
});
test('CF01 continuity: the same declared scope and demand appear on each process layer without editable copies',()=>{
  const {ctx,e}=setup();
  Object.assign(e.answers,{DF011:'Factura recibida',DF014:'Correo con factura',DF015:'Registrada y archivada',DF021:160,DF022:'MONTH',DF023:230,DF025:'48 h',DF026:'72 h'});
  e.processSteps=[{id:'A',status:'ACTIVE',step_name:'Recibir',active_time:3,wait_time:0}];
  for(const tab of ['cliente','fricciones','riesgos','impacto']){
    const html=ctx.clientProcessView(e,e.processSteps,[],tab);
    assert.match(html,/data-process-continuity="true"/);
    for(const expected of ['Correo con factura','Registrada y archivada','160','MONTH','230','48 h','72 h'])assert.ok(html.includes(expected),tab+' misses '+expected);
    assert.doesNotMatch(html,/id="DF021"/,'the context is not a second capture');
  }
});
test('CF06 review represents the actual linked steps, frictions, risks and impacts and route gaps',()=>{
  const {ctx,e}=setup();
  e.answers={DF011:'Facturas',DF014:'Correo',DF015:'Archivo'};
  e.processSteps=[{id:'A',status:'ACTIVE',step_name:'Validar',active_time:8,wait_time:90,actor:'Finanzas',normal_next_step:'__END__'}];
  e.frictions=[{id:'F',status:'ACTIVE',affected_steps:['A'],client_label:'Información incompleta'}];
  e.risks=[{step_ids:['A'],description:'Pago duplicado'}];e.economicInputs=[{step_ids:['A'],driver_id:'ED01'}];
  const review=ctx.processReadOnlyJourney(e);
  for(const expected of ['data-process-review','Validar','Información incompleta','Riesgos:</b> 1','Datos de impacto:</b> 1','Fin del proceso','Correo','Archivo'])assert.ok(review.includes(expected),expected);
});
test('deleting a step cannot silently orphan risks, economic input or time ownership',()=>{
  assert.match(process,/linkedRisks\.length\|\|linkedEconomics\.length/);
  assert.match(process,/f\.time_attribution\?\.step_id===stepId/);
  assert.match(process,/Cambia primero esas relaciones/);
});
// [AUNEA-UAT-PROC-LAYERS-045] END
