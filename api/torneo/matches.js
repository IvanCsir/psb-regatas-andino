const http = require('http');

function fetchAmhMatches(division) {
  return new Promise((resolve, reject) => {
    const divId = division === '2' ? '2' : '1';
    const url = `http://15.235.75.172:8080/ords/f?p=1107:6:0:FLOW_EXCEL_OUTPUT:::P6_TORNEOS_P,P6_CLUB_P,P6_JUG_COD_DIVISION_P:97,3,${divId}`;

    const req = http.get(url, (res) => {
      let html = '';
      res.on('data', (chunk) => { html += chunk; });
      res.on('end', () => {
        try {
          const tableMatch = html.match(/<table[^>]+id="report_table_R195581212816937222"[^>]*>([\s\S]*?)<\/table>/i);
          if (!tableMatch) {
            resolve({ matches: [], playedMatches: [], pendingMatches: [], nextMatch: null });
            return;
          }

          const rows = [...tableMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
          const allMatches = [];
          const playedMatches = [];
          const pendingMatches = [];
          let nextMatch = null;

          rows.forEach((r) => {
            const cells = {};
            const tdMatches = [...r[1].matchAll(/<td[^>]+headers="([^"]+)"[^>]*>([\s\S]*?)<\/td>/gi)];
            tdMatches.forEach((td) => {
              const header = td[1].trim();
              const rawVal = td[2].replace(/<[^>]+>/g, '').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&').trim();
              cells[header] = rawVal;
              if (header === 'ESTADO_PARTIDO') cells['ESTADO_HTML'] = td[2];
            });

            if (!cells['FECHA_NRO']) return;

            const estadoHtml = cells['ESTADO_HTML'] || '';
            const hasTimesCircle = estadoHtml.includes('fa-times-circle') || estadoHtml.includes('#E50D0D') || estadoHtml.includes('times');
            const hasCheckCircle = estadoHtml.includes('fa-check-circle') || estadoHtml.includes('#0E7A16');
            const isPlayed = hasCheckCircle && !hasTimesCircle;

            const local = cells['EQUIPO_LOCAL'] || '';
            const visita = cells['EQUIPO_VISITANTE'] || '';
            const isHome = local.toUpperCase().includes('REGATAS');
            const rival = (isHome ? visita : local).replace(/\s*\([A-Z]\)\s*$/, '').trim();
            const homeAway = isHome ? 'Local' : 'Visitante';

            let score = '-';
            let result = 'pending';
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

          resolve({
            division,
            matches: allMatches,
            playedMatches,
            pendingMatches,
            nextMatch,
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Timeout conectando a AMH'));
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const division = urlObj.searchParams.get('division') || '1';

  try {
    const data = await fetchAmhMatches(division);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: err.message, matches: [], playedMatches: [], pendingMatches: [] }));
  }
};
