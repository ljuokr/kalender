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

## Entwicklung
* Statische Dateien: `index.html`, `style.css`, `script.js`
* Proxy: `proxy.js` (nur für den API-Call)

