// [AUNEA-UAT-UI-ACCESSIBILITY-L4-487] START — computed accessibility evidence.
'use strict';
// PURPOSE: Audit actual Chromium style contrast, keyboard focus, responsive reflow and reduced motion.
// SOURCE: UI/UX master contract L4; WCAG 2.2; official AUNEA System color tokens.
// BOUNDARY: only PG11, PG12; no claim of full-site WCAG certification or approved colour percentages.
// SIDE EFFECTS: test viewport/navigation only. No write to canonical business state.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

async function runUiL4L5Browser({page,outDir}){
  const business=()=>page.evaluate(()=>JSON.stringify({
    answers:currentEng()?.answers,items:latestTobe(currentEng())?.items,projects:state.projects
  }));
  const before=await business(),colorEvidence=[];
  for(const scene of [
    {page:'comparacion',name:'PG12',selector:'.pg12-workspace .pg12-view-selector .btn'},
    {page:'tobe',name:'PG11',selector:'.tobe-workspace [data-tobe-mode-switch]'}
  ]){
    await page.evaluate(id=>{state.activePage=id;render()},scene.page);
    await page.locator(scene.selector).first().waitFor();
    for(const width of [1365,768,390]){
      await page.setViewportSize({width,height:width===390?844:900});
      const measure=await page.evaluate(selector=>{
        const rgb=s=>{const m=/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/.exec(s);
          return m?[+m[1],+m[2],+m[3]]:null;};
        const luminance=s=>{const r=rgb(s);if(!r)return null;
          const [a,b,c]=r.map(n=>{const x=n/255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;});
          return a*0.2126+b*0.7152+c*0.0722;};
        const contrast=(fg,bg)=>{const x=luminance(fg),y=luminance(bg);
          return x===null||y===null?null:(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
        return {
          scrollWidth:document.documentElement.scrollWidth,
          controls:[...document.querySelectorAll(selector)].map(el=>{
            const s=getComputedStyle(el),r=el.getBoundingClientRect();
            return {label:el.textContent.trim(),pressed:el.getAttribute('aria-pressed'),
              color:s.color,background:s.backgroundColor,contrast:contrast(s.color,s.backgroundColor),
              width:r.width,height:r.height};
          })
        };
      },scene.selector);
      assert.ok(measure.controls.length>=2,scene.name+' needs two view buttons');
      assert.equal(measure.controls.filter(x=>x.pressed==='true').length,1,
        scene.name+' must have one selected view');
      for(const b of measure.controls){
        assert.ok(b.contrast!==null&&b.contrast>=4.5,
          scene.name+' '+b.label+' text contrast below WCAG AA: '+b.contrast);
        assert.ok(b.width>=24&&b.height>=24,scene.name+' button target too small');
      }
      assert.ok(measure.scrollWidth<=width+2,
        scene.name+' page-level overflow at '+width+': '+measure.scrollWidth);
      colorEvidence.push({scene:scene.name,width,...measure});
      if([1365,390].includes(width)){
        await page.screenshot({path:path.join(outDir,'l4-'+scene.name.toLowerCase()+'-'+width+'.png'),
          fullPage:false,animations:'disabled'});
      }
    }
    await page.keyboard.press('Tab');
    await page.locator(scene.selector).first().focus();
    const focus=await page.locator(scene.selector).first().evaluate(el=>{
      const s=getComputedStyle(el);
      return {visible:el.matches(':focus-visible'),width:parseFloat(s.outlineWidth),
        color:s.outlineColor};
    });
    assert.ok(focus.visible&&focus.width>=3,
      scene.name+' keyboard focus ring absent: '+JSON.stringify(focus));
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{state.activePage='comparacion';render()});
  const reduced=await page.locator('.pg12-view-selector .btn').first().evaluate(el=>{
    const s=getComputedStyle(el);return {animation:s.animationDuration,transition:s.transitionDuration};
  });
  assert.ok(reduced.transition.split(',').every(x=>parseFloat(x)<=0.001),
    'L4 reduced motion must suppress opt-in transitions');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await business(),before,'L4 visual QA must not mutate canonical owners');
  fs.writeFileSync(path.join(outDir,'l4-computed-accessibility.json'),
    JSON.stringify({status:'AUTOMATED_COMPUTED_PASS_NOT_HUMAN_SIGNOFF',
      scope:'Only PG11/PG12 active view buttons; no full product WCAG or colour-percentage claim',
      measured:colorEvidence,reducedMotion:reduced,ownerSnapshotUnchanged:true},null,2));
  console.log('L4_COMPUTED_COLOR_RESPONSIVE_BROWSER_PASS: '+colorEvidence.length+
    ' viewport/color audits, keyboard focus, reduced motion, owners unchanged');
  // [AUNEA-UAT-UI-ACCESSIBILITY-L4-487] END

  // [AUNEA-UAT-UI-CROSS-PAGE-L5-488] START — source-linked presentation-only journey.
  // Existing same-run fixtures separately verify CRM (9 FROZEN pages), PG01–09,
  // PG11 approvals/undo/reload and PG12 one-map overlay. This matrix adds PG10+/projects.
  const screens=[
    {id:'resultados',name:'PG10',selector:'.pg10-overview-metrics'},
    {id:'tobe',name:'PG11',selector:'.tobe-workspace'},
    {id:'comparacion',name:'PG12',selector:'.pg12-workspace'},
    {id:'proyectos',name:'Proyectos',selector:'#content h1'},
    {id:'implementacion',name:'Implementación',selector:'#content h1'}
  ],coverage=[];
  for(const scene of screens){
    await page.evaluate(id=>{state.activePage=id;render()},scene.id);
    await page.locator(scene.selector).first().waitFor({timeout:10000});
    const visible=await page.evaluate(sel=>{
      const c=document.getElementById('content'),e=document.querySelector(sel);
      return {page:state.activePage,title:c?.querySelector('h1')?.textContent?.trim()||'',
        hasContent:!!c?.textContent?.trim(),targetVisible:!!e&&getComputedStyle(e).display!=='none'};
    },scene.selector);
    assert.equal(visible.page,scene.id,'Wrong L5 route '+scene.name);
    assert.ok(visible.hasContent&&visible.targetVisible,'Empty L5 view '+scene.name);
    // Extra responsive matrix on PG10 and delivery; maps/tables may scroll internally,
    // but the document itself must not require horizontal scrolling.
    if(['resultados','proyectos','implementacion'].includes(scene.id)){
      for(const width of [1365,768,390]){
        await page.setViewportSize({width,height:width===390?844:900});
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
        assert.ok(overflow<=2,scene.name+' document overflow '+overflow+'px at '+width);
        if(scene.id==='resultados'){
          const spacing=await page.evaluate(()=>{
            const grid=document.querySelector('.diagnosis-reference-grid');
            const next=grid?.nextElementSibling;
            if(!grid||!next)return null;
            return {marginBottom:parseFloat(getComputedStyle(grid).marginBottom),
              visualGap:next.getBoundingClientRect().top-grid.getBoundingClientRect().bottom,
              nextElement:next.className||next.tagName};
          });
          assert.ok(spacing,'PG10 reference cards and AS-IS map must both exist');
          assert.ok(spacing.marginBottom>=16,
            'PG10 reference grid must use shared 16px spacing before the map');
          assert.ok(spacing.visualGap>=15.5,
            'PG10 cards must not touch the following map at '+width+'px; measured '+spacing.visualGap);
          if(width===1365)console.log('PG10_CARD_MAP_VERTICAL_GAP_PASS: '+
            JSON.stringify(spacing));
        }
        if(width===390)await page.screenshot({
          path:path.join(outDir,'l5-'+scene.id+'-390.png'),fullPage:false,animations:'disabled'
        });
      }
    }
    // [AUNEA-UAT-UI-ACTION-COMPUTED-491] START — live visual-button ownership audit.
    // A link that looks like a button must not retain the browser's default underline.
    // Check every button-like link in non-FROZEN views, not only the screenshot example.
    const actionLinks=await page.evaluate(()=>{
      const links=[...document.querySelectorAll('#content a.btn')];
      return links.map(node=>{
        const style=getComputedStyle(node),r=node.getBoundingClientRect();
        return {label:node.textContent.trim(),href:node.getAttribute('href'),
          underlined:style.textDecorationLine.includes('underline'),
          optIn:node.classList.contains('aunea-ui-action-link'),
          marginTop:parseFloat(style.marginBlockStart),width:r.width,height:r.height};
      });
    });
    for(const link of actionLinks){
      assert.ok(link.optIn,scene.name+' has a button-like anchor without the common visual owner: '+link.label);
      assert.equal(link.underlined,false,scene.name+' link pretending to be button is underlined: '+link.label);
      assert.ok(link.marginTop>=12,
        scene.name+' link-as-action missing shared margin token: '+link.label);
    }
    if(scene.id==='resultados'){
      const matched=actionLinks.filter(x=>x.href?.startsWith('#asis-source-step-'));
      // The synthetic backend can produce no confirmed pain. In that case, check
      // the production opt-in style on a disposable anchor; Node checks source markup.
      // Never claim it was rendered by the business fixture.
      const measured=matched.length?matched:await page.evaluate(()=>{
        const probe=document.createElement('a');
        probe.className='btn btn-outline aunea-ui-action-link aunea-ui-after-content';
        probe.href='#asis-source-step-ui-qa-probe';
        probe.textContent='Ver punto de análisis en esta página';
        document.getElementById('content').appendChild(probe);
        const style=getComputedStyle(probe);
        const output={label:probe.textContent,href:probe.getAttribute('href'),
          underlined:style.textDecorationLine.includes('underline'),
          optIn:probe.classList.contains('aunea-ui-action-link'),
          marginTop:parseFloat(style.marginBlockStart),
          width:probe.getBoundingClientRect().width};
        probe.remove();
        return [output];
      });
      assert.ok(measured.length>0,'PG10 link style must be measurable');
      for(const link of measured){
        assert.equal(link.underlined,false,'PG10 action must not inherit link underline');
        assert.ok(link.optIn&&link.marginTop>=12,'PG10 action must consume shared visual and spacing tokens');
      }
      console.log((matched.length?'PG10_ACTION_LINK_COMPUTED_PASS':'PG10_ACTION_LINK_CSS_PROBE_PASS')+': '+
        JSON.stringify(measured.map(({label,underlined,marginTop})=>({label,underlined,marginTop}))));
    }
    // [AUNEA-UAT-UI-ACTION-COMPUTED-491] END
    coverage.push({screen:scene.name,...visible});
  }
  assert.equal(await business(),before,'L5 read-only navigation must not change AS-IS, TO-BE or Projects');
  fs.writeFileSync(path.join(outDir,'l5-technical-journey-matrix.json'),
    JSON.stringify({status:'TECHNICAL_REVIEW_NOT_USER_ACCEPTANCE',
      frozen:'18/18 pixel-equivalent separately in this browser run',
      earlier:'PG01–PG09 validation, PG11 preview/decision/undo/reload, PG12 native map tested earlier',
      nonFrozen:coverage,ownerSnapshotUnchanged:true,
      pending:['manual F6 visual signoff','field accessibility audit','real user UX','production acceptance']},null,2));
  console.log('L5_CROSS_PAGE_TECHNICAL_BROWSER_PASS: '+coverage.map(x=>x.screen).join(', ')+
    '; owner snapshots unchanged');
  // [AUNEA-UAT-UI-CROSS-PAGE-L5-488] END
}
module.exports=runUiL4L5Browser;
