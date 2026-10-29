const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'domain/internal-ai-pilot.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'module-manifest.json'),'utf8'));

test('AI PG11 runs only with explicit button action and confirmed official snapshot',()=>{
  assert.match(src,/generateTobeAiPilot/);
  assert.match(src,/confirmedSnapshot\(e\)/);
  assert.match(src,/currentDiagnosticOutput\(e\)/);
  assert.match(src,/status!=='AVAILABLE'/);
  assert.match(src,/AiAgentService\.propose\('TOBE_DRAFT'/);
  assert.match(src,/requiresHumanReview|requires_human_review|status!=='DRAFT'/);
});
test('AI cannot silently overwrite user edits or publish',()=>{
  assert.match(src,/!String\(target\[dst\]\|\|''\)\.trim\(\)/);
  assert.doesNotMatch(src,/advanceTobeStatus\(/);
  assert.doesNotMatch(src,/approvedOutputReview\(/);
});
test('module is installed after engine-adapter and before boot',()=>{
  const list=manifest.modules.map(x=>x.path);
  const addon='domain/internal-ai-pilot.js';
  assert.ok(list.indexOf(addon)>list.indexOf('services/engine-adapter.js'));
  assert.ok(list.indexOf(addon)<list.indexOf('boot.js'));
  assert.match(index,/domain\/internal-ai-pilot\.js/);
});
