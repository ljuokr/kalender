# Kalender Viewer (Raum 8270866)

Zeigt Termine aus dem PHBern-Raumkalender. Frontend lädt per POST die Events und filtert nach Datum.

## Proxy nutzen (gegen CORS)
Falls der Direktzugriff vom Browser blockiert wird:

1. Proxy starten (Node 18+ reicht, keine Dependencies):
   ```bash
   node proxy.js
   ```
   Lauscht auf `http://localhost:3000/api/events`.
2. Das Frontend versucht zuerst `/.api/events` auf derselben Origin und fällt bei Fehler auf den Direkt-API-Endpunkt zurück. Läuft der Proxy, werden die Calls darüber geroutet.

## Cloudflare Worker (ohne eigenen Server)
Minimaler Worker liegt unter `worker/worker.js`. Deployment (kurz):
1. `npm create cloudflare@latest` und Template „Hello World Worker“ wählen.
2. Inhalt von `worker/worker.js` in die erzeugte `src/index.js` (oder `worker.js`) kopieren.
3. Deploy: `npm run deploy` → URL wie `https://<dein-worker>.workers.dev/api/events`.
4. In `script.js` bei `API_ENDPOINTS` `<your-worker>` durch deinen Worker-Namen ersetzen (als erste URL).
5. Statisches Frontend hosten (z. B. GitHub Pages/Cloudflare Pages); der Worker erlaubt CORS für alle Origins.

## Entwicklung
* Statische Dateien: `index.html`, `style.css`, `script.js`
* Proxy: `proxy.js` (lokal) oder `worker/worker.js` (Cloudflare Worker)
