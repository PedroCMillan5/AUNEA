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

const OPPORTUNITY_PAGE_SIZE=10;
function opportunityFilterControl(key,label,options,current,placeholder='Todos',disabled=false){
  const selected=options.find(o=>String(o.value)===String(current));
  return `<div class="filter-group opportunity-entity-filter"><span>${esc(label)}</span><details class="aunea-select ${disabled?'is-disabled':''}" data-opportunity-filter-box="${attr(key)}" ${disabled?'data-disabled="1"':''}><summary title="${attr(selected?.label||placeholder)}"><span>${esc(selected?.label||placeholder)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}">${disabled?'':`<button type="button" role="option" data-opportunity-filter-option="${attr(key)}" data-value="">${esc(placeholder)}</button>${options.map(o=>`<button type="button" role="option" class="${String(current)===String(o.value)?'selected':''}" data-opportunity-filter-option="${attr(key)}" data-value="${attr(o.value)}" title="${attr(o.label)}" data-full-label="${attr(o.label)}">${esc(o.label)}</button>`).join('')}`}</div></details></div>`;
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

function opportunityPagination(rows){
  const totalPages=Math.max(1,Math.ceil(rows.length/OPPORTUNITY_PAGE_SIZE));
  const page=Math.min(Math.max(1,Number(state.opportunityPage)||1),totalPages);
  state.opportunityPage=page;
  const start=(page-1)*OPPORTUNITY_PAGE_SIZE;
  return {page,totalPages,rows:rows.slice(start,start+OPPORTUNITY_PAGE_SIZE)};
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
      ${isOpportunityOpen(o) && !engs.length ? `<button class="btn btn-small btn-primary" data-opportunity-study="${attr(o.id)}">Crear estudio</button>` : ''}
    </div></td>
  </tr>`;
}

function opportunitiesPage() {
  const all = visibleOpportunities();
  const open = all.filter(isOpportunityOpen);
  const paged=opportunityPagination(all),rows=paged.rows;
  const main = opportunityFilterRow() + (all.length
    ? `<div class="table-wrap"><table class="data-table opportunity-table"><thead><tr>
        <th>Caso</th><th>Empresa</th><th>Contactos</th><th>Estado</th><th>Origen</th><th>Estudio</th><th>Actualizado</th><th></th>
      </tr></thead><tbody>${rows.map(opportunityRow).join('')}</tbody></table></div>
      <div class="table-foot opportunity-table-foot"><span>Mostrando ${rows.length} de ${all.length} oportunidades · ${open.length} abierta(s)</span>${paged.totalPages>1?`<nav class="crm-pagination opportunity-pagination" aria-label="Páginas de oportunidades"><button type="button" data-opportunity-page="${paged.page-1}" ${paged.page<=1?'disabled':''} aria-label="Página anterior">‹</button>${Array.from({length:paged.totalPages},(_,i)=>i+1).map(n=>`<button type="button" class="${n===paged.page?'active':''}" data-opportunity-page="${n}" aria-current="${n===paged.page?'page':'false'}">${n}</button>`).join('')}<button type="button" data-opportunity-page="${paged.page+1}" ${paged.page>=paged.totalPages?'disabled':''} aria-label="Página siguiente">›</button></nav>`:''}</div>`
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

  return `<span class="opportunities-screen-marker" hidden></span>`+pageTop('Oportunidades', 'Casos comerciales y su pipeline, separados de la persona y de la empresa.',
      `<button class="btn btn-primary" id="addOpportunityBtn">+ Nueva oportunidad</button>`)
    + workspace(main, inspector);
}
// [AUNEA-FE-PAGE-OPPORTUNITIES-010] END
