async function verifyCtPassword(input) {
  const clean = (input || '').trim().toLowerCase();
  if (!clean) return false;
  const hash = await sha256Hex(clean);
  return hash === CT_PASSWORD_HASH;
}

function isCtAuthenticated() {
  try {
    return localStorage.getItem(CT_AUTH_STORAGE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

function isDtAuthenticated() {
  return isCtAuthenticated();
}

function setCtAuthenticated(authenticated = true) {
  try {
    if (authenticated) {
      localStorage.setItem(CT_AUTH_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(CT_AUTH_STORAGE_KEY);
      sessionStorage.removeItem('regatas_dt_auth_ok');
      sessionStorage.removeItem('regatas_ct_auth_v2');
      localStorage.removeItem('regatas_ct_auth_v2');
    }
  } catch (e) {}
  updateCtUiState();
}

function updateCtUiState() {
  const isAuth = isCtAuthenticated();

  // Actualizar indicadores del Menú Drawer
  document.querySelectorAll('.drawer-badge-lock').forEach(badge => {
    badge.textContent = isAuth ? '🔓' : '🔒';
    badge.title = isAuth ? 'Sesión de Cuerpo Técnico activa' : 'Requiere contraseña de Cuerpo Técnico';
    badge.style.color = isAuth ? '#34d399' : '';
  });

  // Modal de Edición de Citaciones
  const editGate = document.getElementById('authGate');
  const editBody = document.getElementById('editFormBody');
  if (editGate && editBody) {
    if (isAuth) {
      editGate.style.display = 'none';
      editBody.style.display = 'flex';
    } else {
      editGate.style.display = 'block';
      editBody.style.display = 'none';
    }
  }

  // Modal de Google Sheets
  const sheetsGate = document.getElementById('sheetsAuthGate');
  const sheetsBody = document.getElementById('sheetsAuthBody');
  if (sheetsGate && sheetsBody) {
    if (isAuth) {
      sheetsGate.style.display = 'none';
      sheetsBody.style.display = 'flex';
    } else {
      sheetsGate.style.display = 'block';
      sheetsBody.style.display = 'none';
    }
  }

  // Botonera DT
  if (currentActiveView === 'dt') {
    handleDtViewOpen();
  }

  // Estadísticas por Cuartos
  const statsGate = document.getElementById('statsAuthGateCard');
  const statsContent = document.getElementById('statsMainContent');
  const statsLockBtn = document.getElementById('btnStatsLockSession');
  if (statsGate && statsContent) {
    if (isAuth) {
      statsGate.style.display = 'none';
      statsContent.style.display = 'flex';
    } else {
      statsGate.style.display = 'block';
      statsContent.style.display = 'none';
    }
  }
  if (statsLockBtn) {
    statsLockBtn.style.display = isAuth ? 'inline-flex' : 'none';
  }
  if (currentActiveView === 'estadisticas') {
    handleStatsViewOpen();
  }
}

function lockCtSession() {
  setCtAuthenticated(false);
  if (typeof pauseDtClock === 'function') pauseDtClock();
  if (typeof stopDtCloudPolling === 'function') stopDtCloudPolling();
  document.body.classList.remove('dt-sun-mode');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', '#030d2d');

  const dtSunBtn = document.getElementById('btnDtSunToggle');
  if (dtSunBtn) dtSunBtn.classList.remove('active');

  updateCtUiState();
  showToast('🔒 Sesión de Cuerpo Técnico cerrada');
}
