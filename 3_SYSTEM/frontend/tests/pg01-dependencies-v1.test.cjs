// [AUNEA-UAT-PG01-DEPENDENCIES-023] START — Owner/projection, cardinality and snapshot regression (authorized PG01 reopening 2026-10-20)
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const modules=['domain/no-reask.js','domain/engagement.js','services/engine-adapter.js','pages/diagnostic-stages.js'];
function fixture(){
  const company={id:'CO',name:'Levante Instalaciones Técnicas',sector:'F',employeeCount:45,country:'ES'};
  const contact={id:'CT',companyId:'CO',firstName:'Marcos',lastName:'Soto',role:'Otro',email:'marcos.qa@example.invalid',phone:'',status:'Activo'};
  const engagement={id:'E',companyId:'CO',contactIds:['CT'],status:'Sesión 1',stageId:'S01',
    answers:{DF003:999,DF008:['UNDERSTAND','REDUCE_TIME','CONTROL','VISIBILITY'],DF009:['CLARITY','PRIORITIES','ECONOMIC_CASE','SCOPE']},
    answerDetails:{},processSteps:[],frictions:[],risks:[],economicInputs:[],confirmedAsIs:false,confirmedSnapshots:[]};
  const state={companies:[company],contacts:[contact],engagements:[engagement]};
  const schema={version:'1.2',flow:[{Stage_ID:'S01'}],fields:[
    {Field_ID:'DF002',Stage_ID:'S01',Ask_Mode:'PREFILL_CONFIRM',Option_Set_ID:'REF_INDUSTRY_CNAE25',Requiredness:'OPTIONAL_90M',Pregunta_o_etiqueta_ES:'Sector'},
    {Field_ID:'DF003',Stage_ID:'S01',Ask_Mode:'PREFILL_OR_OPTIONAL',Requiredness:'OPTIONAL_90M',Pregunta_o_etiqueta_ES:'Tamaño'},
    {Field_ID:'DF008',Stage_ID:'S01',Ask_Mode:'ASK',Control_UI:'MULTISELECT_WITH_OTHER',Option_Set_ID:'OS_SESSION_OBJECTIVE',Requiredness:'REQUIRED_90M',Pregunta_o_etiqueta_ES:'Objetivo'},
    {Field_ID:'DF009',Stage_ID:'S01',Ask_Mode:'ASK',Control_UI:'MULTISELECT_WITH_OTHER',Option_Set_ID:'OS_SUCCESS_DIMENSION',Requiredness:'OPTIONAL_90M',Pregunta_o_etiqueta_ES:'Criterios'}
  ],option_sets:{
    REF_INDUSTRY_CNAE25:{options:[{value:'CNAE25-F',label:'Construcción'},{value:'CNAE25-O',label:'Actividades administrativas'}]},
    OS_SESSION_OBJECTIVE:{options:[{value:'UNDERSTAND',label:'Entender'}]},
    OS_SUCCESS_DIMENSION:{options:[{value:'CLARITY',label:'Claridad'}]}
  }};
  const ctx={
    state,schema,companyById:id=>state.companies.find(c=>c.id===id)||null,
    contactById:id=>state.contacts.find(c=>c.id===id)||null,
    fieldOptions:id=>schema.option_sets[id]?.options||[],
    normalizeArray:v=>Array.isArray(v)?v:v===undefined||v===null||v===''?[]:[v],
    bindForms:()=>{},now:()=>new Date('2026-10-20T10:00:00Z').toISOString(),audit:()=>{},markDirty:()=>{},
    contactFullName:c=>[c.firstName,c.lastName].filter(Boolean).join(' '),
    attr:String,esc:String,requiredMark:()=>'*',
    auneaSelectControl:(_id,_opts,v)=>'<SELECT data-value="'+v+'">',
    companySizeBand:c=>Number(c.employeeCount)>0?'11–50':'—',
    questionVisible:()=>true,renderStageFields:()=>'<FIELDS>',
    document:{querySelector:()=>null}
  };
  vm.createContext(ctx);
  for(const f of modules)vm.runInContext(read(f),ctx,{filename:f});
  return {ctx,state,company,contact,engagement,run:js=>vm.runInContext(js,ctx)};
}
test('PG01 renders legacy sector and Company size without writing a second DF003 answer',()=>{
  const f=fixture(),before=JSON.stringify(f.engagement.answers);
  const html=f.run('pg01ContextFields(state.engagements[0])');
  assert.match(html,/data-value="CNAE25-F"/);
  assert.match(html,/11–50 empleados/);
  assert.equal(JSON.stringify(f.engagement.answers),before);
  assert.equal(f.run("effectiveValue(schema.fields[1],state.engagements[0])"),45);
});
test('DF003 live never trusts legacy Engagement answer when Company changes or becomes unknown',()=>{
  const f=fixture();
  f.company.employeeCount=60;
  assert.equal(f.run("effectiveValue(schema.fields[1],state.engagements[0])"),60);
  assert.equal(f.engagement.answers.DF003,999);
  delete f.company.employeeCount;
  assert.equal(f.run("effectiveValue(schema.fields[1],state.engagements[0])"),'');
});
test('DF008/DF009 reject four values in central validation, completion and PG01 status',()=>{
  const f=fixture();
  for(const id of ['DF008','DF009']){
    const field=f.schema.fields.find(x=>x.Field_ID===id),value=f.engagement.answers[id];
    const issue=f.run("canonicalFieldValidationIssue(schema.fields.find(x=>x.Field_ID==='"+id+"'),state.engagements[0].answers."+id+",state.engagements[0])");
    assert.match(issue,/máximo 3/);
    assert.equal(f.run("canonicalFieldValuePresent(schema.fields.find(x=>x.Field_ID==='"+id+"'),state.engagements[0].answers."+id+",state.engagements[0])"),false);
    assert.equal(value.length,4,'imported values must not be truncated');
  }
  const html=f.run('pg01CanonicalDisclosure(schema.fields,state.engagements[0])');
  assert.match(html,/2 datos por corregir/);
  assert.match(html,/Objetivo:/);assert.match(html,/Criterios:/);
  assert.equal(f.run("stagePendingRequired(state.engagements[0],'S01').some(f=>f.Field_ID==='DF008')"),true);
  assert.equal(f.run("canonicalFieldIntegrityIssues(state.engagements[0]).length"),2);
  f.engagement.answers.DF008.pop();f.engagement.answers.DF009.pop();
  assert.equal(f.run("canonicalFieldIntegrityIssues(state.engagements[0]).length"),0);
});
test('Company values materialize only on immutable PG09 snapshot and stay stable after CRM changes',()=>{
  const f=fixture(),before=JSON.stringify(f.engagement.answers);
  const snap=f.run('buildConfirmedSnapshot(state.engagements[0])');
  assert.equal(snap.answers.DF003,45);
  assert.equal(snap.answers.DF002,'CNAE25-F');
  assert.equal(snap.company.sector,'CNAE25-F');
  assert.equal(JSON.stringify(f.engagement.answers),before);
  f.engagement.confirmedAsIs=true;f.engagement.confirmedSnapshots.push(snap);
  f.company.employeeCount=600;f.company.sector='CNAE25-O';
  const answers=f.run('questionnaireAnswersForEngine(engagementOfRecord(state.engagements[0]))');
  assert.equal(answers.DF003,45);
  assert.equal(answers.DF002,'CNAE25-F');
  assert.equal(f.run("effectiveValue(schema.fields[1],state.engagements[0])"),600);
  assert.equal(f.run("questionnaireAnswersForEngine(state.engagements[0]).DF003"),600);
});
test('No invented DF003 when missing; sector aliases only exact supported sections',()=>{
  const f=fixture();
  delete f.company.employeeCount;
  const live=f.run('questionnaireAnswersForEngine(state.engagements[0])');
  assert.equal(Object.hasOwn(live,'DF003'),false);
  assert.equal(f.run("canonicalValueFromLabel('REF_INDUSTRY_CNAE25','F')"),'CNAE25-F');
  assert.equal(f.run("canonicalValueFromLabel('REF_INDUSTRY_CNAE25','Z')"),'Z');
  assert.equal(f.run("canonicalValueFromLabel('REF_INDUSTRY_CNAE25','CNAE25-O')"),'CNAE25-O');
});
test('real Continue handler blocks four DF008 values, then four answered optional DF009 values, and permits valid/blank',()=>{
  const f=fixture(),warnings=[],button={},shell=read('ui/shell.js');
  f.schema.flow.push({Stage_ID:'S02'});
  f.ctx.by=id=>id==='nextStage'?button:null;
  f.ctx.currentEng=()=>f.engagement;
  f.ctx.toast=message=>warnings.push(message);
  f.ctx.render=()=>{};
  f.ctx.markDirty=()=>{};
  const line=shell.split('\n').find(line=>line.includes("if(by('nextStage'))"));
  assert.ok(line,'real frontend nextStage button must be wired');
  f.run(line);
  assert.equal(typeof button.onclick,'function');
  button.onclick();
  assert.equal(f.engagement.stageId,'S01','DF008 with four values must block');
  assert.match(warnings.at(-1),/máximo 3/);
  assert.equal(f.run("stagePendingRequired(state.engagements[0],'S01').some(f=>f.Field_ID==='DF008')"),true);
  f.engagement.answers.DF008.pop();
  button.onclick();
  assert.equal(f.engagement.stageId,'S01','optional DF009 with four entered values must still block');
  assert.match(warnings.at(-1),/Criterios:.*máximo 3/);
  f.engagement.answers.DF009=[];
  button.onclick();
  assert.equal(f.engagement.stageId,'S02','optional DF009 blank and required DF008 valid must allow advancement');
});
test('empty DF008 blocks as required, while blank DF009 alone is never required',()=>{
  const f=fixture();
  f.engagement.answers.DF008=[];f.engagement.answers.DF009=[];
  const missing=f.run("stagePendingRequired(state.engagements[0],'S01').map(f=>f.Field_ID)");
  assert.deepEqual(Array.from(missing),['DF008']);
  const warnings=[];f.ctx.toast=t=>warnings.push(t);
  assert.equal(f.run('blockStageAdvance(state.engagements[0])'),true);
  assert.match(warnings[0],/Falta un campo obligatorio/);
});
test('real sidebar route blocks forward with imported invalid DF008 or DF009 and allows backward',()=>{
  const f=fixture(),stateCode=read('core/state.js'),warnings=[];
  const a=stateCode.indexOf('function firstForwardSessionBlocker(');
  const b=stateCode.indexOf('function renderNav(){',a);
  assert.ok(a>=0&&b>a,'the rail must use the pure forward validation helper');
  f.schema.flow.push({Stage_ID:'S02'},{Stage_ID:'S03'});
  f.ctx.stageList=()=>f.schema.flow;
  f.ctx.currentStageIndex=()=>f.schema.flow.findIndex(s=>s.Stage_ID===f.engagement.stageId);
  f.ctx.toast=msg=>warnings.push(msg);
  f.ctx.setPage=page=>{f.state.activePage=page};
  f.state.activePage='diagnostico';
  f.run(stateCode.slice(a,b));
  const handler=stateCode.match(/  document\.querySelectorAll\('\[data-stage-nav\]'\)\.forEach\(b=>b\.onclick=\(\)=>\{[\s\S]*?\n  \}\);/);
  assert.ok(handler,'actual sidebar click path must be found');
  const target={dataset:{stageNav:'S02'},onclick:null};
  const originalQuery=f.ctx.document.querySelectorAll;
  f.ctx.document.querySelectorAll=s=>s==='[data-stage-nav]'?[target]:originalQuery?.(s)||[];
  f.run(handler[0]);
  assert.equal(typeof target.onclick,'function');
  target.onclick();
  assert.equal(f.engagement.stageId,'S01');
  assert.match(warnings.at(-1),/máximo 3/);
  assert.equal(f.run("firstForwardSessionBlocker(state.engagements[0],'S02').id"),'DF008');
  f.engagement.answers.DF008.pop();
  target.onclick();
  assert.equal(f.engagement.stageId,'S01');
  assert.equal(f.run("firstForwardSessionBlocker(state.engagements[0],'S02').id"),'DF009');
  f.engagement.answers.DF009=[];
  target.onclick();
  assert.equal(f.engagement.stageId,'S02');
  f.engagement.stageId='S03';
  target.dataset.stageNav='S01';
  target.onclick();
  assert.equal(f.engagement.stageId,'S01','backward navigation remains permitted');
});
test('sidebar cannot jump past an invalid intermediate stage despite imported later data',()=>{
  const f=fixture(),stateCode=read('core/state.js');
  const a=stateCode.indexOf('function firstForwardSessionBlocker('),b=stateCode.indexOf('function renderNav(){',a);
  f.schema.flow.push({Stage_ID:'S02'},{Stage_ID:'S03'});
  f.schema.fields.push({Field_ID:'TEST_S02',Stage_ID:'S02',Ask_Mode:'ASK',Requiredness:'REQUIRED_90M',Control_UI:'TEXT_SHORT',Pregunta_o_etiqueta_ES:'Required S02 test field'});
  f.engagement.answers.DF008.pop();f.engagement.answers.DF009=[];
  f.ctx.stageList=()=>f.schema.flow;
  f.ctx.currentStageIndex=()=>f.schema.flow.findIndex(s=>s.Stage_ID===f.engagement.stageId);
  f.run(stateCode.slice(a,b));
  const reason=f.run("firstForwardSessionBlocker(state.engagements[0],'S03')");
  assert.equal(reason.stageId,'S02');
  assert.equal(reason.id,'TEST_S02');
  assert.equal(f.run("firstForwardSessionBlocker(state.engagements[0],'S01')"),null);
});
test('session rail disables previously prefilled later stages until PG01 errors are fixed',()=>{
  const f=fixture(),stateCode=read('core/state.js');
  const a=stateCode.indexOf('function firstForwardSessionBlocker(');
  const b=stateCode.indexOf('// [AUNEA-FE-PROC-VIEWPORT-052]',a);
  assert.ok(a>=0&&b>a,'navigation rendering must be present');
  f.schema.flow.push({Stage_ID:'S02',Stage_ES:'Alcance'});
  f.state.activePage='diagnostico';
  f.ctx.stageList=()=>f.schema.flow;
  f.ctx.currentStageIndex=()=>f.schema.flow.findIndex(s=>s.Stage_ID===f.engagement.stageId);
  f.ctx.contextualNav=()=>[['__STAGES__']];
  f.ctx.completionStageReviewed=stage=>stage.Stage_ID==='S02';
  f.ctx.esc=String;
  const nav={innerHTML:''};
  f.ctx.document.getElementById=id=>id==='nav'?nav:null;
  f.run(stateCode.slice(a,b));
  f.run('renderNav()');
  assert.match(nav.innerHTML,/data-stage-nav="S02" disabled aria-disabled="true"/);
  f.engagement.answers.DF008.pop();f.engagement.answers.DF009.pop();
  f.run('renderNav()');
  assert.doesNotMatch(nav.innerHTML,/data-stage-nav="S02" disabled/);
});
// [AUNEA-UAT-PG01-DEPENDENCIES-023] END
