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
