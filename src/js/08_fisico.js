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

// SECCIÓN DE EVALUACIONES FÍSICAS
// ============================================================================

function setupPhysicalSection() {
  const inputSearch = document.getElementById('inputSearchPlayer');
  const btnClear = document.getElementById('btnClearSearch');
  const filterChips = document.getElementById('physFilterChips');
  const btnChange = document.getElementById('btnChangePlayer');
  const btnModePlayers = document.getElementById('btnPhysModePlayers');
  const btnModeAverages = document.getElementById('btnPhysModeAverages');
  const btnModeTop10 = document.getElementById('btnPhysModeTop10');
  const benchScopePills = document.getElementById('benchmarkScopePills');

  // Cargar datos cacheados si existen
  const cached = localStorage.getItem(PHYSICAL_STORAGE_KEY);
  if (cached) {
    try {
      physicalPlayers = JSON.parse(cached);
      physicalCategoryAverages = calculateCategoryAverages();
      if (currentPhysViewMode === 'averages') {
        renderCategoryAverages(currentPhysFilter);
      } else if (currentPhysViewMode === 'top10') {
        renderTop10Panel();
      } else {
        renderPhysicalSuggestions();
      }
    } catch (e) {}
  }

  // Input de Búsqueda
  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      const q = inputSearch.value.trim();
      if (btnClear) btnClear.style.display = q ? 'block' : 'none';
      const suggestList = document.getElementById('playersSuggestList');
      if (suggestList) suggestList.style.display = 'flex';
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

  // Selector de Modo: Jugadoras vs Medias vs Top 10
  if (btnModePlayers) {
    btnModePlayers.addEventListener('click', () => {
      switchPhysicalViewMode('players');
    });
  }

  if (btnModeAverages) {
    btnModeAverages.addEventListener('click', () => {
      switchPhysicalViewMode('averages');
    });
  }

  if (btnModeTop10) {
    btnModeTop10.addEventListener('click', () => {
      switchPhysicalViewMode('top10');
    });
  }

  // Chips de Filtro (Categoría)
  if (filterChips) {
    filterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      filterChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPhysFilter = chip.getAttribute('data-filter') || 'all';

      if (currentPhysViewMode === 'averages') {
        renderCategoryAverages(currentPhysFilter);
      } else if (currentPhysViewMode === 'top10') {
        renderTop10Panel();
      } else {
        const q = inputSearch ? inputSearch.value.trim() : '';
        renderPhysicalSuggestions(q);
      }
    });
  }

  // Selector de Alcance de Comparativa en Perfil (Categoría vs Plantel Completo)
  if (benchScopePills) {
    benchScopePills.addEventListener('click', (e) => {
      const pill = e.target.closest('.bench-pill');
      if (!pill) return;

      benchScopePills.querySelectorAll('.bench-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentPhysBenchmarkScope = pill.getAttribute('data-scope') || 'category';

      if (selectedPlayerId) {
        const p = physicalPlayers.find(pl => pl.id === selectedPlayerId);
        if (p) renderPlayerCard(p);
      }
    });
  }

  // Botón Cambiar Jugadora (Cerrar ficha)
  if (btnChange) {
    btnChange.addEventListener('click', () => {
      selectedPlayerId = null;
      const profileCard = document.getElementById('playerProfileCard');
      const emptyState = document.getElementById('emptyPlayerState');
      const suggestList = document.getElementById('playersSuggestList');
      if (profileCard) profileCard.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      if (suggestList) suggestList.style.display = 'flex';
      if (inputSearch) {
        inputSearch.value = '';
        inputSearch.focus();
      }
      renderPhysicalSuggestions();
    });
  }
}

// Conmutar entre Modo Jugadoras, Modo Medias y Modo Top 10
function switchPhysicalViewMode(mode) {
  currentPhysViewMode = mode;
  const btnPlayers = document.getElementById('btnPhysModePlayers');
  const btnAverages = document.getElementById('btnPhysModeAverages');
  const btnTop10 = document.getElementById('btnPhysModeTop10');
  const suggestList = document.getElementById('playersSuggestList');
  const searchWrapper = document.querySelector('.search-input-wrapper');
  const avgPanel = document.getElementById('categoryAveragesPanel');
  const top10Panel = document.getElementById('physTop10Panel');
  const profileCard = document.getElementById('playerProfileCard');
  const emptyState = document.getElementById('emptyPlayerState');
  const inputSearch = document.getElementById('inputSearchPlayer');

  if (btnPlayers) btnPlayers.classList.toggle('active', mode === 'players');
  if (btnAverages) btnAverages.classList.toggle('active', mode === 'averages');
  if (btnTop10) btnTop10.classList.toggle('active', mode === 'top10');

  if (mode === 'averages') {
    if (suggestList) suggestList.style.display = 'none';
    if (searchWrapper) searchWrapper.style.display = 'none';
    if (profileCard) profileCard.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (top10Panel) top10Panel.style.display = 'none';
    if (avgPanel) avgPanel.style.display = 'flex';
    renderCategoryAverages(currentPhysFilter);
  } else if (mode === 'top10') {
    if (suggestList) suggestList.style.display = 'none';
    if (searchWrapper) searchWrapper.style.display = 'none';
    if (profileCard) profileCard.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (avgPanel) avgPanel.style.display = 'none';
    if (top10Panel) top10Panel.style.display = 'flex';
    renderTop10Panel();
  } else {
    // Modo Jugadoras
    if (searchWrapper) searchWrapper.style.display = 'flex';
    if (avgPanel) avgPanel.style.display = 'none';
    if (top10Panel) top10Panel.style.display = 'none';

    if (selectedPlayerId) {
      if (profileCard) profileCard.style.display = 'flex';
      if (emptyState) emptyState.style.display = 'none';
      if (suggestList) suggestList.style.display = 'none';
      const p = physicalPlayers.find(pl => pl.id === selectedPlayerId);
      if (p) renderPlayerCard(p);
    } else {
      if (profileCard) profileCard.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      if (suggestList) suggestList.style.display = 'flex';
      renderPhysicalSuggestions(inputSearch ? inputSearch.value.trim() : '');
    }
  }
}

// Calcular Medias de Cada Evaluación por Categoría y Plantel Completo
function calculateCategoryAverages() {
  if (!physicalPlayers || physicalPlayers.length === 0) return null;

  const categories = [
    { key: 'all', label: 'Todo el Plantel', filter: () => true },
    { key: '1ra', label: '1ra División', filter: p => p.filterTag === '1ra' },
    { key: 'Inter', label: 'Intermedia', filter: p => p.filterTag === 'Inter' },
    { key: '5ta', label: '5ta División', filter: p => p.filterTag === '5ta' }
  ];

  const result = {};

  categories.forEach(cat => {
    const playersInCat = physicalPlayers.filter(cat.filter);
    const testsStats = {};

    TESTS_CONFIG.forEach(cfg => {
      const rounds = {
        1: { count: 0, sum: 0, avg: null },
        2: { count: 0, sum: 0, avg: null },
        3: { count: 0, sum: 0, avg: null }
      };

      const latestVals = [];

      playersInCat.forEach(p => {
        const pTest = p.tests ? p.tests[cfg.key] : null;
        if (!pTest || !pTest.evals || pTest.evals.length === 0) return;

        pTest.evals.forEach(ev => {
          if (ev.round >= 1 && ev.round <= 3 && typeof ev.value === 'number') {
            rounds[ev.round].count++;
            rounds[ev.round].sum += ev.value;
          }
        });

        const lastEv = pTest.evals[pTest.evals.length - 1];
        if (lastEv && typeof lastEv.value === 'number') {
          latestVals.push(lastEv.value);
        }
      });

      // Medias de cada ronda (1°, 2°, 3° evaluación)
      [1, 2, 3].forEach(r => {
        if (rounds[r].count > 0) {
          rounds[r].avg = +(rounds[r].sum / rounds[r].count).toFixed(cfg.decimals !== undefined ? cfg.decimals : 2);
        }
      });

      // Media general / última medición
      let latestAvg = null;
      if (latestVals.length > 0) {
        const sum = latestVals.reduce((a, b) => a + b, 0);
        latestAvg = +(sum / latestVals.length).toFixed(cfg.decimals !== undefined ? cfg.decimals : 2);
      }

      // Evolución de la media del grupo entre primera y última evaluación disponible
      let diff = null;
      let diffPct = null;
      let improved = null;
      const validRoundKeys = [1, 2, 3].filter(r => rounds[r].avg !== null);
      if (validRoundKeys.length >= 2) {
        const firstR = validRoundKeys[0];
        const lastR = validRoundKeys[validRoundKeys.length - 1];
        diff = +(rounds[lastR].avg - rounds[firstR].avg).toFixed(cfg.decimals !== undefined ? cfg.decimals : 2);
        diffPct = rounds[firstR].avg !== 0 ? +((diff / rounds[firstR].avg) * 100).toFixed(1) : 0;
        improved = cfg.higherIsBetter ? (diff > 0) : (diff < 0);
      }

      testsStats[cfg.key] = {
        config: cfg,
        rounds,
        latestAvg,
        latestCount: latestVals.length,
        diff,
        diffPct,
        improved
      };
    });

    result[cat.key] = {
      key: cat.key,
      label: cat.label,
      playerCount: playersInCat.length,
      tests: testsStats
    };
  });

  return result;
}

// Renderizar Panel de Medias de Evaluaciones por Categoría
function renderCategoryAverages(catFilter = 'all') {
  const container = document.getElementById('categoryAveragesPanel');
  if (!container) return;

  if (!physicalCategoryAverages) {
    physicalCategoryAverages = calculateCategoryAverages();
  }

  if (!physicalCategoryAverages) {
    container.innerHTML = '<div style="text-align: center; color: #9bb1d6; padding: 20px;">No hay evaluaciones físicas disponibles para calcular medias.</div>';
    return;
  }

  const catData = physicalCategoryAverages[catFilter] || physicalCategoryAverages['all'];
  if (!catData) return;

  const testCardsHtml = TESTS_CONFIG.map(cfg => {
    const tData = catData.tests[cfg.key];
    const unit = cfg.unit ? ` ${cfg.unit}` : '';

    if (!tData || tData.latestCount === 0) {
      return `
        <div class="cat-avg-card">
          <div class="cat-avg-header">
            <div class="cat-avg-title-box">
              <span class="cat-avg-icon">${cfg.icon}</span>
              <div>
                <h4 class="cat-avg-name">${cfg.name}</h4>
                <span class="cat-avg-type">${cfg.type}</span>
              </div>
            </div>
            <div class="cat-avg-latest-val">
              <span class="cat-avg-num" style="color: var(--text-muted); font-size: 0.95rem;">Sin registros</span>
            </div>
          </div>
        </div>
      `;
    }

    // Badge de evolución de la media si existen 2+ rondas
    let diffBadgeHtml = '';
    if (tData.diff !== null) {
      const sign = tData.diff > 0 ? '+' : '';
      const pctSign = tData.diffPct > 0 ? '+' : '';
      if (tData.improved) {
        diffBadgeHtml = `<span class="test-diff-badge positive">${sign}${tData.diff}${unit} (${pctSign}${tData.diffPct}%) ↗ Evolución</span>`;
      } else if (tData.diff === 0) {
        diffBadgeHtml = `<span class="test-diff-badge neutral">= Media estable</span>`;
      } else {
        diffBadgeHtml = `<span class="test-diff-badge negative">${sign}${tData.diff}${unit} (${pctSign}${tData.diffPct}%) ↘</span>`;
      }
    }

    // Rondas evaluadas
    const roundsHtml = [1, 2, 3].map(r => {
      const rData = tData.rounds[r];
      const hasAvg = (rData && rData.avg !== null);
      const valStr = hasAvg ? `${rData.avg}<small>${cfg.unit}</small>` : '-';
      const countStr = hasAvg ? `${rData.count} evaluadas` : 'Sin registros';

      return `
        <div class="cat-avg-round-item">
          <span class="cat-avg-round-name">${r}° EVAL</span>
          <div class="cat-avg-round-num">${valStr}</div>
          <span class="cat-avg-round-count">${countStr}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="cat-avg-card">
        <div class="cat-avg-header">
          <div class="cat-avg-title-box">
            <span class="cat-avg-icon">${cfg.icon}</span>
            <div>
              <h4 class="cat-avg-name">${cfg.name}</h4>
              <span class="cat-avg-type">${cfg.type}</span>
            </div>
          </div>
          <div class="cat-avg-latest-val">
            <div class="cat-avg-num">${tData.latestAvg !== null ? tData.latestAvg : '-'}<small>${tData.latestAvg !== null ? cfg.unit : ''}</small></div>
            <div class="cat-avg-lbl">Media Actual</div>
          </div>
        </div>

        <div class="cat-avg-rounds-row">
          ${roundsHtml}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:6px; flex-wrap:wrap; gap:6px;">
          <button type="button" class="btn-card-top10" data-test="${cfg.key}">
            🏆 Ver Top 10 en ${cfg.name}
          </button>
          ${diffBadgeHtml ? `<div>${diffBadgeHtml}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="cat-avg-intro">
      <div class="cat-avg-intro-title">
        <span>📊</span> Medias de Rendimiento: <strong>${escapeHtml(catData.label)}</strong>
      </div>
      <span class="cat-avg-count-badge">${catData.playerCount} Jugadoras</span>
    </div>
    <div class="cat-avg-grid">
      ${testCardsHtml}
    </div>
  `;

  // Listener para el botón directo al Top 10 de ese test
  container.querySelectorAll('.btn-card-top10').forEach(btn => {
    btn.addEventListener('click', () => {
      const tKey = btn.getAttribute('data-test');
      if (tKey) currentTop10Test = tKey;
      switchPhysicalViewMode('top10');
    });
  });
}

// ============================================================================
// TOP 10 Y RANKINGS POR EVALUACIÓN
// ============================================================================

// Obtener ranking ordenado de jugadoras para un test físico
function getRankedPlayersForTest(testKey, categoryFilter = 'all', roundFilter = 'latest') {
  const cfg = TESTS_CONFIG.find(c => c.key === testKey);
  if (!cfg || !physicalPlayers || physicalPlayers.length === 0) return [];

  const catPlayers = (categoryFilter === 'all')
    ? physicalPlayers
    : physicalPlayers.filter(p => p.filterTag === categoryFilter);

  const rankedList = [];

  catPlayers.forEach(p => {
    const pTest = p.tests ? p.tests[testKey] : null;
    if (!pTest || !pTest.evals || pTest.evals.length === 0) return;

    let targetEv = null;
    let evalCount = 1;
    let roundLabelTag = '';

    if (roundFilter === 'latest') {
      targetEv = pTest.evals[pTest.evals.length - 1];
      roundLabelTag = `${targetEv ? targetEv.round : 1}° Eval`;
    } else if (roundFilter === 'best') {
      let best = null;
      pTest.evals.forEach(ev => {
        if (typeof ev.value !== 'number') return;
        if (!best) {
          best = ev;
        } else if (cfg.higherIsBetter ? (ev.value > best.value) : (ev.value < best.value)) {
          best = ev;
        }
      });
      targetEv = best;
      roundLabelTag = `${best ? best.round : 1}° Eval (Mejor)`;
    } else if (roundFilter === 'avg') {
      const validEvals = pTest.evals.filter(ev => typeof ev.value === 'number');
      if (validEvals.length > 0) {
        const sum = validEvals.reduce((acc, ev) => acc + ev.value, 0);
        const avg = +(sum / validEvals.length).toFixed(cfg.decimals !== undefined ? cfg.decimals : 2);
        targetEv = { value: avg, round: validEvals[validEvals.length - 1].round };
        evalCount = validEvals.length;
        roundLabelTag = validEvals.length > 1 ? `Promedio (${validEvals.length} evals)` : '1 eval';
      }
    } else {
      const rNum = parseInt(roundFilter, 10);
      targetEv = pTest.evals.find(ev => ev.round === rNum);
      roundLabelTag = `${rNum}° Eval`;
    }

    if (targetEv && typeof targetEv.value === 'number') {
      rankedList.push({
        id: p.id,
        name: p.name,
        divisionLabel: p.divisionLabel,
        filterTag: p.filterTag,
        value: targetEv.value,
        round: targetEv.round,
        evalCount,
        roundLabelTag
      });
    }
  });

  // Ordenar según el test (mayor o menor es mejor)
  if (cfg.higherIsBetter) {
    rankedList.sort((a, b) => b.value - a.value);
  } else {
    rankedList.sort((a, b) => a.value - b.value);
  }

  // Asignar puestos de ranking con desempate
  rankedList.forEach((item, idx) => {
    if (idx > 0 && item.value === rankedList[idx - 1].value) {
      item.rank = rankedList[idx - 1].rank;
    } else {
      item.rank = idx + 1;
    }
  });

  return rankedList;
}

// Obtener la posición de una jugadora en un test específico
function getPlayerRankInTest(playerId, testKey, categoryFilter = 'all', roundFilter = 'latest') {
  const ranked = getRankedPlayersForTest(testKey, categoryFilter, roundFilter);
  const found = ranked.find(p => p.id === playerId);
  return found ? { rank: found.rank, total: ranked.length, value: found.value } : null;
}

// Renderizar Panel de Top 10 por Evaluación
function renderTop10Panel() {
  const container = document.getElementById('physTop10Panel');
  if (!container) return;

  if (!physicalPlayers || physicalPlayers.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #9bb1d6; padding: 24px;">No hay evaluaciones físicas disponibles para calcular el Top 10.</div>';
    return;
  }

  let scopeLabel = 'Todo el Plantel';
  if (currentPhysFilter === '1ra') scopeLabel = '1ra División';
  if (currentPhysFilter === 'Inter') scopeLabel = 'Intermedia';
  if (currentPhysFilter === '5ta') scopeLabel = '5ta División';

  let roundLabel = 'Última Evaluación';
  if (currentTop10Round === 'best') roundLabel = 'Mejor Marca';
  if (currentTop10Round === 'avg') roundLabel = 'Promedio de Evaluaciones';
  if (currentTop10Round === '1') roundLabel = '1° Evaluación';
  if (currentTop10Round === '2') roundLabel = '2° Evaluación';
  if (currentTop10Round === '3') roundLabel = '3° Evaluación';

  // Pills de Tests
  const testPillsHtml = `
    <div class="top10-test-pills" id="top10TestPills">
      <button type="button" class="top10-test-pill ${currentTop10Test === 'all' ? 'active' : ''}" data-test="all">
        <span>📋</span> Todos los Tests
      </button>
      ${TESTS_CONFIG.map(cfg => `
        <button type="button" class="top10-test-pill ${currentTop10Test === cfg.key ? 'active' : ''}" data-test="${cfg.key}">
          <span>${cfg.icon}</span> ${cfg.name}
        </button>
      `).join('')}
    </div>
  `;

  // Barra de Selector de Ronda
  const roundBarHtml = `
    <div class="top10-round-bar">
      <span class="top10-round-label">Medición:</span>
      <div class="top10-round-pills" id="top10RoundPills">
        <button type="button" class="top10-round-pill ${currentTop10Round === 'latest' ? 'active' : ''}" data-round="latest">Última</button>
        <button type="button" class="top10-round-pill ${currentTop10Round === 'best' ? 'active' : ''}" data-round="best">Mejor Marca</button>
        <button type="button" class="top10-round-pill ${currentTop10Round === 'avg' ? 'active' : ''}" data-round="avg">Promedio</button>
        <button type="button" class="top10-round-pill ${currentTop10Round === '1' ? 'active' : ''}" data-round="1">1° Eval</button>
        <button type="button" class="top10-round-pill ${currentTop10Round === '2' ? 'active' : ''}" data-round="2">2° Eval</button>
        <button type="button" class="top10-round-pill ${currentTop10Round === '3' ? 'active' : ''}" data-round="3">3° Eval</button>
      </div>
    </div>
  `;

  // Tests a mostrar
  const testsToDisplay = (currentTop10Test === 'all')
    ? TESTS_CONFIG
    : TESTS_CONFIG.filter(cfg => cfg.key === currentTop10Test);

  const cardsHtml = testsToDisplay.map(cfg => {
    const fullRanked = getRankedPlayersForTest(cfg.key, currentPhysFilter, currentTop10Round);
    const top10 = fullRanked.slice(0, 10);

    let itemsHtml = '';
    if (top10.length === 0) {
      itemsHtml = '<div style="text-align: center; color: #9bb1d6; font-size: 0.8rem; padding: 14px;">No hay mediciones registradas en esta evaluación para el filtro actual.</div>';
    } else {
      itemsHtml = top10.map(item => {
        let rankClass = 'rank-other';
        let rankIcon = `#${item.rank}`;
        if (item.rank === 1) {
          rankClass = 'rank-1';
          rankIcon = '🥇';
        } else if (item.rank === 2) {
          rankClass = 'rank-2';
          rankIcon = '🥈';
        } else if (item.rank === 3) {
          rankClass = 'rank-3';
          rankIcon = '🥉';
        }

        let badgeClass = 'badge-1ra';
        if (item.filterTag === 'Inter') badgeClass = 'badge-inter';
        if (item.filterTag === '5ta') badgeClass = 'badge-5ta';

        return `
          <div class="top10-item" data-player-id="${item.id}" title="Ver ficha de ${escapeHtml(item.name)}">
            <div class="top10-rank-box">
              <span class="top10-rank-badge ${rankClass}">${rankIcon}</span>
              <div class="top10-player-info">
                <span class="top10-player-name">${escapeHtml(item.name)}</span>
                <div class="top10-player-meta">
                  <span class="suggest-player-badge ${badgeClass}">${item.divisionLabel}</span>
                  <span class="top10-round-tag">${escapeHtml(item.roundLabelTag || (item.round + '° Eval'))}</span>
                </div>
              </div>
            </div>
            <div class="top10-val-box">
              <div class="top10-val-num">${item.value}<small>${cfg.unit}</small></div>
            </div>
          </div>
        `;
      }).join('');
    }

    return `
      <div class="top10-card">
        <div class="top10-card-header">
          <div class="top10-card-title">
            <span class="top10-icon">${cfg.icon}</span>
            <div>
              <h4 class="top10-name">${cfg.name}</h4>
              <span class="top10-type">${cfg.type}</span>
            </div>
          </div>
          <span class="top10-scope-badge">${escapeHtml(scopeLabel)} • ${top10.length} clasificadas</span>
        </div>
        <div class="top10-items-list">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="top10-header-card">
      <span class="top10-badge">🏆 TABLA DE LÍDERES</span>
      <h3 class="top10-title">TOP 10 POR EVALUACIÓN</h3>
      <p class="top10-subtitle">Las mejores marcas físicas para <strong>${escapeHtml(scopeLabel)}</strong> (${roundLabel}). Tocá cualquier jugadora para ver su perfil completo.</p>
    </div>
    ${testPillsHtml}
    ${roundBarHtml}
    <div class="top10-grid">
      ${cardsHtml}
    </div>
  `;

  // Listeners de Selección de Test
  const pillsContainer = document.getElementById('top10TestPills');
  if (pillsContainer) {
    pillsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.top10-test-pill');
      if (!btn) return;
      currentTop10Test = btn.getAttribute('data-test') || 'all';
      renderTop10Panel();
    });
  }

  // Listeners de Selección de Ronda
  const roundContainer = document.getElementById('top10RoundPills');
  if (roundContainer) {
    roundContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.top10-round-pill');
      if (!btn) return;
      currentTop10Round = btn.getAttribute('data-round') || 'latest';
      renderTop10Panel();
    });
  }

  // Listeners para abrir la ficha de la jugadora al hacer clic en el Top 10
  container.querySelectorAll('.top10-item').forEach(el => {
    el.addEventListener('click', () => {
      const pId = el.getAttribute('data-player-id');
      if (pId) {
        switchPhysicalViewMode('players');
        selectPlayer(pId);
      }
    });
  });
}

// Cargar y Parsear Planilla de Evaluaciones Físicas
async function loadPhysicalEvaluations(manual = false) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${PHYSICAL_SPREADSHEET_ID}/gviz/tq?tqx=out:json&_t=${Date.now()}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
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
            diff = +(last - first).toFixed(cfg.decimals !== undefined ? cfg.decimals : 2);
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
      try {
        localStorage.setItem(PHYSICAL_STORAGE_KEY, JSON.stringify(physicalPlayers));
      } catch (e) {}

      // Calcular medias por categoría
      physicalCategoryAverages = calculateCategoryAverages();

      // Actualizar vista activa
      if (currentPhysViewMode === 'averages') {
        renderCategoryAverages(currentPhysFilter);
      } else if (currentPhysViewMode === 'top10') {
        renderTop10Panel();
      } else if (selectedPlayerId) {
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
  const suggestList = document.getElementById('playersSuggestList');

  if (profileCard) profileCard.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';
  if (suggestList) suggestList.style.display = 'none';

  // Scroll suave hacia la ficha en móviles
  profileCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Renderizar Perfil y Comparativas de la Jugadora vs Medias de Cada Evaluación
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

  // Asegurar medias de categorías calculadas
  if (!physicalCategoryAverages) {
    physicalCategoryAverages = calculateCategoryAverages();
  }

  // Determinar categoría para la comparativa
  const isCatScope = (currentPhysBenchmarkScope !== 'all');
  const benchCatKey = isCatScope ? (player.filterTag || '1ra') : 'all';
  const benchScopeName = isCatScope ? player.divisionLabel : 'Todo el Plantel';
  const benchScopeShort = isCatScope ? (player.filterTag === 'Inter' ? 'Inter' : (player.filterTag === '5ta' ? '5ta' : '1ra')) : 'Plantel';
  const catBenchmark = physicalCategoryAverages ? physicalCategoryAverages[benchCatKey] : null;

  // Actualizar estado visual de los botones de alcance de comparativa
  const pillCat = document.getElementById('btnBenchCategory');
  const pillAll = document.getElementById('btnBenchAll');
  if (pillCat) pillCat.classList.toggle('active', isCatScope);
  if (pillAll) pillAll.classList.toggle('active', !isCatScope);

  // Contar mejoras personales y marcas que superan la media
  let improvedCount = 0;
  let comparableCount = 0;
  let aboveAvgCount = 0;
  let benchCount = 0;

  testKeys.forEach(k => {
    const t = player.tests[k];
    const cfg = t.config;
    const evals = t.evals || [];

    if (evals.length >= 2) {
      comparableCount++;
      if (t.improved) improvedCount++;
    }

    if (evals.length > 0 && catBenchmark) {
      const lastEval = evals[evals.length - 1];
      const catTest = catBenchmark.tests[k];
      const catRoundAvg = (catTest?.rounds[lastEval.round]?.avg !== null && catTest?.rounds[lastEval.round]?.avg !== undefined)
        ? catTest.rounds[lastEval.round].avg
        : catTest?.latestAvg;

      if (catRoundAvg !== null && catRoundAvg !== undefined) {
        benchCount++;
        const diff = +(lastEval.value - catRoundAvg).toFixed(cfg.decimals !== undefined ? cfg.decimals : 2);
        const isSuperior = cfg.higherIsBetter ? (diff > 0) : (diff < 0);
        if (isSuperior) aboveAvgCount++;
      }
    }
  });

  if (summaryText) {
    const summaryParts = [];
    if (comparableCount > 0) {
      summaryParts.push(`📈 <strong>${improvedCount}/${comparableCount}</strong> tests con superación personal`);
    }
    if (benchCount > 0) {
      summaryParts.push(`⭐ <strong>${aboveAvgCount}/${benchCount}</strong> superan la media (${benchScopeShort})`);
    }
    summaryText.innerHTML = summaryParts.length > 0
      ? summaryParts.join(' &nbsp;•&nbsp; ')
      : 'Mediciones físicas registradas.';
  }

  if (!testsGrid) return;

  if (testKeys.length === 0) {
    testsGrid.innerHTML = '<div style="text-align: center; color: #9bb1d6; padding: 20px;">Esta jugadora aún no tiene mediciones cargadas en la planilla.</div>';
    return;
  }

  // Renderizar cada test físico con comparativa de media por cada evaluación
  testsGrid.innerHTML = testKeys.map(k => {
    const t = player.tests[k];
    const cfg = t.config;
    const evals = t.evals || [];
    const unit = cfg.unit ? ` ${cfg.unit}` : '';

    // Ranking en Top 10 si corresponde
    let rankPillHtml = '';
    const rankInfo = getPlayerRankInTest(player.id, k, benchCatKey, 'latest');
    if (rankInfo && rankInfo.rank <= 10) {
      let rankClass = 'rank-other';
      let medal = '🏆';
      if (rankInfo.rank === 1) { rankClass = 'rank-1'; medal = '🥇'; }
      else if (rankInfo.rank === 2) { rankClass = 'rank-2'; medal = '🥈'; }
      else if (rankInfo.rank === 3) { rankClass = 'rank-3'; medal = '🥉'; }
      rankPillHtml = `<span class="test-top10-pill ${rankClass}" title="Posición #${rankInfo.rank} de ${rankInfo.total} en ${benchScopeName}">${medal} #${rankInfo.rank} en ${benchScopeShort}</span>`;
    }

    // Badge de Evolución Personal
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

    // Fila de Cajas de Evaluación (con subtítulo de media de cada evaluación por categoría)
    const evalsBoxesHtml = evals.map((ev, i) => {
      const isLast = (i === evals.length - 1 && evals.length > 1);
      const highlightClass = isLast ? 'highlight' : '';
      const arrowHtml = (i < evals.length - 1) ? '<div class="eval-arrow">➔</div>' : '';

      // Media de esta evaluación específica
      let avgSubHtml = '';
      const catTest = catBenchmark ? catBenchmark.tests[k] : null;
      const rAvg = catTest?.rounds[ev.round]?.avg;
      if (rAvg !== null && rAvg !== undefined) {
        const rDiff = +(ev.value - rAvg).toFixed(cfg.decimals !== undefined ? cfg.decimals : 2);
        const isBetter = cfg.higherIsBetter ? (rDiff >= 0) : (rDiff <= 0);
        const rSign = rDiff > 0 ? '+' : '';
        const rColor = isBetter ? '#34d399' : '#f87171';
        avgSubHtml = `
          <span class="eval-box-avg" title="Media de ${benchScopeName}: ${rAvg}${cfg.unit}">
            Media ${benchScopeShort}: <strong style="color: #ffffff;">${rAvg}</strong>
            <span style="color: ${rColor}; font-size: 0.62rem; margin-left: 2px;">(${rSign}${rDiff})</span>
          </span>
        `;
      }

      return `
        <div class="eval-box ${highlightClass}">
          <span class="eval-label">${ev.round}° EVALUACIÓN</span>
          <span class="eval-val">${ev.value}<small>${cfg.unit}</small></span>
          ${avgSubHtml}
        </div>
        ${arrowHtml}
      `;
    }).join('');

    // Barra de Progreso Personal (si hay 2+ evaluaciones)
    let progressBarHtml = '';
    if (evals.length >= 2) {
      const values = evals.map(e => e.value);
      const maxVal = Math.max(...values) * 1.08;
      
      const barsHtml = evals.map((ev, i) => {
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

    // Box Comparativo Benchmark vs Media de la Categoría
    let benchmarkHtml = '';
    const lastEval = evals[evals.length - 1];
    const catTest = catBenchmark ? catBenchmark.tests[k] : null;
    const catRefAvg = (lastEval && catTest?.rounds[lastEval.round]?.avg !== null && catTest?.rounds[lastEval.round]?.avg !== undefined)
      ? catTest.rounds[lastEval.round].avg
      : catTest?.latestAvg;

    if (lastEval && catRefAvg !== null && catRefAvg !== undefined) {
      const playerVal = lastEval.value;
      const benchDiff = +(playerVal - catRefAvg).toFixed(cfg.decimals !== undefined ? cfg.decimals : 2);
      const benchDiffAbs = Math.abs(benchDiff);
      const benchPct = catRefAvg !== 0 ? +((benchDiffAbs / catRefAvg) * 100).toFixed(1) : 0;
      const isSuperior = cfg.higherIsBetter ? (benchDiff > 0) : (benchDiff < 0);
      const isIdentical = (benchDiff === 0);

      let bClass = 'positive';
      let bText = '';

      if (isIdentical) {
        bClass = 'neutral';
        bText = '= Igual a la media';
      } else if (isSuperior) {
        bClass = 'positive';
        if (cfg.higherIsBetter) {
          bText = `+${benchDiffAbs}${unit} (+${benchPct}%) Supera media`;
        } else {
          bText = `-${benchDiffAbs}${unit} (${benchPct}% más rápida)`;
        }
      } else {
        bClass = 'warning';
        if (cfg.higherIsBetter) {
          bText = `-${benchDiffAbs}${unit} (-${benchPct}%) Bajo la media`;
        } else {
          bText = `+${benchDiffAbs}${unit} (${benchPct}% sobre la media)`;
        }
      }

      const maxRef = Math.max(playerVal, catRefAvg) * 1.12;
      const playerWidthPct = Math.min(100, Math.max(12, (playerVal / maxRef) * 100));
      const avgWidthPct = Math.min(100, Math.max(12, (catRefAvg / maxRef) * 100));
      const playerFillClass = isSuperior ? 'player-better' : 'player-regular';

      benchmarkHtml = `
        <div class="test-benchmark-box">
          <div class="benchmark-header">
            <div class="benchmark-title">
              <span>📊</span> Comparativa vs Media (${benchScopeName})
            </div>
            <span class="benchmark-badge ${bClass}">${bText}</span>
          </div>
          <div class="benchmark-bars-wrapper">
            <div class="benchmark-bar-row">
              <span class="benchmark-bar-lbl">Jugadora:</span>
              <div class="benchmark-bar-track">
                <div class="benchmark-bar-fill ${playerFillClass}" style="width: ${playerWidthPct.toFixed(1)}%;"></div>
              </div>
              <span class="benchmark-bar-val">${playerVal}${unit}</span>
            </div>
            <div class="benchmark-bar-row">
              <span class="benchmark-bar-lbl">Media ${benchScopeShort}:</span>
              <div class="benchmark-bar-track">
                <div class="benchmark-bar-fill average-ref" style="width: ${avgWidthPct.toFixed(1)}%;"></div>
              </div>
              <span class="benchmark-bar-val">${catRefAvg}${unit}</span>
            </div>
          </div>
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
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            ${rankPillHtml}
            ${diffBadgeHtml}
          </div>
        </div>

        <div class="test-evals-row">
          ${evalsBoxesHtml}
        </div>

        ${progressBarHtml}

        ${benchmarkHtml}
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
