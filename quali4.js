/* AzubiHub · Qualifizierungsmodus, Teil 4: Unterlagen und Zertifikate, Prüfungsakte für die IHK, Auswertung je Gruppe und Standort, Lernplan vor der Prüfung.
   Wird nach quali3.js und vor dem Hauptskript geladen. */

const QD_TYP = { zertifikat: 'IHK-Zertifikat', nachweis: 'Tätigkeitsnachweis', sonstiges: 'Sonstiges' };
const QD_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/* =====================================================================
   Unterlagen und Zertifikate (Akte)
   ===================================================================== */
async function qDocsLoad(uid) { return q(sb.from('quali_dokumente').select('*').eq('azubi_id', uid).order('created_at', { ascending: false })); }
async function qDocOpen(d) {
  try { const { data, error } = await sb.storage.from('quali').createSignedUrl(d.datei, 120); if (error || !data?.signedUrl) throw error || new Error();
    window.open(data.signedUrl, '_blank', 'noopener'); } catch { toast(S.demo ? 'In der Demo gibt es keine echten Dateien.' : 'Die Datei konnte nicht geöffnet werden.'); }
}
function qDocsListHTML(docs, staff) {
  if (!docs.length) return '<div class="p-4 text-[13px] text-muted">Noch keine Unterlagen hochgeladen.</div>';
  return docs.map((d, i) => `<div class="flex items-center gap-3 p-3.5 ${i ? 'border-t border-line' : ''}">
    <span class="ico ${d.typ === 'zertifikat' ? 'brass' : ''}">${svg(d.mime === 'application/pdf' ? 'file' : 'book')}</span>
    <button class="flex-1 min-w-0 text-left" data-qdopen="${d.id}"><div class="text-[14px] font-semibold truncate">${esc(d.titel)}</div>
      <div class="text-[12px] text-muted truncate tnum">${QD_TYP[d.typ]}${d.modul ? ' · Modul ' + d.modul : ''}${d.datum ? ' · ' + fmtDate(d.datum) : ''}</div></button>
    ${d.geprueft_at ? '<span class="chip ok flex-none">geprüft</span>' : staff ? `<button class="btn ghost py-1 px-2.5 text-[12px] flex-none" data-qdok="${d.id}">Geprüft</button>` : '<span class="chip flex-none">neu</span>'}
    ${staff || !d.geprueft_at ? `<button class="xbtn flex-none" data-qddel="${d.id}" aria-label="Entfernen">${svg('x', 'w-4 h-4')}</button>` : ''}</div>`).join('');
}
async function qAkteSheet(uid) {
  const p = S.profiles[uid]; if (!p) return;
  const staff = uid !== S.me.id, t = (S.quali?.rows || S.home?.qt || []).find(r => r.azubi_id === uid), k = qKat(t);
  let docs = []; try { docs = await qDocsLoad(uid); } catch (e) { return toast(errText(e)); }
  const draw = () => {
    const ms = t && k ? qMods(t) : [];
    sheetShell(staff ? `Unterlagen ${p.full_name}` : 'Deine Unterlagen', `
      ${ms.length ? `<div class="eyebrow mb-2">IHK-Zertifikate je Modul</div><div class="card">${ms.map((m, i) => { const has = docs.some(d => d.typ === 'zertifikat' && d.modul === m.nr);
        return `<div class="flex items-center gap-3 p-3 ${i ? 'border-t border-line' : ''}"><span class="chip ${m.status === 'bestanden' ? 'ok' : ''} tnum flex-none">${k.module.length > 1 ? 'TQ ' + m.nr : 'Kurs'}</span><div class="flex-1 min-w-0 text-[13px] truncate">${esc(m.titel)}</div>
          ${has ? '<span class="chip ok flex-none">✓ hochgeladen</span>' : m.status === 'bestanden' ? `<button class="text-[12px] font-semibold text-accent flex-none" data-qdup="${m.nr}">hochladen</button>` : '<span class="text-[12px] text-muted flex-none">–</span>'}</div>`; }).join('')}</div>` : ''}
      <div class="flex items-center justify-between mt-4 mb-2"><div class="eyebrow">Alle Unterlagen</div><button class="text-[13px] font-semibold text-accent" data-qdup="0">+ Hochladen</button></div>
      <div class="card">${qDocsListHTML(docs, staff)}</div>
      <button class="btn w-full mt-4" id="qAkte">Prüfungsakte als PDF</button>
      <p class="text-[12px] text-muted mt-2">Die Prüfungsakte fasst Module, Zertifikate, Anwesenheit, Nachweise und Praktika zusammen und hängt die hochgeladenen Zertifikate an – für den Antrag auf Zulassung zur Externenprüfung (§ 45 Abs. 2 BBiG). Über die Zulassung entscheidet die IHK.</p>`);
    $$('[data-qdopen]').forEach(b => b.onclick = () => qDocOpen(docs.find(d => d.id === b.dataset.qdopen)));
    $$('[data-qdup]').forEach(b => b.onclick = () => qDocUpload(uid, +b.dataset.qdup || null, async () => { docs = await qDocsLoad(uid); draw(); }));
    $$('[data-qdok]').forEach(b => b.onclick = async () => { try { await q(sb.from('quali_dokumente').update({ geprueft_von: S.me.id, geprueft_at: new Date().toISOString() }).eq('id', b.dataset.qdok)); docs = await qDocsLoad(uid); toast('Als geprüft markiert'); draw(); } catch (e) { toast(errText(e)); } });
    $$('[data-qddel]').forEach(b => b.onclick = () => qConfirm(b, async () => { const d = docs.find(x => x.id === b.dataset.qddel);
      try { await q(sb.from('quali_dokumente').delete().eq('id', d.id)); sb.storage.from('quali').remove([d.datei]).catch(() => {}); docs = docs.filter(x => x.id !== d.id); toast('Entfernt'); draw(); } catch (e) { toast(errText(e)); } }, '✓?'));
    $('#qAkte').onclick = async () => { const btn = $('#qAkte'); btn.disabled = true; btn.textContent = 'Wird erstellt …'; try { await qPruefungsakte(uid, docs); } catch (e) { toast(errText(e)); } finally { PDF_DE = false; btn.disabled = false; btn.textContent = 'Prüfungsakte als PDF'; } };
  };
  draw();
}
function qDocUpload(uid, modul, done) {
  const t = (S.quali?.rows || S.home?.qt || []).find(r => r.azubi_id === uid), k = qKat(t);
  sheetShell('Unterlage hochladen', `<form id="qdForm" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="qdT">Art</label><select id="qdT" class="field">${Object.entries(QD_TYP).map(([v, l]) => `<option value="${v}" ${v === 'zertifikat' ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    ${k && k.module.length > 1 ? `<div><label class="lbl" for="qdM">Modul</label><select id="qdM" class="field"><option value="">– keins –</option>${k.module.map(m => `<option value="${m.nr}" ${modul === m.nr ? 'selected' : ''}>Modul ${m.nr}: ${esc(m.titel)}</option>`).join('')}</select></div>` : ''}
    <div><label class="lbl" for="qdN">Titel</label><input id="qdN" class="field" maxlength="160" value="${modul && k ? esc(`IHK-Zertifikat Modul ${modul}`) : ''}" placeholder="z. B. IHK-Zertifikat Modul 2"></div>
    <div><label class="lbl" for="qdD">Datum <span class="font-normal text-muted">(optional)</span></label><input id="qdD" type="date" class="field"></div>
    <div><label class="lbl" for="qdF">Datei (PDF oder Foto, bis 10 MB)</label><input id="qdF" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" capture="environment" class="text-[13px] max-w-full" required></div>
    <button class="btn" id="qdSend">Hochladen</button>
    <p class="text-[12px] text-muted">Tipp: Zertifikat flach hinlegen, gut ausleuchten, ganz aufs Foto. Sichtbar für dich, deine Trainer und die Koordination.</p></form>`);
  $('#qdForm').onsubmit = async e => {
    e.preventDefault(); const f = $('#qdF').files[0]; if (!f) return toast('Bitte eine Datei wählen.');
    if (!QD_MIME.includes(f.type)) return toast('Bitte PDF, JPG, PNG oder WebP.');
    if (f.size > 10 * 1024 * 1024) return toast('Die Datei ist zu groß.');
    const btn = $('#qdSend'); btn.disabled = true; btn.textContent = 'Wird hochgeladen …';
    try {
      const safe = f.name.replace(/[^\w.-]+/g, '_').slice(-60), path = `${uid}/${Date.now()}_${safe}`;
      const { error } = await sb.storage.from('quali').upload(path, f, { contentType: f.type, upsert: false }); if (error) throw error;
      const titel = $('#qdN').value.trim() || f.name.slice(0, 160);
      await q(sb.from('quali_dokumente').insert({ azubi_id: uid, typ: $('#qdT').value, modul: $('#qdM')?.value ? +$('#qdM').value : null, titel, datum: $('#qdD').value || null, datei: path, mime: f.type, created_by: S.me.id }));
      toast('Hochgeladen'); await done();
    } catch (er) { toast(errText(er)); btn.disabled = false; btn.textContent = 'Hochladen'; }
  };
}

/* =====================================================================
   Prüfungsakte: Zusammenfassung als PDF, hochgeladene Unterlagen werden angehängt
   ===================================================================== */
async function qPruefungsakte(uid, docs) {
  const p = S.profiles[uid], staff = uid !== S.me.id;
  const t = (S.quali?.rows || S.home?.qt || []).find(r => r.azubi_id === uid), k = qKat(t);
  if (!k) return toast('Für diese Person ist keine Maßnahme hinterlegt.');
  const since = t.beginn || '2000-01-01', opt = pr => pr.then(r => r, () => []);
  const [anw, reps, pk] = await Promise.all([
    opt(q(sb.from('anwesenheit').select('status,datum').eq('azubi_id', uid).gte('datum', since))),
    opt(q(sb.from('reports').select('status,jahr,kw').eq('user_id', uid))),
    staff ? opt(q(sb.from('quali_praktika').select('*').eq('azubi_id', uid).order('von'))) : opt(q(sb.rpc('praktika_meine')))
  ]);
  let tests = [];
  if (staff) try {
    const ab = await q(sb.from('test_abgaben').select('sitzung_id,punkte_auto,punkte_manuell,abgegeben_at').eq('azubi_id', uid));
    const sids = ab.map(a => a.sitzung_id), ss = sids.length ? await q(sb.from('test_sitzungen').select('id,titel,test_id,gestartet_at').in('id', sids)) : [];
    const ts = ss.length ? await q(sb.from('tests').select('id,fragen').in('id', [...new Set(ss.map(s => s.test_id))])) : [];
    tests = ab.map(a => { const s = ss.find(x => x.id === a.sitzung_id), te = ts.find(x => x.id === s?.test_id), max = qMax(te), pts = qPts(a, te); return s && pts != null && max ? { titel: s.titel, datum: s.gestartet_at, pc: Math.round(pts * 100 / max) } : null; }).filter(Boolean).sort((a, b) => a.datum.localeCompare(b.datum));
  } catch { tests = []; }
  const P = await qPdfStart(false), { doc, FONT, W, M } = P;
  let y = 18;
  const need = h => { if (y + h > 280) { doc.addPage(); y = 18; } };
  const line = (txt, size = 10, bold = false, col = 0, x = M, w = W - 2 * M) => { doc.setFont(FONT, bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(col); doc.splitTextToSize(pdfSafe(txt), w).forEach(l => { need(size * .45); doc.text(l, x, y); y += size * .45; }); doc.setTextColor(0); };
  const h2 = txt => { y += 4; need(14); doc.setDrawColor(200); doc.line(M, y - 3, W - M, y - 3); line(txt, 12, true); y += 1.5; };
  const row = (cols, bold = false) => { need(6); doc.setFont(FONT, bold ? 'bold' : 'normal'); doc.setFontSize(9); cols.forEach(([txt, x, w]) => doc.text(doc.splitTextToSize(pdfSafe(String(txt ?? '')), w)[0] || '', M + x, y)); y += 5.2; };
  line('Prüfungsakte', 18, true); y += 1;
  line('Unterlagen für den Antrag auf Zulassung zur Externenprüfung nach § 45 Abs. 2 BBiG', 10, false, 80); y += 4;
  const kv = [['Name', p.full_name], ['Beruf', k.beruf + (k.fachrichtung ? ' (Fachrichtung ' + k.fachrichtung + ')' : '')], ['Maßnahme', `${k.art} · ${k.kurz}`], ['Standort', t.standort || '–'],
    ['Zeitraum', `${t.beginn ? fmtDate(t.beginn) : '–'} bis ${t.ende ? fmtDate(t.ende) : '–'}`], ['Berufserfahrung', t.erfahrung_jahre != null ? `${String(t.erfahrung_jahre).replace('.', ',')} Jahre (Angabe des Betriebs)` : '–'], ['Betrieb', S.hotel || '']];
  kv.forEach(([a, b]) => { need(6); doc.setFont(FONT, 'bold'); doc.setFontSize(9.5); doc.text(pdfSafe(a), M, y); doc.setFont(FONT, 'normal'); doc.text(doc.splitTextToSize(pdfSafe(b), W - 2 * M - 40), M + 40, y); y += 5.5; });
  h2('1. Module und IHK-Zertifikate');
  row([['Modul', 0, 18], ['Inhalt', 18, 92], ['Status', 112, 26], ['Zertifikat vom', 140, 28], ['Anlage', 168, 14]], true);
  qMods(t).forEach(m => { const has = docs.some(d => d.typ === 'zertifikat' && d.modul === m.nr); row([[k.module.length > 1 ? 'TQ ' + m.nr : 'Kurs', 0, 18], [m.titel, 18, 92], [(qModStat[m.status || 'offen'] || qModStat.offen)[1], 112, 26], [m.zert_datum ? fmtDate(m.zert_datum) : '–', 140, 28], [has ? 'ja' : '–', 168, 14]]); });
  h2('2. Externenprüfung');
  const pr = t.pruefung || {};
  Q_PRUEF.forEach(([key, l]) => row([[pr[key] ? '[x]' : '[ ]', 0, 8], [l, 8, 120], [pr[key] ? fmtDate(pr[key]) : '', 140, 40]]));
  row([['Anmeldeschluss: ' + (pr.anmeldeschluss ? fmtDate(pr.anmeldeschluss) : '–'), 0, 60], ['schriftlich: ' + (pr.schriftlich ? fmtDate(pr.schriftlich) : '–'), 62, 55], ['praktisch: ' + (pr.praktisch ? fmtDate(pr.praktisch) : '–'), 120, 60]]);
  h2('3. Anwesenheit');
  const c = s => anw.filter(a => a.status === s).length, q0 = anw.length ? Math.round((c('anwesend') + c('verspaetet')) * 100 / anw.length) : null;
  line(anw.length ? `${anw.length} erfasste Tage seit ${fmtDate(since)}: ${c('anwesend')} anwesend, ${c('verspaetet')} verspätet, ${c('entschuldigt')} entschuldigt, ${c('unentschuldigt')} unentschuldigt. Anwesenheitsquote ${q0} %.` : 'Keine Anwesenheit erfasst.');
  h2('4. Lern- und Tätigkeitsnachweis');
  const ab = reps.filter(r => r.status === 'abgezeichnet').length, ein = reps.filter(r => r.status === 'eingereicht').length;
  line(`${reps.length} Wochenberichte angelegt, davon ${ab} abgezeichnet und ${ein} eingereicht.`);
  h2('5. Praktika im Werk');
  if (!pk.length) line('Keine Praktika.');
  pk.forEach(x => { const f = x.abgesegnet_at ? x.fb_al : null, vals = Object.values(f?.kriterien || {}), avg = vals.length ? (vals.reduce((u, v) => u + v, 0) / vals.length).toFixed(1).replace('.', ',') : null;
    line(`${x.abteilung} · ${fmtDate(x.von)} bis ${fmtDate(x.bis)}${x.ansprechpartner ? ' · ' + x.ansprechpartner : ''}${avg ? ` · Rückmeldung der Abteilung: Ø ${avg} von 5${f.empfehlung ? ', wieder einsetzen: ' + f.empfehlung : ''}` : x.abgesegnet_at ? '' : ' · Rückmeldung noch nicht freigegeben'}`); y += 1; });
  if (staff) { h2('6. Tests'); if (!tests.length) line('Keine ausgewerteten Tests.'); tests.forEach(x => row([[fmtDate(localDate(new Date(x.datum))), 0, 24], [x.titel, 24, 130], [x.pc + ' %', 156, 20]])); }
  h2(staff ? '7. Anlagen' : '6. Anlagen');
  if (!docs.length) line('Keine Unterlagen hochgeladen.');
  docs.forEach((d, i) => line(`Anlage ${i + 1}: ${d.titel} (${QD_TYP[d.typ]}${d.modul ? ', Modul ' + d.modul : ''}${d.datum ? ', ' + fmtDate(d.datum) : ''})`));
  y += 6; line('Zusammenstellung aus der App. Maßgeblich sind die Originaldokumente. Über die Zulassung zur Externenprüfung entscheidet die zuständige IHK. Keine Rechtsberatung.', 8.5, false, 100);
  y += 14; need(20); doc.setDrawColor(120); doc.line(M, y, M + 75, y); doc.line(W - M - 75, y, W - M, y); doc.setFontSize(8); doc.setTextColor(90); doc.text('Ort, Datum', M, y + 4); doc.text(pdfSafe('Unterschrift Betrieb / Koordination'), W - M - 75, y + 4); doc.setTextColor(0);
  P.foot('Prüfungsakte');
  const name = `Pruefungsakte_${pdfFile(p.full_name)}_${localDate()}.pdf`;
  if (!docs.length) { doc.save(name); toast('PDF erstellt'); return; }
  await loadScript('./vendor/pdf-lib.min.js');
  const { PDFDocument } = window.PDFLib, out = await PDFDocument.load(doc.output('arraybuffer'));
  let miss = 0;
  for (const d of docs) {
    try {
      const { data, error } = await sb.storage.from('quali').createSignedUrl(d.datei, 120); if (error || !data?.signedUrl) throw 0;
      const buf = await (await fetch(data.signedUrl)).arrayBuffer();
      if (d.mime === 'application/pdf') { const src = await PDFDocument.load(buf, { ignoreEncryption: true }); (await out.copyPages(src, src.getPageIndices())).forEach(pg => out.addPage(pg)); continue; }
      let img;
      if (d.mime === 'image/png') img = await out.embedPng(buf);
      else if (d.mime === 'image/jpeg') img = await out.embedJpg(buf);
      else { const bm = await createImageBitmap(new Blob([buf], { type: d.mime })), cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height; cv.getContext('2d').drawImage(bm, 0, 0);
        img = await out.embedJpg(await (await new Promise(r => cv.toBlob(r, 'image/jpeg', .9))).arrayBuffer()); }
      const pg = out.addPage([595.28, 841.89]), sc = Math.min((595.28 - 56) / img.width, (841.89 - 80) / img.height);
      pg.drawText(pdfSafe(d.titel).slice(0, 90), { x: 28, y: 841.89 - 32, size: 10 });
      pg.drawImage(img, { x: (595.28 - img.width * sc) / 2, y: 841.89 - 48 - img.height * sc, width: img.width * sc, height: img.height * sc });
    } catch { miss++; }
  }
  const blob = new Blob([await out.save()], { type: 'application/pdf' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast(miss ? `PDF erstellt – ${miss} Anlage${miss === 1 ? '' : 'n'} konnte${miss === 1 ? '' : 'n'} nicht angehängt werden` : 'PDF mit Anlagen erstellt');
}

/* =====================================================================
   Auswertung je Gruppe, Standort und Maßnahme (Trainer, Koordination)
   ===================================================================== */
async function qAuswLoad() {
  const A = S.quali.ausw ||= { gruppe: '', standort: '', massnahme: '', zeitraum: '90' };
  const von = A.zeitraum === 'alle' ? '2000-01-01' : qAddDays(localDate(), -(+A.zeitraum));
  const opt = pr => pr.then(r => r, () => []);
  const [anw, ab, ss] = await Promise.all([
    opt(q(sb.from('anwesenheit').select('azubi_id,status').gte('datum', von))),
    opt(q(sb.from('test_abgaben').select('azubi_id,sitzung_id,punkte_auto,punkte_manuell,abgegeben_at')).then(r => r.filter(x => x.abgegeben_at))),
    opt(q(sb.from('test_sitzungen').select('id,test_id,gestartet_at').gte('gestartet_at', von + 'T00:00:00')))
  ]);
  const ts = ss.length ? await opt(q(sb.from('tests').select('id,fragen').in('id', [...new Set(ss.map(s => s.test_id))]))) : [];
  S.quali.auswData = { anw, ab, ss, ts };
}
function qAuswRows() {
  const A = S.quali.ausw, D = S.quali.auswData || { anw: [], ab: [], ss: [], ts: [] };
  const rows = (S.quali.rows || []).filter(r => S.profiles[r.azubi_id] && canSchool(S.profiles[r.azubi_id]))
    .filter(r => (!A.gruppe || (A.gruppe === '_' ? !r.gruppe_id : r.gruppe_id === A.gruppe)) && (!A.standort || (r.standort || '') === A.standort) && (!A.massnahme || r.massnahme === A.massnahme));
  return rows.map(r => {
    const p = S.profiles[r.azubi_id], k = qKat(r), an = D.anw.filter(a => a.azubi_id === r.azubi_id), ok = an.filter(a => a.status === 'anwesend' || a.status === 'verspaetet').length;
    const tpc = D.ab.filter(a => a.azubi_id === r.azubi_id).map(a => { const s = D.ss.find(x => x.id === a.sitzung_id), te = D.ts.find(x => x.id === s?.test_id), mx = qMax(te), pt = qPts(a, te); return s && mx && pt != null ? pt * 100 / mx : null; }).filter(v => v != null);
    const ex = qExamInfo(r);
    return { p, r, k, mods: k?.module.length || 0, done: qDone(r), cur: qCur(r)?.nr || null, quote: an.length ? Math.round(ok * 100 / an.length) : null, tage: an.length, unent: an.filter(a => a.status === 'unentschuldigt').length,
      test: tpc.length ? Math.round(tpc.reduce((u, v) => u + v, 0) / tpc.length) : null, tests: tpc.length, pruef: ex?.d || null, pruefN: ex?.n ?? null, gruppe: typeof qGroupLabel === 'function' ? qGroupLabel(r.azubi_id) : '' };
  }).sort((a, b) => a.p.full_name.localeCompare(b.p.full_name));
}
const qAvg = arr => { const v = arr.filter(x => x != null); return v.length ? Math.round(v.reduce((u, x) => u + x, 0) / v.length) : null; };
function qAuswHTML() {
  const A = S.quali.ausw, list = qAuswRows(), rows = S.quali.rows || [];
  const standorte = [...new Set(rows.map(r => r.standort).filter(Boolean))].sort(), gruppen = S.qgr?.g || [];
  const tile = (v, l, tone = '') => `<div class="card p-3"><div class="font-display font-bold text-[22px] tnum ${tone}">${v}</div><div class="text-[12px] text-muted">${l}</div></div>`;
  const qa = qAvg(list.map(x => x.quote)), ta = qAvg(list.map(x => x.test)), zert = list.reduce((u, x) => u + x.done, 0), soon = list.filter(x => x.pruefN != null && x.pruefN >= 0 && x.pruefN <= 90).length;
  return `${secTitle('Auswertung')}
    <div class="card p-4 grid grid-cols-2 gap-2">
      <select class="field" data-aw="gruppe" aria-label="Gruppe"><option value="">Alle Gruppen</option>${gruppen.map(g => `<option value="${g.id}" ${A.gruppe === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}${gruppen.length ? `<option value="_" ${A.gruppe === '_' ? 'selected' : ''}>Ohne Gruppe</option>` : ''}</select>
      <select class="field" data-aw="standort" aria-label="Standort"><option value="">Alle Standorte</option>${standorte.map(s => `<option ${A.standort === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <select class="field" data-aw="massnahme" aria-label="Maßnahme"><option value="">Alle Maßnahmen</option>${Object.entries(Q_KATALOG).map(([k, x]) => `<option value="${k}" ${A.massnahme === k ? 'selected' : ''}>${esc(x.kurz)}</option>`).join('')}</select>
      <select class="field" data-aw="zeitraum" aria-label="Zeitraum"><option value="28" ${A.zeitraum === '28' ? 'selected' : ''}>Letzte 4 Wochen</option><option value="90" ${A.zeitraum === '90' ? 'selected' : ''}>Letzte 3 Monate</option><option value="alle" ${A.zeitraum === 'alle' ? 'selected' : ''}>Gesamter Zeitraum</option></select>
    </div>
    <div class="grid grid-cols-2 gap-2 mt-3">${tile(list.length, 'Teilnehmende')}${tile(qa == null ? '–' : qa + ' %', 'Anwesenheitsquote', qa != null && qa < 85 ? 'text-[color:var(--warn)]' : '')}${tile(ta == null ? '–' : ta + ' %', 'Ø Testergebnis')}${tile(zert, 'IHK-Zertifikate erreicht')}${tile(soon, 'Prüfungen in 90 Tagen')}${tile(list.reduce((u, x) => u + x.unent, 0), 'unentschuldigte Tage')}</div>
    ${list.length ? `<div class="card mt-3">${list.map((x, i) => `<button class="w-full text-left p-3.5 ${i ? 'border-t border-line' : ''}" data-qakte="${x.p.id}"><div class="flex items-center gap-3">${avatar(x.p, 32)}<div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(x.p.full_name)}</div>
        <div class="text-[12px] text-muted truncate">${esc(x.k?.kurz || 'ohne Maßnahme')}${x.gruppe ? ' · ' + esc(x.gruppe) : ''}${x.r.standort ? ' · ' + esc(x.r.standort) : ''}</div></div></div>
        <div class="grid grid-cols-4 gap-1 mt-2 text-[12px] tnum"><div><div class="text-muted">Module</div><b>${x.done}/${x.mods}</b></div><div><div class="text-muted">Anwesend</div><b style="color:${x.quote == null ? 'inherit' : x.quote < 85 ? 'var(--warn)' : 'var(--ok)'}">${x.quote == null ? '–' : x.quote + ' %'}</b></div>
        <div><div class="text-muted">Tests</div><b>${x.test == null ? '–' : x.test + ' %'}</b></div><div><div class="text-muted">Prüfung</div><b>${x.pruef ? fmtDate(x.pruef) : '–'}</b></div></div></button>`).join('')}</div>` : empty('Keine Teilnehmenden in dieser Auswahl.')}
    <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn" id="awPdf">Als PDF</button><button class="btn ghost" id="awMail">Per E-Mail</button></div>
    <p class="text-[12px] text-muted mt-2">Du siehst nur Teilnehmende, für die du zuständig bist. Antippen öffnet Unterlagen und Prüfungsakte.</p>`;
}
function qAuswBind() {
  $$('[data-aw]').forEach(s => s.onchange = async () => { S.quali.ausw[s.dataset.aw] = s.value; if (s.dataset.aw === 'zeitraum') await qAuswLoad(); render(); });
  $$('[data-qakte]').forEach(b => b.onclick = () => qAkteSheet(b.dataset.qakte));
  $('#awPdf') && ($('#awPdf').onclick = async () => { try { const r = await qAuswPdf(); r.doc.save(r.name); toast('PDF erstellt'); } catch (e) { toast(errText(e)); } finally { PDF_DE = false; } });
  $('#awMail') && ($('#awMail').onclick = () => qMailSheet('Auswertung per E-Mail', () => qAuswPdf(), 'Auswertung der Qualifizierung'));
}
async function qAuswPdf() {
  const A = S.quali.ausw, list = qAuswRows(), P = await qPdfStart(true), { doc, FONT, W, M } = P;
  const g = A.gruppe ? (A.gruppe === '_' ? 'ohne Gruppe' : qGruppe(A.gruppe)?.name || '') : 'alle Gruppen', zr = { 28: 'letzte 4 Wochen', 90: 'letzte 3 Monate', alle: 'gesamter Zeitraum' }[A.zeitraum];
  doc.setFont(FONT, 'bold'); doc.setFontSize(16); doc.text('Auswertung Qualifizierung', M, 16);
  doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(80);
  doc.text(pdfSafe(`${S.hotel || ''} · ${g} · ${A.standort || 'alle Standorte'} · ${A.massnahme ? Q_KATALOG[A.massnahme].kurz : 'alle Maßnahmen'} · Anwesenheit und Tests: ${zr} · Stand ${fmtDate(localDate())}`), M, 22); doc.setTextColor(0);
  const qa = qAvg(list.map(x => x.quote)), ta = qAvg(list.map(x => x.test));
  doc.setFontSize(10); doc.text(pdfSafe(`${list.length} Teilnehmende · Anwesenheitsquote ${qa == null ? '–' : qa + ' %'} · Ø Testergebnis ${ta == null ? '–' : ta + ' %'} · ${list.reduce((u, x) => u + x.done, 0)} IHK-Zertifikate · ${list.filter(x => x.pruefN != null && x.pruefN >= 0 && x.pruefN <= 90).length} Prüfungen in den nächsten 90 Tagen`), M, 30);
  const cols = [['Name', 0], ['Maßnahme', 50], ['Gruppe', 100], ['Standort', 140], ['Module', 175], ['Anwesenheit', 195], ['unent.', 220], ['Tests', 236], ['Prüfung', 252]];
  let y = 40; const head = () => { doc.setFillColor(238, 242, 242); doc.rect(M, y - 5, W - 2 * M, 7.5, 'F'); doc.setFont(FONT, 'bold'); doc.setFontSize(8.5); cols.forEach(([l, x]) => doc.text(pdfSafe(l), M + 1 + x, y)); doc.setFont(FONT, 'normal'); y += 7; };
  head();
  list.forEach((x, i) => { if (y > 192) { doc.addPage(); y = 18; head(); } if (i % 2) { doc.setFillColor(248, 250, 250); doc.rect(M, y - 4.3, W - 2 * M, 6.2, 'F'); }
    const v = [x.p.full_name, x.k?.kurz || '–', x.gruppe || '–', x.r.standort || '–', `${x.done}/${x.mods}`, x.quote == null ? '–' : x.quote + ' % (' + x.tage + ' T.)', String(x.unent), x.test == null ? '–' : x.test + ' %', x.pruef ? fmtDate(x.pruef) : '–'];
    doc.setFontSize(8.5); v.forEach((t, j) => { const w = (cols[j + 1]?.[1] ?? 280) - cols[j][1] - 2; doc.text(doc.splitTextToSize(pdfSafe(t), w)[0] || '', M + 1 + cols[j][1], y); }); y += 6.2; });
  P.foot('Auswertung');
  return { doc, name: `Auswertung_Qualifizierung_${localDate()}.pdf`, subject: 'Auswertung der Qualifizierung' };
}

/* =====================================================================
   Lernplan in den letzten 8 Wochen vor der Prüfung (Teilnehmende)
   ===================================================================== */
function qLernplan(t) {
  const k = qKat(t), ex = qExamInfo(t); if (!k || !ex?.d || ex.n == null || ex.n < 0 || ex.n > 56) return null;
  const rp = [...new Set(k.module.flatMap(m => m.rp))], items = (S.content.rp || []).filter(r => r.beruf === k.beruf);
  const mon = qMonday(localDate()), examMon = qMonday(ex.d), weeks = [];
  for (let d = mon; d <= examMon; d = qAddDays(d, 7)) weeks.push(d);
  const learn = Math.max(1, weeks.length - 1), per = Math.ceil(rp.length / learn);
  return { ex, k, weeks: weeks.map((w, i) => { const last = i === weeks.length - 1 && weeks.length > 1, nrs = last ? [] : rp.slice(i * per, i * per + per);
    return { von: w, bis: qAddDays(w, 4), last, nrs, titel: nrs.map(nr => items.find(r => r.nr === nr)?.titel || nr) }; }) };
}
function qLernplanHTML(t) {
  const L = qLernplan(t); if (!L) return '';
  let done = {}; try { done = JSON.parse(localStorage.getItem('azubihub.lernplan.' + S.me.id) || '{}'); } catch {}
  const wk = Math.ceil(L.ex.n / 7), cur = localDate();
  return `${secTitle('Dein Lernplan', `<span class="chip ${wk <= 2 ? 'crit' : 'warn'} tnum">noch ${L.ex.n} Tage</span>`)}
    <div class="card">${L.weeks.map((w, i) => { const now = cur >= w.von && cur <= qAddDays(w.von, 6), key = w.von;
      return `<div class="p-3.5 ${i ? 'border-t border-line' : ''}" ${now ? 'style="background:var(--accent-soft)"' : ''}>
        <div class="flex items-center gap-2"><label class="flex items-center gap-2 flex-1 min-w-0"><input type="checkbox" class="cbx" data-lpw="${key}" ${done[key] ? 'checked' : ''}><span class="text-[14px] font-semibold tnum">Woche ${i + 1} · ${fmtDate(w.von)}–${fmtDate(w.bis)}</span></label>${now ? '<span class="chip accent">diese Woche</span>' : ''}</div>
        <div class="text-[13px] text-muted mt-1">${w.last ? 'Wiederholen: gemischte Prüfung zweimal üben, offene Lernkarten, Unterlagen und Anfahrt zur Prüfung klären.' : w.titel.map(esc).join(' · ')}</div>
        ${now ? `<button class="btn ghost w-full mt-2 py-1.5 text-[13px]" data-lpex="${i}">${w.last ? 'Gemischte Prüfung üben' : 'Fragen dieser Woche üben'}</button>` : ''}</div>`; }).join('')}</div>
    <p class="text-[12px] text-muted mt-2">Vorschlag aus den Inhalten deiner Maßnahme. Haken setzen, wenn eine Woche geschafft ist.</p>`;
}
function qLernplanBind(t) {
  const L = qLernplan(t); if (!L) return;
  $$('[data-lpw]').forEach(c => c.onchange = () => { let d = {}; try { d = JSON.parse(localStorage.getItem('azubihub.lernplan.' + S.me.id) || '{}'); } catch {} d[c.dataset.lpw] = c.checked; try { localStorage.setItem('azubihub.lernplan.' + S.me.id, JSON.stringify(d)); } catch {} });
  $$('[data-lpex]').forEach(b => b.onclick = () => { const w = L.weeks[+b.dataset.lpex]; if (w.last || !w.nrs.length) return qExam(0);
    const keys = (S.content.rp || []).filter(r => r.beruf === L.k.beruf && w.nrs.includes(r.nr)).flatMap(r => r.stichworte || []).filter(x => x.length > 3);
    openExam('lernfeld', null, w.nrs, keys, `Lernplan · Woche ${+b.dataset.lpex + 1}`); });
}
