// [AUNEA-FE-PAGE-INTERACTIONS-010] START — P03 Interacciones
// PURPOSE: Render the relationship timeline and the pending follow-up. Company and Contact are shown by
//          reference; their master data is never re-asked here (DEC-058).
// SOURCE: DEC-058 (functional contract); DEC-050/051; Architecture Contract v1.5 row P03.
// INPUTS: state.interactions, state.companies, state.contacts.
// OUTPUTS: page markup only. Interaction data is owned by AUNEA-FE-CRM-INTERACTION-010.
// SIDE_EFFECTS: none beyond reading state.
// CHANGE_RISK: MEDIUM.
//
// VISUAL: no approved reference exists for P03 in the 21+2 set, so this uses the global AUNEA System
// visual language. The functional contract is closed by DEC-058 and is fully implemented.

const INTERACTION_PAGE_SIZE=10;
function interactionFilterControl(key,label,options,current,placeholder='Todos',disabled=false){
  const selected=options.find(o=>String(o.value)===String(current));
  return `<div class="filter-group interaction-entity-filter"><span>${esc(label)}</span><details class="aunea-select ${disabled?'is-disabled':''}" data-interaction-filter-box="${attr(key)}" ${disabled?'data-disabled="1"':''}><summary title="${attr(selected?.label||placeholder)}"><span>${esc(selected?.label||placeholder)}</span><i aria-hidden="true"></i></summary><div class="aunea-select-menu" role="listbox" aria-label="${attr(label)}">${disabled?'':`<button type="button" role="option" data-interaction-filter-option="${attr(key)}" data-value="">${esc(placeholder)}</button>${options.map(o=>`<button type="button" role="option" class="${String(current)===String(o.value)?'selected':''}" data-interaction-filter-option="${attr(key)}" data-value="${attr(o.value)}" title="${attr(o.label)}" data-full-label="${attr(o.label)}">${esc(o.label)}</button>`).join('')}`}</div></details></div>`;
}
function interactionFilterRow(){
  const f=state.interactionFilters||{companyId:'',contactId:''};
  const companies=state.companies.map(c=>({value:c.id,label:c.name})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
  const contacts=f.companyId?state.contacts.filter(c=>c.companyId===f.companyId).map(c=>({value:c.id,label:contactFullName(c)})).sort((a,b)=>a.label.localeCompare(b.label,'es')):[];
  return `<div class="filter-row">
    ${interactionFilterControl('companyId','Empresa',companies,f.companyId||'','Todas las empresas')}
    ${interactionFilterControl('contactId','Contacto',contacts,f.contactId||'',f.companyId?'Todos los contactos':'Selecciona empresa',!f.companyId)}
    <button class="link-btn" id="clearInteractionFilters">Limpiar filtros</button>
  </div>`;
}
function visibleInteractions(){
  const f=state.interactionFilters||{};
  return allInteractionsSorted().filter(i=>{
    if(f.companyId&&i.companyId!==f.companyId)return false;
    if(f.contactId&&!(i.contactIds||[]).includes(f.contactId))return false;
    return true;
  });
}

function interactionPagination(rows){
  const totalPages=Math.max(1,Math.ceil(rows.length/INTERACTION_PAGE_SIZE));
  const page=Math.min(Math.max(1,Number(state.interactionPage)||1),totalPages);
  state.interactionPage=page;
  const start=(page-1)*INTERACTION_PAGE_SIZE;
  return {page,totalPages,rows:rows.slice(start,start+INTERACTION_PAGE_SIZE)};
}

function interactionRow(i) {
  const co = companyById(i.companyId);
  const people = (i.contactIds || []).map(cid => contactFullName(contactById(cid))).filter(Boolean);
  return `<tr data-select-interaction="${attr(i.id)}">
    <td>${esc(formatDateEs(i.occurredAt))}</td>
    <td><b>${esc(i.subject || '—')}</b>${i.summary ? `<br><small>${esc(i.summary.slice(0, 90))}${i.summary.length > 90 ? '…' : ''}</small>` : ''}</td>
    <td>${esc(co?.name || '—')}</td>
    <td>${people.length ? esc(people.join(', ')) : '<small>—</small>'}</td>
    <td>${esc(i.type || '—')}<br><small>${esc(i.channel || '')} · ${esc(i.direction || '')}</small></td>
    <td class="interaction-outcome-cell"><span class="badge interaction-outcome ${i.outcome === 'Avanza' ? 'ok' : i.outcome === 'Bloqueado' ? 'off' : i.outcome === 'Requiere seguimiento' ? 'wait' : ''}">${esc(i.outcome || '—')}</span></td>
    <td>${i.nextFollowUpAt ? esc(formatDateEs(i.nextFollowUpAt)) : '—'}</td>
    <td><div class="row-actions"><button class="btn btn-small" data-edit-interaction="${attr(i.id)}">Editar</button><button class="btn btn-small btn-danger" data-delete-interaction="${attr(i.id)}">Eliminar</button></div></td>
  </tr>`;
}

function interactionsPage() {
  const filtered = visibleInteractions();
  const paged=interactionPagination(filtered),all=paged.rows;
  const f=state.interactionFilters||{};
  const upcoming = pendingFollowUp({companyId:f.companyId||null,contactId:f.contactId||null});
  const main = interactionFilterRow() + (all.length
    ? `<div class="table-wrap"><table class="data-table interaction-table"><thead><tr>
        <th>Fecha</th><th>Asunto</th><th>Empresa</th><th>Contactos</th><th>Tipo</th><th class="interaction-outcome-cell">Resultado</th><th>Próximo seguimiento</th><th></th>
      </tr></thead><tbody>${all.map(interactionRow).join('')}</tbody></table></div>
      <div class="table-foot interaction-table-foot"><span>Mostrando ${all.length} de ${filtered.length} interacciones</span>${paged.totalPages>1?`<nav class="crm-pagination interaction-pagination" aria-label="Páginas de interacciones"><button type="button" data-interaction-page="${paged.page-1}" ${paged.page<=1?'disabled':''} aria-label="Página anterior">‹</button>${Array.from({length:paged.totalPages},(_,i)=>i+1).map(n=>`<button type="button" class="${n===paged.page?'active':''}" data-interaction-page="${n}" aria-current="${n===paged.page?'page':'false'}">${n}</button>`).join('')}<button type="button" data-interaction-page="${paged.page+1}" ${paged.page>=paged.totalPages?'disabled':''} aria-label="Página siguiente">›</button></nav>`:''}</div>`
    : `<div class="empty"><h2>Sin interacciones con estos filtros</h2><p>Ajusta Empresa/Contacto o registra una nueva interacción.</p></div>`);

  const inspector =
    insCard('Qué gobierna esta página', `<p><b>Interaction</b> es el dueño del evento de relación y de la fecha de seguimiento que ese evento genera. Empresa, contacto y oportunidad lo reutilizan en modo lectura.</p>`, { accent: true, icon: '◷' })
    + insCard('Próximo seguimiento', upcoming
      ? kvRows([
          ['Cuándo', esc(formatDateEs(upcoming.nextFollowUpAt))],
          ['Origen', esc(upcoming.subject || '—')],
          ['Empresa', esc(companyById(upcoming.companyId)?.name || '—')]
        ])
      : `<div class="empty"><p>No hay seguimientos pendientes.</p></div>`)
    + insCard('Captura única', `<p class="ins-note">Los datos maestros de empresa y contacto no se vuelven a pedir aquí: se referencian. Corregirlos se hace en su página propietaria (DEC-050).</p>`);

  return `<span class="interactions-screen-marker" hidden></span>`+pageTop('Interacciones', 'Histórico de la relación: cada evento se captura una sola vez y alimenta el resto del CRM.',
      `<button class="btn btn-primary" id="addInteractionBtn">+ Nueva interacción</button>`)
    + workspace(main, inspector);
}
// [AUNEA-FE-PAGE-INTERACTIONS-010] END
