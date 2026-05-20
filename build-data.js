// Build-Skript: holt alle Events aller Räume × aller Semester von PHBern
// und schreibt eine eingebettete Snapshot-Datei `data.js`.
// Aufruf: `node build-data.js`

import fs from 'node:fs';

const ROOMS = [
  { code: 'D004', id: 8270855 },
  { code: 'D008', id: 8270858 },
  { code: 'D023', id: 8270863 },
  { code: 'D027', id: 8270866 },
  { code: 'A023', id: 8270837 },
  { code: 'A025', id: 8270838 },
  { code: 'A027', id: 8270839 },
  { code: 'C003', id: 8270847 },
  { code: 'C005', id: 8270849 },
];

// FS-Range: 01.02. bis 31.07. (inkl. Blocktage am Anfang und nach dem Semester-Ende)
// HS-Range: 01.08. bis 31.01. (inkl. Vor-Block-Woche und Januar-Blocktage)
const SEMESTERS = {
  HS25: { start: '2025-08-01', end: '2026-01-31' },
  FS26: { start: '2026-02-01', end: '2026-07-31' },
  HS26: { start: '2026-08-01', end: '2027-01-31' },
};

const API = 'https://apps.phbern.ch/raumkalender/api/v1/resource/events';

function swissDate(d) {
  return [String(d.getDate()).padStart(2,'0'), String(d.getMonth()+1).padStart(2,'0'), d.getFullYear()].join('.');
}
function startOfWeek(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - dow);
  return d;
}
function* eachMonday(startISO, endISO) {
  const start = startOfWeek(new Date(startISO + 'T00:00:00'));
  const end = new Date(endISO + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
    yield new Date(d);
  }
}

async function fetchWeek(roomId, mondaySwiss) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource: roomId, datepickerValue: mondaySwiss }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for room ${roomId} on ${mondaySwiss}`);
  return res.json();
}

(async () => {
  const data = {};
  let total = 0, fetched = 0;

  for (const sem of Object.values(SEMESTERS)) {
    for (const _ of eachMonday(sem.start, sem.end)) total += ROOMS.length;
  }
  console.log(`Hole ${total} Wochen-Snapshots …`);

  for (const room of ROOMS) {
    data[room.id] = {};
    for (const semKey of Object.keys(SEMESTERS)) {
      const sem = SEMESTERS[semKey];
      for (const monday of eachMonday(sem.start, sem.end)) {
        const key = swissDate(monday);
        try {
          const json = await fetchWeek(room.id, key);
          // Nur die wichtigen Felder behalten – kompakt
          const evs = (json.events || []).map(e => ({
            i: e.id,
            t: e.title || '',
            s: e.start,    // Sekunden
            e: e.stop,
            p: e.persons || '',
          }));
          data[room.id][key] = evs;
        } catch (err) {
          console.warn(`! ${room.code} ${key}: ${err.message}`);
          data[room.id][key] = [];
        }
        fetched++;
        if (fetched % 20 === 0) console.log(`  ${fetched}/${total}`);
      }
    }
  }

  const stand = swissDate(new Date());
  const out = `// Automatisch generiert von build-data.js am ${stand}\n` +
              `// Quelle: https://apps.phbern.ch/raumkalender/\n` +
              `window.RAUMDATEN_STAND = ${JSON.stringify(stand)};\n` +
              `window.RAUMDATEN_SEMESTERS = ${JSON.stringify(SEMESTERS)};\n` +
              `window.RAUMDATEN = ${JSON.stringify(data)};\n`;
  fs.writeFileSync('data.js', out);
  const kb = (out.length / 1024).toFixed(1);
  console.log(`✓ data.js geschrieben (${kb} KB, Stand ${stand})`);
})();
