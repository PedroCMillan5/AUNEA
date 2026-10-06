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


test('DF088 is a canonical non-blocking AI guardrail discovery probe',()=>{
  const master=JSON.parse(fs.readFileSync(path.join(root,'data/diagnostic-master.min.json'),'utf8'));
  const field=master.fields.find(x=>x.Field_ID==='DF088');
  assert.ok(field);
  assert.equal(field.Stage_ID,'S08');
  assert.equal(field.Branch_Rule_ID,'BR-AI');
  assert.equal(field.Requiredness,'CONDITIONAL_90M');
  assert.equal(field.Write_Target,'RT_PROCESS.Must_Not_Automate');
  assert.match(src,/AI_DISCOVERY_FIELDS=new Set\(\['DF088'\]\)/);
  assert.match(src,/AI_DISCOVERY_FIELDS\.has\(f\.Field_ID\).*f\.Stage_ID==='S08'.*RT_PROCESS\.Must_Not_Automate/);
});

test('DF088 visibility does not make BR-AI true by itself',()=>{
  assert.match(src,/case 'BR-AI':return valuePresent\(answers\.DF088\)\|\|normalizeArray\(answers\.DF008\)\.some/);
  assert.doesNotMatch(src,/case 'BR-AI':return true/);
});
