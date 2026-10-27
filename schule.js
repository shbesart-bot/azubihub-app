/* AzubiHub · Berufsschule
   Abgleich Schule ↔ Wochenbericht, Fehltage mit Entschuldigung und Nachweis, Anwesenheit, Noten,
   Zeugnisse, Lernfelder (KMK-Rahmenlehrplan) mit Lernortkooperation, Nachrichten Schule ↔ Betrieb,
   Schulbericht als PDF. Wird vor dem Hauptskript geladen; alle Funktionen greifen erst beim Aufruf
   auf dessen Helfer (S, sb, esc, q, toast …) zu. */

const SCH_ART = { klassenarbeit: 'Klassenarbeit', test: 'Test', referat: 'Referat', muendlich: 'Mündlich', zeugnis: 'Zeugnisnote', sonstiges: 'Sonstiges' };
const SCH_STATUS = { offen: ['warn', 'noch ungeklärt'], entschuldigt: ['ok', 'entschuldigt'], unentschuldigt: ['crit', 'unentschuldigt'] };
const SCH_TYP = { fehltag: ['crit', 'Fehltag'], verspaetung: ['warn', 'Verspätung'], notiz: ['', 'Notiz'], lob: ['ok', 'Lob'], anwesend: ['ok', 'Anwesend'] };
const SCH_OFFTYPES = ['Berufsschule', 'Krank', 'Urlaub', 'Frei'];
const schNote = n => n == null || n === '' ? '' : (Math.round(+n * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
const schNoteTone = n => n >= 5 ? 'crit' : n >= 4 ? 'warn' : n <= 2 ? 'ok' : '';
const schAvg = list => list.length ? list.reduce((s, n) => s + +n.note, 0) / list.length : null;
const schSt = e => e.status || 'offen';
const schDay = d => new Date(String(d).slice(0, 10) + 'T12:00:00');

/* ---------- Lernfelder ---------- */
function schLernfelder(p) {
  const b = normB(p?.beruf), all = S.content.lf || [];
  const exact = all.filter(l => normB(l.beruf) === b);
  if (exact.length) return exact.slice().sort((x, y) => x.nr - y.nr);
  const first = b ? b.split('/')[0] : '';
  return first ? all.filter(l => normB(l.beruf).startsWith(first)).sort((x, y) => x.nr - y.nr) : [];
}
const schLfByNr = (p, nr) => schLernfelder(p).find(l => l.nr === +nr);
// Passende Positionen im Ausbildungsrahmenplan (Lernortkooperation): gleiche Stichworte oder Stichwort im Titel
function schLfMatch(lf, p) {
  const keys = (lf.stichworte || []).map(k => k.toLowerCase()).filter(k => k.length > 3);
  return rpPositions(p).filter(r => { const hay = [(r.titel || ''), ...(r.stichworte || [])].join(' ').toLowerCase(); return keys.some(k => hay.includes(k)); }).slice(0, 4);
}
// Wie oft kam ein Lernfeld in den Schultagen der Wochenberichte vor? (gewählt oder über Stichworte)
function schLfMentions(reps, p) {
  const lfs = schLernfelder(p), out = {};
  (reps || []).filter(r => r.status !== 'entwurf').forEach(r => (r.tage || []).filter(d => d.bereich === 'Berufsschule').forEach(d => (d.eintraege || []).forEach(e => {
    if (e.lf) { out[e.lf] = (out[e.lf] || 0) + 1; return; }
    const t = (e.text || '').toLowerCase();
    const m = t.match(/\blf\s*(\d{1,2})\b/); if (m && lfs.some(l => l.nr === +m[1])) { out[+m[1]] = (out[+m[1]] || 0) + 1; return; }
    lfs.forEach(l => { if ((l.stichworte || []).some(k => k.length > 3 && t.includes(k.toLowerCase()))) out[l.nr] = (out[l.nr] || 0) + 1; });
  })));
  return out;
}
function schLfStand(p, lfs) {
  const list = schLernfelder(p), by = Object.fromEntries((lfs || []).map(s => [s.lf_nr, s]));
  const years = [...new Set(list.map(l => l.lehrjahr))].sort();
  const ys = years.map(y => { const l = list.filter(x => x.lehrjahr === y), d = l.filter(x => by[x.nr]?.status === 'abgeschlossen').length; return { y, list: l, d, n: l.length, pc: l.length ? Math.round(d * 100 / l.length) : 0 }; });
  const done = list.filter(x => by[x.nr]?.status === 'abgeschlossen').length;
  return { list, by, ys, done, pc: list.length ? Math.round(done * 100 / list.length) : 0, laeuft: list.filter(x => by[x.nr]?.status === 'laeuft') };
}

/* ---------- Abgleich Schule ↔ Wochenbericht ---------- */
function schDayArea(reps, date) {
  const d = schDay(date), w = isoWeek(d), wd = (d.getDay() + 6) % 7;
  const r = (reps || []).find(x => x.jahr === w.jahr && x.kw === w.kw && x.status !== 'entwurf');
  return r ? { area: r.tage?.[wd]?.bereich || null, rep: r } : null;
}
function schAbgleich(reps, abs, eintraege, days = 56) {
  const today = localDate(), from = localDate(new Date(Date.now() - days * 864e5)), out = [];
  const schoolDays = new Set();
  (abs || []).filter(a => a.typ === 'Berufsschule' && (a.status || 'genehmigt') === 'genehmigt' && a.bis >= from && a.von < today).forEach(a => {
    for (let d = schDay(a.von < from ? from : a.von); localDate(d) <= a.bis && localDate(d) < today; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w && w < 6) schoolDays.add(localDate(d)); }
  });
  const meld = (eintraege || []).filter(e => e.datum >= from);
  schoolDays.forEach(d => {
    const x = schDayArea(reps, d); if (!x || !x.area) return;
    if (!SCH_OFFTYPES.includes(x.area)) out.push({ datum: d, tone: 'warn', text: `Schultag laut Stundenplan, im Wochenbericht steht „${x.area}“` });
  });
  meld.filter(e => e.typ === 'fehltag').forEach(e => {
    const x = schDayArea(reps, e.datum);
    if (x?.area === 'Berufsschule') out.push({ datum: e.datum, tone: 'crit', text: 'Schule meldet Fehltag, im Wochenbericht steht „Berufsschule“' });
  });
  meld.filter(e => e.typ === 'anwesend').forEach(e => {
    const x = schDayArea(reps, e.datum);
    if (x?.area === 'Krank') out.push({ datum: e.datum, tone: 'warn', text: 'Schule meldet anwesend, im Wochenbericht steht „Krank“' });
    else if (x?.area && !SCH_OFFTYPES.includes(x.area)) out.push({ datum: e.datum, tone: 'warn', text: `Schule meldet anwesend, im Wochenbericht steht „${x.area}“` });
  });
  const seen = new Set();
  return out.sort((a, b) => b.datum.localeCompare(a.datum) || (a.tone === 'crit' ? -1 : 1)).filter(x => !seen.has(x.datum) && seen.add(x.datum));
}

/* ---------- Laden ---------- */
async function schLoad(azubiId) {
  const staff = isAusbilder();
  const since = localDate(new Date(Date.now() - 400 * 864e5));
  const opt = p => p.then(r => r.error ? [] : (r.data || []), () => []);
  const [f, e, noten, zeug, lfs, msgs] = await Promise.all([
    q(sb.from('schul_freigaben').select('*').eq('azubi_id', azubiId).order('created_at', { ascending: false })),
    q(sb.from('schul_eintraege').select('*').eq('azubi_id', azubiId).gte('datum', since).order('datum', { ascending: false }).limit(300)),
    opt(sb.from('schul_noten').select('*').eq('azubi_id', azubiId).order('datum', { ascending: false })),
    opt(sb.from('schul_zeugnisse').select('*').eq('azubi_id', azubiId).order('datum', { ascending: false })),
    opt(sb.from('schul_lf_stand').select('*').eq('azubi_id', azubiId)),
    staff ? opt(sb.from('schul_nachrichten').select('*').eq('azubi_id', azubiId).order('created_at')) : Promise.resolve([])
  ]);
  S.school = { azubi: azubiId, f, e, noten, zeug, lfs, msgs };
}

/* ---------- Ansicht im Betrieb (Azubi selbst oder Ausbilder) ---------- */
function schHTML(a, manage) {
  const Sc = S.school; if (!Sc || Sc.azubi !== a.id) return '';
  const staff = manage, self = !manage && S.me?.id === a.id;
  const reps = staff ? S.rev.list.filter(r => r.user_id === a.id) : (S.rep.list || []);
  const abs = staff ? S.rev.abs.filter(x => x.user_id === a.id) : (S.rep.abs || []);
  const active = Sc.f.filter(f => !f.widerrufen && f.gueltig_bis >= localDate());
  const meld = Sc.e.filter(e => e.typ !== 'anwesend');
  const anw = Sc.e.filter(e => e.typ === 'anwesend' && e.datum >= localDate(new Date(Date.now() - 30 * 864e5))).length;
  const fehl30 = Sc.e.filter(e => e.typ === 'fehltag' && e.datum >= localDate(new Date(Date.now() - 30 * 864e5))).length;
  const offen = Sc.e.filter(e => e.typ === 'fehltag' && schSt(e) === 'offen');
  const abg = schAbgleich(reps, abs, Sc.e);
  const lfS = schLfStand(a, Sc.lfs), ment = schLfMentions(reps, a);
  const noten = Sc.noten || [], avg = schAvg(noten);
  const col = (pc, y, cur) => pc >= 100 ? 'var(--st-ok)' : y < cur ? 'var(--st-crit)' : y === cur ? 'var(--st-warn)' : 'var(--muted)';
  const cur = Math.min(Math.max(a.lehrjahr || 1, lfS.ys[0]?.y || 1), lfS.ys[lfS.ys.length - 1]?.y || 1);
  const lfSel = S.schLfYear?.[a.id] && lfS.ys.some(x => x.y === S.schLfYear[a.id]) ? S.schLfYear[a.id] : cur;
  const canLf = staff || self;
  const lfRow = l => { const s = lfS.by[l.nr], st = s?.status; const m = ment[l.nr] || 0;
    return `<div class="rpitem py-2.5 flex items-start gap-3"><div class="flex-1 min-w-0"><div class="text-[14px]"><span class="text-muted tnum">LF ${l.nr}</span> ${esc(l.titel)}</div>
      <div class="text-[12px] text-muted mt-0.5 tnum">${l.stunden ? l.stunden + ' Std · ' : ''}${m ? `${m}× im Berichtsheft` : 'noch nicht im Berichtsheft'}${s?.note ? ` · Note ${schNote(s.note)}` : ''}${s?.von ? ` · ${esc(s.von)}` : ''}</div></div>
      ${canLf ? `<button class="chip ${st === 'abgeschlossen' ? 'ok' : st === 'laeuft' ? 'warn' : ''} flex-none" data-schlf="${l.nr}" title="Antippen: offen → läuft → abgeschlossen">${st === 'abgeschlossen' ? '✓ abgeschlossen' : st === 'laeuft' ? 'läuft' : 'offen'}</button>`
        : `<span class="chip ${st === 'abgeschlossen' ? 'ok' : st === 'laeuft' ? 'warn' : ''} flex-none">${st === 'abgeschlossen' ? '✓ abgeschlossen' : st === 'laeuft' ? 'läuft' : 'offen'}</span>`}</div>`; };
  const ysel = lfS.ys.find(x => x.y === lfSel);
  return `${secTitle('Berufsschule', manage ? '<button id="scNew" class="text-[13px] font-semibold text-accent">+ Zugang für Lehrkraft</button>' : '')}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div class="card p-3"><div class="text-[11px] text-muted font-semibold">Fehltage (30 Tage)</div><div class="text-[22px] font-bold tnum" style="color:${fehl30 ? 'var(--st-crit)' : 'var(--st-ok)'}">${fehl30}</div><div class="text-[11px] text-muted">${anw ? anw + '× anwesend gemeldet' : 'Anwesenheit nicht gemeldet'}</div></div>
      <div class="card p-3"><div class="text-[11px] text-muted font-semibold">Ungeklärt</div><div class="text-[22px] font-bold tnum" style="color:${offen.length ? 'var(--st-warn)' : 'var(--st-ok)'}">${offen.length}</div><div class="text-[11px] text-muted">Fehltage ohne Entscheidung</div></div>
      <div class="card p-3"><div class="text-[11px] text-muted font-semibold">Notenschnitt</div><div class="text-[22px] font-bold tnum" style="color:${avg == null ? 'var(--muted)' : avg >= 4 ? 'var(--st-crit)' : avg >= 3.5 ? 'var(--st-warn)' : 'var(--st-ok)'}">${avg == null ? '–' : schNote(avg)}</div><div class="text-[11px] text-muted">${noten.length} Note${noten.length === 1 ? '' : 'n'}</div></div>
      <div class="card p-3"><div class="text-[11px] text-muted font-semibold">Lernfelder</div><div class="text-[22px] font-bold tnum">${lfS.list.length ? lfS.pc + ' %' : '–'}</div><div class="text-[11px] text-muted">${lfS.done} von ${lfS.list.length} abgeschlossen</div></div>
    </div>

    ${abg.length ? `<div class="card p-4 mt-3" style="border-color:var(--warn)"><div class="flex items-center gap-2"><span class="chip warn">${abg.length}</span><div class="text-[15px] font-bold">Abgleich Schule ↔ Wochenbericht</div></div>
      <p class="text-[12px] text-muted mt-1">Letzte 8 Wochen. Stimmt etwas nicht überein, bitte kurz klären und den Bericht oder die Abwesenheit korrigieren.</p>
      <div class="flex flex-col mt-2">${abg.slice(0, 12).map(x => `<div class="rpitem py-2 flex gap-3 text-[13px]"><span class="tnum font-semibold flex-none w-[84px]">${fmtDate(x.datum)}</span><span style="color:var(--${x.tone})">${esc(x.text)}</span></div>`).join('')}</div></div>` : ''}

    <div class="card p-4 mt-3 flex flex-col gap-3">
      ${active.length ? active.map(f => `<div class="flex items-center gap-3"><span class="ico" style="width:34px;height:34px">${svg('book', 'w-4 h-4')}</span><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(f.schule)}${f.lehrkraft ? ' · ' + esc(f.lehrkraft) : ''}</div><div class="text-[12px] text-muted">Zugang bis ${fmtDate(f.gueltig_bis)} · ${f.last_access ? 'zuletzt geöffnet ' + when(f.last_access) : 'noch nicht geöffnet'}</div></div>${manage ? `<button class="btn ghost py-1.5 px-3 text-[13px]" data-scshow="${f.id}">Link</button>` : ''}</div>`).join('')
        : `<p class="text-[14px] text-muted">${manage ? 'Noch kein Zugang. Die Lehrkraft sieht damit Berichtsheft und Fehlzeiten (nur lesen), meldet Anwesenheit, Fehltage und Noten und kann Ihnen schreiben – ohne Konto.' : 'Deine Berufsschule hat keinen Zugang zu deinem Berichtsheft.'}</p>`}
      ${!manage && active.length ? '<p class="text-[12px] text-muted">Die Schule sieht deine eingereichten Wochenberichte, Fehlzeiten und den Stand der Lernfelder, aber keine Nachrichten, Gespräche oder Lernziele.</p>' : ''}
      <label class="btn ghost py-2 text-[13px] cursor-pointer">${svg('copy', 'w-4 h-4')} Stundenplan importieren (.ics)<input type="file" accept=".ics,text/calendar" id="scIcs" hidden></label>
      <p class="text-[12px] text-muted -mt-1">Kalender-Datei aus WebUntis oder vom Schul-Kalender. Schultage werden als „Berufsschule“ eingetragen, im Wochenbericht vorbelegt und mit den Meldungen der Schule abgeglichen.</p>
    </div>

    ${meld.length ? `<h3 class="text-[15px] font-bold mt-5 mb-2">Meldungen der Schule</h3><div class="card">${meld.slice(0, 30).map((e, i) => {
      const t = SCH_TYP[e.typ] || ['', e.typ], st = e.typ === 'fehltag' ? SCH_STATUS[schSt(e)] : null;
      return `<div class="p-3.5 ${i ? 'border-t border-line' : ''}"><div class="flex items-center gap-2 flex-wrap"><span class="chip ${t[0]}">${t[1]}</span><span class="text-[13px] font-semibold tnum">${fmtDate(e.datum)}</span>${st ? `<span class="chip ${st[0]}">${st[1]}</span>` : ''}${e.nachweis ? '<span class="chip accent">Nachweis da</span>' : ''}<span class="text-[12px] text-muted ms-auto truncate">${esc(e.von || 'Berufsschule')}</span></div>
        ${e.text ? `<p class="text-[14px] mt-1 whitespace-pre-line">${esc(e.text)}</p>` : ''}
        ${e.typ === 'fehltag' ? `<div class="flex flex-wrap gap-2 mt-2">
          ${e.nachweis ? `<button class="btn ghost py-1.5 px-3 text-[13px]" data-schfile="${esc(e.nachweis)}">Nachweis ansehen</button>` : (staff || self) && e.status !== 'unentschuldigt' ? `<label class="btn ghost py-1.5 px-3 text-[13px] cursor-pointer">Nachweis hochladen<input type="file" accept="application/pdf,image/*" data-schnw="${e.id}" hidden></label>` : ''}
          ${staff ? `${e.status !== 'entschuldigt' ? `<button class="btn ok py-1.5 px-3 text-[13px]" data-schent="${e.id}" data-v="entschuldigt">Entschuldigt</button>` : ''}${e.status !== 'unentschuldigt' ? `<button class="btn danger py-1.5 px-3 text-[13px]" data-schent="${e.id}" data-v="unentschuldigt">Unentschuldigt</button>` : ''}` : ''}
          ${staff && e.freigabe_id ? `<button class="btn ghost py-1.5 px-3 text-[13px]" data-schreply="${e.id}">Antworten</button>` : ''}
        </div>${self && schSt(e) === 'offen' && !e.nachweis ? '<p class="text-[12px] mt-1" style="color:var(--warn)">Bitte lade deine Krankmeldung oder einen anderen Nachweis hoch.</p>' : ''}` : staff && e.freigabe_id ? `<button class="text-[13px] font-semibold text-accent mt-1" data-schreply="${e.id}">Antworten</button>` : ''}
      </div>`; }).join('')}</div>` : ''}

    ${staff ? `<h3 class="text-[15px] font-bold mt-5 mb-2">Nachrichten mit der Schule</h3>
      <div class="card p-4 flex flex-col gap-3">
        ${(Sc.msgs || []).length ? `<div class="flex flex-col gap-2">${Sc.msgs.slice(-20).map(m => `<div class="p-3 rounded-xl text-[14px] " style="${m.richtung === 'betrieb' ? 'margin-inline-start:2rem;background:var(--accent-soft)' : 'margin-inline-end:2rem;background:var(--sunk)'}"><div class="text-[11px] text-muted mb-0.5">${esc(m.richtung === 'betrieb' ? (nameOf(m.user_id) || 'Betrieb') : (m.von || 'Berufsschule'))} · ${when(m.created_at)}</div><div class="whitespace-pre-line">${esc(m.text)}</div></div>`).join('')}</div>` : '<p class="text-[13px] text-muted">Noch keine Nachrichten. Die Lehrkraft schreibt über ihren Link, Ihre Antwort bekommt sie per E-Mail (wenn hinterlegt) und im Portal.</p>'}
        ${active.length ? `<form id="schMsgForm" class="flex flex-col gap-2">${active.length > 1 ? `<select id="schMsgF" class="field" aria-label="An welche Lehrkraft">${active.map(f => `<option value="${f.id}">${esc(f.schule)}${f.lehrkraft ? ' · ' + esc(f.lehrkraft) : ''}</option>`).join('')}</select>` : ''}
          <label class="sr-only" for="schMsgText">Nachricht an die Schule</label><textarea id="schMsgText" class="field" rows="2" maxlength="2000" placeholder="Nachricht an ${esc(active[0].lehrkraft || active[0].schule)}"></textarea><button class="btn">Senden</button></form>` : ''}
      </div>` : ''}

    <h3 class="text-[15px] font-bold mt-5 mb-2 flex items-center justify-between">Noten ${staff || self ? '<button id="schNoteNew" class="text-[13px] font-semibold text-accent">+ Note</button>' : ''}</h3>
    ${noten.length ? `<div class="card">${noten.slice(0, 25).map((n, i) => `<div class="p-3 flex items-center gap-3 ${i ? 'border-t border-line' : ''}"><span class="chip ${schNoteTone(+n.note)} tnum flex-none" style="min-width:44px;justify-content:center;font-size:15px;font-weight:700">${schNote(n.note)}</span>
      <div class="flex-1 min-w-0"><div class="text-[14px] truncate">${n.lf_nr ? `<span class="text-muted tnum">LF ${n.lf_nr}</span> ` : ''}${esc(n.titel || n.fach || SCH_ART[n.art] || '')}</div><div class="text-[12px] text-muted truncate">${fmtDate(n.datum)} · ${SCH_ART[n.art] || ''}${n.fach && n.titel ? ' · ' + esc(n.fach) : ''} · ${n.quelle === 'schule' ? 'von der Schule' + (n.von ? ' (' + esc(n.von) + ')' : '') : n.quelle === 'azubi' ? 'vom Azubi eingetragen' : 'vom Betrieb eingetragen'}</div></div>
      ${(n.created_by && n.created_by === S.me.id) || staff ? `<button class="xbtn" data-schnotedel="${n.id}" aria-label="Note löschen">${svg('x', 'w-4 h-4')}</button>` : ''}</div>`).join('')}</div>` : empty(self ? 'Trag deine Noten ein, dann siehst du deinen Schnitt – und dein Betrieb kann dich rechtzeitig unterstützen.' : 'Noch keine Noten. Die Schule kann Noten über ihren Link eintragen.')}

    <h3 class="text-[15px] font-bold mt-5 mb-2 flex items-center justify-between">Zeugnisse ${staff || self ? '<button id="schZeugNew" class="text-[13px] font-semibold text-accent">+ Hochladen</button>' : ''}</h3>
    ${(Sc.zeug || []).length ? `<div class="card">${Sc.zeug.map((z, i) => `<div class="p-3 flex items-center gap-3 ${i ? 'border-t border-line' : ''}"><span class="ico" style="width:34px;height:34px">${svg('book', 'w-4 h-4')}</span><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(z.titel)}</div><div class="text-[12px] text-muted">${fmtDate(z.datum)} · ${z.kenntnis_at ? `zur Kenntnis genommen von ${esc(nameOf(z.kenntnis_von))} am ${fmtDate(z.kenntnis_at)}` : 'noch nicht zur Kenntnis genommen'}</div></div>
      <button class="btn ghost py-1.5 px-3 text-[13px]" data-schfile="${esc(z.datei)}">Öffnen</button>${staff && !z.kenntnis_at ? `<button class="btn ok py-1.5 px-3 text-[13px]" data-schkennt="${z.id}">Gesehen</button>` : ''}</div>`).join('')}</div>` : empty('Noch kein Zeugnis hochgeladen. Halbjahres- und Jahreszeugnisse als PDF oder Foto ablegen – der Betrieb bestätigt mit einem Klick.')}

    ${lfS.list.length ? `<h3 class="text-[15px] font-bold mt-5 mb-2">Lernfelder der Berufsschule</h3>
    ${lfS.laeuft.length ? `<div class="card p-4 mb-2" style="border-color:var(--accent)"><div class="eyebrow">Gerade in der Schule</div>${lfS.laeuft.map(l => { const m = schLfMatch(l, a);
      return `<div class="mt-2"><div class="text-[15px] font-bold">LF ${l.nr} · ${esc(l.titel)}</div>${m.length ? `<div class="text-[13px] mt-1"><span class="text-muted">Passt im Betrieb zu:</span> ${m.map(r => `<span class="chip tnum" title="${esc(r.titel)}">${esc(r.nr)} ${esc(rpShort(r.titel))}</span>`).join(' ')}</div>${staff ? '<p class="text-[12px] text-muted mt-1">Tipp: Plane jetzt eine passende Station oder Aufgabe ein – so festigt sich, was in der Schule läuft.</p>' : ''}` : ''}</div>`; }).join('')}</div>` : ''}
    <div class="grid gap-2" style="grid-template-columns:repeat(${lfS.ys.length},minmax(0,1fr))">${lfS.ys.map(x => { const c = col(x.pc, x.y, cur);
      return `<button type="button" class="card p-3 text-left" data-schlfy="${x.y}" aria-pressed="${x.y === lfSel}" style="${x.y === lfSel ? 'outline:2px solid var(--accent);outline-offset:-1px' : ''}"><div class="text-[12px] text-muted font-semibold">${x.y}. Ausbildungsjahr${x.y === cur ? ' · aktuell' : ''}</div><div class="text-[22px] font-bold tnum leading-tight mt-0.5" style="color:${c}">${x.pc} %</div><div class="stbar mini mt-1.5"><i style="width:${x.pc}%;background:${c}"></i></div><div class="text-[11px] text-muted tnum mt-1">${x.d} von ${x.n}</div></button>`; }).join('')}</div>
    ${ysel ? `<div class="card p-4 mt-3"><div class="flex flex-col">${ysel.list.map(lfRow).join('')}</div></div>` : ''}
    <p class="text-[12px] text-muted mt-2">Lernfelder nach dem KMK-Rahmenlehrplan. Den Stand setzt die Lehrkraft über ihren Link${canLf ? ' oder du hier per Antippen' : ''}. „Im Berichtsheft“ zählt Schultage, an denen das Lernfeld gewählt oder an Stichworten erkannt wurde.</p>` : ''}`;
}

function schBind(a, onDone) {
  const Sc = S.school; if (!Sc || Sc.azubi !== a.id) return;
  const reload = async () => { const y = scrollY; await schLoad(a.id).catch(() => {}); render(); scrollTo(0, y); };
  if ($('#scNew')) $('#scNew').onclick = () => openSchoolSheet(a, null, onDone);
  $$('[data-scshow]').forEach(b => b.onclick = () => openSchoolSheet(a, Sc.f.find(f => f.id === b.dataset.scshow), onDone));
  if ($('#scIcs')) $('#scIcs').onchange = async e => { const f = e.target.files?.[0]; if (f) { await importIcs(f, a.id); onDone(); } };
  $$('[data-schfile]').forEach(b => b.onclick = () => schOpenFile(b.dataset.schfile));
  $$('[data-schnw]').forEach(inp => inp.onchange = async () => {
    const f = inp.files?.[0]; if (!f) return;
    const path = await schUpload(a.id, f); if (!path) return;
    await q(sb.rpc('schul_nachweis', { p_id: inp.dataset.schnw, p_path: path }));
    toast('Nachweis hochgeladen'); reload();
  });
  $$('[data-schent]').forEach(b => b.onclick = async () => {
    await q(sb.from('schul_eintraege').update({ status: b.dataset.v, entschieden_von: S.me.id, entschieden_at: new Date().toISOString() }).eq('id', b.dataset.schent));
    toast(b.dataset.v === 'entschuldigt' ? 'Als entschuldigt markiert' : 'Als unentschuldigt markiert'); reload();
  });
  $$('[data-schreply]').forEach(b => b.onclick = () => {
    const e = Sc.e.find(x => x.id === b.dataset.schreply); if (!e) return;
    sheetShell('Antwort an die Schule', `<form id="schRepForm" class="card p-4 flex flex-col gap-3">
      <div class="text-[13px] text-muted">${(SCH_TYP[e.typ] || ['', e.typ])[1]} vom ${fmtDate(e.datum)}${e.text ? ': „' + esc(e.text.slice(0, 120)) + '“' : ''}</div>
      <div><label class="lbl" for="schRepText">Ihre Antwort</label><textarea id="schRepText" class="field" rows="4" maxlength="1900" placeholder="z. B. Danke für den Hinweis, wir haben mit ${esc(firstName(a.full_name))} gesprochen."></textarea></div>
      <button class="btn">Senden</button><p class="text-[12px] text-muted">Die Lehrkraft sieht die Antwort in ihrem Portal${Sc.f.find(f => f.id === e.freigabe_id)?.email ? ' und bekommt sie per E-Mail' : ''}.</p></form>`);
    $('#schRepForm').onsubmit = async ev => {
      ev.preventDefault(); const t = $('#schRepText').value.trim(); if (!t) return toast('Bitte eine Antwort schreiben.');
      await q(sb.from('schul_nachrichten').insert({ betrieb_id: S.betrieb?.id || a.betrieb_id, azubi_id: a.id, freigabe_id: e.freigabe_id, eintrag_id: e.id, richtung: 'betrieb', user_id: S.me.id, von: S.me.full_name, text: `Zu ${(SCH_TYP[e.typ] || ['', 'Meldung'])[1]} vom ${fmtDate(e.datum)}: ${t}` }));
      closeSheet(); toast('Antwort gesendet'); reload();
    };
  });
  if ($('#schMsgForm')) $('#schMsgForm').onsubmit = async ev => {
    ev.preventDefault(); const t = $('#schMsgText').value.trim(); if (!t) return;
    const fid = $('#schMsgF')?.value || Sc.f.find(f => !f.widerrufen && f.gueltig_bis >= localDate())?.id;
    await q(sb.from('schul_nachrichten').insert({ betrieb_id: S.betrieb?.id || a.betrieb_id, azubi_id: a.id, freigabe_id: fid, richtung: 'betrieb', user_id: S.me.id, von: S.me.full_name, text: t }));
    toast('Nachricht gesendet'); reload();
  };
  if ($('#schNoteNew')) $('#schNoteNew').onclick = () => schNoteSheet(a, reload);
  $$('[data-schnotedel]').forEach(b => b.onclick = () => confirmInline(b, async () => { await q(sb.from('schul_noten').delete().eq('id', b.dataset.schnotedel)); toast('Note gelöscht'); reload(); }));
  if ($('#schZeugNew')) $('#schZeugNew').onclick = () => schZeugSheet(a, reload);
  $$('[data-schkennt]').forEach(b => b.onclick = async () => { await q(sb.from('schul_zeugnisse').update({ kenntnis_von: S.me.id, kenntnis_at: new Date().toISOString() }).eq('id', b.dataset.schkennt)); toast('Zur Kenntnis genommen'); reload(); });
  $$('[data-schlfy]').forEach(b => b.onclick = () => { S.schLfYear = S.schLfYear || {}; S.schLfYear[a.id] = +b.dataset.schlfy; const y = scrollY; render(); scrollTo(0, y); });
  $$('[data-schlf]').forEach(b => b.onclick = async () => {
    const nr = +b.dataset.schlf, cur = (Sc.lfs || []).find(s => s.lf_nr === nr);
    const next = !cur ? 'laeuft' : cur.status === 'laeuft' ? 'abgeschlossen' : null;
    b.disabled = true;
    if (!next) await q(sb.from('schul_lf_stand').delete().eq('id', cur.id));
    else if (cur) await q(sb.from('schul_lf_stand').update({ status: next, seit: localDate(), von: S.me.full_name, updated_at: new Date().toISOString() }).eq('id', cur.id));
    else await q(sb.from('schul_lf_stand').insert({ azubi_id: a.id, lf_nr: nr, status: next, von: S.me.full_name }));
    reload();
  });
}

function schNoteSheet(a, done) {
  const lfs = schLernfelder(a), self = S.me.id === a.id;
  sheetShell('Note eintragen', `<form id="schNoteForm" class="card p-4 flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="snNote">Note</label><input id="snNote" class="field tnum" inputmode="decimal" placeholder="z. B. 2,3" maxlength="3" required></div>
      <div><label class="lbl" for="snDat">Datum</label><input id="snDat" type="date" class="field" value="${localDate()}"></div></div>
    <div><label class="lbl" for="snArt">Art</label><select id="snArt" class="field">${Object.entries(SCH_ART).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    ${lfs.length ? `<div><label class="lbl" for="snLf">Lernfeld <span class="font-normal text-muted">(optional)</span></label><select id="snLf" class="field"><option value="">– kein Lernfeld –</option>${lfs.map(l => `<option value="${l.nr}">LF ${l.nr} · ${esc(l.titel)}</option>`).join('')}</select></div>` : ''}
    <div><label class="lbl" for="snFach">Fach <span class="font-normal text-muted">(optional, z. B. Deutsch, WiSo)</span></label><input id="snFach" class="field" maxlength="80"></div>
    <div><label class="lbl" for="snTitel">Thema <span class="font-normal text-muted">(optional)</span></label><input id="snTitel" class="field" maxlength="160" placeholder="z. B. Klassenarbeit Check-in und Meldeschein"></div>
    <button class="btn">Speichern</button>
    ${self ? '<p class="text-[12px] text-muted">Deine Ausbilderin oder dein Ausbilder sieht die Note. Ab einer 4 bekommt der Betrieb einen Hinweis, damit er dich unterstützen kann.</p>' : ''}
  </form>`);
  $('#schNoteForm').onsubmit = async e => {
    e.preventDefault();
    const n = parseFloat($('#snNote').value.replace(',', '.'));
    if (!(n >= 1 && n <= 6)) return toast('Bitte eine Note zwischen 1 und 6 eingeben.');
    await q(sb.from('schul_noten').insert({ azubi_id: a.id, note: Math.round(n * 10) / 10, datum: $('#snDat').value || localDate(), art: $('#snArt').value, lf_nr: $('#snLf')?.value ? +$('#snLf').value : null,
      fach: $('#snFach').value.trim() || null, titel: $('#snTitel').value.trim() || null, quelle: self ? 'azubi' : 'betrieb', von: S.me.full_name }));
    closeSheet(); toast('Note gespeichert'); done();
  };
}
function schZeugSheet(a, done) {
  sheetShell('Zeugnis hochladen', `<form id="schZForm" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="szTitel">Bezeichnung</label><input id="szTitel" class="field" maxlength="160" value="Halbjahreszeugnis ${a.lehrjahr || 1}. Ausbildungsjahr"></div>
    <div><label class="lbl" for="szDat">Datum</label><input id="szDat" type="date" class="field" value="${localDate()}"></div>
    <div><label class="lbl" for="szFile">Datei (PDF oder Foto, max. 10 MB)</label><input id="szFile" type="file" class="field" accept="application/pdf,image/*" required></div>
    <button class="btn">Hochladen</button>
  </form>`);
  $('#schZForm').onsubmit = async e => {
    e.preventDefault();
    const f = $('#szFile').files?.[0]; if (!f) return toast('Bitte eine Datei auswählen.');
    const btn = $('#schZForm button.btn'); btn.disabled = true;
    try {
      const path = await schUpload(a.id, f); if (!path) return;
      await q(sb.from('schul_zeugnisse').insert({ azubi_id: a.id, titel: $('#szTitel').value.trim() || 'Zeugnis', datum: $('#szDat').value || localDate(), datei: path }));
      closeSheet(); toast('Zeugnis gespeichert'); done();
    } finally { if (btn.isConnected) btn.disabled = false; }
  };
}
async function schUpload(azubiId, file) {
  let blob = file, type = file.type || 'application/octet-stream', ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/^image\//.test(type) && (file.size > 2.5e6 || !/jpe?g|png|webp/.test(type))) { blob = await compressImage(file, 2000, .85); type = 'image/jpeg'; ext = 'jpg'; }
  if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(type)) { toast('Bitte eine PDF-Datei oder ein Foto wählen.'); return null; }
  if (blob.size > 10 * 1024 * 1024) { toast('Die Datei ist größer als 10 MB.'); return null; }
  const path = `${azubiId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await sb.storage.from('schule').upload(path, blob, { contentType: type, upsert: false });
  if (error) { toast('Hochladen hat nicht geklappt: ' + errText(error)); return null; }
  return path;
}
async function schOpenFile(path) {
  const w = window.open('', '_blank');
  const { data, error } = await sb.storage.from('schule').createSignedUrl(path, 120);
  if (error || !data?.signedUrl) { w?.close(); return toast(S.demo ? 'In der Demo gibt es keine echten Dateien.' : 'Die Datei konnte nicht geöffnet werden.'); }
  if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
}

/* ---------- Ampel (Startseite) ---------- */
// Daten werden in homeExtras geladen: H.schE (Meldungen 120 Tage), H.schN (Noten 180 Tage), H.schAbs (Schultage 60 Tage)
function schAmpel(p, H) {
  if (!H.schE && !H.schN) return null;
  const e = (H.schE || []).filter(x => x.azubi_id === p.id), n = (H.schN || []).filter(x => x.azubi_id === p.id);
  const abs = (H.schAbs || []).filter(x => x.user_id === p.id);
  if (!e.length && !n.length && !abs.length) return null;
  const old = localDate(new Date(Date.now() - 3 * 864e5)), d90 = localDate(new Date(Date.now() - 90 * 864e5));
  const unent = e.filter(x => x.typ === 'fehltag' && x.status === 'unentschuldigt' && x.datum >= d90).length;
  const offenAlt = e.filter(x => x.typ === 'fehltag' && schSt(x) === 'offen' && x.datum < old).length;
  const offen = e.filter(x => x.typ === 'fehltag' && schSt(x) === 'offen').length;
  const schlecht = n.filter(x => +x.note >= 5).length, warnN = n.filter(x => +x.note >= 4).length;
  const reps = (H.rpReps || H.reps || []).filter(r => r.user_id === p.id && r.tage);
  const abg = reps.length ? schAbgleich(reps, abs, e, 21).length : 0;
  const parts = [];
  if (unent) parts.push(`${unent} unentschuldigt`); if (offen) parts.push(`${offen} Fehltag${offen === 1 ? '' : 'e'} ungeklärt`);
  if (warnN) parts.push(`${warnN} Note${warnN === 1 ? '' : 'n'} ab 4`); if (abg) parts.push(`${abg} Abweichung${abg === 1 ? '' : 'en'} zum Bericht`);
  const level = unent || offenAlt || schlecht ? 'crit' : offen || warnN || abg ? 'warn' : 'ok';
  return { level, title: parts.length ? parts.join(', ') : 'Berufsschule ohne Auffälligkeiten' };
}

/* ---------- Schulbericht für die Leitung (PDF) ---------- */
async function schMonatPDF(btn) {
  const now = new Date(), def = localDate(new Date(now.getFullYear(), now.getMonth() - (now.getDate() < 8 ? 1 : 0), 1)).slice(0, 7);
  sheetShell('Schulbericht', `<form id="smForm" class="card p-4 flex flex-col gap-3">
    <p class="text-[13px] text-muted">Überblick Berufsschule für alle Azubis: Schultage, Anwesenheit, Fehltage (entschuldigt, unentschuldigt, ungeklärt), Verspätungen, Noten, Lernfeld-Stand und Abweichungen zum Wochenbericht.</p>
    <div><label class="lbl" for="smMon">Monat</label><input id="smMon" type="month" class="field" value="${def}" max="${localDate().slice(0, 7)}"></div>
    <button class="btn" id="smGo">PDF erstellen</button></form>`);
  $('#smForm').onsubmit = async e => { e.preventDefault(); const m = $('#smMon').value || def; await schMonatBuild(m, $('#smGo')); };
}
async function schMonatBuild(month, btn) {
  const [yy, mm] = month.split('-').map(Number), from = `${month}-01`, to = localDate(new Date(yy, mm, 0)), until = to > localDate() ? localDate() : to;
  if (btn) { btn.disabled = true; btn.textContent = 'PDF wird erstellt …'; }
  PDF_DE = true;
  try {
    await loadScript('./vendor/jspdf.umd.min.js');
    const prof = await q(sb.from('profiles').select('*'));
    S.profiles = Object.assign(S.profiles || {}, Object.fromEntries(prof.map(p => [p.id, p])));
    const list = prof.filter(p => p.role === 'azubi' && p.aktiv !== false && canSchool(p)).sort((a, b) => a.full_name.localeCompare(b.full_name));
    if (!list.length) { toast('Keine Azubis, für die du zuständig bist.'); return; }
    const ids = list.map(p => p.id), w1 = isoWeek(schDay(from)), w2 = isoWeek(schDay(to));
    const opt = p => p.then(r => r.error ? [] : (r.data || []), () => []);
    const [ein, noten, lfs, abs, reps] = await Promise.all([
      opt(sb.from('schul_eintraege').select('*').in('azubi_id', ids).gte('datum', from).lte('datum', to)),
      opt(sb.from('schul_noten').select('*').in('azubi_id', ids).order('datum', { ascending: false })),
      opt(sb.from('schul_lf_stand').select('*').in('azubi_id', ids)),
      opt(sb.from('absences').select('*').in('user_id', ids).in('typ', ['Berufsschule', 'Krank']).lte('von', to).gte('bis', from)),
      opt(sb.from('reports').select('user_id,jahr,kw,status,tage').in('user_id', ids).gte('jahr', w1.jahr).lte('jahr', w2.jahr))
    ]);
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const FONT = await pdfFont(doc);
    const W = 210, M = 16, CW = W - 2 * M, monName = schDay(from).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    doc.setFont(FONT, 'bold'); doc.setFontSize(18); doc.text(pdfSafe(`Schulbericht ${monName}`), M, 22);
    doc.setFont(FONT, 'normal'); doc.setFontSize(10); doc.setTextColor(90);
    doc.text(pdfSafe(`${S.hotel || ''} · ${list.length} Auszubildende · erstellt am ${fmtDate(localDate())} von ${S.me.full_name}`), M, 28); doc.setTextColor(0);
    const schoolDaysOf = id => { const set = new Set(); abs.filter(a => a.user_id === id && a.typ === 'Berufsschule' && (a.status || 'genehmigt') === 'genehmigt').forEach(a => { for (let d = schDay(a.von < from ? from : a.von); localDate(d) <= (a.bis > until ? until : a.bis); d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w && w < 6) set.add(localDate(d)); } }); return set; };
    const rows = list.map(p => {
      const e = ein.filter(x => x.azubi_id === p.id), n = noten.filter(x => x.azubi_id === p.id), nm = n.filter(x => x.datum >= from && x.datum <= to);
      const fehl = e.filter(x => x.typ === 'fehltag'), sd = schoolDaysOf(p.id);
      const lfS = schLfStand(p, lfs.filter(x => x.azubi_id === p.id));
      const abg = schAbgleich(reps.filter(r => r.user_id === p.id), abs.filter(a => a.user_id === p.id), e, 62).filter(x => x.datum >= from && x.datum <= to);
      return { p, sd: sd.size, anw: e.filter(x => x.typ === 'anwesend').length, fehl: fehl.length, ent: fehl.filter(x => x.status === 'entschuldigt').length,
        unent: fehl.filter(x => x.status === 'unentschuldigt').length, offen: fehl.filter(x => schSt(x) === 'offen').length, versp: e.filter(x => x.typ === 'verspaetung').length,
        avg: schAvg(n), nm, lfS, abg, notizen: e.filter(x => ['notiz', 'lob'].includes(x.typ)) };
    });
    // Übersichtstabelle
    const cols = [['Azubi', 42], ['Schultage', 17], ['Anwesend', 17], ['Fehltage', 16], ['unentsch.', 17], ['ungeklärt', 17], ['Verspät.', 16], ['Ø Note', 14], ['Lernfelder', 18]];
    let y = 40; doc.setFontSize(8.5); doc.setFont(FONT, 'bold'); doc.setFillColor(236, 241, 241); doc.rect(M, y - 4.5, CW, 7, 'F');
    let x = M + 1; cols.forEach(([h, w]) => { doc.text(pdfSafe(h), x, y); x += w; }); y += 7; doc.setFont(FONT, 'normal');
    rows.forEach(r => {
      if (y > 275) { doc.addPage(); y = 22; }
      x = M + 1; const vals = [r.p.full_name, r.sd || '–', r.anw || '–', r.fehl, r.unent, r.offen, r.versp, r.avg == null ? '–' : schNote(r.avg), r.lfS.list.length ? r.lfS.pc + ' %' : '–'];
      vals.forEach((v, i) => { const red = (i === 4 && r.unent) || (i === 5 && r.offen) || (i === 7 && r.avg >= 4); if (red) doc.setTextColor(214, 69, 69); doc.text(pdfSafe(String(v)).slice(0, i ? 12 : 30), x, y); doc.setTextColor(0); x += cols[i][1]; });
      doc.setDrawColor(225); doc.line(M, y + 2.2, W - M, y + 2.2); y += 7;
    });
    doc.setFontSize(8); doc.setTextColor(110);
    doc.text(pdfSafe('Schultage: laut Stundenplan-Import. Anwesend/Fehltage: Meldungen der Lehrkraft über AzubiHub. Ungeklärt: Fehltag ohne Entscheidung des Betriebs.'), M, y + 3, { maxWidth: CW }); doc.setTextColor(0);
    y += 12;
    // Details je Azubi
    rows.forEach(r => {
      const items = [
        ...r.abg.map(a => [a.tone === 'crit' ? 'crit' : 'warn', `${fmtDate(a.datum)}: ${a.text}`]),
        ...ein.filter(e => e.azubi_id === r.p.id && e.typ === 'fehltag').map(e => [e.status === 'unentschuldigt' ? 'crit' : schSt(e) === 'offen' ? 'warn' : 'ok', `Fehltag ${fmtDate(e.datum)}: ${SCH_STATUS[schSt(e)][1]}${e.nachweis ? ' (Nachweis liegt vor)' : ''}${e.text ? ' – ' + e.text : ''}`]),
        ...r.nm.map(n => [+n.note >= 4 ? 'warn' : 'ok', `Note ${schNote(n.note)} am ${fmtDate(n.datum)}: ${[n.lf_nr ? 'LF ' + n.lf_nr : '', n.fach, n.titel, SCH_ART[n.art]].filter(Boolean).join(' · ')}`]),
        ...r.notizen.map(e => [e.typ === 'lob' ? 'ok' : '', `${e.typ === 'lob' ? 'Lob' : 'Notiz'} ${fmtDate(e.datum)}: ${e.text || ''}`]),
        ...(r.lfS.laeuft.length ? [['', `Aktuelle Lernfelder: ${r.lfS.laeuft.map(l => 'LF ' + l.nr + ' ' + l.titel).join('; ')}`]] : [])
      ];
      if (!items.length) return;
      if (y > 255) { doc.addPage(); y = 22; }
      doc.setFont(FONT, 'bold'); doc.setFontSize(11); doc.text(pdfSafe(`${r.p.full_name} · ${r.p.beruf || ''} · ${r.p.lehrjahr || 1}. Ausbildungsjahr`), M, y); y += 6;
      doc.setFont(FONT, 'normal'); doc.setFontSize(9);
      items.forEach(([tone, txt]) => {
        const lines = doc.splitTextToSize(pdfSafe(txt), CW - 6);
        if (y + lines.length * 4.4 > 282) { doc.addPage(); y = 22; }
        const c = tone === 'crit' ? [214, 69, 69] : tone === 'warn' ? [232, 146, 44] : tone === 'ok' ? [46, 157, 90] : [150, 150, 150];
        doc.setFillColor(...c); doc.circle(M + 1.2, y - 1.1, 1.1, 'F');
        lines.forEach((l, i) => doc.text(l, M + 5, y + i * 4.4)); y += lines.length * 4.4 + 1.6;
      });
      y += 4;
    });
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(`Seite ${i} von ${pages}`, W / 2, 292, { align: 'center' }); }
    doc.save(`Schulbericht_${month}.pdf`);
    closeSheet(); toast('PDF erstellt');
  } catch (e) { if (!e.code) toast(errText(e)); }
  finally { PDF_DE = false; if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = 'PDF erstellen'; } }
}

/* ---------- Anrechnung der Berufsschule auf die Ausbildungszeit (§ 15 BBiG, § 9 JArbSchG) ---------- */
// Ein Schultag mit mehr als 5 Unterrichtsstunden à 45 Minuten (einmal pro Woche) zählt mit der durchschnittlichen täglichen
// Ausbildungszeit, eine Blockwoche mit mindestens 25 Stunden an 5 Tagen mit der wöchentlichen. Sonst zählt die Unterrichtszeit.
function schAnrechnung(days, prof) {
  const jung = !!prof?.unter18, woche = (+prof?.wochenstunden || +APP.wochenSoll || 40) * 60, tag = jung ? 8 * 60 : Math.round(woche / 5);
  const sch = (days || []).map((d, i) => ({ i, min: d.bereich === 'Berufsschule' ? dayMin(d) : null })).filter(x => x.min != null);
  if (!sch.length) return null;
  const total = sch.reduce((s, x) => s + x.min, 0);
  if (sch.length >= 5 && total >= 25 * 60) return { credit: jung ? 40 * 60 : woche, school: total, note: 'Blockwoche: zählt als volle Ausbildungswoche' };
  let used = false, credit = 0;
  const parts = sch.map(x => { if (!used && x.min > 225) { used = true; credit += Math.max(tag, x.min); return `${DAYS[x.i].slice(0, 2)} ${fmtMin(Math.max(tag, x.min))}`; } credit += x.min; return `${DAYS[x.i].slice(0, 2)} ${fmtMin(x.min)}`; });
  return { credit, school: total, note: used ? `Langer Schultag zählt als ganzer Arbeitstag (${fmtMin(tag)})` : 'Unterrichtszeit wird angerechnet', parts };
}
function schAnrechnungHTML(days, prof) {
  const a = schAnrechnung(days, prof); if (!a) return '';
  const work = (days || []).filter(d => d.bereich !== 'Berufsschule').reduce((s, d) => s + dayMin(d), 0), sum = work + a.credit;
  const woche = (+prof?.wochenstunden || +APP.wochenSoll || 0) * 60;
  return `<div class="rounded-xl p-3 text-[12px]" style="background:var(--sunk)"><div class="flex justify-between gap-3"><span class="font-semibold">Ausbildungszeit mit Berufsschule</span><span class="tnum font-semibold">${fmtMin(sum)}${woche ? ' von ' + fmtMin(woche) : ''}</span></div>
    <div class="text-muted mt-0.5 tnum">Betrieb ${fmtMin(work)} + Berufsschule angerechnet ${fmtMin(a.credit)}${a.parts ? ' (' + a.parts.join(', ') + ')' : ''}</div><div class="text-muted mt-0.5">${a.note} – nach § 15 BBiG${prof?.unter18 ? ' und § 9 JArbSchG' : ''}.</div>
    ${woche && sum > woche ? `<div class="mt-1" style="color:var(--warn)">Mehr als die vereinbarte Wochenzeit – bitte Ausgleich oder Überstunden prüfen.</div>` : ''}</div>`;
}

/* ---------- Portal der Lehrkraft ---------- */
function schPortalHTML(D, tok) {
  const today = localDate(), heute = D.eintraege.find(e => e.datum === today && ['anwesend', 'fehltag'].includes(e.typ));
  const lfBy = Object.fromEntries((D.lf_stand || []).map(s => [s.lf_nr, s])), years = [...new Set((D.lernfelder || []).map(l => l.lehrjahr))].sort();
  return `
    <h2 class="text-[18px] font-bold mt-6 mb-2">Anwesenheit</h2>
    <div class="card p-4 flex flex-col gap-3">
      <div class="flex items-center gap-2 flex-wrap"><label class="lbl m-0" for="spAnDat">Tag</label><input id="spAnDat" type="date" class="field" style="max-width:180px" value="${today}" max="${today}">
        ${heute ? `<span class="chip ${heute.typ === 'anwesend' ? 'ok' : 'crit'}">heute: ${heute.typ === 'anwesend' ? 'anwesend' : 'Fehltag'}</span>` : ''}</div>
      <div class="grid grid-cols-2 gap-2"><button type="button" class="btn ok" data-span="anwesend">${svg('check', 'w-4 h-4')} Anwesend</button><button type="button" class="btn danger" data-span="fehltag">Fehlt</button></div>
      <p class="text-[12px] text-muted">Ein Klick genügt. Bei „Fehlt“ wird der Betrieb sofort benachrichtigt und gleicht mit dem Wochenbericht ab. Für die ganze Klasse geht es schneller über „Meine Klasse“.</p>
    </div>

    <h2 class="text-[18px] font-bold mt-6 mb-2">Noten</h2>
    <form id="spNoteForm" class="card p-4 flex flex-col gap-3">
      <div class="grid grid-cols-3 gap-2"><div><label class="lbl" for="spNote">Note</label><input id="spNote" class="field tnum" inputmode="decimal" placeholder="2,3" maxlength="3"></div>
        <div class="col-span-2"><label class="lbl" for="spNDat">Datum</label><input id="spNDat" type="date" class="field" value="${today}"></div></div>
      <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="spNArt">Art</label><select id="spNArt" class="field">${Object.entries(SCH_ART).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div><label class="lbl" for="spNLf">Lernfeld</label><select id="spNLf" class="field"><option value="">–</option>${(D.lernfelder || []).map(l => `<option value="${l.nr}">LF ${l.nr}</option>`).join('')}</select></div></div>
      <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="spNFach">Fach <span class="font-normal text-muted">(optional)</span></label><input id="spNFach" class="field" maxlength="80"></div><div><label class="lbl" for="spNTitel">Thema <span class="font-normal text-muted">(optional)</span></label><input id="spNTitel" class="field" maxlength="160"></div></div>
      <button class="btn">Note senden</button>
      ${(D.noten || []).length ? `<div class="flex flex-col">${D.noten.map(n => `<div class="rpitem py-2 flex items-center gap-3 text-[14px]"><span class="chip ${schNoteTone(+n.note)} tnum" style="min-width:40px;justify-content:center;font-weight:700">${schNote(n.note)}</span><span class="flex-1 min-w-0 truncate">${fmtDate(n.datum)} · ${SCH_ART[n.art] || ''}${n.lf_nr ? ' · LF ' + n.lf_nr : ''}${n.fach ? ' · ' + esc(n.fach) : ''}${n.titel ? ' · ' + esc(n.titel) : ''}</span><button type="button" class="xbtn" data-spnotedel="${n.id}" aria-label="Note löschen">${svg('x', 'w-4 h-4')}</button></div>`).join('')}</div>` : ''}
      <p class="text-[12px] text-muted">Ab einer 4 bekommt der Betrieb einen Hinweis, damit er früh unterstützen kann. Löschen ist 14 Tage lang möglich.</p>
    </form>

    ${(D.lernfelder || []).length ? `<h2 class="text-[18px] font-bold mt-6 mb-2">Lernfelder</h2>
    <div class="card p-4"><p class="text-[13px] text-muted mb-2">Antippen: offen → läuft → abgeschlossen. Der Betrieb sieht, welches Lernfeld gerade läuft, und kann passende Aufgaben im Betrieb einplanen.</p>
      ${years.map(y => `<div class="eyebrow mt-3 mb-1">${y}. Ausbildungsjahr</div>${D.lernfelder.filter(l => l.lehrjahr === y).map(l => { const s = lfBy[l.nr]?.status;
        return `<div class="rpitem py-2 flex items-center gap-3"><div class="flex-1 min-w-0 text-[14px]"><span class="text-muted tnum">LF ${l.nr}</span> ${esc(l.titel)}</div><button type="button" class="chip ${s === 'abgeschlossen' ? 'ok' : s === 'laeuft' ? 'warn' : ''} flex-none" data-splf="${l.nr}" data-st="${s || ''}">${s === 'abgeschlossen' ? '✓ abgeschlossen' : s === 'laeuft' ? 'läuft' : 'offen'}</button></div>`; }).join('')}`).join('')}
    </div>` : ''}

    <h2 class="text-[18px] font-bold mt-6 mb-2">Nachrichten mit dem Betrieb</h2>
    <form id="spMsgForm" class="card p-4 flex flex-col gap-3">
      ${(D.nachrichten || []).length ? `<div class="flex flex-col gap-2">${D.nachrichten.slice(-20).map(m => `<div class="p-3 rounded-xl text-[14px] " style="${m.richtung === 'schule' ? 'margin-inline-start:2rem;background:var(--accent-soft)' : 'margin-inline-end:2rem;background:var(--sunk)'}"><div class="text-[11px] text-muted mb-0.5">${esc(m.von || (m.richtung === 'schule' ? 'Berufsschule' : D.betrieb))} · ${when(m.created_at)}</div><div class="whitespace-pre-line">${esc(m.text)}</div></div>`).join('')}</div>` : '<p class="text-[13px] text-muted">Hier können Sie direkt mit dem Ausbildungsbetrieb schreiben. Antworten erscheinen hier.</p>'}
      <label class="sr-only" for="spMsgText">Nachricht an den Betrieb</label><textarea id="spMsgText" class="field" rows="2" maxlength="2000" placeholder="Nachricht an ${esc(D.betrieb)}"></textarea>
      <button class="btn">Senden</button>
    </form>`;
}
function schPortalBind(D, tok, again) {
  const von = () => ($('#spVon')?.value || D.lehrkraft || '').trim();
  const err = e => toast(/DATUM/.test(e.message) ? 'Bitte ein Datum aus den letzten 4 Monaten wählen.' : /LIMIT/.test(e.message) ? 'Heute wurden schon sehr viele Einträge gesendet.' : /SCHON_ENTSCHIEDEN/.test(e.message) ? 'Für diesen Tag hat der Betrieb den Fehltag schon bearbeitet.' : /NOTE/.test(e.message) ? 'Bitte eine Note zwischen 1 und 6.' : 'Das hat nicht geklappt. Bitte später erneut versuchen.');
  $$('[data-span]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error } = await sb.rpc('schule_add', { p_token: tok, p_typ: b.dataset.span, p_datum: $('#spAnDat').value || localDate(), p_text: '', p_von: von() });
    b.disabled = false; if (error) return err(error);
    toast(b.dataset.span === 'anwesend' ? 'Anwesenheit gespeichert' : 'Fehltag gemeldet. Der Betrieb wurde benachrichtigt.'); again();
  });
  if ($('#spNoteForm')) $('#spNoteForm').onsubmit = async e => {
    e.preventDefault();
    const n = parseFloat(($('#spNote').value || '').replace(',', '.')); if (!(n >= 1 && n <= 6)) return toast('Bitte eine Note zwischen 1 und 6.');
    const { error } = await sb.rpc('schule_note_add', { p_token: tok, p_lf: $('#spNLf').value ? +$('#spNLf').value : null, p_fach: $('#spNFach').value, p_art: $('#spNArt').value, p_titel: $('#spNTitel').value, p_datum: $('#spNDat').value || localDate(), p_note: Math.round(n * 10) / 10, p_von: von() });
    if (error) return err(error); toast('Note gesendet'); again();
  };
  $$('[data-spnotedel]').forEach(b => b.onclick = () => confirmInline(b, async () => { const { error } = await sb.rpc('schule_note_del', { p_token: tok, p_id: b.dataset.spnotedel }); if (error) return err(error); toast('Note gelöscht'); again(); }));
  $$('[data-splf]').forEach(b => b.onclick = async () => {
    const st = b.dataset.st, next = !st ? 'laeuft' : st === 'laeuft' ? 'abgeschlossen' : null; b.disabled = true;
    const { error } = await sb.rpc('schule_lf_set', { p_token: tok, p_lf: +b.dataset.splf, p_status: next, p_note: null, p_von: von() });
    if (error) { b.disabled = false; return err(error); } again();
  });
  if ($('#spMsgForm')) $('#spMsgForm').onsubmit = async e => {
    e.preventDefault(); const t = $('#spMsgText').value.trim(); if (!t) return;
    const { error } = await sb.rpc('schule_msg', { p_token: tok, p_text: t, p_von: von() });
    if (error) return err(error); toast('Nachricht gesendet. Der Betrieb wurde benachrichtigt.'); again();
  };
}
// Klassenansicht: Anwesenheit für alle in einem Rutsch
function schClassAttendanceHTML(good) {
  if (!good.length) return '';
  return `<h2 class="text-[18px] font-bold mt-6 mb-2">Anwesenheit erfassen</h2>
    <form id="klAnForm" class="card p-4 flex flex-col gap-3">
      <div class="flex items-center gap-2"><label class="lbl m-0" for="klAnDat">Tag</label><input id="klAnDat" type="date" class="field" style="max-width:180px" value="${localDate()}" max="${localDate()}"></div>
      <div class="flex flex-col">${good.map((r, i) => `<div class="rpitem py-2 flex items-center gap-3"><span class="flex-1 min-w-0 truncate text-[14px]" translate="no">${esc(r.name)}</span>
        <div class="seg flex-none" role="radiogroup" aria-label="${esc(r.name)}"><label class="text-[13px] px-2 py-1 cursor-pointer"><input type="radio" name="klan${i}" value="anwesend" data-tok="${esc(r.x.token)}" checked> anwesend</label><label class="text-[13px] px-2 py-1 cursor-pointer"><input type="radio" name="klan${i}" value="fehltag" data-tok="${esc(r.x.token)}"> fehlt</label><label class="text-[13px] px-2 py-1 cursor-pointer"><input type="radio" name="klan${i}" value="" data-tok="${esc(r.x.token)}"> –</label></div></div>`).join('')}</div>
      <button class="btn" id="klAnSend">Speichern</button>
      <p class="text-[12px] text-muted">„–“ = keine Angabe (z. B. kein Unterricht für diese Person). Betriebe mit Fehltagen werden sofort benachrichtigt.</p>
    </form>`;
}
function schClassAttendanceBind(again) {
  if (!$('#klAnForm')) return;
  $('#klAnForm').onsubmit = async e => {
    e.preventDefault();
    const picks = $$('#klAnForm input[type=radio]:checked').filter(x => x.value), dat = $('#klAnDat').value || localDate(), von = ($('#klVon')?.value || '').trim();
    if (!picks.length) return toast('Bitte mindestens eine Person auswählen.');
    const btn = $('#klAnSend'); btn.disabled = true; let ok = 0;
    for (const x of picks) { const { error } = await sb.rpc('schule_add', { p_token: x.dataset.tok, p_typ: x.value, p_datum: dat, p_text: '', p_von: von }).catch(err => ({ error: err })); if (!error) ok++; }
    btn.disabled = false;
    toast(ok === picks.length ? `Anwesenheit für ${ok} gespeichert` : `${ok} von ${picks.length} gespeichert`);
    if (ok) again();
  };
}
