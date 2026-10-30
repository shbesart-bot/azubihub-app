/* AzubiHub · Qualifizierungsmodus, Teil 2: Anwesenheitsliste (PDF/E-Mail) und Live-Tests mit Timer.
   Wird nach quali.js und vor dem Hauptskript geladen; greift erst zur Laufzeit auf S, sb usw. zu. */

(() => {
  const css = `
  .anw-row{display:flex;flex-direction:column;gap:8px}
  .anw-st{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
  .anw-st button{padding:7px 4px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font:inherit;font-size:12.5px;font-weight:600;color:var(--muted)}
  .anw-st button[aria-pressed="true"][data-st="anwesend"]{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}
  .anw-st button[aria-pressed="true"][data-st="verspaetet"]{background:var(--warn-soft);border-color:var(--warn);color:var(--warn)}
  .anw-st button[aria-pressed="true"][data-st="entschuldigt"]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
  .anw-st button[aria-pressed="true"][data-st="unentschuldigt"]{background:var(--crit-soft);border-color:var(--crit);color:var(--crit)}
  .qt-timer{position:sticky;top:0;z-index:5;background:var(--surface);border-bottom:1px solid var(--line);margin:-4px -4px 12px;padding:10px 4px;display:flex;align-items:center;gap:12px}
  .qt-clock{font-variant-numeric:tabular-nums;font-weight:800;font-size:24px;letter-spacing:.02em}
  .qt-clock.low{color:var(--crit)}
  .qt-opt{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);cursor:pointer;font-size:14px}
  .qt-opt input{width:20px;height:20px;flex:none;margin-top:1px;accent-color:var(--accent)}
  .qt-opt.right{border-color:var(--ok);background:var(--ok-soft)}.qt-opt.wrong{border-color:var(--crit);background:var(--crit-soft)}
  .qt-q{border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--surface)}
  .qt-big{font-variant-numeric:tabular-nums;font-weight:800;font-size:40px;line-height:1}
  .qt-prog{height:6px;border-radius:9px;background:var(--sunk);overflow:hidden;margin-top:6px}.qt-prog i{display:block;height:100%;background:var(--accent)}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();


/* =====================================================================
   Eigenes Erscheinungsbild im Qualifizierungsmodus: Name „Stufenwerk“, Logo, Farben
   Gilt nur, solange der Betrieb Name und Farben nicht selbst geändert hat.
   ===================================================================== */
const Q_BRAND = { name: 'Stufenwerk', brand: '#1d3c6e', brand2: '#b8643a', text: 'Lern- und Tätigkeitsnachweis, Module, Anwesenheit und Tests für die Qualifizierung.' };
function qLogoSVG(bg = Q_BRAND.brand, ring = '#ffffff', last = '#d98a5c') {
  const cx = 256, cy = 256, r1 = 150, r2 = 112, n = 5, gap = 7 * Math.PI / 180, pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  let seg = '';
  for (let i = 0; i < n; i++) { const a0 = -Math.PI / 2 + i * 2 * Math.PI / n + gap / 2, a1 = a0 + 2 * Math.PI / n - gap;
    seg += `<path d="M${pt(r1, a0)} A${r1} ${r1} 0 0 1 ${pt(r1, a1)} L${pt(r2, a1)} A${r2} ${r2} 0 0 0 ${pt(r2, a0)}Z" fill="${i === n - 1 ? last : ring}"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="116" fill="${bg}"/>${seg}<path d="m212 258 30 30 60-66" fill="none" stroke="${ring}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const qLogoURL = () => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qLogoSVG());
(() => {
  const css = `
  :root.quali { --bg:#eef1f5; --surface:#ffffff; --sunk:#e2e7ee; --line:#d2d9e3; --fg:#121c2c; --muted:#4c586b; --scrim:rgba(12,20,34,.45); }
  @media (prefers-color-scheme: dark) { :root.quali:not([data-theme="light"]) { --bg:#0d121b; --surface:#151c28; --sunk:#1b2432; --line:#273143; --fg:#e4e9f1; --muted:#96a2b5; } }
  :root.quali[data-theme="dark"] { --bg:#0d121b; --surface:#151c28; --sunk:#1b2432; --line:#273143; --fg:#e4e9f1; --muted:#96a2b5; }
  .quali .keycard { background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 78%, #000) 100%); border-radius: 14px; }
  .quali .keycard::after { border: 0; border-radius: 0; width: 150px; height: 120px; right: 10px; top: auto; bottom: -8px; opacity: .13;
    background: linear-gradient(currentColor,currentColor) 0 100%/22% 30% no-repeat, linear-gradient(currentColor,currentColor) 26% 100%/22% 52% no-repeat, linear-gradient(currentColor,currentColor) 52% 100%/22% 74% no-repeat, linear-gradient(currentColor,currentColor) 78% 100%/22% 100% no-repeat; }
  .quali .card { border-radius: 14px; }
  .quali .eyebrow { letter-spacing: .12em; }
  .quali header.pb-3 { border-bottom: 2px solid var(--brass-soft); margin-bottom: 6px; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
let qBrandOrig = null;
function qBrand(on) {
  qIcons();
  const root = document.documentElement, imgs = [...document.querySelectorAll('img[src="icon-192.png"], img[data-qlogo]')];
  qBrandOrig ||= { favicon: [...document.querySelectorAll('link[rel=icon]')].map(l => l.href) };
  if (!on) {
    if (!root.classList.contains('quali')) return;
    root.classList.remove('quali'); imgs.forEach(i => { i.src = 'icon-192.png'; delete i.dataset.qlogo; });
    document.querySelectorAll('link[rel=icon]').forEach((l, i) => { l.href = qBrandOrig.favicon[i]; l.removeAttribute('type'); l.type = 'image/png'; });
    return;
  }
  root.classList.add('quali');
  if (BR.appName === DEFAULT_BRANDING.appName) BR.appName = Q_BRAND.name;
  if (BR.brand === DEFAULT_BRANDING.brand && BR.brand2 === DEFAULT_BRANDING.brand2) { BR.brand = Q_BRAND.brand; BR.brand2 = Q_BRAND.brand2; }
  if (!BR.loginText || BR.loginText === DEFAULT_BRANDING.loginText) BR.loginText = Q_BRAND.text;
  root.style.setProperty('--brand', BR.brand); root.style.setProperty('--brand2', BR.brand2);
  document.title = BR.appName;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', BR.brand);
  ['loginName', 'appName'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = BR.appName; });
  const lt = document.getElementById('loginText'); if (lt) lt.textContent = BR.loginText;
  const url = qLogoURL();
  imgs.forEach(i => { i.src = url; i.dataset.qlogo = '1'; });
  document.querySelectorAll('link[rel=icon]').forEach(l => { l.type = 'image/svg+xml'; l.href = url; });
}

const ANW = { anwesend: ['A', 'Anwesend', 'ok', 'Anwesend'], verspaetet: ['V', 'Verspätet', 'warn', 'Verspätet'], entschuldigt: ['E', 'Entschuldigt', 'accent', 'Entsch.'], unentschuldigt: ['U', 'Unentschuldigt', 'crit', 'Unentsch.'] };
const qNum = v => String(Math.round((+v || 0) * 100) / 100).replace('.', ',');
const qWd = d => new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' });
const qAddDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return localDate(x); };
const qMonday = d => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return localDate(x); };
const qCanTests = () => isAdmin() || can('team') || can('lernziele');
const qTnList = () => azubis().filter(p => p.aktiv !== false).sort((a, b) => a.full_name.localeCompare(b.full_name));
function qStaffTabs() { return [['stand', 'Teilnehmende']]; }
/* Eigene Reiter unten in der Leiste: Anwesenheit und Tests */
function qViewVisible(v) {
  try { if (!isQuali() || !S.me || isMA()) return false; if (isAzubi()) return true;
    return v === 'qanw' ? qTnList().some(p => canSchool(p)) : qCanTests(); } catch { return false; }
}
const qViewOf = v => ({ async load() { await qLoadAll(); S.quali.tab = v === 'qanw' ? (isAzubi() ? 'anw' : 'anwesenheit') : 'tests'; await qExtraLoad(); },
  html() { return `<h1 class="text-[26px] font-bold mt-1">${v === 'qanw' ? 'Anwesenheit' : 'Tests'}</h1>${v === 'qtests' && !isAzubi() ? '<p class="text-[14px] text-muted mt-1">Tests erstellen, live mit Timer durchführen und auswerten.</p>' : ''}${qExtraHTML() ?? ''}`; },
  bind() { qExtraBind(); } });
const QAnwView = qViewOf('qanw'), QTestsView = qViewOf('qtests');
function qIcons() { try { Object.keys(Q_ICONS).forEach(k => { if (!I[k]) I[k] = Q_ICONS[k]; }); } catch {} }
function qConfirm(btn, action, label) {
  if (btn.dataset.armed) { delete btn.dataset.armed; action(); return; }
  const old = btn.textContent; btn.dataset.armed = '1'; btn.textContent = label || 'Sicher? Nochmal tippen';
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = old; } }, 4000);
}
const qMassOf = uid => (S.quali?.rows || []).find(r => r.azubi_id === uid)?.massnahme || '';

/* =====================================================================
   Laden je Reiter
   ===================================================================== */
async function qExtraLoad() {
  const tab = S.quali.tab;
  if (!isAzubi() && tab === 'anwesenheit') {
    S.quali.anwTag ||= localDate();
    S.quali.anw = await q(sb.from('anwesenheit').select('*').eq('datum', S.quali.anwTag));
  }
  if (!isAzubi() && tab === 'tests' && qCanTests()) {
    const [tests, sitz] = await Promise.all([
      q(sb.from('tests').select('*').order('updated_at', { ascending: false })),
      q(sb.from('test_sitzungen').select('*').order('gestartet_at', { ascending: false }).limit(30))
    ]);
    const stale = sitz.filter(x => x.status === 'laeuft' && new Date(x.endet_at) < Date.now() - 45e3);
    for (const x of stale) { try { await q(sb.rpc('test_beenden', { p_sitzung: x.id })); x.status = 'beendet'; } catch {} }
    S.quali.tests = tests; S.quali.sitz = sitz;
    const ids = sitz.map(s => s.id);
    S.quali.abg = ids.length ? await q(sb.from('test_abgaben').select('id,sitzung_id,azubi_id,beantwortet,punkte_auto,punkte_manuell,abgegeben_at').in('sitzung_id', ids)) : [];
  }
  if (isAzubi() && tab === 'tests') S.quali.live = await q(sb.rpc('test_live'));
  if (isAzubi() && tab === 'anw') S.quali.myAnw = await q(sb.from('anwesenheit').select('*').eq('azubi_id', S.me.id).order('datum', { ascending: false }).limit(60));
}
function qExtraHTML() {
  const tab = S.quali.tab;
  if (!isAzubi() && tab === 'anwesenheit') return qAnwHTML();
  if (!isAzubi() && tab === 'tests') return qCanTests() ? qTestsHTML() : empty('Für Tests fehlt dir das Recht „Lernziele“ oder „Team“.');
  if (isAzubi() && tab === 'tests') return qMyTestsHTML();
  if (isAzubi() && tab === 'anw') return qMyAnwHTML();
  return null;
}
function qExtraBind() {
  const tab = S.quali.tab;
  if (!isAzubi() && tab === 'anwesenheit') qAnwBind();
  if (!isAzubi() && tab === 'tests') qTestsBind();
  if (isAzubi() && tab === 'tests') $$('[data-qtake]').forEach(b => b.onclick = () => qTakeTest(b.dataset.qtake));
}

/* =====================================================================
   Anwesenheitsliste (Trainer, Koordination)
   ===================================================================== */
function qAnwHTML() {
  const tag = S.quali.anwTag, list = qTnList().filter(p => canSchool(p)), by = Object.fromEntries((S.quali.anw || []).map(a => [a.azubi_id, a]));
  const f = S.quali.anwFilter || '', shown = list.filter(p => !f || qMassOf(p.id) === f);
  const cnt = k => shown.filter(p => by[p.id]?.status === k).length, offen = shown.filter(p => !by[p.id]).length;
  const wd = new Date(tag + 'T12:00:00').getDay(), we = wd === 0 || wd === 6;
  const mon = qMonday(localDate()), fri = qAddDays(mon, 4);
  return `
    <div class="card p-4 mt-4">
      <div class="flex items-center gap-2">
        <button class="xbtn" data-anwday="-1" aria-label="Vorheriger Tag">${svg('left', 'w-5 h-5')}</button>
        <div class="flex-1 text-center"><div class="font-display font-bold text-[18px] tnum">${new Date(tag + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
          <div class="text-[12px] text-muted">${tag === localDate() ? 'heute' : '<button class="text-accent font-semibold" data-anwday="0">zu heute</button>'}${we ? ' · Wochenende' : ''}</div></div>
        <button class="xbtn" data-anwday="1" aria-label="Nächster Tag">${svg('arrow', 'w-5 h-5')}</button>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-3">
        <select id="anwFilter" class="field" aria-label="Maßnahme filtern"><option value="">Alle Maßnahmen</option>${Object.entries(Q_KATALOG).map(([k, x]) => `<option value="${k}" ${f === k ? 'selected' : ''}>${esc(x.kurz)}</option>`).join('')}</select>
        <button class="btn ghost" id="anwAll" ${offen ? '' : 'disabled'}>Offene: alle anwesend</button>
      </div>
      <div class="flex flex-wrap gap-1.5 mt-3 text-[12px]">${Object.entries(ANW).map(([k, [, l, c]]) => `<span class="chip ${c} tnum">${cnt(k)} ${l}</span>`).join('')}<span class="chip tnum">${offen} offen</span></div>
    </div>
    ${shown.length ? `<div class="card mt-3">${shown.map((p, i) => { const a = by[p.id]; return `<div class="p-3.5 anw-row ${i ? 'border-t border-line' : ''}">
      <div class="flex items-center gap-3">${avatar(p, 34)}<div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(p.full_name)}</div><div class="text-[12px] text-muted truncate">${esc(Q_KATALOG[qMassOf(p.id)]?.kurz || p.beruf || '')}</div></div>${a ? '' : '<span class="chip">offen</span>'}</div>
      <div class="anw-st" role="group" aria-label="Anwesenheit ${esc(p.full_name)}">${Object.entries(ANW).map(([k, [, l, , sh]]) => `<button data-anw="${p.id}" data-st="${k}" aria-pressed="${a?.status === k}" aria-label="${l}" title="${l}">${sh}</button>`).join('')}</div>
      ${a && a.status !== 'anwesend' ? `<div class="grid ${a.status === 'verspaetet' ? 'grid-cols-3' : 'grid-cols-1'} gap-2">${a.status === 'verspaetet' ? `<input class="field" type="number" min="0" max="600" inputmode="numeric" placeholder="Minuten" value="${a.minuten ?? ''}" data-anwmin="${p.id}" aria-label="Minuten verspätet">` : ''}<input class="field" style="grid-column:span ${a.status === 'verspaetet' ? 2 : 1}" maxlength="300" placeholder="Notiz, z. B. Krankmeldung liegt vor" value="${esc(a.notiz || '')}" data-anwnote="${p.id}" aria-label="Notiz"></div>` : ''}
    </div>`; }).join('')}</div>` : empty('Keine Teilnehmenden in dieser Auswahl.')}
    ${secTitle('Export')}
    <div class="card p-4 flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="anwVon">Von</label><input id="anwVon" type="date" class="field" value="${S.quali.anwVon || mon}"></div><div><label class="lbl" for="anwBis">Bis</label><input id="anwBis" type="date" class="field" value="${S.quali.anwBis || fri}"></div></div>
      <div class="flex flex-wrap gap-2"><button class="btn ghost" data-anwrange="woche">Diese Woche</button><button class="btn ghost" data-anwrange="vorwoche">Letzte Woche</button><button class="btn ghost" data-anwrange="monat">Dieser Monat</button></div>
      <div class="grid grid-cols-2 gap-2"><button class="btn" id="anwPdf">PDF herunterladen</button><button class="btn ghost" id="anwMail">Per E-Mail senden</button></div>
      <p class="text-[12px] text-muted">Die Liste enthält die gefilterte Maßnahme, alle Werktage im Zeitraum, Summen je Person und eine Zeile für die Unterschrift.</p>
    </div>`;
}
function qAnwBind() {
  $$('[data-anwday]').forEach(b => b.onclick = () => { const n = +b.dataset.anwday; S.quali.anwTag = n === 0 ? localDate() : qAddDays(S.quali.anwTag, n); go(S.view); });
  const fl = $('#anwFilter'); if (fl) fl.onchange = () => { S.quali.anwFilter = fl.value; render(); };
  const save = async (uid, patch) => {
    const cur = (S.quali.anw || []).find(a => a.azubi_id === uid);
    const row = { azubi_id: uid, datum: S.quali.anwTag, status: cur?.status || 'anwesend', minuten: cur?.minuten ?? null, notiz: cur?.notiz ?? null, ...patch, erfasst_von: S.me.id, updated_at: new Date().toISOString() };
    if (row.status !== 'verspaetet') row.minuten = null;
    const saved = await q(sb.from('anwesenheit').upsert(row, { onConflict: 'azubi_id,datum' }).select().single());
    S.quali.anw = (S.quali.anw || []).filter(a => a.azubi_id !== uid).concat(saved);
  };
  $$('[data-anw]').forEach(b => b.onclick = async () => {
    try { await save(b.dataset.anw, { status: b.dataset.st }); render(); } catch (e) { toast(errText(e)); }
  });
  $$('[data-anwmin]').forEach(i => i.onchange = () => save(i.dataset.anwmin, { minuten: i.value === '' ? null : Math.max(0, Math.min(600, +i.value)) }).then(() => toast('Gespeichert'), e => toast(errText(e))));
  $$('[data-anwnote]').forEach(i => i.onchange = () => save(i.dataset.anwnote, { notiz: i.value.trim() || null }).then(() => toast('Gespeichert'), e => toast(errText(e))));
  const all = $('#anwAll'); if (all) all.onclick = async () => {
    const by = new Set((S.quali.anw || []).map(a => a.azubi_id)), f = S.quali.anwFilter || '';
    const ids = qTnList().filter(p => canSchool(p) && (!f || qMassOf(p.id) === f) && !by.has(p.id)).map(p => p.id);
    if (!ids.length) return;
    try {
      const rows = await q(sb.from('anwesenheit').upsert(ids.map(id => ({ azubi_id: id, datum: S.quali.anwTag, status: 'anwesend', erfasst_von: S.me.id, updated_at: new Date().toISOString() })), { onConflict: 'azubi_id,datum' }).select());
      S.quali.anw = (S.quali.anw || []).concat(rows); toast(`${ids.length} als anwesend erfasst`); render();
    } catch (e) { toast(errText(e)); }
  };
  const keep = () => { S.quali.anwVon = $('#anwVon').value; S.quali.anwBis = $('#anwBis').value; };
  $('#anwVon')?.addEventListener('change', keep); $('#anwBis')?.addEventListener('change', keep);
  $$('[data-anwrange]').forEach(b => b.onclick = () => {
    const t = localDate(), m = qMonday(t);
    if (b.dataset.anwrange === 'woche') { S.quali.anwVon = m; S.quali.anwBis = qAddDays(m, 4); }
    if (b.dataset.anwrange === 'vorwoche') { S.quali.anwVon = qAddDays(m, -7); S.quali.anwBis = qAddDays(m, -3); }
    if (b.dataset.anwrange === 'monat') { const d = new Date(t + 'T12:00:00'); S.quali.anwVon = localDate(new Date(d.getFullYear(), d.getMonth(), 1)); S.quali.anwBis = localDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
    render();
  });
  const pdfBtn = $('#anwPdf'); if (pdfBtn) pdfBtn.onclick = async () => {
    keep(); pdfBtn.disabled = true;
    try { const r = await qAnwPdf(); if (r) { r.doc.save(r.name); toast('PDF erstellt'); } } catch (e) { toast(errText(e)); } finally { pdfBtn.disabled = false; PDF_DE = false; }
  };
  const mailBtn = $('#anwMail'); if (mailBtn) mailBtn.onclick = () => { keep(); qMailSheet('Anwesenheitsliste per E-Mail', async () => qAnwPdf(), `Anwesenheitsliste ${fmtDate(S.quali.anwVon)} bis ${fmtDate(S.quali.anwBis)}`); };
}

/* Schmale PDF-Hilfe (Hoch- oder Querformat) */
async function qPdfStart(land) {
  PDF_DE = true; await loadScript('./vendor/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: land ? 'landscape' : 'portrait' }), FONT = await pdfFont(doc);
  const W = land ? 297 : 210, H = land ? 210 : 297, M = 14;
  const foot = title => { const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont(FONT, 'normal'); doc.setFontSize(8); doc.setTextColor(140); doc.text(pdfSafe(`${title} · ${S.hotel || ''} · erstellt mit ${BR.appName || 'AzubiHub'} am ${fmtDate(localDate())} · Seite ${i}/${n}`), M, H - 7); doc.setTextColor(0); } };
  return { doc, FONT, W, H, M, foot };
}
async function qAnwPdf() {
  const von = S.quali.anwVon || qMonday(localDate()), bis = S.quali.anwBis || qAddDays(von, 4);
  if (bis < von) { toast('„Bis“ liegt vor „Von“.'); return null; }
  const f = S.quali.anwFilter || '', people = qTnList().filter(p => canSchool(p) && (!f || qMassOf(p.id) === f));
  if (!people.length) { toast('Keine Teilnehmenden in dieser Auswahl.'); return null; }
  const rows = await q(sb.from('anwesenheit').select('*').gte('datum', von).lte('datum', bis));
  const by = {}; rows.forEach(r => { by[r.azubi_id + '|' + r.datum] = r; });
  const days = []; for (let d = von; d <= bis && days.length < 62; d = qAddDays(d, 1)) { const wd = new Date(d + 'T12:00:00').getDay(); if ((wd !== 0 && wd !== 6) || rows.some(r => r.datum === d)) days.push(d); }
  const P = await qPdfStart(true), { doc, FONT, W, M } = P;
  const title = 'Anwesenheitsliste';
  doc.setFont(FONT, 'bold'); doc.setFontSize(16); doc.text(title, M, 16);
  doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(80);
  doc.text(pdfSafe(`${S.hotel || ''} · Zeitraum ${fmtDate(von)} bis ${fmtDate(bis)} · ${f ? Q_KATALOG[f]?.kurz || '' : 'alle Maßnahmen'}`), M, 22); doc.setTextColor(0);
  const nameW = 52, sumW = 11, nSum = 5, dayW = Math.max(5.5, Math.min(14, (W - 2 * M - nameW - nSum * sumW) / days.length));
  const perPage = Math.max(1, Math.floor((W - 2 * M - nameW - nSum * sumW) / dayW)), chunks = [];
  for (let i = 0; i < days.length; i += perPage) chunks.push(days.slice(i, i + perPage));
  chunks.forEach((ds, ci) => {
    if (ci) doc.addPage();
    let y = ci ? 16 : 30;
    const head = () => {
      doc.setFillColor(238, 242, 242); doc.rect(M, y - 4.5, W - 2 * M, 10, 'F'); doc.setFont(FONT, 'bold'); doc.setFontSize(7.5);
      doc.text('Name', M + 1.5, y + 1.5);
      ds.forEach((d, i) => { const x = M + nameW + i * dayW + dayW / 2; doc.text(pdfSafe(qWd(d)), x, y - 0.6, { align: 'center' }); doc.text(d.slice(8, 10) + '.' + d.slice(5, 7) + '.', x, y + 3.2, { align: 'center' }); });
      const sx = M + nameW + ds.length * dayW;
      ['A', 'V', 'E', 'U', '%'].forEach((l, i) => doc.text(l, sx + i * sumW + sumW / 2, y + 1.5, { align: 'center' }));
      y += 9;
    };
    head();
    people.forEach((p, pi) => {
      if (y > 188) { doc.addPage(); y = 16; head(); }
      if (pi % 2) { doc.setFillColor(248, 250, 250); doc.rect(M, y - 4, W - 2 * M, 6.4, 'F'); }
      doc.setFont(FONT, 'normal'); doc.setFontSize(8.5); doc.text(pdfSafe(p.full_name).slice(0, 34), M + 1.5, y);
      ds.forEach((d, i) => { const a = by[p.id + '|' + d]; if (!a) { doc.setTextColor(170); doc.text('–', M + nameW + i * dayW + dayW / 2, y, { align: 'center' }); doc.setTextColor(0); return; }
        const s = ANW[a.status][0] + (a.status === 'verspaetet' && a.minuten ? a.minuten : '');
        const col = { anwesend: [35, 106, 64], verspaetet: [138, 80, 11], entschuldigt: [15, 92, 95], unentschuldigt: [168, 50, 50] }[a.status];
        doc.setTextColor(...col); doc.setFont(FONT, 'bold'); doc.text(s, M + nameW + i * dayW + dayW / 2, y, { align: 'center' }); doc.setTextColor(0); doc.setFont(FONT, 'normal'); });
      const all = days.map(d => by[p.id + '|' + d]).filter(Boolean), c = k => all.filter(a => a.status === k).length;
      const quote = all.length ? Math.round((c('anwesend') + c('verspaetet')) * 100 / all.length) : null;
      const sx = M + nameW + ds.length * dayW;
      [c('anwesend'), c('verspaetet'), c('entschuldigt'), c('unentschuldigt'), quote == null ? '–' : quote + ' %'].forEach((v, i) => doc.text(String(v), sx + i * sumW + sumW / 2, y, { align: 'center' }));
      y += 6.4;
    });
    doc.setDrawColor(210); doc.line(M, y - 3.5, W - M, y - 3.5);
    if (ci === chunks.length - 1) {
      y += 4; if (y > 180) { doc.addPage(); y = 20; }
      doc.setFontSize(8); doc.setTextColor(90);
      doc.text(pdfSafe('A = anwesend · V = verspätet (Zahl = Minuten) · E = entschuldigt · U = unentschuldigt · – = nicht erfasst. Summen und Quote (anwesend + verspätet) über den gesamten Zeitraum.'), M, y);
      const notes = rows.filter(r => r.notiz && people.some(p => p.id === r.azubi_id)).sort((a, b) => a.datum.localeCompare(b.datum));
      if (notes.length) { y += 6; doc.setFont(FONT, 'bold'); doc.text('Notizen', M, y); doc.setFont(FONT, 'normal');
        notes.slice(0, 30).forEach(n => { y += 4.4; if (y > 192) { doc.addPage(); y = 20; } doc.text(pdfSafe(`${fmtDate(n.datum)} · ${S.profiles[n.azubi_id]?.full_name || ''}: ${n.notiz}`).slice(0, 180), M, y); }); }
      doc.setTextColor(0); y += 16; if (y > 196) { doc.addPage(); y = 30; }
      doc.setDrawColor(120); doc.line(M, y, M + 80, y); doc.line(W - M - 80, y, W - M, y);
      doc.setFontSize(8); doc.setTextColor(90); doc.text('Datum', M, y + 4); doc.text(pdfSafe('Unterschrift Trainer/in'), W - M - 80, y + 4); doc.setTextColor(0);
    }
  });
  P.foot(title);
  return { doc, name: `Anwesenheitsliste_${von}_${bis}.pdf`, subject: `Anwesenheitsliste ${fmtDate(von)} bis ${fmtDate(bis)}` };
}

/* PDF per E-Mail: Empfänger eingeben, PDF erzeugen, über die Edge Function „pdf-mail“ senden */
function qMailSheet(title, make, defText) {
  let last = ''; try { last = localStorage.getItem('azubihub.pdfmail') || ''; } catch {}
  sheetShell(title, `<form id="pmForm" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="pmTo">An (E-Mail)</label><input id="pmTo" type="email" class="field" required maxlength="160" value="${esc(last)}" placeholder="z. B. koordination@beispiel.de"></div>
    <div><label class="lbl" for="pmText">Nachricht</label><textarea id="pmText" class="field" rows="3" maxlength="2000">${esc(defText || '')}</textarea></div>
    <button class="btn" id="pmSend">PDF erstellen und senden</button>
    <p class="text-[12px] text-muted">Das PDF geht als Anhang an die Adresse. Antworten landen bei dir.</p></form>`);
  $('#pmForm').onsubmit = async e => {
    e.preventDefault(); const to = $('#pmTo').value.trim(), btn = $('#pmSend'); btn.disabled = true; btn.textContent = 'Wird gesendet …';
    try {
      const r = await make(); if (!r) return;
      const pdf = r.doc.output('datauristring').split(',')[1];
      if (S.demo) { closeSheet(); toast('Demo: E-Mail würde jetzt an ' + to + ' gehen.'); return; }
      const { data, error } = await sb.functions.invoke('pdf-mail', { body: { to, subject: r.subject || title, text: $('#pmText').value, filename: r.name, pdf } });
      if (error || data?.error) { let m = data?.error; if (!m && error?.context?.json) { try { m = (await error.context.json()).error; } catch {} } throw new Error(m || 'Die E-Mail konnte nicht verschickt werden.'); }
      try { localStorage.setItem('azubihub.pdfmail', to); } catch {}
      closeSheet(); toast('E-Mail gesendet');
    } catch (err) { toast(errText(err)); } finally { PDF_DE = false; const b = $('#pmSend'); if (b) { b.disabled = false; b.textContent = 'PDF erstellen und senden'; } }
  };
}

/* Eigene Anwesenheit (Teilnehmende) */
function qMyAnwHTML() {
  const list = S.quali.myAnw || [], c = k => list.filter(a => a.status === k).length;
  const quote = list.length ? Math.round((c('anwesend') + c('verspaetet')) * 100 / list.length) : null;
  return `${secTitle('Deine Anwesenheit', quote == null ? '' : `<span class="chip ${quote >= 90 ? 'ok' : quote >= 75 ? 'warn' : 'crit'} tnum">${quote} %</span>`)}
    ${list.length ? `<div class="flex flex-wrap gap-1.5 mb-2 text-[12px]">${Object.entries(ANW).map(([k, [, l, col]]) => `<span class="chip ${col} tnum">${c(k)} ${l}</span>`).join('')}</div>
    <div class="card">${list.slice(0, 40).map((a, i) => `<div class="flex items-center gap-3 p-3 ${i ? 'border-t border-line' : ''}"><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold tnum">${qWd(a.datum)}, ${fmtDate(a.datum)}</div>${a.notiz ? `<div class="text-[12px] text-muted truncate">${esc(a.notiz)}</div>` : ''}</div><span class="chip ${ANW[a.status][2]}">${ANW[a.status][1]}${a.status === 'verspaetet' && a.minuten ? ` ${a.minuten} Min.` : ''}</span></div>`).join('')}</div>
    <p class="text-[12px] text-muted mt-2">Die letzten 60 erfassten Tage. Fehlt etwas oder stimmt etwas nicht, sprich deine Trainerin oder deinen Trainer an.</p>` : empty('Für dich wurde noch keine Anwesenheit erfasst.')}`;
}

/* =====================================================================
   Tests: Übersicht für Trainer
   ===================================================================== */
const Q_TYP = { single: 'Einfachauswahl', multi: 'Mehrfachauswahl', wahr_falsch: 'Wahr / Falsch', text: 'Freitext' };
const qMax = t => (t?.fragen || []).reduce((s, f) => s + (+f.punkte || 1), 0);
const qPts = (a, t) => { if (!a) return null; const man = Object.values(a.punkte_manuell || {}).reduce((s, v) => s + (+v || 0), 0); return a.punkte_auto == null && !man ? null : Math.round(((+a.punkte_auto || 0) + man) * 100) / 100; };
const qOpenText = (a, t) => (t?.fragen || []).filter(f => f.typ === 'text' && typeof a?.antworten?.[f.id] === 'string' && a.antworten[f.id].trim() && a.punkte_manuell?.[f.id] == null).length;
const qClock = ms => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function qTestsHTML() {
  const tests = S.quali.tests || [], sitz = S.quali.sitz || [], abg = S.quali.abg || [];
  const live = sitz.filter(s => s.status === 'laeuft'), done = sitz.filter(s => s.status !== 'laeuft');
  const row = s => { const t = tests.find(x => x.id === s.test_id), a = abg.filter(x => x.sitzung_id === s.id), ab = a.filter(x => x.abgegeben_at).length, open = a.reduce((n, x) => n + qOpenText(x, t), 0);
    return `<button class="w-full flex items-center gap-3 p-3.5 text-left" data-qsess="${s.id}"><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(s.titel)}</div><div class="text-[12px] text-muted tnum">${new Date(s.gestartet_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${ab}/${s.teilnehmer.length} abgegeben${open && s.status !== 'laeuft' ? ` · ${open} Freitext offen` : ''}</div></div>
      ${s.status === 'laeuft' ? '<span class="chip crit">live</span>' : s.freigegeben ? '<span class="chip ok">freigegeben</span>' : open ? '<span class="chip warn">bewerten</span>' : '<span class="chip">beendet</span>'}${svg('arrow', 'w-4 h-4 text-muted flex-none')}</button>`; };
  return `
    ${live.length ? `${secTitle('Läuft gerade', `<span class="chip crit tnum">${live.length}</span>`)}<div class="card">${live.map((s, i) => `<div class="${i ? 'border-t border-line' : ''}">${row(s)}</div>`).join('')}</div>` : ''}
    ${secTitle('Deine Tests', '<button id="qtNew" class="text-[13px] font-semibold text-accent">+ Neuer Test</button>')}
    ${tests.length ? `<div class="card">${tests.map((t, i) => `<div class="p-3.5 ${i ? 'border-t border-line' : ''}">
      <div class="flex items-center gap-3"><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(t.titel)}</div><div class="text-[12px] text-muted tnum">${t.fragen.length} Fragen · ${qNum(qMax(t))} Punkte · ${t.dauer_min} Min.${t.modul ? ' · Modul ' + t.modul : ''}${t.beruf ? ' · ' + esc(t.beruf) : ''}</div></div></div>
      <div class="grid grid-cols-3 gap-2 mt-2.5"><button class="btn py-1.5 text-[13px]" data-qtstart="${t.id}" ${t.fragen.length ? '' : 'disabled'}>Live starten</button><button class="btn ghost py-1.5 text-[13px]" data-qtedit="${t.id}">Bearbeiten</button><button class="btn ghost py-1.5 text-[13px]" data-qtcopy="${t.id}">Kopieren</button></div></div>`).join('')}</div>`
      : empty('Noch keine Tests. Lege einen an oder übernimm Fragen aus dem Fragenkatalog.')}
    ${done.length ? `${secTitle('Ergebnisse')}<div class="card">${done.map((s, i) => `<div class="${i ? 'border-t border-line' : ''}">${row(s)}</div>`).join('')}</div>` : ''}
    <p class="text-[12px] text-muted mt-2">Auswahlfragen wertet AzubiHub automatisch aus, Freitext bewertest du selbst. Teilnehmende sehen Lösungen und Punkte erst, wenn du die Ergebnisse freigibst.</p>`;
}
function qTestsBind() {
  $('#qtNew') && ($('#qtNew').onclick = () => qTestEditor(null));
  $$('[data-qtedit]').forEach(b => b.onclick = () => qTestEditor((S.quali.tests || []).find(t => t.id === b.dataset.qtedit)));
  $$('[data-qtcopy]').forEach(b => b.onclick = async () => { const t = (S.quali.tests || []).find(x => x.id === b.dataset.qtcopy); if (!t) return;
    try { await q(sb.from('tests').insert({ titel: (t.titel + ' (Kopie)').slice(0, 160), beschreibung: t.beschreibung, beruf: t.beruf, modul: t.modul, dauer_min: t.dauer_min, fragen: t.fragen, zufall: t.zufall, teilpunkte: t.teilpunkte, created_by: S.me.id })); toast('Kopie angelegt'); go(S.view); } catch (e) { toast(errText(e)); } });
  $$('[data-qtstart]').forEach(b => b.onclick = () => qStartSheet((S.quali.tests || []).find(t => t.id === b.dataset.qtstart)));
  $$('[data-qsess]').forEach(b => b.onclick = () => qLiveSheet(b.dataset.qsess));
}

/* ---------- Test-Editor ---------- */
const qNewId = () => 'f' + Math.random().toString(36).slice(2, 9);
function qBlankFrage(typ = 'single') {
  return { id: qNewId(), typ, frage: '', optionen: typ === 'wahr_falsch' ? ['Wahr', 'Falsch'] : typ === 'text' ? [] : ['', '', '', ''], richtig: typ === 'text' ? [] : [0], punkte: typ === 'text' ? 3 : 1, loesung: '' };
}
function qTestEditor(t0) {
  const T = t0 ? JSON.parse(JSON.stringify(t0)) : { titel: '', beschreibung: '', beruf: '', modul: null, dauer_min: 20, zufall: false, teilpunkte: true, fragen: [qBlankFrage()] };
  const draw = () => {
    sheetShell(t0 ? 'Test bearbeiten' : 'Neuer Test', `<form id="qtForm" class="flex flex-col gap-3">
      <div class="card p-4 flex flex-col gap-3">
        <div><label class="lbl" for="qtT">Titel</label><input id="qtT" class="field" maxlength="160" required value="${esc(T.titel)}" placeholder="z. B. Zwischentest Modul 3: Wartung"></div>
        <div><label class="lbl" for="qtB">Hinweis für Teilnehmende <span class="font-normal text-muted">(optional)</span></label><textarea id="qtB" class="field" rows="2" maxlength="600">${esc(T.beschreibung || '')}</textarea></div>
        <div class="grid grid-cols-3 gap-2">
          <div><label class="lbl" for="qtD">Zeit (Min.)</label><input id="qtD" type="number" min="1" max="300" class="field" value="${T.dauer_min}"></div>
          <div><label class="lbl" for="qtM">Modul</label><input id="qtM" type="number" min="1" max="12" class="field" value="${T.modul ?? ''}"></div>
          <div><label class="lbl" for="qtBer">Beruf</label><select id="qtBer" class="field"><option value="">alle</option>${(BR.berufe || []).map(b => `<option ${T.beruf === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
        </div>
        <label class="flex items-center gap-2 text-[14px]"><input type="checkbox" class="cbx" id="qtZ" ${T.zufall ? 'checked' : ''}> Fragen für jede Person in anderer Reihenfolge</label>
        <label class="flex items-center gap-2 text-[14px]"><input type="checkbox" class="cbx" id="qtTP" ${T.teilpunkte ? 'checked' : ''}> Teilpunkte bei Mehrfachauswahl (falsche Kreuze ziehen ab)</label>
      </div>
      <div class="flex items-center justify-between"><div class="eyebrow">${T.fragen.length} Fragen · ${qMax(T)} Punkte</div><button type="button" class="text-[13px] font-semibold text-accent" id="qtImp">Aus Fragenkatalog übernehmen</button></div>
      ${T.fragen.map((f, i) => `<div class="card p-4 flex flex-col gap-2.5" data-fi="${i}">
        <div class="flex items-center gap-2"><span class="chip accent tnum">${i + 1}</span>
          <select class="field" data-ftyp="${i}" aria-label="Fragetyp" style="flex:1">${Object.entries(Q_TYP).map(([k, l]) => `<option value="${k}" ${f.typ === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <input type="number" class="field" style="width:76px" min="0.5" max="50" step="0.5" value="${f.punkte}" data-fpkt="${i}" aria-label="Punkte"><span class="text-[12px] text-muted">P.</span></div>
        <textarea class="field" rows="2" maxlength="1000" placeholder="Frage" data-ftext="${i}" aria-label="Frage ${i + 1}">${esc(f.frage)}</textarea>
        ${f.typ === 'text' ? `<textarea class="field" rows="2" maxlength="2000" placeholder="Musterlösung (sehen nur Trainer, nach Freigabe auch Teilnehmende)" data-floes="${i}">${esc(f.loesung || '')}</textarea>`
          : `<div class="flex flex-col gap-1.5">${f.optionen.map((o, j) => `<div class="flex items-center gap-2"><input type="${f.typ === 'multi' ? 'checkbox' : 'radio'}" name="r${i}" class="cbx" data-fok="${i}:${j}" ${f.richtig.includes(j) ? 'checked' : ''} aria-label="Antwort ${j + 1} ist richtig" style="width:20px;height:20px;accent-color:var(--ok)">
              <input class="field" maxlength="300" value="${esc(o)}" placeholder="Antwort ${j + 1}" data-fopt="${i}:${j}" ${f.typ === 'wahr_falsch' ? 'readonly' : ''}>${f.typ !== 'wahr_falsch' && f.optionen.length > 2 ? `<button type="button" class="xbtn" data-fdelopt="${i}:${j}" aria-label="Antwort entfernen">${svg('x', 'w-4 h-4')}</button>` : ''}</div>`).join('')}
            ${f.typ !== 'wahr_falsch' && f.optionen.length < 8 ? `<button type="button" class="text-[13px] font-semibold text-accent self-start" data-faddopt="${i}">+ Antwort</button>` : ''}
            <p class="text-[12px] text-muted">${f.typ === 'multi' ? 'Alle richtigen Antworten anhaken.' : 'Die richtige Antwort markieren.'}</p></div>`}
        <div class="flex gap-3 text-[13px] font-semibold"><button type="button" class="text-accent" data-fup="${i}" ${i ? '' : 'disabled'}>nach oben</button><button type="button" class="text-accent" data-fdown="${i}" ${i < T.fragen.length - 1 ? '' : 'disabled'}>nach unten</button><button type="button" style="color:var(--crit)" data-fdel="${i}">entfernen</button></div>
      </div>`).join('')}
      <div class="grid grid-cols-2 gap-2"><button type="button" class="btn ghost" data-fadd="single">+ Einfachauswahl</button><button type="button" class="btn ghost" data-fadd="multi">+ Mehrfachauswahl</button><button type="button" class="btn ghost" data-fadd="wahr_falsch">+ Wahr / Falsch</button><button type="button" class="btn ghost" data-fadd="text">+ Freitext</button></div>
      <button class="btn">Test speichern</button>
      ${t0 ? '<button type="button" class="btn danger" id="qtDel">Test löschen</button>' : ''}
    </form>`);
    const sync = () => {
      T.titel = $('#qtT').value; T.beschreibung = $('#qtB').value; T.dauer_min = Math.max(1, Math.min(300, +$('#qtD').value || 20)); T.modul = $('#qtM').value ? +$('#qtM').value : null; T.beruf = $('#qtBer').value || null; T.zufall = $('#qtZ').checked; T.teilpunkte = $('#qtTP').checked;
      T.fragen.forEach((f, i) => {
        f.frage = $(`[data-ftext="${i}"]`).value; f.punkte = Math.max(0.5, Math.min(50, +$(`[data-fpkt="${i}"]`).value || 1));
        if (f.typ === 'text') f.loesung = $(`[data-floes="${i}"]`).value;
        else { f.optionen = f.optionen.map((o, j) => $(`[data-fopt="${i}:${j}"]`).value); f.richtig = f.optionen.map((o, j) => $(`[data-fok="${i}:${j}"]`).checked ? j : -1).filter(j => j >= 0); }
      });
    };
    const keepScroll = fn => { const s = $('#sheet .sheet'), y = s?.scrollTop || 0; sync(); fn(); draw(); const s2 = $('#sheet .sheet'); if (s2) s2.scrollTop = y; };
    $$('[data-ftyp]').forEach(sel => sel.onchange = () => keepScroll(() => { const i = +sel.dataset.ftyp, old = T.fragen[i], n = qBlankFrage(sel.value); n.id = old.id; n.frage = old.frage; if (sel.value !== 'text' && sel.value !== 'wahr_falsch' && old.optionen?.length && old.typ !== 'wahr_falsch') { n.optionen = old.optionen; n.richtig = sel.value === 'single' ? old.richtig.slice(0, 1) : old.richtig; } T.fragen[i] = n; }));
    $$('[data-faddopt]').forEach(b => b.onclick = () => keepScroll(() => T.fragen[+b.dataset.faddopt].optionen.push('')));
    $$('[data-fdelopt]').forEach(b => b.onclick = () => keepScroll(() => { const [i, j] = b.dataset.fdelopt.split(':').map(Number), f = T.fragen[i]; f.optionen.splice(j, 1); f.richtig = f.richtig.filter(x => x !== j).map(x => x > j ? x - 1 : x); }));
    $$('[data-fadd]').forEach(b => b.onclick = () => keepScroll(() => T.fragen.push(qBlankFrage(b.dataset.fadd))));
    $$('[data-fdel]').forEach(b => b.onclick = () => keepScroll(() => T.fragen.splice(+b.dataset.fdel, 1)));
    $$('[data-fup]').forEach(b => b.onclick = () => keepScroll(() => { const i = +b.dataset.fup; [T.fragen[i - 1], T.fragen[i]] = [T.fragen[i], T.fragen[i - 1]]; }));
    $$('[data-fdown]').forEach(b => b.onclick = () => keepScroll(() => { const i = +b.dataset.fdown; [T.fragen[i + 1], T.fragen[i]] = [T.fragen[i], T.fragen[i + 1]]; }));
    $('#qtImp').onclick = () => { sync(); qImportSheet(T, draw); };
    if ($('#qtDel')) $('#qtDel').onclick = () => confirmInline($('#qtDel'), async () => { try { await q(sb.from('tests').delete().eq('id', t0.id)); closeSheet(); toast('Test gelöscht'); go(S.view); } catch (e) { toast(errText(e)); } });
    $('#qtForm').onsubmit = async e => {
      e.preventDefault(); sync();
      const err = T.fragen.map((f, i) => !f.frage.trim() ? `Frage ${i + 1}: Text fehlt.` : f.typ === 'text' ? null : f.optionen.filter(o => o.trim()).length < 2 ? `Frage ${i + 1}: mindestens zwei Antworten.` : f.optionen.some(o => !o.trim()) ? `Frage ${i + 1}: leere Antwort entfernen oder ausfüllen.` : !f.richtig.length ? `Frage ${i + 1}: richtige Antwort markieren.` : null).find(Boolean);
      if (!T.titel.trim()) return toast('Bitte einen Titel eingeben.');
      if (!T.fragen.length) return toast('Bitte mindestens eine Frage anlegen.');
      if (err) return toast(err);
      const row = { titel: T.titel.trim(), beschreibung: T.beschreibung.trim() || null, beruf: T.beruf, modul: T.modul, dauer_min: T.dauer_min, zufall: T.zufall, teilpunkte: T.teilpunkte,
        fragen: T.fragen.map(f => ({ id: f.id, typ: f.typ, frage: f.frage.trim(), optionen: f.typ === 'text' ? [] : f.optionen.map(o => o.trim()), richtig: f.typ === 'text' ? [] : f.richtig, punkte: f.punkte, ...(f.typ === 'text' && f.loesung?.trim() ? { loesung: f.loesung.trim() } : {}) })), updated_at: new Date().toISOString() };
      try { if (t0) await q(sb.from('tests').update(row).eq('id', t0.id)); else await q(sb.from('tests').insert({ ...row, created_by: S.me.id })); closeSheet(); toast('Test gespeichert'); go(S.view); } catch (er) { toast(errText(er)); }
    };
  };
  draw();
}
/* Fragen aus dem vorhandenen Fragenkatalog (Übungsfragen) übernehmen */
async function qImportSheet(T, back) {
  let list = [];
  try { list = await q(sb.rpc('admin_quiz')); } catch { list = []; }
  if (!Array.isArray(list) || !list.length) { try { list = S.content.quiz || []; } catch {} }
  const beruf = T.beruf, pool = list.filter(x => Array.isArray(x.optionen) && x.optionen.length >= 2 && (!beruf || !x.berufe?.length || x.berufe.includes(beruf)) && (!T.modul || !x.lernfeld || x.lernfeld === T.modul));
  if (!pool.length) { toast('Im Fragenkatalog gibt es keine passenden Fragen.'); return back(); }
  sheetShell('Fragen übernehmen', `<p class="text-[13px] text-muted -mt-1 mb-2">${pool.length} passende Fragen${beruf ? ' für ' + esc(beruf) : ''}${T.modul ? ', Modul ' + T.modul : ''}. Auswählen und übernehmen.</p>
    <div class="card">${pool.slice(0, 120).map((x, i) => `<label class="flex items-start gap-3 p-3 ${i ? 'border-t border-line' : ''}"><input type="checkbox" class="cbx" data-imp="${i}" style="width:20px;height:20px;margin-top:2px;accent-color:var(--accent)"><span class="text-[14px]">${esc(x.frage)}</span></label>`).join('')}</div>
    <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="impBack">Zurück</button><button class="btn" id="impOk">Übernehmen</button></div>`);
  $('#impBack').onclick = back;
  $('#impOk').onclick = () => {
    const sel = $$('[data-imp]').filter(c => c.checked).map(c => pool[+c.dataset.imp]);
    sel.forEach(x => { const idx = x.optionen.map((o, i) => i).sort(() => Math.random() - .5);
      T.fragen.push({ id: qNewId(), typ: 'single', frage: x.frage, optionen: idx.map(i => x.optionen[i]), richtig: [idx.indexOf(+x.richtig || 0)], punkte: 1, loesung: '' }); });
    T.fragen = T.fragen.filter(f => f.frage.trim() || f.typ !== 'single' || f.optionen.some(o => o.trim()));
    toast(`${sel.length} Fragen übernommen`); back();
  };
}

/* ---------- Live starten ---------- */
function qStartSheet(t) {
  if (!t) return;
  const tn = qTnList(), pre = new Set(tn.filter(p => !t.beruf || p.beruf === t.beruf).map(p => p.id));
  sheetShell('Live starten', `<div class="card p-4"><div class="font-semibold text-[15px]">${esc(t.titel)}</div><div class="text-[12px] text-muted tnum">${t.fragen.length} Fragen · ${qMax(t)} Punkte</div></div>
    <form id="qsForm" class="flex flex-col gap-3 mt-3">
      <div><label class="lbl" for="qsD">Zeit in Minuten</label><input id="qsD" type="number" min="1" max="300" class="field" value="${t.dauer_min}"></div>
      <div class="flex items-center justify-between"><div class="eyebrow">Teilnehmende</div><button type="button" class="text-[13px] font-semibold text-accent" id="qsAll">alle</button></div>
      <div class="card">${tn.map((p, i) => `<label class="flex items-center gap-3 p-3 ${i ? 'border-t border-line' : ''}"><input type="checkbox" class="cbx" data-qsp="${p.id}" ${pre.has(p.id) ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)">${avatar(p, 30)}<span class="flex-1 min-w-0"><span class="block text-[14px] font-semibold truncate">${esc(p.full_name)}</span><span class="block text-[12px] text-muted truncate">${esc(Q_KATALOG[qMassOf(p.id)]?.kurz || p.beruf || '')}</span></span></label>`).join('')}</div>
      <button class="btn">Jetzt starten</button>
      <p class="text-[12px] text-muted">Die Ausgewählten sehen den Test sofort in der App. Die Zeit läuft ab dem Start für alle gleich, bei Ablauf wird automatisch abgegeben.</p></form>`);
  $('#qsAll').onclick = () => $$('[data-qsp]').forEach(c => c.checked = true);
  $('#qsForm').onsubmit = async e => {
    e.preventDefault(); const ids = $$('[data-qsp]').filter(c => c.checked).map(c => c.dataset.qsp);
    if (!ids.length) return toast('Bitte Teilnehmende auswählen.');
    try { const sid = await q(sb.rpc('test_starten', { p_test: t.id, p_teilnehmer: ids, p_dauer: +$('#qsD').value || t.dauer_min })); toast('Test gestartet'); await qExtraLoad(); render(); qLiveSheet(sid); } catch (er) { toast(errText(er)); }
  };
}

/* ---------- Live-Ansicht und Auswertung ---------- */
let qLiveTimer = null, qLivePoll = null;
function qStopLive() { clearInterval(qLiveTimer); clearInterval(qLivePoll); qLiveTimer = qLivePoll = null; }
async function qLiveSheet(sid) {
  qStopLive();
  const load = async () => {
    const [s, a] = await Promise.all([q(sb.from('test_sitzungen').select('*').eq('id', sid).single()), q(sb.from('test_abgaben').select('*').eq('sitzung_id', sid))]);
    let t = (S.quali.tests || []).find(x => x.id === s.test_id); if (!t) t = await q(sb.from('tests').select('*').eq('id', s.test_id).maybeSingle());
    return { s, a, t };
  };
  let L; try { L = await load(); } catch (e) { return toast(errText(e)); }
  let ended = false;
  const draw = () => {
    const { s, a, t } = L, max = qMax(t), n = t?.fragen?.length || 0, live = s.status === 'laeuft';
    const left = new Date(s.endet_at) - Date.now();
    const rows = s.teilnehmer.map(id => ({ p: S.profiles[id], x: a.find(r => r.azubi_id === id) })).filter(r => r.p).sort((u, v) => u.p.full_name.localeCompare(v.p.full_name));
    const ab = rows.filter(r => r.x?.abgegeben_at).length;
    sheetShell(s.titel, `
      ${live ? `<div class="card p-4 flex items-center gap-4"><div><div class="text-[12px] text-muted">Restzeit</div><div class="qt-big ${left < 60e3 ? 'qt-clock low' : ''}" id="qlClock">${qClock(left)}</div></div>
        <div class="flex-1 text-[13px] text-muted tnum"><b class="text-fg">${ab}</b> von ${rows.length} abgegeben<div class="qt-prog"><i style="width:${pct(ab, rows.length)}%"></i></div></div></div>
        <div class="grid grid-cols-2 gap-2 mt-2"><button class="btn ghost" id="qlPlus">+ 5 Minuten</button><button class="btn danger" id="qlEnd">Jetzt beenden</button></div>`
      : `<div class="card p-4 flex items-center gap-3"><div class="flex-1 min-w-0"><div class="text-[13px] text-muted tnum">Beendet · ${ab} von ${rows.length} abgegeben · max. ${qNum(max)} Punkte</div>
          <div class="text-[13px] mt-0.5">${s.freigegeben ? 'Ergebnisse sind für die Teilnehmenden sichtbar.' : 'Ergebnisse sind noch nicht freigegeben.'}</div></div></div>
        <div class="grid grid-cols-2 gap-2 mt-2"><button class="btn ${s.freigegeben ? 'ghost' : ''}" id="qlRel">${s.freigegeben ? 'Freigabe zurücknehmen' : 'Ergebnisse freigeben'}</button><button class="btn ghost" id="qlPdf">Ergebnis-PDF</button></div>
        <button class="btn ghost w-full mt-2" id="qlMail">Ergebnis-PDF per E-Mail</button>`}
      <div class="eyebrow mt-4 mb-2">Teilnehmende</div>
      <div class="card">${rows.map(({ p, x }, i) => { const pts = qPts(x, t), open = qOpenText(x, t);
        const stat = !x ? ['', live ? 'noch nicht geöffnet' : 'nicht teilgenommen'] : x.abgegeben_at ? (live ? ['ok', 'abgegeben'] : pts == null ? ['', 'abgegeben'] : [open ? 'warn' : 'ok', `${qNum(pts)} / ${qNum(max)} P.`]) : ['brass', `schreibt · ${x.beantwortet}/${n}`];
        return `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" ${x && !live ? `data-qlans="${p.id}"` : ''}>${avatar(p, 32)}<div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(p.full_name)}</div>
          ${x && live && !x.abgegeben_at ? `<div class="qt-prog"><i style="width:${pct(x.beantwortet, n)}%"></i></div>` : !live && pts != null ? `<div class="text-[12px] text-muted tnum">${Math.round(pts * 100 / (max || 1))} % · Note ${IHK_NOTE(Math.round(pts * 100 / (max || 1)))[1]}${open ? ` · ${open} Freitext offen` : ''}</div>` : ''}</div>
          <span class="chip ${stat[0]} tnum flex-none">${stat[1]}</span></button>`; }).join('')}</div>
      ${!live ? '<p class="text-[12px] text-muted mt-2">Antippen zeigt die Antworten. Freitext bewertest du dort mit Punkten. Note nach dem IHK-Punkteschlüssel.</p>' : '<p class="text-[12px] text-muted mt-2">Die Ansicht aktualisiert sich alle paar Sekunden.</p>'}`);
    const close = $('#shClose'); if (close) { const old = close.onclick; close.onclick = () => { qStopLive(); old?.(); }; }
    if ($('#qlPlus')) $('#qlPlus').onclick = async () => { try { const e = await q(sb.rpc('test_verlaengern', { p_sitzung: sid, p_min: 5 })); L.s.endet_at = e || L.s.endet_at; toast('5 Minuten mehr'); draw(); } catch (er) { toast(errText(er)); } };
    if ($('#qlEnd')) $('#qlEnd').onclick = () => qConfirm($('#qlEnd'), async () => { try { await q(sb.rpc('test_beenden', { p_sitzung: sid })); ended = true; L = await load(); draw(); qStopLive(); } catch (er) { toast(errText(er)); } }, 'Wirklich beenden? Nochmal tippen');
    if ($('#qlRel')) $('#qlRel').onclick = async () => { try { await q(sb.from('test_sitzungen').update({ freigegeben: !L.s.freigegeben }).eq('id', sid)); L.s.freigegeben = !L.s.freigegeben; toast(L.s.freigegeben ? 'Ergebnisse freigegeben' : 'Freigabe zurückgenommen'); draw(); } catch (er) { toast(errText(er)); } };
    if ($('#qlPdf')) $('#qlPdf').onclick = async () => { try { const r = await qResultPdf(L); r.doc.save(r.name); toast('PDF erstellt'); } catch (er) { toast(errText(er)); } finally { PDF_DE = false; } };
    if ($('#qlMail')) $('#qlMail').onclick = () => { qStopLive(); qMailSheet('Ergebnisse per E-Mail', () => qResultPdf(L), `Ergebnisse: ${L.s.titel}`); };
    $$('[data-qlans]').forEach(b => b.onclick = () => { qStopLive(); qAnswerSheet(L, b.dataset.qlans, () => qLiveSheet(sid)); });
  };
  draw();
  if (L.s.status === 'laeuft') {
    qLiveTimer = setInterval(async () => {
      const c = $('#qlClock'); if (!c) return qStopLive();
      const left = new Date(L.s.endet_at) - Date.now(); c.textContent = qClock(left); c.classList.toggle('low', left < 60e3);
      if (left <= -15e3 && !ended) { ended = true; try { await q(sb.rpc('test_beenden', { p_sitzung: sid })); L = await load(); draw(); qStopLive(); go(S.view); } catch {} }
    }, 1000);
    qLivePoll = setInterval(async () => { if (!$('#qlClock')) return qStopLive(); try { L = await load(); if (L.s.status !== 'laeuft') qStopLive(); draw(); } catch {} }, 4000);
  }
}
function qAnswerSheet(L, uid, back) {
  const { s, t } = L, x = L.a.find(r => r.azubi_id === uid), p = S.profiles[uid];
  if (!x || !t) return;
  const ans = x.antworten || {}, man = { ...(x.punkte_manuell || {}) };
  const own = f => { const v = ans[f.id]; return Array.isArray(v) ? v : []; };
  const autoOf = f => { const g = own(f).slice().sort(), r = (f.richtig || []).slice().sort(), pk = +f.punkte || 1;
    if (JSON.stringify(g) === JSON.stringify(r)) return pk; if (f.typ === 'multi' && t.teilpunkte && r.length) { const hit = g.filter(v => r.includes(v)).length, wr = g.length - hit; return Math.round(pk * Math.max(0, hit - wr) / r.length * 100) / 100; } return 0; };
  sheetShell(p?.full_name || 'Antworten', `<div class="text-[13px] text-muted -mt-1 mb-3 tnum">${esc(s.titel)} · ${qNum(qPts(x, t) ?? 0)} von ${qNum(qMax(t))} Punkten${x.abgegeben_at ? ' · abgegeben ' + new Date(x.abgegeben_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
    <div class="flex flex-col gap-3">${t.fragen.map((f, i) => `<div class="qt-q"><div class="eyebrow mb-1">Frage ${i + 1} · ${Q_TYP[f.typ]} · ${f.punkte} P.</div><div class="font-semibold text-[15px] mb-2">${esc(f.frage)}</div>
      ${f.typ === 'text' ? `<div class="text-[14px] p-3 rounded-xl" style="background:var(--sunk);white-space:pre-wrap">${esc(ans[f.id] || '– keine Antwort –')}</div>${f.loesung ? `<div class="text-[12px] text-muted mt-2"><b>Musterlösung:</b> ${esc(f.loesung)}</div>` : ''}
        <div class="flex items-center gap-2 mt-2"><label class="lbl" for="qm${i}" style="margin:0">Punkte</label><input id="qm${i}" type="number" class="field" style="width:90px" min="0" max="${f.punkte}" step="0.5" data-qman="${f.id}" value="${man[f.id] ?? ''}"><span class="text-[12px] text-muted">von ${f.punkte}</span></div>`
      : `<div class="flex flex-col gap-1.5">${f.optionen.map((o, j) => { const chosen = own(f).includes(j), right = (f.richtig || []).includes(j); return `<div class="qt-opt ${right ? 'right' : chosen ? 'wrong' : ''}"><span>${chosen ? '☒' : '☐'}</span><span>${esc(o)}</span></div>`; }).join('')}</div><div class="text-[12px] text-muted mt-1.5 tnum">${qNum(autoOf(f))} von ${qNum(f.punkte)} Punkten</div>`}
    </div>`).join('')}</div>
    <div class="grid grid-cols-2 gap-2 mt-4"><button class="btn ghost" id="qaBack">Zurück</button>${t.fragen.some(f => f.typ === 'text') ? '<button class="btn" id="qaSave">Punkte speichern</button>' : ''}</div>`);
  $('#qaBack').onclick = back;
  if ($('#qaSave')) $('#qaSave').onclick = async () => {
    $$('[data-qman]').forEach(i => { const f = t.fragen.find(z => z.id === i.dataset.qman); if (i.value === '') delete man[i.dataset.qman]; else man[i.dataset.qman] = Math.max(0, Math.min(+f.punkte || 1, +i.value)); });
    try { await q(sb.from('test_abgaben').update({ punkte_manuell: man }).eq('id', x.id)); x.punkte_manuell = man; toast('Punkte gespeichert'); back(); } catch (e) { toast(errText(e)); }
  };
}
async function qResultPdf(L) {
  const { s, a, t } = L, max = qMax(t);
  const P = await qPdfStart(false), { doc, FONT, W, M } = P;
  doc.setFont(FONT, 'bold'); doc.setFontSize(16); doc.text(pdfSafe(`Testergebnis: ${s.titel}`).slice(0, 80), M, 18);
  doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(80);
  doc.text(pdfSafe(`${S.hotel || ''} · ${new Date(s.gestartet_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${t?.fragen.length || 0} Fragen · max. ${max} Punkte`), M, 24); doc.setTextColor(0);
  let y = 34; doc.setFillColor(238, 242, 242); doc.rect(M, y - 5, W - 2 * M, 8, 'F'); doc.setFont(FONT, 'bold'); doc.setFontSize(9);
  const cols = [['Name', M + 2], ['Punkte', M + 86], ['%', M + 108], ['Note', M + 124], ['Abgabe', M + 160]];
  cols.forEach(([l, x]) => doc.text(l, x, y)); y += 8; doc.setFont(FONT, 'normal');
  const rows = s.teilnehmer.map(id => ({ p: S.profiles[id], x: a.find(r => r.azubi_id === id) })).filter(r => r.p).sort((u, v) => u.p.full_name.localeCompare(v.p.full_name));
  rows.forEach(({ p, x }) => {
    const pts = qPts(x, t), pc = pts == null ? null : Math.round(pts * 100 / (max || 1)), open = qOpenText(x, t);
    doc.text(pdfSafe(p.full_name), cols[0][1], y); doc.text(pts == null ? '–' : String(pts).replace('.', ','), cols[1][1], y); doc.text(pc == null ? '–' : pc + ' %', cols[2][1], y);
    doc.text(pc == null ? '–' : `${IHK_NOTE(pc)[1]} (${IHK_NOTE(pc)[0]})`, cols[3][1], y); doc.text(x?.abgegeben_at ? new Date(x.abgegeben_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'nicht teilgenommen', cols[4][1], y);
    if (open) { doc.setFontSize(7.5); doc.setTextColor(138, 80, 11); doc.text(pdfSafe(`${open} Freitext noch nicht bewertet`), cols[0][1], y + 3.5); doc.setTextColor(0); doc.setFontSize(9); y += 3; }
    y += 7; if (y > 270) { doc.addPage(); y = 20; }
  });
  const vals = rows.map(r => qPts(r.x, t)).filter(v => v != null);
  if (vals.length) { y += 4; doc.setFont(FONT, 'bold'); doc.text(pdfSafe(`Durchschnitt: ${String(Math.round(vals.reduce((u, v) => u + v, 0) / vals.length * 10) / 10).replace('.', ',')} von ${max} Punkten`), M, y); doc.setFont(FONT, 'normal'); }
  y += 8; doc.setFontSize(8); doc.setTextColor(90); doc.text(doc.splitTextToSize(pdfSafe('Note nach dem IHK-Punkteschlüssel (100–92 % sehr gut, 91–81 % gut, 80–67 % befriedigend, 66–50 % ausreichend, 49–30 % mangelhaft, darunter ungenügend). Freitext-Antworten bewertet die Trainerin oder der Trainer.'), W - 2 * M), M, y);
  doc.setTextColor(0); P.foot('Testergebnis');
  return { doc, name: `Testergebnis_${pdfFile(s.titel)}.pdf`, subject: `Testergebnis: ${s.titel}` };
}

/* =====================================================================
   Tests für Teilnehmende
   ===================================================================== */
function qMyTestsHTML() {
  const list = S.quali.live || [], now = Date.now();
  const live = list.filter(s => s.status === 'laeuft' && new Date(s.endet_at) > now && !s.abgegeben_at), rest = list.filter(s => !live.includes(s));
  return `${live.length ? `${secTitle('Jetzt', '<span class="chip crit">live</span>')}<div class="card">${live.map((s, i) => `<div class="p-4 ${i ? 'border-t border-line' : ''}"><div class="font-semibold text-[15px]">${esc(s.titel)}</div>
      <div class="text-[12px] text-muted tnum">${s.fragen} Fragen · endet um ${new Date(s.endet_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div><button class="btn w-full mt-3" data-qtake="${s.id}">Test starten</button></div>`).join('')}</div>` : ''}
    ${secTitle('Deine Tests')}
    ${rest.length ? `<div class="card">${rest.map((s, i) => `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-qtake="${s.id}"><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(s.titel)}</div><div class="text-[12px] text-muted tnum">${new Date(s.gestartet_at).toLocaleDateString('de-DE')} · ${s.fragen} Fragen</div></div>
      <span class="chip ${s.freigegeben ? 'ok' : ''}">${s.freigegeben ? 'Ergebnis da' : s.abgegeben_at ? 'abgegeben' : 'beendet'}</span></button>`).join('')}</div>` : live.length ? '' : empty('Hier erscheinen Tests, sobald deine Trainerin oder dein Trainer einen startet.')}`;
}

/* Eigene Kacheln auf der Startseite: Anwesenheit und Tests */
const Q_ICONS = {
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  checklist: '<path d="M4 6.5l1.6 1.6L8.5 5"/><path d="M4 12.5l1.6 1.6L8.5 11"/><path d="M4 18.5l1.6 1.6L8.5 17"/><path d="M11.5 7h8.5M11.5 13h8.5M11.5 19h8.5"/>'
};
function qExtraTilesHTML() {
  try { Object.keys(Q_ICONS).forEach(k => { if (!I[k]) I[k] = Q_ICONS[k]; }); } catch {}
  const H = S.home || {}, tile = (tab, ico, tone, chip, title, sub) => `<button class="card modtile" data-go="${tab === 'tests' ? 'qtests' : 'qanw'}">
      <div class="flex items-center justify-between gap-2"><span class="ico ${tone}">${svg(ico)}</span><span class="chip ${chip[0]} tnum">${esc(chip[1])}</span></div>
      <div><div class="font-display font-bold text-[16px] leading-snug">${title}</div><div class="text-[13px] text-muted mt-0.5">${sub}</div></div></button>`;
  let out = '';
  if (isAzubi()) {
    const live = (H.qLive || []).filter(x => x.status === 'laeuft' && new Date(x.endet_at) > Date.now() && !x.abgegeben_at).length, res = (H.qLive || []).filter(x => x.freigegeben).length;
    out += tile('anw', 'checklist', '', ['', 'Deine Tage'], 'Anwesenheit', 'Deine erfassten Tage und deine Quote');
    out += tile('tests', 'clock', 'brass', live ? ['crit', 'läuft jetzt'] : res ? ['ok', `${res} Ergebnis${res === 1 ? '' : 'se'}`] : ['', 'Tests'], 'Tests', live ? 'Ein Test läuft – jetzt starten' : 'Tests mit Zeitlimit und deine Ergebnisse');
    return out;
  }
  const tn = qTnList().filter(p => canSchool(p));
  if (tn.length) {
    const done = new Set((H.qAnw || []).map(a => a.azubi_id)), offen = tn.filter(p => !done.has(p.id)).length, wd = new Date().getDay(), we = wd === 0 || wd === 6;
    out += tile('anwesenheit', 'checklist', '', we ? ['', 'Wochenende'] : offen ? ['warn', `${offen} offen heute`] : ['ok', 'heute erfasst'], 'Anwesenheit', 'Tagesliste erfassen, als PDF oder per E-Mail');
  }
  if (qCanTests()) {
    const live = (H.qSitz || []).filter(x => new Date(x.endet_at) > Date.now() - 45e3).length;
    out += tile('tests', 'clock', 'brass', live ? ['crit', `${live} läuft`] : ['', 'Tests'], 'Tests', 'Erstellen, live mit Timer durchführen, auswerten');
  }
  return out;
}

/* Home-Hinweis: laufender Test */
function qLiveHomeHTML() {
  const s = (S.home?.qLive || []).find(x => x.status === 'laeuft' && new Date(x.endet_at) > Date.now() && !x.abgegeben_at);
  if (!s) return '';
  return `<button class="card w-full p-4 mt-3 text-left" style="border-color:var(--crit)" data-qtake="${s.id}"><div class="flex items-center gap-2"><span class="chip crit">live</span><span class="font-semibold text-[15px] flex-1 min-w-0 truncate">Test läuft: ${esc(s.titel)}</span>${svg('arrow', 'w-4 h-4 text-muted')}</div>
    <div class="text-[13px] text-muted mt-1 tnum">${s.fragen} Fragen · endet um ${new Date(s.endet_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · jetzt antippen und starten</div></button>`;
}

let qTakeTimer = null, qSaveT = null;
async function qTakeTest(sid) {
  clearInterval(qTakeTimer);
  let D; try { D = await q(sb.rpc('test_fragen', { p_sitzung: sid })); } catch (e) { return toast(errText(e)); }
  const offset = new Date(D.now) - Date.now();
  const remaining = () => new Date(D.endet_at) - (Date.now() + offset);
  const ans = { ...(D.antworten || {}) };
  const running = D.status === 'laeuft' && !D.abgegeben_at && remaining() > 0 && D.fragen.length;
  let order = D.fragen.map((f, i) => i);
  if (running && D.zufall) { const seed = [...(sid + S.me.id)].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7); order = order.map(i => [i, (Math.imul(seed ^ (i + 1), 2654435761) >>> 0)]).sort((a, b) => a[1] - b[1]).map(x => x[0]); }
  const answered = () => D.fragen.filter(f => { const v = ans[f.id]; return Array.isArray(v) ? v.length : typeof v === 'string' && v.trim(); }).length;
  const save = async final => { try { await q(sb.rpc('test_speichern', { p_sitzung: sid, p_antworten: ans, p_abgeben: !!final })); return true; } catch (e) { toast(errText(e)); return false; } };
  const queueSave = () => { clearTimeout(qSaveT); qSaveT = setTimeout(() => save(false), 1200); };
  const finish = async auto => { clearInterval(qTakeTimer); clearTimeout(qSaveT); const ok = await save(true); if (ok) { toast(auto ? 'Zeit abgelaufen – automatisch abgegeben' : 'Test abgegeben'); D.abgegeben_at = new Date().toISOString(); drawDone(); if (['quali', 'qtests', 'home'].includes(S.view)) go(S.view); } };
  const drawDone = () => {
    if (D.freigegeben && D.fragen.length) {
      const man = D.punkte_manuell || {}, pts = (+D.punkte_auto || 0) + Object.values(man).reduce((s, v) => s + (+v || 0), 0), max = D.fragen.reduce((s, f) => s + (+f.punkte || 1), 0);
      sheetShell(D.titel, `<div class="card p-5 text-center"><div class="font-display font-bold text-[22px] tnum">${qNum(pts)} von ${qNum(max)} Punkten</div><div class="mt-1"><span class="chip ${pts * 100 / max >= 50 ? 'ok' : 'crit'}">Note ${IHK_NOTE(Math.round(pts * 100 / max))[1]} · ${IHK_NOTE(Math.round(pts * 100 / max))[0]}</span></div></div>
        <div class="flex flex-col gap-3 mt-3">${D.fragen.map((f, i) => `<div class="qt-q"><div class="eyebrow mb-1">Frage ${i + 1} · ${f.punkte} P.</div><div class="font-semibold text-[15px] mb-2">${esc(f.frage)}</div>
          ${f.typ === 'text' ? `<div class="text-[14px] p-3 rounded-xl" style="background:var(--sunk);white-space:pre-wrap">${esc(ans[f.id] || '– keine Antwort –')}</div>${f.loesung ? `<div class="text-[12px] text-muted mt-2"><b>Musterlösung:</b> ${esc(f.loesung)}</div>` : ''}<div class="text-[12px] text-muted mt-1">${man[f.id] != null ? qNum(man[f.id]) + ' von ' + qNum(f.punkte) + ' Punkten' : 'noch nicht bewertet'}</div>`
          : `<div class="flex flex-col gap-1.5">${f.optionen.map((o, j) => { const ch = (ans[f.id] || []).includes(j), r = (f.richtig || []).includes(j); return `<div class="qt-opt ${r ? 'right' : ch ? 'wrong' : ''}"><span>${ch ? '☒' : '☐'}</span><span>${esc(o)}</span></div>`; }).join('')}</div>`}</div>`).join('')}</div>`);
    } else sheetShell(D.titel, `<div class="card p-5 text-center"><div class="font-display font-bold text-[20px]">${D.abgegeben_at ? 'Abgegeben' : 'Test beendet'}</div><p class="text-[14px] text-muted mt-1">Deine Trainerin oder dein Trainer wertet aus. Sobald die Ergebnisse freigegeben sind, siehst du hier Punkte und Lösungen.</p></div>`);
  };
  if (!running) return drawDone();
  const draw = () => {
    sheetShell(D.titel, `<div class="qt-timer"><div class="qt-clock" id="qtClock">${qClock(remaining())}</div><div class="flex-1 text-[12px] text-muted tnum"><span id="qtCount">${answered()}</span> von ${D.fragen.length} beantwortet<div class="qt-prog"><i id="qtBar" style="width:${pct(answered(), D.fragen.length)}%"></i></div></div></div>
      <div class="flex flex-col gap-3">${order.map((oi, n) => { const f = D.fragen[oi]; const v = ans[f.id]; return `<div class="qt-q"><div class="eyebrow mb-1">Frage ${n + 1} · ${f.typ === 'multi' ? 'mehrere Antworten möglich' : f.typ === 'text' ? 'Antwort schreiben' : 'eine Antwort'} · ${f.punkte} P.</div><div class="font-semibold text-[15px] mb-2">${esc(f.frage)}</div>
        ${f.typ === 'text' ? `<textarea class="field" rows="4" maxlength="4000" data-qta="${f.id}" aria-label="Antwort zu Frage ${n + 1}">${esc(typeof v === 'string' ? v : '')}</textarea>`
          : `<div class="flex flex-col gap-1.5" role="${f.typ === 'multi' ? 'group' : 'radiogroup'}">${f.optionen.map((o, j) => `<label class="qt-opt"><input type="${f.typ === 'multi' ? 'checkbox' : 'radio'}" name="q_${f.id}" data-qto="${f.id}:${j}" ${(v || []).includes(j) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`}</div>`; }).join('')}</div>
      <button class="btn w-full mt-4" id="qtSubmit">Abgeben</button><p class="text-[12px] text-muted mt-2">Antworten werden laufend gespeichert. Wenn die Zeit abläuft, wird automatisch abgegeben.</p>`);
    const upd = () => { $('#qtCount') && ($('#qtCount').textContent = answered()); $('#qtBar') && ($('#qtBar').style.width = pct(answered(), D.fragen.length) + '%'); };
    $$('[data-qto]').forEach(i => i.onchange = () => { const [fid, j] = i.dataset.qto.split(':'), f = D.fragen.find(x => x.id === fid);
      ans[fid] = f.typ === 'multi' ? $$(`[data-qto^="${fid}:"]`).filter(c => c.checked).map(c => +c.dataset.qto.split(':')[1]) : [+j]; upd(); queueSave(); });
    $$('[data-qta]').forEach(t => t.oninput = () => { ans[t.dataset.qta] = t.value; upd(); queueSave(); });
    $('#qtSubmit').onclick = () => { const miss = D.fragen.length - answered(); qConfirm($('#qtSubmit'), () => finish(false), miss ? `${miss} Fragen offen – trotzdem abgeben?` : 'Wirklich abgeben? Nochmal tippen'); };
  };
  draw();
  qTakeTimer = setInterval(() => {
    const c = $('#qtClock'); const left = remaining();
    if (c) { c.textContent = qClock(left); c.classList.toggle('low', left < 60e3); }
    if (left <= 0) finish(true);
    else if (!c) { clearInterval(qTakeTimer); save(false); }
  }, 1000);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-qtake]'); if (b && S.view !== 'qtests') { e.preventDefault(); qTakeTest(b.dataset.qtake); } });

/* Startseite der Teilnehmenden: alle 20 Sekunden prüfen, ob ein Test gestartet wurde */
setInterval(async () => {
  try {
    if (!S.me || S.view !== 'home' || !isQuali() || !isAzubi() || document.hidden || !$('#sheet').hidden) return;
    const live = await q(sb.rpc('test_live')), key = l => (l || []).filter(x => x.status === 'laeuft' && !x.abgegeben_at).map(x => x.id).join();
    if (key(live) !== key(S.home?.qLive)) { S.home.qLive = live; render(); }
  } catch {}
}, 20000);
