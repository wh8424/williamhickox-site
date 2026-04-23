// Vercel serverless proxy: williamhickox.com add-todo form → ops dashboard.
//
// The public ops endpoint (ops.williamhickox.com/api/todos/public) is guarded
// by a shared API key that we can't safely ship to a static HTML page.
// This function holds TODO_PUBLIC_API_KEY server-side and also re-verifies
// the 4-digit PIN that gates the browser form, so neither secret is exposed
// to the client.

const OPS_URL = 'https://ops.williamhickox.com/api/todos/public';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const expectedPin = process.env.TODO_PIN;
  const apiKey = process.env.TODO_PUBLIC_API_KEY;
  if (!expectedPin || !apiKey) {
    res.status(503).json({ error: 'server not configured' });
    return;
  }

  const providedPin = req.headers['x-todo-pin'];
  if (!providedPin || !safeEqual(String(providedPin), expectedPin)) {
    res.status(401).json({ error: 'invalid pin' });
    return;
  }

  try {
    const upstream = await fetch(OPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Todo-Api-Key': apiKey,
      },
      body: JSON.stringify(req.body ?? {}),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (e) {
    console.error('[create-todo] upstream failed:', e);
    res.status(502).json({ error: 'upstream unreachable' });
  }
}
