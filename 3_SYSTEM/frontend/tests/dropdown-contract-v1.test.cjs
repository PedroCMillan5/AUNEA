// [AUNEA-UAT-DROPDOWN-CONTRACT-010] START — Single immutable dropdown contract
// PURPOSE: Prevent any frontend path from reintroducing browser-native or parallel dropdown implementations.
// SOURCE: DEC-061/064; AUNEA_SYSTEM_90MIN_UI_SPEC_REVIEW_v1; shared AUNEA Select contract.
// INPUTS: Production frontend JS/HTML/CSS source tree.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: LOW.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){
      if(['tests','node_modules'].includes(entry.name))return [];
      return walk(full);
    }
    return [full];
  });
}

function productionSources(){
  return walk(root).filter(file=>/\.(?:js|html)$/.test(file));
}

test('production frontend cannot render browser-native select or datalist controls',()=>{
  const offenders=[];
  for(const file of productionSources()){
    const src=fs.readFileSync(file,'utf8');
    if(/<select\b/i.test(src)||/<datalist\b/i.test(src)){
      offenders.push(path.relative(root,file));
    }
  }
  assert.deepEqual(offenders,[],
    'Every dropdown must use the shared AUNEA Select; native <select>/<datalist> found in: '+offenders.join(', '));
});

test('AUNEA Select has exactly one renderer definition and one base visual contract',()=>{
  const jsFiles=productionSources().filter(file=>file.endsWith('.js'));
  const definitions=[];
  for(const file of jsFiles){
    const src=fs.readFileSync(file,'utf8');
    if(/function\s+auneaSelectControl\s*\(/.test(src))definitions.push(path.relative(root,file));
  }
  assert.deepEqual(definitions,['ui/renderer.js'],
    'auneaSelectControl must have one implementation in ui/renderer.js only');

  const css=fs.readFileSync(path.join(root,'ui-system.css'),'utf8');
  assert.equal((css.match(/(?:^|\n)\.aunea-select\{/g)||[]).length,1,
    '.aunea-select base skin must be defined exactly once');
  assert.match(css,/IMMUTABLE AUNEA SELECT CONTRACT/);
});

test('specialized dropdown helpers delegate to the single AUNEA Select primitive',()=>{
  const diagnostic=fs.readFileSync(path.join(root,'pages','diagnostic-stages.js'),'utf8');
  const process=fs.readFileSync(path.join(root,'domain','process.js'),'utf8');
  assert.match(diagnostic,/function pg01Select[\s\S]*?return auneaSelectControl\(/,
    'PG01 may adapt data ownership, but not create another dropdown');
  assert.match(process,/function auneaDropdownControl[\s\S]*?return auneaSelectControl\(/,
    'Process editor may adapt data, but not create another dropdown');
});
// [AUNEA-UAT-DROPDOWN-CONTRACT-010] END
