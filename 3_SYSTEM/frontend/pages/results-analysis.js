// [AUNEA-FE-PG10-ANALYSIS-UX-166] START — Source-owned economic/risk results with progressive evidence.
// Source: backend EconomicsResult and RiskResult, DEC-034/050/068; no recomputation or scoring.
function diagnosisEconomicsHtml(econ,record,projection){
  const inputs=(record?.economicInputs||[]).filter(x=>x.status!=='SUPERSEDED');
  const capacity=projection?.process_labor_capacity;
  const money=x=>x==null?'No cuantificado':eur(x)+'/año';
  const euroValue=x=>typeof x==='number'&&Number.isFinite(x)
    ?x.toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2})+' €':'No calculado';
  const euroCents=x=>typeof x==='number'&&Number.isFinite(x)
    ?x.toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'No calculado';
  const hours=x=>x==null?'No calculado':num(x)+' h/año';
  const roleLabel=code=>{
    const raw=String(code||'').trim();
    const fromSource=raw?labelFrom('OS_ACTOR_ROLE',raw):'';
    if(fromSource&&fromSource!==raw)return fromSource;
    return {ADMIN:'Administración',MANAGER:'Dirección / responsable'}[raw]||raw||'Rol sin identificar';
  };
  const evidence=x=>x?.evidence_type?engineLabel('evidence_quality',evidenceTypeBackend(x.evidence_type)):'Sin evidencia clasificada';
  const evidenceLabel=x=>({HYPOTHESIS:'Hipótesis',CLIENT_DECLARED:'Declaración del cliente',
    MEASURED:'Medición',AUNEA_ESTIMATE:'Estimación AUNEA',SPECIFIC_BENCHMARK:'Referencia específica',
    NOT_RECORDED:'Sin acreditar'})[x]||'Sin clasificar';

  // [AUNEA-FE-PG10-OPERATING-COST-172] START — Values owned by backend, never recomputed in UI.
  // SOURCE: process_time_projection/process_labor_capacity, EconomicResult, DEC-021/032/034/050/068.
  const roleRows=Array.isArray(capacity?.role_breakdown)?capacity.role_breakdown:[];
  const complete=capacity?.status==='COMPLETE'&&
    typeof capacity.annual_labor_capacity_value_eur==='number'&&Number.isFinite(capacity.annual_labor_capacity_value_eur);
  const costIntro=complete
    ?'<div class="pg10-econ-hero"><div><small>Capacidad anual valorada</small><strong>'+
      esc(euroValue(capacity.annual_labor_capacity_value_eur))+
      '</strong></div><div><small>Valor de capacidad por caso</small><strong>'+
      esc(euroCents(capacity.capacity_value_eur_per_case))+'</strong></div></div>'
    :'<div class="notice info pg10-econ-incomplete"><b>Valoración laboral incompleta</b><p>No se puede calcular un importe total fiable: falta una tarifa única por rol, tiempo suficiente o un análisis actualizado.</p>'+
      (capacity?.unvalued_steps?.length?'<p>Por comprobar: '+esc(capacity.unvalued_steps.join(' · '))+'</p>':'')+'</div>';

  const roleTable=complete&&roleRows.length
    ?'<section class="pg10-cost-roles"><h5>Distribución anual por rol</h5>'+
      '<div class="pg10-cost-roles-scroll"><table><thead><tr><th scope="col">Rol</th>'+
      '<th scope="col">Horas/año</th><th scope="col">Tarifa</th>'+
      '<th scope="col">Valor anual</th><th scope="col">Por caso</th></tr></thead><tbody>'+
      roleRows.map(x=>'<tr><th scope="row">'+esc(roleLabel(x.role))+'</th>'+
        '<td>'+esc(x.annual_hours==null?'Pendiente':num(x.annual_hours))+'</td>'+
        '<td>'+esc(x.hourly_rate==null?'Pendiente':euroValue(x.hourly_rate)+'/h')+'</td>'+
        '<td>'+esc(euroValue(x.annual_capacity_value_eur))+'</td>'+
        '<td>'+esc(euroCents(x.capacity_value_eur_per_case))+'</td></tr>').join('')+
      '</tbody><tfoot><tr><th scope="row">Total</th><td>'+esc(hours(capacity.covered_hours).replace(' h/año',''))+'</td><td>—</td>'+
      '<td>'+esc(euroValue(capacity.annual_labor_capacity_value_eur))+'</td>'+
      '<td>'+esc(euroCents(capacity.capacity_value_eur_per_case))+'</td></tr></tfoot></table></div></section>'
    :'<p class="pg10-cost-roles-missing">'+(complete
      ?'No se dispone del desglose por rol en este análisis. Actualiza el análisis con el AS-IS vigente.'
      :'El desglose por rol se mostrará cuando exista una valoración completa.')+'</p>';

  const hasTools=inputs.some(x=>x.current_tool_cost_eur_annual!=null);
  const hasLoss=inputs.some(x=>x.direct_loss_eur_annual!=null);
  const hasCash=inputs.some(x=>x.realized_cash_saving_eur_annual!=null);
  const moneyKnown=(flag,value)=>flag&&value!=null?money(value):'No consignado';
  const otherImpacts='<section class="pg10-econ-other"><h5>Otros importes registrados</h5><div class="grid g3 pg10-econ-other-grid">'+
    '<div class="notice"><b>Herramientas</b><strong>'+esc(moneyKnown(hasTools,econ.current_tool_cost_eur_annual))+
      '</strong><small>Coste actual. No se presupone eliminable.</small></div>'+
    '<div class="notice"><b>Retrabajo (valoración separada)</b><strong>'+
      esc(capacity?.rework_separate_value_eur==null?'No calculado':euroCents(capacity.rework_separate_value_eur)+'/año')+
      '</strong><small>No se suma: podría solaparse con trabajo ya contabilizado.</small></div>'+
    '<div class="notice"><b>Pérdidas directas / ahorro de caja realizado</b><strong>'+
      esc(((hasLoss&&Number(econ.direct_loss_eur_annual)>0)||(hasCash&&Number(econ.realized_cash_saving_eur_annual)>0))
        ?'Ver importes registrados':'Sin importe acreditado')+
      '</strong><small>Importes distintos de la capacidad laboral estimada.</small></div></div></section>';
  const mainExplanation='<p class="field-help pg10-econ-summary-note">La capacidad se valora con trabajo activo de los pasos, esfuerzo adicional atribuido y tarifas registradas. La espera pasiva no es trabajo laboral. Los importes son estimaciones condicionadas a los datos y su evidencia; no son gasto contable ni ahorro realizable.</p>';
  // [AUNEA-FE-PG10-OPERATING-COST-172] END

  const extras=Array.isArray(projection?.additional_friction_breakdown)?projection.additional_friction_breakdown:[];
  const sourceFriction=id=>(record?.frictions||[]).find(f=>String(f.id)===String(id)&&f.status!=='SUPERSEDED');
  const extraDetail=extras.length
    ?'<div class="pg10-cost-conditional"><b>Esfuerzo adicional atribuido a fricciones</b>'+
      '<p>Estas horas se han incluido como trabajo activo porque así constan en su fuente. Frecuencia y propietario no prueban por sí solos que sean trabajo y no espera: si la clasificación es errónea, se corrige en el AS-IS y se recalcula.</p><ul>'+
      extras.map(x=>{const f=sourceFriction(x.friction_id);
        return '<li><b>'+esc(f?.client_label||f?.observable_signal||'Fricción registrada')+'</b> · '+
          esc(hours(x.annual_additional_hours))+' adicionales · '+
          esc(x.minutes_per_event==null?'Duración por ocurrencia no disponible':num(x.minutes_per_event)+' min por ocurrencia')+
          (x.frequency?.mode==='percent'&&x.frequency?.value!=null?' · Frecuencia registrada: '+esc(num(x.frequency.value))+' % de los casos':'')+
          ' · Evidencia: '+esc(evidence(f))+'</li>';
      }).join('')+'</ul></div>'
    :(Number(projection?.annual_friction_additional_hours)>0
      ?'<p class="field-help">Esta proyección contiene trabajo adicional sin detalle de atribución. Actualiza el análisis con el AS-IS vigente.</p>'
      :'<p class="field-help">No consta trabajo adicional por fricciones en este cálculo.</p>');
  const stepDetail=Array.isArray(capacity?.steps)&&capacity.steps.length
    ?'<section class="pg10-econ-detail-group"><h5>Procedencia por paso</h5><div class="pg10-cost-steps">'+
      capacity.steps.map(x=>{
        const base=x.base_annual_hours,additional=x.additional_annual_hours;
        const basis=base!=null&&additional!=null&&additional>0
          ?'<small class="pg10-step-hour-split">'+esc(hours(base))+' del paso + '+esc(hours(additional))+
             ' adicionales = '+esc(hours(x.annual_hours))+'</small>'
          :'<small class="pg10-step-hour-split">'+esc(x.annual_hours==null?'Horas pendientes':hours(x.annual_hours))+
             (base==null?' · desglose de horas no disponible':' · trabajo del paso')+'</small>';
        return '<div class="pg10-step-source-row"><span>'+esc(x.step_name||'Paso')+' · '+esc(roleLabel(x.role))+
          basis+'</span><b>'+esc(x.annual_hours==null?'Horas pendientes':hours(x.annual_hours))+' × '+
          esc(x.hourly_rate==null?'Tarifa pendiente':euroValue(x.hourly_rate)+'/h')+' = '+
          esc(euroValue(x.capacity_value))+'</b></div>';
      }).join('')+'</div>'+
      '<p class="field-help">El valor por paso usa las horas atribuidas por el backend: trabajo propio más fricciones adicionales válidas, sin incluir espera pasiva ni retrabajo pendiente de conciliación.</p>'+
      '<p class="field-help">Calidad de las tarifas: '+esc([...new Set(capacity.steps.flatMap(x=>x.evidence||[]))].map(evidenceLabel).join(', ')||'No especificada')+'.</p></section>'
    :'<p class="field-help">No existe aún un desglose por pasos valorados; la valoración no debe completarse en la interfaz.</p>';
  const inputDescription=x=>{
    const parts=[];
    if(x.capacity_cost_rate_eur_hour!=null)parts.push(num(x.capacity_cost_rate_eur_hour)+' €/hora de capacidad');
    if(x.current_tool_cost_eur_annual!=null&&Number(x.current_tool_cost_eur_annual)>0)parts.push(money(x.current_tool_cost_eur_annual)+' de herramientas');
    if(x.annual_active_hours!=null&&Number(x.annual_active_hours)!==0)parts.push(hours(x.annual_active_hours)+' de trabajo consignado directamente');
    if(x.annual_wait_hours!=null&&Number(x.annual_wait_hours)!==0)parts.push(hours(x.annual_wait_hours)+' de espera consignada directamente');
    if(x.direct_loss_eur_annual!=null&&Number(x.direct_loss_eur_annual)>0)parts.push(money(x.direct_loss_eur_annual)+' de pérdida directa');
    const role=x.role_or_resource?roleLabel(x.role_or_resource):'';
    const zeros=[x.annual_active_hours===0?'Trabajo declarado: 0 h/año':'',
      x.annual_wait_hours===0?'Espera declarada: 0 h/año':'',
      x.direct_loss_eur_annual===0?'Pérdida directa declarada: 0 €/año':'',
      x.realized_cash_saving_eur_annual===0?'Ahorro realizado declarado: 0 €/año':''].filter(Boolean);
    const optionalZeros=zeros.length?'<details class="pg10-econ-zero-fields"><summary>Ver campos consignados con valor cero ('+
      zeros.length+')</summary><p>'+esc(zeros.join(' · '))+'</p></details>':'';
    return '<li><b>'+esc(typeof econDriverLabel==='function'?econDriverLabel(x.driver_id):x.driver_id||'Registro económico')+
      '</b>'+(role?'<span>'+esc(role)+'</span>':'')+
      '<span>'+esc(parts.join(' · ')||'Sin importe anual adicional consignado')+'</span>'+
      '<small>Calidad de la evidencia: '+esc(evidence(x))+'</small>'+optionalZeros+'</li>';
  };
  const directNonzero=[
    Number(econ.direct_loss_eur_annual)>0&&hasLoss?'Pérdidas directas: '+money(econ.direct_loss_eur_annual):'',
    Number(econ.realized_cash_saving_eur_annual)>0&&hasCash?'Ahorro de caja ya realizado: '+money(econ.realized_cash_saving_eur_annual):''
  ].filter(Boolean);
  // [AUNEA-FE-PG10-ECON-SOURCE-CONCILIATION-174] START — one auditable source detail, no duplicate summary cards.
  const detail='<details class="diagnosis-economic-detail"><summary>Consultar cálculos, pasos y fuentes ('+inputs.length+' registros)</summary>'+
    '<div class="pg10-econ-detail-group"><h5>Cómo se obtienen las horas</h5>'+
    '<p>Trabajo activo de pasos: <b>'+esc(hours(projection?.annual_active_hours))+'</b> · Trabajo adicional atribuido: <b>'+
      esc(hours(projection?.annual_friction_additional_hours))+'</b> · Trabajo activo total: <b>'+
      esc(hours(projection?.annual_total_active_hours))+'</b>.</p>'+
    '<p>Horas con tarifa asignada: <b>'+esc(hours(capacity?.covered_hours))+
      '</b>. La espera pasiva se mantiene fuera del coste laboral y el retrabajo se valora aparte. No se suman horas ni importes procedentes de fuentes coincidentes.</p></div>'+
    stepDetail+extraDetail+
    '<section class="pg10-econ-detail-group"><h5>Registros económicos originales</h5>'+
      '<p>Estos registros conservan las tarifas y otros costes originales. Los campos con valor cero se ocultan en el resumen para evitar confundirlos con las horas del mapa; puedes consultarlos en cada registro. Un cero explícito no significa ausencia de trabajo en el proceso.</p>'+
      (directNonzero.length?'<p>'+esc(directNonzero.join(' · '))+'</p>':'<p>No hay pérdidas directas ni ahorros de caja positivos acreditados en los registros.</p>')+
      (inputs.length?'<ul class="diagnosis-economic-input-list">'+inputs.map(inputDescription).join('')+'</ul>':'<p>No se han registrado entradas económicas.</p>')+
    '</section></details>';
  // [AUNEA-FE-PG10-ECON-SOURCE-CONCILIATION-174] END
  return '<div class="pg10-econ-overview">'+costIntro+roleTable+otherImpacts+mainExplanation+detail+'</div>';
}
function diagnosisRisksHtml(risk,record){
  // [AUNEA-FE-PG10-RISK-EXPLANATION-172] START — Plain language only; backend risk rating unchanged.
  // SOURCE: RiskEngine R0-R3 and recorded RiskInput, DEC-034/050 and Simulator PG10.
  const rows=(record?.risks||[]).filter(x=>x.status!=='SUPERSEDED');
  const level=x=>x?esc(engineLabel('risk_level',x)):'Sin valoración';
  const missing=rows.filter(x=>x.controls_present===false).length;
  const unknown=rows.filter(x=>x.controls_present==null).length;
  const withControls=rows.filter(x=>x.controls_present===true).length;
  const card=(title,value,help)=>'<div class="notice pg10-risk-card"><b>'+title+'</b><strong>'+value+'</strong><small>'+help+'</small></div>';
  const summary='<div class="pg10-risk-lead"><b>¿Qué riesgos presenta el proceso actual?</b>'+
    '<p>Se '+(rows.length===1?'ha registrado ':'han registrado ')+rows.length+' '+(rows.length===1?'riesgo':'riesgos')+'. La clasificación procede de los datos declarados y de las reglas del motor, no de una auditoría externa. AUNEA utiliza el nivel más alto para resumir el proceso; no implica que todos los riesgos tengan igual gravedad.</p></div>'+
    '<div class="grid g3 diagnosis-risk-summary">'+
    card('Gravedad antes de controles',level(risk.inherent_level),
      'Valoración calculada antes de considerar controles. Depende de los factores de riesgo registrados.')+
    card('Gravedad con controles registrados',level(risk.residual_level),
      'Clasificación calculada teniendo en cuenta solo los controles registrados; no prueba su aplicación ni eficacia real.')+
    card('Situación de los controles',risk.status?esc(engineLabel('risk_status',risk.status)):'Sin valoración',
      missing+' sin controles registrados · '+withControls+' con controles registrados'+(unknown?' · '+unknown+' sin información':'')+'.')+
    '</div>'+
    (missing?'<p class="pg10-risk-context">No constan controles para '+missing+' de '+rows.length+
       ' riesgos. Esto no prueba que no existan en la empresa: indica que el diagnóstico no puede acreditar su protección.</p>':'')+
    '<p class="pg10-risk-context">Si el nivel antes y después de controles es crítico, no hay evidencia suficiente para reducir la clasificación. «Crítico» es un nivel de riesgo estimado por reglas, no un incidente ocurrido ni una pérdida monetaria calculada.</p>';
  const reason=r=>{
    const f=[];
    if(r.critical_trigger===true)f.push('Tiene un factor de criticidad declarado');
    if(r.sensitive_or_high_impact===true&&Number(r.impact_1_5)>=4)
      f.push('Afecta a información sensible o de alto impacto ('+esc(String(r.impact_1_5))+'/5)');
    if(!f.length&&Number(r.impact_1_5)>=4)f.push('Impacto declarado elevado ('+esc(String(r.impact_1_5))+'/5)');
    if(r.material_financial_or_compliance===true)f.push('Posible consecuencia financiera o normativa declarada');
    if(r.reversible===false)f.push('Consecuencia declarada difícil de revertir');
    if(r.controls_present===false)f.push('No constan controles que permitan justificar una reducción');
    return f.join(' · ')||'Revisar el fundamento en la fuente confirmada';
  };
  const items=rows.length?'<div class="pg10-risk-explain-list">'+rows.map((r,i)=>
    '<div class="result-item pg10-risk-item"><b>'+(i+1)+'. '+esc(r.description||labelFrom('OS_RISK_CATEGORY',r.category)||'Riesgo')+'</b>'+
    '<p><b>¿Dónde puede ocurrir?</b> '+esc(normalizeArray(r.step_ids).map(id=>diagnosisStepName(record,id)).join(' · ')||'Sin paso enlazado')+'</p>'+
    '<p><b>Probabilidad declarada:</b> '+esc(r.likelihood_1_5??'No consta')+'/5 · <b>Gravedad de la consecuencia:</b> '+esc(r.impact_1_5??'No consta')+'/5</p>'+
    '<p><b>Controles registrados:</b> '+(r.controls_present===true?'Sí':r.controls_present===false?'No constan':'No determinado')+'</p>'+
    '<p class="pg10-risk-explanation"><b>Factores registrados para la valoración:</b> '+reason(r)+'</p>'+
    '</div>').join('')+'</div>':'<p>No hay riesgos registrados para este proceso.</p>';
  return summary+items+
    '<p class="pg10-risk-context"><b>Cómo interpretar el nivel global:</b> los factores consignados para cada riesgo fundamentan su evaluación. El nivel máximo resume el proceso; no se asigna ese nivel automáticamente a todos los riesgos. No se declara eficacia de controles sin evidencia.</p>'+
    '<p class="pg10-risk-context"><b>Qué revisar:</b> comprobar si existen medidas para prevenir o detectar cada riesgo y si hay evidencia de que se aplican. Las propuestas de control se definirán en el diseño TO-BE; no se suponen implantadas.</p>';
  // [AUNEA-FE-PG10-RISK-EXPLANATION-172] END
}
// [AUNEA-FE-PG10-ANALYSIS-UX-166] END
