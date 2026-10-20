// ============================================================================
// MÓDULO 14: PRECARGA OFICIAL DE EQUIPOS EN SISTEMA AMH (ORACLE APEX)
// Exclusivo para Cuerpo Técnico - Seguro: Solo inscribe tildados, nunca cierra.
// ============================================================================

let currentAmhCategory = 'primera'; // 'primera' | 'intermedia'
let cachedAmhMatches = { primera: [], intermedia: [] };
let isAmhPrecargaInProgress = false;

function setupAmhPrecargaEvents() {
  const drawerBtn = document.getElementById('drawerBtnPrecargaAmh');
  const modal = document.getElementById('modalAmhPrecarga');
  const btnClose = document.getElementById('btnCloseAmhPrecarga');
  const btnCloseBottom = document.getElementById('btnCloseAmhPrecargaBottom');
  const btnRefreshMatches = document.getElementById('btnRefreshAmhMatches');
  const btnExecute = document.getElementById('btnExecuteAmhPrecarga');
  const tabPrimera = document.getElementById('tabAmhPrimera');
  const tabInter = document.getElementById('tabAmhIntermedia');

  if (drawerBtn) {
    drawerBtn.addEventListener('click', () => {
      closeNavDrawer();
      if (!isCtAuthenticated()) {
        openSheetsAuthModal(); // Abre el modal de contraseña de Cuerpo Técnico
      } else {
        openAmhPrecargaModal();
      }
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeAmhPrecargaModal);
  if (btnCloseBottom) btnCloseBottom.addEventListener('click', closeAmhPrecargaModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && !isAmhPrecargaInProgress) {
        closeAmhPrecargaModal();
      }
    });
  }

  if (tabPrimera) {
    tabPrimera.addEventListener('click', () => switchAmhPrecargaCategory('primera'));
  }
  if (tabInter) {
    tabInter.addEventListener('click', () => switchAmhPrecargaCategory('intermedia'));
  }

  if (btnRefreshMatches) {
    btnRefreshMatches.addEventListener('click', () => loadAmhMatchesForCategory(currentAmhCategory, true));
  }

  if (btnExecute) {
    btnExecute.addEventListener('click', handleExecuteAmhPrecarga);
  }
}

function openAmhPrecargaModal() {
  const modal = document.getElementById('modalAmhPrecarga');
  if (!modal) return;

  // Sincronizar con la categoría activa en la web si es posible
  const currentCat = (typeof currentCategory !== 'undefined' && currentCategory === 'intermedia') 
    ? 'intermedia' 
    : 'primera';
  
  switchAmhPrecargaCategory(currentCat);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAmhPrecargaModal() {
  if (isAmhPrecargaInProgress) {
    if (!confirm('La precarga en la AMH se está ejecutando. ¿Deseás cerrar la ventana? El proceso continuará en segundo plano.')) {
      return;
    }
  }
  const modal = document.getElementById('modalAmhPrecarga');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function switchAmhPrecargaCategory(cat) {
  currentAmhCategory = cat;
  const tabPrimera = document.getElementById('tabAmhPrimera');
  const tabInter = document.getElementById('tabAmhIntermedia');

  if (tabPrimera) tabPrimera.classList.toggle('active', cat === 'primera');
  if (tabInter) tabInter.classList.toggle('active', cat === 'intermedia');

  // Actualizar lista de jugadoras citadas
  renderAmhCitedPlayers(cat);

  // Cargar partidos disponibles en la AMH
  loadAmhMatchesForCategory(cat);

  // Resetear estados de resultado
  resetAmhPrecargaStatus();
}

function getCitedPlayersForCategory(cat) {
  try {
    if (typeof DEFAULT_MATCH_DATA !== 'undefined' && DEFAULT_MATCH_DATA[cat] && DEFAULT_MATCH_DATA[cat].players) {
      return DEFAULT_MATCH_DATA[cat].players;
    }
  } catch (e) {}
  return [];
}

function getRivalNameForCategory(cat) {
  try {
    if (typeof DEFAULT_MATCH_DATA !== 'undefined' && DEFAULT_MATCH_DATA.rival) {
      return DEFAULT_MATCH_DATA.rival;
    }
  } catch (e) {}
  return '';
}

function renderAmhCitedPlayers(cat) {
  const container = document.getElementById('amhCitedList');
  const countEl = document.getElementById('amhCitedCount');
  const rivalEl = document.getElementById('amhRivalBadge');
  const players = getCitedPlayersForCategory(cat);
  const rival = getRivalNameForCategory(cat);

  if (countEl) countEl.textContent = `${players.length} citadas`;
  if (rivalEl) rivalEl.textContent = rival ? `Rival: ${rival}` : 'Rival próximo';

  if (!container) return;

  if (players.length === 0) {
    container.innerHTML = '<span class="amh-no-players">No hay jugadoras citadas cargadas para esta categoría.</span>';
    return;
  }

  container.innerHTML = players.map((p, idx) => `
    <span class="amh-player-tag">
      <span class="amh-tag-num">${idx + 1}</span>
      <span class="amh-tag-name">${p}</span>
    </span>
  `).join('');
}

async function loadAmhMatchesForCategory(cat, forceRefresh = false) {
  const select = document.getElementById('selectAmhPartido');
  const refreshBtn = document.getElementById('btnRefreshAmhMatches');
  if (!select) return;

  const divId = cat === 'intermedia' ? '2' : '1';

  if (!forceRefresh && cachedAmhMatches[cat] && cachedAmhMatches[cat].length > 0) {
    populateAmhMatchesSelect(cachedAmhMatches[cat]);
    return;
  }

  select.innerHTML = '<option value="">Cargando partidos desde AMH...</option>';
  select.disabled = true;
  if (refreshBtn) refreshBtn.classList.add('spinning');

  try {
    const res = await fetch(`/api/torneo/precarga?matches=1&division=${divId}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.matches) && data.matches.length > 0) {
      cachedAmhMatches[cat] = data.matches;
      populateAmhMatchesSelect(data.matches);
    } else {
      select.innerHTML = '<option value="">No se encontraron partidos en AMH</option>';
    }
  } catch (err) {
    console.warn('[AMH] Error al cargar partidos:', err);
    select.innerHTML = '<option value="">Error al conectar con servidor AMH (usar detección automática)</option>';
  } finally {
    select.disabled = false;
    if (refreshBtn) refreshBtn.classList.remove('spinning');
  }
}

function populateAmhMatchesSelect(matches) {
  const select = document.getElementById('selectAmhPartido');
  if (!select) return;

  const rival = getRivalNameForCategory(currentAmhCategory).toUpperCase();

  select.innerHTML = '<option value="">-- Autodetectar por rival del próximo partido --</option>';

  let autoSelected = false;

  matches.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.text;

    // Si coincide con el rival, preseleccionarlo
    if (!autoSelected && rival && m.text.toUpperCase().includes(rival.replace(/\s*[A-Z]$/, ''))) {
      opt.selected = true;
      autoSelected = true;
    }

    select.appendChild(opt);
  });
}

function resetAmhPrecargaStatus() {
  const statusBox = document.getElementById('amhStatusBox');
  const resultBox = document.getElementById('amhResultBox');
  const errorBox = document.getElementById('amhErrorBox');
  const btnExecute = document.getElementById('btnExecuteAmhPrecarga');

  if (statusBox) statusBox.style.display = 'none';
  if (resultBox) resultBox.style.display = 'none';
  if (errorBox) errorBox.style.display = 'none';
  if (btnExecute) {
    btnExecute.disabled = false;
    btnExecute.innerHTML = '<span>🚀</span> Hacer Precarga en AMH (Inscribir tildadas)';
  }
  isAmhPrecargaInProgress = false;
}

async function handleExecuteAmhPrecarga() {
  if (isAmhPrecargaInProgress) return;

  const cat = currentAmhCategory;
  const players = getCitedPlayersForCategory(cat);
  const rival = getRivalNameForCategory(cat);
  const select = document.getElementById('selectAmhPartido');
  const partidoId = select ? select.value : '';

  if (players.length === 0) {
    alert('No hay jugadoras citadas para precargar en esta categoría.');
    return;
  }

  const catName = cat === 'intermedia' ? 'Intermedia' : '1ra División';
  const confirmMsg = `¿Confirmás ejecutar la precarga en AMH para ${catName}?\n\n` +
    `• Jugadoras citadas: ${players.length}\n` +
    `• Torneo: Clausura Damas B\n` +
    `• Bloque: B\n\n` +
    `⚠️ MODO SEGURO: El sistema SOLO inscribirá a las jugadoras tildadas. NUNCA cerrará la precarga. Podrás entrar a la AMH luego para cerrarla manualmente.`;

  if (!confirm(confirmMsg)) return;

  // Activar estado de progreso
  isAmhPrecargaInProgress = true;
  const btnExecute = document.getElementById('btnExecuteAmhPrecarga');
  const statusBox = document.getElementById('amhStatusBox');
  const statusText = document.getElementById('amhStatusText');
  const resultBox = document.getElementById('amhResultBox');
  const errorBox = document.getElementById('amhErrorBox');

  if (btnExecute) {
    btnExecute.disabled = true;
    btnExecute.innerHTML = '<span class="amh-spinner"></span> Ejecutando precarga en AMH...';
  }
  if (resultBox) resultBox.style.display = 'none';
  if (errorBox) errorBox.style.display = 'none';
  if (statusBox) {
    statusBox.style.display = 'flex';
    if (statusText) {
      statusText.textContent = 'Iniciando conexión con AMH e inscribiendo jugadoras... Esperá unos segundos.';
    }
  }

  try {
    const response = await fetch('/api/torneo/precarga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        division: cat === 'intermedia' ? '2' : '1',
        partidoId: partidoId || null,
        rival: rival || null,
        players: players
      })
    });

    const data = await response.json();

    if (data.success && data.result) {
      showAmhSuccessResult(data.result);
      if (typeof showToast === 'function') {
        showToast('✅ Precarga AMH realizada con éxito');
      }
    } else {
      throw new Error(data.error || 'Error desconocido durante la precarga.');
    }
  } catch (err) {
    console.error('[AMH Precarga Error]:', err);
    showAmhErrorResult(err.message);
  } finally {
    isAmhPrecargaInProgress = false;
    if (statusBox) statusBox.style.display = 'none';
    if (btnExecute) {
      btnExecute.disabled = false;
      btnExecute.innerHTML = '<span>🚀</span> Hacer Precarga en AMH (Inscribir tildadas)';
    }
  }
}

function showAmhSuccessResult(result) {
  const resultBox = document.getElementById('amhResultBox');
  if (!resultBox) return;

  const matchesHtml = (result.matches || []).map(m => `
    <li class="amh-match-item">
      <span class="amh-check-icon">✓</span>
      <div class="amh-match-names">
        <strong>${m.cited}</strong>
        <span class="amh-sub-official">${m.amhName} (DNI ${m.dni})</span>
      </div>
      <span class="amh-match-score">${m.score}%</span>
    </li>
  `).join('');

  let unmatchedHtml = '';
  if (result.unmatched && result.unmatched.length > 0) {
    unmatchedHtml = `
      <div class="amh-unmatched-card">
        <span class="amh-warn-title">⚠️ Jugadoras citadas no encontradas en el padrón AMH (${result.unmatched.length}):</span>
        <div class="amh-unmatched-tags">
          ${result.unmatched.map(u => `<span class="amh-unmatched-tag">${u}</span>`).join('')}
        </div>
        <small>Verificá si están inscriptas bajo otro nombre o en otra categoría en el sistema AMH.</small>
      </div>
    `;
  }

  resultBox.innerHTML = `
    <div class="amh-success-card">
      <div class="amh-success-header">
        <span class="amh-success-icon">🎉</span>
        <div>
          <h3 class="amh-success-title">¡Precarga realizada con éxito!</h3>
          <p class="amh-success-sub">Se inscribieron <strong>${result.inscribedCount} de ${result.totalCited} jugadoras</strong> para <strong>${result.division}</strong>.</p>
        </div>
      </div>

      <div class="amh-match-info-pill">
        <span>🏟️ Partido:</span> <strong>${result.partido || 'Programado'}</strong>
      </div>

      <div class="amh-security-notice">
        <span>🛡️</span>
        <p><strong>Recordatorio:</strong> La precarga <strong>NO ha sido cerrada</strong>. Podés ingresar al sistema de la AMH para revisar la planilla y cerrar la precarga cuando vos lo decidas.</p>
      </div>

      <details class="amh-details-toggle">
        <summary>Ver detalle de ${result.inscribedCount} jugadoras inscriptas</summary>
        <ul class="amh-matches-list">
          ${matchesHtml}
        </ul>
      </details>

      ${unmatchedHtml}

      <div class="amh-direct-link-box">
        <a href="http://15.235.75.172:8080/ords/r/amh/clubes/login_desktop" target="_blank" rel="noopener noreferrer" class="amh-btn-external">
          Abrir Sistema AMH para Revisar y Cerrar ↗
        </a>
      </div>
    </div>
  `;

  resultBox.style.display = 'block';
}

function showAmhErrorResult(errorMsg) {
  const errorBox = document.getElementById('amhErrorBox');
  if (!errorBox) return;

  errorBox.innerHTML = `
    <div class="amh-error-card">
      <div class="amh-error-header">
        <span class="amh-error-icon">❌</span>
        <div>
          <h4 class="amh-error-title">No se pudo completar la precarga</h4>
          <p class="amh-error-sub">${errorMsg}</p>
        </div>
      </div>
      <div class="amh-error-tips">
        <strong>Recomendaciones:</strong>
        <ul>
          <li>Asegurate de que el servidor local esté activo (ejecutando <code>abrir_web.bat</code>).</li>
          <li>Verificá que el archivo <code>.env</code> tenga las credenciales correctas de la AMH.</li>
          <li>Comprobá que el servidor de la AMH esté online y accesible.</li>
        </ul>
      </div>
      <div class="amh-error-actions">
        <a href="http://15.235.75.172:8080/ords/r/amh/clubes/login_desktop" target="_blank" rel="noopener noreferrer" class="amh-btn-external-small">
          Ir manualmente a la AMH ↗
        </a>
      </div>
    </div>
  `;

  errorBox.style.display = 'block';
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  setupAmhPrecargaEvents();
});
