// [AUNEA-UAT-LOCAL-SAVE-142] START — Local persistence truthfulness regression
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../core/state.js'),'utf8');
function portion(a,b){const x=src.indexOf(a),y=src.indexOf(b,x+a.length);assert.ok(x>=0&&y>x,'expected code segment '+a);return src.slice(x,y)}
function create(){
 const storage={},toasts=[],state={dirty:false,engagements:[],audit:[]},env={
  state,STORAGE_KEY:'uat-status',localStorage:{setItem:(k,v)=>{storage[k]=v}},toast:t=>toasts.push(t),
  audit:t=>state.audit.push(t),updateHeader:()=>{},isClientDisplay:()=>false,attr:s=>String(s),
  document:{querySelectorAll:()=>[]}
 };
 vm.createContext(env);
 vm.runInContext(portion("let saveStateFailure=false;","function audit(message){")+"function audit(message){state.audit.push(message)}",env);
 vm.runInContext(portion("function fieldSavedPresentation(){","// ["+"AUNEA-FE-FIELD-STATUS-136"+"] END"),env);
 return {env,storage,toasts,state}
}
test('saved check means successful localStorage write and persisted dirty=false',()=>{
 const {env,storage,state}=create();
 env.markDirty('edición de prueba');
 assert.match(env.fieldStatusIcon('saved'),/field-status-pending/);
 assert.doesNotMatch(env.fieldStatusIcon('saved'),/field-status-saved/);
 assert.equal(env.saveState('QA'),true);
 assert.equal(state.dirty,false);
 assert.equal(JSON.parse(storage['uat-status']).dirty,false);
 assert.match(env.fieldStatusIcon('saved'),/field-status-saved/);
 assert.match(env.fieldStatusIcon('saved'),/Valor guardado en el estudio/);
});
test('failed storage never shows a success check or clears dirty state',()=>{
 const {env,state,toasts}=create();
 env.localStorage.setItem=()=>{throw new Error('QuotaExceededError')};
 env.markDirty('cambio');
 assert.equal(env.saveState('QA'),false);
 assert.equal(state.dirty,true);
 assert.match(env.fieldStatusIcon('saved'),/field-status-error/);
 assert.match(env.fieldStatusIcon('saved'),/No se pudo guardar/);
 assert.ok(toasts.some(t=>/No se pudo guardar/.test(t)));
});
test('reused-source icon remains provenance, not falsely a persistence check',()=>{
 const {env}=create();env.markDirty('cambio');
 assert.match(env.fieldStatusIcon('reused','Contactos'),/field-status-reused/);
 assert.match(env.fieldStatusIcon('reused','Contactos'),/Autocompletado desde Contactos/);
});
// [AUNEA-UAT-LOCAL-SAVE-142] END
