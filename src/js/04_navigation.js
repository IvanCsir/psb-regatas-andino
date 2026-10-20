// ============================================================================
// NAVEGACIÓN DISCRETA ENTRE CITACIÓN, TORNEO Y EVALUACIONES FÍSICAS
// ============================================================================

let currentActiveView = 'citacion'; // 'citacion' | 'torneo' | 'fisico' | 'dt'

function openNavDrawer() {
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('navDrawerOverlay');
  if (drawer) {
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
  }
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeNavDrawer() {
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('navDrawerOverlay');
  if (drawer) {
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function setupViewSwitching() {
  // 1. Menú Hamburguesa & Drawer Lateral
  const btnOpenDrawer = document.getElementById('btnOpenNavDrawer');
  const btnCloseDrawer = document.getElementById('btnCloseNavDrawer');
  const drawerOverlay = document.getElementById('navDrawerOverlay');

  if (btnOpenDrawer) btnOpenDrawer.addEventListener('click', openNavDrawer);
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeNavDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeNavDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNavDrawer();
      closeSheetsAuthModal();
    }
  });

  // Acceso destacado a Botonera DT desde el Menú Hamburguesa
  const drawerBtnDT = document.getElementById('drawerBtnDT');
  if (drawerBtnDT) {
    drawerBtnDT.addEventListener('click', () => {
      closeNavDrawer();
      showView('dt');
    });
  }

  // Navegación general desde el Drawer
  const drawerBtnCitacion = document.getElementById('drawerBtnCitacion');
  if (drawerBtnCitacion) {
    drawerBtnCitacion.addEventListener('click', () => {
      closeNavDrawer();
      showView('citacion');
    });
  }

  const drawerBtnTorneo = document.getElementById('drawerBtnTorneo');
  if (drawerBtnTorneo) {
    drawerBtnTorneo.addEventListener('click', () => {
      closeNavDrawer();
      showView('torneo');
    });
  }

  const drawerBtnFisico = document.getElementById('drawerBtnFisico');
  if (drawerBtnFisico) {
    drawerBtnFisico.addEventListener('click', () => {
      closeNavDrawer();
      showView('fisico');
    });
  }

  const drawerBtnInstall = document.getElementById('drawerBtnInstallPwa');
  if (drawerBtnInstall) {
    drawerBtnInstall.addEventListener('click', () => {
      closeNavDrawer();
      triggerPwaInstall();
    });
  }

  // Acceso a Planilla Google Sheets con protección por contraseña
  const drawerBtnSheets = document.getElementById('drawerBtnSheets');
  if (drawerBtnSheets) {
    drawerBtnSheets.addEventListener('click', () => {
      closeNavDrawer();
      openSheetsAuthModal();
    });
  }

  // Acceso a Estadísticas por Cuartos desde Drawer
  const drawerBtnStats = document.getElementById('drawerBtnStats');
  if (drawerBtnStats) {
    drawerBtnStats.addEventListener('click', () => {
      closeNavDrawer();
      showView('estadisticas');
    });
  }

  // Acceso a Estadísticas desde la Botonera DT
  const btnDtOpenQuarterStats = document.getElementById('btnDtOpenQuarterStats');
  if (btnDtOpenQuarterStats) {
    btnDtOpenQuarterStats.addEventListener('click', () => {
      showView('estadisticas');
    });
  }

  // Botones de Retorno desde Estadísticas
  const btnReturnFromStats = document.getElementById('btnReturnToCitacionFromStats');
  if (btnReturnFromStats) {
    btnReturnFromStats.addEventListener('click', () => showView('citacion'));
  }
  const btnGoToDtFromStats = document.getElementById('btnGoToDtFromStats');
  if (btnGoToDtFromStats) {
    btnGoToDtFromStats.addEventListener('click', () => showView('dt'));
  }

  // Filtro de Partidos en Estadísticas
  const selectStatsFilter = document.getElementById('selectStatsMatchFilter');
  if (selectStatsFilter) {
    selectStatsFilter.addEventListener('change', (e) => {
      renderAnalyticsDashboard(e.target.value);
    });
  }

  // Sincronización de todos los partidos desde Google Sheets
  const btnSyncAllCloud = document.getElementById('btnSyncAllMatchesCloud');
  if (btnSyncAllCloud) {
    btnSyncAllCloud.addEventListener('click', syncAllMatchesFromCloud);
  }

  // Compartir Análisis por WhatsApp
  const btnShareStatsWa = document.getElementById('btnShareStatsWhatsApp');
  if (btnShareStatsWa) {
    btnShareStatsWa.addEventListener('click', shareStatsWhatsApp);
  }

  // Auth Gate de Estadísticas por Cuartos
  const btnStatsGateSubmit = document.getElementById('btnStatsGateSubmit');
  const inputStatsGatePassword = document.getElementById('inputStatsGatePassword');
  const btnStatsLock = document.getElementById('btnStatsLockSession');

  if (btnStatsGateSubmit) btnStatsGateSubmit.addEventListener('click', verifyStatsPassword);
  if (inputStatsGatePassword) {
    inputStatsGatePassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyStatsPassword();
    });
  }
  if (btnStatsLock) btnStatsLock.addEventListener('click', lockCtSession);

  // 2. Botones del Dock Inferior
  const dockBtns = document.querySelectorAll('.nav-dock-btn');
  dockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      if (targetView) showView(targetView);
    });
  });


  // 4. Botones de Retorno a Citación
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
  const viewEstadisticas = document.getElementById('viewEstadisticas');
  const bottomNavDock = document.getElementById('bottomNavDock');

  currentActiveView = viewName;

  document.body.classList.toggle('in-dt-view', viewName === 'dt');
  document.body.classList.toggle('in-stats-view', viewName === 'estadisticas');

  if (viewCitacion) viewCitacion.style.display = viewName === 'citacion' ? 'flex' : 'none';
  if (viewTorneo) viewTorneo.style.display = viewName === 'torneo' ? 'flex' : 'none';
  if (viewFisico) viewFisico.style.display = viewName === 'fisico' ? 'flex' : 'none';
  if (viewDT) viewDT.style.display = viewName === 'dt' ? 'flex' : 'none';
  if (viewEstadisticas) viewEstadisticas.style.display = viewName === 'estadisticas' ? 'flex' : 'none';

  // En la botonera DT y en Estadísticas ocultamos el dock inferior para que no tape los controles
  if (bottomNavDock) {
    bottomNavDock.style.display = (viewName === 'dt' || viewName === 'estadisticas') ? 'none' : 'flex';
  }

  // Actualizar estado activo en la barra de navegación inferior
  document.querySelectorAll('.nav-dock-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Actualizar estado activo en el menú lateral (drawer)
  document.querySelectorAll('.drawer-nav-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  if (viewName === 'torneo') {
    stopDtCloudPolling();
    renderTournamentView();
  } else if (viewName === 'fisico') {
    stopDtCloudPolling();
    if (physicalPlayers.length > 0 && !selectedPlayerId) {
      renderPhysicalSuggestions();
    }
  } else if (viewName === 'dt') {
    handleDtViewOpen();
  } else if (viewName === 'estadisticas') {
    stopDtCloudPolling();
    // Fuera de la vista DT, quitamos el modo sol para que solo afecte la botonera
    document.body.classList.remove('dt-sun-mode');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#030d2d');
    handleStatsViewOpen();
  } else {
    stopDtCloudPolling();
    // Fuera de la vista DT, quitamos el modo sol para que solo afecte la botonera
    document.body.classList.remove('dt-sun-mode');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', '#030d2d');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
