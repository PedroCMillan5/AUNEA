// [AUNEA-FE-PAGE-SESSION-DISPLAY-010] START — Session Display (C90-00 … C90-04)
// PURPOSE: The surface the client looks at during the 90-minute session. One persistent AS-IS canvas
//          that gains confirmed frictions, then risks, then impact, and closes with a compact
//          validation panel. It renders only the client-safe projection and never reads the engagement.
// SOURCE: DEC-048/049; 90MIN UI SPEC §§3.2, 3.3, 5; Architecture Contract v1.2 (Session Display).
// INPUTS: the published projection from AUNEA-FE-SESSION-SNAPSHOT-010.
// OUTPUTS: page markup for the shared window.
// SIDE_EFFECTS: none beyond the DOM of the display window.
// CHANGE_RISK: HIGH.

function sessionCanvas(snap) {
  if (!snap.steps.length) {
    return `<div class="empty"><h2>Construyendo el mapa</h2><p>Estamos representando el proceso tal y como funciona hoy.</p></div>`;
  }
  const badgesFor = id => snap.frictions.filter(f => f.steps.includes(id));
  return `<div class="flow-canvas"><div class="flow-track">${snap.steps.map((s, i) => `
    ${i ? '<div class="flow-connector"></div>' : ''}
    <div class="flow-step ${snap.confirmedAsIs ? 'confirmed' : ''} ${s.isDecision ? 'is-decision' : ''}" data-session-step="${attr(s.id)}">
      <h4>${s.n}. ${esc(s.name)}</h4>
      <p>${esc([s.actor, s.tool].filter(Boolean).join(' · ') || '—')}</p>
      <p>${s.activeMin ? `${s.activeMin} min de trabajo` : ''}${s.activeMin && s.waitMin ? ' · ' : ''}${s.waitMin ? `${s.waitMin} min de espera` : ''}</p>
      <div class="friction-badges">${badgesFor(s.id).map(f => `<span class="friction-badge">${esc(f.label)}</span>`).join('')}</div>
    </div>`).join('')}</div></div>`;
}

function sessionLayerPanels(snap) {
  const panels = [];
  if (snap.frictions.length) {
    panels.push(insCard(`Fricciones sobre el proceso (${snap.frictions.length})`,
      `<div class="result-list">${snap.frictions.map(f => `<div class="result-item"><b>${esc(f.label)}</b>${f.signal ? `<p>${esc(f.signal)}</p>` : ''}</div>`).join('')}</div>`, { icon: '◆' }));
  }
  if (snap.risks.length) {
    panels.push(insCard(`Riesgos reconocidos (${snap.risks.length})`,
      `<div class="result-list">${snap.risks.map(r => `<div class="result-item"><b>${esc(r.label)}</b>${r.description ? `<p>${esc(r.description)}</p>` : ''}${r.hasControls ? '<p class="field-help">Con controles ya existentes</p>' : ''}</div>`).join('')}</div>`, { icon: '▲' }));
  }
  if (snap.impacts.length) {
    panels.push(insCard(`Dónde se concentra el impacto (${snap.impacts.length})`,
      `<div class="result-list">${snap.impacts.map(x => `<div class="result-item"><b>${esc(x.label)}</b><p>${x.activeHours ? `${x.activeHours} h de trabajo activo al año` : ''}${x.activeHours && x.waitHours ? ' · ' : ''}${x.waitHours ? `${x.waitHours} h de espera al año` : ''}</p>${x.note ? `<p class="field-help">${esc(x.note)}</p>` : ''}</div>`).join('')}</div>`, { icon: '◈' }));
  }
  return panels.join('');
}

function sessionClosurePanel(snap) {
  const c = snap.closure || {};
  return insCard('¿Refleja esto cómo funciona hoy?',
    kvRows([
      ['Pasos del proceso', String(c.steps ?? 0)],
      ['Fricciones identificadas', String(c.frictions ?? 0)],
      ['Riesgos reconocidos', String(c.risks ?? 0)],
      ['Impactos confirmados', String(c.impacts ?? 0)],
      ['Siguiente paso acordado', c.nextStep ? esc(c.nextStep) : 'Pendiente de acordar']
    ]) + `<p class="ins-note" style="margin-top:10px">Confirmamos juntos el proceso actual, sus fricciones, los riesgos reconocidos y dónde se concentra el impacto.</p>`,
    { accent: true, icon: '✓' });
}

function sessionDisplayPage() {
  const snap = readSessionSnapshot() || { state: 'C90-00', shared: false, steps: [], frictions: [], risks: [], impacts: [] };
  const head = `<div class="session-display-head">
      <div><div class="screen-id">${esc(snap.state)}</div><h1>${esc(snap.process || 'Proceso actual')}</h1>
      <p class="subtitle">${esc(snap.company || '')}</p></div>
      <div id="sessionSync" class="session-sync"></div>
    </div>`;

  // C90-00: PG01–PG03 are Console-only. The client is not shown a substitute screen (DEC-048).
  if (!snap.shared) {
    return head + `<div class="empty session-idle"><h2>La sesión empieza en un momento</h2>
      <p>Estamos preparando el contexto. En cuanto empecemos a dibujar el proceso, aparecerá aquí.</p></div>`;
  }
  const panels = snap.state === 'C90-04'
    ? sessionClosurePanel(snap) + sessionLayerPanels(snap)
    : sessionLayerPanels(snap) || insCard('El proceso actual',
        `<p>Vamos construyendo el mapa de cómo funciona hoy. Dinos si falta algún paso o si alguno no es así.</p>`, { accent: true, icon: '◉' });

  return head + workspace(`<div class="card card-pad">${sessionCanvas(snap)}</div>`, panels);
}

// The shared window renders nothing but the projection. It re-renders when the Console publishes a new
// one, and says so plainly when what is on screen is no longer the last saved state (UI Spec §3.3).
function renderSessionDisplay() {
  const host = document.getElementById('content');
  if (!host) return;
  host.innerHTML = sessionDisplayPage();
  const sync = document.getElementById('sessionSync');
  const snap = readSessionSnapshot();
  if (sync) sync.innerHTML = snap
    ? `<span class="badge ok">Actualizado ${esc(formatDateEs(snap.publishedAt))}</span>`
    : `<span class="badge wait">Esperando a la consola</span>`;
}

function bootSessionDisplay() {
  document.body.classList.add('session-display');
  renderSessionDisplay();
  // A second window cannot share memory with the Console, so the published projection is the channel.
  window.addEventListener('storage', ev => { if (ev.key === SESSION_DISPLAY_KEY) renderSessionDisplay(); });
}

function openSessionDisplay() {
  const res = publishSessionSnapshot(currentEng());
  if (!res.ok) return toast('No se ha podido publicar la vista de sesión: ' + res.error);
  const w = window.open(`${location.pathname}#session`, 'aunea_session_display');
  if (!w) toast('El navegador ha bloqueado la ventana. Permite ventanas emergentes para compartir la sesión.');
}
// [AUNEA-FE-PAGE-SESSION-DISPLAY-010] END
