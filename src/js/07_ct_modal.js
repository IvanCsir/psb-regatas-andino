// EVENTOS Y MODAL CUERPO TÉCNICO
// ============================================================================

function setupEvents() {
  const modal = document.getElementById('editModal');
  const btnOpen = document.getElementById('btnOpenEdit');
  const btnClose = document.getElementById('btnCloseEdit');
  const btnCloseBottom = document.getElementById('btnCloseModalBottom');
  const authGate = document.getElementById('authGate');
  const authInput = document.getElementById('authPasswordInput');
  const authBtn = document.getElementById('btnSubmitAuth');
  const authError = document.getElementById('authErrorMsg');
  const formBody = document.getElementById('editFormBody');
  const btnSyncNow = document.getElementById('btnSyncNow');

  const closeModal = () => {
    if (modal) modal.classList.remove('active');
  };

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      if (isCtAuthenticated()) {
        authGate.style.display = 'none';
        formBody.style.display = 'flex';
      } else {
        authGate.style.display = 'block';
        formBody.style.display = 'none';
        authInput.value = '';
        authError.style.display = 'none';
        setTimeout(() => authInput.focus(), 150);
      }
      modal.classList.add('active');
    });
  }

  const verifyPassword = async () => {
    const entered = (authInput.value || '').trim().toLowerCase();
    const ok = await verifyCtPassword(entered);
    if (ok) {
      setCtAuthenticated(true);
      authGate.style.display = 'none';
      formBody.style.display = 'flex';
      authError.style.display = 'none';
      showToast('🔓 Sesión de Cuerpo Técnico iniciada');
    } else {
      authError.style.display = 'block';
      authInput.select();
    }
  };

  if (authBtn) authBtn.addEventListener('click', verifyPassword);

  if (authInput) {
    authInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyPassword();
    });
  }

  const btnLockEdit = document.getElementById('btnLockEditModal');
  if (btnLockEdit) {
    btnLockEdit.addEventListener('click', () => {
      lockCtSession();
      closeModal();
    });
  }

  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', () => {
      syncWithGoogleSheets(true);
      loadPhysicalEvaluations(true);
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Modal de Acceso a Planilla Google Sheets (Cuerpo Técnico)
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
// ACCESO PROTEGIDO A PLANILLA GOOGLE SHEETS
// ============================================================================

function openSheetsAuthModal() {
  const modal = document.getElementById('modalSheetsAuth');
  const gate = document.getElementById('sheetsAuthGate');
  const body = document.getElementById('sheetsAuthBody');
  const input = document.getElementById('inputSheetsPassword');
  const error = document.getElementById('sheetsAuthErrorMsg');

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
}

function closeSheetsAuthModal() {
  const modal = document.getElementById('modalSheetsAuth');
  if (modal) modal.classList.remove('active');
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

    // Abrir automáticamente la planilla de Google Sheets en una nueva pestaña
    window.open(DT_SPREADSHEET_URL, '_blank');
    showToast('🔓 Acceso concedido • Abriendo Planilla Google Sheets...');
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
