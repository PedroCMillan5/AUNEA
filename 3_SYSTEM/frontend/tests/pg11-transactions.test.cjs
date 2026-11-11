// [AUNEA-UAT-PG11-TRANSACTION-338] START — two generic journeys and failure recovery.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
const block=id=>src.match(new RegExp('// \\['+id+'\\] START[\\s\\S]*?// \\['+id+'\\] END'))[0];
for(const name of ['invoice','logistics'])test('PG11 source → backend rules → projection → confirm → reload → undo: '+name,()=>{
 const generated=spawnSync(process.env.PYTHON||'python',['-c',`import json\nfrom tests.test_tobe_optimization import source\nfrom aunea_backend.tobe_optimization import activity_alternatives\nr=source('${name}')\nprint(json.dumps(dict(steps=r.engagement.questionnaire_answers['_process_steps'],result=activity_alternatives(r,'P1'))))`],{
   cwd:path.resolve(root,'../backend'),encoding:'utf8',env:{...process.env,PYTHONPATH:[path.resolve(root,'../backend'),process.env.PYTHONPATH].filter(Boolean).join(path.delimiter)}});
 assert.equal(generated.status,0,generated.stderr);
 const {steps,result}=JSON.parse(generated.stdout),snapshot={version:1,processSteps:steps};
 const e={id:name,confirmedSnapshots:[snapshot],tobeProposals:[{version:1,status:'DRAFT',sourceSnapshotVersion:1,
   items:steps.map((s,i)=>({id:'T'+i,sourceStepId:s.id,sourceStepName:s.step_name,transformation:'Se mantiene',futureActor:s.actor,tool:s.tool,inputs:s.inputs,outputs:s.outputs,problemResolved:'Conservar la función confirmada'}))}]};
 let disk='',fail=false;
 const ctx={console,JSON,Object,Array,String,Map,Set,TOBE_TRANSFORMATIONS:['Se mantiene','Se modifica','Se incorpora control','Se automatiza','Se elimina','Se asiste con IA','Requiere decisión humana'],
   latestTobe:e=>e.tobeProposals.at(-1),confirmedSnapshot:()=>snapshot,tobeEditable:p=>p.status==='DRAFT',
   processDecisionStep:s=>s.step_type==='ST04',now:()=>new Date().toISOString(),markDirty(){},
   saveState:()=>{if(fail)return false;disk=JSON.stringify(e);return true;}};
 vm.createContext(ctx);vm.runInContext(block('AUNEA-FE-PG11-FUTURE-FLOW-228')+'\n'+block('AUNEA-FE-PG11-TRANSACTION-332')+'\n'+block('AUNEA-FE-PG11-INTEGRATION-PROJECTION-341'),ctx);
 let p=ctx.latestTobe(e);p.flow=ctx.tobeFlowOwner(e,p);const immutable=JSON.stringify(snapshot);
 const preview=candidate=>({engagementId:e.id,version:p.version,before:ctx.tobeDesignState(p),candidate,...ctx.tobeProjectAlternative(e,p,candidate)});
 const structural=result.candidates.find(c=>c.operations.length),before=JSON.stringify(p),temporary=preview(structural);
 assert.equal(JSON.stringify(p),before,'selection and cancellation leave live DRAFT intact');
 assert.equal(temporary.projected.flow.routes.P1.normal.startsWith('TOBE-ADD-'),true);
 assert.equal(temporary.projected.flow.routes.P2.normal,'P3');assert.equal(temporary.projected.flow.routes.P2.exception,'P4');
 fail=true;assert.throws(()=>ctx.tobeCommitAlternative(e,temporary),/No se guardó/);assert.equal(JSON.stringify(p),before);fail=false;
 assert.equal(ctx.tobeCommitAlternative(e,preview(structural)),true);
 e.tobeProposals=JSON.parse(disk).tobeProposals;p=ctx.latestTobe(e);
 assert.equal(ctx.tobeFutureSteps(e,p).length,5);assert.equal(ctx.tobeFlowIntegrity(e,p),null);
 const exported=ctx.tobeIntegrationProjection(e,p);assert.equal(exported.items.length,5);assert.equal(exported.flow.activities.length,5);assert.equal(exported.flow.activities.find(x=>x.id==='P2').exception,'P4');
 assert.ok(exported.items.some(x=>x.isAddition));
 p.items[3].problemResolved='Decisión posterior independiente';
 ctx.tobeUndoAlternative(e);assert.equal(ctx.tobeFutureSteps(e,p).length,4);
 assert.equal(p.items[3].problemResolved,'Decisión posterior independiente');
 const operational=result.candidates.find(c=>c.id.startsWith('RULED-TRANSFER'));
 assert.equal(ctx.tobeCommitAlternative(e,preview(operational)),true);
 p.items[0].controlsRisk='Cambio manual posterior';
 assert.throws(()=>ctx.tobeUndoAlternative(e),/modificado después/);
 assert.equal(p.items[0].controlsRisk,'Cambio manual posterior');
 const stale=preview(result.candidates[0]);p.items[3].tool='Otro';
 assert.throws(()=>ctx.tobeCommitAlternative(e,stale),/borrador o el AS-IS cambió/);
 assert.equal(JSON.stringify(snapshot),immutable,'confirmed AS-IS is immutable throughout');
});
// [AUNEA-UAT-PG11-TRANSACTION-338] END
