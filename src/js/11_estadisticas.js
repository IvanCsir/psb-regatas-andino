// VISTA 5: APARTADO DE ESTADÍSTICAS & ANÁLISIS DE RENDIMIENTO POR CUARTOS
// ============================================================================

let statsCurrentSelectedFilter = 'all';

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
    showToast('📈 Acceso concedido a Estadísticas por Cuartos');
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
    if (passInput) passInput.select();
  }
}

// Llenado del selector de partidos a analizar
function populateStatsMatchFilter() {
  const select = document.getElementById('selectStatsMatchFilter');
  if (!select) return;

  const currentVal = select.value || statsCurrentSelectedFilter || 'all';
  let html = `<option value="all">🌟 Todos los Partidos (Acumulado General)</option>`;

  // Partidos guardados en dtMatchesStore
  const matchKeys = Object.keys(dtMatchesStore || {});
  if (matchKeys.length > 0) {
    html += `<optgroup label="📋 Partidos Registrados">`;
    matchKeys.forEach(k => {
      const m = dtMatchesStore[k];
      if (!m) return;
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

  // Colección de partidos a incluir
  let targetMatches = [];
  if (selectedKey === 'all') {
    targetMatches = Object.values(dtMatchesStore || {});
    // Si no hay partidos registrados en store, considerar al menos el actual
    if (targetMatches.length === 0 && dtMatchState) {
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

  // Insights tácticos
  let bestQByGoals = { q: 1, val: -1 };
  let bestQByEntries = { q: 1, val: -1 };
  let bestQByDiff = { q: 1, val: -999 };
  let hardestQDef = { q: 1, val: -1 };

  for (let q = 1; q <= 4; q++) {
    const hGoals = quarters[q].home.goals;
    const hEntries = quarters[q].home.entries;
    const diff = hGoals - quarters[q].away.goals;
    const aEntries = quarters[q].away.entries;

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
      hardestQDef = { q, val: aEntries, goals: quarters[q].away.goals };
    }
  }

  return {
    selectedKey,
    matchesCount: targetMatches.length,
    matchesWithDataCount,
    totalEventsCount,
    quarters,
    bestQByGoals,
    bestQByEntries,
    bestQByDiff,
    hardestQDef
  };
}

// Renderizado principal del Dashboard de Estadísticas
function renderAnalyticsDashboard(selectedKey = 'all') {
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
          <span class="stats-kpi-title">MEJOR CUARTO</span>
        </div>
        <div class="stats-kpi-val">${stats.bestQByEntries.q}° Cuarto</div>
        <div class="stats-kpi-sub">${stats.bestQByEntries.val} ingresos y ${stats.bestQByGoals.val} goles marcados</div>
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
      let badgeHtml = '';
      if (qGoalDiff > 0) {
        badgeHtml = `<span class="stats-quarter-badge stats-badge-win">Ganado +${qGoalDiff} (${qH.goals}-${qA.goals})</span>`;
      } else if (qGoalDiff === 0) {
        badgeHtml = `<span class="stats-quarter-badge stats-badge-draw">Empatado (${qH.goals}-${qA.goals})</span>`;
      } else {
        badgeHtml = `<span class="stats-quarter-badge stats-badge-loss">Abajo ${qGoalDiff} (${qH.goals}-${qA.goals})</span>`;
      }

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
        </tbody>
      </table>
    `;
  }
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
      sheetsToFetch = allM.map(m => getDtMatchSheetName({ round: m.round, rivalName: m.rival }));
      if (!sheetsToFetch.includes('Fecha 12 - MURIALDO B')) {
        sheetsToFetch.push('Fecha 12 - MURIALDO B');
      }
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
  const stats = getAggregatedQuarterStats(statsCurrentSelectedFilter);
  const q = stats.quarters;
  const totH = q.total.home;
  const totA = q.total.away;

  const filterSelect = document.getElementById('selectStatsMatchFilter');
  const selectedLabel = filterSelect && filterSelect.options[filterSelect.selectedIndex] 
    ? filterSelect.options[filterSelect.selectedIndex].text 
    : 'Todos los Partidos';

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
    `*1°C:* Regatas ${q[1].home.goals}-${q[1].away.goals} | Ing: ${q[1].home.entries} vs ${q[1].away.entries} | CC: ${q[1].home.corners} (${q[1].home.cornerGoals}g)`,
    `*2°C:* Regatas ${q[2].home.goals}-${q[2].away.goals} | Ing: ${q[2].home.entries} vs ${q[2].away.entries} | CC: ${q[2].home.corners} (${q[2].home.cornerGoals}g)`,
    `*3°C:* Regatas ${q[3].home.goals}-${q[3].away.goals} | Ing: ${q[3].home.entries} vs ${q[3].away.entries} | CC: ${q[3].home.corners} (${q[3].home.cornerGoals}g)`,
    `*4°C:* Regatas ${q[4].home.goals}-${q[4].away.goals} | Ing: ${q[4].home.entries} vs ${q[4].away.entries} | CC: ${q[4].home.corners} (${q[4].home.cornerGoals}g)`,
    ``,
    `⚡ *Insight Clave:* Mejor cuarto ofensivo: ${stats.bestQByEntries.q}° Cuarto (${stats.bestQByEntries.val} ingresos y ${stats.bestQByGoals.val} goles)`,
    ``,
    `_Generado desde la App Oficial de Citaciones y Botonera DT de Regatas Andino B_`
  ];

  const fullText = lines.join('\n');
  const waUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
  window.open(waUrl, '_blank');
}

// ============================================================================
