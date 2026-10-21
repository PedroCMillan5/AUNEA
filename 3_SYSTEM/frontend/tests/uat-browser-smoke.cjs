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
  // Use the existing immutable synthetic fixture as a deliberately invalid PG01 capture.
  // No imported backup, business data or master JSON is edited to make this test pass.
  await page.evaluate(async()=>{
    const response=await fetch(new URL('uat/cases/invoices.json',document.baseURI).href);
    if(!response.ok)throw Error('PG01 browser fixture unavailable');
    const row=uat3Seed(await response.json());
    // Negative-case injection is test-local: the canonical invoice fixture stays valid.
    row.engagement.answers.DF008.push('CONTROL');
    row.engagement.answers.DF009.push('SCOPE');
    state.companies.push(row.company);state.contacts.push(...row.contacts);
    state.opportunities.push(row.opportunity);state.interactions.push(row.interaction);
    state.engagements.push(row.engagement);
    state.activeEngagementId=row.engagement.id;
    row.engagement.stageId='S01';state.activePage='diagnostico';render();
  });
  const pg01State=()=>page.evaluate(()=>({
    stage:currentEng()?.stageId,
    objectives:currentEng()?.answers?.DF008?.length,
    criteria:currentEng()?.answers?.DF009?.length
  }));
  let pg01=await pg01State();
  assert.deepEqual([pg01.objectives,pg01.criteria],[4,4],'PG01 must retain the four invalid imported selections');
  assert.match(await page.locator('.pg01-validation-issues').innerText(),/máximo 3/);
  assert.equal(await page.locator('#nav [data-stage-nav="S02"]').isDisabled(),true,'rail must block invalid PG01');
  await page.locator('#nextStage').click();
  assert.equal((await pg01State()).stage,'S01','A: Continue must refuse four objectives and four criteria');
  await page.screenshot({path:path.join(outDir,'pg01-invalid-cardinality.png'),fullPage:false});
  await page.evaluate(()=>{currentEng().answers.DF008.pop();render()});
  await page.locator('#nextStage').click();
  assert.equal((await pg01State()).stage,'S01','B: optional DF009 answered with four criteria must block');
  await page.evaluate(()=>{currentEng().answers.DF009=[];render()});
  await page.locator('#nextStage').click();
  assert.equal((await pg01State()).stage,'S02','C: valid DF008 and blank optional DF009 permit PG02');
  await page.locator('#prevStage').click();
  await page.evaluate(()=>{currentEng().answers.DF008=['UNDERSTAND','REDUCE_TIME'];render()});
  await page.locator('#nextStage').click();
  pg01=await pg01State();
  assert.equal(pg01.stage,'S02','D: returning to PG01 and editing permits revalidation');
  assert.equal(pg01.objectives,2,'D: editing PG01 retains the corrected objective count');
  console.log('PG01_CHROMIUM_GATE_PASS: four functional navigation scenarios');
  const pg02Audit=await page.evaluate(()=>{
    const e=currentEng(),fields=(schema?.fields||[]).filter(f=>f.Stage_ID==='S02');
    return {
      stage:e.stageId,
      firstBlocker:stageAdvanceProblem(e,'S02'),
      fields:fields.map(f=>({
        id:f.Field_ID,askMode:f.Ask_Mode,requiredness:f.Requiredness,
        control:f.Control_UI,owner:f.Data_Owner||f.Owner_Entity||'',
        visible:questionVisible(f,e),
        value:effectiveValue(f,e),
        issue:canonicalFieldValidationIssue(f,effectiveValue(f,e),e)
      }))
    };
  });
  console.log('PG02_CHROMIUM_AUDIT: '+JSON.stringify(pg02Audit));
  assert.equal(pg02Audit.stage,'S02','PG02 must be the active page after successful PG01');
  assert.equal(pg02Audit.fields.length>0,true,'PG02 must expose canonical data fields');
  await page.locator('#nextStage').click();
  assert.equal((await pg01State()).stage,'S03','PG02 Continue must reach PG03 with canonical data');
  // PG03 visual regression belongs to the existing browser-UAT block: measure rendered columns in Chromium.
  const pg03Saved=await page.evaluate(()=>{
    const e=currentEng();return {
      a24:e.answers?.DF024,has24:Object.prototype.hasOwnProperty.call(e.answers||{},'DF024'),
      detail:e.answerDetails?.DF024,hasDetail:Object.prototype.hasOwnProperty.call(e.answerDetails||{},'DF024'),
      a25:e.answers?.DF025,has25:Object.prototype.hasOwnProperty.call(e.answers||{},'DF025'),
      a26:e.answers?.DF026,has26:Object.prototype.hasOwnProperty.call(e.answers||{},'DF026')
    };
  });
  try{
    await page.evaluate(()=>{
      const e=currentEng();e.answers.DF024='PREDICTABLE';
      e.answerDetails=e.answerDetails||{};e.answerDetails.DF024='Picos de fin de mes: HIPÓTESIS QA.';
      e.answers.DF025={value:48,unit:'h',mode:''};
      e.answers.DF026={value:250,unit:'min'};render();
    });
    const layout=await page.evaluate(()=>{
      const select=document.querySelector('.field[data-field="DF024"] .demand-seasonality-pair > .canonical-aunea-select');
      const detail=document.querySelector('.field[data-field="DF024"] .demand-seasonality-pair > .detail-wrap');
      const wrap=select?.closest('.demand-seasonality-pair');
      if(!select||!detail||!wrap)return null;
      const r1=select.getBoundingClientRect(),r2=detail.getBoundingClientRect();
      return {x1:r1.x,x2:r2.x,y1:r1.y,y2:r2.y,w1:r1.width,w2:r2.width,gap:r2.x-r1.right,
        columns:getComputedStyle(wrap).gridTemplateColumns,
        full:wrap.closest('.field')?.classList.contains('full')||false,
        target:document.querySelector('[data-number-unit="DF025"]')?.value,
        comparison:document.querySelector('[data-s03-service-time-compare]')?.innerText||''};
    });
    assert.ok(layout,'the actual nested select and detail must render');
    assert.ok(layout.full,'the seasonality field spans both columns of the stage grid');
    assert.ok(Math.abs(layout.y1-layout.y2)<5,'select and detail must appear alongside, not stacked: '+JSON.stringify(layout));
    assert.ok(Math.abs(layout.w1-layout.w2)<5,'select and detail must have equal width: '+JSON.stringify(layout));
    assert.ok(layout.gap>=10&&layout.gap<=24,'pair has a consistent visual gap: '+JSON.stringify(layout));
    assert.equal(layout.target,'h','48-hour SLA unit comes from the owner value');
    assert.match(layout.comparison,/inferior al objetivo/);
    const vertical=await page.evaluate(()=>{
      const box=id=>{
        const element=document.querySelector('.field[data-field="'+id+'"]');
        if(!element)return null;
        const r=element.getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};
      };
      return {cycle:box('DF026'),backlog:box('DF027'),errors:box('DF028')};
    });
    assert.ok(vertical.cycle&&vertical.backlog&&vertical.errors,'DF026, DF027 and DF028 must all appear');
    const {cycle,backlog,errors}=vertical;
    assert.ok(Math.abs(cycle.x-backlog.x)<3,'Backlog must be beneath end-to-end in the left column: '+JSON.stringify(vertical));
    assert.ok(Math.abs(backlog.x-errors.x)<3,'Errors and rework must use the same left column as backlog: '+JSON.stringify(vertical));
    assert.ok(cycle.bottom<backlog.y,'Backlog must follow end-to-end vertically: '+JSON.stringify(vertical));
    assert.ok(backlog.bottom<errors.y,'Proporción de casos must be BELOW backlog, not alongside it: '+JSON.stringify(vertical));
    console.log('PG03_CHROMIUM_VERTICAL_PASS: '+JSON.stringify(vertical));
    await page.screenshot({path:path.join(outDir,'pg03-demand-sla-aligned.png'),fullPage:true});
    console.log('PG03_CHROMIUM_LAYOUT_PASS: '+JSON.stringify(layout));
  }finally{
    await page.evaluate(saved=>{
      const e=currentEng();
      for(const [key,val,present] of [['DF024',saved.a24,saved.has24],['DF025',saved.a25,saved.has25],['DF026',saved.a26,saved.has26]]){
        if(present)e.answers[key]=val;else delete e.answers[key];
      }
      if(saved.hasDetail)e.answerDetails.DF024=saved.detail;else if(e.answerDetails)delete e.answerDetails.DF024;
      render();
    },pg03Saved);
  }
  // End PG03 visual regression.
  for(const stageId of ['S03','S08']){
    const audit=await page.evaluate(()=>({
      id:currentEng().stageId,
      blocker:stageAdvanceProblem(currentEng()),
      fields:(schema?.fields||[]).filter(f=>f.Stage_ID===currentEng().stageId).map(f=>({
        id:f.Field_ID,requiredness:f.Requiredness,askMode:f.Ask_Mode,
        visible:questionVisible(f,currentEng()),value:effectiveValue(f,currentEng()),
        issue:canonicalFieldValidationIssue(f,effectiveValue(f,currentEng()),currentEng())
      }))
    }));
    console.log('STAGE_CHROMIUM_AUDIT: '+JSON.stringify(audit));
    assert.equal(audit.id,stageId,'canonical stage order after PG02');
    if(stageId==='S08'){
      const context=await page.evaluate(()=>{
        const result={};
        for(const fid of ['DF087','DF088','DF089','DF090','DF091']){
          const el=document.querySelector('[data-s08-context-for="'+fid+'"]');
          if(!el){result[fid]=null;continue;}
          const source=el.querySelector('.s08-context-origin');
          result[fid]={prior:source?.querySelector('span')?.textContent||'',body:el.textContent||'',compact:!!el.querySelector('.s08-context-grid'),note:el.classList.contains('s08-context-action-note')};
        }
        return result;
      });
      assert.ok(Object.values(context).every(Boolean),'every S08 question has a compact contextual explanation');
      assert.equal(context.DF088.prior,'Legal / compliance');
      assert.equal(context.DF089.prior,'Herramientas / plataforma');
      assert.equal(context.DF089.compact,true,'relevant source is presented in compact band');
      assert.doesNotMatch(context.DF090.prior,/Herramientas \/ plataforma/);
      assert.equal(context.DF091.prior,'');
      assert.equal(context.DF091.compact,false,'no yellow context card without related PG01 restriction');
      assert.equal(context.DF091.note,true,'show a discreet recommendation instead');
      assert.doesNotMatch(context.DF091.body,/Opciones marcadas|Contexto previo/);
      await page.screenshot({path:path.join(outDir,'pg04-context-by-question.png'),fullPage:true});
      console.log('PG04_CHROMIUM_CONTEXT_PASS: '+JSON.stringify(context));
    }

    if(audit.blocker)break;
    await page.locator('#nextStage').click();
  }
  const layerProgress=[];
  for(const id of ['S04','S05','S06','S07']){
    const result=await page.evaluate(()=>({
      stage:currentEng()?.stageId,
      blocker:stageAdvanceProblem(currentEng()),
      confirmedAsIs:currentEng()?.confirmedAsIs,
      layers:currentEng()?.layerConfirmations,
      snapshots:currentEng()?.confirmedSnapshots?.length||0
    }));
    layerProgress.push(result);
    assert.equal(result.stage,id,'ordered AS-IS stage navigation');
    assert.equal(result.confirmedAsIs,false,'no synthetic final confirmation before PG09');
    assert.equal(result.snapshots,0,'no invented historical snapshot');
    if(result.blocker)break;
    if(!(await page.locator('#nextStage').count())){
      console.log('ASIS_EDITOR_HANDOFF: '+id+' requires the canonical process editor, not a generic Continue button');
      break;
    }
    await page.locator('#nextStage').click();
  }
  console.log('ASIS_CHROMIUM_AUDIT: '+JSON.stringify(layerProgress));
  const reached=await page.evaluate(()=>({stage:currentEng()?.stageId,confirmedAsIs:currentEng()?.confirmedAsIs,
    snapshots:currentEng()?.confirmedSnapshots?.length||0}));
  if(reached.stage==='S09'){
    assert.equal(reached.confirmedAsIs,false,'PG09 cannot be preconfirmed');
    assert.equal(reached.snapshots,0,'PG09 has not sealed a snapshot');
    assert.equal(await page.locator('#confirmClosingAsIs').count(),0,
      'PG09 must not offer final close before four independent layer confirmations');
    console.log('PG09_UNCONFIRMED_GATE_PASS: no premature closure');
  }
  await page.evaluate(()=>{
    for(const key of ['companies','contacts','opportunities','interactions','engagements'])
      state[key]=(state[key]||[]).filter(row=>!String(row.id||'').startsWith('UAT3-CASE-'));
    state.activeEngagementId=null;state.activePage='uat';render();
  });
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
   assert.equal(await page.locator('body.shell-session').count(),1);
   assert.doesNotMatch(await page.locator('.topbar').textContent(),/Sesión de diagnóstico|Consola interna/);
   assert.ok((await page.locator('.topbar').boundingBox()).height<=84,'header stays on a single row');
   for(const fid of ['DF046','DF047','DF049','DF050']){
     const card=page.locator('[data-pg05-field="'+fid+'"]');
     const undo=card.locator('[data-undo-derived]'),confirm=card.locator('[data-confirm-derived]');
     if(await undo.count())await undo.click();
     assert.equal(await confirm.count(),1,'confirm visible for '+fid);
     await confirm.click();
     assert.equal(await undo.count(),1,'undo visible after confirming '+fid);
     await undo.click();
     assert.equal(await confirm.count(),1,'undo restores confirm for '+fid);
   }
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
