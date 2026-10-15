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
const TOURNAMENT_STORAGE_KEY = 'regatas_andino_torneo_v3';
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

let currentActiveView = 'citacion'; // 'citacion' | 'torneo' | 'fisico'

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
}

function showView(viewName) {
  const viewCitacion = document.getElementById('viewCitacion');
  const viewTorneo = document.getElementById('viewTorneo');
  const viewFisico = document.getElementById('viewFisico');

  currentActiveView = viewName;

  if (viewCitacion) viewCitacion.style.display = viewName === 'citacion' ? 'flex' : 'none';
  if (viewTorneo) viewTorneo.style.display = viewName === 'torneo' ? 'flex' : 'none';
  if (viewFisico) viewFisico.style.display = viewName === 'fisico' ? 'flex' : 'none';

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
  renderTournamentScorers(divData);
  updateAmhLinks(divData);
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

// Sincronización con el servidor local o proxy de AMH
async function syncTournamentData(manual = false) {
  try {
    const fetchDiv = async (divId) => {
      const res = await fetch(`/api/torneo?division=${divId}&_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    };

    const fetchMatches = async (divId) => {
      const res = await fetch(`/api/torneo/matches?division=${divId}&_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    };

    // Fetch standings and scorers
    const [res1, res2] = await Promise.all([fetchDiv('1'), fetchDiv('2')]);

    if (res1 && res1.standings && res1.standings.length > 0) {
      tournamentData.primera.standings = res1.standings;
      if (res1.scorers && res1.scorers.length > 0) {
        tournamentData.primera.scorers = res1.scorers;
      }
    }

    if (res2 && res2.standings && res2.standings.length > 0) {
      tournamentData.intermedia.standings = res2.standings;
      if (res2.scorers && res2.scorers.length > 0) {
        tournamentData.intermedia.scorers = res2.scorers;
      }
    }

    // Fetch match results (only played matches)
    const [m1, m2] = await Promise.all([fetchMatches('1'), fetchMatches('2')]);

    if (m1) {
      const played = (m1.playedMatches || (m1.matches || []).filter(m => m.played)).filter(m => !(m.rival || '').toUpperCase().includes('MURIALDO'));
      if (played.length > 0) {
        tournamentData.primera.matches = played;
      }
      if (m1.nextMatch) {
        tournamentData.primera.nextMatch = m1.nextMatch;
      }
      if (m1.pendingMatches && m1.pendingMatches.length > 0) {
        tournamentData.primera.pendingMatches = m1.pendingMatches;
      }
    }

    if (m2) {
      const played = (m2.playedMatches || (m2.matches || []).filter(m => m.played)).filter(m => !(m.rival || '').toUpperCase().includes('MURIALDO'));
      if (played.length > 0) {
        tournamentData.intermedia.matches = played;
      }
      if (m2.nextMatch) {
        tournamentData.intermedia.nextMatch = m2.nextMatch;
      }
      if (m2.pendingMatches && m2.pendingMatches.length > 0) {
        tournamentData.intermedia.pendingMatches = m2.pendingMatches;
      }
    }

    localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(tournamentData));

    if (currentActiveView === 'torneo') {
      renderTournamentView();
    }

    if (manual) {
      showToast('✅ Tabla y partidos actualizados desde AMH');
    }
  } catch (err) {
    if (manual) {
      showToast('ℹ️ Usando datos cacheados de AMH');
    }
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

function renderRivalLogo() {
  const container = document.getElementById('rivalBadgeContainer');
  if (!container) return;

  const rivalName = matchData.rival || 'R';
  const initial = rivalName.trim().charAt(0).toUpperCase() || 'R';

  if (matchData.rivalLogo && matchData.rivalLogo.trim() !== '') {
    container.innerHTML = `<img src="${escapeHtml(matchData.rivalLogo)}" alt="${escapeHtml(rivalName)}" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'team-badge-initial\\'>${initial}</span>'">`;
  } else {
    container.innerHTML = `<span class="team-badge-initial">${initial}</span>`;
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
