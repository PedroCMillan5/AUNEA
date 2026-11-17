// [AUNEA-UAT-PG12-CHROMIUM-495] START — native PG12 full browser acceptance
// PURPOSE: Verify one canonical process map, both decision routes, three modes,
// linked counters/detail, persistence and structural what-if scenarios in Chromium.
// SOURCE: Simulator CANONICAL PG12; DEC-050/055/075; synthetic four-step PG11 fixture.
// INPUTS: synthetic confirmed AS-IS, reviewed TO-BE, live backend diagnosis.
// OUTPUTS: PASS/FAIL and Chromium screenshots for audit. No real client data.
// SIDE_EFFECTS: disposable browser/localStorage only. CHANGE_RISK: HIGH.
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const backend=process.env.AUNEA_UAT_BACKEND||'http://127.0.0.1:8017';
const evidence=path.join(__dirname,'browser-evidence');
const contentTypes={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html');
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,bytes)=>{
    if(error)return res.writeHead(404).end();
    res.setHeader('Content-Type',contentTypes[path.extname(file)]||'application/octet-stream');
    res.end(bytes);
  });
});
const json=async(page,js,arg)=>page.evaluate(js,arg);
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const channel=process.env.AUNEA_BROWSER_CHANNEL||'',
    options={headless:true,...(channel?{channel}:{
      executablePath:process.env.CHROMIUM_PATH||
        (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)
    }),args:['--no-sandbox']};
  const browser=await chromium.launch(options);
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),
      page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/index.html');
    await page.waitForFunction(()=>typeof uat3Seed==='function'&&schema?.fields?.length);
    await page.evaluate(require('./pg11-journey-fixture.cjs'),{kind:'invoice',backend});
    const original=await json(page,()=>JSON.stringify(confirmedSnapshot(currentEng())));
    const before=await json(page,()=>{
      const e=currentEng(),p=latestTobe(e);
      return {status:p.status,steps:p.items.length,
        sourceVersion:tobeProposalSnapshot(e,p).version,issues:tobeFlowIntegrity(e,p)};
    });
    assert.equal(before.status,'DRAFT');
    assert.equal(before.steps,4);
    await json(page,()=>{state.activePage='comparacion';render();});
    assert.match(await page.locator('#content').innerText(),/TO-BE revisado requerido/,
      'DRAFT must not be accessible in PG12');
    await json(page,()=>{
      const e=currentEng(),p=latestTobe(e);
      const reasons=[
        'Identificar cada factura recibida y su estado.',
        'Registrar criterio y resultado de la comprobación de aprobación.',
        'Conservar la decisión humana y documentar su seguimiento.',
        'Registrar en ERP con validación y trazabilidad del archivo.'
      ];
      p.items.forEach((it,i)=>{
        it.transformation=i===1?'Se incorpora control':'Se modifica';
        it.problemResolved=reasons[i];
        it.automationAi=i===2?'Avisos por reglas; dirección decide.':
          'Seguimiento y controles por reglas sin sustituir decisiones humanas.';
        it.humanSupervision=i===2?'Manager aprueba o rechaza.':
          'Administración revisa excepciones y autorizaciones pendientes.';
        it.controlsRisk='Auditar responsables, decisiones, errores y permisos.';
      });
      p.status='REVIEWED'; // Synthetic fixture: PG12 acceptance, not a consultant approval.
      state.activePage='comparacion';
      if(!saveState('UAT PG12 synthetic reviewed comparison'))throw Error('fixture did not persist');
      render();
    });
    await page.locator('.pg12-native-map .process-graph-board').waitFor();
    assert.equal(await page.locator('.pg12-native-map .process-graph-board').count(),1);
    assert.equal(await page.locator('.pg12-native-map .process-graph-cell').count(),6,
      'Canonical map has start, four real steps and end');
    const buttons=await json(page,()=>[...document.querySelectorAll('.pg12-view-selector [data-pg12-view]')]
      .map(b=>({mode:b.dataset.pg12View,align:getComputedStyle(b).alignItems,
        justify:getComputedStyle(b).justifyContent,
        textAlign:getComputedStyle(b).textAlign})));
    assert.deepEqual(buttons.map(x=>x.mode),['actual','proposed','comparison']);
    assert.ok(buttons.every(x=>x.align==='center'&&x.justify==='center'),
      'Mode buttons must be vertically and horizontally centered: '+JSON.stringify(buttons));
    const measure=()=>json(page,()=>{
      const board=document.querySelector('.pg12-native-map .process-graph-board'),
        svg=board.querySelector('.process-graph-lines'),
        originalEdges=JSON.parse(board.dataset.graphEdges||'[]'),
        futureEdges=JSON.parse(board.dataset.pg12FutureEdges||'[]');
      return {mode:board.dataset.pg12Mode,originalEdges,futureEdges,
        basePaths:svg.querySelectorAll('path.graph-path').length,
        baseLabels:[...svg.querySelectorAll('text')].map(el=>el.textContent.trim()),
        futurePaths:board.querySelector('.pg12-future-lines').querySelectorAll('path.graph-path').length,
        nodeCount:board.querySelectorAll('[data-graph-node]').length,
        cards:document.querySelectorAll('.pg12-native-map .process-graph-board').length,
        bodyScrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
        statuses:[...document.querySelectorAll('.pg12-diff-stats>div')]
          .map(x=>({value:Number(x.querySelector('strong').textContent),name:x.querySelector('span').textContent.trim()}))}
    });
    fs.mkdirSync(evidence,{recursive:true});
    for(const mode of ['actual','proposed','comparison']){
      await page.locator('.pg12-view-selector [data-pg12-view="'+mode+'"]').click();
      await page.waitForFunction(mode=>document.querySelector('.pg12-native-map .process-graph-board')?.dataset.pg12Mode===mode,mode);
      const m=await measure();
      assert.equal(m.cards,1,'one map in '+mode);
      assert.equal(m.nodeCount,6,'same original nodes in '+mode);
      assert.ok(m.basePaths>0,'native paths visible in '+mode);
      assert.ok(m.originalEdges.some(x=>x.from==='P2'&&x.to==='P3'&&x.label==='SÍ'));
      assert.ok(m.originalEdges.some(x=>x.from==='P2'&&x.to==='P4'&&x.label==='NO'));
      assert.ok(m.futureEdges.some(x=>x.from==='P2'&&x.to==='P4'&&x.label==='NO'),
        'TO-BE must preserve P2 NO route');
      assert.ok(m.baseLabels.includes('NO'),'NO route label must be drawn in '+mode);
      assert.ok(m.baseLabels.includes('SÍ'),'SÍ route label must be drawn in '+mode);
      assert.deepEqual(m.statuses.slice(0,4).map(s=>s.value),[0,4,0,0]);
      if(mode==='actual'){
        assert.equal(m.futurePaths,0,'no TO-BE geometry in Actual');
        assert.equal(await page.locator('.pg12-native-map [data-pg12-signals]').count()>0,true);
        assert.equal(await json(page,()=>getComputedStyle(document.querySelector('[data-pg12-signals]'),'::before').display),'none');
      }
      if(mode==='comparison'){
        assert.equal(m.futurePaths,0,'unchanged routes must not be overdrawn');
      }
      await page.screenshot({path:path.join(evidence,'pg12-'+mode+'.png'),fullPage:true});
      console.log('PG12_MODE_'+mode.toUpperCase()+'_PASS: one original native map, both routes, correct counters');
    }
    const audit=page.locator('.pg12-count-audit');
    await audit.locator('summary').click();
    assert.equal(await audit.locator('tbody tr').count(),4);
    const auditText=await audit.innerText();
    assert.match(auditText,/Fricciones AS-IS/);
    assert.match(auditText,/Bloqueos/);
    assert.match(auditText,/Avisos PG11/);
    await page.locator('.pg12-native-map [data-pg12-source="P3"]').click();
    assert.match(await page.locator('#pg12SelectedDetail').innerText(),/Aprobar factura/);
    assert.equal(await page.locator('[data-pg12-source="P3"][data-pg12-selected="true"]').count(),1);
    await page.locator('.pg12-changes-disclosure summary').click();
    await page.locator('.pg12-changes-disclosure [data-pg12-source="P4"]').click();
    assert.match(await page.locator('#pg12SelectedDetail').innerText(),/Registrar en ERP/);
    assert.match(await page.locator('.pg12-metrics').innerText(),/No disponible con evidencia suficiente/);
    const after=await json(page,()=>JSON.stringify(confirmedSnapshot(currentEng())));
    assert.equal(after,original,'PG12 must never change pinned AS-IS');
    const saved=await json(page,()=>JSON.stringify(latestTobe(currentEng())));
    await page.reload();
    await page.waitForFunction(()=>typeof currentEng==='function'&&currentEng()?.tobeProposals?.length);
    await json(page,()=>{state.activePage='comparacion';render();});
    await page.locator('.pg12-native-map .process-graph-board').waitFor();
    assert.equal(await json(page,()=>JSON.stringify(latestTobe(currentEng()))),saved,
      'read-only PG12 actions and reload must not modify reviewed TO-BE');
    assert.equal(await json(page,()=>JSON.stringify(confirmedSnapshot(currentEng()))),original);
    // Structural what-if is confined to the synthetic browser state.
    await json(page,()=>{
      const e=currentEng(),p=latestTobe(e);
      const added={id:'PN1',isAddition:true,sourceStepId:'P1',
        stepName:'Control documental',stepType:'ST02',transformation:'Se incorpora control',
        problemResolved:'Validar integridad documental',futureActor:'ADMIN',tool:'EMAIL',
        inputs:['PDF'],outputs:['DOCUMENT'],automationAi:'Reglas',humanSupervision:'Administración',
        controlsRisk:'Conservar evidencia'};
      p.flow.addedSteps=[added];
      p.flow.routes.P1.normal='PN1';p.flow.routes.PN1={normal:'P2',exception:''};
      state.activePage='comparacion';render();
    });
    const added=await measure();
    assert.equal(added.cards,1);
    assert.equal(added.statuses[2].value,1);
    assert.equal(await page.locator('.pg12-native-map [data-pg12-state="added"]').count(),1);
    await page.screenshot({path:path.join(evidence,'pg12-added.png'),fullPage:true});
    await json(page,()=>{
      const e=currentEng(),p=latestTobe(e);
      p.flow.addedSteps=[];
      p.flow.routes.P1.normal='P2';
      p.items.find(x=>x.sourceStepId==='P3').transformation='Se elimina';
      p.flow.routes.P2.normal='P4';
      state.activePage='comparacion';render();
    });
    const removed=await measure();
    assert.equal(removed.cards,1);
    assert.equal(removed.statuses[3].value,1);
    assert.equal(await page.locator('.pg12-native-map [data-pg12-state="removed"]').count(),1);
    await page.screenshot({path:path.join(evidence,'pg12-removed.png'),fullPage:true});
    assert.deepEqual(errors,[],'no uncaught runtime errors');
    console.log('PG12_CHROMIUM_ACCEPTANCE_PASS: native maps, SÍ/NO, selection, audit, backend metrics, immutable source, persistence, added/removed states');
    await context.close();
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
// [AUNEA-UAT-PG12-CHROMIUM-495] END
