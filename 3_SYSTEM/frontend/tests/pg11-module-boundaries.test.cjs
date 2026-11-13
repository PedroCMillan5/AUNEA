// [AUNEA-UAT-PG11-MODULE-373] START — migration contract, no duplicate owners.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const results=read('pages/results.js'),model=read('domain/tobe-model.js'),
  transactions=read('domain/tobe-transactions.js'),view=read('pages/tobe.js');
const manifest=JSON.parse(read('module-manifest.json')),html=read('index.html');

test('PG11 has one model owner, one preview/transaction owner and one page owner',()=>{
  for(const [fn,owner] of [
    ['createTobeDraft',model],['tobeReviewReadiness',model],
    ['tobeCommitAlternative',transactions],['tobeUndoAlternative',transactions],
    ['tobePage',view],['tobeGuidedNavHtml',view]
  ]){
    const signature='function '+fn+'(';
    assert.equal([results,model,transactions,view].filter(s=>s.includes(signature)).length,1,fn);
    assert.ok(owner.includes(signature),'wrong owner: '+fn);
  }
  assert.ok(view.includes('function saveTobeFromDom(e)'),'the PG11 form still writes to the sole TO-BE owner');
  assert.ok(!results.includes('function tobePage()'),'the old results view does not duplicate PG11');
});

test('runtime uses the exact manifest order, with no duplicate new modules',()=>{
 const scripts=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(x=>x[1]);
 assert.deepEqual(scripts,manifest.modules.map(x=>x.path));
 for(const name of ['domain/tobe-model.js','domain/tobe-transactions.js','pages/tobe.js'])
   assert.equal(scripts.filter(x=>x===name).length,1,'duplicate runtime module '+name);
 assert.ok(scripts.indexOf('domain/tobe-model.js')<scripts.indexOf('pages/results.js'));
 assert.ok(scripts.indexOf('pages/results.js')<scripts.indexOf('domain/tobe-transactions.js'));
 assert.ok(scripts.indexOf('domain/tobe-transactions.js')<scripts.indexOf('pages/tobe.js'));
 assert.ok(scripts.indexOf('pages/tobe.js')<scripts.indexOf('boot.js'));
});

test('legacy source-oracle is a test-only reconstruction; PG11 identity is preserved',()=>{
 const source=require('./pg11-source.cjs')();
 assert.ok(source.includes('// [AUNEA-FE-PG11-REVIEW-GATE-199] START'));
 assert.ok(source.includes('// [AUNEA-FE-PG11-TRANSACTION-332] START'));
 assert.ok(source.includes('// [AUNEA-FE-PG11-GUIDED-NAV-266] START'));
 for(const fn of ['createTobeDraft','tobeReviewReadiness','tobeCommitAlternative','tobeUndoAlternative','tobePage'])
   assert.equal(source.split('function '+fn+'(').length-1,1,fn);
 assert.ok(!html.includes('pg11-source.cjs'),'test-only compatibility code must not load in the app');
});
test('PG11 section 03 uses one vocabulary and keeps map routing outside the guided steps',()=>{
 assert.match(view,/03\.2 · Revisar oportunidades de mejora/);
 assert.doesNotMatch(view,/03\.2 · Revisar propuestas IA/);
 const guide=view.slice(view.indexOf('<section class="tobe-task-guide"'),view.indexOf('</section>'+String.fromCharCode(39)+'+',view.indexOf('<section class="tobe-task-guide"')));
 assert.doesNotMatch(guide,/03\.4 · Conectar el proceso futuro/,'map instructions stay in map mode');
 const hiddenRules=[...read('ui-system.css').matchAll(/([^{}]+)\{display:none\}/g)];
 assert.ok(hiddenRules.some(rule=>rule[1].includes('.tobe-workspace[data-tobe-mode="guided"] #tobeStepRoutes')),
   'Map routes must remain hidden during guided review, including grouped equivalent CSS rules');
 assert.match(view,/activityItems=\[\.\.\.\(p\.items\|\|\[\]\),\.\.\.tobeAddedSteps\(p\)\]/);
});
// [AUNEA-UAT-PG11-MODULE-373] END
