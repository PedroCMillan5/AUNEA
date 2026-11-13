// [AUNEA-UI-COMPONENT-INVENTORY-390] START — Read-only full-frontend component inventory.
// SOURCE: DESIGN_SYSTEM_AUNEA; TOKENS_AUNEA; CATALOGO_COMPONENTES_AUNEA DS-001..020;
// PROJECT_RULES v1.7; DEC-050/056; FROZEN_PAGES.json.
// PURPOSE: Audit every runtime module, CSS owner and major screen family before F1/F2.
// Run: node tools/aunea-design-system-audit.cjs > aunea-design-inventory.json
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),front=path.join(root,'3_SYSTEM/frontend');
const read=p=>fs.readFileSync(path.join(front,p),'utf8');
const manifest=JSON.parse(read('module-manifest.json')).modules;
const frozen=JSON.parse(read('FROZEN_PAGES.json')).frozen_pages.map(x=>({page:x.page_id,screen:x.screen_id,gate:x.gate}));
const catalogs=require('./aunea-ui-component-map.cjs');
const rootCss=read('styles.css'),layoutCss=read('ui-system.css');
const styles=new Map(),cssRuleGroups=new Map();
function rules(source,owner){
  let start=0,str='',comment=false,stack=[];
  for(let i=0;i<source.length;i++){
    const c=source[i],n=source[i+1];
    if(comment){if(c==='*'&&n==='/'){comment=false;i++}continue}
    if(str){if(c==='\\')i++;else if(c===str)str='';continue}
    if(c==='/'&&n==='*'){comment=true;i++;continue}
    if(c==="'"||c==='"'){str=c;continue}
    if(c==='{'){
      const selector=source.slice(start,i).replace(/\/\*[\s\S]*?\*\//g,'').trim();
      stack.push({selector,start:i});start=i+1;
    }else if(c==='}'){
      const item=stack.pop();start=i+1;
      if(!item||item.selector.startsWith('@'))continue;
      const ctx=stack.filter(x=>x.selector.startsWith('@')).map(x=>x.selector).join(' > ');
      const group=ctx+' | '+item.selector;
      if(!cssRuleGroups.has(group))cssRuleGroups.set(group,[]);
      cssRuleGroups.get(group).push({owner,line:source.slice(0,item.start).split('\n').length});
      for(const m of item.selector.matchAll(/\.([A-Za-z_][\w-]*)/g)){
        const name=m[1],s=styles.get(name)||{name,cssFiles:new Set(),cssRules:0,consumers:new Set(),frozenRisk:false};
        s.cssFiles.add(owner);s.cssRules++;styles.set(name,s);
      }
    }
  }
}
rules(rootCss,'styles.css');rules(layoutCss,'ui-system.css');
const modules=[],foundBy=new Map(),screenFamilies={
  'CRM / PG00': ['core/state.js','ui/shell.js','domain/company.js','domain/contact.js','domain/interaction.js','domain/opportunity.js','pages/crm-companies.js','pages/crm-contacts.js','pages/crm-interactions.js','pages/crm-opportunities.js','domain/engagement.js'],
  'Sesión / PG01–PG09': ['pages/diagnostic-stages.js','domain/process.js','domain/risk.js','domain/economics.js','domain/process-lifecycle.js','domain/no-reask.js','ui/renderer.js','pages/session-display.js'],
  'Resultados / PG10': ['pages/results.js','pages/results-analysis.js','domain/analysis-workbench.js','domain/internal-ai-global-quality.js','domain/result-context.js'],
  'Trabajo interno / PG11': ['pages/tobe.js','pages/tobe-flow.js','pages/tobe-global.js','pages/internal-work-events.js','domain/tobe-model.js','domain/tobe-transactions.js','domain/internal-ai-pilot.js'],
  'Comparación / posterior': ['pages/comparison.js','pages/projects.js','domain/project.js','domain/completion.js','domain/output-review.js'],
  'Transversal / engine': ['services/backend-client.js','services/engine-adapter.js','services/persistence.js','services/schema.js','ui/renderer.js','ui/shell.js']
};
function familyNames(modulePath){return Object.entries(screenFamilies).filter(([,paths])=>paths.includes(modulePath)).map(([name])=>name);}
for(const m of manifest){
  const text=read(m.path),used=new Set(),literalClassTokens=[...text.matchAll(/\bclass\s*=\s*["']([^"'<>]*)["']/g)];
  for(const match of literalClassTokens){
    for(const name of match[1].split(/\s+/)){
      if(/^[A-Za-z_][\w-]+$/.test(name)&&styles.has(name))used.add(name);
    }
  }
  // Broad textual references catch querySelector/classList and dynamic templates
  // but are candidates; a static absence never proves unused CSS.
  for(const name of styles.keys()){
    const expression=new RegExp('(?:["\x60.\\s])'+name.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')+'(?:["\x60.\\s]|$)');
    if(expression.test(text))used.add(name);
  }
  const f=familyNames(m.path),view=m.path.startsWith('pages/')||m.path==='ui/shell.js';
  for(const cls of used){styles.get(cls).consumers.add(m.path);if(f.some(x=>x==='CRM / PG00'||x==='Sesión / PG01–PG09'))styles.get(cls).frozenRisk=true;}
  modules.push({path:m.path,layer:m.layer,blockId:m.block_id,lines:text.split('\n').length,
    family:f,view,inlineStyleAttributes:(text.match(/style="/g)||[]).length,referencedCssClasses:[...used].sort()});
}
const css=[...styles.values()].map(v=>({className:v.name,ownerFiles:[...v.cssFiles],ruleOccurrences:v.cssRules,
  runtimeConsumers:[...v.consumers],frozenRisk:v.frozenRisk,
  classification:v.cssFiles.size>1?'CROSS_FILE_OWNER_REVIEW':v.consumers.size?'REFERENCED':'REVIEW_DYNAMIC_OR_HTML'})).sort((a,b)=>a.className.localeCompare(b.className));
const duplicatedSelectors=[...cssRuleGroups].filter(([,group])=>group.length>1).map(([selectorContext,owners])=>({selectorContext,owners})).sort((a,b)=>b.owners.length-a.owners.length);
const ds=Object.fromEntries(Object.entries(catalogs).map(([id,meta])=>[id,{...meta,
  cssCandidates:meta.selector.filter(name=>styles.has(name)).map(name=>({name,owners:[...styles.get(name).cssFiles],consumers:[...styles.get(name).consumers]})),
  note:'Componente documental, no implica implementación única de HTML o comportamiento'}]));
// F1 CSS ownership resolution, not an assertion that the user approved the visual design.
// Two CSS files are intentional: shared base owns primitives, layout owns screen-specific overrides.
// A class referenced in shell/static HTML may be FROZEN even without a JS literal consumer.
const cssLookup=new Map(css.map(item=>[item.className,item]));
const permittedStatuses=['GLOBAL','SCOPED_EXCEPTION','FROZEN_PROTECTED','OBSOLETE_PROVEN','PENDING_BROWSER_QA'];
const frozenChrome=new Set([
  'app-shell','avatar','blocker-list','breadcrumb','console-chip','context-label',
  'field-pending','is-decision','offline','online','rail-context-actions',
  'save-state','sidebar-foot','topbar','topbar-left','topbar-right'
]);
const workScope=/^\s*\.(?:tobe(?:-|[.#:\[]|$)|pg10(?:-|[.#:\[]|$)|pg11(?:-|[.#:\[]|$)|pg12(?:-|[.#:\[]|$))/;
const crossFileClasses=css.filter(item=>item.ownerFiles.length>1).map(item=>{
  const protectedByFrozen=item.frozenRisk||frozenChrome.has(item.className);
  const scoped=item.className==='aunea-ui-section-caption';
  return {
    className:item.className,ownerFiles:item.ownerFiles,consumers:item.runtimeConsumers,
    status:protectedByFrozen?'FROZEN_PROTECTED':scoped?'SCOPED_EXCEPTION':'PENDING_BROWSER_QA',
    reason:protectedByFrozen?'Shared shell, CRM or diagnostic family; preserve FROZEN cascade':
      scoped?'styles.css owns typography; PG11 owns only local caption placement':
      'Additional runtime/browser inspection required; no speculative deletion',
    baseOwner:'styles.css',exceptionOwner:'ui-system.css',
    browserVerified:false,manualVisualReviewRequired:true
  };
});
const repeatedSelectorContexts=duplicatedSelectors.map(item=>{
  const classNames=[...new Set([...item.selectorContext.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m=>m[1]))];
  const rawSelector=item.selectorContext.split(' | ').at(-1).trim();
  const scoped=(workScope.test(rawSelector)||/^\s*\.asis-(?:confirmed-data-heading|data-group|data-pairs)(?:\b|>)/.test(rawSelector))&&
    !rawSelector.includes('body.page-')&&!rawSelector.includes(':has(.diagnostic-stage-');
  const isGlobal=!classNames.length;
  const protectedByFrozen=/^\s*\.topbar-(?:center|active-study)(?:\b|[.:>#])/i.test(rawSelector)||
    (!scoped&&(isGlobal||classNames.some(name=>
    cssLookup.get(name)?.frozenRisk||frozenChrome.has(name))));
  const status=protectedByFrozen?'FROZEN_PROTECTED':scoped?'SCOPED_EXCEPTION':'PENDING_BROWSER_QA';
  return {selectorContext:item.selectorContext,occurrences:item.owners.length,
    owners:item.owners,cssClasses:classNames,status,
    reason:protectedByFrozen?'Base or CRM/session cascade, protect approved FROZEN surfaces':
      scoped?'Page-scoped PG10/PG11/PG12 cascade, including distinct layout/state rules; preserve justified variants':
      'Shared or unscoped selector requires browser and source-owner inspection',
    browserVerified:false,manualVisualReviewRequired:true};
});
const counts={
  crossFileClasses:crossFileClasses.length,selectorContexts:repeatedSelectorContexts.length,
  protectedClasses:crossFileClasses.filter(x=>x.status==='FROZEN_PROTECTED').length,
  protectedSelectorContexts:repeatedSelectorContexts.filter(x=>x.status==='FROZEN_PROTECTED').length,
  scopedClassExceptions:crossFileClasses.filter(x=>x.status==='SCOPED_EXCEPTION').length,
  scopedSelectorExceptions:repeatedSelectorContexts.filter(x=>x.status==='SCOPED_EXCEPTION').length,
  unresolvedClasses:crossFileClasses.filter(x=>x.status==='PENDING_BROWSER_QA').length,
  unresolvedSelectorContexts:repeatedSelectorContexts.filter(x=>x.status==='PENDING_BROWSER_QA').length,
  browserApproved:0
};
const ownershipTriage={method:'STATIC_OWNER_RESOLUTION_PENDING_MANUAL_VISUAL_APPROVAL',
  permittedStatuses,crossFileClasses,repeatedSelectorContexts,counts};

const result={
  status:'STATIC_DESIGN_INVENTORY',scope:'46 runtime JS files, 2 CSS, 9 FROZEN pages; read-only and heuristic',
  restrictions:['No modify FROZEN','No infer dead CSS from static absence','No move backend calculations or data owners'],
  metrics:{modules:modules.length,cssClasses:css.length,classesCrossFile:css.filter(x=>x.ownerFiles.length>1).length,
    repeatedSelectorContextGroups:duplicatedSelectors.length,
    documentedComponents:Object.keys(ds).length,inlineStyleAttributes:modules.reduce((n,x)=>n+x.inlineStyleAttributes,0)},
  frozen,screenFamilies,components:ds,modules,css,duplicatedSelectors,ownershipTriage
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
// [AUNEA-UI-COMPONENT-INVENTORY-390] END
