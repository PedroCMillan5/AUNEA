// [AUNEA-FE-PROJECT-LINK-010] START — Project, Actuals and Outcomes
// PURPOSE: Create projects from explicit implementation decisions and preserve historical references.
// SOURCE: DEC-025/054/055; Architecture Contract v1.3 P06/SPEC.
// INPUTS: approved output review, approved TO-BE and backend Solution Specification.
// OUTPUTS: Project references, actual execution records and derived estimate/actual comparisons.
// SIDE_EFFECTS: state.projects, Engagement lifecycle and audit; no deterministic engine execution.
// CHANGE_RISK: HIGH.
const AUNEA_DEFAULT_PROJECT_OWNER=Object.freeze({id:'pedro-carrasco',name:'Pedro Carrasco',role:'Consultor'});
function projectById(projectId){return state.projects.find(p=>p.id===projectId)||null}
function projectSource(p){const e=state.engagements.find(e=>e.id===p.engagementId);return {engagement:e,review:e?.outputReviews?.find(r=>r.id===p.scenarioRef?.reviewId),tobe:e?.tobeProposals?.find(t=>t.version===p.tobeRef?.version),spec:e?.solutionSpecifications?.find(s=>s.id===p.solutionSpecificationRef?.id)}}
function approvedSpecification(e,review){return [...(e?.solutionSpecifications||[])].reverse().find(s=>s.sourceReviewId===review?.id&&['APPROVED_FOR_CLIENT','PUBLISHED'].includes(s.status))||null}
function projectDecisionReadiness(e){
  if(!e||engagementStatus(e)!=='Sesión 2')return {ok:false,error:'Inicia la sesión de resultados antes de registrar la decisión de implementación.'};
  const review=approvedOutputReview(e),tobe=approvedTobeForClient(e);
  if(!review||!tobe)return {ok:false,error:'Revisa y aprueba los resultados y el TO-BE de esta versión.'};
  const spec=approvedSpecification(e,review);
  if(!spec)return {ok:false,error:'Genera y revisa la especificación de solución del escenario seleccionado.'};
  if(spec.data.status==='BLOCKED_SCENARIO')return {ok:false,error:'El backend ha bloqueado este escenario para implementación.'};
  return {ok:true,review,tobe,spec};
}
function recordImplementationDecision(e){
  const existing=state.projects.find(p=>p.engagementId===e?.id);if(existing)return {ok:true,project:existing,existing:true};
  const ready=projectDecisionReadiness(e);if(!ready.ok)return ready;
  const {review,tobe,spec}=ready;
  const p={id:id('PRJ'),engagementId:e.id,companyId:e.companyId,contactIds:[...(e.contactIds||[])],auneaOwner:{...AUNEA_DEFAULT_PROJECT_OWNER},name:confirmedSnapshot(e)?.answers?.DF011||e.title,status:'Preparación',scenarioRef:{reviewId:review.id,scenarioId:review.sources.scenario.scenario_id},tobeRef:{version:tobe.version,snapshotVersion:tobe.sourceSnapshotVersion},solutionSpecificationRef:{id:spec.id,version:spec.version},actuals:[],outcomes:[],decision:{type:'IMPLEMENT',at:now()},createdAt:now(),updatedAt:now()};
  if(!advanceEngagementTo(e,'Cerrado','decisión de implementación'))return {ok:false,error:'El estudio ya no está en sesión de resultados.'};
  state.projects.unshift(p);e.projectId=p.id;markDirty('Decisión de implementación registrada; proyecto vinculado');return {ok:true,project:p};
}
const PROJECT_OUTCOME_FIELDS=Object.freeze([
  ['annual_active_hours','Trabajo activo anual','h/año'],['annual_wait_hours','Espera anual','h/año'],
  ['direct_loss_eur_annual','Pérdida directa anual','EUR/año'],['current_tool_cost_eur_annual','Coste de herramientas anual','EUR/año'],
  ['realized_cash_saving_eur_annual','Ahorro de caja realizado anual','EUR/año']
]);
function addProjectActual(projectId,input){
  const p=projectById(projectId),hours=input.hours==null||input.hours===''?null:Number(input.hours),cost=input.cost==null||input.cost===''?null:Number(input.cost);
  if(!p||(!Number.isFinite(hours)&&!Number.isFinite(cost))||[hours,cost].some(v=>v!==null&&(!Number.isFinite(v)||v<0))||!input.phase?.trim()||!input.evidence?.trim())return {ok:false,error:'Indica fase, horas o coste real no negativo y evidencia.'};
  const row={id:id('ACT'),projectId,phase:input.phase.trim(),hours,costEur:cost,evidence:input.evidence.trim(),recordedAt:now()};
  (p.actuals||(p.actuals=[])).push(row);p.updatedAt=now();markDirty('Ejecución real registrada en proyecto');return {ok:true,row};
}
function addProjectOutcome(projectId,input){
  const p=projectById(projectId),field=PROJECT_OUTCOME_FIELDS.find(f=>f[0]===input.field),value=Number(input.value);
  if(!p||!field||input.value===''||!Number.isFinite(value)||value<0||!input.evidence?.trim()||!input.period?.trim())return {ok:false,error:'Indica una medición anual válida, periodo y evidencia real.'};
  const row={id:id('OUT'),projectId,field:field[0],value,unit:field[2],period:input.period.trim(),evidence:input.evidence.trim(),recordedAt:now()};
  (p.outcomes||(p.outcomes=[])).push(row);p.updatedAt=now();markDirty('Resultado real registrado en proyecto');return {ok:true,row};
}
function projectLearning(p){
  const estimate=projectSource(p).review?.sources.scenario.economics||{};
  return (p.outcomes||[]).map(o=>{const expected=estimate[o.field];return {...o,estimate:typeof expected==='number'&&Number.isFinite(expected)?expected:null,delta:typeof expected==='number'&&Number.isFinite(expected)?o.value-expected:null}});
}
// [AUNEA-FE-PROJECT-LINK-010] END
