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
  return `${qCanTeam() ? `<div class="mt-3"><label class="lbl" for="einT">Trainer/in</label><select id="einT" class="field">${staff.map(p => `<option value="${p.id}" ${p.id === S.org.einT ? 'selected' : ''}>${esc(p.full_name)}${p.id === S.me.id ? ' (ich)' : ''}</option>`).join('')}</select></div>` : ''}
    <div class="flex items-center justify-between gap-2 mt-3"><button class="btn ghost py-2 px-3" id="einPrev" aria-label="Voriger Monat">‹</button>
      <div class="text-center"><div class="text-[15px] font-bold">${esc(mName)}</div><div class="text-[12px] text-muted">${esc(tr?.full_name || '')}</div></div>
      <button class="btn ghost py-2 px-3" id="einNext" aria-label="Nächster Monat">›</button></div>
    <div class="ein-cal mt-3">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<div class="wd">${w}</div>`).join('')}${cells.join('')}</div>
    <p class="text-[12px] text-muted mt-2">Tag antippen: eintragen und sehen, was die anderen Trainer machen und wer frei hat.</p>
    <details class="mt-2"><summary class="text-[12.5px] font-semibold text-accent cursor-pointer">Kürzel anzeigen</summary><div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-[12px] text-muted">${ord.map(a => `<span>${ekChip({ art: a, anteil: 1 })} ${esc(DP_CODES[a][1])}</span>`).join('')}<span>½ = halber Tag</span></div></details>
    <div class="card p-3.5 mt-3 grid grid-cols-3 gap-1 text-center"><div><div class="text-[18px] font-bold tnum">${orgNum(ms.sum)}</div><div class="text-[11px] text-muted">Einsatztage</div></div><div><div class="text-[18px] font-bold tnum">${orgNum(ms.frei)}</div><div class="text-[11px] text-muted">frei / Urlaub</div></div><div><div class="text-[18px] font-bold tnum">${mon.filter(e => e.art === 'K').length}</div><div class="text-[11px] text-muted">kritisch</div></div></div>
    <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="einRange">Zeitraum eintragen</button><button class="btn ghost" id="einTeamToday">Wer macht heute was?</button></div>
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
}
function orgEinBind() {
  $('#einT') && ($('#einT').onchange = () => { S.org.einT = $('#einT').value; go(S.view); });
  const mv = n => { S.org.einM = orgAddMonths(S.org.einM + '-01', n).slice(0, 7); go(S.view); };
  $('#einPrev').onclick = () => mv(-1); $('#einNext').onclick = () => mv(1);
  $$('[data-ein]').forEach(b => b.onclick = () => orgEinDaySheet(b.dataset.ein));
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
async function qTeamDaySheet(ds) {
  sheetShell(`Team · ${orgWd(ds)}, ${fmtDate(ds)}`, `<div class="flex items-center justify-between gap-2"><button class="btn ghost py-2 px-3" id="tdPrev" aria-label="Vorheriger Tag">‹</button><div class="text-[14px] font-semibold">${orgWd(ds)}, ${fmtDate(ds)}</div><button class="btn ghost py-2 px-3" id="tdNext" aria-label="Nächster Tag">›</button></div>
    <div id="tdList" class="card mt-3"><div class="p-4 text-[13px] text-muted">Wird geladen …</div></div>`);
  $('#tdPrev').onclick = () => qTeamDaySheet(qAddDays(ds, -1)); $('#tdNext').onclick = () => qTeamDaySheet(qAddDays(ds, 1));
  try { $('#tdList').innerHTML = await qTeamDayHTML(ds); } catch (er) { $('#tdList').innerHTML = `<div class="p-4 text-[13px] text-muted">${esc(errText(er))}</div>`; }
}

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
    <button type="button" class="btn ghost py-1.5 px-2" data-abdel="${i}" aria-label="Zeile löschen">✕</button></div>`;
  const read = () => { rows = $$('[data-ab]').map(r => { const o = {}; r.querySelectorAll('[data-f]').forEach(f => { o[f.dataset.f] = f.value.trim(); }); o.modul = o.typ === 'tq' && o.modul ? Number(o.modul) : null; return o; }); };
  const draw = () => {
    $('#abRows').innerHTML = rows.length ? rows.map(rowHTML).join('') : '<div class="text-[13px] text-muted p-2">Noch keine Abschnitte. Füge welche hinzu oder lass sie aus dem Kurs vorschlagen.</div>';
    $$('[data-abdel]').forEach(b => b.onclick = () => { read(); rows.splice(+b.dataset.abdel, 1); draw(); });
    $$('[data-ab] [data-f="typ"]').forEach(s => s.onchange = () => { read(); draw(); });
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
function qTlHTML() {
  const [v, b] = qTlRange(), tot = Math.max(1, orgDays(v, b) + 1), gs = qTlGroups(), today = localDate();
  const pos = d => Math.max(0, Math.min(100, orgDays(v, d) * 100 / tot));
  const months = []; for (let m = v.slice(0, 7) + '-01'; m <= b; m = orgAddMonths(m, 1)) if (m >= v) months.push(m); else months.push(null);
  const ticks = months.filter(Boolean);
  const curOf = g => abSorted(g).find(p => p.von <= today && today <= p.bis);
  const seg = p => { const l = pos(p.von < v ? v : p.von), r = pos(p.bis > b ? b : qAddDays(p.bis, 1)); if (p.bis < v || p.von > b) return '';
    return `<div class="tl-seg" style="left:${l}%;width:${Math.max(0.6, r - l)}%;background:${AB_TYP[p.typ]?.[1] || '#888'}" title="${esc(abLabel(p))}: ${fmtDate(p.von)}–${fmtDate(p.bis)}">${esc(abLabel(p))}</div>`; };
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
function qTlBind() {
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
async function qTlPdf() {
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
    list.forEach(p => { if (ly > 196) { doc.addPage(); ly = 18; } doc.setFillColor(...hex(AB_TYP[p.typ]?.[1] || '#888888')); doc.rect(M, ly - 2.6, 3, 3, 'F'); doc.text(pdfSafe(`${fmtDate(p.von)} – ${fmtDate(p.bis)}   ${AB_TYP[p.typ]?.[0] || ''}${p.titel ? ': ' + p.titel : p.modul ? ' ' + p.modul : ''}`).slice(0, 150), M + 5, ly); ly += 4.4; });
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
