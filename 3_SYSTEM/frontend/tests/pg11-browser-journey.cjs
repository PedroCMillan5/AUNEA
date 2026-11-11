// [AUNEA-UAT-PG11-BROWSER-339] START — real browser + HTTP + canonical persistence, synthetic data.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const backend=process.env.AUNEA_UAT_BACKEND||'http://127.0.0.1:8017';
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{for(const kind of ['invoice','logistics']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/index.html');await page.waitForFunction(()=>typeof uat3Seed==='function'&&typeof schema!=='undefined'&&schema?.fields?.length);
  await page.evaluate(require('./pg11-journey-fixture.cjs'),{kind,backend});
  const immutable=await page.evaluate(()=>JSON.stringify(confirmedSnapshot(currentEng())));
  await page.locator('[data-tobe-load-alternatives="P1"]').click();
  await page.getByText('Separar el control tras esta actividad',{exact:true}).waitFor();
  const control=page.locator('.tobe-alternative').filter({hasText:'Separar el control tras esta actividad'});
  await control.getByRole('button',{name:'Ver propuesta en el mapa'}).click();
  await page.locator('#tobeAlternativeDialog').waitFor();
  assert.equal(await page.evaluate(()=>tobeFutureSteps(currentEng(),latestTobe(currentEng())).length),4);
  assert.equal(await page.locator('#tobeAlternativeDialog [data-tobe-preview-node]').count(),5);
  await page.locator('[data-tobe-cancel-alternative]').click();
  assert.equal(await page.evaluate(()=>tobeFutureSteps(currentEng(),latestTobe(currentEng())).length),4);
  await control.getByRole('button',{name:'Ver propuesta en el mapa'}).click();
  await page.locator('[data-tobe-confirm-alternative]').click();
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
