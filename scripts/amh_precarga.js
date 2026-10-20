/**
 * Servicio de Automatización de Precarga de Equipos en Sistema AMH (Oracle APEX)
 * Club Regatas Andino - Hockey Femenino (Plantel Superior B)
 *
 * REGLAS CRÍTICAS:
 * 1. NUNCA hacer click en "Cierra Precarga Equipos" (#CIERRA_ID).
 * 2. Únicamente tildar las jugadoras citadas y hacer click en "Inscribe Tildados" (#INSCRIBE_ID).
 * 3. Las credenciales se leen exclusivamente desde variables de entorno (.env).
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// Cargar variables de entorno desde .env si existe
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

// Detección de binario de navegador (Chrome o Edge en Windows / Linux / Mac)
function findBrowserExecutable() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];

  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }

  return null;
}

// Normalización de cadenas y cálculo de similitud para nombres
function normalizeStr(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function matchPlayer(citedName, amhPlayers) {
  const normCited = normalizeStr(citedName);
  const citedTokens = normCited.split(' ').filter(t => t.length >= 2);
  if (citedTokens.length === 0) return null;

  const citedSurname = citedTokens[0];

  let bestMatch = null;
  let bestScore = -1;

  for (const amh of amhPlayers) {
    const normAmh = normalizeStr(amh.name);
    const amhTokens = normAmh.split(' ').filter(t => t.length >= 2);
    if (amhTokens.length === 0) continue;

    const amhSurname = amhTokens[0];

    let matchedTokens = 0;
    for (const cToken of citedTokens) {
      if (amhTokens.some(aToken => 
        aToken === cToken ||
        (cToken.length >= 4 && aToken.includes(cToken)) ||
        (aToken.length >= 4 && cToken.includes(aToken)) ||
        (cToken.length >= 4 && levenshtein(cToken, aToken) <= 1)
      )) {
        matchedTokens++;
      }
    }

    const tokenScore = matchedTokens / citedTokens.length;

    // Coincidencia por apellido principal
    const surnameMatch = (amhSurname === citedSurname || (citedSurname.length >= 4 && amhSurname.includes(citedSurname)) || (citedSurname.length >= 5 && levenshtein(amhSurname, citedSurname) <= 1));

    let levBonus = 0;
    if (tokenScore >= 0.5 || surnameMatch) {
      const dist = levenshtein(normCited, normAmh);
      levBonus = 1 - (dist / Math.max(normCited.length, normAmh.length));
    }

    let totalScore = (tokenScore * 0.7) + (levBonus * 0.3);

    // Si coincide el apellido principal, asegurar buen puntaje
    if (surnameMatch) {
      totalScore = Math.max(totalScore, 0.75 + (tokenScore * 0.25));
    }

    if (totalScore >= 0.65 && totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = { amh, score: totalScore, tokenScore };
    }
  }

  return bestMatch;
}

/**
 * Obtiene los partidos disponibles para una división en la AMH
 */
async function fetchAvailableMatches(division = '1') {
  const browserPath = findBrowserExecutable();
  if (!browserPath) throw new Error('No se encontró un navegador ejecutable (Chrome o Edge).');

  const username = process.env.AMH_USER;
  const password = process.env.AMH_PASSWORD;
  const baseUrl = process.env.AMH_URL || 'http://15.235.75.172:8080/ords/r/amh/clubes/login_desktop';

  if (!username || !password) {
    throw new Error('Faltan credenciales AMH_USER o AMH_PASSWORD en variables de entorno / archivo .env');
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Login
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#P100_USERNAME', { timeout: 15000 });
    await page.type('#P100_USERNAME', username);
    await page.type('#P100_PASSWORD', password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#B1801326792432970076')
    ]);

    const sessionMatch = page.url().match(/session=([0-9]+)/);
    const session = sessionMatch ? sessionMatch[1] : '';
    if (!session) throw new Error('No se pudo obtener la sesión tras el login en AMH');

    // 2. Navegar a Precarga de Equipos (Página 13)
    await page.goto(`http://15.235.75.172:8080/ords/r/amh/clubes/13?session=${session}`, { waitUntil: 'networkidle2' });

    // 3. Seleccionar Torneo
    const torneoVal = await page.evaluate(() => {
      const s = document.querySelector('#P13_TOR_ID');
      const opt = Array.from(s.options).find(o => o.text.toUpperCase().includes('DAMAS B'));
      return opt ? opt.value : '97';
    });
    await page.select('#P13_TOR_ID', torneoVal);
    await page.waitForNetworkIdle({ idleTime: 800 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // 4. Seleccionar División (1 = Primera, 2 = Segunda/Intermedia)
    const divCode = (division === '2' || division === 'intermedia') ? '2' : '1';
    await page.select('#P13_TORI_COD_DIVISION', divCode);
    await page.waitForNetworkIdle({ idleTime: 800 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // 5. Extraer opciones de Partidos
    const partidos = await page.evaluate(() => {
      const s = document.querySelector('#P13_TORP_PARTIDO_NRO');
      return Array.from(s.options)
        .filter(o => o.value)
        .map(o => ({ id: o.value, text: o.text.trim() }));
    });

    return partidos;
  } finally {
    await browser.close();
  }
}

/**
 * Ejecuta la precarga e inscripción de jugadoras tildadas
 * @param {Object} params
 * @param {string} params.division '1' (Primera) o '2' (Intermedia)
 * @param {string} [params.partidoId] ID del partido en AMH (opcional si se provee rival)
 * @param {string} [params.rival] Nombre del rival para autodetectar partido
 * @param {Array<string>} params.players Lista de jugadoras citadas
 * @param {Function} [params.onProgress] Callback para reportar avance en tiempo real
 */
async function executeAmhPrecarga(params = {}) {
  const {
    division = '1',
    partidoId = null,
    rival = null,
    players = [],
    onProgress = () => {}
  } = params;

  if (!players || players.length === 0) {
    throw new Error('No se enviaron jugadoras citadas para precargar.');
  }

  const browserPath = findBrowserExecutable();
  if (!browserPath) throw new Error('No se encontró un navegador ejecutable (Chrome o Edge) en el sistema.');

  const username = process.env.AMH_USER;
  const password = process.env.AMH_PASSWORD;
  const baseUrl = process.env.AMH_URL || 'http://15.235.75.172:8080/ords/r/amh/clubes/login_desktop';

  if (!username || !password) {
    throw new Error('Credenciales AMH no configuradas. Verificá el archivo .env (AMH_USER y AMH_PASSWORD).');
  }

  onProgress({ step: 1, message: 'Iniciando navegador automatizado...' });

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // PASO 1: Login
    onProgress({ step: 2, message: 'Conectando con el servidor oficial de la AMH...' });
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });

    await page.waitForSelector('#P100_USERNAME', { timeout: 15000 });
    await page.type('#P100_USERNAME', username);
    await page.type('#P100_PASSWORD', password);

    onProgress({ step: 3, message: 'Autenticando usuario del club...' });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#B1801326792432970076')
    ]);

    const sessionMatch = page.url().match(/session=([0-9]+)/);
    const session = sessionMatch ? sessionMatch[1] : '';
    if (!session) {
      throw new Error('Error de autenticación en AMH. Verificá las credenciales.');
    }

    // PASO 2: Navegación a Precarga de Equipos (Página 13)
    onProgress({ step: 4, message: 'Navegando a Administración de Plantel > Precarga de Equipos...' });
    await page.goto(`http://15.235.75.172:8080/ords/r/amh/clubes/13?session=${session}`, { waitUntil: 'networkidle2' });

    // PASO 3: Selección de Torneo (Clausura Damas B)
    onProgress({ step: 5, message: 'Seleccionando Torneo Clausura Damas B...' });
    const torneoVal = await page.evaluate(() => {
      const s = document.querySelector('#P13_TOR_ID');
      const opt = Array.from(s.options).find(o => o.text.toUpperCase().includes('DAMAS B'));
      return opt ? opt.value : '97';
    });
    await page.select('#P13_TOR_ID', torneoVal);
    await page.waitForNetworkIdle({ idleTime: 800 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // PASO 4: Selección de División (1 = Primera, 2 = Segunda/Intermedia)
    const divCode = (division === '2' || division === 'intermedia') ? '2' : '1';
    const divNombre = divCode === '2' ? 'Segunda (Intermedia)' : 'Primera';
    onProgress({ step: 6, message: `Seleccionando División: ${divNombre}...` });
    await page.select('#P13_TORI_COD_DIVISION', divCode);
    await page.waitForNetworkIdle({ idleTime: 800 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // PASO 5: Selección de Partido
    onProgress({ step: 7, message: 'Buscando el partido correspondiente...' });
    const matchOptions = await page.evaluate(() => {
      const s = document.querySelector('#P13_TORP_PARTIDO_NRO');
      return Array.from(s.options).filter(o => o.value).map(o => ({ id: o.value, text: o.text.trim() }));
    });

    if (matchOptions.length === 0) {
      throw new Error('No hay partidos programados en la lista de la AMH para esta división.');
    }

    let selectedPartido = null;
    if (partidoId) {
      selectedPartido = matchOptions.find(m => m.id === String(partidoId));
    }
    if (!selectedPartido && rival) {
      const normRival = normalizeStr(rival);
      selectedPartido = matchOptions.find(m => normalizeStr(m.text).includes(normRival));
    }
    if (!selectedPartido) {
      // Tomar el primer partido programado de Regatas Andino
      selectedPartido = matchOptions[0];
    }

    onProgress({ step: 8, message: `Seleccionado partido: ${selectedPartido.text}...` });
    await page.select('#P13_TORP_PARTIDO_NRO', selectedPartido.id);
    await page.waitForNetworkIdle({ idleTime: 800 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // PASO 6: Selección de Bloque (Bloque B)
    onProgress({ step: 9, message: 'Seleccionando Bloque B...' });
    const bloqueVal = await page.evaluate(() => {
      const s = document.querySelector('#P13_TORI_COD_CATEGORIA');
      const opt = Array.from(s.options).find(o => o.text.trim().toUpperCase() === 'B' || o.text.toUpperCase().includes('BLOQUE B'));
      return opt ? opt.value : '2';
    });
    await page.select('#P13_TORI_COD_CATEGORIA', bloqueVal);
    await page.waitForNetworkIdle({ idleTime: 800 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // PASO 7: Acceder a la Precarga (Página 37)
    onProgress({ step: 10, message: 'Ingresando a la lista de jugadoras para el partido...' });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#B145050039189584162')
    ]);

    // PASO 8: Leer tabla de Jugadores No Inscriptos
    onProgress({ step: 11, message: 'Analizando padrón de jugadoras de Regatas Andino...' });
    const amhPlayers = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#report_table_R1831655343735757573 tbody tr'));
      return rows.map(r => {
        const cb = r.querySelector('input[type="checkbox"][name="f01"]');
        const cells = Array.from(r.querySelectorAll('td')).map(td => td.innerText.trim());
        if (!cb || cells.length < 3) return null;
        return {
          dni: cb.value,
          name: cells[2] || '',
          division: cells[3] || '',
          bloque: cells[4] || '',
          checked: cb.checked
        };
      }).filter(Boolean);
    });

    onProgress({ step: 12, message: `Se encontraron ${amhPlayers.length} jugadoras disponibles en el sistema.` });

    // PASO 9: Matchear y Tildar Jugadoras
    const matchesFound = [];
    const unmatchedCited = [];
    const dnisToInscribe = [];

    for (const cited of players) {
      const match = matchPlayer(cited, amhPlayers);
      if (match && match.score >= 0.65) {
        matchesFound.push({
          cited,
          amhName: match.amh.name,
          dni: match.amh.dni,
          score: Math.round(match.score * 100)
        });
        dnisToInscribe.push(match.amh.dni);
      } else {
        unmatchedCited.push(cited);
      }
    }

    onProgress({ 
      step: 13, 
      message: `Tildando ${dnisToInscribe.length} de ${players.length} citadas coincidentes...` 
    });

    // Tildar cada casilla en el navegador
    await page.evaluate((dnis) => {
      dnis.forEach(dni => {
        const cb = document.querySelector(`input[name="f01"][value="${dni}"]`);
        if (cb && !cb.checked) {
          cb.click();
        }
      });
    }, dnisToInscribe);

    // PASO 10: INSCRIBIR TILDADOS (Únicamente #INSCRIBE_ID - NUNCA #CIERRA_ID)
    onProgress({ step: 14, message: 'Guardando inscripción: Presionando "Inscribe Tildados"...' });

    // Verificación de seguridad estricta antes de clickear
    const buttonSecurityCheck = await page.evaluate(() => {
      const inscribeBtn = document.querySelector('#INSCRIBE_ID');
      return {
        exists: !!inscribeBtn,
        text: inscribeBtn ? inscribeBtn.innerText.trim() : null
      };
    });

    if (!buttonSecurityCheck.exists) {
      throw new Error('No se encontró el botón seguro #INSCRIBE_ID ("Inscribe Tildados") en la página.');
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
      page.click('#INSCRIBE_ID')
    ]);

    await page.waitForNetworkIdle({ idleTime: 1000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));

    onProgress({ 
      step: 15, 
      message: '✅ ¡Precarga realizada con éxito! Las jugadoras quedaron inscriptas en el sistema oficial.' 
    });

    return {
      success: true,
      division: divNombre,
      partido: selectedPartido.text,
      totalCited: players.length,
      inscribedCount: matchesFound.length,
      matches: matchesFound,
      unmatched: unmatchedCited,
      precargaCerrada: false, // Garantizado por contrato
      timestamp: new Date().toISOString()
    };

  } finally {
    await browser.close();
  }
}

// Ejecución directa por CLI si se llama desde terminal
if (require.main === module) {
  const args = process.argv.slice(2);
  const divArg = args.find(a => a.startsWith('--division='))?.split('=')[1] || '1';

  console.log(`\n======================================================`);
  console.log(`🏑 TEST CLI DE PRECARGA AMH - REGATAS ANDINO`);
  console.log(`División: ${divArg === '2' ? 'Intermedia' : 'Primera'}`);
  console.log(`======================================================\n`);

  // Partidos de prueba
  fetchAvailableMatches(divArg)
    .then(partidos => {
      console.log('Partidos disponibles en AMH:');
      console.table(partidos);
    })
    .catch(err => {
      console.error('Error:', err.message);
    });
}

module.exports = {
  fetchAvailableMatches,
  executeAmhPrecarga,
  matchPlayer
};
