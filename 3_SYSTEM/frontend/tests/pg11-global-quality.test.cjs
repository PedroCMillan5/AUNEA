// [AUNEA-UAT-PG11-GLOBAL-QUALITY-302] START
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../domain/internal-ai-global-quality.js'),'utf8');
function run(items){const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
 return JSON.parse(JSON.stringify(ctx.tobeGlobalQualityGroups(items)));}
function item(objective,how,id){
 return {objective,how,why:'Fricción confirmada de origen.',source_refs:[id],
  review:{status:'CONDITIONED',reason:'Comprobar viabilidad.',conflicts:[]}};}
test('5 proposals remain intact across 3 conservative semantic groups',()=>{
 const items=[
 item('Evitar volver a teclear datos en recepción.',
   'Reutilizar datos de factura ya introducidos en ERP.','F1'),
 item('Evitar volver a teclear datos en recepción.',
   'Establecer recordatorio por correo con el estado de la factura.','F2'),
 item('Reducir esperas de aprobación.',
   'Establecer recordatorio de aprobación de facturas al responsable.','F3'),
 item('Evitar volver a teclear datos en recepción.',
   'Enviar recordatorio a recepción con confirmación de la factura.','R1'),
 item('Evitar registrar dos veces datos de factura.',
   'Validar campos del ERP y reutilizar información de factura.','R2')];
 const before=JSON.stringify(items),out=run(items);
 assert.equal(out.recommendations,5);
 assert.equal(out.groups.length,3);
 assert.equal(out.relatedGroups,2);
 assert.ok(out.reviewCount>=2);
 assert.equal(out.groups.flatMap(g=>g.entries).length,5);
 assert.equal(JSON.stringify(items),before);
});
test('no quota or merge of different review statuses',()=>{
 for(const count of [0,1,2,5,9]){
  const items=Array.from({length:count},(_,i)=>
    item('Mejorar actividad '+i,'Estandarizar tarea diferente '+i+'.','F'+i));
  const data=run(items);
  assert.equal(data.recommendations,count);
  assert.equal(data.groups.length,count);
 }
});
 // [AUNEA-UAT-PG11-GLOBAL-QUALITY-302] END
