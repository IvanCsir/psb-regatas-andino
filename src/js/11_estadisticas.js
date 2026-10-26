// VISTA 5: APARTADO DE ESTADÍSTICAS & ANÁLISIS DE RENDIMIENTO POR CUARTOS
// ============================================================================

let statsCurrentSelectedFilter = 'all';
let statsActiveSubTab = 'trends'; // 'trends' | 'quarters'
let statsTabsInitialized = false;

// Recalcular estadísticas de cuartos para cualquier objeto de partido
function recalculateMatchStats(targetMatch) {
  if (!targetMatch) return;
  const newQuarters = {
    1: createDefaultQuarterStats(),
    2: createDefaultQuarterStats(),
    3: createDefaultQuarterStats(),
    4: createDefaultQuarterStats()
  };

  let homeTotalGoals = 0;
  let awayTotalGoals = 0;

  (targetMatch.events || []).forEach(evt => {
    const q = parseInt(evt.quarter, 10) || 1;
    if (!newQuarters[q]) newQuarters[q] = createDefaultQuarterStats();
    const team = (evt.team === 'away') ? 'away' : 'home';
    const teamStats = newQuarters[q][team];
    if (!teamStats) return;

    const type = deduceEventType(evt);
    evt.type = type;

    if (type === 'entry') {
      teamStats.entries++;
    } else if (type === 'corner') {
      teamStats.corners++;
      if (evt.endedInGoal) {
        teamStats.cornerGoals++;
        teamStats.goals++;
        if (team === 'home') homeTotalGoals++; else awayTotalGoals++;
      }
    } else if (type === 'stroke') {
      teamStats.strokes++;
      if (evt.endedInGoal) {
        teamStats.strokeGoals++;
        teamStats.goals++;
        if (team === 'home') homeTotalGoals++; else awayTotalGoals++;
      }
    } else if (type === 'fieldGoal') {
      teamStats.fieldGoals++;
      teamStats.goals++;
      if (team === 'home') homeTotalGoals++; else awayTotalGoals++;
    } else if (type === 'cardGreen') {
      teamStats.green++;
    } else if (type === 'cardYellow') {
      teamStats.yellow++;
    } else if (type === 'cardRed') {
      teamStats.red++;
    }
  });

  targetMatch.quarters = newQuarters;
  targetMatch.score = { home: homeTotalGoals, away: awayTotalGoals };
}

// Al abrir la vista de estadísticas

// Actualizar y persistir indicador de última sincronización
function updateStatsLastSyncBadge(customTime) {
  let timeStr = customTime;
  if (!timeStr) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    timeStr = `${hh}:${mm} hs`;
  }
  try {
    localStorage.setItem('psb_stats_last_sync_time', timeStr);
  } catch (e) {}

  const el = document.getElementById('statsLastSyncTime');
  if (el) {
    el.textContent = `Última sinc: ${timeStr}`;
  }
}

function handleStatsViewOpen() {
  const gateCard = document.getElementById('statsAuthGateCard');
  const mainContent = document.getElementById('statsMainContent');
  const passInput = document.getElementById('inputStatsGatePassword');
  const errorMsg = document.getElementById('statsGateErrorMsg');
  const statsLockBtn = document.getElementById('btnStatsLockSession');

  if (isCtAuthenticated()) {
    if (gateCard) gateCard.style.display = 'none';
    if (mainContent) mainContent.style.display = 'flex';
    if (statsLockBtn) statsLockBtn.style.display = 'inline-flex';
    setupStatsTabs();
    loadDtMatchesStore();
    populateStatsMatchFilter();
    renderAnalyticsDashboard(statsCurrentSelectedFilter);

    // Sincronización automática silenciosa en segundo plano con Google Sheets
    if (getDtWebhookUrl()) {
      syncAllMatchesFromCloud({ silent: true });
    }
  } else {
    if (mainContent) mainContent.style.display = 'none';
    if (gateCard) gateCard.style.display = 'block';
    if (statsLockBtn) statsLockBtn.style.display = 'none';
    if (errorMsg) errorMsg.style.display = 'none';
    if (passInput) {
      passInput.value = '';
      setTimeout(() => passInput.focus(), 150);
    }
  }
}

async function verifyStatsPassword() {
  const passInput = document.getElementById('inputStatsGatePassword');
  const errorMsg = document.getElementById('statsGateErrorMsg');
  const entered = (passInput ? passInput.value : '').trim().toLowerCase();

  const ok = await verifyCtPassword(entered);
  if (ok) {
    setCtAuthenticated(true);
    handleStatsViewOpen();
    showToast('📈 Acceso concedido a Estadísticas');
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
    if (passInput) passInput.select();
  }
}

// Inicialización de pestañas: Tendencias de Temporada vs Desglose por Cuartos
function setupStatsTabs() {
  if (statsTabsInitialized) return;
  const tabTrends = document.getElementById('tabBtnSeasonTrends');
  const tabQuarters = document.getElementById('tabBtnQuarterBreakdown');

  if (tabTrends) {
    tabTrends.addEventListener('click', () => {
      switchStatsSubTab('trends');
    });
  }

  if (tabQuarters) {
    tabQuarters.addEventListener('click', () => {
      switchStatsSubTab('quarters');
    });
  }

  statsTabsInitialized = true;
}

function switchStatsSubTab(tabName) {
  statsActiveSubTab = tabName;
  const tabTrends = document.getElementById('tabBtnSeasonTrends');
  const tabQuarters = document.getElementById('tabBtnQuarterBreakdown');
  const trendsContent = document.getElementById('statsTabTrendsContent');
  const quartersContent = document.getElementById('statsTabQuartersContent');
  const headerTitle = document.getElementById('statsHeaderTitle');
  const headerDesc = document.getElementById('statsHeaderDesc');

  if (tabTrends && tabQuarters) {
    if (tabName === 'trends') {
      tabTrends.classList.add('active');
      tabTrends.setAttribute('aria-selected', 'true');
      tabQuarters.classList.remove('active');
      tabQuarters.setAttribute('aria-selected', 'false');
      if (trendsContent) trendsContent.style.display = 'flex';
      if (quartersContent) quartersContent.style.display = 'none';
      if (headerTitle) headerTitle.textContent = 'TENDENCIAS DE LA TEMPORADA';
      if (headerDesc) headerDesc.textContent = 'Diagnóstico táctico 1T vs 2T, efectividad en cortos, evolución fecha a fecha y goleadoras de Regatas Andino B.';
    } else {
      tabQuarters.classList.add('active');
      tabQuarters.setAttribute('aria-selected', 'true');
      tabTrends.classList.remove('active');
      tabTrends.setAttribute('aria-selected', 'false');
      if (trendsContent) trendsContent.style.display = 'none';
      if (quartersContent) quartersContent.style.display = 'flex';
      if (headerTitle) headerTitle.textContent = 'DETALLE POR CUARTOS';
      if (headerDesc) headerDesc.textContent = 'Métricas consolidadas por cuarto (1°C, 2°C, 3°C, 4°C y Total) de las incidencias registradas en la botonera.';
    }
  }
}

function inspectMatchQuarters(matchKey) {
  const select = document.getElementById('selectStatsMatchFilter');
  if (select && matchKey) {
    select.value = matchKey;
  }
  switchStatsSubTab('quarters');
  renderAnalyticsDashboard(matchKey);
  const container = document.getElementById('viewEstadisticas');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

window.inspectMatchQuarters = inspectMatchQuarters;
window.switchStatsSubTab = switchStatsSubTab;

// Llenado del selector de partidos a analizar
function populateStatsMatchFilter() {
  const select = document.getElementById('selectStatsMatchFilter');
  if (!select) return;

  const currentVal = select.value || statsCurrentSelectedFilter || 'all';
  let html = `<option value="all">🌟 Todos los Partidos (Acumulado General)</option>`;

  // Partidos guardados en dtMatchesStore con incidencias reales
  const matchKeys = Object.keys(dtMatchesStore || {});
  const matchesWithData = matchKeys.filter(k => {
    const m = dtMatchesStore[k];
    return m && ((m.events && m.events.length > 0) || (m.score && (m.score.home > 0 || m.score.away > 0)));
  });

  if (matchesWithData.length > 0) {
    html += `<optgroup label="📋 Partidos con Incidencias">`;
    matchesWithData.forEach(k => {
      const m = dtMatchesStore[k];
      const count = (m.events || []).length;
      const score = m.score ? `${m.score.home}-${m.score.away}` : '0-0';
      const round = m.round || k;
      const rival = m.rivalName || 'Rival';
      html += `<option value="${k}">${escapeHtml(round)} vs ${escapeHtml(rival)} (${score} • ${count} evts)</option>`;
    });
    html += `</optgroup>`;
  }

  select.innerHTML = html;
  if ([...select.options].some(opt => opt.value === currentVal)) {
    select.value = currentVal;
  } else {
    select.value = 'all';
  }
}

// Cálculo agregado de métricas cuarto por cuarto
function getAggregatedQuarterStats(selectedKey = 'all') {
  statsCurrentSelectedFilter = selectedKey;

  // Sincronizar partido activo actual en memoria con el almacén multi-partido
  if (typeof dtMatchState !== 'undefined' && dtMatchState && typeof dtCurrentMatchKey !== 'undefined' && dtCurrentMatchKey) {
    if (typeof dtMatchesStore === 'undefined' || !dtMatchesStore) dtMatchesStore = {};
    dtMatchesStore[dtCurrentMatchKey] = dtMatchState;
  }

  // Colección de partidos a incluir (solo con datos reales cuando es acumulado)
  let targetMatches = [];
  if (selectedKey === 'all') {
    targetMatches = Object.values(dtMatchesStore || {}).filter(m => m && ((m.events && m.events.length > 0) || (m.score && (m.score.home > 0 || m.score.away > 0))));
    if (targetMatches.length === 0 && dtMatchState && ((dtMatchState.events && dtMatchState.events.length > 0) || (dtMatchState.score && (dtMatchState.score.home > 0 || dtMatchState.score.away > 0)))) {
      targetMatches = [dtMatchState];
    }
  } else if (dtMatchesStore[selectedKey]) {
    targetMatches = [dtMatchesStore[selectedKey]];
  } else if (dtMatchState) {
    targetMatches = [dtMatchState];
  }

  // Estructura de cuartos 1 a 4 + total
  const initTeamData = () => ({
    entries: 0,
    corners: 0,
    cornerGoals: 0,
    cornerEff: 0,
    strokes: 0,
    strokeGoals: 0,
    strokeEff: 0,
    fieldGoals: 0,
    goals: 0,
    conversion: 0,
    green: 0,
    yellow: 0,
    red: 0
  });

  const quarters = {
    1: { home: initTeamData(), away: initTeamData() },
    2: { home: initTeamData(), away: initTeamData() },
    3: { home: initTeamData(), away: initTeamData() },
    4: { home: initTeamData(), away: initTeamData() },
    total: { home: initTeamData(), away: initTeamData() }
  };

  let totalEventsCount = 0;
  let matchesWithDataCount = 0;

  targetMatches.forEach(m => {
    recalculateMatchStats(m);
    const evts = m.events || [];
    totalEventsCount += evts.length;
    if (evts.length > 0) matchesWithDataCount++;

    for (let q = 1; q <= 4; q++) {
      const qData = m.quarters && m.quarters[q] ? m.quarters[q] : createDefaultQuarterStats();

      ['home', 'away'].forEach(team => {
        const src = qData[team] || {};
        const dest = quarters[q][team];
        const tot = quarters.total[team];

        const entries = src.entries || 0;
        const corners = src.corners || 0;
        const cornerGoals = src.cornerGoals || 0;
        const strokes = src.strokes || 0;
        const strokeGoals = src.strokeGoals || 0;
        const fieldGoals = src.fieldGoals || 0;
        const goals = src.goals || (cornerGoals + strokeGoals + fieldGoals);
        const green = src.green || 0;
        const yellow = src.yellow || 0;
        const red = src.red || 0;

        dest.entries += entries;
        dest.corners += corners;
        dest.cornerGoals += cornerGoals;
        dest.strokes += strokes;
        dest.strokeGoals += strokeGoals;
        dest.fieldGoals += fieldGoals;
        dest.goals += goals;
        dest.green += green;
        dest.yellow += yellow;
        dest.red += red;

        tot.entries += entries;
        tot.corners += corners;
        tot.cornerGoals += cornerGoals;
        tot.strokes += strokes;
        tot.strokeGoals += strokeGoals;
        tot.fieldGoals += fieldGoals;
        tot.goals += goals;
        tot.green += green;
        tot.yellow += yellow;
        tot.red += red;
      });
    }
  });

  // Calcular porcentajes y efectividades
  [1, 2, 3, 4, 'total'].forEach(qKey => {
    ['home', 'away'].forEach(team => {
      const data = quarters[qKey][team];
      data.cornerEff = data.corners > 0 ? Math.round((data.cornerGoals / data.corners) * 100) : 0;
      data.strokeEff = data.strokes > 0 ? Math.round((data.strokeGoals / data.strokes) * 100) : 0;
      data.conversion = data.entries > 0 ? Math.round((data.goals / data.entries) * 100) : 0;
    });
  });

  // Calcular Índice de Rendimiento Integral (Ponderación xG hockey: Goles x10, Cortos x3, Ingresos x1)
  [1, 2, 3, 4, 'total'].forEach(qKey => {
    const qH = quarters[qKey].home;
    const qA = quarters[qKey].away;
    const offScore = (qH.goals * 10) + (qH.corners * 3) + (qH.entries * 1);
    const defScore = (qA.goals * 10) + (qA.corners * 3) + (qA.entries * 1);
    quarters[qKey].offScore = offScore;
    quarters[qKey].defScore = defScore;
    quarters[qKey].performanceIndex = offScore - defScore;
  });

  // Insights tácticos
  let bestQByGoals = { q: 1, val: -1 };
  let bestQByEntries = { q: 1, val: -1 };
  let bestQByDiff = { q: 1, val: -999 };
  let hardestQDef = { q: 1, val: -1 };
  let bestQByPerformance = { q: 1, val: -999, offScore: 0, defScore: 0, hGoals: 0, aGoals: 0, hEntries: 0, aEntries: 0, hCorners: 0, aCorners: 0 };
  let worstQByPerformance = { q: 1, val: 999, offScore: 0, defScore: 0, hGoals: 0, aGoals: 0, hEntries: 0, aEntries: 0, hCorners: 0, aCorners: 0 };

  for (let q = 1; q <= 4; q++) {
    const hGoals = quarters[q].home.goals;
    const aGoals = quarters[q].away.goals;
    const hEntries = quarters[q].home.entries;
    const aEntries = quarters[q].away.entries;
    const hCorners = quarters[q].home.corners;
    const aCorners = quarters[q].away.corners;
    const diff = hGoals - aGoals;
    const perf = quarters[q].performanceIndex;

    if (hGoals > bestQByGoals.val) {
      bestQByGoals = { q, val: hGoals, entries: hEntries };
    }
    if (hEntries > bestQByEntries.val) {
      bestQByEntries = { q, val: hEntries, goals: hGoals };
    }
    if (diff > bestQByDiff.val) {
      bestQByDiff = { q, val: diff };
    }
    if (aEntries > hardestQDef.val) {
      hardestQDef = { q, val: aEntries, goals: aGoals };
    }
    if (perf > bestQByPerformance.val) {
      bestQByPerformance = {
        q,
        val: perf,
        offScore: quarters[q].offScore,
        defScore: quarters[q].defScore,
        hGoals,
        aGoals,
        hEntries,
        aEntries,
        hCorners,
        aCorners
      };
    }
    if (perf < worstQByPerformance.val) {
      worstQByPerformance = {
        q,
        val: perf,
        offScore: quarters[q].offScore,
        defScore: quarters[q].defScore,
        hGoals,
        aGoals,
        hEntries,
        aEntries,
        hCorners,
        aCorners
      };
    }
  }

  if (bestQByPerformance.val === -999) bestQByPerformance.val = 0;
  if (worstQByPerformance.val === 999) worstQByPerformance.val = 0;

  return {
    selectedKey,
    matchesCount: targetMatches.length,
    matchesWithDataCount,
    totalEventsCount,
    quarters,
    bestQByGoals,
    bestQByEntries,
    bestQByDiff,
    bestQByPerformance,
    worstQByPerformance,
    hardestQDef
  };
}

// Cálculo agregado de métricas de Tendencias de Temporada (1T vs 2T, campaña, goleadoras, timeline)
function getSeasonTrendsData(selectedKey = 'all') {
  // Sincronizar partido activo actual en memoria con el almacén multi-partido
  if (typeof dtMatchState !== 'undefined' && dtMatchState && typeof dtCurrentMatchKey !== 'undefined' && dtCurrentMatchKey) {
    if (typeof dtMatchesStore === 'undefined' || !dtMatchesStore) dtMatchesStore = {};
    dtMatchesStore[dtCurrentMatchKey] = dtMatchState;
  }

  let matchesList = [];
  const matchKeys = Object.keys(dtMatchesStore || {});

  if (selectedKey === 'all') {
    if (matchKeys.length > 0) {
      matchKeys.forEach(k => {
        const m = dtMatchesStore[k];
        if (m && ((m.events && m.events.length > 0) || (m.score && (m.score.home > 0 || m.score.away > 0)))) {
          recalculateMatchStats(m);
          matchesList.push(m);
        }
      });
    } else if (dtMatchState && ((dtMatchState.events && dtMatchState.events.length > 0) || (dtMatchState.score && (dtMatchState.score.home > 0 || dtMatchState.score.away > 0)))) {
      recalculateMatchStats(dtMatchState);
      matchesList.push(dtMatchState);
    }
  } else if (dtMatchesStore[selectedKey]) {
    recalculateMatchStats(dtMatchesStore[selectedKey]);
    matchesList = [dtMatchesStore[selectedKey]];
  } else if (dtMatchState) {
    recalculateMatchStats(dtMatchState);
    matchesList = [dtMatchState];
  }

  // Ordenar cronológicamente por número de fecha
  matchesList.sort((a, b) => {
    const numA = parseInt((a.round || '').replace(/\D+/g, ''), 10) || 0;
    const numB = parseInt((b.round || '').replace(/\D+/g, ''), 10) || 0;
    return numA - numB;
  });

  let wins = 0, draws = 0, losses = 0;
  let totalGF = 0, totalGC = 0;
  let totalEntriesHome = 0, totalEntriesAway = 0;
  let totalCornersHome = 0, cornerGoalsHome = 0;
  let totalCornersAway = 0, cornerGoalsAway = 0;
  let totalStrokesHome = 0, strokeGoalsHome = 0;
  let totalStrokesAway = 0, strokeGoalsAway = 0;

  // 1T vs 2T
  const halves = {
    first: {
      entriesHome: 0, entriesAway: 0,
      goalsHome: 0, goalsAway: 0,
      cornersHome: 0, cornerGoalsHome: 0,
      cornersAway: 0, cornerGoalsAway: 0,
      cardsHome: { green: 0, yellow: 0, red: 0 }
    },
    second: {
      entriesHome: 0, entriesAway: 0,
      goalsHome: 0, goalsAway: 0,
      cornersHome: 0, cornerGoalsHome: 0,
      cornersAway: 0, cornerGoalsAway: 0,
      cardsHome: { green: 0, yellow: 0, red: 0 }
    }
  };

  const scorersMap = {};
  const cardsMap = {};
  const cornersWonMap = {};
  const matchChronology = [];

  matchesList.forEach(m => {
    const hGoals = (m.score && typeof m.score.home === 'number') ? m.score.home : 0;
    const aGoals = (m.score && typeof m.score.away === 'number') ? m.score.away : 0;
    totalGF += hGoals;
    totalGC += aGoals;

    let res = 'draw';
    if (hGoals > aGoals) { wins++; res = 'win'; }
    else if (hGoals < aGoals) { losses++; res = 'loss'; }
    else { draws++; res = 'draw'; }

    let matchEntriesH = 0, matchEntriesA = 0;
    let matchCornersH = 0, matchCornerGoalsH = 0;

    for (let q = 1; q <= 4; q++) {
      const qData = (m.quarters && m.quarters[q]) ? m.quarters[q] : createDefaultQuarterStats();
      const h = qData.home || {};
      const a = qData.away || {};

      totalEntriesHome += (h.entries || 0);
      totalEntriesAway += (a.entries || 0);
      matchEntriesH += (h.entries || 0);
      matchEntriesA += (a.entries || 0);

      totalCornersHome += (h.corners || 0);
      cornerGoalsHome += (h.cornerGoals || 0);
      matchCornersH += (h.corners || 0);
      matchCornerGoalsH += (h.cornerGoals || 0);

      totalCornersAway += (a.corners || 0);
      cornerGoalsAway += (a.cornerGoals || 0);

      totalStrokesHome += (h.strokes || 0);
      strokeGoalsHome += (h.strokeGoals || 0);
      totalStrokesAway += (a.strokes || 0);
      strokeGoalsAway += (a.strokeGoals || 0);

      const halfKey = (q <= 2) ? 'first' : 'second';
      const half = halves[halfKey];

      half.entriesHome += (h.entries || 0);
      half.entriesAway += (a.entries || 0);
      half.goalsHome += (h.goals || 0);
      half.goalsAway += (a.goals || 0);
      half.cornersHome += (h.corners || 0);
      half.cornerGoalsHome += (h.cornerGoals || 0);
      half.cornersAway += (a.corners || 0);
      half.cornerGoalsAway += (a.cornerGoals || 0);
      half.cardsHome.green += (h.green || 0);
      half.cardsHome.yellow += (h.yellow || 0);
      half.cardsHome.red += (h.red || 0);
    }

    // Eventos individuales
    (m.events || []).forEach(evt => {
      const team = evt.team === 'away' ? 'away' : 'home';
      const type = evt.type || deduceEventType(evt);
      const isGoal = evt.endedInGoal === true || type === 'fieldGoal';
      const playerName = (evt.player || '').trim();

      if (team === 'home') {
        if (isGoal) {
          const key = playerName || 'Sin especificar';
          if (!scorersMap[key]) {
            scorersMap[key] = { name: key, total: 0, field: 0, corner: 0, stroke: 0 };
          }
          scorersMap[key].total++;
          if (type === 'corner') scorersMap[key].corner++;
          else if (type === 'stroke') scorersMap[key].stroke++;
          else scorersMap[key].field++;
        }

        if (type === 'corner') {
          // Extraer la jugadora que provocó o ejecutó el córner
          let wonByPlayer = (evt.wonBy || '').trim();
          if (!wonByPlayer && evt.label) {
            const mWon = evt.label.match(/Provocó:\s*([^)\].]+)/i);
            if (mWon) wonByPlayer = mWon[1].trim();
          }
          if (!wonByPlayer && playerName) {
            wonByPlayer = playerName;
          }

          if (wonByPlayer) {
            if (!cornersWonMap[wonByPlayer]) {
              cornersWonMap[wonByPlayer] = { name: wonByPlayer, total: 0, resultedInGoal: 0 };
            }
            cornersWonMap[wonByPlayer].total++;
            if (isGoal) {
              cornersWonMap[wonByPlayer].resultedInGoal++;
            }
          }
        }

        if (type === 'cardGreen' || type === 'cardYellow' || type === 'cardRed') {
          const key = playerName || 'Jugadora no especificada';
          if (!cardsMap[key]) {
            cardsMap[key] = { name: key, green: 0, yellow: 0, red: 0, penaltyMinutes: 0 };
          }
          if (type === 'cardGreen') {
            cardsMap[key].green++;
            cardsMap[key].penaltyMinutes += 2;
          } else if (type === 'cardYellow') {
            cardsMap[key].yellow++;
            cardsMap[key].penaltyMinutes += 5;
          } else if (type === 'cardRed') {
            cardsMap[key].red++;
            cardsMap[key].penaltyMinutes += 60;
          }
        }
      }
    });

    const mKey = m.key || (m.round ? getMatchKey('primera', m.round) : '');
    matchChronology.push({
      key: mKey,
      round: m.round || 'Fecha',
      rival: m.rivalName || 'Rival',
      date: m.date || '',
      homeScore: hGoals,
      awayScore: aGoals,
      result: res,
      entriesHome: matchEntriesH,
      entriesAway: matchEntriesA,
      cornersHome: matchCornersH,
      cornerGoalsHome: matchCornerGoalsH,
      eventCount: (m.events || []).length
    });
  });

  const playedCount = matchesList.length;
  const points = wins * 3 + draws * 1;
  const maxPossiblePoints = playedCount > 0 ? playedCount * 3 : 0;
  const pointsEff = maxPossiblePoints > 0 ? Math.round((points / maxPossiblePoints) * 100) : 0;

  const cornerEffHome = totalCornersHome > 0 ? Math.round((cornerGoalsHome / totalCornersHome) * 100) : 0;
  const cornerDefHome = totalCornersAway > 0 ? Math.round(((totalCornersAway - cornerGoalsAway) / totalCornersAway) * 100) : 100;
  const conversionHome = totalEntriesHome > 0 ? Math.round((totalGF / totalEntriesHome) * 100) : 0;

  const scorersList = Object.values(scorersMap).sort((a, b) => b.total - a.total);
  const cardsList = Object.values(cardsMap).sort((a, b) => b.penaltyMinutes - a.penaltyMinutes);
  const cornersWonList = Object.values(cornersWonMap).sort((a, b) => b.total - a.total);

  return {
    selectedKey,
    playedCount,
    wins,
    draws,
    losses,
    points,
    pointsEff,
    totalGF,
    totalGC,
    goalDiff: totalGF - totalGC,
    avgGF: playedCount > 0 ? (totalGF / playedCount).toFixed(1) : '0',
    avgGC: playedCount > 0 ? (totalGC / playedCount).toFixed(1) : '0',
    totalEntriesHome,
    totalEntriesAway,
    avgEntriesHome: playedCount > 0 ? (totalEntriesHome / playedCount).toFixed(1) : '0',
    avgEntriesAway: playedCount > 0 ? (totalEntriesAway / playedCount).toFixed(1) : '0',
    totalCornersHome,
    cornerGoalsHome,
    cornerEffHome,
    totalCornersAway,
    cornerGoalsAway,
    cornerDefHome,
    conversionHome,
    halves,
    scorersList,
    cardsList,
    cornersWonList,
    matchChronology
  };
}

// Diagnósticos tácticos automáticos del DT basados en datos
function generateSeasonTacticalDiagnosis(trends) {
  const h1 = trends.halves.first;
  const h2 = trends.halves.second;
  const insights = [];

  const totalGoals = trends.totalGF;
  if (totalGoals > 0) {
    const h1GoalsPct = Math.round((h1.goalsHome / totalGoals) * 100);
    const h2GoalsPct = Math.round((h2.goalsHome / totalGoals) * 100);

    if (h2GoalsPct >= 60) {
      insights.push({
        type: 'positive',
        icon: '🔥',
        title: 'Potencia en Segundos Tiempos',
        desc: `El ${h2GoalsPct}% de los goles de Regatas se convierten en el 2° Tiempo (3°C y 4°C). Gran lectura y definición tras el entretiempo.`
      });
    } else if (h1GoalsPct >= 60) {
      insights.push({
        type: 'positive',
        icon: '⚡',
        title: 'Golpes de Entrada Tempranos',
        desc: `El ${h1GoalsPct}% de los goles se marcaron en el 1° Tiempo. Regatas sale con intensidad alta y golpea rápido en los partidos.`
      });
    } else {
      insights.push({
        type: 'neutral',
        icon: '⚖️',
        title: 'Producción Ofensiva Constante',
        desc: `Distribución balanceada de goles entre la 1ra mitad (${h1.goalsHome}) y la 2da mitad (${h2.goalsHome}). Ritmo parejo a lo largo de los 60 minutos.`
      });
    }
  }

  const totalConceded = trends.totalGC;
  if (totalConceded > 0) {
    const h2ConcededPct = Math.round((h2.goalsAway / totalConceded) * 100);
    if (h2ConcededPct >= 65) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Atención al Cierre de los Partidos',
        desc: `El ${h2ConcededPct}% de los goles rivales se reciben en el 2° Tiempo. Conviene ajustar rotaciones o mantener el bloque defensivo ante el desgaste físico final.`
      });
    } else if (h2ConcededPct <= 35) {
      insights.push({
        type: 'positive',
        icon: '🛡️',
        title: 'Cierres Defensivos Sólidos',
        desc: `Apenas el ${h2ConcededPct}% de los goles en contra ocurren en la segunda mitad. Gran resistencia y cierre de líneas en los tramos decisivos.`
      });
    }
  }

  if (trends.totalCornersHome >= 2) {
    if (trends.cornerEffHome >= 20) {
      insights.push({
        type: 'positive',
        icon: '🎯',
        title: 'Arma Ofensiva: Córner Corto',
        desc: `Alta efectividad del ${trends.cornerEffHome}% en jugadas preparadas de corto (${trends.cornerGoalsHome} goles en ${trends.totalCornersHome} CC). Clave para abrir partidos cerrados.`
      });
    } else {
      insights.push({
        type: 'warning',
        icon: '💡',
        title: 'Oportunidad de Mejora en Cortos',
        desc: `Efectividad del ${trends.cornerEffHome}% en córner corto a favor (${trends.cornerGoalsHome} gol en ${trends.totalCornersHome} CC). Se generan ocasiones pero falta capitalizar la arrastrada o desvío.`
      });
    }
  }

  if (trends.cornersWonList && trends.cornersWonList.length > 0) {
    const topGeneradora = trends.cornersWonList[0];
    if (topGeneradora.total >= 2) {
      insights.push({
        type: 'positive',
        icon: '🏑',
        title: `Desequilibrio Individual: ${topGeneradora.name}`,
        desc: `Es la jugadora que más córners cortos generó en el equipo (${topGeneradora.total} CC provocados${topGeneradora.resultedInGoal > 0 ? `, ${topGeneradora.resultedInGoal} terminaron en gol` : ''}). Gran capacidad individual para forzar faltas en el área rival.`
      });
    }
  }

  if (trends.totalCornersAway >= 2) {
    if (trends.cornerDefHome >= 80) {
      insights.push({
        type: 'positive',
        icon: '🧤',
        title: 'Gran Muralla en Cortos Defensivos',
        desc: `Se neutralizó el ${trends.cornerDefHome}% de los córners cortos rivales concedidos (${trends.totalCornersAway - trends.cornerGoalsAway} defendidos de ${trends.totalCornersAway}).`
      });
    }
  }

  if (trends.totalEntriesHome > 0 && trends.totalEntriesAway > 0) {
    const diff = trends.totalEntriesHome - trends.totalEntriesAway;
    if (diff > 0) {
      insights.push({
        type: 'positive',
        icon: '📈',
        title: 'Dominio Territorial Acumulado',
        desc: `Promedio de ${trends.avgEntriesHome} ingresos al área rival por partido (+${diff} sobre rivales). Regatas impone condiciones en campo contrario.`
      });
    }
  }

  return insights;
}

// Renderizado principal del Dashboard de Estadísticas
function renderAnalyticsDashboard(selectedKey = 'all') {
  setupStatsTabs();

  // 1. Renderizar Pestaña de Tendencias de Temporada
  const seasonTrends = getSeasonTrendsData(selectedKey);
  renderSeasonTrends(seasonTrends);

  // 2. Renderizar Pestaña de Desglose por Cuartos
  const stats = getAggregatedQuarterStats(selectedKey);
  const q = stats.quarters;
  const totH = q.total.home;
  const totA = q.total.away;

  // 1. Tarjetas de KPIs Clave
  const kpiGrid = document.getElementById('statsKpiGrid');
  if (kpiGrid) {
    const goalDiff = totH.goals - totA.goals;
    const goalDiffSign = goalDiff > 0 ? `+${goalDiff}` : `${goalDiff}`;
    const entryDiff = totH.entries - totA.entries;
    const entryDiffSign = entryDiff > 0 ? `+${entryDiff}` : `${entryDiff}`;

    kpiGrid.innerHTML = `
      <div class="stats-kpi-card">
        <div class="stats-kpi-header">
          <span class="stats-kpi-icon">⚽</span>
          <span class="stats-kpi-title">GOLES & DIFERENCIAL</span>
        </div>
        <div class="stats-kpi-val">${totH.goals} - ${totA.goals} <small style="font-size:0.75rem; color:${goalDiff >= 0 ? '#34d399':'#f87171'};">(${goalDiffSign})</small></div>
        <div class="stats-kpi-sub">Conversión: ${totH.conversion}% de goles por ingreso</div>
      </div>

      <div class="stats-kpi-card">
        <div class="stats-kpi-header">
          <span class="stats-kpi-icon">📥</span>
          <span class="stats-kpi-title">INGRESOS AL ÁREA</span>
        </div>
        <div class="stats-kpi-val">${totH.entries} vs ${totA.entries}</div>
        <div class="stats-kpi-sub">Balance territorial: ${entryDiffSign} a favor</div>
      </div>

      <div class="stats-kpi-card">
        <div class="stats-kpi-header">
          <span class="stats-kpi-icon">🏑</span>
          <span class="stats-kpi-title">CÓRNERS CORTOS</span>
        </div>
        <div class="stats-kpi-val">${totH.cornerGoals}/${totH.corners} <small style="font-size:0.75rem; color:#38bdf8;">(${totH.cornerEff}%)</small></div>
        <div class="stats-kpi-sub">Rival concedió: ${totA.cornerGoals}/${totA.corners} (${totA.cornerEff}%)</div>
      </div>

      <div class="stats-kpi-card">
        <div class="stats-kpi-header">
          <span class="stats-kpi-icon">⚡</span>
          <span class="stats-kpi-title">MEJOR CUARTO (ÍNDICE)</span>
        </div>
        <div class="stats-kpi-val">${stats.totalEventsCount > 0 ? `${stats.bestQByPerformance.q}° Cuarto` : '-'} <small style="font-size:0.75rem; color:${stats.bestQByPerformance.val >= 0 ? '#34d399':'#f87171'};">${stats.totalEventsCount > 0 ? `(${stats.bestQByPerformance.val > 0 ? '+':''}${stats.bestQByPerformance.val} pts)` : ''}</small></div>
        <div class="stats-kpi-sub">${stats.totalEventsCount > 0 ? `${stats.bestQByPerformance.hGoals}-${stats.bestQByPerformance.aGoals} goles • ${stats.bestQByPerformance.hEntries} vs ${stats.bestQByPerformance.aEntries} ing. • ${stats.bestQByPerformance.hCorners} CC` : 'Sin datos suficientes'}</div>
      </div>
    `;
  }

  // 2. Gráfico de Barras Comparativas por Cuarto
  const barsContainer = document.getElementById('statsBarsContainer');
  if (barsContainer) {
    let barsHtml = '';
    for (let c = 1; c <= 4; c++) {
      const qH = q[c].home;
      const qA = q[c].away;
      const totalEntries = qH.entries + qA.entries;
      let homePct = totalEntries > 0 ? Math.round((qH.entries / totalEntries) * 100) : 50;
      let awayPct = 100 - homePct;

      const qGoalDiff = qH.goals - qA.goals;
      const qPerf = q[c].performanceIndex || 0;
      const perfColor = qPerf > 0 ? '#34d399' : (qPerf === 0 ? '#94a3b8' : '#f87171');
      const perfSign = qPerf > 0 ? `+${qPerf}` : `${qPerf}`;
      let badgeHtml = '';
      if (qGoalDiff > 0) {
        badgeHtml = `<span class="stats-quarter-badge stats-badge-win">Ganado +${qGoalDiff} (${qH.goals}-${qA.goals})</span>`;
      } else if (qGoalDiff === 0) {
        badgeHtml = `<span class="stats-quarter-badge stats-badge-draw">Empatado (${qH.goals}-${qA.goals})</span>`;
      } else {
        badgeHtml = `<span class="stats-quarter-badge stats-badge-loss">Abajo ${qGoalDiff} (${qH.goals}-${qA.goals})</span>`;
      }
      badgeHtml += ` <span class="stats-quarter-badge" style="background: rgba(255,255,255,0.06); color: ${perfColor}; border: 1px solid ${perfColor}40;" title="Índice de Eficiencia (Goles x10 + Cortos x3 + Ingresos x1 a favor vs rival)">⚡ ${perfSign} pts</span>`;

      barsHtml += `
        <div class="stats-quarter-bar-row">
          <div class="stats-quarter-bar-head">
            <span class="stats-quarter-name">${c}° Cuarto</span>
            ${badgeHtml}
          </div>
          <div class="stats-dual-bar-track">
            <div class="stats-bar-home" style="width: ${homePct}%;" title="Regatas: ${qH.entries} ingresos (${homePct}%)"></div>
            <div class="stats-bar-away" style="width: ${awayPct}%;" title="Rival: ${qA.entries} ingresos (${awayPct}%)"></div>
          </div>
          <div class="stats-bar-legend">
            <span class="stats-legend-home">🔵 Regatas: ${qH.entries} ing. • ${qH.goals} gol${qH.goals === 1 ? '' : 'es'} (${qH.corners} CC)</span>
            <span class="stats-legend-away">🔴 Rival: ${qA.entries} ing. • ${qA.goals} gol${qA.goals === 1 ? '' : 'es'} (${qA.corners} CC)</span>
          </div>
        </div>
      `;
    }
    barsContainer.innerHTML = barsHtml;
  }

  // 3. Matriz Comparativa Completa por Cuartos
  const matrixWrap = document.getElementById('statsMatrixWrap');
  if (matrixWrap) {
    const q1H = q[1].home, q2H = q[2].home, q3H = q[3].home, q4H = q[4].home, totH = q.total.home;
    const q1A = q[1].away, q2A = q[2].away, q3A = q[3].away, q4A = q[4].away, totA = q.total.away;

    matrixWrap.innerHTML = `
      <table class="stats-matrix-table">
        <thead>
          <tr>
            <th>MÉTRICA / INCIDENCIA</th>
            <th>1° C</th>
            <th>2° C</th>
            <th>3° C</th>
            <th>4° C</th>
            <th class="total-col">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <!-- SECCIÓN: REGATAS ANDINO B (A FAVOR) -->
          <tr class="stats-sec-home">
            <td colspan="6">🔵 REGATAS ANDINO B (A FAVOR)</td>
          </tr>
          <tr>
            <td>📥 Ingresos al Área</td>
            <td>${q1H.entries}</td>
            <td>${q2H.entries}</td>
            <td>${q3H.entries}</td>
            <td>${q4H.entries}</td>
            <td class="total-col">${totH.entries}</td>
          </tr>
          <tr>
            <td>🏑 Córners Cortos Obtenidos</td>
            <td>${q1H.corners}</td>
            <td>${q2H.corners}</td>
            <td>${q3H.corners}</td>
            <td>${q4H.corners}</td>
            <td class="total-col">${totH.corners}</td>
          </tr>
          <tr>
            <td>🥅 Goles de Córner Corto</td>
            <td>${q1H.cornerGoals}</td>
            <td>${q2H.cornerGoals}</td>
            <td>${q3H.cornerGoals}</td>
            <td>${q4H.cornerGoals}</td>
            <td class="total-col">${totH.cornerGoals}</td>
          </tr>
          <tr>
            <td>🎯 Efectividad Córner (%)</td>
            <td>${q1H.cornerEff}%</td>
            <td>${q2H.cornerEff}%</td>
            <td>${q3H.cornerEff}%</td>
            <td>${q4H.cornerEff}%</td>
            <td class="total-col">${totH.cornerEff}%</td>
          </tr>
          <tr>
            <td>🎯 Penales Obtenidos</td>
            <td>${q1H.strokes}</td>
            <td>${q2H.strokes}</td>
            <td>${q3H.strokes}</td>
            <td>${q4H.strokes}</td>
            <td class="total-col">${totH.strokes}</td>
          </tr>
          <tr>
            <td>🥅 Goles de Penal</td>
            <td>${q1H.strokeGoals}</td>
            <td>${q2H.strokeGoals}</td>
            <td>${q3H.strokeGoals}</td>
            <td>${q4H.strokeGoals}</td>
            <td class="total-col">${totH.strokeGoals}</td>
          </tr>
          <tr>
            <td>⚽ Goles de Jugada</td>
            <td>${q1H.fieldGoals}</td>
            <td>${q2H.fieldGoals}</td>
            <td>${q3H.fieldGoals}</td>
            <td>${q4H.fieldGoals}</td>
            <td class="total-col">${totH.fieldGoals}</td>
          </tr>
          <tr class="stats-row-highlight">
            <td>🏆 GOLES TOTALES REGATAS</td>
            <td><strong>${q1H.goals}</strong></td>
            <td><strong>${q2H.goals}</strong></td>
            <td><strong>${q3H.goals}</strong></td>
            <td><strong>${q4H.goals}</strong></td>
            <td class="total-col"><strong>${totH.goals}</strong></td>
          </tr>
          <tr>
            <td>📈 Tasa Conversión (Gol/Ingreso)</td>
            <td>${q1H.conversion}%</td>
            <td>${q2H.conversion}%</td>
            <td>${q3H.conversion}%</td>
            <td>${q4H.conversion}%</td>
            <td class="total-col">${totH.conversion}%</td>
          </tr>
          <tr>
            <td>🟩 Tarjetas Verdes (2 min)</td>
            <td>${q1H.green}</td>
            <td>${q2H.green}</td>
            <td>${q3H.green}</td>
            <td>${q4H.green}</td>
            <td class="total-col">${totH.green}</td>
          </tr>
          <tr>
            <td>🟨 Tarjetas Amarillas (5 min)</td>
            <td>${q1H.yellow}</td>
            <td>${q2H.yellow}</td>
            <td>${q3H.yellow}</td>
            <td>${q4H.yellow}</td>
            <td class="total-col">${totH.yellow}</td>
          </tr>
          <tr>
            <td>🟥 Tarjetas Rojas (Expulsión)</td>
            <td>${q1H.red}</td>
            <td>${q2H.red}</td>
            <td>${q3H.red}</td>
            <td>${q4H.red}</td>
            <td class="total-col">${totH.red}</td>
          </tr>

          <!-- SECCIÓN: RIVAL (EN CONTRA) -->
          <tr class="stats-sec-away">
            <td colspan="6">🔴 RIVAL (EN CONTRA)</td>
          </tr>
          <tr>
            <td>📥 Ingresos al Área Rival</td>
            <td>${q1A.entries}</td>
            <td>${q2A.entries}</td>
            <td>${q3A.entries}</td>
            <td>${q4A.entries}</td>
            <td class="total-col">${totA.entries}</td>
          </tr>
          <tr>
            <td>🏑 Córners Cortos Concedidos</td>
            <td>${q1A.corners}</td>
            <td>${q2A.corners}</td>
            <td>${q3A.corners}</td>
            <td>${q4A.corners}</td>
            <td class="total-col">${totA.corners}</td>
          </tr>
          <tr>
            <td>🥅 Goles de Córner Rival</td>
            <td>${q1A.cornerGoals}</td>
            <td>${q2A.cornerGoals}</td>
            <td>${q3A.cornerGoals}</td>
            <td>${q4A.cornerGoals}</td>
            <td class="total-col">${totA.cornerGoals}</td>
          </tr>
          <tr>
            <td>🎯 Penales Concedidos Rival</td>
            <td>${q1A.strokes}</td>
            <td>${q2A.strokes}</td>
            <td>${q3A.strokes}</td>
            <td>${q4A.strokes}</td>
            <td class="total-col">${totA.strokes}</td>
          </tr>
          <tr>
            <td>⚽ Goles de Jugada Rival</td>
            <td>${q1A.fieldGoals}</td>
            <td>${q2A.fieldGoals}</td>
            <td>${q3A.fieldGoals}</td>
            <td>${q4A.fieldGoals}</td>
            <td class="total-col">${totA.fieldGoals}</td>
          </tr>
          <tr class="stats-row-highlight">
            <td>🛑 GOLES TOTALES RIVAL</td>
            <td><strong>${q1A.goals}</strong></td>
            <td><strong>${q2A.goals}</strong></td>
            <td><strong>${q3A.goals}</strong></td>
            <td><strong>${q4A.goals}</strong></td>
            <td class="total-col"><strong>${totA.goals}</strong></td>
          </tr>
          <tr>
            <td>🟨 Tarjetas Totales Rival</td>
            <td>${q1A.green + q1A.yellow + q1A.red}</td>
            <td>${q2A.green + q2A.yellow + q2A.red}</td>
            <td>${q3A.green + q3A.yellow + q3A.red}</td>
            <td>${q4A.green + q4A.yellow + q4A.red}</td>
            <td class="total-col">${totA.green + totA.yellow + totA.red}</td>
          </tr>

          <!-- SECCIÓN: BALANCE TÁCTICO & DIFERENCIAL -->
          <tr class="stats-sec-balance">
            <td colspan="6">⚖️ BALANCE & DIFERENCIAL TÁCTICO</td>
          </tr>
          <tr class="stats-row-highlight">
            <td>⚖️ Diferencial de Goles (+ / -)</td>
            <td style="color:${(q1H.goals - q1A.goals) >= 0 ? '#34d399':'#f87171'}">${(q1H.goals - q1A.goals) > 0 ? '+':''}${q1H.goals - q1A.goals}</td>
            <td style="color:${(q2H.goals - q2A.goals) >= 0 ? '#34d399':'#f87171'}">${(q2H.goals - q2A.goals) > 0 ? '+':''}${q2H.goals - q2A.goals}</td>
            <td style="color:${(q3H.goals - q3A.goals) >= 0 ? '#34d399':'#f87171'}">${(q3H.goals - q3A.goals) > 0 ? '+':''}${q3H.goals - q3A.goals}</td>
            <td style="color:${(q4H.goals - q4A.goals) >= 0 ? '#34d399':'#f87171'}">${(q4H.goals - q4A.goals) > 0 ? '+':''}${q4H.goals - q4A.goals}</td>
            <td class="total-col" style="color:${(totH.goals - totA.goals) >= 0 ? '#34d399':'#f87171'}"><strong>${(totH.goals - totA.goals) > 0 ? '+':''}${totH.goals - totA.goals}</strong></td>
          </tr>
          <tr>
            <td>📊 Balance Ingresos al Área (+ / -)</td>
            <td style="color:${(q1H.entries - q1A.entries) >= 0 ? '#34d399':'#f87171'}">${(q1H.entries - q1A.entries) > 0 ? '+':''}${q1H.entries - q1A.entries}</td>
            <td style="color:${(q2H.entries - q2A.entries) >= 0 ? '#34d399':'#f87171'}">${(q2H.entries - q2A.entries) > 0 ? '+':''}${q2H.entries - q2A.entries}</td>
            <td style="color:${(q3H.entries - q3A.entries) >= 0 ? '#34d399':'#f87171'}">${(q3H.entries - q3A.entries) > 0 ? '+':''}${q3H.entries - q3A.entries}</td>
            <td style="color:${(q4H.entries - q4A.entries) >= 0 ? '#34d399':'#f87171'}">${(q4H.entries - q4A.entries) > 0 ? '+':''}${q4H.entries - q4A.entries}</td>
            <td class="total-col" style="color:${(totH.entries - totA.entries) >= 0 ? '#34d399':'#f87171'}">${(totH.entries - totA.entries) > 0 ? '+':''}${totH.entries - totA.entries}</td>
          </tr>
          <tr>
            <td>🏑 Balance Córners Cortos (+ / -)</td>
            <td style="color:${(q1H.corners - q1A.corners) >= 0 ? '#34d399':'#f87171'}">${(q1H.corners - q1A.corners) > 0 ? '+':''}${q1H.corners - q1A.corners}</td>
            <td style="color:${(q2H.corners - q2A.corners) >= 0 ? '#34d399':'#f87171'}">${(q2H.corners - q2A.corners) > 0 ? '+':''}${q2H.corners - q2A.corners}</td>
            <td style="color:${(q3H.corners - q3A.corners) >= 0 ? '#34d399':'#f87171'}">${(q3H.corners - q3A.corners) > 0 ? '+':''}${q3H.corners - q3A.corners}</td>
            <td style="color:${(q4H.corners - q4A.corners) >= 0 ? '#34d399':'#f87171'}">${(q4H.corners - q4A.corners) > 0 ? '+':''}${q4H.corners - q4A.corners}</td>
            <td class="total-col" style="color:${(totH.corners - totA.corners) >= 0 ? '#34d399':'#f87171'}">${(totH.corners - totA.corners) > 0 ? '+':''}${totH.corners - totA.corners}</td>
          </tr>
          <tr class="stats-row-highlight" style="background: rgba(56, 189, 248, 0.09);">
            <td>⚡ Índice Rendimiento Integral (+ / -)<br><small style="font-size:0.68rem; color:#94a3b8; font-weight:normal;">Goles (x10) + Cortos (x3) + Ingresos (x1)</small></td>
            <td style="color:${q[1].performanceIndex >= 0 ? '#34d399':'#f87171'}"><strong>${q[1].performanceIndex > 0 ? '+':''}${q[1].performanceIndex} pts</strong></td>
            <td style="color:${q[2].performanceIndex >= 0 ? '#34d399':'#f87171'}"><strong>${q[2].performanceIndex > 0 ? '+':''}${q[2].performanceIndex} pts</strong></td>
            <td style="color:${q[3].performanceIndex >= 0 ? '#34d399':'#f87171'}"><strong>${q[3].performanceIndex > 0 ? '+':''}${q[3].performanceIndex} pts</strong></td>
            <td style="color:${q[4].performanceIndex >= 0 ? '#34d399':'#f87171'}"><strong>${q[4].performanceIndex > 0 ? '+':''}${q[4].performanceIndex} pts</strong></td>
            <td class="total-col" style="color:${q.total.performanceIndex >= 0 ? '#34d399':'#f87171'}"><strong>${q.total.performanceIndex > 0 ? '+':''}${q.total.performanceIndex} pts</strong></td>
          </tr>
        </tbody>
      </table>

      <!-- RENDIMIENTO INDIVIDUAL (GOLEADORAS, GENERADORAS DE CORTO Y TARJETAS) -->
      <section class="stats-halves-card" style="margin-top: 14px;">
        <div class="stats-card-header">
          <span class="stats-card-icon">⭐</span>
          <div>
            <h3 class="stats-card-title">RENDIMIENTO INDIVIDUAL (${selectedKey === 'all' ? 'ACUMULADO GENERAL' : 'PARTIDO SELECCIONADO'})</h3>
            <p style="font-size: 0.72rem; color: #9bb1d6; margin: 2px 0 0 0;">Goleadoras, jugadoras que provocaron córners cortos y sanciones</p>
          </div>
        </div>

        <div class="stats-players-grid">
          <!-- TOP GOLEADORAS -->
          <div class="stats-players-card">
            <div class="stats-players-card-title">
              <span>⚽ GOLEADORAS</span>
              <span style="font-size: 0.68rem; color: #34d399;">${seasonTrends.totalGF} Goles</span>
            </div>
            ${seasonTrends.scorersList.length > 0 ? `
              <table class="stats-players-mini-table">
                <thead>
                  <tr>
                    <th>Jugadora</th>
                    <th style="text-align: center;">Jugada</th>
                    <th style="text-align: center;">Corto</th>
                    <th style="text-align: center;">Penal</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${seasonTrends.scorersList.map(s => `
                    <tr>
                      <td><strong>${escapeHtml(s.name)}</strong></td>
                      <td style="text-align: center; color: #9bb1d6;">${s.field}</td>
                      <td style="text-align: center; color: #9bb1d6;">${s.corner}</td>
                      <td style="text-align: center; color: #9bb1d6;">${s.stroke}</td>
                      <td>${s.total} gol${s.total === 1 ? '' : 'es'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="stats-empty-hint">Sin goles asignados en esta muestra.</div>
            `}
          </div>

          <!-- TOP GENERADORAS DE CORTO -->
          <div class="stats-players-card" style="border-top: 3px solid #c084fc;">
            <div class="stats-players-card-title">
              <span style="color: #c084fc;">🏑 GENERADORAS DE CÓRNER CORTO</span>
              <span style="font-size: 0.68rem; color: #c084fc; font-weight: 800;">
                ${seasonTrends.cornersWonList && seasonTrends.cornersWonList.length > 0 
                  ? `${seasonTrends.cornersWonList.reduce((acc, c) => acc + c.total, 0)} Provocados` 
                  : 'Jugadas Fijas'}
              </span>
            </div>
            ${seasonTrends.cornersWonList && seasonTrends.cornersWonList.length > 0 ? `
              <table class="stats-players-mini-table">
                <thead>
                  <tr>
                    <th style="width: 22px;">#</th>
                    <th>Jugadora</th>
                    <th style="text-align: center;">Cortos</th>
                    <th style="text-align: center;">Con Gol</th>
                    <th>Efectividad</th>
                  </tr>
                </thead>
                <tbody>
                  ${seasonTrends.cornersWonList.map((c, idx) => {
                    const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}.`));
                    const effPct = c.total > 0 ? Math.round((c.resultedInGoal / c.total) * 100) : 0;
                    return `
                      <tr>
                        <td style="color: var(--text-muted); font-size: 0.72rem; font-weight: 800;">${medal}</td>
                        <td><strong>${escapeHtml(c.name)}</strong></td>
                        <td style="text-align: center; color: #c084fc; font-weight: 900; font-size: 0.82rem;">${c.total}</td>
                        <td style="text-align: center; color: #34d399; font-weight: 700;">${c.resultedInGoal}</td>
                        <td style="color: #38bdf8; font-weight: 800;">${effPct}%</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : `
              <div class="stats-empty-hint">
                <span style="font-size: 1.1rem; display: block; margin-bottom: 4px;">🏑</span>
                Sin jugadoras asignadas en cortos en esta muestra.<br>
                <span style="font-size: 0.68rem; color: #9bb1d6;">Al registrar un córner en la botonera DT podés elegir quién lo provocó.</span>
              </div>
            `}
          </div>

          <!-- TARJETAS Y DISCIPLINA -->
          <div class="stats-players-card">
            <div class="stats-players-card-title">
              <span>🟨 TARJETAS & DISCIPLINA</span>
              <span style="font-size: 0.68rem; color: #fbbf24;">Sanciones</span>
            </div>
            ${seasonTrends.cardsList.length > 0 ? `
              <table class="stats-players-mini-table">
                <thead>
                  <tr>
                    <th>Jugadora</th>
                    <th style="text-align: center;">🟩 2m</th>
                    <th style="text-align: center;">🟨 5m</th>
                    <th style="text-align: center;">🟥 Exp</th>
                    <th>Minutos Fuera</th>
                  </tr>
                </thead>
                <tbody>
                  ${seasonTrends.cardsList.map(c => `
                    <tr>
                      <td><strong>${escapeHtml(c.name)}</strong></td>
                      <td style="text-align: center; color: #34d399;">${c.green}</td>
                      <td style="text-align: center; color: #fbbf24;">${c.yellow}</td>
                      <td style="text-align: center; color: #f87171;">${c.red}</td>
                      <td style="color: #f87171;">${c.penaltyMinutes} min</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="stats-empty-hint" style="color: #34d399;">¡Plantel impecable! Sin tarjetas registradas.</div>
            `}
          </div>
        </div>
      </section>
    `;
  }

  // Sincronizar visibilidad de subpestaña activa
  switchStatsSubTab(statsActiveSubTab);
}

// Renderizado de la Vista de Tendencias de Temporada
function renderSeasonTrends(trends) {
  const container = document.getElementById('statsTabTrendsContent');
  if (!container) return;

  if (trends.playedCount === 0) {
    container.innerHTML = `
      <div class="stats-campaign-banner" style="text-align: center; padding: 32px 18px;">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">📈</div>
        <h3 style="color: #ffffff; font-size: 1.1rem; font-weight: 800; margin-bottom: 6px;">Sin Partidos Registrados Aún</h3>
        <p style="font-size: 0.8rem; color: #9bb1d6; max-width: 440px; margin: 0 auto 16px auto; line-height: 1.4;">
          Aún no se han guardado incidencias de partidos en la Botonera DT. Iniciá un partido en la botonera o sincronizá con Google Sheets para cargar las fechas del torneo.
        </p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn-primary" onclick="showView('dt')" style="max-width: 200px;">
            <span>⏱️</span> Ir a Botonera DT
          </button>
          <button type="button" class="btn-stats-sync-cloud" onclick="syncAllMatchesFromCloud()">
            <span>🔄</span> Sincronizar Google Sheets
          </button>
        </div>
      </div>
    `;
    return;
  }

  const h1 = trends.halves.first;
  const h2 = trends.halves.second;

  const totalGoals = trends.totalGF;
  const h1GoalsPct = totalGoals > 0 ? Math.round((h1.goalsHome / totalGoals) * 100) : 50;
  const h2GoalsPct = 100 - h1GoalsPct;

  const totalConceded = trends.totalGC;
  const h1ConcededPct = totalConceded > 0 ? Math.round((h1.goalsAway / totalConceded) * 100) : 50;
  const h2ConcededPct = 100 - h1ConcededPct;

  const totalEntries = trends.totalEntriesHome;
  const h1EntriesPct = totalEntries > 0 ? Math.round((h1.entriesHome / totalEntries) * 100) : 50;
  const h2EntriesPct = 100 - h1EntriesPct;

  const insights = generateSeasonTacticalDiagnosis(trends);

  const goalDiffSign = trends.goalDiff > 0 ? `+${trends.goalDiff}` : `${trends.goalDiff}`;
  const entryDiff = trends.totalEntriesHome - trends.totalEntriesAway;
  const entryDiffSign = entryDiff > 0 ? `+${entryDiff}` : `${entryDiff}`;

  let html = `
    <!-- BANNER DE CAMPAÑA & RÉCORD GLOBAL -->
    <section class="stats-campaign-banner">
      <div class="stats-campaign-header">
        <div>
          <span class="stats-filter-label" style="display:block; margin-bottom: 2px;">Campaña Acumulada</span>
          <h3 style="font-size: 1.15rem; font-weight: 900; color: #ffffff; margin: 0;">BALANCE GENERAL DE TEMPORADA</h3>
        </div>
        <div class="stats-campaign-record-badge">
          <span>🏆</span> ${trends.playedCount} PJ • ${trends.wins}V ${trends.draws}E ${trends.losses}D (${trends.points} PTS)
        </div>
      </div>

      <div class="stats-campaign-grid">
        <div class="stats-campaign-kpi">
          <span class="stats-campaign-kpi-label">Efectividad de Puntos</span>
          <span class="stats-campaign-kpi-val" style="color: #34d399;">${trends.pointsEff}%</span>
          <span class="stats-campaign-kpi-sub">${trends.points} de ${trends.playedCount * 3} pts posibles</span>
        </div>
        <div class="stats-campaign-kpi">
          <span class="stats-campaign-kpi-label">Goles F / C (Diferencial)</span>
          <span class="stats-campaign-kpi-val">${trends.totalGF} - ${trends.totalGC} <small style="font-size:0.75rem; color:${trends.goalDiff >= 0 ? '#34d399':'#f87171'};">(${goalDiffSign})</small></span>
          <span class="stats-campaign-kpi-sub">Promedio: ${trends.avgGF} a favor / ${trends.avgGC} contra</span>
        </div>
        <div class="stats-campaign-kpi">
          <span class="stats-campaign-kpi-label">Volumen Territorial</span>
          <span class="stats-campaign-kpi-val">${trends.totalEntriesHome} vs ${trends.totalEntriesAway}</span>
          <span class="stats-campaign-kpi-sub">Balance: ${entryDiffSign} ingresos a favor</span>
        </div>
        <div class="stats-campaign-kpi">
          <span class="stats-campaign-kpi-label">Tasa de Conversión</span>
          <span class="stats-campaign-kpi-val" style="color: #38bdf8;">${trends.conversionHome}%</span>
          <span class="stats-campaign-kpi-sub">Goles por cada 100 ingresos al área</span>
        </div>
      </div>
    </section>

    <!-- TERMÓMETRO TÁCTICO: 1ER TIEMPO vs 2DO TIEMPO -->
    <section class="stats-halves-card">
      <div class="stats-card-header">
        <span class="stats-card-icon">⚖️</span>
        <div>
          <h3 class="stats-card-title">TERMÓMETRO: 1° TIEMPO vs 2° TIEMPO</h3>
          <p style="font-size: 0.72rem; color: #9bb1d6; margin: 2px 0 0 0;">Comparativa de rendimiento entre la primera mitad (1°C + 2°C) y la segunda mitad (3°C + 4°C)</p>
        </div>
      </div>

      <!-- Barras comparativas 1T vs 2T -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div class="stats-quarter-bar-row">
          <div class="stats-quarter-bar-head">
            <span class="stats-quarter-name">⚽ Goles Marcados por Regatas</span>
            <span class="stats-quarter-badge stats-badge-win">1T: ${h1GoalsPct}% | 2T: ${h2GoalsPct}%</span>
          </div>
          <div class="stats-dual-bar-track">
            <div class="stats-bar-home" style="width: ${h1GoalsPct}%;" title="1T: ${h1.goalsHome} goles"></div>
            <div class="stats-bar-away" style="width: ${h2GoalsPct}%; background: linear-gradient(90deg, #38bdf8, #818cf8);" title="2T: ${h2.goalsHome} goles"></div>
          </div>
          <div class="stats-bar-legend">
            <span class="stats-legend-home">🔵 1° Tiempo (1°C y 2°C): ${h1.goalsHome} goles</span>
            <span class="stats-legend-away" style="color: #a5b4fc;">🟣 2° Tiempo (3°C y 4°C): ${h2.goalsHome} goles</span>
          </div>
        </div>

        <div class="stats-quarter-bar-row">
          <div class="stats-quarter-bar-head">
            <span class="stats-quarter-name">🛑 Goles Recibidos (Vulnerabilidad)</span>
            <span class="stats-quarter-badge stats-badge-loss">1T: ${h1ConcededPct}% | 2T: ${h2ConcededPct}%</span>
          </div>
          <div class="stats-dual-bar-track">
            <div class="stats-bar-home" style="width: ${h1ConcededPct}%; background: linear-gradient(90deg, #f59e0b, #fbbf24);" title="1T: ${h1.goalsAway} goles"></div>
            <div class="stats-bar-away" style="width: ${h2ConcededPct}%; background: linear-gradient(90deg, #ef4444, #f87171);" title="2T: ${h2.goalsAway} goles"></div>
          </div>
          <div class="stats-bar-legend">
            <span class="stats-legend-home" style="color: #fbbf24;">🟠 1° Tiempo: ${h1.goalsAway} goles recibidos</span>
            <span class="stats-legend-away">🔴 2° Tiempo: ${h2.goalsAway} goles recibidos</span>
          </div>
        </div>

        <div class="stats-quarter-bar-row">
          <div class="stats-quarter-bar-head">
            <span class="stats-quarter-name">📥 Ingresos al Área Rival (Volumen)</span>
            <span class="stats-quarter-badge stats-badge-draw">1T: ${h1EntriesPct}% | 2T: ${h2EntriesPct}%</span>
          </div>
          <div class="stats-dual-bar-track">
            <div class="stats-bar-home" style="width: ${h1EntriesPct}%;" title="1T: ${h1.entriesHome} ingresos"></div>
            <div class="stats-bar-away" style="width: ${h2EntriesPct}%; background: linear-gradient(90deg, #06b6d4, #22d3ee);" title="2T: ${h2.entriesHome} ingresos"></div>
          </div>
          <div class="stats-bar-legend">
            <span class="stats-legend-home">🔵 1° Tiempo: ${h1.entriesHome} ingresos</span>
            <span class="stats-legend-away" style="color: #67e8f9;">🔷 2° Tiempo: ${h2.entriesHome} ingresos</span>
          </div>
        </div>
      </div>

      <!-- Cuadros Comparativos Lado a Lado -->
      <div class="stats-halves-grid">
        <div class="stats-half-col">
          <div class="stats-half-col-title">
            <span>⏱️ 1° Tiempo (1°C + 2°C)</span>
          </div>
          <div class="stats-half-metric-row">
            <span>Goles a Favor:</span>
            <strong style="color: #34d399;">${h1.goalsHome}</strong>
          </div>
          <div class="stats-half-metric-row">
            <span>Goles en Contra:</span>
            <strong style="color: #f87171;">${h1.goalsAway}</strong>
          </div>
          <div class="stats-half-metric-row">
            <span>Ingresos Área (Reg / Riv):</span>
            <strong>${h1.entriesHome} / ${h1.entriesAway}</strong>
          </div>
          <div class="stats-half-metric-row">
            <span>Córners Cortos a Favor:</span>
            <strong>${h1.cornersHome} (${h1.cornerGoalsHome}g)</strong>
          </div>
          <div class="stats-half-metric-row">
            <span>Tarjetas (Verdes / Amarillas):</span>
            <strong>${h1.cardsHome.green}V / ${h1.cardsHome.yellow}A</strong>
          </div>
        </div>

        <div class="stats-half-col">
          <div class="stats-half-col-title">
            <span style="color: #818cf8;">⏱️ 2° Tiempo (3°C + 4°C)</span>
          </div>
          <div class="stats-half-metric-row">
            <span>Goles a Favor:</span>
            <strong style="color: #34d399;">${h2.goalsHome}</strong>
          </div>
          <div class="stats-half-metric-row">
            <span>Goles en Contra:</span>
            <strong style="color: #f87171;">${h2.goalsAway}</strong>
          </div>
          <div class="stats-half-metric-row">
            <span>Ingresos Área (Reg / Riv):</span>
            <strong>${h2.entriesHome} / ${h2.entriesAway}</strong>
          </div>
          <div class="stats-half-metric-row">
            <span>Córners Cortos a Favor:</span>
            <strong>${h2.cornersHome} (${h2.cornerGoalsHome}g)</strong>
          </div>
          <div class="stats-half-metric-row">
            <span>Tarjetas (Verdes / Amarillas):</span>
            <strong>${h2.cardsHome.green}V / ${h2.cardsHome.yellow}A</strong>
          </div>
        </div>
      </div>

      <!-- Diagnósticos Tácticos Automáticos del DT -->
      ${insights.length > 0 ? `
        <div style="margin-top: 4px;">
          <span class="stats-filter-label" style="display: block; margin-bottom: 6px;">💡 Conclusiones Tácticas del CT</span>
          <div class="stats-insights-list">
            ${insights.map(item => `
              <div class="stats-insight-item ${item.type}">
                <span class="stats-insight-icon">${item.icon}</span>
                <div class="stats-insight-text">
                  <strong>${item.title}</strong>
                  ${item.desc}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </section>

    <!-- EFICIENCIA DE CÓRNER CORTO (ATAQUE vs DEFENSA) -->
    <section class="stats-halves-card">
      <div class="stats-card-header">
        <span class="stats-card-icon">🏑</span>
        <div>
          <h3 class="stats-card-title">EFICIENCIA CRÍTICA EN CÓRNERS CORTOS</h3>
          <p style="font-size: 0.72rem; color: #9bb1d6; margin: 2px 0 0 0;">Conversión en jugadas preparadas de ataque y solidez en defensa fija</p>
        </div>
      </div>

      <div class="stats-corners-summary-grid">
        <div class="stats-corners-box">
          <div class="stats-corners-box-title" style="color: #38bdf8;">
            <span>🎯</span> ATAQUE (A FAVOR)
          </div>
          <div class="stats-corners-box-val" style="color: #38bdf8;">
            ${trends.cornerEffHome}%
          </div>
          <div class="stats-corners-box-sub">
            <strong>${trends.cornerGoalsHome} goles</strong> en ${trends.totalCornersHome} cortos obtenidos
          </div>
          <div class="stats-corners-box-sub" style="margin-top: 4px; color: #c8d8f0;">
            ${trends.cornerGoalsHome > 0 ? `Se anota 1 gol cada ${(trends.totalCornersHome / trends.cornerGoalsHome).toFixed(1)} cortos` : 'Sin goles de córner corto aún'}
          </div>
        </div>

        <div class="stats-corners-box">
          <div class="stats-corners-box-title" style="color: #34d399;">
            <span>🛡️</span> DEFENSA (EN CONTRA)
          </div>
          <div class="stats-corners-box-val" style="color: #34d399;">
            ${trends.cornerDefHome}%
          </div>
          <div class="stats-corners-box-sub">
            <strong>Efectividad defendiendo</strong> cortos rivales
          </div>
          <div class="stats-corners-box-sub" style="margin-top: 4px; color: #c8d8f0;">
            Solo ${trends.cornerGoalsAway} goles sufridos de ${trends.totalCornersAway} cortos concedidos
          </div>
        </div>

        <div class="stats-corners-box" style="border-left: 3px solid #c084fc;">
          <div class="stats-corners-box-title" style="color: #c084fc;">
            <span>⭐</span> MÁXIMA GENERADORA
          </div>
          <div class="stats-corners-box-val" style="color: #c084fc; font-size: 1.12rem;">
            ${trends.cornersWonList && trends.cornersWonList.length > 0 ? escapeHtml(trends.cornersWonList[0].name) : '-'}
          </div>
          <div class="stats-corners-box-sub">
            ${trends.cornersWonList && trends.cornersWonList.length > 0 
              ? `<strong>${trends.cornersWonList[0].total} cortos ganados</strong> (${trends.cornersWonList[0].resultedInGoal} con gol)`
              : 'Sin jugadoras registradas en cortos aún'}
          </div>
          <div class="stats-corners-box-sub" style="margin-top: 4px; color: #c8d8f0;">
            ${trends.cornersWonList && trends.cornersWonList.length > 0
              ? `${trends.cornersWonList.reduce((acc, c) => acc + c.total, 0)} jugadas fijas con jugadora asignada`
              : 'Se registran desde la botonera táctica DT'}
          </div>
        </div>
      </div>
    </section>

    <!-- EVOLUCIÓN PARTIDO A PARTIDO (TIMELINE DE FECHAS) -->
    <section class="stats-halves-card">
      <div class="stats-card-header">
        <span class="stats-card-icon">📅</span>
        <div>
          <h3 class="stats-card-title">EVOLUCIÓN PARTIDO A PARTIDO</h3>
          <p style="font-size: 0.72rem; color: #9bb1d6; margin: 2px 0 0 0;">Historial cronológico de fechas con diferencial territorial y efectividad</p>
        </div>
      </div>

      <div class="stats-match-timeline">
        ${trends.matchChronology.map(m => {
          const resClass = m.result === 'win' ? 'stats-res-win' : (m.result === 'draw' ? 'stats-res-draw' : 'stats-res-loss');
          const resLetter = m.result === 'win' ? 'V' : (m.result === 'draw' ? 'E' : 'D');
          const entryDiffVal = m.entriesHome - m.entriesAway;
          const entryDiffText = entryDiffVal > 0 ? `+${entryDiffVal}` : `${entryDiffVal}`;

          return `
            <div class="stats-timeline-row">
              <div class="stats-timeline-info">
                <span class="stats-res-pill ${resClass}">${resLetter}</span>
                <div class="stats-timeline-details">
                  <div class="stats-timeline-title">
                    ${escapeHtml(m.round)} vs ${escapeHtml(m.rival)}
                    <span style="color: #ffffff; font-weight: 900; margin-left: 6px;">${m.homeScore} - ${m.awayScore}</span>
                  </div>
                  <div class="stats-timeline-meta">
                    <span>📥 Ingresos: ${m.entriesHome} vs ${m.entriesAway} (${entryDiffText})</span>
                    <span>🏑 CC: ${m.cornersHome} (${m.cornerGoalsHome}g)</span>
                    ${m.date ? `<span>📅 ${escapeHtml(m.date)}</span>` : ''}
                  </div>
                </div>
              </div>
              <button type="button" class="btn-timeline-inspect" onclick="inspectMatchQuarters('${m.key}')" title="Ver análisis de cuartos de este partido">
                Ver Cuartos ➔
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <!-- GOLEADORAS Y DISCIPLINA DEL PLANTEL -->
    <section class="stats-halves-card">
      <div class="stats-card-header">
        <span class="stats-card-icon">⭐</span>
        <div>
          <h3 class="stats-card-title">RENDIMIENTO INDIVIDUAL DEL PLANTEL</h3>
          <p style="font-size: 0.72rem; color: #9bb1d6; margin: 2px 0 0 0;">Tabla de goleadoras y registro disciplinario extraídos de las incidencias</p>
        </div>
      </div>

      <div class="stats-players-grid">
        <!-- TOP GOLEADORAS -->
        <div class="stats-players-card">
          <div class="stats-players-card-title">
            <span>⚽ TOP GOLEADORAS</span>
            <span style="font-size: 0.68rem; color: #34d399;">${trends.totalGF} Goles</span>
          </div>

          ${trends.scorersList.length > 0 ? `
            <table class="stats-players-mini-table">
              <thead>
                <tr>
                  <th>Jugadora</th>
                  <th style="text-align: center;">Jugada</th>
                  <th style="text-align: center;">Corto</th>
                  <th style="text-align: center;">Penal</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${trends.scorersList.map(s => `
                  <tr>
                    <td><strong>${escapeHtml(s.name)}</strong></td>
                    <td style="text-align: center; color: #9bb1d6;">${s.field}</td>
                    <td style="text-align: center; color: #9bb1d6;">${s.corner}</td>
                    <td style="text-align: center; color: #9bb1d6;">${s.stroke}</td>
                    <td>${s.total} gol${s.total === 1 ? '' : 'es'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="stats-empty-hint">No hay goles asignados a jugadoras todavía.</div>
          `}
        </div>

        <!-- TOP GENERADORAS DE CÓRNER CORTO -->
        <div class="stats-players-card" style="border-top: 3px solid #c084fc;">
          <div class="stats-players-card-title">
            <span style="color: #c084fc;">🏑 TOP GENERADORAS DE CORTO</span>
            <span style="font-size: 0.68rem; color: #c084fc; font-weight: 800;">
              ${trends.cornersWonList && trends.cornersWonList.length > 0 
                ? `${trends.cornersWonList.reduce((acc, c) => acc + c.total, 0)} Provocados` 
                : 'Jugadas Fijas'}
            </span>
          </div>

          ${trends.cornersWonList && trends.cornersWonList.length > 0 ? `
            <table class="stats-players-mini-table">
              <thead>
                <tr>
                  <th style="width: 22px;">#</th>
                  <th>Jugadora</th>
                  <th style="text-align: center;">Cortos</th>
                  <th style="text-align: center;">Con Gol</th>
                  <th>Efectividad</th>
                </tr>
              </thead>
              <tbody>
                ${trends.cornersWonList.map((c, idx) => {
                  const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}.`));
                  const effPct = c.total > 0 ? Math.round((c.resultedInGoal / c.total) * 100) : 0;
                  return `
                    <tr>
                      <td style="color: var(--text-muted); font-size: 0.72rem; font-weight: 800;">${medal}</td>
                      <td><strong>${escapeHtml(c.name)}</strong></td>
                      <td style="text-align: center; color: #c084fc; font-weight: 900; font-size: 0.82rem;">${c.total}</td>
                      <td style="text-align: center; color: #34d399; font-weight: 700;">${c.resultedInGoal}</td>
                      <td style="color: #38bdf8; font-weight: 800;">${effPct}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : `
            <div class="stats-empty-hint">
              <span style="font-size: 1.1rem; display: block; margin-bottom: 4px;">🏑</span>
              Aún no hay jugadoras asignadas en córners cortos.<br>
              <span style="font-size: 0.68rem; color: #9bb1d6;">Al registrar un córner en la botonera DT podés marcar quién lo provocó.</span>
            </div>
          `}
        </div>

        <!-- DISCIPLINA & TARJETAS -->
        <div class="stats-players-card">
          <div class="stats-players-card-title">
            <span>🟨 TARJETAS & DISCIPLINA</span>
            <span style="font-size: 0.68rem; color: #fbbf24;">Fair Play</span>
          </div>

          ${trends.cardsList.length > 0 ? `
            <table class="stats-players-mini-table">
              <thead>
                <tr>
                  <th>Jugadora</th>
                  <th style="text-align: center;">🟩 2m</th>
                  <th style="text-align: center;">🟨 5m</th>
                  <th style="text-align: center;">🟥 Exp</th>
                  <th>Minutos Fuera</th>
                </tr>
              </thead>
              <tbody>
                ${trends.cardsList.map(c => `
                  <tr>
                    <td><strong>${escapeHtml(c.name)}</strong></td>
                    <td style="text-align: center; color: #34d399;">${c.green}</td>
                    <td style="text-align: center; color: #fbbf24;">${c.yellow}</td>
                    <td style="text-align: center; color: #f87171;">${c.red}</td>
                    <td style="color: #f87171;">${c.penaltyMinutes} min</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="stats-empty-hint" style="color: #34d399;">¡Plantel impecable! Sin tarjetas registradas aún.</div>
          `}
        </div>
      </div>
    </section>
  `;

  container.innerHTML = html;
}

// Sincronización de todos los partidos e incidencias desde Google Sheets
async function syncAllMatchesFromCloud(options = {}) {
  const isSilent = Boolean(options && options.silent === true);
  const webhookUrl = getDtWebhookUrl();
  if (!webhookUrl) {
    if (!isSilent) showToast('⚠️ No hay URL de Google Sheets configurada.');
    return;
  }

  const btnSync = document.getElementById('btnSyncAllMatchesCloud');
  const originalText = btnSync ? btnSync.innerHTML : '';
  if (btnSync && !isSilent) {
    btnSync.disabled = true;
    btnSync.innerHTML = '<span>⏳</span> Sincronizando partidos desde Google Sheets...';
  }

  if (!isSilent) {
    showToast('🔄 Descargando incidencias de todas las fechas...');
  }

  try {
    // 1. Consultar lista de hojas disponibles en el libro de Sheets
    const res = await fetch(webhookUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    let sheetsToFetch = [];
    if (data && Array.isArray(data.sheets) && data.sheets.length > 0) {
      sheetsToFetch = data.sheets;
    } else {
      if (!tournamentData) loadTournamentData();
      const divMatches = (tournamentData && tournamentData.primera && tournamentData.primera.matches) || [];
      const divPending = (tournamentData && tournamentData.primera && tournamentData.primera.pendingMatches) || [];
      const allM = [...divMatches, ...divPending];
      sheetsToFetch = Array.from(new Set(allM.map(m => getDtMatchSheetName({ round: m.round, rivalName: m.rival })).filter(Boolean)));
    }

    let updatedCount = 0;
    for (const sheetName of sheetsToFetch) {
      try {
        const sheetUrl = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}sheet=${encodeURIComponent(sheetName)}`;
        const sheetRes = await fetch(sheetUrl);
        if (sheetRes.ok) {
          const sheetData = await sheetRes.json();
          if (sheetData && sheetData.status === 'ok' && Array.isArray(sheetData.events)) {
            const parts = sheetName.split(' - ');
            const round = parts[0] ? parts[0].trim() : 'Fecha';
            const rival = parts[1] ? parts[1].trim() : 'Rival';
            const matchKey = getMatchKey('primera', round);

            const match = ensureMatchStateExists(matchKey, { round, rivalName: rival });
            const normalizedCloud = sheetData.events.map(normalizeCloudEvent).filter(Boolean);
            match.events = normalizedCloud;
            recalculateMatchStats(match);
            updatedCount++;
          }
        }
      } catch (err) {
        console.warn(`Error al consultar hoja ${sheetName}:`, err);
      }
    }

    if (dtMatchesStore[dtCurrentMatchKey]) {
      dtMatchState = dtMatchesStore[dtCurrentMatchKey];
    }

    saveDtMatchesStore();
    populateStatsMatchFilter();
    renderAnalyticsDashboard(statsCurrentSelectedFilter);
    updateStatsLastSyncBadge();
    if (!isSilent) {
      showToast(`✅ Sincronización exitosa: ${updatedCount} fecha(s) actualizada(s).`);
    }
  } catch (e) {
    console.error('Error general sincronizando partidos de Sheets:', e);
    if (!isSilent) {
      showToast('⚠️ Error al conectar con Google Sheets.');
    }
  } finally {
    if (btnSync && !isSilent) {
      btnSync.disabled = false;
      btnSync.innerHTML = originalText || '<span>🔄</span> Sincronizar Google Sheets';
    }
  }
}

// Compartir resumen táctico por WhatsApp
function shareStatsWhatsApp() {
  const filterSelect = document.getElementById('selectStatsMatchFilter');
  const selectedLabel = filterSelect && filterSelect.options[filterSelect.selectedIndex] 
    ? filterSelect.options[filterSelect.selectedIndex].text 
    : 'Todos los Partidos';

  if (statsActiveSubTab === 'trends') {
    const trends = getSeasonTrendsData(statsCurrentSelectedFilter);
    const h1 = trends.halves.first;
    const h2 = trends.halves.second;
    const topScorersStr = trends.scorersList.length > 0
      ? trends.scorersList.slice(0, 3).map((s, i) => `${i + 1}. ${s.name}: ${s.total} gol${s.total === 1 ? '' : 'es'}`).join('\n')
      : 'Sin goles individuales registrados';

    const goalDiffStr = trends.goalDiff > 0 ? `+${trends.goalDiff}` : `${trends.goalDiff}`;

    const lines = [
      `📈 *REGATAS ANDINO B - TENDENCIAS DE TEMPORADA*`,
      `📊 *Muestra:* ${selectedLabel}`,
      `🏆 *Campaña:* ${trends.playedCount} PJ • ${trends.wins}V ${trends.draws}E ${trends.losses}D (${trends.points} pts • ${trends.pointsEff}% efectividad)`,
      `⚽ *Goles:* ${trends.totalGF} a favor / ${trends.totalGC} en contra (Dif: ${goalDiffStr})`,
      `📥 *Ingresos al Área:* ${trends.avgEntriesHome} prom. a favor vs ${trends.avgEntriesAway} rivales`,
      ``,
      `⚖️ *DIAGNÓSTICO 1° TIEMPO vs 2° TIEMPO:*`,
      `*1° Tiempo (1°C + 2°C):* ${h1.goalsHome} goles a favor • ${h1.goalsAway} recibidos • ${h1.entriesHome} ingresos`,
      `*2° Tiempo (3°C + 4°C):* ${h2.goalsHome} goles a favor • ${h2.goalsAway} recibidos • ${h2.entriesHome} ingresos`,
      ``,
      `🎯 *CÓRNERS CORTOS:*`,
      `*Ataque:* ${trends.cornerGoalsHome} goles en ${trends.totalCornersHome} CC (${trends.cornerEffHome}% efectividad)`,
      `*Defensa:* ${trends.cornerDefHome}% defendidos con éxito (${trends.cornerGoalsAway} goles sufridos en ${trends.totalCornersAway} CC)`,
      ...(trends.cornersWonList && trends.cornersWonList.length > 0 ? [
        `*Provocados por:* ${trends.cornersWonList.slice(0, 3).map(c => `${c.name} (${c.total})`).join(', ')}`
      ] : []),
      ``,
      `⭐ *TOP GOLEADORAS:*`,
      topScorersStr,
      ``,
      `_Generado desde la App Oficial de Citaciones y Botonera DT de Regatas Andino B_`
    ];

    const fullText = lines.join('\n');
    const waUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(waUrl, '_blank');
    return;
  }

  // Desglose por cuartos
  const stats = getAggregatedQuarterStats(statsCurrentSelectedFilter);
  const q = stats.quarters;
  const totH = q.total.home;
  const totA = q.total.away;

  const goalDiff = totH.goals - totA.goals;
  const goalDiffStr = goalDiff > 0 ? `+${goalDiff}` : `${goalDiff}`;

  const lines = [
    `🏑 *REGATAS ANDINO B - ANÁLISIS TÁCTICO POR CUARTOS*`,
    `📊 *Muestra:* ${selectedLabel}`,
    `📅 Partidos analizados: ${stats.matchesCount} (${stats.totalEventsCount} incidencias registradas)`,
    ``,
    `🏆 *TOTAL ACUMULADO:*`,
    `⚽ *Marcador:* Regatas ${totH.goals} - ${totA.goals} Rival (Diferencial: ${goalDiffStr})`,
    `📥 *Ingresos al Área:* ${totH.entries} Regatas vs ${totA.entries} Rivales`,
    `🏑 *Córners Cortos:* ${totH.corners} obtenidos (${totH.cornerGoals} goles • ${totH.cornerEff}% efectividad)`,
    `🎯 *Penales:* ${totH.strokes} (${totH.strokeGoals} goles)`,
    `📈 *Tasa Conversión:* ${totH.conversion}% de ingresos terminaron en gol`,
    `🟨 *Tarjetas Regatas:* 🟩 ${totH.green} • 🟨 ${totH.yellow} • 🟥 ${totH.red}`,
    ``,
    `📋 *DESGLOSE CUARTO POR CUARTO:*`,
    `*1°C:* Regatas ${q[1].home.goals}-${q[1].away.goals} | Ing: ${q[1].home.entries} vs ${q[1].away.entries} | CC: ${q[1].home.corners} (${q[1].home.cornerGoals}g) | Índice: ${q[1].performanceIndex > 0 ? '+' : ''}${q[1].performanceIndex} pts`,
    `*2°C:* Regatas ${q[2].home.goals}-${q[2].away.goals} | Ing: ${q[2].home.entries} vs ${q[2].away.entries} | CC: ${q[2].home.corners} (${q[2].home.cornerGoals}g) | Índice: ${q[2].performanceIndex > 0 ? '+' : ''}${q[2].performanceIndex} pts`,
    `*3°C:* Regatas ${q[3].home.goals}-${q[3].away.goals} | Ing: ${q[3].home.entries} vs ${q[3].away.entries} | CC: ${q[3].home.corners} (${q[3].home.cornerGoals}g) | Índice: ${q[3].performanceIndex > 0 ? '+' : ''}${q[3].performanceIndex} pts`,
    `*4°C:* Regatas ${q[4].home.goals}-${q[4].away.goals} | Ing: ${q[4].home.entries} vs ${q[4].away.entries} | CC: ${q[4].home.corners} (${q[4].home.cornerGoals}g) | Índice: ${q[4].performanceIndex > 0 ? '+' : ''}${q[4].performanceIndex} pts`,
    ``,
    `⚡ *Rendimiento Táctico:*`,
    `• ⭐ *Mejor Cuarto (Índice Integral):* ${stats.bestQByPerformance.q}° Cuarto (${stats.bestQByPerformance.val > 0 ? '+' : ''}${stats.bestQByPerformance.val} pts: Regatas ${stats.bestQByPerformance.hGoals}-${stats.bestQByPerformance.aGoals} | ${stats.bestQByPerformance.hEntries} vs ${stats.bestQByPerformance.aEntries} ing)`,
    `• 📥 *Mayor Presión Ofensiva:* ${stats.bestQByEntries.q}° Cuarto (${stats.bestQByEntries.val} ingresos al área rival)`,
    ``,
    `_Generado desde la App Oficial de Citaciones y Botonera DT de Regatas Andino B_`
  ];

  const fullText = lines.join('\n');
  const waUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
  window.open(waUrl, '_blank');
}

// ============================================================================


// ============================================================================
// GENERADOR DE IMAGEN TÁCTICA / ESTADÍSTICA (CANVAS HD)
// ============================================================================
async function exportStatsVisualCard() {
  const filterSelect = document.getElementById('selectStatsMatchFilter');
  const selectedLabel = filterSelect && filterSelect.options[filterSelect.selectedIndex] 
    ? filterSelect.options[filterSelect.selectedIndex].text 
    : 'Todos los Partidos';

  showToast('🎨 Generando reporte táctico visual...');

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

  const magentaRadial = ctx.createRadialGradient(W * 0.85, H * 0.85, 20, W * 0.85, H * 0.85, 500);
  magentaRadial.addColorStop(0, 'rgba(37, 99, 235, 0.12)');
  magentaRadial.addColorStop(1, 'rgba(37, 99, 235, 0)');
  ctx.fillStyle = magentaRadial;
  ctx.fillRect(0, 0, W, H);

  // Marco exterior
  ctx.strokeStyle = 'rgba(0, 162, 255, 0.35)';
  ctx.lineWidth = 4;
  roundRect(24, 24, W - 48, H - 48, 28, false, true);

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
  ctx.fillText('PLANTEL SUPERIOR DAMAS B', 180, 126);

  // Badge Reporte Táctico
  const badgeText = statsActiveSubTab === 'trends' ? 'TENDENCIAS DE TEMPORADA' : 'DESGLOSE POR CUARTOS';
  ctx.font = '800 13px system-ui, -apple-system, sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 24;
  ctx.fillStyle = 'rgba(0, 162, 255, 0.2)';
  ctx.strokeStyle = '#00a2ff';
  ctx.lineWidth = 1.5;
  roundRect(W - 60 - badgeW, 68, badgeW, 30, 8, true, true);
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, W - 60 - (badgeW / 2), 88);

  // Muestra seleccionada
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(60, 175, W - 120, 52, 12, true, true);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('📊 MUESTRA:', 85, 207);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 17px system-ui, -apple-system, sans-serif';
  ctx.fillText(selectedLabel.toUpperCase(), 200, 207);

  if (statsActiveSubTab === 'trends') {
    // -------------------------------------------------------------
    // CONTENIDO: TENDENCIAS DE TEMPORADA
    // -------------------------------------------------------------
    const trends = getSeasonTrendsData(statsCurrentSelectedFilter);
    const h1 = trends.halves.first;
    const h2 = trends.halves.second;
    const goalDiffStr = trends.goalDiff > 0 ? `+${trends.goalDiff}` : `${trends.goalDiff}`;

    // 4 KPI Cards Grid (2x2)
    const cardY = 250;
    const cardW = (W - 120 - 24) / 2;
    const cardH = 145;

    const kpis = [
      {
        title: '🏆 RÉCORD Y PUNTOS',
        val: `${trends.wins}V  ${trends.draws}E  ${trends.losses}D`,
        sub: `${trends.points} pts • ${trends.pointsEff}% efectividad (${trends.playedCount} PJ)`,
        accent: '#38bdf8'
      },
      {
        title: '⚽ GOLES (TOTAL TEMPORADA)',
        val: `${trends.totalGF} GF  vs  ${trends.totalGC} GC`,
        sub: `Diferencial de gol: ${goalDiffStr}`,
        accent: '#34d399'
      },
      {
        title: '🎯 INGRESOS AL ÁREA',
        val: `${trends.avgEntriesHome}  vs  ${trends.avgEntriesAway}`,
        sub: 'Promedio Regatas vs Rivales por partido',
        accent: '#fbbf24'
      },
      {
        title: '🏑 CÓRNERS CORTOS',
        val: `${trends.cornerEffHome}%  /  ${trends.cornerDefHome}%`,
        sub: `Ataque (${trends.cornerGoalsHome}/${trends.totalCornersHome} CC) • Defensa (${trends.cornerGoalsAway} recibidos)`,
        accent: '#a78bfa'
      }
    ];

    kpis.forEach((kpi, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const kx = 60 + col * (cardW + 24);
      const ky = cardY + row * (cardH + 20);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      roundRect(kx, ky, cardW, cardH, 16, true, true);

      // Línea superior de acento
      ctx.fillStyle = kpi.accent;
      ctx.fillRect(kx + 20, ky + 4, cardW - 40, 3);

      ctx.textAlign = 'left';
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.fillText(kpi.title, kx + 24, ky + 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.fillText(kpi.val, kx + 24, ky + 82);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillText(kpi.sub, kx + 24, ky + 118);
    });

    // Diagnóstico 1T vs 2T Box
    const halvesY = 585;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(60, halvesY, W - 120, 215, 18, true, true);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#00a2ff';
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.fillText('⏱️ DIAGNÓSTICO COMPARATIVO: 1° TIEMPO vs 2° TIEMPO', 90, halvesY + 42);

    // Columna 1T
    const hBoxW = (W - 120 - 70) / 2;
    ctx.fillStyle = 'rgba(0, 162, 255, 0.08)';
    ctx.strokeStyle = 'rgba(0, 162, 255, 0.25)';
    roundRect(90, halvesY + 62, hBoxW, 125, 12, true, true);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillText('1° TIEMPO (1°C + 2°C)', 110, halvesY + 95);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`⚽ Goles: ${h1.goalsHome} a favor  /  ${h1.goalsAway} en contra`, 110, halvesY + 130);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`🎯 Ingresos al Área: ${h1.entriesHome} Regatas vs ${h1.entriesAway} rivales`, 110, halvesY + 160);

    // Columna 2T
    const h2X = 90 + hBoxW + 30;
    ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
    roundRect(h2X, halvesY + 62, hBoxW, 125, 12, true, true);

    ctx.fillStyle = '#34d399';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillText('2° TIEMPO (3°C + 4°C)', h2X + 20, halvesY + 95);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`⚽ Goles: ${h2.goalsHome} a favor  /  ${h2.goalsAway} en contra`, h2X + 20, halvesY + 130);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`🎯 Ingresos al Área: ${h2.entriesHome} Regatas vs ${h2.entriesAway} rivales`, h2X + 20, halvesY + 160);

    // Top Goleadoras Box
    const topY = 825;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(60, topY, W - 120, 160, 18, true, true);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.fillText('⭐ TOP GOLEADORAS DEL EQUIPO', 90, topY + 44);

    if (trends.scorersList && trends.scorersList.length > 0) {
      const topStr = trends.scorersList.slice(0, 4).map((s, i) => `${i + 1}. ${s.name} (${s.total} gol${s.total === 1 ? '' : 'es'})`).join('    •    ');
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText(topStr, 90, topY + 86);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText('No se registran goleadoras individuales en esta muestra', 90, topY + 86);
    }

    if (trends.cornersWonList && trends.cornersWonList.length > 0) {
      ctx.fillStyle = '#c084fc';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.fillText('🏑 GENERADORAS DE CORTO:', 90, topY + 128);

      const topCStr = trends.cornersWonList.slice(0, 3).map((c, i) => `${i + 1}. ${c.name} (${c.total} CC)`).join('   •   ');
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText(topCStr, 345, topY + 128);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillText('Datos sincronizados directamente desde la botonera táctica oficial.', 90, topY + 128);
    }

  } else {
    // -------------------------------------------------------------
    // CONTENIDO: DESGLOSE POR CUARTOS
    // -------------------------------------------------------------
    const stats = getAggregatedQuarterStats(statsCurrentSelectedFilter);
    const q = stats.quarters;
    const totH = q.total.home;
    const totA = q.total.away;

    // Resumen General Scorecard
    const scoreY = 250;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(60, scoreY, W - 120, 110, 18, true, true);

    const miniMetrics = [
      { l: 'MARCADOR', v: `${totH.goals} - ${totA.goals}`, c: '#ffffff' },
      { l: 'INGRESOS TOTALES', v: `${totH.entries} vs ${totA.entries}`, c: '#38bdf8' },
      { l: 'CÓRNERS CORTOS', v: `${totH.corners} vs ${totA.corners}`, c: '#34d399' },
      { l: 'CONVERSIÓN ÁREA', v: `${totH.conversion}%`, c: '#fbbf24' }
    ];

    const colW = (W - 120) / 4;
    miniMetrics.forEach((m, i) => {
      const mx = 60 + i * colW + (colW / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.fillText(m.l, mx, scoreY + 40);

      ctx.fillStyle = m.c;
      ctx.font = '900 26px system-ui, sans-serif';
      ctx.fillText(m.v, mx, scoreY + 82);
    });

    // Tabla Cuarto por Cuarto
    const tableY = 385;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(60, tableY, W - 120, 395, 18, true, true);

    // Cabecera de la tabla
    ctx.fillStyle = 'rgba(0, 162, 255, 0.12)';
    roundRect(60, tableY, W - 120, 52, 18, true, false);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 15px system-ui, sans-serif';
    ctx.fillText('MÉTRICA / INCIDENCIA', 90, tableY + 33);

    const cols = [570, 680, 790, 900, 990];
    const colLabels = ['1°C', '2°C', '3°C', '4°C', 'TOTAL'];
    ctx.textAlign = 'center';
    cols.forEach((cx, cIdx) => {
      ctx.fillStyle = cIdx === 4 ? '#34d399' : '#ffffff';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.fillText(colLabels[cIdx], cx, tableY + 33);
    });

    // Filas de la tabla
    const rows = [
      {
        label: '⚽ Goles (Regatas vs Rival)',
        qVals: [1, 2, 3, 4].map(idx => `${q[idx].home.goals} - ${q[idx].away.goals}`),
        totVal: `${totH.goals} - ${totA.goals}`,
        highlight: true
      },
      {
        label: '🎯 Ingresos al Área (Reg vs Riv)',
        qVals: [1, 2, 3, 4].map(idx => `${q[idx].home.entries} vs ${q[idx].away.entries}`),
        totVal: `${totH.entries} vs ${totA.entries}`
      },
      {
        label: '🏑 Córners Cortos (Reg vs Riv)',
        qVals: [1, 2, 3, 4].map(idx => `${q[idx].home.corners} vs ${q[idx].away.corners}`),
        totVal: `${totH.corners} vs ${totA.corners}`
      },
      {
        label: '🥅 Goles de Corto (Reg vs Riv)',
        qVals: [1, 2, 3, 4].map(idx => `${q[idx].home.cornerGoals} vs ${q[idx].away.cornerGoals}`),
        totVal: `${totH.cornerGoals} vs ${totA.cornerGoals}`
      },
      {
        label: '🎯 Penales / Strokes (Reg vs Riv)',
        qVals: [1, 2, 3, 4].map(idx => `${q[idx].home.strokes} vs ${q[idx].away.strokes}`),
        totVal: `${totH.strokes} vs ${totA.strokes}`
      },
      {
        label: '🟨 Tarjetas Regatas (V-A-R)',
        qVals: [1, 2, 3, 4].map(idx => `${q[idx].home.green}-${q[idx].home.yellow}-${q[idx].home.red}`),
        totVal: `${totH.green}-${totH.yellow}-${totH.red}`
      }
    ];

    rows.forEach((row, rIdx) => {
      const ry = tableY + 52 + (rIdx * 56);
      if (rIdx % 2 === 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.fillRect(60, ry, W - 120, 56);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = row.highlight ? '#38bdf8' : '#ffffff';
      ctx.font = row.highlight ? '900 16px system-ui, sans-serif' : '600 15px system-ui, sans-serif';
      ctx.fillText(row.label, 90, ry + 35);

      ctx.textAlign = 'center';
      cols.forEach((cx, cIdx) => {
        const val = cIdx === 4 ? row.totVal : row.qVals[cIdx];
        ctx.fillStyle = cIdx === 4 ? '#34d399' : (row.highlight ? '#ffffff' : '#94a3b8');
        ctx.font = cIdx === 4 ? '900 16px system-ui, sans-serif' : '600 15px system-ui, sans-serif';
        ctx.fillText(val, cx, ry + 35);
      });
    });

    // Insight Clave Box
    const insightY = 810;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(60, insightY, W - 120, 175, 18, true, true);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#34d399';
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.fillText('💡 INSIGHT TÁCTICO DESTACADO', 90, insightY + 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(`Mejor cuarto integral: ${stats.bestQByPerformance.q}° Cuarto (${stats.bestQByPerformance.val > 0 ? '+' : ''}${stats.bestQByPerformance.val} pts | Regatas ${stats.bestQByPerformance.hGoals}-${stats.bestQByPerformance.aGoals} | ${stats.bestQByPerformance.hEntries} vs ${stats.bestQByPerformance.aEntries} ing).`, 90, insightY + 88);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`Muestra analizada: ${stats.matchesCount} partido(s) • ${stats.totalEventsCount} incidencias oficiales cargadas.`, 90, insightY + 128);
  }

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
      showToast('⚠️ Error al generar la imagen estadística.');
      return;
    }
    const cleanSub = statsActiveSubTab === 'trends' ? 'tendencias' : 'cuartos';
    const cleanFilter = selectedLabel.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const fileName = `regatas-${cleanSub}-${cleanFilter}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Reporte Estadístico - Regatas Andino B`,
          text: `Reporte oficial de estadísticas tácticas: Regatas Andino B (${selectedLabel})`
        });
        showToast('📲 ¡Reporte compartido con éxito!');
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
    showToast('📸 ¡Reporte táctico descargado!');
  }, 'image/png');
}

window.exportStatsVisualCard = exportStatsVisualCard;
