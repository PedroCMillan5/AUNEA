// [AUNEA-UAT-DIAG-SUFFICIENCY-010] START
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const schema=require('../data/diagnostic-master.min.json');
const contract=JSON.parse(fs.readFileSync(path.join(root,'..','..','docs','DIAGNOSTIC_INPUT_CONTRACT_V12_AUDIT.json'),'utf8'));

test('canonical diagnostic input contract has 55 unique inputs',()=>{
 assert.equal(contract.count,55);
 assert.equal(contract.rows.length,55);
 assert.equal(new Set(contract.rows.map(x=>x.Input_ID)).size,55);
});

test('canonical diagnostic input groups remain complete',()=>{
 const counts={};for(const x of contract.rows)counts[x.Engine]=(counts[x.Engine]||0)+1;
 assert.deepEqual(counts,{PainEngine:20,EconomicsEngine:10,RecommendationEngine:14,RiskEngine:7,Governance:4});
});

test('every DF source in the input contract exists in shipped schema',()=>{
 const ids=new Set(schema.fields.map(x=>x.Field_ID)),missing=[];
 for(const row of contract.rows)for(const source of row.Source_Fields)if(source.startsWith('DF')&&source.length===5&&!ids.has(source))missing.push(row.Input_ID+':'+source);
 assert.deepEqual(missing,[]);
});

test('every diagnostic field declares engine consumers',()=>{
 assert.deepEqual(schema.fields.filter(x=>!String(x.Engine_Consumers||'').trim()).map(x=>x.Field_ID),[]);
});


test('core engine consumers use normalized entities plus canonical input coverage',()=>{
 const engines=fs.readFileSync(path.join(root,'..','backend','aunea_backend','engines.py'),'utf8');
 assert.match(engines,/PainEngine:[\s\S]*ctx\.engagement\.pain_signals/);
 assert.match(engines,/EconomicsEngine:[\s\S]*ctx\.engagement\.economics[\s\S]*_covered_input_ids\(coverage, "EconomicsEngine"\)/);
 assert.match(engines,/RiskEngine:[\s\S]*ctx\.engagement\.risks[\s\S]*_covered_input_ids\(coverage, "RiskEngine"\)/);
 assert.match(engines,/RecommendationEngine:[\s\S]*_covered_input_ids\(coverage, "RecommendationEngine"\)[\s\S]*process_design_preconditions_ok[\s\S]*existing_tool_can_cover[\s\S]*requires_bounded_agent_action[\s\S]*requires_unstructured_ai_assistance[\s\S]*requires_management_visibility/);
});

test('DF002 runtime mirror matches canonical sector ownership',()=>{
 const df=schema.fields.find(x=>x.Field_ID==='DF002');
 assert.equal(df.Option_Set_ID,'REF_INDUSTRY_CNAE25');
 assert.equal(df.Reuse_From,'RT_COMPANY.Sector');
});

// [AUNEA-UAT-DIAG-SUFFICIENCY-010] END
