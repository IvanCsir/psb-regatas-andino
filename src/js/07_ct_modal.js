// EVENTOS Y MODAL DE PLANILLAS OFICIALES (CUERPO TÉCNICO)
// ============================================================================

function setupEvents() {
  // Modal de Acceso a Planillas Oficiales (Cuerpo Técnico)
  const modalSheets = document.getElementById('modalSheetsAuth');
  const btnCloseSheets = document.getElementById('btnCloseSheetsAuth');
  const btnCloseSheetsBottom = document.getElementById('btnCloseSheetsModalBottom');
  const btnSubmitSheets = document.getElementById('btnSubmitSheetsAuth');
  const btnLockSheets = document.getElementById('btnLockSheetsAuth');
  const inputSheetsPass = document.getElementById('inputSheetsPassword');

  if (btnCloseSheets) btnCloseSheets.addEventListener('click', closeSheetsAuthModal);
  if (btnCloseSheetsBottom) btnCloseSheetsBottom.addEventListener('click', closeSheetsAuthModal);
  if (btnSubmitSheets) btnSubmitSheets.addEventListener('click', verifySheetsPassword);
  if (btnLockSheets) btnLockSheets.addEventListener('click', lockSheetsSession);

  if (inputSheetsPass) {
    inputSheetsPass.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifySheetsPassword();
    });
  }

  if (modalSheets) {
    modalSheets.addEventListener('click', (e) => {
      if (e.target === modalSheets) closeSheetsAuthModal();
    });
  }
}

// ============================================================================
// ACCESO PROTEGIDO A PLANILLAS GOOGLE SHEETS
// ============================================================================

function openSheetsAuthModal() {
  const modal = document.getElementById('modalSheetsAuth');
  const gate = document.getElementById('sheetsAuthGate');
  const body = document.getElementById('sheetsAuthBody');
  const input = document.getElementById('inputSheetsPassword');
  const error = document.getElementById('sheetsAuthErrorMsg');
  const bottomNavDock = document.getElementById('bottomNavDock');

  if (!modal) return;

  if (isDtAuthenticated()) {
    if (gate) gate.style.display = 'none';
    if (body) body.style.display = 'flex';
    if (error) error.style.display = 'none';
  } else {
    if (gate) gate.style.display = 'block';
    if (body) body.style.display = 'none';
    if (error) error.style.display = 'none';
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
  }

  modal.classList.add('active');
  document.body.classList.add('modal-open');
  if (bottomNavDock) {
    bottomNavDock.style.display = 'none';
  }
}

function closeSheetsAuthModal() {
  const modal = document.getElementById('modalSheetsAuth');
  if (modal) modal.classList.remove('active');
  document.body.classList.remove('modal-open');
  const bottomNavDock = document.getElementById('bottomNavDock');
  if (bottomNavDock) {
    const isSpecialView = typeof currentActiveView !== 'undefined' && (currentActiveView === 'dt' || currentActiveView === 'estadisticas');
    bottomNavDock.style.display = isSpecialView ? 'none' : 'flex';
  }
}

async function verifySheetsPassword() {
  const input = document.getElementById('inputSheetsPassword');
  const error = document.getElementById('sheetsAuthErrorMsg');
  const gate = document.getElementById('sheetsAuthGate');
  const body = document.getElementById('sheetsAuthBody');
  const entered = (input ? input.value : '').trim().toLowerCase();

  const ok = await verifyCtPassword(entered);
  if (ok) {
    setCtAuthenticated(true);
    if (error) error.style.display = 'none';
    if (gate) gate.style.display = 'none';
    if (body) body.style.display = 'flex';
    showToast('🔓 Acceso concedido a Planillas');
  } else {
    if (error) error.style.display = 'block';
    if (input) input.select();
  }
}

function lockSheetsSession() {
  lockCtSession();
  closeSheetsAuthModal();
}

// ============================================================================
