(() => {
  const ICS_SOURCE = 'https://apps.phbern.ch/raumkalender/room/8270866.ics';
  const PROXY_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(ICS_SOURCE);

  const dateInput = document.getElementById('date-picker');
  const eventsEl = document.getElementById('events');
  const statusEl = document.getElementById('status');
  const reloadBtn = document.getElementById('reload');

  const defaultDate = new Date('2025-12-14T00:00:00');
  dateInput.value = formatDateInput(defaultDate);

  reloadBtn.addEventListener('click', update);
  dateInput.addEventListener('change', update);

  function setStatus(text, type = 'info') {
    statusEl.textContent = text;
    statusEl.className = `status ${type}`;
  }

  async function loadICS() {
    setStatus('Lade Termine...', 'info');
    try {
      const res = await fetch(PROXY_URL);
      if (!res.ok) throw new Error('Proxy fehlgeschlagen');
      return await res.text();
    } catch (err) {
      console.warn('Proxy fehlgeschlagen, versuche Direktzugriff', err);
      const fallback = await fetch(ICS_SOURCE);
      if (!fallback.ok) throw new Error('ICS nicht erreichbar');
      return await fallback.text();
    }
  }

  function unfold(text) {
    return text.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n');
  }

  function parseICS(text) {
    const events = [];
    let cur = null;

    const lines = unfold(text).split('\n');
    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        cur = {};
      } else if (line.startsWith('END:VEVENT')) {
        if (cur && cur.start) events.push(cur);
        cur = null;
      } else if (cur) {
        if (line.startsWith('SUMMARY:')) cur.summary = line.slice(8).trim();
        else if (line.startsWith('DTSTART')) cur.start = toDate(line.split(':')[1]);
        else if (line.startsWith('DTEND')) cur.end = toDate(line.split(':')[1]);
        else if (line.startsWith('LOCATION:')) cur.location = line.slice(9).trim();
      }
    }
    return events;
  }

  function toDate(val) {
    if (!val) return null;
    const m = val.match(/(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
    if (!m) return null;
    const [, Y, M, D, h = '00', mi = '00', s = '00'] = m.map(Number);
    return new Date(Y, M - 1, D, h, mi, s);
  }

  function formatDateInput(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  function formatTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  function render(events) {
    const selected = new Date(`${dateInput.value}T00:00:00`);
    const filtered = events
      .filter(e => e.start && sameDay(e.start, selected))
      .sort((a, b) => a.start - b.start);

    eventsEl.innerHTML = '';

    if (!filtered.length) {
      eventsEl.innerHTML = `<div class="empty">Keine Termine am ${selected.toLocaleDateString('de-CH')}</div>`;
      setStatus('Keine Termine gefunden', 'ok');
      return;
    }

    for (const ev of filtered) {
      const card = document.createElement('article');
      card.className = 'event-card';

      const header = document.createElement('div');
      header.className = 'event-header';

      const title = document.createElement('p');
      title.className = 'event-title';
      title.textContent = ev.summary || 'Ohne Titel';

      const time = document.createElement('span');
      time.className = 'event-time';
      time.textContent = `${formatTime(ev.start)} – ${ev.end ? formatTime(ev.end) : 'offen'}`;

      header.append(title, time);

      const meta = document.createElement('div');
      meta.className = 'event-meta';
      meta.textContent = ev.location ? `Ort: ${ev.location}` : 'Ort: Raum 8270866';

      card.append(header, meta);
      eventsEl.appendChild(card);
    }
    setStatus(`Gefunden: ${filtered.length} Termin(e) am ${selected.toLocaleDateString('de-CH')}`, 'ok');
  }

  async function update() {
    try {
      const ics = await loadICS();
      const events = parseICS(ics);
      render(events);
    } catch (err) {
      console.error(err);
      setStatus('Fehler beim Laden der Termine. Bitte erneut versuchen.', 'error');
    }
  }

  update();
})();
