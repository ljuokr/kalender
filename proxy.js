// Minimaler Proxy ohne Abhängigkeiten (Node 18+ mit fetch).
// Start: `node proxy.js` (lauscht auf Port 3000)
// Frontend greift dann unter http://localhost:3000/api/events zu.

import http from 'node:http';

const TARGET = 'https://apps.phbern.ch/raumkalender/api/v1/resource/events';
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    // Preflight für CORS
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  if (req.method !== 'POST' || req.url !== '/api/events') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  try {
    const body = await readJson(req);
    const upstream = await fetch(TARGET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    });
    res.end(text);
  } catch (err) {
    console.error('Proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders() });
    res.end(JSON.stringify({ error: 'Proxy failed', detail: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Proxy läuft auf http://localhost:${PORT}/api/events`);
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
