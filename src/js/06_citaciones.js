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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matchData));
  } catch (e) {
    console.warn('[Storage] No se pudo guardar en localStorage:', e);
  }
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

    img.onerror = () => {
      container.innerHTML = `<span class="team-badge-initial" style="color: ${fallbackColor};">${initial}</span>`;
      applyRivalCircleColor(fallbackColor);
    };

    // Intentar extraer el color predominante usando una imagen auxiliar en segundo plano
    try {
      const probeImg = new Image();
      probeImg.crossOrigin = 'anonymous';
      probeImg.src = matchData.rivalLogo;
      extractDominantImageColor(probeImg, (dominantColor) => {
        if (dominantColor) {
          applyRivalCircleColor(dominantColor);
        }
      });
    } catch (e) {
      // Ignorar fallo de extracción, la imagen principal se muestra de todos modos
    }

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
    listContainer.innerHTML = '<div style="text-align: center; color: #9bb1d6; padding: 28px 16px; font-size: 0.92rem; line-height: 1.5;">' +
      '<div style="font-size: 2rem; margin-bottom: 8px;">📡</div>' +
      '<strong style="color: #ffffff;">Esperando sincronización de citadas</strong><br>' +
      '<span style="font-size: 0.8rem; color: #64748b;">Conectate a internet para ver la citación oficial en vivo desde la planilla.</span>' +
      '</div>';
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
