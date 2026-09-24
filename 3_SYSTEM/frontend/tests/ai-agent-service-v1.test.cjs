const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');

test('C05 AI agent defaults to unavailable without a governed provider',()=>{
  assert.match(src,/status\(\)\{return __aiAgentProvider\?'AVAILABLE':'UNAVAILABLE'\}/);
  assert.match(src,/No hay proveedor IA gobernado\/configurado/);
  assert.doesNotMatch(src,/mock ai|fake ai|simulate ai/i);
});

test('C05 AI capabilities are bounded and every output requires human review',()=>{
  for(const capability of ['SUMMARY','EVIDENCE_ORGANIZATION','EXPLANATION','TOBE_DRAFT','MISSING_INFORMATION','DRAFT_TEXT'])assert.ok(src.includes(`'${capability}'`));
  assert.match(src,/requiresHumanReview:true/);
  assert.match(src,/status:'DRAFT'/);
});

test('C05 keeps deterministic engines outside AiAgentService',()=>{
  assert.match(src,/Pain\/Economics\/Risk\/Recommendation\/Pricing\/Scenario/);
  assert.doesNotMatch(src,/AiAgentService[\s\S]*\/v1\/diagnose/);
});
