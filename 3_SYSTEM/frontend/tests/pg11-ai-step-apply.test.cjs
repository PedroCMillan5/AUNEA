// [AUNEA-UAT-PG11-AI-STEP-237] START — selective, human-gated AI step application.
// SOURCE: Simulator CANONICAL PG11; DEC-050/052/055. Synthetic drafts, no Ollama.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../pages/results.js'),'utf8');
const block=src.match(/\/\/ \[AUNEA-FE-PG11-AI-STEP-APPLY-230\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-AI-STEP-APPLY-230\] END/)?.[0];
if(!block)throw Error('Missing per-activity AI application contract');
function harness(){
 const notices=[],saves=[],changes=[];
 const p={status:'DRAFT',version:1,updatedAt:'',items:[
  {id:'I1',sourceStepId:'S1',transformation:'',problemResolved:'',
   futureActor:'Consultor ya definido',tool:'',inputs:'',outputs:'',
   automationAi:'',humanSupervision:'',controlsRisk:''},
  {id:'I2',sourceStepId:'S2',transformation:'Se mantiene',
   problemResolved:'Revisión manual',futureActor:'Equipo',tool:'ERP',
   inputs:'PDF',outputs:'Registro',automationAi:'',humanSupervision:'',controlsRisk:''}
 ]};
 const data={status:'DRAFT',model:'fake',items:[
  {source_step_id:'S1',transformation:'Se modifica',
   problem_resolved:'Eliminar doble entrada',future_actor:'No sustituir responsable',
   tool:'ERP',inputs:'Formulario',outputs:'Expediente',
   automation_ai:'',human_supervision:'Aprobación humana',
   controls_risk:'Registro de auditoría',source_refs:['S1'],rationale:'Acción propuesta: revisar datos. Resultado esperado: trazabilidad.'},
  {source_step_id:'S2',transformation:'Se automatiza',source_refs:['S2']}
 ],review:{status:'CHECKED',review_mode:'OLLAMA',issues:[],blocking_step_ids:[]}};
 const e={id:'E',tobeProposals:[p]},decisions={S1:{status:'ACCEPT',note:'Se acepta tras comprobar las fuentes y las restricciones.'}};
 const sandbox={
  String,Array,Object,JSON,Map,Set,console,
  state:{activePage:'tobe'},
  TOBE_TRANSFORMATIONS:['Se mantiene','Se modifica','Se elimina','Se automatiza',
    'Se asiste con IA','Requiere decisión humana','Se incorpora control'],
  __auneaAiPreview:new Map([['K',data]]),
  internalAiPilotKey:()=> 'K',
  internalAiSavedDraft:()=>data,
  tobeEditable:x=>x?.status==='DRAFT',
  tobeHumanReviewRecord:()=>({decisions}),
  latestTobe:()=>p,currentEng:()=>e,
  saveTobeFromDom:()=>true,
  saveState:label=>{saves.push(label);return true;},
  markDirty:label=>changes.push(label),
  render:()=>{},toast:label=>notices.push(label),
  now:()=> '2026-11-04T17:00:00+01:00'
 };
 vm.createContext(sandbox);vm.runInContext(block,sandbox);
 return {e,p,data,decisions,notices,saves,sandbox,
  check:id=>vm.runInContext('tobeAiStepApplicability(currentEng(),latestTobe(currentEng()),'+JSON.stringify(id)+')',sandbox),
  apply:id=>vm.runInContext('tobeApplyAiOnlyStep(currentEng(),'+JSON.stringify(id)+')',sandbox)};
}
test('a verified suggestion cannot be applied before consultant acceptance',()=>{
 const h=harness();delete h.decisions.S1;
 assert.match(h.check('S1'),/Acepta expresamente/);
 assert.equal(h.apply('S1'),false);
 assert.equal(h.saves.length,0);
});
test('accepted step updates only its own empty fields and never overwrites manual input',()=>{
 const h=harness(),untouched=JSON.stringify(h.p.items[1]);
 assert.equal(h.check('S1'),'');
 assert.equal(h.apply('S1'),true);
 assert.equal(h.p.items[0].transformation,'Se modifica');
 assert.equal(h.p.items[0].futureActor,'Consultor ya definido');
 assert.equal(h.p.items[0].controlsRisk,'Registro de auditoría');
 assert.equal(JSON.stringify(h.p.items[1]),untouched);
 assert.equal(h.saves.length,2);
 assert.match(h.notices.at(-1),/sólo en esta actividad/);
});
test('a blocking reviewer finding or rules-only review forbids step application',()=>{
 const h=harness();
 h.data.review.blocking_step_ids=['S1'];
 assert.match(h.check('S1'),/bloqueantes/);
 h.data.review.blocking_step_ids=[];
 h.data.review.review_mode='RULES_ONLY';
 assert.match(h.check('S1'),/reglas/);
});
test('a keep-state proposal with a concrete change cannot be applied automatically',()=>{
 const h=harness(),proposal=h.data.items[0];
 proposal.transformation='Se mantiene';
 proposal.rationale='Acción propuesta: automatizar la validación. Resultado esperado: rapidez.';
 assert.match(h.check('S1'),/contradicción/);
});
test('missing source step references and stale statuses refuse AI application',()=>{
 const h=harness();h.data.items[0].source_refs=['S2'];
 assert.match(h.check('S1'),/fuente/);
 h.data.items[0].source_refs=['S1'];h.p.status='REVIEWED';
 assert.match(h.check('S1'),/no permite edición/);
});
// [AUNEA-UAT-PG11-AI-STEP-237] END
