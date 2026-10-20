const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function fetchAmhStandings(division, callback) {
  const divId = division === '2' ? '2' : '1';
  const url = `http://15.235.75.172:8080/ords/r/amh/torneos/5?p5_torneos_f=97&p5_jug_cod_division_f=${divId}`;

  http.get(url, res => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
      try {
        const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
        const tableData = [];
        const scorersData = [];
        let isScorers = false;

        rows.forEach(r => {
          const cells = [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
            .map(c => c[1].replace(/<[^>]+>/g, '').trim());
          if (cells.length === 0 || cells.every(c => !c)) return;

          if (cells.includes('Jugador') || cells.includes('Goles')) {
            isScorers = true;
            return;
          }

          if (cells.includes('Posición') || cells.includes('Equipo')) {
            return;
          }

          if (!isScorers) {
            const filtered = cells.filter(c => c !== '');
            if (filtered.length >= 10) {
              tableData.push({
                pos: parseInt(filtered[0], 10),
                zona: filtered[1],
                team: filtered[2],
                pj: parseInt(filtered[3], 10),
                pg: parseInt(filtered[4], 10),
                pe: parseInt(filtered[5], 10),
                pp: parseInt(filtered[6], 10),
                gf: parseInt(filtered[7], 10),
                ge: parseInt(filtered[8], 10),
                dif: parseInt(filtered[9], 10),
                bonus: parseInt(filtered[10] || 0, 10),
                pts: parseInt(filtered[filtered.length - 1], 10)
              });
            }
          } else {
            const filtered = cells.filter(c => c !== '');
            if (filtered.length >= 3) {
              scorersData.push({
                club: filtered[0],
                player: filtered[1],
                goals: parseInt(filtered[2], 10)
              });
            }
          }
        });

        callback(null, {
          tournament: "Clausura Damas B 2026",
          division: divId,
          divisionName: divId === '2' ? 'Intermedia (Segunda)' : '1ra División (Primera)',
          standings: tableData,
          scorers: scorersData,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        callback(err);
      }
    });
  }).on('error', err => callback(err));
}

function fetchAmhMatches(division, callback) {
  const divId = division === '2' ? '2' : '1';
  const url = `http://15.235.75.172:8080/ords/f?p=1107:6:0:FLOW_EXCEL_OUTPUT:::P6_TORNEOS_P,P6_CLUB_P,P6_JUG_COD_DIVISION_P:97,3,${divId}`;

  http.get(url, res => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
      try {
        const tableMatch = html.match(/<table[^>]+id="report_table_R195581212816937222"[^>]*>([\s\S]*?)<\/table>/i);
        if (!tableMatch) { callback(null, { matches: [], playedMatches: [], nextMatch: null }); return; }

        const rows = [...tableMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
        const allMatches = [];
        const playedMatches = [];
        const pendingMatches = [];
        let nextMatch = null;

        rows.forEach(r => {
          const cells = {};
          const tdMatches = [...r[1].matchAll(/<td[^>]+headers="([^"]+)"[^>]*>([\s\S]*?)<\/td>/gi)];
          tdMatches.forEach(td => {
            const header = td[1].trim();
            const rawVal = td[2].replace(/<[^>]+>/g, '').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&').trim();
            cells[header] = rawVal;
            if (header === 'ESTADO_PARTIDO') cells['ESTADO_HTML'] = td[2];
          });

          if (!cells['FECHA_NRO']) return;

          const estadoHtml = cells['ESTADO_HTML'] || '';
          // En AMH Oficial:
          // fa-times-circle / color:#E50D0D = Cruz roja (X) -> PARTIDO PENDIENTE / NO JUGADO AÚN
          // fa-check-circle / color:#0E7A16 = Check verde -> PARTIDO DISPUTADO / JUGADO
          const hasTimesCircle = estadoHtml.includes('fa-times-circle') || estadoHtml.includes('#E50D0D') || estadoHtml.includes('times');
          const hasCheckCircle = estadoHtml.includes('fa-check-circle') || estadoHtml.includes('#0E7A16');
          const isPlayed = hasCheckCircle && !hasTimesCircle;

          const local = cells['EQUIPO_LOCAL'] || '';
          const visita = cells['EQUIPO_VISITANTE'] || '';
          const isHome = local.toUpperCase().includes('REGATAS');
          const rival = (isHome ? visita : local).replace(/\s*\([A-Z]\)\s*$/, '').trim();
          const homeAway = isHome ? 'Local' : 'Visitante';

          let score = '-', result = 'pending';
          if (isPlayed) {
            const gl = parseInt(cells['GOLES_LOCAL'], 10) || 0;
            const gv = parseInt(cells['GOLES_VISITA'], 10) || 0;
            if (isHome) {
              score = `${gl} - ${gv}`;
              result = gl > gv ? 'win' : (gl < gv ? 'loss' : 'draw');
            } else {
              score = `${gv} - ${gl}`;
              result = gv > gl ? 'win' : (gv < gl ? 'loss' : 'draw');
            }
          }

          const matchObj = {
            round: `Fecha ${cells['FECHA_NRO']}`,
            fecha: cells['FECHA'] || '',
            rival,
            homeAway,
            score,
            result,
            played: isPlayed,
            status: isPlayed ? 'Jugado' : 'Pendiente'
          };

          allMatches.push(matchObj);
          if (isPlayed) {
            playedMatches.push(matchObj);
          } else {
            pendingMatches.push(matchObj);
            if (!nextMatch) {
              nextMatch = {
                round: `Fecha ${cells['FECHA_NRO']}`,
                fecha: cells['FECHA'] || '',
                rival,
                homeAway,
                status: 'Pendiente'
              };
            }
          }
        });

        callback(null, { matches: allMatches, playedMatches, pendingMatches, nextMatch });
      } catch (err) {
        callback(err);
      }
    });
  }).on('error', err => callback(err));
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = urlObj.pathname;

  // API Proxy para Torneo AMH (evita CORS y Mixed Content en local)
  if (reqPath === '/api/torneo') {
    const division = urlObj.searchParams.get('division') || '1';
    fetchAmhStandings(division, (err, data) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify(data));
      }
    });
    return;
  }

  // API Proxy para Partidos AMH
  if (reqPath === '/api/torneo/matches') {
    const division = urlObj.searchParams.get('division') || '1';
    fetchAmhMatches(division, (err, data) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({
          division,
          matches: data.allMatches || data.matches,
          playedMatches: data.playedMatches,
          pendingMatches: data.pendingMatches,
          nextMatch: data.nextMatch,
          updatedAt: new Date().toISOString()
        }));
      }
    });
    return;
  }

  // API para Precarga Oficial AMH
  if (reqPath === '/api/torneo/precarga' || reqPath === '/api/precarga') {
    const precargaHandler = require('./api/torneo/precarga.js');
    precargaHandler(req, res);
    return;
  }

  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 No Encontrado');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error interno del servidor: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🏑 Servidor de Citaciones y Torneo Hockey ACTIVO`);
  console.log(`👉 Abrí en tu navegador: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
