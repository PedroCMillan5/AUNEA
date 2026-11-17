// [AUNEA-UAT-UI-CONTROLS-L2-480] START — UI/UX L2 shared controls and opt-in dialog.
'use strict';
// PURPOSE: Verify one selector/disclosure/mode/feedback owner and modal keyboard/focus behavior.
// SOURCE: UI/UX master contract L2; DEC-050/056; active code, not historical mock implementations.
// INPUTS: runtime renderer, core state and non-FROZEN page module sources.
// OUTPUTS: deterministic Node regression checks. No persisted business changes.
// SIDE_EFFECTS: none. CHANGE_RISK: LOW.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const renderer=read('ui/renderer.js'),core=read('core/state.js');
const block=(src,id)=>src.match(new RegExp('// \\['+id+'\\] START[\\s\\S]*?// \\['+id+'\\] END'))?.[0];
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const selectSource=renderer.match(/function auneaSelectControl\([\s\S]*?(?=\nfunction canonicalSelect)/)?.[0];
assert.ok(selectSource,'Missing approved select owner in renderer');
const choiceSource=block(renderer,'AUNEA-FE-UI-CHOICES-L2-478');
assert.ok(choiceSource,'Missing L2 UI choice owner');
const choices=()=>vm.runInNewContext(selectSource+'\n'+choiceSource+
 '\n;({auneaUiModeButton,auneaUiNamedSelect,auneaUiFeedbackMessage,auneaUiFieldDecisionButton})',{
 attr:escapeHtml,esc:escapeHtml
});
test('PG11 and PG12 mode buttons share pressed-state markup without inventing a state owner',()=>{
 const c=choices();
 const active=c.auneaUiModeButton('data-tobe-mode-switch','guided','Revisión por actividad',true);
 const inactive=c.auneaUiModeButton('data-pg12-view','actual','Actual',false);
 assert.match(active,/class="btn btn-primary"/);
 assert.match(active,/data-tobe-mode-switch="guided" aria-pressed="true"/);
 assert.match(inactive,/class="btn btn-outline"/);
 assert.match(inactive,/data-pg12-view="actual" aria-pressed="false"/);
 assert.throws(()=>c.auneaUiModeButton('data-business-update','x','x',true),/Unsupported/);
 assert.match(read('pages/tobe.js'),/auneaUiModeButton\(/);
 assert.match(read('pages/comparison.js'),/auneaUiModeButton\(/);
});
test('named selects reuse real canonical hidden-input/option engine with labels, not duplicate data',()=>{
 const c=choices();
 const html=c.auneaUiNamedSelect('Ruta del proceso','tobeRoute_X',
 [{value:'A',label:'Actividad A'},{value:'B',label:'Actividad B'}],'A',{
 extra:'data-tobe-route="normal" data-tobe-route-step="X"'
 });
 assert.match(html,/class="canonical-aunea-select" data-aunea-ui-control="select"/);
 assert.match(html,/type="hidden" id="tobeRoute_X" value="A" data-tobe-route="normal"/);
 assert.match(html,/<summary aria-label="Ruta del proceso">/);
 assert.match(html,/data-aunea-select-option="tobeRoute_X"/);
 assert.match(html,/role="listbox"/);
 assert.match(html,/class="selected" data-aunea-select-option="tobeRoute_X" data-value="A"/);
 assert.throws(()=>c.auneaUiNamedSelect('',"id",[],'A'),/requires a visible label/);
 const tobe=read('pages/tobe.js'),flow=read('pages/tobe-flow.js'),projects=read('pages/projects.js');
 assert.ok((tobe.match(/auneaUiNamedSelect\(/g)||[]).length>=3);
 assert.ok(flow.includes('auneaUiNamedSelect(label,'));
 assert.ok(projects.includes("auneaUiNamedSelect('Medición existente en el escenario'"));
});
test('PG12 disclosure uses one real existing owner without an extra accordion implementation',()=>{
 const source=block(renderer,'AUNEA-FE-GLOBAL-DISCLOSURE-450');
 assert.ok(source);
 const disclosure=vm.runInNewContext(source+
 '\n;({auneaUiDisclosureStart,auneaUiDisclosureEnd})',{
 attr:escapeHtml,esc:escapeHtml,document:undefined
 });
 const html=disclosure.auneaUiDisclosureStart({
 variant:'legacy',className:'pg12-count-audit',title:'Comprobar contadores y procedencia'
 })+disclosure.auneaUiDisclosureEnd();
 assert.equal(html,'<details class="pg12-count-audit"><summary>Comprobar contadores y procedencia</summary></details>');
 assert.ok((read('pages/comparison.js').match(/auneaUiDisclosureStart\(\{variant:'legacy'/g)||[]).length>=2);
});
test('consultant Apply/Keep/Edit buttons use one renderer and only Keep exposes pressed state',()=>{
 const c=choices();
 const keep=c.auneaUiFieldDecisionButton('Mantener',
   'data-tobe-ai-keep-field="outputs" data-tobe-ai-action-source="S1"',true,
   'Conservar valor del consultor');
 const apply=c.auneaUiFieldDecisionButton('Aplicar IA',
   'data-tobe-ai-use-field="outputs" data-tobe-ai-action-source="S1"',null,
   'Aplicar propuesta revisada');
 assert.match(keep,/class="btn btn-outline btn-small is-selected"/);
 assert.match(keep,/aria-pressed="true"/);
 assert.match(keep,/data-tobe-ai-keep-field="outputs"/);
 assert.doesNotMatch(apply,/aria-pressed/);
 assert.throws(()=>c.auneaUiFieldDecisionButton('Otro','data-delete-business="1"'),/Unsupported/);
 const source=read('pages/tobe-review.js');
 assert.match(source,/auneaUiFieldDecisionButton\(label,attribute,active,title\)/);
});
test('warnings expose state without mutating business status or CSS token ownership',()=>{
 const c=choices();
 const output=c.auneaUiFeedbackMessage('warn','Versión <histórica> & sin fuente');
 assert.match(output,/class="notice warn" role="status" aria-live="polite"/);
 assert.match(output,/Versión &lt;histórica&gt; &amp; sin fuente/);
 assert.throws(()=>c.auneaUiFeedbackMessage('approved', 'x'),/Unsupported/);
 assert.ok((read('pages/comparison.js').match(/auneaUiFeedbackMessage\('warn'/g)||[]).length>=3);
});
function fakeModalEnvironment(){
 const events={},attrs={},active={focused:false,isConnected:true,focus(){this.focused=true;doc.activeElement=this;}};
 const node=(name)=>({
 name,attrs:{},disabled:false,isConnected:true,
 setAttribute(k,v){this.attrs[k]=v;},
 focus(){doc.activeElement=this;this.focused=true;},
 getClientRects(){return [{}]},
 offsetWidth:10,offsetHeight:10
 });
 const heading=node('heading'),close=node('close'),cancel=node('cancel'),save=node('save'),
 input=node('input');
 const nodes={'.modal-head h2':heading,'#modalClose':close,'#modalCancel':cancel,
  '#modalSave':save,
  'input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled]),summary':input,
  'button:not([disabled])':close};
 const dialog={
 attrs,events,
 setAttribute(k,v){attrs[k]=v;},
 querySelector(key){return nodes[key]||null},
 querySelectorAll(){return [input,close,cancel,save]},
 addEventListener(k,handler){events[k]=handler},
 focus(){doc.activeElement=this}
 };
 const root={innerHTML:'',querySelector:sel=>sel==='.modal'?dialog:null};
 const doc={activeElement:active,getElementById:id=>id==='modalRoot'?root:null};
 const calls={opened:0,closed:0,saved:0,toasts:[]};
 const modals=block(core,'AUNEA-FE-UI-DIALOG-L2-479');
 assert.ok(modals);
 const api=vm.runInNewContext(modals+
 '\n;({auneaUiOpenModal,auneaUiCloseModal})',{
 document:doc,toast:message=>calls.toasts.push(message),
 openModal(){calls.opened++;root.innerHTML='modal';},
 closeModal(){calls.closed++;root.innerHTML='';},
 Promise
 });
 return {api,calls,doc,dialog,heading,close,cancel,save,input,active};
}
test('non-FROZEN project dialogs carry dialog semantics and restore invoking focus',()=>{
 const env=fakeModalEnvironment();
 env.api.auneaUiOpenModal('Registrar ejecución real','<input>',()=>{env.calls.saved++;});
 assert.equal(env.calls.opened,1);
 assert.equal(env.dialog.attrs.role,'dialog');
 assert.equal(env.dialog.attrs['aria-modal'],'true');
 assert.equal(env.dialog.attrs['aria-labelledby'],'auneaUiDialogTitle');
 assert.equal(env.heading.id,'auneaUiDialogTitle');
 assert.equal(env.close.attrs['aria-label'],'Cerrar Registrar ejecución real');
 assert.equal(env.doc.activeElement,env.input);
 env.cancel.onclick();
 assert.equal(env.calls.closed,1);
 assert.equal(env.active.focused,true);
 assert.match(read('pages/projects.js'),/auneaUiOpenModal\('Registrar ejecución real'/);
 assert.match(read('pages/projects.js'),/auneaUiOpenModal\('Registrar resultado medido'/);
});
test('Escape protects dirty form; clean Escape closes; save disables duplicate submission',()=>{
 const env=fakeModalEnvironment();
 env.api.auneaUiOpenModal('Resultado medido','<input>',()=>{env.calls.saved++});
 const evt=()=>({key:'Escape',preventDefault(){this.prevented=true},
  stopPropagation(){this.stopped=true}});
 let e=evt();env.dialog.events.input();env.dialog.events.keydown(e);
 assert.equal(env.calls.closed,0);
 assert.equal(e.prevented,true);
 assert.match(env.calls.toasts[0],/cambios sin guardar/);
 env.save.onclick();
 assert.equal(env.calls.saved,1);
 env.cancel.onclick();
 assert.equal(env.calls.closed,1);
 const fresh=fakeModalEnvironment();
 fresh.api.auneaUiOpenModal('Resultado medido','<input>',()=>{});
 const escape=evt();fresh.dialog.events.keydown(escape);
 assert.equal(fresh.calls.closed,1);
 assert.equal(fresh.active.focused,true);
});
test('legacy FROZEN owners and global modal remain unchanged; L2 is explicit opt-in',()=>{
 assert.match(core,/function openModal\(title,body,onSave,saveLabel='Guardar'\)/);
 assert.match(core,/function closeModal\(\)\{document.getElementById\('modalRoot'\).innerHTML=''\}/);
 assert.match(core,/function section\(title,sub,body,actions=''\)/);
 assert.doesNotMatch(read('pages/tobe.js'),/auneaUiOpenModal\(/);
});
// [AUNEA-UAT-UI-CONTROLS-L2-480] END
