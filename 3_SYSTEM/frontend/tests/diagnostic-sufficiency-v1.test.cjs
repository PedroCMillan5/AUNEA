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
 assert.match(engines,/class EconomicsEngine:[\s\S]*ctx\.engagement\.economics/);
 assert.match(engines,/_covered_input_ids\(coverage, "EconomicsEngine"\)/);
 assert.match(engines,/class RiskEngine:[\s\S]*ctx\.engagement\.risks/);
 assert.match(engines,/_covered_input_ids\(coverage, "RiskEngine"\)/);
 assert.match(engines,/class RecommendationEngine:[\s\S]*process_design_preconditions_ok[\s\S]*existing_tool_can_cover[\s\S]*requires_bounded_agent_action[\s\S]*requires_unstructured_ai_assistance[\s\S]*requires_management_visibility/);
 assert.match(engines,/_covered_input_ids\(coverage, "RecommendationEngine"\)/);
});

test('DF002 runtime mirror matches canonical sector ownership',()=>{
 const df=schema.fields.find(x=>x.Field_ID==='DF002');
 assert.equal(df.Option_Set_ID,'REF_INDUSTRY_CNAE25');
 assert.equal(df.Reuse_From,'RT_COMPANY.Sector');
});

// [AUNEA-UAT-DIAG-SUFFICIENCY-010] END


test('DF001-DF100 form one complete unique traceability contract',()=>{
 const ids=schema.fields.map(x=>x.Field_ID);
 assert.equal(ids.length,100);
 assert.equal(new Set(ids).size,100);
 assert.deepEqual([...ids].sort(),Array.from({length:100},(_,i)=>'DF'+String(i+1).padStart(3,'0')));
});

test('every diagnostic field declares capture, ownership, branching, reuse and evidence semantics',()=>{
 const required=['Ask_Mode','Requiredness','Branch_Rule_ID','Write_Target','Engine_Consumers','Reask_Policy','Validation','Evidence_Expected','Evidence_Fallback'];
 const gaps=[];
 for(const f of schema.fields)for(const key of required)if(f[key]===undefined||f[key]===null||String(f[key]).trim()==='')gaps.push(f.Field_ID+':'+key);
 assert.deepEqual(gaps,[]);
});


test('every field has an explicit downstream invalidation plan',()=>{
 const map=schema.engine_dependency_graph?.field_invalidation_map||{};
 assert.equal(Object.keys(map).length,100);
 for(const f of schema.fields){
   assert.ok(Array.isArray(map[f.Field_ID]),f.Field_ID+' missing invalidation plan');
   assert.ok(map[f.Field_ID].length>0,f.Field_ID+' empty invalidation plan');
 }
 assert.deepEqual(map.DF073,['Risk','Recommendation','ProductPricing','ScenarioComparator','Deliverables']);
 assert.ok(map.DF021.includes('Economics'));
 assert.ok(map.DF093.includes('Governance'));
});

test('state records the source Field_ID and exact stale plan before clearing official snapshot',()=>{
 const stateJs=fs.readFileSync(path.join(root,'core','state.js'),'utf8');
 assert.ok(stateJs.includes('e.staleDerivedState={sourceFieldId:sourceFieldId||null,reason,affected,markedAt:now()}'));
 assert.ok(stateJs.includes('invalidateDerivedState(e,\`respuesta \${fid} actualizada\`,fid)'));
 assert.ok(stateJs.includes('invalidateDerivedState(e,\`detalle \${fid} actualizado\`,parentFid)'));
});
