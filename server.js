import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import historyHandler from './api/history.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lire .env.local
try {
  const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  });
} catch {}

const PORT = 3000;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// Adaptateur : transforme req/res natifs Node en interface compatible avec le handler Vercel
function makeVercelRes(res) {
  const vRes = {
    _status: 200,
    status(code) { this._status = code; return this; },
    json(data) {
      res.writeHead(this._status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    },
    setHeader(k, v) { res.setHeader(k, v); }
  };
  return vRes;
}

const server = http.createServer(async (req, res) => {
  // /api/chat — proxy vers Anthropic
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) { res.writeHead(500); res.end(JSON.stringify({ error: 'API_KEY non définie' })); return; }
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body
        });
        const data = await response.json();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // /api/history — GET / POST / DELETE
  if (req.url === '/api/history') {
    const body = req.method !== 'GET' ? await parseBody(req) : {};
    req.body = body;
    await historyHandler(req, makeVercelRes(res));
    return;
  }

  // Fichiers statiques
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`✅ FFY Coach disponible sur http://localhost:${PORT}`));
