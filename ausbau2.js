/* AzubiHub · Ausbau 2
   Berichtsheft einsprechen, Fotos im Wochenbericht, Offline-Warteschlange, Schultage nach Muster, IHK-Datenblatt und
   Übersicht für die Ausbildungsberatung (PDF), Lernkarten, Praxisaufgaben, Beurteilung mit Stellungnahme und PDF,
   Standortvergleich, Ausbildungs-Siegel, Einladung aus Bewerbung. Wird vor dem Hauptskript geladen. */

/* =====================================================================
   Einsprechen (Spracheingabe) – Browser-Spracherkennung, sonst Diktierfunktion der Tastatur
   ===================================================================== */
const DK_SR = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;
const DK_NUM = { ein: 1, eine: 1, einen: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12 };
const dkNum = s => { s = String(s).toLowerCase().replace(',', '.'); return DK_NUM[s] ?? (isNaN(+s) ? null : +s); };
// Zerlegt gesprochenen Text in Tätigkeiten mit Zeit: „Frühstück eingedeckt eine Stunde, danach Check-in 2,5 Stunden“
function dkParse(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const parts = text.split(/(?:[.;!?\n]+\s*|,\s+(?=(?:danach|dann|anschließend|außerdem|zuletzt|zum schluss)\b)|\s+(?:und dann|danach|anschließend|außerdem|zuletzt|zum schluss)\s+)/i).map(s => s.trim()).filter(Boolean);
  const N = '(\\d+(?:[.,]\\d+)?|ein|eine|einen|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)';
  const pats = [
    [new RegExp(`(?:von\\s+)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:uhr\\s*)?bis\\s+(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:uhr)?`, 'i'), m => { let a = +m[1] * 60 + (+m[2] || 0), b = +m[3] * 60 + (+m[4] || 0); if (b <= a) b += 720; return b - a; }],
    [/(?:ein(?:e|er)?\s+)?(?:dreiviertel|drei viertel)\s*stunde/i, () => 45],
    [/(?:eine\s+)?viertel\s*stunde/i, () => 15],
    [/(?:eine\s+)?halbe\s+stunde/i, () => 30],
    [/(?:anderthalb|eineinhalb|ein\s+einhalb)\s+stunden?/i, () => 90],
    [new RegExp(`${N}\\s+(?:und\\s+(?:ein(?:e)?\\s+)?halb(?:e)?\\s+)?(?:stunden?|std\\.?|h)\\b(?:\\s+und\\s+${N}\\s+min(?:uten?)?)?`, 'i'), m => { const h = dkNum(m[1]); if (h === null) return null; return Math.round(h * 60) + (/und\s+(?:ein(?:e)?\s+)?halb/i.test(m[0]) ? 30 : 0) + (m[2] ? (dkNum(m[2]) || 0) : 0); }],
    [new RegExp(`${N}\\s*(?:minuten|min\\.?)\\b`, 'i'), m => dkNum(m[1])]
  ];
  return parts.map(p => {
    let min = 0, t = p;
    for (const [re, fn] of pats) { const m = t.match(re); if (m) { const v = fn(m); if (v) { min = Math.min(720, Math.round(v / 5) * 5); t = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)); break; } } }
    t = t.replace(/\b(?:für|ca\.?|circa|etwa|ungefähr|lang)\s*$/i, '').replace(/^(?:\s*(?:und|dann|danach|anschließend|außerdem|zuletzt|zum schluss|heute|morgens|mittags|nachmittags|abends|ich habe|habe ich|hab ich|ich hab|wir haben|haben wir|ich)\b[,\s]*)+/i, '')
      .replace(/\s+(?:gemacht|erledigt)\s*$/i, '').replace(/\s+(?:für|ca\.?|etwa)\s*$/i, '').replace(/\s{2,}/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '');
    if (!t) return null;
    return { text: (t[0].toUpperCase() + t.slice(1)).slice(0, 200), min };
  }).filter(Boolean);
}
// Spracherkennung starten; liefert Stop-Funktion. onText(final, interim)
function dkListen(onText, onEnd) {
  const R = DK_SR(); if (!R) return null;
  const r = new R(); r.lang = LANG === 'de' || !LANG ? 'de-DE' : ({ en: 'en-US', uk: 'uk-UA', ar: 'ar-SA' })[LANG] || 'de-DE';
  r.continuous = true; r.interimResults = true;
  let fin = '', stopped = false;
  r.onresult = e => { let inter = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const x = e.results[i]; if (x.isFinal) fin += (fin ? ' ' : '') + x[0].transcript.trim(); else inter += x[0].transcript; } onText(fin, inter); };
  r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Bitte erlaube den Zugriff auf das Mikrofon.'); else if (e.error === 'network') toast('Für die Spracherkennung braucht dein Browser Internet.'); };
  r.onend = () => { if (!stopped) { try { r.start(); return; } catch {} } onEnd?.(fin); };
  try { r.start(); } catch { return null; }
  return () => { stopped = true; try { r.stop(); } catch {} };
}
const dkMicBtn = (attr, label = 'Einsprechen') => `<button type="button" class="xbtn" style="color:var(--accent)" ${attr} title="${label}" aria-label="${label}"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>`;
// Sheet: einen Tag einsprechen, Vorschau als Tätigkeiten mit Zeit, Übernehmen in den Wochenbericht
function dkDaySheet(i, days, onDone) {
  const R = DK_SR(), d = days[i], dates = weekDates(S.rep.week);
  let stop = null;
  sheetShell(`${DAYS[i]}, ${ddmm(dates[i])} einsprechen`, `<div class="card p-4 flex flex-col gap-3">
    <p class="text-[13px] text-muted">Erzähl einfach, was du gemacht hast und wie lange – zum Beispiel: „Frühstück eingedeckt eine Stunde. Danach Check-in von 10 bis 12. Dann Telefon und Reservierungen zwei Stunden.“</p>
    ${R ? `<button type="button" id="dkGo" class="btn" style="min-height:64px;font-size:17px">🎙️ Aufnahme starten</button>` : `<div class="rounded-xl p-3 text-[13px]" style="background:var(--sunk)">Dein Browser kann hier nicht selbst zuhören. Tipp ins Feld und nutze das <b>Mikrofon auf deiner Tastatur</b> (iPhone und Android) – das Ergebnis wird genauso aufgeteilt.</div>`}
    <div><label class="lbl" for="dkTxt">Gesprochener Text <span class="font-normal text-muted">(du kannst ihn korrigieren)</span></label><textarea id="dkTxt" class="field" rows="5" maxlength="3000" placeholder="Hier erscheint, was du sagst …"></textarea><div id="dkInt" class="text-[12px] text-muted mt-1 min-h-[16px]"></div></div>
    <div id="dkPrev"></div>
    <label class="flex items-center gap-2 text-[14px]"><input type="checkbox" id="dkRepl" style="accent-color:var(--accent);width:20px;height:20px" ${d.eintraege.some(e => e.text || e.min) ? '' : 'checked'}> Bisherige Einträge des Tages ersetzen</label>
    <button type="button" id="dkTake" class="btn ghost">In den Wochenbericht übernehmen</button>
    <p class="text-[12px] text-muted">${R ? 'Die Spracherkennung macht dein Browser (bei Chrome über Google, bei Safari über Apple). AzubiHub speichert keine Aufnahme, nur den Text, den du übernimmst.' : 'AzubiHub speichert nur den Text, den du übernimmst.'}</p></div>`);
  const prev = () => {
    const list = dkParse($('#dkTxt').value);
    $('#dkPrev').innerHTML = list.length ? `<div class="eyebrow mb-1">Vorschau</div><div class="rounded-xl overflow-hidden" style="border:1px solid var(--line)">${list.map((e, k) => `<div class="flex justify-between gap-3 px-3 py-2 text-[13px] ${k ? 'border-t border-line' : ''}"><span class="min-w-0">${esc(e.text)}</span><span class="tnum flex-none ${e.min ? 'text-muted' : ''}" style="${e.min ? '' : 'color:var(--st-warn)'}">${e.min ? fmtMin(e.min) : 'Zeit fehlt'}</span></div>`).join('')}</div>` : '';
  };
  $('#dkTxt').oninput = prev;
  if ($('#dkGo')) $('#dkGo').onclick = () => {
    if (stop) { stop(); stop = null; $('#dkGo').textContent = '🎙️ Weiter aufnehmen'; $('#dkInt').textContent = ''; return; }
    const base = $('#dkTxt').value.trim();
    stop = dkListen((fin, inter) => { $('#dkTxt').value = (base ? base + ' ' : '') + fin; $('#dkInt').textContent = inter; prev(); }, () => { if ($('#dkGo')) $('#dkGo').textContent = '🎙️ Weiter aufnehmen'; stop = null; });
    if (!stop) return toast('Die Spracherkennung konnte nicht starten.');
    $('#dkGo').textContent = '⏹ Aufnahme beenden';
  };
  $('#dkTake').onclick = () => {
    if (stop) { stop(); stop = null; }
    const list = dkParse($('#dkTxt').value);
    if (!list.length) return toast('Noch nichts erkannt.');
    const keep = $('#dkRepl').checked ? [] : d.eintraege.filter(e => e.text || e.min);
    d.eintraege = [...keep, ...list];
    closeSheet(); onDone();
    toast(list.some(e => !e.min) ? 'Übernommen – bitte bei einigen Tätigkeiten noch die Zeit eintragen.' : `${list.length} Tätigkeiten übernommen. Speichern nicht vergessen.`);
  };
  const obs = new MutationObserver(() => { if (!$('#dkTxt')) { stop?.(); obs.disconnect(); } }); obs.observe(document.body, { childList: true, subtree: true });
}
// Mikrofon an ein beliebiges Textfeld (Generator, Zusammenfassung)
function dkField(sel, btn) {
  const el = $(sel); if (!el) return;
  if (!DK_SR()) { el.focus(); return toast('Nutze das Mikrofon auf deiner Tastatur zum Diktieren.'); }
  if (btn._stop) { btn._stop(); btn._stop = null; btn.style.color = 'var(--accent)'; return; }
  const base = el.value.trim();
  btn._stop = dkListen(fin => { el.value = (base ? base + (el.tagName === 'TEXTAREA' && sel === '#genIn' ? '\n' : ' ') : '') + (sel === '#genIn' ? dkParse(fin).map(x => x.text).join('\n') || fin : fin); el.dispatchEvent(new Event('input', { bubbles: true })); }, () => { btn._stop = null; btn.style.color = 'var(--accent)'; });
  if (btn._stop) { btn.style.color = 'var(--crit)'; toast('Ich höre zu … zum Beenden nochmal tippen.'); }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-dkfield]'); if (b) { e.preventDefault(); dkField(b.dataset.dkfield, b); } });

/* =====================================================================
   Fotos im Wochenbericht (je Tag, z. B. Teller, Tischdeko, Zimmer)
   ===================================================================== */
const bfCache = {};
async function bfHydrate(root = document) {
  const els = [...root.querySelectorAll('img[data-bfoto]:not([src])')]; if (!els.length) return;
  const need = [...new Set(els.map(e => e.dataset.bfoto).filter(p => !bfCache[p] || bfCache[p].exp < Date.now()))];
  if (need.length) { const { data } = await sb.storage.from('berichtfotos').createSignedUrls(need, 3600); (data || []).forEach(d => { if (d.signedUrl) bfCache[d.path] = { url: d.signedUrl, exp: Date.now() + 3500e3 }; }); }
  els.forEach(e => { const c = bfCache[e.dataset.bfoto]; if (c) e.src = c.url; else e.alt = 'Foto nicht verfügbar'; });
}
const bfThumbs = (list, del) => (list || []).length ? `<div class="flex flex-wrap gap-2 mt-2">${list.map((p, k) => `<div class="relative"><button type="button" data-bfopen="${esc(p)}" class="block rounded-lg overflow-hidden" style="width:64px;height:64px;background:var(--surface)"><img data-bfoto="${esc(p)}" alt="Foto ${k + 1}" style="width:64px;height:64px;object-fit:cover"></button>${del ? `<button type="button" class="xbtn absolute" style="top:-8px;right:-8px;background:var(--surface);width:24px;height:24px" data-bfdel="${del}-${k}" aria-label="Foto entfernen">${svg('x', 'w-3.5 h-3.5')}</button>` : ''}</div>`).join('')}</div>` : '';
async function bfUpload(file, w) {
  if (S.demo) { toast('In der Demo werden keine Fotos gespeichert.'); return null; }
  if (!/^image\//.test(file.type)) { toast('Bitte ein Foto wählen.'); return null; }
  const blob = await compressImage(file, 1600, .8);
  const path = `${S.me.id}/${w.jahr}-${String(w.kw).padStart(2, '0')}/${Date.now()}_${crypto.randomUUID().slice(0, 6)}.jpg`;
  const { error } = await sb.storage.from('berichtfotos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) { toast('Foto konnte nicht hochgeladen werden: ' + errText(error)); return null; }
  return path;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-bfopen]'); if (!b) return;
  const p = b.dataset.bfopen, c = bfCache[p];
  const url = c?.url || (await sb.storage.from('berichtfotos').createSignedUrl(p, 600)).data?.signedUrl;
  if (!url) return toast('Foto nicht verfügbar.');
  sheetShell('Foto', `<img src="${esc(url)}" alt="Foto aus dem Wochenbericht" class="rounded-xl w-full">`);
});

/* =====================================================================
   Offline: eingereichte Berichte in einer Warteschlange halten und automatisch senden
   ===================================================================== */
const OUTBOX = {
  k: () => `azubihub.outbox.${S.me?.id}`,
  all() { try { return JSON.parse(localStorage.getItem(this.k()) || '[]'); } catch { return []; } },
  put(row) { try { const l = this.all().filter(r => !(r.jahr === row.jahr && r.kw === row.kw)); l.push({ ...row, _ts: Date.now() }); localStorage.setItem(this.k(), JSON.stringify(l)); } catch {} },
  set(l) { try { l.length ? localStorage.setItem(this.k(), JSON.stringify(l)) : localStorage.removeItem(this.k()); } catch {} }
};
let outboxBusy = false;
async function flushOutbox() {
  if (outboxBusy || !S.me || S.demo || navigator.onLine === false) return;
  const list = OUTBOX.all(); if (!list.length) return;
  outboxBusy = true; let ok = 0; const rest = [];
  for (const r of list) {
    const { _ts, ...row } = r;
    const cur = await sb.from('reports').select('status').eq('user_id', row.user_id).eq('jahr', row.jahr).eq('kw', row.kw).maybeSingle();
    if (cur.error) { rest.push(r); continue; }
    if (cur.data && ['eingereicht', 'abgezeichnet'].includes(cur.data.status) && row.status === 'entwurf') continue;
    if (cur.data?.status === 'abgezeichnet') continue;
    const { error } = await sb.from('reports').upsert(row, { onConflict: 'user_id,jahr,kw' });
    if (error) rest.push(r); else { ok++; try { localStorage.removeItem(`azubihub.draft.${S.me.id}.${row.jahr}-${row.kw}`); } catch {} }
  }
  OUTBOX.set(rest); outboxBusy = false;
  if (ok) { toast(ok === 1 ? 'Wieder online: Dein Bericht wurde gesendet.' : `Wieder online: ${ok} Berichte gesendet.`); if (S.view === 'bericht') go('bericht'); }
}
window.addEventListener('online', () => setTimeout(flushOutbox, 1500));
const outboxHTML = () => { const n = OUTBOX.all().length; return n ? `<div class="card p-3.5 mt-3 text-[13px]" style="border-color:var(--st-warn)">${n === 1 ? '1 Bericht wartet' : n + ' Berichte warten'} auf Internet und wird automatisch gesendet.</div>` : ''; };

/* =====================================================================
   Schultage nach Muster (feste Wochentage oder Blockwochen)
   ===================================================================== */
function schMusterSheet(azubiIds, onDone, pickFrom = null) {
  const y = new Date().getFullYear(), m = new Date().getMonth();
  const from = localDate(new Date(m >= 7 ? y : y - 1, 7, 1)), to = localDate(new Date(m >= 7 ? y + 1 : y, 6, 31));
  let people = azubiIds.map(id => S.profiles[id]).filter(Boolean);
  sheetShell('Schultage nach Muster', `<form id="smuForm" class="card p-4 flex flex-col gap-3">
    ${pickFrom?.length > 1 ? `<div><div class="lbl">Für wen? <span class="font-normal text-muted">(z. B. die ganze Klasse)</span></div><div class="flex flex-col gap-1">${pickFrom.map(p => `<label class="flex items-center gap-2 text-[14px]"><input type="checkbox" data-smupick="${p.id}" ${azubiIds.includes(p.id) ? 'checked' : ''} style="accent-color:var(--accent);width:18px;height:18px">${esc(p.full_name)} <span class="text-[12px] text-muted">${esc(p.beruf || '')}</span></label>`).join('')}</div></div>` : ''}
    <p class="text-[13px] text-muted">${pickFrom?.length > 1 ? '' : `Für ${esc(people[0]?.full_name || '')}. `}Trägt die Tage als „Berufsschule“ ein – sie erscheinen im Wochenbericht, im Dienstplan und beim Abgleich mit der Schule.</p>
    <div class="seg" role="group" aria-label="Art"><button type="button" data-smart="tage" aria-pressed="true">Feste Wochentage</button><button type="button" data-smart="block" aria-pressed="false">Blockunterricht</button></div>
    <div id="smuTage"><div class="lbl">Wochentage</div><div class="flex flex-wrap gap-2">${['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((l, k) => `<label class="chip cursor-pointer" style="padding:6px 12px"><input type="checkbox" value="${k + 1}" class="mr-1" style="accent-color:var(--accent)">${l}</label>`).join('')}</div>
      <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="lbl" for="smuVon">Von</label><input id="smuVon" type="date" class="field" value="${from}"></div><div><label class="lbl" for="smuBis">Bis</label><input id="smuBis" type="date" class="field" value="${to}"></div></div>
      <div class="mt-3"><label class="lbl" for="smuFerien">Ferien und freie Tage auslassen <span class="font-normal text-muted">(ein Zeitraum pro Zeile, z. B. 12.10.2026 – 24.10.2026)</span></label><textarea id="smuFerien" class="field" rows="3" placeholder="12.10.2026 - 24.10.2026&#10;21.12.2026 - 02.01.2027"></textarea></div></div>
    <div id="smuBlock" hidden><label class="lbl" for="smuBl">Blockwochen <span class="font-normal text-muted">(ein Zeitraum pro Zeile)</span></label><textarea id="smuBl" class="field" rows="4" placeholder="07.09.2026 - 25.09.2026&#10;11.01.2027 - 29.01.2027"></textarea></div>
    <button class="btn">Schultage eintragen</button></form>`);
  let art = 'tage';
  $$('[data-smart]').forEach(b => b.onclick = () => { art = b.dataset.smart; $$('[data-smart]').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#smuTage').hidden = art !== 'tage'; $('#smuBlock').hidden = art !== 'block'; });
  const parseRanges = t => String(t || '').split(/\n+/).map(l => { const ds = [...l.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g)].map(m => `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`); return ds.length ? { von: ds[0], bis: ds[1] || ds[0] } : null; }).filter(Boolean);
  $('#smuForm').onsubmit = async e => {
    e.preventDefault();
    if (pickFrom?.length > 1) { people = $$('[data-smupick]:checked').map(c => S.profiles[c.dataset.smupick]).filter(Boolean); if (!people.length) return toast('Bitte mindestens eine Person wählen.'); }
    let days = [];
    if (art === 'tage') {
      const wd = $$('#smuTage input[type=checkbox]:checked').map(c => +c.value), von = $('#smuVon').value, bis = $('#smuBis').value, fer = parseRanges($('#smuFerien').value);
      if (!wd.length) return toast('Bitte mindestens einen Wochentag wählen.');
      if (!von || !bis || bis < von) return toast('Bitte einen gültigen Zeitraum angeben.');
      for (let d = avD(von); localDate(d) <= bis && days.length < 400; d.setDate(d.getDate() + 1)) { const s = localDate(d); if (wd.includes(d.getDay()) && !fer.some(f => f.von <= s && f.bis >= s)) days.push(s); }
    } else {
      const bl = parseRanges($('#smuBl').value); if (!bl.length) return toast('Bitte mindestens einen Zeitraum eintragen (TT.MM.JJJJ - TT.MM.JJJJ).');
      bl.forEach(r => { for (let d = avD(r.von); localDate(d) <= r.bis && days.length < 400; d.setDate(d.getDate() + 1)) if (d.getDay() % 6) days.push(localDate(d)); });
    }
    if (!days.length) return toast('Keine Schultage im Zeitraum.');
    let n = 0;
    for (const p of people) {
      const ex = await q(sb.from('absences').select('von,bis').eq('user_id', p.id).eq('typ', 'Berufsschule'));
      const mine = days.filter(d => !ex.some(x => x.von <= d && x.bis >= d));
      const runs = schRuns(mine); if (!runs.length) continue;
      await q(sb.from('absences').insert(runs.map(r => ({ user_id: p.id, typ: 'Berufsschule', von: r.von, bis: r.bis, notiz: art === 'tage' ? 'Schultage nach Muster' : 'Blockunterricht' }))));
      n += mine.length;
    }
    closeSheet(); toast(n ? `${n} Schultage eingetragen` : 'Alle Tage waren schon eingetragen.'); onDone?.();
  };
}
// Aufeinanderfolgende Tage zusammenfassen; über das Wochenende hinweg nur, wenn dazwischen kein Werktag fehlt
function schRuns(days) {
  const runs = []; let cur = null;
  [...new Set(days)].sort().forEach(d => {
    if (cur) { let ok = true; for (let x = avD(cur.bis), x2 = avD(d), t = new Date(x.getTime() + 864e5); t < x2; t.setDate(t.getDate() + 1)) if (t.getDay() % 6) { ok = false; break; } if (ok) { cur.bis = d; return; } }
    runs.push(cur = { von: d, bis: d });
  });
  return runs;
}

/* =====================================================================
   PDF-Hilfen
   ===================================================================== */
async function pdfStart() {
  PDF_DE = true; await loadScript('./vendor/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' }), FONT = await pdfFont(doc);
  const P = { doc, FONT, M: 16, W: 210, CW: 178, y: 20 };
  P.need = h => { if (P.y + h > 280) { doc.addPage(); P.y = 20; } };
  P.h1 = t => { doc.setFont(FONT, 'bold'); doc.setFontSize(17); doc.text(pdfSafe(t), P.M, P.y); P.y += 7; };
  P.sub = t => { doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(90); const l = doc.splitTextToSize(pdfSafe(t), P.CW); doc.text(l, P.M, P.y); P.y += l.length * 4.4 + 2; doc.setTextColor(0); };
  P.h2 = t => { P.need(14); P.y += 3; doc.setFont(FONT, 'bold'); doc.setFontSize(12); doc.text(pdfSafe(t), P.M, P.y); P.y += 2; doc.setDrawColor(200); doc.line(P.M, P.y, P.M + P.CW, P.y); P.y += 5; };
  P.kv = (k, v) => { doc.setFontSize(10); const l = doc.splitTextToSize(pdfSafe(v || '–'), P.CW - 62); P.need(l.length * 4.6 + 1.5); doc.setFont(FONT, 'normal'); doc.setTextColor(90); doc.text(pdfSafe(k), P.M, P.y); doc.setTextColor(0); doc.text(l, P.M + 62, P.y); P.y += l.length * 4.6 + 1.5; };
  P.p = (t, size = 10) => { doc.setFont(FONT, 'normal'); doc.setFontSize(size); const l = doc.splitTextToSize(pdfSafe(t), P.CW); P.need(l.length * 4.6); doc.text(l, P.M, P.y); P.y += l.length * 4.6 + 1; };
  P.check = (ok, t) => { doc.setFontSize(10); const l = doc.splitTextToSize(pdfSafe(t), P.CW - 8); P.need(l.length * 4.6 + 1); doc.rect(P.M, P.y - 3.2, 3.6, 3.6); if (ok) { doc.setFont(FONT, 'bold'); doc.text('x', P.M + .8, P.y - .1); } doc.setFont(FONT, 'normal'); doc.text(l, P.M + 7, P.y); P.y += l.length * 4.6 + 1.5; };
  P.sign = labels => { P.need(26); P.y += 14; const w = (P.CW - 10 * (labels.length - 1)) / labels.length; labels.forEach((l, i) => { const x = P.M + i * (w + 10); doc.setDrawColor(120); doc.line(x, P.y, x + w, P.y); doc.setFontSize(8.5); doc.setTextColor(90); doc.text(pdfSafe(l), x, P.y + 4); doc.setTextColor(0); }); P.y += 10; };
  P.foot = () => { const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(140); doc.text(pdfSafe(`${S.hotel || ''} · erstellt mit AzubiHub am ${fmtDate(localDate())} · Seite ${i}/${n}`), P.M, 290); doc.setTextColor(0); } };
  return P;
}
const pdfFile = t => String(t || '').replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');

/* =====================================================================
   IHK: Datenblatt zur Prüfungsanmeldung und Übersicht für die Ausbildungsberatung
   ===================================================================== */
async function ihkDatenblattPDF(p, btn) {
  if (btn) { btn.disabled = true; }
  try {
    const [v, reps, uw, ein] = await Promise.all([
      q(sb.from('ausbildungsvertraege').select('*').eq('azubi_id', p.id).maybeSingle()).catch(() => null),
      q(sb.from('reports').select('jahr,kw,status,tage,inhalt').eq('user_id', p.id)).catch(() => []),
      q(sb.from('unterweisung_bestaetigungen').select('unterweisung_id,bestaetigt_at').eq('user_id', p.id)).catch(() => []),
      q(sb.from('schul_eintraege').select('typ,status,datum').eq('azubi_id', p.id)).catch(() => [])]);
    const P = await pdfStart(), names = EXN(p.beruf), st = berichtStand(p, reps), rs = rpStand(reps, p), aus = betreuerOf(p);
    P.h1('Datenblatt zur Prüfungsanmeldung');
    P.sub(`Zusammenstellung aus AzubiHub zum Übertragen in das Anmeldeformular bzw. Online-Portal eurer IHK. Kein amtliches Formular – maßgeblich sind Formular und Fristen der zuständigen Kammer.${S.ihkData?.name ? ' Zuständig: ' + S.ihkData.name + '.' : ''}`);
    P.h2('Auszubildende/r');
    P.kv('Name', p.full_name); P.kv('Ausbildungsberuf', p.beruf); P.kv('Ausbildungsjahr', `${p.lehrjahr || 1}.`);
    P.kv(names[0], p.zp_datum ? fmtDate(p.zp_datum) + (daysUntil(p.zp_datum) < 0 ? ' (abgelegt)' : '') : 'noch kein Termin');
    P.kv(names[1], p.ap_datum ? fmtDate(p.ap_datum) : 'noch kein Termin');
    P.h2('Ausbildungsverhältnis');
    P.kv('Ausbildungsbetrieb', S.hotel); P.kv('Ausbilder/in', aus ? `${aus.full_name}${aus.position ? ', ' + aus.position : ''}${aus.telefon ? ', ' + aus.telefon : ''}${aus.kontakt_email ? ', ' + aus.kontakt_email : ''}` : '–');
    P.kv('Beginn – Ende', v?.beginn ? `${fmtDate(v.beginn)} – ${v.ende ? fmtDate(v.ende) : 'offen'}` : (p.start_datum ? 'Beginn ' + fmtDate(p.start_datum) : '–'));
    P.kv('Vertragsnummer (IHK)', v?.vertragsnr || '–'); P.kv('Eintragung im Verzeichnis', v?.ihk_eingetragen ? fmtDate(v.ihk_eingetragen) : '–');
    P.kv('Probezeit', v?.probezeit_monate ? `${v.probezeit_monate} Monate` : '–'); P.kv('Wöchentliche Arbeitszeit', v?.wochenstunden ? `${String(v.wochenstunden).replace('.', ',')} Std` : '–');
    P.kv('Anmeldeschluss', [[names[0], v?.zp_anmeldeschluss], [names[1], v?.ap_anmeldeschluss]].filter(x => x[1]).map(x => `${x[0]}: ${fmtDate(x[1])}`).join(' · ') || '–');
    P.h2('Zulassungsvoraussetzungen (Stand heute)');
    P.check(st && !st.fehlt?.length && !st.pruef?.length, `Ausbildungsnachweise vollständig und abgezeichnet (§ 43 BBiG)${st ? ` – ${st.fertig.length} Wochen abgezeichnet${st.fehlt?.length ? ', ' + st.fehlt.length + ' fehlen' : ''}${st.pruef?.length ? ', ' + st.pruef.length + ' zur Prüfung' : ''}` : ''}`);
    P.check(p.zp_datum && daysUntil(p.zp_datum) < 0, `${names[0]} abgelegt`);
    P.check(rs && rs.pc >= 80, `Ausbildungsrahmenplan vermittelt${rs ? ` – ${rs.pc} % der Positionen` : ''}`);
    const fehl = ein.filter(e => e.typ === 'fehltag'), unent = fehl.filter(e => e.status === 'unentschuldigt').length;
    P.check(!unent, `Berufsschule: ${fehl.length} Fehltage gemeldet, davon ${unent} unentschuldigt`);
    P.check(uw.length > 0, `Unterweisungen bestätigt: ${new Set(uw.map(x => x.unterweisung_id)).size}`);
    P.h2('Checkliste Anmeldung');
    const cl = v?.checkliste || {}; AV_CHECK.forEach(([k, l]) => P.check(!!cl[k], l + (cl[k] && typeof cl[k] === 'string' ? ` (erledigt ${fmtDate(cl[k])})` : '')));
    P.p('Beilagen nach Vorgabe der IHK: Ausbildungsnachweis (in AzubiHub als PDF), ggf. letztes Berufsschulzeugnis, ggf. Bescheinigung über die Zwischenprüfung bzw. Teil 1.', 9);
    P.sign(['Ort, Datum', 'Unterschrift Auszubildende/r', 'Unterschrift Ausbildende/r']);
    P.foot(); P.doc.save(`Pruefungsanmeldung_Datenblatt_${pdfFile(p.full_name)}.pdf`); toast('PDF erstellt');
  } catch (e) { toast(errText(e)); } finally { PDF_DE = false; if (btn) btn.disabled = false; }
}
async function beraterPDF(btn) {
  if (btn) btn.disabled = true;
  try {
    const [prof, reps, vs, uw, uwb, beu, talks, plan, ein, ps] = await Promise.all([
      q(sb.from('profiles').select('*')), q(sb.from('reports').select('user_id,jahr,kw,status,tage,inhalt')).catch(() => []),
      q(sb.from('ausbildungsvertraege').select('*')).catch(() => []), q(sb.from('unterweisungen').select('id,titel,aktiv,fuer,intervall_monate,intervall_u18_monate')).catch(() => []),
      q(sb.from('unterweisung_bestaetigungen').select('user_id,unterweisung_id,bestaetigt_at')).catch(() => []),
      can('gespraeche') ? q(sb.from('beurteilungen').select('azubi_id,bis')).catch(() => []) : [], can('gespraeche') ? q(sb.from('talks').select('user_id,datum')).catch(() => []) : [],
      q(sb.from('plan_stationen').select('azubi_id,abteilung,von,bis')).catch(() => []), q(sb.from('schul_eintraege').select('azubi_id,typ,status,datum')).catch(() => []),
      q(sb.from('praxis_stand').select('azubi_id,status')).catch(() => [])]);
    S.profiles = Object.assign(S.profiles || {}, Object.fromEntries(prof.map(p => [p.id, p])));
    const az = prof.filter(p => p.role === 'azubi' && p.aktiv !== false && canSchool(p)).sort((a, b) => a.full_name.localeCompare(b.full_name));
    const staff = prof.filter(p => ['ausbilder', 'admin'].includes(p.role) && p.aktiv !== false);
    const P = await pdfStart();
    P.h1('Übersicht für die Ausbildungsberatung');
    P.sub(`${S.hotel} · ${az.length} Auszubildende · Stand ${fmtDate(localDate())}. Zusammenstellung der Nachweise, die bei einem Besuch der IHK-Ausbildungsberatung typischerweise angesehen werden. Die einzelnen Nachweise (Berichtsheft, Unterweisungen, Beurteilungen) können aus AzubiHub jeweils als PDF vorgelegt werden.`);
    P.h2('Ausbildungspersonal');
    staff.forEach(s => P.kv(s.full_name, `${s.position || (s.role === 'admin' ? 'Leitung' : 'Ausbilder/in')}${s.role === 'ausbilder' && (s.bereiche || []).length ? ' · ' + s.bereiche.join(', ') : ''} · betreut: ${az.filter(a => a.betreuer_id === s.id).map(a => a.full_name).join(', ') || '–'}`));
    P.p('Hinweis: Nachweis der Ausbildereignung (AEVO) bitte separat bereithalten.', 9);
    az.forEach(p => {
      const r = reps.filter(x => x.user_id === p.id), st = berichtStand(p, r), rs = rpStand(r, p), v = vs.find(x => x.azubi_id === p.id);
      const lastTalk = talks.filter(t => t.user_id === p.id).map(t => t.datum).sort().pop(), lastBeu = beu.filter(b => b.azubi_id === p.id).map(b => b.bis).sort().pop();
      const fehl = ein.filter(e => e.azubi_id === p.id && e.typ === 'fehltag'), unent = fehl.filter(e => e.status === 'unentschuldigt').length;
      const due = (uw || []).filter(w => w.aktiv !== false).length, done = new Set(uwb.filter(b => b.user_id === p.id).map(b => b.unterweisung_id)).size;
      const stations = plan.filter(x => x.azubi_id === p.id).sort((a, b) => a.von.localeCompare(b.von));
      const px = ps.filter(x => x.azubi_id === p.id);
      P.h2(`${p.full_name} · ${p.beruf || ''} · ${p.lehrjahr || 1}. Jahr`);
      P.kv('Ausbildungszeit', v?.beginn ? `${fmtDate(v.beginn)} – ${v.ende ? fmtDate(v.ende) : 'offen'}${v.vertragsnr ? ' · Vertrag ' + v.vertragsnr : ''}` : (p.start_datum ? 'seit ' + fmtDate(p.start_datum) : '–'));
      P.kv('Ausbilder/in', betreuerOf(p)?.full_name || '–');
      P.kv('Ausbildungsnachweis', st ? `${st.fertig.length} Wochen abgezeichnet, ${st.pruef?.length ?? 0} zur Prüfung, ${st.fehlt?.length ?? 0} fehlen` : '–');
      P.kv('Rahmenplan', rs ? `${rs.pc} % der Positionen vermittelt` + (rs.ys?.length ? ' (' + rs.ys.map(y => `${y.y}. Jahr ${y.pc} %`).join(', ') + ')' : '') : 'kein Rahmenplan hinterlegt');
      P.kv('Ausbildungsplan', stations.length ? stations.map(s => `${s.abteilung} ${fmtD(s.von)}–${fmtD(s.bis)}`).join('; ') : 'keine Stationen geplant');
      P.kv('Praxisaufgaben', px.length ? `${px.filter(x => x.status === 'bestaetigt').length} bestätigt, ${px.filter(x => x.status === 'gemeldet').length} gemeldet` : '–');
      P.kv('Unterweisungen', `${done} von ${due} bestätigt`);
      P.kv('Berufsschule', `${fehl.length} Fehltage gemeldet, ${unent} unentschuldigt`);
      if (can('gespraeche')) P.kv('Gespräche / Beurteilung', `letztes Gespräch ${lastTalk ? fmtDate(lastTalk) : '–'} · letzte Beurteilung ${lastBeu ? fmtDate(lastBeu) : '–'}`);
      P.kv('Prüfungen', `${EXN(p.beruf)[0]}: ${p.zp_datum ? fmtDate(p.zp_datum) : '–'} · ${EXN(p.beruf)[1]}: ${p.ap_datum ? fmtDate(p.ap_datum) : '–'}`);
    });
    P.foot(); P.doc.save(`Uebersicht_Ausbildungsberatung_${pdfFile(S.hotel || 'Betrieb')}.pdf`); toast('PDF erstellt');
  } catch (e) { toast(errText(e)); } finally { PDF_DE = false; if (btn) btn.disabled = false; }
}

/* =====================================================================
   Lernkarten: falsch beantwortete Prüfungsfragen in Fächern wiederholen (1, 2, 4, 8, 16, 30 Tage)
   ===================================================================== */
const LK_TAGE = [0, 1, 2, 4, 8, 16, 30];
async function lkRecord(qs, ans) {
  if (!qs?.length) return;
  const wrong = qs.filter(x => ans[x.id] != null && ans[x.id] !== x.richtig || ans[x.id] == null);
  if (!wrong.length) return;
  await sb.from('lernkarten').upsert(wrong.map(x => ({ question_id: x.id, fach: 1, faellig: localDate(), updated_at: new Date().toISOString() })), { onConflict: 'user_id,question_id' });
}
async function lkCount() {
  try { const { count } = await sb.from('lernkarten').select('question_id', { count: 'exact', head: true }).eq('user_id', S.me.id).lte('faellig', localDate()).lt('fach', 6); return count || 0; } catch { return 0; }
}
async function lkOpen() {
  const due = await q(sb.from('lernkarten').select('*').eq('user_id', S.me.id).lte('faellig', localDate()).lt('fach', 6).order('faellig').limit(20)).catch(() => []);
  if (!due.length) return toast('Keine Lernkarten fällig. Falsch beantwortete Fragen aus der Prüfungssimulation landen automatisch hier.');
  const qsAll = await q(sb.from('quiz_questions').select('id,frage,optionen,richtig,erklaerung,rp_nr').in('id', due.map(d => d.question_id)));
  const by = Object.fromEntries(qsAll.map(x => [x.id, x])), cards = due.filter(d => by[d.question_id]).sort(() => Math.random() - .5);
  let i = 0, right = 0, picked = null;
  const draw = () => {
    if (i >= cards.length) { sheetShell('Lernkarten', `<div class="card p-5 text-center"><div style="font-size:40px">🎉</div><div class="font-display font-bold text-[20px] mt-2">${right} von ${cards.length} gewusst</div><p class="text-[13px] text-muted mt-1">Gewusste Karten kommen später wieder (nach 1, 2, 4, 8, 16, 30 Tagen), bis sie sitzen. Falsche fangen wieder vorne an.</p><button class="btn w-full mt-4" onclick="closeSheet()">Fertig</button></div>`); return; }
    const c = cards[i], x = by[c.question_id];
    sheetShell(`Lernkarte ${i + 1} von ${cards.length}`, `<div class="flex items-center justify-between mb-2"><span class="chip">Fach ${c.fach} von 5</span>${x.rp_nr ? `<span class="chip">${esc(x.rp_nr)}</span>` : ''}</div>
      <div class="card p-4"><div class="font-semibold text-[16px] mb-3">${esc(x.frage)}</div><div class="flex flex-col gap-2">${x.optionen.map((o, j) => `<button class="quizopt" data-lk="${j}" ${picked !== null ? 'disabled' : ''} style="${picked === null ? '' : j === x.richtig ? 'border-color:var(--st-ok);background:color-mix(in srgb,var(--st-ok) 14%,var(--surface))' : j === picked ? 'border-color:var(--st-crit);background:color-mix(in srgb,var(--st-crit) 12%,var(--surface))' : ''}">${esc(o)}</button>`).join('')}</div>
      ${picked !== null && x.erklaerung ? `<div class="rounded-xl p-3 text-[13px] mt-3" style="background:var(--sunk)">${esc(x.erklaerung)}</div>` : ''}</div>
      ${picked !== null ? '<button class="btn w-full mt-3" id="lkNext">Weiter</button>' : ''}`);
    $$('[data-lk]').forEach(b => b.onclick = async () => {
      picked = +b.dataset.lk; const ok = picked === x.richtig; if (ok) right++;
      const fach = ok ? Math.min(6, c.fach + 1) : 1, next = new Date(); next.setDate(next.getDate() + (ok ? LK_TAGE[fach] || 30 : 1));
      sb.from('lernkarten').update({ fach, faellig: localDate(next), updated_at: new Date().toISOString() }).eq('user_id', S.me.id).eq('question_id', c.question_id).then(() => {}, () => {});
      draw();
    });
    if ($('#lkNext')) $('#lkNext').onclick = () => { i++; picked = null; draw(); };
  };
  draw();
}

/* =====================================================================
   Praxisaufgaben je Rahmenplan-Position
   ===================================================================== */
async function pxLoad() {
  const [aufg, stand] = await Promise.all([q(sb.from('praxisaufgaben').select('*').eq('aktiv', true).order('lehrjahr').order('titel')).catch(() => []), q(sb.from('praxis_stand').select('*')).catch(() => [])]);
  S.px = { aufg, stand };
}
const pxFor = p => (S.px?.aufg || []).filter(a => !a.beruf || normB(a.beruf) === normB(p.beruf));
const pxSt = (a, p) => (S.px?.stand || []).find(s => s.aufgabe_id === a.id && s.azubi_id === p.id);
const PX_CHIP = { gemeldet: ['brass', 'wartet auf Bestätigung'], bestaetigt: ['ok', 'bestätigt'], nochmal: ['warn', 'nochmal üben'] };
const pxCanEdit = () => isAdmin() || can('inhalte') || can('lernziele');
function praxisHTML(p, staff) {
  if (!p) return '';
  const list = pxFor(p), done = list.filter(a => pxSt(a, p)?.status === 'bestaetigt').length;
  const offen = staff ? list.filter(a => pxSt(a, p)?.status === 'gemeldet') : [];
  const yr = p.lehrjahr || 1;
  const show = staff ? list : list.filter(a => (a.lehrjahr || 1) <= yr + 0);
  const row = (a, i) => { const s = pxSt(a, p), rp = a.rp_id && rpById(a.rp_id);
    return `<div class="p-3.5 ${i ? 'border-t border-line' : ''}"><div class="flex items-start gap-3"><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold">${esc(a.titel)}</div><div class="text-[12px] text-muted">${a.lehrjahr || 1}. Jahr${rp ? ` · ${esc(rp.nr)} ${esc(rpShort(rp.titel))}` : ''}</div>${a.beschreibung ? `<div class="text-[13px] mt-1">${esc(a.beschreibung)}</div>` : ''}${s?.notiz ? `<div class="text-[12px] text-muted mt-1">„${esc(s.notiz)}“</div>` : ''}</div>${s ? `<span class="chip ${PX_CHIP[s.status][0]} flex-none">${PX_CHIP[s.status][1]}</span>` : ''}</div>
      <div class="flex flex-wrap gap-2 mt-2">${staff
        ? `${s?.status === 'gemeldet' ? `<button class="btn ok py-1.5 px-3 text-[13px]" data-pxok="${a.id}">Bestätigen</button><button class="btn ghost py-1.5 px-3 text-[13px]" data-pxno="${a.id}">Nochmal üben</button>` : ''}${!s ? `<button class="btn ghost py-1.5 px-3 text-[13px]" data-pxok="${a.id}">Als erledigt bestätigen</button>` : ''}${pxCanEdit() ? `<button class="text-[13px] font-semibold text-accent" data-pxedit="${a.id}">Bearbeiten</button>` : ''}`
        : (!s || s.status === 'nochmal' ? `<button class="btn py-1.5 px-3 text-[13px]" data-pxmeld="${a.id}">Erledigt melden</button>` : '')}</div></div>`; };
  return `${secTitle('Praxisaufgaben', `<span class="flex items-center gap-3"><span class="text-[12px] text-muted tnum">${done}/${list.length} bestätigt</span>${staff && pxCanEdit() ? '<button id="pxNew" class="text-[13px] font-semibold text-accent">+ Aufgabe</button>' : ''}</span>`)}
    ${list.length ? `<div class="bar mb-2"><i style="width:${pct(done, list.length)}%"></i></div>` : ''}
    ${offen.length ? `<div class="card p-3 mb-2 text-[13px]" style="border-color:var(--brass)"><b>${offen.length}</b> ${offen.length === 1 ? 'Aufgabe wartet' : 'Aufgaben warten'} auf deine Bestätigung.</div>` : ''}
    ${show.length ? `<div class="card">${show.map(row).join('')}</div>` : empty(staff ? (pxCanEdit() ? 'Noch keine Praxisaufgaben. Lege Aufgaben an oder lass dir Vorschläge aus dem Rahmenplan erstellen.' : 'Noch keine Praxisaufgaben angelegt.') : 'Deine Ausbildungsleitung hat noch keine Praxisaufgaben angelegt.')}
    ${staff && pxCanEdit() && rpPositions(p).length ? `<button class="btn ghost w-full mt-2 text-[13px]" id="pxSuggest">Vorschläge aus dem Rahmenplan (${p.lehrjahr || 1}. Jahr)</button>` : ''}
    <p class="text-[12px] text-muted mt-2">${staff ? 'Bestätigte Aufgaben zählen automatisch für die zugehörige Rahmenplan-Position.' : 'Hast du eine Aufgabe selbstständig erledigt? Melde sie – deine Ausbilderin oder dein Ausbilder bestätigt sie.'}</p>`;
}
function praxisBind(p, reload) {
  if (!p) return;
  const set = async (aid, status, notiz) => {
    const ex = pxSt({ id: aid }, p), row = { aufgabe_id: aid, azubi_id: p.id, status, ...(notiz !== undefined ? { notiz } : {}), ...(status === 'gemeldet' ? { gemeldet_at: new Date().toISOString(), bestaetigt_at: null, bestaetigt_von: null } : { bestaetigt_von: S.me.id, bestaetigt_at: new Date().toISOString() }) };
    if (ex) await q(sb.from('praxis_stand').update(row).eq('id', ex.id)); else await q(sb.from('praxis_stand').insert(row));
    if (status === 'bestaetigt') { const a = S.px.aufg.find(x => x.id === aid); if (a?.rp_id && !(S.rpv[p.id] || []).some(v => v.rp_id === a.rp_id)) { const { data } = await sb.from('rp_vermittelt').insert({ azubi_id: p.id, rp_id: a.rp_id, datum: localDate(), notiz: 'Praxisaufgabe: ' + a.titel, von: S.me.id }).select().maybeSingle(); if (data) (S.rpv[p.id] ||= []).push(data); } }
    await pxLoad(); reload();
  };
  $$('[data-pxmeld]').forEach(b => b.onclick = () => {
    const a = S.px.aufg.find(x => x.id === b.dataset.pxmeld);
    sheetShell('Aufgabe erledigt', `<form id="pxmF" class="card p-4 flex flex-col gap-3"><div class="font-semibold">${esc(a.titel)}</div><div><label class="lbl" for="pxmN">Wie lief es? <span class="font-normal text-muted">(optional)</span></label><textarea id="pxmN" class="field" rows="3" maxlength="1000" placeholder="z. B. Am Dienstag 4 Gäste allein eingecheckt, Frau Weber war dabei."></textarea></div><button class="btn">Melden</button></form>`);
    $('#pxmF').onsubmit = async e => { e.preventDefault(); await set(a.id, 'gemeldet', $('#pxmN').value.trim() || null); closeSheet(); toast('Gemeldet'); };
  });
  $$('[data-pxok]').forEach(b => b.onclick = async () => { await set(b.dataset.pxok, 'bestaetigt'); toast('Bestätigt'); });
  $$('[data-pxno]').forEach(b => b.onclick = async () => { await set(b.dataset.pxno, 'nochmal'); toast('Zurück zum Üben'); });
  $$('[data-pxedit]').forEach(b => b.onclick = () => pxSheet(S.px.aufg.find(x => x.id === b.dataset.pxedit), p, reload));
  if ($('#pxNew')) $('#pxNew').onclick = () => pxSheet(null, p, reload);
  if ($('#pxSuggest')) $('#pxSuggest').onclick = async () => {
    const yr = p.lehrjahr || 1, have = new Set(pxFor(p).map(a => a.rp_id)), pos = rpPositions(p).filter(r => (r.lehrjahr || 1) === yr && !have.has(r.id));
    if (!pos.length) return toast('Für dieses Ausbildungsjahr gibt es schon zu jeder Position eine Aufgabe.');
    await q(sb.from('praxisaufgaben').insert(pos.map(r => ({ rp_id: r.id, beruf: p.beruf, lehrjahr: yr, titel: ('Selbstständig: ' + rpShort(r.titel)).slice(0, 200), beschreibung: 'Unter Aufsicht einmal komplett selbst durchführen und kurz erklären, worauf es ankommt.' }))));
    await pxLoad(); toast(`${pos.length} Aufgaben angelegt – passe die Texte gern an.`); reload();
  };
}
function pxSheet(a, p, reload) {
  const rp = rpPositions(p);
  sheetShell(a ? 'Praxisaufgabe bearbeiten' : 'Neue Praxisaufgabe', `<form id="pxF" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="pxT">Aufgabe</label><input id="pxT" class="field" maxlength="200" value="${esc(a?.titel || '')}" placeholder="z. B. 5 Gäste selbstständig einchecken" required></div>
    <div><label class="lbl" for="pxB">Beschreibung <span class="font-normal text-muted">(optional)</span></label><textarea id="pxB" class="field" rows="3" maxlength="2000">${esc(a?.beschreibung || '')}</textarea></div>
    <div><label class="lbl" for="pxR">Rahmenplan-Position</label><select id="pxR" class="field"><option value="">ohne</option>${rp.map(r => `<option value="${r.id}" ${a?.rp_id === r.id ? 'selected' : ''}>${esc(r.nr)} · ${esc(rpShort(r.titel))}</option>`).join('')}</select></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="pxL">Ausbildungsjahr</label><select id="pxL" class="field">${[1, 2, 3, 4].map(n => `<option ${(a?.lehrjahr || p.lehrjahr || 1) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div><label class="lbl" for="pxBe">Beruf</label><select id="pxBe" class="field"><option value="">alle Berufe</option>${[...new Set([p.beruf, ...(BR.berufe || [])].filter(Boolean))].map(b => `<option ${(a ? a.beruf : p.beruf) === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div></div>
    <button class="btn">Speichern</button></form>${a ? '<button id="pxDel" class="btn danger w-full mt-4">Aufgabe entfernen</button>' : ''}`);
  $('#pxF').onsubmit = async e => {
    e.preventDefault();
    const out = { titel: $('#pxT').value.trim(), beschreibung: $('#pxB').value.trim() || null, rp_id: +$('#pxR').value || null, lehrjahr: +$('#pxL').value, beruf: $('#pxBe').value || null };
    if (out.titel.length < 2) return toast('Bitte die Aufgabe benennen.');
    if (a) await q(sb.from('praxisaufgaben').update(out).eq('id', a.id)); else await q(sb.from('praxisaufgaben').insert(out));
    await pxLoad(); closeSheet(); toast('Gespeichert'); reload();
  };
  if ($('#pxDel')) $('#pxDel').onclick = () => confirmInline($('#pxDel'), async () => { await q(sb.from('praxisaufgaben').update({ aktiv: false }).eq('id', a.id)); await pxLoad(); closeSheet(); toast('Entfernt'); reload(); });
}

/* =====================================================================
   Beurteilung: Stellungnahme + Selbsteinschätzung des Azubis, PDF mit Unterschriftszeilen
   ===================================================================== */
function beuConfirmSheet(b, onDone) {
  sheetShell('Beurteilung bestätigen', `<form id="bcF" class="card p-4 flex flex-col gap-3">
    <p class="text-[13px] text-muted">Wie schätzt du dich selbst ein? Freiwillig – hilft im Gespräch, Unterschiede zu sehen.</p>
    ${BEU_KRIT.filter(k => b.kriterien?.[k]).map((c, ci) => `<fieldset><legend class="text-[13px] font-semibold mb-1">${esc(t(c))} <span class="font-normal text-muted">(Ausbilder/in: ${b.kriterien[c]})</span></legend><div class="seg" role="radiogroup" aria-label="${esc(c)}">${[1, 2, 3, 4, 5].map(n => `<label class="beuopt"><input type="radio" name="bs${ci}" value="${n}" class="sr-only" data-krit="${esc(c)}"><span>${n}</span></label>`).join('')}</div></fieldset>`).join('')}
    <div><label class="lbl" for="bcK">Deine Stellungnahme <span class="font-normal text-muted">(optional)</span></label><textarea id="bcK" class="field" rows="4" maxlength="2000" placeholder="Was siehst du genauso, was anders? Was nimmst du dir vor?"></textarea></div>
    <button class="btn">Gelesen und bestätigt</button><p class="text-[12px] text-muted">Mit der Bestätigung sagst du, dass du die Beurteilung gelesen hast – nicht, dass du mit allem einverstanden bist.</p></form>`);
  $('#bcF').onsubmit = async e => {
    e.preventDefault();
    const selbst = {}; $$('#bcF input[type=radio]:checked').forEach(r => { selbst[r.dataset.krit] = +r.value; });
    await q(sb.rpc('beurteilung_bestaetigen', { p_id: b.id, p_kommentar: $('#bcK').value.trim(), p_selbst: Object.keys(selbst).length ? selbst : null }));
    Object.assign(b, { gelesen_at: b.gelesen_at || new Date().toISOString(), bestaetigt_at: new Date().toISOString(), azubi_kommentar: $('#bcK').value.trim() || null, selbst });
    closeSheet(); toast('Bestätigt'); onDone();
  };
}
async function beuPDF(b, btn) {
  if (btn) btn.disabled = true;
  try {
    const P = await pdfStart(), a = S.profiles[b.azubi_id] || S.me;
    P.h1('Beurteilung'); P.sub(`${a.full_name} · ${a.beruf || ''} · ${b.abteilung} · ${fmtDate(b.von)} – ${fmtDate(b.bis)}`);
    P.h2('Bewertung (1 = ungenügend … 5 = sehr gut)');
    const { doc, FONT, M } = P;
    doc.setFontSize(9); doc.setTextColor(90); doc.text(pdfSafe('Kriterium'), M, P.y); doc.text(pdfSafe('Ausbilder/in'), M + 110, P.y); if (b.selbst) doc.text(pdfSafe('Selbst'), M + 145, P.y); doc.setTextColor(0); P.y += 5;
    BEU_KRIT.filter(k => b.kriterien?.[k]).forEach(k => { P.need(7); doc.setFont(FONT, 'normal'); doc.setFontSize(10); doc.text(pdfSafe(k), M, P.y); doc.text(`${b.kriterien[k]} – ${pdfSafe(BEU_SKALA[b.kriterien[k]])}`, M + 110, P.y); if (b.selbst?.[k]) doc.text(String(b.selbst[k]), M + 145, P.y); P.y += 6; });
    const avg = beuAvg(b.kriterien); if (avg) P.kv('Durchschnitt', avg.toFixed(1).replace('.', ','));
    if (b.staerken) { P.h2('Stärken'); P.p(b.staerken); }
    if (b.ziele) { P.h2('Entwicklungsziele'); P.p(b.ziele); }
    P.h2('Stellungnahme der/des Auszubildenden'); P.p(b.azubi_kommentar || '–');
    P.kv('Beurteilt von', nameOf(b.author_id)); P.kv('Gelesen/bestätigt', b.bestaetigt_at ? when(b.bestaetigt_at) : b.gelesen_at ? when(b.gelesen_at) : 'noch nicht');
    P.sign(['Ort, Datum', 'Ausbilder/in', 'Auszubildende/r']);
    P.foot(); doc.save(`Beurteilung_${pdfFile(a.full_name)}_${b.bis}.pdf`); toast('PDF erstellt');
  } catch (e) { toast(errText(e)); } finally { PDF_DE = false; if (btn) btn.disabled = false; }
}

/* =====================================================================
   Standortvergleich (Hotelgruppen)
   ===================================================================== */
async function vergleichSheet() {
  const { data, error } = await sb.rpc('gruppe_vergleich');
  if (error) return toast(errText(error));
  const list = data || [], col = (l, f, tone) => `<tr class="border-t border-line"><td class="py-2 pr-2 text-[12px] text-muted">${l}</td>${list.map(x => { const v = f(x); return `<td class="py-2 px-2 text-center tnum text-[13px] font-semibold" style="${tone ? tone(x) : ''}">${v ?? '–'}</td>`; }).join('')}</tr>`;
  const c = (v, bad, warn, lowBad) => v == null ? '' : `color:var(--st-${lowBad ? (v < bad ? 'crit' : v < warn ? 'warn' : 'ok') : (v >= bad ? 'crit' : v >= warn ? 'warn' : 'ok')})`;
  sheetShell('Standortvergleich', `<div class="card overflow-x-auto"><table class="w-full" style="min-width:${180 + list.length * 90}px"><thead><tr><th></th>${list.map(x => `<th class="py-2 px-2 text-[12px] text-center">${esc(x.name)}${x.ich_hier ? '<br><span class="chip accent" style="font-size:10px">hier</span>' : ''}</th>`).join('')}</tr></thead><tbody>
    ${col('Azubis', x => x.azubis)}${col('Berichte offen', x => x.offen, x => c(x.offen, 10, 4))}${col('Berichte 30 Tage', x => x.berichte_30)}
    ${col('Fehltage 90 Tage', x => x.fehltage_90, x => c(x.azubis ? x.fehltage_90 / x.azubis : 0, 4, 2))}${col('davon unentschuldigt', x => x.unentschuldigt_90, x => c(x.unentschuldigt_90, 3, 1))}
    ${col('Notenschnitt Schule', x => x.noten_schnitt == null ? null : String(x.noten_schnitt).replace('.', ','), x => c(x.noten_schnitt, 4, 3.3))}
    ${col('Stimmung (1–5)', x => x.stimmung == null ? null : String(x.stimmung).replace('.', ','), x => c(x.stimmung, 2.5, 3.5, true))}
    ${col('Stationen-Feedback', x => x.feedback == null ? null : String(x.feedback).replace('.', ','), x => c(x.feedback, 2.5, 3.5, true))}
    ${col('Schichten geplant', x => x.schichten)}</tbody></table></div>
    <p class="text-[12px] text-muted mt-2">Stimmung und Feedback erst ab 3 Antworten je Haus, ohne Namen. Fehltage und Noten aus den Meldungen der Berufsschulen.</p>`);
}

/* =====================================================================
   Ausbildungs-Siegel: öffentliche Seite ?siegel=slug (nur wenn die Leitung es einschaltet)
   ===================================================================== */
const siegelUrl = slug => `${location.origin}${location.pathname}?siegel=${encodeURIComponent(slug)}`;
async function showSiegel(slug) {
  const el = $('#careerScreen'); el.hidden = false; $('#authScreen').hidden = true; $('#appScreen').hidden = true;
  el.innerHTML = skeleton();
  const { data, error } = await sb.rpc('public_siegel', { p_slug: slug });
  if (error || !data) { el.innerHTML = `<div class="card p-5 mt-8"><h1 class="text-[22px] font-bold">Seite nicht gefunden</h1><p class="text-muted mt-1">Dieser Betrieb zeigt gerade keine Ausbildungs-Kennzahlen.</p></div>`; return; }
  const D = data, br = mergeCfg(DEFAULT_BRANDING, D.branding || {});
  document.documentElement.style.setProperty('--brand', br.brand); document.documentElement.style.setProperty('--brand2', br.brand2);
  document.title = `Ausbildung bei ${D.name}`;
  const stat = (v, l, sub = '') => `<div class="card p-4 text-center"><div class="font-display font-bold text-[28px] tnum">${v}</div><div class="text-[13px] font-semibold">${l}</div>${sub ? `<div class="text-[12px] text-muted">${sub}</div>` : ''}</div>`;
  const de = v => String(v).replace('.', ',');
  el.innerHTML = `<section class="keycard p-6 mt-2"><div class="sub text-[13px]">Ausbildung mit System</div><h1 class="text-[28px] font-bold leading-tight mt-1">${esc(D.name)}</h1>
      <div class="sub text-[14px] mt-2">Digitales Berichtsheft, fester Ausbildungsplan, Lernortkooperation mit der Berufsschule und regelmäßiges, anonymes Feedback der Azubis.</div></section>
    <div class="grid grid-cols-2 gap-3 mt-4">
      ${stat(D.azubis, 'Azubis in Ausbildung')}
      ${D.abzeichnung_7_tage != null ? stat(D.abzeichnung_7_tage + ' %', 'Berichte in 7 Tagen abgezeichnet', 'letzte 12 Monate') : ''}
      ${D.feedback ? stat(de(Math.round((+D.feedback.anleitung + +D.feedback.aufgaben + +D.feedback.team) / 3 * 10) / 10) + ' / 5', 'Feedback der Azubis', `${D.feedback.anzahl} Bewertungen der Stationen`) : ''}
      ${D.stimmung != null ? stat(de(D.stimmung) + ' / 5', 'Stimmung der Azubis', 'anonym, letzte 12 Monate') : ''}
    </div>
    ${D.feedback ? `<div class="card p-4 mt-3">${[['Anleitung', D.feedback.anleitung], ['Aufgaben & Lernen', D.feedback.aufgaben], ['Team', D.feedback.team]].map(([l, v]) => `<div class="mt-2 first:mt-0"><div class="flex justify-between text-[13px]"><span>${l}</span><b class="tnum">${de(v)}</b></div><div class="bar mt-1"><i style="width:${v * 20}%"></i></div></div>`).join('')}</div>` : ''}
    <div class="card p-4 mt-3"><div class="font-semibold text-[15px] mb-2">So bilden wir aus</div>${['Wochenberichte digital, mit Rückmeldung der Ausbilder/innen', 'Ausbildungsplan mit Stationen und Rahmenplan je Ausbildungsjahr', 'Direkter Draht zur Berufsschule: Fehltage, Noten, Lernfelder', 'Prüfungsvorbereitung mit Übungsfragen und Lernkarten', 'Dienstplan mit Prüfung nach Jugendarbeitsschutzgesetz'].map(x => `<div class="flex items-center gap-2 py-1 text-[14px]"><span class="text-accent">${svg('check', 'w-4 h-4')}</span>${x}</div>`).join('')}</div>
    ${D.karriere ? `<a class="btn w-full mt-4" href="${location.pathname}?karriere=${encodeURIComponent(D.slug)}">Jetzt bewerben</a>` : ''}
    <p class="text-[12px] text-muted text-center mt-6 mb-8">Kennzahlen automatisch aus AzubiHub berechnet. Feedback und Stimmung werden erst ab mehreren Antworten und nur als Durchschnitt angezeigt. · <button type="button" class="font-semibold" data-impressum>Impressum</button></p>`;
}
function siegelAdminHTML() {
  if (!isAdmin()) return '';
  const on = !!APP.siegel, url = S.betrieb?.slug ? siegelUrl(S.betrieb.slug) : '';
  return `${secTitle('Ausbildungs-Siegel')}
    <div class="card p-4 flex flex-col gap-3"><label class="flex items-center gap-2.5 text-[14px] font-semibold"><input type="checkbox" id="sgOn" class="cbx" ${on ? 'checked' : ''}> Öffentliche Seite mit Ausbildungs-Kennzahlen</label>
      <p class="text-[12px] text-muted">Zeigt Bewerberinnen und Bewerbern, wie bei euch ausgebildet wird: Zahl der Azubis, wie schnell Berichte abgezeichnet werden, Durchschnitt des Stationen-Feedbacks und der anonymen Stimmung (erst ab mehreren Antworten). Keine Namen, keine Einzelwerte.</p>
      ${on && url ? `<div class="text-[13px] font-semibold break-all p-3 rounded-xl" style="background:var(--sunk)" translate="no">${esc(url)}</div><div class="grid grid-cols-2 gap-2"><button class="btn ghost py-2 text-[13px]" id="sgCopy">${svg('copy', 'w-4 h-4')} Link kopieren</button><a class="btn ghost py-2 text-[13px]" href="${esc(url)}" target="_blank" rel="noopener">Ansehen</a></div>` : ''}</div>`;
}
function siegelAdminBind() {
  if ($('#sgOn')) $('#sgOn').onchange = async () => {
    const rows = await q(sb.from('app_config').select('key,value').eq('key', 'app')), stored = rows[0]?.value || {};
    await q(sb.from('app_config').upsert([{ key: 'app', value: { ...stored, siegel: $('#sgOn').checked } }], { onConflict: 'betrieb_id,key' }));
    APP.siegel = $('#sgOn').checked; toast(APP.siegel ? 'Siegel-Seite ist online' : 'Siegel-Seite ausgeschaltet'); render();
  };
  if ($('#sgCopy')) $('#sgCopy').onclick = async () => { try { await navigator.clipboard.writeText(siegelUrl(S.betrieb.slug)); toast('Link kopiert'); } catch { toast(siegelUrl(S.betrieb.slug)); } };
}

/* =====================================================================
   Bewerbung → Azubi: Einladung mit Code, Daten werden bei der Registrierung übernommen
   ===================================================================== */
async function einladungSheet(bew) {
  const code = S.adm?.code || await q(sb.rpc('get_invite_code')).catch(() => '');
  const staff = Object.values(S.profiles).filter(p => ['ausbilder', 'admin'].includes(p.role) && p.aktiv !== false);
  const startGuess = (() => { const m = String(bew.start || '').match(/(\d{4})/); const mon = /august|aug/i.test(bew.start || '') ? 7 : /september|sep/i.test(bew.start || '') ? 8 : 7; return m ? localDate(new Date(+m[1], mon, 1)) : ''; })();
  sheetShell('Als Azubi einladen', `<form id="eiF" class="card p-4 flex flex-col gap-3">
    <p class="text-[13px] text-muted">Bei der Registrierung mit dieser E-Mail-Adresse übernimmt AzubiHub Beruf, Start, Abteilung und Ausbilder/in und legt den Ausbildungsvertrag an. Die Einarbeitung (Buddy) startet automatisch.</p>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="eiN">Name</label><input id="eiN" class="field" value="${esc(bew.name)}"></div><div><label class="lbl" for="eiM">E-Mail</label><input id="eiM" type="email" class="field" value="${esc(bew.email)}"></div></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="eiB">Beruf</label><input id="eiB" class="field" list="eiBl" value="${esc(bew.beruf || '')}"><datalist id="eiBl">${(BR.berufe || []).map(b => `<option value="${esc(b)}">`).join('')}</datalist></div><div><label class="lbl" for="eiS">Ausbildungsbeginn</label><input id="eiS" type="date" class="field" value="${startGuess}"></div></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="eiA">Erste Abteilung</label><select id="eiA" class="field">${ABTEILUNGEN.map(a => `<option>${esc(a)}</option>`).join('')}</select></div><div><label class="lbl" for="eiBt">Ausbilder/in</label><select id="eiBt" class="field"><option value="">später</option>${staff.map(s => `<option value="${s.id}">${esc(s.full_name)}</option>`).join('')}</select></div></div>
    <label class="flex items-center gap-2 text-[14px]"><input type="checkbox" id="eiU" style="accent-color:var(--accent);width:20px;height:20px"> Bei Ausbildungsbeginn unter 18 (Jugendarbeitsschutz)</label>
    <button class="btn">Einladung anlegen</button></form>`);
  $('#eiF').onsubmit = async e => {
    e.preventDefault();
    const out = { email: $('#eiM').value.trim().toLowerCase(), full_name: $('#eiN').value.trim(), beruf: $('#eiB').value.trim() || null, start_datum: $('#eiS').value || null, abteilung: $('#eiA').value, betreuer_id: $('#eiBt').value || null, unter18: $('#eiU').checked, bewerbung_id: bew.id, lehrjahr: 1 };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) return toast('Bitte eine gültige E-Mail-Adresse eingeben.');
    const { error } = await sb.from('einladungen').insert(out);
    if (error) return toast(/einladungen_offen|duplicate/i.test(error.message) ? 'Für diese E-Mail gibt es schon eine offene Einladung.' : errText(error));
    const link = `${location.origin}${location.pathname}?start=register`;
    const mail = `mailto:${encodeURIComponent(out.email)}?subject=${encodeURIComponent('Willkommen bei ' + S.hotel + ' – dein Zugang zu AzubiHub')}&body=${encodeURIComponent(`Hallo ${firstName(out.full_name)},\n\nwir freuen uns auf deine Ausbildung bei uns! Für dein digitales Berichtsheft und alles rund um die Ausbildung nutzen wir AzubiHub.\n\nSo meldest du dich an:\n1. Öffne ${link}\n2. Registriere dich mit dieser E-Mail-Adresse: ${out.email}\n3. Code des Betriebs: ${code}\n\nDeine Daten (Beruf, Start, Ansprechpartner) sind schon hinterlegt.\n\nBis bald\n${S.me.full_name}\n${S.hotel}`)}`;
    sheetShell('Einladung angelegt', `<div class="card p-4 flex flex-col gap-3"><p class="text-[14px]">Jetzt nur noch die Einladung schicken. ${esc(firstName(out.full_name))} registriert sich mit <b>${esc(out.email)}</b> und dem Code <b translate="no">${esc(code)}</b>.</p><a class="btn" href="${mail}">Per E-Mail einladen</a><button class="btn ghost" id="eiCopy">${svg('copy', 'w-4 h-4')} Code und Link kopieren</button></div>`);
    $('#eiCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${link}\nCode: ${code}`); toast('Kopiert'); } catch { toast(link); } };
  };
}
const lkHomeHTML = () => isAzubi() && S.lkDue ? `<button class="card w-full p-4 mt-3 text-left flex items-center gap-3" data-lkopen><span style="font-size:24px">🗂️</span><div class="flex-1 min-w-0"><div class="font-semibold text-[15px]">${S.lkDue} ${S.lkDue === 1 ? 'Lernkarte' : 'Lernkarten'} fällig</div><div class="text-[12px] text-muted">Fragen, die beim letzten Üben nicht saßen – dauert 2 Minuten.</div></div>${svg('arrow', 'w-4 h-4 text-muted')}</button>` : '';
document.addEventListener('click', e => { if (e.target.closest('[data-lkopen]')) lkOpen(); });
