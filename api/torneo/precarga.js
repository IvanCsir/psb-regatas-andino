/**
 * Endpoint para Precarga Oficial AMH
 * Soporta GET (listar partidos disponibles) y POST (inscribir tildados)
 */

const { fetchAvailableMatches, executeAmhPrecarga } = require('../../scripts/amh_precarga.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // GET: Obtener partidos disponibles
  if (req.method === 'GET' || url.searchParams.has('matches')) {
    const division = url.searchParams.get('division') || '1';
    try {
      const matches = await fetchAvailableMatches(division);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, matches }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // POST: Ejecutar precarga
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { division = '1', partidoId = null, rival = null, players = [] } = payload;

        if (!players || players.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'Lista de jugadoras vacía.' }));
          return;
        }

        const result = await executeAmhPrecarga({
          division,
          partidoId,
          rival,
          players
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Método no permitido' }));
};
