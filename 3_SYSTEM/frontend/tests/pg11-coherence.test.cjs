// [AUNEA-UAT-PG11-COHERENCE-241] START — deterministic semantic review independent of Ollama.
// SOURCE: PG11 CANONICAL; DEC-034/050/052/055. No invented future metrics.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const src=require('./pg11-source.cjs')();
const block=src.match(/\/\/ \[AUNEA-FE-PG11-COHERENCE-239\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-COHERENCE-239\] END/)?.[0];
if(!block)throw Error('Missing deterministic coherence block');
function harness(item){
 const p={status:'DRAFT',version:1,items:[{id:'I1',sourceStepId:'S1',
   sourceStepName:'Paso original',problemResolved:'Fricción documentada',
   transformation:'Se modifica',futureActor:'Equipo',automationAi:'',
   humanSupervision:'',controlsRisk:'',futureTime:'',futureTimeAssumption:'',...item}]};
 const sandbox={String,Array,JSON,console,
   tobeAddedSteps:p=>p?.flow?.addedSteps||[],
   tobeFlowItemId:x=>x.isAddition?x.id:x.sourceStepId,
   tobeFlowItemName:x=>x.isAddition?x.stepName:x.sourceStepName,
   tobeFlowIntegrity:()=>null,
   tobeHumanReviewRecord:()=>null,attr:x=>String(x),esc:x=>String(x)
 };
 vm.createContext(sandbox);
 vm.runInContext(src.match(/\/\/ \[AUNEA-FE-PG11-TRANSFORMATION-UX-258\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-TRANSFORMATION-UX-258\] END/)?.[0]||'',sandbox);
 vm.runInContext(src.match(/const TOBE_TRANSFORMATIONS=Object\.freeze\([^\n]+/)?.[0]||'',sandbox);
 vm.runInContext(block,sandbox);
 return {p,issues:()=>JSON.parse(JSON.stringify(
   vm.runInContext('tobeCoherenceFindings(null,p)',Object.assign(sandbox,{p}))))};
}
test('automation and AI assistance require operational definition and human supervision',()=>{
 const h=harness({transformation:'Se automatiza'});
 assert.ok(h.issues().filter(x=>x.severity==='BLOCKING').length>=2);
 h.p.items[0].automationAi='Sistema ejecuta reglas sin IA';
 h.p.items[0].humanSupervision='Supervisor revisa todas las excepciones';
 assert.equal(h.issues().filter(x=>x.severity==='BLOCKING').length,0);
});
test('a claimed unchanged step cannot secretly introduce automation',()=>{
 const h=harness({transformation:'Se mantiene',automationAi:'Automatizar el registro'});
 assert.match(h.issues()[0].message,/contradice/);
});
test('controls and human decisions require their own named safeguards',()=>{
 const h=harness({transformation:'Se incorpora control'});
 assert.match(h.issues()[0].message,/control que se incorpora/);
 h.p.items[0].controlsRisk='Registro de acceso y revisión de errores';
 h.p.items[0].transformation='Requiere decisión humana';
 assert.match(h.issues()[0].message,/humana/);
});
test('future time with a rationale is still labeled as an assumption, not measurement',()=>{
 const h=harness({futureTime:'20 min',futureTimeAssumption:'Hipótesis sujeta a validación'});
 assert.equal(h.issues()[0].severity,'WARNING');
 assert.match(h.issues()[0].message,/supuesto/);
});
test('new steps may not be classified as unchanged or deleted',()=>{
 const h=harness({});
 h.p.flow={addedSteps:[{id:'ADD-1',isAddition:true,stepName:'Nuevo control',
   transformation:'Se mantiene',futureActor:'Analista',automationAi:'',
   humanSupervision:'',controlsRisk:'',futureTime:''}]};
 assert.match(h.issues().find(x=>x.stepId==='ADD-1').message,/actividad nueva/);
});
// [AUNEA-UAT-PG11-COHERENCE-241] END
