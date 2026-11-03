/* Desk · Qualifizierungsmodus, Teil 8
   – Dienstplan der Trainer mit Kürzeln (Auswahlliste), Tagesübersicht „Wer macht was, wer hat frei“
   – TQ-Ablauf je Gruppe (Module, Pausen, Prüfungen, Praktika) mit farbiger Zeitleiste und PDF
   – Rechte-Übersicht für die Koordination
   Wird nach quali7.js und vor dem Hauptskript geladen; ersetzt die Einsatzplan-Funktionen aus quali6.js. */

/* ---------- Kürzel: [Kürzel, Bezeichnung, Art (e = Einsatz, a = abwesend/frei, h = Hinweis), Farbe] ---------- */
const DP_CODES = {
  W: ['W', 'Werkstatt', 'e', '#8a500b'], S: ['S', 'Schulungsraum', 'e', '#0f5c5f'], O: ['VS', 'Virtuelle Schulung', 'e', '#3b5bb5'],
  UV: ['UV', 'Unterrichtsvorbereitung', 'e', '#5d6d7e'], ORG: ['Org', 'Organisatorisch', 'e', '#6b6b6b'], P: ['P', 'Sonderprojekte', 'e', '#7d3c98'],
  BP: ['BP', 'Praxisphase / Praktikum', 'e', '#2e8b57'], '3B': ['3b', 'Tätig in GF 3b', 'e', '#1f7a8c'], PRF: ['PRF', 'TQ-Prüfung', 'e', '#c0392b'],
  A: ['A', 'Audit', 'e', '#b9770e'], K: ['K', 'Kritisch', 'h', '#e74c3c'],
  X: ['X', 'Schulungsfreie Zeit', 'a', '#95a5a6'], AS: ['AS', 'Sonderurlaub (Gleitzeit)', 'a', '#a9b4c2'], U: ['U', 'Urlaub', 'a', '#d4ac0d']
};
(() => {
  try { Object.keys(EIN_ART).forEach(k => delete EIN_ART[k]); Object.entries(DP_CODES).forEach(([k, v]) => { EIN_ART[k] = [v[0], v[1]]; }); } catch {}
  const css = Object.entries(DP_CODES).map(([k, v]) => `.ek-${k}{background:${v[3]}}`).join('') + `
  .ek-K{outline:2px solid #e74c3c;outline-offset:-2px;background:#fff;color:#c0392b}
  .tm-row{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-top:1px solid var(--line)}
  .tm-row:first-child{border-top:0}
  .tl{position:relative}
  .tl-head{position:relative;height:18px;font-size:10.5px;color:var(--muted);margin-left:var(--tlw)}
  .tl-head span{position:absolute;top:0;transform:translateX(2px);white-space:nowrap}
  .tl-row{display:grid;grid-template-columns:var(--tlw) minmax(0,1fr);align-items:center;gap:0;border-top:1px solid var(--line);min-height:40px}
  .tl-row .nm{font-size:12.5px;font-weight:600;padding:6px 8px 6px 0;line-height:1.25}
  .tl-bar{position:relative;height:28px;background:var(--sunk);border-radius:6px;overflow:hidden}
  .tl-seg{position:absolute;top:0;bottom:0;color:#fff;font-size:10.5px;font-weight:700;padding:0 4px;display:flex;align-items:center;overflow:hidden;white-space:nowrap;border-right:1px solid rgba(255,255,255,.6)}
  .tl-grid{position:absolute;top:0;bottom:0;width:1px;background:color-mix(in srgb,var(--line) 70%,transparent)}
  .tl-today{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--crit);z-index:2}
  .ab-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
  .ab-row [data-f="titel"]{grid-column:1/-1}
  .rm-tab{border-collapse:collapse;font-size:12.5px;min-width:100%}
  .rm-tab th,.rm-tab td{border-top:1px solid var(--line);padding:7px 6px;text-align:center}
  .rm-tab th:first-child,.rm-tab td:first-child{text-align:left;position:sticky;left:0;background:var(--surface);min-width:140px}
  .rm-tab thead th{font-size:11px;color:var(--muted);vertical-align:bottom;border-top:0;max-width:86px}
  .rm-tab input{width:18px;height:18px;accent-color:var(--accent)}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
const dpKind = a => DP_CODES[a]?.[2] || 'e';
const DP_EINSATZ = Object.keys(DP_CODES).filter(k => DP_CODES[k][2] === 'e'), DP_FREI = Object.keys(DP_CODES).filter(k => DP_CODES[k][2] === 'a');
const dpOpt = (sel, withEmpty = true) => `${withEmpty ? '<option value="">– nichts –</option>' : ''}<optgroup label="Einsatz">${DP_EINSATZ.map(k => `<option value="${k}" ${sel === k ? 'selected' : ''}>${DP_CODES[k][0]} – ${DP_CODES[k][1]}</option>`).join('')}</optgroup><optgroup label="Frei / abwesend">${DP_FREI.map(k => `<option value="${k}" ${sel === k ? 'selected' : ''}>${DP_CODES[k][0]} – ${DP_CODES[k][1]}</option>`).join('')}</optgroup><optgroup label="Hinweis"><option value="K" ${sel === 'K' ? 'selected' : ''}>K – Kritisch</option></optgroup>`;
const ekChip = e => `<span class="ek ek-${e.art} ${Number(e.anteil) < 1 ? 'half' : ''}" title="${esc(DP_CODES[e.art]?.[1] || '')}">${Number(e.anteil) < 1 ? '½' : ''}${esc(DP_CODES[e.art]?.[0] || e.art)}</span>`;

/* ---------- Zähler: Einsatztage für Audits, getrennt von Frei/Urlaub ---------- */
function orgEinSum(rows) {
  const s = Object.fromEntries(Object.keys(DP_CODES).map(k => [k, 0]));
  rows.forEach(r => { if (r.art in s) s[r.art] += Number(r.anteil) || 0; });
  const einsatz = rows.filter(r => dpKind(r.art) === 'e');
  return { ...s, tage: new Set(einsatz.map(r => r.datum)).size, sum: DP_EINSATZ.reduce((n, k) => n + s[k], 0), frei: DP_FREI.reduce((n, k) => n + s[k], 0) };
}
function orgEinHTML() {
  const m0 = S.org.einM + '-01', first = new Date(m0 + 'T12:00:00'), off = (first.getDay() + 6) % 7, nDays = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), today = localDate();
  const mon = S.org.einMon || [], tr = S.profiles[S.org.einT];
  const cells = []; for (let i = 0; i < off; i++) cells.push('<button class="out" tabindex="-1" aria-hidden="true"></button>');
  const ord = Object.keys(DP_CODES);
  for (let d = 1; d <= nDays; d++) {
    const ds = `${S.org.einM}-${String(d).padStart(2, '0')}`, wd = new Date(ds + 'T12:00:00').getDay(), es = mon.filter(e => e.datum === ds).sort((a, b) => ord.indexOf(a.art) - ord.indexOf(b.art));
    cells.push(`<button class="${wd === 0 || wd === 6 ? 'we' : ''} ${ds === today ? 'today' : ''}" data-ein="${ds}" aria-label="${fmtDate(ds)}${es.length ? ': ' + es.map(e => DP_CODES[e.art]?.[1]).join(', ') : ''}"><span class="dn">${d}</span>${es.map(ekChip).join('')}</button>`);
  }
  const ms = orgEinSum(mon), staff = orgStaff(), cnt = S.org.einCnt || [];
  const people = qCanTeam() ? staff.filter(p => cnt.some(r => r.trainer_id === p.id) || p.id === S.org.einT) : [S.me];
  const used = ord.filter(k => cnt.some(r => r.art === k)), cols = used.length ? used : DP_EINSATZ.slice(0, 4);
  const mName = first.toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' });
  const row = (name, s, b) => `<tr><td>${b ? '<b>' + esc(name) + '</b>' : esc(name)}</td>${cols.map(a => `<td ${dpKind(a) !== 'e' ? 'style="color:var(--muted)"' : ''}>${orgNum(s[a])}</td>`).join('')}<td><b>${orgNum(s.sum)}</b></td><td style="color:var(--muted)">${orgNum(s.frei)}</td></tr>`;
  const calPart = `${qCanTeam() ? `<div class="mt-3"><label class="lbl" for="einT">Trainer/in</label><select id="einT" class="field">${staff.map(p => `<option value="${p.id}" ${p.id === S.org.einT ? 'selected' : ''}>${esc(p.full_name)}${p.id === S.me.id ? ' (ich)' : ''}</option>`).join('')}</select></div>` : ''}
    <div class="flex items-center justify-between gap-2 mt-3"><button class="btn ghost py-2 px-3" id="einPrev" aria-label="Voriger Monat">‹</button>
      <div class="text-center"><div class="text-[15px] font-bold">${esc(mName)}</div><div class="text-[12px] text-muted">${esc(tr?.full_name || '')}</div></div>
      <button class="btn ghost py-2 px-3" id="einNext" aria-label="Nächster Monat">›</button></div>
    <div class="ein-cal mt-3">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<div class="wd">${w}</div>`).join('')}${cells.join('')}</div>
    <p class="text-[12px] text-muted mt-2">Tag antippen: eintragen und sehen, was die anderen Trainer machen und wer frei hat.</p>
    <details class="mt-2"><summary class="text-[12.5px] font-semibold text-accent cursor-pointer">Kürzel anzeigen</summary><div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-[12px] text-muted">${ord.map(a => `<span>${ekChip({ art: a, anteil: 1 })} ${esc(DP_CODES[a][1])}</span>`).join('')}<span>½ = halber Tag</span></div></details>`;
  const restPart = `
    <div class="card p-3.5 mt-3 grid grid-cols-3 gap-1 text-center"><div><div class="text-[18px] font-bold tnum">${orgNum(ms.sum)}</div><div class="text-[11px] text-muted">Einsatztage</div></div><div><div class="text-[18px] font-bold tnum">${orgNum(ms.frei)}</div><div class="text-[11px] text-muted">frei / Urlaub</div></div><div><div class="text-[18px] font-bold tnum">${mon.filter(e => e.art === 'K').length}</div><div class="text-[11px] text-muted">kritisch</div></div></div>
    <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="einRange">Zeitraum eintragen</button><button class="btn ghost" id="einTeamToday">Trainer DP Übersicht</button></div>
    ${qTlHTML()}
    ${secTitle('Zähler für Audits')}
    <div class="card p-4">
      <div class="seg">${[['m', 'Dieser Monat'], ['q', 'Quartal'], ['j', 'Dieses Jahr'], ['vj', 'Vorjahr'], ['12', '12 Monate']].map(([k, l]) => `<button data-cpre="${k}">${l}</button>`).join('')}</div>
      <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="lbl" for="cV">Von</label><input id="cV" type="date" class="field" value="${S.org.cV}" min="${qAddDays(today, -3653)}" max="${today}"></div><div><label class="lbl" for="cB">Bis</label><input id="cB" type="date" class="field" value="${S.org.cB}" min="${qAddDays(today, -3653)}"></div></div>
      <div class="overflow-x-auto mt-3"><table class="ein-tab"><thead><tr><th>Trainer/in (Tage)</th>${cols.map(a => `<th title="${esc(DP_CODES[a][1])}">${esc(DP_CODES[a][0])}</th>`).join('')}<th>Einsatz</th><th>Frei</th></tr></thead><tbody>
        ${people.map(p => row(p.full_name, orgEinSum(cnt.filter(r => r.trainer_id === p.id)))).join('')}
        ${people.length > 1 ? row('Gesamt', orgEinSum(cnt.filter(r => people.some(p => p.id === r.trainer_id))), true) : ''}
      </tbody></table></div>
      <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="einPdf">Einsatznachweis PDF</button><button class="btn ghost" id="einMail">Per E-Mail</button></div>
    </div>
    <p class="text-[12px] text-muted mt-3">„Einsatz“ zählt alle Tätigkeiten außer Frei, Urlaub und Sonderurlaub. Halbe Tage zählen 0,5. ${qCanTeam() ? 'Als Koordination kannst du für alle Trainer eintragen.' : 'Du trägst deine eigenen Tage ein; die Koordination sieht sie für die Auswertung.'}</p>`;
  return dpViewSw() + (S.org.dpView === 'grid' ? dpGridHTML() : calPart) + restPart;
}
function orgEinBind() {
  dpGridBind();
  $('#einT') && ($('#einT').onchange = () => { S.org.einT = $('#einT').value; go(S.view); });
  const mv = n => { S.org.einM = orgAddMonths(S.org.einM + '-01', n).slice(0, 7); go(S.view); };
  $('#einPrev').onclick = () => mv(-1); $('#einNext').onclick = () => mv(1);
  $$('[data-ein]').forEach(b => b.onclick = () => orgEinDaySheet(b.dataset.ein));
  $$('[data-dpv]').forEach(b => b.onclick = () => { S.org.dpView = b.dataset.dpv; try { localStorage.setItem('desk.dpView', S.org.dpView); } catch {} go(S.view); });
  $('#einRange').onclick = () => orgEinRangeSheet();
  $('#einTeamToday').onclick = () => qTeamDaySheet(localDate());
  const upd = () => { const v = $('#cV').value, b = $('#cB').value, min = qAddDays(localDate(), -3653); if (!v || !b) return; if (b < v) return toast('„Bis“ liegt vor „Von“.'); S.org.cV = v < min ? min : v; S.org.cB = b; go(S.view); };
  $('#cV').onchange = upd; $('#cB').onchange = upd;
  $$('[data-cpre]').forEach(b => b.onclick = () => {
    const t = localDate(), y = t.slice(0, 4), k = b.dataset.cpre;
    if (k === 'm') { S.org.cV = t.slice(0, 7) + '-01'; S.org.cB = t; }
    if (k === 'q') { const m = Math.floor((Number(t.slice(5, 7)) - 1) / 3) * 3 + 1; S.org.cV = `${y}-${String(m).padStart(2, '0')}-01`; S.org.cB = t; }
    if (k === 'j') { S.org.cV = y + '-01-01'; S.org.cB = t; }
    if (k === 'vj') { S.org.cV = (y - 1) + '-01-01'; S.org.cB = (y - 1) + '-12-31'; }
    if (k === '12') { S.org.cV = qAddDays(orgAddMonths(t, -12), 1); S.org.cB = t; }
    go(S.view);
  });
  $('#einPdf').onclick = async e => { const btn = e.currentTarget; btn.disabled = true; try { const r = await orgEinPdf(); r.doc.save(r.name); toast('PDF erstellt'); } catch (er) { toast(errText(er)); } finally { btn.disabled = false; PDF_DE = false; } };
  $('#einMail').onclick = () => qMailSheet('Einsatznachweis per E-Mail', () => orgEinPdf(), `Einsatznachweis ${fmtDate(S.org.cV)} bis ${fmtDate(S.org.cB)}`);
  qTlBind();
}

/* ---------- Tag eintragen: Kürzel per Auswahlliste, darunter das Team ---------- */
async function orgEinDaySheet(ds) {
  const es = (S.org.einMon || []).filter(e => e.datum === ds), tr = S.profiles[S.org.einT], gs = orgMyGroups();
  const full = es.find(e => Number(e.anteil) >= 1 && e.art !== 'K'), halves = es.filter(e => Number(e.anteil) < 1 && e.art !== 'K'), krit = es.some(e => e.art === 'K');
  const a1 = full?.art || halves[0]?.art || '', a2 = full ? '' : halves[1]?.art || '', half = !full && !!halves.length;
  sheetShell(`${orgWd(ds)}, ${fmtDate(ds)}`, `<form id="edForm" class="card p-4 flex flex-col gap-3">
    <div class="text-[13px] text-muted">${esc(tr?.full_name || '')}</div>
    <div><label class="lbl" for="edA1">Tätigkeit</label><select id="edA1" class="field">${dpOpt(a1)}</select></div>
    <div class="seg" id="edU"><button type="button" data-u="1" aria-pressed="${!half}">Ganzer Tag</button><button type="button" data-u="0.5" aria-pressed="${half}">Halber Tag</button></div>
    <div id="edA2w" ${half ? '' : 'hidden'}><label class="lbl" for="edA2">Zweite Tageshälfte <span class="font-normal text-muted">(optional)</span></label><select id="edA2" class="field">${dpOpt(a2)}</select></div>
    <label class="flex items-center gap-2 text-[14px]"><input type="checkbox" id="edK" ${krit ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--crit)">Tag als kritisch markieren (K)</label>
    ${gs.length ? `<div><label class="lbl" for="edG">Gruppe <span class="font-normal text-muted">(optional)</span></label><select id="edG" class="field"><option value="">–</option>${gs.map(g => `<option value="${g.id}" ${es[0]?.gruppe_id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>` : ''}
    <div><label class="lbl" for="edN">Notiz <span class="font-normal text-muted">(optional)</span></label><input id="edN" class="field" maxlength="300" value="${esc(es.find(e => e.notiz)?.notiz || '')}" placeholder="z. B. Audit-Vorbereitung, Webinar, Vertretung"></div>
    <button class="btn">Speichern</button></form>
    <div class="eyebrow mt-5">Team an diesem Tag</div><div id="edTeam" class="card mt-2"><div class="p-4 text-[13px] text-muted">Wird geladen …</div></div>`);
  $$('#edU button').forEach(b => b.onclick = () => { $$('#edU button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#edA2w').hidden = b.dataset.u === '1'; });
  $('#edForm').onsubmit = async e => {
    e.preventDefault();
    const halfOn = $('#edU [aria-pressed="true"]').dataset.u === '0.5', v1 = $('#edA1').value, v2 = halfOn ? $('#edA2').value : '';
    if (halfOn && v1 && v1 === v2) return toast('Für beide Hälften dieselbe Tätigkeit? Dann „Ganzer Tag“ wählen.');
    const want = []; if (v1) want.push([v1, halfOn ? 0.5 : 1]); if (v2) want.push([v2, 0.5]); if ($('#edK').checked) want.push(['K', 1]);
    const gid = $('#edG')?.value || null, notiz = $('#edN').value.trim() || null;
    try {
      const del = es.filter(x => !want.some(([a]) => a === x.art)).map(x => x.id);
      if (del.length) await q(sb.from('quali_einsatz').delete().in('id', del));
      if (want.length) await q(sb.from('quali_einsatz').upsert(want.map(([art, anteil]) => ({ betrieb_id: orgBetrieb(), trainer_id: S.org.einT, datum: ds, art, anteil, gruppe_id: gid, notiz, updated_at: new Date().toISOString() })), { onConflict: 'trainer_id,datum,art' }));
      closeSheet(); toast('Gespeichert'); go(S.view);
    } catch (er) { toast(errText(er)); }
  };
  try { $('#edTeam').innerHTML = await qTeamDayHTML(ds); } catch (er) { const t = $('#edTeam'); if (t) t.innerHTML = `<div class="p-4 text-[13px] text-muted">${esc(errText(er))}</div>`; }
}
function orgEinRangeSheet() {
  const t = localDate(), gs = orgMyGroups();
  sheetShell('Zeitraum eintragen', `<form id="erForm" class="card p-4 flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="erV">Von</label><input id="erV" type="date" class="field" required value="${qMonday(t)}"></div><div><label class="lbl" for="erB">Bis</label><input id="erB" type="date" class="field" required value="${qAddDays(qMonday(t), 4)}"></div></div>
    <div><label class="lbl" for="erA">Tätigkeit</label><select id="erA" class="field">${dpOpt('W', false)}</select></div>
    <div><div class="lbl">Umfang je Tag</div><div class="seg mt-1" id="erU"><button type="button" data-u="1" aria-pressed="true">Ganzer Tag</button><button type="button" data-u="0.5" aria-pressed="false">Halber Tag</button></div></div>
    <label class="flex items-center gap-2 text-[14px]"><input type="checkbox" id="erW" checked style="width:17px;height:17px;accent-color:var(--accent)">Nur Montag bis Freitag</label>
    ${gs.length ? `<div><label class="lbl" for="erG">Gruppe <span class="font-normal text-muted">(optional)</span></label><select id="erG" class="field"><option value="">–</option>${gs.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>` : ''}
    <button class="btn">Eintragen</button>
    <p class="text-[12px] text-muted">Zum Beispiel eine Urlaubswoche (U) oder eine Praxisphase (BP) auf einmal. Bestehende Einträge mit demselben Kürzel werden überschrieben.</p></form>`);
  $$('#erU button').forEach(b => b.onclick = () => $$('#erU button').forEach(x => x.setAttribute('aria-pressed', x === b)));
  $('#erForm').onsubmit = async e => {
    e.preventDefault();
    const v = $('#erV').value, b = $('#erB').value, art = $('#erA').value, anteil = Number($('#erU [aria-pressed="true"]').dataset.u), wk = $('#erW').checked;
    if (!v || !b || b < v) return toast('Bitte den Zeitraum prüfen.');
    if (orgDays(v, b) > 185) return toast('Höchstens ein halbes Jahr auf einmal.');
    const rows = []; for (let d = v; d <= b; d = qAddDays(d, 1)) { const wd = new Date(d + 'T12:00:00').getDay(); if (!wk || (wd !== 0 && wd !== 6)) rows.push({ betrieb_id: orgBetrieb(), trainer_id: S.org.einT, datum: d, art, anteil, gruppe_id: $('#erG')?.value || null, updated_at: new Date().toISOString() }); }
    if (!rows.length) return toast('Keine Tage im Zeitraum.');
    try { await q(sb.from('quali_einsatz').upsert(rows, { onConflict: 'trainer_id,datum,art' })); closeSheet(); toast(`${rows.length} Tage eingetragen`); S.org.einM = v.slice(0, 7); go(S.view); } catch (er) { toast(errText(er)); }
  };
}

/* ---------- Wer macht was, wer hat frei (alle Trainer und Koordination) ---------- */
async function qTeamDayHTML(ds) {
  const staff = orgStaff();
  const [ein, kb, abs] = await Promise.all([
    q(sb.from('quali_einsatz').select('trainer_id,art,anteil,gruppe_id,notiz').eq('datum', ds)),
    sb.from('klassenbuch').select('gruppe_id,dozent,trainer_id,unterrichtsart').eq('datum', ds).then(r => r.data || [], () => []),
    sb.from('absences').select('user_id,typ,von,bis,status').lte('von', ds).gte('bis', ds).then(r => r.data || [], () => [])]);
  const info = staff.map(p => {
    const e = ein.filter(x => x.trainer_id === p.id), a = abs.find(x => x.user_id === p.id && (x.status || 'genehmigt') !== 'abgelehnt');
    const k = kb.filter(x => x.trainer_id === p.id || (x.dozent && x.dozent === p.full_name));
    const frei = !!a || (e.length && e.filter(x => x.art !== 'K').every(x => dpKind(x.art) === 'a'));
    const st = frei ? 1 : e.some(x => dpKind(x.art) === 'e') || k.length ? 0 : 2;
    return { p, e, a, k, st };
  }).sort((x, y) => x.st - y.st || x.p.full_name.localeCompare(y.p.full_name));
  const n = s => info.filter(i => i.st === s).length;
  return `<div class="p-3 text-[12.5px] text-muted border-b border-line">${fmtDate(ds)}: <b class="text-fg">${n(0)}</b> im Einsatz · <b class="text-fg">${n(1)}</b> frei / Urlaub · <b class="text-fg">${n(2)}</b> ohne Eintrag</div>`
    + info.map(({ p, e, a, k, st }) => `<div class="tm-row">${avatar(p, 32)}<div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(p.full_name)}${p.id === S.me.id ? ' <span class="text-muted font-normal">(ich)</span>' : ''}</div>
      <div class="flex flex-wrap items-center gap-1 mt-1">${e.map(x => `${ekChip(x)}<span class="text-[12px]">${esc(DP_CODES[x.art]?.[1] || '')}${x.gruppe_id && qGruppe(x.gruppe_id) ? ' · ' + esc(qGruppe(x.gruppe_id).name) : ''}</span>`).join('<span class="text-muted">·</span>')}
        ${a ? `<span class="chip ${ABS_TONE?.[a.typ] || ''}">${esc(a.typ)}</span>` : ''}${k.map(x => `<span class="chip">Klassenbuch ${esc(qGruppe(x.gruppe_id)?.name || '')}</span>`).join('')}
        ${!e.length && !a && !k.length ? '<span class="text-[12px] text-muted">nichts eingetragen</span>' : ''}</div>
      ${e.find(x => x.notiz) ? `<div class="text-[12px] text-muted mt-0.5">${esc(e.find(x => x.notiz).notiz)}</div>` : ''}</div>
      <span class="chip ${st === 0 ? 'ok' : st === 1 ? 'brass' : ''} flex-none">${st === 0 ? 'im Einsatz' : st === 1 ? 'frei' : 'offen'}</span></div>`).join('');
}
/* Trainer DP Übersicht: beliebiger Tag oder ganze Woche – Vergangenheit, heute, Zukunft */
async function qTeamDaySheet(ds, mode) {
  S.org ||= {}; mode = mode || S.org.dpMode || 'tag'; S.org.dpMode = mode;
  const today = localDate(), mon = qMonday(ds), step = mode === 'woche' ? 7 : 1;
  const rel = ds === today ? 'heute' : ds < today ? 'Vergangenheit' : 'geplant';
  sheetShell('Trainer DP Übersicht', `<div class="seg" role="group" aria-label="Ansicht"><button data-dpm="tag" aria-pressed="${mode === 'tag'}">Tag</button><button data-dpm="woche" aria-pressed="${mode === 'woche'}">Woche</button></div>
    <div class="flex items-center gap-2 mt-3"><button class="btn ghost py-2 px-3" id="tdPrev" aria-label="Zurück">‹</button>
      <input id="tdDate" type="${mode === 'woche' ? 'week' : 'date'}" class="field flex-1 min-w-0" value="${mode === 'woche' ? `${mon.slice(0, 4)}-W${String(orgKw(mon)).padStart(2, '0')}` : ds}" aria-label="Datum wählen">
      <button class="btn ghost py-2 px-3" id="tdNext" aria-label="Weiter">›</button></div>
    <div class="flex items-center justify-between mt-2 text-[13px]"><span class="font-semibold">${mode === 'woche' ? `KW ${orgKw(mon)} · ${fmtDate(mon)} – ${fmtDate(qAddDays(mon, 6))}` : `${orgWd(ds)}, ${fmtDate(ds)}`} <span class="chip ${rel === 'heute' ? 'ok' : rel === 'geplant' ? 'brass' : ''}">${mode === 'woche' ? (mon === qMonday(today) ? 'diese Woche' : mon < qMonday(today) ? 'Vergangenheit' : 'geplant') : rel}</span></span>
      ${ds !== today ? '<button class="text-accent font-semibold" id="tdToday">Heute</button>' : ''}</div>
    <div id="tdList" class="card mt-3"><div class="p-4 text-[13px] text-muted">Wird geladen …</div></div>`);
  $$('[data-dpm]').forEach(b => b.onclick = () => qTeamDaySheet(ds, b.dataset.dpm));
  $('#tdPrev').onclick = () => qTeamDaySheet(qAddDays(ds, -step), mode); $('#tdNext').onclick = () => qTeamDaySheet(qAddDays(ds, step), mode);
  $('#tdToday') && ($('#tdToday').onclick = () => qTeamDaySheet(today, mode));
  $('#tdDate').onchange = () => { const v = $('#tdDate').value; if (!v) return;
    if (mode === 'woche') { const m = /^(\d{4})-W(\d{2})$/.exec(v); if (!m) return; const j4 = qMonday(localDate(new Date(+m[1], 0, 4, 12))); qTeamDaySheet(qAddDays(j4, (+m[2] - 1) * 7), mode); }
    else qTeamDaySheet(v, mode); };
  try { $('#tdList').innerHTML = mode === 'woche' ? await qTeamWeekHTML(mon) : await qTeamDayHTML(ds); bindDpWeek(); }
  catch (er) { const t = $('#tdList'); if (t) t.innerHTML = `<div class="p-4 text-[13px] text-muted">${esc(errText(er))}</div>`; }
}
/* Woche: Trainer × Tage mit Kürzeln; Tag antippen zeigt Einzelheiten */
async function qTeamWeekHTML(mon) {
  const staff = orgStaff(), days = Array.from({ length: 7 }, (_, i) => qAddDays(mon, i)), bis = days[6], today = localDate();
  const [ein, abs] = await Promise.all([
    q(sb.from('quali_einsatz').select('trainer_id,datum,art,anteil,gruppe_id,notiz').gte('datum', mon).lte('datum', bis)),
    sb.from('absences').select('user_id,typ,von,bis,status').lte('von', bis).gte('bis', mon).then(r => r.data || [], () => [])]);
  const show = days.filter((d, i) => i < 5 || ein.some(e => e.datum === d));
  const ord = Object.keys(DP_CODES);
  const cell = (p, d) => {
    const es = ein.filter(e => e.trainer_id === p.id && e.datum === d).sort((a, b) => ord.indexOf(a.art) - ord.indexOf(b.art));
    const a = abs.find(x => x.user_id === p.id && x.von <= d && d <= x.bis && (x.status || 'genehmigt') !== 'abgelehnt');
    return `<td style="padding:5px 3px;border-top:1px solid var(--line);text-align:center;${d === today ? 'background:color-mix(in srgb,var(--accent) 8%,transparent)' : ''}"><button data-dpwd="${d}" style="background:none;border:0;padding:0;display:flex;flex-wrap:wrap;gap:2px;justify-content:center;min-height:22px;width:100%">${es.map(ekChip).join('')}${a ? `<span class="chip ${ABS_TONE?.[a.typ] || ''}" style="font-size:10px;padding:1px 5px">${esc(a.typ)}</span>` : ''}${!es.length && !a ? '<span class="text-muted text-[11px]">–</span>' : ''}</button></td>`;
  };
  const cnt = d => { const ids = new Set(ein.filter(e => e.datum === d && dpKind(e.art) === 'e').map(e => e.trainer_id)); return ids.size; };
  const frei = d => new Set([...ein.filter(e => e.datum === d && dpKind(e.art) === 'a').map(e => e.trainer_id), ...abs.filter(x => x.von <= d && d <= x.bis).map(x => x.user_id)]).size;
  return `<div class="overflow-x-auto"><table style="border-collapse:collapse;font-size:12.5px;width:100%;min-width:${120 + show.length * 64}px">
    <thead><tr><th style="text-align:left;padding:8px;font-size:11px;color:var(--muted)">Trainer/in</th>${show.map(d => `<th style="padding:6px 3px;font-size:11px;color:${d === today ? 'var(--accent)' : 'var(--muted)'}"><button data-dpwd="${d}" style="background:none;border:0;color:inherit;font:inherit;font-weight:700">${orgWd(d)}<br>${d.slice(8, 10)}.${d.slice(5, 7)}.</button></th>`).join('')}</tr></thead>
    <tbody>${staff.map(p => `<tr><td style="padding:7px 8px;border-top:1px solid var(--line);font-weight:600;white-space:nowrap">${esc(p.full_name)}${p.id === S.me.id ? ' <span class="text-muted font-normal">(ich)</span>' : ''}</td>${show.map(d => cell(p, d)).join('')}</tr>`).join('')}
      <tr><td style="padding:7px 8px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted)">im Einsatz / frei</td>${show.map(d => `<td style="text-align:center;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted)">${cnt(d)} / ${frei(d)}</td>`).join('')}</tr></tbody></table></div>
    <div class="p-3 text-[12px] text-muted border-t border-line">Tag antippen für Einzelheiten. ${Object.keys(DP_CODES).map(k => `${DP_CODES[k][0]} = ${DP_CODES[k][1]}`).join(' · ')}</div>`;
}
function bindDpWeek() { $$('[data-dpwd]').forEach(b => b.onclick = () => qTeamDaySheet(b.dataset.dpwd, 'tag')); }

async function orgEinPdf() {
  const von = S.org.cV, bis = S.org.cB, cnt = S.org.einCnt || [], staff = orgStaff();
  const people = qCanTeam() ? staff.filter(p => cnt.some(r => r.trainer_id === p.id)) : [S.me];
  if (!people.length) throw new Error('Im Zeitraum sind keine Einsätze eingetragen.');
  const full = await orgFetch('quali_einsatz', 'datum', von, bis);
  const P = await qPdfStart(true), { doc, FONT, W, M } = P, title = 'Einsatznachweis Trainer';
  const cols = Object.keys(DP_CODES).filter(k => cnt.some(r => r.art === k));
  doc.setFont(FONT, 'bold'); doc.setFontSize(16); doc.text(pdfSafe(title), M, 16);
  doc.setFont(FONT, 'normal'); doc.setFontSize(10); doc.setTextColor(80); doc.text(pdfSafe(`${S.hotel || ''} · Zeitraum ${fmtDate(von)} bis ${fmtDate(bis)} · Angaben in Tagen, halbe Tage = 0,5`), M, 22); doc.setTextColor(0);
  const nW = 58, cw = Math.min(16, (W - 2 * M - nW - 2 * 18) / Math.max(1, cols.length));
  let y = 32;
  doc.setFillColor(238, 242, 242); doc.rect(M, y - 4.5, W - 2 * M, 7, 'F'); doc.setFont(FONT, 'bold'); doc.setFontSize(8.5);
  doc.text(pdfSafe('Trainer/in'), M + 1.5, y); cols.forEach((k, i) => doc.text(pdfSafe(DP_CODES[k][0]), M + nW + i * cw + cw / 2, y, { align: 'center' }));
  doc.text('Einsatz', M + nW + cols.length * cw + 9, y, { align: 'center' }); doc.text('Frei', M + nW + cols.length * cw + 27, y, { align: 'center' }); y += 7;
  const line = (name, s, bold) => { doc.setFont(FONT, bold ? 'bold' : 'normal'); doc.text(pdfSafe(name), M + 1.5, y); cols.forEach((k, i) => doc.text(orgNum(s[k]), M + nW + i * cw + cw / 2, y, { align: 'center' })); doc.text(orgNum(s.sum), M + nW + cols.length * cw + 9, y, { align: 'center' }); doc.text(orgNum(s.frei), M + nW + cols.length * cw + 27, y, { align: 'center' }); y += 6; };
  people.forEach(p => line(p.full_name, orgEinSum(cnt.filter(r => r.trainer_id === p.id))));
  if (people.length > 1) { doc.setDrawColor(200); doc.line(M, y - 4, W - M, y - 4); line('Gesamt', orgEinSum(cnt.filter(r => people.some(p => p.id === r.trainer_id))), true); }
  y += 2; doc.setFontSize(7.5); doc.setTextColor(90);
  doc.text(doc.splitTextToSize(pdfSafe(cols.map(k => `${DP_CODES[k][0]} = ${DP_CODES[k][1]}`).join(' · ') + ' · „Einsatz“ ohne Frei, Urlaub und Sonderurlaub; K = kritisch (Hinweis).'), W - 2 * M), M, y); doc.setTextColor(0); y += 10;
  people.forEach(p => {
    const rows = full.filter(r => r.trainer_id === p.id).sort((a, b) => a.datum.localeCompare(b.datum) || a.art.localeCompare(b.art)); if (!rows.length) return;
    if (y > 180) { doc.addPage(); y = 16; }
    doc.setFont(FONT, 'bold'); doc.setFontSize(11); doc.text(pdfSafe('Einzelnachweis: ' + p.full_name), M, y); y += 6; doc.setFont(FONT, 'normal'); doc.setFontSize(8.5);
    rows.forEach(r => { if (y > 196) { doc.addPage(); y = 16; }
      doc.text(pdfSafe(`${orgWd(r.datum)} ${fmtDate(r.datum)}`), M + 1.5, y); doc.text(pdfSafe(`${Number(r.anteil) < 1 ? '½ ' : ''}${DP_CODES[r.art]?.[0] || r.art} – ${DP_CODES[r.art]?.[1] || ''}`), M + 30, y);
      doc.text(pdfSafe([qGruppe(r.gruppe_id)?.name, r.notiz].filter(Boolean).join(' · ')).slice(0, 110), M + 105, y); y += 4.6; });
    y += 6;
  });
  if (y > 182) { doc.addPage(); y = 30; }
  y += 10; doc.setDrawColor(120); doc.line(M, y, M + 70, y); doc.line(W - M - 70, y, W - M, y);
  doc.setFontSize(8); doc.setTextColor(90); doc.text(pdfSafe('Datum, Unterschrift Trainer/in'), M, y + 4); doc.text(pdfSafe('Datum, Unterschrift Koordination'), W - M - 70, y + 4); doc.setTextColor(0);
  P.foot(title);
  return { doc, name: `Einsatznachweis_${von}_${bis}.pdf`, subject: `Einsatznachweis ${fmtDate(von)} bis ${fmtDate(bis)}` };
}

/* =====================================================================
   TQ-Ablauf je Gruppe: Module, TQ-Pausen, Prüfungen, Praktika
   ===================================================================== */
const AB_TYP = { tq: ['TQ / Modul', '#2f6fb3'], pause: ['TQ-Pause', '#9aa3ad'], pruefung: ['Prüfung', '#c0392b'], praktikum: ['Praktikum', '#2e8b57'], gk: ['Grundkompetenz', '#8e44ad'], urlaub: ['Ferien / Urlaub', '#d4ac0d'], sonst: ['Sonstiges', '#6b6b6b'] };
const abSorted = g => (Array.isArray(g?.ablauf) ? g.ablauf : []).filter(p => p && p.von && p.bis).slice().sort((a, b) => a.von.localeCompare(b.von));
const abLabel = p => p.titel || (p.typ === 'tq' && p.modul ? `Modul ${p.modul}` : AB_TYP[p.typ]?.[0] || '');
function qAblaufSheet(g0) {
  const g = qGruppe(g0?.id || g0); if (!g) return;
  let rows = abSorted(g).map(p => ({ ...p }));
  const k = Q_KATALOG[g.kurs];
  const rowHTML = (p, i) => `<div class="ab-row" data-ab="${i}">
    <select class="field" data-f="typ" aria-label="Art">${Object.entries(AB_TYP).map(([t, [l]]) => `<option value="${t}" ${p.typ === t ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <input class="field" data-f="titel" maxlength="120" value="${esc(p.titel || '')}" placeholder="${p.typ === 'tq' ? 'z. B. Modul 2: Baugruppen herstellen' : 'Bezeichnung (optional)'}" aria-label="Bezeichnung">
    <input class="field" type="date" data-f="von" value="${p.von || ''}" aria-label="Von"><input class="field" type="date" data-f="bis" value="${p.bis || ''}" aria-label="Bis">
    <input class="field" type="number" min="1" max="12" data-f="modul" value="${p.modul || ''}" placeholder="Modul" aria-label="Modul-Nr." ${p.typ === 'tq' ? '' : 'disabled'}>
    <button type="button" class="btn ghost py-1.5 px-2" data-abdel="${i}" aria-label="Zeile löschen">✕</button>
    <div class="text-[11.5px] text-muted" style="grid-column:1/-1" data-kt="${i}">${abDauer(p)}</div></div>`;
  const read = () => { rows = $$('[data-ab]').map(r => { const o = {}; r.querySelectorAll('[data-f]').forEach(f => { o[f.dataset.f] = f.value.trim(); }); o.modul = o.typ === 'tq' && o.modul ? Number(o.modul) : null; return o; }); };
  const draw = () => {
    $('#abRows').innerHTML = rows.length ? rows.map(rowHTML).join('') : '<div class="text-[13px] text-muted p-2">Noch keine Abschnitte. Füge welche hinzu oder lass sie aus dem Kurs vorschlagen.</div>';
    $$('[data-abdel]').forEach(b => b.onclick = () => { read(); rows.splice(+b.dataset.abdel, 1); draw(); });
    $$('[data-ab] [data-f="typ"]').forEach(s => s.onchange = () => { read(); draw(); });
    $$('[data-ab] input[type="date"]').forEach(x => x.onchange = () => { const r = x.closest('[data-ab]'), i = r.dataset.ab; r.querySelector('[data-kt]').textContent = abDauer({ von: r.querySelector('[data-f="von"]').value, bis: r.querySelector('[data-f="bis"]').value }); });
  };
  sheetShell(`TQ-Ablauf · ${g.name}`, `<div class="flex flex-col gap-3">
    <p class="text-[13px] text-muted">Plane die Abschnitte der Gruppe: Module der TQ, TQ-Pausen, Prüfungen, Praktika. Die farbige Übersicht steht im Dienstplan und lässt sich als PDF exportieren.</p>
    ${k ? `<div class="card p-3 flex flex-wrap items-end gap-2"><div class="flex-1 min-w-[150px]"><label class="lbl" for="abStart">Aus Kurs „${esc(k.kurz)}“ vorschlagen ab</label><input id="abStart" type="date" class="field" value="${abSorted(g)[0]?.von || localDate()}"></div><button type="button" class="btn ghost" id="abSugg">Vorschlagen</button></div>` : '<p class="text-[12px] text-muted">Tipp: Ordnest du der Gruppe einen Kurs zu, kann der Ablauf aus den Modulen vorgeschlagen werden.</p>'}
    <div class="flex flex-col gap-2" id="abRows"></div>
    <div class="grid grid-cols-2 gap-2"><button type="button" class="btn ghost" id="abAdd">+ Abschnitt</button><button type="button" class="btn ghost" id="abAddP">+ Prüfung / Pause</button></div>
    <label class="flex items-start gap-2 text-[13.5px]"><input type="checkbox" id="abSync" checked style="width:17px;height:17px;margin-top:2px;accent-color:var(--accent)">Modulzeiten (Von/Bis) bei den Teilnehmenden der Gruppe übernehmen</label>
    <button class="btn" id="abSave">Speichern</button></div>`);
  draw();
  $('#abAdd').onclick = () => { read(); const last = rows[rows.length - 1]; const v = last?.bis ? qAddDays(last.bis, 1) : localDate(); rows.push({ typ: 'tq', titel: '', von: v, bis: orgAddMonths(v, 3), modul: (rows.filter(r => r.typ === 'tq').length || 0) + 1 }); draw(); };
  $('#abAddP').onclick = () => { read(); const last = rows[rows.length - 1]; const v = last?.bis ? qAddDays(last.bis, 1) : localDate(); rows.push({ typ: 'pruefung', titel: 'Modulprüfung', von: v, bis: v }); draw(); };
  $('#abSugg') && ($('#abSugg').onclick = () => {
    let d = $('#abStart').value || localDate(); rows = [];
    k.module.forEach((m, i) => { const bis = qAddDays(orgAddMonths(d, Math.max(0.5, m.monate || 1) | 0 || 1), -1);
      rows.push({ typ: 'tq', titel: `Modul ${m.nr}: ${m.titel}`.slice(0, 120), von: d, bis, modul: m.nr });
      rows.push({ typ: 'pruefung', titel: `Prüfung Modul ${m.nr}`, von: qAddDays(bis, -2), bis: bis });
      d = qAddDays(bis, 1); if (i < k.module.length - 1 && i % 2 === 1) { rows.push({ typ: 'pause', titel: 'TQ-Pause', von: d, bis: qAddDays(d, 13) }); d = qAddDays(d, 14); } });
    draw(); toast('Vorschlag erstellt – bitte Daten prüfen');
  });
  $('#abSave').onclick = async () => {
    read();
    const bad = rows.find(r => !r.von || !r.bis || r.bis < r.von); if (bad) return toast('Bitte bei jedem Abschnitt Von und Bis prüfen.');
    const ablauf = rows.sort((a, b) => a.von.localeCompare(b.von)).map(r => ({ typ: r.typ, titel: r.titel || null, von: r.von, bis: r.bis, modul: r.modul || null }));
    try {
      await q(sb.from('quali_gruppen').update({ ablauf }).eq('id', g.id));
      if ($('#abSync').checked) {
        const mods = ablauf.filter(r => r.typ === 'tq' && r.modul);
        const mem = (S.quali.rows || []).filter(r => r.gruppe_id === g.id);
        for (const t of mem) {
          const cur = Array.isArray(t.module) ? t.module.map(m => ({ ...m })) : [];
          mods.forEach(m => { const x = cur.find(c => c.nr === m.modul); if (x) { x.von = m.von; x.bis = m.bis; } else cur.push({ nr: m.modul, status: 'offen', von: m.von, bis: m.bis }); });
          const first = ablauf[0]?.von, last = ablauf[ablauf.length - 1]?.bis;
          await q(sb.from('quali_teilnahmen').update({ module: cur, beginn: t.beginn || first || null, ende: t.ende || last || null, updated_at: new Date().toISOString() }).eq('id', t.id));
          t.module = cur;
        }
      }
      closeSheet(); await qGroupsLoad(); toast('TQ-Ablauf gespeichert'); go(S.view);
    } catch (er) { toast(errText(er)); }
  };
}
/* Zeitleiste über mehrere Gruppen */
function qTlRange() { const t = localDate(); S.org.tlV ||= orgAddMonths(t.slice(0, 7) + '-01', -1); S.org.tlB ||= qAddDays(orgAddMonths(S.org.tlV, 7), -1); return [S.org.tlV, S.org.tlB]; }
function qTlGroups() { return (qCanTeam() ? (S.qgr?.g || []) : orgMyGroups()).filter(g => abSorted(g).length || g.trainer_id === S.me.id).slice().sort((a, b) => a.name.localeCompare(b.name)); }
function qTlBarHTML() {
  const [v, b] = qTlRange(), tot = Math.max(1, orgDays(v, b) + 1), gs = qTlGroups(), today = localDate();
  const pos = d => Math.max(0, Math.min(100, orgDays(v, d) * 100 / tot));
  const months = []; for (let m = v.slice(0, 7) + '-01'; m <= b; m = orgAddMonths(m, 1)) if (m >= v) months.push(m); else months.push(null);
  const ticks = months.filter(Boolean);
  const curOf = g => abSorted(g).find(p => p.von <= today && today <= p.bis);
  const seg = p => { const l = pos(p.von < v ? v : p.von), r = pos(p.bis > b ? b : qAddDays(p.bis, 1)); if (p.bis < v || p.von > b) return '';
    return `<div class="tl-seg" style="left:${l}%;width:${Math.max(0.6, r - l)}%;background:${AB_TYP[p.typ]?.[1] || '#888'}" title="${esc(abLabel(p))}: ${fmtDate(p.von)}–${fmtDate(p.bis)} (${abKt(p)} Kalendertage)">${esc(abLabel(p))}</div>`; };
  return `${secTitle('TQ-Ablauf der Gruppen')}
    <div class="card p-4">
      <div class="seg">${[['3', '3 Monate'], ['6', '6 Monate'], ['12', '12 Monate'], ['all', 'Gesamt']].map(([k, l]) => `<button data-tlp="${k}">${l}</button>`).join('')}</div>
      <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="lbl" for="tlV">Von</label><input id="tlV" type="date" class="field" value="${v}"></div><div><label class="lbl" for="tlB">Bis</label><input id="tlB" type="date" class="field" value="${b}"></div></div>
      ${gs.length ? `<div class="overflow-x-auto mt-4"><div class="tl" style="--tlw:118px;min-width:560px">
        <div class="tl-head">${ticks.map(m => `<span style="left:${pos(m)}%">${new Date(m + 'T12:00:00').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}</span>`).join('')}</div>
        ${gs.map(g => `<div class="tl-row"><div class="nm">${esc(g.name)}${curOf(g) ? `<div class="text-[11px] font-normal text-muted">jetzt: ${esc(abLabel(curOf(g)))}</div>` : ''}</div>
          <div class="tl-bar">${ticks.map(m => `<i class="tl-grid" style="left:${pos(m)}%"></i>`).join('')}${abSorted(g).map(seg).join('')}${today >= v && today <= b ? `<i class="tl-today" style="left:${pos(today)}%" title="heute"></i>` : ''}
          ${!abSorted(g).length ? '<span class="absolute inset-0 flex items-center px-2 text-[11px] text-muted">noch kein Ablauf</span>' : ''}</div></div>`).join('')}
      </div></div>
      <div class="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[12px] text-muted">${Object.entries(AB_TYP).map(([, [l, c]]) => `<span class="inline-flex items-center gap-1.5"><i style="width:12px;height:12px;border-radius:3px;background:${c};display:inline-block"></i>${l}</span>`).join('')}<span class="inline-flex items-center gap-1.5"><i style="width:2px;height:12px;background:var(--crit);display:inline-block"></i>heute</span></div>
      <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="tlEdit">Ablauf bearbeiten</button><button class="btn ghost" id="tlPdf">Als PDF</button></div>`
      : '<div class="text-[13px] text-muted mt-3">Noch keine Gruppe mit Ablauf. Unter Verwaltung › Gruppen › „TQ-Ablauf“ planst du Module, Pausen und Prüfungen.</div>'}
    </div>`;
}
function qTlBarBind() {
  const upd = () => { const v = $('#tlV').value, b = $('#tlB').value; if (!v || !b || b < v) return toast('Bitte den Zeitraum prüfen.'); S.org.tlV = v; S.org.tlB = b; render(); };
  $('#tlV') && ($('#tlV').onchange = upd); $('#tlB') && ($('#tlB').onchange = upd);
  $$('[data-tlp]').forEach(x => x.onclick = () => {
    const t = localDate(), k = x.dataset.tlp;
    if (k === 'all') { const all = qTlGroups().flatMap(abSorted); if (!all.length) return; S.org.tlV = all.map(p => p.von).sort()[0]; S.org.tlB = all.map(p => p.bis).sort().pop(); }
    else { S.org.tlV = t.slice(0, 7) + '-01'; S.org.tlB = qAddDays(orgAddMonths(S.org.tlV, +k), -1); }
    render();
  });
  $('#tlEdit') && ($('#tlEdit').onclick = () => { const gs = qTlGroups().filter(g => qCanTeam() || g.trainer_id === S.me.id); if (gs.length === 1) return qAblaufSheet(gs[0]);
    sheetShell('Welche Gruppe?', `<div class="card">${gs.map((g, i) => `<button class="w-full text-left p-3.5 text-[14px] font-semibold ${i ? 'border-t border-line' : ''}" data-tlg="${g.id}">${esc(g.name)}</button>`).join('') || '<div class="p-4 text-[13px] text-muted">Den Ablauf bearbeitet die Trainerin oder der Trainer der Gruppe.</div>'}</div>`);
    $$('[data-tlg]').forEach(b => b.onclick = () => qAblaufSheet(b.dataset.tlg)); });
  $('#tlPdf') && ($('#tlPdf').onclick = async e => { const btn = e.currentTarget; btn.disabled = true; try { const r = await qTlPdf(); r.doc.save(r.name); toast('PDF erstellt'); } catch (er) { toast(errText(er)); } finally { btn.disabled = false; PDF_DE = false; } });
}
async function qTlBarPdf() {
  const [v, b] = qTlRange(), tot = Math.max(1, orgDays(v, b) + 1), gs = qTlGroups(), today = localDate();
  const P = await qPdfStart(true), { doc, FONT, W, M } = P, title = 'TQ-Ablauf der Gruppen';
  const nW = 52, x0 = M + nW, bw = W - M - x0, X = d => x0 + Math.max(0, Math.min(1, orgDays(v, d) / tot)) * bw;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  doc.setFont(FONT, 'bold'); doc.setFontSize(16); doc.text(pdfSafe(title), M, 16);
  doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(80); doc.text(pdfSafe(`${S.hotel || ''} · Zeitraum ${fmtDate(v)} bis ${fmtDate(b)}`), M, 22); doc.setTextColor(0);
  let y = 32; doc.setFontSize(7.5); doc.setTextColor(100);
  for (let m = v.slice(0, 7) + '-01'; m <= b; m = orgAddMonths(m, 1)) { if (m < v) continue; const x = X(m); doc.text(pdfSafe(new Date(m + 'T12:00:00').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })), x + 0.8, y); }
  doc.setTextColor(0); y += 3;
  const rowH = 11, top = y;
  gs.forEach((g, i) => {
    const yy = top + i * rowH; if (yy > 180) return;
    doc.setFont(FONT, 'bold'); doc.setFontSize(8.5); doc.text(doc.splitTextToSize(pdfSafe(g.name), nW - 3).slice(0, 2), M, yy + 4.5);
    doc.setFillColor(238, 241, 245); doc.rect(x0, yy + 1, bw, rowH - 2.5, 'F');
    abSorted(g).forEach(p => { if (p.bis < v || p.von > b) return; const l = X(p.von < v ? v : p.von), r = X(p.bis > b ? b : qAddDays(p.bis, 1));
      doc.setFillColor(...hex(AB_TYP[p.typ]?.[1] || '#888888')); doc.rect(l, yy + 1, Math.max(0.5, r - l), rowH - 2.5, 'F');
      if (r - l > 12) { doc.setTextColor(255); doc.setFont(FONT, 'bold'); doc.setFontSize(6.8); doc.text(pdfSafe(abLabel(p)).slice(0, Math.floor((r - l) / 1.5)), l + 1, yy + 5.8); doc.setTextColor(0); } });
  });
  const bottom = top + Math.min(gs.length, 14) * rowH;
  doc.setDrawColor(215); for (let m = v.slice(0, 7) + '-01'; m <= b; m = orgAddMonths(m, 1)) { if (m < v) continue; doc.line(X(m), top, X(m), bottom); }
  if (today >= v && today <= b) { doc.setDrawColor(192, 57, 43); doc.setLineWidth(0.6); doc.line(X(today), top - 1, X(today), bottom + 1); doc.setLineWidth(0.2); }
  let ly = bottom + 7, lx = M; doc.setFont(FONT, 'normal'); doc.setFontSize(8);
  Object.entries(AB_TYP).forEach(([, [l, c]]) => { doc.setFillColor(...hex(c)); doc.rect(lx, ly - 2.8, 3.5, 3.5, 'F'); doc.text(pdfSafe(l), lx + 5, ly); lx += doc.getTextWidth(pdfSafe(l)) + 12; });
  ly += 8; doc.setFont(FONT, 'bold'); doc.setFontSize(10);
  gs.forEach(g => { const list = abSorted(g).filter(p => !(p.bis < v || p.von > b)); if (!list.length) return;
    if (ly > 190) { doc.addPage(); ly = 18; }
    doc.setFont(FONT, 'bold'); doc.setFontSize(9.5); doc.text(pdfSafe(g.name), M, ly); ly += 4.6; doc.setFont(FONT, 'normal'); doc.setFontSize(8.5);
    list.forEach(p => { if (ly > 196) { doc.addPage(); ly = 18; } doc.setFillColor(...hex(AB_TYP[p.typ]?.[1] || '#888888')); doc.rect(M, ly - 2.6, 3, 3, 'F'); doc.text(pdfSafe(`${fmtDate(p.von)} – ${fmtDate(p.bis)}   ${abKt(p)} KT / ${abWt(p)} WT   ${AB_TYP[p.typ]?.[0] || ''}${p.titel ? ': ' + p.titel : p.modul ? ' ' + p.modul : ''}`).slice(0, 160), M + 5, ly); ly += 4.4; });
    ly += 3; });
  P.foot(title);
  return { doc, name: `TQ-Ablauf_${v}_${b}.pdf` };
}

/* =====================================================================
   Rechte: Koordination gibt und nimmt Rechte, auch die eigenen Aufgaben
   ===================================================================== */
function qRechteHTML() {
  if (!isAdmin()) return empty('Rechte vergibt die Koordination.');
  const staff = Object.values(S.profiles).filter(p => ['ausbilder', 'admin'].includes(p.role) && p.aktiv !== false).sort((a, b) => (a.role === 'admin') - (b.role === 'admin') || a.full_name.localeCompare(b.full_name));
  const RR = RIGHTS.filter(([k]) => !['uebergabe', 'bewerbungen'].includes(k));
  return `${secTitle('Rechte der Trainer')}
    <p class="text-[13px] text-muted">Häkchen setzen oder entfernen – es wird sofort gespeichert. Mit „Koordination“ bekommt jemand alle Rechte wie du, auch Rechte vergeben.</p>
    <div class="card mt-3 overflow-x-auto"><table class="rm-tab"><thead><tr><th>Person</th>${RR.map(([k, l, d]) => `<th title="${esc(d)}">${esc(l)}</th>`).join('')}<th>Koordination</th></tr></thead><tbody>
      ${staff.map(p => { const adm = p.role === 'admin', me = p.id === S.me.id; return `<tr><td><div class="font-semibold">${esc(p.full_name)}${me ? ' <span class="text-muted font-normal">(ich)</span>' : ''}</div><div class="text-[11px] text-muted">${adm ? 'Koordination – alle Rechte' : (p.rechte || []).length + ' Rechte'}</div></td>
        ${RR.map(([k]) => `<td><input type="checkbox" data-rm="${p.id}" data-r="${k}" ${adm || (p.rechte || []).includes(k) ? 'checked' : ''} ${adm ? 'disabled' : ''} aria-label="${esc(p.full_name)}: ${esc(k)}"></td>`).join('')}
        <td><input type="checkbox" data-radm="${p.id}" ${adm ? 'checked' : ''} ${me ? 'disabled title="Deine eigene Rolle kann nur eine andere Koordination ändern"' : ''} aria-label="${esc(p.full_name)}: Koordination"></td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="rmAll">Allen Trainern alle Rechte</button><button class="btn ghost" id="rmStd">Alle auf Standard</button></div>
    <div class="card p-4 mt-4 text-[13px] text-muted flex flex-col gap-1.5">${RR.map(([, l, d]) => `<div><b class="text-fg">${esc(l)}:</b> ${esc(d)}</div>`).join('')}<div><b class="text-fg">Koordination:</b> alle Rechte, auch Rechte vergeben, Einstellungen und Bezahlung. Es muss immer mindestens eine Koordination geben.</div></div>`;
}
function qRechteBind() {
  const save = async (id, upd, msg) => { try { const r = await q(sb.from('profiles').update(upd).eq('id', id).select().single()); S.profiles[id] = { ...S.profiles[id], ...r }; toast(msg || 'Gespeichert'); render(); } catch (e) { toast(errText(e)); render(); } };
  $$('[data-rm]').forEach(c => c.onchange = () => { const p = S.profiles[c.dataset.rm], set = new Set(p.rechte || []); c.checked ? set.add(c.dataset.r) : set.delete(c.dataset.r); save(p.id, { rechte: [...set] }); });
  $$('[data-radm]').forEach(c => c.onchange = () => { const p = S.profiles[c.dataset.radm];
    if (c.checked) save(p.id, { role: 'admin' }, `${p.full_name} ist jetzt Koordination`);
    else save(p.id, { role: 'ausbilder', rechte: RIGHTS.map(r => r[0]).filter(k => k !== 'uebergabe') }, `${p.full_name} ist wieder Trainer/in (mit allen Trainer-Rechten)`); });
  $('#rmAll') && ($('#rmAll').onclick = e => qConfirm(e.currentTarget, async () => { for (const p of Object.values(S.profiles).filter(x => x.role === 'ausbilder' && x.aktiv !== false)) { try { const r = await q(sb.from('profiles').update({ rechte: RIGHTS.map(x => x[0]) }).eq('id', p.id).select().single()); S.profiles[p.id] = r; } catch (er) { toast(errText(er)); } } toast('Alle Rechte vergeben'); render(); }, 'Allen alles geben? Nochmal tippen'));
  $('#rmStd') && ($('#rmStd').onclick = e => qConfirm(e.currentTarget, async () => { for (const p of Object.values(S.profiles).filter(x => x.role === 'ausbilder' && x.aktiv !== false)) { try { const r = await q(sb.from('profiles').update({ rechte: DEFAULT_RIGHTS }).eq('id', p.id).select().single()); S.profiles[p.id] = r; } catch (er) { toast(errText(er)); } } toast('Auf Standard gesetzt'); render(); }, 'Zurücksetzen? Nochmal tippen'));
}

/* Lernzeiten-Dienstplan (Teilnehmende): Tageskopf antippen zeigt das Team des Tages */
(() => {
  try {
    const b0 = Dienst.bind;
    Dienst.bind = function () { b0.call(this); if (isQuali() && !isAzubi() && !isMA()) $$('[data-dpday]').forEach(x => { x.style.cursor = 'pointer'; x.title = 'Wer macht was an diesem Tag?'; x.onclick = () => qTeamDaySheet(x.dataset.dpday); }); };
  } catch {}
})();

/* =====================================================================
   TQ-Ablauf in Kalendertagen: Monatskalender je Gruppe, Dauer in Kalender- und Werktagen
   ===================================================================== */
const abKt = p => (p?.von && p?.bis && p.bis >= p.von) ? orgDays(p.von, p.bis) + 1 : 0;
const abWt = p => { if (!p?.von || !p?.bis || p.bis < p.von) return 0; let n = 0; for (let d = p.von; d <= p.bis; d = qAddDays(d, 1)) { const w = new Date(d + 'T12:00:00').getDay(); if (w !== 0 && w !== 6) n++; } return n; };
const abDauer = p => abKt(p) ? `${abKt(p)} Kalendertage · ${abWt(p)} Werktage (Mo–Fr)` : '';
const AB_PRIO = ['pruefung', 'praktikum', 'urlaub', 'pause', 'gk', 'tq', 'sonst'];
const AB_KZ = { tq: 'M', pause: 'P', pruefung: 'PR', praktikum: 'BP', gk: 'GK', urlaub: 'F', sonst: '•' };
function abAm(list, d) { const on = list.filter(p => p.von <= d && d <= p.bis); return on.sort((a, b) => AB_PRIO.indexOf(a.typ) - AB_PRIO.indexOf(b.typ))[0] || null; }
const abKurz = p => p ? (p.typ === 'tq' && p.modul ? 'M' + p.modul : AB_KZ[p.typ] || '') : '';
(() => {
  const css = `
  .kt-months{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:12px}
  .kt-m{border:1px solid var(--line);border-radius:12px;padding:8px;background:var(--surface)}
  .kt-m h4{font-size:13px;font-weight:700;margin:0 0 6px;text-transform:capitalize}
  .kt-g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}
  .kt-g .wd{font-size:10px;font-weight:700;color:var(--muted);text-align:center}
  .kt-d{position:relative;aspect-ratio:1/1;border-radius:5px;background:var(--sunk);font-size:10.5px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;color:var(--fg)}
  .kt-d.on{color:#fff;font-weight:700}
  .kt-d.we{opacity:.62}
  .kt-d.out{visibility:hidden}
  .kt-d.today{box-shadow:0 0 0 2px var(--crit)}
  .kt-d small{font-size:8.5px;font-weight:700;opacity:.95}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
function qTlHTML() {
  const mode = S.org.tlMode || 'bar', gs = qTlGroups();
  const sw = `<div class="seg mb-3" role="group" aria-label="Darstellung"><button data-tlm="bar" aria-pressed="${mode === 'bar'}">Zeitleiste</button><button data-tlm="kal" aria-pressed="${mode === 'kal'}">Kalendertage</button></div>`;
  if (mode !== 'kal' || !gs.length) return qTlBarHTML().replace('<div class="card p-4">', '<div class="card p-4">' + sw);
  const [v, b] = qTlRange(), today = localDate();
  if (!gs.some(g => g.id === S.org.tlG)) S.org.tlG = (gs.find(g => g.trainer_id === S.me.id && abSorted(g).length) || gs.find(g => abSorted(g).length) || gs[0]).id;
  const g = gs.find(x => x.id === S.org.tlG), list = abSorted(g);
  const months = []; for (let m = v.slice(0, 7) + '-01'; m <= b && months.length < 24; m = orgAddMonths(m, 1)) months.push(m);
  const month = m => {
    const first = new Date(m + 'T12:00:00'), off = (first.getDay() + 6) % 7, n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = Array.from({ length: off }, () => '<div class="kt-d out"></div>');
    for (let d = 1; d <= n; d++) {
      const ds = m.slice(0, 8) + String(d).padStart(2, '0'), wd = new Date(ds + 'T12:00:00').getDay(), p = abAm(list, ds), inR = ds >= v && ds <= b;
      cells.push(`<div class="kt-d ${p && inR ? 'on' : ''} ${wd === 0 || wd === 6 ? 'we' : ''} ${ds === today ? 'today' : ''}" ${p && inR ? `style="background:${AB_TYP[p.typ]?.[1]}"` : ''} title="${fmtDate(ds)}${p ? ': ' + esc(abLabel(p)) : ''}">${d}${p && inR ? `<small>${esc(abKurz(p))}</small>` : ''}</div>`);
    }
    return `<div class="kt-m"><h4>${first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</h4><div class="kt-g">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<div class="wd">${w}</div>`).join('')}${cells.join('')}</div></div>`;
  };
  const inRange = list.filter(p => !(p.bis < v || p.von > b));
  const sum = {}; inRange.forEach(p => { const c = { von: p.von < v ? v : p.von, bis: p.bis > b ? b : p.bis }; (sum[p.typ] ||= [0, 0]); sum[p.typ][0] += abKt(c); sum[p.typ][1] += abWt(c); });
  return `${secTitle('TQ-Ablauf in Kalendertagen')}
    <div class="card p-4">${sw}
      <div><label class="lbl" for="tlG">Gruppe</label><select id="tlG" class="field">${gs.map(x => `<option value="${x.id}" ${x.id === g.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="seg mt-3">${[['3', '3 Monate'], ['6', '6 Monate'], ['12', '12 Monate'], ['all', 'Gesamt']].map(([k, l]) => `<button data-tlp="${k}">${l}</button>`).join('')}</div>
      <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="lbl" for="tlV">Von</label><input id="tlV" type="date" class="field" value="${v}"></div><div><label class="lbl" for="tlB">Bis</label><input id="tlB" type="date" class="field" value="${b}"></div></div>
      ${list.length ? `<div class="kt-months mt-4">${months.map(month).join('')}</div>` : '<div class="text-[13px] text-muted mt-3">Für diese Gruppe ist noch kein Ablauf geplant.</div>'}
      <div class="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[12px] text-muted">${Object.entries(AB_TYP).map(([t, [l, c]]) => `<span class="inline-flex items-center gap-1.5"><i style="width:12px;height:12px;border-radius:3px;background:${c};display:inline-block"></i>${l} (${AB_KZ[t]})</span>`).join('')}<span>M1, M2 … = Modul · roter Rand = heute</span></div>
      ${inRange.length ? `<div class="overflow-x-auto mt-4"><table class="ein-tab"><thead><tr><th>Abschnitt</th><th>Von</th><th>Bis</th><th>Kalendertage</th><th>Werktage</th></tr></thead><tbody>
        ${inRange.map(p => `<tr><td><span class="inline-flex items-center gap-1.5"><i style="width:10px;height:10px;border-radius:3px;background:${AB_TYP[p.typ]?.[1]};display:inline-block"></i>${esc(abLabel(p))}</span></td><td>${fmtDate(p.von)}</td><td>${fmtDate(p.bis)}</td><td><b>${abKt(p)}</b></td><td>${abWt(p)}</td></tr>`).join('')}
        ${Object.entries(sum).map(([t, [kt, wt]]) => `<tr><td class="text-muted">Summe ${esc(AB_TYP[t]?.[0] || t)} im Zeitraum</td><td></td><td></td><td class="text-muted">${kt}</td><td class="text-muted">${wt}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
      <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="tlEdit">Ablauf bearbeiten</button><button class="btn ghost" id="tlPdf">Als PDF</button></div>
      <p class="text-[12px] text-muted mt-2">Kalendertage zählen jeden Tag von Beginn bis Ende, Werktage nur Montag bis Freitag (ohne Feiertage).</p>
    </div>`;
}
function qTlBind() {
  qTlBarBind();
  $$('[data-tlm]').forEach(x => x.onclick = () => { S.org.tlMode = x.dataset.tlm; render(); });
  $('#tlG') && ($('#tlG').onchange = () => { S.org.tlG = $('#tlG').value; render(); });
  if (S.org.tlMode === 'kal' && $('#tlEdit')) $('#tlEdit').onclick = () => qAblaufSheet(S.org.tlG);
}
async function qTlPdf() {
  if (S.org.tlMode !== 'kal') return qTlBarPdf();
  const [v, b] = qTlRange(), gs = qTlGroups(), g = gs.find(x => x.id === S.org.tlG) || gs[0];
  if (!g) throw new Error('Keine Gruppe gewählt.');
  const list = abSorted(g), today = localDate();
  const P = await qPdfStart(true), { doc, FONT, W, M } = P, title = 'TQ-Ablauf in Kalendertagen';
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  doc.setFont(FONT, 'bold'); doc.setFontSize(16); doc.text(pdfSafe(title), M, 16);
  doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(80); doc.text(pdfSafe(`${S.hotel || ''} · ${g.name} · ${fmtDate(v)} bis ${fmtDate(b)}`), M, 22); doc.setTextColor(0);
  const mW = 26, cw = (W - 2 * M - mW) / 31, rh = 7.2;
  let y = 30;
  const head = () => { doc.setFont(FONT, 'bold'); doc.setFontSize(7); for (let d = 1; d <= 31; d++) doc.text(String(d), M + mW + (d - 1) * cw + cw / 2, y, { align: 'center' }); y += 2; doc.setFont(FONT, 'normal'); };
  head();
  for (let m = v.slice(0, 7) + '-01'; m <= b; m = orgAddMonths(m, 1)) {
    if (y + rh > 150) { doc.addPage(); y = 18; head(); }
    const first = new Date(m + 'T12:00:00'), n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    doc.setFont(FONT, 'bold'); doc.setFontSize(8); doc.text(pdfSafe(first.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })), M, y + rh / 2 + 1.2); doc.setFont(FONT, 'normal');
    for (let d = 1; d <= 31; d++) {
      const x = M + mW + (d - 1) * cw;
      if (d > n) { doc.setFillColor(255, 255, 255); continue; }
      const ds = m.slice(0, 8) + String(d).padStart(2, '0'), wd = new Date(ds + 'T12:00:00').getDay(), p = ds >= v && ds <= b ? abAm(list, ds) : null;
      if (p) doc.setFillColor(...hex(AB_TYP[p.typ]?.[1] || '#888888')); else if (wd === 0 || wd === 6) doc.setFillColor(226, 230, 236); else doc.setFillColor(242, 244, 247);
      doc.rect(x + 0.2, y + 0.2, cw - 0.4, rh - 0.4, 'F');
      doc.setFontSize(5.6); doc.setTextColor(p ? 255 : 120); doc.text(['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][wd], x + cw / 2, y + 2.6, { align: 'center' });
      if (p) { doc.setFont(FONT, 'bold'); doc.setFontSize(6.2); doc.text(pdfSafe(abKurz(p)), x + cw / 2, y + 5.6, { align: 'center' }); doc.setFont(FONT, 'normal'); }
      doc.setTextColor(0);
      if (ds === today) { doc.setDrawColor(192, 57, 43); doc.setLineWidth(0.5); doc.rect(x + 0.3, y + 0.3, cw - 0.6, rh - 0.6); doc.setLineWidth(0.2); }
    }
    y += rh;
  }
  y += 5; let lx = M; doc.setFontSize(8);
  Object.entries(AB_TYP).forEach(([t, [l, c]]) => { doc.setFillColor(...hex(c)); doc.rect(lx, y - 2.8, 3.5, 3.5, 'F'); const s = `${l} (${AB_KZ[t]})`; doc.text(pdfSafe(s), lx + 5, y); lx += doc.getTextWidth(pdfSafe(s)) + 10; });
  y += 8;
  const rows = list.filter(p => !(p.bis < v || p.von > b));
  if (rows.length) {
    if (y > 170) { doc.addPage(); y = 18; }
    doc.setFillColor(238, 242, 242); doc.rect(M, y - 4.5, W - 2 * M, 7, 'F'); doc.setFont(FONT, 'bold'); doc.setFontSize(8.5);
    [['Abschnitt', 0], ['Von', 120], ['Bis', 150], ['Kalendertage', 180], ['Werktage', 215]].forEach(([l, x]) => doc.text(pdfSafe(l), M + 1.5 + x, y)); y += 6.5; doc.setFont(FONT, 'normal');
    rows.forEach(p => { if (y > 196) { doc.addPage(); y = 18; } doc.setFillColor(...hex(AB_TYP[p.typ]?.[1] || '#888888')); doc.rect(M + 1.5, y - 2.6, 3, 3, 'F');
      doc.text(pdfSafe(abLabel(p)).slice(0, 80), M + 6, y); doc.text(fmtDate(p.von), M + 121.5, y); doc.text(fmtDate(p.bis), M + 151.5, y); doc.text(String(abKt(p)), M + 181.5, y); doc.text(String(abWt(p)), M + 216.5, y); y += 5; });
    y += 2; doc.setFontSize(7.5); doc.setTextColor(90); doc.text(pdfSafe('Kalendertage = jeder Tag von Beginn bis Ende; Werktage = Montag bis Freitag ohne Berücksichtigung von Feiertagen.'), M, y); doc.setTextColor(0);
  }
  P.foot(title);
  return { doc, name: `TQ-Ablauf_Kalendertage_${orgAscii(g.name)}_${v}_${b}.pdf` };
}

/* =====================================================================
   Dienstplan wie in Excel: Tabelle Trainer × Tage, Pinsel ziehen, Kopieren/Einfügen, Tippen, Entf, Strg+Z
   ===================================================================== */
(() => {
  const css = `
  .dpg-wrap{overflow:auto;max-height:70vh;border:1px solid var(--line);border-radius:12px;background:var(--surface);-webkit-user-select:none;user-select:none}
  .dpg-wrap.paint{touch-action:none}
  .dpg{border-collapse:separate;border-spacing:0;font-size:12px}
  .dpg th,.dpg td{border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:0;text-align:center}
  .dpg thead th{position:sticky;top:0;background:var(--surface);z-index:2;font-size:10.5px;color:var(--muted);padding:4px 0;min-width:38px}
  .dpg thead th.we{background:var(--sunk)}
  .dpg thead th.today{color:var(--accent)}
  .dpg th.nm,.dpg td.nm{position:sticky;left:0;z-index:3;background:var(--surface);text-align:left;padding:4px 8px;min-width:118px;max-width:150px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dpg thead th.nm{z-index:4}
  .dpg td.c{height:34px;min-width:38px;cursor:cell;position:relative}
  .dpg td.c.we{background:color-mix(in srgb,var(--sunk) 70%,transparent)}
  .dpg td.c.today{box-shadow:inset 0 0 0 1px var(--accent)}
  .dpg td.c.ro{cursor:default;opacity:.8}
  .dpg td.c.sel{background:color-mix(in srgb,var(--accent) 22%,transparent)!important;box-shadow:inset 0 0 0 2px var(--accent)}
  .dpg td.c .ek{font-size:10px;padding:2px 3px}
  .dpg td.c .kk{position:absolute;top:1px;right:1px;width:7px;height:7px;border-radius:50%;background:#e74c3c}
  .dpg-tools{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
  .dpg-tools button{border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:5px 8px;font:inherit;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:4px}
  .dpg-tools button[aria-pressed="true"]{outline:2px solid var(--fg);outline-offset:1px}
  .dpg-tools .sw{width:12px;height:12px;border-radius:3px;display:inline-block}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  try { S.org ||= {}; } catch {}
})();
function dpViewSw() {
  if (!S.org.dpView) { try { S.org.dpView = localStorage.getItem('desk.dpView') || ''; } catch {} S.org.dpView ||= 'kal'; }
  return `<div class="seg mt-3" role="group" aria-label="Ansicht Dienstplan"><button data-dpv="kal" aria-pressed="${S.org.dpView !== 'grid'}">Kalender</button><button data-dpv="grid" aria-pressed="${S.org.dpView === 'grid'}">Planen wie Excel</button></div>`;
}
const dpCanRow = tid => qCanTeam() || tid === S.me.id;
const dpMain = (rows, tid, d) => rows.filter(e => e.trainer_id === tid && e.datum === d && e.art !== 'K');
const dpHasK = (rows, tid, d) => rows.some(e => e.trainer_id === tid && e.datum === d && e.art === 'K');
function dpGridDays() { const m0 = S.org.einM + '-01', f = new Date(m0 + 'T12:00:00'), n = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate(); return Array.from({ length: n }, (_, i) => `${S.org.einM}-${String(i + 1).padStart(2, '0')}`); }
function dpGridHTML() {
  const days = dpGridDays(), rows = S.org.einAll || [], today = localDate(), G = S.org.dpg ||= { brush: null, sel: null, clip: null, undo: [] };
  const staff = orgStaff().sort((a, b) => (b.id === S.me.id) - (a.id === S.me.id) || a.full_name.localeCompare(b.full_name));
  const mName = new Date(days[0] + 'T12:00:00').toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' });
  const cell = (p, d, ri, ci) => { const es = dpMain(rows, p.id, d), k = dpHasK(rows, p.id, d), wd = new Date(d + 'T12:00:00').getDay();
    return `<td class="c ${wd === 0 || wd === 6 ? 'we' : ''} ${d === today ? 'today' : ''} ${dpCanRow(p.id) ? '' : 'ro'}" data-r="${ri}" data-c="${ci}" title="${esc(p.full_name)} · ${orgWd(d)} ${fmtDate(d)}${es.length ? ': ' + es.map(e => DP_CODES[e.art]?.[1]).join(' / ') : ''}${k ? ' · kritisch' : ''}">${es.map(ekChip).join('')}${k ? '<i class="kk"></i>' : ''}</td>`; };
  return `<div class="flex items-center justify-between gap-2 mt-3"><button class="btn ghost py-2 px-3" id="einPrev" aria-label="Voriger Monat">‹</button>
      <div class="text-center"><div class="text-[15px] font-bold">${esc(mName)}</div><div class="text-[12px] text-muted">${qCanTeam() ? 'alle Trainer' : 'deine Zeile ist bearbeitbar'}</div></div>
      <button class="btn ghost py-2 px-3" id="einNext" aria-label="Nächster Monat">›</button></div>
    <div class="dpg-tools" role="toolbar" aria-label="Pinsel">
      <button data-brush="" aria-pressed="${G.brush === null}" title="Markieren (kein Pinsel)">▭ Markieren</button>
      ${Object.keys(DP_CODES).map(k => `<button data-brush="${k}" aria-pressed="${G.brush === k}" title="${esc(DP_CODES[k][1])}"><i class="sw" style="background:${DP_CODES[k][3]}"></i>${esc(DP_CODES[k][0])}</button>`).join('')}
      <button data-brush="DEL" aria-pressed="${G.brush === 'DEL'}" title="Radiergummi">⌫ Leeren</button>
    </div>
    <div class="dpg-tools">
      <button id="dpgCopy">Kopieren</button><button id="dpgPaste" ${G.clip ? '' : 'disabled'}>Einfügen${G.clip ? ` (${G.clip.length}×${G.clip[0].length})` : ''}</button>
      <button id="dpgFill">Markierung nach rechts füllen</button><button id="dpgWeek">Vorwoche übernehmen</button><button id="dpgUndo" ${G.undo.length ? '' : 'disabled'}>↶ Rückgängig</button>
    </div>
    <div class="dpg-wrap mt-2 ${G.brush !== null ? 'paint' : ''}" id="dpgWrap" tabindex="0" aria-label="Dienstplan-Tabelle">
      <table class="dpg"><thead><tr><th class="nm">Trainer/in</th>${days.map(d => { const wd = new Date(d + 'T12:00:00').getDay(); return `<th class="${wd === 0 || wd === 6 ? 'we' : ''} ${d === today ? 'today' : ''}">${orgWd(d)}<br><b>${+d.slice(8)}</b></th>`; }).join('')}</tr></thead>
      <tbody>${staff.map((p, ri) => `<tr><td class="nm" title="${esc(p.full_name)}">${esc(p.full_name)}</td>${days.map((d, ci) => cell(p, d, ri, ci)).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="text-[12px] text-muted mt-2">Pinsel wählen und über die Tage ziehen – auch über mehrere Trainer. Ohne Pinsel markieren, dann <b>Strg+C</b> / <b>Strg+V</b>, Kürzel eintippen (z. B. W, UV, BP) oder <b>Entf</b> zum Leeren. <b>Strg+Z</b> macht rückgängig. Halbe Tage und Notizen: im Kalender den Tag antippen.</p>`;
}
function dpGridBind() {
  if (S.org.dpView !== 'grid' || !$('#dpgWrap')) return;
  const G = S.org.dpg, days = dpGridDays(), staff = orgStaff().sort((a, b) => (b.id === S.me.id) - (a.id === S.me.id) || a.full_name.localeCompare(b.full_name));
  const wrap = $('#dpgWrap'), cellAt = (r, c) => wrap.querySelector(`td.c[data-r="${r}"][data-c="${c}"]`);
  if (G.scroll) { wrap.scrollLeft = G.scroll[0]; wrap.scrollTop = G.scroll[1]; }
  if (G.focus) { G.focus = false; wrap.focus({ preventScroll: true }); }
  const rerender = () => { G.scroll = [wrap.scrollLeft, wrap.scrollTop]; G.focus = true; const y = window.scrollY; render(); window.scrollTo(0, y); };
  const rect = () => { if (!G.sel) return null; const [a, b] = G.sel; return { r0: Math.min(a[0], b[0]), r1: Math.max(a[0], b[0]), c0: Math.min(a[1], b[1]), c1: Math.max(a[1], b[1]) }; };
  const paintSel = () => { wrap.querySelectorAll('td.sel').forEach(x => x.classList.remove('sel')); const R = rect(); if (!R) return; for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) cellAt(r, c)?.classList.add('sel'); };
  paintSel();
  $$('[data-brush]').forEach(b => b.onclick = () => { G.brush = b.dataset.brush || null; rerender(); });
  /* Änderungen speichern: cells = [{tid, d, art|null|'K!'}] */
  const apply = async (cells, noUndo) => {
    const rows = S.org.einAll || []; cells = cells.filter(c => dpCanRow(c.tid));
    if (!cells.length) return toast('Diese Zeilen kann nur die Koordination ändern.');
    const before = cells.map(c => ({ tid: c.tid, d: c.d, art: dpMain(rows, c.tid, c.d).find(e => Number(e.anteil) >= 1)?.art || null, k: dpHasK(rows, c.tid, c.d) }));
    const del = [], ups = [];
    cells.forEach(c => {
      if (c.art === 'K!') { const k = rows.find(e => e.trainer_id === c.tid && e.datum === c.d && e.art === 'K'); if (k) del.push(k.id); else ups.push({ betrieb_id: orgBetrieb(), trainer_id: c.tid, datum: c.d, art: 'K', anteil: 1, updated_at: new Date().toISOString() }); return; }
      if ('k' in c) { const k = rows.find(e => e.trainer_id === c.tid && e.datum === c.d && e.art === 'K'); if (k && !c.k) del.push(k.id); if (!k && c.k) ups.push({ betrieb_id: orgBetrieb(), trainer_id: c.tid, datum: c.d, art: 'K', anteil: 1, updated_at: new Date().toISOString() }); }
      const cur = dpMain(rows, c.tid, c.d);
      if (cur.length === 1 && Number(cur[0].anteil) >= 1 && cur[0].art === c.art) return;
      cur.forEach(e => del.push(e.id));
      if (c.art) ups.push({ betrieb_id: orgBetrieb(), trainer_id: c.tid, datum: c.d, art: c.art, anteil: 1, gruppe_id: null, notiz: null, updated_at: new Date().toISOString() });
    });
    try {
      if (del.length) await q(sb.from('quali_einsatz').delete().in('id', del));
      let saved = [];
      if (ups.length) saved = await q(sb.from('quali_einsatz').upsert(ups, { onConflict: 'trainer_id,datum,art' }).select());
      S.org.einAll = rows.filter(e => !del.includes(e.id) && !saved.some(x => x.trainer_id === e.trainer_id && x.datum === e.datum && x.art === e.art)).concat(saved);
      if (!noUndo) { G.undo.push(before); if (G.undo.length > 30) G.undo.shift(); }
      rerender();
    } catch (er) { toast(errText(er)); }
  };
  const selCells = () => { const R = rect(); if (!R) return []; const out = []; for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) out.push({ tid: staff[r].id, d: days[c], r, c }); return out; };
  /* Ziehen mit Maus oder Finger */
  let down = null;
  const tdOf = e => { const t = document.elementFromPoint(e.clientX, e.clientY); return t?.closest?.('td.c'); };
  wrap.onpointerdown = e => { const td = e.target.closest('td.c'); if (!td) return; if (G.brush === null && e.pointerType === 'touch') { G.sel = [[+td.dataset.r, +td.dataset.c], [+td.dataset.r, +td.dataset.c]]; paintSel(); return; }
    e.preventDefault(); down = [+td.dataset.r, +td.dataset.c]; G.sel = [down, down]; paintSel(); wrap.setPointerCapture?.(e.pointerId); wrap.focus({ preventScroll: true }); };
  wrap.onpointermove = e => { if (!down) return; const td = tdOf(e); if (!td) return; const p = [+td.dataset.r, +td.dataset.c]; if (G.sel[1][0] !== p[0] || G.sel[1][1] !== p[1]) { G.sel = [down, p]; paintSel(); } };
  wrap.onpointerup = () => { if (!down) return; down = null;
    if (G.brush !== null) { const cells = selCells().map(c => ({ tid: c.tid, d: c.d, art: G.brush === 'DEL' ? null : G.brush === 'K' ? 'K!' : G.brush })); if (G.brush === 'DEL') cells.forEach(c => { c.k = false; }); apply(cells); } };
  /* Kopieren, Einfügen, Füllen */
  const copy = () => { const R = rect(); if (!R) return toast('Erst Felder markieren.'); const rows = S.org.einAll || [];
    G.clip = []; for (let r = R.r0; r <= R.r1; r++) { const line = []; for (let c = R.c0; c <= R.c1; c++) { const m = dpMain(rows, staff[r].id, days[c]); line.push({ art: m.length === 1 && Number(m[0].anteil) >= 1 ? m[0].art : m[0]?.art || null, k: dpHasK(rows, staff[r].id, days[c]) }); } G.clip.push(line); }
    toast(`${G.clip.length * G.clip[0].length} Felder kopiert`); rerender(); };
  const paste = () => { if (!G.clip) return toast('Erst etwas kopieren.'); const R = rect(); if (!R) return toast('Zielfeld markieren.');
    const h = G.clip.length, w = G.clip[0].length, rh = R.r1 - R.r0 + 1, cw = R.c1 - R.c0 + 1, H = Math.max(h, rh), Wd = Math.max(w, cw), cells = [];
    for (let i = 0; i < H; i++) for (let j = 0; j < Wd; j++) { const r = R.r0 + i, c = R.c0 + j; if (r >= staff.length || c >= days.length) continue; const v = G.clip[i % h][j % w]; cells.push({ tid: staff[r].id, d: days[c], art: v.art, k: v.k }); }
    apply(cells); };
  const fill = () => { const R = rect(); if (!R) return toast('Erst Felder markieren: links das Muster, rechts bis wohin gefüllt wird.'); const rows = S.org.einAll || [], cells = [];
    for (let r = R.r0; r <= R.r1; r++) { const pat = []; for (let c = R.c0; c <= R.c1; c++) { const m = dpMain(rows, staff[r].id, days[c]); if (!m.length && !pat.length) continue; if (!m.length) break; pat.push(m[0].art); }
      if (!pat.length) continue; let i = 0; for (let c = R.c0; c <= R.c1; c++) { const wd = new Date(days[c] + 'T12:00:00').getDay(); if (wd === 0 || wd === 6) continue; cells.push({ tid: staff[r].id, d: days[c], art: pat[i % pat.length] }); i++; } }
    if (!cells.length) return toast('In der Markierung steht noch kein Muster.'); apply(cells); };
  const week = async () => { const R = rect(); const tids = R ? staff.slice(R.r0, R.r1 + 1).map(p => p.id) : qCanTeam() ? staff.map(p => p.id) : [S.me.id];
    const base = R ? qMonday(days[R.c0]) : qMonday(localDate() >= days[0] && localDate() <= days[days.length - 1] ? localDate() : days[0]), prev = qAddDays(base, -7);
    const src = await q(sb.from('quali_einsatz').select('trainer_id,datum,art,anteil').gte('datum', prev).lte('datum', qAddDays(prev, 6)).in('trainer_id', tids));
    const cells = []; tids.forEach(t => { for (let i = 0; i < 7; i++) { const d = qAddDays(base, i), s0 = src.filter(e => e.trainer_id === t && e.datum === qAddDays(prev, i) && e.art !== 'K'); if (s0.length && days.includes(d)) cells.push({ tid: t, d, art: s0.find(e => Number(e.anteil) >= 1)?.art || s0[0].art }); } });
    if (!cells.length) return toast('In der Vorwoche ist nichts eingetragen.'); await apply(cells); toast(`Woche ab ${fmtDate(base)} aus der Vorwoche übernommen`); };
  const undo = () => { const last = G.undo.pop(); if (!last) return; apply(last.map(c => ({ tid: c.tid, d: c.d, art: c.art, k: c.k })), true); };
  $('#dpgCopy').onclick = copy; $('#dpgPaste').onclick = paste; $('#dpgFill').onclick = fill; $('#dpgWeek').onclick = week; $('#dpgUndo').onclick = undo;
  /* Tastatur wie in Excel */
  let typed = '', tt = null;
  wrap.onkeydown = e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copy(); return; }
    if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); paste(); return; }
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); apply(selCells().map(c => ({ tid: c.tid, d: c.d, art: null, k: false }))); return; }
    const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (mv && G.sel) { e.preventDefault(); const p = G.sel[1], n = [Math.max(0, Math.min(staff.length - 1, p[0] + mv[0])), Math.max(0, Math.min(days.length - 1, p[1] + mv[1]))]; G.sel = e.shiftKey ? [G.sel[0], n] : [n, n]; paintSel(); cellAt(...n)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
    if (/^[a-zA-Z0-9]$/.test(e.key) && !mod && G.sel) {
      typed += e.key.toUpperCase(); clearTimeout(tt);
      tt = setTimeout(() => { const code = Object.keys(DP_CODES).find(k => k === typed || DP_CODES[k][0].toUpperCase() === typed); typed = '';
        if (!code) return toast('Unbekanntes Kürzel'); apply(selCells().map(c => ({ tid: c.tid, d: c.d, art: code === 'K' ? 'K!' : code }))); }, 450);
    }
  };
}
/* Für die Tabelle alle Einträge des Monats laden */
const orgLoad0 = orgLoad;
orgLoad = async function () {
  await orgLoad0();
  if (S.org?.tab === 'ein') { if (!S.org.dpView) { try { S.org.dpView = localStorage.getItem('desk.dpView') || 'kal'; } catch { S.org.dpView = 'kal'; } }
    if (S.org.dpView === 'grid') { const m0 = S.org.einM + '-01', m1 = qAddDays(orgAddMonths(m0, 1), -1); S.org.einAll = await orgFetch('quali_einsatz', 'datum', m0, m1, 'id,trainer_id,datum,art,anteil,gruppe_id,notiz'); } }
};
