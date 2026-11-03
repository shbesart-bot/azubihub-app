/* Stufenwerk · Qualifizierungsmodus, Teil 6: Organisation
   Verwaltung der Teilnehmenden, Grundkompetenz-Phase (GK), Klassenbuch, Trainer-Einsatzplan, Export mit Auswahl und Zeitraum.
   Sichtbarkeit: Trainer sehen nur ihre Gruppen und Gruppen mit aktiver Vertretung (die Datenbank erzwingt dasselbe).
   Wird nach quali5.js und vor dem Hauptskript geladen. */

(() => {
  const css = `
  .ein-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
  .ein-cal .wd{font-size:11px;font-weight:700;color:var(--muted);text-align:center;padding:2px 0}
  .ein-cal button{min-height:58px;border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:4px 3px;display:flex;flex-direction:column;align-items:stretch;gap:2px;font:inherit;text-align:left}
  .ein-cal button.we{background:var(--sunk)}
  .ein-cal button.today{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
  .ein-cal button.out{visibility:hidden}
  .ein-cal .dn{font-size:11.5px;font-weight:700;color:var(--muted)}
  .ek{display:inline-block;font-size:10.5px;font-weight:700;line-height:1;padding:3px 4px;border-radius:5px;color:#fff;text-align:center}
  .ek-W{background:#8a500b}.ek-S{background:#0f5c5f}.ek-O{background:#3b5bb5}.ek-ORG{background:#6b6b6b}
  .ek.half{opacity:.72}
  .ein-tab{width:100%;border-collapse:collapse;font-size:13px}
  .ein-tab th,.ein-tab td{padding:8px 6px;border-top:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
  .ein-tab th:first-child,.ein-tab td:first-child{text-align:left}
  .ein-tab thead th{border-top:0;font-size:12px;color:var(--muted)}
  .ein-pick{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
  .ein-pick .seg button{padding:6px 12px}
  .exp-list label{display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-top:1px solid var(--line);cursor:pointer}
  .exp-list label:first-child{border-top:0}
  .exp-list input{margin-top:3px;width:18px;height:18px;accent-color:var(--accent)}
  .tabbar button span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gk-bar{height:6px;border-radius:3px;background:var(--line);overflow:hidden}.gk-bar i{display:block;height:100%;background:var(--accent)}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  try { Q_ICONS.orga = '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 4.5v-2M16 4.5v-2M7.5 13.5h4M7.5 16.5h7"/>'; } catch {}
})();

const GK_STAT = { geplant: ['', 'Geplant'], laeuft: ['brass', 'Läuft'], verlaengert: ['warn', 'Verlängert'], bestanden: ['ok', 'Bestanden'], uebergang: ['ok', 'In Maßnahme'], abgebrochen: ['crit', 'Abgebrochen'] };
const GK_OFFEN = ['geplant', 'laeuft', 'verlaengert'];
const GK_SCHWER = ['Deutsch und Sprache', 'Mathematik', 'Technische Grundlagen', 'Arbeitssicherheit', 'Digitale Grundlagen', 'Lern- und Arbeitstechniken'];
const EIN_ART = { W: ['W', 'Werkstatt'], S: ['S', 'Schulungsraum'], O: ['O', 'Online'], ORG: ['Org', 'Organisatorisch'] };
const TN_STAT = { aktiv: ['ok', 'Aktiv'], pausiert: ['warn', 'Pausiert'], abgebrochen: ['crit', 'Abgebrochen'], abgeschlossen: ['', 'Abgeschlossen'] };
const orgTabs = () => [['verw', 'Verwaltung'], ['gk', 'GK'], ['kb', 'Klassenbuch'], ['ein', 'Einsatzplan'], ['exp', 'Export']];
const orgBetrieb = () => S.betrieb?.id || S.me?.betrieb_id;
const orgStaff = () => Object.values(S.profiles).filter(p => ['ausbilder', 'admin'].includes(p.role) && p.aktiv !== false).sort((a, b) => a.full_name.localeCompare(b.full_name));
/* Gruppen, die ich verwalten darf: Koordination alle, Trainer eigene und aktive Vertretung */
const orgMyGroups = () => { const g = S.qgr?.g || [], me = S.me?.id; return (qCanTeam() ? g : g.filter(x => qMyGroupIds().includes(x.id))).slice().sort((a, b) => (b.trainer_id === me) - (a.trainer_id === me) || a.name.localeCompare(b.name)); };
const orgGName = g => g.name + (g.trainer_id !== S.me?.id && !qCanTeam() ? ' (Vertretung)' : '');
const orgGroupOk = gid => qCanTeam() || (!!gid && qMyGroupIds().includes(gid));
const orgMembers = gid => Object.keys(S.qgr?.tn || {}).filter(id => S.qgr.tn[id] === gid).map(id => S.profiles[id]).filter(p => p && p.aktiv !== false).sort((a, b) => a.full_name.localeCompare(b.full_name));
const orgDays = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const orgAddMonths = (d, n) => { const x = new Date(d + 'T12:00:00'), day = x.getDate(); x.setMonth(x.getMonth() + n); if (x.getDate() < day) x.setDate(0); return localDate(x); };
const orgKw = d => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7)); const w1 = new Date(x.getFullYear(), 0, 4); return 1 + Math.round(((x - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
const orgWd = d => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(d + 'T12:00:00').getDay()];
const orgAscii = t => String(t).replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
const orgNum = n => String(Math.round(n * 10) / 10).replace('.', ',');
const orgGkName = r => r.azubi_id && S.profiles[r.azubi_id] ? S.profiles[r.azubi_id].full_name : [r.vorname, r.nachname].filter(Boolean).join(' ');
async function orgFetch(table, col, von, bis, sel = '*') {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let qy = sb.from(table).select(sel);
    if (col && von) qy = qy.gte(col, von);
    if (col && bis) qy = qy.lte(col, bis);
    const { data, error } = await qy.range(from, from + 999);
    if (error) throw error;
    out.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  return out;
}

/* =====================================================================
   Reiter „Organisation“ in der unteren Leiste (nur Trainer und Koordination)
   ===================================================================== */
const qOrgVisible = () => { try { qIcons(); return isQuali() && !!S.me && !isAzubi() && !isMA(); } catch { return false; } };
/* Eigene Hauptreiter: Teilnehmer/Gruppen (Verwaltung), Praktika, GK, Klassenbuch, Einsatzplan */
const ORG_VIEWS = {
  qverw: ['Verwaltung', 'Teilnehmende, Gruppen und Kurse – alles an einem Ort.'],
  qpk: ['Praktika', 'Praktika im Werk planen, Rückmeldungen einholen und freigeben.'],
  qgk: ['Grundkompetenz (GK)', 'Drei Monate Grundkompetenz nach dem Einstellungstest.'],
  qkb: ['Klassenbuch', 'Dokumentation der Trainingsdurchführung je Gruppe und Woche.'],
  qein: ['Einsatzplan', 'Wo du eingesetzt warst – mit Zähler für Audits.']
};
const ORG_VERW_TABS = [['verw', 'Teilnehmende'], ['gruppen', 'Gruppen'], ['kurse', 'Kurse'], ['exp', 'Export']];
const orgTabOf = v => v === 'qverw' ? (ORG_VERW_TABS.some(t => t[0] === S.org.vtab) ? S.org.vtab : 'verw') : { qpk: 'pk', qgk: 'gk', qkb: 'kb', qein: 'ein' }[v];
function orgViewOf(v) {
  return {
    async load() {
      qIcons(); S.org ||= {}; S.org.tab = orgTabOf(v);
      await Promise.all([qGroupsLoad(), qLoadAll()]);
      await orgLoad();
    },
    html() {
      const t = S.org.tab;
      return `<h1 class="text-[26px] font-bold mt-1">${ORG_VIEWS[v][0]}</h1><p class="text-[14px] text-muted mt-1">${ORG_VIEWS[v][1]}</p>
        ${v === 'qverw' ? `<div class="seg mt-4 mb-1">${ORG_VERW_TABS.map(([k, l]) => `<button aria-pressed="${t === k}" data-otab="${k}">${l}</button>`).join('')}</div>` : ''}
        ${t === 'verw' ? orgVerwHTML() : t === 'gruppen' ? qGruppenHTML() : t === 'kurse' ? qKurseHTML() : t === 'exp' ? orgExpHTML() : t === 'pk' ? qPraktikaHTML() : t === 'gk' ? orgGkHTML() : t === 'kb' ? orgKbHTML() : orgEinHTML()}`;
    },
    bind() {
      $$('[data-otab]').forEach(b => b.onclick = () => { S.org.vtab = b.dataset.otab; go('qverw'); });
      const t = S.org.tab;
      ({ verw: orgVerwBind, gruppen: qGruppenBind, kurse: qKurseBind, exp: orgExpBind, pk: qPraktikaBind, gk: orgGkBind, kb: orgKbBind, ein: orgEinBind })[t]();
    }
  };
}
const QVerwView = orgViewOf('qverw'), QPkView = orgViewOf('qpk'), QGkView = orgViewOf('qgk'), QKbView = orgViewOf('qkb'), QEinView = orgViewOf('qein');
const QOrgView = QVerwView;
async function orgLoad() {
  const t = S.org.tab, today = localDate();
  if (t === 'verw') {
    const [pk, gk, anw] = await Promise.all([
      q(sb.from('quali_praktika').select('id,azubi_id,abteilung,von,bis,abgesegnet_at').gte('bis', today)),
      q(sb.from('quali_gk').select('id,azubi_id,von,bis,status')),
      q(sb.from('anwesenheit').select('azubi_id,status,lernort').eq('datum', today))]);
    Object.assign(S.org, { pk, gk, anw });
  } else if (t === 'gk') {
    S.org.gk = await q(sb.from('quali_gk').select('*').order('von', { ascending: false }));
  } else if (t === 'ein') {
    S.org.einM ||= today.slice(0, 7);
    if (!qCanTeam() || !S.org.einT) S.org.einT = qCanTeam() ? (S.org.einT || S.me.id) : S.me.id;
    S.org.cV ||= today.slice(0, 4) + '-01-01'; S.org.cB ||= today;
    const m0 = S.org.einM + '-01', m1 = qAddDays(orgAddMonths(m0, 1), -1);
    const [mon, cnt] = await Promise.all([
      q(sb.from('quali_einsatz').select('*').eq('trainer_id', S.org.einT).gte('datum', m0).lte('datum', m1)),
      orgFetch('quali_einsatz', 'datum', S.org.cV, S.org.cB, 'trainer_id,datum,art,anteil')]);
    Object.assign(S.org, { einMon: mon, einCnt: qCanTeam() ? cnt : cnt.filter(r => r.trainer_id === S.me.id) });
  } else if (t === 'pk') {
    S.quali.pk = await q(sb.from('quali_praktika').select('*').order('von', { ascending: false }));
  } else if (t === 'kb') {
    await qKbLoad();
  } else if (t === 'exp') {
    S.org.bk = isAdmin() ? await sb.rpc('backup_status').then(r => r.data).catch(() => null) : null;
  }
}

/* =====================================================================
   Verwaltung: Teilnehmende der eigenen Gruppen
   ===================================================================== */
function orgEinsatzHeute(p) {
  const today = localDate(), pk = (S.org.pk || []).find(x => x.azubi_id === p.id && x.von <= today && today <= x.bis);
  if (pk) return ['accent', `Praktikum: ${pk.abteilung} bis ${fmtDate(pk.bis).slice(0, 6)}`];
  const gk = (S.org.gk || []).find(x => x.azubi_id === p.id && GK_OFFEN.includes(x.status) && x.von <= today && today <= x.bis);
  if (gk) return ['brass', `GK bis ${fmtDate(gk.bis).slice(0, 6)}`];
  const t = (S.quali.rows || []).find(r => r.azubi_id === p.id);
  if (t?.einsatzort) return ['', t.einsatzort];
  const a = (S.org.anw || []).find(x => x.azubi_id === p.id);
  if (a?.lernort) return ['', a.lernort];
  return null;
}
function orgVerwHTML() {
  const f = S.org.vf || 'alle', today = localDate(), rows = S.quali.rows || [];
  const all = qTnList().filter(p => canSchool(p));
  const tOf = id => rows.find(r => r.azubi_id === id);
  const inPk = p => (S.org.pk || []).some(x => x.azubi_id === p.id && x.von <= today && today <= x.bis);
  const inGk = p => (S.org.gk || []).some(x => x.azubi_id === p.id && GK_OFFEN.includes(x.status));
  const list = all.filter(p => f === 'alle' || (f === 'pk' && inPk(p)) || (f === 'gk' && inGk(p)) || (f === 'ohne' && !S.qgr?.tn?.[p.id]) || (f === 'pause' && ['pausiert', 'abgebrochen'].includes(tOf(p.id)?.status)));
  const by = {}; list.forEach(p => { const g = S.qgr?.tn?.[p.id] || '_'; (by[g] ||= []).push(p); });
  const order = [...orgMyGroups().map(g => g.id).filter(id => by[id]), ...Object.keys(by).filter(id => id !== '_' && !orgMyGroups().some(g => g.id === id)), ...(by._ ? ['_'] : [])];
  const chips = [['alle', 'Alle', all.length], ['pk', 'Im Praktikum', all.filter(inPk).length], ['gk', 'In GK', all.filter(inGk).length], ['ohne', 'Ohne Gruppe', all.filter(p => !S.qgr?.tn?.[p.id]).length], ['pause', 'Pausiert/abgebrochen', all.filter(p => ['pausiert', 'abgebrochen'].includes(tOf(p.id)?.status)).length]].filter(([k, , n]) => k === 'alle' || n);
  const anw = id => (S.org.anw || []).find(x => x.azubi_id === id);
  const row = (p, i) => { const t = tOf(p.id), k = qKat(t), c = t && qCur(t), e = orgEinsatzHeute(p), s = TN_STAT[t?.status || 'aktiv'], a = anw(p.id);
    return `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-otn="${p.id}">${avatar(p, 36)}
      <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(p.full_name)}</div>
      <div class="text-[12px] text-muted truncate">${k ? esc(k.kurz) + (k.module.length > 1 && c ? ` · Modul ${c.nr}` : '') : 'Keine Maßnahme'}${t?.standort ? ' · ' + esc(t.standort) : ''}</div>
      <div class="flex flex-wrap gap-1 mt-1">${t?.status && t.status !== 'aktiv' ? `<span class="chip ${s[0]}">${s[1]}</span>` : ''}${e ? `<span class="chip ${e[0]}">${esc(e[1])}</span>` : ''}${a ? `<span class="chip ${ANW[a.status][2]}">Heute: ${ANW[a.status][3]}</span>` : ''}</div></div>
      ${svg('arrow', 'w-4 h-4 text-muted flex-none')}</button>`; };
  return `<div class="seg mt-3">${chips.map(([k, l, n]) => `<button aria-pressed="${f === k}" data-ovf="${k}">${l} <span class="tnum opacity-70">${n}</span></button>`).join('')}</div>
    ${order.length ? order.map(g => `${secTitle(g === '_' ? 'Ohne Gruppe' : esc(qGruppe(g)?.name || 'Gruppe'), `<span class="chip tnum">${by[g].length}</span>`)}<div class="card">${by[g].map(row).join('')}</div>`).join('')
      : empty(all.length ? 'Niemand in dieser Auswahl.' : orgMyGroups().length ? 'In deinen Gruppen sind noch keine Teilnehmenden.' : 'Du hast noch keine Gruppe. Lege unter Verwaltung › Gruppen eine an oder übernimm eine.')}
    <p class="text-[12px] text-muted mt-3">Du siehst nur deine Gruppen und Gruppen, für die du gerade Vertretung hast.</p>`;
}
function orgVerwBind() {
  $$('[data-ovf]').forEach(b => b.onclick = () => { S.org.vf = b.dataset.ovf; render(); });
  $$('[data-otn]').forEach(b => b.onclick = () => orgTnSheet(b.dataset.otn));
}
function orgTnSheet(uid) {
  const p = S.profiles[uid]; if (!p) return;
  const t = (S.quali.rows || []).find(r => r.azubi_id === uid) || {}, gs = orgMyGroups(), today = localDate();
  const pks = (S.org.pk || []).filter(x => x.azubi_id === uid), gk = (S.org.gk || []).find(x => x.azubi_id === uid && GK_OFFEN.includes(x.status));
  const lo = [...new Set([...(APP.abteilungen || []), ...(S.quali.rows || []).map(r => r.einsatzort).filter(Boolean)])];
  sheetShell(p.full_name, `
    <div class="card p-4 flex flex-col gap-2 text-[14px]">
      ${pks.map(x => `<div class="flex justify-between gap-3"><span class="text-muted">${x.von <= today ? 'Im Praktikum' : 'Praktikum geplant'}</span><span class="text-right font-semibold">${esc(x.abteilung)}<br><span class="font-normal text-[12px] text-muted tnum">${fmtDate(x.von)}–${fmtDate(x.bis)}</span></span></div>`).join('')}
      ${gk ? `<div class="flex justify-between gap-3"><span class="text-muted">Grundkompetenz-Phase</span><span class="font-semibold tnum">${fmtDate(gk.von)}–${fmtDate(gk.bis)}</span></div>` : ''}
      ${!pks.length && !gk ? '<div class="text-muted">Kein Praktikum und keine GK-Phase eingetragen.</div>' : ''}
    </div>
    <form id="otForm" class="card p-4 flex flex-col gap-3 mt-3">
      <div><label class="lbl" for="otS">Status</label><select id="otS" class="field">${Object.entries(TN_STAT).map(([k, [, l]]) => `<option value="${k}" ${(t.status || 'aktiv') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${gs.length ? `<div><label class="lbl" for="otG">Gruppe</label><select id="otG" class="field">${qCanTeam() || !t.gruppe_id ? '<option value="">– keine –</option>' : ''}${gs.map(g => `<option value="${g.id}" ${t.gruppe_id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>` : ''}
      <div><label class="lbl" for="otE">Aktueller Einsatzort im Werk <span class="font-normal text-muted">(optional)</span></label><input id="otE" class="field" list="otEl" maxlength="120" value="${esc(t.einsatzort || '')}" placeholder="z. B. Lernwerkstatt, Halle 3"><datalist id="otEl">${lo.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
      <div><label class="lbl" for="otM">Maßnahme</label><select id="otM" class="field"><option value="">– bitte wählen –</option>${Object.entries(Q_KATALOG).map(([k, x]) => `<option value="${k}" ${t.massnahme === k ? 'selected' : ''}>${esc(x.kurz)}</option>`).join('')}</select></div>
      <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="otB">Beginn</label><input id="otB" type="date" class="field" value="${t.beginn || ''}"></div><div><label class="lbl" for="otEn">Ende</label><input id="otEn" type="date" class="field" value="${t.ende || ''}"></div></div>
      <div><label class="lbl" for="otSt">Standort</label><input id="otSt" class="field" maxlength="80" value="${esc(t.standort || '')}"></div>
      <div><label class="lbl" for="otN">Notiz <span class="font-normal text-muted">(nur für Trainer und Koordination)</span></label><textarea id="otN" class="field" rows="2" maxlength="2000">${esc(t.notiz || '')}</textarea></div>
      <button class="btn">Speichern</button></form>
    <div class="grid grid-cols-2 gap-2 mt-3">
      <button class="btn ghost" id="otPk">Praktikum planen</button>
      <button class="btn ghost" id="otGk">${gk ? 'GK-Phase öffnen' : 'In GK aufnehmen'}</button>
      <button class="btn ghost" id="otAkte">Unterlagen und Akte</button>
      ${qCanTeam() ? '<button class="btn ghost" id="otMod">Module und Prüfung</button>' : '<button class="btn ghost" id="otChat">Nachricht</button>'}
    </div>`);
  $('#otForm').onsubmit = async e => {
    e.preventDefault();
    const row = { status: $('#otS').value, einsatzort: $('#otE').value.trim() || null, massnahme: $('#otM').value || t.massnahme || '', beginn: $('#otB').value || null, ende: $('#otEn').value || null, standort: $('#otSt').value.trim() || null, notiz: $('#otN').value.trim() || null, updated_at: new Date().toISOString() };
    if ($('#otG')) row.gruppe_id = $('#otG').value || null;
    if (row.gruppe_id && !orgGroupOk(row.gruppe_id)) return toast('Diese Gruppe kannst du nicht zuordnen.');
    if (!row.massnahme) return toast('Bitte eine Maßnahme wählen.');
    try {
      if (t.id) await q(sb.from('quali_teilnahmen').update(row).eq('id', t.id));
      else await q(sb.from('quali_teilnahmen').insert({ ...row, azubi_id: uid, betrieb_id: orgBetrieb(), module: [], pruefung: {} }));
      closeSheet(); toast('Gespeichert'); go(S.view);
    } catch (er) { toast(errText(er)); }
  };
  $('#otPk').onclick = () => { closeSheet(); S.quali.pk ||= []; qPkEditSheet(null); setTimeout(() => { const s = $('#pkA'); if (s) s.value = uid; }, 0); };
  $('#otGk').onclick = async () => { closeSheet(); if (gk) { const full = await q(sb.from('quali_gk').select('*').eq('id', gk.id).single()).catch(() => null); orgGkSheet(full); } else orgGkSheet(null, { azubi_id: uid, gruppe_id: t.gruppe_id || null }); };
  $('#otAkte').onclick = () => { closeSheet(); qAkteSheet(uid); };
  $('#otMod') && ($('#otMod').onclick = () => { closeSheet(); qEditSheet(uid); });
  $('#otChat') && ($('#otChat').onclick = () => { closeSheet(); S.msg.open = uid; S.msg.group = null; go('chat'); });
}

/* =====================================================================
   GK: Grundkompetenz-Phase nach dem Einstellungstest (Standard 3 Monate)
   ===================================================================== */
function orgGkHTML() {
  const today = localDate(), all = (S.org.gk || []).filter(r => !r.gruppe_id || orgGroupOk(r.gruppe_id) || (r.azubi_id && canSchool(S.profiles[r.azubi_id])));
  const open = all.filter(r => GK_OFFEN.includes(r.status)), done = all.filter(r => !GK_OFFEN.includes(r.status));
  const soon = open.filter(r => r.bis >= today && orgDays(today, r.bis) <= 14).length;
  const row = (r, i) => {
    const tot = Math.max(1, orgDays(r.von, r.bis)), el = Math.min(tot, Math.max(0, orgDays(r.von, today))), left = orgDays(today, r.bis), s = GK_STAT[r.status];
    const p = r.azubi_id && S.profiles[r.azubi_id];
    return `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-ogk="${r.id}">${p ? avatar(p, 36) : `<span class="avatar" style="width:36px;height:36px;display:grid;place-items:center;border-radius:999px;background:var(--sunk);font-weight:700;font-size:13px;flex:none">${esc((r.vorname || '?')[0] + (r.nachname || '')[0])}</span>`}
      <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(orgGkName(r))}${!r.azubi_id ? ' <span class="text-[11px] font-normal text-muted">ohne Konto</span>' : ''}</div>
      <div class="text-[12px] text-muted truncate tnum">${fmtDate(r.von)}–${fmtDate(r.bis)}${r.test_punkte != null ? ` · Einstellungstest ${orgNum(r.test_punkte)} %` : ''}${r.gruppe_id && qGruppe(r.gruppe_id) ? ' · ' + esc(qGruppe(r.gruppe_id).name) : ''}</div>
      ${GK_OFFEN.includes(r.status) ? `<div class="gk-bar mt-1.5"><i style="width:${Math.round(el * 100 / tot)}%"></i></div>` : ''}</div>
      <span class="chip ${GK_OFFEN.includes(r.status) && left >= 0 && left <= 14 ? 'warn' : s[0]} flex-none tnum">${GK_OFFEN.includes(r.status) ? (r.von > today ? 'ab ' + fmtDate(r.von).slice(0, 6) : left < 0 ? 'Ende überschritten' : left === 0 ? 'endet heute' : `noch ${left} T.`) : s[1]}</span></button>`;
  };
  return `${secTitle('Grundkompetenz-Phase', '<button id="gkNew" class="text-[13px] font-semibold text-accent">+ Aufnehmen</button>')}
    <div class="grid grid-cols-3 gap-2"><div class="card p-3"><div class="text-[22px] font-bold tnum">${open.length}</div><div class="text-[12px] text-muted">in GK</div></div>
      <div class="card p-3"><div class="text-[22px] font-bold tnum">${soon}</div><div class="text-[12px] text-muted">enden in 14 Tagen</div></div>
      <div class="card p-3"><div class="text-[22px] font-bold tnum">${done.filter(r => ['bestanden', 'uebergang'].includes(r.status)).length}</div><div class="text-[12px] text-muted">erfolgreich</div></div></div>
    ${open.length ? `${secTitle('Laufend und geplant', `<span class="chip tnum">${open.length}</span>`)}<div class="card">${open.sort((a, b) => a.bis.localeCompare(b.bis)).map(row).join('')}</div>` : empty('Niemand in der GK-Phase. Nimm Teilnehmende nach dem Einstellungstest auf.')}
    ${done.length ? `<details class="mt-4"><summary class="eyebrow cursor-pointer">Abgeschlossen (${done.length})</summary><div class="card mt-2">${done.map(row).join('')}</div></details>` : ''}
    ${all.length ? '<button class="btn ghost w-full mt-4" id="gkPdf">Übersicht als PDF</button>' : ''}
    <div class="card p-4 mt-4 text-[13px] text-muted flex flex-col gap-2">
      <div>Wer im Einstellungstest noch Lücken hat, macht zuerst drei Monate Grundkompetenz: z. B. Deutsch, Mathematik, technische Grundlagen und Arbeitssicherheit.</div>
      <div>Teilnehmende ohne App-Konto kannst du mit Namen eintragen. Sobald sie ein Konto haben, ordnest du es zu.</div></div>`;
}
function orgGkBind() {
  $('#gkNew') && ($('#gkNew').onclick = () => orgGkSheet(null));
  $$('[data-ogk]').forEach(b => b.onclick = () => orgGkSheet((S.org.gk || []).find(r => r.id === b.dataset.ogk)));
  $('#gkPdf') && ($('#gkPdf').onclick = async e => { const btn = e.currentTarget; btn.disabled = true; try { const r = await orgGkPdf(); r.doc.save(r.name); toast('PDF erstellt'); } catch (er) { toast(errText(er)); } finally { btn.disabled = false; PDF_DE = false; } });
}
function orgGkSheet(r0, preset = {}) {
  const today = localDate(), r = r0 ? { ...r0 } : { azubi_id: null, vorname: '', nachname: '', personalnr: '', gruppe_id: orgMyGroups()[0]?.id || null, test_datum: today, test_punkte: null, test_bemerkung: '', von: today, bis: orgAddMonths(today, 3), status: 'laeuft', schwerpunkte: [], ziel_massnahme: '', ergebnis: '', notiz: '', ...preset };
  const tn = qTnList().filter(p => canSchool(p) || p.id === r.azubi_id), gs = orgMyGroups();
  let bisTouched = !!r0;
  sheetShell(r0 ? 'GK-Phase' : 'In GK aufnehmen', `<form id="gkForm" class="flex flex-col gap-3">
    <div class="card p-4 flex flex-col gap-3">
      <div><label class="lbl" for="gkA">Teilnehmer/in</label><select id="gkA" class="field"><option value="">Noch ohne App-Konto</option>${tn.map(p => `<option value="${p.id}" ${r.azubi_id === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></div>
      <div id="gkNm" class="grid grid-cols-2 gap-2" ${r.azubi_id ? 'hidden' : ''}><div><label class="lbl" for="gkV">Vorname</label><input id="gkV" class="field" maxlength="60" value="${esc(r.vorname || '')}"></div><div><label class="lbl" for="gkN">Nachname</label><input id="gkN" class="field" maxlength="60" value="${esc(r.nachname || '')}"></div>
        <div class="col-span-2"><label class="lbl" for="gkP">Personalnummer <span class="font-normal text-muted">(optional)</span></label><input id="gkP" class="field" maxlength="40" value="${esc(r.personalnr || '')}"></div></div>
      ${gs.length ? `<div><label class="lbl" for="gkG">Gruppe</label><select id="gkG" class="field">${qCanTeam() ? '<option value="">– keine –</option>' : ''}${gs.map(g => `<option value="${g.id}" ${r.gruppe_id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>` : ''}
    </div>
    <div class="eyebrow">Einstellungstest</div>
    <div class="card p-4 flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="gkTd">Datum</label><input id="gkTd" type="date" class="field" value="${r.test_datum || ''}"></div><div><label class="lbl" for="gkTp">Ergebnis in %</label><input id="gkTp" type="number" min="0" max="100" step="0.5" class="field" value="${r.test_punkte ?? ''}"></div></div>
      <div><label class="lbl" for="gkTb">Bemerkung zum Test <span class="font-normal text-muted">(optional)</span></label><textarea id="gkTb" class="field" rows="2" maxlength="1000" placeholder="z. B. Mathematik 40 %, Deutsch gut">${esc(r.test_bemerkung || '')}</textarea></div>
    </div>
    <div class="eyebrow">GK-Phase</div>
    <div class="card p-4 flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="gkVon">Von</label><input id="gkVon" type="date" class="field" required value="${r.von}"></div><div><label class="lbl" for="gkBis">Bis</label><input id="gkBis" type="date" class="field" required value="${r.bis}"></div></div>
      <div><div class="lbl">Schwerpunkte</div><div class="flex flex-wrap gap-x-4 gap-y-2 mt-1">${GK_SCHWER.map((s, i) => `<label class="flex items-center gap-2 text-[14px]"><input type="checkbox" data-gks="${i}" ${(r.schwerpunkte || []).includes(s) ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--accent)">${s}</label>`).join('')}</div></div>
      <div><label class="lbl" for="gkZ">Danach geplant</label><select id="gkZ" class="field"><option value="">– noch offen –</option>${Object.entries(Q_KATALOG).map(([k, x]) => `<option value="${k}" ${r.ziel_massnahme === k ? 'selected' : ''}>${esc(x.kurz)}</option>`).join('')}</select></div>
      <div><label class="lbl" for="gkS">Status</label><select id="gkS" class="field">${Object.entries(GK_STAT).map(([k, [, l]]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label class="lbl" for="gkE">Ergebnis am Ende <span class="font-normal text-muted">(optional)</span></label><textarea id="gkE" class="field" rows="2" maxlength="2000">${esc(r.ergebnis || '')}</textarea></div>
      <div><label class="lbl" for="gkNo">Notiz <span class="font-normal text-muted">(optional)</span></label><textarea id="gkNo" class="field" rows="2" maxlength="2000">${esc(r.notiz || '')}</textarea></div>
    </div>
    <button class="btn">${r0 ? 'Speichern' : 'Aufnehmen'}</button>
    ${r0 && GK_OFFEN.includes(r.status) ? `<div class="grid grid-cols-2 gap-2"><button type="button" class="btn ghost" id="gkPlus">+1 Monat verlängern</button><button type="button" class="btn ghost" id="gkUe">In Maßnahme übernehmen</button></div>` : ''}
    ${r0 ? '<button type="button" class="btn danger" id="gkDel">Eintrag löschen</button>' : ''}</form>`);
  $('#gkA').onchange = () => { $('#gkNm').hidden = !!$('#gkA').value; };
  $('#gkBis').oninput = () => { bisTouched = true; };
  $('#gkVon').onchange = () => { if (!bisTouched && $('#gkVon').value) $('#gkBis').value = orgAddMonths($('#gkVon').value, 3); };
  const read = () => ({ azubi_id: $('#gkA').value || null, vorname: $('#gkA').value ? null : $('#gkV').value.trim() || null, nachname: $('#gkA').value ? null : $('#gkN').value.trim() || null, personalnr: $('#gkA').value ? null : $('#gkP').value.trim() || null,
    gruppe_id: $('#gkG') ? $('#gkG').value || null : r.gruppe_id || null, test_datum: $('#gkTd').value || null, test_punkte: $('#gkTp').value === '' ? null : Number($('#gkTp').value), test_bemerkung: $('#gkTb').value.trim() || null,
    von: $('#gkVon').value, bis: $('#gkBis').value, schwerpunkte: GK_SCHWER.filter((s, i) => $(`[data-gks="${i}"]`).checked), ziel_massnahme: $('#gkZ').value || null, status: $('#gkS').value, ergebnis: $('#gkE').value.trim() || null, notiz: $('#gkNo').value.trim() || null, updated_at: new Date().toISOString() });
  const save = async row => {
    if (!row.azubi_id && !row.nachname) return toast('Bitte Teilnehmer/in wählen oder den Namen eintragen.');
    if (!row.von || !row.bis || row.bis < row.von) return toast('Bitte den Zeitraum prüfen.');
    if (row.test_punkte != null && (row.test_punkte < 0 || row.test_punkte > 100)) return toast('Ergebnis zwischen 0 und 100 %.');
    if (!row.gruppe_id && !qCanTeam() && !row.azubi_id) return toast('Bitte eine Gruppe wählen.');
    try {
      if (r0) await q(sb.from('quali_gk').update(row).eq('id', r0.id));
      else await q(sb.from('quali_gk').insert({ ...row, betrieb_id: orgBetrieb(), created_by: S.me.id }));
      closeSheet(); toast('Gespeichert'); go(S.view);
    } catch (er) { toast(errText(er)); }
  };
  $('#gkForm').onsubmit = e => { e.preventDefault(); save(read()); };
  $('#gkPlus') && ($('#gkPlus').onclick = () => { const row = read(); row.bis = orgAddMonths(row.bis, 1); row.status = 'verlaengert'; save(row); });
  $('#gkUe') && ($('#gkUe').onclick = async () => {
    const row = read();
    if (!row.azubi_id) return toast('Erst ein App-Konto zuordnen, dann in die Maßnahme übernehmen.');
    if (!row.ziel_massnahme) return toast('Bitte unter „Danach geplant“ die Maßnahme wählen.');
    row.status = 'uebergang'; if (row.bis > localDate()) row.bis = localDate();
    try {
      const t = (S.quali.rows || []).find(x => x.azubi_id === row.azubi_id), beginn = qAddDays(row.bis, 1);
      if (t) await q(sb.from('quali_teilnahmen').update({ massnahme: row.ziel_massnahme, beginn: t.beginn || beginn, status: 'aktiv', updated_at: new Date().toISOString() }).eq('id', t.id));
      else await q(sb.from('quali_teilnahmen').insert({ azubi_id: row.azubi_id, betrieb_id: orgBetrieb(), massnahme: row.ziel_massnahme, beginn, gruppe_id: row.gruppe_id, module: [], pruefung: {} }));
      await save(row);
    } catch (er) { toast(errText(er)); }
  });
  $('#gkDel') && ($('#gkDel').onclick = e => qConfirm(e.currentTarget, async () => { try { await q(sb.from('quali_gk').delete().eq('id', r0.id)); closeSheet(); toast('Gelöscht'); go(S.view); } catch (er) { toast(errText(er)); } }));
}
async function orgGkPdf() {
  const P = await qPdfStart(true), { doc, FONT, W, M } = P, today = localDate();
  const rows = (S.org.gk || []).slice().sort((a, b) => (GK_OFFEN.includes(b.status) - GK_OFFEN.includes(a.status)) || a.bis.localeCompare(b.bis));
  doc.setFont(FONT, 'bold'); doc.setFontSize(16); doc.text(pdfSafe('Grundkompetenz-Phase (GK) – Übersicht'), M, 16);
  doc.setFont(FONT, 'normal'); doc.setFontSize(9.5); doc.setTextColor(80); doc.text(pdfSafe(`${S.hotel || ''} · Stand ${fmtDate(today)} · ${rows.length} Einträge`), M, 22); doc.setTextColor(0);
  const cols = [['Name', 52], ['Gruppe', 42], ['Test', 16], ['Von', 22], ['Bis', 22], ['Status', 28], ['Schwerpunkte', 58], ['Danach', W - 2 * M - 240]];
  let y = 31;
  const head = () => { doc.setFillColor(238, 242, 242); doc.rect(M, y - 4.5, W - 2 * M, 7, 'F'); doc.setFont(FONT, 'bold'); doc.setFontSize(8); let x = M + 1.5; cols.forEach(([l, w]) => { doc.text(pdfSafe(l), x, y); x += w; }); y += 6.5; doc.setFont(FONT, 'normal'); };
  head();
  rows.forEach((r, i) => {
    const sch = doc.splitTextToSize(pdfSafe((r.schwerpunkte || []).join(', ') || '–'), 56), h = Math.max(6, sch.length * 3.6 + 2.4);
    if (y + h > 192) { doc.addPage(); y = 16; head(); }
    if (i % 2) { doc.setFillColor(248, 250, 250); doc.rect(M, y - 4, W - 2 * M, h, 'F'); }
    doc.setFontSize(8.5); let x = M + 1.5;
    const vals = [orgGkName(r), qGruppe(r.gruppe_id)?.name || '–', r.test_punkte != null ? orgNum(r.test_punkte) + ' %' : '–', fmtDate(r.von), fmtDate(r.bis), GK_STAT[r.status][1], null, Q_KATALOG[r.ziel_massnahme]?.kurz || '–'];
    vals.forEach((v, j) => { if (j === 6) doc.text(sch, x, y); else doc.text(pdfSafe(String(v)).slice(0, j === 7 ? 40 : 30), x, y); x += cols[j][1]; });
    y += h;
  });
  P.foot('GK-Übersicht');
  return { doc, name: `GK-Uebersicht_${today}.pdf` };
}

/* =====================================================================
   Trainer-Einsatzplan: W Werkstatt, S Schulungsraum, O Online, Org Organisatorisch
   ===================================================================== */
function orgEinSum(rows) {
  const s = { W: 0, S: 0, O: 0, ORG: 0 }; rows.forEach(r => { s[r.art] += Number(r.anteil) || 0; });
  return { ...s, tage: new Set(rows.map(r => r.datum)).size, sum: s.W + s.S + s.O + s.ORG };
}
function orgEinHTML() {
  const m0 = S.org.einM + '-01', first = new Date(m0 + 'T12:00:00'), off = (first.getDay() + 6) % 7, nDays = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), today = localDate();
  const mon = S.org.einMon || [], tr = S.profiles[S.org.einT];
  const cells = []; for (let i = 0; i < off; i++) cells.push('<button class="out" tabindex="-1" aria-hidden="true"></button>');
  for (let d = 1; d <= nDays; d++) {
    const ds = `${S.org.einM}-${String(d).padStart(2, '0')}`, wd = new Date(ds + 'T12:00:00').getDay(), es = mon.filter(e => e.datum === ds);
    cells.push(`<button class="${wd === 0 || wd === 6 ? 'we' : ''} ${ds === today ? 'today' : ''}" data-ein="${ds}" aria-label="${fmtDate(ds)}${es.length ? ': ' + es.map(e => EIN_ART[e.art][1]).join(', ') : ''}"><span class="dn">${d}</span>${es.sort((a, b) => Object.keys(EIN_ART).indexOf(a.art) - Object.keys(EIN_ART).indexOf(b.art)).map(e => `<span class="ek ek-${e.art} ${Number(e.anteil) < 1 ? 'half' : ''}">${Number(e.anteil) < 1 ? '½' : ''}${EIN_ART[e.art][0]}</span>`).join('')}</button>`);
  }
  const ms = orgEinSum(mon), staff = orgStaff();
  const cnt = S.org.einCnt || [], people = qCanTeam() ? staff.filter(p => cnt.some(r => r.trainer_id === p.id) || p.id === S.org.einT) : [S.me];
  const mName = first.toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' });
  return `${qCanTeam() ? `<div class="mt-3"><label class="lbl" for="einT">Trainer/in</label><select id="einT" class="field">${staff.map(p => `<option value="${p.id}" ${p.id === S.org.einT ? 'selected' : ''}>${esc(p.full_name)}${p.id === S.me.id ? ' (ich)' : ''}</option>`).join('')}</select></div>` : ''}
    <div class="flex items-center justify-between gap-2 mt-3"><button class="btn ghost py-2 px-3" id="einPrev" aria-label="Voriger Monat">‹</button>
      <div class="text-center"><div class="text-[15px] font-bold">${esc(mName)}</div><div class="text-[12px] text-muted">${esc(tr?.full_name || '')}</div></div>
      <button class="btn ghost py-2 px-3" id="einNext" aria-label="Nächster Monat">›</button></div>
    <div class="ein-cal mt-3">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<div class="wd">${w}</div>`).join('')}${cells.join('')}</div>
    <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[12px] text-muted">${Object.entries(EIN_ART).map(([a, [k, l]]) => `<span><span class="ek ek-${a}">${k}</span> ${l}</span>`).join('')}<span>½ = halber Tag</span></div>
    <div class="card p-3.5 mt-3 grid grid-cols-5 gap-1 text-center">${['W', 'S', 'O', 'ORG'].map(a => `<div><div class="text-[18px] font-bold tnum">${orgNum(ms[a])}</div><div class="text-[11px] text-muted">${EIN_ART[a][1]}</div></div>`).join('')}<div><div class="text-[18px] font-bold tnum">${ms.tage}</div><div class="text-[11px] text-muted">Tage im Monat</div></div></div>
    <button class="btn ghost w-full mt-3" id="einRange">Zeitraum auf einmal eintragen</button>
    ${secTitle('Zähler für Audits')}
    <div class="card p-4">
      <div class="seg">${[['m', 'Dieser Monat'], ['q', 'Quartal'], ['j', 'Dieses Jahr'], ['vj', 'Vorjahr'], ['12', '12 Monate']].map(([k, l]) => `<button data-cpre="${k}">${l}</button>`).join('')}</div>
      <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="lbl" for="cV">Von</label><input id="cV" type="date" class="field" value="${S.org.cV}" min="${qAddDays(today, -3653)}" max="${today}"></div><div><label class="lbl" for="cB">Bis</label><input id="cB" type="date" class="field" value="${S.org.cB}" min="${qAddDays(today, -3653)}"></div></div>
      <div class="overflow-x-auto mt-3"><table class="ein-tab"><thead><tr><th>Trainer/in (Tage)</th>${['W', 'S', 'O', 'ORG'].map(a => `<th title="${EIN_ART[a][1]}">${EIN_ART[a][0]}</th>`).join('')}<th>Summe</th></tr></thead><tbody>
        ${people.map(p => { const s = orgEinSum(cnt.filter(r => r.trainer_id === p.id)); return `<tr><td>${esc(p.full_name)}</td>${['W', 'S', 'O', 'ORG'].map(a => `<td>${orgNum(s[a])}</td>`).join('')}<td><b>${orgNum(s.sum)}</b></td></tr>`; }).join('')}
        ${people.length > 1 ? (() => { const s = orgEinSum(cnt.filter(r => people.some(p => p.id === r.trainer_id))); return `<tr><td><b>Gesamt</b></td>${['W', 'S', 'O', 'ORG'].map(a => `<td><b>${orgNum(s[a])}</b></td>`).join('')}<td><b>${orgNum(s.sum)}</b></td></tr>`; })() : ''}
      </tbody></table></div>
      <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn ghost" id="einPdf">Einsatznachweis PDF</button><button class="btn ghost" id="einMail">Per E-Mail</button></div>
    </div>
    <p class="text-[12px] text-muted mt-3">Halbe Tage zählen 0,5. ${qCanTeam() ? 'Als Koordination kannst du für alle Trainer eintragen.' : 'Du trägst deine eigenen Einsätze ein; die Koordination sieht sie für die Auswertung.'}</p>`;
}
function orgEinBind() {
  $('#einT') && ($('#einT').onchange = () => { S.org.einT = $('#einT').value; go(S.view); });
  const mv = n => { S.org.einM = orgAddMonths(S.org.einM + '-01', n).slice(0, 7); go(S.view); };
  $('#einPrev').onclick = () => mv(-1); $('#einNext').onclick = () => mv(1);
  $$('[data-ein]').forEach(b => b.onclick = () => orgEinDaySheet(b.dataset.ein));
  $('#einRange').onclick = () => orgEinRangeSheet();
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
}
function orgEinDaySheet(ds) {
  const es = (S.org.einMon || []).filter(e => e.datum === ds), tr = S.profiles[S.org.einT], gs = orgMyGroups();
  const val = a => { const e = es.find(x => x.art === a); return e ? (Number(e.anteil) < 1 ? '0.5' : '1') : ''; };
  sheetShell(`${orgWd(ds)}, ${fmtDate(ds)}`, `<form id="edForm" class="card p-4 flex flex-col gap-3">
    <div class="text-[13px] text-muted">${esc(tr?.full_name || '')} · Wo warst du an diesem Tag eingesetzt?</div>
    ${Object.entries(EIN_ART).map(([a, [k, l]]) => `<div class="ein-pick"><div class="flex items-center gap-2"><span class="ek ek-${a}">${k}</span><span class="text-[14px] font-semibold">${l}</span></div>
      <div class="seg" data-ep="${a}">${[['', '–'], ['0.5', '½ Tag'], ['1', 'Ganzer Tag']].map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${val(a) === v}">${t}</button>`).join('')}</div></div>`).join('')}
    ${gs.length ? `<div><label class="lbl" for="edG">Gruppe <span class="font-normal text-muted">(optional)</span></label><select id="edG" class="field"><option value="">–</option>${gs.map(g => `<option value="${g.id}" ${es[0]?.gruppe_id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>` : ''}
    <div><label class="lbl" for="edN">Notiz <span class="font-normal text-muted">(optional)</span></label><input id="edN" class="field" maxlength="300" value="${esc(es[0]?.notiz || '')}" placeholder="z. B. Audit-Vorbereitung, Elterngespräch, Webinar"></div>
    <button class="btn">Speichern</button></form>`);
  $$('[data-ep]').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => s.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b))));
  $('#edForm').onsubmit = async e => {
    e.preventDefault();
    const pick = Object.fromEntries([...$$('[data-ep]')].map(s => [s.dataset.ep, s.querySelector('[aria-pressed="true"]')?.dataset.v || '']));
    const tot = Object.values(pick).reduce((n, v) => n + (Number(v) || 0), 0);
    if (tot > 1) return toast('Zusammen höchstens ein ganzer Tag (z. B. ½ Werkstatt + ½ Online).');
    const gid = $('#edG')?.value || null, notiz = $('#edN').value.trim() || null;
    try {
      const del = es.filter(x => !pick[x.art]).map(x => x.id);
      if (del.length) await q(sb.from('quali_einsatz').delete().in('id', del));
      const up = Object.entries(pick).filter(([, v]) => v).map(([art, v]) => ({ betrieb_id: orgBetrieb(), trainer_id: S.org.einT, datum: ds, art, anteil: Number(v), gruppe_id: gid, notiz, updated_at: new Date().toISOString() }));
      if (up.length) await q(sb.from('quali_einsatz').upsert(up, { onConflict: 'trainer_id,datum,art' }));
      closeSheet(); toast('Gespeichert'); go(S.view);
    } catch (er) { toast(errText(er)); }
  };
}
function orgEinRangeSheet() {
  const t = localDate(), gs = orgMyGroups();
  sheetShell('Zeitraum eintragen', `<form id="erForm" class="card p-4 flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="erV">Von</label><input id="erV" type="date" class="field" required value="${qMonday(t)}"></div><div><label class="lbl" for="erB">Bis</label><input id="erB" type="date" class="field" required value="${qAddDays(qMonday(t), 4)}"></div></div>
    <div><div class="lbl">Einsatz</div><div class="seg mt-1" id="erA">${Object.entries(EIN_ART).map(([a, [k, l]], i) => `<button type="button" data-a="${a}" aria-pressed="${i === 0}">${k} · ${l}</button>`).join('')}</div></div>
    <div><div class="lbl">Umfang je Tag</div><div class="seg mt-1" id="erU"><button type="button" data-u="1" aria-pressed="true">Ganzer Tag</button><button type="button" data-u="0.5" aria-pressed="false">½ Tag</button></div></div>
    <label class="flex items-center gap-2 text-[14px]"><input type="checkbox" id="erW" checked style="width:17px;height:17px;accent-color:var(--accent)">Nur Montag bis Freitag</label>
    ${gs.length ? `<div><label class="lbl" for="erG">Gruppe <span class="font-normal text-muted">(optional)</span></label><select id="erG" class="field"><option value="">–</option>${gs.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>` : ''}
    <button class="btn">Eintragen</button>
    <p class="text-[12px] text-muted">Bestehende Einträge derselben Art an diesen Tagen werden überschrieben, andere bleiben.</p></form>`);
  ['#erA', '#erU'].forEach(id => $$(id + ' button').forEach(b => b.onclick = () => $$(id + ' button').forEach(x => x.setAttribute('aria-pressed', x === b))));
  $('#erForm').onsubmit = async e => {
    e.preventDefault();
    const v = $('#erV').value, b = $('#erB').value, art = $('#erA [aria-pressed="true"]').dataset.a, anteil = Number($('#erU [aria-pressed="true"]').dataset.u), wk = $('#erW').checked;
    if (!v || !b || b < v) return toast('Bitte den Zeitraum prüfen.');
    if (orgDays(v, b) > 185) return toast('Höchstens ein halbes Jahr auf einmal.');
    const rows = []; for (let d = v; d <= b; d = qAddDays(d, 1)) { const wd = new Date(d + 'T12:00:00').getDay(); if (!wk || (wd !== 0 && wd !== 6)) rows.push({ betrieb_id: orgBetrieb(), trainer_id: S.org.einT, datum: d, art, anteil, gruppe_id: $('#erG')?.value || null, updated_at: new Date().toISOString() }); }
    if (!rows.length) return toast('Keine Tage im Zeitraum.');
    try { await q(sb.from('quali_einsatz').upsert(rows, { onConflict: 'trainer_id,datum,art' })); closeSheet(); toast(`${rows.length} Tage eingetragen`); S.org.einM = v.slice(0, 7); go(S.view); } catch (er) { toast(errText(er)); }
  };
}
async function orgEinPdf() {
  const von = S.org.cV, bis = S.org.cB, cnt = S.org.einCnt || [], staff = orgStaff();
  const people = qCanTeam() ? staff.filter(p => cnt.some(r => r.trainer_id === p.id)) : [S.me];
  if (!people.length) throw new Error('Im Zeitraum sind keine Einsätze eingetragen.');
  const full = await orgFetch('quali_einsatz', 'datum', von, bis);
  const P = await qPdfStart(false), { doc, FONT, W, M } = P, title = 'Einsatznachweis Trainer';
  doc.setFont(FONT, 'bold'); doc.setFontSize(16); doc.text(pdfSafe(title), M, 18);
  doc.setFont(FONT, 'normal'); doc.setFontSize(10); doc.setTextColor(80); doc.text(pdfSafe(`${S.hotel || ''} · Zeitraum ${fmtDate(von)} bis ${fmtDate(bis)}`), M, 25); doc.setTextColor(0);
  let y = 36;
  const cw = [68, 22, 26, 20, 28, 18], heads = ['Trainer/in', 'Werkstatt', 'Schulungsraum', 'Online', 'Organisatorisch', 'Summe'];
  doc.setFillColor(238, 242, 242); doc.rect(M, y - 4.5, W - 2 * M, 7, 'F'); doc.setFont(FONT, 'bold'); doc.setFontSize(8.5);
  let x = M + 1.5; heads.forEach((h, i) => { doc.text(pdfSafe(h), i ? x + cw[i] - 3 : x, y, i ? { align: 'right' } : undefined); x += cw[i]; }); y += 7; doc.setFont(FONT, 'normal');
  const line = (name, s, bold) => { doc.setFont(FONT, bold ? 'bold' : 'normal'); let x2 = M + 1.5; [name, orgNum(s.W), orgNum(s.S), orgNum(s.O), orgNum(s.ORG), orgNum(s.sum)].forEach((v, i) => { doc.text(pdfSafe(String(v)), i ? x2 + cw[i] - 3 : x2, y, i ? { align: 'right' } : undefined); x2 += cw[i]; }); y += 6; };
  people.forEach(p => line(p.full_name, orgEinSum(cnt.filter(r => r.trainer_id === p.id))));
  if (people.length > 1) { doc.setDrawColor(200); doc.line(M, y - 4, W - M, y - 4); line('Gesamt', orgEinSum(cnt.filter(r => people.some(p => p.id === r.trainer_id))), true); }
  doc.setFontSize(8); doc.setTextColor(90); y += 2; doc.text(pdfSafe('Angaben in Tagen. Halbe Tage zählen 0,5.'), M, y); doc.setTextColor(0); y += 10;
  people.forEach(p => {
    const rows = full.filter(r => r.trainer_id === p.id).sort((a, b) => a.datum.localeCompare(b.datum)); if (!rows.length) return;
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont(FONT, 'bold'); doc.setFontSize(11); doc.text(pdfSafe('Einzelnachweis: ' + p.full_name), M, y); y += 6; doc.setFont(FONT, 'normal'); doc.setFontSize(8.5);
    rows.forEach(r => {
      if (y > 278) { doc.addPage(); y = 18; }
      doc.text(pdfSafe(`${orgWd(r.datum)} ${fmtDate(r.datum)}`), M + 1.5, y);
      doc.text(pdfSafe(`${Number(r.anteil) < 1 ? '½ ' : ''}${EIN_ART[r.art][1]}`), M + 30, y);
      doc.text(pdfSafe([qGruppe(r.gruppe_id)?.name, r.notiz].filter(Boolean).join(' · ')).slice(0, 90), M + 70, y); y += 4.6;
    });
    y += 6;
  });
  if (y > 255) { doc.addPage(); y = 30; }
  y += 10; doc.setDrawColor(120); doc.line(M, y, M + 70, y); doc.line(W - M - 70, y, W - M, y);
  doc.setFontSize(8); doc.setTextColor(90); doc.text(pdfSafe('Datum, Unterschrift Trainer/in'), M, y + 4); doc.text(pdfSafe('Datum, Unterschrift Koordination'), W - M - 70, y + 4); doc.setTextColor(0);
  P.foot(title);
  return { doc, name: `Einsatznachweis_${von}_${bis}.pdf`, subject: `Einsatznachweis ${fmtDate(von)} bis ${fmtDate(bis)}` };
}

/* =====================================================================
   Export: Bereiche abhaken, Zeitraum innerhalb der letzten 10 Jahre
   ===================================================================== */
const ORG_EXP = [
  ['tn', 'Teilnehmende, Maßnahmen und Gruppen', 'Stammdaten, Maßnahmen mit Modulen und Prüfung, Gruppen, Vertretungen', [['profiles', null], ['quali_teilnahmen', null], ['quali_gruppen', null], ['quali_vertretungen', 'von']]],
  ['gk', 'Grundkompetenz-Phase (GK)', 'Einstellungstest, Zeitraum, Schwerpunkte, Ergebnis', [['quali_gk', 'von']]],
  ['anw', 'Anwesenheit', 'Tageweise, mit Lernort und Notiz', [['anwesenheit', 'datum']]],
  ['kb', 'Klassenbuch', 'Themen, Inhalte, Rahmenplan, Abzeichnung', [['klassenbuch', 'datum']]],
  ['ein', 'Trainer-Einsatzplan', 'Werkstatt, Schulungsraum, Online, Organisatorisch', [['quali_einsatz', 'datum']]],
  ['pk', 'Praktika', 'Abteilung, Zeitraum, Rückmeldungen, Freigabe', [['quali_praktika', 'von']]],
  ['tests', 'Tests und Ergebnisse', 'Tests, Durchführungen, Abgaben mit Punkten', [['tests', 'created_at'], ['test_sitzungen', 'gestartet_at'], ['test_abgaben', 'started_at']]],
  ['ber', 'Nachweise (Berichtsheft)', 'Wochennachweise und vermittelte Rahmenplan-Positionen', [['reports', 'updated_at'], ['rp_vermittelt', 'datum']]],
  ['abw', 'Abwesenheiten', 'Urlaub, Krankheit, sonstige Abwesenheiten', [['absences', 'von']]],
  ['gespr', 'Gespräche und Beurteilungen', 'Gesprächsnotizen und Beurteilungen', [['talks', 'datum'], ['beurteilungen', 'von']]],
  ['pruef', 'Prüfungsvorbereitung und Unterlagen', 'Probeprüfungen, Liste der Zertifikate und Unterlagen', [['exam_results', 'created_at'], ['quali_dokumente', 'datum']]],
  ['uw', 'Unterweisungen', 'Unterweisungen und Bestätigungen mit Unterschrift', [['unterweisungen', null], ['unterweisung_bestaetigungen', 'bestaetigt_at']]]
];
const ORG_TS = new Set(['created_at', 'updated_at', 'gestartet_at', 'started_at', 'bestaetigt_at']);
function orgExpHTML() {
  const t = localDate(), min = qAddDays(t, -3653), sel = S.org.expSel || ORG_EXP.map(x => x[0]);
  S.org.expV ||= t.slice(0, 4) + '-01-01'; S.org.expB ||= t;
  const bk = S.org.bk;
  return `${secTitle('Was soll in den Export?', '<button id="expAll" class="text-[13px] font-semibold text-accent">Alle / keine</button>')}
    <div class="card exp-list">${ORG_EXP.map(([k, l, d]) => `<label><input type="checkbox" data-exp="${k}" ${sel.includes(k) ? 'checked' : ''}><span><span class="text-[14px] font-semibold block">${l}</span><span class="text-[12px] text-muted">${d}</span></span></label>`).join('')}</div>
    ${secTitle('Zeitraum')}
    <div class="card p-4"><div class="seg">${[['j', 'Dieses Jahr'], ['vj', 'Vorjahr'], ['12', '12 Monate'], ['5', '5 Jahre'], ['10', '10 Jahre']].map(([k, l]) => `<button data-epre="${k}">${l}</button>`).join('')}</div>
      <div class="grid grid-cols-2 gap-2 mt-3"><div><label class="lbl" for="expV">Von</label><input id="expV" type="date" class="field" min="${min}" max="${t}" value="${S.org.expV}"></div><div><label class="lbl" for="expB">Bis</label><input id="expB" type="date" class="field" min="${min}" max="${t}" value="${S.org.expB}"></div></div>
      <p class="text-[12px] text-muted mt-2">Möglich sind die letzten 10 Jahre (ab ${fmtDate(min)}). Stammdaten ohne Datum (z. B. Teilnehmende, Gruppen) sind immer vollständig enthalten.</p>
      <label class="flex items-center gap-2 text-[14px] mt-3"><input type="checkbox" id="expJson" ${S.org.expJson ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--accent)">Zusätzlich als JSON (für Fachleute)</label></div>
    <button class="btn w-full mt-4" id="expGo">Export erstellen (ZIP)</button>
    <div id="expSt" class="text-[13px] text-muted mt-2 text-center" aria-live="polite"></div>
    <p class="text-[12px] text-muted mt-2">Du bekommst nur Daten, die du auch in der App sehen darfst. Die Tabellen öffnen sich in Excel (CSV mit Semikolon).</p>
    ${isAdmin() ? `${secTitle('Automatische Datensicherung')}<div class="card p-4 text-[14px] flex flex-col gap-2">
      <div class="flex justify-between gap-3"><span class="text-muted">Rhythmus</span><span class="font-semibold">täglich, nachts</span></div>
      <div class="flex justify-between gap-3"><span class="text-muted">Letzte Sicherung</span><span class="font-semibold text-right">${bk?.letzte_ok ? `${svg('check', 'w-4 h-4 inline text-[var(--ok)]')} ${new Date(bk.letzte_ok).toLocaleString(LOCALE(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'noch keine'}</span></div>
      ${bk && !bk.ok ? '<div class="text-[13px]" style="color:var(--crit)">Die letzte Sicherung ist fehlgeschlagen. Der Anbieter wird informiert und prüft das.</div>' : ''}
      <div class="flex justify-between gap-3"><span class="text-muted">Aufbewahrung</span><span class="font-semibold">30 Tage</span></div>
      <div class="flex justify-between gap-3"><span class="text-muted">Speicherort</span><span class="font-semibold text-right">verschlüsselt, Rechenzentrum Frankfurt (EU)</span></div>
      <div class="text-[12px] text-muted">Gesichert werden alle Einträge der App. Hochgeladene Dateien (z. B. Zertifikate) liegen getrennt im Dateispeicher. Wiederherstellung auf Anfrage beim Anbieter.</div></div>` : ''}`;
}
function orgExpBind() {
  const keep = () => { S.org.expSel = [...$$('[data-exp]')].filter(c => c.checked).map(c => c.dataset.exp); S.org.expV = $('#expV').value; S.org.expB = $('#expB').value; S.org.expJson = $('#expJson').checked; };
  $$('[data-exp]').forEach(c => c.onchange = keep); ['#expV', '#expB', '#expJson'].forEach(id => $(id).onchange = keep);
  $('#expAll').onclick = () => { const on = ![...$$('[data-exp]')].every(c => c.checked); $$('[data-exp]').forEach(c => c.checked = on); keep(); };
  $$('[data-epre]').forEach(b => b.onclick = () => {
    const t = localDate(), y = Number(t.slice(0, 4)), k = b.dataset.epre;
    const v = k === 'j' ? y + '-01-01' : k === 'vj' ? (y - 1) + '-01-01' : k === '12' ? qAddDays(orgAddMonths(t, -12), 1) : k === '5' ? qAddDays(orgAddMonths(t, -60), 1) : qAddDays(t, -3653);
    $('#expV').value = v; $('#expB').value = k === 'vj' ? (y - 1) + '-12-31' : t; keep();
  });
  $('#expGo').onclick = e => orgExport(e.currentTarget);
}
async function orgExport(btn) {
  const st = t => { const e = $('#expSt'); if (e) e.textContent = t; };
  const sel = ORG_EXP.filter(x => (S.org.expSel || ORG_EXP.map(y => y[0])).includes(x[0]));
  const t = localDate(), min = qAddDays(t, -3653);
  let von = S.org.expV || min, bis = S.org.expB || t;
  if (!sel.length) return toast('Bitte mindestens einen Bereich auswählen.');
  if (bis < von) return toast('„Bis“ liegt vor „Von“.');
  if (von < min) von = min; if (bis > t) bis = t;
  btn.disabled = true;
  try {
    await loadScript('./vendor/jszip.min.js');
    const zip = new JSZip(), summary = [], tabs = sel.flatMap(x => x[3].map(([tb, col]) => [x, tb, col]));
    for (const [i, [area, tb, col]] of tabs.entries()) {
      st(`${area[1]}: ${i + 1} von ${tabs.length} …`);
      try {
        const rows = await orgFetch(tb, col, col ? von + (ORG_TS.has(col) ? 'T00:00:00' : '') : null, col ? (ORG_TS.has(col) ? qAddDays(bis, 1) + 'T00:00:00' : bis) : null);
        if (ORG_TS.has(col)) { const end = qAddDays(bis, 1) + 'T00:00:00'; for (let j = rows.length - 1; j >= 0; j--) if (String(rows[j][col] || '') >= end) rows.splice(j, 1); }
        if (tb === 'quali_praktika') rows.forEach(r => { delete r.token; });
        if (tb === 'profiles') rows.forEach(r => { delete r.foto; });
        summary.push(`${area[1]} / ${tb}: ${rows.length}${col ? '' : ' (ohne Zeitbezug, vollständig)'}`);
        if (!rows.length) continue;
        const dir = String(ORG_EXP.indexOf(area) + 1).padStart(2, '0') + '_' + area[1].replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/[^\w]+/g, '_').replace(/_+$/, '');
        zip.file(`${dir}/${tb}.csv`, csvOf(rows));
        if (S.org.expJson) zip.file(`json/${tb}.json`, JSON.stringify(rows, null, 1));
      } catch (er) { summary.push(`${area[1]} / ${tb}: nicht lesbar (${errText(er)})`); }
    }
    zip.file('LIESMICH.txt', `${BR.appName || 'C1TT Desk'} – Datenexport\nBetrieb: ${S.betrieb?.name || S.hotel || ''}\nZeitraum: ${fmtDate(von)} bis ${fmtDate(bis)}\nErstellt: ${new Date().toLocaleString('de-DE')} von ${S.me.full_name}\n\nJeder Ordner ist ein Bereich. Die CSV-Dateien öffnen sich in Excel (Trennzeichen Semikolon, UTF-8).\nEnthalten sind nur Daten, die ${S.me.full_name} in der App sehen darf.\n\nEnthaltene Datensätze:\n${summary.join('\n')}\n\nHinweis: Diese Datei enthält personenbezogene Daten. Sicher aufbewahren und nach Ablauf der Aufbewahrungsfristen löschen.\n`);
    st('ZIP wird erstellt …');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Export_${orgAscii(S.betrieb?.name || S.hotel || 'Betrieb')}_${von}_bis_${bis}.zip`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    st(`Fertig: ${Math.round(blob.size / 1024)} KB, ${summary.length} Tabellen`); toast('Export erstellt');
  } catch (er) { st(''); toast(errText(er)); }
  finally { btn.disabled = false; }
}
