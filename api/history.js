import Redis from 'ioredis';

const REDIS_KEY = 'ffy:coach:history';

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL non configurée dans les variables d\'environnement');
  _redis = new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 6000, lazyConnect: false });
  _redis.on('error', () => {}); // évite les crash non gérés
  return _redis;
}

async function readHistory() {
  try {
    const raw = await getRedis().get(REDIS_KEY);
    if (!raw) return { version: '1.0', history: [] };
    const data = JSON.parse(raw);
    if (!data.version) return { version: '1.0', history: Array.isArray(data) ? data : (data.history || []) };
    return data;
  } catch {
    return { version: '1.0', history: [] };
  }
}

async function writeHistory(data) {
  await getRedis().set(REDIS_KEY, JSON.stringify(data));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const data = await readHistory();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const entry = req.body;
    if (!entry || !entry.id) return res.status(400).json({ error: 'entry.id manquant' });
    const data = await readHistory();
    data.history = data.history.filter(e => e.id !== entry.id);
    data.history.push(entry);
    await writeHistory(data);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const urlObj = new URL(req.url, 'http://localhost');
    const id = urlObj.searchParams.get('id');
    if (id) {
      const data = await readHistory();
      data.history = data.history.filter(e => e.id !== id);
      await writeHistory(data);
    } else {
      await writeHistory({ version: '1.0', history: [] });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
