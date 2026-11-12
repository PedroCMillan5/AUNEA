// [AUNEA-UAT-PG11-ORIGINAL-ORACLES-296] START
// PURPOSE: Execute source facts and future topology against the three repository JSONs.
// SOURCE: Original synthetic UAT fixtures at the tested commit; DEC-050/052.
// No claim of a real client snapshot, real Ollama output or human acceptance.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const src=require('./pg11-source.cjs')(),schema=JSON.parse(read('data/diagnostic-master.min.json'));
const block=id=>src.match(new RegExp('// \\['+id+'\\] START[\\s\\S]*?// \\['+id+'\\] END'))[0];
for(const name of ['invoices','unified-requests','email-orders'])test('PG11 original oracle: '+name,()=>{
 const fixture=JSON.parse(read('uat/cases/'+name+'.json'));
 const ctx={console,schema,state:{companies:[],contacts:[],opportunities:[],interactions:[],engagements:[]},
  postBind(){},document:{getElementById(){return null},querySelectorAll(){return []}},
  painForFriction:type=>schema.friction_pain_map.find(x=>x.Friction_Type_ID===type)?.Pain_ID||null,
  companyById:()=>null,contactById:()=>null,toast(){},render(){},markDirty(){},
  persistRecoverySnapshot:()=>true,confirm:()=>true};
 vm.createContext(ctx);vm.runInContext(read('uat/endtoend-cases.js'),ctx);
 const e=ctx.uat3Seed(fixture).engagement;
 const snapshot={version:1,processSteps:structuredClone(e.processSteps)};
 const p={version:1,status:'DRAFT',sourceSnapshotVersion:1,items:e.processSteps.map((s,i)=>({
  id:'T'+i,sourceStepId:s.id,sourceStepName:s.step_name,transformation:'Se mantiene'}))};
 const before=JSON.stringify(snapshot);
 Object.assign(ctx,{tobeSourceSteps:()=>snapshot.processSteps,confirmedSnapshot:()=>snapshot,
  latestTobe:()=>p,esc:String,labelFrom:(set,value)=>schema.option_sets[set]?.options.find(x=>x.value===value)?.label||value,
  processDecisionStep:s=>s.step_type==='ST04'});
 vm.runInContext(block('AUNEA-FE-PG11-FUTURE-FLOW-228')+'\n'+block('AUNEA-FE-PG11-ORIGINAL-FACTS-243'),ctx);
 const future=ctx.tobeFutureSteps(e,p);
 assert.equal(future.length,fixture.steps.length);
 for(let i=0;i<fixture.steps.length;i++){
  const expected=fixture.steps[i],source=snapshot.processSteps[i],actual=future[i];
  const html=ctx.tobeOriginalStepFacts(e,p.items[i]);
  for(const [key,label] of [['active','Trabajo activo declarado'],['wait','Espera declarada'],['rework','Retrabajo declarado']])
   assert.ok(html.includes('<dt>'+label+'</dt><dd>'+expected[key]+' min</dd>'),name+' /steps/'+i+'/'+key);
  assert.equal(actual.id,source.id);
  assert.equal(actual.normal_next_step,source.normal_next_step);
  if(expected.type==='ST04'){
   assert.equal(actual.normal_next_step,snapshot.processSteps[expected.yes].id);
   assert.equal(actual.exception_path.destination_step,snapshot.processSteps[expected.no].id);
  }
 }
 assert.equal(JSON.stringify(snapshot),before,'AS-IS snapshot remains immutable');
});
// [AUNEA-UAT-PG11-ORIGINAL-ORACLES-296] END
