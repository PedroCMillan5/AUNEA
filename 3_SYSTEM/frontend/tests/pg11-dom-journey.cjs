// [AUNEA-UAT-PG11-DOM-340] START — full module runtime, real HTTP, synthetic fixture.
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),backend=process.env.AUNEA_UAT_BACKEND||'http://127.0.0.1:8017';
function runtime(storage){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/navigation|scrollTo/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(read('index.html'),{url:'http://localhost:5500/index.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window,run=s=>vm.runInContext(s,dom.getInternalVMContext());
 w.structuredClone=structuredClone;w.fetch=async(url,options)=>{
  if(String(url).startsWith(backend))return fetch(url,options);
  if(String(url).endsWith('/health'))return {ok:false,status:503,json:async()=>({})};
  const file=String(url).replace(/^.*?:\/\/[^/]+\//,'');return {ok:true,json:async()=>JSON.parse(read(file))};};
 w.requestAnimationFrame=cb=>{cb();return 1};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 if(storage)w.localStorage.setItem('aunea_internal_v1',storage);
 for(const m of JSON.parse(read('module-manifest.json')).modules.filter(m=>m.path!=='boot.js'))run(read(m.path));
 run('schema=applyDiagnosticMasterV12('+read('data/diagnostic-master.min.json')+');');
 run('registerInternalWorkPages();');
 return {dom,w,run,errors};
}
const tick=()=>new Promise(r=>setTimeout(r,20));
async function until(check){for(let i=0;i<150;i++){if(check())return;await tick();}throw Error('Timed out waiting for UI');}
(async()=>{for(let attempt=0;attempt<100;attempt++){try{if((await fetch(backend+'/health')).ok)break;}catch{}await tick();}
for(const kind of ['invoice','logistics']){
 let h=runtime();let {run,w}=h;
 try{
  await run('('+require('./pg11-journey-fixture.cjs').toString()+')('+JSON.stringify({kind,backend})+')');
  const immutable=run('JSON.stringify(confirmedSnapshot(currentEng()))');
  assert.ok(w.document.querySelector('[data-tobe-load-alternatives="P1"]'),w.document.getElementById('content').textContent.slice(-5000));
  w.document.querySelector('[data-tobe-load-alternatives="P1"]').click();
  await until(()=>w.document.querySelectorAll('[data-tobe-alternative]').length>0);
  const candidate=()=>[...w.document.querySelectorAll('.tobe-alternative')].find(x=>x.textContent.includes('Separar el control tras esta actividad'));
  assert.ok(candidate(),'structural candidate exists');candidate().querySelector('[data-tobe-alternative]').click();
  await until(()=>w.document.getElementById('tobeAlternativeDialog'));
  const modal=w.document.getElementById('tobeAlternativeDialog');
  assert.match(modal.textContent,/Qué cambiaría si confirmas esta intervención/);
  assert.match(modal.textContent,/TO-BE guardado/);
  assert.match(modal.textContent,/TO-BE propuesto/);
  assert.match(modal.textContent,/Actividad incorporada al mapa/);
  assert.match(modal.textContent,/Comprobaciones antes de confirmar/);
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),4);
  assert.equal(w.document.querySelectorAll('#tobeAlternativeDialog .tobe-graph-node').length,5);
  w.document.querySelector('[data-tobe-cancel-alternative]').click();
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),4);
  candidate().querySelector('[data-tobe-alternative]').click();
  const edit=w.document.querySelector('[data-tobe-preview-key="controlsRisk"]');
  edit.value='Control revisado por el consultor con criterio explícito de integridad.';
  edit.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.match(w.document.querySelector('#tobeAlternativeChanges').textContent,
    /Control revisado por el consultor con criterio explícito de integridad/,
    'editing refreshes preview without writing the live TO-BE');
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),4);
  assert.equal(w.document.querySelector('[data-tobe-confirm-alternative]').disabled,false);
  w.document.querySelector('[data-tobe-confirm-alternative]').click();
  await until(()=>run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length')===5);
  assert.equal(run('tobeFlowIntegrity(currentEng(),latestTobe(currentEng()))'),null);
  assert.equal(run('tobeAddedSteps(latestTobe(currentEng()))[0].controlsRisk'),'Control revisado por el consultor con criterio explícito de integridad.');
  const disk=w.localStorage.getItem('aunea_internal_v1');assert.ok(disk);assert.deepEqual(h.errors,[]);h.dom.window.close();
  h=runtime(disk);({run,w}=h);run("state.activePage='tobe';render()");
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),5);
  assert.equal(run('latestTobe(currentEng()).flow.routes.P2.normal'),'P3');
  assert.equal(run('latestTobe(currentEng()).flow.routes.P2.exception'),'P4');
  assert.equal(run('JSON.stringify(confirmedSnapshot(currentEng()))'),immutable);
  w.document.querySelector('[data-tobe-undo-alternative]').click();
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),4);
  assert.deepEqual(h.errors,[]);
  console.log('PG11_DOM_'+kind.toUpperCase()+'_PASS — full runtime, HTTP, preview/cancel/confirm/reload/undo, branches and AS-IS preserved');
 }finally{h.dom.window.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
// [AUNEA-UAT-PG11-DOM-340] END
