// [AUNEA-UAT-PG11-BROWSER-339] START — real browser + HTTP + canonical persistence, synthetic data.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const backend=process.env.AUNEA_UAT_BACKEND||'http://127.0.0.1:8017';
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browserChannel=process.env.AUNEA_BROWSER_CHANNEL||'';
 const browser=await chromium.launch({headless:true,...(browserChannel?{channel:browserChannel}:{executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)}),args:['--no-sandbox']});
 try{for(const kind of ['invoice','logistics']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/index.html');await page.waitForFunction(()=>typeof uat3Seed==='function'&&typeof schema!=='undefined'&&schema?.fields?.length);
  await page.evaluate(require('./pg11-journey-fixture.cjs'),{kind,backend});
  const immutable=await page.evaluate(()=>JSON.stringify(confirmedSnapshot(currentEng())));
  // Wait for the real rendered stage, not only the async fixture/HTTP completion.
  // The following style checks must fail explicitly if any section is missing.
  const stageSelectors=[
    '#tobeStepOrigin>details>summary','#tobeStepAdvice>details>summary',
    '#tobeStepDesign>.tobe-design-header',
    '#tobeStepOrigin .tobe-stage-heading','#tobeStepAdvice .tobe-stage-heading',
    '#tobeStepDesign .tobe-stage-heading'
  ];
  await page.waitForFunction(selectors=>selectors.every(sel=>document.querySelector(sel)),
    stageSelectors,{timeout:10000});
  const missingStages=await page.evaluate(selectors=>
    selectors.filter(sel=>!document.querySelector(sel)),stageSelectors);
  assert.deepEqual(missingStages,[],'PG11 must finish rendering all three guided sections');
  // PG11 visual contract: all three guided sections are one product hierarchy.
  const stageVisual=await page.evaluate(()=>{
    const names=['#tobeStepOrigin>details>summary','#tobeStepAdvice>details>summary',
      '#tobeStepDesign>.tobe-design-header'],
      selectors=['#tobeStepOrigin .tobe-stage-heading','#tobeStepAdvice .tobe-stage-heading',
        '#tobeStepDesign .tobe-stage-heading'];
    const look=el=>{
      const c=getComputedStyle(el);
      return {size:c.fontSize,weight:c.fontWeight,font:c.fontFamily,
        line:c.lineHeight,bg:c.backgroundColor,padding:c.paddingTop};
    };
    return {heads:names.map(x=>look(document.querySelector(x))),
      titles:selectors.map(x=>look(document.querySelector(x)))};
  });
  for(const property of ['bg','padding'])
    assert.equal(new Set(stageVisual.heads.map(x=>x[property])).size,1,
      '03.1/03.2/03.3 must share '+property+': '+JSON.stringify(stageVisual.heads));
  for(const property of ['size','weight','font','line'])
    assert.equal(new Set(stageVisual.titles.map(x=>x[property])).size,1,
      '03.1/03.2/03.3 must share title '+property+': '+JSON.stringify(stageVisual.titles));
  assert.match(stageVisual.titles[0].font,/Sora/);
  // F1: both PG11 captions use the common DS-003 typography, with local margin only.
  const captionVisual=await page.evaluate(()=>[
    '.tobe-context-head .aunea-ui-section-caption',
    '.tobe-review-section-head .aunea-ui-section-caption'
  ].map(sel=>{
    const el=document.querySelector(sel);
    if(!el)return null;
    const c=getComputedStyle(el);
    return {size:c.fontSize,font:c.fontFamily,weight:c.fontWeight,
      lineHeight:c.lineHeight,color:c.color,margin:c.marginTop};
  }));
  assert.ok(captionVisual.every(Boolean),'Both shared PG11 captions must exist');
  for(const property of ['size','font','weight','lineHeight','color','margin'])
    assert.equal(new Set(captionVisual.map(x=>x[property])).size,1,
      'PG11 captions must share computed '+property+': '+JSON.stringify(captionVisual));
  assert.equal(captionVisual[0].margin,'0px','Page-local spacing only; typography stays shared');

  await page.locator('[data-tobe-load-alternatives="P1"]').click();
  await page.getByText('Separar el control tras esta actividad',{exact:true}).waitFor();
  const control=page.locator('.tobe-alternative').filter({hasText:'Separar el control tras esta actividad'});
  await control.getByRole('button',{name:'Revisar y previsualizar'}).click();
  await page.locator('#tobeAlternativeDialog').waitFor();
  const previewVisual=await page.evaluate(()=>{
    const selectors=['.tobe-preview-comparison>h3','.tobe-preview-validation>h3',
      '.tobe-preview-scoped-checks>h3','.tobe-preview-consultant>h3',
      '.tobe-preview-map>summary','.tobe-preview-conditions>summary',
      '.tobe-subdetails>summary'];
    return selectors.map(sel=>{
      const el=document.querySelector('#tobeAlternativeDialog '+sel),
        css=el?getComputedStyle(el):null;
      return {sel,size:css?.fontSize,weight:css?.fontWeight,font:css?.fontFamily};
    });
  });
  for(const property of ['size','weight','font'])
    assert.equal(new Set(previewVisual.map(x=>x[property])).size,1,
      'all preview section headings need the same '+property+': '+JSON.stringify(previewVisual));
  assert.match(previewVisual[0].font,/Sora/);
  assert.equal(await page.evaluate(()=>tobeFutureSteps(currentEng(),latestTobe(currentEng())).length),4);
  assert.equal(await page.locator('#tobeAlternativeDialog .tobe-graph-node').count(),5);
  await page.locator('[data-tobe-cancel-alternative]').click();
  assert.equal(await page.evaluate(()=>tobeFutureSteps(currentEng(),latestTobe(currentEng())).length),4);
  await control.getByRole('button',{name:'Revisar y previsualizar'}).click();
  const approve=page.locator('#tobeAlternativeDialog [data-tobe-confirm-alternative]');
  assert.equal(await approve.isDisabled(),true,
    'the structural preview must require acknowledgement of pending conditions');
  const acceptance=page.locator('#tobeAlternativeDialog [data-tobe-preview-ack]');
  await acceptance.check();
  assert.equal(await approve.isEnabled(),true);
  await approve.click();
  await page.waitForFunction(()=>tobeFutureSteps(currentEng(),latestTobe(currentEng())).length===5);
  assert.equal(await page.evaluate(()=>tobeFlowIntegrity(currentEng(),latestTobe(currentEng()))),null);
  await page.reload();await page.waitForFunction(()=>typeof currentEng==='function'&&currentEng()?.tobeProposals?.length);
  await page.evaluate(()=>{state.activePage='tobe';render();});
  assert.equal(await page.evaluate(()=>tobeFutureSteps(currentEng(),latestTobe(currentEng())).length),5);
  const route=await page.evaluate(()=>latestTobe(currentEng()).flow.routes.P2);assert.equal(route.normal,'P3');assert.equal(route.exception,'P4');
  assert.equal(await page.evaluate(()=>JSON.stringify(confirmedSnapshot(currentEng()))),immutable);
  await page.locator('[data-tobe-undo-alternative]').click();await page.waitForFunction(()=>tobeFutureSteps(currentEng(),latestTobe(currentEng())).length===4);
  assert.deepEqual(errors,[]);console.log('PG11_BROWSER_'+kind.toUpperCase()+'_PASS: real backend, preview, cancel, confirm, routes, persistence, reload, undo; AS-IS immutable; no Ollama inference');
  await page.screenshot({path:path.join(require('node:os').tmpdir(),'pg11-'+kind+'.png'),fullPage:true});await context.close();
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
// [AUNEA-UAT-PG11-BROWSER-339] END
