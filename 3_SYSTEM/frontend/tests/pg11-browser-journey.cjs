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
    '#tobeStepDesign>.tobe-stage-disclosure>.tobe-design-header',
    '#tobeStepOrigin .tobe-stage-heading','#tobeStepAdvice .tobe-stage-heading',
    '#tobeStepDesign .tobe-stage-heading'
  ];
  await page.waitForFunction(selectors=>selectors.every(sel=>document.querySelector(sel)),
    stageSelectors,{timeout:10000});
  const missingStages=await page.evaluate(selectors=>
    selectors.filter(sel=>!document.querySelector(sel)),stageSelectors);
  assert.deepEqual(missingStages,[],'PG11 must finish rendering all three guided sections');
  // Sections 01, 02 and 03 must be identical shared outer surfaces, with one
  // subordinate compact disclosure owner for 01 and 02 and one 03 workspace.
  const sectionGeometry=await page.evaluate(()=>{
    const nodes=['.tobe-context','.tobe-global-analysis','.tobe-review-workbench']
      .map(x=>document.querySelector(x));
    const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right};};
    const inline=['.tobe-context-details','.tobe-global-monitoring']
      .map(x=>document.querySelector(x));
    return {surfaces:nodes.map(el=>el?{...rect(el),padding:getComputedStyle(el).paddingLeft,
      border:getComputedStyle(el).borderTopWidth}:null),
      inline:inline.map(el=>el?{className:el.className,tag:el.tagName,
        summary:el.querySelector(':scope>summary')?.className,
        bg:getComputedStyle(el.querySelector(':scope>summary')).backgroundColor}:null),
      workspace:document.querySelector('.tobe-review-workbench'),
      boundaries:['.tobe-review-workbench>.tobe-guided-nav',
        '.tobe-review-workbench>#tobeInspector'].map(sel=>{
          const el=document.querySelector(sel);
          return el?{border:getComputedStyle(el).borderLeftWidth,
            padding:getComputedStyle(el).paddingLeft}:null;
        })};
  });
  assert.ok(sectionGeometry.surfaces.every(Boolean),'01/02/03 share a visible outer surface');
  const aligned=(a,b)=>Math.abs(a-b)<1.5;
  assert.ok(sectionGeometry.surfaces.every(x=>
    aligned(x.left,sectionGeometry.surfaces[0].left)&&
    aligned(x.right,sectionGeometry.surfaces[0].right)&&
    x.border===sectionGeometry.surfaces[0].border&&
    x.padding===sectionGeometry.surfaces[0].padding),
    '01/02/03 must share one surface geometry: '+JSON.stringify(sectionGeometry.surfaces));
  assert.ok(sectionGeometry.inline.every(x=>x?.tag==='DETAILS'&&
    x.className.includes('aunea-ui-disclosure--inline')&&
    x.summary.includes('aunea-ui-disclosure__summary')),
    '01/02 supporting disclosures must use the same global renderer: '+JSON.stringify(sectionGeometry.inline));
  assert.equal(sectionGeometry.inline[0].bg,sectionGeometry.inline[1].bg,
    '01/02 disclosure headers must use the same shared background');
  assert.ok(sectionGeometry.boundaries.every(Boolean),'03 must contain its nav and inspector');
  assert.ok(sectionGeometry.boundaries.every(x=>x.border==='0px'&&x.padding==='0px'),
    '03 nav and inspector must not create nested outer cards: '+JSON.stringify(sectionGeometry.boundaries));
  for(const sel of ['.tobe-context-details','.tobe-global-monitoring']){
    const detail=page.locator(sel),initial=await detail.evaluate(el=>el.open);
    await detail.locator(':scope>summary').click();
    assert.equal(await detail.evaluate(el=>el.open),!initial,'Inline disclosure must toggle '+sel);
    await detail.locator(':scope>summary').click();
    assert.equal(await detail.evaluate(el=>el.open),initial,'Inline disclosure must restore '+sel);
  }
  // PG11 visual contract: all three guided sections are one product hierarchy.
  const stageVisual=await page.evaluate(()=>{
    const names=['#tobeStepOrigin>details>summary','#tobeStepAdvice>details>summary',
      '#tobeStepDesign>.tobe-stage-disclosure>.tobe-design-header'],
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
  // Compare rendered geometry, not just token strings: 03.3 must occupy the
  // same shell and horizontal content gutter as the approved 03.2 pattern.
  const visualAlignment=await page.evaluate(()=>{
    const rect=sel=>{const r=document.querySelector(sel)?.getBoundingClientRect();
      return r?{left:r.left,right:r.right,top:r.top,height:r.height}:null;};
    const body=document.querySelector('#tobeAdviceDetails>.aunea-ui-disclosure__content');
    return {advice:rect('#tobeStepAdvice'),design:rect('#tobeStepDesign'),
      adviceHeader:rect('#tobeStepAdvice>.aunea-ui-disclosure>summary'),
      designHeader:rect('#tobeStepDesign>.tobe-stage-disclosure>summary'),
      designGroup:rect('#tobeDesignGroup01'),
      adviceContentLeft:body?body.getBoundingClientRect().left+
        parseFloat(getComputedStyle(body).paddingLeft):null};
  });
  for(const part of ['advice','design','adviceHeader','designHeader','designGroup'])
    assert.ok(visualAlignment[part],'Missing UX component '+part);
  const px=(a,b)=>Math.abs(a-b)<=1.5;
  assert.ok(px(visualAlignment.advice.left,visualAlignment.design.left)&&
    px(visualAlignment.advice.right,visualAlignment.design.right),
    '03.2/03.3 must use the same outer horizontal boundaries: '+JSON.stringify(visualAlignment));
  assert.ok(px(visualAlignment.adviceHeader.left,visualAlignment.designHeader.left)&&
    px(visualAlignment.adviceHeader.right,visualAlignment.designHeader.right),
    '03.3 header must not have an additional inset: '+JSON.stringify(visualAlignment));
  assert.ok(px(visualAlignment.adviceContentLeft,visualAlignment.designGroup.left),
    '03.3 groups must align with the 03.2 content gutter: '+JSON.stringify(visualAlignment));
  assert.ok(px(visualAlignment.adviceHeader.height,visualAlignment.designHeader.height),
    '03.3 header must use compact single-line height like 03.2: '+JSON.stringify(visualAlignment));
  // UX contract: same native disclosure control, same initial state and same background
  // for every operational group. Opening a group must not change the data owner.
  const groupContract=await page.evaluate(()=>{
    const ids=['tobeDesignGroup01','tobeDesignGroup02','tobeExecutionFields',
      'tobeStepOptimization','tobeDesignGroup05'];
    return ids.map(id=>{
      const panel=document.getElementById(id),summary=panel?.querySelector(':scope>summary');
      const style=summary?getComputedStyle(summary):null;
      return {id,element:panel?.tagName,open:panel?.open,
        summary:summary?.tagName,bg:style?.backgroundColor,weight:style?.fontWeight};
    });
  });
  assert.ok(groupContract.every(x=>x.element==='DETAILS'&&x.summary==='SUMMARY'&&x.open===true),
    'All five numbered design groups must be operational native disclosures with equal initial state: '+
      JSON.stringify(groupContract));
  assert.equal(new Set(groupContract.map(x=>x.bg)).size,1,
    '01–05 must share the same header background regardless of semantics');
  await page.locator('#tobeDesignGroup02>summary').click();
  assert.equal(await page.locator('#tobeDesignGroup02').evaluate(el=>el.open),false);
  await page.locator('#tobeDesignGroup02>summary').click();
  assert.equal(await page.locator('#tobeDesignGroup02').evaluate(el=>el.open),true);
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
