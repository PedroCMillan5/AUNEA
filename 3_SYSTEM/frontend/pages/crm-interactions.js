// [AUNEA-FE-PAGE-INTERACTIONS-010] START — P03 Interacciones
// PURPOSE: Render the relationship timeline and the pending follow-up. Company and Contact are shown by
//          reference; their master data is never re-asked here (DEC-058).
// SOURCE: DEC-058 (functional contract); DEC-050/051; Architecture Contract v1.2 row P03.
// INPUTS: state.interactions, state.companies, state.contacts.
// OUTPUTS: page markup only. Interaction data is owned by AUNEA-FE-CRM-INTERACTION-010.
// SIDE_EFFECTS: none beyond reading state.
// CHANGE_RISK: MEDIUM.
//
// VISUAL: no approved reference exists for P03 in the 21+2 set, so this uses the global AUNEA System
// visual language. The functional contract is closed by DEC-058 and is fully implemented.

function interactionRow(i) {
  const co = companyById(i.companyId);
  const people = (i.contactIds || []).map(cid => contactFullName(contactById(cid))).filter(Boolean);
  return `<tr data-select-interaction="${attr(i.id)}">
    <td>${esc(formatDateEs(i.occurredAt))}</td>
    <td><b>${esc(i.subject || '—')}</b>${i.summary ? `<br><small>${esc(i.summary.slice(0, 90))}${i.summary.length > 90 ? '…' : ''}</small>` : ''}</td>
    <td>${esc(co?.name || '—')}</td>
    <td>${people.length ? esc(people.join(', ')) : '<small>—</small>'}</td>
    <td>${esc(i.type || '—')}<br><small>${esc(i.channel || '')} · ${esc(i.direction || '')}</small></td>
    <td><span class="badge ${i.outcome === 'Avanza' ? 'ok' : i.outcome === 'Bloqueado' ? 'off' : i.outcome === 'Requiere seguimiento' ? 'wait' : ''}">${esc(i.outcome || '—')}</span></td>
    <td>${i.nextFollowUpAt ? esc(formatDateEs(i.nextFollowUpAt)) : '—'}</td>
    <td><div class="row-actions"><button class="btn btn-small" data-edit-interaction="${attr(i.id)}">Editar</button><button class="btn btn-small btn-danger" data-delete-interaction="${attr(i.id)}">Eliminar</button></div></td>
  </tr>`;
}

function interactionsPage() {
  const all = allInteractionsSorted();
  const upcoming = pendingFollowUp();
  const main = all.length
    ? `<div class="table-wrap"><table class="data-table"><thead><tr>
        <th>Fecha</th><th>Asunto</th><th>Empresa</th><th>Contactos</th><th>Tipo</th><th>Resultado</th><th>Próximo seguimiento</th><th></th>
      </tr></thead><tbody>${all.map(interactionRow).join('')}</tbody></table></div>
      <div class="table-foot"><span>${all.length} interacción(es) registradas</span></div>`
    : `<div class="empty"><h2>Sin interacciones registradas</h2><p>Cada reunión, llamada o email se captura una sola vez aquí. Empresa, contacto y oportunidad muestran la última interacción y el próximo seguimiento como proyección, sin guardar una segunda copia.</p></div>`;

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

  return pageTop('Interacciones', 'Histórico de la relación: cada evento se captura una sola vez y alimenta el resto del CRM.',
      `<button class="btn btn-primary" id="addInteractionBtn">+ Nueva interacción</button>`)
    + workspace(main, inspector);
}
// [AUNEA-FE-PAGE-INTERACTIONS-010] END
