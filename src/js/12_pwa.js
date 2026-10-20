// PWA: SERVICE WORKER & INSTALACIÓN EN PANTALLA DE INICIO
// ============================================================================

let deferredInstallPrompt = null;

function setupPwa() {
  // 1. Registro del Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado exitosamente:', reg.scope);
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[PWA] Error registrando Service Worker:', err);
        });
    });

    // Al desbloquear el celular o volver a la app desde otra pantalla
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) reg.update().catch(() => {});
        }).catch(() => {});
      }
    });
  }

  // 2. Captura del evento beforeinstallprompt (Android / Chrome / Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA] Evento beforeinstallprompt capturado');

    const badge = document.getElementById('drawerBadgePwa');
    if (badge) badge.textContent = 'Instalar';
  });

  // 3. Detección de instalación completada
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('🏆 ¡App de Regatas instalada en tu pantalla de inicio!');
    const badge = document.getElementById('drawerBadgePwa');
    if (badge) badge.textContent = 'Instalada';
  });

  // 4. Modal de instrucciones iOS
  const btnCloseIos = document.getElementById('btnCloseIosInstall');
  if (btnCloseIos) {
    btnCloseIos.addEventListener('click', closeIosInstallModal);
  }
  const modalIos = document.getElementById('modalIosInstall');
  if (modalIos) {
    modalIos.addEventListener('click', (e) => {
      if (e.target === modalIos) closeIosInstallModal();
    });
  }
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

function isAppStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function triggerPwaInstall() {
  if (isAppStandalone()) {
    showToast('✅ Ya estás usando la App instalada de Regatas Andino');
    return;
  }

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('📲 Instalando App de Regatas...');
      }
      deferredInstallPrompt = null;
    });
    return;
  }

  if (isIosDevice()) {
    openIosInstallModal();
    return;
  }

  showToast('ℹ️ Para instalar: tocá los 3 puntos ⋮ en tu navegador y seleccioná "Instalar aplicación"');
}

function openIosInstallModal() {
  const modal = document.getElementById('modalIosInstall');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const bottomNavDock = document.getElementById('bottomNavDock');
    if (bottomNavDock) bottomNavDock.style.display = 'none';
  }
}

function closeIosInstallModal() {
  const modal = document.getElementById('modalIosInstall');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    const bottomNavDock = document.getElementById('bottomNavDock');
    if (bottomNavDock) {
      const isSpecialView = typeof currentActiveView !== 'undefined' && (currentActiveView === 'dt' || currentActiveView === 'estadisticas');
      bottomNavDock.style.display = isSpecialView ? 'none' : 'flex';
    }
  }
}

window.triggerPwaInstall = triggerPwaInstall;
window.openIosInstallModal = openIosInstallModal;
window.closeIosInstallModal = closeIosInstallModal;
