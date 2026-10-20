function cleanupEmptyDtMatches() {
  if (!dtMatchesStore) return;
  let changed = false;
  Object.keys(dtMatchesStore).forEach(k => {
    if (k === dtCurrentMatchKey) return;
    const m = dtMatchesStore[k];
    const hasEvents = m && Array.isArray(m.events) && m.events.length > 0;
    const hasScore = m && m.score && (m.score.home > 0 || m.score.away > 0);
    if (!hasEvents && !hasScore) {
      delete dtMatchesStore[k];
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(DT_MATCHES_STORE_KEY, JSON.stringify(dtMatchesStore));
    } catch (e) {}
  }
}

// VISTA 4: BOTONERA DE INCIDENCIAS DT EN VIVO (HOCKEY LIVE TRACKER)
// ============================================================================

const DT_MATCHES_STORE_KEY = 'regatas_dt_matches_v3';
const DT_ACTIVE_MATCH_KEY = 'regatas_dt_cur_match_v3';
const DT_LEGACY_MATCH_KEY = 'regatas_dt_match_v2';
const DT_TEAM_VIEW_KEY = 'regatas_dt_team_view_pref_v1';

let dtClockInterval = null;
let dtPendingOptionAction = null; // { type: 'corner'|'stroke', team: 'home'|'away' }
let dtCurrentTeamView = 'home';
try {
  const savedView = localStorage.getItem(DT_TEAM_VIEW_KEY);
  if (savedView && ['home', 'away', 'both'].includes(savedView)) {
    dtCurrentTeamView = savedView;
  }
} catch (e) {}

const DT_SUN_MODE_KEY = 'regatas_dt_sun_mode_pref_v1';

let dtSunModeActive = false;
try {
  dtSunModeActive = localStorage.getItem(DT_SUN_MODE_KEY) === 'true';
} catch (e) {}

// Feedback Háptico para móviles (confirmación física táctil bajo el sol)
function triggerDtHaptic(type = 'default') {
  if (!('vibrate' in navigator)) return;
  try {
    if (type === 'goal') {
      navigator.vibrate([80, 50, 100, 50, 120]); // Celebración rítmica enérgica para gol
    } else if (type === 'corner') {
      navigator.vibrate([35, 45, 35]); // Doble pulso nítido para córner corto
    } else if (type === 'stroke') {
      navigator.vibrate([50, 40, 70]); // Pulso firme para penal / stroke
    } else if (type === 'entry') {
      navigator.vibrate(22); // Pulso ágil para ingreso al área
    } else if (type === 'card' || type.startsWith('card')) {
      navigator.vibrate([50, 50, 50]); // Triple pulso para tarjeta
    } else if (type === 'undo') {
      navigator.vibrate([70, 40, 30]); // Secuencia descendente de advertencia para deshacer
    } else if (type === 'quarter') {
      navigator.vibrate([40, 30, 40, 30, 40]); // Cambio de cuarto
    } else if (type === 'timer') {
      navigator.vibrate(30);
    } else {
      navigator.vibrate(20);
    }
  } catch (e) {}
}

function initSunMode() {
  applyDtSunMode();

  const btnToggle = document.getElementById('btnDtSunToggle');
  if (btnToggle) {
    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setDtSunMode(!dtSunModeActive);
    });
  }
}

function setDtSunMode(active) {
  dtSunModeActive = !!active;
  try {
    localStorage.setItem(DT_SUN_MODE_KEY, dtSunModeActive ? 'true' : 'false');
  } catch (e) {}
  applyDtSunMode();
  triggerDtHaptic('tap');
  showToast(dtSunModeActive ? '☀️ Modo Cancha al Sol activado (Alto Contraste)' : '🌙 Modo Noche activado');
}

function applyDtSunMode() {
  const isSun = !!dtSunModeActive;
  
  // Solo aplicar clase a body si estamos en la vista DT y autenticados
  if (currentActiveView === 'dt' && isCtAuthenticated()) {
    document.body.classList.toggle('dt-sun-mode', isSun);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', isSun ? '#ffffff' : '#030d2d');
  } else {
    document.body.classList.remove('dt-sun-mode');
  }

  const viewDt = document.getElementById('viewDT');
  if (viewDt) viewDt.classList.toggle('sun-mode-active', isSun);

  const btnToggle = document.getElementById('btnDtSunToggle');
  if (btnToggle) {
    btnToggle.classList.toggle('active', isSun);
    const icon = btnToggle.querySelector('.sun-icon');
    const text = btnToggle.querySelector('.sun-text');
    if (icon) icon.textContent = isSun ? '🌙' : '☀️';
    if (text) text.textContent = isSun ? 'Noche' : 'Modo Sol';
    btnToggle.title = isSun ? 'Cambiar a Modo Noche' : 'Modo Cancha al Sol (Alto Contraste)';
  }
}

function setDtTeamView(viewMode) {
  if (!['home', 'away', 'both'].includes(viewMode)) viewMode = 'home';
  dtCurrentTeamView = viewMode;
  try {
    localStorage.setItem(DT_TEAM_VIEW_KEY, viewMode);
  } catch (e) {}

  const grid = document.getElementById('dtKeypadGrid');
  if (grid) {
    grid.setAttribute('data-team-view', viewMode);
  }

  const btnHome = document.getElementById('btnDtTabHome');
  const btnAway = document.getElementById('btnDtTabAway');
  const btnBoth = document.getElementById('btnDtTabBoth');

  if (btnHome) btnHome.classList.toggle('active', viewMode === 'home');
  if (btnAway) btnAway.classList.toggle('active', viewMode === 'away');
  if (btnBoth) btnBoth.classList.toggle('active', viewMode === 'both');

  if (navigator.vibrate) navigator.vibrate(20);
}

function createDefaultQuarterStats() {
  return {
    home: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 },
    away: { entries: 0, corners: 0, cornerGoals: 0, strokes: 0, strokeGoals: 0, fieldGoals: 0, green: 0, yellow: 0, red: 0, goals: 0 }
  };
}

function getMatchKey(division, round) {
  const cleanRound = (round || 'general').toString().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `primera_${cleanRound}`;
}

function findFixtureMatch(round) {
  if (!tournamentData) loadTournamentData();
  const divData = (tournamentData && tournamentData.primera) || (DEFAULT_TOURNAMENT_DATA && DEFAULT_TOURNAMENT_DATA.primera);
  if (!divData) return null;

  const normalize = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalize(round);

  if (divData.nextMatch && normalize(divData.nextMatch.round) === target) {
    return divData.nextMatch;
  }
  if (Array.isArray(divData.pendingMatches)) {
    const p = divData.pendingMatches.find(m => normalize(m.round) === target);
    if (p) return p;
  }
  if (Array.isArray(divData.matches)) {
    const m = divData.matches.find(m => normalize(m.round) === target);
    if (m) return m;
  }
  return null;
}

function createDefaultMatchState(round, rivalName, homeAway, fecha) {
  const cleanRound = round || 'Fecha 12';
  return {
    id: getMatchKey('primera', cleanRound),
    division: 'primera',
    round: cleanRound,
    rivalName: (rivalName || 'MURIALDO').toUpperCase(),
    homeAway: homeAway || 'Local',
    fecha: fecha || '',
    currentQuarter: 1,
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
}

let dtMatchesStore = {};
let dtCurrentMatchKey = 'primera_fecha_12';
let dtMatchState = createDefaultMatchState('Fecha 12', 'MURIALDO B', 'Local', '24/10/2026');

function ensureMatchStateExists(matchKey, meta = {}) {
  if (!matchKey) matchKey = 'primera_fecha_12';

  if (!dtMatchesStore[matchKey]) {
    let round = meta.round;
    if (!round) {
      const suffix = matchKey.replace('primera_', '').replace('intermedia_', '');
      const parts = suffix.split('_');
      round = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      if (!round || round.toLowerCase() === 'amistoso') round = 'Amistoso';
    }

    const fixtureMatch = findFixtureMatch(round);
    const rival = meta.rivalName || (fixtureMatch ? fixtureMatch.rival : (round.toLowerCase() === 'amistoso' ? 'AMISTOSO' : 'RIVAL'));
    const homeAway = meta.homeAway || (fixtureMatch ? fixtureMatch.homeAway : 'Local');
    const fecha = meta.fecha || (fixtureMatch ? fixtureMatch.fecha : '');

    dtMatchesStore[matchKey] = createDefaultMatchState(round, rival, homeAway, fecha);
  } else {
    dtMatchesStore[matchKey].division = 'primera';
    if (meta.rivalName && (!dtMatchesStore[matchKey].rivalName || dtMatchesStore[matchKey].rivalName === 'RIVAL')) {
      dtMatchesStore[matchKey].rivalName = meta.rivalName.toUpperCase();
    }
    if (meta.round && !dtMatchesStore[matchKey].round) {
      dtMatchesStore[matchKey].round = meta.round;
    }
    if (meta.homeAway && !dtMatchesStore[matchKey].homeAway) {
      dtMatchesStore[matchKey].homeAway = meta.homeAway;
    }
    if (meta.fecha && !dtMatchesStore[matchKey].fecha) {
      dtMatchesStore[matchKey].fecha = meta.fecha;
    }
  }

  return dtMatchesStore[matchKey];
}

// Carga y guardado de tienda multi-partido en LocalStorage
function loadDtMatchesStore() {
  try {
    const saved = localStorage.getItem(DT_MATCHES_STORE_KEY);
    if (saved) {
      dtMatchesStore = JSON.parse(saved) || {};
    }
  } catch (e) {
    console.warn('Error cargando dtMatchesStore:', e);
    dtMatchesStore = {};
  }

  // Migración desde versión anterior monomatch (v2) si existe
  try {
    const oldSaved = localStorage.getItem(DT_LEGACY_MATCH_KEY);
    if (oldSaved) {
      const oldMatch = JSON.parse(oldSaved);
      if (oldMatch && Array.isArray(oldMatch.events) && oldMatch.events.length > 0) {
        const legacyDiv = oldMatch.division || 'primera';
        const legacyKey = `${legacyDiv}_fecha_12`;
        if (!dtMatchesStore[legacyKey]) {
          oldMatch.id = legacyKey;
          oldMatch.round = oldMatch.round || 'Fecha 12';
          dtMatchesStore[legacyKey] = oldMatch;
        }
      }
    }
  } catch (e) {}

  const savedActiveKey = localStorage.getItem(DT_ACTIVE_MATCH_KEY);
  dtCurrentMatchKey = savedActiveKey || 'primera_fecha_12';

  cleanupEmptyDtMatches();

  ensureMatchStateExists(dtCurrentMatchKey);
  dtMatchState = dtMatchesStore[dtCurrentMatchKey];
  recalculateDtStatsFromEvents();
}

function saveDtMatchesStore() {
  try {
    if (dtMatchState && dtCurrentMatchKey) {
      dtMatchesStore[dtCurrentMatchKey] = dtMatchState;
    }
    localStorage.setItem(DT_MATCHES_STORE_KEY, JSON.stringify(dtMatchesStore));
    localStorage.setItem(DT_ACTIVE_MATCH_KEY, dtCurrentMatchKey);
  } catch (e) {
    console.warn('Error guardando dtMatchesStore:', e);
  }
}

// Aliases de compatibilidad
function loadDtMatchState() {
  loadDtMatchesStore();
}

function saveDtMatchState() {
  saveDtMatchesStore();
}

// Cambio de partido activo en la Botonera DT
function switchDtMatch(matchKey, meta = {}) {
  if (!matchKey) return;
  pauseDtClock();

  saveDtMatchesStore();

  dtCurrentMatchKey = matchKey;
  ensureMatchStateExists(matchKey, meta);
  dtMatchState = dtMatchesStore[matchKey];

  recalculateDtStatsFromEvents();
  saveDtMatchesStore();

  renderDtView();

  // Sincronizar inmediatamente las incidencias desde Google Sheets para este partido
  if (isDtAuthenticated()) {
    fetchDtMatchFromCloud();
  }
}

// Llenado dinámico del selector de partidos (Exclusivo 1ra División)
function populateDtMatchSelect() {
  const select = document.getElementById('selectDtMatch');
  if (!select) return;

  if (!tournamentData) loadTournamentData();

  const def1 = (typeof DEFAULT_TOURNAMENT_DATA !== 'undefined' && DEFAULT_TOURNAMENT_DATA.primera) || {};
  const div1 = (tournamentData && tournamentData.primera) || def1;

  const pending1 = (Array.isArray(div1.pendingMatches) && div1.pendingMatches.length > 0)
    ? div1.pendingMatches
    : (Array.isArray(def1.pendingMatches) ? def1.pendingMatches : []);
  const played1 = (Array.isArray(div1.matches) && div1.matches.length > 0)
    ? div1.matches
    : (Array.isArray(def1.matches) ? def1.matches : []);

  let html = '';

  // 1. Fixture por Disputarse (1ra División)
  if (pending1.length > 0) {
    html += `<optgroup label="⏳ Fixture por Disputarse (1ra División)">`;
    pending1.forEach(m => {
      const key = getMatchKey('primera', m.round);
      const isSaved = dtMatchesStore[key] && dtMatchesStore[key].events && dtMatchesStore[key].events.length > 0;
      const scoreBadge = isSaved ? ` [● En vivo ${dtMatchesStore[key].score.home}-${dtMatchesStore[key].score.away}]` : '';
      const selectedAttr = key === dtCurrentMatchKey ? 'selected' : '';
      const cond = m.homeAway ? ` (${m.homeAway})` : '';
      html += `<option value="${key}" ${selectedAttr}>${escapeHtml(m.round)} • vs ${escapeHtml(m.rival)}${cond}${scoreBadge}</option>`;
    });
    html += `</optgroup>`;
  }

  // 2. Partidos Disputados (Historial 1ra División)
  if (played1.length > 0) {
    html += `<optgroup label="✅ Partidos Disputados (Historial 1ra División)">`;
    const revPlayed = [...played1].reverse();
    revPlayed.forEach(m => {
      const key = getMatchKey('primera', m.round);
      const isSaved = dtMatchesStore[key] && dtMatchesStore[key].events && dtMatchesStore[key].events.length > 0;
      const scoreBadge = isSaved ? ` [● DT ${dtMatchesStore[key].score.home}-${dtMatchesStore[key].score.away}]` : ` (${m.score || 'Jugado'})`;
      const selectedAttr = key === dtCurrentMatchKey ? 'selected' : '';
      html += `<option value="${key}" ${selectedAttr}>${escapeHtml(m.round)} • vs ${escapeHtml(m.rival)}${scoreBadge}</option>`;
    });
    html += `</optgroup>`;
  }

  // 3. Amistoso / Libre
  const customKey = 'primera_amistoso';
  const isCustomSaved = dtMatchesStore[customKey] && dtMatchesStore[customKey].events && dtMatchesStore[customKey].events.length > 0;
  const customBadge = isCustomSaved ? ` [● ${dtMatchesStore[customKey].score.home}-${dtMatchesStore[customKey].score.away}]` : '';
  const customSelected = customKey === dtCurrentMatchKey ? 'selected' : '';
  html += `
    <optgroup label="⚡ Personalizado / Amistoso">
      <option value="${customKey}" ${customSelected}>Amistoso / Práctica Libre${customBadge}</option>
    </optgroup>
  `;

  select.innerHTML = html;
}

function deduceEventType(evt) {
  if (evt && evt.type) return evt.type;
  const label = ((evt && evt.label) || '').toLowerCase();
  if (label.includes('ingreso') || label.includes('área') || label.includes('area')) return 'entry';
  if (label.includes('córner') || label.includes('corner')) return 'corner';
  if (label.includes('penal') || label.includes('stroke')) return 'stroke';
  if (label.includes('gol de jugada') || label.includes('jugada')) return 'fieldGoal';
  if (label.includes('verde')) return 'cardGreen';
  if (label.includes('amarilla')) return 'cardYellow';
  if (label.includes('roja')) return 'cardRed';
  return 'entry';
}

// Recalcular todas las estadísticas y marcador directamente desde el feed de eventos
// (Garantiza 100% de coherencia matemática al deshacer o sincronizar desde la nube)
function recalculateDtStatsFromEvents() {
  if (dtMatchState) {
    recalculateMatchStats(dtMatchState);
  }
}

// ============================================================================
// SINCRONIZACIÓN EN VIVO CON GOOGLE SHEETS (MULTI-CELULAR)
// ============================================================================

const DT_WEBHOOK_URL_KEY = 'regatas_dt_webhook_url_v1';
const DT_SYNC_QUEUE_KEY = 'regatas_dt_sync_queue_v1';

// URL global por defecto: si está configurada, todos los celulares y computadoras
// se conectan automáticamente en vivo sin necesidad de pegar la URL manualmente.
const DEFAULT_DT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxPdnHYI0eYdBQKxtGX-pM24GGnP5Nys-ab_XJEnJ4jA76t9N8OOqfacOFtBA2RioM/exec';

let dtCloudSyncPollingInterval = null;
let dtIsProcessingSyncQueue = false;
let dtIsPollingCloud = false;

function getDtWebhookUrl() {
  try {
    const saved = localStorage.getItem(DT_WEBHOOK_URL_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {}
  return DEFAULT_DT_WEBHOOK_URL || '';
}

function setDtWebhookUrl(url) {
  try {
    if (url && url.trim()) {
      localStorage.setItem(DT_WEBHOOK_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(DT_WEBHOOK_URL_KEY);
    }
  } catch (e) {}
  updateDtCloudSyncStatus();
}

function updateDtCloudSyncStatus(state, text) {
  const badge = document.getElementById('dtCloudSyncBadge');
  const label = document.getElementById('dtCloudStatusText');
  const modalDot = document.getElementById('modalSheetsStatusDot');
  const modalTitle = document.getElementById('modalSheetsStatusTitle');
  const modalDesc = document.getElementById('modalSheetsStatusDesc');

  const webhook = getDtWebhookUrl();

  if (!state) {
    if (!webhook) {
      state = 'disconnected';
      text = 'Conectar Sheets';
    } else {
      state = 'connected';
      text = 'Sheets en vivo';
    }
  }

  if (badge) {
    badge.classList.remove('connected', 'syncing', 'error');
    if (state === 'connected') badge.classList.add('connected');
    else if (state === 'syncing') badge.classList.add('syncing');
    else if (state === 'error' || state === 'disconnected') badge.classList.add('error');
  }

  if (label) label.textContent = text || 'Sheets';

  if (modalDot && modalTitle && modalDesc) {
    if (state === 'connected') {
      modalDot.style.background = '#34d399';
      modalTitle.textContent = 'Conectado a Google Sheets';
      modalDesc.textContent = 'Cada botón que toques se guardará en tu hoja de cálculo y se sincronizará con otros celulares.';
    } else if (state === 'syncing') {
      modalDot.style.background = '#fbbf24';
      modalTitle.textContent = 'Transmitiendo jugadas...';
      modalDesc.textContent = text || 'Guardando cambios en Google Sheets...';
    } else {
      modalDot.style.background = '#f87171';
      modalTitle.textContent = 'Sin conexión configurada';
      modalDesc.textContent = 'Pegá abajo la URL de Apps Script de tu Google Sheets para activar la sincronización en vivo.';
    }
  }
}

function getDtSyncQueue() {
  try {
    const raw = localStorage.getItem(DT_SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveDtSyncQueue(queue) {
  try {
    localStorage.setItem(DT_SYNC_QUEUE_KEY, JSON.stringify(queue || []));
  } catch (e) {}
}

function enqueueDtSyncAction(item) {
  const queue = getDtSyncQueue();
  queue.push(item);
  saveDtSyncQueue(queue);
  processDtSyncQueue();
}

async function processDtSyncQueue() {
  if (dtIsProcessingSyncQueue) return;
  const webhookUrl = getDtWebhookUrl();
  if (!webhookUrl) {
    updateDtCloudSyncStatus('disconnected', 'Conectar Sheets');
    return;
  }

  const queue = getDtSyncQueue();
  if (queue.length === 0) {
    updateDtCloudSyncStatus('connected', 'Sheets en vivo');
    return;
  }

  dtIsProcessingSyncQueue = true;
  updateDtCloudSyncStatus('syncing', `Guardando (${queue.length})...`);

  while (queue.length > 0) {
    const currentItem = queue[0];
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(currentItem)
      });
      queue.shift();
      saveDtSyncQueue(queue);
    } catch (err) {
      console.warn('Error enviando acción a Google Sheets:', err);
      break;
    }
  }

  dtIsProcessingSyncQueue = false;
  if (queue.length === 0) {
    updateDtCloudSyncStatus('connected', 'Sheets en vivo');
  } else {
    updateDtCloudSyncStatus('syncing', `Pendientes (${queue.length})`);
  }
}

// Nombre canónico de la pestaña de Google Sheets para cada partido
function getDtMatchSheetName(matchState) {
  const m = matchState || dtMatchState;
  if (!m) return 'Fecha 12 - MURIALDO B';
  const round = (m.round || 'Fecha 12').trim();
  let rival = (m.rivalName || 'MURIALDO B').trim().toUpperCase();
  // Normalizar para que nunca difiera "MURIALDO" de "MURIALDO B"
  if (rival === 'MURIALDO') rival = 'MURIALDO B';
  return `${round} - ${rival}`;
}

// Polling multi-dispositivo: lectura periódica de incidencias de otros celulares
async function fetchDtMatchFromCloud() {
  if (dtIsPollingCloud || !isDtAuthenticated() || currentActiveView !== 'dt') return;
  const webhookUrl = getDtWebhookUrl();
  if (!webhookUrl || !dtMatchState) return;

  dtIsPollingCloud = true;
  const sheetName = getDtMatchSheetName(dtMatchState);

  try {
    const url = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'ok' && Array.isArray(data.events)) {
        mergeCloudEventsIntoMatchState(data.events);
      }
    }
  } catch (e) {
    // Sin conexión temporal
  } finally {
    dtIsPollingCloud = false;
  }
}

function formatCloudTimeString(val) {
  if (!val) return '';
  const str = val.toString().trim();
  if (str.includes('T') && (str.includes('Z') || str.includes('.'))) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {}
  }
  return str;
}

function normalizeCloudEvent(cEvt) {
  if (!cEvt) return null;
  const type = deduceEventType(cEvt);
  const label = (cEvt.label || '').toString();
  const isGoal = cEvt.endedInGoal === true || cEvt.endedInGoal === 'true' || 
                 (label.toLowerCase().includes('gol') && (label.toLowerCase().includes('córner') || label.toLowerCase().includes('penal') || label.toLowerCase().includes('jugada')));

  const team = (cEvt.team === 'away' || (cEvt.team && cEvt.team.toLowerCase().includes('rival'))) ? 'away' : 'home';
  const quarter = parseInt(cEvt.quarter, 10) || 1;

  let clockTime = formatCloudTimeString(cEvt.clockTime);
  let timeDisplay = formatCloudTimeString(cEvt.timeDisplay);

  return {
    id: cEvt.id || ('evt_cloud_' + Math.random().toString(36).substr(2, 6)),
    quarter: quarter >= 1 && quarter <= 4 ? quarter : 1,
    clockTime: clockTime,
    timeDisplay: timeDisplay,
    type: type,
    team: team,
    endedInGoal: isGoal,
    player: cEvt.player || '',
    label: label || getIncidentLabel(type, isGoal, team, cEvt.player)
  };
}

function mergeCloudEventsIntoMatchState(cloudEvents) {
  if (!dtMatchState || !Array.isArray(cloudEvents)) return;

  const normalizedCloud = cloudEvents.map(normalizeCloudEvent).filter(Boolean);
  const localQueue = getDtSyncQueue();
  const pendingIds = new Set(localQueue.map(q => q.event && q.event.id).filter(Boolean));

  // Si no hay acciones pendientes en la cola local, la planilla en la nube es la fuente de verdad
  if (localQueue.length === 0) {
    dtMatchState.events = normalizedCloud;
  } else {
    const cloudIds = new Set(normalizedCloud.map(e => e.id));
    const merged = [...normalizedCloud];
    (dtMatchState.events || []).forEach(localEvt => {
      if (pendingIds.has(localEvt.id) && !cloudIds.has(localEvt.id)) {
        merged.push(localEvt);
      }
    });
    dtMatchState.events = merged;
  }

  recalculateDtStatsFromEvents();
  saveDtMatchesStore();
  renderDtView();
  updateDtCloudSyncStatus('connected', 'Sheets en vivo');
}

function startDtCloudPolling() {
  if (dtCloudSyncPollingInterval) clearInterval(dtCloudSyncPollingInterval);
  // Llamada inmediata para no esperar los 4 segundos
  fetchDtMatchFromCloud();
  processDtSyncQueue();

  dtCloudSyncPollingInterval = setInterval(() => {
    fetchDtMatchFromCloud();
    processDtSyncQueue();
  }, 4000);
}

function stopDtCloudPolling() {
  if (dtCloudSyncPollingInterval) {
    clearInterval(dtCloudSyncPollingInterval);
    dtCloudSyncPollingInterval = null;
  }
}

async function pushFullCurrentMatchToSheets() {
  const webhookUrl = getDtWebhookUrl();
  if (!webhookUrl) {
    alert('Primero pegá y guardá la URL de la Aplicación Web de Apps Script.');
    return;
  }

  const sheetName = getDtMatchSheetName(dtMatchState);
  showToast('☁️ Enviando partido completo a Google Sheets...');
  updateDtCloudSyncStatus('syncing', 'Subiendo partido...');

  const payload = {
    action: 'sync_full_match',
    round: dtMatchState.round,
    rival: dtMatchState.rivalName,
    sheetName: sheetName,
    matchState: dtMatchState
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    updateDtCloudSyncStatus('connected', 'Sheets en vivo');
    showToast(`✅ ¡Pestaña "${payload.sheetName}" actualizada en Google Sheets!`);
    closeDtSheetsConfigModal();
  } catch (err) {
    console.error('Error al subir partido a Sheets:', err);
    updateDtCloudSyncStatus('error', 'Error al enviar');
    showToast('⚠️ No se pudo conectar con Sheets. Verificá la URL.');
  }
}

function openDtSheetsConfigModal() {
  const modal = document.getElementById('modalDtSheetsConfig');
  const input = document.getElementById('inputDtWebhookUrl');
  if (input) {
    input.value = getDtWebhookUrl();
  }
  updateDtCloudSyncStatus();
  if (modal) modal.classList.add('active');
}

function closeDtSheetsConfigModal() {
  const modal = document.getElementById('modalDtSheetsConfig');
  if (modal) modal.classList.remove('active');
}

function handleDtViewOpen() {
  const gateCard = document.getElementById('dtAuthGateCard');
  const livePanel = document.getElementById('dtLivePanel');
  const passInput = document.getElementById('inputDtGatePassword');
  const errorMsg = document.getElementById('dtGateErrorMsg');

  if (isCtAuthenticated()) {
    if (gateCard) gateCard.style.display = 'none';
    if (livePanel) livePanel.style.display = 'flex';
    applyDtSunMode();
    renderDtView();
    updateDtCloudSyncStatus();
    startDtCloudPolling();
    processDtSyncQueue();
  } else {
    stopDtCloudPolling();
    document.body.classList.remove('dt-sun-mode');
    if (livePanel) livePanel.style.display = 'none';
    if (gateCard) gateCard.style.display = 'block';
    if (errorMsg) errorMsg.style.display = 'none';
    if (passInput) {
      passInput.value = '';
      setTimeout(() => passInput.focus(), 150);
    }
  }
}

async function verifyDtPassword() {
  const passInput = document.getElementById('inputDtGatePassword');
  const errorMsg = document.getElementById('dtGateErrorMsg');
  const entered = (passInput ? passInput.value : '').trim().toLowerCase();

  const ok = await verifyCtPassword(entered);
  if (ok) {
    setCtAuthenticated(true);
    handleDtViewOpen();
    showToast('⏱️ Acceso concedido a la Botonera DT');
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
    if (passInput) passInput.select();
  }
}

function lockDtSession() {
  lockCtSession();
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
  populateDtMatchSelect();

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

  // 3. Conexión & Modal Google Sheets
  const btnOpenSheets = document.getElementById('btnDtOpenSheetsConfig');
  const btnQuickSync = document.getElementById('btnDtQuickSync');
  const badgeSync = document.getElementById('dtCloudSyncBadge');
  if (btnOpenSheets) btnOpenSheets.addEventListener('click', openDtSheetsConfigModal);
  if (btnQuickSync) {
    btnQuickSync.addEventListener('click', () => {
      if (isDtAuthenticated()) {
        fetchDtMatchFromCloud();
        processDtSyncQueue();
        if (navigator.vibrate) navigator.vibrate(25);
        showToast('🔄 Sincronizando con Google Sheets...');
      }
    });
  }
  if (badgeSync) {
    badgeSync.addEventListener('click', () => {
      if (isDtAuthenticated()) {
        fetchDtMatchFromCloud();
        processDtSyncQueue();
        if (navigator.vibrate) navigator.vibrate(25);
        showToast('🔄 Sincronizando con Google Sheets...');
      } else {
        openDtSheetsConfigModal();
      }
    });
  }

  const btnCloseSheets = document.getElementById('btnCloseDtSheetsConfig');
  const btnCloseSheetsBottom = document.getElementById('btnCloseDtSheetsBottom');
  if (btnCloseSheets) btnCloseSheets.addEventListener('click', closeDtSheetsConfigModal);
  if (btnCloseSheetsBottom) btnCloseSheetsBottom.addEventListener('click', closeDtSheetsConfigModal);

  const modalSheets = document.getElementById('modalDtSheetsConfig');
  if (modalSheets) {
    modalSheets.addEventListener('click', (e) => {
      if (e.target === modalSheets) closeDtSheetsConfigModal();
    });
  }

  const btnSaveWebhook = document.getElementById('btnSaveWebhookUrl');
  if (btnSaveWebhook) {
    btnSaveWebhook.addEventListener('click', () => {
      const input = document.getElementById('inputDtWebhookUrl');
      const val = input ? input.value : '';
      setDtWebhookUrl(val);
      if (val && val.trim()) {
        showToast('✅ Conexión con Google Sheets guardada');
        processDtSyncQueue();
      } else {
        showToast('ℹ️ Conexión con Google Sheets desactivada');
      }
      closeDtSheetsConfigModal();
    });
  }

  const btnPushFull = document.getElementById('btnPushFullMatchToSheets');
  if (btnPushFull) {
    btnPushFull.addEventListener('click', pushFullCurrentMatchToSheets);
  }

  // 3.5 Selector Móvil de Vista de Equipos (Regatas / Rival / Ambos)
  const tabHome = document.getElementById('btnDtTabHome');
  const tabAway = document.getElementById('btnDtTabAway');
  const tabBoth = document.getElementById('btnDtTabBoth');
  if (tabHome) tabHome.addEventListener('click', () => setDtTeamView('home'));
  if (tabAway) tabAway.addEventListener('click', () => setDtTeamView('away'));
  if (tabBoth) tabBoth.addEventListener('click', () => setDtTeamView('both'));
  setDtTeamView(dtCurrentTeamView);

  // 4. Selector de Partido Sincronizado con Fixture Oficial
  const selectMatch = document.getElementById('selectDtMatch');
  if (selectMatch) {
    selectMatch.addEventListener('change', (e) => {
      const chosenKey = e.target.value;
      if (chosenKey && chosenKey !== dtCurrentMatchKey) {
        switchDtMatch(chosenKey);
        showToast(`📍 Partido cargado: ${dtMatchState.round} vs ${dtMatchState.rivalName}`);
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
        if (navigator.vibrate) navigator.vibrate(25);
        showToast(`📍 Cambiaste al ${q}° Cuarto`);
      }
    });
  });

  // 6. Cronómetro
  const btnToggleClock = document.getElementById('btnDtClockToggle');
  if (btnToggleClock) {
    btnToggleClock.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(20);
      if (dtMatchState.timer.isRunning) pauseDtClock(); else startDtClock();
    });
  }
  const btnResetClock = document.getElementById('btnDtClockReset');
  if (btnResetClock) {
    btnResetClock.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(20);
      resetDtClock();
    });
  }

  // 7. Botones Tácticos Regatas (A Favor)
  const btnHomeEntry = document.getElementById('btnHomeEntry');
  if (btnHomeEntry) btnHomeEntry.addEventListener('click', () => logIncident('entry', 'home'));

  const btnHomeCorner = document.getElementById('btnHomeCorner');
  if (btnHomeCorner) btnHomeCorner.addEventListener('click', () => openIncidentOptionModal('corner', 'home'));

  const btnHomeStroke = document.getElementById('btnHomeStroke');
  if (btnHomeStroke) btnHomeStroke.addEventListener('click', () => openIncidentOptionModal('stroke', 'home'));

  const btnHomeGoal = document.getElementById('btnHomeFieldGoal');
  if (btnHomeGoal) btnHomeGoal.addEventListener('click', () => openPlayerAssignModal({ type: 'fieldGoal', team: 'home', endedInGoal: true }));

  // Tarjetas Regatas
  const btnHomeGreen = document.getElementById('btnHomeCardGreen');
  if (btnHomeGreen) btnHomeGreen.addEventListener('click', () => openPlayerAssignModal({ type: 'cardGreen', team: 'home', endedInGoal: false }));
  const btnHomeYellow = document.getElementById('btnHomeCardYellow');
  if (btnHomeYellow) btnHomeYellow.addEventListener('click', () => openPlayerAssignModal({ type: 'cardYellow', team: 'home', endedInGoal: false }));
  const btnHomeRed = document.getElementById('btnHomeCardRed');
  if (btnHomeRed) btnHomeRed.addEventListener('click', () => openPlayerAssignModal({ type: 'cardRed', team: 'home', endedInGoal: false }));

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

  // 9.5 Modal de Asignación de Jugadora a Incidencias
  const btnCloseAssign = document.getElementById('btnClosePlayerAssign');
  if (btnCloseAssign) btnCloseAssign.addEventListener('click', closePlayerAssignModal);

  const btnSkipAssign = document.getElementById('btnSkipPlayerAssign');
  if (btnSkipAssign) btnSkipAssign.addEventListener('click', () => confirmPlayerAssign(''));

  const btnCustomAssign = document.getElementById('btnAssignCustomPlayer');
  const inputCustom = document.getElementById('inputCustomPlayerName');
  if (btnCustomAssign) {
    btnCustomAssign.addEventListener('click', () => {
      const val = inputCustom ? inputCustom.value.trim() : '';
      confirmPlayerAssign(val);
    });
  }
  if (inputCustom) {
    inputCustom.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmPlayerAssign(inputCustom.value.trim());
      }
    });
  }

  const inputFilterAssign = document.getElementById('inputFilterAssignPlayer');
  if (inputFilterAssign) {
    inputFilterAssign.addEventListener('input', (e) => {
      renderPlayerAssignGrid(e.target.value);
    });
  }

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

  const btnModalShareImg = document.getElementById('btnModalShareImage');
  if (btnModalShareImg) btnModalShareImg.addEventListener('click', exportDtMatchImage);

  const modalSummary = document.getElementById('modalDtSummary');
  if (modalSummary) {
    modalSummary.addEventListener('click', (e) => {
      if (e.target === modalSummary) closeDtSummaryModal();
    });
  }

  const modalOption = document.getElementById('modalIncidentOption');
  if (modalOption) {
    modalOption.addEventListener('click', (e) => {
      if (e.target === modalOption) closeIncidentOptionModal();
    });
  }

  const modalPlayerAssign = document.getElementById('modalPlayerAssign');
  if (modalPlayerAssign) {
    modalPlayerAssign.addEventListener('click', (e) => {
      if (e.target === modalPlayerAssign) closePlayerAssignModal();
    });
  }

  // 12. Atajo global para abrir un partido específico en la Botonera DT (desde Torneo)
  window.openDtForMatch = function(division, round, rival) {
    const div = (division === '2' || division === 'intermedia') ? 'intermedia' : 'primera';
    const matchKey = getMatchKey(div, round);
    switchDtMatch(matchKey, { division: div, round, rivalName: rival });
    showView('dt');
    showToast(`⏱️ Botonera DT: ${round} vs ${rival || 'Rival'}`);
  };

  // 13. Sincronización automática al reactivar la pestaña o desbloquear el celular
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentActiveView === 'dt' && isDtAuthenticated()) {
      fetchDtMatchFromCloud();
      processDtSyncQueue();
    }
  });
  window.addEventListener('focus', () => {
    if (currentActiveView === 'dt' && isDtAuthenticated()) {
      fetchDtMatchFromCloud();
      processDtSyncQueue();
    }
  });
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

  // Sincronización en vivo con Google Sheets en segundo plano
  enqueueDtSyncAction({
    action: 'log_incident',
    event: evt,
    matchState: dtMatchState,
    round: dtMatchState.round,
    rival: dtMatchState.rivalName,
    sheetName: getDtMatchSheetName(dtMatchState)
  });

  // Vibración háptica diferenciada en móviles
  if (endedInGoal) {
    triggerDtHaptic('goal');
  } else if (type.startsWith('card')) {
    triggerDtHaptic('card');
  } else if (type === 'entry') {
    triggerDtHaptic('entry');
  } else if (type === 'corner') {
    triggerDtHaptic('corner');
  } else if (type === 'stroke') {
    triggerDtHaptic('stroke');
  } else {
    triggerDtHaptic('tap');
  }

  showToast(`${evt.team === 'home' ? '🔵' : '🔴'} ${evt.label}`);
  renderDtView();
}

function getIncidentLabel(type, endedInGoal, team, player = '') {
  const teamLabel = team === 'home' ? 'Regatas' : (dtMatchState.rivalName || 'Rival');
  const playerSuffix = player ? ` (${player})` : '';

  if (type === 'entry') return `Ingreso al área (${teamLabel})`;
  if (type === 'corner') return endedInGoal ? `¡GOL de Córner Corto! (${teamLabel}${playerSuffix})` : `Córner Corto (${teamLabel})`;
  if (type === 'stroke') return endedInGoal ? `¡GOL de Penal! (${teamLabel}${playerSuffix})` : `Penal ejecutado (${teamLabel})`;
  if (type === 'fieldGoal') return `¡GOL de Jugada! (${teamLabel}${playerSuffix})`;
  if (type === 'cardGreen') return `Tarjeta Verde 🟩 (${teamLabel}${playerSuffix})`;
  if (type === 'cardYellow') return `Tarjeta Amarilla 🟨 (${teamLabel}${playerSuffix})`;
  if (type === 'cardRed') return `Tarjeta Roja 🟥 (${teamLabel}${playerSuffix})`;
  return 'Incidencia';
}

function logCard(cardType, team) {
  if (team === 'home') {
    openPlayerAssignModal({ type: cardType, team: 'home', endedInGoal: false });
    return;
  }
  logIncident(cardType, team, false, '');
}

// ============================================================================
// ASIGNACIÓN DE JUGADORA A INCIDENCIAS (GOLES Y TARJETAS)
// ============================================================================

let dtPendingPlayerIncident = null;

function getActiveMatchSquad() {
  if (!matchData) loadData();
  const divKey = (dtMatchState && dtMatchState.division === 'intermedia') ? 'intermedia' : 'primera';
  let list = [];
  if (matchData && matchData[divKey] && Array.isArray(matchData[divKey].players)) {
    list = matchData[divKey].players;
  } else if (DEFAULT_MATCH_DATA && DEFAULT_MATCH_DATA[divKey] && Array.isArray(DEFAULT_MATCH_DATA[divKey].players)) {
    list = DEFAULT_MATCH_DATA[divKey].players;
  }
  return list.filter(p => p && p.trim()).sort((a, b) => a.localeCompare(b));
}

function openPlayerAssignModal(incidentData) {
  dtPendingPlayerIncident = incidentData;
  const modal = document.getElementById('modalPlayerAssign');
  const icon = document.getElementById('playerAssignModalIcon');
  const title = document.getElementById('playerAssignModalTitle');
  const subtitle = document.getElementById('playerAssignModalSubtitle');
  const searchInput = document.getElementById('inputFilterAssignPlayer');
  const customInput = document.getElementById('inputCustomPlayerName');

  if (searchInput) searchInput.value = '';
  if (customInput) customInput.value = '';

  const isGoal = !!incidentData.endedInGoal;
  const type = incidentData.type;

  if (type === 'fieldGoal') {
    if (icon) icon.textContent = '⚽';
    if (title) title.textContent = '¡GOL DE JUGADA!';
    if (subtitle) subtitle.textContent = '¿Quién convirtió el gol de Regatas?';
  } else if (type === 'corner') {
    if (icon) icon.textContent = '🏑';
    if (title) title.textContent = '¡GOL DE CÓRNER CORTO!';
    if (subtitle) subtitle.textContent = '¿Quién convirtió el gol de jugada fija?';
  } else if (type === 'stroke') {
    if (icon) icon.textContent = '🎯';
    if (title) title.textContent = '¡GOL DE PENAL!';
    if (subtitle) subtitle.textContent = '¿Quién ejecutó y convirtió el penal?';
  } else if (type === 'cardGreen') {
    if (icon) icon.textContent = '🟩';
    if (title) title.textContent = 'TARJETA VERDE (2 MIN)';
    if (subtitle) subtitle.textContent = '¿Quién recibió la sanción temporal?';
  } else if (type === 'cardYellow') {
    if (icon) icon.textContent = '🟨';
    if (title) title.textContent = 'TARJETA AMARILLA (5 MIN)';
    if (subtitle) subtitle.textContent = '¿Quién recibió la tarjeta en Regatas?';
  } else if (type === 'cardRed') {
    if (icon) icon.textContent = '🟥';
    if (title) title.textContent = 'TARJETA ROJA (EXPULSIÓN)';
    if (subtitle) subtitle.textContent = '¿Quién fue expulsada de Regatas?';
  } else {
    if (icon) icon.textContent = isGoal ? '🥅' : '👤';
    if (title) title.textContent = isGoal ? '¡GOL DE REGATAS!' : 'ASIGNAR JUGADORA';
    if (subtitle) subtitle.textContent = isGoal ? '¿Quién convirtió el gol?' : 'Seleccioná la jugadora';
  }

  renderPlayerAssignGrid('');
  if (modal) modal.classList.add('active');
  if (navigator.vibrate) navigator.vibrate(25);
}

function renderPlayerAssignGrid(filter = '') {
  const grid = document.getElementById('playerAssignGrid');
  if (!grid) return;

  const players = getActiveMatchSquad();
  const cleanFilter = (filter || '').toLowerCase().trim();

  const filtered = cleanFilter
    ? players.filter(p => p.toLowerCase().includes(cleanFilter))
    : players;

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 14px;">No se encontraron jugadoras con "${escapeHtml(filter)}". Podés ingresar el nombre abajo.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(name => {
    const parts = name.trim().split(/\s+/);
    let initials = '';
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts[0]) {
      initials = parts[0].slice(0, 2).toUpperCase();
    }

    return `
      <button type="button" class="player-assign-chip" data-player="${escapeHtml(name)}">
        <span class="player-chip-avatar">${initials}</span>
        <span class="player-chip-name">${escapeHtml(name)}</span>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.player-assign-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const pName = chip.getAttribute('data-player');
      confirmPlayerAssign(pName);
    });
  });
}

function confirmPlayerAssign(playerName = '') {
  if (dtPendingPlayerIncident) {
    const { type, team, endedInGoal } = dtPendingPlayerIncident;
    dtPendingPlayerIncident = null;
    closePlayerAssignModal();
    logIncident(type, team, endedInGoal, (playerName || '').trim());
  } else {
    closePlayerAssignModal();
  }
}

function closePlayerAssignModal() {
  const modal = document.getElementById('modalPlayerAssign');
  if (modal) modal.classList.remove('active');
  dtPendingPlayerIncident = null;
}
window.confirmPlayerAssign = confirmPlayerAssign;
window.closePlayerAssignModal = closePlayerAssignModal;

// Modal de Opción A: Córner Corto / Penal
function openIncidentOptionModal(type, team) {
  triggerDtHaptic('tap');
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
    if (title) title.textContent = `Penal - ${teamName}`;
    if (subtitle) subtitle.textContent = '¿Terminó en gol este penal?';
  }

  if (modal) modal.classList.add('active');
}

function confirmIncidentOption(isGoal) {
  if (dtPendingOptionAction) {
    const action = { ...dtPendingOptionAction };
    closeIncidentOptionModal();
    if (isGoal && action.team === 'home') {
      triggerDtHaptic('goal');
      openPlayerAssignModal({ type: action.type, team: 'home', endedInGoal: true });
    } else {
      logIncident(action.type, action.team, isGoal);
    }
  } else {
    closeIncidentOptionModal();
  }
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

  enqueueDtSyncAction({
    action: 'undo_incident',
    matchState: dtMatchState,
    round: dtMatchState.round,
    rival: dtMatchState.rivalName,
    sheetName: getDtMatchSheetName(dtMatchState)
  });

  triggerDtHaptic('undo');
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

    enqueueDtSyncAction({
      action: 'delete_incident',
      eventId: eventId,
      matchState: dtMatchState,
      round: dtMatchState.round,
      rival: dtMatchState.rivalName,
      sheetName: getDtMatchSheetName(dtMatchState)
    });

    showToast(`🗑️ Evento eliminado: ${removed.label}`);
    renderDtView();
  }
}
window.deleteEventById = deleteEventById;

// Reiniciar Partido
function resetDtMatchWithConfirm() {
  const matchDesc = `${dtMatchState.round || 'Partido'} (1ra División vs ${dtMatchState.rivalName || 'Rival'})`;
  if (confirm(`¿Reiniciar este partido?\n${matchDesc}\n\nSe borrarán todas las incidencias de este partido y el marcador volverá a 0-0. Los demás partidos del fixture se mantendrán intactos.`)) {
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
    saveDtMatchesStore();

    enqueueDtSyncAction({
      action: 'reset_match',
      matchState: dtMatchState,
      round: dtMatchState.round,
      rival: dtMatchState.rivalName,
      sheetName: getDtMatchSheetName(dtMatchState)
    });

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
      <span style="font-size: 0.75rem; color: var(--text-muted);">1ra División • ${escapeHtml(dtMatchState.round || 'Partido')} • Clausura 2026</span>
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
            const h = (qStats[q] && qStats[q].home) || {};
            const a = (qStats[q] && qStats[q].away) || {};
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

    <!-- Goleadoras Asignadas de Regatas -->
    ${(() => {
      const scorersMap = {};
      (dtMatchState.events || []).forEach(evt => {
        if (evt.team === 'home' && evt.endedInGoal && evt.player) {
          scorersMap[evt.player] = (scorersMap[evt.player] || 0) + 1;
        }
      });
      const scorersList = Object.entries(scorersMap).sort((a, b) => b[1] - a[1]);
      if (scorersList.length === 0) return '';
      return `
        <div class="dt-summary-scorers-box">
          <div class="dt-summary-scorers-header">
            <span class="dt-summary-scorers-title">⚽ GOLEADORAS DE REGATAS</span>
            <span style="font-size: 0.72rem; color: #34d399; font-weight: 800;">${tot.home.goals} goles</span>
          </div>
          <div class="dt-summary-scorers-list">
            ${scorersList.map(([name, gCount]) => `
              <div class="dt-summary-scorer-row">
                <span class="dt-summary-scorer-name">👤 ${escapeHtml(name)}</span>
                <span class="dt-summary-scorer-badge">${gCount} gol${gCount === 1 ? '' : 'es'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    })()}

    <!-- Sanciones y Tarjetas de Regatas -->
    ${(() => {
      const cardsMap = {};
      (dtMatchState.events || []).forEach(evt => {
        if (evt.team === 'home' && ['cardGreen', 'cardYellow', 'cardRed'].includes(evt.type) && evt.player) {
          if (!cardsMap[evt.player]) cardsMap[evt.player] = [];
          cardsMap[evt.player].push({ type: evt.type, q: evt.quarter });
        }
      });
      const cardsList = Object.entries(cardsMap);
      if (cardsList.length === 0) return '';
      return `
        <div class="dt-summary-scorers-box">
          <div class="dt-summary-scorers-header">
            <span class="dt-summary-scorers-title" style="color: #fbbf24;">🟨 SANCIONES Y TARJETAS REGATAS</span>
          </div>
          <div class="dt-summary-scorers-list">
            ${cardsList.map(([name, cArr]) => `
              <div class="dt-summary-scorer-row">
                <span class="dt-summary-scorer-name">👤 ${escapeHtml(name)}</span>
                <div style="display: flex; gap: 4px;">
                  ${cArr.map(c => {
                    const icon = c.type === 'cardGreen' ? '🟩' : (c.type === 'cardYellow' ? '🟨' : '🟥');
                    return `<span class="dt-summary-card-badge">${icon} ${c.q}°C</span>`;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    })()}
  `;

  container.scrollTop = 0;
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
  const divName = '1ra División';

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

  // Desglose de Goleadoras y Tarjetas para WhatsApp
  const scorersMap = {};
  const cardsMap = {};
  (dtMatchState.events || []).forEach(evt => {
    if (evt.team === 'home' && evt.endedInGoal && evt.player) {
      scorersMap[evt.player] = (scorersMap[evt.player] || 0) + 1;
    }
    if (evt.team === 'home' && ['cardGreen', 'cardYellow', 'cardRed'].includes(evt.type) && evt.player) {
      if (!cardsMap[evt.player]) cardsMap[evt.player] = [];
      cardsMap[evt.player].push({ type: evt.type, q: evt.quarter });
    }
  });

  const scorersList = Object.entries(scorersMap).sort((a, b) => b[1] - a[1]);
  const cardsList = Object.entries(cardsMap);
  const getQ = (q, team, key) => (qStats[q] && qStats[q][team] && qStats[q][team][key]) || 0;

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
    `• 1°C: Goles ${getQ(1, 'home', 'goals')}-${getQ(1, 'away', 'goals')} | Área ${getQ(1, 'home', 'entries')}-${getQ(1, 'away', 'entries')} | CC ${getQ(1, 'home', 'corners')}-${getQ(1, 'away', 'corners')}`,
    `• 2°C: Goles ${getQ(2, 'home', 'goals')}-${getQ(2, 'away', 'goals')} | Área ${getQ(2, 'home', 'entries')}-${getQ(2, 'away', 'entries')} | CC ${getQ(2, 'home', 'corners')}-${getQ(2, 'away', 'corners')}`,
    `• 3°C: Goles ${getQ(3, 'home', 'goals')}-${getQ(3, 'away', 'goals')} | Área ${getQ(3, 'home', 'entries')}-${getQ(3, 'away', 'entries')} | CC ${getQ(3, 'home', 'corners')}-${getQ(3, 'away', 'corners')}`,
    `• 4°C: Goles ${getQ(4, 'home', 'goals')}-${getQ(4, 'away', 'goals')} | Área ${getQ(4, 'home', 'entries')}-${getQ(4, 'away', 'entries')} | CC ${getQ(4, 'home', 'corners')}-${getQ(4, 'away', 'corners')}`
  ];

  if (scorersList.length > 0) {
    lines.push(``);
    lines.push(`⚽ *GOLEADORAS REGATAS:*`);
    scorersList.forEach(([name, count]) => {
      lines.push(`• 👤 ${name}: ${count} gol${count === 1 ? '' : 'es'}`);
    });
  }

  if (cardsList.length > 0) {
    lines.push(``);
    lines.push(`🟨 *SANCIONES REGATAS:*`);
    cardsList.forEach(([name, cArr]) => {
      const cStr = cArr.map(c => `${c.type === 'cardGreen' ? '🟩' : (c.type === 'cardYellow' ? '🟨' : '🟥')} (${c.q}°C)`).join(', ');
      lines.push(`• 👤 ${name}: ${cStr}`);
    });
  }

  lines.push(``);
  lines.push(`_Generado desde la Web Oficial de Citaciones Regatas Andino B_`);

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
  if (!dtMatchState) loadDtMatchesStore();

  // Sincronización del Selector de Partido y Título
  populateDtMatchSelect();

  const pickerTitle = document.getElementById('dtMatchPickerTitle');
  if (pickerTitle) {
    const roundLabel = (dtMatchState.round || 'PARTIDO').toUpperCase();
    pickerTitle.textContent = `${roundLabel}:`;
  }

  const selectMatch = document.getElementById('selectDtMatch');
  if (selectMatch && selectMatch.value !== dtCurrentMatchKey) {
    selectMatch.value = dtCurrentMatchKey;
  }

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

  // Marcador y Nombres
  const awayName = document.getElementById('dtAwayTeamName');
  if (awayName) awayName.textContent = rival;

  const dtTabAwayText = document.getElementById('dtTabAwayText');
  if (dtTabAwayText) dtTabAwayText.textContent = `🔴 ${rival}`;

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
        const playerBadge = (evt.player && evt.player.trim())
          ? `<span class="dt-feed-player-badge">👤 ${escapeHtml(evt.player)}</span>`
          : '';

        return `
          <div class="dt-feed-item ${teamClass}">
            <div class="dt-feed-left">
              <span class="dt-feed-icon">${icon}</span>
              <div class="dt-feed-info">
                <span class="dt-feed-label">${escapeHtml(evt.label)}</span>
                ${playerBadge}
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

// ============================================================================

// ============================================================================
// GENERADOR DE IMAGEN RESUMEN DEPORTIVA DEL PARTIDO (CANVAS HD)
// ============================================================================
async function exportDtMatchImage() {
  if (!dtMatchState) {
    showToast('⚠️ No hay partido seleccionado.');
    return;
  }

  showToast('🎨 Generando imagen oficial del partido...');

  const canvas = document.createElement('canvas');
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  function roundRect(x, y, w, h, r, fill = true, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Fondo Degradado Deep Night Blue oficial
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#02081f');
  bgGrad.addColorStop(0.5, '#031238');
  bgGrad.addColorStop(1, '#051d54');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Acentos de luz sutil en esquinas
  const cyanRadial = ctx.createRadialGradient(W * 0.2, H * 0.15, 20, W * 0.2, H * 0.15, 500);
  cyanRadial.addColorStop(0, 'rgba(0, 162, 255, 0.14)');
  cyanRadial.addColorStop(1, 'rgba(0, 162, 255, 0)');
  ctx.fillStyle = cyanRadial;
  ctx.fillRect(0, 0, W, H);

  // Marco exterior
  ctx.strokeStyle = 'rgba(0, 162, 255, 0.35)';
  ctx.lineWidth = 4;
  roundRect(24, 24, W - 48, H - 48, 28, false, true);

  // Cabecera Institucional
  const rival = (dtMatchState.rivalName || 'RIVAL').toUpperCase();
  const round = (dtMatchState.round || 'Fecha').toUpperCase();
  const hGoals = (dtMatchState.score && typeof dtMatchState.score.home === 'number') ? dtMatchState.score.home : 0;
  const aGoals = (dtMatchState.score && typeof dtMatchState.score.away === 'number') ? dtMatchState.score.away : 0;

  // Cargar imagen de escudo
  await new Promise(resolve => {
    const crestImg = new Image();
    crestImg.crossOrigin = 'anonymous';
    crestImg.onload = () => {
      try {
        ctx.save();
        ctx.beginPath();
        ctx.arc(110, 105, 46, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#00a2ff';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(crestImg, 64, 59, 92, 92);
        ctx.restore();
      } catch (e) {}
      resolve();
    };
    crestImg.onerror = () => resolve();
    crestImg.src = 'escudo-regatas-andino.png';
  });

  // Textos Cabecera
  ctx.fillStyle = '#00a2ff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CLUB REGATAS ANDINO', 180, 85);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, -apple-system, sans-serif';
  ctx.fillText('PLANTEL SUPERIOR B', 180, 126);

  // Badge de Reporte
  ctx.fillStyle = 'rgba(0, 162, 255, 0.15)';
  ctx.strokeStyle = 'rgba(0, 162, 255, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(W - 275, 78, 205, 42, 21, true, true);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 15px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REPORTE OFICIAL DT', W - 172, 105);

  // Línea divisoria
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 165);
  ctx.lineTo(W - 60, 165);
  ctx.stroke();

  // Torneo & Fecha Pill
  ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(W / 2 - 210, 185, 420, 42, 21, true, true);
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 18px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${round} • TORNEO CLAUSURA AMH`, W / 2, 212);

  // Tarjeta Principal de Marcador (Scoreboard)
  const scoreCardY = 250;
  const scoreCardH = 210;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
  ctx.strokeStyle = 'rgba(0, 162, 255, 0.3)';
  ctx.lineWidth = 2;
  roundRect(60, scoreCardY, W - 120, scoreCardH, 24, true, true);

  // Regatas (Local)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LOCAL', 100, scoreCardY + 65);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, -apple-system, sans-serif';
  ctx.fillText('REGATAS', 100, scoreCardY + 115);

  // Círculo Tanteador Regatas
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(W / 2 - 110, scoreCardY + scoreCardH / 2, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${hGoals}`, W / 2 - 110, scoreCardY + scoreCardH / 2 + 22);

  // VS Badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  roundRect(W / 2 - 32, scoreCardY + scoreCardH / 2 - 22, 64, 44, 12, true, false);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '900 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('VS', W / 2, scoreCardY + scoreCardH / 2 + 6);

  // Círculo Tanteador Rival
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(W / 2 + 110, scoreCardY + scoreCardH / 2, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${aGoals}`, W / 2 + 110, scoreCardY + scoreCardH / 2 + 22);

  // Rival (Visitante)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('VISITANTE', W - 100, scoreCardY + 65);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, -apple-system, sans-serif';
  let rivalDisplay = rival;
  if (ctx.measureText(rivalDisplay).width > 240) {
    while (ctx.measureText(rivalDisplay + '...').width > 240 && rivalDisplay.length > 3) {
      rivalDisplay = rivalDisplay.slice(0, -1);
    }
    rivalDisplay += '...';
  }
  ctx.fillText(rivalDisplay, W - 100, scoreCardY + 115);

  // Pill de Resultado
  let statusText = 'FINAL';
  let statusBg = 'rgba(56, 189, 248, 0.2)';
  let statusColor = '#38bdf8';
  if (hGoals > aGoals) {
    statusText = 'VICTORIA DE REGATAS';
    statusBg = 'rgba(52, 211, 153, 0.25)';
    statusColor = '#34d399';
  } else if (hGoals < aGoals) {
    statusText = 'RESULTADO FINAL';
    statusBg = 'rgba(239, 68, 68, 0.2)';
    statusColor = '#f87171';
  } else {
    statusText = 'EMPATE';
    statusBg = 'rgba(251, 191, 36, 0.2)';
    statusColor = '#fbbf24';
  }
  ctx.fillStyle = statusBg;
  roundRect(W / 2 - 130, scoreCardY + scoreCardH - 42, 260, 30, 15, true, false);
  ctx.fillStyle = statusColor;
  ctx.font = '900 14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(statusText, W / 2, scoreCardY + scoreCardH - 22);

  // 4. Tabla de Rendimiento por Cuartos
  const tableY = 485;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  roundRect(60, tableY, W - 120, 310, 18, true, true);

  // Encabezado de la tabla
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(60, tableY, W - 120, 48, 18, true, false);
  ctx.fillRect(60, tableY + 28, W - 120, 20);

  ctx.font = '900 15px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('MÉTRICA TÁCTICA', 90, tableY + 30);

  const cols = [360, 480, 600, 720, 850];
  const colLabels = ['1°C', '2°C', '3°C', '4°C', 'TOTAL'];
  ctx.textAlign = 'center';
  cols.forEach((cx, idx) => {
    ctx.fillStyle = idx === 4 ? '#00a2ff' : '#ffffff';
    ctx.fillText(colLabels[idx], cx, tableY + 30);
  });

  const qStats = dtMatchState.quarters || {};
  const tot = {
    home: { entries: 0, corners: 0, cornerGoals: 0, goals: 0 },
    away: { entries: 0, corners: 0, cornerGoals: 0, goals: 0 }
  };
  [1, 2, 3, 4].forEach(q => {
    const cur = qStats[q] || createDefaultQuarterStats();
    ['home', 'away'].forEach(tm => {
      tot[tm].entries += cur[tm].entries || 0;
      tot[tm].corners += cur[tm].corners || 0;
      tot[tm].cornerGoals += cur[tm].cornerGoals || 0;
      tot[tm].goals += cur[tm].goals || 0;
    });
  });

  const rowData = [
    {
      label: '⚽ Goles (Reg - Riv)',
      qVals: [1, 2, 3, 4].map(q => `${(qStats[q] && qStats[q].home && qStats[q].home.goals) || 0} - ${(qStats[q] && qStats[q].away && qStats[q].away.goals) || 0}`),
      totVal: `${tot.home.goals} - ${tot.away.goals}`,
      highlight: true
    },
    {
      label: '🏑 Córners Cortos',
      qVals: [1, 2, 3, 4].map(q => `${(qStats[q] && qStats[q].home && qStats[q].home.corners) || 0} vs ${(qStats[q] && qStats[q].away && qStats[q].away.corners) || 0}`),
      totVal: `${tot.home.corners} vs ${tot.away.corners}`
    },
    {
      label: '📥 Ingresos al Área 25 yd',
      qVals: [1, 2, 3, 4].map(q => `${(qStats[q] && qStats[q].home && qStats[q].home.entries) || 0} vs ${(qStats[q] && qStats[q].away && qStats[q].away.entries) || 0}`),
      totVal: `${tot.home.entries} vs ${tot.away.entries}`
    },
    {
      label: '🎯 Efectividad de Cortos',
      qVals: [1, 2, 3, 4].map(q => {
        const c = (qStats[q] && qStats[q].home && qStats[q].home.corners) || 0;
        const cg = (qStats[q] && qStats[q].home && qStats[q].home.cornerGoals) || 0;
        return c > 0 ? Math.round((cg / c) * 100) + '%' : '-';
      }),
      totVal: tot.home.corners > 0 ? Math.round((tot.home.cornerGoals / tot.home.corners) * 100) + '%' : '-'
    },
    {
      label: '🥅 Goles de Corto',
      qVals: [1, 2, 3, 4].map(q => `${(qStats[q] && qStats[q].home && qStats[q].home.cornerGoals) || 0}`),
      totVal: `${tot.home.cornerGoals}`
    }
  ];

  rowData.forEach((row, rIdx) => {
    const ry = tableY + 52 + (rIdx * 51);
    if (rIdx % 2 === 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(60, ry, W - 120, 51);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = row.highlight ? '#38bdf8' : '#ffffff';
    ctx.font = row.highlight ? '900 16px system-ui, sans-serif' : '600 15px system-ui, sans-serif';
    ctx.fillText(row.label, 90, ry + 32);

    ctx.textAlign = 'center';
    cols.forEach((cx, cIdx) => {
      const val = cIdx === 4 ? row.totVal : row.qVals[cIdx];
      ctx.fillStyle = cIdx === 4 ? '#34d399' : (row.highlight ? '#ffffff' : '#94a3b8');
      ctx.font = cIdx === 4 ? '900 17px system-ui, sans-serif' : '600 15px system-ui, sans-serif';
      ctx.fillText(val, cx, ry + 32);
    });
  });

  // 5. Goleadoras y Tarjetas Box
  const extraY = 820;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  roundRect(60, extraY, W - 120, 160, 18, true, true);

  const scorersMap = {};
  (dtMatchState.events || []).forEach(evt => {
    if (evt.team === 'home' && evt.endedInGoal && evt.player) {
      scorersMap[evt.player] = (scorersMap[evt.player] || 0) + 1;
    }
  });
  const scorersList = Object.entries(scorersMap).sort((a, b) => b[1] - a[1]);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#00a2ff';
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.fillText('⚽ GOLEADORAS REGATAS', 90, extraY + 45);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 17px system-ui, sans-serif';
  if (scorersList.length > 0) {
    const textScorers = scorersList.map(([p, count]) => `${p} (${count} gol${count > 1 ? 'es' : ''})`).join('   •   ');
    ctx.fillText(textScorers, 90, extraY + 82);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('No se registraron autoras de gol en este partido', 90, extraY + 82);
  }

  const cardsMap = { green: 0, yellow: 0, red: 0 };
  (dtMatchState.events || []).forEach(evt => {
    if (evt.team === 'home') {
      if (evt.type === 'cardGreen') cardsMap.green++;
      if (evt.type === 'cardYellow') cardsMap.yellow++;
      if (evt.type === 'cardRed') cardsMap.red++;
    }
  });
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 16px system-ui, sans-serif';
  ctx.fillText('🟨 DISCIPLINA REGATAS:', 90, extraY + 125);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`🟩 ${cardsMap.green} Verdes  |  🟨 ${cardsMap.yellow} Amarillas  |  🟥 ${cardsMap.red} Rojas`, 310, extraY + 125);

  // 6. Pie de Página Institucional
  const footerY = 1010;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(60, footerY);
  ctx.lineTo(W - 60, footerY);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Club Regatas Andino • Hockey Damas B', 60, footerY + 38);

  ctx.fillStyle = '#00a2ff';
  ctx.font = 'italic 700 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('« Juntas somos más »', W / 2, footerY + 38);

  const nowStr = new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';
  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(nowStr, W - 60, footerY + 38);

  // 7. Descargar o Compartir imagen
  canvas.toBlob(async (blob) => {
    if (!blob) {
      showToast('⚠️ Error al generar la imagen');
      return;
    }
    const cleanRound = (dtMatchState.round || 'partido').replace(/\s+/g, '-').toLowerCase();
    const cleanRival = rival.replace(/\s+/g, '-').toLowerCase();
    const fileName = `regatas-${cleanRound}-vs-${cleanRival}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Regatas Andino vs ${rival}`,
          text: `Reporte oficial: Regatas Andino ${hGoals} - ${aGoals} ${rival}`
        });
        showToast('📲 ¡Imagen compartida con éxito!');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('📸 ¡Imagen oficial descargada!');
  }, 'image/png');
}

window.exportDtMatchImage = exportDtMatchImage;
