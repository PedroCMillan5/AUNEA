// [AUNEA-UAT-DIAG-REUSE-133] START — Direct reuse contract regression (isolated)
// SOURCE: Diagnostic Master v1.2; DEC-050/072; canonical no-reask.js, not copied helper logic.
// SCOPE: 20 direct reusedValue branches; no UI/backend/browser or 30 alternate route claims.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../domain/no-reask.js'),'utf8');
const slice=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a+' not found');return src.slice(i,j)};
const arr=v=>Array.isArray(v)?v:v==null||v===''?[]:[v];
const unique=v=>[...new Set(v.filter(x=>x!==undefined&&x!==null&&x!=='') )];
const ctx={
 activeSteps:e=>(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
 activeFrictions:e=>(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),
 companyById:()=>({name:'Empresa',sector:'M',country:'ES'}),
 canonicalValueFromLabel:(_,v)=>v,unique,normalizeArray:arr,
 processDataSources:steps=>unique(steps.flatMap(s=>arr(s.inputs).concat(arr(s.outputs).filter(x=>['RECORD','MASTER_DATA','API'].includes(x))))),
 processDocumentArtifacts:steps=>unique(steps.flatMap(s=>arr(s.inputs).concat(arr(s.outputs))).filter(x=>['FORM','EMAIL','TEXT','PDF','DOC','SHEET','IMAGE'].includes(x))),
 derivedExceptionReview:steps=>steps.filter(s=>s.exception_path).map(s=>s.step_name+' ex'),
 derivedApprovalReview:steps=>steps.filter(s=>s.step_type==='ST05').map(s=>s.step_name+' approval'),
 economicTimeRequest:()=>({fingerprint:'test'}),
 canonicalMissingRequired:()=>['DF007'],
 labelFrom:(_,v)=>v||'',valuePresent:v=>Array.isArray(v)?v.length>0:v!==undefined&&v!==null&&v!=='',
 schema:{fields:[{Field_ID:'DF007',Pregunta_o_etiqueta_ES:'Autoridad'}]}
};
vm.createContext(ctx);
vm.runInContext(
 slice('function derivedRiskIrreversibility(e){','function reusedValue(fid,e){')+
 slice('function reusedValue(fid,e){','const RISK_DISCOVERY_FIELDS='),ctx
);
function fixture(){const e={
 companyId:'C',answers:{},contactIds:['contact1'],
 processSteps:[
 {id:'P1',step_name:'Paso 1',actor:'ADMIN',tool:'EMAIL',inputs:['PDF'],outputs:['RECORD'],communication_channels:['EMAIL'],manual_actions:['SEARCH'],exception_path:{destination_step:'P2'},active_time:{value:8}},
 {id:'P2',step_name:'Paso 2',actor:'MANAGER',tool:'ERP',inputs:['RECORD'],outputs:['DOC'],communication_channels:['TEAMS'],step_type:'ST05',active_time:{value:5}}
 ],
 frictions:[{friction_type:'P09',affected_steps:['P1'],evidence_type:'EV07'}],
 risks:[{reversibility:'HARD',description:'Riesgo 1'}],economicInputs:[{evidence_type:'EV04'}],
 confirmedAsIs:true
 };e._sessionTimeProjection={requestKey:JSON.stringify({fingerprint:'test'}),output:{active_minutes_per_case:13,rework_minutes_per_case:2}};return e}
const cases=[
 ['DF001','Empresa'],['DF002','M'],['DF005','ES'],['DF006','contact1'],
 ['DF017',['ADMIN','MANAGER']],['DF046',['EMAIL','ERP']],['DF047',['PDF','RECORD']],
 ['DF049',['PDF','DOC']],['DF050',['EMAIL','TEAMS']],['DF053',['P1']],
 ['DF057','Se deriva de la fricción registrada; no se pregunta al cliente.'],
 ['DF066',['Paso 1 ex']],['DF067',['Paso 2 approval']],['DF074','Riesgo 1 — HARD'],
 ['DF078',{value:13,unit:'min',period:'case'}],['DF079',{value:2,unit:'min',period:'case'}],
 ['DF085',['EV04']],['DF093','YES'],['DF094',['Autoridad']],
 ['DF095',['Evidencia de P09','Completar Autoridad']]
];
for(const [id,expected] of cases)test(id+' derives its expected value from source',()=>{
 assert.equal(JSON.stringify(ctx.reusedValue(id,fixture())),JSON.stringify(expected));
});
test('stale time projection returns undefined rather than a browser-side sum',()=>{
 const e=fixture();e._sessionTimeProjection.requestKey='STALE';
 assert.equal(ctx.reusedValue('DF078',e),undefined);
 assert.equal(ctx.reusedValue('DF079',e),undefined);
});
test('risk with incomplete reversibility makes DF074 unresolved',()=>{
 const e=fixture();e.risks.push({description:'Pendiente',reversibility:''});
 assert.equal(ctx.reusedValue('DF074',e),undefined);
});
test('derived source wins over prior manual DF017 when effective value is evaluated',()=>{
 const e=fixture();e.answers.DF017=['LEGACY'];
 assert.equal(JSON.stringify(ctx.effectiveValue({Field_ID:'DF017',Ask_Mode:'PREFILL_CONFIRM'},e)),JSON.stringify(['ADMIN','MANAGER']));
});
test('derived confirmation fingerprint becomes stale after source change',()=>{
 const e=fixture(),f={Field_ID:'DF050'},initial=ctx.reusedValue('DF050',e);
 e.answerDetails={DF050__derived_confirmation:{fingerprint:JSON.stringify(initial)}};
 const code=slice('function derivedFingerprint(v){','function confirmDerivedValue(fid){');
 vm.runInContext(code,ctx);
 assert.equal(ctx.isDerivedConfirmed(f,e),true);
 e.processSteps[1].communication_channels=['PHONE'];
 assert.equal(ctx.isDerivedConfirmed(f,e),false);
});
// [AUNEA-UAT-DIAG-REUSE-133] END
