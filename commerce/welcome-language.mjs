import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import pg from 'pg';

const createTable = `CREATE TABLE IF NOT EXISTS storefront_language_welcome_seen (
  ip_hash char(64) PRIMARY KEY,
  seen_at timestamptz NOT NULL DEFAULT now()
)`;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

// Vercel supplies these headers; it overwrites incoming X-Forwarded-For to
// prevent client spoofing. Never accept a client-supplied IP in the body.
export function createWelcomeHandler(poolFactory = () => new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 10000,
})) {
  let pool;
  let schemaReady;
  return async function welcomeHandler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      const allowed = new Set([
        'https://www.sasifysolutions.com',
        'https://sasifysolutions.com',
        ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
      ]);
      if (!origin || !allowed.has(origin)) return send(res, 403, { error: 'Invalid origin' });
    }
    const country = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
    const ip = String(req.headers['x-vercel-forwarded-for'] || '').trim();
    if (country !== 'PK' || !isIP(ip)) return send(res, 200, { eligible: false });
    const secret = process.env.COMMERCE_ENCRYPTION_KEY;
    if (!process.env.DATABASE_URL || !/^[a-f0-9]{64}$/i.test(secret || ''))
      return send(res, 503, { eligible: false });
    const ipHash = createHmac('sha256', Buffer.from(secret, 'hex')).update(ip).digest('hex');
    try {
      pool ||= poolFactory();
      schemaReady ||= pool.query(createTable).catch((error) => { schemaReady = null; throw error; });
      await schemaReady;
      if (req.method === 'GET') {
        const seen = await pool.query('SELECT 1 FROM storefront_language_welcome_seen WHERE ip_hash=$1', [ipHash]);
        return send(res, 200, { eligible: seen.rowCount === 0 });
      }
      await pool.query('INSERT INTO storefront_language_welcome_seen (ip_hash) VALUES ($1) ON CONFLICT DO NOTHING', [ipHash]);
      return send(res, 200, { eligible: false });
    } catch {
      return send(res, 503, { eligible: false });
    }
  };
}

export default createWelcomeHandler();
