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
// [AUNEA-UAT-PG01-DEPENDENCIES-023] END
