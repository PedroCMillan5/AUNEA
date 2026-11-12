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
  // User-visible diagnostic and page identifiers must not leak into the interface.
  // Data attributes, workflow internals, logs and identifiers in persisted state stay intact.
  const assertBusinessOnlyUi=async(where)=>{
    const visible=await page.locator('body').innerText();
    const found=visible.match(/\b(?:PG\d{2}|DF\d{3}|S0[1-9]|I90-\d{2}(?:-\d{2})?|C90-\d{2})\b/g)||[];
    assert.deepEqual(found,[],'Technical identifiers are not user-visible on '+where+': '+found.join(', '));
  };
  await assertBusinessOnlyUi('context and objectives');
  // PG01: actual computed styles, readable capture widths, mobile navigation and draft recovery.
  const pg01VisualState=await page.evaluate(()=>JSON.stringify(currentEng().answers));
  for(const width of [1440,1024,390]){
    await page.setViewportSize({width,height:900});
    await page.locator('.sidebar').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})))});
    const visual=await page.evaluate(()=>{
      const q=s=>document.querySelector(s),r=s=>q(s).getBoundingClientRect();
      const heading=getComputedStyle(q('#pg01-session-heading')),button=getComputedStyle(q('#nextStage'));
      return {headingSize:heading.fontSize,headingFont:heading.fontFamily,headingWeight:heading.fontWeight,
        commonHeadingSize:getComputedStyle(document.documentElement).getPropertyValue('--font-h3').trim(),
        buttonSize:button.fontSize,buttonRadius:button.borderRadius,
        fieldWidth:r('[data-pg01-company="name"]').width,sectionBottom:r('.pg01-disclosure').bottom,
        inspectorTop:r('.inspector').top,sidebarRight:r('.sidebar').right,scroll:document.documentElement.scrollWidth};
    });
    assert.equal(visual.headingSize,visual.commonHeadingSize,'PG01 uses the shared heading scale');
    assert.match(visual.headingFont,/Sora/);assert.equal(visual.headingWeight,'700');
    assert.equal(visual.buttonSize,'14px');assert.equal(visual.buttonRadius,'8px');
    assert.ok(visual.fieldWidth>=250,'PG01 capture must remain readable at '+width);
    assert.ok(visual.scroll<=width+1,'PG01 has no horizontal overflow at '+width);
    if(width<=1180)assert.ok(visual.inspectorTop>=visual.sectionBottom,'inspector follows capture at '+width);
    if(width<=760){
      assert.ok(visual.sidebarRight<=1,'closed mobile menu does not cover capture');
      await page.locator('#mobileMenu').click();
      assert.ok(await page.locator('.sidebar').evaluate(el=>el.classList.contains('open')),'mobile menu opens');
      await page.locator('.sidebar').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})))});
      await page.locator('#mobileMenu').click();
      assert.equal(await page.locator('.sidebar').evaluate(el=>el.classList.contains('open')),false,'mobile menu closes');
      await page.locator('.sidebar').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})))});
    }
    await page.screenshot({path:path.join(outDir,'pg01-shared-styles-'+width+'.png'),fullPage:false});
  }
  assert.equal(await page.evaluate(()=>JSON.stringify(currentEng().answers)),pg01VisualState,'responsive layout preserves answers');
  await page.setViewportSize({width:1365,height:900});
  const originalContext=await page.locator('[data-pg01-engagement="contextSummary"]').inputValue();
  await page.locator('[data-pg01-engagement="contextSummary"]').fill('Prueba de borrador PG01: contexto conservado.');
  await page.locator('#saveDraft').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-pg01-engagement="contextSummary"]').waitFor();
  assert.equal(await page.locator('[data-pg01-engagement="contextSummary"]').inputValue(),'Prueba de borrador PG01: contexto conservado.','PG01 draft survives reload');
  await page.locator('[data-pg01-engagement="contextSummary"]').fill(originalContext);
  await page.locator('#saveDraft').click();
  console.log('PG01_SHARED_STYLES_AND_DRAFT_PASS: desktop, tablet, mobile menu, reload; canonical capture preserved');
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
  await assertBusinessOnlyUi('process scope');
  assert.equal(pg02Audit.stage,'S02','PG02 must be the active page after successful PG01');
  assert.equal(pg02Audit.fields.length>0,true,'PG02 must expose canonical data fields');
  assert.equal(await page.locator('[data-pg02-boundary-review]').count(),0,'PG02 must not contain an imported/future AS-IS map comparison');
  assert.doesNotMatch(await page.locator('#content').innerText(),/Pendiente de revisar\/confirmar en el mapa AS-IS|Contraste con el mapa AS-IS/,'PG02 must remain independent of the future map');

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
    await assertBusinessOnlyUi('session stage '+stageId);
    if(stageId==='S08'){
      const preMapLinks=await page.evaluate(()=>{
        const e=currentEng();
        return {confirmed:!!e.layerConfirmations?.map,linkedRows:document.querySelectorAll('.field[data-field="DF088"] .linked-step-group').length};
      });
      if(!preMapLinks.confirmed)assert.equal(preMapLinks.linkedRows,0,
        'PG04 must capture exclusions without requiring step links from a future or preloaded map');

      const context=await page.evaluate(()=>{
        const result={};
        for(const fid of ['DF087','DF088','DF089','DF090','DF091']){
          const el=document.querySelector('[data-s08-context-for="'+fid+'"]');
          if(!el){result[fid]=null;continue;}
          const source=el.querySelector('.s08-context-origin');
          result[fid]={prior:source?.querySelector(':scope > span')?.textContent||'',body:el.textContent||'',compact:!!el.querySelector('.s08-context-grid'),note:el.classList.contains('s08-context-action-note'),hasInfo:!!source?.querySelector('.s08-context-info')};
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
      for(const fid of ['DF087','DF088','DF089','DF090']){
        assert.equal(context[fid].hasInfo,true,'visible source info icon required for '+fid);
      }
      assert.equal(context.DF091.hasInfo,false,'no prior source means no info icon');
      const info=page.locator('[data-s08-context-for="DF089"] .s08-context-info');
      await info.waitFor({state:'visible'});
      const infoDetail=await info.evaluate(el=>({size:el.getBoundingClientRect().width,
        title:el.getAttribute('title'),label:el.getAttribute('aria-label'),
        tip:el.getAttribute('data-tooltip'),svg:!!el.querySelector('svg')}));
      assert.ok(infoDetail.size>=14,'info icon has a visible hit area: '+JSON.stringify(infoDetail));
      assert.equal(infoDetail.title,null,'do not rely on a title attribute as icon replacement');
      assert.equal(infoDetail.svg,true);
      assert.match(infoDetail.label,/Información recuperada de «Contexto y objetivo»/);
      await info.hover();
      const hoverTip=await info.evaluate(el=>({
        display:getComputedStyle(el,'::after').display,
        content:getComputedStyle(el,'::after').content
      }));
      assert.equal(hoverTip.display,'block','actual tooltip becomes visible on hover');
      assert.match(hoverTip.content,/Restricciones iniciales/);
      await info.focus();
      assert.equal(await info.getAttribute('tabindex'),'0','icon remains keyboard focusable');
      console.log('PG04_SOURCE_INFO_TOOLTIP_PASS: '+JSON.stringify({infoDetail,hoverTip}));

      const geometry=await page.evaluate(()=>{
        const ids=['DF087','DF088','DF089','DF090'];
        const cards=ids.map(fid=>{
          const el=document.querySelector('[data-s08-context-for="'+fid+'"]');
          const box=el.getBoundingClientRect();
          const grid=el.querySelector('.s08-context-grid');
          return {fid,height:box.height,width:box.width,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length};
        });
        const note=document.querySelector('[data-s08-context-for="DF091"]');
        return {cards,noteHeight:note?.getBoundingClientRect().height||0};
      });
      assert.ok(geometry.cards.every(c=>c.height<105),'PG04 compact context cards must not dominate the questionnaire: '+JSON.stringify(geometry));
      assert.ok(geometry.cards.every(c=>c.columns===3),'PG04 context is presented as a single three-column row: '+JSON.stringify(geometry));
      assert.ok(geometry.noteHeight<50,'PG04 adoption without a source remains a small note: '+JSON.stringify(geometry));
      console.log('PG04_COMPACT_LAYOUT_PASS: '+JSON.stringify(geometry));
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
   const consultantTime=page.locator('[data-asis-temporal] .asis-temporal-content');
   await consultantTime.waitFor();
   await page.waitForFunction(()=>document.querySelector('.asis-temporal-content')?.querySelector('.asis-temporal-track')||document.querySelector('.asis-temporal-content')?.textContent?.includes('Sin cálculo temporal'),{timeout:15000});
   assert.equal(await page.locator('.asis-temporal-card').count(),1,'console has one time bar');

   // [AUNEA-UAT-PG05-PRESENTATION-150] START — Browser geometry and read-only contract.
   const stageProgress=await page.evaluate(()=>{
     const e=currentEng(),previous=e.stageId;
     e.stageId='S08';updateHeader();
     const progress=document.getElementById('stepProgress')?.textContent||'';
     const untouched=e.stageId;
     e.stageId=previous;updateHeader();
     return {progress,untouched};
   });
   assert.match(stageProgress.progress,/Paso 5 de 9/,'the map visually belongs to stage 5');
   assert.equal(stageProgress.untouched,'S08','the visual indicator must not rewrite stored stage');
   const mapAudit=await page.evaluate(()=>{
     drawProcessGraph();
     const board=document.querySelector('.process-graph-readonly .process-graph-board');
     const svg=board?.querySelector('.process-graph-lines');
     if(!board||!svg)return null;
     const base=svg.getBoundingClientRect();
     const captions=[...board.querySelectorAll('.graph-decision-copy')].map(el=>el.getBoundingClientRect());
     const alternative=[...svg.querySelectorAll('.graph-path-alternative')];
     const crossing=[];
     alternative.forEach((path,index)=>{
       const length=path.getTotalLength();
       for(let n=0;n<=length;n+=3){
         const pt=path.getPointAtLength(n),x=base.left+pt.x,y=base.top+pt.y;
         if(captions.some(r=>x>r.left+1&&x<r.right-1&&y>r.top+1&&y<r.bottom-1)){
           crossing.push(index);break;
         }
       }
     });
     const boundary=kind=>{
       const node=board.querySelector('.flow-boundary.'+kind);
       const h=node?.querySelector('h4'),p=node?.querySelector('p');
       return {text:h?.textContent||'',clip:!!h&&(h.scrollHeight>h.clientHeight+2||getComputedStyle(h).overflow==='hidden'),
         overlap:!!p&&h.getBoundingClientRect().bottom>p.getBoundingClientRect().top+2};
     };
     return {crossing,pathCount:alternative.length,start:boundary('start'),end:boundary('end'),
       badges:[...board.querySelectorAll('.graph-decision-inline>.process-node-links')].map(el=>getComputedStyle(el).top),
       labels:[...board.querySelectorAll('.graph-decision-copy .boundary-kicker')].map(el=>el.textContent),
       routeStart:alternative.map(path=>{
         const p=path.getPointAtLength(0),caption=board.querySelector('.graph-decision-copy').getBoundingClientRect();
         const gateway=board.querySelector('.graph-decision-gateway').getBoundingClientRect();
         const next=path.getPointAtLength(Math.min(12,path.getTotalLength()));
         return {x:base.left+p.x,y:base.top+p.y,
           captionBottom:caption.bottom,captionCenter:caption.left+caption.width/2,
           gatewayCenter:gateway.left+gateway.width/2,
           vertical:Math.abs(p.x-next.x)<1};
       }),
       percentage:document.querySelector('.asis-demand-facts')?.innerText||'',rate:currentEng().answers.DF028};
   });
   assert.ok(mapAudit,'PG05 canvas must be measurable');
   assert.ok(mapAudit.pathCount>0,'the alternative branch is drawn');
   assert.deepEqual(mapAudit.crossing,[],'NO path cannot cross the decision text');
   assert.ok(mapAudit.routeStart.every(p=>p.y>=p.captionBottom+8),
     'NO must start below the last line of decision text');
   assert.ok(mapAudit.routeStart.every(p=>Math.abs(p.x-p.gatewayCenter)<2&&p.vertical),
     'NO must follow the original centered vertical-down layout');
   assert.ok(mapAudit.labels.some(s=>/Paso \d+ · Decisión/.test(s)),'the gateway includes its step number');
   for(const kind of ['start','end']){
     assert.ok(mapAudit[kind].text.length>25,'full '+kind+' boundary was loaded');
     assert.equal(mapAudit[kind].clip,false,kind+' boundary is not truncated');
     assert.equal(mapAudit[kind].overlap,false,kind+' boundary does not overlap its note');
   }
   assert.ok(mapAudit.badges.every(top=>top==='40px'||top==='78px'),'F/R/I badges keep their approved positions');
   if(mapAudit.rate?.unit==='percent'&&mapAudit.rate?.period==='month')
     {
       assert.match(mapAudit.percentage,/8 % de los casos/,'error proportion is a share of cases');
       assert.match(mapAudit.percentage,/Periodo de referencia: mes/,'source monthly context remains explicit');
       assert.doesNotMatch(mapAudit.percentage,/8 % · Mes/,'do not represent a case proportion as percent per month');
     }
   console.log('PG05_VISUAL_INTEGRITY_PASS: '+JSON.stringify(mapAudit));
   await page.locator('.process-graph-readonly').screenshot({path:path.join(outDir,'pg05-map-no-text-crossing.png')});

   // Stress the real four-step screenshot's longer declared DF014/DF015 copy.
   // Test-only temporary values; restore exactly before opening the source editor.
   const longBoundaries=await page.evaluate(()=>{
     const e=currentEng(),initial=e.answers.DF014,final=e.answers.DF015;
     e.answers.DF014='La recepción por Administración de la factura PDF adjunta al email del proveedor.';
     e.answers.DF015='El registro de la factura en ERP y el archivo del expediente, con aprobación humana cuando proceda. Pago y conciliación quedan fuera.';
     render();drawProcessGraph();
     const check=kind=>{
       const card=document.querySelector('.process-graph-readonly .flow-boundary.'+kind),
         heading=card.querySelector('h4'),note=card.querySelector('p');
       const style=getComputedStyle(heading);
       return {value:heading.innerText,clipped:heading.scrollHeight>heading.clientHeight+2,
         clamp:style.webkitLineClamp,ellipsis:style.textOverflow,
         width:heading.getBoundingClientRect().width,cardWidth:card.getBoundingClientRect().width,
         overflow:getComputedStyle(heading).overflow,
         noteOverlap:!!note&&heading.getBoundingClientRect().bottom>note.getBoundingClientRect().top+2};
     };
     const result={start:check('start'),end:check('end')};
     e.answers.DF014=initial;e.answers.DF015=final;render();
     return result;
   });
   for(const kind of ['start','end']){
     assert.equal(longBoundaries[kind].clipped,false,'long '+kind+' must remain fully readable');
     assert.equal(longBoundaries[kind].noteOverlap,false,'long '+kind+' must not overlap the note');
     assert.equal(longBoundaries[kind].overflow,'visible');
     assert.equal(longBoundaries[kind].clamp,'none','long boundaries cannot be line-clamped');
     assert.notEqual(longBoundaries[kind].ellipsis,'ellipsis','long boundaries cannot use ellipses');
     assert.ok(longBoundaries[kind].width>longBoundaries[kind].cardWidth-35,
       'boundary description must use nearly the entire card width');
   }
   console.log('PG05_LONG_BOUNDARIES_PASS: '+JSON.stringify(longBoundaries));

   // [AUNEA-UAT-PG05-PRESENTATION-150] END

   const popupPromise=page.waitForEvent('popup');
   await page.locator('#openSessionDisplayFromProcess').click();
   const editor=await popupPromise;
   await editor.waitForLoadState('domcontentloaded');
   await editor.locator('.client-process-sequence').waitFor({timeout:20000});
   await editor.locator('[data-asis-temporal] .asis-temporal-content').waitFor();
   await editor.waitForFunction(()=>document.querySelector('.asis-temporal-content')?.querySelector('.asis-temporal-track')||document.querySelector('.asis-temporal-content')?.textContent?.includes('Sin cálculo temporal'),{timeout:15000});
   assert.equal(await editor.locator('.asis-temporal-card').count(),1,'client has one time bar');
   const timeCard=await editor.locator('.asis-temporal-card').textContent();
   assert.match(timeCard,/Reconstrucción del tiempo actual/);
   assert.match(timeCard,/end-to-end|End-to-end/i);
   console.log('DEC074_ASIS_TIME_BAR: '+JSON.stringify({console:await consultantTime.textContent(),client:timeCard}).slice(0,1000));

   // Exercise the full segment renderer with a synthetic backend-shaped result.
   // Browser smoke does not launch the backend; endpoint arithmetic has separate API tests.
   const segmentPreview=await editor.evaluate(()=>{
     const node=document.querySelector('.asis-temporal-card'),
       board=document.querySelector('.client-process-canvas .process-graph-board'),
       canvas=document.querySelector('.client-process-canvas'),position=canvas.scrollLeft;
     const output={
       declared_minutes:250,identified_minutes:225,unreconciled_percent:10,
       exceeds_declared_reference:false,
       segments:[
         {key:'active',label:'Trabajo activo',minutes:20,width_percent:8},
         {key:'wait',label:'Exposición a espera',minutes:200,width_percent:80},
         {key:'rework',label:'Retrabajo ponderado',minutes:5,width_percent:2},
         {key:'additional',label:'Trabajo adicional validado',minutes:0,width_percent:0}
       ],unresolved:['Solapamiento de esperas no acreditado']
     };
     node.querySelector('.asis-temporal-content').innerHTML=asisTemporalBarContent(output);
     return {
       segments:node.querySelectorAll('.asis-temporal-track .asis-temporal-fill').length,
       declared:node.textContent.includes('250 min'),
       pending:node.textContent.includes('No conciliado')&&node.textContent.includes('no confirma que los componentes estén completos ni conciliados'),
       graphStable:board===document.querySelector('.client-process-canvas .process-graph-board'),
       offsetStable:canvas.scrollLeft===position
     };
   });
   assert.deepEqual(segmentPreview,{segments:4,declared:true,pending:true,graphStable:true,offsetStable:true});
   console.log('DEC074_SEGMENT_RENDER_PASS: '+JSON.stringify(segmentPreview));
   const canvas=editor.locator('.flow-canvas');
   await canvas.waitFor();
   const textSizes=await editor.evaluate(()=>{
     const els=document.querySelectorAll('.client-process-canvas .flow-boundary h4,.client-process-canvas .graph-flow-step h4,.client-process-canvas .graph-decision-copy h4');
     return [...els].map(el=>getComputedStyle(el).fontSize);
   });
   assert.ok(textSizes.length>=4,'client AS-IS titles visible');
   assert.deepEqual([...new Set(textSizes)],['12px'],'client step labels have equal 12px size');
   const consoleSizes=await page.evaluate(()=>[...document.querySelectorAll('.process-graph-readonly .flow-boundary h4,.process-graph-readonly .graph-flow-step h4,.process-graph-readonly .graph-decision-copy h4')].map(el=>getComputedStyle(el).fontSize));
   assert.deepEqual([...new Set(consoleSizes)],['12px'],'console titles have the same size');
   console.log('PG05_SHARED_FONT_PASS: '+JSON.stringify({client:textSizes,console:consoleSizes}));
   await editor.evaluate(()=>{
     window.__uatGraphNode=document.querySelector('.client-process-canvas .process-graph-board');
     const canvas=document.querySelector('.client-process-canvas');
     canvas.scrollLeft=Math.min(180,canvas.scrollWidth-canvas.clientWidth);
     window.__uatGraphOffset=canvas.scrollLeft;
   });
   const sourceState=await editor.evaluate(()=>JSON.stringify(state));
   await page.evaluate(snapshot=>{
     const raw=JSON.parse(snapshot);
     raw.recoveryMeta={...(raw.recoveryMeta||{}),reason:'visual-regression'};
     localStorage.setItem(STORAGE_KEY,JSON.stringify(raw));
   },sourceState);
   await editor.waitForTimeout(2300);
   const idle=await editor.evaluate(()=>{
     const canvas=document.querySelector('.client-process-canvas');
     return {same:window.__uatGraphNode===document.querySelector('.client-process-canvas .process-graph-board'),
       x:canvas.scrollLeft,expected:window.__uatGraphOffset};
   });
   assert.equal(idle.same,true,'a metadata-only storage event must not recreate the graph');
   assert.equal(idle.x,idle.expected,'an idle client graph must not shift');
   console.log('PG05_STABLE_IDLE_MAP_PASS: '+JSON.stringify(idle));
   // PG05 and the client editor display the same owner boundaries, not two renderings
   // with different truncation rules. Capture their actual rendered values first.
   const consultantBoundaries=await page.evaluate(()=>['start','end'].map(kind=>
     document.querySelector('.process-graph-readonly .flow-boundary.'+kind+' h4')?.textContent||''
   ));
   const clientBoundaries=await editor.evaluate(()=>['start','end'].map(kind=>
     document.querySelector('.client-process-canvas .flow-boundary.'+kind+' h4')?.textContent||''
   ));
   assert.deepEqual(clientBoundaries,consultantBoundaries,'client and console must read the same DF014/DF015 owner values');
   const clientFullWidth=await editor.evaluate(()=>{
     const engagement=currentEng();
     const initial=engagement.answers.DF014,final=engagement.answers.DF015;
     engagement.answers.DF014='La recepción por Administración de la factura PDF adjunta al email del proveedor.';
     engagement.answers.DF015='El registro de la factura en ERP y el archivo del expediente, con aprobación humana cuando proceda. Pago y conciliación quedan fuera.';
     render();drawProcessGraph();
     const audit=kind=>{
       const card=document.querySelector('.client-process-canvas .flow-boundary.'+kind),
         heading=card?.querySelector('h4'),note=card?.querySelector('p');
       if(!card||!heading)return null;
       const style=getComputedStyle(heading),r=heading.getBoundingClientRect();
       return {text:heading.textContent,clamp:style.webkitLineClamp,overflow:style.overflow,ellipsis:style.textOverflow,
         width:r.width,cardWidth:card.getBoundingClientRect().width,
         clipped:heading.scrollHeight>heading.clientHeight+2,
         noteOverlap:!!note&&r.bottom>note.getBoundingClientRect().top+2};
     };
     const result={start:audit('start'),end:audit('end')};
     engagement.answers.DF014=initial;engagement.answers.DF015=final;render();
     return result;
   });
   for(const kind of ['start','end']){
     const b=clientFullWidth[kind];
     assert.ok(b,'client must render '+kind+' boundary');
     assert.equal(b.clamp,'none','client '+kind+' must show every line');
     assert.equal(b.overflow,'visible','client '+kind+' text must not be clipped');
     assert.notEqual(b.ellipsis,'ellipsis','client '+kind+' must not show ellipsis');
     assert.equal(b.clipped,false,'client '+kind+' must be fully legible');
     assert.equal(b.noteOverlap,false,'client '+kind+' must not overlap source note');
     assert.ok(b.width>=b.cardWidth-35,'client '+kind+' uses full card width');
   }
   console.log('PG05_CLIENT_BOUNDARIES_PASS: '+JSON.stringify(clientFullWidth));
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
   for(const pageId of ['pasos','fricciones','riesgos','impacto']){
     await page.evaluate(id=>{state.activePage=id;render()},pageId);
     const bar=page.locator('.asis-temporal-card');
     await bar.waitFor();
     assert.equal(await bar.count(),1,pageId+' has one visible AS-IS temporal bar');
     const visible=await bar.evaluate(node=>{
       const track=node.querySelector('.asis-temporal-track');
       return {heading:node.textContent.includes('Reconstrucción del tiempo actual'),
         reference:node.textContent.includes('Tiempo end-to-end declarado'),
         barWidth:Math.round(track?.getBoundingClientRect().width||0),
         categories:node.querySelectorAll('.asis-temporal-label').length,
         hasNeutral:!!track?.querySelector('.asis-temporal-unreconciled')};
     });
     assert.ok(visible.heading&&visible.reference&&visible.barWidth>100&&visible.categories>=4&&visible.hasNeutral,
       pageId+' must show the actual progress track, not only an error message: '+JSON.stringify(visible));
   }
   console.log('DEC074_PRIVATE_LAYERS_VISIBLE_PASS: Pasos, Fricciones, Riesgos, Impacto');
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
  // PG11: execute the visible button inside Chromium, not the internal helper.
  const tobeSteps=await page.evaluate(()=>{
    const e=state.engagements.find(x=>x.id.startsWith('UAT3-CASE-'));
    if(!e)throw Error('No test engagement');
    const steps=(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED');
    if(!steps.length)throw Error('No source steps');
    e.confirmedAsIs=true;
    e.confirmedSnapshots=[{version:1,finalClosure:true,processSteps:structuredClone(steps)}];
    e.engineGates=Object.fromEntries(ENGINE_GATE_CONTRACT.map(g=>[g.key,'NO']));
    e.engineGateReview={snapshotVersion:1,decisions:Object.fromEntries(ENGINE_GATE_CONTRACT.map(g=>[g.key,{answer:'NO'}]))};
    e.lastEngineGateFingerprint=engineGateFingerprint(e);
    e.lastEngineSnapshotVersion=1;
    e.diagnosticOutput={pain_results:[],economic_result:{},risk_result:{},recommendation:{},optimal_scenario:{}};
    state.activeEngagementId=e.id;state.activePage='tobe';render();
    return steps.length;
  });
  await page.locator('#createTobeDraft').click();
  const pg11=await page.evaluate(()=>({count:currentEng().tobeProposals?.length||0,status:currentEng().tobeProposals?.at(-1)?.status,
    nodes:document.querySelectorAll('.tobe-guided-tabs [data-tobe-select]').length,
    inspectorFields:document.querySelectorAll('[data-tobe-field="transformation"]').length}));
  assert.deepEqual(pg11,{count:1,status:'DRAFT',nodes:tobeSteps,inspectorFields:1},
    'PG11 creates one DRAFT, a source-linked node per step, and one contextual inspector');
  const stepGuide=await page.evaluate(()=>{
    const inspector=document.querySelector('#tobeInspector');
    const origin=inspector?.querySelector('#tobeStepOrigin');
    const advice=inspector?.querySelector('#tobeStepAdvice');
    const design=inspector?.querySelector('#tobeStepDesign');
    return {originBeforeAdvice:!!origin&&!!advice&&
        !!(origin.compareDocumentPosition(advice)&Node.DOCUMENT_POSITION_FOLLOWING),
      adviceBeforeDesign:!!advice&&!!design&&
        !!(advice.compareDocumentPosition(design)&Node.DOCUMENT_POSITION_FOLLOWING),
      sourceExpanded:!!origin?.querySelector('details[open]'),
      adviceExpanded:!!advice?.querySelector('details[open]'),
      stepButton:inspector?.querySelectorAll('[data-tobe-generate-selected]').length||0,
      canonicalTransformation:inspector?.querySelectorAll('[data-tobe-field="transformation"]').length||0};
  });
  assert.deepEqual(stepGuide,{originBeforeAdvice:true,adviceBeforeDesign:true,
    sourceExpanded:false,adviceExpanded:true,stepButton:1,canonicalTransformation:1},
    'PG11 presents compact AS-IS, available opportunity analysis and one canonical editor in order');
  await page.locator('#tobeStepOrigin > details > summary').click();
  assert.equal(await page.locator('#tobeStepOrigin > details').evaluate(el=>el.open),true,
    'confirmed AS-IS remains expandable and fully available');
  await page.locator('#tobeStepOrigin > details > summary').click();
  console.log('PG11_GUIDED_STEP_REVIEW_PASS: '+JSON.stringify(stepGuide));
  // One click changes the inspector, without destroying any draft edits.
  const sourceIds=await page.evaluate(()=>latestTobe(currentEng()).items.map(x=>String(x.sourceStepId)));
  if(sourceIds.length>1){
    await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[1]+'"]').click();
    assert.equal(await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[1]+'"]').getAttribute('aria-pressed'),'true');
    await page.locator('#tobeInspector [data-tobe-field="problemResolved"]').fill('Mejora revisada en UAT');
    await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[0]+'"]').click();
    await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[1]+'"]').click();
    assert.equal(await page.locator('#tobeInspector [data-tobe-field="problemResolved"]').inputValue(),
      'Mejora revisada en UAT','inspector edits survive navigation and real saves');
  }
  // [AUNEA-UAT-PG11-DECISION-PERSIST-304] START — actual map editor,
  // source-safe save and localStorage readback; synthetic inputs only.
  const decisionId=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    return String(tobeProposalSourceSteps(e,p).find(x=>processDecisionStep(x))?.id||'');
  });
  if(decisionId){
    await page.locator('.tobe-guided-tabs [data-tobe-select="'+decisionId+'"]').click();
    await page.locator('.tobe-guided-modes [data-tobe-mode-switch="map"]').click();
    const criterionField=page.locator('#tobeStepRoutes [data-tobe-decision-criterion]');
    assert.equal(await criterionField.count(),1,
      'every decision in map mode needs one editable version-owned future condition');
    const before=await page.evaluate(id=>JSON.stringify(
      tobeProposalSourceSteps(currentEng(),latestTobe(currentEng()))
        .find(x=>String(x.id)===id)),decisionId);
    const condition='UAT: si requiere autorización de responsable, ruta SÍ; en caso contrario, ruta NO.';
    await criterionField.fill(condition);
    await page.locator('#saveTobe').click();
    const verified=await page.evaluate(id=>{
      const e=currentEng(),p=latestTobe(e),disk=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'),
        stored=disk.engagements?.find(x=>x.id===e.id)?.tobeProposals?.
          find(x=>x.version===p.version);
      return {inMemory:p.flow?.decisionCriteria?.[id],
        persisted:stored?.flow?.decisionCriteria?.[id],
        source:JSON.stringify(tobeProposalSourceSteps(e,p).find(x=>String(x.id)===id)),
        view:document.querySelector('.tobe-decision-readout')?.textContent||''};
    },decisionId);
    assert.equal(verified.inMemory,condition);
    assert.equal(verified.persisted,condition);
    assert.equal(verified.source,before,'a new TO-BE criterion never mutates AS-IS source');
    assert.ok(verified.view.includes(condition),'P2 readout must reflect the edited criterion');
    await page.locator('.tobe-guided-modes [data-tobe-mode-switch="guided"]').click();
    await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[0]+'"]').click();
    console.log('PG11_DECISION_CRITERION_BROWSER_PASS: '+decisionId);
  }
  // [AUNEA-UAT-PG11-DECISION-PERSIST-304] END
  console.log('PG11_CREATE_DRAFT_CLICK_PASS: '+JSON.stringify(pg11));

  // [AUNEA-UAT-PG11-CHECKPOINT-BROWSER-213] START — real browser readback and reload for 4 verified steps.
  const partialStudyId=await page.evaluate(()=>currentEng().id);
  await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e),key=internalAiPilotKey(e);
    const ids=p.items.map(x=>String(x.sourceStepId));
    const items=new Map(ids.map((id,index)=>[id,{
      source_step_id:id,transformation:'Se modifica',
      problem_resolved:'Problema sintético vinculado '+(index+1),
      rationale:'Acción propuesta: registrar la recepción. Resultado esperado: mejorar la trazabilidad. Justificación: existe una fricción sintética.',
      future_actor:'',tool:'',inputs:'',outputs:'',automation_ai:'',
      human_supervision:'',controls_risk:'',source_refs:[id],limitations:'Revisar antes de aplicar'
    }]));
    __auneaAiCompletedSteps.set(key,{stepSignature:ids.join('|'),items,traces:new Map(),
      inputHash:'BROWSER_CHECKPOINT_HASH',model:'fixture-local-no-ollama'});
    internalAiPilotRefreshPanel(e);
  });
  await page.evaluate(()=>{document.querySelector('#tobeAiWorkspace').open=true;});
  assert.equal(await page.locator('#tobeAiPilotStatus .pg11-ai-step').count(),tobeSteps,
    'four verified activities must be visible even when review did not complete');
  assert.match(await page.locator('#tobeAiPilotStatus').innerText(),/Revisión global/);
  assert.equal(await page.locator('#applyTobeAiPilot').count(),0,
    'unreviewed step proposals must not become applied decisions');
  await page.locator('#saveTobeAiPending').click();
  const diskPartial=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    const disk=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return disk?.engagements?.find(x=>x.id===e.id)?.tobeProposals?.
      find(x=>x.version===p.version)?.aiDraft?.checkpoint?.items?.length||0;
  });
  assert.equal(diskPartial,tobeSteps,'checkpoint must be durable before refresh');
  // [AUNEA-UAT-PG11-INSPECTOR-CHECKPOINT-215] START — inspect the actual source-linked
  // step suggestion, both before and after reload; no new Ollama calls or TO-BE edits.
  const inspectorBusinessBefore=await page.evaluate(()=>
    JSON.stringify(latestTobe(currentEng()).items));
  for(let i=0;i<sourceIds.length;i++){
    await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[i]+'"]').click();
    const advice=await page.locator('#tobeAiRecommendation').innerText();
    assert.match(advice,new RegExp('Problema sintético vinculado '+(i+1)),
      'inspector must match the selected source step');
    assert.match(advice,/pendiente de consolidación/i);
    assert.match(advice,/Intervención recomendada/);
    assert.match(advice,/Resultado esperado/);
    for(let j=0;j<sourceIds.length;j++){
      if(i!==j)assert.doesNotMatch(advice,new RegExp('Problema sintético vinculado '+(j+1)),
        'another activity must never leak into the current inspector');
    }
  }
  const inspectorBusinessAfter=await page.evaluate(()=>JSON.stringify(latestTobe(currentEng()).items));
  assert.equal(inspectorBusinessAfter,
    inspectorBusinessBefore,'reading IA checkpoint must not modify consultant TO-BE fields');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.evaluate(id=>{state.activeEngagementId=id;state.activePage='tobe';render()},partialStudyId);
  await page.evaluate(()=>{document.querySelector('#tobeAiWorkspace').open=true;});
  assert.equal(await page.locator('#tobeAiPilotStatus .pg11-ai-step').count(),tobeSteps,
    'checkpoint cards must recover after real browser reload');
  const pg11ReloadText=await page.locator('#tobeAiPilotStatus').innerText();
  assert.match(pg11ReloadText,/guardadas en el estudio/);
  assert.equal(await page.locator('#retryTobeAiReview').count(),1,
    'review may be retried without regenerating any verified activities');
  for(let i=sourceIds.length-1;i>=0;i--){
    await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[i]+'"]').click();
    const advice=await page.locator('#tobeAiRecommendation').innerText();
    assert.match(advice,new RegExp('Problema sintético vinculado '+(i+1)),
      'checkpoint must remain linked to each original source ID after page reload');
    assert.match(advice,/pendiente de consolidación/i);
  }
  assert.equal(await page.locator('#applyTobeAiPilot').count(),0,
    'review-incomplete checkpoint must remain non-applicable');
  // [AUNEA-UAT-PG11-INSPECTOR-CHECKPOINT-215] END
  // [AUNEA-UAT-PG11-REVIEW-ONLY-BROWSER-218] START — actual button click
  // must call only the global reviewer, preserve verified activities, and show result.
  let pg11RetryStatusHits=0,pg11RetryReviewHits=0,pg11RetryStepHits=0;
  const pg11StatusRoute=async route=>{
    pg11RetryStatusHits++;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      status:'AVAILABLE',provider:'ollama',model:'fixture-local-no-ollama',
      pg11_review_protocol:'PG11_REVIEW_20261111_5',pg11_global_strategy:'SCOPED_V2',
      pg11_global_recovery:'COMPACT_2_ATTEMPTS_20261107'
    })});
  };
  const pg11ReviewRoute=async route=>{
    pg11RetryReviewHits++;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      status:'CHECKED_WITH_NOTES',summary:'Comprobación básica simulada para UAT',review_mode:'RULES_ONLY',
      protocol_revision:'PG11_REVIEW_20261111_5',requires_human_review:true,
      blocking_step_ids:[sourceIds[0]],issues:[{
        step_id:sourceIds[0],category:'BLOCKING',
        issue:'La transformación debe revisarse',evidence:'Propuesta sintética sin validar',
        action:'Solicitar revisión humana'
      }]
    })});
  };
  const pg11StepRoute=async route=>{
    pg11RetryStepHits++;
    await route.fulfill({status:409,contentType:'application/json',
      body:JSON.stringify({detail:'No deben regenerarse actividades en reintento global'})});
  };
  await page.route('**/v1/internal-ai/status',pg11StatusRoute);
  await page.route('**/v1/internal-ai/tobe-review-basic',pg11ReviewRoute);
  await page.route('**/v1/internal-ai/tobe-step',pg11StepRoute);
  await page.evaluate(()=>{state.backendOnline=true});
  const businessBeforeRetry=await page.evaluate(()=>JSON.stringify(latestTobe(currentEng()).items));
  await page.locator('#retryTobeAiReview').click();
  await page.waitForFunction(()=>document.querySelector('#tobeAiPilotStatus')?.textContent
    .includes('Propuesta IA guardada en el borrador.'),null,{timeout:10000});
  assert.equal(pg11RetryStatusHits,0,'basic check does not call the Ollama status endpoint');
  assert.equal(pg11RetryReviewHits,1,'basic review makes exactly one request');
  assert.equal(pg11RetryStepHits,0,'review-only retry must never call per-step generation');
  await page.waitForFunction(()=>!__auneaAiWorking.has(internalAiPilotKey(currentEng())));
  await page.evaluate(()=>{document.querySelector('#tobeAiWorkspace').open=true;});
  const reviewedScreen=await page.locator('#tobeAiPilotStatus').innerText();
  assert.doesNotMatch(reviewedScreen,/Generación en curso/i,
    'completed rule review must not show a stale working state');
  assert.match(reviewedScreen,/Comprobación por reglas completada/,
    'finished rules result must show its precise method and completion status');
  assert.equal(await page.evaluate(()=>JSON.stringify(latestTobe(currentEng()).items)),
    businessBeforeRetry,'review-only retry never alters consultant TO-BE fields');
  const reviewedDisk=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    const disk=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return disk?.engagements?.find(x=>x.id===e.id)?.tobeProposals?.
      find(x=>x.version===p.version)?.aiDraft?.proposal;
  });
  assert.equal(reviewedDisk?.items?.length,tobeSteps,'global reviewer draft must be saved in current engagement');
  assert.equal(reviewedDisk?.review?.blocking_step_ids?.length,1,
    'review flags must be stored and not silently auto-applied');
  assert.equal(await page.evaluate(()=>latestTobe(currentEng()).status),'DRAFT',
    'global IA review does not advance human approval status');
  // [AUNEA-UAT-PG11-HUMAN-BROWSER-227] START — Single decision owner.
  // 03.2 is read-only analysis; 03.3 owns the only versioned consultant changes.
  const originalTobeData=await page.evaluate(()=>JSON.stringify(latestTobe(currentEng()).items));
  await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[0]+'"]').click();
  assert.equal(await page.locator('#tobeHumanReviewNote').count(),0,
    '03.2 must never ask for a second whole-proposal approval');
  assert.equal(await page.locator('[data-tobe-human-decision]').count(),0,
    'no ACCEPT/MODIFY/DISCARD vote is exposed for the entire IA response');
  assert.equal(await page.locator('#tobeStepDesign .tobe-decision-context').count(),1,
    '03.3 integrates source context with one editable design');
  const consultantReview=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    return {legacy:p.aiDraft?.humanReview?.decisions||null,
      proposalIntact:!!p.aiDraft?.proposal?.items?.length,
      status:p.status};
  });
  assert.equal(consultantReview.legacy,null,
    'no new global IA approval record is created when reviewing 03.2');
  assert.equal(consultantReview.proposalIntact,true,
    'read-only analysis never removes saved IA proposals');
  assert.equal(consultantReview.status,'DRAFT');
  assert.equal(await page.evaluate(()=>JSON.stringify(latestTobe(currentEng()).items)),
    originalTobeData,'reading proposals cannot modify a consultant field');
  // An activity-wide justification is available in 03.2; empty field suggestions
  // must not replicate that four-paragraph block throughout the 03.3 inspector.
  // The QA fixture may have a value for every field. Create one temporary,
  // unsaved empty candidate to exercise the no-candidate UI without changing the oracle.
  const emptyCandidateOriginal=await page.evaluate(sourceId=>{
    const p=latestTobe(currentEng()),candidate=p?.aiDraft?.proposal?.items?.find(x=>
      String(x.source_step_id)===String(sourceId));
    if(!candidate)throw Error('QA fixture lacks a source-linked IA candidate');
    const original={exists:Object.hasOwn(candidate,'controls_risk'),value:candidate.controls_risk};
    candidate.controls_risk='';render();
    return original;
  },sourceIds[0]);
  const fieldDensity=await page.evaluate(()=>[...document.querySelectorAll(
    '#tobeInspector [data-tobe-row-key]')].map(row=>{
      const suggestion=row.querySelector('.tobe-ai-inline');
      return {key:row.getAttribute('data-tobe-row-key'),
        noCandidate:row.classList.contains('is-without-proposal'),
        evidencePanels:suggestion?.querySelectorAll('details').length||0};
    }));
  assert.ok(fieldDensity.some(x=>x.noCandidate),
    'the synthetic source contains fields without grounded IA suggestions');
  assert.deepEqual(fieldDensity.filter(x=>x.noCandidate&&x.evidencePanels!==0),[],
    '03.3 must omit IA advice and activity-wide evidence when there is no candidate');
  assert.equal(await page.locator('#tobeStepDesign .tobe-design-transformation .tobe-ai-field-row').count(),2);
  assert.equal(await page.locator('#tobeStepDesign .tobe-design-operation .tobe-ai-field-row').count(),3);
  assert.equal(await page.locator('#tobeStepDesign .tobe-design-evidence').count(),1);
  assert.equal(await page.locator('#tobeStepDesign .tobe-design-time').count(),1);
  assert.ok(await page.locator('#tobeStepDesign [data-tobe-ai-edit-field]').count()>0,
    'Editar opens the sole existing TO-BE editor, without creating another field');
  assert.equal(await page.locator(
    '#tobeInspector [data-tobe-row-key="controlsRisk"] [data-tobe-ai-keep-field]').count(),0,
    'no Keep decision is offered when IA has no actionable candidate');
  const sideBySideActions=await page.locator(
    '#tobeStepDesign .tobe-design-transformation .tobe-ai-field-review .tobe-ai-row-actions').first().evaluate(box=>{
      const buttons=[...box.querySelectorAll('button')];
      return {display:getComputedStyle(box).display,
        buttonCount:buttons.length,
        labels:buttons.map(x=>x.textContent.trim())};
    });
  assert.equal(sideBySideActions.display,'grid','Use three-column shared field-decision grid');
  assert.equal(sideBySideActions.buttonCount,3);
  assert.deepEqual(sideBySideActions.labels,['Aplicar IA','Mantener','Editar'],
    'one field offers exactly Apply, Keep and Edit without whole-proposal approval');
  await page.screenshot({path:path.join(outDir,'pg11-section03-reviewed-fields-desktop.png'),fullPage:true});
  await page.evaluate(({sourceId,original})=>{
    const p=latestTobe(currentEng()),candidate=p?.aiDraft?.proposal?.items?.find(x=>
      String(x.source_step_id)===String(sourceId));
    if(!candidate)throw Error('QA source was lost before restoring the candidate');
    if(original.exists)candidate.controls_risk=original.value;
    else delete candidate.controls_risk;
    render();
  },{sourceId:sourceIds[0],original:emptyCandidateOriginal});

  // Compact guided layout: the five intervention fields remain visible and
  // the four execution fields stay editable in one expandable canonical group.
  const execution=page.locator('#tobeExecutionFields');
  assert.equal(await execution.count(),1);
  assert.equal(await page.locator('#tobeInspector [data-tobe-row-key]').count(),9);
  const futureRole=page.locator('#tobeExecutionFields [data-tobe-catalog-field="futureActor"]');
  // The group may already be open if the same consultant expanded it
  // before reanalysis; it must remain controllable, not be forcibly collapsed.
  if(await execution.evaluate(x=>x.open))await execution.locator(':scope > summary').click();
  assert.equal(await futureRole.isVisible(),false,
    'collapsing secondary fields hides only their presentation, not their values');
  await execution.locator(':scope > summary').click();
  assert.equal(await futureRole.isVisible(),true);
  await page.evaluate(()=>render());
  assert.equal(await page.locator('#tobeExecutionFields').evaluate(x=>x.open),true,
    'expanding the canonical execution group must survive a rerender of the same step');
  // [AUNEA-UAT-PG11-ARTIFACT-OPTIMIZATION-318] START — provenance from
  // canonical source vs extra artifact chosen in the consultant TO-BE DRAFT.
  assert.equal(await page.locator('#tobeStepOptimization').count(),1);
  assert.match(await page.locator('#tobeStepOptimization').innerText(),/Impacto del cambio sobre el flujo/);
  assert.equal(await page.locator('[data-tobe-recheck-optimization]').count(),1);
  const artifactColors=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e),source=JSON.stringify(tobeProposalSourceSteps(e,p)),
      box=document.querySelector('#tobeStepDesign [data-tobe-multi-key="inputs"]');
    if(!box)throw Error('Missing canonical input multiselect in PG11');
    const existing=box.querySelector('.choice[data-artifact-provenance="asis"] input:checked');
    if(!existing)throw Error('Fixture needs at least one confirmed AS-IS input');
    const green=getComputedStyle(existing.nextElementSibling).backgroundColor;
    const extra=[...box.querySelectorAll('.choice[data-artifact-provenance="improvement"] input')]
      .find(x=>!x.checked&&x.value!=='OTHER');
    if(!extra)throw Error('Fixture needs a new canonical artifact choice');
    extra.closest('.choice').hidden=false;
    extra.checked=true;extra.dispatchEvent(new Event('change',{bubbles:true}));
    const yellow=getComputedStyle(extra.nextElementSibling).backgroundColor;
    const saved=saveTobeFromDom(e)&&saveState('UAT: guardar dato nuevo TO-BE');
    const included=tobeArtifactValues(p.items[0].inputs).resolved.includes(extra.value);
    const sourceUnchanged=JSON.stringify(tobeProposalSourceSteps(e,p))===source;
    extra.checked=false;extra.dispatchEvent(new Event('change',{bubbles:true}));
    const restored=saveTobeFromDom(e)&&saveState('UAT: restaurar dato original TO-BE');
    return {green,yellow,saved,included,sourceUnchanged,restored};
  });
  assert.notEqual(artifactColors.green,artifactColors.yellow,
    'confirmed AS-IS inputs and newly added TO-BE inputs must have different colors');
  assert.equal(artifactColors.green,'rgb(234, 242, 237)',
    'AS-IS values use canonical System green-soft');
  assert.equal(artifactColors.yellow,'rgb(246, 239, 217)',
    'TO-BE improvement values use corporate gold-soft');
  assert.ok(artifactColors.saved&&artifactColors.included&&artifactColors.restored);
  assert.ok(artifactColors.sourceUnchanged);
  await page.locator('[data-tobe-recheck-optimization]').click();
  assert.equal(await page.locator('#tobeStepOptimization').count(),1,
    'the optimization check must rerender after saving');
  console.log('PG11_ARTIFACT_PROVENANCE_OPTIMIZATION_BROWSER_PASS: green AS-IS, gold TO-BE, preserved source');
  // [AUNEA-UAT-PG11-ARTIFACT-OPTIMIZATION-318] END
  console.log('PG11_EXECUTION_FIELDS_BROWSER_PASS: primary intervention and secondary data');
  console.log('PG11_SINGLE_DECISION_BROWSER_PASS: 03.2 read-only, 03.3 source-linked actions');
  // The three canonical per-field actions must work through real browser clicks.
  const confirmedStepBefore=await page.evaluate(()=>
    JSON.stringify(tobeSourceSteps(currentEng())));
  const keepTarget=await page.evaluate(()=>{
    const button=document.querySelector('#tobeInspector [data-tobe-ai-keep-field]');
    return button?{field:button.dataset.tobeAiKeepField,
      source:button.dataset.tobeAiActionSource}:null;
  });
  assert.ok(keepTarget,'at least one grounded current IA candidate is required for the Keep UAT');
  await page.locator('#tobeInspector [data-tobe-ai-keep-field]').first().click();
  const kept=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e),disk=JSON.parse(localStorage.getItem(STORAGE_KEY));
    const saved=disk.engagements.find(x=>x.id===e.id)?.tobeProposals?.
      find(x=>x.version===p.version);
    const action=saved?.aiDraft?.applyHistory?.at(-1);
    return {action:action?.action,key:action?.fields?.[0],
      source:action?.sourceStepId,stillDraft:p.status==='DRAFT'};
  });
  assert.deepEqual(kept,{action:'KEEP',key:keepTarget.field,source:keepTarget.source,stillDraft:true},
    'Mantener must persist a decision on an actually proposed field without copying IA data');
  await page.locator('#tobeInspector [data-tobe-row-key="controlsRisk"] textarea').click();
  assert.equal(await page.evaluate(()=>
    document.activeElement===document.querySelector(
      '#tobeInspector [data-tobe-row-key="controlsRisk"] textarea')),true,
    'direct field editing must focus the sole canonical editor');
  const applyOne=page.locator(
    '#tobeInspector [data-tobe-row-key="transformation"] [data-tobe-ai-use-field="transformation"]');
  assert.equal(await applyOne.count(),1,'a human-reviewed source-linked field can be applied');
  await applyOne.click();
  await page.locator('#tobeAlternativeDialog').waitFor();
  const interventionAcknowledgement=page.locator('#tobeAlternativeDialog [data-tobe-preview-ack]');
  if(await interventionAcknowledgement.count()){
    assert.equal(await page.locator('#tobeAlternativeDialog [data-tobe-confirm-alternative]').isDisabled(),true,
      'preview cannot confirm until the consultant acknowledges applicable conditions');
    await interventionAcknowledgement.check();
  }
  await page.locator('#tobeAlternativeDialog [data-tobe-confirm-alternative]').click();
  await page.waitForFunction(()=>latestTobe(currentEng()).items[0]?.transformation==='Se modifica');
  const applied=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e),disk=JSON.parse(localStorage.getItem(STORAGE_KEY));
    const saved=disk.engagements.find(x=>x.id===e.id)?.tobeProposals?.
      find(x=>x.version===p.version),sourceId=String(p.items[0].sourceStepId);
    return {value:p.items[0].transformation,
      persisted:saved?.items?.[0]?.transformation,
      action:saved?.aiDraft?.applyHistory?.at(-1)?.action,
      source:saved?.aiDraft?.applyHistory?.at(-1)?.sourceStepId,
      status:p.status};
  });
  // The confirmed source is checked independently below; the field must remain version-owned.
  assert.equal(applied.value,'Se modifica');
  assert.equal(applied.persisted,'Se modifica');
  assert.equal(applied.action,'APPLY');
  assert.equal(applied.source,sourceIds[0]);
  assert.equal(applied.status,'DRAFT');
  assert.equal(await page.evaluate(source=>JSON.stringify(tobeSourceSteps(currentEng()))===source,
    confirmedStepBefore),true,'applying a TO-BE field cannot change AS-IS');
  console.log('PG11_FIELD_ACTIONS_BROWSER_PASS: '+JSON.stringify(kept)+' · '+JSON.stringify(applied));
  // [AUNEA-UAT-PG11-HUMAN-BROWSER-227] END
  // [AUNEA-UAT-PG11-GLOBAL-LINK-BROWSER-293] START — recommendation-to-step
  // navigation reads only the confirmed AS-IS source and never writes TO-BE fields.
  await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e),diagnostic=currentDiagnosticOutput(e);
    if(!e||!p||!diagnostic||!p.items?.length)throw Error('PG11 global link fixture missing');
    const step=String(p.items[0].sourceStepId);
    p.aiGlobal={tobeVersion:p.version,sourceSnapshotVersion:p.sourceSnapshotVersion,
      diagnosticInputHash:diagnostic.input_snapshot_hash,savedAt:now(),
      result:{status:'DRAFT',engagement_id:e.id,snapshot_version:p.sourceSnapshotVersion,
        input_hash:'UAT-LINKED-GLOBAL',model:'fixture-no-ollama',
        summary:'La recepción presenta un problema confirmado.',
        complete:true,opportunities:[{
          objective:'Evitar duplicar los datos de recepción',
          how:'Reutilizar campos confirmados sin sustituir la revisión humana.',
          why:'El origen registra repetición de captura.',constraints:'',
          source_refs:[step],review:{status:'CONDITIONED',
            reason:'Es necesario verificar capacidades reales.',conflicts:[]}
        }]}};
    markDirty('QA: contexto global vinculado a actividad');
    if(!saveState('Guardar fixture de enlace global'))throw Error('Global link not persisted');
    render();
  });
  await page.locator('#tobeGlobalAnalysis .tobe-global-opportunity details summary').first().click();
  const linkedButton=page.locator('#tobeGlobalAnalysis [data-tobe-global-link="1"]').first();
  assert.equal(await linkedButton.count(),1,'global card has a linked source-step button');
  const beforeLink=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    return JSON.stringify(p.items);
  });
  await linkedButton.click();
  const selectedGlobal=await page.evaluate(()=>({
    source:__auneaTobeSelection.stepId,
    expected:String(latestTobe(currentEng()).items[0].sourceStepId),
    inspector:document.querySelector('#tobeGlobalLinkedStep')?.textContent||''
  }));
  assert.equal(selectedGlobal.source,selectedGlobal.expected);
  assert.match(selectedGlobal.inspector,/Evitar duplicar los datos de recepción/);
  assert.match(selectedGlobal.inspector,/solo lectura/i);
  assert.equal(await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    return JSON.stringify(p.items);
  }),beforeLink,'navigating from global analysis must not change TO-BE fields');
  console.log('PG11_GLOBAL_LINK_BROWSER_PASS: '+selectedGlobal.source);
  // [AUNEA-UAT-PG11-GLOBAL-LINK-BROWSER-293] END
  // [AUNEA-UAT-PG11-GLOBAL-RETRY-295] START — resume saved source without overwriting accepted evidence.
  await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e),diagnostic=currentDiagnosticOutput(e),
      source=String(p.items[0].sourceStepId);
    p.aiGlobal={tobeVersion:p.version,sourceSnapshotVersion:p.sourceSnapshotVersion,
      diagnosticInputHash:diagnostic.input_snapshot_hash,savedAt:now(),
      result:{status:'DRAFT',engagement_id:e.id,snapshot_version:p.sourceSnapshotVersion,
        input_hash:'UAT-RETRY-HASH',model:'fixture-no-ollama',complete:false,
        summary:'El registro de origen presenta duplicidades.',
        opportunities:[{objective:'Evitar duplicidad',
          how:'Conservar y reutilizar los datos confirmados.',
          why:'El origen confirmado evidencia capturas repetidas.',
          source_refs:[source],constraints:'Mantener autorización humana.',
          review:{status:'CONDITIONED',reason:'Comprobar viabilidad.',conflicts:[]}}],
        progress:{completed:0,total:1,failed:1,focus_done:[],
          source_batches:{[source]:['Conservar y reutilizar los datos confirmados.']},
          failures:[{source_id:source,reason:'HTTP 503: prueba de reintento'}]}}};
    markDirty('QA: avance parcial de PG11');saveState('UAT reintento selectivo');
    render();
  });
  const originalPartial=await page.locator('#tobeGlobalAnalysis').innerText();
  assert.match(originalPartial,/Fuentes revisadas:/);
  assert.match(originalPartial,/Integridad:/);
  assert.match(originalPartial,/Revisión humana:/);
  assert.equal(await page.locator('#retryTobeGlobal').count(),1);
  let retryRequest;
  const retryPlan=async route=>{
    const body=route.request().postDataJSON(),
      id=String(sourceIds[0]);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      engagement_id:body.engagement.engagement_id,
      snapshot_version:body.snapshot_version,input_hash:'UAT-RETRY-HASH',
      focus:[{source_id:id,type:'STEP',label:'Recepción'}]})});
  };
  const retrySource=async route=>{
    retryRequest=route.request().postDataJSON();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      status:'DRAFT',engagement_id:retryRequest.engagement.engagement_id,
      snapshot_version:retryRequest.snapshot_version,input_hash:'UAT-RETRY-HASH',
      focus_source_id:retryRequest.focus_source_id,has_more:false,
      opportunities:[]})});
  };
  // AUNEA's 5s backend monitor probes /health, not /internal-ai/status.
  // This is an isolated fixture test: both the service health and IA endpoints
  // must be mocked, or the monitor correctly marks a nonexistent CI backend
  // offline and blocks retry before any source call. Production health remains real.
  let retryHealthHits=0;
  const retryHealth=async route=>{
    retryHealthHits++;
    await route.fulfill({status:200,contentType:'application/json',
      headers:{'access-control-allow-origin':'*'},
      body:JSON.stringify({status:'ok',backend_version:'1.1.1'})});
  };
  await page.route('**/health',retryHealth);
  await page.route('**/v1/internal-ai/tobe-global-plan',retryPlan);
  await page.route('**/v1/internal-ai/tobe-global',retrySource);
  assert.equal(await page.evaluate(async()=>checkBackend()),true,
    'simulated service must pass the real AUNEA health probe before retry');
  await page.locator('#retryTobeGlobal').click();
  try{
    await page.waitForFunction(()=>latestTobe(currentEng())?.aiGlobal?.result?.complete===true,
      null,{timeout:12000});
  }catch(error){
    const debug=await page.evaluate(()=>({
      working:typeof __auneaAiWorking!=='undefined'?[...__auneaAiWorking]:[],
      feedback:document.querySelector('#tobeGlobalAnalysis')?.innerText?.slice(0,1800)||'',
      current:latestTobe(currentEng())?.aiGlobal?.result,
      latestPage:state.activePage,
      backend:state.backendOnline
    }));
    throw new Error('Global retry did not persist: '+JSON.stringify({
      error:String(error),debug,retryRequest:retryRequest||null,pageErrors:failures.slice(-8)
    }).slice(0,5500));
  }
  assert.ok(retryHealthHits>0,
    'the real backend monitor health probe must be mocked for this isolated UAT');
  assert.deepEqual(retryRequest.seen_interventions,
    ['Conservar y reutilizar los datos confirmados.']);
  assert.match(await page.locator('#tobeGlobalAnalysis').innerText(),
    /Conservar y reutilizar los datos confirmados/);
  assert.equal(await page.locator('#retryTobeGlobal').count(),0);
  await page.unroute('**/v1/internal-ai/tobe-global',retrySource);
  await page.unroute('**/v1/internal-ai/tobe-global-plan',retryPlan);
  console.log('PG11_SELECTIVE_GLOBAL_RETRY_BROWSER_PASS');
  // [AUNEA-UAT-PG11-GLOBAL-RETRY-295] END
  // [AUNEA-UAT-PG11-GLOBAL-RESET-291] START — reanalysis button clears
  // historical global text synchronously; failed Ollama must not restore it.
  await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e),diagnostic=currentDiagnosticOutput(e);
    if(!diagnostic||!p||p.status!=='DRAFT')throw Error('Global PG11 UAT prerequisite missing');
    p.aiGlobal={tobeVersion:p.version,sourceSnapshotVersion:p.sourceSnapshotVersion,
      diagnosticInputHash:diagnostic.input_snapshot_hash,savedAt:now(),
      result:{status:'DRAFT',engagement_id:e.id,snapshot_version:p.sourceSnapshotVersion,
        input_hash:'UAT-OLD-GLOBAL',model:'fixture-no-ollama',
        summary:'ANTERIOR GLOBAL: no debe reaparecer.',
        opportunities:[{objective:'Antiguo objetivo',how:'Antigua acción.',
          why:'Justificación del análisis previo.',constraints:'',
          source_refs:[String(p.items[0].sourceStepId)]}]}};
    markDirty('QA: propuesta global obsoleta para regeneración');
    if(!saveState('Guardar fixture de regeneración global'))throw Error('Cannot persist global UAT fixture');
    render();
  });
  assert.match(await page.locator('#tobeGlobalAnalysis').innerText(),/ANTERIOR GLOBAL/);
  let unblockGlobal,notifyGlobal;
  const waitingGlobal=new Promise(resolve=>{unblockGlobal=resolve});
  const globalRequested=new Promise(resolve=>{notifyGlobal=resolve});
  const globalFailureRoute=async route=>{
    notifyGlobal();
    await waitingGlobal;
    await route.fulfill({status:409,contentType:'application/json',
      body:JSON.stringify({detail:'Generación de prueba no disponible'})});
  };
  const globalPlanRoute=async route=>{
    const payload=route.request().postDataJSON();
    await route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({engagement_id:payload.engagement.engagement_id,
        snapshot_version:payload.snapshot_version,input_hash:'UAT-SOURCE-HASH',
        focus:[{source_id:sourceIds[0],type:'STEP',label:'Actividad confirmada'}]})});
  };
  await page.route('**/v1/internal-ai/tobe-global-plan',globalPlanRoute);
  await page.route('**/v1/internal-ai/tobe-global',globalFailureRoute);
  // The browser smoke runs without the real 8010 backend: the existing local
  // /status fixture is authoritative for this isolated global-IA button test.
  await page.evaluate(()=>{state.backendOnline=true});
  // The real UI requests confirmation before replacing an existing global brief.
  // Playwright auto-dismisses unattended confirm dialogs, silently cancelling this UAT.
  // Accept this one explicit test dialog; production must keep its human confirmation gate.
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#analyzeTobeGlobal').click();
  const reachedGlobal=await Promise.race([
    globalRequested.then(()=>true),
    new Promise(resolve=>setTimeout(()=>resolve(false),12000))
  ]);
  if(!reachedGlobal)throw Error('Global IA endpoint not reached: '+
    await page.locator('#tobeGlobalAnalysis').innerText());
  const duringGlobal=await page.locator('#tobeGlobalAnalysis').innerText();
  assert.doesNotMatch(duringGlobal,/ANTERIOR GLOBAL|Antiguo objetivo|Antigua acción/,
    'the previous global recommendations must disappear while a new request runs');
  assert.match(duringGlobal,/Analizando por fuentes|Fuentes revisadas/);
  const storedReset=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e),
      stateOnDisk=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'),
      saved=stateOnDisk?.engagements?.find(x=>x.id===e.id)?.tobeProposals?.
        find(x=>x.version===p.version);
    return {oldInMemory:JSON.stringify(p.aiGlobal||{}).includes('ANTERIOR GLOBAL'),
      oldOnDisk:JSON.stringify(saved?.aiGlobal||{}).includes('ANTERIOR GLOBAL'),
      hasNewProgress:!!p.aiGlobal?.result?.progress};
  });
  assert.deepEqual(storedReset,{oldInMemory:false,oldOnDisk:false,
    hasNewProgress:true},
    'the previous global text is durably cleared and replaced by new run progress');
  unblockGlobal();
  await page.waitForFunction(()=>document.querySelector('#tobeGlobalAnalysis')?.textContent
    ?.includes('Generación de prueba no disponible'));
  const afterGlobal=await page.locator('#tobeGlobalAnalysis').innerText();
  assert.doesNotMatch(afterGlobal,/ANTERIOR GLOBAL|Antiguo objetivo|Antigua acción/,
    'a failed attempt must not restore outdated global cards');
  await page.unroute('**/v1/internal-ai/tobe-global',globalFailureRoute);
  await page.unroute('**/v1/internal-ai/tobe-global-plan',globalPlanRoute);
  console.log('PG11_GLOBAL_REANALYSIS_CLEAR_BROWSER_PASS');
  // [AUNEA-UAT-PG11-GLOBAL-RESET-291] END
  await page.unroute('**/v1/internal-ai/status',pg11StatusRoute);
  await page.unroute('**/health',retryHealth);
  await page.unroute('**/v1/internal-ai/tobe-review-basic',pg11ReviewRoute);
  await page.unroute('**/v1/internal-ai/tobe-step',pg11StepRoute);
  console.log('PG11_REVIEW_ONLY_CLICK_PASS: '+JSON.stringify({
    status:pg11RetryStatusHits,review:pg11RetryReviewHits,steps:pg11RetryStepHits}));
  // [AUNEA-UAT-PG11-REVIEW-ONLY-BROWSER-218] END
  // [AUNEA-UAT-PG11-CHECKPOINT-BROWSER-213] END

  // [AUNEA-UAT-PG11-BROWSER-204] START — real browser save/reload and AUNEA layout without Ollama.
  await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    if(!e||!p||p.status!=='DRAFT')throw Error('PG11 DRAFT missing');
    const diagnostic=currentDiagnosticOutput(e);
    if(!diagnostic)throw Error('PG11 diagnostic missing');
    diagnostic.input_snapshot_hash='DIAG_BROWSER_HASH';
    const key=internalAiPilotKey(e);
    if(!key)throw Error('PG11 preview key not available');
    const items=p.items.map((it,index)=>({
      source_step_id:String(it.sourceStepId),
      transformation:'Se modifica',
      problem_resolved:'Hipótesis de prueba '+(index+1),
      rationale:'Acción propuesta: ordenar la recepción. Resultado esperado: mejorar la trazabilidad. Justificación: existe un paso de origen.',
      future_actor:'',tool:'',inputs:'',outputs:'',automation_ai:'',
      human_supervision:'',controls_risk:'',source_refs:[String(it.sourceStepId)],
      limitations:'Pendiente de revisión humana'
    }));
    const first=items[0].source_step_id;
    __auneaAiPreview.set(key,{
      status:'DRAFT',engagement_id:e.id,snapshot_version:p.sourceSnapshotVersion,
      input_hash:'ENGAGEMENT_REQUEST_HASH_DISTINCT',
      model:'fixture-sin-ollama',items,
      review:{status:'CHECKED_WITH_NOTES',summary:'Revisión QA sintética.',
        protocol_revision:__auneaPg11ReviewProtocol,requires_human_review:true,
        blocking_step_ids:[first],
        issues:[{step_id:first,category:'BLOCKING',issue:'Transformación incoherente en UAT',
          evidence:'Hallazgo de prueba',action:'Revisión del consultor'}]}
    });
    internalAiPilotRefreshPanel(e);
  });
  assert.equal(await page.evaluate(()=>document.querySelector('#tobeAiWorkspace')?.open),true,
    'PG11 must preserve the consultant-opened IA audit across same-version rerenders');
  // Use the same user interaction as production. A native details toggle fires
  // asynchronously; wait for its settled state before asserting layout.
  await page.locator('#tobeAiWorkspace > summary').click();
  await page.waitForFunction(()=>document.querySelector('#tobeAiWorkspace')?.open===false);
  const uiOrder=await page.evaluate(()=>{
    const content=document.querySelector('.tobe-workspace');
    const ai=content?.querySelector('#tobeAiWorkspace'),map=content?.querySelector('.tobe-map-area'),
      inspector=content?.querySelector('#tobeInspector');
    return {mapBeforeInspector:!!map&&!!inspector&&
        map.compareDocumentPosition(inspector)===Node.DOCUMENT_POSITION_FOLLOWING,
      inspectorBeforeAi:!!ai&&!!inspector&&
        inspector.compareDocumentPosition(ai)===Node.DOCUMENT_POSITION_FOLLOWING,
      aiCollapsed:!!ai&&!ai.open};
  });
  assert.deepEqual(uiOrder,{mapBeforeInspector:true,inspectorBeforeAi:true,aiCollapsed:true},
    'PG11 must open on the source-derived process map, with IA audit collapsed below each activity');
  await page.locator('#tobeAiWorkspace > summary').click();
  assert.equal(await page.locator('#tobeAiPilotStatus .pg11-ai-step').count(),tobeSteps);
  assert.match(await page.locator('#tobeAiPilotStatus').innerText(),/pendiente de guardar/);
  assert.equal(await page.locator('#applyTobeAiPilot').count(),0,'blocked suggestions never apply');
  const pg11Layout=await page.evaluate(()=>{
    const panel=document.querySelector('#tobeAiWorkspace');
    const card=panel.querySelector('.pg11-ai-step');
    const panelRect=panel.getBoundingClientRect(),cardRect=card.getBoundingClientRect();
    const padding=parseFloat(getComputedStyle(panel).paddingLeft);
    return {padding,contained:cardRect.left>=panelRect.left+padding-2&&
      cardRect.right<=panelRect.right-padding+2,
      pageOverflow:document.documentElement.scrollWidth>window.innerWidth+2};
  });
  assert.ok(pg11Layout.padding>=18,'PG11 AUNEA card must have real padding');
  assert.equal(pg11Layout.contained,true,'PG11 activity cards must respect panel margins');
  assert.equal(pg11Layout.pageOverflow,false,'PG11 must not create horizontal page overflow');
  await page.screenshot({path:path.join(outDir,'pg11-aunea-consultant-desktop.png'),fullPage:true});
  await page.locator('#saveTobeAiPilot').click();
  const savedAi=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY));
    const disk=stored.engagements.find(x=>x.id===e.id)?.tobeProposals?.find(x=>x.version===p.version);
    return disk?.aiDraft||null;
  });
  assert.ok(savedAi,'explicit save must persist the AI proposal within the versioned TO-BE');
  assert.equal(savedAi.diagnosticInputHash,'DIAG_BROWSER_HASH');
  assert.equal(savedAi.proposal.input_hash,'ENGAGEMENT_REQUEST_HASH_DISTINCT');
  assert.equal(savedAi.proposal.items.length,tobeSteps);
  assert.deepEqual(savedAi.proposal.review.blocking_step_ids.length,1);
  assert.equal(Object.hasOwn(savedAi.proposal,'context_traces'),false,'HTTP audit stays ephemeral');
  await page.evaluate(()=>{document.querySelector('#tobeAiWorkspace').open=true;});
  assert.match(await page.locator('#tobeAiPilotStatus').innerText(),/guardada en el borrador/);
  // [AUNEA-UAT-PG11-BROWSER-204] END
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-page="uat"]').click();
  const afterReload=await page.evaluate(()=>state.engagements.filter(e=>e.id.startsWith('UAT3-CASE-')).map(e=>e.id));
  assert.deepEqual(afterReload,ids,'The single UAT study must survive a native browser reload.');

  // [AUNEA-UAT-PG11-BROWSER-204] RESTORE — re-open PG11 without any provider call.
  await page.evaluate(()=>{
    const e=state.engagements.find(x=>x.id.startsWith('UAT3-CASE-'));
    if(!e)throw Error('Saved PG11 study missing after reload');
    state.activeEngagementId=e.id;
    state.activePage='tobe';
    render();
  });
  assert.equal(await page.locator('#tobeAiWorkspace').isVisible(),true,
    'saved IA review disclosure must remain available below the map');
  await page.locator('#tobeAiWorkspace > summary').click();
  assert.equal(await page.locator('#tobeAiPilotStatus .pg11-ai-step').count(),tobeSteps,
    'saved AI proposals must be visible after native Chromium reload');
  assert.match(await page.locator('#tobeAiPilotStatus').innerText(),/recuperada del borrador guardado/);
  assert.equal(await page.locator('#applyTobeAiPilot').count(),0,
    'reloaded blocked proposal must remain unapplicable');
  await page.setViewportSize({width:550,height:820});
  const mobile=await page.evaluate(()=>{
    const panel=document.querySelector('#tobeAiWorkspace');
    const card=panel.querySelector('.pg11-ai-step');
    const p=panel.getBoundingClientRect(),c=card.getBoundingClientRect();
    return {padding:parseFloat(getComputedStyle(panel).paddingLeft),
      contained:c.left>=p.left+10&&c.right<=p.right-10,
      overflow:document.documentElement.scrollWidth>window.innerWidth+2};
  });
  assert.equal(mobile.contained,true,'PG11 cards must respect mobile margins');
  assert.equal(mobile.overflow,false,'PG11 must not overflow mobile viewport');
  await page.screenshot({path:path.join(outDir,'pg11-aunea-consultant-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1365,height:900});
  console.log('PG11_AI_DRAFT_BROWSER_PASS: saved, restored, blocked, responsive without Ollama');

  // [AUNEA-UAT-PG11-PG12-BROWSER-238] START — new source-linked activity,
  // guarded route rewiring, durable TO-BE version and read-only PG12 dual map.
  if(sourceIds.length<2)throw Error('Future-flow browser fixture requires two source activities');
  await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[0]+'"]').first().click();
  await page.locator('.tobe-guided-modes [data-tobe-mode-switch="guided"]').click();
  assert.equal(await page.locator('.tobe-review-steps').isVisible(),true,
    'guided review must expose only its three named sections');
  assert.equal(await page.locator('#tobeStepRoutes').isVisible(),false,
    'route editor may not appear in activity review');
  assert.equal(await page.locator('.tobe-review-steps [data-tobe-mode-switch="map"]').count(),0,
    '03.4 Connect may not masquerade as an activity-review step');
  await page.locator('.tobe-guided-modes [data-tobe-mode-switch="map"]').click();
  assert.equal(await page.locator('#tobeStepRoutes').isVisible(),true,
    'route editor must be available in Mapa TO-BE');
  assert.equal(await page.locator('.tobe-review-steps').isVisible(),false,
    'activity stage shortcuts must not duplicate map controls');
  await page.locator('#addTobeStep').click();
  await page.locator('.tobe-guided-modes [data-tobe-mode-switch="guided"]').click();
  const addition=await page.evaluate(()=>{
    const e=currentEng(),p=latestTobe(e);
    return p.flow?.addedSteps?.at(-1)||null;
  });
  assert.equal(addition?.sourceStepId,sourceIds[0],
    'new future activity must retain a confirmed AS-IS source');
  assert.ok(addition?.id,'new activity needs a stable TO-BE-only ID');
  await page.locator('#tobeInspector [data-tobe-field="stepName"]').fill('Control adicional UAT');
  await page.locator('#tobeInspector [data-tobe-field="problemResolved"]').fill(
    'Validar entradas faltantes antes de continuar al siguiente paso');
  // Future actor uses the AUNEA canonical catalogue dropdown, never a text field.
  await page.locator('#tobeInspector [data-tobe-catalog-field="futureActor"] .aunea-select > summary').click();
  await page.locator('#tobeInspector [data-tobe-catalog-field="futureActor"] [data-aunea-select-option][data-value="MANAGER"]').click();
  assert.equal(await page.locator('#tobeInspector [data-tobe-catalog-field="futureActor"] [data-model-set]').inputValue(),'MANAGER');
  const newRoute=await page.evaluate(({nextId,addedId})=>{
    const t=document.querySelector('#tobeInspector [data-tobe-field="transformation"]');
    const r=document.querySelector('[data-tobe-route="normal"][data-tobe-route-step="'+addedId+'"]');
    if(!t||!r)throw Error('Future-step controls missing');
    t.value='Se incorpora control';r.value=nextId;
    t.dispatchEvent(new Event('change',{bubbles:true}));
    r.dispatchEvent(new Event('change',{bubbles:true}));
    return {transformation:t.value,normal:r.value};
  },{nextId:sourceIds[1],addedId:addition.id});
  assert.equal(newRoute.transformation,'Se incorpora control');
  await page.locator('.tobe-guided-tabs [data-tobe-select="'+sourceIds[0]+'"]').first().click();
  await page.evaluate(({addedId,firstId})=>{
    const r=document.querySelector('[data-tobe-route="normal"][data-tobe-route-step="'+firstId+'"]');
    if(!r)throw Error('Original step routing selector missing');
    r.value=addedId;r.dispatchEvent(new Event('change',{bubbles:true}));
  },{addedId:addition.id,firstId:sourceIds[0]});
  await page.locator('#saveTobe').click();
  const routed=await page.evaluate(({addedId,firstId,nextId})=>{
    const e=currentEng(),p=latestTobe(e),disk=JSON.parse(localStorage.getItem(STORAGE_KEY));
    const saved=disk.engagements.find(x=>x.id===e.id)?.tobeProposals?.find(x=>x.version===p.version);
    const next=saved?.flow?.addedSteps?.find(x=>x.id===addedId);
    return {name:next?.stepName,source:next?.sourceStepId,
      from:saved?.flow?.routes?.[firstId]?.normal,
      to:saved?.flow?.routes?.[addedId]?.normal,
      integrity:tobeFlowIntegrity(e,p),
      sourceUntouched:confirmedSnapshot(e).processSteps.some(x=>x.id===firstId&&
        x.normal_next_step!==addedId)};
  },{addedId:addition.id,firstId:sourceIds[0],nextId:sourceIds[1]});
  assert.equal(routed.name,'Control adicional UAT');
  assert.equal(routed.source,sourceIds[0]);
  assert.equal(routed.from,addition.id);
  assert.equal(routed.to,sourceIds[1]);
  assert.equal(routed.integrity,null,'explicit future route must be connected');
  assert.equal(routed.sourceUntouched,true,'future routing must not overwrite confirmed AS-IS');
  await page.screenshot({path:path.join(outDir,'pg11-future-flow-source-linked.png'),fullPage:true});
  // Visualization fixture only: explicit REVIEWED status bypasses real gates here;
  // behavioral lifecycle approval remains covered separately by runtime/readiness tests.
  await page.evaluate(()=>{
    const e=currentEng();latestTobe(e).status='REVIEWED';
    state.activePage='comparacion';render();
  });
  assert.equal(await page.locator('.pg12-map').count(),2);
  assert.equal(await page.locator('.pg12-map .tobe-graph-node').count(),
    tobeSteps+1,'PG12 must include the newly linked future step');
  await page.locator('[data-pg12-view="actual"]').click();
  assert.equal(await page.locator('.pg12-map').count(),1);
  await page.locator('[data-pg12-view="proposed"]').click();
  assert.equal(await page.locator('.pg12-map').count(),1);
  await page.locator('[data-pg12-view="comparison"]').click();
  assert.equal(await page.locator('.pg12-map').count(),2);
  await page.locator('[data-pg12-source="'+addition.id+'"]').first().click();
  assert.match(await page.locator('#pg12SelectedDetail').innerText(),/Control adicional UAT/);
  await page.screenshot({path:path.join(outDir,'pg12-actual-proposed-comparison.png'),fullPage:true});
  console.log('PG11_PG12_SOURCE_LINKED_BROWSER_PASS: routes and versioned comparison');
  // [AUNEA-UAT-PG11-PG12-BROWSER-238] END

  assert.deepEqual(failures,[],'Unhandled browser JS errors: '+failures.join(' / '));
  process.stdout.write('CHROMIUM_UAT_PASS: 1 study generated, navigated and recovered after reload.\n');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(err=>{console.error('CHROMIUM_UAT_FAIL:',err.stack||err);process.exitCode=1});
// [AUNEA-UAT-BROWSER-130] END
