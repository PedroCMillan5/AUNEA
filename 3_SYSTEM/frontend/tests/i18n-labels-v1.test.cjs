// [AUNEA-UAT-I18N-010] START — Spanish enum label map regression
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','app-i18n-labels-v1.js'),'utf8');
const ctx={console};vm.createContext(ctx);vm.runInContext(code,ctx);

test('engineLabel maps every backend enum value to a Spanish string',()=>{
  assert.equal(ctx.engineLabel('pain_state','CONFIRMED'),'Confirmado');
  assert.equal(ctx.engineLabel('confidence','LOW'),'Baja');
  assert.equal(ctx.engineLabel('risk_level','R3'),'Riesgo crítico');
  assert.equal(ctx.engineLabel('risk_status','CONTROL_GAP'),'Brecha de control');
  assert.equal(ctx.engineLabel('quote_status','BLOCKED'),'Bloqueada');
});

test('engineLabel unwraps {value} shaped enums (e.g. Literal-backed pydantic fields serialized as plain strings still pass through)',()=>{
  assert.equal(ctx.engineLabel('quote_status',{value:'READY'}),'Lista');
});

test('engineLabel falls back to the raw value without throwing on an unmapped value',()=>{
  let warned=false;const origWarn=ctx.console.warn;ctx.console.warn=()=>{warned=true};
  assert.equal(ctx.engineLabel('quote_status','SOME_NEW_STATUS'),'SOME_NEW_STATUS');
  assert.equal(warned,true);
  ctx.console.warn=origWarn;
});

test('engineLabel never throws on null/undefined',()=>{
  assert.doesNotThrow(()=>ctx.engineLabel('pain_state',null));
  assert.doesNotThrow(()=>ctx.engineLabel('pain_state',undefined));
});
// [AUNEA-UAT-I18N-010] END
