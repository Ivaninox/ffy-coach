export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'KV non configuré — ajoutez KV_REST_API_URL et KV_REST_API_TOKEN dans les variables Vercel.' });
  }

  if (req.method === 'GET') {
    const r = await fetch(`${url}/get/ffy_score_history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    return res.status(200).json(d.result ? JSON.parse(d.result) : []);
  }

  if (req.method === 'POST') {
    const entry = req.body;
    if (!entry || !entry.commercial) return res.status(400).json({ error: 'Entrée invalide' });

    // Lire l'historique existant
    const getR = await fetch(`${url}/get/ffy_score_history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const getData = await getR.json();
    const history = getData.result ? JSON.parse(getData.result) : [];

    history.unshift(entry);
    if (history.length > 500) history.splice(500);

    await fetch(`${url}/set/ffy_score_history`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(JSON.stringify(history))
    });

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await fetch(`${url}/del/ffy_score_history`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
