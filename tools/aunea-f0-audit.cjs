// AUNEA Internal F0 — read-only, reproducible repository inventory.
// Run from the repository root: node tools/aunea-f0-audit.cjs > f0-inventory.json
// Produces JSON on stdout. Does not modify code, data, snapshots or documents.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const slash=p=>p.split(path.sep).join('/');
const file=p=>path.join(root,p);
const ignore=new Set(['.git','node_modules','__pycache__','.venv','venv','.pytest_cache','.mypy_cache','dist','build','test-results','playwright-report']);
function walk(dir,archived=false){
  const out=[];
  if(!fs.existsSync(dir))return out;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignore.has(ent.name))continue;
    const full=path.join(dir,ent.name);
    const rel=slash(path.relative(root,full));
    const isArchive=archived||/(^|\/)(?:99_ARCHIVO_TECNICO|ARCHIVED|ARCHIVE|archive|archived)(\/|$)/i.test(rel);
    if(ent.isDirectory())out.push(...walk(full,isArchive));
    else if(ent.isFile())out.push({path:rel,archived:isArchive});
  }
  return out;
}
const files=walk(root);
const active=files.filter(x=>!x.archived),historical=files.filter(x=>x.archived);
const byPath=new Map(files.map(x=>[x.path,x]));
const read=p=>fs.readFileSync(file(p),'utf8');
const lineCount=s=>s.split(/\r?\n/).length;
const checksum=s=>crypto.createHash('sha256').update(s).digest('hex');
const manifest=JSON.parse(read('3_SYSTEM/frontend/module-manifest.json')).modules;
const scripts=[...read('3_SYSTEM/frontend/index.html').matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
const frozen=JSON.parse(read('3_SYSTEM/frontend/FROZEN_PAGES.json')).frozen_pages;
const index=read('CODE_BLOCK_INDEX.md');
const owners=new Map(),indexPaths=new Set();
for(const line of index.split(/\r?\n/)){
  if(!/^\|\s*AUNEA-[A-Z0-9-]+\s*\|/.test(line))continue;
  const pieces=line.split('|'),id=pieces[1].trim(),raw=pieces[2].trim();
  const paths=raw.split(/\s*;\s*|\s+\+\s+/).filter(x=>/^3_SYSTEM\/|^\.github\//.test(x));
  if(!owners.has(id))owners.set(id,[]);
  owners.get(id).push(...paths);
  paths.forEach(p=>indexPaths.add(p));
}
const warnings=[],errors=[];
if(scripts.length!==manifest.length||scripts.some((s,i)=>s!==manifest[i].path))errors.push('index.html / module-manifest.json load-order mismatch');
if(!manifest.every((m,i)=>m.order===i+1))errors.push('manifest order not contiguous');
const moduleRows=manifest.map(m=>{
  const p='3_SYSTEM/frontend/'+m.path;
  if(!byPath.has(p)){errors.push('missing manifest module: '+p);return {path:p,layer:m.layer,missing:true};}
  const s=read(p),starts=[...s.matchAll(/\[(AUNEA-[A-Z0-9-]+)\]\s+START/g)].map(x=>x[1]),
    ends=[...s.matchAll(/\[(AUNEA-[A-Z0-9-]+)\]\s+END/g)].map(x=>x[1]);
  if(!starts.includes(m.block_id)||!ends.includes(m.block_id))errors.push('manifest Block_ID absent: '+p);
  return {path:p,layer:m.layer,lines:lineCount(s),bytes:Buffer.byteLength(s),sha256:checksum(s),
    functions:(s.match(/(?:^|\n)\s*(?:async\s+)?function\s+\w+/g)||[]).length,
    domReferences:(s.match(/\b(?:document\.|querySelector|addEventListener\()/g)||[]).length,
    inlineStyleAttributes:(s.match(/style="/g)||[]).length,
    block_ids:[...new Set(starts)],unbalancedBlockCounts:starts.length!==ends.length};
});
function cssRules(css){
  const rules=[],stack=[];let start=0,quote='',comment=false;
  for(let i=0;i<css.length;i++){
    const ch=css[i],next=css[i+1];
    if(comment){if(ch==='*'&&next==='/'){comment=false;i++}continue;}
    if(quote){if(ch==='\\')i++;else if(ch===quote)quote='';continue;}
    if(ch==='/'&&next==='*'){comment=true;i++;continue;}
    if(ch==="'"||ch==='"'){quote=ch;continue;}
    if(ch==='{'){const header=css.slice(start,i).replace(/\/\*[\s\S]*?\*\//g,'').trim();stack.push({header,at:i});start=i+1;}
    else if(ch==='}'){const f=stack.pop();if(f&&!f.header.startsWith('@'))rules.push({
      selector:f.header,context:stack.filter(x=>x.header.startsWith('@')).map(x=>x.header).join(' > '),
      declaration:css.slice(f.at+1,i).trim(),line:lineCount(css.slice(0,f.at))});start=i+1;}
  }
  return rules;
}
const css={};
for(const p of ['3_SYSTEM/frontend/styles.css','3_SYSTEM/frontend/ui-system.css']){
  const s=read(p),rules=cssRules(s),counts=new Map();
  rules.forEach(r=>{const key=r.context+' | '+r.selector;counts.set(key,(counts.get(key)||0)+1);});
  const repeats=[...counts].filter(([,n])=>n>1).map(([selectorContext,count])=>({selectorContext,count})).sort((a,b)=>b.count-a.count);
  css[p]={lines:lineCount(s),bytes:Buffer.byteLength(s),rules:rules.length,
    repeatedSelectorContextGroups:repeats.length,
    extraRepeatedOccurrences:repeats.reduce((n,r)=>n+r.count-1,0),topRepeated:repeats.slice(0,50),
    note:'Repetición de selector no equivale a duplicación eliminable; revisar cascada, responsive y páginas FROZEN.'};
}
const knownPaths=[...indexPaths];
const missingReferences=knownPaths.filter(p=>!byPath.has(p));
if(missingReferences.length)warnings.push('Some CODE_BLOCK_INDEX.md references do not resolve to files; inspect composite / retired rows.');
const frozenRows=frozen.map(x=>({page:x.page_id,gate:x.gate,source:x.source_snapshot,style:x.style_snapshot,
  missingSnapshots:[x.source_snapshot,x.style_snapshot].filter(p=>p&&!byPath.has('3_SYSTEM/frontend/'+p))}));
// Static dependency inventory: names and textual references are candidates, not proof.
const activeRuntimeSources=new Map(moduleRows.filter(x=>!x.missing).map(x=>[x.path,read(x.path)]));
const declaredFunctions=new Map();
for(const [p,source] of activeRuntimeSources){
  for(const match of source.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)){
    const name=match[1];
    if(!declaredFunctions.has(name))declaredFunctions.set(name,[]);
    declaredFunctions.get(name).push(p);
  }
}
const dependencyEdges=[],ambiguousFunctions=[];
for(const [name,owners] of declaredFunctions){
  if(owners.length>1){ambiguousFunctions.push({name,owners});continue;}
  const word=new RegExp('\\b'+name.replace(/[$]/g,'\\const testPaths=active.filter(x=>/3_SYSTEM\/frontend\/tests\/.*\.test\.cjs$/.test(x.path)||/3_SYSTEM\/backend\/tests\/test_.*\.py$/.test(x.path));')+'\\s*\\(','g');
  for(const [consumer,source] of activeRuntimeSources){
    if(consumer===owners[0])continue;
    if(word.test(source))dependencyEdges.push({owner:owners[0],consumer,reference:name});
    word.lastIndex=0;
  }
}
const staticClassConsumers=new Map();
for(const [p,source] of activeRuntimeSources){
  for(const match of source.matchAll(/(?:class(?:Name)?\s*=\s*["'\x60][^"'\x60]*|(?:querySelector(?:All)?|closest|matches|classList\.(?:add|remove|toggle|contains))\s*\([^)]*)/g)){
    for(const cls of match[0].matchAll(/\.?([A-Za-z_][A-Za-z0-9_-]{2,})/g)){
      const name=cls[1];
      if(!staticClassConsumers.has(name))staticClassConsumers.set(name,new Set());
      staticClassConsumers.get(name).add(p);
    }
  }
}
const cssClassCandidates=new Map();
for(const p of ['3_SYSTEM/frontend/styles.css','3_SYSTEM/frontend/ui-system.css']){
  for(const rule of cssRules(read(p))){
    for(const found of rule.selector.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)){
      const className=found[1];
      const current=cssClassCandidates.get(className)||{styles:new Set(),occurrences:0};
      current.styles.add(p);current.occurrences++;
      cssClassCandidates.set(className,current);
    }
  }
}
const classOwnership=[...cssClassCandidates].map(([className,x])=>({
  className,styles:[...x.styles],occurrences:x.occurrences,
  staticConsumers:[...(staticClassConsumers.get(className)||[])],
  verification:'Static text candidate only: dynamic classes and frozen views may be unobserved.'
}));
const crossCssClasses=classOwnership.filter(x=>x.styles.length>1);
const noStaticConsumer=classOwnership.filter(x=>!x.staticConsumers.length);

const testPaths=active.filter(x=>/3_SYSTEM\/frontend\/tests\/.*\.test\.cjs$/.test(x.path)||/3_SYSTEM\/backend\/tests\/test_.*\.py$/.test(x.path));
const frontendFiles=active.filter(x=>x.path.startsWith('3_SYSTEM/frontend/'));
const backendFiles=active.filter(x=>x.path.startsWith('3_SYSTEM/backend/'));
const workflows=active.filter(x=>x.path.startsWith('.github/workflows/')&&/\.ya?ml$/.test(x.path));
const sizes=active.filter(x=>/\.(js|cjs|py|css|html)$/.test(x.path)).map(x=>{
  const s=read(x.path);return {path:x.path,lines:lineCount(s),bytes:Buffer.byteLength(s)};
}).sort((a,b)=>b.lines-a.lines);
const report={
  status:errors.length?'BLOCKED':'STATIC_INVENTORY_GENERATED',
  generatedAt:new Date().toISOString(),branch:'Confirm checked-out branch/HEAD with git rev-parse',
  scope:'Non-archived repository tree; does not prove runtime or visual equivalence',
  counts:{activeFiles:active.length,archivedFiles:historical.length,frontendFiles:frontendFiles.length,
    backendFiles:backendFiles.length,workflows:workflows.length,runtimeModules:moduleRows.length,
    runtimeLines:moduleRows.reduce((n,r)=>n+(r.lines||0),0),
    frontendTests:testPaths.filter(x=>x.path.includes('/frontend/')).length,
    backendTests:testPaths.filter(x=>x.path.includes('/backend/')).length,
    indexedBlockIds:owners.size,indexedPaths:indexPaths.size,frozenPages:frozen.length},
  modules:moduleRows,css,frozen:frozenRows,
  dependencies:{staticCrossModuleReferences:dependencyEdges,ambiguousFunctionNames:ambiguousFunctions,
    note:'Lexical function references only, not an evaluated runtime call graph.'},
  styleConsumers:{classes:classOwnership.length,sharedBetweenCss:crossCssClasses,
    noStaticConsumerCandidates:noStaticConsumer.slice(0,500),
    note:'Do not delete classes based solely on static absence: dynamic, HTML and frozen consumers must be verified.'},
  codeHotspots:sizes.slice(0,40),indexedPaths:{missingReferences,unindexedActiveSource:
    active.filter(x=>/3_SYSTEM\/(?:frontend|backend)\/.*\.(?:js|py|css|cjs)$/.test(x.path)&&
      !indexPaths.has(x.path)).map(x=>x.path).slice(0,200)},
  historical:{count:historical.length,topFolders:[...new Set(historical.map(x=>x.path.split('/').slice(0,3).join('/')))].slice(0,40)},
  warnings,errors};
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
