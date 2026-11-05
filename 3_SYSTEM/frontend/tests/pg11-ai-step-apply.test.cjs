// [AUNEA-UAT-PG11-AI-STEP-237] START — selective, human-gated IA-to-TO-BE.
// Uses synthetic records, never the current client data or Ollama.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../pages/results.js'),'utf8');
const diff=src.match(/\/\/ \[AUNEA-FE-PG11-AI-REVIEW-DIFF-260\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-AI-REVIEW-DIFF-260\] END/)?.[0];
const apply=src.match(/\/\/ \[AUNEA-FE-PG11-AI-STEP-APPLY-230\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-AI-STEP-APPLY-230\] END/)?.[0];
if(!diff||!apply)throw Error('Missing PG11 IA selection contracts');
function harness(){
 const notices=[],saves=[],changes=[];
 const p={status:'DRAFT',version:1,items:[
  {id:'I1',sourceStepId:'S1',transformation:'Se mantiene',problemResolved:'',
   futureActor:'ADMIN',tool:'',inputs:['PDF'],outputs:['PDF'],
   automationAi:'NO',humanSupervision:'',controlsRisk:''},
  {id:'I2',sourceStepId:'S2',transformation:'Se mantiene',futureActor:'ADMIN',
   problemResolved:'Conservación justificada',tool:'ERP',inputs:['PDF'],outputs:['RECORD']}
 ],aiDraft:{applyHistory:[]}};
 const ai={source_step_id:'S1',transformation:'Se modifica',
  problem_resolved:'Eliminar doble entrada',future_actor:'Administración',
  tool:'ERP',inputs:'PDF',outputs:'Registro estructurado',
  automation_ai:'',human_supervision:'Administración revisa excepciones',
  controls_risk:'Control de duplicados',source_refs:['S1'],
  rationale:'Acción propuesta: revisar entradas. Resultado esperado: trazabilidad.'};
 const data={items:[ai],review:{status:'CHECKED_WITH_NOTES',review_mode:'OLLAMA',
   issues:[],blocking_step_ids:[]}};
 const e={id:'TEST',tobeProposals:[p],snapshot:{step:'AS-IS intacto'}},
  decisions={S1:{status:'MODIFY',note:'Se usa como hipótesis con fuentes pendientes.'}};
 const opts={OS_ACTOR_ROLE:[{value:'ADMIN',label:'Administración'}],
  OS_TOOL_CATEGORY:[{value:'ERP',label:'ERP'}],
  OS_ARTIFACT_TYPE:[{value:'PDF',label:'PDF'},{value:'RECORD',label:'Registro estructurado'}]};
 let failSecond=false;
 const sandbox={String,Array,Object,JSON,Set,Map,console,
  state:{activePage:'tobe'},TOBE_TRANSFORMATIONS:['Se mantiene','Se modifica',
   'Se elimina','Se automatiza','Se asiste con IA','Requiere decisión humana','Se incorpora control'],
  tobeEditable:p=>p?.status==='DRAFT',tobeHumanReviewRecord:()=>({decisions}),
  internalAiSavedDraft:()=>data,internalAiPilotNarrative:()=>({action:'Revisar entradas'}),
  fieldOptions:id=>opts[id]||[],labelFrom:(id,val)=>opts[id]?.find(o=>o.value===val)?.label||'',
  tobeArtifactValues:value=>({resolved:Array.isArray(value)?value:[],unknown:[]}),
  tobeArtifactDisplay:value=>Array.isArray(value)?value.join(' · '):String(value),
  latestTobe:()=>p,currentEng:()=>e,
  saveTobeFromDom:()=>true,
  saveState:label=>{saves.push(label);return !(failSecond&&saves.length===2)},
  markDirty:label=>changes.push(label),render:()=>{},toast:label=>notices.push(label),
  now:()=> '2026-11-05T14:00:00+01:00',tobeCandidateFingerprint:()=> 'fingerprint'
 };
 vm.createContext(sandbox);vm.runInContext(diff+'\n'+apply,sandbox);
 return {e,p,data,ai,decisions,notices,saves,sandbox,
  setFailSecond:()=>{failSecond=true},
  preview:id=>sandbox.tobeAiReviewDiff(e,p,id),
  apply:(id,fields)=>sandbox.tobeApplyAiReviewedFields(e,id,fields)};
}
test('a proposal is not applied without a recorded human decision',()=>{
 const h=harness();delete h.decisions.S1;
 assert.match(h.preview('S1').issue,/decisión/);
 assert.equal(h.apply('S1',['tool']),false);
 assert.equal(h.saves.length,0);
});
test('MODIFY applies only selected fields and preserves existing manual data and AS-IS',()=>{
 const h=harness(),before=JSON.stringify(h.p.items[1]),asis=JSON.stringify(h.e.snapshot);
 const d=h.preview('S1');
 assert.equal(d.issue,'');
 assert.ok(d.fields.some(x=>x.key==='outputs'));
 assert.equal(h.apply('S1',['outputs','controlsRisk']),true);
 assert.deepEqual(JSON.parse(JSON.stringify(h.p.items[0].outputs)),['RECORD']);
 assert.equal(h.p.items[0].controlsRisk,'Control de duplicados');
 assert.equal(h.p.items[0].transformation,'Se mantiene');
 assert.equal(h.p.items[0].futureActor,'ADMIN');
 assert.equal(h.p.items[0].automationAi,'NO');
 assert.equal(JSON.stringify(h.p.items[1]),before);
 assert.equal(JSON.stringify(h.e.snapshot),asis);
 assert.equal(h.p.aiDraft.applyHistory[0].decision,'MODIFY');
 assert.equal(h.p.aiDraft.applyHistory[0].fields.length,2);
 assert.equal(h.saves.length,2);
});
test('blocking reviewer findings forbid ACCEPT but allow explicitly reviewed MODIFY',()=>{
 const h=harness();h.data.review.review_mode='RULES_ONLY';
 h.data.review.blocking_step_ids=['S1'];
 h.decisions.S1.status='ACCEPT';
 assert.match(h.preview('S1').issue,/bloqueos/);
 h.decisions.S1.status='MODIFY';
 assert.equal(h.preview('S1').issue,'');
 assert.ok(h.preview('S1').warnings.length>0);
});
test('contradictory Se mantiene from the IA is never copied automatically',()=>{
 const h=harness();
 h.ai.transformation='Se mantiene';
 h.ai.rationale='Acción propuesta: implementar un registro automático.';
 assert.ok(!h.preview('S1').fields.some(x=>x.key==='transformation'));
});
test('unlinked sources, closed drafts and unselected fields refuse application',()=>{
 const h=harness();
 h.ai.source_refs=['S2'];
 assert.match(h.preview('S1').issue,/trazable/);
 h.ai.source_refs=['S1'];
 h.p.status='REVIEWED';
 assert.match(h.preview('S1').issue,/decisión|borrador|vigente|DRAFT|editar/i);
 h.p.status='DRAFT';
 assert.equal(h.apply('S1',[]),false);
 assert.equal(h.saves.length,0);
});
test('failed second save restores previous item and IA audit metadata in memory',()=>{
 const h=harness(),before=JSON.stringify(h.p.items[0]);
 h.setFailSecond();
 assert.equal(h.apply('S1',['outputs']),false);
 assert.equal(JSON.stringify(h.p.items[0]),before);
 assert.equal(h.p.aiDraft.applyHistory.length,0);
});
test('PG11 retains one canonical editor beside IA context',()=>{
 const fn=src.match(/function tobeWithAiHint\(e,p,item,key,html\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(fn);
 const ctx={attr:String,tobeAiInlineHint:()=>'<aside class="tobe-ai-inline">IA</aside>'};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 const html=ctx.tobeWithAiHint({},null,{isAddition:false},'outputs',
   '<div class="field"><input data-tobe-field="outputs"></div>');
 assert.equal((html.match(/data-tobe-field="outputs"/g)||[]).length,1);
 assert.match(html,/tobe-ai-field-row/);
 assert.match(html,/tobe-ai-field-control/);
});
test('PG11 records KEEP without altering values or AS-IS',()=>{
 const fn=src.match(/function tobeKeepAiReviewedField\(e,sourceId,key\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(fn);
 const item={sourceStepId:'S1',outputs:['PDF']},p={items:[item],aiDraft:{applyHistory:[]}},
   e={tobeProposals:[p],snapshot:{original:true}};
 let saves=0;
 const ctx={String,Array,JSON,state:{activePage:'tobe'},latestTobe:x=>x.tobeProposals[0],
  tobeAiReviewDiff:()=>({issue:'',allFields:[{key:'outputs'}],decision:'MODIFY'}),
  saveTobeFromDom:()=>true,saveState:()=>{saves++;return true},currentEng:()=>e,
  tobeCandidateFingerprint:()=> 'F',now:()=> '2026-11-05',markDirty:()=>{},
  toast:()=>{},render:()=>{}};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 assert.equal(ctx.tobeKeepAiReviewedField(e,'S1','outputs'),true);
 assert.deepEqual(item.outputs,['PDF']);
 assert.equal(e.snapshot.original,true);
 assert.equal(p.aiDraft.applyHistory[0].action,'KEEP');
 assert.equal(p.aiDraft.applyHistory[0].fields[0],'outputs');
 assert.equal(saves,2);
});
test('PG11 IA constraints remain unconfirmed client information',()=>{
 const fn=src.match(/function tobeAiOperationalContextHtml\(e,item\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(fn);
 const ctx={String,Array,internalAiSavedDraft:()=>({items:[{
  source_step_id:'S1',limitations:'Integración pendiente de comprobar',
  source_refs:['S1']}]}),internalAiReadableRefs:()=> 'Recibir factura',
  esc:String,attr:String};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 const html=ctx.tobeAiOperationalContextHtml({},{sourceStepId:'S1',isAddition:false});
 assert.match(html,/Integración pendiente de comprobar/);
 assert.match(html,/no equivalen a restricciones declaradas por el cliente/);
 assert.match(html,/Recibir factura/);
});
// [AUNEA-UAT-PG11-AI-STEP-237] END
