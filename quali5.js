/* AzubiHub · Qualifizierungsmodus, Teil 5: Ergebnis der Externenprüfung und Abschluss, Erfolgsquoten,
   monatliche Teilnahmebescheinigungen (z. B. für geförderte Maßnahmen).
   Wird nach quali4.js und vor dem Hauptskript geladen. */

try { QD_TYP.abschluss = 'Prüfungszeugnis / Facharbeiterbrief'; QD_TYP.bescheinigung = 'Teilnahmebescheinigung'; } catch {}

/* =====================================================================
   Prüfungsergebnis und Abschluss (gespeichert in quali_teilnahmen.pruefung)
   ===================================================================== */
const Q_ERG = { bestanden: ['ok', 'bestanden'], nicht_bestanden: ['crit', 'nicht bestanden'] };
const qPkt = v => v == null || v === '' ? null : Math.max(0, Math.min(100, Math.round(+v)));
function qErg(t) {
  const p = t?.pruefung || {};
  if (!p.ergebnis) return null;
  const pts = [p.punkte_schriftlich, p.punkte_praktisch].filter(v => v != null);
  return { e: p.ergebnis, datum: p.ergebnis_datum || null, ps: p.punkte_schriftlich ?? null, pp: p.punkte_praktisch ?? null, versuch: p.versuch || 1,
    brief: p.brief_datum || null, wdh: p.wiederholung || null, avg: pts.length ? Math.round(pts.reduce((u, v) => u + v, 0) / pts.length) : null };
}
function qErgEditHTML(pr = {}) {
  return `<div class="eyebrow">Ergebnis der Externenprüfung</div><div class="card p-4 flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="qEr">Ergebnis</label><select id="qEr" class="field"><option value="">noch offen</option>${Object.entries(Q_ERG).map(([k, [, l]]) => `<option value="${k}" ${pr.ergebnis === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label class="lbl" for="qEd">Datum des Ergebnisses</label><input id="qEd" type="date" class="field" value="${pr.ergebnis_datum || ''}"></div></div>
    <div class="grid grid-cols-3 gap-2"><div><label class="lbl" for="qEs">Punkte schriftl.</label><input id="qEs" type="number" min="0" max="100" inputmode="numeric" class="field" value="${pr.punkte_schriftlich ?? ''}"></div>
      <div><label class="lbl" for="qEp">Punkte prakt.</label><input id="qEp" type="number" min="0" max="100" inputmode="numeric" class="field" value="${pr.punkte_praktisch ?? ''}"></div>
      <div><label class="lbl" for="qEv">Versuch</label><select id="qEv" class="field">${[1, 2, 3].map(n => `<option value="${n}" ${(pr.versuch || 1) === n ? 'selected' : ''}>${n}.</option>`).join('')}</select></div></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="qEb">Facharbeiterbrief erhalten</label><input id="qEb" type="date" class="field" value="${pr.brief_datum || ''}"></div>
      <div><label class="lbl" for="qEw">Wiederholung am</label><input id="qEw" type="date" class="field" value="${pr.wiederholung || ''}"></div></div>
    <p class="text-[12px] text-muted">Punkte nach dem IHK-Punkteschlüssel (0–100). Bestanden ist in der Regel, wer in den Prüfungsbereichen mindestens „ausreichend“ erreicht – maßgeblich ist der Bescheid der IHK. Das Zeugnis kannst du unter „Unterlagen“ als „Prüfungszeugnis / Facharbeiterbrief“ hochladen.</p></div>`;
}
function qErgRead() {
  const e = $('#qEr'); if (!e) return {};
  const o = { ergebnis: e.value || null, ergebnis_datum: $('#qEd').value || null, punkte_schriftlich: qPkt($('#qEs').value), punkte_praktisch: qPkt($('#qEp').value),
    versuch: +$('#qEv').value || 1, brief_datum: $('#qEb').value || null, wiederholung: $('#qEw').value || null };
  if (o.ergebnis && !o.ergebnis_datum) o.ergebnis_datum = localDate();
  Object.keys(o).forEach(k => { if (o[k] == null) delete o[k]; });
  if (o.versuch === 1) delete o.versuch;
  return o;
}
function qErgCardHTML(t) {
  const r = qErg(t); if (!r) return '';
  const [tone, label] = Q_ERG[r.e] || ['', r.e], note = r.avg != null ? IHK_NOTE(r.avg) : null;
  return `<div class="card p-4 mt-4" style="border-color:var(--${tone === 'ok' ? 'ok' : 'crit'})">
    <div class="flex items-center gap-2"><span class="chip ${tone}">${esc(label)}</span><span class="text-[13px] text-muted tnum">${r.datum ? fmtDate(r.datum) : ''}${r.versuch > 1 ? ` · ${r.versuch}. Versuch` : ''}</span></div>
    <div class="font-display font-bold text-[20px] mt-2">${r.e === 'bestanden' ? 'Externenprüfung bestanden' : 'Externenprüfung nicht bestanden'}</div>
    ${r.ps != null || r.pp != null ? `<div class="grid grid-cols-3 gap-2 mt-3 text-[13px] tnum"><div><div class="text-muted">schriftlich</div><b>${r.ps ?? '–'} P.</b></div><div><div class="text-muted">praktisch</div><b>${r.pp ?? '–'} P.</b></div><div><div class="text-muted">Note</div><b>${note ? `${note[1]} · ${note[0]}` : '–'}</b></div></div>` : ''}
    ${r.brief ? `<div class="text-[13px] mt-2">Facharbeiterbrief erhalten am <b>${fmtDate(r.brief)}</b></div>` : r.e === 'bestanden' ? '<div class="text-[13px] text-muted mt-2">Der Facharbeiterbrief kommt von der IHK.</div>' : ''}
    ${r.e === 'nicht_bestanden' && r.wdh ? `<div class="text-[13px] mt-2">Wiederholung am <b>${fmtDate(r.wdh)}</b></div>` : ''}</div>`;
}

/* ---------- Erfolgsquoten je Maßnahme und Jahrgang ---------- */
function qErfolgStats(rows) {
  const by = {};
  rows.forEach(r => {
    const k = qKat(r); if (!k) return;
    const j = (r.beginn || '').slice(0, 4) || '–', key = r.massnahme + '|' + j, e = qErg(r);
    const g = by[key] ||= { m: r.massnahme, kurz: k.kurz, j, tn: 0, gepr: 0, best: 0, erst: 0, pts: [], briefe: 0 };
    g.tn++;
    if (e) { g.gepr++; if (e.e === 'bestanden') { g.best++; if (e.versuch === 1) g.erst++; } if (e.avg != null) g.pts.push(e.avg); if (e.brief) g.briefe++; }
  });
  return Object.values(by).sort((a, b) => a.kurz.localeCompare(b.kurz) || b.j.localeCompare(a.j));
}
const qPct = (a, b) => b ? Math.round(a * 100 / b) : null;
function qErfolgHTML(rows) {
  const st = qErfolgStats(rows), gepr = st.reduce((u, g) => u + g.gepr, 0), best = st.reduce((u, g) => u + g.best, 0), erst = st.reduce((u, g) => u + g.erst, 0);
  const tile = (v, l, tone = '') => `<div class="card p-3"><div class="font-display font-bold text-[22px] tnum" ${tone ? `style="color:var(--${tone})"` : ''}>${v}</div><div class="text-[12px] text-muted">${l}</div></div>`;
  return `${secTitle('Abschlüsse und Erfolgsquote')}
    <div class="grid grid-cols-3 gap-2">${tile(gepr, 'geprüft')}${tile(gepr ? qPct(best, gepr) + ' %' : '–', 'bestanden', gepr ? (qPct(best, gepr) >= 80 ? 'ok' : 'warn') : '')}${tile(gepr ? qPct(erst, gepr) + ' %' : '–', 'im 1. Versuch')}</div>
    ${st.length ? `<div class="card mt-3 overflow-x-auto"><table class="w-full text-[13px] tnum" style="border-collapse:collapse;min-width:520px">
      <thead><tr class="text-left text-muted text-[12px]">${['Maßnahme', 'Jahrgang', 'TN', 'geprüft', 'bestanden', 'Quote', '1. Versuch', 'Ø Punkte', 'Briefe'].map(h => `<th style="padding:8px 10px" class="font-semibold">${h}</th>`).join('')}</tr></thead>
      <tbody>${st.map(g => `<tr class="border-t border-line"><td style="padding:8px 10px" class="font-semibold">${esc(g.kurz)}</td><td style="padding:8px 10px">${esc(g.j)}</td><td style="padding:8px 10px">${g.tn}</td><td style="padding:8px 10px">${g.gepr}</td><td style="padding:8px 10px">${g.best}</td>
        <td style="padding:8px 10px"><b style="color:${g.gepr ? (qPct(g.best, g.gepr) >= 80 ? 'var(--ok)' : 'var(--warn)') : 'inherit'}">${g.gepr ? qPct(g.best, g.gepr) + ' %' : '–'}</b></td><td style="padding:8px 10px">${g.gepr ? qPct(g.erst, g.gepr) + ' %' : '–'}</td>
        <td style="padding:8px 10px">${g.pts.length ? Math.round(g.pts.reduce((u, v) => u + v, 0) / g.pts.length) : '–'}</td><td style="padding:8px 10px">${g.briefe}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <p class="text-[12px] text-muted mt-2">Jahrgang = Beginn der Maßnahme. Quote = bestanden von geprüft. Wer noch nicht geprüft wurde, zählt nur bei „TN“. Filter oben (Gruppe, Standort, Maßnahme) gelten auch hier, der Zeitraum nicht.</p>`;
}
function qErfolgPdf(P, rows) {
  const { doc, FONT, W, M } = P, st = qErfolgStats(rows); if (!st.length) return;
  doc.addPage(); let y = 16;
  doc.setFont(FONT, 'bold'); doc.setFontSize(14); doc.text(pdfSafe('Abschlüsse und Erfolgsquote'), M, y); y += 6;
  const gepr = st.reduce((u, g) => u + g.gepr, 0), best = st.reduce((u, g) => u + g.best, 0), erst = st.reduce((u, g) => u + g.erst, 0);
  doc.setFont(FONT, 'normal'); doc.setFontSize(10); doc.text(pdfSafe(`${gepr} geprüft · ${gepr ? qPct(best, gepr) : '–'} % bestanden · ${gepr ? qPct(erst, gepr) : '–'} % im ersten Versuch`), M, y); y += 9;
  const cols = [['Maßnahme', 0], ['Jahrgang', 70], ['TN', 95], ['geprüft', 110], ['bestanden', 130], ['Quote', 155], ['1. Versuch', 175], ['Ø Punkte', 200], ['Briefe', 222]];
  doc.setFillColor(238, 242, 242); doc.rect(M, y - 5, W - 2 * M, 7.5, 'F'); doc.setFont(FONT, 'bold'); doc.setFontSize(8.5); cols.forEach(([l, x]) => doc.text(pdfSafe(l), M + 1 + x, y)); doc.setFont(FONT, 'normal'); y += 7;
  st.forEach((g, i) => { if (y > 192) { doc.addPage(); y = 18; } if (i % 2) { doc.setFillColor(248, 250, 250); doc.rect(M, y - 4.3, W - 2 * M, 6.2, 'F'); }
    [g.kurz, g.j, g.tn, g.gepr, g.best, g.gepr ? qPct(g.best, g.gepr) + ' %' : '–', g.gepr ? qPct(g.erst, g.gepr) + ' %' : '–', g.pts.length ? Math.round(g.pts.reduce((u, v) => u + v, 0) / g.pts.length) : '–', g.briefe]
      .forEach((v, j) => doc.text(pdfSafe(String(v)), M + 1 + cols[j][1], y)); y += 6.2; });
  y += 4; doc.setFontSize(8); doc.setTextColor(90); doc.text(pdfSafe('Jahrgang = Beginn der Maßnahme. Quote = bestanden von geprüft. Ergebnisse laut Eintrag der Koordination, maßgeblich ist der Bescheid der IHK.'), M, y); doc.setTextColor(0);
}

/* =====================================================================
   Monatliche Teilnahmebescheinigung (eine Seite je Person)
   ===================================================================== */
function qPrevMonth() { const d = new Date(); if (d.getDate() >= 25) return localDate(d).slice(0, 7); d.setDate(1); d.setMonth(d.getMonth() - 1); return localDate(d).slice(0, 7); }
function qBeschHTML() {
  return `${secTitle('Teilnahmebescheinigungen')}
    <div class="card p-4 flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="tbM">Monat</label><input id="tbM" type="month" class="field" value="${S.quali.tbMonat || qPrevMonth()}"></div>
        <div><label class="lbl" for="tbH">Stunden je Tag</label><input id="tbH" type="number" min="1" max="12" step="0.25" class="field" value="${S.quali.tbStd || 7.5}"></div></div>
      <div><label class="lbl" for="tbP">Für</label><select id="tbP" class="field"><option value="">alle in der Auswahl oben</option>${qTnList().filter(p => canSchool(p) && (!S.quali.anwFilter || qMassOf(p.id) === S.quali.anwFilter)).map(p => `<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}</select></div>
      <div class="grid grid-cols-2 gap-2"><button class="btn" id="tbPdf">PDF erstellen</button><button class="btn ghost" id="tbMail">Per E-Mail senden</button></div>
      <p class="text-[12px] text-muted">Eine Seite je Person mit Maßnahme, Zeitraum, allen Tagen des Monats, Fehlzeiten und Unterschriftsfeldern – z. B. als Nachweis für eine geförderte Maßnahme. Verlangt der Kostenträger ein eigenes Formular, gilt dieses. Notizen zu Fehltagen stehen nicht auf der Bescheinigung.</p>
    </div>`;
}
function qBeschBind() {
  const keep = () => { S.quali.tbMonat = $('#tbM').value; S.quali.tbStd = +$('#tbH').value || 7.5; };
  $('#tbM')?.addEventListener('change', keep); $('#tbH')?.addEventListener('change', keep);
  const b = $('#tbPdf'); if (b) b.onclick = async () => { keep(); b.disabled = true; try { const r = await qBeschPdf($('#tbP').value); if (r) { r.doc.save(r.name); toast('PDF erstellt'); } } catch (e) { toast(errText(e)); } finally { b.disabled = false; PDF_DE = false; } };
  const m = $('#tbMail'); if (m) m.onclick = () => { keep(); const who = $('#tbP').value; qMailSheet('Teilnahmebescheinigungen per E-Mail', () => qBeschPdf(who), `Teilnahmebescheinigungen ${qMonthLabel(S.quali.tbMonat || qPrevMonth())}`); };
}
const qMonthLabel = ym => new Date(ym + '-15T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
async function qBeschPdf(onlyId) {
  const ym = S.quali.tbMonat || qPrevMonth(), std = S.quali.tbStd || 7.5;
  if (!/^\d{4}-\d{2}$/.test(ym)) { toast('Bitte einen Monat wählen.'); return null; }
  const von = ym + '-01', last = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(), bis = ym + '-' + String(last).padStart(2, '0');
  const f = S.quali.anwFilter || '';
  const people = qTnList().filter(p => canSchool(p) && (onlyId ? p.id === onlyId : (!f || qMassOf(p.id) === f)));
  if (!people.length) { toast('Keine Teilnehmenden in dieser Auswahl.'); return null; }
  const rows = await q(sb.from('anwesenheit').select('azubi_id,datum,status,minuten').gte('datum', von).lte('datum', bis));
  const qrows = S.quali.rows || (await qLoadAll());
  const P = await qPdfStart(false), { doc, FONT, W, M } = P;
  people.forEach((p, pi) => {
    if (pi) doc.addPage();
    const t = qrows.find(r => r.azubi_id === p.id), k = qKat(t), mine = rows.filter(r => r.azubi_id === p.id), by = Object.fromEntries(mine.map(r => [r.datum, r]));
    const c = s => mine.filter(r => r.status === s).length, min = mine.filter(r => r.status === 'verspaetet').reduce((u, r) => u + (+r.minuten || 0), 0);
    const da = c('anwesend') + c('verspaetet'), stunden = Math.max(0, Math.round((da * std - min / 60) * 4) / 4);
    let y = 18;
    doc.setFont(FONT, 'bold'); doc.setFontSize(17); doc.text('Teilnahmebescheinigung', M, y); y += 7;
    doc.setFont(FONT, 'normal'); doc.setFontSize(10.5); doc.text(pdfSafe(`Berichtsmonat: ${qMonthLabel(ym)}`), M, y); y += 10;
    const kv = (l, v) => { doc.setFont(FONT, 'normal'); doc.setTextColor(100); doc.setFontSize(9.5); doc.text(pdfSafe(l), M, y); doc.setTextColor(0); doc.setFontSize(10.5); const ls = doc.splitTextToSize(pdfSafe(v || '–'), W - 2 * M - 52); doc.text(ls, M + 52, y); y += 6.4 + (ls.length - 1) * 4.8; };
    kv('Teilnehmer/in', p.full_name);
    kv('Maßnahme', k ? `${k.art} · ${k.beruf}${k.fachrichtung ? ' (' + k.fachrichtung + ')' : ''}` : '–');
    kv('Zeitraum der Maßnahme', t?.beginn ? `${fmtDate(t.beginn)} – ${t.ende ? fmtDate(t.ende) : 'offen'}` : '–');
    kv('Träger / Lernstandort', [S.hotel, t?.standort].filter(Boolean).join(' · '));
    const g = typeof qGroupLabel === 'function' ? qGroupLabel(p.id) : ''; if (g) kv('Gruppe', g);
    y += 4;
    doc.setFont(FONT, 'bold'); doc.setFontSize(11); doc.text('Anwesenheit im Monat', M, y); y += 6;
    const box = (x, v, l) => { doc.setDrawColor(215); doc.roundedRect(x, y - 4.5, 34, 15, 2, 2); doc.setFont(FONT, 'bold'); doc.setFontSize(13); doc.text(String(v), x + 3, y + 2.5); doc.setFont(FONT, 'normal'); doc.setFontSize(7.5); doc.setTextColor(90); doc.text(pdfSafe(l), x + 3, y + 7.5); doc.setTextColor(0); };
    box(M, mine.length, 'erfasste Tage'); box(M + 36, da, 'anwesend'); box(M + 72, c('entschuldigt'), 'entschuldigt'); box(M + 108, c('unentschuldigt'), 'unentschuldigt'); box(M + 144, String(stunden).replace('.', ','), 'Stunden (ca.)');
    y += 18;
    doc.setFontSize(8.5); doc.setTextColor(90);
    doc.text(doc.splitTextToSize(pdfSafe(`Verspätungen: ${c('verspaetet')}${min ? ' (zusammen ' + min + ' Minuten)' : ''}. Stunden = anwesende Tage × ${String(std).replace('.', ',')} Std. abzüglich Verspätungen. Quote: ${mine.length ? Math.round(da * 100 / mine.length) + ' %' : '–'}.`), W - 2 * M), M, y); doc.setTextColor(0); y += 9;
    /* Kalender: alle Tage des Monats */
    const cw = (W - 2 * M) / 7, ch = 11, wd = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    doc.setFont(FONT, 'bold'); doc.setFontSize(8.5); wd.forEach((w, i) => doc.text(w, M + i * cw + 2, y)); y += 2.5; doc.setFont(FONT, 'normal');
    const first = (new Date(von + 'T12:00:00').getDay() + 6) % 7;
    for (let d = 1; d <= last; d++) {
      const idx = first + d - 1, col = idx % 7, row = Math.floor(idx / 7), x = M + col * cw, yy = y + row * ch, ds = ym + '-' + String(d).padStart(2, '0'), a = by[ds];
      if (col >= 5) { doc.setFillColor(246, 247, 248); doc.rect(x, yy, cw, ch, 'F'); }
      doc.setDrawColor(225); doc.rect(x, yy, cw, ch);
      doc.setFontSize(7.5); doc.setTextColor(120); doc.text(String(d), x + 1.5, yy + 3.6); doc.setTextColor(0);
      if (a) { const colr = { anwesend: [35, 106, 64], verspaetet: [138, 80, 11], entschuldigt: [15, 92, 95], unentschuldigt: [168, 50, 50] }[a.status];
        doc.setTextColor(...colr); doc.setFont(FONT, 'bold'); doc.setFontSize(9.5); doc.text(ANW[a.status][0] + (a.status === 'verspaetet' && a.minuten ? ' ' + a.minuten + "'" : ''), x + cw / 2, yy + 8.2, { align: 'center' }); doc.setFont(FONT, 'normal'); doc.setTextColor(0); }
    }
    y += Math.ceil((first + last) / 7) * ch + 5;
    doc.setFontSize(8); doc.setTextColor(90); doc.text(pdfSafe('A = anwesend · V = verspätet (Minuten) · E = entschuldigt · U = unentschuldigt · leer = kein Maßnahmetag oder nicht erfasst'), M, y); doc.setTextColor(0); y += 8;
    const fehl = mine.filter(r => r.status === 'entschuldigt' || r.status === 'unentschuldigt').sort((a, b) => a.datum.localeCompare(b.datum));
    if (fehl.length) { doc.setFont(FONT, 'bold'); doc.setFontSize(10); doc.text('Fehltage', M, y); y += 5; doc.setFont(FONT, 'normal'); doc.setFontSize(9);
      doc.text(doc.splitTextToSize(pdfSafe(fehl.map(r => `${fmtDate(r.datum)} (${ANW[r.status][1].toLowerCase()})`).join(', ')), W - 2 * M), M, y); y += 5 * Math.ceil(fehl.length / 4) + 4; }
    y = Math.max(y + 10, 250);
    doc.setDrawColor(120); [[M, 'Ort, Datum'], [M + 62, 'Unterschrift Träger / Trainer/in'], [M + 124, 'Unterschrift Teilnehmer/in']].forEach(([x, l]) => { doc.line(x, y, x + 56, y); doc.setFontSize(8); doc.setTextColor(90); doc.text(pdfSafe(l), x, y + 4); doc.setTextColor(0); });
    doc.setFontSize(7.5); doc.setTextColor(120); doc.text(doc.splitTextToSize(pdfSafe('Erstellt aus der elektronischen Anwesenheitserfassung. Verlangt der Kostenträger (z. B. Agentur für Arbeit) ein eigenes Formular, ist dieses zu verwenden.'), W - 2 * M), M, y + 12); doc.setTextColor(0);
  });
  P.foot('Teilnahmebescheinigung');
  const one = people.length === 1 ? '_' + pdfFile(people[0].full_name) : '';
  return { doc, name: `Teilnahmebescheinigung${one}_${ym}.pdf`, subject: `Teilnahmebescheinigung${people.length > 1 ? 'en' : ''} ${qMonthLabel(ym)}` };
}
