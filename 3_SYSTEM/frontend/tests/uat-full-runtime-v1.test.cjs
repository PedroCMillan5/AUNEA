// [AUNEA-UAT-RUNTIME-125] START — Executable single end-to-end UAT.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),manifest=JSON.parse(read('module-manifest.json')).modules;
function buildRuntime(storage){
 const errors=[],virtualConsole=new VirtualConsole();
 virtualConsole.on('jsdomError',e=>errors.push(String(e.message||e)));
 const dom=new JSDOM(html,{url:'http://localhost:5500/index.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window,context=dom.getInternalVMContext(),run=script=>vm.runInContext(script,context);
 w.console={...console,error:(...args)=>errors.push(args.map(String).join(' '))};
 w.fetch=async url=>{
   const u=new URL(String(url),'http://localhost:5500/index.html');
   if(u.pathname.endsWith('/health'))return {ok:false,status:503,json:async()=>({})};
   if(u.pathname.endsWith('/data/diagnostic-master.min.json'))return {ok:true,json:async()=>JSON.parse(read('data/diagnostic-master.min.json'))};
   if(u.pathname.endsWith('/uat/cases/invoices.json'))return {ok:true,status:200,json:async()=>JSON.parse(read('uat/cases/invoices.json'))};
   throw Error('Unexpected UAT fetch '+u.href);
 };
 w.requestAnimationFrame=cb=>{cb();return 1};
 if(storage)w.localStorage.setItem('aunea_internal_v1',storage);
 for(const m of manifest.filter(m=>m.path!=='boot.js'))run(read(m.path)+'\n//# sourceURL='+m.path);
 run('schema=applyDiagnosticMasterV12('+JSON.stringify(JSON.parse(read('data/diagnostic-master.min.json')))+');');
 return {w,dom,errors,run};
}
test('single UAT loads complete, traverses PG01-PG09 and hands off to internal work',async()=>{
 const {w,dom,errors,run}=buildRuntime();
 run("state.activePage='uat';render()");
 const button=w.document.getElementById('loadSingleUat');
 assert.ok(button,'single UAT loader must be visible');
 await button.onclick();
 const rows=run("state.engagements.filter(e=>e.id.startsWith('UAT3-CASE-'))");
 assert.equal(rows.length,1,'exactly one UAT study must exist');
 const e=rows[0];
 assert.equal(e.processSteps.length,6);assert.equal(e.frictions.length,3);assert.equal(e.risks.length,2);
 assert.equal(run('currentEng().confirmedAsIs'),false);
 assert.equal(run('hasConfirmedSnapshot(currentEng())'),false);
 assert.deepEqual(Array.from(run('canonicalMissingRequired(currentEng())')).filter(x=>x!=='DF093'&&x!=='Confirmación AS-IS'),[]);
 assert.equal(run('unresolvedEngineGates(currentEng()).length'),0);
 assert.match(w.document.getElementById('singleUatLoadStatus').textContent,/UAT completa y guardada: 1 estudio/);
 for(const stage of ['S01','S02','S03','S08','S04','S05','S06','S07','S09']){
   run("state.activePage='uat';render()");
   const link=w.document.querySelector('[data-single-uat-stage="'+stage+'"]');
   assert.ok(link,'missing UAT entrypoint '+stage);
   link.onclick();
   assert.equal(run('currentEng().stageId'),stage);
   const body=w.document.getElementById('content').textContent;
   assert.ok(body.length>40,'empty stage '+stage);
   assert.doesNotMatch(body,/No se ha podido iniciar AUNEA Internal/);
 }
 run("state.activePage='diagnostico';currentEng().stageId='S09';render()");
 const close=w.document.getElementById('confirmClosingAsIs');
 assert.ok(close,'PG09 final closure CTA must be visible before handoff');
 close.onclick();
 assert.equal(run('currentEng().confirmedAsIs'),true);
 assert.equal(run('hasConfirmedSnapshot(currentEng())'),true);
 run("state.activePage='uat';render()");
 w.document.getElementById('openSingleUatInternal').onclick();
 assert.equal(run('state.activePage'),'resultados');
 const saved=w.localStorage.getItem('aunea_internal_v1');
 assert.ok(saved,'single UAT must persist');
 const reloaded=buildRuntime(saved);
 assert.equal(reloaded.run("state.engagements.filter(e=>e.id.startsWith('UAT3-CASE-')).length"),1);
 assert.equal(reloaded.run("state.engagements.find(e=>e.id.startsWith('UAT3-CASE-')).confirmedAsIs"),true);
 assert.deepEqual(errors.filter(x=>/TypeError|ReferenceError|SyntaxError/.test(x)),[],'runtime console errors: '+errors.join(' / '));
 dom.window.close();reloaded.dom.window.close();
});
test('PG09 blocks cross-layer source conflicts and stale time projections',async()=>{
 const {w,dom,run}=buildRuntime();
 run("state.activePage='uat';render()");
 await w.document.getElementById('loadSingleUat').onclick();
 run("currentEng().answers.DF046=['__CONFLICT__']");
 let review=run("preCloseConsistencyReview(currentEng())");
 assert.ok(Array.from(review.blockers).some(x=>x.code==='SOURCE_CONFLICT_DF046'),'derived/reused contradiction must block final closure');
 run("delete currentEng().answers.DF046; currentEng()._sessionTimeProjection={requestKey:'STALE'}");
 review=run("preCloseConsistencyReview(currentEng())");
 assert.ok(Array.from(review.blockers).some(x=>x.code==='STALE_TIME_PROJECTION'),'stale economic projection must block final closure');
 dom.window.close();
});

test('PG09 rolls back confirmation, snapshot and lifecycle when durable persistence conflicts',async()=>{
 const {w,dom,run}=buildRuntime();
 run("state.activePage='uat';render()");
 await w.document.getElementById('loadSingleUat').onclick();
 const baseline=JSON.parse(w.localStorage.getItem('aunea_internal_v1'));
 const remote=JSON.parse(JSON.stringify(baseline));
 const re=remote.engagements.find(e=>e.id.startsWith('UAT3-CASE-'));
 re.contextSummary='Cambio remoto concurrente';
 w.localStorage.setItem('aunea_internal_v1',JSON.stringify(remote));
 run("currentEng().contextSummary='Cambio local concurrente'; state.dirty=true; state.activePage='diagnostico'; currentEng().stageId='S09'; render()");
 const close=w.document.getElementById('confirmClosingAsIs');
 assert.ok(close,'PG09 close action must exist');
 close.onclick();
 assert.equal(run('currentEng().confirmedAsIs'),false,'failed persistence must leave AS-IS open');
 assert.equal(run('hasConfirmedSnapshot(currentEng())'),false,'failed persistence must not expose a handoff snapshot');
 assert.equal(run("engagementStatus(currentEng())"),'Sesión 1','failed persistence must not advance lifecycle');
 assert.equal(run("(currentEng().confirmedSnapshots||[]).some(s=>s.finalClosure===true)"),false,'failed persistence must not retain a final snapshot only in memory');
 dom.window.close();
});

test('single UAT risk payload is complete and never throws reversibility startup errors',()=>{
 const {run,dom}=buildRuntime();
 const fixture=JSON.parse(read('uat/cases/invoices.json'));
 const row=run('uat3Seed('+JSON.stringify(fixture)+')');
 run('state.companies.push('+JSON.stringify(row.company)+');state.contacts.push(...'+JSON.stringify(row.contacts)+');state.engagements.push('+JSON.stringify(row.engagement)+')');
 const risks=run('normalizeRiskInputs(state.engagements[0])');
 assert.equal(risks.length,2);
 assert.equal(Array.from(risks).every(r=>typeof r.reversible==='boolean'&&typeof r.controls_present==='boolean'),true);
 dom.window.close();
});

test('PG05 internal Pasos reads confirmed client map without a second editor or layer confirmation',async()=>{
 const {w,dom,run}=buildRuntime();
 try{
   run("state.activePage='uat';render()");
   await w.document.getElementById('loadSingleUat').onclick();
   run("currentEng().layerConfirmations.map=false");
   const initial=run("consultantStepsPage()");
   assert.match(initial,/data-confirm-process-layer="map"/,'original editable flow must stay before client confirmation');
   const count=run("currentEng().processSteps.length");
   const baseAnswers=run("JSON.stringify(currentEng().answers)");
   run("currentEng().layerConfirmations.map=true");
   const reviewed=run("consultantStepsPage()");
   assert.match(reviewed,/Mapa AS-IS confirmado/);
   assert.match(reviewed,/Suficiencia de información para la propuesta/);
   assert.match(reviewed,/Continuar a Fricciones/);
   assert.doesNotMatch(reviewed,/data-confirm-process-layer="map"/,'client confirmation is not repeated');
   assert.doesNotMatch(reviewed,/data-delete-step=/,'confirmed map is not recreated in the internal review');
   assert.doesNotMatch(reviewed,/id="addStep"/,'confirmed map does not show another add-step editor');
   assert.equal(run("currentEng().processSteps.length"),count);
   assert.equal(run("JSON.stringify(currentEng().answers)"),baseAnswers,'read-only review never manufactures answers');
   assert.equal(run("currentEng().layerConfirmations.map"),true);
   assert.equal(run("currentEng().confirmedAsIs"),false,'PG09 remains the separate final confirmation');
 }finally{dom.window.close();}
});
// [AUNEA-UAT-RUNTIME-125] END
