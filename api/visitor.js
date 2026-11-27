/* ──────────────────────────────────────────────────────────────────────────
   POST /api/visitor → { n }: hands a new visitor the next number.

   The count lives in the Upstash Redis store connected to this project in
   Vercel (Storage → Upstash for Redis). Connecting it adds the store's REST
   address and token as environment variables; any of the usual names work,
   with or without a custom prefix.

   The browser keeps its number, so a visitor only asks once. To stop a
   refresh loop from running the count up, each network address can claim
   at most five new numbers every ten minutes; after that it's told the
   current count instead. Addresses are only kept as a short-lived hash.
   ────────────────────────────────────────────────────────────────────────── */

const crypto = require('crypto');

const fromEnv = (suffixes) => {
  const key = Object.keys(process.env).find((k) => suffixes.some((s) => k === s || k.endsWith(`_${s}`)));
  return key ? process.env[key] : undefined;
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const url = fromEnv(['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL']);
  const token = fromEnv(['KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN']);
  if (!url || !token) return res.status(503).json({ error: 'counter store not connected' });

  const redis = async (...command) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (!r.ok) throw new Error(`store answered ${r.status}`);
    const body = await r.json();
    if (body.error) throw new Error(body.error);
    return body.result;
  };

  try {
    const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '')
      .split(',')[0]
      .trim();
    const key = `visitor:recent:${crypto.createHash('sha256').update(`piano:${ip}`).digest('hex').slice(0, 24)}`;
    const recent = Number(await redis('INCR', key));
    if (recent === 1) await redis('EXPIRE', key, '600');
    const n = recent <= 5 ? Number(await redis('INCR', 'visitors')) : Number(await redis('GET', 'visitors')) || 0;
    return res.status(200).json({ n });
  } catch (err) {
    return res.status(502).json({ error: 'counter unavailable' });
  }
};
