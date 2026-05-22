(() => {
  // ---------- Konfiguration ----------
  // PHBern-Raumkalender-URL pro Raum: Datum als Pfad-Segment im Format DD.MM.YYYY
  // (Vue-Route: /room/:roomId/:date? — bestätigt aus app.js: $route.params.date, format("DD.MM.YYYY"))
  const ROOM_URL = (id, date) => {
    const base = `https://apps.phbern.ch/raumkalender/room/${id}/`;
    if (!date) return base;
    const d = (date instanceof Date) ? date : new Date(date);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${base}${dd}.${mm}.${yyyy}`;
  };
  // Raumfarben strikt aus dem Aushang/Legenden-Schema:
  //   Textil + Technisch: 1. Raum = IPS-Orange (#FFC000), 2. Raum = IS1-Cyan (#00B0F0)
  //   BG: Aushang-Gelb-Töne (offene Werkstatt), Nassraum: Magenta, MI: Orange-Braun
  const ROOMS = [
    // Textiles Gestalten — Aushang-Farben (vertauscht: D004 = Cyan, D008 = Orange)
    { code: 'D004', id: 8270855, label: 'D004 — Textiles trocken', color: '#00B0F0', group: 'Textil' },
    { code: 'D008', id: 8270858, label: 'D008 — Textiles nass',    color: '#FFC000', group: 'Textil' },
    // Technisches Gestalten — Aushang-Farben Orange + Cyan
    { code: 'D023', id: 8270863, label: 'D023 — TG Fachraum', color: '#FFC000', group: 'Technisch' },
    { code: 'D027', id: 8270866, label: 'D027 — TG Fachraum', color: '#00B0F0', group: 'Technisch' },
    // Bildnerisches Gestalten — Grün-Töne (klar von IPS-Orange unterscheidbar)
    { code: 'A023', id: 8270837, label: 'A023 — BG trocken', color: '#5C9F3B', group: 'BG' },
    { code: 'A025', id: 8270838, label: 'A025 — BG trocken', color: '#3B7022', group: 'BG' },
    // Nassraum — PHBern-Magenta (eigene Gruppe)
    { code: 'A027', id: 8270839, label: 'A027 — BG nass', color: '#B36B93', group: 'Nassraum' },
    // Medien & Informatik — warmes Orange-Braun (von Textil-Orange klar unterscheidbar)
    { code: 'C003', id: 8270847, label: 'C003 — MakerSpace',     color: '#E08A2C', group: 'MI' },
    { code: 'C005', id: 8270849, label: 'C005 — Medien & Inf.',  color: '#A35A12', group: 'MI' },
  ];
  ROOMS.forEach(r => { r.url = ROOM_URL(r.id); });

  const GROUPS = ['Textil', 'Technisch', 'BG', 'Nassraum', 'MI'];

  // Eindeutige Institutszuordnung aus dem Snapshot ableiten — nur für TTG-Räume
  // (Textiles Gestalten + Technisches Gestalten); bei BG/MI/Nassraum kein Badge,
  // weil dort beide Institute Module belegen.
  const _instCache = new Map();
  function instituteForRoom(roomId) {
    if (_instCache.has(roomId)) return _instCache.get(roomId);
    const room = ROOMS.find(r => r.id === roomId);
    if (!room || (room.group !== 'Textil' && room.group !== 'Technisch')) {
      _instCache.set(roomId, null); return null;
    }
    const data = window.RAUMDATEN?.[roomId];
    if (!data) { _instCache.set(roomId, null); return null; }
    const titles = new Set();
    for (const week of Object.values(data)) {
      for (const ev of week) {
        if (ev.t && !ev.t.startsWith('FDZ:')) titles.add(ev.t);
      }
    }
    if (!titles.size) { _instCache.set(roomId, null); return null; }
    const ipsRe = /Zyklus\s*[12]/i;
    const is1Re = /^TcG\b|TTG Klassenf|TTG Adapt|Mikroplanung TTG|Makroplanung TTG/;
    let ips = 0, is1 = 0;
    for (const t of titles) {
      if (ipsRe.test(t)) ips++;
      else if (is1Re.test(t)) is1++;
    }
    let inst = null;
    if (ips > 0 && is1 === 0) inst = 'IPS';
    else if (is1 > 0 && ips === 0) inst = 'IS1';
    _instCache.set(roomId, inst);
    return inst;
  }

  // Default beim Start = beide TG-Räume (Wochenansicht)
  const DEFAULT_SELECTED = ['D023', 'D027'];
  // Max. Räume pro Tab — wird beim Tab-Wechsel angewendet
  // Aushang-Tabs nutzen feste Räume aus AUSHANG_CONFIGS, daher gleichgültig
  const TAB_MAX_ROOMS = { week: 6, semester: 6, halfyear: 1, 'aushang-tcg': 6, 'aushang-txg': 6, 'aushang-bg': 6 };
  const MAX_SELECTED = 6; // globales Maximum

  // Aushang-Konfigurationen (feste Räume in Original-Reihenfolge wie Word-Vorlagen)
  const AUSHANG_CONFIGS = {
    TcG: {
      title: 'Raumbelegung Technisches Gestalten',
      rooms: ['D023', 'D027'], // Original-Reihenfolge: D023, D027
      ipsLeads: 'Verena Huber (VHu), Nora Fluri (NFl), Dominique Liniger (DLi), Elisabeth Jahnke (EJa), Maya Wechsler (MWe), Julia Lucas (JLu), Lukas Jordi (LJo)',
      is1Leads: 'Patrick Bürgy (PBü), Lukas Jordi (LJo), Andreas Stettler (ASe), Karin Hodel (KHo), Karin Brülisauer (KBr)',
    },
    TxG: {
      title: 'Raumbelegung Textiles Gestalten',
      rooms: ['D004', 'D008'], // Original-Reihenfolge: D004, D008
      ipsLeads: 'Verena Huber (VHu), Nora Fluri (NFl), Dominique Liniger (DLi), Elisabeth Jahnke (EJa), Maya Wechsler (MWe), Julia Lucas (JLu)',
      is1Leads: 'Karin Brülisauer (KBr), Karin Hodel (KHo)',
    },
    BG: {
      title: 'Raumbelegung Bildnerisches Gestalten',
      rooms: ['A023', 'A025', 'A027'], // BG trocken (A023, A025) + Nassraum (A027)
      // Aus dem Snapshot ermittelt: regelmässige Dozierende der BG-Räume HS25/FS26/HS26
      ipsLeads: 'Myriam Loepfe (MLo), Franziska Keusen (FKe), Natalia Funariu (NFu), Ursula Aebersold (UAe), Alexandra Kunz (AKu), Selin Bourquin (SBo)',
      is1Leads: 'Anja Sutter-Bratschi (ASu), Caroline Conk (CCo), Romy Troxler (RTr), Jonas Etter (JEt), Sonja Schär (SSc), Sofie Lena Hänni (SHä)',
    },
  };

  // Personen-Kürzel (ergänzt aus den Aushang-Dokumenten)
  const PERSON_ABBR = {
    'Verena Huber': 'VHu',
    'Nora Fluri': 'NFl',
    'Dominique Liniger': 'DLi',
    'Elisabeth Jahnke': 'EJa',
    'Maya Wechsler': 'MWe',
    'Julia Lucas': 'JLu',
    'Lukas Jordi': 'LJo',
    'Patrick Bürgy': 'PBü',
    'Andreas Stettler': 'ASe',
    'Karin Hodel': 'KHo',
    'Karin Brülisauer': 'KBr',
    'Pascal Zaugg': 'PZa',
    'Romy Troxler': 'RTr',
    'Sonja Schär': 'SSc',
    'Jonas Etter': 'JEt',
    'Caroline Conk': 'CCo',
    'Matthias Bigler': 'MBi',
    'Johanna Wehrlin': 'JWe',
    'Kathleen Pandey': 'KPa',
    // BG-Faculty (aus Snapshot-Analyse)
    'Myriam Loepfe': 'MLo',
    'Franziska Keusen': 'FKe',
    'Natalia Funariu': 'NFu',
    'Ursula Aebersold': 'UAe',
    'Alexandra Kunz': 'AKu',
    'Anja Sutter-Bratschi': 'ASu',
    'Sofie Lena Hänni': 'SHä',
    'Selin Bourquin': 'SBo',
  };
  function abbrPerson(full) {
    if (PERSON_ABBR[full]) return PERSON_ABBR[full];
    const parts = full.trim().split(/\s+/);
    if (parts.length < 2) return full.slice(0, 3);
    return parts[0][0] + parts[parts.length - 1].slice(0, 2);
  }
  function abbrPersons(personsStr) {
    if (!personsStr) return '';
    return personsStr.split(/,\s*/).map(abbrPerson).join(', ');
  }

  // Modul-Typ aus Titel ableiten — exakte Klassifikation gem. Word-Aushang HS26
  // (extrahiert aus den .docx-Zell-Hintergrundfarben FFC000/00B0F0/FFFF00)
  function aushangType(title) {
    const t = title || '';
    // Offene Werkstatt
    if (/^offene werkstatt/i.test(t)) return 'offen';

    // IPS (orange): explizit Module mit Zyklus-Bezug oder Primarstufen-Lehre
    // - Textiles und Technisches Gestalten 1/2 Z1/Z2 Kombiniertes Angebot
    // - Spiel-Lernumgebungen
    // - Code, Mechanik und Muster
    // - Form und Raum
    // - Kulturelle Praktiken der Digitalität
    // - Medien und Informatik 1/2 Z1/Z2
    if (/^textiles und technisches gestalten\s*[12]/i.test(t)) return 'ips';
    if (/^TTG\s*[12]\b/i.test(t)) return 'ips';        // TTG 1, TTG 2 (auch mit Z1/Z2 als Suffix)
    if (/zyklus\s*[12]\b|\bZ[12]\b/i.test(t)) return 'ips'; // Zyklus-Bezug oder Kürzel Z1/Z2
    if (/^spiel.lernumgebung/i.test(t)) return 'ips';
    if (/^code,?\s*mechanik/i.test(t)) return 'ips';
    if (/^form und raum/i.test(t)) return 'ips';
    if (/^kulturelle praktiken/i.test(t)) return 'ips';
    if (/^medien und informatik\s*[12]/i.test(t)) return 'ips';
    if (/^[äa]sthetische forschung/i.test(t)) return 'ips'; // JLu/AKu IPS-Modul

    // BG-Hauptmodule (IPS, orange): Bildnerisches Gestalten 1/2 + Wahlpflichtfach +
    // Material-fokussierte Module
    if (/^bildnerisches gestalten\s*[12]/i.test(t)) return 'ips';
    if (/^wahlpflichtfach bildnerisches/i.test(t)) return 'ips';
    if (/^fachkompetenz bildnerisches/i.test(t)) return 'ips'; // LNW des Hauptmoduls
    if (/^muster gestalten|^3-d-druck|^ton in form/i.test(t)) return 'ips';

    // BG-Spezial-/Didaktikmodule (IS1, cyan): wie bei TTG
    if (/^malerei und zeichnung/i.test(t)) return 'is1';
    if (/^fotografie und visuelle/i.test(t)) return 'is1';
    if (/^animation\b/i.test(t)) return 'is1';
    if (/^k[oö]rper und raum/i.test(t)) return 'is1';
    if (/^bild projekt produkt/i.test(t)) return 'is1';
    if (/^bildnerisches gestalten\s*-\s*eine kreativ/i.test(t)) return 'is1';
    if (/^vielf[aä]ltige zug[aä]nge/i.test(t)) return 'is1';
    if (/^experimentelles gestalten/i.test(t)) return 'is1';
    if (/^mikroplanung bildnerisches|^makroplanung bildnerisches/i.test(t)) return 'is1';
    if (/^beurteilen im bildnerischen/i.test(t)) return 'is1';
    if (/^klassenf[uü]hrung und kompensatorische/i.test(t)) return 'is1';
    if (/^zusammenarbeit und aslo/i.test(t)) return 'is1';
    if (/^planung von doppellekt|^planung von adapt/i.test(t)) return 'is1';
    if (/^fachverst[aä]ndnis und lp21 bildnerisches/i.test(t)) return 'is1';
    if (/^f[oö]rderorientierte strategien/i.test(t)) return 'is1';
    // WfU (Weiterentwicklung des fachspezifischen Unterrichtens) — alle Fächer
    if (/^weiterentwicklung des fachspezifischen/i.test(t)) return 'is1';
    // Offenes Atelier — analog "Offene Werkstatt", als offene/freie Slots gelb
    if (/^offenes atelier/i.test(t)) return 'offen';

    // IS1 (cyan): explizite IS1-Module — auch bei Leistungsnachweis-Zusatz
    if (/^tcg\s/i.test(t)) return 'is1';
    if (/^txg\s/i.test(t)) return 'is1';
    if (/^ttg\s*[-–]\s*coaching|^ttg coaching|^ttg atelier|^ttg.coaching/i.test(t)) return 'is1';
    if (/^ttg klassenf|^ttg adaptive|^ttg formative|^ttg prozessbeg|^ttg weiterent|^ttg-sitzung|^ttg beurteil|^ttg beratung|^ttg fortgeschritt/i.test(t)) return 'is1';
    if (/^ttg mode|^ttg tragen|^ttg materielle|^ttg design/i.test(t)) return 'is1';
    if (/^mikroplanung ttg|^makroplanung ttg|^mikropl|^makropl|^planungswoche|^fachbegleitung ttg|^fachwissenschaftliches/i.test(t)) return 'is1';
    if (/^modelle und spiele/i.test(t)) return 'is1';
    if (/^information.*kommunikation/i.test(t)) return 'is1';
    if (/^design\s*&\s*technik|^design und technik/i.test(t)) return 'is1';
    // FMS-Module (Fachmittelschule) — neutral, weder IPS noch IS1
    if (/\bfms\b/i.test(t)) return 'neutral';
    if (/^tragen\s*&\s*sch|^materielle kultur|^mode\s*&\s*bekleidung/i.test(t)) return 'is1';
    if (/^mobilit[äa]t|^fokus bne|^fit\s+f[uü]r|^kick off|^wfu\b/i.test(t)) return 'is1';
    if (/^jahresversammlung|^arbeitsgruppe/i.test(t)) return 'is1';
    if (/^adaptive lernumg/i.test(t)) return 'is1';

    // Reine Belegungen ohne Modul (Besetzt, AV-Wartung, Prüfungssession, externe Anlässe)
    if (/^besetzt$|^av.technischer|^pr[üu]fungssession|swiss medical|smsc/i.test(t)) return 'neutral';

    // Sonst neutral
    return 'neutral';
  }
  const AUSHANG_COLORS = {
    ips:     '#FFC000',
    is1:     '#00B0F0',
    offen:   '#FFFF00',
    neutral: '#D9D9D9',
  };

  const SEMESTERS = window.RAUMDATEN_SEMESTERS || {
    HS26: { start: '2026-09-14', end: '2026-12-18' },
    FS26: { start: '2026-02-16', end: '2026-05-29' },
    HS25: { start: '2025-09-15', end: '2025-12-19' },
  };

  const API_ENDPOINTS = [
    '/api/events',
    'http://localhost:3000/api/events',
    'http://127.0.0.1:3000/api/events',
    'https://apps.phbern.ch/raumkalender/api/v1/resource/events',
  ];

  // ---------- State ----------
  const state = {
    selected: new Set(DEFAULT_SELECTED),
    tab: 'aushang-tcg', // Default-Tab = Aushang Technisch
    weekDate: new Date(), // immer aktuelle Woche
    sem: { weekday: 4, half: 'pm', semester: 'HS26', onlyBusy: true },
    hy: { semester: 'HS26' }, // Semester-Ansicht (ehem. Halbjahr)
    au: { kind: 'TcG', semester: 'HS26', threshold: 3 },
    lastAushang: null, // { rooms, grid, list, mondays, sem, kind } für Exporte
    cache: new Map(),
  };

  // Wochenansicht startet immer mit der aktuellen Woche — auch ausserhalb der Semester-Range
  // (state.weekDate wurde oben bereits auf `new Date()` gesetzt)

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const roomListEl = $('room-list');
  const roomHintEl = $('room-hint');
  const statusEl = $('status');
  const viewWeekEl = $('view-week');
  const viewSemEl = $('view-semester');
  const ctlWeek = $('controls-week');
  const ctlSem = $('controls-semester');
  const weekDateInput = $('week-date');
  const semWeekday = $('sem-weekday');
  const semHalf = $('sem-half');
  const semSemester = $('sem-semester');

  // ---------- Init ----------
  buildRoomList();
  weekDateInput.value = isoDate(state.weekDate);
  semWeekday.value = String(state.sem.weekday);
  semHalf.value = state.sem.half;
  semSemester.value = state.sem.semester;

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });
  $('week-prev').addEventListener('click', () => shiftWeek(-7));
  $('week-next').addEventListener('click', () => shiftWeek(7));
  $('week-today')?.addEventListener('click', () => {
    state.weekDate = new Date();
    weekDateInput.value = isoDate(state.weekDate);
    renderWeek();
  });
  weekDateInput.addEventListener('change', () => {
    state.weekDate = new Date(`${weekDateInput.value}T00:00:00`);
    renderWeek();
  });
  semWeekday.addEventListener('change', () => { state.sem.weekday = +semWeekday.value; renderSemester(); });
  semHalf.addEventListener('change', () => { state.sem.half = semHalf.value; renderSemester(); });
  semSemester.addEventListener('change', () => { state.sem.semester = semSemester.value; renderSemester(); });
  const semOnlyBusy = document.getElementById('sem-only-busy');
  if (semOnlyBusy) {
    semOnlyBusy.checked = state.sem.onlyBusy;
    semOnlyBusy.addEventListener('change', () => { state.sem.onlyBusy = semOnlyBusy.checked; renderSemester(); });
  }

  // Halfyear (= "Semester"-Ansicht für 1 Raum)
  const hySemSel = document.getElementById('hy-semester');
  if (hySemSel) {
    hySemSel.value = state.hy.semester;
    hySemSel.addEventListener('change', () => { state.hy.semester = hySemSel.value; renderHalfyear(); });
  }


  // Aushang — Semester-Toggle (Buttons HS26 / FS26 statt Dropdown)
  const auSemBtns = document.querySelectorAll('.sem-btn');
  const auPrintBtn = document.getElementById('au-print');
  const auDocBtn = document.getElementById('au-doc');
  const auXlsBtn = document.getElementById('au-xls');
  if (auSemBtns.length) {
    auSemBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sem === state.au.semester);
      btn.setAttribute('aria-selected', String(btn.dataset.sem === state.au.semester));
      btn.addEventListener('click', () => {
        state.au.semester = btn.dataset.sem;
        auSemBtns.forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', String(b === btn));
        });
        renderAushang();
      });
    });
    auPrintBtn.addEventListener('click', () => window.print());
    auDocBtn.addEventListener('click', downloadAsDoc);
    auXlsBtn.addEventListener('click', downloadAsXls);
  }

  // Stand-Anzeige
  if (window.RAUMDATEN_STAND) {
    const standEl = document.getElementById('data-stand');
    if (standEl) standEl.textContent = window.RAUMDATEN_STAND;
  }

  // Initial: Default-Tab korrekt aktivieren (state.tab steuert die Routes)
  switchTab(state.tab);

  // ---------- Helpers ----------
  function setStatus(text, type = 'info') {
    statusEl.textContent = text;
    // hidden-Klasse erhalten (z.B. im Aushang-Tab) — sonst macht className-Reset sie sichtbar
    const wasHidden = statusEl.classList.contains('hidden');
    statusEl.className = `status ${type}` + (wasHidden ? ' hidden' : '');
    statusEl.title = text;
  }

  function isoDate(d) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }

  function swissDate(d) {
    return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('.');
  }

  function timeStr(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function startOfWeek(date) {
    const d = new Date(date);
    const dow = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - dow);
    return d;
  }

  function shiftWeek(days) {
    state.weekDate = new Date(state.weekDate.getTime() + days * 86400000);
    weekDateInput.value = isoDate(state.weekDate);
    renderWeek();
  }

  function buildRoomList() {
    roomListEl.innerHTML = '';
    for (const groupName of GROUPS) {
      const groupEl = document.createElement('div');
      groupEl.className = 'room-group';
      groupEl.dataset.group = groupName;
      const lbl = document.createElement('span');
      lbl.className = 'room-group-label';
      lbl.textContent = groupName;
      groupEl.appendChild(lbl);
      for (const r of ROOMS.filter(x => x.group === groupName)) {
        const wrapper = document.createElement('label');
        wrapper.className = 'room-chip';
        wrapper.style.setProperty('--room-color', r.color);
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = r.code;
        cb.checked = state.selected.has(r.code);
        cb.addEventListener('change', () => onRoomToggle(cb));
        const sw = document.createElement('span'); sw.className = 'swatch';
        const code = document.createElement('span');
        code.textContent = r.code;
        // Externer Link auf den offiziellen PHBern-Raumkalender
        const ext = document.createElement('a');
        ext.href = r.url;
        ext.target = '_blank';
        ext.rel = 'noopener';
        ext.className = 'room-ext';
        ext.title = `Offizieller Raumkalender ${r.code} öffnen`;
        ext.textContent = '↗';
        ext.addEventListener('click', (e) => e.stopPropagation()); // Klick öffnet Link, nicht Toggle
        wrapper.append(cb, sw, code);
        const inst = instituteForRoom(r.id);
        if (inst) {
          const badge = document.createElement('span');
          badge.className = 'room-inst';
          badge.textContent = inst;
          wrapper.appendChild(badge);
        }
        wrapper.appendChild(ext);
        wrapper.title = r.label + (inst ? ` · ${inst}` : '');
        groupEl.appendChild(wrapper);
      }
      roomListEl.appendChild(groupEl);
    }
    updateRoomHint();
  }


  function onRoomToggle(cb) {
    if (cb.checked) {
      const max = TAB_MAX_ROOMS[state.tab] || MAX_SELECTED;
      // Halfyear (= "Semester"-Ansicht): nur 1 Raum erlaubt — alten Raum automatisch abwählen
      // statt Auswahl zu sperren
      if (state.tab === 'halfyear') {
        state.selected.clear();
        // alle anderen Checkboxen visuell abwählen
        document.querySelectorAll('.room-chip input').forEach(other => {
          if (other !== cb) other.checked = false;
        });
        state.selected.add(cb.value);
      } else if (state.selected.size >= max) {
        cb.checked = false;
        setStatus(`Max. ${max} Räume in dieser Ansicht.`, 'error');
        return;
      } else {
        state.selected.add(cb.value);
      }
    } else {
      state.selected.delete(cb.value);
    }
    updateRoomHint();
    rerenderActive();
  }

  function rerenderActive() {
    if (state.tab === 'week') renderWeek();
    else if (state.tab === 'semester') renderSemester();
    else if (state.tab === 'halfyear') renderHalfyear();
    else if (state.tab === 'aushang-tcg' || state.tab === 'aushang-txg' || state.tab === 'aushang-bg') renderAushang();
  }

  function updateRoomHint() {
    const max = TAB_MAX_ROOMS[state.tab] || MAX_SELECTED;
    if (roomHintEl) roomHintEl.textContent = ''; // kein Hint im UI
    // Im Halfyear-Tab keine Sperre: alle Chips bleiben anklickbar (auto-deselect statt Block)
    if (state.tab === 'halfyear') {
      document.querySelectorAll('.room-chip').forEach(chip => {
        const cb = chip.querySelector('input');
        cb.disabled = false;
        chip.classList.remove('chip-disabled');
      });
      return;
    }
    // Sonst: Checkboxen für Räume, die das Limit überschreiten würden, sperren
    document.querySelectorAll('.room-chip').forEach(chip => {
      const cb = chip.querySelector('input');
      const wouldExceed = !cb.checked && state.selected.size >= max;
      cb.disabled = wouldExceed;
      chip.classList.toggle('chip-disabled', wouldExceed);
    });
  }

  function selectedRooms() {
    return ROOMS.filter(r => state.selected.has(r.code));
  }

  function switchTab(tab) {
    state.tab = tab;
    // Aushang-Tabs setzen den Aushang-Modus automatisch
    if (tab === 'aushang-tcg') state.au.kind = 'TcG';
    if (tab === 'aushang-txg') state.au.kind = 'TxG';
    if (tab === 'aushang-bg')  state.au.kind = 'BG';
    const isAushang = tab === 'aushang-tcg' || tab === 'aushang-txg' || tab === 'aushang-bg';
    document.querySelectorAll('.tab').forEach(t => {
      const active = t.dataset.tab === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    ctlWeek.classList.toggle('hidden', tab !== 'week');
    ctlSem.classList.toggle('hidden', tab !== 'semester');
    const ctlHy = document.getElementById('controls-halfyear');
    if (ctlHy) ctlHy.classList.toggle('hidden', tab !== 'halfyear');
    const ctlAu = document.getElementById('controls-aushang');
    if (ctlAu) ctlAu.classList.toggle('hidden', !isAushang);
    viewWeekEl.classList.toggle('hidden', tab !== 'week');
    viewSemEl.classList.toggle('hidden', tab !== 'semester');
    const viewHy = document.getElementById('view-halfyear');
    if (viewHy) viewHy.classList.toggle('hidden', tab !== 'halfyear');
    const viewAu = document.getElementById('view-aushang');
    if (viewAu) viewAu.classList.toggle('hidden', !isAushang);

    // Räume-Reihe nur bei Woche/Halbtag/Semester sichtbar (nicht in Aushang-Tabs)
    document.getElementById('rooms-row')?.classList.toggle('hidden', isAushang);
    document.getElementById('status')?.classList.toggle('hidden', isAushang);

    // Auto-Deselect: zu viele Räume → erste max behalten (nur bei nicht-Aushang)
    const max = TAB_MAX_ROOMS[tab] || MAX_SELECTED;
    if (!isAushang && state.selected.size > max) {
      const ordered = ROOMS.filter(r => state.selected.has(r.code)).slice(0, max).map(r => r.code);
      state.selected = new Set(ordered);
      buildRoomList();
      setStatus(`${state.selected.size}/${max} Räume aktiv (Limit der Ansicht)`, 'info');
    }
    updateRoomHint();
    rerenderActive();
  }

  // ---------- Datenquelle (Cache-First) ----------
  // 1) Embedded Snapshot (data.js) → keine Netzwerkanfragen
  // 2) Falls Snapshot fehlt: Live-API über Proxy/CORS
  function normalizeEvent(ev) {
    if (!ev.start || !ev.end) return null;
    // FDZ:-Doppelungen ausfiltern
    if (ev.title.startsWith('FDZ:')) return null;
    // Auf volle Stunden runden (start floor, end ceil)
    const start = new Date(ev.start);
    start.setMinutes(0, 0, 0);
    const end = new Date(ev.end);
    if (end.getMinutes() > 0 || end.getSeconds() > 0) {
      end.setMinutes(0, 0, 0);
      end.setHours(end.getHours() + 1);
    }
    return { ...ev, start, end };
  }

  function fromSnapshot(roomId, mondaySwiss) {
    const r = window.RAUMDATEN?.[roomId]?.[mondaySwiss];
    if (!r) return null;
    return r.map(ev => normalizeEvent({
      id: ev.i,
      title: ev.t || 'Ohne Titel',
      start: ev.s ? new Date(ev.s * 1000) : null,
      end: ev.e ? new Date(ev.e * 1000) : null,
      persons: ev.p || '',
    })).filter(Boolean);
  }

  async function fetchEventsRaw(roomId, dateSwiss) {
    // Snapshot nutzt immer den Wochenstart (Mo) als Schlüssel
    const monday = swissDate(startOfWeek(parseSwissDate(dateSwiss)));
    const fromSnap = fromSnapshot(roomId, monday);
    if (fromSnap) return fromSnap;

    // Fallback: Live-API
    const key = `${roomId}:${dateSwiss}`;
    if (state.cache.has(key)) return state.cache.get(key);
    let lastErr;
    for (const url of API_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: roomId, datepickerValue: dateSwiss }),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const events = (data.events || []).map(ev => normalizeEvent({
          id: ev.id,
          title: ev.title || 'Ohne Titel',
          start: ev.start ? new Date(ev.start * 1000) : null,
          end: ev.stop ? new Date(ev.stop * 1000) : null,
          persons: ev.persons || '',
        })).filter(Boolean);
        state.cache.set(key, events);
        return events;
      } catch (err) { lastErr = err; }
    }
    throw lastErr || new Error('API nicht erreichbar');
  }

  function parseSwissDate(s) {
    const [d, m, y] = s.split('.').map(Number);
    return new Date(y, m - 1, d);
  }

  async function fetchWeekForRoom(room, anyDateInWeek) {
    return fetchEventsRaw(room.id, swissDate(startOfWeek(anyDateInWeek)));
  }

  // ---------- Wochenansicht (Single-Grid) ----------
  async function renderWeek() {
    if (state.tab !== 'week') return;
    const rooms = selectedRooms();
    if (!rooms.length) {
      viewWeekEl.innerHTML = '<div class="empty">Wähle oben mindestens einen Raum.</div>';
      setStatus('Keine Räume', 'info');
      return;
    }
    setStatus('Lade…', 'info');
    const monday = startOfWeek(state.weekDate);

    let perRoom;
    try {
      perRoom = await Promise.all(rooms.map(r =>
        fetchWeekForRoom(r, state.weekDate).then(events => ({ room: r, events: collapseEvents(events) }))
      ));
    } catch (err) {
      console.error(err);
      setStatus(apiErrorHint(err), 'error');
      return;
    }

    // Welche Wochentage zeigen? Mo–Fr immer, Sa/So nur bei Events
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i); days.push(d);
    }
    // Samstag immer anzeigen, Sonntag nur bei Events
    const showSun = perRoom.some(({events}) => events.some(e => e.start.getDay() === 0));
    const visibleDays = days.filter((d, i) => i < 6 || (i === 6 && showSun));

    // Zeitfenster automatisch aus Events der Woche bestimmen (Default: 8–18)
    let minH = 24, maxH = 0;
    for (const {events} of perRoom) {
      for (const e of events) {
        if (visibleDays.some(d => sameDay(d, e.start))) {
          minH = Math.min(minH, e.start.getHours());
          maxH = Math.max(maxH, Math.ceil(e.end.getHours() + e.end.getMinutes()/60));
        }
      }
    }
    if (minH === 24) { minH = 8; maxH = 18; }
    else { minH = Math.min(minH, 8); maxH = Math.max(maxH, 17); }
    if (maxH <= minH) maxH = minH + 1;

    viewWeekEl.innerHTML = '';
    const meta = document.createElement('div');
    meta.className = 'week-meta';
    const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
    // Linkliste pro Raum mit dem Wochen-Datum als datepickerValue
    const roomLinks = rooms.map(r =>
      `<a href="${ROOM_URL(r.id, monday)}" target="_blank" rel="noopener" title="Diese Woche in apps.phbern.ch/raumkalender öffnen (${r.code})">↗ ${escapeHtml(r.code)}</a>`
    ).join(' · ');
    meta.innerHTML =
      `<strong>KW ${weekNumber(monday)}</strong> · ${swissDate(monday)} – ${swissDate(sun)} · ${rooms.length} Raum${rooms.length>1?'e':''}` +
      ` <span class="week-meta-links">— offizieller Raumkalender: ${roomLinks}</span>`;
    viewWeekEl.appendChild(meta);

    const grid = buildSingleGrid(visibleDays, perRoom, minH, maxH);
    viewWeekEl.appendChild(grid);
  }

  function buildSingleGrid(days, perRoom, minH, maxH) {
    const M = perRoom.length;
    const D = days.length;
    const ROW_H = 9;         // px pro 15min (kompakt)
    const ROWS_PER_HOUR = 4;
    const HEADER_H = 30;
    const bodyHeight = (maxH - minH) * ROWS_PER_HOUR * ROW_H;

    const grid = document.createElement('div');
    grid.className = 'week-grid';
    grid.style.setProperty('--day-cols', D);
    grid.style.setProperty('--room-cols', M);
    grid.style.setProperty('--row-h', ROW_H + 'px');
    grid.style.gridTemplateRows = `${HEADER_H}px ${bodyHeight}px`;

    // Ecke
    const corner = document.createElement('div');
    corner.className = 'wg-corner';
    corner.style.gridColumn = '1';
    corner.style.gridRow = '1';
    grid.appendChild(corner);

    // Tag-Header
    days.forEach((d, dIdx) => {
      const hdr = document.createElement('div');
      hdr.className = 'wg-day-hdr';
      hdr.style.gridColumn = String(2 + dIdx);
      hdr.style.gridRow = '1';
      const wd = ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()];
      const name = document.createElement('div');
      name.className = 'wg-day-name';
      name.innerHTML = `${wd} <span>${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.</span>`;
      hdr.appendChild(name);
      const subRoom = document.createElement('div');
      subRoom.className = 'wg-day-rooms';
      perRoom.forEach(({room}) => {
        const slot = document.createElement('div');
        slot.className = 'wg-room-slot';
        slot.style.setProperty('--room-color', room.color);
        slot.style.color = textColorFor(room.color);
        slot.textContent = room.code;
        subRoom.appendChild(slot);
      });
      hdr.appendChild(subRoom);
      grid.appendChild(hdr);
    });

    // Stunden-Spalte (eine Zelle, gestreift via background)
    const timeCol = document.createElement('div');
    timeCol.className = 'wg-time-col';
    timeCol.style.gridColumn = '1';
    timeCol.style.gridRow = '2';
    timeCol.style.height = bodyHeight + 'px';
    for (let h = minH; h < maxH; h++) {
      const t = document.createElement('div');
      t.className = 'wg-time';
      t.style.height = (ROWS_PER_HOUR * ROW_H) + 'px';
      t.textContent = String(h).padStart(2,'0');
      timeCol.appendChild(t);
    }
    grid.appendChild(timeCol);

    // Pro Tag genau eine Spalte (volle Höhe), darin Sub-Spalten pro Raum
    days.forEach((d, dIdx) => {
      const dayCol = document.createElement('div');
      dayCol.className = 'wg-day-col';
      dayCol.style.gridColumn = String(2 + dIdx);
      dayCol.style.gridRow = '2';
      dayCol.style.height = bodyHeight + 'px';
      // Stundenlinien als Background
      dayCol.style.backgroundImage = `repeating-linear-gradient(to bottom, transparent 0, transparent ${ROW_H * ROWS_PER_HOUR - 1}px, rgba(255,255,255,0.06) ${ROW_H * ROWS_PER_HOUR - 1}px, rgba(255,255,255,0.06) ${ROW_H * ROWS_PER_HOUR}px)`;

      // Sub-Spalten pro Raum
      for (let m = 0; m < M; m++) {
        const sub = document.createElement('div');
        sub.className = 'wg-room-col';
        sub.style.left = `${(100 / M) * m}%`;
        sub.style.width = `${100 / M}%`;
        dayCol.appendChild(sub);
      }
      grid.appendChild(dayCol);

      // Events in die jeweilige Sub-Spalte einsetzen
      perRoom.forEach(({room, events}, rIdx) => {
        for (const ev of events) {
          if (!sameDay(d, ev.start)) continue;
          const startH = ev.start.getHours() + ev.start.getMinutes()/60;
          const endH = ev.end.getHours() + ev.end.getMinutes()/60;
          if (endH <= minH || startH >= maxH) continue;
          const sH = Math.max(minH, startH);
          const eH = Math.min(maxH, endH);
          const top = (sH - minH) * ROWS_PER_HOUR * ROW_H;
          const height = Math.max(ROW_H, (eH - sH) * ROWS_PER_HOUR * ROW_H);

          const block = document.createElement('div');
          block.className = 'wg-event';
          block.style.background = room.color;
          block.style.color = textColorFor(room.color);
          block.style.top = top + 'px';
          block.style.height = (height - 1) + 'px';
          // Dataset für Modal-Lookup
          block.dataset.eventRoomId = room.id;
          block.dataset.eventTitle = ev.title;
          block.dataset.eventStartH = ev.start.getHours();
          block.dataset.eventWd = ev.start.getDay();
          block.dataset.eventType = aushangType(ev.title);
          const evWeekStart = startOfWeek(ev.start);
          const evLink = `<a class="ev-link" href="${ROOM_URL(room.id, evWeekStart)}" target="_blank" rel="noopener" title="Diese Woche im offiziellen Raumkalender öffnen (${room.code}, KW ${weekNumber(evWeekStart)})" onclick="event.stopPropagation()">↗</a>`;
          block.innerHTML = `${evLink}<strong>${timeStr(ev.start)}–${timeStr(ev.end)}</strong>${escapeHtml(shortTitle(ev.title))}${ev.persons ? `<br><em>${escapeHtml(ev.persons)}</em>` : ''}`;
          attachTooltip(block, `${room.code} · ${timeStr(ev.start)}–${timeStr(ev.end)}\n${ev.title}${ev.persons ? '\n' + ev.persons : ''}\n\n(Klick für alle Termine)`);
          dayCol.children[rIdx].appendChild(block);
        }
      });
    });

    return grid;
  }

  function collapseEvents(events) {
    // Dedupliziere identische Slot+Titel (nach FDZ-Filter sollten kaum noch Duplikate übrig bleiben)
    const seen = new Map();
    for (const e of events) {
      const key = `${e.start.getTime()}-${e.end.getTime()}-${e.title}`;
      if (!seen.has(key)) seen.set(key, e);
    }
    return [...seen.values()].sort((a, b) => a.start - b.start);
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function weekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function apiErrorHint(err) {
    if (location.protocol === 'file:') return 'Bitte über lokalen Server öffnen (`python3 -m http.server 8080`).';
    return 'API nicht erreichbar. Proxy starten: `node proxy.js` (Port 3000).';
  }

  // ---------- Custom Tooltip ----------
  const tooltipEl = (() => {
    const el = document.createElement('div');
    el.className = 'tooltip';
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  })();

  function attachTooltip(el, text) {
    el.dataset.tt = text;
    el.addEventListener('mouseenter', showTooltip);
    el.addEventListener('mousemove', moveTooltip);
    el.addEventListener('mouseleave', hideTooltip);
  }
  function showTooltip(ev) {
    const text = ev.currentTarget.dataset.tt;
    if (!text) return;
    tooltipEl.innerHTML = text.split('\n').map(escapeHtml).join('<br>');
    tooltipEl.style.display = 'block';
    moveTooltip(ev);
  }
  function moveTooltip(ev) {
    const pad = 12;
    const rect = tooltipEl.getBoundingClientRect();
    let x = ev.clientX + pad;
    let y = ev.clientY + pad;
    if (x + rect.width > window.innerWidth) x = ev.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight) y = ev.clientY - rect.height - pad;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top = y + 'px';
  }
  function hideTooltip() {
    tooltipEl.style.display = 'none';
  }

  // ---------- Termin-Detail-Modal (alle wiederkehrenden Instanzen) ----------
  const modalEl = document.getElementById('event-modal');
  const modalHeadEl = modalEl ? modalEl.querySelector('.event-modal-head') : null;
  const modalTitleEl = modalEl ? modalEl.querySelector('#event-modal-title') : null;
  const modalBodyEl = modalEl ? modalEl.querySelector('.event-modal-body') : null;
  if (modalEl) {
    modalEl.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => modalEl.classList.add('hidden'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modalEl.classList.contains('hidden')) {
        modalEl.classList.add('hidden');
      }
    });
  }

  // Findet alle Instanzen eines Termins im Snapshot.
  // Filter: gleicher Raum + Titel + Start-Stunde + (optional) Wochentag.
  // Vergleich nur auf Stunden, da normalizeEvent() auf ganze Stunden rundet.
  function findEventInstances(roomId, title, startH, weekday /* getDay()-Wert oder undefined */) {
    const data = window.RAUMDATEN && window.RAUMDATEN[roomId];
    if (!data) return [];
    const out = [];
    for (const events of Object.values(data)) {
      for (const ev of events) {
        if (!ev.t || ev.t !== title) continue;
        const rawStart = new Date((ev.s || 0) * 1000);
        if (rawStart.getHours() !== startH) continue;
        if (typeof weekday === 'number' && rawStart.getDay() !== weekday) continue;
        out.push({
          start: rawStart,
          end: new Date((ev.e || 0) * 1000),
          persons: ev.p || '',
        });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  // Modal-State für Exporte
  let currentModalCtx = null;

  function openEventModal(opts) {
    if (!modalEl) return;
    const room = ROOMS.find(r => r.id === opts.roomId);
    if (!room) return;
    const wd = (typeof opts.weekday === 'number') ? opts.weekday : undefined;
    const instances = findEventInstances(opts.roomId, opts.title, opts.startH || 0, wd);
    const headBg = AUSHANG_COLORS[opts.aushangType] || '#f5f5f5';
    const headFg = textColorFor(headBg);
    modalHeadEl.style.setProperty('--modal-head-bg', headBg);
    modalHeadEl.style.setProperty('--modal-head-fg', headFg);
    modalTitleEl.textContent = stripGroupCX(opts.title) || opts.title || '(ohne Titel)';
    modalTitleEl.style.color = headFg;

    const sample = instances[0];
    const startStr = sample ? timeStr(sample.start) : `${String(opts.startH || 0).padStart(2,'0')}:00`;
    const endStr = sample ? timeStr(sample.end) : '';
    const timeRange = endStr ? `${startStr}–${endStr}` : startStr;

    const personFreq = new Map();
    instances.forEach(i => personFreq.set(i.persons, (personFreq.get(i.persons) || 0) + 1));
    const topPersons = [...personFreq.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || '';

    const wdShort = ['So','Mo','Di','Mi','Do','Fr','Sa'];

    // ----- Lücken-Logik: alle Wochen vom ersten bis letzten Termin am gleichen Wochentag -----
    const allRows = []; // [{kind:'event', inst} | {kind:'free', date}]
    if (instances.length > 0) {
      const startDay = new Date(instances[0].start);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(instances[instances.length - 1].start);
      endDay.setHours(0, 0, 0, 0);
      // Map per ISO-Date für schnellen Lookup
      const byDate = new Map();
      for (const i of instances) {
        const k = new Date(i.start); k.setHours(0, 0, 0, 0);
        byDate.set(k.getTime(), i);
      }
      for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 7)) {
        const inst = byDate.get(d.getTime());
        allRows.push(inst ? { kind: 'event', inst } : { kind: 'free', date: new Date(d) });
      }
    }
    const freeCount = allRows.filter(r => r.kind === 'free').length;

    // Render mit Collapse aufeinanderfolgender Frei-Wochen
    const renderedRows = [];
    let freeRun = [];
    const flushFreeRun = () => {
      if (!freeRun.length) return;
      const first = freeRun[0];
      const last = freeRun[freeRun.length - 1];
      const fromKw = weekNumber(first);
      const toKw = weekNumber(last);
      const range = freeRun.length === 1
        ? `KW ${fromKw}`
        : `KW ${fromKw}–${toKw} (${freeRun.length} Wochen)`;
      renderedRows.push(`<li class="emi-free">— ${range}: keine Termine —</li>`);
      freeRun = [];
    };
    for (const row of allRows) {
      if (row.kind === 'event') {
        flushFreeRun();
        const inst = row.inst;
        const wdName = wdShort[inst.start.getDay()];
        const dateStr = swissDate(inst.start);
        const kw = weekNumber(inst.start);
        const monday = startOfWeek(inst.start);
        const personsDiffers = inst.persons && inst.persons !== topPersons;
        const persDisplay = personsDiffers ? abbrPersons(inst.persons) : '';
        const href = ROOM_URL(opts.roomId, monday);
        renderedRows.push(`<li>
          <span class="emi-wd">${wdName}</span>
          <span class="emi-date">${escapeHtml(dateStr)}</span>
          <span class="emi-kw">KW ${kw}</span>
          <span class="emi-pers">${escapeHtml(persDisplay)}</span>
          <a class="emi-link" href="${href}" target="_blank" rel="noopener" title="Diese Woche im offiziellen Raumkalender öffnen">↗</a>
        </li>`);
      } else {
        freeRun.push(row.date);
      }
    }
    flushFreeRun();

    const titleClean = stripGroupCX(opts.title) || opts.title;

    modalBodyEl.innerHTML = `
      <dl class="event-modal-meta">
        <dt>Raum</dt><dd>${escapeHtml(room.code)} — ${escapeHtml(room.label.replace(`${room.code} — `, ''))}</dd>
        <dt>Zeit</dt><dd>${escapeHtml(timeRange)}</dd>
        ${topPersons ? `<dt>Dozierende</dt><dd>${escapeHtml(topPersons)}</dd>` : ''}
        <dt>Termine</dt><dd>${instances.length}${freeCount > 0 ? ` <span class="emi-summary-free">· ${freeCount} freie Woche${freeCount === 1 ? '' : 'n'} dazwischen</span>` : ''}</dd>
      </dl>
      <p class="event-modal-list-title">Alle Termine (vom ersten bis zum letzten)</p>
      <ul class="event-modal-list">${renderedRows.join('') || '<li>Keine Termine gefunden.</li>'}</ul>
      <div class="event-modal-export">
        <span class="emi-export-label">Export:</span>
        <button type="button" class="emi-export-btn" data-export="ics" title="iCalendar — für Outlook, Apple Kalender, Google Kalender, …">📅 iCal (.ics)</button>
        <button type="button" class="emi-export-btn" data-export="csv" title="CSV — für Excel, Numbers, Google Sheets">📊 CSV</button>
        <button type="button" class="emi-export-btn" data-export="print" title="Drucken oder als PDF speichern (Browser-Dialog)">🖨 Drucken / PDF</button>
      </div>
    `;
    currentModalCtx = { opts, room, instances, titleClean, timeRange, topPersons };
    modalEl.classList.remove('hidden');
  }

  // ---------- Export aus dem Modal ----------
  function downloadBlob(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function toICSDate(d) {
    // Lokale Zeit als YYYYMMDDTHHMMSS — Outlook/Apple interpretieren als lokal (kein UTC)
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + 'T' +
           pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  }
  function escapeICS(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function buildICS(ctx) {
    const { opts, room, instances, titleClean } = ctx;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PHBern Raumkalender Helper//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
    const nowStamp = toICSDate(new Date());
    for (const inst of instances) {
      const uid = `${room.id}-${(inst.start.getTime() / 1000) | 0}@kalender.ljuokr.github.io`;
      const url = ROOM_URL(room.id, startOfWeek(inst.start));
      lines.push(
        'BEGIN:VEVENT',
        'UID:' + uid,
        'DTSTAMP:' + nowStamp,
        'DTSTART:' + toICSDate(inst.start),
        'DTEND:' + toICSDate(inst.end),
        'SUMMARY:' + escapeICS(titleClean),
        'LOCATION:' + escapeICS(room.code + ' — ' + room.label.replace(`${room.code} — `, '')),
        'DESCRIPTION:' + escapeICS(`Raum: ${room.code}\nDozierende: ${inst.persons || '–'}\n\nQuelle: PHBern Raumkalender`),
        'URL:' + url,
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }
  function csvEscape(s) {
    const str = String(s || '');
    if (/[",\r\n;]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
    return str;
  }
  function buildCSV(ctx) {
    const { opts, room, instances, titleClean } = ctx;
    const wdShort = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    const rows = [['Datum', 'Wochentag', 'Zeit', 'KW', 'Modul', 'Raum', 'Dozierende']];
    for (const inst of instances) {
      rows.push([
        swissDate(inst.start),
        wdShort[inst.start.getDay()],
        `${timeStr(inst.start)}-${timeStr(inst.end)}`,
        weekNumber(inst.start),
        titleClean,
        room.code,
        inst.persons || '',
      ]);
    }
    // BOM für Excel, damit Umlaute korrekt erkannt werden
    return '﻿' + rows.map(r => r.map(csvEscape).join(';')).join('\r\n');
  }
  function safeFilename(s) {
    return String(s || 'termine').replace(/[\/\\?%*:|"<>]/g, '').replace(/\s+/g, '_').slice(0, 80);
  }
  function exportICS() {
    if (!currentModalCtx) return;
    const fn = `${safeFilename(currentModalCtx.titleClean)}_${currentModalCtx.room.code}.ics`;
    downloadBlob(fn, 'text/calendar', buildICS(currentModalCtx));
  }
  function exportCSV() {
    if (!currentModalCtx) return;
    const fn = `${safeFilename(currentModalCtx.titleClean)}_${currentModalCtx.room.code}.csv`;
    downloadBlob(fn, 'text/csv', buildCSV(currentModalCtx));
  }
  function exportPrint() {
    document.body.classList.add('printing-modal');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-modal'), 200);
    }, 50);
  }

  // Export-Buttons im Modal
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.emi-export-btn');
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.export === 'ics') exportICS();
    else if (btn.dataset.export === 'csv') exportCSV();
    else if (btn.dataset.export === 'print') exportPrint();
  });

  // Globale Click-Delegation: jeder Termin-Block mit data-event-title öffnet das Modal
  document.addEventListener('click', (e) => {
    if (e.target.closest('a[href], .ev-link, .emi-export-btn')) return; // Link / Export-Button macht sein eigenes Ding
    const block = e.target.closest('[data-event-title]');
    if (!block) return;
    openEventModal({
      roomId: +block.dataset.eventRoomId,
      title: block.dataset.eventTitle,
      startH: +block.dataset.eventStartH || 0,
      weekday: block.dataset.eventWd !== undefined ? +block.dataset.eventWd : undefined,
      aushangType: block.dataset.eventType || 'neutral',
    });
  });

  // ", Gruppe C" und ", Gruppe X" werden in der Anzeige weggelassen
  // (interne PHBern-Gruppen, im Aushang nicht relevant)
  // Zusätzlich: "Weiterentwicklung des fachspezifischen Unterrichtens" → WfU
  function stripGroupCX(t) {
    return (t || '')
      .replace(/Weiterentwicklung\s+des\s+fachspezifischen\s+Unterrichtens(?:\s+TTG)?/gi, 'WfU')
      // "TxG Textiles Gestalten: Grundlagen" → "TxG Grundlagen"
      // "TcG Technisches Gestalten: Grundlagen" → "TcG Grundlagen"
      .replace(/^(TxG|TcG)\s+(?:Textiles|Technisches)\s+Gestalten:\s*Grundlagen/i, '$1 Grundlagen')
      .replace(/,?\s*Gruppe\s*[CX](\s|$)/gi, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*$/, '')
      .trim();
  }

  function shortTitle(t) {
    t = stripGroupCX(t);
    // Leistungsnachweis-Varianten überall als "LNW" anzeigen
    if (/leistungsnachweis|kompetenz[üu]berpr[üu]f/i.test(t)) return 'LNW';
    // "Weiterentwicklung des fachspezifischen Unterrichtens" → WfU
    t = t.replace(/Weiterentwicklung\s+des\s+fachspezifischen\s+Unterrichtens(?:\s+TTG)?/i, 'WfU');
    const map = {
      'Textiles und Technisches Gestalten 1 Kombiniertes Angebot': 'TTG 1',
      'Textiles und Technisches Gestalten 2 Zyklus 1 Kombiniertes Angebot': 'TTG 2 Z1',
      'Textiles und Technisches Gestalten 2 Zyklus 1 Kombiniertes Angebot (inkl. BIL)': 'TTG 2 Z1 (BIL)',
      'Textiles und Technisches Gestalten 2 Zyklus 2 Kombiniertes Angebot': 'TTG 2 Z2',
      'Medien und Informatik 1 Kombiniertes Angebot': 'MI 1',
      'Medien und Informatik 2 Zyklus 2 Kombiniertes Angebot': 'MI 2 Z2',
      'Modelle und Spiele entwickeln und herstellen': 'Modelle & Spiele',
      'Fotografie und visuelle Kommunikation A (hoher Präsenzanteil)': 'Fotografie A',
      'Fotografie und visuelle Kommunikation B (hoher SOL-Anteil)': 'Fotografie B',
      'Offenes Atelier Fotografie und Visuelle Kommunikation': 'Off. Atelier Foto',
      'Digitale Medien im inklusiven Unterricht': 'Dig. Medien (inkl.)',
      'TcG Information & Kommunikation, Gruppe A': 'TcG Info & Komm. A',
      'TcG Information & Kommunikation, Gruppe B': 'TcG Info & Komm. B',
      'TcG Technisches Gestalten: Grundlagen, Gruppe A': 'TcG Grundlagen A',
      'TcG Technisches Gestalten: Grundlagen, Gruppe B': 'TcG Grundlagen B',
      'TxG Textiles Gestalten: Grundlagen, Gruppe A': 'TxG Grundlagen A',
      'TxG Textiles Gestalten: Grundlagen, Gruppe B': 'TxG Grundlagen B',
      'TTG Adaptive Lernumgebung, Gruppe A': 'TTG Adapt. A',
      'TTG Adaptive Lernumgebung, Gruppe B': 'TTG Adapt. B',
      'Mikroplanung TTG, Gruppe A': 'Mikropl. A',
      'Mikroplanung TTG, Gruppe B': 'Mikropl. B',
      'Makroplanung TTG, Gruppe A': 'Makropl. A',
      'Makroplanung TTG, Gruppe B': 'Makropl. B',
    };
    if (map[t]) return map[t];
    // Generischer Fallback: bei langem Titel auf erstes Komma/Doppelpunkt/Bindestrich kürzen
    let s = t.replace(/^(FDZ:|Übung:|Vorlesung:)\s*/i, '');
    const cut = s.search(/[\s][-–—:][\s]/);
    if (cut > 12) s = s.slice(0, cut);
    if (s.length > 32) s = s.slice(0, 30) + '…';
    return s;
  }

  // Kontrastfarbe für Text auf farbigem Hintergrund.
  // Threshold 125: schwarz auf hellen Aushang-Farben (Orange #FFC000 lum=189,
  // Cyan #00B0F0 lum=131, Gelb #FFE700 lum=212), weiss auf dunklen
  // (Dark green A025=87, Dark orange C005=104, Magenta-dunkel etc.).
  function textColorFor(hex) {
    if (!hex || hex[0] !== '#') return '#fff';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 125 ? '#000000' : '#ffffff';
  }

  // ---------- Semester-Halbtag ----------
  async function renderSemester() {
    if (state.tab !== 'semester') return;
    const rooms = selectedRooms();
    if (!rooms.length) {
      viewSemEl.innerHTML = '<div class="empty">Wähle oben mindestens einen Raum.</div>';
      setStatus('Keine Räume', 'info');
      return;
    }
    const sem = SEMESTERS[state.sem.semester];
    const startD = new Date(sem.start + 'T00:00:00');
    const endD = new Date(sem.end + 'T00:00:00');
    const wd = state.sem.weekday;
    const halfRanges = { am: [6,12], pm: [12,18], ev: [18,22] };
    const [hStart, hEnd] = halfRanges[state.sem.half];

    const dates = [];
    let d = new Date(startD);
    while (d <= endD) {
      if (((d.getDay() + 6) % 7) === wd) dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    setStatus(`Lade ${dates.length} × ${rooms.length}…`, 'info');

    let raw;
    try {
      raw = await Promise.all(rooms.map(async r => {
        const evs = [];
        for (const dt of dates) {
          const list = await fetchEventsRaw(r.id, swissDate(dt));
          evs.push(...list.filter(e => sameDay(e.start, dt)));
        }
        return { room: r, events: evs };
      }));
    } catch (err) {
      console.error(err);
      setStatus(apiErrorHint(err), 'error');
      return;
    }

    const wdNames = ['Mo','Di','Mi','Do','Fr'];
    const halfNames = { am: 'Vormittag', pm: 'Nachmittag', ev: 'Abend' };
    viewSemEl.innerHTML = '';
    const m = document.createElement('div');
    m.className = 'sem-meta';
    const semRoomLinks = rooms.map(r =>
      `<a href="${ROOM_URL(r.id)}" target="_blank" rel="noopener" title="Raumkalender ${r.code} öffnen">↗ ${escapeHtml(r.code)}</a>`
    ).join(' · ');
    m.innerHTML =
      `<strong>${wdNames[wd]} · ${halfNames[state.sem.half]} (${String(hStart).padStart(2,'0')}–${String(hEnd).padStart(2,'0')})</strong> · ${state.sem.semester} · ${dates.length} Termine` +
      ` <span class="week-meta-links">— offizieller Raumkalender: ${semRoomLinks}</span>`;
    viewSemEl.appendChild(m);

    const wrap = document.createElement('div');
    wrap.className = 'sem-table-wrap';
    const table = document.createElement('table');
    table.className = 'sem-table';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    trh.appendChild(th('Datum'));
    rooms.forEach(r => {
      const c = th(r.code);
      c.style.borderBottom = `3px solid ${r.color}`;
      trh.appendChild(c);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    // Bei "Nur belegte Tage": Datum nur einplanen, wenn mindestens ein Raum
    // im gewählten Halbtag ein Event hat
    const visibleDates = state.sem.onlyBusy
      ? dates.filter(dt => rooms.some(r => {
          const evs = raw.find(x => x.room.code === r.code).events;
          return evs.some(e => sameDay(e.start, dt) && (
            e.end.getHours() * 60 + e.end.getMinutes() > hStart * 60 &&
            e.start.getHours() * 60 + e.start.getMinutes() < hEnd * 60
          ));
        }))
      : dates;
    // Meta-Zeile mit Filter-Hinweis
    if (state.sem.onlyBusy && visibleDates.length < dates.length) {
      m.innerHTML += ` <span class="week-meta-hint">(${dates.length - visibleDates.length} freie Tage ausgeblendet)</span>`;
    }
    const tbody = document.createElement('tbody');
    for (const dt of visibleDates) {
      const tr = document.createElement('tr');
      const tdDate = document.createElement('td');
      tdDate.className = 'sem-date';
      // Datum als Link auf den Raumkalender der entsprechenden Woche (erster Raum)
      const weekStart = startOfWeek(dt);
      const dateText = `${wdNames[wd]} ${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
      const firstR = rooms[0];
      tdDate.innerHTML = `<a href="${ROOM_URL(firstR.id, weekStart)}" target="_blank" rel="noopener" title="Diese Woche im offiziellen Raumkalender öffnen (${firstR.code})">${escapeHtml(dateText)}</a>`;
      tr.appendChild(tdDate);
      for (const r of rooms) {
        const td = document.createElement('td');
        const events = raw.find(x => x.room.code === r.code).events;
        const today = events.filter(e => sameDay(e.start, dt));
        const inHalf = today.filter(e => {
          const sm = e.start.getHours()*60 + e.start.getMinutes();
          const em = e.end.getHours()*60 + e.end.getMinutes();
          return em > hStart*60 && sm < hEnd*60;
        });
        const dedup = collapseEvents(inHalf);
        if (!dedup.length) {
          td.innerHTML = '<span class="cell-free">frei</span>';
        } else {
          const cellWeekStart = startOfWeek(dt);
          td.innerHTML = dedup.map(e => {
            const t = `${timeStr(e.start)}–${timeStr(e.end)}`;
            const c = r.color;
            const evWeek = startOfWeek(e.start);
            const link = `<a class="ev-link" href="${ROOM_URL(r.id, evWeek)}" target="_blank" rel="noopener" title="Diese Woche im offiziellen Raumkalender öffnen (${r.code})" onclick="event.stopPropagation()">↗</a>`;
            const dt = `data-event-room-id="${r.id}" data-event-title="${escapeHtml(e.title)}" data-event-start-h="${e.start.getHours()}" data-event-wd="${e.start.getDay()}" data-event-type="${aushangType(e.title)}"`;
            return `<div class="cell-ev" style="border-left-color:${c}" ${dt} title="Klick für alle Termine"><strong>${t}</strong><br>${escapeHtml(shortTitle(e.title))}${e.persons ? `<br><em>${escapeHtml(e.persons)}</em>` : ''}${link}</div>`;
          }).join('');
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    viewSemEl.appendChild(wrap);
    setStatus(`${dates.length} × ${rooms.length} geladen`, 'ok');
  }

  function th(text, cls, rowSpan, colSpan) {
    const el = document.createElement('th');
    el.textContent = text;
    if (cls) el.className = cls;
    if (rowSpan && rowSpan > 1) el.rowSpan = rowSpan;
    if (colSpan && colSpan > 1) el.colSpan = colSpan;
    return el;
  }

  // ---------- Übersicht: ganzes Semester ----------
  // Stundenplan-Layout (Tag × Zeit, wie Wochenansicht), aber pro Slot
  // mehrere Mini-Felder (eines pro KW). Räume nebeneinander als Sub-Spalten.
  const OVERVIEW_MAX_ROOMS = 2;
  async function renderOverview() {
    if (state.tab !== 'overview') return;
    const viewEl = document.getElementById('view-overview');
    if (!viewEl) return;
    let rooms = selectedRooms();
    if (!rooms.length) {
      viewEl.innerHTML = '<div class="empty">Wähle oben mindestens einen Raum.</div>';
      setStatus('Keine Räume', 'info');
      return;
    }
    let limited = false;
    if (rooms.length > OVERVIEW_MAX_ROOMS) { rooms = rooms.slice(0, OVERVIEW_MAX_ROOMS); limited = true; }

    setStatus('Lade Semester…', 'info');
    const sem = SEMESTERS[state.over.semester];
    const startD = new Date(sem.start + 'T00:00:00');
    const endD = new Date(sem.end + 'T00:00:00');

    const mondays = [];
    let m = startOfWeek(startD);
    while (m <= endD) { mondays.push(new Date(m)); m.setDate(m.getDate() + 7); }

    // Daten holen: pro Raum × Woche → flache Event-Liste mit weekIdx
    let perRoom;
    try {
      perRoom = await Promise.all(rooms.map(async r => {
        const wEvents = [];
        for (let wi = 0; wi < mondays.length; wi++) {
          const evs = collapseEvents(await fetchEventsRaw(r.id, swissDate(mondays[wi])));
          for (const e of evs) wEvents.push({ ...e, weekIdx: wi });
        }
        return { room: r, events: wEvents };
      }));
    } catch (err) {
      console.error(err);
      setStatus(apiErrorHint(err), 'error');
      return;
    }

    // Zeitfenster automatisch
    let minH = 24, maxH = 0;
    for (const { events } of perRoom) {
      for (const e of events) {
        minH = Math.min(minH, e.start.getHours());
        maxH = Math.max(maxH, Math.ceil(e.end.getHours() + e.end.getMinutes()/60));
      }
    }
    if (minH === 24) { minH = 8; maxH = 18; }
    else { minH = Math.min(minH, 8); maxH = Math.max(maxH, 17); }

    viewEl.innerHTML = '';
    const meta = document.createElement('div');
    meta.className = 'week-meta';
    meta.innerHTML = `<strong>${state.over.semester}</strong> · ${swissDate(startD)} – ${swissDate(endD)} · ${mondays.length} Wochen · ${rooms.length} Raum${rooms.length>1?'e':''}` +
      (limited ? ` <em style="color:var(--phbern-red)">(max. ${OVERVIEW_MAX_ROOMS} Räume in der Übersicht)</em>` : '');
    viewEl.appendChild(meta);

    const grid = buildOverviewGrid(perRoom, mondays, minH, maxH);
    viewEl.appendChild(grid);
    setStatus(`${state.over.semester}: ${mondays.length} KW × ${rooms.length} Räume`, 'ok');
  }

  function buildOverviewGrid(perRoom, mondays, minH, maxH) {
    const D = 5; // Mo-Fr
    const M = perRoom.length;
    const W = mondays.length;
    const ROW_H = 9;
    const ROWS_PER_HOUR = 4;
    // Header enthält jetzt Tag-Name + KW-Ticks darunter (KW oben statt unten)
    const HEADER_H = 38;
    const bodyHeight = (maxH - minH) * ROWS_PER_HOUR * ROW_H;

    const grid = document.createElement('div');
    grid.className = 'week-grid over-grid';
    grid.style.setProperty('--day-cols', D);
    grid.style.setProperty('--room-cols', M);
    grid.style.gridTemplateRows = `${HEADER_H}px ${bodyHeight}px`;

    // Ecke (links oben): zeigt "KW" als Beschriftung der KW-Reihe darunter
    const corner = document.createElement('div');
    corner.className = 'wg-corner ov-corner';
    corner.style.gridColumn = '1';
    corner.style.gridRow = '1';
    corner.textContent = 'KW';
    grid.appendChild(corner);

    // Tag-Header: nur Tagesname (Mo, Di, ...) + KW-Ticks DARUNTER (oben am Body),
    // KEINE Raum-Wiederholung (Raum-Code steht bereits in der Meta-Zeile).
    const wdNames = ['Mo','Di','Mi','Do','Fr'];
    for (let dIdx = 0; dIdx < D; dIdx++) {
      const hdr = document.createElement('div');
      hdr.className = 'wg-day-hdr ov-day-hdr';
      hdr.style.gridColumn = String(2 + dIdx);
      hdr.style.gridRow = '1';
      const name = document.createElement('div');
      name.className = 'wg-day-name';
      name.textContent = wdNames[dIdx];
      hdr.appendChild(name);
      // KW-Tick-Reihe direkt unter dem Tagesnamen (eine pro Raum-Sub-Spalte)
      const kwRow = document.createElement('div');
      kwRow.className = 'ov-kw-row-top';
      perRoom.forEach((_, rIdx) => {
        const sub = document.createElement('div');
        sub.className = 'ov-kw-sub';
        sub.style.left = `${(100 / M) * rIdx}%`;
        sub.style.width = `${100 / M}%`;
        const stepEvery = W >= 12 ? 3 : (W >= 6 ? 2 : 1);
        for (let i = 0; i < W; i += stepEvery) {
          const m = mondays[i];
          const tick = document.createElement('span');
          tick.className = 'ov-kw-tick';
          tick.style.left = `${(i / W) * 100}%`;
          tick.style.width = `${(stepEvery / W) * 100}%`;
          tick.textContent = weekNumber(m);
          sub.appendChild(tick);
        }
        kwRow.appendChild(sub);
      });
      hdr.appendChild(kwRow);
      grid.appendChild(hdr);
    }

    // Stunden-Spalte
    const timeCol = document.createElement('div');
    timeCol.className = 'wg-time-col';
    timeCol.style.gridColumn = '1';
    timeCol.style.gridRow = '2';
    timeCol.style.height = bodyHeight + 'px';
    for (let h = minH; h < maxH; h++) {
      const t = document.createElement('div');
      t.className = 'wg-time';
      t.style.height = (ROWS_PER_HOUR * ROW_H) + 'px';
      t.textContent = String(h).padStart(2,'0');
      timeCol.appendChild(t);
    }
    grid.appendChild(timeCol);

    // Pro Tag eine Spalte
    for (let dIdx = 0; dIdx < D; dIdx++) {
      const dayCol = document.createElement('div');
      dayCol.className = 'wg-day-col';
      dayCol.style.gridColumn = String(2 + dIdx);
      dayCol.style.gridRow = '2';
      dayCol.style.height = bodyHeight + 'px';
      // Stundenlinien horizontal + KW-Linien vertikal (alle M*W Sub-Spalten, dezent)
      const wkLineStep = `calc(100% / ${M * W})`;
      dayCol.style.backgroundImage = `
        repeating-linear-gradient(to bottom, transparent 0, transparent ${ROW_H * ROWS_PER_HOUR - 1}px, rgba(0,0,0,0.07) ${ROW_H * ROWS_PER_HOUR - 1}px, rgba(0,0,0,0.07) ${ROW_H * ROWS_PER_HOUR}px),
        repeating-linear-gradient(to right, transparent 0, transparent calc(${wkLineStep} - 1px), rgba(0,0,0,0.04) calc(${wkLineStep} - 1px), rgba(0,0,0,0.04) ${wkLineStep})
      `;

      // Sub-Spalte pro Raum
      perRoom.forEach(({ room, events }, rIdx) => {
        const roomCol = document.createElement('div');
        roomCol.className = 'wg-room-col ov-room-col';
        roomCol.style.left = `${(100 / M) * rIdx}%`;
        roomCol.style.width = `${100 / M}%`;

        // Tooltip auch für leere Slots (frei) — zeigt Raum, KW, Datum, Uhrzeit
        const wdNamesLong = ['So','Mo','Di','Mi','Do','Fr','Sa'];
        roomCol.addEventListener('mousemove', (mev) => {
          if (mev.target.closest('.ov-mini')) return; // Event hat eigenen Tooltip
          const rect = roomCol.getBoundingClientRect();
          const relX = mev.clientX - rect.left;
          const relY = mev.clientY - rect.top;
          if (relX < 0 || relX > rect.width || relY < 0 || relY > rect.height) {
            hideTooltip();
            return;
          }
          const weekIdx = Math.min(W - 1, Math.max(0, Math.floor((relX / rect.width) * W)));
          const monday = mondays[weekIdx];
          const date = new Date(monday); date.setDate(monday.getDate() + dIdx);
          const hourFloat = (relY / rect.height) * (maxH - minH) + minH;
          // Auf die Stunde genau gerundet (z.B. 10-11)
          const hh = Math.min(maxH - 1, Math.max(minH, Math.floor(hourFloat)));
          const tStr = `${String(hh).padStart(2,'0')}-${String(hh + 1).padStart(2,'0')}`;
          const text = `${room.code} · ${wdNamesLong[date.getDay()]}, ${swissDate(date)}\nKW ${weekNumber(monday)} · ${tStr} — frei`;
          tooltipEl.innerHTML = text.split('\n').map(escapeHtml).join('<br>');
          tooltipEl.style.display = 'block';
          moveTooltip(mev);
        });
        roomCol.addEventListener('mouseleave', hideTooltip);

        // Welche Wochen hat dieser Raum überhaupt Events? Andere = Ferien (überbrücken)
        const roomBusyWeeks = new Set(events.map(e => e.weekIdx));

        // Filter Events für diesen Tag
        const dayEvents = events.filter(ev => ev.start.getDay() === (dIdx + 1));
        // Gruppiere nach (start, end, title)
        const groups = new Map();
        for (const ev of dayEvents) {
          const key = `${ev.start.getHours()}:${ev.start.getMinutes()}|${ev.end.getHours()}:${ev.end.getMinutes()}|${ev.title}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(ev);
        }

        for (const [key, evs] of groups) {
          const sample = evs[0];
          const startH = sample.start.getHours() + sample.start.getMinutes()/60;
          const endH = sample.end.getHours() + sample.end.getMinutes()/60;
          if (endH <= minH || startH >= maxH) continue;
          const sH = Math.max(minH, startH);
          const eH = Math.min(maxH, endH);
          const top = (sH - minH) * ROWS_PER_HOUR * ROW_H;
          const height = Math.max(ROW_H, (eH - sH) * ROWS_PER_HOUR * ROW_H);

          // Cluster bilden: aufeinanderfolgende belegte Wochen.
          //   - Ferienwochen (Raum komplett leer) überbrücken den Cluster
          //   - Bis zu MAX_CLUSTER_GAP Wochen Lücke werden ebenfalls geschluckt
          //     (z.B. Prüfungssession mit 1-Wochen-Pause wird als ein Block dargestellt)
          const MAX_CLUSTER_GAP = 2;
          const slotBusyWeeks = new Set(evs.map(e => e.weekIdx));
          const clusters = [];
          let curr = [];
          let gapCount = 0;
          for (let i = 0; i < W; i++) {
            if (slotBusyWeeks.has(i)) {
              curr.push(i);
              gapCount = 0;
            } else if (!roomBusyWeeks.has(i)) {
              // Ferienwoche: Cluster nicht unterbrechen, Gap-Counter nicht erhöhen
            } else {
              gapCount++;
              if (gapCount > MAX_CLUSTER_GAP) {
                if (curr.length) clusters.push(curr);
                curr = [];
                gapCount = 0;
              }
            }
          }
          if (curr.length) clusters.push(curr);

          for (const cluster of clusters) {
            if (cluster.length >= 2) {
              // Cluster verschmelzen → ein Block über die Cluster-Spannweite
              const startIdx = cluster[0];
              const endIdx = cluster[cluster.length - 1] + 1;
              const left = (startIdx / W) * 100;
              const width = ((endIdx - startIdx) / W) * 100;
              const big = document.createElement('div');
              big.className = 'ov-mini ov-full';
              big.style.background = room.color;
              big.style.color = textColorFor(room.color);
              big.style.top = top + 'px';
              big.style.height = (height - 1) + 'px';
              big.style.left = left + '%';
              big.style.width = `calc(${width}% - 1px)`;
              big.dataset.eventRoomId = room.id;
              big.dataset.eventTitle = sample.title;
              big.dataset.eventStartH = sample.start.getHours();
              big.dataset.eventWd = sample.start.getDay();
              big.dataset.eventType = aushangType(sample.title);
              const timeLabel = `${timeStr(sample.start)}–${timeStr(sample.end)}`;
              const titleFull = sample.title;
              const titleShort = shortTitle(titleFull);
              const persons = sample.persons || '';
              const fromMonday = mondays[startIdx];
              const toMonday = mondays[cluster[cluster.length - 1]];
              const ovLink = `<a class="ev-link" href="${ROOM_URL(room.id, fromMonday)}" target="_blank" rel="noopener" title="Erste Woche im offiziellen Raumkalender öffnen (${room.code}, KW ${weekNumber(fromMonday)})" onclick="event.stopPropagation()">↗</a>`;
              const isOneRowHigh = (height - 1) <= ROW_H * ROWS_PER_HOUR; // ≤ 1h
              if (isOneRowHigh) {
                big.classList.add('ov-full-vertical');
                big.innerHTML = `${ovLink}<span>${escapeHtml(timeLabel)} · ${escapeHtml(titleShort)}</span>`;
              } else {
                // Genug Höhe → vollständige Anzeige (Zeit + Titel + Personen)
                big.classList.add('ov-full-multiline');
                big.innerHTML = `${ovLink}<strong>${escapeHtml(timeLabel)}</strong>` +
                                `<span class="ov-title">${escapeHtml(titleFull)}</span>` +
                                (persons ? `<em>${escapeHtml(persons)}</em>` : '');
              }
              attachTooltip(big, `${room.code} · ${cluster.length} Wochen (KW ${weekNumber(fromMonday)}–${weekNumber(toMonday)})\n${timeLabel}\n${titleFull}${persons ? '\n' + persons : ''}`);
              roomCol.appendChild(big);
            } else {
              // Einzelne Wochen → schmaler Mini-Block mit senkrechtem Titel
              for (const wIdx of cluster) {
                const ev = evs.find(e => e.weekIdx === wIdx);
                const mini = document.createElement('div');
                mini.className = 'ov-mini ov-mini-vertical';
                mini.style.background = room.color;
                mini.style.color = textColorFor(room.color);
                mini.style.top = top + 'px';
                mini.style.height = (height - 1) + 'px';
                mini.style.left = `${(wIdx / W) * 100}%`;
                mini.style.width = `calc(${100 / W}% - 1px)`;
                mini.dataset.eventRoomId = room.id;
                mini.dataset.eventTitle = ev.title;
                mini.dataset.eventStartH = ev.start.getHours();
                mini.dataset.eventWd = ev.start.getDay();
                mini.dataset.eventType = aushangType(ev.title);
                const monday = mondays[wIdx];
                const miniLink = `<a class="ev-link" href="${ROOM_URL(room.id, monday)}" target="_blank" rel="noopener" title="KW ${weekNumber(monday)} im offiziellen Raumkalender öffnen (${room.code})" onclick="event.stopPropagation()">↗</a>`;
                mini.innerHTML = `${miniLink}<span>${escapeHtml(shortTitle(ev.title))}</span>`;
                attachTooltip(mini, `${room.code} · KW ${weekNumber(monday)} (${swissDate(monday)})\n${timeStr(ev.start)}–${timeStr(ev.end)}\n${ev.title}${ev.persons ? '\n' + ev.persons : ''}`);
                roomCol.appendChild(mini);
              }
            }
          }
        }
        dayCol.appendChild(roomCol);
      });
      grid.appendChild(dayCol);

      // (KW-Footer entfernt — KW-Ticks sind jetzt oben im Tag-Header)
    }

    return grid;
  }

  // ---------- Halbjahr-Ansicht (1 Raum, ganzes Halbjahr inkl. Blocktage) ----------
  async function renderHalfyear() {
    if (state.tab !== 'halfyear') return;
    const viewEl = document.getElementById('view-halfyear');
    if (!viewEl) return;
    let rooms = selectedRooms();
    if (!rooms.length) {
      viewEl.innerHTML = '<div class="empty">Wähle oben einen Raum (max. 1).</div>';
      setStatus('Kein Raum', 'info');
      return;
    }
    const room = rooms[0];

    setStatus('Lade Halbjahr…', 'info');
    const sem = SEMESTERS[state.hy.semester];
    const startD = new Date(sem.start + 'T00:00:00');
    const endD = new Date(sem.end + 'T00:00:00');
    const mondays = [];
    let m = startOfWeek(startD);
    while (m <= endD) { mondays.push(new Date(m)); m.setDate(m.getDate() + 7); }

    let allEvents;
    try {
      allEvents = [];
      for (let wi = 0; wi < mondays.length; wi++) {
        const evs = collapseEvents(await fetchEventsRaw(room.id, swissDate(mondays[wi])));
        for (const e of evs) allEvents.push({ ...e, weekIdx: wi });
      }
    } catch (err) {
      console.error(err);
      setStatus(apiErrorHint(err), 'error');
      return;
    }

    let minH = 24, maxH = 0;
    for (const e of allEvents) {
      minH = Math.min(minH, e.start.getHours());
      maxH = Math.max(maxH, Math.ceil(e.end.getHours() + e.end.getMinutes()/60));
    }
    if (minH === 24) { minH = 8; maxH = 18; }
    else { minH = Math.min(minH, 8); maxH = Math.max(maxH, 17); }

    viewEl.innerHTML = '';
    const meta = document.createElement('div');
    meta.className = 'week-meta';
    const inst = instituteForRoom(room.id);
    meta.innerHTML = `<strong>${room.code}</strong> ${escapeHtml(room.label.replace(`${room.code} — `, ''))}` +
      (inst ? ` <span class="meta-badge">${inst}</span>` : '') +
      ` · ${state.hy.semester} · ${swissDate(startD)} – ${swissDate(endD)} · ${mondays.length} Wochen` +
      ` <span class="week-meta-links">— <a href="${ROOM_URL(room.id, mondays[0])}" target="_blank" rel="noopener">↗ offizieller Raumkalender ${escapeHtml(room.code)}</a></span>`;
    viewEl.appendChild(meta);

    const grid = buildOverviewGrid([{ room, events: allEvents }], mondays, minH, maxH);
    viewEl.appendChild(grid);
  }

  // ---------- Aushang TcG/TxG (nahe an den Word-Dokumenten) ----------
  function compressKWs(weekIdxs, mondays) {
    const kws = [...new Set(weekIdxs.map(wi => weekNumber(mondays[wi])))].sort((a, b) => a - b);
    if (!kws.length) return '';
    const ranges = [];
    let i = 0;
    while (i < kws.length) {
      let j = i;
      while (j + 1 < kws.length && kws[j + 1] === kws[j] + 1) j++;
      if (i === j) ranges.push(String(kws[i]));
      else if (j === i + 1) ranges.push(`${kws[i]}, ${kws[j]}`);
      else ranges.push(`${kws[i]}-${kws[j]}`);
      i = j + 1;
    }
    return 'KW ' + ranges.join(', ');
  }

  async function renderAushang() {
    if (state.tab !== 'aushang-tcg' && state.tab !== 'aushang-txg' && state.tab !== 'aushang-bg') return;
    const viewEl = document.getElementById('view-aushang');
    if (!viewEl) return;
    const cfg = AUSHANG_CONFIGS[state.au.kind];
    const sem = SEMESTERS[state.au.semester];
    const startD = new Date(sem.start + 'T00:00:00');
    const endD = new Date(sem.end + 'T00:00:00');
    const mondays = [];
    let m = startOfWeek(startD);
    while (m <= endD) { mondays.push(new Date(m)); m.setDate(m.getDate() + 7); }

    const rooms = cfg.rooms.map(code => ROOMS.find(r => r.code === code)).filter(Boolean);
    // Status in Aushang nicht setzen — Pille ist ausgeblendet

    // Sammle alle Events (mit Wochen-Index)
    // Leistungsnachweis-Varianten alle auf "LNW" normalisieren (User-Wunsch)
    // Aber Klassifikation IPS/IS1 anhand des Original-Titels — damit Z1/Z2-LN orange bleibt
    const isLNW = (t) => /leistungsnachweis|kompetenz[üu]berpr[üu]f/i.test(t);
    // Range-Filter: Events ausserhalb sem.start/end ausfiltern
    // (z.B. Freitag der ersten "Halbwoche" wo Mo schon zum Vor-Semester gehört)
    const rangeStart = new Date(sem.start + 'T00:00:00');
    const rangeEnd = new Date(sem.end + 'T23:59:59');
    const allEvents = [];
    try {
      for (const r of rooms) {
        for (let wi = 0; wi < mondays.length; wi++) {
          const evs = collapseEvents(await fetchEventsRaw(r.id, swissDate(mondays[wi])));
          for (const e of evs) {
            const dayIdx = (e.start.getDay() + 6) % 7;
            if (dayIdx >= 5) continue; // nur Mo–Fr
            if (e.start < rangeStart || e.start > rangeEnd) continue; // ausserhalb Semester
            const ev = { ...e, room: r, dayIdx, weekIdx: wi };
            ev.aushangType = aushangType(ev.title); // VOR LNW-Normalisierung klassifizieren
            if (isLNW(ev.title)) {
              ev._origTitle = ev.title;
              ev.title = 'LNW';
            }
            allEvents.push(ev);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setStatus(apiErrorHint(err), 'error');
      return;
    }

    // Tageweise Slot-Mergerei für „LNW" (alle Slots am selben Tag im selben Raum
    // werden zu einem durchgehenden LNW-Block 08-18 zusammengefasst)
    const dailyMerge = new Map(); // key: roomCode|date|title
    const mergedEvents = [];
    for (const e of allEvents) {
      if (e.title !== 'LNW') { mergedEvents.push(e); continue; }
      const dateKey = `${e.room.code}|${swissDate(e.start)}|${e.title}`;
      if (!dailyMerge.has(dateKey)) {
        dailyMerge.set(dateKey, { ...e, _merged: true });
      } else {
        const existing = dailyMerge.get(dateKey);
        if (e.start < existing.start) existing.start = e.start;
        if (e.end > existing.end) existing.end = e.end;
      }
    }
    for (const ev of dailyMerge.values()) mergedEvents.push(ev);

    // Gruppiere nach (Raum, Tag, Start-/Endzeit, Titel)
    const groups = new Map();
    for (const e of mergedEvents) {
      const key = `${e.room.code}|${e.dayIdx}|${e.start.getHours()}|${e.end.getHours()}|${e.title}`;
      if (!groups.has(key)) groups.set(key, { sample: e, items: [] });
      groups.get(key).items.push(e);
    }

    const threshold = state.au.threshold;
    const grid = []; // { room, dayIdx, startH, endH, title, persons, weekIdxs, aushangType }
    const list = []; // { room, ev, weekIdx }
    for (const { sample, items } of groups.values()) {
      if (items.length >= threshold) {
        grid.push({
          room: sample.room,
          dayIdx: sample.dayIdx,
          startH: sample.start.getHours(),
          startM: sample.start.getMinutes(),
          endH: sample.end.getHours() || 24,
          title: sample.title, // ggf. 'LNW'
          origTitle: sample._origTitle || sample.title, // für Modal-Lookup im Snapshot
          persons: sample.persons,
          aushangType: sample.aushangType,
          weekIdxs: items.map(i => i.weekIdx),
          totalWeeks: mondays.length,
        });
      } else {
        for (const ev of items) list.push(ev);
      }
    }

    // Render — Layout wie Original-Word-Dokument:
    //   [Titel links | Legende rechts oben]
    //   [Leads (IPS+IS1) volle Breite]
    //   [Grid] [Extras]
    viewEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'aushang';
    wrap.innerHTML = `
      <div class="au-top-row">
        <h1 class="au-title">${escapeHtml(cfg.title)}, Herbstsemester ${state.au.semester}</h1>
        <div class="au-legend">
          <div class="au-legend-cell" style="background:${AUSHANG_COLORS.ips}; color:${textColorFor(AUSHANG_COLORS.ips)}">Veranstaltungen IPS</div>
          <div class="au-legend-cell" style="background:${AUSHANG_COLORS.is1}; color:${textColorFor(AUSHANG_COLORS.is1)}">Veranstaltungen IS1</div>
          <div class="au-legend-cell" style="background:${AUSHANG_COLORS.offen}; color:${textColorFor(AUSHANG_COLORS.offen)}">offene Werkstatt</div>
        </div>
      </div>
      <div class="au-leads">
        <div><strong>IPS Dozierende:</strong> ${escapeHtml(cfg.ipsLeads)}</div>
        <div><strong>IS1 Dozierende:</strong> ${escapeHtml(cfg.is1Leads)}</div>
      </div>
    `;

    // Eine Tabelle mit beiden Räumen nebeneinander pro Tag
    const minH = 8, maxH = 18;
    const wdNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const table = document.createElement('table');
    table.className = 'au-grid';
    // Alle Spalten gleich breit: Zeit + 5 Tage × N Räume
    const colCount = 1 + 5 * rooms.length;
    const colgroup = document.createElement('colgroup');
    const colW = (100 / colCount).toFixed(3);
    for (let i = 0; i < colCount; i++) {
      const col = document.createElement('col');
      col.style.width = colW + '%';
      colgroup.appendChild(col);
    }
    table.appendChild(colgroup);
    const thead = document.createElement('thead');
    const trDay = document.createElement('tr');
    trDay.appendChild(th('', 'au-th-time', 2));
    for (const wd of wdNames) {
      const c = th(wd, 'au-th-day', 1, rooms.length);
      trDay.appendChild(c);
    }
    thead.appendChild(trDay);
    const trRoom = document.createElement('tr');
    // Raum-Header neutral grau (D9D9D9) wie im Original-Word-Dokument
    for (let i = 0; i < wdNames.length; i++) {
      for (const r of rooms) {
        const c = th(r.code, 'au-th-room');
        c.style.background = '#D9D9D9';
        c.style.color = '#1a1a1a';
        trRoom.appendChild(c);
      }
    }
    thead.appendChild(trRoom);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const occupied = new Set();
    for (let h = minH; h < maxH; h++) {
      const tr = document.createElement('tr');
      tr.classList.add('au-tr-hour');
      const tdTime = document.createElement('td');
      tdTime.className = 'au-td-time';
      tdTime.textContent = `${String(h).padStart(2, '0')}-${String(h + 1).padStart(2, '0')}`;
      tr.appendChild(tdTime);
      for (let dIdx = 0; dIdx < 5; dIdx++) {
        for (const r of rooms) {
          const occKey = `${dIdx}|${r.code}|${h}`;
          if (occupied.has(occKey)) continue;
          const startsHere = grid.find(g => g.dayIdx === dIdx && g.room.code === r.code && g.startH === h);
          const td = document.createElement('td');
          td.className = 'au-td-cell';
          if (startsHere) {
            const span = Math.max(1, Math.min(maxH, startsHere.endH) - h);
            if (span > 1) td.rowSpan = span;
            const typ = startsHere.aushangType || aushangType(startsHere.title);
            const bg = AUSHANG_COLORS[typ] || AUSHANG_COLORS.neutral;
            td.style.background = bg;
            td.style.color = textColorFor(bg);
            td.classList.add(`au-typ-${typ}`);
            const persAbbr = abbrPersons(startsHere.persons);
            const isFull = startsHere.weekIdxs.length === startsHere.totalWeeks;
            const kwLabel = isFull ? '' : compressKWs(startsHere.weekIdxs, mondays);
            // Link auf erste Woche, in der dieses Modul stattfindet
            const firstWi = Math.min(...startsHere.weekIdxs);
            const firstMonday = mondays[firstWi];
            const auGridLink = `<a class="ev-link" href="${ROOM_URL(r.id, firstMonday)}" target="_blank" rel="noopener" title="Erste Woche im offiziellen Raumkalender öffnen (${r.code}, KW ${weekNumber(firstMonday)})">↗</a>`;
            td.innerHTML = `<div class="au-ev">
              ${auGridLink}
              <div class="au-ev-title">${escapeHtml(shortTitle(startsHere.title))}</div>
              ${persAbbr ? `<div class="au-ev-pers">${escapeHtml(persAbbr)}</div>` : ''}
              ${kwLabel ? `<div class="au-ev-kw">${escapeHtml(kwLabel)}</div>` : ''}
            </div>`;
            td.title = `${startsHere.title}\n${startsHere.persons || ''}\n${kwLabel || 'durchgehend'}\n\n(Klick für alle Termine)`;
            // Dataset für Modal-Lookup
            td.classList.add('has-event');
            td.dataset.eventRoomId = r.id;
            td.dataset.eventTitle = startsHere.origTitle || startsHere.title;
            td.dataset.eventStartH = startsHere.startH;
            // dayIdx 0=Mo … 4=Fr → getDay() 1=Mo … 5=Fr
            td.dataset.eventWd = (dIdx + 1) % 7;
            td.dataset.eventType = typ;
            for (let k = h + 1; k < h + span; k++) occupied.add(`${dIdx}|${r.code}|${k}`);
          }
          tr.appendChild(td);
        }
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);

    // Zusatz-Listen — Layout: 1. Raum (D023/D004) ganz links, 2. Raum (D027/D008) mittlere+rechte Spalte
    const extrasGrid = document.createElement('div');
    extrasGrid.className = 'au-extras-grid';
    wrap.appendChild(extrasGrid);
    const wdShort = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    const formatItem = (item, room) => {
      const persAbbr = abbrPersons(item.persons);
      const startTime = timeStr(item.start);
      const endTime = timeStr(item.end);
      let dateStr;
      if (item.endDate && +item.endDate !== +item.start) {
        dateStr = `${swissDate(item.start)}–${swissDate(item.endDate)}, ${wdShort[item.start.getDay()]}–${wdShort[item.endDate.getDay()]}`;
      } else {
        dateStr = `${swissDate(item.start)}, ${wdShort[item.start.getDay()]}`;
      }
      const cleanTitle = item.title === 'LNW' ? 'LNW' : stripGroupCX(item.title);
      const itemWeek = startOfWeek(item.start);
      const link = `<a class="ev-link-inline" href="${ROOM_URL(room.id, itemWeek)}" target="_blank" rel="noopener" title="Diese Woche im offiziellen Raumkalender öffnen (${room.code})">↗</a>`;
      return `<strong>${escapeHtml(dateStr)}</strong>, ${escapeHtml(startTime)}–${escapeHtml(endTime)}` +
        (persAbbr ? `, ${escapeHtml(persAbbr)}` : '') +
        `, ${escapeHtml(cleanTitle)} ${link}`;
    };
    // Layout-Entscheidung:
    //   N=2: dynamisch wide/narrow (Raum mit mehr Items wird breit, 2 Spalten)
    //   N>=3: alle gleichbreit (je 1 Spalte, eqcol)
    const perRoomAggregated = rooms.map(r => ({
      room: r,
      items: aggregateExtras(list.filter(e => e.room.code === r.code).sort((a, b) => a.start - b.start)),
    }));
    const useEqualCols = rooms.length >= 3;
    extrasGrid.classList.toggle('eqcols', useEqualCols);
    extrasGrid.style.setProperty('--eq-cols', rooms.length);
    const wideIdx = perRoomAggregated.length > 1 && perRoomAggregated[1].items.length > perRoomAggregated[0].items.length ? 1 : 0;
    perRoomAggregated.forEach(({ room: r, items: aggregated }, rIdx) => {
      if (!aggregated.length) return;
      const sec = document.createElement('section');
      if (useEqualCols) {
        sec.className = 'au-extra au-extra-eq';
      } else {
        const isWide = rIdx === wideIdx;
        sec.className = `au-extra au-extra-${isWide ? 'wide' : 'narrow'}`;
      }
      sec.innerHTML = `<h3>Zusätzliche Belegungen im ${r.code}</h3>`;
      const colsContainer = document.createElement('div');
      // In eq-cols-Modus immer 1col pro Raum; sonst 2col für wide / 1col für narrow
      if (useEqualCols) {
        colsContainer.className = 'au-extra-list-1col';
      } else {
        const isWide = rIdx === wideIdx;
        colsContainer.className = isWide ? 'au-extra-list-2col' : 'au-extra-list-1col';
      }
      for (const item of aggregated) {
        const cell = document.createElement('div');
        cell.className = 'au-extra-item';
        cell.innerHTML = formatItem(item, r);
        colsContainer.appendChild(cell);
      }
      sec.appendChild(colsContainer);
      extrasGrid.appendChild(sec);
    });

    // Datenstand klein am Fuss (auch im Print/PDF sichtbar)
    const standEl = document.createElement('div');
    standEl.className = 'au-stand';
    standEl.innerHTML = `Datenstand: <strong>${window.RAUMDATEN_STAND || '—'}</strong> · Quelle: <a href="https://apps.phbern.ch/raumkalender/" target="_blank" rel="noopener">apps.phbern.ch/raumkalender</a> · Experimentell, ohne Gewähr`;
    wrap.appendChild(standEl);

    viewEl.appendChild(wrap);
    // Daten für Exporte cachen
    state.lastAushang = {
      kind: state.au.kind,
      semester: state.au.semester,
      cfg, rooms, grid, list, mondays,
      minH, maxH,
    };
    // kein setStatus — Pille ist im Aushang-Tab ausgeblendet
  }

  // Aufeinanderfolgende Termine zusammenfassen:
  //   - Same Tag, gleicher Titel, Pause ≤ 30 min → ein Block (start..end gestreckt)
  //   - Aufeinanderfolgende Werktage (Mo→Di, …, Fr→Mo) mit gleicher Tageszeit + Titel → Multi-Day
  function aggregateExtras(items) {
    if (!items.length) return [];
    // Sortiere nach Titel, dann Start
    const sorted = [...items].sort((a, b) => {
      const t = a.title.localeCompare(b.title);
      return t !== 0 ? t : (a.start - b.start);
    });
    const out = [];
    for (const ev of sorted) {
      const last = out[out.length - 1];
      if (!last || last.title !== ev.title) {
        out.push({
          title: ev.title,
          persons: ev.persons,
          start: new Date(ev.start),
          end: new Date(ev.end),
          endDate: null, // Multi-Day Indikator
        });
        continue;
      }
      // Selbiger Tag, max 30 min Pause? → Block strecken
      const lastEnd = last.endDate || last.end;
      if (sameDay(lastEnd, ev.start)) {
        const gapMin = (ev.start - lastEnd) / 60000;
        if (gapMin <= 30) {
          last.end = new Date(ev.end);
          continue;
        }
      }
      // Aufeinanderfolgender Werktag mit gleicher Tageszeit?
      const lastDate = startOfDay(last.endDate || last.start);
      const evDate = startOfDay(ev.start);
      const diffDays = Math.round((evDate - lastDate) / 86400000);
      const sameTime = sameTimeOfDay(last.start, ev.start) && sameTimeOfDay(last.end, ev.end);
      const isWeekendBridge = diffDays === 3 && lastDate.getDay() === 5; // Fr → Mo
      const isNextDay = diffDays === 1;
      if (sameTime && (isNextDay || isWeekendBridge)) {
        last.endDate = new Date(ev.start); // letzter Tag des Multi-Day
        last.end = new Date(ev.end);
        continue;
      }
      out.push({
        title: ev.title,
        persons: ev.persons,
        start: new Date(ev.start),
        end: new Date(ev.end),
        endDate: null,
      });
    }
    // Re-sortiere nach Start-Datum
    return out.sort((a, b) => a.start - b.start);
  }
  function startOfDay(d) {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  }
  function sameTimeOfDay(a, b) {
    return a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes();
  }

  // ---------- Word-Export (.docx via docx-Library — echtes Office Open XML) ----------
  // Garantiert konstante Spaltenbreiten und Zeilenhöhen durch native DOCX-Geometrie
  // (DXA = Twentieths of a Point, 1 inch = 1440 dxa)
  function downloadAsDoc() {
    if (!state.lastAushang) { setStatus('Erst Aushang öffnen.', 'error'); return; }
    if (typeof docx === 'undefined') { setStatus('docx-Library nicht geladen.', 'error'); return; }
    const D = docx;
    const { rooms, grid, list, mondays, kind, semester, cfg, minH, maxH } = state.lastAushang;
    const wdNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const N = rooms.length;
    const totalCols = 1 + 5 * N; // 11 bei N=2, 16 bei N=3

    // A4 quer = 16838 × 11906 dxa (1 dxa = 1/1440 inch).
    // Mit 1 cm Margins (567 dxa) bleibt 16838 - 2*567 = 15704 dxa nutzbar.
    // COL_W dynamisch: nutzbarer Bereich / totalCols
    const TABLE_W_TARGET = 15700;
    const COL_W = Math.floor(TABLE_W_TARGET / totalCols);
    const TABLE_W = COL_W * totalCols;

    const colorMap = { ips: 'FFC000', is1: '00B0F0', offen: 'FFFF00', neutral: 'D9D9D9' };

    function thinBorder(color) {
      const b = { style: D.BorderStyle.SINGLE, size: 4, color: color || '999999' };
      return { top: b, bottom: b, left: b, right: b };
    }

    function p(text, opts = {}) {
      return new D.Paragraph({
        spacing: { before: 0, after: 0, line: 240, lineRule: D.LineRuleType.AUTO },
        alignment: opts.align || D.AlignmentType.LEFT,
        children: (typeof text === 'string'
          ? [new D.TextRun({ text, bold: opts.bold, size: opts.size || 16, color: opts.color, italics: opts.italics })]
          : text),
      });
    }

    function makeCell({ text = '', size = 16, bold = false, color, fillColor, columnSpan, rowSpan, width, align, borders, multiPars }) {
      const opts = {
        width: { size: width || COL_W, type: D.WidthType.DXA },
        margins: { top: 30, bottom: 30, left: 50, right: 50 },
        verticalAlign: D.VerticalAlign.TOP,
        borders: borders || thinBorder(),
      };
      if (columnSpan) opts.columnSpan = columnSpan;
      if (rowSpan) opts.rowSpan = rowSpan;
      if (fillColor) opts.shading = { type: D.ShadingType.SOLID, color: fillColor, fill: fillColor };
      let children;
      if (multiPars) {
        children = multiPars.map(mp => p(mp.text, { size: mp.size || size, bold: mp.bold || false, color: mp.color || color, italics: mp.italics, align: mp.align || align }));
      } else {
        children = [p(text, { size, bold, color, align })];
      }
      opts.children = children;
      return new D.TableCell(opts);
    }

    // ===== Tabelle: Header + Body =====
    // Header Row 1: Zeit (rowSpan=2) + 5 Tage (columnSpan=2 jeder)
    const head1 = new D.TableRow({
      height: { value: 360, rule: D.HeightRule.EXACT },
      children: [
        makeCell({ text: '', rowSpan: 2, fillColor: 'F5F5F5' }),
        ...wdNames.map(d => makeCell({
          text: d, bold: true, size: 22, columnSpan: 2, width: COL_W * 2,
          fillColor: 'E8E8E8', align: D.AlignmentType.CENTER,
        })),
      ],
    });

    // Header Row 2: Raum-Codes — neutral grau (D9D9D9) wie im Original-Word
    const head2Cells = [];
    for (let d = 0; d < 5; d++) {
      for (let i = 0; i < N; i++) {
        const r = rooms[i];
        head2Cells.push(makeCell({
          text: r.code, bold: true, size: 20,
          color: '000000', fillColor: 'D9D9D9',
          align: D.AlignmentType.CENTER,
        }));
      }
    }
    const head2 = new D.TableRow({
      height: { value: 320, rule: D.HeightRule.EXACT },
      children: head2Cells,
    });

    // Body: pro Stunde fixe Höhe 480 dxa (= 24 pt = 27pt-10%)
    const ROW_HEIGHT = 480;
    const dataRows = [];
    const occupied = new Set();
    for (let h = minH; h < maxH; h++) {
      const rowCells = [];
      // Time-Cell — gleiche Schrift wie Tage-Header (beide fett, gleiche Größe)
      rowCells.push(makeCell({
        text: `${String(h).padStart(2,'0')}-${String(h+1).padStart(2,'0')}`,
        bold: true, size: 22, color: '000000',
        fillColor: 'F5F5F5', align: D.AlignmentType.CENTER,
      }));
      for (let d = 0; d < 5; d++) {
        for (let i = 0; i < N; i++) {
          const occKey = `${d}|${i}|${h}`;
          if (occupied.has(occKey)) continue;
          const r = rooms[i];
          const startsHere = grid.find(g => g.dayIdx === d && g.room.code === r.code && g.startH === h);
          if (startsHere) {
            const span = Math.max(1, Math.min(maxH, startsHere.endH) - h);
            const typ = startsHere.aushangType || aushangType(startsHere.title);
            const bg = colorMap[typ] || colorMap.neutral;
            const fg = typ === 'is1' ? 'FFFFFF' : '000000';
            const persAbbr = abbrPersons(startsHere.persons);
            const isFull = startsHere.weekIdxs.length === startsHere.totalWeeks;
            const kwLabel = isFull ? '' : compressKWs(startsHere.weekIdxs, mondays);
            const pars = [{ text: shortTitle(startsHere.title), bold: true, size: 14, color: fg }];
            if (persAbbr) pars.push({ text: persAbbr, size: 13, color: fg });
            if (kwLabel) pars.push({ text: kwLabel, size: 12, italics: true, color: fg });
            rowCells.push(makeCell({ multiPars: pars, fillColor: bg, color: fg, rowSpan: span > 1 ? span : undefined }));
            for (let k = 1; k < span; k++) occupied.add(`${d}|${i}|${h+k}`);
          } else {
            rowCells.push(makeCell({ text: '' }));
          }
        }
      }
      dataRows.push(new D.TableRow({
        height: { value: ROW_HEIGHT, rule: D.HeightRule.EXACT },
        children: rowCells,
      }));
    }

    const aushangTable = new D.Table({
      width: { size: TABLE_W, type: D.WidthType.DXA },
      layout: D.TableLayoutType.FIXED,
      columnWidths: Array(totalCols).fill(COL_W),
      rows: [head1, head2, ...dataRows],
    });

    // ===== Top-Tabelle: Titel links breit, Legende rechts oben (wie im Original) =====
    const noBorder = {
      top: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    };
    // Legende sehr kompakt rechts oben (~17 %), Titel bekommt den Rest;
    // der Titel-Text selbst bleibt gleich gross (ist nur eine Zeile, links bündig)
    const TOP_LEGEND_W = Math.round(TABLE_W * 0.17);
    const TOP_TITLE_W = TABLE_W - TOP_LEGEND_W;
    // Titel-Zelle: bunter Titeltext
    const titleCell = new D.TableCell({
      width: { size: TOP_TITLE_W, type: D.WidthType.DXA },
      margins: { top: 0, bottom: 0, left: 0, right: 100 },
      borders: noBorder,
      verticalAlign: D.VerticalAlign.TOP,
      children: [
        new D.Paragraph({
          spacing: { before: 0, after: 0 },
          children: [new D.TextRun({ text: `${cfg.title}, Herbstsemester ${semester}`, bold: true, size: 28, color: 'AC0101' })],
        }),
      ],
    });
    // Legende rechts oben: 3 farbige Zellen vertikal gestapelt (1 Spalte × 3 Zeilen)
    const legendItems = [
      { text: 'Veranstaltungen IPS', fill: 'FFC000', color: '000000' },
      { text: 'Veranstaltungen IS1', fill: '00B0F0', color: 'FFFFFF' },
      { text: 'offene Werkstatt',    fill: 'FFFF00', color: '000000' },
    ];
    const legendBorder = {
      top: { style: D.BorderStyle.SINGLE, size: 4, color: '999999' },
      bottom: { style: D.BorderStyle.SINGLE, size: 4, color: '999999' },
      left: { style: D.BorderStyle.SINGLE, size: 4, color: '999999' },
      right: { style: D.BorderStyle.SINGLE, size: 4, color: '999999' },
    };
    const legendTable = new D.Table({
      width: { size: TOP_LEGEND_W, type: D.WidthType.DXA },
      layout: D.TableLayoutType.FIXED,
      columnWidths: [TOP_LEGEND_W],
      rows: legendItems.map(it => new D.TableRow({
        height: { value: 180, rule: D.HeightRule.EXACT }, // kompakter
        children: [new D.TableCell({
          width: { size: TOP_LEGEND_W, type: D.WidthType.DXA },
          shading: { type: D.ShadingType.SOLID, color: it.fill, fill: it.fill },
          margins: { top: 10, bottom: 10, left: 20, right: 20 },
          borders: legendBorder,
          children: [new D.Paragraph({
            alignment: D.AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            children: [new D.TextRun({ text: it.text, bold: true, size: 12, color: it.color })], // 6pt
          })],
        })],
      })),
    });
    const legendCell = new D.TableCell({
      width: { size: TOP_LEGEND_W, type: D.WidthType.DXA },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      borders: noBorder,
      verticalAlign: D.VerticalAlign.TOP,
      children: [legendTable],
    });
    const topWrapTable = new D.Table({
      width: { size: TABLE_W, type: D.WidthType.DXA },
      layout: D.TableLayoutType.FIXED,
      columnWidths: [TOP_TITLE_W, TOP_LEGEND_W],
      borders: {
        top: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [new D.TableRow({ children: [titleCell, legendCell] })],
    });

    // ===== Zusatz-Listen — 1. Raum (D023/D004) ganz links, 2. Raum (D027/D008) mittlere+rechte Spalte =====
    const wdShortNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    const fmtExtra = (item) => {
      const persAbbr = abbrPersons(item.persons);
      const startTime = timeStr(item.start);
      const endTime = timeStr(item.end);
      let dateStr;
      if (item.endDate && +item.endDate !== +item.start) {
        dateStr = `${swissDate(item.start)}–${swissDate(item.endDate)}, ${wdShortNames[item.start.getDay()]}–${wdShortNames[item.endDate.getDay()]}`;
      } else {
        dateStr = `${swissDate(item.start)}, ${wdShortNames[item.start.getDay()]}`;
      }
      const cleanTitle = item.title === 'LNW' ? 'LNW' : stripGroupCX(item.title);
      return `${dateStr}, ${startTime}–${endTime}` + (persAbbr ? `, ${persAbbr}` : '') + `, ${cleanTitle}`;
    };
    const extraSections = [];
    const buildItemPara = (text) => new D.Paragraph({
      spacing: { before: 0, after: 0, line: 200, lineRule: D.LineRuleType.AUTO },
      children: [new D.TextRun({ text, size: 14 })],
    });
    const buildHeaderPara = (code) => new D.Paragraph({
      spacing: { before: 0, after: 60 },
      children: [new D.TextRun({ text: `Zusätzliche Belegungen im ${code}`, bold: true, size: 16, color: 'AC0101' })],
    });
    const extrasBorder = {
      top: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    };

    if (rooms.length === 2) {
      // 2-Raum-Layout: Raum mit mehr Items bekommt 2/3 (Items in 2 Sub-Spalten),
      // der andere 1/3 (Items gestapelt). Bei Gleichstand: 1. Raum breit.
      const narrowW = Math.floor(TABLE_W / 3);
      const wideW = TABLE_W - narrowW;
      const itemsA = aggregateExtras(list.filter(e => e.room.code === rooms[0].code).sort((a,b)=>a.start-b.start));
      const itemsB = aggregateExtras(list.filter(e => e.room.code === rooms[1].code).sort((a,b)=>a.start-b.start));
      const wideIsB = itemsB.length > itemsA.length;
      const room0 = wideIsB ? rooms[1] : rooms[0];
      const room1 = wideIsB ? rooms[0] : rooms[1];
      const items0 = wideIsB ? itemsB : itemsA;
      const items1 = wideIsB ? itemsA : itemsB;

      // Linke Spalte (2/3): Raum 0, Items in 2-Spalten-Sub-Tabelle
      const wideInnerW = Math.floor(wideW / 2);
      const wideInnerRowsCount = Math.ceil(items0.length / 2);
      const wideInnerRows = [];
      for (let r0 = 0; r0 < wideInnerRowsCount; r0++) {
        const innerCells = [];
        for (let c0 = 0; c0 < 2; c0++) {
          const idx = r0 * 2 + c0;
          if (idx < items0.length) {
            innerCells.push(new D.TableCell({
              width: { size: c0 === 1 ? wideW - wideInnerW : wideInnerW, type: D.WidthType.DXA },
              margins: { top: 20, bottom: 20, left: 0, right: 100 },
              borders: noBorder,
              children: [buildItemPara(fmtExtra(items0[idx]))],
            }));
          } else {
            innerCells.push(new D.TableCell({
              width: { size: c0 === 1 ? wideW - wideInnerW : wideInnerW, type: D.WidthType.DXA },
              borders: noBorder,
              children: [new D.Paragraph('')],
            }));
          }
        }
        wideInnerRows.push(new D.TableRow({ children: innerCells }));
      }
      const wideInnerTable = items0.length ? new D.Table({
        width: { size: wideW, type: D.WidthType.DXA },
        layout: D.TableLayoutType.FIXED,
        columnWidths: [wideInnerW, wideW - wideInnerW],
        borders: extrasBorder,
        rows: wideInnerRows,
      }) : null;
      const wideCellChildren = [buildHeaderPara(room0.code)];
      if (wideInnerTable) wideCellChildren.push(wideInnerTable);
      const wideCell = new D.TableCell({
        width: { size: wideW, type: D.WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 0, right: 100 },
        borders: noBorder,
        verticalAlign: D.VerticalAlign.TOP,
        children: wideCellChildren,
      });
      const narrowCellChildren = [buildHeaderPara(room1.code)];
      for (const it of items1) narrowCellChildren.push(buildItemPara(fmtExtra(it)));
      const narrowCell = new D.TableCell({
        width: { size: narrowW, type: D.WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 0, right: 0 },
        borders: noBorder,
        verticalAlign: D.VerticalAlign.TOP,
        children: narrowCellChildren.length ? narrowCellChildren : [new D.Paragraph('')],
      });
      const extrasWrapTable = new D.Table({
        width: { size: TABLE_W, type: D.WidthType.DXA },
        layout: D.TableLayoutType.FIXED,
        columnWidths: [wideW, narrowW],
        borders: extrasBorder,
        rows: [new D.TableRow({ children: [wideCell, narrowCell] })],
      });
      if (items0.length || items1.length) extraSections.push(extrasWrapTable);

    } else if (rooms.length >= 3) {
      // N-Raum-Layout (N>=3): N gleichbreite Spalten, Items pro Raum gestapelt
      const colW = Math.floor(TABLE_W / rooms.length);
      const lastColW = TABLE_W - colW * (rooms.length - 1);
      const cells = rooms.map((r, idx) => {
        const itemsR = aggregateExtras(list.filter(e => e.room.code === r.code).sort((a,b)=>a.start-b.start));
        const cellChildren = [buildHeaderPara(r.code)];
        for (const it of itemsR) cellChildren.push(buildItemPara(fmtExtra(it)));
        return new D.TableCell({
          width: { size: idx === rooms.length - 1 ? lastColW : colW, type: D.WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 0, right: 100 },
          borders: noBorder,
          verticalAlign: D.VerticalAlign.TOP,
          children: cellChildren.length > 1 ? cellChildren : [buildHeaderPara(r.code), new D.Paragraph('')],
        });
      });
      const hasAny = rooms.some(r => list.some(e => e.room.code === r.code));
      const extrasWrapTable = new D.Table({
        width: { size: TABLE_W, type: D.WidthType.DXA },
        layout: D.TableLayoutType.FIXED,
        columnWidths: rooms.map((_, idx) => idx === rooms.length - 1 ? lastColW : colW),
        borders: extrasBorder,
        rows: [new D.TableRow({ children: cells })],
      });
      if (hasAny) extraSections.push(extrasWrapTable);
    }

    // ===== Document zusammensetzen =====
    const doc = new D.Document({
      styles: { default: { document: { run: { font: 'Calibri' } } } },
      sections: [{
        properties: {
          page: {
            // A4 (Portrait-Maße in dxa); orientation:LANDSCAPE rotiert es zu Querformat
            size: { orientation: D.PageOrientation.LANDSCAPE, width: 11906, height: 16838 },
            margin: { top: 567, bottom: 567, left: 567, right: 567 }, // 1 cm
          },
        },
        children: [
          // Top-Zeile: Titel links + Legende rechts oben (statt Title-only Paragraph)
          topWrapTable,
          new D.Paragraph({ spacing: { before: 80, after: 40 }, children: [new D.TextRun({ text: '', size: 4 })] }),
          // Leads (IPS + IS1) volle Breite
          new D.Paragraph({
            spacing: { before: 0, after: 40 },
            children: [
              new D.TextRun({ text: 'IPS Dozierende: ', bold: true, size: 16, color: 'AC0101' }),
              new D.TextRun({ text: cfg.ipsLeads, size: 16 }),
            ],
          }),
          new D.Paragraph({
            spacing: { before: 0, after: 100 },
            children: [
              new D.TextRun({ text: 'IS1 Dozierende: ', bold: true, size: 16, color: 'AC0101' }),
              new D.TextRun({ text: cfg.is1Leads, size: 16 }),
            ],
          }),
          aushangTable,
          new D.Paragraph({ spacing: { before: 60, after: 0 }, children: [new D.TextRun({ text: '', size: 4 })] }),
          ...extraSections,
          // Datenstand klein am Fuss
          new D.Paragraph({
            spacing: { before: 200, after: 0 },
            children: [
              new D.TextRun({
                text: `Datenstand: ${window.RAUMDATEN_STAND || '—'} · Quelle: apps.phbern.ch/raumkalender · Experimentell, ohne Gewähr`,
                size: 12, italics: true, color: '999999'
              }),
            ],
          }),
        ],
      }],
    });

    D.Packer.toBlob(doc).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Raumbelegung_${kind}_${semester}.docx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
      // kein Status-Hinweis (im Aushang-Tab eh ausgeblendet)
    }).catch(err => {
      console.error(err);
      setStatus('Word-Export fehlgeschlagen: ' + err.message, 'error');
    });
  }

  // ---------- Excel-Export (.xml mit Excel.Sheet progid → SpreadsheetML 2003) ----------
  // Echte Spreadsheet-Datei mit fixen Spaltenbreiten + Zeilenhöhen + Farben.
  // ---------- Excel-Export (.xlsx via SheetJS) ----------
  // Echte XLSX-Datei mit fixen Spaltenbreiten, fixen Zeilenhöhen, Farben + Merges
  function downloadAsXls() {
    if (!state.lastAushang) { setStatus('Erst Aushang öffnen.', 'error'); return; }
    if (typeof XLSX === 'undefined') { setStatus('Excel-Library nicht geladen.', 'error'); return; }
    const { rooms, grid, list, mondays, kind, semester, cfg, minH, maxH } = state.lastAushang;
    const wdNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const N = rooms.length;
    const totalCols = 1 + 5 * N; // 11 für 5 Tage × 2 Räume

    // 2-D-Daten Array für aoa_to_sheet (jede Zeile ein Array)
    const aoa = [];
    const merges = [];
    const styledCells = []; // { r, c, style }

    // Helfer: Hex → RGB ohne #
    const rgb = h => h.replace('#','').toUpperCase();

    // Zeile 0: Titel (über alle Spalten)
    const titleText = `${cfg.title}, Herbstsemester ${semester}`;
    aoa.push([titleText, ...Array(totalCols-1).fill(null)]);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols-1 } });
    styledCells.push({ r: 0, c: 0, style: { font: { bold: true, sz: 14, color: { rgb: 'AC0101' } } } });

    // Legende: 3 farbige Zellen vertikal gestapelt rechts (cols totalCols-3..totalCols-1)
    // Zeilen 1-3 — IPS oben, IS1 mittig, offene Werkstatt unten
    const legColStart = totalCols - 3;
    const legColEnd = totalCols - 1;
    const leadsEndCol = legColStart - 1; // Leads spannen cols 0..leadsEndCol

    // Zeile 1: IPS Dozierende (links, gemerged 0..leadsEndCol) + Legende "IPS" (rechts gemerged)
    const row1 = Array(totalCols).fill(null);
    row1[0] = `IPS Dozierende: ${cfg.ipsLeads}`;
    row1[legColStart] = 'Veranstaltungen IPS';
    aoa.push(row1);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: leadsEndCol } });
    merges.push({ s: { r: 1, c: legColStart }, e: { r: 1, c: legColEnd } });
    styledCells.push({ r: 1, c: 0, style: { font: { sz: 9 }, alignment: { wrapText: true, vertical: 'center' } } });
    styledCells.push({ r: 1, c: legColStart, style: {
      font: { bold: true, sz: 8, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFC000' } }, border: borderAll(),
    }});

    // Zeile 2: IS1 Dozierende (links, gemerged) + Legende "IS1" (rechts gemerged)
    const row2 = Array(totalCols).fill(null);
    row2[0] = `IS1 Dozierende: ${cfg.is1Leads}`;
    row2[legColStart] = 'Veranstaltungen IS1';
    aoa.push(row2);
    merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: leadsEndCol } });
    merges.push({ s: { r: 2, c: legColStart }, e: { r: 2, c: legColEnd } });
    styledCells.push({ r: 2, c: 0, style: { font: { sz: 9 }, alignment: { wrapText: true, vertical: 'center' } } });
    styledCells.push({ r: 2, c: legColStart, style: {
      font: { bold: true, sz: 8, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: '00B0F0' } }, border: borderAll(),
    }});

    // Zeile 3: nur Legende "offene Werkstatt" rechts (links bleibt leer)
    const row3 = Array(totalCols).fill(null);
    row3[legColStart] = 'offene Werkstatt';
    aoa.push(row3);
    merges.push({ s: { r: 3, c: legColStart }, e: { r: 3, c: legColEnd } });
    styledCells.push({ r: 3, c: legColStart, style: {
      font: { bold: true, sz: 8, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFFF00' } }, border: borderAll(),
    }});

    // Zeile 4: leer (Abstand)
    aoa.push(Array(totalCols).fill(null));

    // Zeile 5: Header — Zeit (rowspan) + 5 Tage (colspan über N Räume)
    const hdrDayRow = [''];
    for (let d = 0; d < 5; d++) {
      hdrDayRow.push(wdNames[d]);
      for (let i = 1; i < N; i++) hdrDayRow.push(null);
    }
    aoa.push(hdrDayRow);
    // Merge time-Header über 2 Zeilen
    merges.push({ s: { r: 5, c: 0 }, e: { r: 6, c: 0 } });
    // Merge Tage über N Spalten
    for (let d = 0; d < 5; d++) {
      const c = 1 + d * N;
      merges.push({ s: { r: 5, c: c }, e: { r: 5, c: c + N - 1 } });
      styledCells.push({ r: 5, c, style: { font: { bold: true, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: 'E8E8E8' } } } });
    }

    // Zeile 6: Header — Raum-Codes (neutral grau D9D9D9 wie Original-Word)
    const hdrRoomRow = [null];
    for (let d = 0; d < 5; d++) {
      for (let i = 0; i < N; i++) hdrRoomRow.push(rooms[i].code);
    }
    aoa.push(hdrRoomRow);
    for (let d = 0; d < 5; d++) {
      for (let i = 0; i < N; i++) {
        styledCells.push({ r: 6, c: 1 + d * N + i, style: {
          font: { bold: true, sz: 10, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: 'D9D9D9' } },
        }});
      }
    }

    // Body: pro Stunde eine Zeile mit fester Höhe
    const bodyStartRow = 7;
    const occupied = new Set();
    for (let h = minH; h < maxH; h++) {
      const rIdx = bodyStartRow + (h - minH);
      const row = [`${String(h).padStart(2,'0')}-${String(h+1).padStart(2,'0')}`];
      // Initial: leere Werte für alle Tag×Raum-Spalten
      for (let i = 1; i < totalCols; i++) row.push(null);
      // Time-Cell stylen
      // Time-Cell — gleiche Schrift wie Tage-Header (beide fett, gleiche Größe)
      styledCells.push({ r: rIdx, c: 0, style: { font: { sz: 11, bold: true, color: { rgb: '000000' } }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: 'F5F5F5' } } } });
      // Module einsetzen
      for (let d = 0; d < 5; d++) {
        for (let i = 0; i < N; i++) {
          const occKey = `${d}|${i}|${h}`;
          if (occupied.has(occKey)) continue;
          const cIdx = 1 + d * N + i;
          const r = rooms[i];
          const startsHere = grid.find(g => g.dayIdx === d && g.room.code === r.code && g.startH === h);
          if (!startsHere) continue;
          const span = Math.max(1, Math.min(maxH, startsHere.endH) - h);
          const typ = startsHere.aushangType || aushangType(startsHere.title);
          const colorMap = { ips: 'FFC000', is1: '00B0F0', offen: 'FFFF00', neutral: 'D9D9D9' };
          const bg = colorMap[typ] || 'D9D9D9';
          const fg = typ === 'is1' ? 'FFFFFF' : '000000';
          const persAbbr = abbrPersons(startsHere.persons);
          const isFull = startsHere.weekIdxs.length === startsHere.totalWeeks;
          const kwLabel = isFull ? '' : compressKWs(startsHere.weekIdxs, mondays);
          const txt = shortTitle(startsHere.title) +
                      (persAbbr ? `\n${persAbbr}` : '') +
                      (kwLabel ? `\n${kwLabel}` : '');
          row[cIdx] = txt;
          styledCells.push({ r: rIdx, c: cIdx, style: {
            font: { sz: 9, color: { rgb: fg } },
            alignment: { vertical: 'top', wrapText: true },
            fill: { fgColor: { rgb: bg } },
            border: borderAll(),
          }});
          // Multi-Stunden: MergeDown
          if (span > 1) {
            merges.push({ s: { r: rIdx, c: cIdx }, e: { r: rIdx + span - 1, c: cIdx } });
            for (let k = 1; k < span; k++) occupied.add(`${d}|${i}|${h+k}`);
          }
        }
      }
      aoa.push(row);
    }

    // Border auf allen Body-Zellen + leere Zellen einfärben für Optik
    for (let h = minH; h < maxH; h++) {
      const rIdx = bodyStartRow + (h - minH);
      for (let c = 1; c < totalCols; c++) {
        const exists = styledCells.some(s => s.r === rIdx && s.c === c);
        if (!exists) styledCells.push({ r: rIdx, c, style: { border: borderAll() } });
      }
      // Time cell border
      const tStyle = styledCells.find(s => s.r === rIdx && s.c === 0);
      if (tStyle) tStyle.style.border = borderAll();
    }
    // Header borders (Zeile 5 = Tage, Zeile 6 = Räume — durch 3-zeilige Legende verschoben)
    for (let c = 0; c < totalCols; c++) {
      const s5 = styledCells.find(s => s.r === 5 && s.c === c);
      if (!s5 && c === 0) {} // time merged
      else if (!s5) styledCells.push({ r: 5, c, style: { border: borderAll() } });
      else s5.style.border = borderAll();
      const s6 = styledCells.find(s => s.r === 6 && s.c === c);
      if (s6) s6.style.border = borderAll();
    }

    // Zusatz-Listen — Side-by-Side: erster Raum (D023/D004) ganz links (1/3 Breite),
    // zweiter Raum (D027/D008) mittlere+rechte Spalte (2/3 Breite, items in 2 Sub-Spalten)
    aoa.push(Array(totalCols).fill(null)); // Abstand
    const wdShortNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    const fmtExtraTxt = (item) => {
      const persAbbr = abbrPersons(item.persons);
      const startTime = timeStr(item.start);
      const endTime = timeStr(item.end);
      let dateStr;
      if (item.endDate && +item.endDate !== +item.start) {
        dateStr = `${swissDate(item.start)}–${swissDate(item.endDate)}, ${wdShortNames[item.start.getDay()]}–${wdShortNames[item.endDate.getDay()]}`;
      } else {
        dateStr = `${swissDate(item.start)}, ${wdShortNames[item.start.getDay()]}`;
      }
      const cleanTitle = item.title === 'LNW' ? 'LNW' : stripGroupCX(item.title);
      return `${dateStr}, ${startTime}–${endTime}` + (persAbbr ? `, ${persAbbr}` : '') + `, ${cleanTitle}`;
    };
    if (rooms.length === 2) {
      // 2-Raum-Layout: Raum mit mehr Items belegt 2/3 (2 Sub-Spalten), der andere 1/3
      const wideHalf = Math.floor(2 * totalCols / 6);
      const midEnd = wideHalf * 2 - 1;
      const itemsA = aggregateExtras(list.filter(e => e.room.code === rooms[0].code).sort((a,b)=>a.start-b.start));
      const itemsB = aggregateExtras(list.filter(e => e.room.code === rooms[1].code).sort((a,b)=>a.start-b.start));
      const wideIsB = itemsB.length > itemsA.length;
      const r0 = wideIsB ? rooms[1] : rooms[0];
      const r1 = wideIsB ? rooms[0] : rooms[1];
      const items0 = wideIsB ? itemsB : itemsA;
      const items1 = wideIsB ? itemsA : itemsB;

      const hdrIdx = aoa.length;
      const hdrRow = Array(totalCols).fill(null);
      hdrRow[0] = `Zusätzliche Belegungen im ${r0.code}`;
      hdrRow[midEnd + 1] = `Zusätzliche Belegungen im ${r1.code}`;
      aoa.push(hdrRow);
      merges.push({ s: { r: hdrIdx, c: 0 }, e: { r: hdrIdx, c: midEnd } });
      merges.push({ s: { r: hdrIdx, c: midEnd + 1 }, e: { r: hdrIdx, c: totalCols - 1 } });
      styledCells.push({ r: hdrIdx, c: 0, style: { font: { bold: true, sz: 11, color: { rgb: 'AC0101' } } } });
      styledCells.push({ r: hdrIdx, c: midEnd + 1, style: { font: { bold: true, sz: 11, color: { rgb: 'AC0101' } } } });

      const rowsCount = Math.max(Math.ceil(items0.length / 2), items1.length);
      for (let i = 0; i < rowsCount; i++) {
        const row = Array(totalCols).fill(null);
        const exIdx = aoa.length;
        const leftIdx = 2 * i;
        if (leftIdx < items0.length) {
          row[0] = fmtExtraTxt(items0[leftIdx]);
          merges.push({ s: { r: exIdx, c: 0 }, e: { r: exIdx, c: wideHalf - 1 } });
          styledCells.push({ r: exIdx, c: 0, style: { font: { sz: 9 }, alignment: { wrapText: true, vertical: 'top' } } });
        }
        const midIdx = 2 * i + 1;
        if (midIdx < items0.length) {
          row[wideHalf] = fmtExtraTxt(items0[midIdx]);
          merges.push({ s: { r: exIdx, c: wideHalf }, e: { r: exIdx, c: midEnd } });
          styledCells.push({ r: exIdx, c: wideHalf, style: { font: { sz: 9 }, alignment: { wrapText: true, vertical: 'top' } } });
        }
        if (i < items1.length) {
          row[midEnd + 1] = fmtExtraTxt(items1[i]);
          merges.push({ s: { r: exIdx, c: midEnd + 1 }, e: { r: exIdx, c: totalCols - 1 } });
          styledCells.push({ r: exIdx, c: midEnd + 1, style: { font: { sz: 9 }, alignment: { wrapText: true, vertical: 'top' } } });
        }
        aoa.push(row);
      }

    } else if (rooms.length >= 3) {
      // N-Raum-Layout (N>=3): gleichbreite Spalten, Items pro Raum gestapelt
      const N3 = rooms.length;
      const colExcel = Math.floor(totalCols / N3); // Excel-Cols pro Raum-Section
      const itemsPerRoom = rooms.map(r => aggregateExtras(list.filter(e => e.room.code === r.code).sort((a,b)=>a.start-b.start)));
      // Header-Zeile
      const hdrIdx = aoa.length;
      const hdrRow = Array(totalCols).fill(null);
      const colStart = [];
      const colEnd = [];
      for (let k = 0; k < N3; k++) {
        const start = k * colExcel;
        const end = (k === N3 - 1) ? totalCols - 1 : (k + 1) * colExcel - 1;
        colStart.push(start);
        colEnd.push(end);
        hdrRow[start] = `Zusätzliche Belegungen im ${rooms[k].code}`;
      }
      aoa.push(hdrRow);
      for (let k = 0; k < N3; k++) {
        merges.push({ s: { r: hdrIdx, c: colStart[k] }, e: { r: hdrIdx, c: colEnd[k] } });
        styledCells.push({ r: hdrIdx, c: colStart[k], style: { font: { bold: true, sz: 11, color: { rgb: 'AC0101' } } } });
      }
      const rowsCount = Math.max(...itemsPerRoom.map(arr => arr.length));
      for (let i = 0; i < rowsCount; i++) {
        const row = Array(totalCols).fill(null);
        const exIdx = aoa.length;
        for (let k = 0; k < N3; k++) {
          if (i < itemsPerRoom[k].length) {
            row[colStart[k]] = fmtExtraTxt(itemsPerRoom[k][i]);
            merges.push({ s: { r: exIdx, c: colStart[k] }, e: { r: exIdx, c: colEnd[k] } });
            styledCells.push({ r: exIdx, c: colStart[k], style: { font: { sz: 9 }, alignment: { wrapText: true, vertical: 'top' } } });
          }
        }
        aoa.push(row);
      }
    }

    // Datenstand klein am Schluss
    const standIdx = aoa.length;
    aoa.push([`Datenstand: ${window.RAUMDATEN_STAND || '—'} · Quelle: apps.phbern.ch/raumkalender · Experimentell, ohne Gewähr`, ...Array(totalCols-1).fill(null)]);
    merges.push({ s: { r: standIdx, c: 0 }, e: { r: standIdx, c: totalCols-1 } });
    styledCells.push({ r: standIdx, c: 0, style: { font: { sz: 8, italic: true, color: { rgb: '999999' } } } });

    // Sheet bauen
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Spaltenbreiten: Zeit 7 chars, andere 16 chars (Excel-Einheit)
    // Bei N=2: 16 Zeichen pro Raum-Spalte; bei N>=3 schmaler damit alles auf A4 quer passt
    const roomColWch = N >= 3 ? 11 : 16;
    ws['!cols'] = [{ wch: 8 }];
    for (let i = 1; i < totalCols; i++) ws['!cols'].push({ wch: roomColWch });
    // Zeilenhöhen: Body-Stunden 30pt
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 22 };  // Titel
    ws['!rows'][1] = { hpt: 18 };  // IPS-Lead + Legende "IPS" rechts
    ws['!rows'][2] = { hpt: 18 };  // IS1-Lead + Legende "IS1" rechts
    ws['!rows'][3] = { hpt: 18 };  // Legende "offene Werkstatt" rechts (links leer)
    ws['!rows'][4] = { hpt: 6 };   // Abstand
    ws['!rows'][5] = { hpt: 18 };  // Header Day
    ws['!rows'][6] = { hpt: 18 };  // Header Room
    for (let h = minH; h < maxH; h++) {
      ws['!rows'][bodyStartRow + (h - minH)] = { hpt: 30 };
    }
    // Merges
    ws['!merges'] = merges;
    // Styles auf Zellen anwenden
    for (const sc of styledCells) {
      const addr = XLSX.utils.encode_cell({ r: sc.r, c: sc.c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = sc.style;
    }
    // Print-Settings
    ws['!margins'] = { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${kind}_${semester}`);
    XLSX.writeFile(wb, `Raumbelegung_${kind}_${semester}.xlsx`, { cellStyles: true });
    // kein Status-Hinweis
  }

  function borderAll() {
    return {
      top:    { style: 'thin', color: { rgb: '999999' } },
      bottom: { style: 'thin', color: { rgb: '999999' } },
      left:   { style: 'thin', color: { rgb: '999999' } },
      right:  { style: 'thin', color: { rgb: '999999' } },
    };
  }

})();
