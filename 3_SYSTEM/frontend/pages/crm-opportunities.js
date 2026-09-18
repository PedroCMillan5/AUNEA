// [AUNEA-FE-PAGE-OPPORTUNITIES-010] START — P04 Oportunidades
// PURPOSE: Render the commercial pipeline as cases, not as states of a person, and expose the origin
//          link an Engagement records when it is created from one.
// SOURCE: DEC-051 (Opportunity is the commercial case); DEC-042; DEC-050;
//         Architecture Contract v1.5 row P04.
// INPUTS: state.opportunities, state.companies, state.contacts, state.engagements.
// OUTPUTS: page markup only. Opportunity data is owned by AUNEA-FE-CRM-OPPORTUNITY-010.
// SIDE_EFFECTS: none beyond reading state.
// CHANGE_RISK: MEDIUM.
//
// VISUAL: no approved reference exists for P04 in the 21+2 set, so this uses the global AUNEA System
// visual language. The functional contract is closed by DEC-051 and is fully implemented.

function opportunityFilterControl(key,label,options,current,placeholder='Todos',disabled=false){
  const selected=options.find(o=>String(o.value)===String(current));
  return `<div class="filter-group"><span>${esc(label)}</span><details class="aunea-select ${disabled?'is-disabled':''}" data-opportunity-filter-box="${attr(key)}" ${disabled?'data-disabled="1"':''}><summary><span>${esc(selected?.label||placeholder)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}">${disabled?'':`<button type="button" role="option" data-opportunity-filter-option="${attr(key)}" data-value="">${esc(placeholder)}</button>${options.map(o=>`<button type="button" role="option" class="${String(current)===String(o.value)?'selected':''}" data-opportunity-filter-option="${attr(key)}" data-value="${attr(o.value)}">${esc(o.label)}</button>`).join('')}`}</div></details></div>`;
}
function opportunityFilterRow(){
  const f=state.opportunityFilters||{companyId:'',contactId:''};
  const companies=state.companies.map(c=>({value:c.id,label:c.name})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
  const contacts=f.companyId?state.contacts.filter(c=>c.companyId===f.companyId).map(c=>({value:c.id,label:contactFullName(c)})).sort((a,b)=>a.label.localeCompare(b.label,'es')):[];
  return `<div class="filter-row">
    ${opportunityFilterControl('companyId','Empresa',companies,f.companyId||'','Todas las empresas')}
    ${opportunityFilterControl('contactId','Contacto',contacts,f.contactId||'',f.companyId?'Todos los contactos':'Selecciona empresa',!f.companyId)}
    <button class="link-btn" id="clearOpportunityFilters">Limpiar filtros</button>
  </div>`;
}
function visibleOpportunities(){
  const f=state.opportunityFilters||{};
  return (state.opportunities||[]).filter(o=>{
    if(f.companyId&&o.companyId!==f.companyId)return false;
    if(f.contactId&&!(o.contactIds||[]).includes(f.contactId))return false;
    return true;
  }).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
}

function opportunityRow(o) {
  const co = companyById(o.companyId);
  const people = (o.contactIds || []).map(cid => contactFullName(contactById(cid))).filter(Boolean);
  const engs = engagementsOfOpportunity(o.id);
  return `<tr>
    <td><b>${esc(o.title)}</b>${o.notes ? `<br><small>${esc(o.notes.slice(0, 80))}${o.notes.length > 80 ? '…' : ''}</small>` : ''}</td>
    <td>${esc(co?.name || '—')}</td>
    <td>${people.length ? esc(people.join(', ')) : '<small>—</small>'}</td>
    <td><span class="badge ${opportunityStageClass(o.stage)}">${esc(o.stage)}</span></td>
    <td>${esc(o.source || '—')}</td>
    <td>${engs.length ? esc(engs.map(e => e.title).join(', ')) : '<small>Sin estudio</small>'}</td>
    <td>${esc(formatDateEs(o.updatedAt || o.createdAt))}</td>
    <td><div class="row-actions">
      <button class="btn btn-small" data-edit-opportunity="${attr(o.id)}">Editar</button>
      ${isOpportunityOpen(o) ? `<button class="btn btn-small btn-primary" data-opportunity-study="${attr(o.id)}">Crear estudio</button>` : ''}
    </div></td>
  </tr>`;
}

function opportunitiesPage() {
  const all = visibleOpportunities();
  const open = all.filter(isOpportunityOpen);
  const main = opportunityFilterRow() + (all.length
    ? `<div class="table-wrap"><table class="data-table"><thead><tr>
        <th>Caso</th><th>Empresa</th><th>Contactos</th><th>Estado</th><th>Origen</th><th>Estudio</th><th>Actualizado</th><th></th>
      </tr></thead><tbody>${all.map(opportunityRow).join('')}</tbody></table></div>
      <div class="table-foot"><span>${all.length} oportunidad(es) · ${open.length} abierta(s)</span></div>`
    : `<div class="empty"><h2>Sin oportunidades con estos filtros</h2><p>Ajusta Empresa/Contacto o crea una nueva oportunidad.</p></div>`);

  const byStage = OPPORTUNITY_STAGE.map(s => [s, all.filter(o => o.stage === s).length]).filter(([, n]) => n > 0);
  const inspector =
    insCard('Qué gobierna esta página', `<p><b>Opportunity</b> es el caso comercial y su pipeline. La empresa y los contactos se referencian: el estado comercial nunca vive en la ficha de la persona.</p>`, { accent: true, icon: '◈' })
    + insCard('Pipeline', byStage.length
      ? kvRows(byStage.map(([s, n]) => [s, `<span class="badge ${opportunityStageClass(s)}">${n}</span>`]))
      : `<div class="empty"><p>Sin casos registrados.</p></div>`)
    + insCard('Recorrido', `<ul class="numbered-list">
        <li><span class="n">1</span><div><b>Interacción</b><p>El contacto ocurre y queda registrado.</p></div></li>
        <li><span class="n">2</span><div><b>Oportunidad</b><p>Se abre el caso comercial.</p></div></li>
        <li><span class="n">3</span><div><b>Estudio</b><p>El engagement referencia la oportunidad de origen.</p></div></li>
        <li><span class="n">4</span><div><b>Proyecto</b><p>Sólo si hay decisión de implementación (DEC-054).</p></div></li>
      </ul>`);

  return pageTop('Oportunidades', 'Casos comerciales y su pipeline, separados de la persona y de la empresa.',
      `<button class="btn btn-primary" id="addOpportunityBtn">+ Nueva oportunidad</button>`)
    + workspace(main, inspector);
}
// [AUNEA-FE-PAGE-OPPORTUNITIES-010] END
