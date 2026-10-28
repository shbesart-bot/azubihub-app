/* AzubiHub · Ausbildung im Betrieb
   Ausbildungsvertrag (Probezeit, Vergütung, Urlaub, Fristen), Anmelde-Checkliste zur Prüfung, Urlaubskonto,
   Dienstplan mit Prüfung nach JArbSchG / ArbZG / § 15 BBiG, Frühwarnung (Risiko-Hinweis), anonymer Stimmungs-Check,
   Feedback zu Stationen, Lernfeld-Training, Eltern-Zugang. Wird vor dem Hauptskript geladen; Helfer (S, sb, esc, q …)
   werden erst beim Aufruf benutzt. */

/* ---------- Datum ---------- */
const avD = s => new Date(String(s).slice(0, 10) + 'T12:00:00');
function avAddM(d, m) { const x = avD(d), day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + m); const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(day, last)); return localDate(x); }
const avEur = n => n == null || n === '' ? '–' : (+n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
const avIn = n => n === null ? '' : n < 0 ? 'vorbei' : n === 0 ? 'heute' : n === 1 ? 'morgen' : `in ${n} Tagen`;

/* ---------- Ausbildungsvertrag ---------- */
async function avLoad(p) {
  S.av = null; S.avAbs = [];
  if (!p) return;
  const y0 = `${new Date().getFullYear()}-01-01`, y1 = `${new Date().getFullYear()}-12-31`;
  const [v, abs] = await Promise.all([
    q(sb.from('ausbildungsvertraege').select('*').eq('azubi_id', p.id).maybeSingle()).catch(() => null),
    q(sb.from('absences').select('typ,von,bis,status').eq('user_id', p.id).eq('typ', 'Urlaub').lte('von', y1).gte('bis', y0)).catch(() => [])
  ]);
  S.av = v ? { ...v, _for: p.id } : { _for: p.id, _neu: true }; S.avAbs = abs || [];
}
function avYear(v) {
  if (!v?.beginn) return null;
  const today = localDate();
  for (let y = 1; y <= 4; y++) if (today < avAddM(v.beginn, 12 * y)) return y;
  return 4;
}
function avProbe(v) { if (!v?.beginn || !v?.probezeit_monate) return null; const end = localDate(new Date(avD(avAddM(v.beginn, v.probezeit_monate)).getTime() - 864e5)); return { end, n: daysUntil(end) }; }
// Urlaubskonto: Anspruch im laufenden Kalenderjahr (anteilig im Eintritts- und Austrittsjahr, 1/12 je vollem Monat), genommen und geplant
function avUrlaub(v, abs) {
  if (!v?.urlaubstage) return null;
  const Y = new Date().getFullYear(), y0 = `${Y}-01-01`, y1 = `${Y}-12-31`;
  let months = 12;
  if (v.beginn && v.beginn > y0) months = Math.max(0, 12 - avD(v.beginn).getMonth() - (avD(v.beginn).getDate() > 1 ? 1 : 0));
  if (v.ende && v.ende < y1) months = Math.min(months, avD(v.ende).getMonth() + (avD(v.ende).getDate() >= new Date(Y, avD(v.ende).getMonth() + 1, 0).getDate() ? 1 : 0));
  const anspruch = Math.ceil(+v.urlaubstage * months / 12 * 2) / 2;
  const six = (v.tage_pro_woche || 5) >= 6;
  const days = a => { let n = 0; const from = a.von < y0 ? y0 : a.von, to = a.bis > y1 ? y1 : a.bis; for (let d = avD(from); localDate(d) <= to; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w !== 0 && (six || w !== 6)) n++; } return n; };
  const ok = (abs || []).filter(a => (a.status || 'genehmigt') === 'genehmigt'), today = localDate();
  const genommen = ok.filter(a => a.von <= today).reduce((s, a) => s + days({ von: a.von, bis: a.bis < today ? a.bis : today }), 0);
  const geplant = ok.reduce((s, a) => s + days(a), 0) - genommen;
  const beantragt = (abs || []).filter(a => a.status === 'beantragt').reduce((s, a) => s + days(a), 0);
  return { anspruch, genommen, geplant, beantragt, rest: anspruch - genommen - geplant, anteilig: months < 12 };
}
const AV_CHECK = [
  ['formular', 'Anmeldeformular der IHK ausgefüllt und unterschrieben'],
  ['nachweis', 'Ausbildungsnachweis vollständig vorgelegt (§ 43 BBiG)'],
  ['zeugnis', 'Letztes Berufsschulzeugnis beigelegt (falls die IHK es verlangt)'],
  ['gebuehr', 'Prüfungsgebühr – zahlt der Betrieb'],
  ['frei', 'Freistellung am Prüfungstag und am Arbeitstag vor der schriftlichen Abschlussprüfung eingeplant (§ 15 BBiG)'],
  ['einladung', 'Einladung der IHK erhalten, Termin eingetragen']
];
function avHTML(p) {
  const v = S.av && S.av._for === p.id ? S.av : null, edit = isAdmin() || can('team');
  if (!v) return '';
  const names = EXN(p.beruf);
  if (v._neu) return `${secTitle('Ausbildungsvertrag', edit ? '<button id="avEdit" class="text-[13px] font-semibold text-accent">Eintragen</button>' : '')}
    ${empty(edit ? 'Noch keine Vertragsdaten. Trag Beginn, Probezeit, Vergütung und Urlaub ein – AzubiHub erinnert dann an Probezeitende, neues Ausbildungsjahr und Anmeldeschluss.' : 'Die Vertragsdaten trägt deine Ausbildungsleitung ein.')}`;
  const pz = avProbe(v), yr = avYear(v), ver = v.verguetung || {}, U = avUrlaub(v, S.avAbs);
  const row = (l, val, tone = '') => `<div class="flex items-baseline justify-between gap-3 py-2 avrow"><span class="text-[13px] text-muted">${l}</span><span class="text-[14px] font-semibold tnum text-right" ${tone ? `style="color:var(--st-${tone})"` : ''}>${val}</span></div>`;
  const years = [1, 2, 3, 4].filter(y => ver[y] != null && ver[y] !== '');
  const fr = [[names[0], v.zp_anmeldeschluss], [names[1], v.ap_anmeldeschluss]].filter(x => x[1]);
  const cl = v.checkliste || {}, clDone = AV_CHECK.filter(([k]) => cl[k]).length;
  const fTone = n => n === null ? '' : n < 0 ? '' : n <= 7 ? 'crit' : n <= 28 ? 'warn' : '';
  return `${secTitle('Ausbildungsvertrag', edit ? '<button id="avEdit" class="text-[13px] font-semibold text-accent">Bearbeiten</button>' : '')}
    <div class="card px-4 py-1.5 avrows">
      ${row('Ausbildungszeit', v.beginn ? `${fmtDate(v.beginn)} – ${v.ende ? fmtDate(v.ende) : 'offen'}` : '–')}
      ${pz ? row('Probezeit bis', `${fmtDate(pz.end)}${pz.n >= 0 ? ' · ' + avIn(pz.n) : ' · beendet'}`, pz.n >= 0 && pz.n <= 14 ? 'warn' : '') : ''}
      ${v.wochenstunden ? row('Arbeitszeit', `${String(v.wochenstunden).replace('.', ',')} Std/Woche · ${v.tage_pro_woche || 5}-Tage-Woche`) : ''}
      ${v.vertragsnr ? row('Vertragsnummer IHK', esc(v.vertragsnr) + (v.ihk_eingetragen ? ` · eingetragen ${fmtDate(v.ihk_eingetragen)}` : '')) : ''}
    </div>
    ${years.length ? `<div class="grid gap-2 mt-2" style="grid-template-columns:repeat(${years.length},minmax(0,1fr))">${years.map(y => `<div class="card p-3 text-center" ${y === yr ? 'style="border-color:var(--accent)"' : ''}><div class="text-[11px] text-muted font-semibold">${y}. Jahr${y === yr ? ' · jetzt' : ''}</div><div class="text-[15px] font-bold tnum mt-0.5">${avEur(ver[y])}</div></div>`).join('')}</div>
      <p class="text-[12px] text-muted mt-1.5">Ausbildungsvergütung brutto pro Monat. Zum neuen Ausbildungsjahr erinnert AzubiHub 14 Tage vorher an die neue Vergütung.</p>` : ''}
    ${U ? `${secTitle('Urlaubskonto ' + new Date().getFullYear())}
      <div class="card p-4"><div class="grid grid-cols-3 gap-2 text-center">
        <div><div class="text-[22px] font-bold tnum">${String(U.anspruch).replace('.', ',')}</div><div class="text-[12px] text-muted">Anspruch${U.anteilig ? ' (anteilig)' : ''}</div></div>
        <div><div class="text-[22px] font-bold tnum">${U.genommen + U.geplant}</div><div class="text-[12px] text-muted">genommen + geplant</div></div>
        <div><div class="text-[22px] font-bold tnum" style="color:var(--st-${U.rest < 0 ? 'crit' : U.rest <= 3 ? 'warn' : 'ok'})">${String(U.rest).replace('.', ',')}</div><div class="text-[12px] text-muted">übrig</div></div></div>
        <div class="bar mt-3"><i style="width:${pct(U.genommen + U.geplant, U.anspruch)}%"></i></div>
        <p class="text-[12px] text-muted mt-2">${U.genommen} Tage genommen, ${U.geplant} genehmigt und geplant${U.beantragt ? `, ${U.beantragt} beantragt (noch nicht genehmigt)` : ''}. Gezählt werden Arbeitstage (${(v.tage_pro_woche || 5) >= 6 ? 'Mo–Sa' : 'Mo–Fr'}), Feiertage nicht abgezogen.${p.unter18 ? ' Unter 18 gilt der Mindesturlaub nach § 19 JArbSchG (25 bis 30 Werktage je nach Alter).' : ''}</p>
        ${isAzubi() ? '<button class="btn ghost w-full mt-3" id="avUrlaub">Urlaub beantragen</button>' : ''}</div>` : ''}
    ${secTitle('Anmeldung zur Prüfung', `<span class="text-[12px] text-muted tnum">${clDone}/${AV_CHECK.length} erledigt</span>`)}
    ${fr.length ? `<div class="grid gap-2 mb-2" style="grid-template-columns:repeat(${fr.length},minmax(0,1fr))">${fr.map(([l, d]) => { const n = daysUntil(d); return `<div class="card p-3.5"><div class="text-[12px] text-muted font-semibold">Anmeldeschluss ${esc(l)}</div><div class="text-[18px] font-bold tnum mt-0.5">${fmtDate(d)}</div><div class="text-[12px] tnum" style="color:${fTone(n) ? `var(--st-${fTone(n)})` : 'var(--muted)'}">${avIn(n)}</div></div>`; }).join('')}</div>` : `<p class="text-[13px] text-muted mb-2">${edit ? 'Trag den Anmeldeschluss beim Vertrag ein – AzubiHub erinnert 4 Wochen, 2 Wochen, 1 Woche und 1 Tag vorher.' : 'Den Anmeldeschluss trägt deine Ausbildungsleitung ein, dann bekommst du rechtzeitig eine Erinnerung.'}</p>`}
    <div class="card">${AV_CHECK.map(([k, l], i) => `<label class="flex items-start gap-3 p-3.5 ${i ? 'border-t border-line' : ''} ${edit ? 'cursor-pointer' : ''}"><input type="checkbox" data-avcl="${k}" ${cl[k] ? 'checked' : ''} ${edit ? '' : 'disabled'} style="accent-color:var(--accent);width:20px;height:20px;flex:none;margin-top:1px"><span class="text-[14px] ${cl[k] ? 'text-muted line-through' : ''}">${l}${cl[k] && typeof cl[k] === 'string' ? `<span class="block text-[12px] no-underline">erledigt am ${fmtDate(cl[k])}</span>` : ''}</span></label>`).join('')}</div>`;
}
function avBind(p, reload) {
  if ($('#avEdit')) $('#avEdit').onclick = () => avEditSheet(p, reload);
  if ($('#avUrlaub')) $('#avUrlaub').onclick = () => openAbsenceSheet(null, p.id, reload);
  $$('[data-avcl]').forEach(c => c.onchange = async () => {
    const v = S.av; if (!v || v._neu) { c.checked = false; return toast('Bitte zuerst die Vertragsdaten eintragen.'); }
    const cl = { ...(v.checkliste || {}) }; if (c.checked) cl[c.dataset.avcl] = localDate(); else delete cl[c.dataset.avcl];
    await q(sb.from('ausbildungsvertraege').update({ checkliste: cl, updated_at: new Date().toISOString() }).eq('id', v.id)); v.checkliste = cl; render();
  });
}
function avEditSheet(p, reload) {
  const v = S.av && !S.av._neu ? S.av : {}, ver = v.verguetung || {};
  const f = (id, l, val, type = 'text', extra = '') => `<div><label class="lbl" for="${id}">${l}</label><input id="${id}" type="${type}" class="field" value="${esc(val ?? '')}" ${extra}></div>`;
  sheetShell('Ausbildungsvertrag', `<form id="avForm" class="card p-4 flex flex-col gap-3">
    <div class="text-[14px]">Für <b>${esc(p.full_name)}</b></div>
    <div class="grid grid-cols-2 gap-2">${f('avBeg', 'Beginn', v.beginn || p.start_datum, 'date')}${f('avEnd', 'Ende laut Vertrag', v.ende, 'date')}</div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="avPz">Probezeit</label><select id="avPz" class="field">${[1, 2, 3, 4].map(m => `<option value="${m}" ${(v.probezeit_monate || 4) === m ? 'selected' : ''}>${m} Monat${m === 1 ? '' : 'e'}</option>`).join('')}</select></div>${f('avVnr', 'Vertragsnummer IHK', v.vertragsnr, 'text', 'maxlength="60"')}</div>
    <div class="grid grid-cols-3 gap-2">${f('avUt', 'Urlaubstage/Jahr', v.urlaubstage, 'number', 'min="0" max="60" step="0.5"')}${f('avWs', 'Std/Woche', v.wochenstunden || p.wochenstunden, 'number', 'min="10" max="48" step="0.5"')}<div><label class="lbl" for="avTw">Tage/Woche</label><select id="avTw" class="field">${[5, 6, 4].map(n => `<option ${(v.tage_pro_woche || 5) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
    <div><div class="lbl">Ausbildungsvergütung brutto/Monat</div><div class="grid grid-cols-4 gap-2">${[1, 2, 3, 4].map(y => `<input id="avV${y}" type="number" min="0" step="1" class="field" placeholder="${y}. Jahr" aria-label="${y}. Ausbildungsjahr" value="${esc(ver[y] ?? '')}">`).join('')}</div><p class="text-[12px] text-muted mt-1">Mindestvergütung nach § 17 BBiG beachten, bei Tarifbindung gilt der Tarif.</p></div>
    <div class="grid grid-cols-2 gap-2">${f('avZpA', `Anmeldeschluss ${EXN(p.beruf)[0]}`, v.zp_anmeldeschluss, 'date')}${f('avApA', `Anmeldeschluss ${EXN(p.beruf)[1]}`, v.ap_anmeldeschluss, 'date')}</div>
    ${f('avEin', 'Bei der IHK eingetragen am', v.ihk_eingetragen, 'date')}
    <div><label class="lbl" for="avNotiz">Notiz</label><textarea id="avNotiz" class="field" rows="2" maxlength="1000">${esc(v.notiz || '')}</textarea></div>
    <button class="btn">Speichern</button>
    <p class="text-[12px] text-muted">Der Azubi sieht die Daten nur lesend. Erinnerungen gehen an die Ausbildungsleitung und, bei Prüfungsfristen, auch an den Azubi.</p></form>`);
  $('#avForm').onsubmit = async e => {
    e.preventDefault();
    const num = id => { const x = $(id).value.trim(); return x === '' ? null : +x; }, dt = id => $(id).value || null;
    const verg = {}; [1, 2, 3, 4].forEach(y => { const n = num('#avV' + y); if (n != null) verg[y] = n; });
    const out = { azubi_id: p.id, beginn: dt('#avBeg'), ende: dt('#avEnd'), probezeit_monate: +$('#avPz').value, vertragsnr: $('#avVnr').value.trim() || null,
      urlaubstage: num('#avUt'), wochenstunden: num('#avWs'), tage_pro_woche: +$('#avTw').value, verguetung: verg,
      zp_anmeldeschluss: dt('#avZpA'), ap_anmeldeschluss: dt('#avApA'), ihk_eingetragen: dt('#avEin'), notiz: $('#avNotiz').value.trim() || null, updated_at: new Date().toISOString() };
    if (out.beginn && out.ende && out.ende <= out.beginn) return toast('Das Ende muss nach dem Beginn liegen.');
    await q(sb.from('ausbildungsvertraege').upsert([out], { onConflict: 'azubi_id' }));
    if (out.wochenstunden && out.wochenstunden !== +p.wochenstunden) await sb.from('profiles').update({ wochenstunden: out.wochenstunden }).eq('id', p.id);
    closeSheet(); toast('Gespeichert'); reload();
  };
}

/* ---------- Dienstplan ---------- */
const dpInit = () => (S.dp ||= { w: { ...NOW }, rows: [], abs: [], before: [] });
const dpMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const dpHm = t => String(t || '').slice(0, 5);
function dpDur(r) { let s = dpMin(r.beginn), e = dpMin(r.ende); if (e <= s) e += 1440; return Math.max(0, e - s - (+r.pause_min || 0)); }
const dpEndAbs = r => { let s = dpMin(r.beginn), e = dpMin(r.ende); if (e <= s) e += 1440; return avD(r.datum).getTime() + (e - 720) * 6e4; };
const dpStartAbs = r => avD(r.datum).getTime() + (dpMin(r.beginn) - 720) * 6e4;
const dpPeople = () => Object.values(S.profiles).filter(p => p.aktiv !== false && ['azubi', 'mitarbeiter'].includes(p.role)).sort((a, b) => (a.role === 'azubi' ? 0 : 1) - (b.role === 'azubi' ? 0 : 1) || a.full_name.localeCompare(b.full_name));
const dpCan = () => isAdmin() || can('dienstplan') || can('abwesenheiten');
const dpSchool = (uid, d, abs) => (abs || []).some(a => a.user_id === uid && a.typ === 'Berufsschule' && (a.status || 'genehmigt') === 'genehmigt' && a.von <= d && a.bis >= d);
// Prüfung einer Woche je Person. Liefert [{lvl:'crit'|'warn', d, t}]
function dpCheck(p, rows, abs, before = [], w = dpInit().w) {
  const out = [], u18 = !!p.unter18, az = p.role === 'azubi', mine = rows.filter(r => r.user_id === p.id).sort((a, b) => dpStartAbs(a) - dpStartAbs(b));
  const add = (lvl, d, t) => out.push({ lvl, d, t });
  const byDay = {}; mine.forEach(r => (byDay[r.datum] = byDay[r.datum] || []).push(r));
  let week = 0;
  Object.entries(byDay).forEach(([d, list]) => {
    const min = list.reduce((s, r) => s + dpDur(r), 0), pause = list.reduce((s, r) => s + (+r.pause_min || 0), 0), wd = avD(d).getDay();
    week += min;
    if (u18) {
      if (min > 510) add('crit', d, `${fmtMin(min)} Arbeit – unter 18 höchstens 8 Std, 8,5 Std nur bei Ausgleich in der Woche (§ 8 JArbSchG)`);
      else if (min > 480) add('warn', d, `${fmtMin(min)} – über 8 Std nur, wenn an anderen Tagen der Woche kürzer gearbeitet wird (§ 8 JArbSchG)`);
      const need = min > 360 ? 60 : min > 270 ? 30 : 0; if (pause < need) add('crit', d, `Pause ${pause} Min – unter 18 bei über ${need === 60 ? '6' : '4,5'} Std mindestens ${need} Min (§ 11 JArbSchG)`);
      list.forEach(r => {
        const s = dpMin(r.beginn), e = dpMin(r.ende) <= s ? dpMin(r.ende) + 1440 : dpMin(r.ende);
        if (e > 23 * 60) add('crit', d, `Ende ${dpHm(r.ende)} Uhr – Nachtruhe für Jugendliche (§ 14 JArbSchG), auch in der Gastronomie höchstens bis 22 Uhr`);
        else if (e > 22 * 60) add('crit', d, `Ende ${dpHm(r.ende)} Uhr – in der Gastronomie ab 16 Jahren höchstens bis 22 Uhr (§ 14 JArbSchG)`);
        else if (e > 20 * 60) add('warn', d, `Ende ${dpHm(r.ende)} Uhr – nach 20 Uhr nur im Gaststättengewerbe ab 16 Jahren (bis 22 Uhr) erlaubt`);
        if (s < 5 * 60) add('crit', d, `Beginn ${dpHm(r.beginn)} Uhr – vor 6 Uhr nicht erlaubt, Ausnahme Bäckerei ab 5 Uhr (§ 14 JArbSchG)`);
        else if (s < 6 * 60) add('warn', d, `Beginn ${dpHm(r.beginn)} Uhr – vor 6 Uhr nur in Bäckereien/Konditoreien ab 16 Jahren`);
      });
      if (wd === 0) add('warn', d, 'Sonntag – für Jugendliche nur in Ausnahmen wie Gastronomie, mindestens 2 Sonntage im Monat frei (§ 17 JArbSchG)');
    } else {
      if (min > 600) add('crit', d, `${fmtMin(min)} Arbeit – mehr als 10 Std am Tag sind nicht erlaubt (§ 3 ArbZG)`);
      else if (min > 480) add('warn', d, `${fmtMin(min)} – über 8 Std nur mit Ausgleich auf 8 Std im Schnitt (§ 3 ArbZG)`);
      const need = min > 540 ? 45 : min > 360 ? 30 : 0; if (pause < need) add('crit', d, `Pause ${pause} Min – bei über ${need === 45 ? '9' : '6'} Std mindestens ${need} Min (§ 4 ArbZG)`);
    }
    const off = (abs || []).find(a => a.user_id === p.id && ['Urlaub', 'Krank'].includes(a.typ) && (a.status || 'genehmigt') === 'genehmigt' && a.von <= d && a.bis >= d);
    if (off) add('warn', d, off.typ === 'Urlaub' ? 'Schicht geplant, obwohl Urlaub genehmigt ist' : 'Schicht geplant, obwohl krank gemeldet');
    if (az && dpSchool(p.id, d, abs)) add('warn', d, `Berufsschultag – nach mehr als 5 Unterrichtsstunden (einmal pro Woche) keine Arbeit mehr${u18 ? ', außerdem kein Dienst vor einem Unterricht ab 9 Uhr (§ 9 JArbSchG)' : ' (§ 15 BBiG)'}`);
  });
  // Ruhezeit zwischen zwei Schichten (inkl. letzter Schicht der Vorwoche)
  const seq = [...before.filter(r => r.user_id === p.id), ...mine].sort((a, b) => dpStartAbs(a) - dpStartAbs(b));
  for (let i = 1; i < seq.length; i++) {
    if (seq[i].datum === seq[i - 1].datum) continue;
    const rest = (dpStartAbs(seq[i]) - dpEndAbs(seq[i - 1])) / 36e5, need = u18 ? 12 : 11;
    if (rest < need) add(u18 || rest < (isQuali() ? 11 : 10) ? 'crit' : 'warn', seq[i].datum, `nur ${String(Math.round(rest * 10) / 10).replace('.', ',')} Std Ruhe seit der letzten Schicht – mindestens ${need} Std${u18 ? ' (§ 13 JArbSchG)' : isQuali() ? ' (§ 5 ArbZG)' : ' (§ 5 ArbZG, Gastronomie: 10 Std mit Ausgleich)'}`);
  }
  const days = Object.keys(byDay).length;
  if (u18) {
    const schoolDays = az ? weekDates(w).map(x => localDate(x)).filter(d => avD(d).getDay() % 6 && dpSchool(p.id, d, abs) && !byDay[d]).length : 0;
    const tot = week + schoolDays * 480;
    if (tot > 2400) add('crit', null, `${fmtMin(tot)} in der Woche${schoolDays ? ` (inkl. ${schoolDays} Schultag${schoolDays === 1 ? '' : 'e'} à 8 Std)` : ''} – unter 18 höchstens 40 Std (§ 8 JArbSchG)`);
    if (days + schoolDays > 5) add('crit', null, `${days + schoolDays} Arbeits- und Schultage – unter 18 nur 5 Tage pro Woche (§ 15 JArbSchG)`);
  } else {
    if (week > 2880) add('crit', null, `${fmtMin(week)} in der Woche – mehr als 48 Std im Schnitt sind nicht erlaubt (§ 3 ArbZG)`);
    if (days > 6) add('crit', null, `${days} Arbeitstage am Stück – ein freier Tag pro Woche ist Pflicht (§ 11 ArbZG)`);
  }
  if (az) { const soll = (+p.wochenstunden || 40) * 60; if (week > soll + 60) add('warn', null, `${fmtMin(week)} geplant, Vertrag sagt ${String(p.wochenstunden || 40).replace('.', ',')} Std – Überstunden bei Azubis müssen vergütet oder ausgeglichen werden (§ 17 BBiG)`); }
  return out;
}
async function dpLoad() {
  dpInit();
  const ds = weekDates(S.dp.w), from = localDate(ds[0]), to = localDate(ds[6]), prev = localDate(new Date(ds[0].getTime() - 864e5));
  const [prof, rows, abs] = await Promise.all([
    q(sb.from('profiles').select('*')),
    q(sb.from('dienstplan').select('*').gte('datum', prev).lte('datum', to).order('datum').order('beginn')),
    q(sb.from('absences').select('user_id,typ,von,bis,status').lte('von', to).gte('bis', from)).catch(() => [])
  ]);
  S.profiles = Object.fromEntries(prof.map(p => [p.id, p]));
  S.dp.before = rows.filter(r => r.datum < from); S.dp.rows = rows.filter(r => r.datum >= from); S.dp.abs = abs;
}
const Dienst = {
  async load() { await dpLoad(); },
  html() {
    const ds = weekDates(S.dp.w), edit = dpCan(), today = localDate();
    const people = edit || !isAzubi() ? dpPeople() : [S.me];
    const visiblePeople = isMA() || isAzubi() ? people.filter(p => p.id === S.me.id || S.dp.rows.some(r => r.user_id === p.id)) : people;
    const absOf = (uid, d) => S.dp.abs.find(a => a.user_id === uid && a.von <= d && a.bis >= d && (a.status || 'genehmigt') !== 'abgelehnt');
    const checks = Object.fromEntries(visiblePeople.map(p => [p.id, dpCheck(p, S.dp.rows, S.dp.abs, S.dp.before)]));
    const nCrit = Object.values(checks).flat().filter(x => x.lvl === 'crit').length, nWarn = Object.values(checks).flat().filter(x => x.lvl === 'warn').length;
    const cell = (p, d) => {
      const list = S.dp.rows.filter(r => r.user_id === p.id && r.datum === d), a = absOf(p.id, d), bad = (checks[p.id] || []).filter(x => x.d === d);
      const tone = bad.some(x => x.lvl === 'crit') ? 'crit' : bad.length ? 'warn' : '';
      return `<div class="rounded-lg p-1.5 text-[12px] leading-tight min-h-[44px] ${edit ? 'cursor-pointer' : ''}" style="background:${tone ? `color-mix(in srgb,var(--st-${tone}) 14%,var(--surface))` : 'var(--sunk)'}${d === today ? ';outline:2px solid var(--accent)' : ''}" ${edit ? `data-dpcell="${p.id}|${d}" role="button" tabindex="0" aria-label="${esc(p.full_name)}, ${fmtDate(d)}"` : ''}>
        ${list.map(r => `<div class="font-semibold tnum" ${edit ? `data-dpedit="${r.id}"` : ''}>${dpHm(r.beginn)}–${dpHm(r.ende)}</div>${r.abteilung ? `<div class="text-muted truncate">${esc(r.abteilung)}</div>` : ''}`).join('')}
        ${a ? `<span class="chip ${ABS_TONE[a.typ] || ''}" style="font-size:10px;padding:1px 6px">${esc(a.typ === 'Berufsschule' ? 'Schule' : a.typ)}</span>` : ''}</div>`;
    };
    const wk = S.dp.w;
    return `${head('Planung', 'Dienstplan', isQuali() ? 'Lernzeiten und Schichten planen – AzubiHub prüft das Arbeitszeitgesetz (Höchstarbeitszeit, Pausen, Ruhezeiten) gleich mit.' : 'Schichten planen – AzubiHub prüft Jugendarbeitsschutz, Arbeitszeitgesetz und Berufsschultage gleich mit.')}
      <div class="flex items-center gap-2"><button class="btn ghost px-3" id="dpPrev" aria-label="Vorige Woche">${svg('left', 'w-4 h-4')}</button><div class="flex-1 text-center"><div class="font-bold text-[16px] tnum">KW ${wk.kw} · ${wk.jahr}</div><div class="text-[12px] text-muted tnum">${weekRange(wk)}</div></div><button class="btn ghost px-3" id="dpNext" aria-label="Nächste Woche">${svg('arrow', 'w-4 h-4')}</button></div>
      ${edit ? `<div class="grid grid-cols-2 gap-2 mt-3"><button class="btn" id="dpNew">+ Schicht</button><button class="btn ghost" id="dpCopy">Vorwoche übernehmen</button></div>` : ''}
      ${nCrit || nWarn ? `<div class="card p-3.5 mt-3" style="border-color:var(--st-${nCrit ? 'crit' : 'warn'})"><div class="font-semibold text-[14px]">${nCrit ? `${nCrit} ${nCrit === 1 ? 'Verstoß' : 'Verstöße'}` : ''}${nCrit && nWarn ? ' · ' : ''}${nWarn ? `${nWarn} Hinweis${nWarn === 1 ? '' : 'e'}` : ''} in dieser Woche</div><div class="text-[12px] text-muted">Details unter dem Plan. Rot = gesetzlich nicht erlaubt, Gelb = nur unter Bedingungen.</div></div>` : S.dp.rows.length ? `<div class="card p-3.5 mt-3 text-[14px]" style="border-color:var(--st-ok)">Keine Verstöße gefunden.</div>` : ''}
      <div class="card mt-3 overflow-x-auto"><div style="min-width:640px">
        <div class="grid gap-1 p-2 text-[11px] font-semibold text-muted" style="grid-template-columns:120px repeat(7,1fr)"><div></div>${ds.map(d => `<div class="text-center tnum">${DAYS[(d.getDay() + 6) % 7].slice(0, 2)} ${ddmm(d)}</div>`).join('')}</div>
        ${visiblePeople.map(p => { const min = S.dp.rows.filter(r => r.user_id === p.id).reduce((s, r) => s + dpDur(r), 0); return `<div class="grid gap-1 px-2 py-1.5 border-t border-line items-stretch" style="grid-template-columns:120px repeat(7,1fr)"><div class="min-w-0 pr-1"><div class="text-[13px] font-semibold truncate">${esc(firstName(p.full_name))} ${esc((p.full_name || '').split(' ').slice(1).join(' ').slice(0, 1))}${(p.full_name || '').includes(' ') ? '.' : ''}</div><div class="text-[11px] text-muted tnum">${fmtMin(min).replace(' Std', ' h')}${p.unter18 ? ' · U18' : ''}</div></div>${ds.map(d => cell(p, localDate(d))).join('')}</div>`; }).join('') || `<div class="p-4 text-[14px] text-muted">Noch keine Personen im Team.</div>`}
      </div></div>
      ${nCrit || nWarn ? `${secTitle('Prüfung')}<div class="card">${visiblePeople.filter(p => checks[p.id].length).map((p, i) => `<div class="p-3.5 ${i ? 'border-t border-line' : ''}"><div class="text-[14px] font-semibold">${esc(p.full_name)}${p.unter18 ? ' <span class="chip">unter 18</span>' : ''}</div>${checks[p.id].map(x => `<div class="flex gap-2 mt-1.5 text-[13px]"><span class="flex-none mt-1" style="width:9px;height:9px;border-radius:50%;background:var(--st-${x.lvl})"></span><span><b class="tnum">${x.d ? fmtD(x.d) : 'Woche'}</b> ${esc(x.t)}</span></div>`).join('')}</div>`).join('')}</div>` : ''}
      <p class="text-[12px] text-muted mt-3">Geprüft werden Tageshöchstarbeitszeit, Pausen, Ruhezeiten, Nachtruhe, 5-Tage-Woche und Berufsschultage für Jugendliche (JArbSchG), Höchstarbeitszeit und Ruhezeit für Volljährige (ArbZG) sowie Überstunden von Azubis. Das ersetzt keine Rechtsberatung; Tarifverträge können abweichen.</p>`;
  },
  bind() {
    const shift = d => { S.dp.w = weekShift(S.dp.w, d); go('dienst'); };
    $('#dpPrev').onclick = () => shift(-1); $('#dpNext').onclick = () => shift(1);
    if ($('#dpNew')) $('#dpNew').onclick = () => dpSheet(null);
    if ($('#dpCopy')) $('#dpCopy').onclick = dpCopyWeek;
    $$('[data-dpedit]').forEach(b => b.onclick = e => { e.stopPropagation(); dpSheet(S.dp.rows.find(r => r.id === b.dataset.dpedit)); });
    $$('[data-dpcell]').forEach(b => { const open = () => { const [u, d] = b.dataset.dpcell.split('|'); dpSheet(null, u, d); }; b.onclick = open; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }; });
  }
};
function dpSheet(row, uid, datum) {
  const people = dpPeople(), r = row || { user_id: uid || people[0]?.id, datum: datum || localDate(), beginn: '08:00', ende: '16:30', pause_min: 30 };
  const abts = [...new Set([...(S.content.abteilungen || []), ...Object.values(S.profiles).map(p => p.abteilung).filter(Boolean)])];
  sheetShell(row ? 'Schicht bearbeiten' : 'Neue Schicht', `<form id="dpForm" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="dpU">Person</label><select id="dpU" class="field">${people.map(p => `<option value="${p.id}" ${p.id === r.user_id ? 'selected' : ''}>${esc(p.full_name)}${p.unter18 ? ' (unter 18)' : ''}</option>`).join('')}</select></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="dpD">Datum</label><input id="dpD" type="date" class="field" value="${r.datum}" required></div><div><label class="lbl" for="dpP">Pause (Min)</label><input id="dpP" type="number" min="0" max="240" step="5" class="field" value="${r.pause_min}"></div></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="dpB">Beginn</label><input id="dpB" type="time" class="field" value="${dpHm(r.beginn)}" required></div><div><label class="lbl" for="dpE">Ende</label><input id="dpE" type="time" class="field" value="${dpHm(r.ende)}" required></div></div>
    <div><label class="lbl" for="dpA">Abteilung</label><input id="dpA" class="field" list="dpAl" maxlength="60" value="${esc(r.abteilung || S.profiles[r.user_id]?.abteilung || '')}"><datalist id="dpAl">${abts.map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
    <div><label class="lbl" for="dpN">Notiz</label><input id="dpN" class="field" maxlength="300" value="${esc(r.notiz || '')}"></div>
    <div id="dpWarn"></div>
    <button class="btn">Speichern</button></form>${row ? '<button id="dpDel" class="btn danger w-full mt-4">Schicht löschen</button>' : ''}`);
  const val = () => ({ user_id: $('#dpU').value, datum: $('#dpD').value, beginn: $('#dpB').value, ende: $('#dpE').value, pause_min: +$('#dpP').value || 0, abteilung: $('#dpA').value.trim() || null, notiz: $('#dpN').value.trim() || null });
  const preview = () => {
    const v = val(), p = S.profiles[v.user_id]; if (!p || !v.datum || !v.beginn || !v.ende) return;
    const rows = [...S.dp.rows.filter(x => x.id !== row?.id), { ...v, id: '_neu' }];
    const res = dpCheck(p, rows, S.dp.abs, S.dp.before).filter(x => !x.d || x.d === v.datum);
    $('#dpWarn').innerHTML = res.length ? `<div class="rounded-xl p-3 text-[13px] flex flex-col gap-1" style="background:var(--sunk)">${res.map(x => `<div class="flex gap-2"><span class="flex-none mt-1" style="width:9px;height:9px;border-radius:50%;background:var(--st-${x.lvl})"></span><span>${esc(x.t)}</span></div>`).join('')}</div>` : `<div class="text-[13px]" style="color:var(--st-ok)">${fmtMin(dpDur(v))} Arbeit · keine Verstöße</div>`;
  };
  $$('#dpForm input, #dpForm select').forEach(i => i.oninput = preview); preview();
  $('#dpForm').onsubmit = async e => {
    e.preventDefault();
    const v = val();
    if (v.datum < localDate(weekDates(S.dp.w)[0]) || v.datum > localDate(weekDates(S.dp.w)[6])) S.dp.w = isoWeek(avD(v.datum));
    if (row) await q(sb.from('dienstplan').update(v).eq('id', row.id)); else await q(sb.from('dienstplan').insert(v));
    closeSheet(); toast('Gespeichert'); go('dienst');
  };
  if ($('#dpDel')) $('#dpDel').onclick = () => confirmInline($('#dpDel'), async () => { await q(sb.from('dienstplan').delete().eq('id', row.id)); closeSheet(); toast('Gelöscht'); go('dienst'); });
}
async function dpCopyWeek() {
  const ds = weekDates(S.dp.w), from = localDate(new Date(ds[0].getTime() - 7 * 864e5)), to = localDate(new Date(ds[6].getTime() - 7 * 864e5));
  const prev = await q(sb.from('dienstplan').select('*').gte('datum', from).lte('datum', to));
  if (!prev.length) return toast('In der Vorwoche gibt es keine Schichten.');
  const have = new Set(S.dp.rows.map(r => r.user_id + '|' + r.datum));
  const out = prev.map(r => ({ user_id: r.user_id, datum: localDate(new Date(avD(r.datum).getTime() + 7 * 864e5)), beginn: r.beginn, ende: r.ende, pause_min: r.pause_min, abteilung: r.abteilung, notiz: r.notiz })).filter(r => !have.has(r.user_id + '|' + r.datum) && S.profiles[r.user_id]?.aktiv !== false);
  if (!out.length) return toast('Diese Woche ist schon belegt.');
  await q(sb.from('dienstplan').insert(out)); toast(`${out.length} Schichten übernommen`); go('dienst');
}
function dienstTileHTML() {
  const H = S.home || {}, mine = (H.dpMine || []).filter(r => r.datum >= localDate()).sort((a, b) => (a.datum + a.beginn).localeCompare(b.datum + b.beginn))[0];
  const chip = mine ? ['', `${mine.datum === localDate() ? 'heute' : fmtD(mine.datum)} ${dpHm(mine.beginn)}`] : dpCan() && H.dpCrit ? ['crit', `${H.dpCrit} Verstöße`] : ['', 'Woche'];
  return `<button class="card modtile" data-go="dienst">
    <div class="flex items-center justify-between gap-2"><span class="ico">${svg('shift')}</span><span class="chip ${chip[0]} tnum">${chip[1]}</span></div>
    <div><div class="font-display font-bold text-[16px] leading-snug">Dienstplan</div><div class="text-[13px] text-muted mt-0.5">${isQuali() && !isMA() ? (dpCan() ? 'Lernzeiten und Schichten mit ArbZG-Prüfung' : 'Deine Lernzeiten') : dpCan() ? 'Schichten mit JArbSchG-Prüfung' : 'Deine Schichten'}</div></div></button>`;
}

/* ---------- Frühwarnung: Hinweis, wenn sich bei einem Azubi Warnzeichen häufen ---------- */
function riskOf(p) {
  const H = S.home, a = ampelData(p), why = []; let s = 0;
  const addR = (pts, t) => { s += pts; why.push(t); };
  if (a.miss >= 2) addR(25, `${a.miss} Wochen ohne Bericht`); else if (a.miss === 1) addR(10, '1 Woche ohne Bericht');
  const se = (H.schE || []).filter(e => e.azubi_id === p.id);
  const un = se.filter(e => e.typ === 'fehltag' && e.status === 'unentschuldigt').length, of = se.filter(e => e.typ === 'fehltag' && schSt(e) === 'offen').length, vs = se.filter(e => e.typ === 'verspaetung').length;
  if (un) addR(Math.min(30, un * 15), un === 1 ? '1 unentschuldigter Fehltag' : `${un} unentschuldigte Fehltage`);
  if (of) addR(Math.min(10, of * 5), `${of} Fehltag${of === 1 ? '' : 'e'} ungeklärt`);
  if (vs >= 3) addR(10, `${vs} Verspätungen`);
  const no = (H.schN || []).filter(n => n.azubi_id === p.id), avg = no.length ? no.reduce((x, n) => x + +n.note, 0) / no.length : null;
  if (avg !== null && avg >= 4) addR(20, `Notenschnitt ${schNote(avg)}`); else if (no.some(n => +n.note >= 5)) addR(15, 'Note 5 oder 6');
  if (a.krankTage >= 10) addR(15, `${a.krankTage} Krankheitstage`); else if (a.krankTage >= 5) addR(8, `${a.krankTage} Krankheitstage`);
  if (H.talks) { const last = H.talks.filter(t => t.user_id === p.id).map(t => t.datum).sort().pop(), inHouse = p.start_datum ? -daysUntil(p.start_datum) : 999;
    if (inHouse > 60 && (!last || -daysUntil(last) > 90)) addR(10, last ? `letztes Gespräch vor ${-daysUntil(last)} Tagen` : 'noch kein Gespräch festgehalten'); }
  const dc = (H.dpU || {})[p.id]; if (dc) addR(10, `${dc} Dienstplan-Verstöße in 4 Wochen`);
  return { s: Math.min(100, s), why };
}
function riskHTML() {
  if (!isAusbilder() || !qAuswertungAn()) return '';
  const rows = azubis().filter(p => canSchool(p)).map(p => ({ p, r: riskOf(p) })).filter(x => x.r.s >= 25).sort((a, b) => b.r.s - a.r.s);
  if (!rows.length) return '';
  return `${secTitle('Frühwarnung', `<span class="chip ${rows.some(x => x.r.s >= 50) ? 'crit' : 'warn'} tnum">${rows.length}</span>`)}
    <div class="card">${rows.slice(0, 5).map(({ p, r }, i) => `<div class="p-3.5 ${i ? 'border-t border-line' : ''}"><div class="flex items-center gap-3">${avatar(p, 34)}<div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(p.full_name)}</div><div class="text-[12px] text-muted">${r.s >= 50 ? 'deutliche Warnzeichen' : 'erste Warnzeichen'}</div></div><span class="chip ${r.s >= 50 ? 'crit' : 'warn'} tnum">${r.s}</span></div>
      <div class="flex flex-wrap gap-1.5 mt-2">${r.why.map(w => `<span class="chip" style="font-size:11px">${esc(w)}</span>`).join('')}</div>
      <div class="grid grid-cols-2 gap-2 mt-2.5">${can('gespraeche') ? `<button class="btn py-1.5 text-[13px]" data-risktalk="${p.id}">Gespräch planen</button>` : ''}<button class="btn ghost py-1.5 text-[13px]" data-ampel="${p.id}">Azubi öffnen</button></div></div>`).join('')}</div>
    <p class="text-[12px] text-muted mt-2">Ein Hinweis, kein Urteil: Punkte aus fehlenden Berichten, Fehltagen und Noten der Schule, Krankheitstagen, fehlenden Gesprächen und Dienstplan-Verstößen. Früh reden hilft, Ausbildungsabbrüche zu vermeiden.</p>`;
}

/* ---------- Anonymer Stimmungs-Check ---------- */
const MOODS = [[1, '😣', 'schlecht'], [2, '🙁', 'eher schlecht'], [3, '😐', 'geht so'], [4, '🙂', 'gut'], [5, '😄', 'super']];
const moodOf = v => MOODS[Math.max(0, Math.min(4, Math.round(v) - 1))];
function moodAskHTML() {
  if (!isAzubi() || !S.home?.moodOpen || !qAuswertungAn()) return '';
  return `<section class="card p-4 mt-4" aria-labelledby="moodH"><h2 id="moodH" class="font-semibold text-[15px]">Wie geht es dir gerade in der Ausbildung?</h2><p class="text-[12px] text-muted">Einmal im Monat, völlig anonym. Der Betrieb sieht nur den Durchschnitt aller Azubis – und erst ab 3 Antworten.</p>
    <div class="grid grid-cols-5 gap-2 mt-3">${MOODS.map(([v, e, l]) => `<button class="card py-2 flex flex-col items-center gap-0.5" data-mood="${v}" aria-label="${l}"><span style="font-size:26px;line-height:1">${e}</span><span class="text-[10px] text-muted">${l}</span></button>`).join('')}</div></section>`;
}
function moodStaffHTML() {
  const list = S.home?.moodAus || []; if (!isAusbilder() || !list.length || !qAuswertungAn()) return '';
  const [cur, prev] = list, m = moodOf(cur.schnitt), trend = prev ? cur.schnitt - prev.schnitt : 0;
  const mon = d => new Date(d + 'T12:00:00').toLocaleDateString(LOCALE(), { month: 'long' });
  return `${secTitle('Stimmung der Azubis', '<span class="text-[12px] text-muted">anonym</span>')}
    <div class="card p-4 flex items-center gap-3"><span style="font-size:34px;line-height:1">${m[1]}</span><div class="flex-1 min-w-0"><div class="text-[15px] font-semibold"><span class="tnum">${String(cur.schnitt).replace('.', ',')}</span> von 5 im ${mon(cur.monat)}</div><div class="text-[12px] text-muted tnum">${cur.anzahl} Antworten${prev ? ` · ${trend > 0.2 ? 'besser' : trend < -0.2 ? 'schlechter' : 'gleich'} als im ${mon(prev.monat)} (${String(prev.schnitt).replace('.', ',')})` : ''}</div></div></div>
    <div class="flex gap-1 mt-2 items-end h-10" aria-hidden="true">${list.slice(0, 12).reverse().map(x => `<div class="flex-1 rounded-sm" title="${mon(x.monat)}: ${x.schnitt}" style="height:${x.schnitt * 20}%;background:var(--st-${x.schnitt >= 3.5 ? 'ok' : x.schnitt >= 2.5 ? 'warn' : 'crit'})"></div>`).join('')}</div>`;
}

/* ---------- Feedback zu Stationen ---------- */
function fbOpen() {
  const H = S.home || {}, done = new Set((H.myFb || []).map(f => f.station_id)), today = localDate(), old = localDate(new Date(Date.now() - 120 * 864e5));
  return (H.myPlan || []).filter(s => s.bis && s.bis <= today && s.bis >= old && !done.has(s.id));
}
function fbAskHTML() {
  if (!isAzubi() || !qAuswertungAn()) return ''; const st = fbOpen()[0]; if (!st) return '';
  return `<button class="card w-full p-4 mt-3 text-left flex items-center gap-3" data-fbst="${st.id}"><span style="font-size:24px">⭐</span><div class="flex-1 min-w-0"><div class="font-semibold text-[15px]">Wie war deine Zeit in ${esc(st.abteilung)}?</div><div class="text-[12px] text-muted">Kurzes Feedback in 30 Sekunden – die Ausbildungsleitung sieht es ohne deinen Namen.</div></div>${svg('arrow', 'w-4 h-4 text-muted')}</button>`;
}
function fbSheet(st) {
  const stars = (k, l) => `<div><div class="lbl">${l}</div><div class="flex gap-1" role="radiogroup" aria-label="${l}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="text-[28px] leading-none" style="color:var(--line)" role="radio" aria-checked="false" aria-label="${n} von 5" data-star="${k}" data-n="${n}">★</button>`).join('')}</div></div>`;
  sheetShell(`Feedback: ${st.abteilung}`, `<form id="fbForm" class="card p-4 flex flex-col gap-4">
    ${stars('anleitung', 'Wurdest du gut angeleitet?')}${stars('aufgaben', 'Hast du Neues gelernt und sinnvolle Aufgaben bekommen?')}${stars('team', 'Wie hast du dich im Team aufgenommen gefühlt?')}
    <div><label class="lbl" for="fbK">Was sollte besser werden? <span class="font-normal text-muted">(freiwillig)</span></label><textarea id="fbK" class="field" rows="3" maxlength="1000"></textarea></div>
    <button class="btn">Abschicken</button><p class="text-[12px] text-muted">Dein Name wird nicht angezeigt. Bei sehr wenigen Azubis pro Abteilung kann man aber Rückschlüsse ziehen – schreib nur, was du auch so sagen würdest.</p></form>`);
  const val = {};
  $$('[data-star]').forEach(b => b.onclick = () => { const k = b.dataset.star, n = +b.dataset.n; val[k] = n; $$(`[data-star="${k}"]`).forEach(x => { const on = +x.dataset.n <= n; x.style.color = on ? 'var(--brass)' : 'var(--line)'; x.setAttribute('aria-checked', +x.dataset.n === n); }); });
  $('#fbForm').onsubmit = async e => {
    e.preventDefault();
    if (!val.anleitung || !val.aufgaben || !val.team) return toast('Bitte alle drei Fragen mit Sternen bewerten.');
    await q(sb.from('stationen_feedback').insert({ station_id: st.id, abteilung: st.abteilung, ...val, kommentar: $('#fbK').value.trim() || null }));
    (S.home.myFb ||= []).push({ station_id: st.id }); closeSheet(); toast('Danke für dein Feedback!'); render();
  };
}
function fbStaffHTML() {
  const list = S.home?.fbAus || []; if (!isAusbilder() || !list.length || !qAuswertungAn()) return '';
  const n = list.reduce((s, x) => s + x.anzahl, 0);
  return `<button class="card w-full flex items-center gap-3 p-3.5 mt-3 text-left" id="fbAll"><span style="font-size:20px">⭐</span><span class="flex-1 min-w-0"><span class="block text-[14px] font-semibold">Feedback zu den Stationen</span><span class="block text-[12px] text-muted tnum">${n} Bewertung${n === 1 ? '' : 'en'} aus ${list.length} Abteilung${list.length === 1 ? '' : 'en'}</span></span>${svg('arrow', 'w-4 h-4 text-muted')}</button>`;
}
function fbStaffSheet() {
  const list = S.home?.fbAus || [], bar = (l, v) => `<div class="mt-2"><div class="flex justify-between text-[12px]"><span class="text-muted">${l}</span><b class="tnum">${String(v).replace('.', ',')}</b></div><div class="bar mt-1 ${v < 3 ? 'brass' : ''}"><i style="width:${v * 20}%"></i></div></div>`;
  sheetShell('Feedback zu den Stationen', `<p class="text-[13px] text-muted -mt-1 mb-3">Durchschnitt von 1 bis 5, ohne Namen. Grundlage für bessere Einsatzplanung und Anleitung.</p>
    <div class="flex flex-col gap-3">${list.map(x => `<details class="card"><summary class="p-4 flex items-center gap-3"><div class="flex-1 min-w-0"><div class="font-semibold text-[15px]">${esc(x.abteilung || 'ohne Abteilung')}</div><div class="text-[12px] text-muted tnum">${x.anzahl} Bewertung${x.anzahl === 1 ? '' : 'en'}</div></div><span class="chip ${Math.min(x.anleitung, x.aufgaben, x.team) < 3 ? 'warn' : 'ok'} tnum">${String(Math.round((x.anleitung + x.aufgaben + x.team) / 3 * 10) / 10).replace('.', ',')}</span>${svg('chev', 'chev w-4 h-4 text-muted')}</summary>
      <div class="px-4 pb-4">${bar('Anleitung', x.anleitung)}${bar('Aufgaben & Lernen', x.aufgaben)}${bar('Team', x.team)}
      ${(x.kommentare || []).length ? `<div class="mt-3 flex flex-col gap-2">${x.kommentare.slice(0, 10).map(k => `<div class="rounded-xl p-3 text-[13px]" style="background:var(--sunk)">„${esc(k)}“</div>`).join('')}</div>` : ''}</div></details>`).join('')}</div>`);
}

/* ---------- Lernfeld-Training ---------- */
function lfTrainHTML(p) {
  if (!isAzubi()) return '';
  const lfs = schLernfelder(p); if (!lfs.length) return '';
  const st = S.school && S.school.azubi === p.id ? schLfStand(p, S.school.lfs) : null;
  const cur = lfs.filter(l => st?.by[l.nr]?.status === 'laeuft' || l.lehrjahr === (p.lehrjahr || 1));
  const list = (cur.length ? cur : lfs).slice(0, 8);
  return `${secTitle('Lernfelder üben', '<span class="text-[12px] text-muted">Fragen passend zum Unterricht</span>')}
    <div class="card">${list.map((l, i) => `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-lfex="${l.nr}"><span class="chip accent tnum flex-none">LF ${l.nr}</span><span class="flex-1 min-w-0 text-[14px] font-semibold truncate">${esc(l.titel)}</span>${st?.by[l.nr]?.status === 'laeuft' ? '<span class="chip brass flex-none">läuft</span>' : ''}${svg('arrow', 'w-4 h-4 text-muted flex-none')}</button>`).join('')}</div>
    <p class="text-[12px] text-muted mt-2">10 Übungsfragen zum Lernfeld und zu den passenden Rahmenplan-Positionen. Falsche Antworten kommen später als Lernkarten wieder. Keine echten IHK-Prüfungsaufgaben.</p>`;
}
function lfExam(p, nr) {
  const lf = schLfByNr(p, nr); if (!lf) return;
  S.lfExamNr = lf.nr;
  openExam('lernfeld', null, schLfMatch(lf, p).map(r => r.nr), (lf.stichworte || []).filter(k => k.length > 3), `LF ${lf.nr} · ${lf.titel}`);
}

/* ---------- Eltern-Zugang (nur unter 18, vom Azubi selbst freigegeben) ---------- */
const elternUrl = tok => `${location.origin}${location.pathname}?eltern=${tok}`;
function elternHTML() {
  if (!isAzubi() || !S.me.unter18 || isQuali()) return '';
  const list = (S.home?.eltern || []).filter(e => !e.widerrufen && e.gueltig_bis >= localDate());
  return `${secTitle('Zugang für deine Eltern', '<button id="elNew" class="text-[13px] font-semibold text-accent">+ Link erstellen</button>')}
    ${list.length ? `<div class="card">${list.map((e, i) => `<div class="p-3.5 flex items-center gap-3 ${i ? 'border-t border-line' : ''}"><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(e.name || 'Eltern')}</div><div class="text-[12px] text-muted tnum">gültig bis ${fmtDate(e.gueltig_bis)}${e.last_access ? ' · zuletzt geöffnet ' + fmtDate(e.last_access) : ' · noch nicht geöffnet'}</div></div><button class="btn ghost py-1.5 px-3 text-[13px]" data-elcopy="${e.token}">Link</button><button class="btn danger py-1.5 px-3 text-[13px]" data-eloff="${e.id}">Beenden</button></div>`).join('')}</div>`
      : `<div class="card p-4 text-[14px] text-muted">Du entscheidest: Mit einem Link sehen deine Eltern deinen Ausbildungsstand, Fehltage der Schule, Prüfungstermine und die Kontaktdaten deiner Ausbilderin oder deines Ausbilders – aber keine Inhalte deiner Berichte und keine Nachrichten. Du kannst den Link jederzeit beenden.</div>`}`;
}
function elternBind() {
  if ($('#elNew')) $('#elNew').onclick = () => {
    sheetShell('Link für deine Eltern', `<form id="elForm" class="card p-4 flex flex-col gap-3"><div><label class="lbl" for="elName">Für wen?</label><input id="elName" class="field" maxlength="120" placeholder="z. B. Mama und Papa"></div>
      <label class="flex items-start gap-2 text-[14px]"><input type="checkbox" id="elOk" style="accent-color:var(--accent);width:20px;height:20px;flex:none"> Ich bin einverstanden, dass die Person mit diesem Link meinen Ausbildungsstand, Fehltage der Berufsschule, Prüfungstermine und die Kontaktdaten meines Ausbilders sieht.</label>
      <button class="btn">Link erstellen</button><p class="text-[12px] text-muted">Der Link gilt ein Jahr. Inhalte deiner Wochenberichte, Noten im Einzelnen und Nachrichten sind nicht sichtbar.</p></form>`);
    $('#elForm').onsubmit = async e => {
      e.preventDefault(); if (!$('#elOk').checked) return toast('Bitte bestätige dein Einverständnis.');
      const row = await q(sb.from('eltern_freigaben').insert({ name: $('#elName').value.trim() || null }).select().single());
      (S.home.eltern ||= []).push(row); closeSheet(); elternShare(row.token); render();
    };
  };
  $$('[data-elcopy]').forEach(b => b.onclick = () => elternShare(b.dataset.elcopy));
  $$('[data-eloff]').forEach(b => b.onclick = () => confirmInline(b, async () => { await q(sb.from('eltern_freigaben').update({ widerrufen: true }).eq('id', b.dataset.eloff)); S.home.eltern = (S.home.eltern || []).filter(x => x.id !== b.dataset.eloff); toast('Zugang beendet'); render(); }));
}
async function elternShare(tok) {
  const url = elternUrl(tok);
  if (navigator.share) { try { await navigator.share({ title: 'Meine Ausbildung', text: 'Hier kannst du sehen, wie meine Ausbildung läuft:', url }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Link kopiert'); } catch { sheetShell('Link für deine Eltern', `<div class="card p-4"><input class="field" readonly value="${esc(url)}" onclick="this.select()"></div>`); }
}
async function showEltern(tok) {
  const el = $('#careerScreen'); el.hidden = false; $('#authScreen').hidden = true; $('#appScreen').hidden = true;
  el.innerHTML = skeleton();
  const { data, error } = await sb.rpc('eltern_view', { p_token: tok });
  if (error || !data) { el.innerHTML = `<div class="card p-5 mt-8"><h1 class="text-[22px] font-bold">Link nicht gültig</h1><p class="text-muted mt-1">Der Zugang ist abgelaufen oder wurde beendet. Bitte frag dein Kind nach einem neuen Link.</p></div>`; return; }
  const D = data, a = D.azubi, names = EXN(a.beruf), aus = D.ausbilder;
  const ex = [[names[0], a.zp], [names[1], a.ap]];
  const unent = (D.fehltage || []).filter(f => f.status === 'unentschuldigt').length;
  el.innerHTML = `<div class="pt-4 pb-3 eyebrow">Zugang für Eltern${S.demo ? ' · Demo mit Beispieldaten' : ''}</div>
    <section class="keycard p-5"><div class="sub text-[13px]">${esc(D.betrieb)}</div><h1 class="text-[26px] font-bold leading-tight mt-1" translate="no">${esc(a.name)}</h1><div class="sub text-[14px] mt-1">${esc(a.beruf || '')} · ${a.lehrjahr || 1}. Ausbildungsjahr${D.vertrag?.beginn ? ` · seit ${fmtDate(D.vertrag.beginn)}` : a.start ? ` · seit ${fmtDate(a.start)}` : ''}</div></section>
    <h2 class="text-[18px] font-bold mt-6 mb-2">Ausbildungsstand</h2>
    <div class="grid grid-cols-2 gap-2"><div class="card p-3.5"><div class="text-[12px] text-muted font-semibold">Wochenberichte abgezeichnet</div><div class="text-[24px] font-bold tnum">${D.berichte.abgezeichnet}</div>${D.berichte.eingereicht ? `<div class="text-[12px] text-muted tnum">${D.berichte.eingereicht} warten auf Prüfung</div>` : ''}</div>
      <div class="card p-3.5"><div class="text-[12px] text-muted font-semibold">Fehltage Schule (120 Tage)</div><div class="text-[24px] font-bold tnum" style="color:var(--st-${unent ? 'crit' : (D.fehltage || []).length ? 'warn' : 'ok'})">${(D.fehltage || []).length}</div>${unent ? `<div class="text-[12px] tnum" style="color:var(--st-crit)">${unent} unentschuldigt</div>` : ''}</div></div>
    ${(D.fehltage || []).length ? `<div class="card mt-2">${D.fehltage.slice(0, 10).map((f, i) => `<div class="flex items-center gap-3 p-3 ${i ? 'border-t border-line' : ''}"><span class="text-[14px] tnum flex-1">${fmtDate(f.datum)}</span><span class="chip ${(SCH_STATUS[f.status || 'offen'] || ['', ''])[0]}">${(SCH_STATUS[f.status || 'offen'] || ['', f.status])[1]}</span></div>`).join('')}</div>` : ''}
    <h2 class="text-[18px] font-bold mt-6 mb-2">Prüfungen</h2>
    <div class="grid grid-cols-2 gap-2">${ex.map(([l, d]) => { const n = daysUntil(d); return `<div class="card p-3.5"><div class="text-[12px] text-muted font-semibold">${esc(l)}</div><div class="text-[18px] font-bold tnum">${d ? fmtDate(d) : '–'}</div><div class="text-[12px] text-muted">${n === null ? 'noch kein Termin' : n < 0 ? 'abgelegt' : `in ${n} Tagen`}</div></div>`; }).join('')}</div>
    ${D.vertrag?.ende ? `<p class="text-[13px] text-muted mt-2">Ausbildungsende laut Vertrag: ${fmtDate(D.vertrag.ende)}</p>` : ''}
    ${aus ? `<h2 class="text-[18px] font-bold mt-6 mb-2">Ansprechperson im Betrieb</h2><div class="card p-4"><div class="font-semibold text-[15px]" translate="no">${esc(aus.name)}</div>${aus.position ? `<div class="text-[13px] text-muted">${esc(aus.position)}</div>` : ''}<div class="flex flex-wrap mt-1 text-[14px]" style="column-gap:16px">${aus.telefon ? `<a class="text-accent font-semibold" href="tel:${esc(aus.telefon.replace(/[^\d+]/g, ''))}">${esc(aus.telefon)}</a>` : ''}${aus.email ? `<a class="text-accent font-semibold" href="mailto:${esc(aus.email)}">${esc(aus.email)}</a>` : ''}</div></div>` : ''}
    <p class="text-[12px] text-muted mt-6 mb-10">Diesen Zugang hat ${esc(firstName(a.name))} selbst freigegeben (gültig bis ${fmtDate(D.gueltig_bis)}) und kann ihn jederzeit beenden. Inhalte der Wochenberichte, Noten im Einzelnen und Nachrichten sind nicht sichtbar. Bereitgestellt mit AzubiHub.</p>`;
}
