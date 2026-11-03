/* Desk · Qualifizierungsmodus, Teil 9
   – Import aus e-bizA, Excel oder CSV (Teilnehmende, Anwesenheit)
   – Bescheinigungen als PDF (Teilnahme, Fehlzeiten, Modul)
   – Qualität nach AZAV: Feedback am Modulende, Auswertung, Maßnahmen-Protokoll
   – Klassenbuch: Abzeichnung durch Trainer, Gegenzeichnung durch Koordination, fehlende Tage
   – Stundenkonto aus dem Dienstplan, Räume und Werkstattplätze buchen, Kalender-Export (.ics)
   – Lernmaterial je Modul (auch offline), Lesehilfe: Vorlesen und Begriffe in einfacher Sprache
   Wird nach quali8.js und vor dem Hauptskript geladen. */

(() => {
  const css = `
  .q9-tab{border-collapse:collapse;font-size:12.5px;width:100%}
  .q9-tab th,.q9-tab td{border-top:1px solid var(--line);padding:7px 6px;text-align:left;vertical-align:top}
  .q9-tab thead th{font-size:11px;color:var(--muted);border-top:0}
  .q9-tab td.c,.q9-tab th.c{text-align:center}
  .rb-grid{display:grid;grid-template-columns:110px repeat(5,minmax(96px,1fr));min-width:620px}
  .rb-grid > div{border-top:1px solid var(--line);padding:6px;font-size:12px}
  .rb-grid .hd{font-size:11px;color:var(--muted);font-weight:600;border-top:0}
  .rb-cell{min-height:52px;cursor:pointer;display:flex;flex-direction:column;gap:3px}
  .rb-cell:hover{background:color-mix(in srgb,var(--accent) 6%,transparent)}
  .rb-b{border-radius:6px;padding:2px 5px;font-size:11px;font-weight:600;background:color-mix(in srgb,var(--accent) 14%,var(--surface));line-height:1.25}
  .rb-b.x{background:color-mix(in srgb,var(--crit) 18%,var(--surface));color:var(--crit)}
  .stars{display:flex;gap:4px}
  .stars button{width:40px;height:40px;border-radius:10px;border:1px solid var(--line);font-weight:700;font-size:15px;background:var(--surface)}
  .stars button[aria-pressed="true"]{background:var(--accent);color:#fff;border-color:var(--accent)}
  .lh-btn{position:fixed;left:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:40;width:48px;height:48px;border-radius:999px;background:var(--surface);border:1px solid var(--line);box-shadow:0 4px 14px rgba(0,0,0,.14);display:flex;align-items:center;justify-content:center;color:var(--fg)}
  @media (min-width:1024px){.lh-btn{bottom:20px}}
  .lh-btn[aria-pressed="true"]{background:var(--accent);color:#fff;border-color:var(--accent)}
  .gl-term{text-decoration:underline dotted;text-underline-offset:3px;cursor:help;background:none;border:0;padding:0;font:inherit;color:inherit}
  .gl-pop{position:fixed;z-index:60;max-width:320px;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:12px 14px;font-size:14px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

const q9Team = () => { try { return isAdmin() || qCanTeam(); } catch { return false; } };
const q9Uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const q9Safe = n => String(n || 'datei').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.\-]+/g, '_').slice(-80) || 'datei';
const q9Dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
const q9KatName = k => Q_KATALOG[k]?.kurz || k || '–';

/* =====================================================================
   Verwaltung: zusätzliche Reiter (Räume, Lernmaterial, Qualität, Import)
   ===================================================================== */
(() => {
  const i = ORG_VERW_TABS0.findIndex(t => t[0] === 'rechte');
  ORG_VERW_TABS0.splice(i < 0 ? ORG_VERW_TABS0.length : i, 0, ['raeume', 'Räume'], ['material', 'Lernmaterial'], ['azav', 'Qualität'], ['import', 'Import']);
})();
const Q9_TEAM = new Set(['azav', 'import']);
const q9VerwTabs = () => orgVerwTabs().filter(([k]) => !Q9_TEAM.has(k) || q9Team());
const Q9_TABS = {
  raeume: { html: () => q9RaeumeHTML(), bind: () => q9RaeumeBind(), load: () => q9RaeumeLoad() },
  material: { html: () => q9MatAdminHTML(), bind: () => q9MatAdminBind(), load: () => q9MatLoad() },
  azav: { html: () => q9AzavHTML(), bind: () => q9AzavBind(), load: () => q9AzavLoad() },
  import: { html: () => q9ImpHTML(), bind: () => q9ImpBind(), load: async () => {} }
};
(() => {
  const vh = QVerwView.html, vb = QVerwView.bind;
  QVerwView.html = function () {
    const t = S.org.tab;
    if (!Q9_TABS[t] && !['verw', 'gruppen', 'kurse', 'rechte', 'exp'].includes(t)) S.org.tab = 'verw';
    const seg = `<div class="seg mt-4 mb-1">${q9VerwTabs().map(([k, l]) => `<button aria-pressed="${S.org.tab === k}" data-otab="${k}">${l}</button>`).join('')}</div>`;
    const head = `<h1 class="text-[26px] font-bold mt-1">${ORG_VIEWS.qverw[0]}</h1><p class="text-[14px] text-muted mt-1">${ORG_VIEWS.qverw[1]}</p>`;
    if (Q9_TABS[S.org.tab]) return head + seg + Q9_TABS[S.org.tab].html();
    const h = vh.call(this), i = h.indexOf('<div class="seg mt-4 mb-1">'), j = i < 0 ? -1 : h.indexOf('</div>', i);
    return i < 0 ? h : head + seg + h.slice(j + 6);
  };
  QVerwView.bind = function () {
    if (Q9_TABS[S.org.tab]) { $$('[data-otab]').forEach(b => b.onclick = () => { S.org.vtab = b.dataset.otab; go('qverw'); }); Q9_TABS[S.org.tab].bind(); return; }
    vb.call(this);
  };
})();
const q9OrgLoad0 = orgLoad;
orgLoad = async function () {
  if (Q9_TABS[S.org?.tab]) { await Q9_TABS[S.org.tab].load(); return; }
  await q9OrgLoad0();
};

/* =====================================================================
   1) Import aus e-bizA, Excel (.xlsx) oder CSV
   ===================================================================== */
const IMP_ZIELE = {
  tn: { label: 'Teilnehmende', felder: [['name', 'Name (Vor- und Nachname)', 1, /^(name|teilnehmer|tn|vollst|person)/i], ['vorname', 'Vorname', 0, /^vor/i], ['nachname', 'Nachname', 0, /^(nach|famil|zuname)/i],
    ['email', 'E-Mail', 1, /mail/i], ['massnahme', 'Maßnahme / Beruf', 0, /(ma(ss|ß)nahme|beruf|kurs|tq|qualif)/i], ['beginn', 'Beginn', 0, /(beginn|start|eintritt|von)/i], ['gruppe', 'Gruppe', 0, /(gruppe|klasse|lehrgang)/i]] },
  anw: { label: 'Anwesenheit', felder: [['name', 'Name', 0, /^(name|teilnehmer|tn|person)/i], ['email', 'E-Mail', 0, /mail/i], ['datum', 'Datum', 1, /(datum|tag|date)/i],
    ['status', 'Status (anwesend, entschuldigt …)', 1, /(status|anwes|fehl|art)/i], ['notiz', 'Bemerkung', 0, /(bemerk|notiz|grund|begr)/i]] }
};
function impParseCsv(txt) {
  txt = txt.replace(/^\uFEFF/, '');
  const first = txt.split(/\r?\n/)[0] || '', sep = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cur = '', q2 = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q2) { if (c === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q2 = false; else cur += c; continue; }
    if (c === '"') q2 = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}
async function impParseXlsx(buf) {
  await loadScript('./vendor/jszip.min.js');
  const zip = await JSZip.loadAsync(buf), dp = new DOMParser();
  const ss = zip.file('xl/sharedStrings.xml') ? [...dp.parseFromString(await zip.file('xl/sharedStrings.xml').async('string'), 'application/xml').getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  const wb = dp.parseFromString(await zip.file('xl/workbook.xml').async('string'), 'application/xml');
  const rels = dp.parseFromString(await zip.file('xl/_rels/workbook.xml.rels').async('string'), 'application/xml');
  const sh = wb.getElementsByTagName('sheet')[0], rid = sh?.getAttribute('r:id') || sh?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const rel = [...rels.getElementsByTagName('Relationship')].find(r => r.getAttribute('Id') === rid);
  const path = 'xl/' + String(rel?.getAttribute('Target') || 'worksheets/sheet1.xml').replace(/^\/?xl\//, '').replace(/^\//, '');
  const doc = dp.parseFromString(await zip.file(path).async('string'), 'application/xml');
  const colIdx = ref => { const m = /^([A-Z]+)/.exec(ref || ''); let n = 0; for (const ch of (m ? m[1] : 'A')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const out = [];
  [...doc.getElementsByTagName('row')].forEach(r => {
    const row = [];
    [...r.getElementsByTagName('c')].forEach(c => {
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent ?? '', is = c.getElementsByTagName('is')[0];
      row[colIdx(c.getAttribute('r'))] = t === 's' ? (ss[+v] ?? '') : t === 'inlineStr' ? (is ? [...is.getElementsByTagName('t')].map(x => x.textContent).join('') : '') : v;
    });
    out.push(Array.from(row, x => x ?? ''));
  });
  return out.filter(r => r.some(x => String(x).trim()));
}
function impDate(v) {
  const s = String(v || '').trim(); if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(s); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  if (/^\d{4,5}(\.\d+)?$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 864e5); return d.toISOString().slice(0, 10); }
  return null;
}
function impStatus(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  if (/^(a|x|1|ja|anw|da|präsent|praes)/.test(s)) return 'anwesend';
  if (/^(v|versp|zu sp)/.test(s)) return 'verspaetet';
  if (/^(ue|unent|f$|fehlt|fehl|0|nein)/.test(s) || s === 'u') return 'unentschuldigt';
  if (/^(e|ent|k|krank|au)/.test(s)) return 'entschuldigt';
  if (/^(ur|url)/.test(s)) return 'urlaub';
  if (/^(fr|frei|feiert)/.test(s)) return 'frei';
  return null;
}
function impMass(v) {
  const s = String(v || '').trim().toLowerCase(); if (!s) return null;
  const e = Object.entries(Q_KATALOG).find(([k, x]) => k.toLowerCase() === s || (x.kurz || '').toLowerCase() === s)
    || Object.entries(Q_KATALOG).find(([, x]) => [x.kurz, x.beruf, x.fachrichtung].filter(Boolean).some(t => t.toLowerCase().includes(s) || s.includes(t.toLowerCase().split('/')[0].split(' ')[0])));
  return e ? e[0] : null;
}
function q9ImpHTML() {
  if (!q9Team()) return empty('Den Import darf die Koordination nutzen.');
  const I = S.org.imp || {}, Z = IMP_ZIELE[I.ziel || 'tn'];
  const head = I.rows ? I.rows[0] || [] : [];
  const sel = (k, req) => `<select class="field" data-impmap="${k}"><option value="">– ${req ? 'bitte wählen' : 'nicht übernehmen'} –</option>${head.map((h, i) => `<option value="${i}" ${String(I.map?.[k]) === String(i) ? 'selected' : ''}>${esc(String(h || 'Spalte ' + (i + 1)))}</option>`).join('')}</select>`;
  const prev = I.rows ? impBuild(I) : null;
  return `<div class="card p-4 mt-3 flex flex-col gap-3">
      <p class="text-[14px]">Übernimm Daten aus <b>e-bizA</b> oder einem anderen Programm. Exportiere dort eine Liste als <b>Excel (.xlsx)</b> oder <b>CSV</b> und lade sie hier hoch. Die erste Zeile muss die Spaltennamen enthalten.</p>
      <div class="seg">${Object.entries(IMP_ZIELE).map(([k, z]) => `<button aria-pressed="${(I.ziel || 'tn') === k}" data-impziel="${k}">${z.label}</button>`).join('')}</div>
      <div><label class="lbl" for="impFile">Datei</label><input id="impFile" type="file" class="field" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
        ${I.file ? `<p class="text-[12px] text-muted mt-1">${esc(I.file)} · ${Math.max(0, (I.rows?.length || 1) - 1)} Zeilen</p>` : ''}</div>
      ${I.rows ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${Z.felder.map(([k, l, req]) => `<div><label class="lbl">${esc(l)}${req ? '' : ' <span class="font-normal text-muted">(optional)</span>'}</label>${sel(k, req)}</div>`).join('')}</div>` : ''}
      ${(I.ziel || 'tn') === 'tn' ? `<p class="text-[12px] text-muted">Teilnehmende ohne Konto bekommen eine Einladung: Sie registrieren sich mit dem Code eures Standorts und genau dieser E-Mail-Adresse, dann sind Gruppe, Maßnahme und Beginn schon eingetragen. Wer schon ein Konto hat, wird direkt zugeordnet. Fehlende Gruppen werden angelegt.</p>` : `<p class="text-[12px] text-muted">Zuordnung über E-Mail oder Namen. Vorhandene Einträge für denselben Tag werden überschrieben. Erkannt werden z. B. anwesend/A/X, verspätet/V, entschuldigt/E/krank, unentschuldigt/U/fehlt, Urlaub, frei.</p>`}
    </div>
    ${prev ? `${secTitle('Vorschau', `<span class="chip ${prev.ok.length ? 'ok' : ''} tnum">${prev.ok.length} ok</span>${prev.bad.length ? ` <span class="chip warn tnum">${prev.bad.length} mit Fehler</span>` : ''}`)}
      <div class="card overflow-x-auto"><table class="q9-tab"><thead><tr><th>#</th>${prev.cols.map(c => `<th>${esc(c)}</th>`).join('')}<th>Hinweis</th></tr></thead><tbody>
        ${[...prev.bad, ...prev.ok].slice(0, 40).map(r => `<tr><td class="tnum">${r.n}</td>${prev.cols.map(c => `<td>${esc(r.show[c] ?? '')}</td>`).join('')}<td style="color:${r.err ? 'var(--crit)' : 'var(--muted)'}">${esc(r.err || r.hint || '')}</td></tr>`).join('')}</tbody></table></div>
      ${prev.ok.length + prev.bad.length > 40 ? `<p class="text-[12px] text-muted mt-1">Gezeigt werden 40 von ${prev.ok.length + prev.bad.length} Zeilen.</p>` : ''}
      <button class="btn w-full mt-3" id="impGo" ${prev.ok.length ? '' : 'disabled'}>${prev.ok.length} ${prev.ok.length === 1 ? 'Zeile' : 'Zeilen'} übernehmen</button>
      ${I.result ? `<div class="card p-4 mt-3 text-[14px]" style="background:var(--ok-soft)">${esc(I.result)}</div>` : ''}` : ''}`;
}
function impBuild(I) {
  const Z = IMP_ZIELE[I.ziel || 'tn'], map = I.map || {}, rows = (I.rows || []).slice(1), get = (r, k) => map[k] === '' || map[k] == null ? '' : String(r[+map[k]] ?? '').trim();
  const ok = [], bad = [];
  const people = qTnList(), byMail = {}, byName = {};
  people.forEach(p => { const m = (p.kontakt_email || S.org.mails?.[p.id] || '').toLowerCase(); if (m) byMail[m] = p; byName[(p.full_name || '').toLowerCase().replace(/\s+/g, ' ')] = p; });
  rows.forEach((r, i) => {
    const n = i + 2;
    if ((I.ziel || 'tn') === 'tn') {
      const name = get(r, 'name') || [get(r, 'vorname'), get(r, 'nachname')].filter(Boolean).join(' '), email = get(r, 'email').toLowerCase();
      const mass = get(r, 'massnahme'), mk = impMass(mass), beginn = impDate(get(r, 'beginn')), gruppe = get(r, 'gruppe');
      const show = { Name: name, 'E-Mail': email, Maßnahme: mk ? q9KatName(mk) : mass, Beginn: beginn ? fmtDate(beginn) : get(r, 'beginn'), Gruppe: gruppe };
      let err = !name ? 'Name fehlt' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'E-Mail fehlt oder ungültig' : mass && !mk ? 'Maßnahme nicht erkannt' : get(r, 'beginn') && !beginn ? 'Datum nicht erkannt' : '';
      const p = byMail[email];
      (err ? bad : ok).push({ n, show, err, hint: p ? 'hat schon ein Konto – wird zugeordnet' : 'bekommt eine Einladung', data: { name, email, mk, beginn, gruppe, pid: p?.id } });
    } else {
      const name = get(r, 'name'), email = get(r, 'email').toLowerCase(), datum = impDate(get(r, 'datum')), status = impStatus(get(r, 'status')), notiz = get(r, 'notiz').slice(0, 300);
      const p = (email && byMail[email]) || byName[name.toLowerCase().replace(/\s+/g, ' ')];
      const show = { Person: name || email, Datum: datum ? fmtDate(datum) : get(r, 'datum'), Status: status ? ANW[status][1] : get(r, 'status'), Bemerkung: notiz };
      const err = !p ? 'Person nicht gefunden' : !datum ? 'Datum nicht erkannt' : !status ? 'Status nicht erkannt' : !canSchool(p) ? 'Keine Berechtigung für diese Person' : '';
      (err ? bad : ok).push({ n, show, err, hint: p?.full_name, data: { pid: p?.id, datum, status, notiz } });
    }
  });
  return { ok, bad, cols: (I.ziel || 'tn') === 'tn' ? ['Name', 'E-Mail', 'Maßnahme', 'Beginn', 'Gruppe'] : ['Person', 'Datum', 'Status', 'Bemerkung'] };
}
function impAutoMap(I) {
  const head = (I.rows?.[0] || []).map(h => String(h || '').trim()), map = {};
  IMP_ZIELE[I.ziel || 'tn'].felder.forEach(([k, , , re]) => { const i = head.findIndex((h, j) => re.test(h) && !Object.values(map).includes(String(j))); if (i >= 0) map[k] = String(i); });
  if (map.name != null && map.vorname != null && map.name === map.vorname) delete map.name;
  I.map = map;
}
function q9ImpBind() {
  const I = S.org.imp ||= { ziel: 'tn' };
  $$('[data-impziel]').forEach(b => b.onclick = () => { I.ziel = b.dataset.impziel; I.result = ''; if (I.rows) impAutoMap(I); render(); });
  $('#impFile') && ($('#impFile').onchange = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      if (/\.xlsx$/i.test(f.name)) I.rows = await impParseXlsx(buf);
      else { let txt; try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { txt = new TextDecoder('windows-1252').decode(buf); } I.rows = impParseCsv(txt); }
      if (!I.rows.length) return toast('Die Datei ist leer.');
      if (I.rows.length > 5001) { I.rows = I.rows.slice(0, 5001); toast('Es werden höchstens 5000 Zeilen übernommen.'); }
      I.file = f.name; I.result = ''; impAutoMap(I);
      if (I.ziel === 'tn' && isAdmin()) { try { const { data } = await sb.rpc('admin_users'); S.org.mails = Object.fromEntries((data || []).map(u => [u.id, u.email])); } catch {} }
      render();
    } catch (er) { toast('Die Datei konnte nicht gelesen werden. Bitte als .xlsx oder .csv speichern.'); }
  });
  $$('[data-impmap]').forEach(s => s.onchange = () => { I.map[s.dataset.impmap] = s.value; I.result = ''; render(); });
  $('#impGo') && ($('#impGo').onclick = async e => {
    const btn = e.currentTarget, prev = impBuild(I); btn.disabled = true; btn.textContent = 'Wird übernommen …';
    let a = 0, b = 0, c = 0, g = 0, err = 0;
    try {
      if (I.ziel === 'tn') {
        const groups = S.qgr?.g || [], gid = {};
        for (const name of [...new Set(prev.ok.map(r => r.data.gruppe).filter(Boolean))]) {
          let gr = groups.find(x => x.name.toLowerCase() === name.toLowerCase());
          if (!gr) { gr = await q(sb.from('quali_gruppen').insert({ betrieb_id: orgBetrieb(), name: name.slice(0, 80), trainer_id: S.me.id }).select().single()); g++; }
          gid[name.toLowerCase()] = gr.id;
        }
        const open = await q(sb.from('einladungen').select('email').is('eingeloest_at', null));
        const offen = new Set(open.map(x => (x.email || '').toLowerCase()));
        for (const r of prev.ok) {
          const d = r.data, gruppe_id = d.gruppe ? gid[d.gruppe.toLowerCase()] : null;
          try {
            if (d.pid) {
              const t = (S.quali.rows || []).find(x => x.azubi_id === d.pid);
              const row = { ...(gruppe_id ? { gruppe_id } : {}), ...(d.mk ? { massnahme: d.mk } : {}), ...(d.beginn ? { beginn: d.beginn } : {}), updated_at: new Date().toISOString() };
              if (t) await q(sb.from('quali_teilnahmen').update(row).eq('id', t.id));
              else await q(sb.from('quali_teilnahmen').insert({ ...row, azubi_id: d.pid, betrieb_id: orgBetrieb(), massnahme: d.mk || '', module: [], pruefung: {} }));
              b++;
            } else if (!offen.has(d.email)) {
              await q(sb.from('einladungen').insert({ betrieb_id: orgBetrieb(), email: d.email, full_name: d.name.slice(0, 80), beruf: d.mk ? Q_KATALOG[d.mk].beruf : null, start_datum: d.beginn, gruppe_id, massnahme: d.mk, created_by: S.me.id }));
              offen.add(d.email); a++;
            } else c++;
          } catch { err++; }
        }
        I.result = `Fertig: ${a} Einladungen angelegt, ${b} vorhandene Konten zugeordnet${c ? `, ${c} schon eingeladen (übersprungen)` : ''}${g ? `, ${g} neue Gruppen` : ''}${err ? `, ${err} Fehler` : ''}.`;
      } else {
        const list = prev.ok.map(r => ({ betrieb_id: orgBetrieb(), azubi_id: r.data.pid, datum: r.data.datum, status: r.data.status, notiz: r.data.notiz || null, erfasst_von: S.me.id, updated_at: new Date().toISOString() }));
        for (let i = 0; i < list.length; i += 500) { await q(sb.from('anwesenheit').upsert(list.slice(i, i + 500), { onConflict: 'azubi_id,datum' })); a += Math.min(500, list.length - i); }
        I.result = `Fertig: ${a} Anwesenheitseinträge übernommen.`;
      }
      toast('Import abgeschlossen');
      await qGroupsLoad().catch(() => {});
    } catch (er) { toast(errText(er)); I.result = 'Abgebrochen: ' + errText(er); }
    render();
  });
}

/* =====================================================================
   3) Bescheinigungen (Teilnahme, Fehlzeiten, Modul) als PDF
   ===================================================================== */
const q9OrgTnSheet0 = orgTnSheet;
orgTnSheet = function (uid) {
  q9OrgTnSheet0(uid);
  const box = $('#sheet .grid.grid-cols-2.gap-2.mt-3:last-of-type') || [...$$('#sheet .grid.grid-cols-2')].pop();
  if (box && !$('#otBesch')) { const b = document.createElement('button'); b.className = 'btn ghost col-span-2'; b.id = 'otBesch'; b.textContent = 'Bescheinigungen (PDF)'; b.onclick = () => q9BeschSheet(uid); box.appendChild(b); }
};
async function q9Briefkopf() {
  if (S.org.bk9 != null) return S.org.bk9;
  try { const r = await sb.from('app_config').select('value').eq('key', 'app').maybeSingle(); S.org.bk9 = r.data?.value?.briefkopf || ''; } catch { S.org.bk9 = ''; }
  return S.org.bk9;
}
async function q9BeschSheet(uid) {
  const p = S.profiles[uid], t = qOf(uid) || {}, k = qKat(t), ms = k ? qMods(t) : [], mon = localDate().slice(0, 7);
  const bk = await q9Briefkopf();
  sheetShell('Bescheinigungen', `<div class="text-[13px] text-muted -mt-1 mb-3">${esc(p?.full_name || '')}${k ? ' · ' + esc(k.kurz) : ''}</div>
    <div class="card p-4 flex flex-col gap-3">
      <div><label class="lbl" for="bsArt">Art</label><select id="bsArt" class="field"><option value="teil">Teilnahmebescheinigung</option><option value="fehl">Fehlzeitenbescheinigung (Monat)</option>${ms.length ? '<option value="modul">Modulbescheinigung</option>' : ''}</select></div>
      <div id="bsMonW"><label class="lbl" for="bsMon">Monat</label><input id="bsMon" type="month" class="field" value="${mon}"></div>
      <div id="bsModW" hidden><label class="lbl" for="bsMod">Modul</label><select id="bsMod" class="field">${ms.map(m => `<option value="${m.nr}">${k.module.length > 1 ? 'TQ ' + m.nr + ': ' : ''}${esc(m.titel)} (${esc((qModStat[m.status || 'offen'] || qModStat.offen)[1])})</option>`).join('')}</select></div>
      <div><label class="lbl" for="bsBk">Briefkopf <span class="font-normal text-muted">(Name und Anschrift des Trägers, eine Angabe je Zeile)</span></label><textarea id="bsBk" class="field" rows="3" maxlength="400" placeholder="Bildungsträger GmbH&#10;Musterstraße 1&#10;12345 Musterstadt">${esc(bk)}</textarea>
        ${q9Team() ? '<label class="flex items-center gap-2 text-[13px] mt-1"><input type="checkbox" id="bsBkSave" class="cbx"> als Vorgabe für alle speichern</label>' : ''}</div>
      <div class="grid grid-cols-2 gap-2"><button class="btn" id="bsOne">PDF erstellen</button><button class="btn ghost" id="bsGrp">Für ganze Gruppe</button></div>
      <p class="text-[12px] text-muted">Die Bescheinigung enthält Platz für Ort, Datum, Unterschrift und Stempel. Fehlzeiten werden ohne Gründe oder Diagnosen ausgewiesen.</p>
    </div>`);
  const sw = () => { const a = $('#bsArt').value; $('#bsMonW').hidden = a !== 'fehl'; $('#bsModW').hidden = a !== 'modul'; $('#bsGrp').hidden = a === 'modul'; };
  $('#bsArt').onchange = sw; sw();
  const run = async (all, btn) => {
    btn.disabled = true;
    try {
      const bkTxt = $('#bsBk').value.trim();
      if ($('#bsBkSave')?.checked) { const cur = await sb.from('app_config').select('value').eq('key', 'app').maybeSingle(); await q(sb.from('app_config').upsert({ key: 'app', value: { ...(cur.data?.value || {}), briefkopf: bkTxt } }, { onConflict: 'betrieb_id,key' })); }
      S.org.bk9 = bkTxt;
      const ids = all ? orgMembers(S.qgr?.tn?.[uid] || t.gruppe_id).map(x => x.id) : [uid];
      if (!ids.length) throw new Error('In dieser Gruppe sind keine Teilnehmenden.');
      const r = await q9BeschPdf($('#bsArt').value, ids, { monat: $('#bsMon').value, modul: +$('#bsMod')?.value, bk: bkTxt });
      r.doc.save(r.name); toast('PDF erstellt');
    } catch (er) { toast(errText(er)); } finally { btn.disabled = false; PDF_DE = false; }
  };
  $('#bsOne').onclick = e => run(false, e.currentTarget);
  $('#bsGrp').onclick = e => run(true, e.currentTarget);
}
async function q9BeschPdf(art, ids, o) {
  const P = await qPdfStart(false), { doc, FONT, W, M } = P;
  const bh = (o.bk || S.hotel || '').split('\n').map(s => s.trim()).filter(Boolean);
  let anwAll = [];
  if (art !== 'modul') {
    const von = art === 'fehl' ? o.monat + '-01' : (ids.map(i => qOf(i)?.beginn).filter(Boolean).sort()[0] || qAddDays(localDate(), -3650));
    const bis = art === 'fehl' ? qAddDays(orgAddMonths(o.monat + '-01', 1), -1) : localDate();
    anwAll = await orgFetch('anwesenheit', 'datum', von, bis, 'azubi_id,datum,status,minuten').then(r => r.filter(a => ids.includes(a.azubi_id)));
  }
  ids.forEach((id, pi) => {
    if (pi) doc.addPage();
    const p = S.profiles[id] || {}, t = qOf(id) || {}, k = qKat(t), ms = k ? qMods(t) : [];
    doc.setFont(FONT, 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    bh.forEach((l, i) => doc.text(pdfSafe(l), W - M, 16 + i * 4.4, { align: 'right' })); doc.setTextColor(0);
    let y = 52;
    const title = art === 'teil' ? 'Teilnahmebescheinigung' : art === 'fehl' ? 'Fehlzeitenbescheinigung' : 'Modulbescheinigung';
    doc.setFont(FONT, 'bold'); doc.setFontSize(20); doc.text(title, M, y); y += 12;
    doc.setFontSize(11); doc.setFont(FONT, 'normal');
    const line = (l, v) => { doc.setTextColor(100); doc.text(pdfSafe(l), M, y); doc.setTextColor(0); doc.setFont(FONT, 'bold'); doc.text(pdfSafe(v || '–'), M + 48, y); doc.setFont(FONT, 'normal'); y += 7; };
    line('Name', p.full_name); if (k) line('Maßnahme', k.kurz); if (k?.beruf) line('Beruf', k.beruf);
    const mine = anwAll.filter(a => a.azubi_id === id), cnt = s => mine.filter(a => a.status === s).length, zt = mine.filter(qAnwZaehlt).length;
    const quote = zt ? Math.round((cnt('anwesend') + cnt('verspaetet')) * 100 / zt) : null;
    if (art === 'teil') {
      line('Zeitraum', `${t.beginn ? fmtDate(t.beginn) : '–'} bis ${t.ende && t.ende < localDate() ? fmtDate(t.ende) : 'heute (' + fmtDate(localDate()) + ')'}`);
      if (t.standort) line('Lernort', t.standort);
      y += 4; doc.setFont(FONT, 'normal'); doc.setFontSize(11);
      const txt = doc.splitTextToSize(pdfSafe(`Hiermit bestätigen wir, dass ${p.full_name || ''} an der oben genannten Maßnahme teilnimmt bzw. teilgenommen hat.${quote != null ? ` Die Anwesenheitsquote im Zeitraum beträgt ${quote} % (erfasste Unterrichtstage ohne Urlaub und freie Tage).` : ''}`), W - 2 * M);
      doc.text(txt, M, y); y += txt.length * 5.5 + 6;
      if (ms.length) {
        doc.setFont(FONT, 'bold'); doc.setFontSize(11); doc.text('Module', M, y); y += 6; doc.setFontSize(10);
        ms.forEach(m => { if (y > 250) { doc.addPage(); y = 20; } doc.setFont(FONT, 'normal');
          const tl = doc.splitTextToSize(pdfSafe(`${k.module.length > 1 ? 'TQ ' + m.nr + ': ' : ''}${m.titel}`), W - 2 * M - 52); doc.text(tl, M, y);
          doc.text(pdfSafe(m.zert_datum ? `IHK-Zertifikat ${fmtDate(m.zert_datum)}` : (qModStat[m.status || 'offen'] || qModStat.offen)[1]), W - M, y, { align: 'right' }); y += tl.length * 4.6 + 1.6; });
      }
    } else if (art === 'fehl') {
      const mName = new Date(o.monat + '-01T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      line('Monat', mName); y += 2;
      [['Anwesend', cnt('anwesend')], ['Verspätet', cnt('verspaetet')], ['Entschuldigt gefehlt', cnt('entschuldigt')], ['Unentschuldigt gefehlt', cnt('unentschuldigt')], ['Urlaub', cnt('urlaub')], ['Frei', cnt('frei')], ['Anwesenheitsquote', quote == null ? '–' : quote + ' %']]
        .forEach(([l, v]) => { doc.text(pdfSafe(l), M, y); doc.setFont(FONT, 'bold'); doc.text(String(v), M + 70, y, { align: 'right' }); doc.setFont(FONT, 'normal'); y += 6; });
      const fehl = mine.filter(a => ['entschuldigt', 'unentschuldigt', 'verspaetet'].includes(a.status)).sort((a, b) => a.datum.localeCompare(b.datum));
      y += 4; doc.setFont(FONT, 'bold'); doc.text('Einzelne Tage', M, y); y += 6; doc.setFont(FONT, 'normal'); doc.setFontSize(10);
      if (!fehl.length) { doc.text('Keine Fehlzeiten in diesem Monat.', M, y); y += 6; }
      fehl.forEach(a => { if (y > 250) { doc.addPage(); y = 20; } doc.text(pdfSafe(`${orgWd(a.datum)}, ${fmtDate(a.datum)}`), M, y); doc.text(pdfSafe(ANW[a.status][1] + (a.status === 'verspaetet' && a.minuten ? ` (${a.minuten} Min.)` : '')), M + 50, y); y += 5.4; });
    } else {
      const m = ms.find(x => x.nr === o.modul) || ms[0];
      if (m) { line('Modul', `${k.module.length > 1 ? 'TQ ' + m.nr + ': ' : ''}${m.titel}`); line('Zeitraum', m.von ? `${fmtDate(m.von)} bis ${m.bis ? fmtDate(m.bis) : 'offen'}` : '–'); line('Stand', (qModStat[m.status || 'offen'] || qModStat.offen)[1]); if (m.zert_datum) line('IHK-Zertifikat', fmtDate(m.zert_datum));
        y += 4; const txt = doc.splitTextToSize(pdfSafe(`Hiermit bestätigen wir, dass ${p.full_name || ''} das oben genannte Modul ${m.status === 'bestanden' ? 'erfolgreich abgeschlossen hat' : 'besucht'}.`), W - 2 * M); doc.text(txt, M, y); y += txt.length * 5.5; }
    }
    const yS = 262; doc.setDrawColor(150); doc.line(M, yS, M + 70, yS); doc.line(W - M - 70, yS, W - M, yS);
    doc.setFontSize(8.5); doc.setTextColor(110); doc.text('Ort, Datum', M, yS + 4.5); doc.text('Unterschrift und Stempel', W - M - 70, yS + 4.5); doc.setTextColor(0);
  });
  P.foot(art === 'teil' ? 'Teilnahmebescheinigung' : art === 'fehl' ? 'Fehlzeitenbescheinigung' : 'Modulbescheinigung');
  const n0 = ids.length === 1 ? S.profiles[ids[0]]?.full_name || 'Teilnehmer' : 'Gruppe';
  return { doc, name: orgAscii(`${art === 'teil' ? 'Teilnahmebescheinigung' : art === 'fehl' ? 'Fehlzeiten_' + o.monat : 'Modulbescheinigung'}_${n0}`) + '.pdf' };
}

/* =====================================================================
   4) Qualität nach AZAV: Feedback, Auswertung, Maßnahmen-Protokoll
   ===================================================================== */
const FB_FRAGEN = [['inhalt', 'Die Inhalte waren verständlich.'], ['praxis', 'Der Praxisanteil hat mir geholfen.'], ['trainer', 'Die Trainer haben gut erklärt.'], ['organisation', 'Organisation und Räume waren gut.'], ['gesamt', 'Insgesamt bin ich zufrieden.']];
async function q9AzavLoad() {
  const [fb, mn] = await Promise.all([
    S.demo ? q(sb.from('quali_feedback').select('*')).then(rows => q9FbAgg(rows)).catch(() => []) : sb.rpc('quali_feedback_auswertung').then(r => r.data || []).catch(() => []),
    q(sb.from('quali_massnahmen').select('*').order('datum', { ascending: false })).catch(() => [])]);
  Object.assign(S.org, { fb9: fb, mn9: mn });
}
function q9FbAgg(rows) {
  const by = {}; rows.forEach(r => { (by[r.massnahme + '|' + r.modul] ||= []).push(r); });
  return Object.values(by).filter(l => l.length >= 3).map(l => { const avg = k => Math.round(l.reduce((s, r) => s + (+r.werte?.[k] || 0), 0) / l.length * 10) / 10;
    return { massnahme: l[0].massnahme, modul: l[0].modul, anzahl: l.length, inhalt: avg('inhalt'), praxis: avg('praxis'), trainer: avg('trainer'), organisation: avg('organisation'), gesamt: avg('gesamt'), texte: l.map(r => r.text).filter(Boolean) }; });
}
function q9AzavHTML() {
  if (!q9Team()) return empty('Die Qualitätsauswertung sieht die Koordination.');
  const fb = S.org.fb9 || [], mn = S.org.mn9 || [], dec = v => v == null ? '–' : String(v).replace('.', ',');
  const col = v => v == null ? '' : v >= 4 ? 'color:var(--ok)' : v < 3 ? 'color:var(--crit)' : 'color:var(--brass)';
  return `${secTitle('Feedback der Teilnehmenden', `<span class="chip tnum">${fb.reduce((n, x) => n + (+x.anzahl || 0), 0)} Antworten</span>`)}
    <div class="card overflow-x-auto">${fb.length ? `<table class="q9-tab"><thead><tr><th>Maßnahme / Modul</th>${FB_FRAGEN.map(([k]) => `<th class="c">${{ inhalt: 'Inhalt', praxis: 'Praxis', trainer: 'Trainer', organisation: 'Orga', gesamt: 'Gesamt' }[k]}</th>`).join('')}<th class="c">Antworten</th></tr></thead><tbody>
      ${fb.map((x, i) => `<tr><td><b>${esc(q9KatName(x.massnahme))}</b><br><span class="text-muted">Modul ${x.modul}${x.trainer_id ? ' · ' + esc(S.profiles[x.trainer_id]?.full_name || '') : ''}</span>${(x.texte || []).length ? `<br><button class="text-accent font-semibold text-[12px]" data-fbtx="${i}">${x.texte.length} Kommentare</button>` : ''}</td>${FB_FRAGEN.map(([k]) => `<td class="c tnum" style="${col(x[k])}"><b>${dec(x[k])}</b></td>`).join('')}<td class="c tnum">${x.anzahl}</td></tr>`).join('')}</tbody></table>`
      : '<div class="p-4 text-[14px] text-muted">Noch keine Auswertung. Sie erscheint, sobald zu einem Modul mindestens 3 Rückmeldungen vorliegen.</div>'}</div>
    <p class="text-[12px] text-muted mt-2">Skala 1 (trifft nicht zu) bis 5 (trifft voll zu). Ergebnisse nur zusammengefasst ab 3 Antworten, ohne Namen. ${qAuswertungAn() ? 'Die Aufteilung je Trainer ist freigegeben.' : 'Eine Aufteilung je Trainer gibt es erst nach Freigabe der Auswertungen (Zustimmung des Betriebsrats).'} Die Teilnehmenden bekommen den Fragebogen in der App, sobald ein Modul abgeschlossen ist.</p>
    ${secTitle('Maßnahmen-Protokoll', '<button class="text-[13px] font-semibold text-accent" id="mnNew">+ Eintrag</button>')}
    <div class="card">${mn.length ? mn.map((m, i) => `<button class="w-full text-left p-3.5 ${i ? 'border-t border-line' : ''} flex gap-3 items-start" data-mn="${m.id}">
      <span class="chip ${m.erledigt_am ? 'ok' : m.frist && m.frist < localDate() ? 'crit' : 'warn'} flex-none">${m.erledigt_am ? 'erledigt' : 'offen'}</span>
      <span class="flex-1 min-w-0"><span class="block text-[14px] font-semibold">${esc(m.anlass)}</span><span class="block text-[12px] text-muted">${fmtDate(m.datum)}${m.verantwortlich ? ' · ' + esc(m.verantwortlich) : ''}${m.frist ? ' · Frist ' + fmtDate(m.frist) : ''}</span>${m.massnahme ? `<span class="block text-[13px] mt-1">${esc(m.massnahme)}</span>` : ''}</span></button>`).join('')
      : '<div class="p-4 text-[14px] text-muted">Noch keine Einträge. Hier hältst du Verbesserungen, Beschwerden und Audit-Punkte mit Verantwortlichen und Frist fest.</div>'}</div>
    <button class="btn ghost w-full mt-3" id="azPdf">Qualitätsbericht als PDF</button>`;
}
function q9AzavBind() {
  $$('[data-fbtx]').forEach(b => b.onclick = () => { const x = S.org.fb9[+b.dataset.fbtx]; sheetShell('Kommentare', `<div class="text-[13px] text-muted -mt-1 mb-3">${esc(q9KatName(x.massnahme))} · Modul ${x.modul} · zufällige Reihenfolge, ohne Namen</div><div class="card">${x.texte.map((t, i) => `<div class="p-3.5 text-[14px] ${i ? 'border-t border-line' : ''}">${esc(t)}</div>`).join('')}</div>`); });
  $('#mnNew') && ($('#mnNew').onclick = () => q9MnSheet(null));
  $$('[data-mn]').forEach(b => b.onclick = () => q9MnSheet((S.org.mn9 || []).find(m => m.id === b.dataset.mn)));
  $('#azPdf') && ($('#azPdf').onclick = async e => { const btn = e.currentTarget; btn.disabled = true; try { const r = await q9AzavPdf(); r.doc.save(r.name); toast('PDF erstellt'); } catch (er) { toast(errText(er)); } finally { btn.disabled = false; PDF_DE = false; } });
}
function q9MnSheet(m) {
  sheetShell(m ? 'Eintrag bearbeiten' : 'Neuer Eintrag', `<form id="mnF" class="card p-4 flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="mnD">Datum</label><input id="mnD" type="date" class="field" value="${m?.datum || localDate()}"></div><div><label class="lbl" for="mnFr">Frist</label><input id="mnFr" type="date" class="field" value="${m?.frist || ''}"></div></div>
    <div><label class="lbl" for="mnA">Anlass</label><input id="mnA" class="field" maxlength="500" value="${esc(m?.anlass || '')}" placeholder="z. B. Feedback Modul 2: Werkstatt zu voll"></div>
    <div><label class="lbl" for="mnM">Maßnahme</label><textarea id="mnM" class="field" rows="3" maxlength="1000" placeholder="Was wird geändert?">${esc(m?.massnahme || '')}</textarea></div>
    <div><label class="lbl" for="mnV">Verantwortlich</label><input id="mnV" class="field" maxlength="120" value="${esc(m?.verantwortlich || '')}"></div>
    <div><label class="lbl" for="mnE">Erledigt am</label><input id="mnE" type="date" class="field" value="${m?.erledigt_am || ''}"></div>
    <button class="btn">Speichern</button>${m ? '<button type="button" class="btn ghost" id="mnDel">Löschen</button>' : ''}</form>`);
  $('#mnF').onsubmit = async e => {
    e.preventDefault();
    const row = { datum: $('#mnD').value || localDate(), anlass: $('#mnA').value.trim(), massnahme: $('#mnM').value.trim() || null, verantwortlich: $('#mnV').value.trim() || null, frist: $('#mnFr').value || null, erledigt_am: $('#mnE').value || null };
    if (!row.anlass) return toast('Bitte einen Anlass eintragen.');
    try { if (m) await q(sb.from('quali_massnahmen').update(row).eq('id', m.id)); else await q(sb.from('quali_massnahmen').insert({ ...row, betrieb_id: orgBetrieb(), created_by: S.me.id })); closeSheet(); toast('Gespeichert'); go(S.view); } catch (er) { toast(errText(er)); }
  };
  $('#mnDel') && ($('#mnDel').onclick = e => qConfirm(e.currentTarget, async () => { try { await q(sb.from('quali_massnahmen').delete().eq('id', m.id)); closeSheet(); go(S.view); } catch (er) { toast(errText(er)); } }));
}
async function q9AzavPdf() {
  const P = await qPdfStart(false), { doc, FONT, W, M } = P, fb = S.org.fb9 || [], mn = S.org.mn9 || [];
  let y = 18; doc.setFont(FONT, 'bold'); doc.setFontSize(17); doc.text('Qualitätsbericht', M, y); y += 7;
  doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(90); doc.text(pdfSafe(`${S.hotel || ''} · Stand ${fmtDate(localDate())} · Teilnehmerbefragung und Maßnahmen`), M, y); doc.setTextColor(0); y += 10;
  doc.setFont(FONT, 'bold'); doc.setFontSize(12); doc.text('Feedback der Teilnehmenden (Ø, Skala 1–5)', M, y); y += 7; doc.setFontSize(9);
  const cx = [M, M + 82, M + 100, M + 118, M + 136, M + 154, M + 172];
  ['Maßnahme / Modul', 'Inhalt', 'Praxis', 'Trainer', 'Orga', 'Gesamt', 'Antw.'].forEach((h, i) => doc.text(h, cx[i], y)); y += 5; doc.setFont(FONT, 'normal');
  if (!fb.length) { doc.text('Noch keine Auswertung (mindestens 3 Antworten je Modul).', M, y); y += 6; }
  fb.forEach(x => { if (y > 270) { doc.addPage(); y = 18; } doc.text(pdfSafe(`${q9KatName(x.massnahme)} · M${x.modul}`).slice(0, 46), cx[0], y); ['inhalt', 'praxis', 'trainer', 'organisation', 'gesamt'].forEach((k, i) => doc.text(x[k] == null ? '–' : String(x[k]).replace('.', ','), cx[i + 1], y)); doc.text(String(x.anzahl), cx[6], y); y += 5.2; });
  y += 6; doc.setFont(FONT, 'bold'); doc.setFontSize(12); doc.text('Maßnahmen-Protokoll', M, y); y += 7; doc.setFontSize(9.5);
  if (!mn.length) { doc.setFont(FONT, 'normal'); doc.text('Keine Einträge.', M, y); }
  mn.forEach(m => { if (y > 262) { doc.addPage(); y = 18; } doc.setFont(FONT, 'bold'); doc.text(pdfSafe(`${fmtDate(m.datum)} · ${m.anlass}`).slice(0, 110), M, y); y += 4.8; doc.setFont(FONT, 'normal');
    const t = doc.splitTextToSize(pdfSafe(`${m.massnahme || '–'} · Verantwortlich: ${m.verantwortlich || '–'} · Frist: ${m.frist ? fmtDate(m.frist) : '–'} · ${m.erledigt_am ? 'erledigt am ' + fmtDate(m.erledigt_am) : 'offen'}`), W - 2 * M); doc.text(t, M, y); y += t.length * 4.6 + 3; });
  P.foot('Qualitätsbericht');
  return { doc, name: orgAscii(`Qualitaetsbericht_${localDate()}`) + '.pdf' };
}
/* Teilnehmende: Fragebogen nach abgeschlossenem Modul */
async function q9FbMineLoad() {
  if (!isQuali() || !isAzubi()) return;
  try { S.quali.fb9 = await q(sb.from('quali_feedback').select('massnahme,modul').eq('azubi_id', S.me.id)); } catch { S.quali.fb9 = []; }
}
function q9FbOffen(t) {
  const k = qKat(t); if (!k) return [];
  const done = new Set((S.quali.fb9 || []).map(f => f.massnahme + '|' + f.modul)), today = localDate();
  return qMods(t).filter(m => (m.status === 'bestanden' || (m.bis && m.bis < today)) && !done.has(t.massnahme + '|' + m.nr));
}
function q9FbSheet(t, nr) {
  const k = qKat(t), m = qMods(t).find(x => x.nr === nr), v = {};
  sheetShell('Deine Meinung zählt', `<div class="text-[13px] text-muted -mt-1 mb-3">${esc(k.kurz)} · ${k.module.length > 1 ? 'Modul ' + nr + ': ' : ''}${esc(m?.titel || '')}</div>
    <form id="fbF" class="card p-4 flex flex-col gap-4">
      ${FB_FRAGEN.map(([key, l]) => `<div><div class="text-[14px] font-semibold mb-1.5">${esc(l)}</div><div class="stars" role="group" aria-label="${esc(l)}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-fbq="${key}" data-fbv="${n}" aria-pressed="false" aria-label="${n} von 5">${n}</button>`).join('')}</div></div>`).join('')}
      <div class="text-[12px] text-muted -mt-2">1 = trifft nicht zu · 5 = trifft voll zu</div>
      <div><label class="lbl" for="fbT">Was sollen wir besser machen? <span class="font-normal text-muted">(optional)</span></label><textarea id="fbT" class="field" rows="3" maxlength="1000"></textarea></div>
      <button class="btn">Absenden</button>
      <p class="text-[12px] text-muted">Deine Antwort sieht niemand einzeln: Ausgewertet wird nur zusammengefasst und erst ab 3 Antworten. Bitte keine Namen oder Gesundheitsangaben in den Text schreiben.</p></form>`);
  $$('[data-fbq]').forEach(b => b.onclick = () => { v[b.dataset.fbq] = +b.dataset.fbv; $$(`[data-fbq="${b.dataset.fbq}"]`).forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.fbv === v[b.dataset.fbq]))); });
  $('#fbF').onsubmit = async e => {
    e.preventDefault();
    if (FB_FRAGEN.some(([key]) => !v[key])) return toast('Bitte jede Frage mit 1 bis 5 bewerten.');
    const g = t.gruppe_id ? qGruppe(t.gruppe_id) : null;
    try {
      await q(sb.from('quali_feedback').insert({ betrieb_id: S.me.betrieb_id || orgBetrieb(), azubi_id: S.me.id, gruppe_id: t.gruppe_id || null, trainer_id: g?.trainer_id || null, massnahme: t.massnahme, modul: nr, werte: v, text: $('#fbT').value.trim() || null }));
      (S.quali.fb9 ||= []).push({ massnahme: t.massnahme, modul: nr }); closeSheet(); toast('Danke für dein Feedback!'); render();
    } catch (er) { toast(/duplicate|unique/i.test(er.message || '') ? 'Du hast zu diesem Modul schon geantwortet.' : errText(er)); }
  };
}

/* =====================================================================
   9) Lernmaterial je Modul (Verwaltung) und Anzeige für Teilnehmende
   ===================================================================== */
async function q9MatLoad() { try { S.org.mat9 = await q(sb.from('quali_material').select('*').order('created_at')); } catch { S.org.mat9 = []; } }
function q9MatAdminHTML() {
  const kats = Object.keys(Q_KATALOG), kat = kats.includes(S.org.matK) ? S.org.matK : kats[0], k = Q_KATALOG[kat], mat = (S.org.mat9 || []).filter(m => m.kat === kat);
  S.org.matK = kat;
  return `<div class="card p-4 mt-3"><label class="lbl" for="matK">Maßnahme</label><select id="matK" class="field">${kats.map(x => `<option value="${x}" ${x === kat ? 'selected' : ''}>${esc(Q_KATALOG[x].kurz)}</option>`).join('')}</select>
      <p class="text-[12px] text-muted mt-2">Material sehen alle Teilnehmenden dieser Maßnahme beim jeweiligen Modul. Erlaubt: PDF, Bilder, Videos (MP4), Word, Excel, PowerPoint bis 50 MB oder ein Link (https).</p></div>
    ${(k?.module || []).map(m => { const list = mat.filter(x => x.modul === m.nr); return `${secTitle(`${k.module.length > 1 ? 'Modul ' + m.nr + ': ' : ''}${esc(m.titel)}`, `<button class="text-[13px] font-semibold text-accent" data-matadd="${m.nr}">+ Material</button>`)}
      <div class="card">${list.length ? list.map((x, i) => `<div class="flex items-center gap-3 p-3.5 ${i ? 'border-t border-line' : ''}"><span class="chip flex-none">${x.typ === 'link' ? 'Link' : q9MatTyp(x)}</span><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(x.titel)}</div><div class="text-[12px] text-muted">${fmtDate(x.created_at)}${x.groesse ? ' · ' + (x.groesse / 1048576).toFixed(1).replace('.', ',') + ' MB' : ''}</div></div>
        <button class="btn ghost py-1 px-3 text-[12.5px]" data-matopen="${x.id}">Öffnen</button><button class="btn ghost py-1 px-3 text-[12.5px]" data-matdel="${x.id}" aria-label="Löschen">✕</button></div>`).join('') : '<div class="p-3.5 text-[13px] text-muted">Noch kein Material.</div>'}</div>`; }).join('')}`;
}
const q9MatTyp = x => /pdf/.test(x.mime || '') ? 'PDF' : /^image/.test(x.mime || '') ? 'Bild' : /^video/.test(x.mime || '') ? 'Video' : /^audio/.test(x.mime || '') ? 'Audio' : /word/.test(x.mime || '') ? 'Word' : /sheet|excel/.test(x.mime || '') ? 'Excel' : /presentation|powerpoint/.test(x.mime || '') ? 'Folien' : 'Datei';
function q9MatAdminBind() {
  $('#matK') && ($('#matK').onchange = () => { S.org.matK = $('#matK').value; render(); });
  $$('[data-matadd]').forEach(b => b.onclick = () => q9MatAddSheet(S.org.matK, +b.dataset.matadd));
  $$('[data-matopen]').forEach(b => b.onclick = () => q9MatOpen((S.org.mat9 || []).find(x => x.id === b.dataset.matopen)));
  $$('[data-matdel]').forEach(b => b.onclick = () => qConfirm(b, async () => {
    const x = (S.org.mat9 || []).find(m => m.id === b.dataset.matdel); if (!x) return;
    try { if (x.datei) await sb.storage.from('material').remove([x.datei]); await q(sb.from('quali_material').delete().eq('id', x.id)); toast('Gelöscht'); go(S.view); } catch (er) { toast(errText(er)); }
  }, '✕?'));
}
function q9MatAddSheet(kat, nr) {
  sheetShell('Material hinzufügen', `<form id="maF" class="card p-4 flex flex-col gap-3">
    <div class="text-[13px] text-muted">${esc(q9KatName(kat))} · Modul ${nr}</div>
    <div><label class="lbl" for="maT">Titel</label><input id="maT" class="field" maxlength="160" placeholder="z. B. Arbeitsblatt Schaltpläne lesen"></div>
    <div class="seg"><button type="button" data-mat="datei" aria-pressed="true">Datei</button><button type="button" data-mat="link" aria-pressed="false">Link</button></div>
    <div id="maFW"><label class="lbl" for="maFile">Datei</label><input id="maFile" type="file" class="field" accept=".pdf,image/*,video/mp4,video/webm,audio/mpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx"></div>
    <div id="maLW" hidden><label class="lbl" for="maL">Link</label><input id="maL" type="url" class="field" placeholder="https://…"></div>
    <button class="btn" id="maGo">Hochladen</button></form>`);
  let typ = 'datei';
  $$('[data-mat]').forEach(b => b.onclick = () => { typ = b.dataset.mat; $$('[data-mat]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#maFW').hidden = typ !== 'datei'; $('#maLW').hidden = typ !== 'link'; $('#maGo').textContent = typ === 'datei' ? 'Hochladen' : 'Speichern'; });
  $('#maF').onsubmit = async e => {
    e.preventDefault();
    const f = $('#maFile').files?.[0], titel = $('#maT').value.trim() || f?.name || '';
    if (!titel) return toast('Bitte einen Titel eintragen.');
    const btn = $('#maGo'); btn.disabled = true;
    try {
      const row = { betrieb_id: orgBetrieb(), kat, modul: nr, titel: titel.slice(0, 160), typ, created_by: S.me.id };
      if (typ === 'link') { const u = $('#maL').value.trim(); if (!/^https:\/\//.test(u)) throw new Error('Der Link muss mit https:// beginnen.'); row.url = u; }
      else {
        if (!f) throw new Error('Bitte eine Datei wählen.'); if (f.size > 50 * 1048576) throw new Error('Die Datei ist größer als 50 MB.');
        const path = `${orgBetrieb()}/${kat}/${nr}/${q9Uuid()}-${q9Safe(f.name)}`;
        const mime = f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'application/octet-stream');
        const { error } = await sb.storage.from('material').upload(path, f, { contentType: mime, upsert: false });
        if (error) throw new Error(/mime|type/i.test(error.message) ? 'Dieser Dateityp ist nicht erlaubt.' : error.message);
        Object.assign(row, { datei: path, mime, groesse: f.size });
        if (S.demo) (S.q9local ||= {})[path] = URL.createObjectURL(f);
      }
      await q(sb.from('quali_material').insert(row)); closeSheet(); toast('Gespeichert'); go(S.view);
    } catch (er) { toast(errText(er)); btn.disabled = false; }
  };
}
const Q9_CACHE = 'desk-material-v1';
async function q9MatBlob(x) {
  const key = './__material/' + x.id;
  try { const c = await caches.open(Q9_CACHE), hit = await c.match(key); if (hit) return { blob: await hit.blob(), offline: true }; } catch {}
  if (S.demo && S.q9local?.[x.datei]) return { url: S.q9local[x.datei] };
  const { data, error } = await sb.storage.from('material').createSignedUrl(x.datei, 600);
  if (error || !data?.signedUrl) throw new Error('Die Datei ist nicht erreichbar. Bist du online?');
  return { url: data.signedUrl };
}
async function q9MatOpen(x) {
  if (!x) return;
  if (x.typ === 'link') { window.open(x.url, '_blank', 'noopener'); return; }
  const w = window.open('', '_blank');
  try { const r = await q9MatBlob(x), url = r.url || URL.createObjectURL(r.blob); if (w) w.location.href = url; else location.href = url; }
  catch (er) { if (w) w.close(); toast(errText(er)); }
}
async function q9MatOffline(x, btn) {
  try {
    const c = await caches.open(Q9_CACHE), key = './__material/' + x.id;
    if (await c.match(key)) { await c.delete(key); toast('Offline-Kopie entfernt'); btn.textContent = 'Offline speichern'; return; }
    btn.disabled = true; const r = await q9MatBlob(x), blob = r.blob || await (await fetch(r.url)).blob();
    await c.put(key, new Response(blob, { headers: { 'Content-Type': x.mime || blob.type || 'application/octet-stream' } }));
    toast('Offline gespeichert – auch ohne Internet abrufbar'); btn.textContent = '✓ Offline';
  } catch (er) { toast('Offline speichern hat nicht geklappt.'); } finally { btn.disabled = false; }
}
/* Teilnehmende: Material und Feedback unter der Modulliste */
const q9ModList0 = qModListHTML;
qModListHTML = function (t, staff) {
  let h = q9ModList0(t, staff);
  if (staff || !t) return h;
  const k = qKat(t), mat = (S.quali.mat9 || []).filter(m => m.kat === t.massnahme), offen = q9FbOffen(t);
  if (offen.length) h = `<div class="card p-4 mb-3" style="border-color:var(--accent)"><div class="text-[15px] font-semibold">Wie war ${offen.length === 1 ? (k.module.length > 1 ? 'Modul ' + offen[0].nr : 'der Kurs') : 'es'}?</div><p class="text-[13px] text-muted mt-0.5">2 Minuten, 5 Fragen. Hilft uns, besser zu werden.</p>
    <div class="flex flex-wrap gap-2 mt-2">${offen.map(m => `<button class="btn py-1.5 px-3 text-[13px]" data-fbmod="${m.nr}">${k.module.length > 1 ? 'Modul ' + m.nr + ' bewerten' : 'Bewerten'}</button>`).join('')}</div></div>` + h;
  if (mat.length) h += `${secTitle('Lernmaterial')}<div class="card">${k.module.filter(m => mat.some(x => x.modul === m.nr)).map((m, i) => `<div class="p-3.5 ${i ? 'border-t border-line' : ''}"><div class="text-[12px] font-semibold text-muted mb-1.5">${k.module.length > 1 ? 'Modul ' + m.nr + ': ' : ''}${esc(m.titel)}</div>
    ${mat.filter(x => x.modul === m.nr).map(x => `<div class="flex items-center gap-2 py-1.5"><span class="chip flex-none">${x.typ === 'link' ? 'Link' : q9MatTyp(x)}</span><button class="flex-1 min-w-0 text-left text-[14px] font-semibold text-accent truncate" data-matopen9="${x.id}">${esc(x.titel)}</button>${x.typ === 'datei' && 'caches' in window ? `<button class="btn ghost py-1 px-2.5 text-[12px] flex-none" data-matoff="${x.id}">Offline speichern</button>` : ''}</div>`).join('')}</div>`).join('')}</div>`;
  return h;
};
const q9ExtraLoad0 = typeof qExtraLoad === 'function' ? qExtraLoad : null;
qExtraLoad = async function () {
  if (q9ExtraLoad0) await q9ExtraLoad0();
  if (!isQuali() || !isAzubi()) return;
  await Promise.all([q9FbMineLoad(), q(sb.from('quali_material').select('*').order('created_at')).then(r => { S.quali.mat9 = r; }).catch(() => { S.quali.mat9 = []; })]);
};
document.addEventListener('click', e => {
  const fb = e.target.closest('[data-fbmod]'); if (fb) { const t = (S.quali?.rows || []).find(r => r.azubi_id === S.me?.id); if (t) q9FbSheet(t, +fb.dataset.fbmod); return; }
  const mo = e.target.closest('[data-matopen9]'); if (mo) { q9MatOpen((S.quali?.mat9 || []).find(x => x.id === mo.dataset.matopen9)); return; }
  const off = e.target.closest('[data-matoff]'); if (off) { q9MatOffline((S.quali?.mat9 || []).find(x => x.id === off.dataset.matoff), off); }
});
/* Offline-Status der Buttons nach dem Zeichnen setzen */
async function q9MatMarks(root) {
  const bs = root ? [...root.querySelectorAll('[data-matoff]')] : []; if (!bs.length || !('caches' in window)) return;
  try { const c = await caches.open(Q9_CACHE); for (const b of bs) if (await c.match('./__material/' + b.dataset.matoff)) b.textContent = '✓ Offline'; } catch {}
}

/* =====================================================================
   5) Klassenbuch: Trainer zeichnet ab, Koordination zeichnet gegen
   ===================================================================== */
const q9KbHTML0 = orgKbHTML, q9KbBind0 = orgKbBind;
orgKbHTML = function () {
  let h = q9KbHTML0();
  if (!S.org.kbG) return h;
  h = h.replace(/<button class="btn ghost" id="kbSign">[^<]*<\/button>/, '');
  const kb = S.org.kb || [], von = S.org.kbW, today = localDate();
  const filled = kb.filter(e => kbSlots(e).some(s => s.thema));
  const miss = []; for (let i = 0; i < 5; i++) { const d = qAddDays(von, i); if (d < today && !filled.some(e => e.datum === d)) miss.push(d); }
  const tOk = filled.length && filled.every(e => e.trainer_ok_at), kOk = filled.length && filled.every(e => e.abgezeichnet_at);
  const tBy = filled.find(e => e.trainer_ok_at), kBy = filled.find(e => e.abgezeichnet_at);
  const box = `<div class="card p-4 mt-4 flex flex-col gap-2.5">
    <div class="text-[15px] font-semibold">Abzeichnung der Woche</div>
    ${miss.length ? `<div class="text-[13px] p-2.5 rounded-xl" style="background:var(--warn-soft,var(--brass-soft))">${miss.length === 1 ? 'Ein Tag ohne Eintrag' : miss.length + ' Tage ohne Eintrag'}: ${miss.map(d => orgWd(d) + ' ' + fmtDate(d).slice(0, 6)).join(', ')}</div>` : ''}
    <div class="flex items-center gap-2 text-[13px]"><span class="chip ${tOk ? 'ok' : ''} flex-none">1</span><span class="flex-1">${tOk ? `Trainer: abgezeichnet am ${fmtDate(tBy.trainer_ok_at.slice(0, 10))} von ${esc(S.profiles[tBy.trainer_ok_von]?.full_name || '–')}` : 'Trainer: noch nicht abgezeichnet'}</span>
      ${!tOk && filled.length && !kOk ? '<button class="btn py-1.5 px-3 text-[12.5px]" id="kbT">Abzeichnen</button>' : ''}</div>
    <div class="flex items-center gap-2 text-[13px]"><span class="chip ${kOk ? 'ok' : ''} flex-none">2</span><span class="flex-1">${kOk ? `Koordination: gegengezeichnet am ${fmtDate(kBy.abgezeichnet_at.slice(0, 10))} von ${esc(S.profiles[kBy.abgezeichnet_von]?.full_name || '–')}` : 'Koordination: noch nicht gegengezeichnet'}</span>
      ${!kOk && filled.length && q9Team() ? `<button class="btn ${tOk ? '' : 'ghost'} py-1.5 px-3 text-[12.5px]" id="kbK">Gegenzeichnen</button>` : ''}</div>
    ${!filled.length ? '<div class="text-[12px] text-muted">Abzeichnen geht, sobald die Woche Einträge hat.</div>' : ''}</div>`;
  const i = h.indexOf('<div class="grid grid-cols-2 gap-2 mt-4">');
  return i < 0 ? h + box : h.slice(0, i) + box + h.slice(i);
};
orgKbBind = function () {
  q9KbBind0();
  const filled = () => (S.org.kb || []).filter(e => kbSlots(e).some(s => s.thema));
  $('#kbT') && ($('#kbT').onclick = e => qConfirm(e.currentTarget, async () => {
    try { await q(sb.from('klassenbuch').update({ trainer_ok_von: S.me.id, trainer_ok_at: new Date().toISOString() }).in('id', filled().filter(x => !x.trainer_ok_at).map(x => x.id))); toast('Abgezeichnet'); go(S.view); } catch (er) { toast(errText(er)); }
  }, 'Woche abzeichnen? Nochmal tippen'));
  $('#kbK') && ($('#kbK').onclick = e => qConfirm(e.currentTarget, async () => {
    try { await q(sb.from('klassenbuch').update({ abgezeichnet_von: S.me.id, abgezeichnet_at: new Date().toISOString() }).in('id', filled().filter(x => !x.abgezeichnet_at).map(x => x.id))); toast('Gegengezeichnet und festgeschrieben'); go(S.view); } catch (er) { toast(errText(er)); }
  }, 'Festschreiben? Nochmal tippen'));
};

/* =====================================================================
   6) Stundenkonto aus dem Dienstplan  ·  8) Kalender-Export (.ics)
   ===================================================================== */
const q9EinHTML0 = orgEinHTML, q9EinBind0 = orgEinBind;
orgEinHTML = function () {
  return q9EinHTML0().replace('<button class="btn ghost col-span-2" id="einXlsx">', '<button class="btn ghost" id="einStd">Stundenkonto</button><button class="btn ghost" id="einIcs">In meinen Kalender</button><button class="btn ghost col-span-2" id="einXlsx">');
};
orgEinBind = function () {
  q9EinBind0();
  $('#einStd') && ($('#einStd').onclick = () => q9StdSheet(S.org.einM));
  $('#einIcs') && ($('#einIcs').onclick = () => q9IcsSheet());
};
const q9TagStd = p => { const w = Number(p?.wochenstunden) || Number(APP.wochenSoll) || 39; return w / 5; };
function q9StdCalc(p, rows, m) {
  const f = new Date(m + '-01T12:00:00'), n = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate(), ts = q9TagStd(p);
  const today = localDate(), lauf = m === today.slice(0, 7), bisTag = lauf ? +today.slice(8, 10) : n;
  let wt = 0; for (let d = 1; d <= bisTag; d++) { const wd = new Date(f.getFullYear(), f.getMonth(), d).getDay(); if (wd && wd !== 6) wt++; }
  if (lauf) rows = rows.filter(r => r.datum <= today);
  const sum = k => rows.filter(r => (k === 'e' ? dpKind(r.art) === 'e' : r.art === k)).reduce((s, r) => s + (Number(r.anteil) || 0), 0);
  const arbeit = sum('e'), urlaub = sum('U'), frei = sum('X'), gleit = sum('AS'), soll = wt * ts;
  const ist = (arbeit + urlaub + frei) * ts;
  return { wt, ts, soll, arbeit, urlaub, frei, gleit, ist, saldo: ist - soll };
}
async function q9StdSheet(m) {
  const staff = q9Team() ? orgStaff() : [S.me], m0 = m + '-01', m1 = qAddDays(orgAddMonths(m0, 1), -1);
  let rows = []; try { rows = await orgFetch('quali_einsatz', 'datum', m0, m1, 'trainer_id,datum,art,anteil'); } catch (er) { return toast(errText(er)); }
  const nf = v => (Math.round(v * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  const res = staff.map(p => ({ p, r: q9StdCalc(p, rows.filter(x => x.trainer_id === p.id), m) }));
  const mName = new Date(m0 + 'T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const lauf = m === localDate().slice(0, 7);
  sheetShell('Stundenkonto', `<div class="text-[13px] text-muted -mt-1 mb-3">${esc(mName)}${lauf ? ` · Stand heute (${fmtDate(localDate())})` : ''} · aus den Kürzeln im Dienstplan</div>
    <div class="card overflow-x-auto"><table class="q9-tab"><thead><tr><th>Trainer/in</th><th class="c">Soll</th><th class="c">Arbeit</th><th class="c">Urlaub</th><th class="c">Schulungsfrei</th><th class="c">Gleitzeit</th><th class="c">Saldo</th></tr></thead><tbody>
      ${res.map(({ p, r }) => `<tr><td><b>${esc(p.full_name)}</b><br><span class="text-muted text-[11px]">${nf(r.ts * 5)} Std./Woche${q9Team() ? ` · <button class="text-accent font-semibold" data-wst="${p.id}">ändern</button>` : ''}</span></td><td class="c tnum">${nf(r.soll)} h<br><span class="text-muted text-[11px]">${r.wt} Tage</span></td><td class="c tnum">${nf(r.arbeit * r.ts)} h<br><span class="text-muted text-[11px]">${nf(r.arbeit)} T.</span></td><td class="c tnum">${nf(r.urlaub)} T.</td><td class="c tnum">${nf(r.frei)} T.</td><td class="c tnum">${nf(r.gleit)} T.</td><td class="c tnum" style="color:${r.saldo < -0.01 ? 'var(--crit)' : r.saldo > 0.01 ? 'var(--ok)' : 'inherit'}"><b>${r.saldo > 0 ? '+' : ''}${nf(r.saldo)} h</b></td></tr>`).join('')}</tbody></table></div>
    <p class="text-[12px] text-muted mt-2">Grundlage sind die Kürzel im Dienstplan: ein ganzer Tag = Wochenstunden ÷ 5, ein halber Tag zählt die Hälfte. Urlaub (U) und schulungsfreie Zeit (X) zählen wie Arbeitszeit, Sonderurlaub/Gleitzeit (AS) baut Stunden ab. Feiertage und tatsächliche Uhrzeiten erfasst der Dienstplan nicht – bitte vor der Lohnabrechnung prüfen.</p>
    <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="stPrev">‹ Vormonat</button><button class="btn ghost" id="stNext">Nächster ›</button><button class="btn col-span-2" id="stX">Als Excel-Tabelle</button></div>`);
  $('#stPrev').onclick = () => q9StdSheet(orgAddMonths(m0, -1).slice(0, 7));
  $('#stNext').onclick = () => q9StdSheet(orgAddMonths(m0, 1).slice(0, 7));
  $$('[data-wst]').forEach(b => b.onclick = async () => {
    const p = S.profiles[b.dataset.wst], v = prompt(`Wochenstunden für ${p.full_name} (leer = ${APP.wochenSoll || 39})`, p.wochenstunden ?? '');
    if (v === null) return; const n = v.trim() === '' ? null : Number(v.replace(',', '.'));
    if (n != null && (!(n >= 0) || n > 60)) return toast('Bitte eine Zahl zwischen 0 und 60.');
    try { await q(sb.from('profiles').update({ wochenstunden: n }).eq('id', p.id)); S.profiles[p.id] = { ...p, wochenstunden: n }; q9StdSheet(m); } catch (er) { toast(errText(er)); }
  });
  $('#stX').onclick = async () => {
    const head = ['Trainer/in', 'Wochenstunden', 'Soll (h)', 'Arbeitstage', 'Arbeit (h)', 'Urlaub (Tage)', 'Schulungsfrei (Tage)', 'Gleitzeit AS (Tage)', 'Saldo (h)'];
    const data = res.map(({ p, r }) => [p.full_name, r.ts * 5, +r.soll.toFixed(2), r.arbeit, +(r.arbeit * r.ts).toFixed(2), r.urlaub, r.frei, r.gleit, +r.saldo.toFixed(2)]);
    try { q9Dl(await q9Xlsx(`Stundenkonto ${mName}`, head, data), orgAscii(`Stundenkonto_${m}`) + '.xlsx'); toast('Excel-Datei erstellt'); } catch (er) { toast(errText(er)); }
  };
}
async function q9Xlsx(title, head, rows) {
  await loadScript('./vendor/jszip.min.js');
  const x = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const col = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const cell = (r, c, v, st) => typeof v === 'number' ? `<c r="${col(c)}${r}" s="${st}"><v>${v}</v></c>` : `<c r="${col(c)}${r}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  const lines = [`<row r="1">${cell(1, 0, title, 1)}</row>`, `<row r="3">${head.map((h, i) => cell(3, i, h, 2)).join('')}</row>`, ...rows.map((r, j) => `<row r="${j + 4}">${r.map((v, i) => cell(j + 4, i, v, 0)).join('')}</row>`)];
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tabelle" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="${head.length}" width="15" customWidth="1"/></cols><sheetData>${lines.join('')}</sheetData></worksheet>`);
  zip.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8ECF1"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>');
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
}
function q9IcsSheet() {
  const today = localDate();
  sheetShell('In meinen Kalender', `<div class="card p-4 flex flex-col gap-3 text-[14px]">
    <p>Lädt deinen Dienstplan als Kalenderdatei (.ics). Öffne die Datei auf dem Handy oder in Outlook, dann stehen die Tage in deinem Kalender.</p>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="icV">Von</label><input id="icV" type="date" class="field" value="${qAddDays(today, -7)}"></div><div><label class="lbl" for="icB">Bis</label><input id="icB" type="date" class="field" value="${qAddDays(today, 180)}"></div></div>
    <button class="btn" id="icGo">Kalenderdatei herunterladen</button>
    <p class="text-[12px] text-muted">Änderungen im Dienstplan kommen nicht automatisch in den Kalender. Lade die Datei nach größeren Änderungen einfach neu – vorhandene Einträge werden dabei aktualisiert statt doppelt angelegt.</p></div>`);
  $('#icGo').onclick = async () => {
    const v = $('#icV').value, b = $('#icB').value; if (!v || !b || b < v) return toast('Bitte einen gültigen Zeitraum wählen.');
    try {
      const rows = (await orgFetch('quali_einsatz', 'datum', v, b, 'id,trainer_id,datum,art,anteil,gruppe_id,notiz')).filter(r => r.trainer_id === S.me.id);
      if (!rows.length) return toast('Im Zeitraum ist nichts eingetragen.');
      const d8 = d => d.replace(/-/g, ''), now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', e2 = t => String(t).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
      const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NovaWorks//Desk//DE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Dienstplan Desk',
        ...rows.flatMap(r => { const c = DP_CODES[r.art] || [r.art, r.art], g = r.gruppe_id ? qGruppe(r.gruppe_id)?.name : '';
          return ['BEGIN:VEVENT', `UID:desk-${r.id}@azubihub`, `DTSTAMP:${now}`, `DTSTART;VALUE=DATE:${d8(r.datum)}`, `DTEND;VALUE=DATE:${d8(qAddDays(r.datum, 1))}`,
            `SUMMARY:${e2(`${Number(r.anteil) < 1 ? '½ ' : ''}${c[0]} – ${c[1]}${g ? ' · ' + g : ''}`)}`, ...(r.notiz ? [`DESCRIPTION:${e2(r.notiz)}`] : []), `TRANSP:${dpKind(r.art) === 'a' ? 'TRANSPARENT' : 'OPAQUE'}`, 'END:VEVENT']; }), 'END:VCALENDAR'].join('\r\n');
      q9Dl(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'Dienstplan.ics'); toast(`${rows.length} Einträge exportiert`);
    } catch (er) { toast(errText(er)); }
  };
}

/* =====================================================================
   7) Räume, Werkstattplätze und Maschinen buchen
   ===================================================================== */
const RAUM_ART = { raum: 'Raum', werkstatt: 'Werkstattplatz', maschine: 'Maschine' };
async function q9RaeumeLoad() {
  S.org.rbW ||= qMonday(localDate());
  const von = S.org.rbW, bis = qAddDays(von, 6);
  const [r, b] = await Promise.all([q(sb.from('quali_raeume').select('*').order('name')).catch(() => []), q(sb.from('quali_buchungen').select('*').gte('datum', von).lte('datum', bis)).catch(() => [])]);
  Object.assign(S.org, { raeume: r, buch: b });
}
const q9Overlap = (a, b) => a.von < b.bis && b.von < a.bis;
function q9RaeumeHTML() {
  const rs = (S.org.raeume || []).filter(r => r.aktiv !== false), bs = S.org.buch || [], von = S.org.rbW, days = [0, 1, 2, 3, 4].map(i => qAddDays(von, i)), today = localDate();
  const hm = t => String(t || '').slice(0, 5);
  const conflict = b => bs.some(x => x.id !== b.id && x.raum_id === b.raum_id && x.datum === b.datum && q9Overlap(x, b));
  return `<div class="card p-4 mt-3"><div class="flex items-center justify-between gap-2"><button class="btn ghost py-2 px-3" id="rbPrev" aria-label="Vorige Woche">‹</button>
      <div class="text-center"><div class="text-[15px] font-bold">KW ${orgKw(von)}</div><div class="text-[12px] text-muted tnum">${fmtDate(von)} – ${fmtDate(qAddDays(von, 4))}</div></div>
      <button class="btn ghost py-2 px-3" id="rbNext" aria-label="Nächste Woche">›</button></div>
      ${von !== qMonday(today) ? '<div class="text-center mt-1"><button class="text-[12px] text-accent font-semibold" id="rbToday">zur aktuellen Woche</button></div>' : ''}</div>
    ${rs.length ? `<div class="card mt-3 overflow-x-auto"><div class="rb-grid"><div class="hd">Raum</div>${days.map(d => `<div class="hd ${d === today ? 'text-accent' : ''}">${orgWd(d)} ${fmtDate(d).slice(0, 6)}</div>`).join('')}
      ${rs.map(r => `<div><b>${esc(r.name)}</b><br><span class="text-muted text-[11px]">${RAUM_ART[r.art] || ''}${r.plaetze ? ' · ' + r.plaetze + ' Pl.' : ''}</span></div>${days.map(d => `<div class="rb-cell" data-rbnew="${r.id}|${d}" role="button" tabindex="0" aria-label="${esc(r.name)} am ${fmtDate(d)} buchen">${bs.filter(b => b.raum_id === r.id && b.datum === d).sort((a, b) => a.von.localeCompare(b.von)).map(b => `<span class="rb-b ${conflict(b) ? 'x' : ''}" data-rbed="${b.id}">${hm(b.von)}–${hm(b.bis)}<br>${esc(b.gruppe_id ? qGruppe(b.gruppe_id)?.name || '' : (S.profiles[b.trainer_id]?.full_name || '').split(' ')[0])}${conflict(b) ? ' · doppelt!' : ''}</span>`).join('')}</div>`).join('')}`).join('')}</div></div>
      <p class="text-[12px] text-muted mt-2">Feld antippen: buchen. Buchung antippen: ändern oder löschen. Rot = Doppelbelegung.</p>` : empty(q9Team() ? 'Noch keine Räume angelegt. Lege unten Räume, Werkstattplätze oder Maschinen an.' : 'Die Koordination hat noch keine Räume angelegt.')}
    ${q9Team() ? `${secTitle('Räume verwalten', '<button class="text-[13px] font-semibold text-accent" id="rmNew">+ Raum</button>')}<div class="card">${(S.org.raeume || []).map((r, i) => `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-rm="${r.id}"><span class="chip flex-none">${RAUM_ART[r.art]}</span><span class="flex-1 min-w-0 text-[14px] font-semibold truncate ${r.aktiv === false ? 'text-muted line-through' : ''}">${esc(r.name)}</span><span class="text-[12px] text-muted">${r.plaetze ? r.plaetze + ' Plätze' : ''}</span></button>`).join('') || '<div class="p-3.5 text-[13px] text-muted">Noch keine.</div>'}</div>` : ''}`;
}
function q9RaeumeBind() {
  const mv = n => { S.org.rbW = qAddDays(S.org.rbW, 7 * n); go(S.view); };
  $('#rbPrev') && ($('#rbPrev').onclick = () => mv(-1)); $('#rbNext') && ($('#rbNext').onclick = () => mv(1));
  $('#rbToday') && ($('#rbToday').onclick = () => { S.org.rbW = qMonday(localDate()); go(S.view); });
  $$('[data-rbnew]').forEach(c => { const open = e => { if (e.target.closest('[data-rbed]')) return; const [r, d] = c.dataset.rbnew.split('|'); q9BuchSheet(null, r, d); }; c.onclick = open; c.onkeydown = e => { if (e.key === 'Enter') open(e); }; });
  $$('[data-rbed]').forEach(b => b.onclick = e => { e.stopPropagation(); q9BuchSheet((S.org.buch || []).find(x => x.id === b.dataset.rbed)); });
  $('#rmNew') && ($('#rmNew').onclick = () => q9RaumSheet(null));
  $$('[data-rm]').forEach(b => b.onclick = () => q9RaumSheet((S.org.raeume || []).find(r => r.id === b.dataset.rm)));
}
function q9RaumSheet(r) {
  sheetShell(r ? 'Raum bearbeiten' : 'Neuer Raum', `<form id="rmF" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="rmN">Name</label><input id="rmN" class="field" maxlength="80" value="${esc(r?.name || '')}" placeholder="z. B. Schulungsraum 2, Drehbank 1"></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="rmA">Art</label><select id="rmA" class="field">${Object.entries(RAUM_ART).map(([k, l]) => `<option value="${k}" ${(r?.art || 'raum') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div><label class="lbl" for="rmP">Plätze</label><input id="rmP" type="number" min="0" max="500" class="field" value="${r?.plaetze ?? ''}"></div></div>
    <div><label class="lbl" for="rmT">Notiz</label><input id="rmT" class="field" maxlength="300" value="${esc(r?.notiz || '')}"></div>
    ${r ? `<label class="flex items-center gap-2 text-[14px]"><input type="checkbox" id="rmAk" class="cbx" ${r.aktiv !== false ? 'checked' : ''}> buchbar</label>` : ''}
    <button class="btn">Speichern</button></form>`);
  $('#rmF').onsubmit = async e => {
    e.preventDefault();
    const row = { name: $('#rmN').value.trim(), art: $('#rmA').value, plaetze: $('#rmP').value === '' ? null : +$('#rmP').value, notiz: $('#rmT').value.trim() || null, ...(r ? { aktiv: $('#rmAk').checked } : {}) };
    if (!row.name) return toast('Bitte einen Namen eintragen.');
    try { if (r) await q(sb.from('quali_raeume').update(row).eq('id', r.id)); else await q(sb.from('quali_raeume').insert({ ...row, betrieb_id: orgBetrieb() })); closeSheet(); toast('Gespeichert'); go(S.view); } catch (er) { toast(errText(er)); }
  };
}
function q9BuchSheet(b, raumId, datum) {
  const rs = (S.org.raeume || []).filter(r => r.aktiv !== false || r.id === b?.raum_id), gs = orgMyGroups().length ? orgMyGroups() : (S.qgr?.g || []), staff = orgStaff();
  const mine = !b || b.created_by === S.me.id || b.trainer_id === S.me.id || q9Team();
  sheetShell(b ? 'Buchung' : 'Raum buchen', `<form id="bkF" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="bkR">Raum</label><select id="bkR" class="field" ${mine ? '' : 'disabled'}>${rs.map(r => `<option value="${r.id}" ${(b?.raum_id || raumId) === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
    <div><label class="lbl" for="bkD">Datum</label><input id="bkD" type="date" class="field" value="${b?.datum || datum}" ${mine ? '' : 'disabled'}></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="bkV">Von</label><input id="bkV" type="time" step="900" class="field" value="${String(b?.von || '08:00').slice(0, 5)}" ${mine ? '' : 'disabled'}></div><div><label class="lbl" for="bkB">Bis</label><input id="bkB" type="time" step="900" class="field" value="${String(b?.bis || '12:00').slice(0, 5)}" ${mine ? '' : 'disabled'}></div></div>
    <div class="seg"><button type="button" data-bkq="08:00|12:00">Vormittag</button><button type="button" data-bkq="12:30|16:00">Nachmittag</button><button type="button" data-bkq="08:00|16:00">Ganzer Tag</button></div>
    <div><label class="lbl" for="bkG">Gruppe</label><select id="bkG" class="field" ${mine ? '' : 'disabled'}><option value="">– keine –</option>${gs.map(g => `<option value="${g.id}" ${b?.gruppe_id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
    <div><label class="lbl" for="bkT">Trainer/in</label><select id="bkT" class="field" ${mine ? '' : 'disabled'}>${staff.map(p => `<option value="${p.id}" ${(b?.trainer_id || S.me.id) === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></div>
    <div><label class="lbl" for="bkN">Notiz</label><input id="bkN" class="field" maxlength="300" value="${esc(b?.notiz || '')}" ${mine ? '' : 'disabled'}></div>
    <p id="bkW" class="text-[13px]" hidden style="color:var(--crit)"></p>
    ${mine ? `<button class="btn">Speichern</button>${b ? '<button type="button" class="btn ghost" id="bkDel">Buchung löschen</button>' : ''}` : '<p class="text-[12px] text-muted">Ändern kann diese Buchung, wer sie angelegt hat, der eingetragene Trainer oder die Koordination.</p>'}</form>`);
  $$('[data-bkq]').forEach(x => x.onclick = () => { const [v, bi] = x.dataset.bkq.split('|'); $('#bkV').value = v; $('#bkB').value = bi; chk(); });
  const chk = () => {
    const n = { id: b?.id, raum_id: $('#bkR').value, datum: $('#bkD').value, von: $('#bkV').value, bis: $('#bkB').value, trainer_id: $('#bkT').value, gruppe_id: $('#bkG').value };
    const all = S.org.buch || [], w = [];
    const r = all.find(x => x.id !== n.id && x.raum_id === n.raum_id && x.datum === n.datum && q9Overlap(x, n));
    if (r) w.push(`Der Raum ist ${String(r.von).slice(0, 5)}–${String(r.bis).slice(0, 5)} schon gebucht${r.gruppe_id ? ' (' + (qGruppe(r.gruppe_id)?.name || '') + ')' : ''}.`);
    const t = all.find(x => x.id !== n.id && x.trainer_id === n.trainer_id && x.datum === n.datum && q9Overlap(x, n));
    if (t) w.push(`${(S.profiles[n.trainer_id]?.full_name || 'Der Trainer').split(' ')[0]} ist zur gleichen Zeit in ${(S.org.raeume || []).find(z => z.id === t.raum_id)?.name || 'einem anderen Raum'} eingetragen.`);
    const g = n.gruppe_id && all.find(x => x.id !== n.id && x.gruppe_id === n.gruppe_id && x.datum === n.datum && q9Overlap(x, n));
    if (g) w.push('Die Gruppe ist zur gleichen Zeit schon in einem anderen Raum.');
    $('#bkW').hidden = !w.length; $('#bkW').textContent = w.join(' '); return { n, raumBelegt: !!r };
  };
  ['bkR', 'bkD', 'bkV', 'bkB', 'bkT', 'bkG'].forEach(id => $('#' + id) && ($('#' + id).onchange = chk)); chk();
  $('#bkF').onsubmit = async e => {
    e.preventDefault(); if (!mine) return;
    const { n, raumBelegt } = chk();
    if (!n.raum_id || !n.datum) return toast('Bitte Raum und Datum wählen.');
    if (n.bis <= n.von) return toast('„Bis“ muss nach „Von“ liegen.');
    if (raumBelegt) return toast('Doppelbelegung: Der Raum ist zu dieser Zeit schon gebucht.');
    const row = { raum_id: n.raum_id, datum: n.datum, von: n.von, bis: n.bis, gruppe_id: n.gruppe_id || null, trainer_id: n.trainer_id || null, notiz: $('#bkN').value.trim() || null };
    try { if (b) await q(sb.from('quali_buchungen').update(row).eq('id', b.id)); else await q(sb.from('quali_buchungen').insert({ ...row, betrieb_id: orgBetrieb(), created_by: S.me.id })); closeSheet(); toast('Gebucht'); go(S.view); } catch (er) { toast(errText(er)); }
  };
  $('#bkDel') && ($('#bkDel').onclick = e => qConfirm(e.currentTarget, async () => { try { await q(sb.from('quali_buchungen').delete().eq('id', b.id)); closeSheet(); go(S.view); } catch (er) { toast(errText(er)); } }));
}

/* =====================================================================
   10) Lesehilfe: Vorlesen und Fachbegriffe in einfacher Sprache
   ===================================================================== */
const Q_GLOSSAR = [
  ['Externenprüfung', 'Die Abschlussprüfung bei der IHK für Erwachsene, die keine normale Ausbildung gemacht haben. Danach hast du einen echten Berufsabschluss.'],
  ['Teilqualifizierung', 'Ein Beruf wird in kleine Teile (Module) aufgeteilt. Du lernst ein Teil nach dem anderen und bekommst für jedes Teil ein Zertifikat.'],
  ['Modul', 'Ein Lernabschnitt mit einem bestimmten Thema. Am Ende gibt es eine kleine Prüfung.'],
  ['IHK-Zertifikat', 'Eine Bescheinigung der Industrie- und Handelskammer. Sie zeigt: Dieses Modul hast du geschafft.'],
  ['IHK', 'Industrie- und Handelskammer. Sie macht die Prüfungen und stellt die Zeugnisse aus.'],
  ['Zulassung', 'Die Erlaubnis, an der Prüfung teilzunehmen. Die IHK prüft vorher deine Unterlagen.'],
  ['Anmeldeschluss', 'Der letzte Tag, an dem du dich für die Prüfung anmelden kannst.'],
  ['Rahmenplan', 'Die Liste mit allem, was man in diesem Beruf lernen muss.'],
  ['Lernwerkstatt', 'Die Werkstatt beim Bildungsträger. Hier übst du die Arbeit mit echten Werkzeugen und Maschinen.'],
  ['Grundkompetenz', 'Eine Phase am Anfang, in der du Grundlagen wie Rechnen, Lesen und Deutsch übst.'],
  ['Praktikum', 'Du arbeitest eine Zeit lang in einer Abteilung im Betrieb mit und lernst die Arbeit dort kennen.'],
  ['Nachweis', 'Hier schreibst du auf, was du jede Woche gelernt und gemacht hast. Das braucht die IHK für die Prüfung.'],
  ['Unterweisung', 'Eine Pflicht-Schulung zur Sicherheit. Du bestätigst danach, dass du sie gelesen und verstanden hast.'],
  ['Arbeitsschutz', 'Regeln, damit bei der Arbeit niemand verletzt oder krank wird.'],
  ['entschuldigt', 'Du hast gefehlt, aber mit gutem Grund und Bescheid gegeben, zum Beispiel mit Krankmeldung.'],
  ['unentschuldigt', 'Du hast gefehlt, ohne vorher Bescheid zu geben oder ohne Nachweis.'],
  ['Gefahrstoffe', 'Stoffe, die gefährlich sein können, zum Beispiel giftig oder leicht brennbar. Dafür gibt es besondere Regeln.'],
  ['Schaltplan', 'Eine Zeichnung, die zeigt, wie elektrische Teile verbunden sind.'],
  ['Kommissionieren', 'Waren für einen Auftrag aus dem Lager zusammensuchen und bereitstellen.'],
  ['Flurförderzeug', 'Ein Fahrzeug im Lager, zum Beispiel Gabelstapler oder Hubwagen.'],
  ['Vulkanisation', 'Gummi wird mit Wärme und Druck fest und elastisch gemacht.'],
  ['Extruder', 'Eine Maschine, die weichen Kunststoff oder Gummi durch eine Form presst – wie bei einer Nudelmaschine.'],
  ['Instandhaltung', 'Maschinen prüfen, pflegen und reparieren, damit sie gut laufen.'],
  ['Qualitätsprüfung', 'Kontrolle, ob ein Teil die richtigen Maße und die richtige Güte hat.']
];
const lhGet = (k, d) => { try { const v = localStorage.getItem('desk.lh.' + k); return v == null ? d : v === '1'; } catch { return d; } };
const lhSet = (k, v) => { try { localStorage.setItem('desk.lh.' + k, v ? '1' : '0'); } catch {} };
const lhOn = () => { try { return isQuali() && !!S.me; } catch { return false; } };
function lhSpeak(text) {
  if (!('speechSynthesis' in window)) return toast('Vorlesen wird von diesem Browser nicht unterstützt.');
  speechSynthesis.cancel();
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 6000); if (!t) return;
  const lang = { de: 'de-DE', en: 'en-GB', uk: 'uk-UA', ar: 'ar', tr: 'tr-TR', ru: 'ru-RU' }[typeof LANG === 'string' ? LANG : 'de'] || 'de-DE';
  const parts = t.match(/[^.!?]+[.!?]*\s*/g) || [t];
  parts.forEach((p, i) => { const u = new SpeechSynthesisUtterance(p); u.lang = lang; u.rate = 0.95; const v = speechSynthesis.getVoices().find(x => x.lang?.startsWith(lang.slice(0, 2))); if (v) u.voice = v;
    if (i === parts.length - 1) u.onend = () => lhBtnState(false); speechSynthesis.speak(u); });
  lhBtnState(true);
}
function lhBtnState(on) { const b = document.getElementById('lhBtn'); if (b) b.setAttribute('aria-pressed', String(!!on)); }
function lhEnsure() {
  let b = document.getElementById('lhBtn');
  if (!lhOn() || !lhGet('btn', true)) { b?.remove(); return; }
  if (b) return;
  b = document.createElement('button'); b.id = 'lhBtn'; b.className = 'lh-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Lesehilfe: vorlesen und Begriffe erklären'); b.setAttribute('aria-pressed', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
  b.onclick = lhMenu; document.body.appendChild(b);
}
function lhMenu() {
  if ('speechSynthesis' in window && speechSynthesis.speaking) { speechSynthesis.cancel(); lhBtnState(false); return; }
  const sel = String(getSelection?.() || '').trim();
  sheetShell('Lesehilfe', `<div class="card p-4 flex flex-col gap-2">
    ${sel ? '<button class="btn" id="lhSel">Markierten Text vorlesen</button>' : ''}
    <button class="btn ${sel ? 'ghost' : ''}" id="lhPage">Diese Seite vorlesen</button>
    <label class="flex items-start gap-2.5 text-[14px] mt-2"><input type="checkbox" id="lhGl" class="cbx mt-0.5" ${lhGet('gl', isAzubi()) ? 'checked' : ''}><span>Fachbegriffe erklären <span class="text-muted text-[12px] block">Schwierige Wörter sind gepunktet unterstrichen. Antippen zeigt eine Erklärung in einfacher Sprache.</span></span></label>
    <label class="flex items-start gap-2.5 text-[14px]"><input type="checkbox" id="lhShow" class="cbx mt-0.5" checked><span>Knopf „Lesehilfe“ anzeigen</span></label>
    <p class="text-[12px] text-muted mt-1">Tipp: Text markieren und dann auf den Lautsprecher tippen. Vorgelesen wird mit der Stimme deines Geräts in der eingestellten Sprache. Die App übersetzt Texte außerdem in Englisch, Ukrainisch und Arabisch (Sprache oben wählen).</p></div>`);
  $('#lhSel') && ($('#lhSel').onclick = () => { closeSheet(); lhSpeak(sel); });
  $('#lhPage').onclick = () => { closeSheet(); lhSpeak(document.querySelector('#app .view')?.innerText || document.querySelector('#app')?.innerText || ''); };
  $('#lhGl').onchange = e => { lhSet('gl', e.target.checked); render(); };
  $('#lhShow').onchange = e => { lhSet('btn', e.target.checked); if (!e.target.checked) toast('Ausgeblendet. Wieder einschalten: Profil › Barrierefreiheit … oder Seite neu laden mit ?lesehilfe'); lhEnsure(); };
}
try { if (/[?&]lesehilfe\b/.test(location.search)) lhSet('btn', true); } catch {}
const GL_RE = new RegExp('(^|[^\\p{L}])(' + Q_GLOSSAR.map(g => g[0].replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|') + ')(?![\\p{L}])', 'iu');
function q9Glossar(root) {
  if (!root || !lhOn() || !lhGet('gl', isAzubi()) || (typeof LANG === 'string' && LANG !== 'de')) return;
  const seen = new Set();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => !n.parentElement || n.parentElement.closest('button,a,input,select,textarea,label,script,style,[data-noterms],.gl-term,.seg,nav,h1') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const list = []; while (w.nextNode()) list.push(w.currentNode);
  for (const n of list) {
    const m = GL_RE.exec(n.nodeValue); if (!m) continue;
    const term = Q_GLOSSAR.find(g => g[0].toLowerCase() === m[2].toLowerCase()); if (!term || seen.has(term[0])) continue;
    seen.add(term[0]);
    const start = m.index + m[1].length, after = n.splitText(start); after.splitText(m[2].length);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gl-term'; b.dataset.gl = term[0]; b.textContent = after.nodeValue; b.setAttribute('aria-label', `${after.nodeValue} – Erklärung anzeigen`);
    after.parentNode.replaceChild(b, after);
    if (seen.size >= 12) break;
  }
}
document.addEventListener('click', e => {
  const t = e.target.closest('.gl-term'); document.querySelectorAll('.gl-pop').forEach(p => p.remove()); if (!t) return;
  e.preventDefault(); e.stopPropagation();
  const g = Q_GLOSSAR.find(x => x[0] === t.dataset.gl); if (!g) return;
  const p = document.createElement('div'); p.className = 'gl-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', g[0]);
  p.innerHTML = `<div class="font-semibold mb-1">${esc(g[0])}</div><div>${esc(g[1])}</div><button type="button" class="text-accent font-semibold text-[13px] mt-2" data-glsay>Vorlesen</button>`;
  document.body.appendChild(p);
  const r = t.getBoundingClientRect(), pw = Math.min(320, innerWidth - 24); p.style.width = pw + 'px';
  p.style.left = Math.max(12, Math.min(innerWidth - pw - 12, r.left)) + 'px';
  p.style.top = (r.bottom + 8 + p.offsetHeight > innerHeight ? Math.max(12, r.top - p.offsetHeight - 8) : r.bottom + 8) + 'px';
  p.querySelector('[data-glsay]').onclick = ev => { ev.stopPropagation(); lhSpeak(g[0] + '. ' + g[1]); };
}, true);
/* Einhängen: nach jedem Zeichnen der Seite Begriffe markieren, Lesehilfe-Knopf zeigen, Offline-Markierungen setzen */
const q9Terms0 = qTerms;
qTerms = function (root) {
  q9Terms0(root);
  try { q9Glossar(root); lhEnsure(); q9MatMarks(root); } catch {}
};
