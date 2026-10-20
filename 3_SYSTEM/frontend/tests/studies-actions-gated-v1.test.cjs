// [AUNEA-UAT-STUDIES-ACTIONS-021] START — PG09 gating and Contact references in Estudios (authorized reopening 2026-10-20)
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../ui/shell.js'),'utf8');
const tag='AUNEA-FE-PAGE-STUDIES-010',start='// ['+tag+'] '+'START',end='// ['+tag+'] '+'END';
const i=source.indexOf(start),j=source.indexOf(end,i);
assert.ok(i>=0&&j>i,'Estudios source block must exist');
const block=source.slice(i,j+end.length);
const LIFECYCLE=['Preparación','Sesión 1','Trabajo interno','Listo para resultados','Sesión 2','Cerrado'];

function harness(overrides={}){
  const eng={
    id:'ENG-LEVANTE',title:'UAT QA — Recepción y registro de facturas',companyId:'COMP-1',
    contactIds:['CON-1'],status:'Sesión 1',answers:{DF011:'Recepción de facturas'},
    confirmedAsIs:false,confirmedSnapshots:[],layerConfirmations:{map:false,frictions:false,risks:false,impact:false},...overrides
  };
  const company={id:'COMP-1',name:'Levante Instalaciones Técnicas'};
  const contact={id:'CON-1',companyId:'COMP-1',firstName:'Marcos',lastName:'Soto'};
  const state={engagements:[eng],companies:[company],contacts:[contact],activePage:'estudios',activeEngagementId:null,studyPage:1};
  const elements=new Map(),listeners={};let transitions=0,renders=0;
  const document={
    body:{appendChild(el){elements.set(el.id,el)}},
    getElementById(id){return elements.get(id)||null},
    addEventListener(type,fn){listeners[type]=fn},
    createElement(){return {style:{},offsetWidth:220,offsetHeight:95,remove(){elements.delete(this.id)}}}
  };
  const lifecycle=e=>LIFECYCLE.indexOf(e.status);
  const context={
    state,document,window:{innerWidth:1600,innerHeight:900},
    companyById:id=>id===company.id?company:null,
    contactById:id=>id===contact.id?contact:null,
    contactFullName:ct=>[ct.firstName,ct.lastName].filter(Boolean).join(' '),
    engagementStatus:e=>e.status,
    engagementAtLeast:(e,status)=>lifecycle(e)>=LIFECYCLE.indexOf(status),
    hasConfirmedSnapshot:e=>e.confirmedAsIs===true&&(e.confirmedSnapshots||[]).some(s=>s.finalClosure===true),
    allProcessLayersConfirmed:e=>['map','frictions','risks','impact'].every(k=>e.layerConfirmations?.[k]===true),
    attr:v=>String(v),esc:v=>String(v),fmtDate:()=>'',labelFrom:()=>'',statusBadge:v=>String(v),
    pageTop:()=>'',section:(_a,_b,html)=>html,
    render(){renders++},
    advanceEngagementTo(e,to){transitions++;if(e.status!=='Sesión 1'||to!=='Trabajo interno')return false;e.status=to;return true},
    testButton:{getBoundingClientRect(){return {left:100,top:50,right:160,bottom:75}}}
  };
  vm.createContext(context);
  vm.runInContext(block,context);
  const open=()=>{vm.runInContext("openStudyActionMenu(testButton,'ENG-LEVANTE')",context);return elements.get('studyFloatingMenu').innerHTML};
  const act=type=>{
    const target={
      dataset:{[type]:eng.id},
      closest(selector){
        if(selector==='[data-study-actions]')return null;
        if(selector==='#studyFloatingMenu')return {};
        return selector.includes('[data-study-menu-open]')?this:null;
      }
    };
    listeners.click({target,preventDefault(){},stopPropagation(){}});
  };
  return {eng,state,context,open,act,get transitions(){return transitions},get renders(){return renders}};
}

test('Sesión 1 without confirmed PG09 exposes only Abrir estudio',()=>{
  const h=harness(),menu=h.open();
  assert.match(menu,/Abrir estudio/);
  assert.doesNotMatch(menu,/data-study-menu-work/);
  assert.doesNotMatch(menu,/data-study-menu-advance/);
  h.act('studyMenuWork');h.act('studyMenuAdvance');
  assert.equal(h.state.activePage,'estudios');
  assert.equal(h.state.activeEngagementId,null);
  assert.equal(h.transitions,0);
});
test('Preparación cannot access internal work',()=>{
  const h=harness({status:'Preparación'}),menu=h.open();
  assert.doesNotMatch(menu,/Trabajo interno/);
});
test('Only confirmed final PG09 closure and four layers permit advance from Sesión 1',()=>{
  const complete={confirmedAsIs:true,confirmedSnapshots:[{finalClosure:true}],layerConfirmations:{map:true,frictions:true,risks:true,impact:true}};
  const h=harness(complete),menu=h.open();
  assert.match(menu,/data-study-menu-advance/);
  assert.doesNotMatch(menu,/data-study-menu-work/);
  h.act('studyMenuAdvance');
  assert.equal(h.eng.status,'Trabajo interno');
  assert.equal(h.state.activePage,'resultados');
  assert.equal(h.transitions,1);
});
test('Trabajo interno opens only when PG09 final closure remains valid',()=>{
  const good=harness({status:'Trabajo interno',confirmedAsIs:true,confirmedSnapshots:[{finalClosure:true}]}),bad=harness({status:'Trabajo interno'});
  assert.match(good.open(),/data-study-menu-work/);
  assert.doesNotMatch(good.open(),/data-study-menu-advance/);
  assert.doesNotMatch(bad.open(),/data-study-menu-work/);
  good.act('studyMenuWork');
  assert.equal(good.state.activePage,'resultados');
  assert.equal(bad.state.activePage,'estudios');
});
test('Contact name displays from Company-linked firstName/lastName; missing ref falls back to dash',()=>{
  const good=harness(),html=vm.runInContext('studiesPage()',good.context);
  assert.match(html,/Marcos Soto/);
  assert.match(html,/Levante Instalaciones Técnicas/);
  const missing=harness({contactIds:['MISSING']});
  assert.match(vm.runInContext('studiesPage()',missing.context),/<td>—<\/td>/);
});
// [AUNEA-UAT-STUDIES-ACTIONS-021] END
