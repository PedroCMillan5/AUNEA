const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'domain/no-reask.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('BR-CAPACITY reads canonical EconomicInput capacity field directly in the canonical No-Reask module',()=>{
  assert.match(src,/case 'BR-CAPACITY':[\s\S]*capacity_cost_rate_eur_hour/);
  assert.doesNotMatch(src,/\.capacity_rate_eur_hour/);
  assert.doesNotMatch(html,/app-no-reask-capacity-v1\.js/);
});
