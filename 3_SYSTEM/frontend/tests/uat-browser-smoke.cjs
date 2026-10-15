// [AUNEA-UAT-BROWSER-130] START — Native Chromium single-UAT map and reload acceptance.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),outDir=path.join(root,'tests','browser-evidence');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
function serve(req,res){
 const raw=decodeURIComponent(new URL(req.url,'http://127.0.0.1:5500').pathname),file=path.resolve(root,'.'+(raw==='/'?'/index.html':raw));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 });
}
async function main(){
 fs.mkdirSync(outDir,{recursive:true});
 const server=http.createServer(serve);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port,origin='http://127.0.0.1:'+port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1365,height:900},deviceScaleFactor:1});
  const failures=[];
  page.on('pageerror',err=>failures.push(err.message));
  await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('[data-page="uat"]').click();
  await page.locator('#loadSingleUat').click();
  await page.locator('#singleUatLoadStatus').getByText(/UAT completa y guardada: 1 estudio/).waitFor({timeout:20000});

  // [AUNEA-UAT-SHELL-092] START — Real Chromium shell UX with no vertical rail scrolling.
  assert.equal(await page.locator('.sidebar-foot').count(),0,'no repeated bottom logo');
  assert.equal(await page.locator('#globalSearch').count(),0,'global search was intentionally removed');
  assert.equal(await page.locator('#railHead .aunea-brand-logo').count(),1,'official top logo retained');
  assert.equal(await page.locator('.rail-context').count(),0,'active engagement is no longer in sidebar');
  assert.equal(await page.locator('#topbarActiveStudy .topbar-study').count(),1,'active engagement visible in header');
  assert.equal(await page.locator('#topbarActiveStudy [data-change-context]').count(),1,'switch study retained');
  for(const size of [{width:1365,height:900},{width:1365,height:720},{width:1024,height:768}]){
    await page.setViewportSize(size);
    const layout=await page.evaluate(()=>{
      const rail=document.querySelector('.sidebar'),nav=document.getElementById('nav');
      const header=document.querySelector('.topbar'),context=document.getElementById('topbarActiveStudy');
      const panel=context?.getBoundingClientRect(),bar=header?.getBoundingClientRect();
      return {scrollable:rail.scrollHeight>rail.clientHeight+2,navScrollable:nav.scrollHeight>nav.clientHeight+2,
        contextVisible:!!panel&&panel.width>80&&panel.left>=bar.left-1&&panel.right<=bar.right+1,
        contextTitle:context?.textContent||'',scrollMode:getComputedStyle(rail).overflowY};
    });
    assert.equal(layout.scrollable,false,'sidebar overflow at '+JSON.stringify(size));
    assert.equal(layout.navScrollable,false,'navigation overflow at '+JSON.stringify(size));
    assert.ok(layout.contextVisible,'header active study must fit at '+JSON.stringify(size));
    assert.match(layout.contextTitle,/Contexto activo/);
  }
  await page.setViewportSize({width:1365,height:900});
  // The active study, progress and save actions share one horizontal row.
  for(const viewport of [{width:1365,height:900},{width:1200,height:800},{width:1024,height:768},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const h=await page.evaluate(()=>{
      const box=q=>{const r=document.querySelector(q)?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,right:r.right}:null};
      return {study:box('.topbar-active-study'),progress:box('#stepProgress'),actions:box('.topbar-right'),
        labels:document.querySelector('.topbar')?.textContent||'',scroll:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    });
    assert.ok(h.study.w>150,'study has usable width at '+viewport.width);
    assert.ok(Math.abs(h.study.y-h.actions.y)<18,'study and actions align on one row');
    assert.ok(h.study.right<=h.actions.x+2,'study does not overlap actions');
    assert.ok(h.scroll<=2,'no page-level horizontal overflow');
    assert.doesNotMatch(h.labels,/Sesión de diagnóstico|Consola interna/);
    if(viewport.width>1100&&h.labels.includes('Paso '))assert.ok(Math.abs(h.study.y-h.progress.y)<18,'progress aligned '+viewport.width+' '+JSON.stringify(h));
  }
  await page.setViewportSize({width:1365,height:900});
  await page.screenshot({path:path.join(outDir,'aunea-topbar-study-context.png'),fullPage:false});
  // [AUNEA-UAT-SHELL-092] END
  const ids=await page.evaluate(()=>state.engagements.filter(e=>e.id.startsWith('UAT3-CASE-')).map(e=>e.id));
  assert.equal(ids.length,1,'The actual UAT click must create exactly one study.');
  for(const id of ids){
   await page.locator('[data-single-uat-stage="S04"]').click();
   // S04 is represented by the diagnostic stage shell; open the canonical process surface
   // through the same runtime state transition used by contextual navigation.
   await page.evaluate(()=>{state.activePage='proceso';render()});
   await page.locator('#openSessionDisplayFromProcess').waitFor();
   const popupPromise=page.waitForEvent('popup');
   await page.locator('#openSessionDisplayFromProcess').click();
   const editor=await popupPromise;
   await editor.waitForLoadState('domcontentloaded');
   await editor.locator('.client-process-sequence').waitFor({timeout:20000});
   const canvas=editor.locator('.flow-canvas');
   await canvas.waitFor();
   await editor.waitForTimeout(100);
   const before=await canvas.evaluate(el=>{el.scrollLeft=Math.min(el.scrollWidth-el.clientWidth,620);el.scrollTop=Math.min(el.scrollHeight-el.clientHeight,35);return {x:el.scrollLeft,width:el.scrollWidth,client:el.clientWidth}});
   assert.ok(before.width>before.client,id+' map is not horizontally navigable');
   assert.ok(before.x>0,id+' map refuses horizontal movement');
   await editor.locator('.client-process-sequence [data-process-tab="fricciones"]').click();
   await editor.locator('.client-process-sequence [data-process-tab="riesgos"]').click();
   await editor.locator('.client-process-sequence [data-process-tab="impacto"]').click();
   await editor.waitForTimeout(120);
   const after=await editor.locator('.flow-canvas').evaluate(el=>({x:el.scrollLeft,width:el.scrollWidth,client:el.clientWidth}));
   assert.equal(after.x,before.x,id+' Impact must retain the navigated position, not snap to x=0');
   const chosen=await editor.evaluate(()=>state.engagements.find(e=>e.id===state.activeEngagementId).processTab);
   assert.equal(chosen,'impacto',id+' switched to Pasos unexpectedly');
   await editor.screenshot({path:path.join(outDir,id.toLowerCase()+'.png'),fullPage:true});
   await editor.close();
   // Native consultant PG05: one owner, six editable cards, ten nonduplicated projections.
   await page.evaluate(()=>{state.activePage='pasos';render()});
   await page.locator('.pg05-review').waitFor();
   assert.equal(await page.locator('.pg05-review [data-pg05-step]').count(),6,'PG05 must display six source ProcessSteps');
   assert.equal(await page.locator('.pg05-review [data-pg05-field]').count(),10,'PG05 must display exactly ten complementary fields');
   const sizing=await page.evaluate(()=>({
     review:document.querySelector('.pg05-review').getBoundingClientRect().width,
     parent:document.querySelector('#content').getBoundingClientRect().width
   }));
   assert.ok(sizing.review/sizing.parent>=0.85,'PG05 must use the available desktop workspace, not a narrow centered column');
   for(const fid of ['DF048','DF051','DF052','DF053','DF054','DF055'])
     assert.ok(await page.locator('[data-pg05-field="'+fid+'"] .pg05-discovery-control > summary').count()>=1,
       'PG05 must preserve optional discovery for '+fid);
   await page.screenshot({path:path.join(outDir,id.toLowerCase()+'-pg05-consultor.png'),fullPage:true});
   const stepEdit=page.locator('.pg05-review [data-edit-step]').first();
   await stepEdit.click();
   await page.locator('#modalRoot #step_name').waitFor();
   await page.locator('#modalCancel').click();
   assert.equal(await page.locator('#modalRoot .modal').count(),0,'cancel must keep the review clean');
   // Session rail is contextual: return through Inicio before opening system UAT again.
   await page.locator('[data-page="inicio"]').first().click();
   await page.locator('[data-page="uat"]').click();
  }
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-page="uat"]').click();
  const afterReload=await page.evaluate(()=>state.engagements.filter(e=>e.id.startsWith('UAT3-CASE-')).map(e=>e.id));
  assert.deepEqual(afterReload,ids,'The single UAT study must survive a native browser reload.');
  assert.deepEqual(failures,[],'Unhandled browser JS errors: '+failures.join(' / '));
  process.stdout.write('CHROMIUM_UAT_PASS: 1 study generated, navigated and recovered after reload.\n');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(err=>{console.error('CHROMIUM_UAT_FAIL:',err.stack||err);process.exitCode=1});
// [AUNEA-UAT-BROWSER-130] END
