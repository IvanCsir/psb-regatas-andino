document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadTournamentData();
  render();
  renderTournamentView();
  setupCategorySwitch();
  setupTournamentCategorySwitch();
  setupViewSwitching();
  setupEvents();
  setupCitacionSyncUI();
  setupPhysicalSection();
  initDtModule();
  initSunMode();
  updateCtUiState();
  setupPwa();

  // Sincronizaciones iniciales
  syncWithGoogleSheets(); // Citaciones
  loadPhysicalEvaluations(); // Físico
  syncTournamentData(); // Torneo AMH

  // Polling inteligente respetando visibilidad de pantalla (ahorro de batería en celulares)
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      syncWithGoogleSheets();
      if (typeof currentActiveView !== 'undefined') {
        if (currentActiveView === 'fisico') loadPhysicalEvaluations();
        if (currentActiveView === 'torneo') syncTournamentData();
      }
    }
  }, 60000);

  // Al volver a la app o desbloquear el celular
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncWithGoogleSheets();
      if (typeof currentActiveView !== 'undefined') {
        if (currentActiveView === 'fisico') loadPhysicalEvaluations();
        if (currentActiveView === 'torneo') syncTournamentData();
      }
    }
  });

  window.addEventListener('focus', () => {
    syncWithGoogleSheets();
    if (typeof currentActiveView !== 'undefined') {
      if (currentActiveView === 'fisico') loadPhysicalEvaluations();
      if (currentActiveView === 'torneo') syncTournamentData();
    }
  });
});
