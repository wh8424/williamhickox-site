// Vercel serverless proxy: williamhickox.com autocomplete → ops dashboard tags.
//
// Mirrors api/create-todo.js: holds TODO_PUBLIC_API_KEY server-side and
// forwards a GET to ops.williamhickox.com/api/todos/tags. The home-page
// add-todo form fetches this to populate its tag autocomplete; nothing
// here is sensitive (every active project_tag is already visible on the
// dashboard's brief/todos pages), but routing through a proxy keeps the
// API key off the static HTML surface.
//
// No PIN check — fetching available tags is a passive read (no DB
// write, no side effect). The PIN gate kicks in at submit time via
// /api/create-todo.

const OPS_URL = 'https://ops.williamhickox.com/api/todos/tags';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const apiKey = process.env.TODO_PUBLIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'server not configured' });
    return;
  }
  try {
    const upstream = await fetch(OPS_URL, {
      method: 'GET',
      headers: { 'X-Todo-Api-Key': apiKey },
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/json',
    );
    // Lightly cacheable on the edge — tags don't change minute-to-minute,
    // but a stale value is harmless (worst case the user sees one fewer
    // suggestion until next reload). 60s is a reasonable trade-off.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.send(text);
  } catch (e) {
    console.error('[tags] upstream failed:', e);
    res.status(502).json({ error: 'upstream unreachable' });
  }
}
