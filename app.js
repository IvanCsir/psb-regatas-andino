/**
 * Web Citaciones y Evaluaciones Físicas - Club Regatas Andino
 * Manejo de Citaciones (Primera e Intermedia) y Rendimiento Físico
 * Sincronización en Vivo con Google Sheets (Citaciones y Físico)
 */

// ============================================================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ============================================================================

let matchData = null;
let currentCategory = 'primera'; // 'primera' | 'intermedia'

// Torneo AMH (Clausura Damas B 2026)
const TOURNAMENT_STORAGE_KEY = 'regatas_andino_torneo_v4';
let tournamentData = null;
let currentTournamentDivision = 'primera'; // 'primera' | 'intermedia'
let currentMatchesTab = 'played'; // 'played' | 'pending'

// Evaluaciones Físicas
const PHYSICAL_SPREADSHEET_ID = "1dAoeA0_F4RGLDEjJ0taIJiPA3WlMWl5e";
const PHYSICAL_STORAGE_KEY = "regatas_andino_fisico_v1";
let physicalPlayers = [];
let selectedPlayerId = null;
let currentPhysFilter = "all"; // 'all' | 'PS-B' | 'PS-C' | '5ta'

const STORAGE_KEY = 'regatas_andino_citaciones_v6';
const REQUIRED_PASSWORD = 'ctandinob';

// Definición de Tests Físicos de la Planilla
const TESTS_CONFIG = [
  { key: 'broadJump', name: 'Broad Jump', type: 'Salto Horizontal', unit: 'm', higherIsBetter: true, icon: '🏃‍♀️', decimals: 2, cols: [3, 4, 5] },
  { key: 'cmj', name: 'CMJ (Salto Vertical)', type: 'Salto con Contramovimiento', unit: 'cm', higherIsBetter: true, icon: '⚡', decimals: 1, cols: [6, 7, 8] },
  { key: 'agility', name: 'Test 5-10-5', type: 'Agilidad Pro Agility', unit: 'seg', higherIsBetter: false, icon: '⏱️', decimals: 2, cols: [9, 10, 11] },
  { key: 'sprint', name: 'Velocidad 40 mts', type: 'Aceleración Lineal', unit: 'seg', higherIsBetter: false, icon: '💨', decimals: 2, cols: [12, 13, 14] },
  { key: 'yoyo', name: 'Yo-Yo Test', type: 'Resistencia Intermitente', unit: 'm', higherIsBetter: true, icon: '🫁', decimals: 0, cols: [15, 16, 17] },
  { key: 'bench', name: 'Press de Banca', type: 'Fuerza Tren Superior', unit: 'kg', higherIsBetter: true, icon: '🏋️‍♀️', decimals: 1, cols: [18, 19, 20] },
  { key: 'deadlift', name: 'Peso Muerto', type: 'Fuerza Cadena Posterior', unit: 'kg', higherIsBetter: true, icon: '🏋️', decimals: 1, cols: [21, 22, 23] },
  { key: 'squat', name: 'Sentadilla', type: 'Fuerza Tren Inferior', unit: 'kg', higherIsBetter: true, icon: '🦵', decimals: 1, cols: [24, 25, 26] },
  { key: 'platform', name: 'Plataforma', type: 'Potencia', unit: '', higherIsBetter: true, icon: '🎯', decimals: 1, cols: [27, 28, 29] }
];

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadTournamentData();
  render();
  renderTournamentView();
  setupCategorySwitch();
  setupTournamentCategorySwitch();
  setupViewSwitching();
  setupEvents();
  setupPhysicalSection();
  initDtModule();

  // Sincronizaciones en vivo
  syncWithGoogleSheets(); // Citaciones
  loadPhysicalEvaluations(); // Físico
  syncTournamentData(); // Torneo AMH

  // Actualizaciones automáticas en segundo plano y foco
  setInterval(() => {
    syncWithGoogleSheets();
    loadPhysicalEvaluations();
    syncTournamentData();
  }, 60000);

  window.addEventListener('focus', () => {
    syncWithGoogleSheets();
    loadPhysicalEvaluations();
    syncTournamentData();
  });
});

// ============================================================================
// NAVEGACIÓN DISCRETA ENTRE CITACIÓN, TORNEO Y EVALUACIONES FÍSICAS
// ============================================================================

let currentActiveView = 'citacion'; // 'citacion' | 'torneo' | 'fisico' | 'dt'

function setupViewSwitching() {
  // Botones del Dock Inferior
  const dockBtns = document.querySelectorAll('.nav-dock-btn');
  dockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      if (targetView) showView(targetView);
    });
  });

  // Banners desde la vista de Citación
  const btnTournamentBanner = document.getElementById('btnOpenTournamentFromBanner');
  if (btnTournamentBanner) {
    btnTournamentBanner.addEventListener('click', () => showView('torneo'));
  }

  const btnPhysicalBanner = document.getElementById('btnOpenPhysicalFromBanner');
  if (btnPhysicalBanner) {
    btnPhysicalBanner.addEventListener('click', () => showView('fisico'));
  }

  // Botones de Retorno a Citación
  const btnReturnFromTorneo = document.getElementById('btnReturnToCitacionFromTorneo');
  if (btnReturnFromTorneo) {
    btnReturnFromTorneo.addEventListener('click', () => showView('citacion'));
  }

  const btnReturnFromFisico = document.getElementById('btnReturnToCitacion');
  if (btnReturnFromFisico) {
    btnReturnFromFisico.addEventListener('click', () => showView('citacion'));
  }

  const btnReturnFromDT = document.getElementById('btnReturnToCitacionFromDT');
  if (btnReturnFromDT) {
    btnReturnFromDT.addEventListener('click', () => showView('citacion'));
  }
}

function showView(viewName) {
  const viewCitacion = document.getElementById('viewCitacion');
  const viewTorneo = document.getElementById('viewTorneo');
  const viewFisico = document.getElementById('viewFisico');
  const viewDT = document.getElementById('viewDT');

  currentActiveView = viewName;

  if (viewCitacion) viewCitacion.style.display = viewName === 'citacion' ? 'flex' : 'none';
  if (viewTorneo) viewTorneo.style.display = viewName === 'torneo' ? 'flex' : 'none';
  if (viewFisico) viewFisico.style.display = viewName === 'fisico' ? 'flex' : 'none';
  if (viewDT) viewDT.style.display = viewName === 'dt' ? 'flex' : 'none';

  // Actualizar estado activo en la barra de navegación inferior
  document.querySelectorAll('.nav-dock-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  if (viewName === 'torneo') {
    renderTournamentView();
  } else if (viewName === 'fisico') {
    if (physicalPlayers.length > 0 && !selectedPlayerId) {
      renderPhysicalSuggestions();
    }
  } else if (viewName === 'dt') {
    handleDtViewOpen();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// CARGA Y RENDERIZADO DEL TORNEO (AMH CLAUSURA DAMAS B 2026)
// ============================================================================

function loadTournamentData() {
  // Limpieza de versiones viejas con posibles partidos asignados erróneamente
  try {
    localStorage.removeItem('regatas_andino_torneo_v1');
    localStorage.removeItem('regatas_andino_torneo_v2');
    localStorage.removeItem('regatas_andino_torneo_v3');
  } catch (e) {}

  const saved = localStorage.getItem(TOURNAMENT_STORAGE_KEY);
  if (saved) {
    try {
      tournamentData = JSON.parse(saved);
      if (!tournamentData.primera || !tournamentData.intermedia) {
        tournamentData = JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT_DATA));
      }
    } catch (e) {
      tournamentData = JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT_DATA));
    }
  } else {
    tournamentData = JSON.parse(JSON.stringify(DEFAULT_TOURNAMENT_DATA));
  }

  // Sanitización de seguridad:
  // En AMH Oficial, Murialdo es Fecha 12 (programado para 24/10/2026) y tiene estado X (Pendiente).
  // NUNCA debe figurar como jugado ni con derrota.
  ['primera', 'intermedia'].forEach(div => {
    if (tournamentData[div] && Array.isArray(tournamentData[div].matches)) {
      tournamentData[div].matches = tournamentData[div].matches.filter(m => {
        const rivalName = (m.rival || '').toUpperCase();
        if (rivalName.includes('MURIALDO')) return false;
        return m.status === 'Jugado' || m.played === true;
      });
    }
    if (!tournamentData[div].nextMatch && DEFAULT_TOURNAMENT_DATA[div] && DEFAULT_TOURNAMENT_DATA[div].nextMatch) {
      tournamentData[div].nextMatch = DEFAULT_TOURNAMENT_DATA[div].nextMatch;
    }
    if ((!tournamentData[div].pendingMatches || tournamentData[div].pendingMatches.length === 0) && DEFAULT_TOURNAMENT_DATA[div] && DEFAULT_TOURNAMENT_DATA[div].pendingMatches) {
      tournamentData[div].pendingMatches = DEFAULT_TOURNAMENT_DATA[div].pendingMatches;
    }
  });
}

function setupTournamentCategorySwitch() {
  const pillPrimera = document.getElementById('pillPrimera');
  const pillIntermedia = document.getElementById('pillIntermedia');

  if (pillPrimera) {
    pillPrimera.addEventListener('click', () => {
      setTournamentDivision('primera');
    });
  }

  if (pillIntermedia) {
    pillIntermedia.addEventListener('click', () => {
      setTournamentDivision('intermedia');
    });
  }

  // Subtabs de Partidos: Jugados vs Por Jugar
  const tabPlayed = document.getElementById('tabMatchesPlayed');
  const tabPending = document.getElementById('tabMatchesPending');

  if (tabPlayed) {
    tabPlayed.addEventListener('click', () => {
      currentMatchesTab = 'played';
      tabPlayed.classList.add('active');
      if (tabPending) tabPending.classList.remove('active');
      const divData = tournamentData[currentTournamentDivision] || tournamentData.primera;
      renderTournamentMatches(divData);
    });
  }

  if (tabPending) {
    tabPending.addEventListener('click', () => {
      currentMatchesTab = 'pending';
      tabPending.classList.add('active');
      if (tabPlayed) tabPlayed.classList.remove('active');
      const divData = tournamentData[currentTournamentDivision] || tournamentData.primera;
      renderTournamentMatches(divData);
    });
  }

  const btnSyncAmh = document.getElementById('btnSyncAmh');
  if (btnSyncAmh) {
    btnSyncAmh.addEventListener('click', () => {
      syncTournamentData(true);
    });
  }
}

function setTournamentDivision(division) {
  currentTournamentDivision = division;

  const pillPrimera = document.getElementById('pillPrimera');
  const pillIntermedia = document.getElementById('pillIntermedia');

  if (pillPrimera) pillPrimera.classList.toggle('active', division === 'primera');
  if (pillIntermedia) pillIntermedia.classList.toggle('active', division === 'intermedia');

  renderTournamentView();
}

function renderTournamentView() {
  if (!tournamentData) loadTournamentData();
  const divData = tournamentData[currentTournamentDivision] || tournamentData.primera;

  renderRegatasSummary(divData);
  renderTournamentMatches(divData);
  renderStandingsTable(divData);
}

function renderRegatasSummary(divData) {
  const container = document.getElementById('regatasSummaryCard');
  if (!container) return;

  const standings = divData.standings || [];
  const regatas = standings.find(t => t.team.toUpperCase().includes('REGATAS')) || {
    pos: '-', pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, ge: 0, dif: 0
  };

  const difFormatted = regatas.dif > 0 ? `+${regatas.dif}` : `${regatas.dif}`;
  const difColor = regatas.dif > 0 ? '#34d399' : (regatas.dif < 0 ? '#f87171' : '#ffffff');

  container.innerHTML = `
    <div class="regatas-summary-header">
      <div class="regatas-team-badge-group">
        <img src="escudo-regatas-andino.png" alt="Regatas Andino" class="regatas-mini-escudo">
        <div class="regatas-team-titles">
          <h4>REGATAS ANDINO - B</h4>
          <span>${escapeHtml(divData.divisionTitle)} • ZONA A</span>
        </div>
      </div>
      <div class="regatas-pos-callout">
        <div class="regatas-pos-number">#${regatas.pos}</div>
        <div class="regatas-pos-label">Posición</div>
      </div>
    </div>

    <div class="regatas-stats-grid">
      <div class="regatas-stat-cell">
        <div class="regatas-stat-val pts-highlight">${regatas.pts}</div>
        <div class="regatas-stat-lbl">Puntos</div>
      </div>
      <div class="regatas-stat-cell">
        <div class="regatas-stat-val">${regatas.pj}</div>
        <div class="regatas-stat-lbl">PJ</div>
      </div>
      <div class="regatas-stat-cell">
        <div class="regatas-stat-val" style="color: #34d399;">${regatas.pg}</div>
        <div class="regatas-stat-lbl">PG</div>
      </div>
      <div class="regatas-stat-cell">
        <div class="regatas-stat-val" style="color: #fbbf24;">${regatas.pe}</div>
        <div class="regatas-stat-lbl">PE</div>
      </div>
      <div class="regatas-stat-cell">
        <div class="regatas-stat-val" style="color: #f87171;">${regatas.pp}</div>
        <div class="regatas-stat-lbl">PP</div>
      </div>
      <div class="regatas-stat-cell">
        <div class="regatas-stat-val">${regatas.gf}</div>
        <div class="regatas-stat-lbl">GF</div>
      </div>
      <div class="regatas-stat-cell">
        <div class="regatas-stat-val">${regatas.ge}</div>
        <div class="regatas-stat-lbl">GE</div>
      </div>
      <div class="regatas-stat-cell">
        <div class="regatas-stat-val" style="color: ${difColor};">${difFormatted}</div>
        <div class="regatas-stat-lbl">DIF</div>
      </div>
    </div>
  `;
}

function renderTournamentMatches(divData) {
  const subtitle = document.getElementById('matchesCategorySubtitle');

  // Filtrar estrictamente solo jugados (sin Murialdo ni partidos pendientes con X)
  const rawPlayed = (divData.matches || []).filter(m => {
    if ((m.rival || '').toUpperCase().includes('MURIALDO')) return false;
    return m.status === 'Jugado' || m.played === true;
  });

  // Partidos pendientes de jugar
  const pending = divData.pendingMatches || (DEFAULT_TOURNAMENT_DATA[currentTournamentDivision] && DEFAULT_TOURNAMENT_DATA[currentTournamentDivision].pendingMatches) || [];

  // Actualizar contadores en los botones del subswitch
  const countPlayed = document.getElementById('countPlayedBadge');
  if (countPlayed) countPlayed.textContent = `${rawPlayed.length}`;

  const countPending = document.getElementById('countPendingBadge');
  if (countPending) countPending.textContent = `${pending.length}`;

  // Sincronizar estado visual de los tabs
  const tabPlayed = document.getElementById('tabMatchesPlayed');
  const tabPending = document.getElementById('tabMatchesPending');
  if (tabPlayed) tabPlayed.classList.toggle('active', currentMatchesTab === 'played');
  if (tabPending) tabPending.classList.toggle('active', currentMatchesTab === 'pending');

  const listContainer = document.getElementById('tournamentMatchesList');
  if (!listContainer) return;

  // -------------------------------------------------------------
  // VISTA: PARTIDOS POR JUGAR (FIXTURE RESTANTE)
  // -------------------------------------------------------------
  if (currentMatchesTab === 'pending') {
    if (subtitle) {
      subtitle.textContent = `Fixture por disputarse en ${divData.divisionTitle}`;
    }

    if (pending.length === 0) {
      listContainer.innerHTML = '<div style="text-align: center; color: #9bb1d6; padding: 24px;">No hay partidos pendientes programados.</div>';
      return;
    }

    listContainer.innerHTML = pending.map((m, idx) => {
      const isImminent = idx === 0;
      const isHome = (m.homeAway || 'Local').toLowerCase().includes('local');
      const conditionIcon = isHome ? '🏠' : '🚌';

      return `
        <div class="pending-match-item-card ${isImminent ? 'is-imminent' : ''}">
          <div class="match-item-info">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="match-item-round" style="color: #fbbf24;">${escapeHtml(m.round)}</span>
              ${isImminent ? '<span class="pending-badge-imminent">PRÓXIMO EN JUEGO</span>' : ''}
            </div>
            <span class="match-item-rival">vs ${escapeHtml(m.rival)}</span>
            <span class="match-item-condition">${conditionIcon} ${escapeHtml(m.homeAway || 'Local')}</span>
          </div>
          <div class="match-item-result-group">
            <span class="pending-date-pill">📅 ${escapeHtml(m.fecha || 'A confirmar')}</span>
          </div>
        </div>
      `;
    }).join('');
    return;
  }

  // -------------------------------------------------------------
  // VISTA: PARTIDOS JUGADOS (DISPUTADOS)
  // -------------------------------------------------------------
  if (subtitle) {
    subtitle.textContent = `Fechas disputadas en ${divData.divisionTitle}`;
  }

  // Mostramos del más reciente disputado (Fecha 11) al primero (Fecha 1)
  const matches = [...rawPlayed].reverse();

  // Próximo partido por disputarse (ej: Fecha 12 vs Murialdo B) para mostrar preview interactivo arriba
  const nextMatch = divData.nextMatch || (pending.length > 0 ? pending[0] : null);

  const nextMatchHtml = nextMatch ? `
    <div class="next-match-banner" style="cursor: pointer;" onclick="document.getElementById('tabMatchesPending').click();" title="Clic para ver el fixture restante completo">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span class="next-match-tag">⏳ PRÓXIMO PARTIDO • ${escapeHtml(nextMatch.round)}</span>
        <span style="font-size: 0.65rem; color: #fbbf24; font-weight: 700;">Ver fixture restante ➔</span>
      </div>
      <div class="next-match-content">
        <div class="next-match-rival-box">
          <span class="next-match-rival">vs ${escapeHtml(nextMatch.rival)}</span>
          <span class="next-match-condition">${escapeHtml(nextMatch.homeAway || 'Local')}${nextMatch.fecha ? ` • ${escapeHtml(nextMatch.fecha)}` : ''}</span>
        </div>
        <span class="next-match-pill-pending">Por disputarse (X)</span>
      </div>
    </div>
  ` : '';

  if (matches.length === 0) {
    listContainer.innerHTML = nextMatchHtml + '<div style="text-align: center; color: #9bb1d6; padding: 20px;">Sin partidos disputados registrados.</div>';
    return;
  }

  const matchesHtml = matches.map((m, idx) => {
    const resClass = m.result || 'loss';
    const resLabel = resClass === 'win' ? 'Victoria' : (resClass === 'draw' ? 'Empate' : 'Derrota');
    const isLatest = idx === 0;

    return `
      <div class="match-item-card ${isLatest ? 'is-latest-match' : ''}">
        <div class="match-item-info">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="match-item-round">${escapeHtml(m.round)}</span>
            ${isLatest ? '<span class="latest-match-badge">ÚLTIMO JUGADO</span>' : ''}
          </div>
          <span class="match-item-rival">${escapeHtml(m.rival)}</span>
          <span class="match-item-condition">${escapeHtml(m.homeAway || 'Local')}${m.fecha ? ` • ${escapeHtml(m.fecha)}` : ''}</span>
        </div>
        <div class="match-item-result-group">
          <span class="match-item-score">${escapeHtml(m.score || '-')}</span>
          <span class="match-pill-result ${resClass}">${resLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  listContainer.innerHTML = nextMatchHtml + matchesHtml;
}

function renderStandingsTable(divData) {
  const subtitle = document.getElementById('tableCategorySubtitle');
  if (subtitle) {
    subtitle.textContent = `Zona A • ${divData.divisionTitle} • AMH Oficial`;
  }

  const tbody = document.getElementById('standingsTableBody');
  if (!tbody) return;

  const standings = divData.standings || [];
  if (standings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="padding: 24px; color: #9bb1d6;">Cargando tabla de posiciones...</td></tr>';
    return;
  }

  tbody.innerHTML = standings.map(row => {
    const isRegatas = row.team.toUpperCase().includes('REGATAS');
    const rowClass = isRegatas ? 'class="row-regatas"' : '';
    const difDisplay = row.dif > 0 ? `+${row.dif}` : row.dif;
    const difColor = row.dif > 0 ? '#34d399' : (row.dif < 0 ? '#f87171' : 'inherit');

    return `
      <tr ${rowClass}>
        <td class="td-pos">${row.pos}</td>
        <td class="td-team" title="${escapeHtml(row.team)}">
          ${escapeHtml(row.team)}
          ${isRegatas ? '<span class="regatas-star-tag">⭐ CLUB</span>' : ''}
        </td>
        <td>${row.pj}</td>
        <td>${row.pg}</td>
        <td>${row.pe}</td>
        <td>${row.pp}</td>
        <td>${row.gf}</td>
        <td>${row.ge}</td>
        <td style="font-weight: 700; color: ${difColor}">${difDisplay}</td>
        <td class="td-pts">${row.pts}</td>
      </tr>
    `;
  }).join('');
}

function renderTournamentScorers(divData) {
  const listContainer = document.getElementById('tournamentScorersList');
  if (!listContainer) return;

  const scorers = divData.scorers || [];
  if (scorers.length === 0) {
    listContainer.innerHTML = '<div style="text-align: center; color: #9bb1d6; padding: 16px;">Sin goleadoras registradas.</div>';
    return;
  }

  listContainer.innerHTML = scorers.slice(0, 10).map((s, idx) => `
    <div class="scorer-item">
      <span class="scorer-rank">#${idx + 1}</span>
      <div class="scorer-info">
        <div class="scorer-name">${escapeHtml(s.player)}</div>
        <div class="scorer-club">${escapeHtml(s.club)}</div>
      </div>
      <span class="scorer-goals-badge">${s.goals} goles</span>
    </div>
  `).join('');
}

function updateAmhLinks(divData) {
  const btnStandings = document.getElementById('btnOpenAmhStandings');
  if (btnStandings && divData.officialUrl) {
    btnStandings.href = divData.officialUrl;
  }

  const btnMatches = document.getElementById('btnOpenAmhMatches');
  if (btnMatches && divData.officialMatchesUrl) {
    btnMatches.href = divData.officialMatchesUrl;
  }
}

// Parser cliente para extraer la tabla directamente del HTML de AMH si el proxy local no está activo
function parseStandingsFromAmhHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('tr');
    const tableData = [];
    rows.forEach(r => {
      const cells = Array.from(r.querySelectorAll('td, th')).map(c => c.textContent.trim());
      if (cells.length === 0 || cells.every(c => !c)) return;
      if (cells.includes('Jugador') || cells.includes('Goles') || cells.includes('Posición') || cells.includes('Equipo')) return;
      const filtered = cells.filter(c => c !== '');
      if (filtered.length >= 10) {
        tableData.push({
          pos: parseInt(filtered[0], 10),
          zona: filtered[1],
          team: filtered[2],
          pj: parseInt(filtered[3], 10),
          pg: parseInt(filtered[4], 10),
          pe: parseInt(filtered[5], 10),
          pp: parseInt(filtered[6], 10),
          gf: parseInt(filtered[7], 10),
          ge: parseInt(filtered[8], 10),
          dif: parseInt(filtered[9], 10),
          bonus: parseInt(filtered[10] || 0, 10),
          pts: parseInt(filtered[filtered.length - 1], 10)
        });
      }
    });
    return tableData;
  } catch (e) {
    return [];
  }
}

// Sincronización con el servidor local o directo con AMH
async function syncTournamentData(manual = false) {
  const btnSync = document.getElementById('btnSyncAmh');
  const badge = document.getElementById('amhSyncTimeBadge');
  if (btnSync) btnSync.classList.add('is-loading');

  try {
    let syncedAny = false;

    const fetchDiv = async (divId) => {
      // 1. Intentar vía API proxy local / serverless
      try {
        const res = await fetch(`/api/torneo?division=${divId}&_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.standings && data.standings.length > 0) return data;
        }
      } catch (e) {}

      // 2. Fallback: Si estamos en http (localhost, Live Server, red local), GET directo a AMH
      if (window.location.protocol === 'http:') {
        try {
          const directRes = await fetch(`http://15.235.75.172:8080/ords/r/amh/torneos/5?p5_torneos_f=97&p5_jug_cod_division_f=${divId}`);
          if (directRes.ok) {
            const html = await directRes.text();
            const standings = parseStandingsFromAmhHtml(html);
            if (standings.length > 0) return { standings };
          }
        } catch (e) {}
      }
      return null;
    };

    const fetchMatches = async (divId) => {
      try {
        const res = await fetch(`/api/torneo/matches?division=${divId}&_t=${Date.now()}`);
        if (res.ok) return await res.json();
      } catch (e) {}
      return null;
    };

    // Fetch standings
    const [res1, res2] = await Promise.all([fetchDiv('1'), fetchDiv('2')]);

    if (res1 && res1.standings && res1.standings.length > 0) {
      tournamentData.primera.standings = res1.standings;
      if (res1.scorers && res1.scorers.length > 0) {
        tournamentData.primera.scorers = res1.scorers;
      }
      syncedAny = true;
    }

    if (res2 && res2.standings && res2.standings.length > 0) {
      tournamentData.intermedia.standings = res2.standings;
      if (res2.scorers && res2.scorers.length > 0) {
        tournamentData.intermedia.scorers = res2.scorers;
      }
      syncedAny = true;
    }

    // Fetch match results
    const [m1, m2] = await Promise.all([fetchMatches('1'), fetchMatches('2')]);

    if (m1) {
      const played = (m1.playedMatches || (m1.matches || []).filter(m => m.played)).filter(m => !(m.rival || '').toUpperCase().includes('MURIALDO'));
      if (played.length > 0) tournamentData.primera.matches = played;
      if (m1.nextMatch) tournamentData.primera.nextMatch = m1.nextMatch;
      if (m1.pendingMatches && m1.pendingMatches.length > 0) tournamentData.primera.pendingMatches = m1.pendingMatches;
    }

    if (m2) {
      const played = (m2.playedMatches || (m2.matches || []).filter(m => m.played)).filter(m => !(m.rival || '').toUpperCase().includes('MURIALDO'));
      if (played.length > 0) tournamentData.intermedia.matches = played;
      if (m2.nextMatch) tournamentData.intermedia.nextMatch = m2.nextMatch;
      if (m2.pendingMatches && m2.pendingMatches.length > 0) tournamentData.intermedia.pendingMatches = m2.pendingMatches;
    }

    if (syncedAny) {
      localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(tournamentData));
      if (badge) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        badge.innerHTML = `<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span> Sincronizado AMH ${timeStr}`;
      }
    }

    if (currentActiveView === 'torneo') {
      renderTournamentView();
    }

    if (manual) {
      if (syncedAny) {
        showToast('✅ Tabla de posiciones actualizada desde AMH');
      } else {
        showToast('ℹ️ Datos al día con el sitio oficial de AMH');
      }
    }
  } catch (err) {
    if (manual) {
      showToast('ℹ️ Usando datos cacheados de AMH');
    }
  } finally {
    if (btnSync) btnSync.classList.remove('is-loading');
  }
}

// ============================================================================
// CARGA Y PERSISTENCIA DE CITACIONES
// ============================================================================

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      matchData = JSON.parse(saved);
      if (!matchData.primera || !matchData.intermedia) {
        matchData = JSON.parse(JSON.stringify(DEFAULT_MATCH_DATA));
      }
    } catch (e) {
      matchData = JSON.parse(JSON.stringify(DEFAULT_MATCH_DATA));
    }
  } else {
    matchData = JSON.parse(JSON.stringify(DEFAULT_MATCH_DATA));
  }

  if (!matchData.motto || matchData.motto === 'Nuestra identidad no cambia, cambian nuestros desafíos.') {
    matchData.motto = 'Juntas somos más';
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matchData));
}

// ============================================================================
// RENDERIZADO DE CITACIONES
// ============================================================================

function render() {
  // 1. Datos Generales del Partido
  const fixtureEl = document.getElementById('dispFixture');
  if (fixtureEl) {
    const round = (matchData.fixtureRound || 'FECHA 10').toUpperCase();
    const tournament = (matchData.tournament || 'TORNEO CLAUSURA').toUpperCase();
    fixtureEl.textContent = `${round} • ${tournament}`;
  }

  const rivalEl = document.getElementById('dispRivalName');
  if (rivalEl) {
    rivalEl.textContent = (matchData.rival || 'RIVAL').toUpperCase();
  }

  const dateEl = document.getElementById('dispDate');
  if (dateEl) {
    dateEl.textContent = matchData.dateDisplay || '';
  }

  const locEl = document.getElementById('dispLocation');
  if (locEl) {
    locEl.textContent = matchData.location || '';
  }

  const photoMottoEl = document.querySelector('.team-photo-motto');
  if (photoMottoEl) {
    photoMottoEl.textContent = `"${matchData.motto || 'Juntas somos más'}"`;
  }

  document.title = `Regatas Andino Hockey | ${matchData.rival || 'Plantel Superior B'}`;

  // 2. Escudo del Rival
  renderRivalLogo();

  // 3. Horarios y Lista según Categoría Activa
  renderActiveCategory();
}

// ============================================================================
// COLORES OFICIALES Y DETECCIÓN DINÁMICA DE ESCUDO DEL RIVAL
// ============================================================================

const KNOWN_CLUB_COLORS = {
  'MURIALDO': '#fbbf24',        // Amarillo Canario / Dorado
  'MARISTA': '#ef4444',         // Rojo Tricolor
  'LOS TORDOS': '#3b82f6',      // Azul Azulgrana
  'OBRAS': '#dc2626',           // Rojo
  'RIVADAVIA': '#ea580c',       // Naranja
  'ALEMAN': '#b91c1c',          // Rojo
  'BCO MZA': '#10b981',         // Verde
  'BANCO MENDOZA': '#10b981',   // Verde
  'TEQÜE': '#2563eb',           // Azul
  'TEQUE': '#2563eb',           // Azul
  'LICEO': '#0284c7',           // Celeste
  'SAN JORGE': '#ef4444',       // Rojo
  'SAN RAFAEL': '#0284c7',      // Celeste / Azul
  'PUMAI': '#f97316',           // Naranja
  'CABNA': '#0d9488',           // Verde azulado
  'PEUMAYEN': '#84cc16',        // Verde
  'VISTALBA': '#16a34a',        // Verde
  'TACURU': '#15803d',          // Verde
  'UNIÓN': '#6366f1',           // Azul
  'MENDOZA RC': '#ffffff'       // Blanco
};

function getClubFallbackColor(rivalName) {
  const upper = (rivalName || '').toUpperCase();
  for (const [key, color] of Object.entries(KNOWN_CLUB_COLORS)) {
    if (upper.includes(key)) return color;
  }
  return '#fbbf24'; // Color cálido por defecto
}

function applyRivalCircleColor(colorHexOrRgb) {
  const container = document.getElementById('rivalBadgeContainer');
  if (!container) return;

  container.style.borderColor = colorHexOrRgb;

  let glowColor = colorHexOrRgb;
  if (colorHexOrRgb.startsWith('#')) {
    const hex = colorHexOrRgb.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 251;
    const g = parseInt(hex.substring(2, 4), 16) || 191;
    const b = parseInt(hex.substring(4, 6), 16) || 36;
    glowColor = `rgba(${r}, ${g}, ${b}, 0.35)`;
  } else if (colorHexOrRgb.startsWith('rgb(')) {
    glowColor = colorHexOrRgb.replace('rgb(', 'rgba(').replace(')', ', 0.35)');
  }

  container.style.boxShadow = `0 0 25px ${glowColor}`;
}

function extractDominantImageColor(imgEl, callback) {
  const runExtraction = () => {
    try {
      const canvas = document.createElement('canvas');
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0, size, size);

      const imgData = ctx.getImageData(0, 0, size, size).data;
      const buckets = {};
      let maxScore = 0;
      let dominant = null;

      for (let i = 0; i < imgData.length; i += 4) {
        const a = imgData[i + 3];
        if (a < 120) continue; // Descartar píxeles transparentes

        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];

        // Descartar fondos blancos / negros puros y grises apagados
        if (r > 240 && g > 240 && b > 240) continue;
        if (r < 25 && g < 25 && b < 25) continue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat < 0.18) continue; // Descartar escala de grises

        // Agrupar en cubos de color de 24 niveles
        const qr = Math.round(r / 24) * 24;
        const qg = Math.round(g / 24) * 24;
        const qb = Math.round(b / 24) * 24;
        const key = `${qr},${qg},${qb}`;

        // Ponderar por saturación para preferir los colores vivos del escudo
        const score = 1 + sat * 2.5;
        buckets[key] = (buckets[key] || 0) + score;

        if (buckets[key] > maxScore) {
          maxScore = buckets[key];
          dominant = { r: qr, g: qg, b: qb };
        }
      }

      if (dominant) {
        callback(`rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`);
        return;
      }
    } catch (e) {
      // Si la imagen proviene de un dominio externo sin CORS permitido
    }
    callback(null);
  };

  if (imgEl.complete && imgEl.naturalWidth > 0) {
    runExtraction();
  } else {
    imgEl.addEventListener('load', runExtraction, { once: true });
  }
}

function renderRivalLogo() {
  const container = document.getElementById('rivalBadgeContainer');
  if (!container) return;

  const rivalName = matchData.rival || 'R';
  const initial = rivalName.trim().charAt(0).toUpperCase() || 'R';
  const fallbackColor = getClubFallbackColor(rivalName);

  // Aplicar inmediatamente el color del club para evitar saltos visuales
  applyRivalCircleColor(fallbackColor);

  if (matchData.rivalLogo && matchData.rivalLogo.trim() !== '') {
    const img = document.createElement('img');
    img.src = matchData.rivalLogo;
    img.alt = rivalName;
    img.crossOrigin = 'anonymous';

    img.onerror = () => {
      container.innerHTML = `<span class="team-badge-initial" style="color: ${fallbackColor};">${initial}</span>`;
      applyRivalCircleColor(fallbackColor);
    };

    // Intentar extraer el color predominante directamente de la imagen
    extractDominantImageColor(img, (dominantColor) => {
      if (dominantColor) {
        applyRivalCircleColor(dominantColor);
      }
    });

    container.innerHTML = '';
    container.appendChild(img);
  } else {
    container.innerHTML = `<span class="team-badge-initial" style="color: ${fallbackColor};">${initial}</span>`;
  }
}

function renderActiveCategory() {
  const catData = matchData[currentCategory] || matchData.primera;

  const catNameEl = document.getElementById('scheduleCatName');
  if (catNameEl) {
    catNameEl.textContent = currentCategory === 'primera' ? '1RA' : 'INTER';
  }

  const callEl = document.getElementById('dispCallTime');
  if (callEl) {
    callEl.textContent = catData.callTime || '--:--';
  }

  const matchEl = document.getElementById('dispMatchTime');
  if (matchEl) {
    matchEl.textContent = catData.matchTime || '--:--';
  }

  const tag = document.getElementById('rosterCategoryTag');
  if (tag) {
    tag.textContent = currentCategory === 'primera' ? '1RA DIVISIÓN' : 'INTERMEDIA';
  }

  const countBadge = document.getElementById('playerCount');
  const listContainer = document.getElementById('playersList');
  const players = catData.players || [];

  if (countBadge) {
    countBadge.textContent = `${players.length} JUGADORAS`;
  }

  if (!listContainer) return;

  if (!players.length) {
    listContainer.innerHTML = '<div style="text-align: center; color: #9bb1d6; padding: 20px;">No hay jugadoras citadas aún para esta categoría.</div>';
    return;
  }

  listContainer.innerHTML = players.map((name, idx) => `
    <div class="player-item">
      <span class="player-idx">${idx + 1}.</span>
      <span class="player-name">${escapeHtml(name)}</span>
    </div>
  `).join('');
}

function setupCategorySwitch() {
  const btn1ra = document.getElementById('btnCatPrimera');
  const btnInter = document.getElementById('btnCatIntermedia');

  if (btn1ra && btnInter) {
    btn1ra.addEventListener('click', () => {
      btn1ra.classList.add('active');
      btnInter.classList.remove('active');
      currentCategory = 'primera';
      renderActiveCategory();
    });

    btnInter.addEventListener('click', () => {
      btnInter.classList.add('active');
      btn1ra.classList.remove('active');
      currentCategory = 'intermedia';
      renderActiveCategory();
    });
  }
}

// ============================================================================
// EVENTOS Y MODAL CUERPO TÉCNICO
// ============================================================================

function setupEvents() {
  const modal = document.getElementById('editModal');
  const btnOpen = document.getElementById('btnOpenEdit');
  const btnClose = document.getElementById('btnCloseEdit');
  const btnCloseBottom = document.getElementById('btnCloseModalBottom');
  const authGate = document.getElementById('authGate');
  const authInput = document.getElementById('authPasswordInput');
  const authBtn = document.getElementById('btnSubmitAuth');
  const authError = document.getElementById('authErrorMsg');
  const formBody = document.getElementById('editFormBody');
  const btnSyncNow = document.getElementById('btnSyncNow');

  const closeModal = () => {
    if (modal) modal.classList.remove('active');
  };

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      authGate.style.display = 'block';
      formBody.style.display = 'none';
      authInput.value = '';
      authError.style.display = 'none';
      modal.classList.add('active');
      setTimeout(() => authInput.focus(), 150);
    });
  }

  const verifyPassword = () => {
    const entered = (authInput.value || '').trim().toLowerCase();
    if (entered === REQUIRED_PASSWORD) {
      authGate.style.display = 'none';
      formBody.style.display = 'flex';
      authError.style.display = 'none';
    } else {
      authError.style.display = 'block';
      authInput.select();
    }
  };

  if (authBtn) authBtn.addEventListener('click', verifyPassword);

  if (authInput) {
    authInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyPassword();
    });
  }

  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', () => {
      syncWithGoogleSheets(true);
      loadPhysicalEvaluations(true);
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

// ============================================================================
// SECCIÓN DE EVALUACIONES FÍSICAS
// ============================================================================

function setupPhysicalSection() {
  const inputSearch = document.getElementById('inputSearchPlayer');
  const btnClear = document.getElementById('btnClearSearch');
  const filterChips = document.getElementById('physFilterChips');
  const btnChange = document.getElementById('btnChangePlayer');

  // Cargar datos cacheados si existen
  const cached = localStorage.getItem(PHYSICAL_STORAGE_KEY);
  if (cached) {
    try {
      physicalPlayers = JSON.parse(cached);
      renderPhysicalSuggestions();
    } catch (e) {}
  }

  // Input de Búsqueda
  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      const q = inputSearch.value.trim();
      if (btnClear) btnClear.style.display = q ? 'block' : 'none';
      renderPhysicalSuggestions(q);
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputSearch.value = '';
      btnClear.style.display = 'none';
      inputSearch.focus();
      renderPhysicalSuggestions('');
    });
  }

  // Chips de Filtro
  if (filterChips) {
    filterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      filterChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPhysFilter = chip.getAttribute('data-filter') || 'all';

      const q = inputSearch ? inputSearch.value.trim() : '';
      renderPhysicalSuggestions(q);
    });
  }

  // Botón Cambiar Jugadora (Cerrar ficha)
  if (btnChange) {
    btnChange.addEventListener('click', () => {
      selectedPlayerId = null;
      document.getElementById('playerProfileCard').style.display = 'none';
      document.getElementById('emptyPlayerState').style.display = 'block';
      if (inputSearch) {
        inputSearch.value = '';
        inputSearch.focus();
      }
      renderPhysicalSuggestions();
    });
  }
}

// Cargar y Parsear Planilla de Evaluaciones Físicas
async function loadPhysicalEvaluations(manual = false) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${PHYSICAL_SPREADSHEET_ID}/gviz/tq?tqx=out:json&_t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const match = text.match(/setResponse\(([\s\S]+)\);/);
    if (!match) throw new Error('Formato inválido de Google Sheets');
    const json = JSON.parse(match[1]);
    const table = json.table;

    if (!table || !table.rows) return;

    const parsed = [];
    table.rows.forEach((r, idx) => {
      if (!r || !r.c) return;
      const c0 = r.c[0] ? (r.c[0].f || r.c[0].v || '').toString().trim() : '';
      const c1 = r.c[1] ? (r.c[1].f || r.c[1].v || '').toString().trim() : '';
      const c2 = r.c[2] ? (r.c[2].f || r.c[2].v || '').toString().trim() : '';

      if (!c2 || c2.toLowerCase().includes('apellido') || c0.toLowerCase().includes('promedio') || c0.toLowerCase().includes('categoria') || c2.length <= 1) {
        return;
      }

      // Etiqueta de división y filtro
      let divLabel = '1ra División';
      let filterTag = '1ra';

      const normC0 = c0.toLowerCase();
      const normC1 = c1.toLowerCase();

      if (normC0.includes('5ta') || normC0.includes('quinta')) {
        divLabel = '5ta División';
        filterTag = '5ta';
      } else if (normC1.includes('inter')) {
        divLabel = 'Intermedia';
        filterTag = 'Inter';
      } else {
        divLabel = '1ra División';
        filterTag = '1ra';
      }

      const tests = {};

      TESTS_CONFIG.forEach(cfg => {
        const evals = cfg.cols.map(cIdx => {
          if (!r.c[cIdx]) return null;
          return parseCellValue(r.c[cIdx].f || r.c[cIdx].v);
        });

        const validEvals = [];
        evals.forEach((ev, i) => {
          if (ev !== null) {
            validEvals.push({ round: i + 1, value: ev });
          }
        });

        if (validEvals.length > 0) {
          let diff = null;
          let diffPct = null;
          let improved = null;

          if (validEvals.length >= 2) {
            const first = validEvals[0].value;
            const last = validEvals[validEvals.length - 1].value;
            diff = +(last - first).toFixed(cfg.decimals || 2);
            diffPct = first !== 0 ? +((diff / first) * 100).toFixed(1) : 0;
            improved = cfg.higherIsBetter ? (diff > 0) : (diff < 0);
          }

          tests[cfg.key] = {
            config: cfg,
            evals: validEvals,
            diff,
            diffPct,
            improved
          };
        }
      });

      parsed.push({
        id: 'p_' + idx,
        name: c2,
        division: c0 || 'PS',
        rama: c1 || 'B',
        divisionLabel: divLabel,
        filterTag,
        testsCount: Object.keys(tests).length,
        tests
      });
    });

    if (parsed.length > 0) {
      physicalPlayers = parsed;
      localStorage.setItem(PHYSICAL_STORAGE_KEY, JSON.stringify(physicalPlayers));

      // Actualizar vista activa si hay seleccionada
      if (selectedPlayerId) {
        const p = physicalPlayers.find(pl => pl.id === selectedPlayerId);
        if (p) renderPlayerCard(p);
      } else {
        renderPhysicalSuggestions();
      }

      if (manual) {
        showToast('¡Evaluaciones físicas sincronizadas!');
      }
    }
  } catch (e) {
    console.warn('Error cargando evaluaciones físicas:', e);
  }
}

// Limpiar valores numéricos con comas
function parseCellValue(val) {
  if (val === null || val === undefined) return null;
  const str = val.toString().trim().replace(',', '.');
  if (str === '' || str.includes('#') || str === '-') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Renderizar Lista de Sugerencias de Jugadoras
function renderPhysicalSuggestions(query = '') {
  const container = document.getElementById('playersSuggestList');
  if (!container) return;

  const normQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = physicalPlayers.filter(p => {
    // Filtro por Chip
    if (currentPhysFilter !== 'all' && p.filterTag !== currentPhysFilter) {
      return false;
    }
    // Filtro por Búsqueda
    if (normQuery) {
      const normName = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normName.includes(normQuery);
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #9bb1d6; font-size: 0.8rem; padding: 16px;">No se encontraron jugadoras para esta búsqueda.</div>';
    return;
  }

  // Ordenar alfabéticamente
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  container.innerHTML = filtered.map(p => {
    let badgeClass = 'badge-1ra';
    if (p.filterTag === 'Inter') badgeClass = 'badge-inter';
    if (p.filterTag === '5ta') badgeClass = 'badge-5ta';

    return `
      <div class="suggest-player-item" data-id="${p.id}">
        <span class="suggest-player-name">${escapeHtml(p.name)}</span>
        <span class="suggest-player-badge ${badgeClass}">${p.divisionLabel}</span>
      </div>
    `;
  }).join('');

  // Event Listeners para cada jugadora sugerida
  container.querySelectorAll('.suggest-player-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      selectPlayer(id);
    });
  });
}

// Seleccionar Jugadora y mostrar ficha
function selectPlayer(id) {
  const p = physicalPlayers.find(pl => pl.id === id);
  if (!p) return;

  selectedPlayerId = id;
  renderPlayerCard(p);

  const profileCard = document.getElementById('playerProfileCard');
  const emptyState = document.getElementById('emptyPlayerState');

  if (profileCard) profileCard.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';

  // Scroll suave hacia la ficha en móviles
  profileCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Renderizar Perfil y Comparativas de la Jugadora
function renderPlayerCard(player) {
  const nameEl = document.getElementById('profilePlayerName');
  const initialEl = document.getElementById('profileInitial');
  const divEl = document.getElementById('profilePlayerDiv');
  const countEl = document.getElementById('profilePlayerTestsCount');
  const testsGrid = document.getElementById('testsGrid');
  const summaryText = document.getElementById('profileSummaryText');

  if (nameEl) nameEl.textContent = player.name;
  if (initialEl) initialEl.textContent = (player.name.trim().charAt(0) || 'P').toUpperCase();
  if (divEl) divEl.textContent = player.divisionLabel;

  const testKeys = Object.keys(player.tests);
  if (countEl) countEl.textContent = `${testKeys.length} Tests Evaluados`;

  // Contar mejoras
  let improvedCount = 0;
  let comparableCount = 0;

  testKeys.forEach(k => {
    const t = player.tests[k];
    if (t.evals && t.evals.length >= 2) {
      comparableCount++;
      if (t.improved) improvedCount++;
    }
  });

  if (summaryText) {
    if (comparableCount > 0) {
      summaryText.textContent = `¡Progreso destacado! ${improvedCount} de ${comparableCount} tests con superación de marcas.`;
    } else {
      summaryText.textContent = `Mediciones físicas registradas.`;
    }
  }

  if (!testsGrid) return;

  if (testKeys.length === 0) {
    testsGrid.innerHTML = '<div style="text-align: center; color: #9bb1d6; padding: 20px;">Esta jugadora aún no tiene mediciones cargadas en la planilla.</div>';
    return;
  }

  // Renderizar cada test físico
  testsGrid.innerHTML = testKeys.map(k => {
    const t = player.tests[k];
    const cfg = t.config;
    const evals = t.evals || [];
    const unit = cfg.unit ? ` ${cfg.unit}` : '';

    // Badge de Evolución
    let diffBadgeHtml = '';
    if (evals.length >= 2) {
      const sign = t.diff > 0 ? '+' : '';
      const pctSign = t.diffPct > 0 ? '+' : '';
      if (t.improved) {
        diffBadgeHtml = `<span class="test-diff-badge positive">${sign}${t.diff}${unit} (${pctSign}${t.diffPct}%) ↗</span>`;
      } else if (t.diff === 0) {
        diffBadgeHtml = `<span class="test-diff-badge neutral">= Sin variación</span>`;
      } else {
        diffBadgeHtml = `<span class="test-diff-badge negative">${sign}${t.diff}${unit} (${pctSign}${t.diffPct}%) ↘</span>`;
      }
    } else {
      diffBadgeHtml = `<span class="test-diff-badge info">1° Medición</span>`;
    }

    // Fila de Cajas de Evaluación
    const evalsBoxesHtml = evals.map((ev, i) => {
      const isLast = (i === evals.length - 1 && evals.length > 1);
      const highlightClass = isLast ? 'highlight' : '';
      const arrowHtml = (i < evals.length - 1) ? '<div class="eval-arrow">➔</div>' : '';

      return `
        <div class="eval-box ${highlightClass}">
          <span class="eval-label">${ev.round}° EVALUACIÓN</span>
          <span class="eval-val">${ev.value}<small>${cfg.unit}</small></span>
        </div>
        ${arrowHtml}
      `;
    }).join('');

    // Barra de Progreso Comparativa
    let progressBarHtml = '';
    if (evals.length >= 2) {
      const values = evals.map(e => e.value);
      const maxVal = Math.max(...values) * 1.08;
      
      const barsHtml = evals.map((ev, i) => {
        const isFirst = (i === 0);
        const isLast = (i === evals.length - 1);
        let fillClass = 'fill-first';
        if (isLast) {
          fillClass = t.improved ? 'fill-improved' : 'fill-declined';
        }
        const widthPct = Math.min(100, Math.max(15, (ev.value / maxVal) * 100));

        return `
          <div style="margin-bottom: 4px;">
            <div style="display:flex; justify-content:space-between; font-size:0.68rem; margin-bottom:2px; color:#9bb1d6;">
              <span>${ev.round}° Eval</span>
              <span style="font-weight:700; color:#ffffff;">${ev.value}${unit}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${fillClass}" style="width: ${widthPct.toFixed(1)}%;"></div>
            </div>
          </div>
        `;
      }).join('');

      progressBarHtml = `
        <div class="progress-bar-container">
          ${barsHtml}
        </div>
      `;
    }

    return `
      <div class="test-card">
        <div class="test-card-header">
          <div class="test-title-group">
            <span class="test-icon">${cfg.icon}</span>
            <div>
              <h4 class="test-name">${cfg.name}</h4>
              <span class="test-type">${cfg.type}</span>
            </div>
          </div>
          ${diffBadgeHtml}
        </div>

        <div class="test-evals-row">
          ${evalsBoxesHtml}
        </div>

        ${progressBarHtml}
      </div>
    `;
  }).join('');
}

// Toast
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2600);
}

function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// SINCRONIZACIÓN EN TIEMPO REAL CON GOOGLE SHEETS (CITACIONES)
// ============================================================================

async function syncWithGoogleSheets(manual = false) {
  const sheetId = (matchData && matchData.spreadsheetId) || SPREADSHEET_ID;

  try {
    const fetchTab = async (tabName) => {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&range=A:L&sheet=${encodeURIComponent(tabName)}&_t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const match = text.match(/setResponse\(([\s\S]+)\);/);
      if (!match) throw new Error('Formato inválido de Google Sheets');
      const json = JSON.parse(match[1]);
      return json.table;
    };

    const parseTab = (table) => {
      const players = [];
      const meta = {};
      if (!table || !table.rows) return { players, meta };

      table.rows.forEach(r => {
        if (!r.c) return;

        // Col F (índice 5): Jugadoras Citadas
        if (r.c[5] && r.c[5].v) {
          const pName = r.c[5].v.toString().trim();
          if (pName && pName.toLowerCase() !== 'jugadoras citadas') {
            players.push(pName);
          }
        }

        // Col H (índice 7): Etiqueta, Col I (índice 8): Valor
        if (r.c[7] && r.c[7].v) {
          const label = r.c[7].v.toString().trim().toLowerCase();
          const cellI = r.c[8];
          const val = cellI ? (cellI.f || cellI.v || '').toString().trim() : '';
          if (val) {
            meta[label] = val;
          }
        }
      });
      return { players, meta };
    };

    const [tablePrimera, tableInter] = await Promise.all([
      fetchTab('primera'),
      fetchTab('intermedia')
    ]);

    const resPrimera = parseTab(tablePrimera);
    const resInter = parseTab(tableInter);

    let changed = false;

    // 1. Actualizar Lista de Jugadoras Citadas
    if (resPrimera.players && resPrimera.players.length > 0) {
      matchData.primera.players = resPrimera.players;
      changed = true;
    }

    if (resInter.players && resInter.players.length > 0) {
      matchData.intermedia.players = resInter.players;
      changed = true;
    }

    // 2. Extraer Metadatos (Columna H e I)
    const metaP = resPrimera.meta || {};
    const metaI = resInter.meta || {};

    // FECHA N° (ej: "10" o "Fecha 10")
    const roundRaw = (
      metaP['fecha n°'] ||
      metaI['fecha n°'] ||
      metaP['fecha n'] ||
      metaI['fecha n'] ||
      metaP['n° fecha'] ||
      metaI['n° fecha'] ||
      metaP['fecha'] ||
      metaI['fecha'] ||
      ''
    ).toString().trim();

    if (roundRaw) {
      const cleanNum = roundRaw.replace(/^fecha\s*/i, '').trim();
      const formattedRound = `FECHA ${cleanNum || roundRaw}`;
      if (matchData.fixtureRound !== formattedRound) {
        matchData.fixtureRound = formattedRound;
        changed = true;
      }
    }

    // RIVAL (ej: "Murialdo B")
    const rivalVal = (metaP['rival'] || metaI['rival'] || '').toString().trim();
    if (rivalVal && rivalVal !== matchData.rival) {
      matchData.rival = rivalVal;
      changed = true;
    }

    // URL ESCUDO RIVAL
    const rivalLogoUrl = (
      metaP['url escudo rival'] ||
      metaI['url escudo rival'] ||
      metaP['escudo rival'] ||
      metaI['escudo rival'] ||
      metaP['url escudo'] ||
      metaI['url escudo'] ||
      metaP['escudo'] ||
      metaI['escudo'] ||
      ''
    ).toString().trim();

    if (rivalLogoUrl) {
      if (matchData.rivalLogo !== rivalLogoUrl) {
        matchData.rivalLogo = rivalLogoUrl;
        changed = true;
      }
    } else {
      if (matchData.rivalLogo && matchData.rivalLogo.startsWith('http')) {
        matchData.rivalLogo = '';
        changed = true;
      }
    }

    // DÍA
    const dateVal = (metaP['dia'] || metaI['dia'] || metaP['día'] || metaI['día'] || '').toString().trim();
    if (dateVal && dateVal !== matchData.dateDisplay) {
      matchData.dateDisplay = dateVal;
      changed = true;
    }

    // CANCHA
    const locVal = (metaP['cancha'] || metaI['cancha'] || '').toString().trim();
    if (locVal && locVal !== matchData.location) {
      matchData.location = locVal;
      changed = true;
    }

    // HORARIOS PRIMERA
    const callP = metaP['horario citacion'] || metaP['horario citación'] || metaP['citacion'] || metaP['citación'];
    if (callP && callP !== matchData.primera.callTime) {
      matchData.primera.callTime = callP;
      changed = true;
    }

    const matchP = metaP['horario partido'] || metaP['partido'];
    if (matchP && matchP !== matchData.primera.matchTime) {
      matchData.primera.matchTime = matchP;
      changed = true;
    }

    // HORARIOS INTERMEDIA
    const callI = metaI['horario citacion'] || metaI['horario citación'] || metaI['citacion'] || metaI['citación'];
    if (callI && callI !== matchData.intermedia.callTime) {
      matchData.intermedia.callTime = callI;
      changed = true;
    }

    const matchI = metaI['horario partido'] || metaI['partido'];
    if (matchI && matchI !== matchData.intermedia.matchTime) {
      matchData.intermedia.matchTime = matchI;
      changed = true;
    }

    if (changed) {
      saveData();
      render();
    }

    if (manual) {
      showToast('¡Datos sincronizados con Google Sheets!');
    }
  } catch (err) {
    console.warn('Error sincronizando con Google Sheets:', err);
    if (manual) {
      showToast('No se pudo conectar con la planilla (verificá tu conexión)');
    }
  }
}

// ============================================================================
// VISTA 4: BOTONERA DE INCIDENCIAS DT EN VIVO (HOCKEY LIVE TRACKER)
// ============================================================================

const DT_MATCH_STORAGE_KEY = 'regatas_dt_match_v2';
const DT_AUTH_SESSION_KEY = 'regatas_dt_auth_ok';

let dtClockInterval = null;
let dtPendingOptionAction = null; // { type: 'corner'|'stroke', team: 'home'|'away' }

function createDefaultQuarterStats() {
  return {
    home: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 },
    away: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 }
  };
}

let dtMatchState = {
  division: 'primera', // 'primera' | 'intermedia'
  rivalName: 'MURIALDO B',
  currentQuarter: 1, // 1..4
  timer: {
    seconds: 15 * 60,
    isRunning: false
  },
  score: { home: 0, away: 0 },
  quarters: {
    1: createDefaultQuarterStats(),
    2: createDefaultQuarterStats(),
    3: createDefaultQuarterStats(),
    4: createDefaultQuarterStats()
  },
  events: []
};

// Carga y guardado de estado en LocalStorage
function loadDtMatchState() {
  try {
    const saved = localStorage.getItem(DT_MATCH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.quarters && parsed.events) {
        dtMatchState = parsed;
      }
    }
  } catch (e) {
    console.warn('Error cargando estado DT:', e);
  }

  // Asegurar nombre de rival por defecto si no está cargado
  if (!dtMatchState.rivalName) {
    const curDiv = dtMatchState.division || 'primera';
    const divMeta = matchData && matchData[curDiv];
    dtMatchState.rivalName = (divMeta && divMeta.rival) ? divMeta.rival : 'MURIALDO B';
  }

  recalculateDtStatsFromEvents();
}

function saveDtMatchState() {
  try {
    localStorage.setItem(DT_MATCH_STORAGE_KEY, JSON.stringify(dtMatchState));
  } catch (e) {
    console.warn('Error guardando estado DT:', e);
  }
}

// Recalcular todas las estadísticas y marcador directamente desde el feed de eventos
// (Garantiza 100% de coherencia matemática al deshacer o eliminar eventos)
function recalculateDtStatsFromEvents() {
  const newQuarters = {
    1: createDefaultQuarterStats(),
    2: createDefaultQuarterStats(),
    3: createDefaultQuarterStats(),
    4: createDefaultQuarterStats()
  };

  let homeTotalGoals = 0;
  let awayTotalGoals = 0;

  (dtMatchState.events || []).forEach(evt => {
    const q = evt.quarter || 1;
    if (!newQuarters[q]) newQuarters[q] = createDefaultQuarterStats();
    const teamStats = newQuarters[q][evt.team];
    if (!teamStats) return;

    if (evt.type === 'entry') {
      teamStats.entries++;
    } else if (evt.type === 'corner') {
      teamStats.corners++;
      if (evt.endedInGoal) {
        teamStats.cornerGoals++;
        teamStats.goals++;
        if (evt.team === 'home') homeTotalGoals++; else awayTotalGoals++;
      }
    } else if (evt.type === 'stroke') {
      teamStats.strokes++;
      if (evt.endedInGoal) {
        teamStats.strokeGoals++;
        teamStats.goals++;
        if (evt.team === 'home') homeTotalGoals++; else awayTotalGoals++;
      }
    } else if (evt.type === 'fieldGoal') {
      teamStats.fieldGoals++;
      teamStats.goals++;
      if (evt.team === 'home') homeTotalGoals++; else awayTotalGoals++;
    } else if (evt.type === 'cardGreen') {
      teamStats.green++;
    } else if (evt.type === 'cardYellow') {
      teamStats.yellow++;
    } else if (evt.type === 'cardRed') {
      teamStats.red++;
    }
  });

  dtMatchState.quarters = newQuarters;
  dtMatchState.score = { home: homeTotalGoals, away: awayTotalGoals };
}

// Comprobación de autenticación DT
function isDtAuthenticated() {
  return sessionStorage.getItem(DT_AUTH_SESSION_KEY) === 'true';
}

function handleDtViewOpen() {
  const gateCard = document.getElementById('dtAuthGateCard');
  const livePanel = document.getElementById('dtLivePanel');
  const passInput = document.getElementById('inputDtGatePassword');
  const errorMsg = document.getElementById('dtGateErrorMsg');

  if (isDtAuthenticated()) {
    if (gateCard) gateCard.style.display = 'none';
    if (livePanel) livePanel.style.display = 'flex';
    renderDtView();
  } else {
    if (livePanel) livePanel.style.display = 'none';
    if (gateCard) gateCard.style.display = 'block';
    if (errorMsg) errorMsg.style.display = 'none';
    if (passInput) {
      passInput.value = '';
      setTimeout(() => passInput.focus(), 150);
    }
  }
}

function verifyDtPassword() {
  const passInput = document.getElementById('inputDtGatePassword');
  const errorMsg = document.getElementById('dtGateErrorMsg');
  const entered = (passInput ? passInput.value : '').trim().toLowerCase();

  if (entered === REQUIRED_PASSWORD) {
    sessionStorage.setItem(DT_AUTH_SESSION_KEY, 'true');
    handleDtViewOpen();
    showToast('🔓 Acceso concedido a la Botonera DT');
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
    if (passInput) passInput.select();
  }
}

function lockDtSession() {
  sessionStorage.removeItem(DT_AUTH_SESSION_KEY);
  pauseDtClock();
  handleDtViewOpen();
  showToast('🔒 Sesión de DT bloqueada');
}

// Cronómetro del Cuarto (15:00 hacia abajo)
function formatClockTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDtClockDisplay() {
  const display = document.getElementById('dtClockDisplay');
  const btnToggle = document.getElementById('btnDtClockToggle');
  if (display) {
    display.textContent = formatClockTime(dtMatchState.timer.seconds);
  }
  if (btnToggle) {
    btnToggle.textContent = dtMatchState.timer.isRunning ? '⏸' : '▶';
  }
}

function startDtClock() {
  if (dtClockInterval) clearInterval(dtClockInterval);
  dtMatchState.timer.isRunning = true;
  dtClockInterval = setInterval(() => {
    if (dtMatchState.timer.seconds > 0) {
      dtMatchState.timer.seconds--;
      updateDtClockDisplay();
    } else {
      pauseDtClock();
      showToast(`⏰ ¡Fin del ${dtMatchState.currentQuarter}° Cuarto!`);
    }
  }, 1000);
  updateDtClockDisplay();
}

function pauseDtClock() {
  dtMatchState.timer.isRunning = false;
  if (dtClockInterval) {
    clearInterval(dtClockInterval);
    dtClockInterval = null;
  }
  updateDtClockDisplay();
}

function resetDtClock() {
  pauseDtClock();
  dtMatchState.timer.seconds = 15 * 60;
  updateDtClockDisplay();
}

// Inicialización de Eventos y Botones del Módulo DT
function initDtModule() {
  loadDtMatchState();

  // 1. Auth Gate
  const btnSubmit = document.getElementById('btnDtGateSubmit');
  const inputPass = document.getElementById('inputDtGatePassword');
  if (btnSubmit) btnSubmit.addEventListener('click', verifyDtPassword);
  if (inputPass) {
    inputPass.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyDtPassword();
    });
  }

  // 2. Cerrar sesión / Bloquear
  const btnLock = document.getElementById('btnDtLockSession');
  if (btnLock) btnLock.addEventListener('click', lockDtSession);

  // 3. Selector de Categoría (Primera / Intermedia)
  const pillP = document.getElementById('dtPillPrimera');
  const pillI = document.getElementById('dtPillIntermedia');
  if (pillP) {
    pillP.addEventListener('click', () => {
      dtMatchState.division = 'primera';
      saveDtMatchState();
      renderDtView();
    });
  }
  if (pillI) {
    pillI.addEventListener('click', () => {
      dtMatchState.division = 'intermedia';
      saveDtMatchState();
      renderDtView();
    });
  }

  // 4. Edición rápida del nombre del Rival
  const btnEditRival = document.getElementById('btnEditRivalName');
  if (btnEditRival) {
    btnEditRival.addEventListener('click', () => {
      const cur = dtMatchState.rivalName || 'RIVAL';
      const nuevo = prompt('Ingresá el nombre del club rival:', cur);
      if (nuevo && nuevo.trim()) {
        dtMatchState.rivalName = nuevo.trim().toUpperCase();
        saveDtMatchState();
        renderDtView();
      }
    });
  }

  // 5. Selector de Cuarto (1C, 2C, 3C, 4C)
  const qBtns = document.querySelectorAll('.dt-quarter-btn');
  qBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const q = parseInt(btn.getAttribute('data-q'), 10);
      if (q && q >= 1 && q <= 4) {
        dtMatchState.currentQuarter = q;
        resetDtClock();
        saveDtMatchState();
        renderDtView();
        showToast(`📍 Cambiaste al ${q}° Cuarto`);
      }
    });
  });

  // 6. Cronómetro
  const btnToggleClock = document.getElementById('btnDtClockToggle');
  if (btnToggleClock) {
    btnToggleClock.addEventListener('click', () => {
      if (dtMatchState.timer.isRunning) pauseDtClock(); else startDtClock();
    });
  }
  const btnResetClock = document.getElementById('btnDtClockReset');
  if (btnResetClock) btnResetClock.addEventListener('click', resetDtClock);

  // 7. Botones Tácticos Regatas (A Favor)
  const btnHomeEntry = document.getElementById('btnHomeEntry');
  if (btnHomeEntry) btnHomeEntry.addEventListener('click', () => logIncident('entry', 'home'));

  const btnHomeCorner = document.getElementById('btnHomeCorner');
  if (btnHomeCorner) btnHomeCorner.addEventListener('click', () => openIncidentOptionModal('corner', 'home'));

  const btnHomeStroke = document.getElementById('btnHomeStroke');
  if (btnHomeStroke) btnHomeStroke.addEventListener('click', () => openIncidentOptionModal('stroke', 'home'));

  const btnHomeGoal = document.getElementById('btnHomeFieldGoal');
  if (btnHomeGoal) btnHomeGoal.addEventListener('click', () => logIncident('fieldGoal', 'home'));

  // Tarjetas Regatas
  const btnHomeGreen = document.getElementById('btnHomeCardGreen');
  if (btnHomeGreen) btnHomeGreen.addEventListener('click', () => logCard('cardGreen', 'home'));
  const btnHomeYellow = document.getElementById('btnHomeCardYellow');
  if (btnHomeYellow) btnHomeYellow.addEventListener('click', () => logCard('cardYellow', 'home'));
  const btnHomeRed = document.getElementById('btnHomeCardRed');
  if (btnHomeRed) btnHomeRed.addEventListener('click', () => logCard('cardRed', 'home'));

  // 8. Botones Tácticos Rival (En Contra)
  const btnAwayEntry = document.getElementById('btnAwayEntry');
  if (btnAwayEntry) btnAwayEntry.addEventListener('click', () => logIncident('entry', 'away'));

  const btnAwayCorner = document.getElementById('btnAwayCorner');
  if (btnAwayCorner) btnAwayCorner.addEventListener('click', () => openIncidentOptionModal('corner', 'away'));

  const btnAwayStroke = document.getElementById('btnAwayStroke');
  if (btnAwayStroke) btnAwayStroke.addEventListener('click', () => openIncidentOptionModal('stroke', 'away'));

  const btnAwayGoal = document.getElementById('btnAwayFieldGoal');
  if (btnAwayGoal) btnAwayGoal.addEventListener('click', () => logIncident('fieldGoal', 'away'));

  // Tarjetas Rival
  const btnAwayGreen = document.getElementById('btnAwayCardGreen');
  if (btnAwayGreen) btnAwayGreen.addEventListener('click', () => logCard('cardGreen', 'away'));
  const btnAwayYellow = document.getElementById('btnAwayCardYellow');
  if (btnAwayYellow) btnAwayYellow.addEventListener('click', () => logCard('cardYellow', 'away'));
  const btnAwayRed = document.getElementById('btnAwayCardRed');
  if (btnAwayRed) btnAwayRed.addEventListener('click', () => logCard('cardRed', 'away'));

  // 9. Modal de Opción A (Córner / Penal)
  const btnChoiceGoal = document.getElementById('btnChoiceGoal');
  if (btnChoiceGoal) btnChoiceGoal.addEventListener('click', () => confirmIncidentOption(true));
  const btnChoiceMiss = document.getElementById('btnChoiceMiss');
  if (btnChoiceMiss) btnChoiceMiss.addEventListener('click', () => confirmIncidentOption(false));
  const btnChoiceCancel = document.getElementById('btnChoiceCancel');
  if (btnChoiceCancel) btnChoiceCancel.addEventListener('click', closeIncidentOptionModal);

  // 10. Herramientas Inferiores (Undo, Resumen, Feed, WhatsApp, Reset)
  const btnUndo = document.getElementById('btnDtUndo');
  if (btnUndo) btnUndo.addEventListener('click', undoLastIncident);

  const btnSummary = document.getElementById('btnDtOpenSummary');
  if (btnSummary) btnSummary.addEventListener('click', openDtSummaryModal);

  const btnToggleFeed = document.getElementById('btnDtToggleFeed');
  if (btnToggleFeed) {
    btnToggleFeed.addEventListener('click', () => {
      const feed = document.getElementById('dtFeedWrapper');
      if (feed) {
        feed.style.display = feed.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  const btnShareWa = document.getElementById('btnDtShareWhatsapp');
  if (btnShareWa) btnShareWa.addEventListener('click', shareDtMatchWhatsApp);

  const btnReset = document.getElementById('btnDtResetMatch');
  if (btnReset) btnReset.addEventListener('click', resetDtMatchWithConfirm);

  // 11. Modal Resumen Actions
  const btnCloseSummary = document.getElementById('btnCloseDtSummary');
  if (btnCloseSummary) btnCloseSummary.addEventListener('click', closeDtSummaryModal);
  const btnCloseSummaryBottom = document.getElementById('btnCloseDtSummaryBottom');
  if (btnCloseSummaryBottom) btnCloseSummaryBottom.addEventListener('click', closeDtSummaryModal);
  const btnModalShareWa = document.getElementById('btnModalShareWhatsApp');
  if (btnModalShareWa) btnModalShareWa.addEventListener('click', shareDtMatchWhatsApp);
}

// Registro centralizado de incidencias
function logIncident(type, team, endedInGoal = false, player = '') {
  const clockStr = formatClockTime(dtMatchState.timer.seconds);
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const evt = {
    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    quarter: dtMatchState.currentQuarter || 1,
    clockTime: clockStr,
    timeDisplay: timeStr,
    type,
    team,
    endedInGoal: !!endedInGoal,
    player: player || '',
    label: getIncidentLabel(type, endedInGoal, team, player)
  };

  if (!dtMatchState.events) dtMatchState.events = [];
  dtMatchState.events.push(evt);

  recalculateDtStatsFromEvents();
  saveDtMatchState();

  // Vibración háptica en móviles si está disponible
  if (navigator.vibrate) {
    navigator.vibrate(endedInGoal ? [60, 50, 60] : 45);
  }

  showToast(`${evt.team === 'home' ? '🔵' : '🔴'} ${evt.label}`);
  renderDtView();
}

function getIncidentLabel(type, endedInGoal, team, player = '') {
  const teamLabel = team === 'home' ? 'Regatas' : (dtMatchState.rivalName || 'Rival');
  const playerSuffix = player ? ` (${player})` : '';

  if (type === 'entry') return `Ingreso al área (${teamLabel})`;
  if (type === 'corner') return endedInGoal ? `¡GOL de Córner Corto! (${teamLabel})` : `Córner Corto (${teamLabel})`;
  if (type === 'stroke') return endedInGoal ? `¡GOL de Penal! (${teamLabel})` : `Penal ejecutado (${teamLabel})`;
  if (type === 'fieldGoal') return `¡GOL de Jugada! (${teamLabel})`;
  if (type === 'cardGreen') return `Tarjeta Verde 🟩 (${teamLabel})${playerSuffix}`;
  if (type === 'cardYellow') return `Tarjeta Amarilla 🟨 (${teamLabel})${playerSuffix}`;
  if (type === 'cardRed') return `Tarjeta Roja 🟥 (${teamLabel})${playerSuffix}`;
  return 'Incidencia';
}

function logCard(cardType, team) {
  let player = '';
  if (team === 'home') {
    const pName = prompt('Nombre o número de la jugadora sancionada (opcional):', '');
    if (pName !== null) player = pName.trim();
  }
  logIncident(cardType, team, false, player);
}

// Modal de Opción A: Córner Corto / Penal
function openIncidentOptionModal(type, team) {
  dtPendingOptionAction = { type, team };

  const modal = document.getElementById('modalIncidentOption');
  const icon = document.getElementById('choiceModalIcon');
  const title = document.getElementById('choiceModalTitle');
  const subtitle = document.getElementById('choiceModalSubtitle');
  const teamName = team === 'home' ? 'Regatas Andino' : (dtMatchState.rivalName || 'Rival');

  if (type === 'corner') {
    if (icon) icon.textContent = '🏑';
    if (title) title.textContent = `Córner Corto - ${teamName}`;
    if (subtitle) subtitle.textContent = '¿Terminó en gol esta jugada fija?';
  } else {
    if (icon) icon.textContent = '🎯';
    if (title) title.textContent = `Penal (Stroke) - ${teamName}`;
    if (subtitle) subtitle.textContent = '¿Terminó en gol este penal?';
  }

  if (modal) modal.classList.add('active');
}

function confirmIncidentOption(isGoal) {
  if (dtPendingOptionAction) {
    logIncident(dtPendingOptionAction.type, dtPendingOptionAction.team, isGoal);
    dtPendingOptionAction = null;
  }
  closeIncidentOptionModal();
}

function closeIncidentOptionModal() {
  const modal = document.getElementById('modalIncidentOption');
  if (modal) modal.classList.remove('active');
  dtPendingOptionAction = null;
}

// Deshacer último evento (Undo)
function undoLastIncident() {
  if (!dtMatchState.events || dtMatchState.events.length === 0) {
    showToast('ℹ️ No hay incidencias registradas para deshacer');
    return;
  }

  const popped = dtMatchState.events.pop();
  recalculateDtStatsFromEvents();
  saveDtMatchState();

  if (navigator.vibrate) navigator.vibrate(30);
  showToast(`↩ Deshecho: ${popped.label}`);
  renderDtView();
}

// Eliminar evento específico desde el Feed
function deleteEventById(eventId) {
  if (!dtMatchState.events) return;
  const idx = dtMatchState.events.findIndex(e => e.id === eventId);
  if (idx !== -1) {
    const removed = dtMatchState.events.splice(idx, 1)[0];
    recalculateDtStatsFromEvents();
    saveDtMatchState();
    showToast(`🗑️ Evento eliminado: ${removed.label}`);
    renderDtView();
  }
}

// Reiniciar Partido
function resetDtMatchWithConfirm() {
  const divName = dtMatchState.division === '2' || dtMatchState.division === 'intermedia' ? 'Intermedia' : '1ra División';
  if (confirm(`¿Reiniciar el partido de ${divName}? Se borrarán todas las incidencias y el marcador volverá a 0-0.`)) {
    dtMatchState.currentQuarter = 1;
    dtMatchState.score = { home: 0, away: 0 };
    dtMatchState.events = [];
    dtMatchState.quarters = {
      1: createDefaultQuarterStats(),
      2: createDefaultQuarterStats(),
      3: createDefaultQuarterStats(),
      4: createDefaultQuarterStats()
    };
    resetDtClock();
    saveDtMatchState();
    renderDtView();
    showToast('🔄 Partido reiniciado exitosamente');
  }
}

// Modal de Resumen y Estadísticas
function openDtSummaryModal() {
  const modal = document.getElementById('modalDtSummary');
  const container = document.getElementById('dtSummaryContent');
  if (!container) return;

  const rival = dtMatchState.rivalName || 'RIVAL';
  const qStats = dtMatchState.quarters || {};

  // Acumulados totales
  const tot = {
    home: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 },
    away: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 }
  };

  [1, 2, 3, 4].forEach(q => {
    const cur = qStats[q] || createDefaultQuarterStats();
    ['home', 'away'].forEach(tm => {
      tot[tm].entries += cur[tm].entries || 0;
      tot[tm].corners += cur[tm].corners || 0;
      tot[tm].cornerGoals += cur[tm].cornerGoals || 0;
      tot[tm].strokes += cur[tm].strokes || 0;
      tot[tm].strokeGoals += cur[tm].strokeGoals || 0;
      tot[tm].fieldGoals += cur[tm].fieldGoals || 0;
      tot[tm].green += cur[tm].green || 0;
      tot[tm].yellow += cur[tm].yellow || 0;
      tot[tm].red += cur[tm].red || 0;
      tot[tm].goals += cur[tm].goals || 0;
    });
  });

  const calcEff = (goals, total) => total > 0 ? Math.round((goals / total) * 100) + '%' : '0%';

  container.innerHTML = `
    <div style="background: rgba(3, 13, 45, 0.85); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px; text-align: center;">
      <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase;">Marcador Final</span>
      <div style="font-size: 2.2rem; font-weight: 900; margin: 4px 0;">
        <span style="color: var(--color-regatas-cyan);">REGATAS ${tot.home.goals}</span>
        <span style="color: var(--text-muted); font-size: 1.5rem; margin: 0 8px;">-</span>
        <span style="color: #f87171;">${tot.away.goals} ${escapeHtml(rival)}</span>
      </div>
      <span style="font-size: 0.75rem; color: var(--text-muted);">${dtMatchState.division === 'intermedia' ? 'Intermedia' : '1ra División'} • Clausura 2026</span>
    </div>

    <!-- Tabla Comparativa Total -->
    <div class="dt-summary-table-wrap">
      <table class="dt-summary-table">
        <thead>
          <tr>
            <th style="text-align: left;">MÉTRICA TÁCTICA</th>
            <th style="color: var(--color-regatas-cyan);">REGATAS</th>
            <th style="color: #f87171;">${escapeHtml(rival)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="team-name-cell">📥 Ingresos al Área</td>
            <td><strong>${tot.home.entries}</strong></td>
            <td><strong>${tot.away.entries}</strong></td>
          </tr>
          <tr>
            <td class="team-name-cell">🏑 Córner Cortos Obtenidos</td>
            <td><strong>${tot.home.corners}</strong></td>
            <td><strong>${tot.away.corners}</strong></td>
          </tr>
          <tr>
            <td class="team-name-cell">🥅 Goles de Córner Corto</td>
            <td><strong>${tot.home.cornerGoals}</strong></td>
            <td><strong>${tot.away.cornerGoals}</strong></td>
          </tr>
          <tr>
            <td class="team-name-cell">🎯 Efectividad de Córner Corto</td>
            <td><strong style="color: #34d399;">${calcEff(tot.home.cornerGoals, tot.home.corners)}</strong></td>
            <td><strong style="color: #34d399;">${calcEff(tot.away.cornerGoals, tot.away.corners)}</strong></td>
          </tr>
          <tr>
            <td class="team-name-cell">🎯 Penales Obtenidos (Goles)</td>
            <td><strong>${tot.home.strokes} (${tot.home.strokeGoals})</strong></td>
            <td><strong>${tot.away.strokes} (${tot.away.strokeGoals})</strong></td>
          </tr>
          <tr>
            <td class="team-name-cell">⚽ Goles de Jugada</td>
            <td><strong>${tot.home.fieldGoals}</strong></td>
            <td><strong>${tot.away.fieldGoals}</strong></td>
          </tr>
          <tr>
            <td class="team-name-cell">🟨 Tarjetas (🟩 / 🟨 / 🟥)</td>
            <td>${tot.home.green} / ${tot.home.yellow} / ${tot.home.red}</td>
            <td>${tot.away.green} / ${tot.away.yellow} / ${tot.away.red}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Desglose por Cuartos -->
    <div class="dt-summary-table-wrap">
      <table class="dt-summary-table">
        <thead>
          <tr>
            <th style="text-align: left;">CUARTO</th>
            <th>GOLES</th>
            <th>ÁREA</th>
            <th>CÓRNER CORTO</th>
          </tr>
        </thead>
        <tbody>
          ${[1, 2, 3, 4].map(q => {
            const h = qStats[q]?.home || {};
            const a = qStats[q]?.away || {};
            return `
              <tr>
                <td class="team-name-cell"><strong>${q}° Cuarto</strong></td>
                <td><span style="color: var(--color-regatas-cyan);">${h.goals || 0}</span> - <span style="color: #f87171;">${a.goals || 0}</span></td>
                <td>${h.entries || 0} vs ${a.entries || 0}</td>
                <td>${h.corners || 0} (${h.cornerGoals || 0}) vs ${a.corners || 0} (${a.cornerGoals || 0})</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  if (modal) modal.classList.add('active');
}

function closeDtSummaryModal() {
  const modal = document.getElementById('modalDtSummary');
  if (modal) modal.classList.remove('active');
}

// Compartir Resumen por WhatsApp
function shareDtMatchWhatsApp() {
  const rival = dtMatchState.rivalName || 'RIVAL';
  const qStats = dtMatchState.quarters || {};
  const divName = dtMatchState.division === 'intermedia' ? 'Intermedia' : '1ra División';

  const tot = {
    home: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 },
    away: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 }
  };

  [1, 2, 3, 4].forEach(q => {
    const cur = qStats[q] || createDefaultQuarterStats();
    ['home', 'away'].forEach(tm => {
      tot[tm].entries += cur[tm].entries || 0;
      tot[tm].corners += cur[tm].corners || 0;
      tot[tm].cornerGoals += cur[tm].cornerGoals || 0;
      tot[tm].strokes += cur[tm].strokes || 0;
      tot[tm].strokeGoals += cur[tm].strokeGoals || 0;
      tot[tm].fieldGoals += cur[tm].fieldGoals || 0;
      tot[tm].green += cur[tm].green || 0;
      tot[tm].yellow += cur[tm].yellow || 0;
      tot[tm].red += cur[tm].red || 0;
      tot[tm].goals += cur[tm].goals || 0;
    });
  });

  const calcEff = (goals, total) => total > 0 ? Math.round((goals / total) * 100) + '%' : '0%';

  const lines = [
    `🏑 *REPORTE TÁCTICO EN VIVO - REGATAS ANDINO B*`,
    `🏆 Categoría: *${divName}*`,
    `⚔️ Rival: *${rival}*`,
    `🏁 Resultado Final: *REGATAS ${tot.home.goals} - ${tot.away.goals} ${rival}*`,
    ``,
    `📊 *ESTADÍSTICAS GENERALES:*`,
    `• 📥 Ingresos al Área: Regatas ${tot.home.entries} vs ${tot.away.entries} ${rival}`,
    `• 🏑 Córner Corto: Regatas ${tot.home.corners} (${tot.home.cornerGoals} goles, ${calcEff(tot.home.cornerGoals, tot.home.corners)}) vs ${rival} ${tot.away.corners} (${tot.away.cornerGoals} goles, ${calcEff(tot.away.cornerGoals, tot.away.corners)})`,
    `• 🎯 Penales: Regatas ${tot.home.strokes} (${tot.home.strokeGoals} goles) vs ${rival} ${tot.away.strokes} (${tot.away.strokeGoals} goles)`,
    `• ⚽ Goles de Jugada: Regatas ${tot.home.fieldGoals} vs ${tot.away.fieldGoals} ${rival}`,
    `• 🟨 Tarjetas Regatas: 🟩 ${tot.home.green} | 🟨 ${tot.home.yellow} | 🟥 ${tot.home.red}`,
    `• 🟨 Tarjetas ${rival}: 🟩 ${tot.away.green} | 🟨 ${tot.away.yellow} | 🟥 ${tot.away.red}`,
    ``,
    `📋 *DETALLE POR CUARTOS:*`,
    `• 1°C: Goles ${qStats[1]?.home?.goals || 0}-${qStats[1]?.away?.goals || 0} | Área ${qStats[1]?.home?.entries || 0}-${qStats[1]?.away?.entries || 0} | CC ${qStats[1]?.home?.corners || 0}-${qStats[1]?.away?.corners || 0}`,
    `• 2°C: Goles ${qStats[2]?.home?.goals || 0}-${qStats[2]?.away?.goals || 0} | Área ${qStats[2]?.home?.entries || 0}-${qStats[2]?.away?.entries || 0} | CC ${qStats[2]?.home?.corners || 0}-${qStats[2]?.away?.corners || 0}`,
    `• 3°C: Goles ${qStats[3]?.home?.goals || 0}-${qStats[3]?.away?.goals || 0} | Área ${qStats[3]?.home?.entries || 0}-${qStats[3]?.away?.entries || 0} | CC ${qStats[3]?.home?.corners || 0}-${qStats[3]?.away?.corners || 0}`,
    `• 4°C: Goles ${qStats[4]?.home?.goals || 0}-${qStats[4]?.away?.goals || 0} | Área ${qStats[4]?.home?.entries || 0}-${qStats[4]?.away?.entries || 0} | CC ${qStats[4]?.home?.corners || 0}-${qStats[4]?.away?.corners || 0}`,
    ``,
    `_Generado desde la Web Oficial de Citaciones Regatas Andino B_`
  ];

  const fullText = lines.join('\n');

  if (navigator.clipboard) {
    navigator.clipboard.writeText(fullText).then(() => {
      showToast('📋 ¡Reporte copiado al portapapeles!');
    }).catch(() => {});
  }

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
  window.open(waUrl, '_blank');
}

// Renderizado de la Pantalla DT en Vivo
function renderDtView() {
  if (!isDtAuthenticated()) return;

  const rival = dtMatchState.rivalName || 'RIVAL';
  const curQ = dtMatchState.currentQuarter || 1;
  const qData = (dtMatchState.quarters && dtMatchState.quarters[curQ]) || createDefaultQuarterStats();

  // Acumulados totales
  const tot = {
    home: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0 },
    away: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0 }
  };

  [1, 2, 3, 4].forEach(q => {
    const cur = (dtMatchState.quarters && dtMatchState.quarters[q]) || createDefaultQuarterStats();
    ['home', 'away'].forEach(tm => {
      tot[tm].entries += cur[tm].entries || 0;
      tot[tm].corners += cur[tm].corners || 0;
      tot[tm].cornerGoals += cur[tm].cornerGoals || 0;
      tot[tm].strokes += cur[tm].strokes || 0;
      tot[tm].strokeGoals += cur[tm].strokeGoals || 0;
      tot[tm].fieldGoals += cur[tm].fieldGoals || 0;
      tot[tm].green += cur[tm].green || 0;
      tot[tm].yellow += cur[tm].yellow || 0;
      tot[tm].red += cur[tm].red || 0;
    });
  });

  // 1. Selector de División
  const pillP = document.getElementById('dtPillPrimera');
  const pillI = document.getElementById('dtPillIntermedia');
  if (pillP) pillP.classList.toggle('active', dtMatchState.division === 'primera');
  if (pillI) pillI.classList.toggle('active', dtMatchState.division === 'intermedia');

  // 2. Marcador y Nombres
  const awayName = document.getElementById('dtAwayTeamName');
  if (awayName) awayName.textContent = rival;

  const scoreH = document.getElementById('dtScoreHome');
  const scoreA = document.getElementById('dtScoreAway');
  if (scoreH) scoreH.textContent = dtMatchState.score.home;
  if (scoreA) scoreA.textContent = dtMatchState.score.away;

  // 3. Cuartos
  document.querySelectorAll('.dt-quarter-btn').forEach(btn => {
    const q = parseInt(btn.getAttribute('data-q'), 10);
    btn.classList.toggle('active', q === curQ);
  });

  // 4. Cronómetro
  updateDtClockDisplay();

  // 5. Contadores Regatas
  const cHomeEntry = document.getElementById('countHomeEntry');
  if (cHomeEntry) cHomeEntry.textContent = `${qData.home.entries} en cuarto (${tot.home.entries} total)`;

  const cHomeCorner = document.getElementById('countHomeCorner');
  if (cHomeCorner) cHomeCorner.textContent = `${qData.home.corners} en cuarto (${tot.home.corners} total • ${tot.home.cornerGoals} goles)`;

  const cHomeStroke = document.getElementById('countHomeStroke');
  if (cHomeStroke) cHomeStroke.textContent = `${qData.home.strokes} en cuarto (${tot.home.strokes} total • ${tot.home.strokeGoals} goles)`;

  const cHomeGoal = document.getElementById('countHomeFieldGoal');
  if (cHomeGoal) cHomeGoal.textContent = `${qData.home.fieldGoals} en cuarto (${tot.home.fieldGoals} de jugada)`;

  const cHomeGrn = document.getElementById('countHomeCardGreen');
  if (cHomeGrn) cHomeGrn.textContent = tot.home.green;
  const cHomeYel = document.getElementById('countHomeCardYellow');
  if (cHomeYel) cHomeYel.textContent = tot.home.yellow;
  const cHomeRed = document.getElementById('countHomeCardRed');
  if (cHomeRed) cHomeRed.textContent = tot.home.red;

  // 6. Contadores Rival
  const cAwayEntry = document.getElementById('countAwayEntry');
  if (cAwayEntry) cAwayEntry.textContent = `${qData.away.entries} en cuarto (${tot.away.entries} total)`;

  const cAwayCorner = document.getElementById('countAwayCorner');
  if (cAwayCorner) cAwayCorner.textContent = `${qData.away.corners} en cuarto (${tot.away.corners} total • ${tot.away.cornerGoals} goles)`;

  const cAwayStroke = document.getElementById('countAwayStroke');
  if (cAwayStroke) cAwayStroke.textContent = `${qData.away.strokes} en cuarto (${tot.away.strokes} total • ${tot.away.strokeGoals} goles)`;

  const cAwayGoal = document.getElementById('countAwayFieldGoal');
  if (cAwayGoal) cAwayGoal.textContent = `${qData.away.fieldGoals} en cuarto (${tot.away.fieldGoals} de jugada)`;

  const cAwayGrn = document.getElementById('countAwayCardGreen');
  if (cAwayGrn) cAwayGrn.textContent = tot.away.green;
  const cAwayYel = document.getElementById('countAwayCardYellow');
  if (cAwayYel) cAwayYel.textContent = tot.away.yellow;
  const cAwayRed = document.getElementById('countAwayCardRed');
  if (cAwayRed) cAwayRed.textContent = tot.away.red;

  // 7. Feed de Eventos
  const feedCount = document.getElementById('dtFeedCount');
  const evts = dtMatchState.events || [];
  if (feedCount) feedCount.textContent = evts.length;

  const feedList = document.getElementById('dtFeedList');
  if (feedList) {
    if (evts.length === 0) {
      feedList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.78rem;">No hay incidencias registradas aún. Tocá cualquier botón para comenzar el partido.</div>`;
    } else {
      // Orden cronológico inverso (los más recientes arriba)
      const reversed = [...evts].reverse();
      feedList.innerHTML = reversed.map(evt => {
        let icon = '📌';
        if (evt.type === 'entry') icon = '📥';
        else if (evt.type === 'corner') icon = evt.endedInGoal ? '🥅🏑' : '🏑';
        else if (evt.type === 'stroke') icon = evt.endedInGoal ? '🥅🎯' : '🎯';
        else if (evt.type === 'fieldGoal') icon = '⚽';
        else if (evt.type === 'cardGreen') icon = '🟩';
        else if (evt.type === 'cardYellow') icon = '🟨';
        else if (evt.type === 'cardRed') icon = '🟥';

        const teamClass = evt.team === 'home' ? 'home-event' : 'away-event';

        return `
          <div class="dt-feed-item ${teamClass}">
            <div class="dt-feed-left">
              <span class="dt-feed-icon">${icon}</span>
              <div class="dt-feed-info">
                <span class="dt-feed-label">${escapeHtml(evt.label)}</span>
                <span class="dt-feed-meta">${evt.quarter}° Cuarto • ${evt.clockTime || ''} (${evt.timeDisplay})</span>
              </div>
            </div>
            <button type="button" class="btn-feed-delete-event" onclick="deleteEventById('${evt.id}')" title="Eliminar este evento">✕</button>
          </div>
        `;
      }).join('');
    }
  }
}

