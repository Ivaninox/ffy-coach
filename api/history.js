import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'history.json');

function readHistory() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { version: '1.0', history: [] };
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.version) {
      return { version: '1.0', history: Array.isArray(data) ? data : (data.history || []) };
    }
    return data;
  } catch {
    return { version: '1.0', history: [] };
  }
}

function writeHistory(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    return res.status(200).json(readHistory());
  }

  if (req.method === 'POST') {
    const entry = req.body;
    if (!entry || !entry.id) return res.status(400).json({ error: 'entry.id manquant' });
    const data = readHistory();
    data.history = data.history.filter(e => e.id !== entry.id); // déduplique
    data.history.push(entry);
    writeHistory(data);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const urlObj = new URL(req.url, 'http://localhost');
    const id = urlObj.searchParams.get('id');
    if (id) {
      const data = readHistory();
      data.history = data.history.filter(e => e.id !== id);
      writeHistory(data);
    } else {
      writeHistory({ version: '1.0', history: [] });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
