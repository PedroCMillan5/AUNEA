'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const flow=fs.readFileSync(path.join(root,'pages/tobe-flow.js'),'utf8');
const workspace=fs.readFileSync(path.join(root,'pages/tobe.js'),'utf8');

function extract(source,start,end,exportName,context){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Missing governed source block: '+start);
  return vm.runInNewContext(source.slice(a,b)+';'+exportName,context);
}

const answers=Object.freeze({
  DF075:['FINAL_DECISION','FINANCIAL_ACTION','DELETE'],
  DF087:['HUMAN_DECISION','APPROVAL'],
  DF088:['FINAL_DECISION','FINANCIAL_ACTION','DELETE'],
  DF089:['KEEP_EXISTING','CRM_NATIVE'],
  DF090:['RBAC','AUDIT_LOG','MFA']
});
const source=Object.freeze({id:'S4',step_type:'ST05',tool:'Email',step_name:'Aprobar factura'});
const design=Object.freeze({
  sourceStepId:'S4',transformation:'Se modifica',futureActor:'Manager / dirección',
  tool:'Email',
  automationAi:'Registrar estado y enviar avisos mediante reglas. La aprobación seguirá siendo humana.',
  humanSupervision:'El responsable autorizado aprobará o rechazará las facturas.',
  controlsRisk:'Registrar responsable, resultado y fecha.'
});
const assess=extract(flow,
  'function tobeConstraintAssessments(e,p,item,sourceStep){',
  '// [AUNEA-FE-PG11-CONSTRAINT-ASSESSMENT-382] END',
  'tobeConstraintAssessments',{
    tobeProposalSnapshot:(_,p)=>({answers:p.answers}),
    tobeProposalSourceSteps:()=>[source],
    tobeFutureCatalogValue:(_,value)=>value
  });
const check=(item=design,selection=answers,original=source)=>
  Array.from(assess({}, {answers:selection},item,original));

test('PG11: invoice approval keeps human decisions and leaves platform/security unverified',()=>{
  const findings=check();
  assert.deepEqual(findings.map(x=>x.code+':'+x.severity),[
    'HUMAN_APPROVAL:COMPATIBLE','PLATFORM_COMPATIBILITY:REVIEW','SECURITY_EVIDENCE:REVIEW'
  ]);
  assert.ok(findings.every(x=>/DF0/.test(x.message)));
});

test('PG11: explicit automatic financial approval is blocking',()=>{
  const findings=check({...design,automationAi:'El sistema aprobará automáticamente las facturas.'});
  assert.ok(findings.some(x=>x.code==='HUMAN_APPROVAL'&&x.severity==='BLOCK'));
});

test('PG11: explicit negation of automatic approval is not a false conflict',()=>{
  const findings=check({...design,automationAi:'No se aprobará automáticamente ninguna factura.'});
  assert.equal(findings.some(x=>x.severity==='BLOCK'),false);
});

test('PG11: removing a confirmed human-approval step is blocking',()=>{
  const findings=check({...design,transformation:'Se elimina'});
  assert.ok(findings.some(x=>x.code==='HUMAN_APPROVAL'&&x.severity==='BLOCK'));
});

test('PG11: missing human decision owner remains pending, not compatible',()=>{
  const findings=check({...design,humanSupervision:''});
  assert.ok(findings.some(x=>x.code==='HUMAN_APPROVAL'&&x.severity==='REVIEW'));
});

test('PG11: no unsupported restrictions are fabricated for absent questionnaire responses',()=>{
  assert.deepEqual(check(design,{}),[]);
});

test('PG11: changing tools against an explicit keep-existing preference needs verification',()=>{
  const findings=check({...design,tool:'Otra herramienta'});
  assert.ok(findings.some(x=>x.code==='PLATFORM_COMPATIBILITY'&&x.severity==='REVIEW'));
});

test('PG11: retaining tools without an automation claim can be compatible; security still pending',()=>{
  const findings=check({...design,automationAi:''});
  assert.ok(findings.some(x=>x.code==='PLATFORM_COMPATIBILITY'&&x.severity==='COMPATIBLE'));
  assert.ok(findings.some(x=>x.code==='SECURITY_EVIDENCE'&&x.severity==='REVIEW'));
});

test('PG11: shared global readiness maps explicit contradiction to blocking and skips compatible',()=>{
  const findings=[
    {severity:'COMPATIBLE',message:'compliant',related:[]},
    {severity:'REVIEW',message:'pending evidence',related:[]},
    {severity:'BLOCK',message:'automatic approval',related:[]}
  ];
  const scan=extract(workspace,'function tobeCoherenceFindings(e,p){',
    '// [AUNEA-FE-PG11-GLOBAL-SCAN-280] START',
    'tobeCoherenceFindings',{
      tobeAddedSteps:()=>[],tobeFlowItemId:()=> 'S4',tobeFlowItemName:()=> 'Aprobar factura',
      tobeProposalSnapshot:()=>({answers}),
      tobeOptimizationFindings:()=>findings,
      TOBE_TRANSFORMATIONS:['Se modifica'],
      tobeMeaningfulRationale:()=>true,
      tobeTransformationRationaleLabel:()=> 'Motivo'
    });
  const output=Array.from(scan({},{items:[{...design}]}));
  assert.deepEqual(output.map(x=>x.severity),['WARNING','BLOCKING']);
});

test('PG11: 03.3 shows compatible and pending statuses separately',()=>{
  const findings=[
    {severity:'COMPATIBLE',code:'HUMAN_APPROVAL',message:'DF075 compatible',related:[]},
    {severity:'REVIEW',code:'PLATFORM_COMPATIBILITY',message:'DF089 pendiente',related:[]},
    {severity:'REVIEW',code:'SECURITY_EVIDENCE',message:'DF090 pendiente',related:[]}
  ];
  const render=extract(flow,'function tobeOptimizationPanelHtml(e,p,item){',
    '// [AUNEA-FE-PG11-OPTIMIZATION-CHECK-313] END',
    'tobeOptimizationPanelHtml',{
      tobeOptimizationFindings:()=>findings,
      tobeFlowItemId:()=> 'S4',
      tobeFutureSteps:()=>[{id:'S4',step_name:'Aprobar factura',normal_next_step:'__END__'}],
      tobeFlowItemName:()=> 'Aprobar factura',
      tobeFlowIntegrity:()=>null,
      auneaUiDisclosureStart:()=>'<section>',auneaUiDisclosureEnd:()=>'</section>',
      auneaUiDisclosureOpen:()=>true,
      esc:x=>String(x),attr:x=>String(x),
      tobeEditable:()=>true
    });
  const html=render({}, {items:[design]},design);
  assert.match(html,/2 observaciones pendientes/);
  assert.match(html,/1 compatible/);
  assert.match(html,/Compatible/);
  assert.match(html,/Pendiente/);
});
