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
  const beforeRules=w.document.getElementById('tobeStepAdvice').textContent;
  assert.match(beforeRules,/Pendiente de generar alternativas por reglas/);
  assert.doesNotMatch(beforeRules,/No hay alternativa específica calculada por reglas/);
  w.document.getElementById('tobeDesignDetails').open=false;
  w.document.querySelector('#tobeStepAdvice [data-tobe-jump="tobeStepDesign"]').click();
  assert.equal(w.document.getElementById('tobeDesignDetails').open,true);
  w.document.querySelector('[data-tobe-load-alternatives="P1"]').click();
  await until(()=>w.document.querySelectorAll('[data-tobe-alternative]').length>0);
  const hash=run('__auneaTobeAlternatives.get(tobeAlternativeKey(currentEng(),latestTobe(currentEng()),"P1")).input_hash');
  run('__auneaTobeAlternatives.get(tobeAlternativeKey(currentEng(),latestTobe(currentEng()),"P1")).input_hash="STALE-DIAGNOSTIC";render()');
  assert.match(w.document.getElementById('tobeStepAdvice').textContent,/ya no coinciden con el diagnóstico vigente/);
  assert.equal(w.document.querySelectorAll('#tobeStepAdvice [data-tobe-alternative]').length,0,'stale suggestions cannot be reviewed');
  run('__auneaTobeAlternatives.get(tobeAlternativeKey(currentEng(),latestTobe(currentEng()),"P1")).input_hash='+JSON.stringify(hash)+';render()');
  // Rule options are organised by linked AS-IS finding, not by engine or industry.
  const sources=run('tobeOpportunitySources(currentEng(),latestTobe(currentEng()),tobeSelectedItem(currentEng(),latestTobe(currentEng())))');
  assert.ok(sources.length>=1,'at least one confirmed finding is available to the consultant');
  assert.ok(sources.every(x=>x.id&&x.label&&(x.kind==='Fricción'||x.kind==='Riesgo')),
    'finding groups are sourced from the sealed snapshot');
  assert.equal(w.document.querySelectorAll('#tobeStepAdvice .tobe-alternative').length,
    w.document.querySelectorAll('.tobe-alternative').length,
    'all rule alternatives are presented once in 03.2');
  assert.equal(w.document.querySelectorAll('#tobeStepDesign .tobe-alternative').length,0,
    'the TO-BE editor cannot contain duplicated rule-choice cards');
  assert.ok(w.document.querySelector('#tobeAiTechnicalDetails'),
    'global and individual AI sources remain available on demand');
  assert.ok(w.document.querySelector('#tobeStepDesign .tobe-decision-context-compact'),
    'the single editor retains an audit trail summary');
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
  candidate().querySelector('[data-tobe-alternative-discard]').click();
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),4,
    'discarding a suggestion must not change the TO-BE');
  assert.ok(candidate().querySelector('[data-tobe-alternative-restore]'),
    'discarded suggestion must expose a recovery action');
  candidate().querySelector('[data-tobe-alternative-restore]').click();
  assert.ok(candidate().querySelector('[data-tobe-alternative]'),
    'restored suggestion is available for preview');
  assert.ok(run('latestTobe(currentEng()).aiDraft.applyHistory.some(x=>x.action==="DISCARD"&&x.undoneAt)'),
    'restoring a discard preserves a reversible audit entry');
  candidate().querySelector('[data-tobe-alternative]').click();
  const edit=w.document.querySelector('[data-tobe-preview-key="controlsRisk"]');
  edit.value='Control revisado por el consultor con criterio explícito de integridad.';
  edit.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.match(w.document.querySelector('#tobeAlternativeChanges').textContent,
    /Control revisado por el consultor con criterio explícito de integridad/,
    'editing refreshes preview without writing the live TO-BE');
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),4);
  const confirm=w.document.querySelector('[data-tobe-confirm-alternative]');
  assert.equal(confirm.disabled,false,'The confirm action must stay clickable and explain missing requirements');
  assert.equal(confirm.dataset.tobeConfirmReady,'0');
  confirm.click();
  assert.match(w.document.querySelector('#tobePreviewActionFeedback').textContent,/Antes de confirmar:/);
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),4,
    'Blocked confirmation must never write to the TO-BE');
  const acknowledgement=w.document.querySelector('[data-tobe-preview-ack]');
  assert.ok(acknowledgement,'the preview must explain pending conditions');
  acknowledgement.checked=true;
  acknowledgement.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(confirm.dataset.tobeConfirmReady,'1','confirmation becomes ready after explicit acknowledgement');
  // Live draft may receive a safe, unrelated change while the preview is open.
  // First click must refresh the comparison without overwriting that change.
  run('latestTobe(currentEng()).items[1].humanSupervision="Revisión humana externa conservada";');
  confirm.click();
  assert.equal(run('tobeFutureSteps(currentEng(),latestTobe(currentEng())).length'),4);
  assert.match(w.document.querySelector('#tobePreviewActionFeedback').textContent,/actualizado la comparación/);
  assert.equal(run('latestTobe(currentEng()).items[1].humanSupervision'),'Revisión humana externa conservada');
  confirm.click();
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
  run("latestTobe(currentEng()).items[0].transformation='Se modifica';"+
    "latestTobe(currentEng()).items[0].automationAi='Crear automáticamente un registro de entrada de factura';render()");
  w.document.querySelector('[data-tobe-load-alternatives="P1"]').click();
  await until(()=>w.document.querySelectorAll('.tobe-alternative').length>0);
  const keepCard=[...w.document.querySelectorAll('.tobe-alternative')]
    .find(x=>x.textContent.includes('Mantener la actividad sin cambios'));
  assert.ok(keepCard,'a preserve-AS-IS alternative remains traceable after undo');
  keepCard.querySelector('[data-tobe-alternative]').click();
  assert.match(w.document.querySelector('#tobeAlternativeChanges').textContent,
    /Automatización \/ IA/,'the abandoned automation must appear explicitly in the comparison');
  const scopedRows=[...w.document.querySelectorAll('.tobe-preview-scoped-checks > ul > li')]
    .map(x=>x.textContent).join(' ');
  assert.doesNotMatch(scopedRows,/La intervención incorpora automatización o asistencia/,
    'preserving the AS-IS must not present abandoned automation as a new intervention');
  assert.equal(w.document.querySelector('[data-tobe-confirm-alternative]').dataset.tobeConfirmReady,'0');
  const note=w.document.querySelector('[data-tobe-preview-note]');
  assert.ok(note,'a KEEP choice must require a reason');
  const conditions=w.document.querySelector('[data-tobe-preview-ack]');
  const findings=w.document.querySelector('[data-tobe-preview-keep-ack]');
  assert.ok(conditions&&findings,'all KEEP consequences must be explicit');
  conditions.checked=true;conditions.dispatchEvent(new w.Event('change',{bubbles:true}));
  findings.checked=true;findings.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(w.document.querySelector('[data-tobe-confirm-alternative]').dataset.tobeConfirmReady,'0',
    'acknowledging the risk is not a substitute for a justification');
  note.value='Conservar la recepción hasta comprobar con el cliente los hallazgos relacionados.';
  note.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.document.querySelector('[data-tobe-confirm-alternative]').dataset.tobeConfirmReady,'1');
  w.document.querySelector('[data-tobe-confirm-alternative]').click();
  const savedKeep=run('latestTobe(currentEng()).aiDraft.applyHistory.at(-1)');
  assert.match(savedKeep.consultantNote,/Conservar la recepción/);
  assert.equal(savedKeep.remainingFindingsAcknowledged,true);
  assert.equal(savedKeep.conditionsAcknowledged,true);
  assert.equal(run('latestTobe(currentEng()).items[0].automationAi'),'',
    'confirmed KEEP must remove the superseded future automation description');
  assert.equal(run('JSON.stringify(confirmedSnapshot(currentEng()))'),immutable);
  run("latestTobe(currentEng()).status='REVIEWED';render()");
  assert.ok(w.document.querySelector('#tobeStepAdvice .tobe-opportunity'),'03.2 remains readable in REVIEWED');
  assert.match(w.document.getElementById('tobeStepAdvice').textContent,/solo lectura/i);
  assert.equal(w.document.querySelectorAll('#tobeStepAdvice [data-tobe-load-alternatives],#tobeStepAdvice [data-tobe-alternative],#tobeStepAdvice [data-tobe-alternative-discard],#tobeStepAdvice [data-tobe-alternative-restore],#tobeStepAdvice [data-tobe-undo-alternative]').length,0);
  assert.ok(w.document.querySelector('#tobeStepDesign'),'03.3 remains in read-only review');
  run("latestTobe(currentEng()).status='DRAFT';render()");
  assert.ok(w.document.querySelector('#tobeStepAdvice [data-tobe-load-alternatives]'));
  assert.deepEqual(h.errors,[]);
  // [AUNEA-UAT-PG11-CROSS-STAGE-468] START
  // One persistent Engagement: PG09 re-seal → PG10 diagnose → PG11 01/02/03.1/03.2/03.3/map.
  const previous=run('JSON.stringify(latestTobe(currentEng()))'),count=run('currentEng().tobeProposals.length');
  assert.equal(run('confirmedSnapshot(currentEng()).version'),1);
  run("currentEng().processSteps[0].step_name+=' (revisada en v2)';"+
      "sealConfirmedSnapshot(currentEng(),'UAT: AS-IS revisado')");
  assert.equal(run('confirmedSnapshot(currentEng()).version'),2);
  await run("(async()=>{const e=currentEng(),snap=confirmedSnapshot(e);"+
    "e.engineGateReview.snapshotVersion=snap.version;"+
    "const response=await fetch(state.backendUrl+'/v1/diagnose',{method:'POST',"+
    "headers:{'Content-Type':'application/json'},body:JSON.stringify(buildBackendPayload(e))});"+
    "if(!response.ok)throw Error('PG10 v2 HTTP '+response.status);"+
    "e.diagnosticOutput=await response.json();e.lastEngineSnapshotVersion=snap.version;"+
    "e.lastEngineGateFingerprint=engineGateFingerprint(e);"+
    "if(!saveState('UAT PG10 v2'))throw Error('PG10 persistence failure');render();})()");
  assert.ok(w.document.getElementById('reconcileTobeSource'),
    'changed AS-IS must offer a recovery path, not a dead-end');
  assert.equal(run('JSON.stringify(currentEng().tobeProposals[0])'),previous);
  w.document.getElementById('reconcileTobeSource').click();
  assert.equal(run('currentEng().tobeProposals.length'),count+1);
  assert.equal(run('latestTobe(currentEng()).sourceSnapshotVersion'),2);
  assert.equal(run('latestTobe(currentEng()).status'),'DRAFT');
  assert.equal(run('JSON.stringify(currentEng().tobeProposals[0])'),previous);
  assert.equal(run('latestTobe(currentEng()).items[0].transformation'),'');
  assert.equal(run('latestTobe(currentEng()).items[1].humanSupervision'),
    JSON.parse(previous).items[1].humanSupervision);
  for(const id of ['tobeStepOrigin','tobeStepAdvice','tobeStepDesign'])
    assert.ok(w.document.getElementById(id),'all PG11 stages must use the recovered DRAFT: '+id);
  assert.equal(run('tobeProposalSnapshot(currentEng(),latestTobe(currentEng())).version'),2);
  assert.equal(run('tobeFlowIntegrity(currentEng(),latestTobe(currentEng()))'),null);
  w.document.querySelector('[data-tobe-load-alternatives="P1"]').click();
  await until(()=>w.document.querySelectorAll('#tobeStepAdvice [data-tobe-alternative]').length>0);
  w.document.querySelector('#tobeStepAdvice [data-tobe-alternative]').click();
  assert.ok(w.document.getElementById('tobeAlternativeDialog'),
    '03.2 must preview a source-linked candidate against v2');
  w.document.querySelector('[data-tobe-cancel-alternative]').click();
  const transformation=w.document.querySelector('#tobeStepDesign [data-tobe-field="transformation"]');
  assert.ok(transformation);transformation.value='Se modifica';
  transformation.dispatchEvent(new w.Event('change',{bubbles:true}));
  w.document.getElementById('saveTobe').click();
  assert.equal(run('latestTobe(currentEng()).items[0].transformation'),'Se modifica',
    '03.3 must edit the same DRAFT as 03.2 and the map');
  const stored=w.localStorage.getItem('aunea_internal_v1');h.dom.window.close();
  h=runtime(stored);({run,w}=h);run("state.activePage='tobe';render()");
  assert.equal(run('latestTobe(currentEng()).sourceSnapshotVersion'),2);
  assert.equal(run('latestTobe(currentEng()).items[0].transformation'),'Se modifica');
  assert.ok(w.document.getElementById('tobeStepOrigin')&&
    w.document.getElementById('tobeStepAdvice')&&w.document.getElementById('tobeStepDesign'));
  assert.equal(run('confirmedSnapshot(currentEng()).version'),2);
  assert.deepEqual(h.errors,[]);
  console.log('PG11_CROSS_STAGE_'+kind.toUpperCase()+'_PASS: PG09/10 to all PG11 stages, same owner, v1-v2 and persistence');
  // [AUNEA-UAT-PG11-CROSS-STAGE-468] END
  console.log('PG11_DOM_'+kind.toUpperCase()+'_PASS — full runtime, preview/edit, condition gate, documented KEEP, discard/recover, confirm/reload/undo, branches and AS-IS preserved');
 }finally{h.dom.window.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
// [AUNEA-UAT-PG11-DOM-340] END
