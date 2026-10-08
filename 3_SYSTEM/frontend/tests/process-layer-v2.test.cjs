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

test('S03 baseline is projected into consultant and shared AS-IS views',()=>{
  const {ctx,e}=setup();
  assert.match(process,/function asisDemandBaseline\(e\)/);
  assert.match(process,/Volumen habitual/);
  assert.match(process,/Demanda \/ estacionalidad/);
  assert.match(process,/Backlog actual/);
  assert.match(process,/Error \/ retrabajo global/);
  assert.match(process,/Clases que cambian tratamiento/);
  assert.match(process,/Tendencia 12–18 meses/);
  assert.match(process,/\+asisDemandBaseline\(e\)/);
  const occurrences=(process.match(/asisDemandBaseline\(e\)/g)||[]).length;
  assert.ok(occurrences>=3,'helper definition plus consultant map and shared editor must all reference S03 baseline');
});

test('scope roles and material variants remain visible as inherited context in the AS-IS map',()=>{
  const {ctx,e}=setup();
  e.answers.DF017=['CUSTOMER','OPERATIONS','MANAGER'];
  e.answers.DF020=['CASE_TYPE','URGENCY'];
  e.processSteps=[{id:'A',status:'ACTIVE',step_name:'Recibir'}];
  const html=ctx.clientProcessView(e,e.processSteps,[],'cliente');
  assert.match(html,/data-asis-participants="DF017"/);
  assert.match(html,/CUSTOMER · OPERATIONS · MANAGER/);
  assert.match(html,/data-asis-variant-candidates="DF020"/);
  assert.match(html,/CASE_TYPE · URGENCY/);
  assert.match(html,/Aún no hay una decisión en el mapa que represente una ruta alternativa/);
  const consoleMap=ctx.asisMapPage(e,e.processSteps,[]);
  assert.match(consoleMap,/data-asis-participants="DF017"/);
  assert.match(consoleMap,/data-asis-variant-candidates="DF020"/);
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
  assert.match(html,/Contexto heredado/);
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
  assert.match(html,/data-edit-step="D"/);
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
  assert.match(ctx.processGraphHtml(e,e.processSteps,e.frictions,'Inicio','Fin'),/Definir destino/);
});

test('a decision creates one temporary branch level and nested decisions are blocked until reconvergence',()=>{
  const {ctx,e}=setup();
  e.processSteps=[
    {id:'D',status:'ACTIVE',step_name:'Decidir',_ui:{has_decision:true},normal_next_step:'Y',exception_path:{destination_step:'N'}},
    {id:'Y',status:'ACTIVE',step_name:'Ruta sí',normal_next_step:'M'},
    {id:'N',status:'ACTIVE',step_name:'Ruta no',normal_next_step:'M'},
    {id:'M',status:'ACTIVE',step_name:'Unión'}
  ];
  const structure=ctx.processBranchStructure(e,e.processSteps);
  assert.equal(structure.branchStepIds.has('Y'),true);
  assert.equal(structure.branchStepIds.has('N'),true);
  assert.equal(structure.branchStepIds.has('M'),false,'the merge is no longer inside the branch');
  assert.equal(ctx.processStepInsideBranch(e,'Y'),true);
  assert.match(process,/branch-decision-blocked/);
  assert.match(process,/No se puede crear otra bifurcación dentro de una rama/);
});

test('Impact page summarizes the applicable driver values and blocks incomplete records',()=>{
  assert.match(econ,/function economicRecordSummary\(/);
  assert.match(econ,/function economicRecordCompletenessIssues\(/);
  assert.match(econ,/Coste de capacidad por hora/);
  assert.match(econ,/Coste anual de herramientas|coste anual de herramientas/i);
  assert.match(process,/function impactLayerReviewSummary\(/);
  assert.match(process,/Evidencia económica/);
  assert.match(process,/Sin inconsistencias pendientes/);
});

test('review recommendations are grouped and Impact exposes its own review action',()=>{
  assert.match(process,/const grouped=new Map\(\)/);
  assert.match(process,/AUNEA ha agrupado la misma señal detectada en varios pasos/);
  assert.match(econ,/function reviewEconomicCandidates\(/);
  assert.match(econ,/id="reviewEconomicCandidates"/);
  assert.match(econ,/AUNEA ha agrupado el mismo tipo de impacto detectado en varios pasos/);
  assert.match(process,/reviewEconomicCandidatesBtn/);
});

test('client layer exposes only the matching per-step add action and linked badges open the owning editor',()=>{
  const {ctx,e}=setup();
  e.processSteps=[{id:'A',status:'ACTIVE',step_name:'Recibir'}];
  e.frictions=[{id:'F',status:'ACTIVE',affected_steps:['A'],friction_type:'P01'}];
  e.risks=[{step_ids:['A'],description:'Riesgo'}];
  e.economicInputs=[{step_ids:['A'],driver_id:'ED01'}];
  const fr=ctx.clientProcessView(e,e.processSteps,e.frictions,'fricciones');
  assert.match(fr,/data-add-friction-step="A"/);assert.doesNotMatch(fr,/data-add-risk-step="A"/);assert.doesNotMatch(fr,/data-add-economic-step="A"/);
  const ri=ctx.clientProcessView(e,e.processSteps,e.frictions,'riesgos');
  assert.match(ri,/data-add-risk-step="A"/);
  const im=ctx.clientProcessView(e,e.processSteps,e.frictions,'impacto');
  assert.match(im,/data-add-economic-step="A"/);
  assert.match(fr,/data-edit-friction="F"/);
  assert.match(fr,/data-edit-risk-index="0"/);
  assert.match(fr,/data-edit-economic-index="0"/);
  assert.match(process,/currentEng\(\)\.processTab='fricciones'/);
  assert.match(process,/currentEng\(\)\.processTab='riesgos'/);
  assert.match(process,/currentEng\(\)\.processTab='impacto'/);
});

test('decision gateway and YES card share the main row while NO stays below',()=>{
  assert.match(css,/\.process-graph-yes-branch-cell\{transform:none/);
  assert.match(css,/\.graph-decision-gateway\{[^}]*top:calc\(50% - 29px\)/);
  assert.match(css,/\.graph-decision-copy\{[^}]*top:calc\(50% \+ 43px\)/);
  assert.match(process,/if\(Math\.abs\(targetY-centerY\)<4\)appendPath\('M'\+rightX\+' '\+centerY\+'H'\+\(targetX-5\)/);
  assert.match(process,/yesBottom\+34/);
});

test('decision NO route exits below the gateway, clears the YES card, and overlays stay above the gateway',()=>{
  assert.match(process,/const noStartX=dr\.left\+dr\.width\/2-rect\.left/);
  assert.match(process,/const noStartY=dr\.bottom-rect\.top/);
  assert.match(process,/const yesBottom=yesRect\?yesRect\.bottom-rect\.top:mainY/);
  assert.match(process,/Math\.max\(mainY\+94,noStartY\+64,yesBottom\+34\)/);
  assert.match(process,/appendPath\('M'\+noStartX\+' '\+noStartY\+'V'\+lowerY/);
  assert.match(css,/\.process-graph-decision-cell\{align-items:stretch\}/);
  assert.match(css,/\.graph-decision-inline \.flow-step-tools\{[^}]*top:-126px/);
  assert.match(css,/\.graph-decision-inline>\.process-node-actions\{[^}]*top:-94px/);
  assert.match(css,/\.graph-decision-inline>\.process-node-links\{[^}]*top:-58px[^}]*width:100%/);
  assert.match(css,/\.graph-decision-gateway\{[^}]*top:calc\(50% - 29px\)/);
  assert.match(css,/body\.mode-process-editor \.process-graph-cell \.flow-step\{[^}]*max-height:none/);
  assert.doesNotMatch(css,/\.process-node-links \.friction-badge:before/);
});

test('client graph stays within the editor viewport and decision routes explain their destination',()=>{
  const {ctx,e}=setup();
  e.processSteps=[
    {id:'D',status:'ACTIVE',step_name:'¿Validar?',step_type:'ST04',normal_next_step:'Y',exception_path:{destination_step:'N'}},
    {id:'Y',status:'ACTIVE',step_name:'Aprobar'},
    {id:'N',status:'ACTIVE',step_name:'Solicitar datos'}
  ];
  const html=ctx.processGraphHtml(e,e.processSteps,[],'Inicio','Fin','cliente');
  assert.match(html,/SÍ/);assert.match(html,/NO/);
  assert.match(html,/data-graph-edges=/);
  assert.match(css,/body\.mode-process-editor \.process-graph-board\{width:100%;min-width:0\}/);
  assert.match(css,/body\.mode-process-editor \.client-process-canvas\.process-graph-canvas\{overflow-x:hidden/);
});

test('risk inherits confirmed friction locations via existing step_ids; economic context reuses upstream without invented costs',()=>{
  assert.match(risk,/data-risk-friction/);
  assert.match(risk,/normalizeArray\(f\.affected_steps\)/);
  assert.match(risk,/riskRelatedFrictions/);
  assert.doesNotMatch(risk,/friction_ids\s*:/);
  assert.match(econ,/Contexto del impacto/);
  assert.match(econ,/linkedFrictions\.length/);
  assert.match(econ,/linkedRisks\.length/);
  assert.match(econ,/economicTimeProjection/);
  assert.match(econ,/Evita volver a contabilizar el mismo evento/);
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

test('render retains actual horizontal and vertical map scroll across an in-place layer redraw',()=>{
  const code=fs.readFileSync(path.join(root,'core/state.js'),'utf8');
  const snippet=code.slice(code.indexOf('// ['+'AUNEA-FE-PROC-VIEWPORT-052'+'] START'),code.indexOf('function goToProcessFromStage()'));
  const study={id:'ENG-1',processTab:'fricciones'};
  let canvas={scrollLeft:640,scrollTop:70},processMain={scrollTop:480},workspace={dataset:{processEngagement:'ENG-1'}};
  const content={set innerHTML(v){canvas={scrollLeft:0,scrollTop:0};processMain={scrollTop:0};workspace={dataset:{processEngagement:'ENG-1'}};this.value=v},get innerHTML(){return this.value}};
  const document={querySelector:q=>q==='.flow-canvas'?canvas:q==='.client-process-main'?processMain:q==='[data-process-engagement]'?workspace:null,
    getElementById:q=>q==='content'?content:null,documentElement:{classList:{toggle(){}}},body:{classList:{toggle(){}}}};
  const frames=[];
  const window={scrollX:0,scrollY:480,scrollTo(x,y){this.scrollX=x;this.scrollY=y}};
  const ctx={document,window,state:{activePage:'proceso'},pages:{proceso:()=>'<div>Mapa AS-IS</div>'},
    currentEng:()=>study,renderNav(){},updateHeader(){},bindCommon(){},postBind(){},
    requestAnimationFrame:fn=>{frames.push(fn)},publishSessionSnapshot(){},toast(){},advanceEngagementTo(){},isProcessEditorWindow(){return false}};
  vm.createContext(ctx);vm.runInContext(snippet,ctx);
  // Changing from Risks to Impact must retain the same flow position after graph layout.
  study.processTab='impacto';ctx.render();
  assert.equal(canvas.scrollLeft,0,'Impact may create a new canvas before it is measured');
  assert.equal(frames.length,1);
  frames.shift()();assert.equal(frames.length,1);
  frames.shift()();
  assert.equal(canvas.scrollLeft,640);assert.equal(canvas.scrollTop,70);
  assert.equal(processMain.scrollTop,480,'the actual client-process vertical scroller must not jump to the top during map redraw');
  assert.equal(study.processTab,'impacto');
  ctx.state.activePage='diagnostico';ctx.pages.diagnostico=()=>'<div>Diagnóstico</div>';
  ctx.setPage('proceso');
  assert.equal(study.processTab,'impacto','reentering the editor cannot force the Pasos layer');
});
// [AUNEA-UAT-PROC-LAYERS-045] END
