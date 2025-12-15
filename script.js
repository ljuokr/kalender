(() => {
  const API_URL = 'https://apps.phbern.ch/raumkalender/api/v1/resource/events';
  const RESOURCE_ID = 8270866;

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

  function formatDateInput(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  function formatSwiss(date) {
    return [
      String(date.getDate()).padStart(2, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      date.getFullYear(),
    ].join('.');
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
      setStatus('Lade Termine...', 'info');
      const selected = new Date(`${dateInput.value}T00:00:00`);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: RESOURCE_ID,
          datepickerValue: formatSwiss(selected),
        }),
      });

      if (!res.ok) throw new Error(`API-Fehler ${res.status}`);
      const data = await res.json();
      const events = (data.events || []).map(ev => ({
        summary: ev.title,
        start: ev.start ? new Date(ev.start * 1000) : null, // API liefert Sekunden
        end: ev.stop ? new Date(ev.stop * 1000) : null,
        location: ev.location,
        persons: ev.persons,
      }));

      render(events);
    } catch (err) {
      console.error(err);
      setStatus('Fehler beim Laden der Termine. Bitte erneut versuchen.', 'error');
    }
  }

  update();
})();
