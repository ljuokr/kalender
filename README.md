# PHBern Raumkalender · Multi-Room-Viewer

Statische Single-Page-App für die Anzeige von Raumbuchungen aus dem PHBern-Raumkalender. Bis zu **6 Räume gleichzeitig** in drei Ansichten:

* **Woche** — eine Woche, Mo–Fr/Sa/So als Zeitraster, alle Räume in einem gemeinsamen Grid mit Sub-Spalten.
* **Halbtag** — ein Wochentag × Halbtag (Vormittag / Nachmittag / Abend) durchs ganze Semester als Tabelle.
* **Semester gesamt** — Heatmap pro Raum: Wochen × Tag × Halbtag, mit proportionalen Mini-Blöcken bei gesplitteten Belegungen.

## Räume (gruppiert)

| Gruppe     | Räume                  |
|------------|------------------------|
| Textil     | D004, D008             |
| Technisch  | D023, D027             |
| BG         | A023, A025             |
| Nassraum   | A027                   |
| MI         | C003, C005             |

## Server-lose Nutzung (Empfehlung)

Alle Daten sind in `data.js` als statischer Snapshot eingebettet. Einfach `index.html` öffnen — fertig. Kein Proxy, kein Server, kein CORS.

```bash
open index.html
```

(Bei manchen Browsern blockiert `file://` lokale Skripte. Im Zweifel kurz einen Static-Server starten: `python3 -m http.server 8080` und [http://localhost:8080](http://localhost:8080) öffnen.)

## Daten aktualisieren

Wenn der Snapshot veraltet ist, neu generieren:

```bash
node build-data.js
```

Lädt für alle Räume × HS25/FS26/HS26 die aktuellen Buchungen von PHBern und schreibt `data.js` neu (~420 KB, ~390 API-Calls, dauert ca. 1 Min).

Stand und Disclaimer werden automatisch im Header der App angezeigt.

## Live-Modus (optional)

Falls `data.js` fehlt oder eine ganz aktuelle Woche außerhalb des Snapshots benötigt wird, fällt die App automatisch auf die Live-API zurück. Da PHBern keine CORS-Header setzt, braucht es dann einen Proxy:

```bash
node proxy.js   # Port 3000
```

`script.js` versucht der Reihe nach `/api/events`, `http://localhost:3000/api/events`, `http://127.0.0.1:3000/api/events`, dann den direkten PHBern-Endpunkt.

## Cloudflare Worker (für öffentliches Hosting im Live-Modus)

Minimaler Worker in `worker/worker.js`:

1. `npm create cloudflare@latest` → Template „Hello World Worker".
2. Inhalt von `worker/worker.js` in die erzeugte `src/index.js` kopieren.
3. `npm run deploy` → URL wie `https://<name>.workers.dev/api/events`.
4. In `script.js` `API_ENDPOINTS` ergänzen.

## Architektur

* **`index.html`** — Header, Disclaimer (Stand-Datum + Link auf Original), Toolbar, drei View-Container.
* **`data.js`** — generierter Snapshot: `window.RAUMDATEN`, `window.RAUMDATEN_STAND`, `window.RAUMDATEN_SEMESTERS`.
* **`script.js`** — Cache-First (Snapshot vor API), Wochengrid (Sub-Spalten pro Raum), Halbtag-Tabelle, Semester-Heatmap.
* **`style.css`** — Helles Theme im PHBern-Stil (Rot `#ac0101`).
* **`build-data.js`** — Node-Skript zum Snapshot-Bau.
* **`proxy.js` / `worker/worker.js`** — optionale Proxies für Live-Modus.

## Disclaimer

> ⚠ **Experimentell, ohne Gewähr.** Im Zweifel gilt der offizielle [PHBern-Raumkalender](https://apps.phbern.ch/raumkalender/).
