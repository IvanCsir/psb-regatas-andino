/**
 * Endpoint de Autenticación Ligera para Cuerpo Técnico
 * Club Regatas Andino - Plantel Superior B
 *
 * Valida la contraseña en el backend (Node.js / Vercel Serverless) y emite un
 * token de sesión firmado con expiración automática de 12 horas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Cargar .env en desarrollo local si no se han cargado variables de entorno
(function loadEnv() {
  if (!process.env.CT_PASSWORD) {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          line = line.trim();
          if (!line || line.startsWith('#')) return;
          const eqIdx = line.indexOf('=');
          if (eqIdx !== -1) {
            const key = line.slice(0, eqIdx).trim();
            const val = line.slice(eqIdx + 1).trim();
            if (!process.env[key]) process.env[key] = val;
          }
        });
      } catch (_) {}
    }
  }
})();

const CT_PASSWORD = process.env.CT_PASSWORD || 'ctandinob';
const CT_AUTH_SECRET = process.env.CT_AUTH_SECRET || 'regatas_andino_psb_secret_key_2026';
const SESSION_DURATION_HOURS = 24;

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createSessionToken() {
  const expiresAt = Date.now() + (SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const payload = `ct:${expiresAt}`;
  const signature = crypto.createHmac('sha256', CT_AUTH_SECRET).update(payload).digest('hex');
  const token = Buffer.from(JSON.stringify({ role: 'cuerpo_tecnico', expiresAt, signature })).toString('base64');
  return { token, expiresAt, durationHours: SESSION_DURATION_HOURS };
}

function verifySessionToken(token) {
  try {
    if (!token) return { valid: false, error: 'Token no provisto' };
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.expiresAt || !parsed.signature) return { valid: false, error: 'Formato inválido' };

    if (Date.now() > parsed.expiresAt) {
      return { valid: false, error: 'Sesión expirada' };
    }

    const expectedPayload = `ct:${parsed.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', CT_AUTH_SECRET).update(expectedPayload).digest('hex');
    if (!safeCompare(parsed.signature, expectedSig)) {
      return { valid: false, error: 'Firma inválida' };
    }

    return { valid: true, expiresAt: parsed.expiresAt };
  } catch (err) {
    return { valid: false, error: 'Token corrupto' };
  }
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = (req.headers && req.headers.host) || 'localhost';
  const urlObj = new URL(req.url || '/', `http://${host}`);

  // GET: Validar estado de un token existente
  if (req.method === 'GET') {
    const authHeader = (req.headers && req.headers.authorization) || '';
    const token = urlObj.searchParams.get('token') || authHeader.replace(/^Bearer\s+/i, '').trim();

    const verification = verifySessionToken(token);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(verification));
    return;
  }

  // POST: Login con contraseña de Cuerpo Técnico
  if (req.method === 'POST') {
    try {
      let body;
      if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else if (req.body && typeof req.body === 'string') {
        try { body = JSON.parse(req.body); } catch (_) { body = {}; }
      } else {
        const raw = await new Promise((resolve) => {
          let data = '';
          req.on('data', chunk => data += chunk);
          req.on('end', () => resolve(data));
        });
        try { body = JSON.parse(raw); } catch (_) { body = {}; }
      }

      const submittedPassword = (body.password || '').toString().trim();
      const officialPassword = CT_PASSWORD.trim();

      if (submittedPassword && safeCompare(submittedPassword, officialPassword)) {
        const session = createSessionToken();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          token: session.token,
          expiresAt: session.expiresAt,
          durationHours: session.durationHours,
          message: 'Sesión de Cuerpo Técnico iniciada correctamente'
        }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: 'Contraseña de Cuerpo Técnico incorrecta'
        }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Método no permitido' }));
};
