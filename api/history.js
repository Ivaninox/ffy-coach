import Redis from 'ioredis';

const KEY = 'ffy_score_history';

let redis = null;
function getRedis() {
  if (!redis) {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL non définie');
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 3 });
  }
  return redis;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const client = getRedis();

    if (req.method === 'GET') {
      const data = await client.get(KEY);
      return res.status(200).json(data ? JSON.parse(data) : []);
    }

    if (req.method === 'POST') {
      const entry = req.body;
      if (!entry?.commercial) return res.status(400).json({ error: 'Entrée invalide' });
      const data = await client.get(KEY);
      const history = data ? JSON.parse(data) : [];
      history.unshift(entry);
      if (history.length > 500) history.splice(500);
      await client.set(KEY, JSON.stringify(history));
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await client.del(KEY);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
