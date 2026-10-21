/**
 * Gesto Pull to Refresh Nativo para Móviles y PWA
 * Club Regatas Andino - Web Citaciones
 */

(function initPullToRefresh() {
  const PTR_THRESHOLD = 64; // Distancia en px para activar la recarga
  const PTR_MAX_PULL = 95; // Máximo desplazamiento visual
  const PTR_RESISTANCE = 0.42; // Factor de elasticidad / resistencia

  let ptrStartY = 0;
  let ptrStartX = 0;
  let ptrIsPulling = false;
  let ptrIsRefreshing = false;
  let ptrHapticFired = false;

  function getScrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function isBlocked() {
    if (ptrIsRefreshing) return true;

    // Si hay un modal abierto o el menú drawer está activo
    if (document.body.classList.contains('modal-open')) return true;
    const drawer = document.getElementById('navDrawer');
    if (drawer && drawer.classList.contains('active')) return true;

    // En la Botonera DT activa no interrumpir el partido con tirones accidentales
    if (typeof currentActiveView !== 'undefined' && currentActiveView === 'dt') return true;

    return false;
  }

  function onTouchStart(e) {
    if (isBlocked() || !e.touches || e.touches.length !== 1) return;

    if (getScrollTop() <= 2) {
      ptrStartY = e.touches[0].clientY;
      ptrStartX = e.touches[0].clientX;
      ptrIsPulling = false;
      ptrHapticFired = false;
    } else {
      ptrStartY = 0;
    }
  }

  function onTouchMove(e) {
    if (ptrStartY === 0 || isBlocked() || !e.touches || e.touches.length !== 1) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - ptrStartY;
    const deltaX = currentX - ptrStartX;

    // Si el usuario se desplaza más horizontalmente que verticalmente (ej. swipe lateral), cancelar
    if (Math.abs(deltaX) > Math.abs(deltaY) && !ptrIsPulling) {
      ptrStartY = 0;
      return;
    }

    // Si ya no está arriba de todo, cancelar
    if (getScrollTop() > 2) {
      if (ptrIsPulling) resetIndicator();
      ptrStartY = 0;
      return;
    }

    if (deltaY > 6) {
      if (e.cancelable) e.preventDefault();
      ptrIsPulling = true;

      const indicator = document.getElementById('pullRefreshIndicator');
      const label = document.getElementById('pullRefreshLabel');
      if (!indicator) return;

      const pullDistance = Math.min(deltaY * PTR_RESISTANCE, PTR_MAX_PULL);
      indicator.style.transform = `translate(-50%, ${pullDistance - 50}px)`;
      indicator.classList.add('visible');

      if (pullDistance >= PTR_THRESHOLD) {
        if (!indicator.classList.contains('ready')) {
          indicator.classList.add('ready');
          if (label) label.textContent = 'Soltá para actualizar';
          if (!ptrHapticFired) {
            if (navigator.vibrate) navigator.vibrate(15);
            ptrHapticFired = true;
          }
        }
      } else {
        if (indicator.classList.contains('ready')) {
          indicator.classList.remove('ready');
          if (label) label.textContent = 'Deslizá para actualizar';
          ptrHapticFired = false;
        }
      }
    }
  }

  async function onTouchEnd() {
    if (!ptrIsPulling || isBlocked()) {
      ptrStartY = 0;
      ptrIsPulling = false;
      return;
    }

    ptrIsPulling = false;
    ptrStartY = 0;

    const indicator = document.getElementById('pullRefreshIndicator');
    const label = document.getElementById('pullRefreshLabel');
    if (!indicator) return;

    if (indicator.classList.contains('ready')) {
      ptrIsRefreshing = true;
      indicator.classList.remove('ready');
      indicator.classList.add('refreshing');
      if (label) label.textContent = 'Actualizando...';

      // Disparar sincronización según la pantalla activa
      try {
        if (typeof currentActiveView !== 'undefined') {
          if (currentActiveView === 'torneo') {
            if (typeof syncTournamentData === 'function') await syncTournamentData(true);
          } else if (currentActiveView === 'fisico') {
            if (typeof loadPhysicalEvaluations === 'function') await loadPhysicalEvaluations(true);
          } else if (currentActiveView === 'estadisticas') {
            if (typeof syncAllMatchesFromCloud === 'function') await syncAllMatchesFromCloud();
          } else {
            if (typeof syncWithGoogleSheets === 'function') await syncWithGoogleSheets(true);
          }
        } else {
          if (typeof syncWithGoogleSheets === 'function') await syncWithGoogleSheets(true);
        }
      } catch (err) {
        console.warn('[PullRefresh] Error durante sincronización:', err);
      }

      // Estado de éxito
      indicator.classList.remove('refreshing');
      indicator.classList.add('success');
      if (label) label.textContent = '¡Al día!';
      if (navigator.vibrate) navigator.vibrate([10, 40, 10]);

      setTimeout(() => {
        resetIndicator();
        ptrIsRefreshing = false;
      }, 500);

    } else {
      resetIndicator();
    }
  }

  function resetIndicator() {
    const indicator = document.getElementById('pullRefreshIndicator');
    const label = document.getElementById('pullRefreshLabel');
    if (!indicator) return;

    indicator.style.transform = '';
    indicator.classList.remove('visible', 'ready', 'refreshing', 'success');
    if (label) label.textContent = 'Deslizá para actualizar';
    ptrHapticFired = false;
  }

  // Registrar listeners globales con { passive: false } en touchmove para poder llamar preventDefault
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', resetIndicator, { passive: true });
})();
