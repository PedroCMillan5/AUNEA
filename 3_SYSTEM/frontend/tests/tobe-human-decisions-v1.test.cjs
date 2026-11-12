// [AUNEA-UAT-PG11-HUMAN-DECISIONS-226] START — unified PG11 decision UAT.
// SOURCE: CANONICAL PG11, DEC-050/052/055. No Ollama, synthetic data only.
const test=require('node:test'),assert=require('node:assert/strict'),
  fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../pages/results.js'),'utf8');
function pick(name){
 const start=source.indexOf('function '+name+'('),
   end=source.indexOf('\n}\n',start);
 assert.ok(start>=0&&end>start,'missing '+name);
 return source.slice(start,end+2);
}
test('03.2 presents both IA analyses but no longer asks for a whole-proposal vote',()=>{
 const inspector=pick('tobeInspectorHtml');
 assert.match(inspector,/tobeGlobalLinkedStepHtml\(e,p,item\)/);
 assert.match(inspector,/tobeAiAdviceHtml\(e,item,false\)/);
 assert.match(inspector,/Aquí sólo se analizan opciones/);
 assert.doesNotMatch(inspector,/tobeHumanReviewHtml\(e,item,false\)/);
 assert.doesNotMatch(inspector,/data-tobe-human-decision/);
});
test('legacy ACCEPT MODIFY DISCARD remains versioned evidence, never an active gate',()=>{
 const inspector=pick('tobeInspectorHtml');
 const readiness=pick('tobeReviewReadiness');
 assert.match(inspector,/tobe-legacy-review/);
 assert.match(inspector,/historial anterior|Historial de revisión anterior/i);
 assert.doesNotMatch(readiness,/if\(!human\)|decision\.status===|Falta la revisión humana de las propuestas IA/);
 assert.match(readiness,/tobeActivityDesignIssue|Completa herramienta, entradas, salidas y controles/);
});
test('a configured activity is counted from the actual TO-BE, not old IA approval',()=>{
 const names=['Se mantiene','Se modifica','Se elimina','Se automatiza',
   'Se asiste con IA','Requiere decisión humana','Se incorpora control'];
 const context={TOBE_TRANSFORMATIONS:names,
  tobeMeaningfulRationale:x=>!!String(x||'').trim()&&String(x)!=='NO',
  tobeArtifactValues:x=>({resolved:x||[]})};
 vm.createContext(context);
 vm.runInContext(pick('tobeActivityDesignIssue')+'\n'+pick('tobeActivityDecisionRecorded'),context);
 const item={sourceStepId:'S1',sourceStepName:'Recibir factura',
  transformation:'Se modifica',problemResolved:'Trazabilidad de recepción',
  futureActor:'Administración',tool:'Correo',inputs:['PDF'],outputs:['RECORD'],
  controlsRisk:'Conservar la referencia y verificar duplicados'};
 assert.equal(context.tobeActivityDecisionRecorded(null,{},item),true);
 item.controlsRisk='';
 assert.equal(context.tobeActivityDecisionRecorded(null,{},item),false);
 item.controlsRisk='Conservar la referencia y verificar duplicados';
 item.transformation='Se mantiene';
 assert.equal(context.tobeActivityDecisionRecorded(null,{},item),true);
});
test('03.3 has one editable field owner and three contextual actions',()=>{
 const inspector=pick('tobeInspectorHtml');
 const actions=pick('tobeAiRowActions');
 const click=source.slice(source.indexOf("// [AUNEA-FE-PG11-AI-STEP-APPLY-231] START"),
   source.indexOf("// [AUNEA-FE-PG11-AI-STEP-APPLY-231] END"));
 assert.match(inspector,/tobeDecisionSourceSummaryHtml\(e,p,item\)/);
 assert.match(actions,/data-tobe-ai-use-field/);
 assert.match(actions,/data-tobe-ai-keep-field/);
 assert.match(actions,/data-tobe-ai-edit-field/);
 assert.match(click,/tobeOpenAlternative\(e,/,'AI apply opens preview, not direct write');
 assert.match(click,/tobeKeepAiReviewedField/);
 assert.doesNotMatch(inspector,/tobeHumanReviewHtml/);
});
test('final review is explicit and only after operational completeness checks',()=>{
 const readiness=pick('tobeReviewReadiness');
 const advance=pick('advanceTobeStatus');
 assert.match(readiness,/TOBE_TRANSFORMATIONS/);
 assert.match(readiness,/tobeFlowIntegrity/);
 assert.match(readiness,/tobeCoherenceFindings/);
 assert.match(advance,/tobeReviewReadiness\(e,p\)/);
 assert.doesNotMatch(readiness,/Falta la revisión humana de las propuestas IA/);
});
// [AUNEA-UAT-PG11-HUMAN-DECISIONS-226] END
