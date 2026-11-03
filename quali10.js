/* Desk · Qualifizierungsmodus, Teil 10
   – Audit-Mappe: alle Nachweise für das AZAV-Audit als eine ZIP-Datei
   – Qualifikationsnachweise der Trainer (mit Ablaufdatum)
   – Meldungen an Kostenträger (Agentur für Arbeit, Jobcenter …): Teilnahme und Fehlzeiten je Monat
   – Anmeldeseite je Standort mit Maßnahmen (nutzt die Karriereseite der App)
   Wird nach quali9.js und vor dem Hauptskript geladen. */

(() => {
  const i = ORG_VERW_TABS0.findIndex(t => t[0] === 'raeume');
  ORG_VERW_TABS0.splice(i < 0 ? ORG_VERW_TABS0.length : i, 0, ['meld', 'Meldungen'], ['anm', 'Anmeldung']);
  Q9_TEAM.add('meld'); Q9_TEAM.add('anm');
  Q9_TABS.meld = { html: () => q10MeldHTML(), bind: () => q10MeldBind(), load: () => q10MeldLoad() };
  Q9_TABS.anm = { html: () => q10AnmHTML(), bind: () => q10AnmBind(), load: () => q10AnmLoad() };
})();

/* =====================================================================
   Meldungen an Kostenträger
   ===================================================================== */
const KT_LISTE = ['Agentur für Arbeit', 'Jobcenter', 'Deutsche Rentenversicherung', 'Berufsgenossenschaft', 'Arbeitgeber', 'Selbstzahler'];
const ktOf = id => { const t = qOf(id) || {}; return { name: t.kostentraeger || '', nr: t.kt_nummer || '', mail: t.kt_kontakt || '', t }; };
const q10Schwelle = () => { try { return Math.max(1, +localStorage.getItem('desk.ktSchwelle') || 3); } catch { return 3; } };
async function q10MeldLoad() {
  const t = localDate();
  if (!S.org.ktM) S.org.ktM = +t.slice(8, 10) <= 7 ? orgAddMonths(t.slice(0, 7) + '-01', -1).slice(0, 7) : t.slice(0, 7);
  const m0 = S.org.ktM + '-01', m1 = qAddDays(orgAddMonths(m0, 1), -1);
  try { S.org.ktAnw = await orgFetch('anwesenheit', 'datum', m0, m1, 'azubi_id,datum,status,minuten'); } catch { S.org.ktAnw = []; }
}
function q10Stat(id) {
  const a = (S.org.ktAnw || []).filter(x => x.azubi_id === id), c = s => a.filter(x => x.status === s).length, zt = a.filter(qAnwZaehlt).length;
  return { tage: a.length, an: c('anwesend'), vs: c('verspaetet'), en: c('entschuldigt'), un: c('unentschuldigt'), ur: c('urlaub'), fr: c('frei'), quote: zt ? Math.round((c('anwesend') + c('verspaetet')) * 100 / zt) : null, rows: a };
}
function q10MeldPeople() {
  const f = S.org.ktF || '';
  return qTnList().filter(p => canSchool(p) && !['abgebrochen'].includes(qOf(p.id)?.status)).filter(p => { const k = ktOf(p.id).name; return !f || (f === '_' ? !k : k === f); })
    .sort((a, b) => (ktOf(a.id).name || '~').localeCompare(ktOf(b.id).name || '~') || a.full_name.localeCompare(b.full_name));
}
function q10MeldHTML() {
  if (!q9Team()) return empty('Meldungen an Kostenträger macht die Koordination.');
  const all = qTnList().filter(canSchool), kts = [...new Set(all.map(p => ktOf(p.id).name).filter(Boolean))].sort(), f = S.org.ktF || '', sw = q10Schwelle();
  const ppl = q10MeldPeople(), mName = new Date(S.org.ktM + '-01T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const ohne = all.filter(p => !ktOf(p.id).name).length;
  return `<div class="card p-4 mt-3 flex flex-col gap-3">
      <p class="text-[14px]">Monatliche <b>Teilnahme- und Fehlzeitenmeldung</b> für Agentur für Arbeit, Jobcenter oder andere Kostenträger – aus der Anwesenheitsliste, ohne Gründe oder Diagnosen.</p>
      <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="ktM">Monat</label><input id="ktM" type="month" class="field" value="${S.org.ktM}"></div>
        <div><label class="lbl" for="ktF">Kostenträger</label><select id="ktF" class="field"><option value="">Alle</option>${kts.map(k => `<option ${f === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}<option value="_" ${f === '_' ? 'selected' : ''}>Ohne Kostenträger</option></select></div></div>
      ${ohne ? `<div class="text-[13px] p-2.5 rounded-xl" style="background:var(--brass-soft)">${ohne} ${ohne === 1 ? 'Person hat' : 'Personen haben'} noch keinen Kostenträger. Zeile antippen und eintragen.</div>` : ''}
    </div>
    ${secTitle(esc(mName), `<span class="chip tnum">${ppl.length}</span>`)}
    <div class="card overflow-x-auto"><table class="q9-tab"><thead><tr><th>Name</th><th>Kostenträger</th><th class="c">Tage</th><th class="c">anw.</th><th class="c">entsch.</th><th class="c">unent.</th><th class="c">Quote</th></tr></thead><tbody>
      ${ppl.map(p => { const k = ktOf(p.id), s = q10Stat(p.id); return `<tr data-kted="${p.id}" style="cursor:pointer"><td><b>${esc(p.full_name)}</b>${s.un >= sw ? '<br><span class="chip crit" style="font-size:10.5px">prüfen</span>' : ''}</td><td>${k.name ? esc(k.name) + (k.nr ? `<br><span class="text-muted text-[11px]">${esc(k.nr)}</span>` : '') : '<span class="text-muted">– eintragen –</span>'}</td><td class="c tnum">${s.tage}</td><td class="c tnum">${s.an + s.vs}</td><td class="c tnum">${s.en}</td><td class="c tnum" style="${s.un ? 'color:var(--crit);font-weight:700' : ''}">${s.un}</td><td class="c tnum">${s.quote == null ? '–' : s.quote + ' %'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="text-muted">Niemand in dieser Auswahl.</td></tr>'}
    </tbody></table></div>
    <div class="flex items-center gap-2 text-[12px] text-muted mt-2"><label for="ktSw">„prüfen“ ab</label><input id="ktSw" type="number" min="1" max="20" class="field py-1" style="width:64px" value="${sw}"><span>unentschuldigten Tagen im Monat. Ob und wann ihr melden müsst, regelt euer Vertrag mit dem Kostenträger.</span></div>
    <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn" id="ktPdf" ${ppl.length ? '' : 'disabled'}>Meldung als PDF</button><button class="btn ghost" id="ktMail" ${ppl.length ? '' : 'disabled'}>Per E-Mail senden</button></div>
    <p class="text-[12px] text-muted mt-2">Pro Kostenträger entsteht eine Übersicht und je Person eine Seite mit den einzelnen Fehltagen. Bitte nur an die zuständige Stelle senden – die Daten sind personenbezogen.</p>`;
}
function q10MeldBind() {
  $('#ktM') && ($('#ktM').onchange = () => { if ($('#ktM').value) { S.org.ktM = $('#ktM').value; go(S.view); } });
  $('#ktF') && ($('#ktF').onchange = () => { S.org.ktF = $('#ktF').value; render(); });
  $('#ktSw') && ($('#ktSw').onchange = () => { try { localStorage.setItem('desk.ktSchwelle', String(Math.max(1, +$('#ktSw').value || 3))); } catch {} render(); });
  $$('[data-kted]').forEach(r => r.onclick = () => q10KtSheet(r.dataset.kted));
  $('#ktPdf') && ($('#ktPdf').onclick = async e => { const b = e.currentTarget; b.disabled = true; try { const r = await q10MeldPdf(); r.doc.save(r.name); toast('PDF erstellt'); } catch (er) { toast(errText(er)); } finally { b.disabled = false; PDF_DE = false; } });
  $('#ktMail') && ($('#ktMail').onclick = () => {
    const mails = [...new Set(q10MeldPeople().map(p => ktOf(p.id).mail).filter(Boolean))];
    if (mails.length === 1) { try { localStorage.setItem('azubihub.pdfmail', mails[0]); } catch {} }
    const mName = new Date(S.org.ktM + '-01T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    qMailSheet('Meldung per E-Mail', () => q10MeldPdf(), `Guten Tag,\n\nanbei die Teilnahme- und Fehlzeitenmeldung für ${mName}${S.org.ktF && S.org.ktF !== '_' ? ' (' + S.org.ktF + ')' : ''}.\n\nMit freundlichen Grüßen\n${S.me.full_name}`);
  });
}
function q10KtSheet(id) {
  const p = S.profiles[id], k = ktOf(id);
  sheetShell('Kostenträger', `<form id="ktE" class="card p-4 flex flex-col gap-3">
    <div class="text-[13px] text-muted">${esc(p?.full_name || '')}</div>
    <div><label class="lbl" for="ktN">Kostenträger</label><input id="ktN" class="field" list="ktL" maxlength="120" value="${esc(k.name)}" placeholder="z. B. Jobcenter Paderborn"><datalist id="ktL">${KT_LISTE.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
    <div><label class="lbl" for="ktNr">Kundennummer / BG-Nummer <span class="font-normal text-muted">(optional)</span></label><input id="ktNr" class="field" maxlength="60" value="${esc(k.nr)}"></div>
    <div><label class="lbl" for="ktK">E-Mail der Ansprechperson <span class="font-normal text-muted">(optional)</span></label><input id="ktK" type="email" class="field" maxlength="160" value="${esc(k.mail)}"></div>
    <button class="btn">Speichern</button></form>`);
  $('#ktE').onsubmit = async e => {
    e.preventDefault();
    const row = { kostentraeger: $('#ktN').value.trim() || null, kt_nummer: $('#ktNr').value.trim() || null, kt_kontakt: $('#ktK').value.trim() || null, updated_at: new Date().toISOString() };
    try {
      if (k.t.id) await q(sb.from('quali_teilnahmen').update(row).eq('id', k.t.id));
      else { const ins = await q(sb.from('quali_teilnahmen').insert({ ...row, azubi_id: id, betrieb_id: orgBetrieb(), massnahme: '', module: [], pruefung: {} }).select().single()); (S.quali.rows ||= []).push(ins); }
      Object.assign(k.t, row); closeSheet(); toast('Gespeichert'); render();
    } catch (er) { toast(errText(er)); }
  };
}
async function q10MeldPdf() {
  const ppl = q10MeldPeople(); if (!ppl.length) throw new Error('Niemand in dieser Auswahl.');
  const P = await qPdfStart(false), { doc, FONT, W, M } = P, bk = (await q9Briefkopf() || S.hotel || '').split('\n').filter(Boolean);
  const mName = new Date(S.org.ktM + '-01T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const groups = {}; ppl.forEach(p => { (groups[ktOf(p.id).name || 'Ohne Kostenträger'] ||= []).push(p); });
  let first = true;
  Object.entries(groups).forEach(([kt, list]) => {
    if (!first) doc.addPage(); first = false;
    doc.setFont(FONT, 'normal'); doc.setFontSize(9); doc.setTextColor(90); bk.forEach((l, i) => doc.text(pdfSafe(l), W - M, 14 + i * 4.3, { align: 'right' })); doc.setTextColor(0);
    let y = 40; doc.setFont(FONT, 'bold'); doc.setFontSize(17); doc.text('Teilnahme- und Fehlzeitenmeldung', M, y); y += 8;
    doc.setFontSize(11); doc.setFont(FONT, 'normal'); doc.text(pdfSafe(`An: ${kt}   ·   Monat: ${mName}`), M, y); y += 9;
    const cx = [M, M + 62, M + 102, M + 118, M + 134, M + 152, M + 168];
    doc.setFont(FONT, 'bold'); doc.setFontSize(8.5); ['Name', 'Kunden-/BG-Nr.', 'Tage', 'anwes.', 'entsch.', 'unent.', 'Quote'].forEach((h, i) => doc.text(h, cx[i], y)); y += 2; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 4.5;
    doc.setFont(FONT, 'normal'); doc.setFontSize(9);
    list.forEach(p => { if (y > 270) { doc.addPage(); y = 18; } const s = q10Stat(p.id), k = ktOf(p.id);
      doc.text(pdfSafe(p.full_name).slice(0, 34), cx[0], y); doc.text(pdfSafe(k.nr || '–').slice(0, 22), cx[1], y);
      [s.tage, s.an + s.vs, s.en, s.un, s.quote == null ? '–' : s.quote + ' %'].forEach((v, i) => doc.text(String(v), cx[i + 2], y)); y += 5.4; });
    y += 4; doc.setFontSize(8.5); doc.setTextColor(100);
    doc.text(doc.splitTextToSize('Grundlage: Anwesenheitsliste der Maßnahme. Quote = anwesende (inkl. verspätete) Tage im Verhältnis zu den Unterrichtstagen ohne Urlaub und freie Tage. Gründe für Fehlzeiten und Gesundheitsdaten werden nicht übermittelt.', W - 2 * M), M, y); doc.setTextColor(0);
    list.forEach(p => {
      const s = q10Stat(p.id), fehl = s.rows.filter(a => ['entschuldigt', 'unentschuldigt', 'verspaetet'].includes(a.status)).sort((a, b) => a.datum.localeCompare(b.datum));
      if (!fehl.length) return;
      doc.addPage(); let y2 = 20; const k = ktOf(p.id), t = k.t, kat = qKat(t);
      doc.setFont(FONT, 'bold'); doc.setFontSize(13); doc.text(pdfSafe(p.full_name), M, y2); y2 += 6;
      doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(90); doc.text(pdfSafe(`${kat ? kat.kurz + ' · ' : ''}${k.nr ? 'Nr. ' + k.nr + ' · ' : ''}${mName}`), M, y2); doc.setTextColor(0); y2 += 8;
      doc.setFontSize(10); fehl.forEach(a => { if (y2 > 275) { doc.addPage(); y2 = 18; } doc.text(pdfSafe(`${orgWd(a.datum)}, ${fmtDate(a.datum)}`), M, y2); doc.text(pdfSafe(ANW[a.status][1] + (a.status === 'verspaetet' && a.minuten ? ` (${a.minuten} Min.)` : '')), M + 50, y2); y2 += 5.4; });
    });
  });
  const n = doc.getNumberOfPages(); doc.setPage(n);
  doc.setDrawColor(150); doc.line(M, 268, M + 70, 268); doc.line(W - M - 70, 268, W - M, 268); doc.setFontSize(8.5); doc.setTextColor(110); doc.text('Ort, Datum', M, 272.5); doc.text('Unterschrift und Stempel des Trägers', W - M - 70, 272.5); doc.setTextColor(0);
  P.foot('Teilnahme- und Fehlzeitenmeldung');
  return { doc, name: orgAscii(`Meldung_${S.org.ktM}${S.org.ktF && S.org.ktF !== '_' ? '_' + S.org.ktF : ''}`) + '.pdf' };
}

/* =====================================================================
   Qualifikationen der Trainer + Audit-Mappe (im Reiter Qualität)
   ===================================================================== */
const TD_ART = { ausbildereignung: 'Ausbildereignung (AEVO)', fachqualifikation: 'Fachqualifikation / Meister', paedagogik: 'Pädagogische Qualifikation', fortbildung: 'Fortbildung', sonstiges: 'Sonstiges' };
async function q10TdLoad() { try { S.org.td = await q(sb.from('quali_trainer_docs').select('*').order('created_at', { ascending: false })); } catch { S.org.td = []; } }
const q10AzLoad0 = q9AzavLoad, q10AzHTML0 = q9AzavHTML, q10AzBind0 = q9AzavBind;
q9AzavLoad = async function () { await Promise.all([q10AzLoad0(), q10TdLoad()]); };
q9AzavHTML = function () {
  const h = q10AzHTML0(); if (!q9Team()) return h;
  const today = localDate(), staff = orgStaff(), td = S.org.td || [];
  return `<div class="card p-4 mt-3" style="border-color:var(--accent)"><div class="flex items-center gap-3"><span class="ico flex-none" style="width:40px;height:40px">${svg('file', 'w-5 h-5')}</span><div class="flex-1"><div class="text-[16px] font-bold">Audit-Mappe</div><div class="text-[13px] text-muted">Alle Nachweise für das AZAV-Audit in einer ZIP-Datei.</div></div></div>
      <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="lbl" for="amV">Von</label><input id="amV" type="date" class="field" value="${S.org.amV || qAddDays(orgAddMonths(today, -12), 1)}"></div><div><label class="lbl" for="amB">Bis</label><input id="amB" type="date" class="field" value="${S.org.amB || today}"></div></div>
      <button class="btn w-full mt-3" id="amGo">Audit-Mappe erstellen</button>
      <p class="text-[12px] text-muted mt-2">Enthält: Teilnehmerliste, Anwesenheitslisten je Monat (PDF), Klassenbuch je Gruppe mit Abzeichnung, Qualitätsbericht (Feedback und Maßnahmen), Einsatznachweis der Trainer, Unterweisungsnachweise und die Qualifikationsnachweise der Trainer mit Dateien.</p>
      <div id="amProg" class="text-[13px] mt-2" hidden></div></div>
    ${h}
    ${secTitle('Qualifikationen der Trainer', '<button class="text-[13px] font-semibold text-accent" id="tdNew">+ Nachweis</button>')}
    <div class="card">${staff.map((p, i) => { const l = td.filter(d => d.trainer_id === p.id); return `<div class="p-3.5 ${i ? 'border-t border-line' : ''}"><div class="text-[14px] font-semibold">${esc(p.full_name)}</div>
      ${l.length ? l.map(d => `<button class="w-full flex items-center gap-2 mt-1.5 text-left" data-td="${d.id}"><span class="chip flex-none ${d.gueltig_bis && d.gueltig_bis < today ? 'crit' : d.gueltig_bis && d.gueltig_bis < qAddDays(today, 60) ? 'warn' : ''}">${esc(TD_ART[d.art] || d.art)}</span><span class="flex-1 min-w-0 truncate text-[13px]">${esc(d.titel)}</span><span class="text-[11px] text-muted flex-none">${d.gueltig_bis ? (d.gueltig_bis < today ? 'abgelaufen ' : 'bis ') + fmtDate(d.gueltig_bis) : d.ausgestellt ? fmtDate(d.ausgestellt) : ''}</span></button>`).join('') : '<div class="text-[12px] text-muted mt-1">Noch keine Nachweise.</div>'}</div>`; }).join('')}</div>
    <p class="text-[12px] text-muted mt-2">Trainer können ihre eigenen Nachweise unter Dienstplan › „Meine Nachweise“ hochladen. Abgelaufene Nachweise sind rot markiert.</p>`;
};
q9AzavBind = function () {
  q10AzBind0();
  $('#tdNew') && ($('#tdNew').onclick = () => q10TdSheet(null));
  $$('[data-td]').forEach(b => b.onclick = () => q10TdSheet((S.org.td || []).find(d => d.id === b.dataset.td)));
  $('#amGo') && ($('#amGo').onclick = async e => {
    const btn = e.currentTarget, v = $('#amV').value, b = $('#amB').value; if (!v || !b || b < v) return toast('Bitte einen gültigen Zeitraum wählen.');
    S.org.amV = v; S.org.amB = b; btn.disabled = true;
    const prog = $('#amProg'); prog.hidden = false; const say = t => { prog.textContent = t; };
    try { const blob = await q10AuditZip(v, b, say); q9Dl(blob, orgAscii(`Audit-Mappe_${S.hotel || 'Desk'}_${v}_bis_${b}`) + '.zip'); say('Fertig – die ZIP-Datei wurde heruntergeladen.'); toast('Audit-Mappe erstellt'); }
    catch (er) { say('Abgebrochen: ' + errText(er)); toast(errText(er)); } finally { btn.disabled = false; PDF_DE = false; }
  });
};
function q10TdSheet(d, forMe) {
  const staff = q9Team() ? orgStaff() : [S.me], tid = d?.trainer_id || (forMe ? S.me.id : staff[0]?.id);
  const mine = !d || d.trainer_id === S.me.id || q9Team();
  sheetShell(d ? 'Nachweis' : 'Nachweis hinzufügen', `<form id="tdF" class="card p-4 flex flex-col gap-3">
    ${staff.length > 1 ? `<div><label class="lbl" for="tdT">Trainer/in</label><select id="tdT" class="field" ${d ? 'disabled' : ''}>${staff.map(p => `<option value="${p.id}" ${p.id === tid ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></div>` : ''}
    <div><label class="lbl" for="tdA">Art</label><select id="tdA" class="field" ${mine ? '' : 'disabled'}>${Object.entries(TD_ART).map(([k, l]) => `<option value="${k}" ${(d?.art || 'fortbildung') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div><label class="lbl" for="tdN">Bezeichnung</label><input id="tdN" class="field" maxlength="160" value="${esc(d?.titel || '')}" placeholder="z. B. Elektrofachkraft, Ersthelfer, AdA-Schein"></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="tdV">Ausgestellt</label><input id="tdV" type="date" class="field" value="${d?.ausgestellt || ''}"></div><div><label class="lbl" for="tdB">Gültig bis</label><input id="tdB" type="date" class="field" value="${d?.gueltig_bis || ''}"></div></div>
    ${d?.datei ? '<button type="button" class="btn ghost" id="tdOpen">Datei öffnen</button>' : ''}
    ${mine ? `<div><label class="lbl" for="tdFile">${d?.datei ? 'Datei ersetzen' : 'Datei'} <span class="font-normal text-muted">(PDF oder Foto, bis 10 MB)</span></label><input id="tdFile" type="file" class="field" accept=".pdf,image/*"></div>
      <button class="btn" id="tdSave">Speichern</button>${d ? '<button type="button" class="btn ghost" id="tdDel">Löschen</button>' : ''}` : ''}</form>`);
  $('#tdOpen') && ($('#tdOpen').onclick = async () => { const w = window.open('', '_blank'); const { data, error } = await sb.storage.from('trainer').createSignedUrl(d.datei, 300); if (error || !data?.signedUrl) { w?.close(); return toast('Datei nicht erreichbar.'); } if (w) w.location.href = data.signedUrl; else location.href = data.signedUrl; });
  $('#tdF').onsubmit = async e => {
    e.preventDefault(); if (!mine) return;
    const trainer = d?.trainer_id || $('#tdT')?.value || S.me.id, f = $('#tdFile')?.files?.[0];
    const row = { art: $('#tdA').value, titel: $('#tdN').value.trim(), ausgestellt: $('#tdV').value || null, gueltig_bis: $('#tdB').value || null };
    if (!row.titel) return toast('Bitte eine Bezeichnung eintragen.');
    $('#tdSave').disabled = true;
    try {
      if (f) { if (f.size > 10 * 1048576) throw new Error('Die Datei ist größer als 10 MB.');
        const path = `${orgBetrieb()}/${trainer}/${q9Uuid()}-${q9Safe(f.name)}`, mime = f.type || 'application/pdf';
        const { error } = await sb.storage.from('trainer').upload(path, f, { contentType: mime, upsert: false }); if (error) throw new Error(/mime|type/i.test(error.message) ? 'Bitte ein PDF oder Foto hochladen.' : error.message);
        if (d?.datei) await sb.storage.from('trainer').remove([d.datei]).catch(() => {});
        Object.assign(row, { datei: path, mime, groesse: f.size }); }
      if (d) await q(sb.from('quali_trainer_docs').update(row).eq('id', d.id)); else await q(sb.from('quali_trainer_docs').insert({ ...row, betrieb_id: orgBetrieb(), trainer_id: trainer, created_by: S.me.id }));
      closeSheet(); toast('Gespeichert'); if (forMe) q10MyDocs(); else go(S.view);
    } catch (er) { toast(errText(er)); $('#tdSave').disabled = false; }
  };
  $('#tdDel') && ($('#tdDel').onclick = e => qConfirm(e.currentTarget, async () => { try { if (d.datei) await sb.storage.from('trainer').remove([d.datei]).catch(() => {}); await q(sb.from('quali_trainer_docs').delete().eq('id', d.id)); closeSheet(); if (forMe) q10MyDocs(); else go(S.view); } catch (er) { toast(errText(er)); } }));
}
/* Dienstplan: eigene Nachweise */
async function q10MyDocs() {
  let l = []; try { l = await q(sb.from('quali_trainer_docs').select('*').eq('trainer_id', S.me.id).order('created_at', { ascending: false })); } catch {}
  S.org.td = [...(S.org.td || []).filter(x => x.trainer_id !== S.me.id), ...l];
  const today = localDate();
  sheetShell('Meine Nachweise', `<p class="text-[13px] text-muted -mt-1 mb-3">Qualifikationen und Fortbildungen für Audits. Sehen kannst nur du und die Koordination.</p>
    <div class="card">${l.map((d, i) => `<button class="w-full flex items-center gap-2 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-tdm="${d.id}"><span class="chip flex-none ${d.gueltig_bis && d.gueltig_bis < today ? 'crit' : ''}">${esc(TD_ART[d.art])}</span><span class="flex-1 min-w-0 truncate text-[14px]">${esc(d.titel)}</span><span class="text-[11px] text-muted">${d.gueltig_bis ? 'bis ' + fmtDate(d.gueltig_bis) : ''}</span></button>`).join('') || '<div class="p-3.5 text-[13px] text-muted">Noch keine Nachweise.</div>'}</div>
    <button class="btn w-full mt-3" id="tdmNew">+ Nachweis hinzufügen</button>`);
  $('#tdmNew').onclick = () => q10TdSheet(null, true);
  $$('[data-tdm]').forEach(b => b.onclick = () => q10TdSheet(l.find(x => x.id === b.dataset.tdm), true));
}
const q10EinHTML0 = orgEinHTML, q10EinBind0 = orgEinBind;
orgEinHTML = function () { return q10EinHTML0().replace('<button class="btn ghost col-span-2" id="einXlsx">', '<button class="btn ghost col-span-2" id="einDocs">Meine Nachweise (Qualifikationen)</button><button class="btn ghost col-span-2" id="einXlsx">'); };
orgEinBind = function () { q10EinBind0(); $('#einDocs') && ($('#einDocs').onclick = () => q10MyDocs()); };

/* ---------- Audit-Mappe als ZIP ---------- */
async function q10AuditZip(v, b, say) {
  await loadScript('./vendor/jszip.min.js');
  const zip = new JSZip(), inhalt = [], add = (name, data, txt) => { zip.file(name, data); inhalt.push(`${name}${txt ? ' – ' + txt : ''}`); };
  const pdfBlob = r => r.doc.output('blob');
  // 1 Teilnehmerliste
  say('Teilnehmerliste …');
  const tn = qTnList().filter(canSchool);
  add('01_Teilnehmerliste.xlsx', await q9Xlsx(`Teilnehmende · Stand ${fmtDate(localDate())}`, ['Name', 'Maßnahme', 'Gruppe', 'Beginn', 'Ende', 'Status', 'Kostenträger', 'Module mit Zertifikat'],
    tn.map(p => { const t = qOf(p.id) || {}, k = qKat(t); return [p.full_name, k?.kurz || '', S.qgr?.tn?.[p.id] ? qGruppe(S.qgr.tn[p.id])?.name || '' : '', t.beginn ? fmtDate(t.beginn) : '', t.ende ? fmtDate(t.ende) : '', t.status || 'aktiv', t.kostentraeger || '', k ? qMods(t).filter(m => m.status === 'bestanden').length + ' von ' + k.module.length : '']; })), `${tn.length} Personen`);
  // 2 Anwesenheit je Monat
  const keep = { v: S.quali.anwVon, b: S.quali.anwBis, f: S.quali.anwFilter };
  for (let m = v.slice(0, 7) + '-01', i = 0; m <= b && i < 24; m = orgAddMonths(m, 1), i++) {
    const m1 = qAddDays(orgAddMonths(m, 1), -1); S.quali.anwVon = m < v ? v : m; S.quali.anwBis = m1 > b ? b : m1; S.quali.anwFilter = '';
    say(`Anwesenheit ${m.slice(0, 7)} …`);
    try { const r = await qAnwPdf(); if (r) add(`02_Anwesenheit/Anwesenheit_${m.slice(0, 7)}.pdf`, pdfBlob(r)); } catch {}
    PDF_DE = false;
  }
  Object.assign(S.quali, { anwVon: keep.v, anwBis: keep.b, anwFilter: keep.f });
  inhalt.push('02_Anwesenheit/ – Anwesenheitslisten je Monat');
  // 3 Klassenbuch je Gruppe
  say('Klassenbuch …');
  let kb = []; try { kb = await orgFetch('klassenbuch', 'datum', v, b, '*'); } catch {}
  const byG = {}; kb.forEach(e => { (byG[e.gruppe_id] ||= []).push(e); });
  for (const [gid, list] of Object.entries(byG)) {
    const rows = []; list.sort((x, y) => x.datum.localeCompare(y.datum)).forEach(e => kbSlots(e).filter(s => s.thema || s.methodik).forEach(s => rows.push([fmtDate(e.datum), s.h, s.thema, kbMethLabel(s.methodik), s.kapitel || '', s.notiz || '', e.unterrichtsart || '', e.dozent || S.profiles[e.trainer_id]?.full_name || '',
      e.trainer_ok_at ? fmtDate(e.trainer_ok_at.slice(0, 10)) + ' ' + (S.profiles[e.trainer_ok_von]?.full_name || '') : '', e.abgezeichnet_at ? fmtDate(e.abgezeichnet_at.slice(0, 10)) + ' ' + (S.profiles[e.abgezeichnet_von]?.full_name || '') : ''])));
    const gn = qGruppe(gid)?.name || 'Gruppe';
    add(`03_Klassenbuch/Klassenbuch_${orgAscii(gn)}.xlsx`, await q9Xlsx(`Klassenbuch ${gn} · ${fmtDate(v)} bis ${fmtDate(b)}`, ['Datum', 'Stunde', 'Thema / Stoff', 'Methodik', 'Kapitel', 'Notiz', 'Unterrichtsart', 'Trainer/Dozent', 'Abgezeichnet Trainer', 'Gegengezeichnet Koordination'], rows));
  }
  inhalt.push(`03_Klassenbuch/ – ${Object.keys(byG).length} Gruppen`);
  // 4 Qualitätsbericht
  say('Qualitätsbericht …');
  try { await q9AzavLoad(); add('04_Qualitaetsbericht.pdf', pdfBlob(await q9AzavPdf()), 'Teilnehmer-Feedback und Maßnahmen-Protokoll'); } catch {} PDF_DE = false;
  // 5 Einsatznachweis Trainer
  say('Einsatznachweis …');
  try { add('05_Einsatznachweis_Trainer.xlsx', await dpXlsx(v, b, true, true), 'Dienstplan je Monat und Zähler'); } catch {}
  // 6 Unterweisungen
  say('Unterweisungen …');
  try {
    const [uw, bs] = await Promise.all([q(sb.from('unterweisungen').select('id,titel')), q(sb.from('unterweisung_bestaetigungen').select('unterweisung_id,user_id,bestaetigt_at').gte('bestaetigt_at', v).lte('bestaetigt_at', b + 'T23:59:59'))]);
    const t = Object.fromEntries(uw.map(x => [x.id, x.titel]));
    add('06_Unterweisungen.xlsx', await q9Xlsx(`Unterweisungsnachweise ${fmtDate(v)} bis ${fmtDate(b)}`, ['Person', 'Unterweisung', 'Bestätigt am'], bs.sort((x, y) => x.bestaetigt_at.localeCompare(y.bestaetigt_at)).map(x => [S.profiles[x.user_id]?.full_name || '–', t[x.unterweisung_id] || '–', fmtDate(x.bestaetigt_at.slice(0, 10))])), `${bs.length} Bestätigungen`);
  } catch {}
  // 7 Qualifikationen der Trainer
  say('Qualifikationsnachweise …');
  await q10TdLoad(); const td = S.org.td || [];
  add('07_Qualifikationen_Trainer/Uebersicht.xlsx', await q9Xlsx('Qualifikationen der Trainer', ['Trainer/in', 'Art', 'Bezeichnung', 'Ausgestellt', 'Gültig bis', 'Datei'], td.map(d => [S.profiles[d.trainer_id]?.full_name || '–', TD_ART[d.art] || d.art, d.titel, d.ausgestellt ? fmtDate(d.ausgestellt) : '', d.gueltig_bis ? fmtDate(d.gueltig_bis) : '', d.datei ? 'ja' : 'nein'])));
  for (const d of td.filter(x => x.datei)) {
    try { const { data } = await sb.storage.from('trainer').createSignedUrl(d.datei, 120); if (!data?.signedUrl) continue; const blob = await (await fetch(data.signedUrl)).blob();
      zip.file(`07_Qualifikationen_Trainer/${orgAscii(S.profiles[d.trainer_id]?.full_name || 'Trainer')}_${orgAscii(d.titel)}.${(d.datei.split('.').pop() || 'pdf').slice(0, 5)}`, blob); } catch {}
  }
  inhalt.push(`07_Qualifikationen_Trainer/ – ${td.length} Nachweise`);
  zip.file('00_Inhalt.txt', [`Audit-Mappe ${S.hotel || ''}`, `Zeitraum: ${fmtDate(v)} bis ${fmtDate(b)}`, `Erstellt am ${fmtDate(localDate())} von ${S.me.full_name} mit ${BR.appName || 'Desk'}`, '', 'Inhalt:', ...inhalt.map(x => '- ' + x), '',
    'Hinweis: Die Mappe enthält personenbezogene Daten. Bitte nur an Auditoren weitergeben und nach dem Audit löschen.'].join('\r\n'));
  say('ZIP wird gepackt …');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/* =====================================================================
   Anmeldeseite (öffentlich) – nutzt die Karriereseite der App
   ===================================================================== */
async function q10AnmLoad() {
  S.adm ||= {}; if (!q9Team()) return; await loadKarriere();
  if (!S.adm.kar.id && !S.adm.kar.text) Object.assign(S.adm.kar, { titel: 'Deine Qualifizierung bei uns', berufe: Object.values(Q_KATALOG).map(k => k.kurz), vorteile: ['Berufsabschluss Schritt für Schritt mit IHK-Zertifikaten', 'Praxis in der Lernwerkstatt und im Betrieb', 'Förderung z. B. über Bildungsgutschein möglich'] });
}
function q10AnmHTML() {
  if (!q9Team()) return empty('Die Anmeldeseite verwaltet die Koordination.');
  if (!S.betrieb?.slug) return empty('Für die Anmeldeseite fehlt die Adresse eures Standorts. Bitte NovaWorks kurz Bescheid geben.');
  let h = karriereHTML();
  try { const sg = siegelAdminHTML(); if (sg) h = h.replace(sg, ''); } catch {}
  const rep = [['Eure Karriereseite', 'Eure Anmeldeseite'], ['QR-Code für Aushang, Flyer oder Messe.', 'QR-Code für Aushang, Flyer, Jobcenter oder Infotag.'], ['>Bewerbungen<', '>Anmeldungen<'],
    ['Datenschutz: Bewerbungen und Unterlagen werden', 'Datenschutz: Anmeldungen und Unterlagen werden'], ['Noch keine Bewerbungen. Teile den Link oder hänge den QR-Code aus.', 'Noch keine Anmeldungen. Teile den Link oder hänge den QR-Code aus.'],
    ['Als Azubi einladen', 'Als Teilnehmer einladen'], ['Bewerbung löschen', 'Anmeldung löschen'], ['Ausbildungsberufe <span', 'Maßnahmen <span'], ['Was euch ausmacht', 'Was Teilnehmende erwartet'],
    ['z. B. bewerbung@hotel.de', 'z. B. anmeldung@traeger.de'], ['Datenschutzhinweis für Bewerber', 'Datenschutzhinweis für die Anmeldung'], ['Status der Bewerbung', 'Status der Anmeldung']];
  rep.forEach(([a, b]) => { h = h.split(a).join(b); });
  return `<p class="text-[13px] text-muted mt-3">Eine öffentliche Seite mit euren Maßnahmen und Online-Anmeldung. Interessierte melden sich dort an, ihr seht die Anmeldungen hier, könnt den Status setzen und bei Zusage direkt eine Einladung in Desk schicken.</p>${h}`;
}
function q10AnmBind() { if (q9Team() && $('#krCopy')) bindKarriere(); }

/* =====================================================================
   Anmeldung → Teilnehmer/in einladen (statt der Azubi-Einladung der Hauptapp)
   ===================================================================== */
const q10EinladungSheet0 = einladungSheet;
einladungSheet = async function (bew) {
  if (!isQuali()) return q10EinladungSheet0(bew);
  if (!bew) return;
  const code = S.adm?.code || await q(sb.rpc('get_invite_code')).catch(() => '');
  if (!S.qgr) await qGroupsLoad().catch(() => {});
  const gruppen = S.qgr?.g || [], keys = Object.keys(Q_KATALOG);
  const norm = s => String(s || '').toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
  const mk = keys.find(k => norm(Q_KATALOG[k].kurz) === norm(bew.beruf)) || keys.find(k => norm(bew.beruf) && (norm(Q_KATALOG[k].kurz).includes(norm(bew.beruf)) || norm(bew.beruf).includes(norm(Q_KATALOG[k].kurz)))) || '';
  sheetShell('Als Teilnehmer/in einladen', `<form id="eiF" class="card p-4 flex flex-col gap-3">
    <p class="text-[13px] text-muted">Bei der Registrierung mit dieser E-Mail-Adresse übernimmt Desk Maßnahme, Gruppe und Beginn.</p>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="eiN">Name</label><input id="eiN" class="field" maxlength="80" value="${esc(bew.name)}"></div><div><label class="lbl" for="eiM">E-Mail</label><input id="eiM" type="email" class="field" value="${esc(bew.email)}"></div></div>
    <div><label class="lbl" for="eiK">Maßnahme</label><select id="eiK" class="field"><option value="">noch offen</option>${keys.map(k => `<option value="${k}" ${k === mk ? 'selected' : ''}>${esc(Q_KATALOG[k].kurz)}</option>`).join('')}</select></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="eiG">Gruppe</label><select id="eiG" class="field"><option value="">später zuordnen</option>${gruppen.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div><div><label class="lbl" for="eiS">Beginn</label><input id="eiS" type="date" class="field"></div></div>
    <button class="btn">Einladung anlegen</button></form>`);
  $('#eiF').onsubmit = async e => {
    e.preventDefault();
    const k = $('#eiK').value, out = { betrieb_id: orgBetrieb(), email: $('#eiM').value.trim().toLowerCase(), full_name: $('#eiN').value.trim().slice(0, 80), beruf: k ? Q_KATALOG[k].beruf : null, massnahme: k || null, gruppe_id: $('#eiG').value || null, start_datum: $('#eiS').value || null, bewerbung_id: bew.id, created_by: S.me.id };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) return toast('Bitte eine gültige E-Mail-Adresse eingeben.');
    const { error } = await sb.from('einladungen').insert(out);
    if (error) return toast(/einladungen_offen|duplicate/i.test(error.message) ? 'Für diese E-Mail gibt es schon eine offene Einladung.' : errText(error));
    const link = `${location.origin}/desk/?start=register`, ort = S.hotel || 'uns';
    const mail = `mailto:${encodeURIComponent(out.email)}?subject=${encodeURIComponent('Dein Zugang zu Desk – ' + ort)}&body=${encodeURIComponent(`Hallo ${firstName(out.full_name)},\n\nschön, dass du bei uns startest${k ? ' (' + Q_KATALOG[k].kurz + ')' : ''}! Für Stundenplan, Anwesenheit, Lernmaterial und Tests nutzen wir Desk.\n\nSo meldest du dich an:\n1. Öffne ${link}\n2. Registriere dich mit dieser E-Mail-Adresse: ${out.email}\n3. Code des Lernstandorts: ${code}\n\nDeine Maßnahme und Gruppe sind schon hinterlegt.\n\nBis bald\n${S.me.full_name}\n${ort}`)}`;
    sheetShell('Einladung angelegt', `<div class="card p-4 flex flex-col gap-3"><p class="text-[14px]">Jetzt nur noch die Einladung schicken. ${esc(firstName(out.full_name))} registriert sich mit <b>${esc(out.email)}</b> und dem Code <b translate="no">${esc(code)}</b>.</p><a class="btn" href="${mail}">Per E-Mail einladen</a><button class="btn ghost" id="eiCopy">${svg('copy', 'w-4 h-4')} Code und Link kopieren</button></div>`);
    $('#eiCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${link}\nCode: ${code}`); toast('Kopiert'); } catch { toast(link); } };
  };
};
