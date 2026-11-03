/* Stufenwerk · Qualifizierungsmodus, Teil 7
   – Eigene Ansicht: Reiter frei wählen, sortieren, ausblenden (je Person gespeichert)
   – Kurse frei anlegen (Freitext), Gruppen ordnen Kurse zu
   – Klassenbuch nach der Vorlage „Dokumentation Trainingsdurchführung“: Unterrichtsart, Trainer/Dozent, Stundenraster mit Methodik
   Wird nach quali6.js und vor dem Hauptskript geladen. */

(() => {
  const css = `
  .tabbar .tb-mehr{display:none}
  @media (max-width:1023px){.tabbar .tb-x{display:none}.tabbar .tb-mehr{display:flex}.tabbar .tb-cfg{display:none}}
  @media (min-width:1024px){.tabbar .tb-cfg{margin-top:8px;font-size:13px;color:var(--muted)}}
  .nav-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-top:1px solid var(--line)}
  .nav-row:first-child{border-top:0}
  .nav-row.off{opacity:.55}
  .nav-row .ix{width:22px;font-size:12px;font-weight:700;color:var(--muted);text-align:center;font-variant-numeric:tabular-nums}
  .nav-row button.mv{width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:var(--surface);display:grid;place-items:center;font-size:16px;font-weight:700;color:var(--muted)}
  .nav-row button.mv:disabled{opacity:.35}
  .nav-split{padding:6px 12px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);background:var(--sunk);border-top:1px solid var(--line)}
  .kb-day{display:grid;grid-template-columns:38px minmax(0,1fr);border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface);margin-top:12px}
  .kb-date{background:color-mix(in srgb,var(--ok) 14%,var(--surface));display:flex;align-items:center;justify-content:center;border-right:1px solid var(--line)}
  .kb-date span{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:700;font-size:14px;white-space:nowrap;letter-spacing:.02em}
  .kb-head{display:grid;grid-template-columns:120px minmax(0,1fr);font-size:13px}
  .kb-head > div{padding:7px 10px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--accent) 12%,var(--surface))}
  .kb-head > div:nth-child(odd){font-weight:700;font-size:12px}
  .kb-tab{width:100%;border-collapse:collapse;font-size:12.5px;table-layout:fixed}
  .kb-tab th{background:var(--sunk);font-size:11.5px;font-weight:700;padding:6px;border-bottom:1px solid var(--line);text-align:left}
  .kb-tab th.svp{background:#fff2a8;color:#3d3500;text-align:center}
  .kb-tab td{padding:6px;border-bottom:1px solid var(--line);vertical-align:top}
  .kb-tab td.z{font-variant-numeric:tabular-nums;color:var(--muted);white-space:nowrap}
  .kb-tab td.th{border-left:1px solid var(--line);border-right:1px solid var(--line);white-space:pre-line}
  .kb-tab td.m,.kb-tab td.s{text-align:center}
  .kb-tab tr.pause td{background:var(--sunk);color:var(--muted)}
  .kb-tab tr:last-child td{border-bottom:0}
  .kb-ed{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--surface)}
  .kb-ed.pause{background:var(--sunk)}
  .kb-ed .hd{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .kb-ed .hd b{font-variant-numeric:tabular-nums;font-size:14px}
  .kb-ed .hd button{font-size:12px;font-weight:600;color:var(--accent);background:none;border:0;padding:2px 4px}
  .kb-ed .row2{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:6px;margin-top:6px}
  .kb-ed .kb-no{grid-column:1/-1}
  .kb-tab td.n{font-size:12px;color:var(--muted);border-left:1px solid var(--line);white-space:pre-line}
  @media (min-width:720px){.kb-ed{display:grid;grid-template-columns:62px minmax(0,1.3fr) 190px 84px minmax(0,1fr);gap:8px;align-items:start;padding:8px}.kb-ed .hd{flex-direction:column;align-items:flex-start;margin:0}.kb-ed .row2{display:contents}.kb-ed .kb-no{grid-column:auto}}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  try {
    Object.assign(Q_ICONS, {
      mehr: '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>',
      koffer: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17"/>',
      stufe: '<path d="M4 19.5h5v-5h5v-5h6"/><path d="M4 19.5h16"/>',
      kbuch: '<path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h12.5v14H6a1.5 1.5 0 0 0-1.5 1.5z"/><path d="M4.5 19.5A1.5 1.5 0 0 0 6 21h12.5v-3M8.5 8h6M8.5 11h6"/>',
      gruppe: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.9-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.5 14.4c2.4-.3 4.4 1.2 5 4.1"/>',
      regler: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'
    });
  } catch {}
})();

/* =====================================================================
   Eigene Ansicht: Reihenfolge und Sichtbarkeit der Hauptreiter
   ===================================================================== */
const NAV_FIX = ['home'];
async function qNavLoad() {
  try { const c = JSON.parse(localStorage.getItem('stufenwerk.nav.' + S.me.id) || 'null'); if (c) S.nav = c; } catch {}
  if (S.demo) return;
  try {
    const { data } = await sb.from('user_ansicht').select('nav,versteckt').eq('user_id', S.me.id).maybeSingle();
    if (data) { S.nav = { order: data.nav || [], hidden: data.versteckt || [] }; try { localStorage.setItem('stufenwerk.nav.' + S.me.id, JSON.stringify(S.nav)); } catch {} }
  } catch {}
}
const qNavOn = () => { try { return isQuali() && !!S.me; } catch { return false; } };
/* Alle Reiter, die diese Person sehen darf, in ihrer Reihenfolge; ausgeblendete getrennt */
function qNavTabs(all) {
  const N = S.nav || { order: [], hidden: [] }, ids = all.map(t => t[0]);
  const ord = [...(N.order || []).filter(id => ids.includes(id)), ...ids.filter(id => !(N.order || []).includes(id))];
  const by = Object.fromEntries(all.map(t => [t[0], t]));
  const hid = new Set((N.hidden || []).filter(id => !NAV_FIX.includes(id)));
  return { shown: ord.filter(id => !hid.has(id)).map(id => by[id]), hidden: ord.filter(id => hid.has(id)).map(id => by[id]) };
}
const NAV_SHORT = { quali: 'Quali', qanw: 'Anwesend', qverw: 'Gruppen', qkb: 'Klassenb.', qein: 'Dienst', qpk: 'Praktika' };
function qNavRender(all) {
  const { shown } = qNavTabs(all), mob = window.innerWidth < 1024, cur = S.view;
  const idx = shown.findIndex(t => t[0] === cur), inMehr = idx > 3 || (idx < 0 && !['home'].includes(cur) && !shown.slice(0, 4).some(t => t[0] === cur));
  const lbl = (id, l) => mob && NAV_SHORT[id] ? NAV_SHORT[id] : (l || mod(id).tab);
  $('#tabs').style.gridTemplateColumns = `repeat(${Math.min(shown.length, 4) + 1}, 1fr)`;
  $('#tabs').innerHTML = shown.map(([id, l, ic], i) => `<button data-go="${id}" class="${i > 3 ? 'tb-x' : ''}" ${cur === id ? 'aria-current="page"' : ''} ${mob && NAV_SHORT[id] ? `aria-label="${esc(l)}"` : ''}>${svg(ic)}<span>${esc(lbl(id, l))}</span></button>`).join('')
    + `<button class="tb-mehr" id="tbMehr" ${inMehr && cur !== 'home' ? 'aria-current="page"' : ''} aria-label="Mehr Reiter und Ansicht anpassen">${svg('mehr')}<span>Mehr</span></button>`
    + `<button class="tb-cfg" id="tbCfg">${svg('regler')}<span>Ansicht anpassen</span></button>`;
  $('#tbMehr').onclick = () => qNavMehr(all);
  $('#tbCfg').onclick = () => qNavSheet(all);
}
function qNavMehr(all) {
  const { shown, hidden } = qNavTabs(all), rest = shown.slice(4);
  sheetShell('Mehr', `<div class="card">${rest.length ? rest.map(([id, l, ic], i) => `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-mgo="${id}"><span class="ico">${svg(ic, 'w-5 h-5')}</span><span class="flex-1 text-[15px] font-semibold">${esc(l || mod(id).tab)}</span>${svg('arrow', 'w-4 h-4 text-muted')}</button>`).join('') : '<div class="p-4 text-[14px] text-muted">Alle Reiter stehen schon unten in der Leiste.</div>'}</div>
    ${hidden.length ? `<div class="eyebrow mt-4">Ausgeblendet</div><div class="card mt-2">${hidden.map(([id, l, ic], i) => `<button class="w-full flex items-center gap-3 p-3 text-left ${i ? 'border-t border-line' : ''}" data-mgo="${id}" style="opacity:.7"><span class="ico">${svg(ic, 'w-5 h-5')}</span><span class="flex-1 text-[14px]">${esc(l || mod(id).tab)}</span></button>`).join('')}</div>` : ''}
    <button class="btn w-full mt-4" id="mCfg">${svg('regler', 'w-4 h-4')} Ansicht anpassen</button>`);
  $$('[data-mgo]').forEach(b => b.onclick = () => { closeSheet(); S.navByUser = true; go(b.dataset.mgo); });
  $('#mCfg').onclick = () => qNavSheet(all);
}
function qNavSheet(all) {
  const st = qNavTabs(all);
  let order = [...st.shown, ...st.hidden].map(t => t[0]), hidden = new Set(st.hidden.map(t => t[0]));
  const by = Object.fromEntries(all.map(t => [t[0], t]));
  const draw = () => {
    const sh = order.filter(id => !hidden.has(id)), hi = order.filter(id => hidden.has(id));
    const row = (id, i, list, off) => { const [, l, ic] = by[id]; return `<div class="nav-row ${off ? 'off' : ''}">
      <span class="ix">${off ? '' : i + 1}</span><span class="ico">${svg(ic, 'w-5 h-5')}</span><span class="flex-1 min-w-0 text-[14px] font-semibold truncate">${esc(l || mod(id).tab)}</span>
      ${off ? '' : `<button type="button" class="mv" data-up="${id}" ${i === 0 ? 'disabled' : ''} aria-label="${esc(l)} nach oben">↑</button><button type="button" class="mv" data-dn="${id}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="${esc(l)} nach unten">↓</button>`}
      ${NAV_FIX.includes(id) ? '<span class="text-[11px] text-muted w-[62px] text-right">immer</span>' : `<button type="button" class="btn ghost py-1.5 px-2.5 text-[12px] w-[62px]" data-tg="${id}">${off ? 'Zeigen' : 'Aus'}</button>`}</div>`; };
    $('#navList').innerHTML = sh.map((id, i) => (i === 4 ? '<div class="nav-split">Ab hier auf dem Handy unter „Mehr“</div>' : '') + row(id, i, sh, false)).join('')
      + (hi.length ? '<div class="nav-split">Ausgeblendet</div>' + hi.map((id, i) => row(id, i, hi, true)).join('') : '');
    $$('#navList [data-up]').forEach(b => b.onclick = () => mv(b.dataset.up, -1));
    $$('#navList [data-dn]').forEach(b => b.onclick = () => mv(b.dataset.dn, 1));
    $$('#navList [data-tg]').forEach(b => b.onclick = () => { const id = b.dataset.tg; hidden.has(id) ? hidden.delete(id) : hidden.add(id); draw(); });
  };
  const mv = (id, d) => { const sh = order.filter(x => !hidden.has(x)), i = sh.indexOf(id), j = i + d; if (j < 0 || j >= sh.length) return; [sh[i], sh[j]] = [sh[j], sh[i]]; order = [...sh, ...order.filter(x => hidden.has(x))]; draw(); };
  sheetShell('Ansicht anpassen', `<p class="text-[14px] text-muted">Lege fest, welche Reiter du siehst und in welcher Reihenfolge. Auf dem Handy stehen die ersten vier unten in der Leiste, alle weiteren unter „Mehr“.</p>
    <div class="card mt-3" id="navList"></div>
    <div class="grid grid-cols-2 gap-2 mt-4"><button class="btn ghost" id="navReset">Standard</button><button class="btn" id="navSave">Speichern</button></div>
    <p class="text-[12px] text-muted mt-2">Gilt nur für dich, auf allen deinen Geräten.</p>`);
  draw();
  $('#navReset').onclick = () => { order = all.map(t => t[0]); hidden = new Set(); draw(); };
  $('#navSave').onclick = async () => {
    S.nav = { order, hidden: [...hidden] };
    try { localStorage.setItem('stufenwerk.nav.' + S.me.id, JSON.stringify(S.nav)); } catch {}
    try { if (!S.demo) await q(sb.from('user_ansicht').upsert({ user_id: S.me.id, nav: order, versteckt: [...hidden], updated_at: new Date().toISOString() }, { onConflict: 'user_id' })); toast('Ansicht gespeichert'); }
    catch (e) { toast('Auf diesem Gerät gespeichert. ' + errText(e)); }
    closeSheet(); renderTabs();
  };
}

/* =====================================================================
   Kurse: eigene Kurse im Freitext neben den hinterlegten Maßnahmen
   ===================================================================== */
const KURS_ARTEN = ['Kurs', 'Teilqualifizierung', 'Intensivkurs', 'Grundkompetenz', 'Lehrgang', 'Umschulung', 'Weiterbildung', 'Sonstiges'];
function qKurseMerge(list) {
  S.qkurse = list || [];
  Object.keys(Q_KATALOG).filter(k => k.startsWith('k-')).forEach(k => delete Q_KATALOG[k]);
  S.qkurse.filter(k => k.aktiv !== false).forEach(k => {
    const mods = (Array.isArray(k.module) ? k.module : []).filter(m => m && m.titel).map((m, i) => ({ nr: i + 1, titel: m.titel, monate: +m.monate || 0, rp: [] }));
    const dauer = +k.dauer_monate || mods.reduce((n, m) => n + m.monate, 0) || 0;
    Q_KATALOG['k-' + k.id] = { art: k.art || 'Kurs', kurz: k.name, beruf: k.beruf || k.name, fachrichtung: '', zeit: '', dauer: dauer ? `${String(dauer).replace('.', ',')} Monate` : '', lernorte: '', zert: '', abschluss: k.abschluss || '', ausbildungsjahre: Math.max(1, Math.round(dauer / 12)), beschreibung: k.beschreibung || '',
      module: mods.length ? mods : [{ nr: 1, titel: k.name, monate: dauer, rp: [] }], eigen: true };
  });
}
function qKurseHTML() {
  const eig = (S.qkurse || []).slice().sort((a, b) => (b.aktiv !== false) - (a.aktiv !== false) || a.name.localeCompare(b.name));
  const fix = Object.entries(Q_KATALOG).filter(([k, x]) => !x.eigen);
  const nTn = key => (S.quali.rows || []).filter(r => r.massnahme === key).length, nGr = key => (S.qgr?.g || []).filter(g => g.kurs === key).length;
  return `${secTitle('Eigene Kurse', '<button id="kuNew" class="text-[13px] font-semibold text-accent">+ Neuer Kurs</button>')}
    ${eig.length ? `<div class="card">${eig.map((k, i) => `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-ku="${k.id}" ${k.aktiv === false ? 'style="opacity:.6"' : ''}>
      <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(k.name)}</div>
      <div class="text-[12px] text-muted truncate">${esc(k.art)}${k.dauer_monate ? ` · ${String(k.dauer_monate).replace('.', ',')} Monate` : ''}${(k.module || []).length ? ` · ${k.module.length} Module` : ''} · ${nGr('k-' + k.id)} Gruppen · ${nTn('k-' + k.id)} Teilnehmende${k.aktiv === false ? ' · archiviert' : ''}</div></div>${svg('arrow', 'w-4 h-4 text-muted flex-none')}</button>`).join('')}</div>`
      : empty('Noch keine eigenen Kurse. Lege einen an – Name und Inhalte frei wählbar.')}
    ${secTitle('Hinterlegte Maßnahmen', `<span class="chip tnum">${fix.length}</span>`)}
    <div class="card">${fix.map(([key, k], i) => `<div class="p-3.5 ${i ? 'border-t border-line' : ''}"><div class="text-[14px] font-semibold">${esc(k.kurz)}</div><div class="text-[12px] text-muted">${esc(k.art)} · ${esc(k.dauer || '')} · ${k.module.length} ${k.module.length === 1 ? 'Modul' : 'Module'} · ${nGr(key)} Gruppen · ${nTn(key)} Teilnehmende</div></div>`).join('')}</div>
    <p class="text-[12px] text-muted mt-3">Eigene Kurse stehen überall zur Auswahl, wo eine Maßnahme gewählt wird: bei Gruppen, Teilnehmenden, GK und Anwesenheit.</p>`;
}
function qKurseBind() {
  $('#kuNew') && ($('#kuNew').onclick = () => qKursSheet(null));
  $$('[data-ku]').forEach(b => b.onclick = () => qKursSheet((S.qkurse || []).find(k => k.id === b.dataset.ku)));
}
function qKursSheet(k0) {
  const k = k0 ? { ...k0 } : { name: '', art: 'Kurs', beruf: '', abschluss: '', dauer_monate: null, module: [], beschreibung: '', aktiv: true };
  const modTxt = (k.module || []).map(m => m.monate ? `${m.titel}; ${String(m.monate).replace('.', ',')}` : m.titel).join('\n');
  sheetShell(k0 ? 'Kurs bearbeiten' : 'Neuer Kurs', `<form id="kuForm" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="kuN">Name des Kurses</label><input id="kuN" class="field" maxlength="120" required value="${esc(k.name)}" placeholder="z. B. TQ2 Kunststoff und Kautschuk"></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="kuA">Art</label><input id="kuA" class="field" list="kuAl" maxlength="60" value="${esc(k.art)}"><datalist id="kuAl">${KURS_ARTEN.map(a => `<option value="${a}">`).join('')}</datalist></div>
      <div><label class="lbl" for="kuD">Dauer in Monaten</label><input id="kuD" type="number" min="0" max="60" step="0.5" class="field" value="${k.dauer_monate ?? ''}"></div></div>
    <div><label class="lbl" for="kuB">Beruf / Ziel <span class="font-normal text-muted">(optional)</span></label><input id="kuB" class="field" maxlength="120" value="${esc(k.beruf || '')}" placeholder="z. B. Maschinen- und Anlagenführer/-in"></div>
    <div><label class="lbl" for="kuX">Abschluss <span class="font-normal text-muted">(optional)</span></label><input id="kuX" class="field" maxlength="200" value="${esc(k.abschluss || '')}" placeholder="z. B. IHK-Zertifikat, Teilnahmebescheinigung"></div>
    <div><label class="lbl" for="kuM">Module <span class="font-normal text-muted">(optional, eins pro Zeile, Monate nach Semikolon)</span></label><textarea id="kuM" class="field" rows="4" maxlength="3000" placeholder="Grundlagen Werkstoffe; 3\nFertigungsverfahren; 4">${esc(modTxt)}</textarea></div>
    <div><label class="lbl" for="kuT">Beschreibung <span class="font-normal text-muted">(optional)</span></label><textarea id="kuT" class="field" rows="3" maxlength="2000">${esc(k.beschreibung || '')}</textarea></div>
    ${k0 ? `<label class="flex items-center gap-2 text-[14px]"><input type="checkbox" id="kuOn" ${k.aktiv !== false ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--accent)">Aktiv (sonst archiviert, nicht mehr auswählbar)</label>` : ''}
    <button class="btn">${k0 ? 'Speichern' : 'Kurs anlegen'}</button>
    ${k0 && (k0.created_by === S.me.id || qCanTeam()) ? '<button type="button" class="btn danger" id="kuDel">Kurs löschen</button>' : ''}</form>`);
  $('#kuForm').onsubmit = async e => {
    e.preventDefault();
    const module = $('#kuM').value.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 12).map(l => { const [t, m] = l.split(';'); return { titel: t.trim().slice(0, 200), monate: m ? Number(String(m).replace(',', '.')) || 0 : 0 }; });
    const row = { name: $('#kuN').value.trim(), art: $('#kuA').value.trim() || 'Kurs', beruf: $('#kuB').value.trim() || null, abschluss: $('#kuX').value.trim() || null, dauer_monate: $('#kuD').value === '' ? null : Number($('#kuD').value), module, beschreibung: $('#kuT').value.trim() || null, aktiv: $('#kuOn') ? $('#kuOn').checked : true, updated_at: new Date().toISOString() };
    if (!row.name) return toast('Bitte einen Namen eingeben.');
    try {
      if (k0) await q(sb.from('quali_kurse').update(row).eq('id', k0.id));
      else await q(sb.from('quali_kurse').insert({ ...row, betrieb_id: S.betrieb?.id || S.me.betrieb_id, created_by: S.me.id }));
      closeSheet(); toast('Kurs gespeichert'); go(S.view);
    } catch (er) { toast(errText(er)); }
  };
  $('#kuDel') && ($('#kuDel').onclick = e => {
    const used = (S.quali.rows || []).some(r => r.massnahme === 'k-' + k0.id) || (S.qgr?.g || []).some(g => g.kurs === 'k-' + k0.id);
    if (used) return toast('Der Kurs ist noch Gruppen oder Teilnehmenden zugeordnet. Archiviere ihn stattdessen.');
    qConfirm(e.currentTarget, async () => { try { await q(sb.from('quali_kurse').delete().eq('id', k0.id)); closeSheet(); toast('Kurs gelöscht'); go(S.view); } catch (er) { toast(errText(er)); } });
  });
}

/* =====================================================================
   Klassenbuch: Dokumentation Trainingsdurchführung
   ===================================================================== */
const KB_ARTEN = ['Präsenzunterricht', 'Virtueller Unterricht', 'Werkstattphase', 'Praktikum / Betriebliche Erprobung'];
const KB_METHODEN = [
  ['Vt', 'Vortrag', 'Der Trainer oder ein Teilnehmer erläutert einen Sachverhalt bzw. ein Thema.', 'Trainer oder Teilnehmer stellen wichtige Inhalte für alle verständlich dar.', 'Bei längeren Vorträgen sollten aktive Teile (z. B. kurze Abfragen) eingeplant werden, da sonst keine Aktivität der Zuhörer stattfindet.'],
  ['Präs', 'Präsentation', 'Trainer, einzelne Teilnehmer oder eine Arbeitsgruppe stellen Themen oder Arbeits- und Projektergebnisse dem Plenum vor.', 'Trainiert die Präsentationsfähigkeit als eine der grundlegenden Kompetenzen von Fach- und Führungskräften. Fördert die selbstständige Themenbearbeitung und -aufbereitung mit Blick auf ein (Fach-)Publikum.', 'Art, Umfang und Tiefe der Präsentation müssen dem Thema und dem Anlass entsprechen.'],
  ['Demo', 'Demonstration', 'Der Trainer zeigt einen Ablauf, eine Tätigkeit oder ein Verfahren praktisch vor. Die Lernenden beobachten den Vorgang und erhalten so einen anschaulichen Einblick in die praktische Umsetzung.', 'Teilnehmer sehen die Durchführung anschaulich und können Abläufe besser nachvollziehen.', 'Demonstration sollte gut sichtbar und in angemessenem Tempo erfolgen; ggf. wiederholen und Fragen einplanen. Die Lernenden sollen durch Fragen und anschließende Übungen miteinbezogen werden.'],
  ['LG', 'Lehrgespräch', 'Der Trainer erarbeitet ein Thema im Dialog mit den Teilnehmern durch gezielte Fragen und Antworten.', 'Hohe Aktivierung der Teilnehmer; Wissen wird gemeinsam entwickelt und besser verstanden.', 'Trainer muss Gespräch strukturieren und alle Teilnehmer einbeziehen, damit nicht nur Einzelne aktiv sind.'],
  ['Disk', 'Diskussion', 'Zwei oder mehr Personen erarbeiten Themen und Zusammenhänge in einer Diskussion auf Augenhöhe.', 'Aktiviert Reflexion und fördert die Fähigkeit, einen Standpunkt zu gewissen Themen in Worte zu fassen.', 'Gesprächige Teilnehmer kommen eher zu Wort als ruhigere Teilnehmer. Aktivierung durch den Trainer ist notwendig.'],
  ['EA', 'Einzelarbeit', 'Jeder Teilnehmer erhält einen Arbeitsauftrag und erarbeitet eigenständig Ergebnisse.', 'Individuelle Beschäftigung mit dem Thema wird sichergestellt. Unterschiedliche Perspektiven können bestmöglich eingefangen werden.', 'Unterschiedliche Herangehensweisen und damit unterschiedliches Arbeitstempo müssen berücksichtigt werden. Ergebnisdiskussion sollte angestrebt werden.'],
  ['PA', 'Partnerarbeit', 'Jeweils zwei Lehrgangsteilnehmer erhalten einen Arbeitsauftrag, den sie gemeinsam bearbeiten sollen.', 'Fördert die dialogische Auseinandersetzung mit einem Sachverhalt. Aktiviert Teilnehmer, die in der Gesamtgruppe zurückhaltend sind.', 'In den Präsenzphasen des Lehrgangs kurzhalten.'],
  ['GA', 'Gruppenarbeit', 'Zwei oder mehr Gruppen bearbeiten gleiche oder unterschiedliche Arbeitsaufträge.', 'Fördert die Auseinandersetzung mit einem Sachverhalt. Aktiviert Teilnehmer, die in der Gesamtgruppe zurückhaltend sind. Ein Thema kann mit verschiedenen Fragestellungen bearbeitet werden.', 'Ergebnisdiskussion sollte angestrebt werden.'],
  ['ProjA', 'Projektarbeit', 'Teilnehmer, besser jedoch Partner oder Kleingruppen erhalten einen Arbeitsauftrag als mittel- oder langfristiges Projekt.', 'Fördert die selbstständige Erarbeitung und Vertiefung von Sachverhalten und Zusammenhängen. Fördert das Miteinander in den Projektgruppen.', 'Zur Führung der Projektgruppen sind regelmäßige Statusberichte erforderlich. Projektpräsentationen vorsehen. Projekterwartungen (Niveau, Umfang usw.) transparent machen.'],
  ['Plan', 'Planspiel', 'Teilnehmer bearbeiten eine realitätsnahe, komplexe Situation und treffen Entscheidungen innerhalb eines vorgegebenen und simulierten Szenarios.', 'Fördert vernetztes Denken, Entscheidungsfähigkeit und praxisnahes Lernen.', 'Hoher Vorbereitungsaufwand; Auswertung und Reflexion sind wichtig für den Lernerfolg.'],
  ['Ü', 'Übung', 'Arbeitsauftrag, der meist eine bestimmte Kompetenz bzw. Fertigkeit ins Zentrum stellt.', 'Eignet sich zur Vertiefung bzw. Verinnerlichung und um die Vermittlung darauf aufbauender Kompetenzen vorzubereiten bzw. ein Kompetenzfundament abzusichern.', 'Je komplexer eine Übung, desto mehr Zeit ist erforderlich. Ergebnissicherung und Besprechung der gewonnenen Erfahrung vorsehen.'],
  ['RS', 'Rollenspiel', 'Teilnehmer übernehmen vorgegebene Rollen und spielen typische Situationen aus der Praxis nach.', 'Fördert soziale Kompetenzen, Perspektivwechsel und sicheres Verhalten in realen Situationen.', 'Teilnehmer sollten sich wohlfühlen; klare Rollenbeschreibung und Nachbesprechung sind wichtig.']
];
const kbMethLabel = m => { const x = KB_METHODEN.find(y => y[1] + ' (' + y[0] + ')' === m || y[0] === m); return x ? `${x[1]} (${x[0]})` : (m || ''); };
const KB_STUNDEN = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const kbSlots = e => KB_STUNDEN.map(h => ({ h, thema: '', methodik: '', kapitel: '', notiz: '', ...((e?.stunden || []).find(x => x.h === h) || {}) }));
const kbIsPause = s => /^\s*pause\s*$/i.test(s.thema || '');
/* Zusammenhängende Stunden mit gleichem Thema wie in der Vorlage zusammenfassen (verbundene Zellen) */
function kbBlocks(slots) {
  const out = []; slots.forEach((s, i) => { const t = (s.thema || '').trim(), last = out[out.length - 1]; if (t && last && last.thema === t && !kbIsPause(s)) last.n++; else out.push({ i, n: 1, thema: t }); }); return out;
}
async function qKbLoad() {
  const gs = orgMyGroups(); if (!gs.some(g => g.id === S.org.kbG)) S.org.kbG = (gs.slice().sort((a, b) => (b.trainer_id === S.me.id) - (a.trainer_id === S.me.id) || orgMembers(b.id).length - orgMembers(a.id).length)[0])?.id || null;
  S.org.kbW ||= qMonday(localDate());
  const von = S.org.kbW, bis = qAddDays(von, 6);
  if (!S.org.kbG) { S.org.kb = []; S.org.kbAnw = []; return; }
  const ids = orgMembers(S.org.kbG).map(p => p.id);
  const [kb, anw] = await Promise.all([
    q(sb.from('klassenbuch').select('*').eq('gruppe_id', S.org.kbG).gte('datum', von).lte('datum', bis).order('datum')),
    ids.length ? q(sb.from('anwesenheit').select('azubi_id,datum,status,minuten,notiz').in('azubi_id', ids).gte('datum', von).lte('datum', bis)) : []]);
  Object.assign(S.org, { kb, kbAnw: anw });
}
const kbDateLong = d => new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
function kbAnwText(d) {
  const mem = orgMembers(S.org.kbG), a = (S.org.kbAnw || []).filter(x => x.datum === d), n = s => a.filter(x => x.status === s);
  if (!a.length) return 'Anwesenheit noch nicht erfasst';
  const da = n('anwesend').length + n('verspaetet').length, weg = a.filter(x => !['anwesend', 'verspaetet'].includes(x.status));
  return `Anwesend ${da} von ${mem.length}${n('verspaetet').length ? ` · ${n('verspaetet').length} verspätet` : ''}${weg.length ? ' · ' + weg.map(x => `${S.profiles[x.azubi_id]?.full_name.split(' ')[0] || ''} (${ANW[x.status][1].toLowerCase()})`).join(', ') : ''}`;
}
function orgKbHTML() {
  const gs = orgMyGroups(), gid = S.org.kbG;
  if (!gs.length) return empty('Du hast noch keine Gruppe. Lege unter Verwaltung › Gruppen eine an oder übernimm eine.');
  const von = S.org.kbW, kb = S.org.kb || [], today = localDate(), mem = orgMembers(gid);
  const days = []; for (let i = 0; i < 7; i++) { const d = qAddDays(von, i), wd = new Date(d + 'T12:00:00').getDay(); if ((wd !== 0 && wd !== 6) || kb.some(e => e.datum === d)) days.push(d); }
  const day = d => {
    const e = kb.find(x => x.datum === d), slots = kbSlots(e), filled = slots.some(s => s.thema || s.methodik);
    const blocks = kbBlocks(slots), start = new Map(blocks.map(b => [b.i, b]));
    const rows = slots.map((s, i) => { const b = start.get(i), p = kbIsPause(s);
      return `<tr class="${p ? 'pause' : ''}"><td class="z">${s.h}</td>${b ? `<td class="th" rowspan="${b.n}">${esc(s.thema || '')}</td>` : ''}<td class="m">${esc(p ? '' : kbMethLabel(s.methodik))}</td><td class="s">${esc(s.kapitel || '')}</td><td class="n">${esc(s.notiz || '')}</td></tr>`; }).join('');
    return `<div class="kb-day" ${d === today ? 'style="border-color:var(--accent)"' : ''}><div class="kb-date"><span>${esc(kbDateLong(d))}</span></div><div class="min-w-0">
      <div class="kb-head"><div>Unterrichtsart:</div><div>${esc(e?.unterrichtsart || '–')}</div><div>Trainer/Dozent:</div><div>${esc(e?.dozent || S.profiles[e?.trainer_id]?.full_name || '–')}</div></div>
      <div class="flex items-center gap-2 px-2.5 py-2 text-[12px] text-muted border-b border-line"><span class="flex-1 min-w-0">${esc(kbAnwText(d))}</span>
        ${e?.abgezeichnet_at ? '<span class="chip ok">✓ abgezeichnet</span>' : ''}<button class="btn ${filled ? 'ghost' : ''} py-1 px-3 text-[12.5px] flex-none" data-kbday="${d}">${filled ? 'Bearbeiten' : 'Ausfüllen'}</button></div>
      ${filled ? `<div class="overflow-x-auto"><table class="kb-tab"><colgroup><col style="width:52px"><col><col style="width:25%"><col style="width:58px"><col style="width:22%"></colgroup>
        <thead><tr><th>Zeit</th><th>Thema / Stoff / Ausgeführte Arbeiten</th><th>Methodik</th><th class="svp">Kapitel SVP</th><th>Notiz</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="p-3 text-[13px] text-muted">Noch nicht ausgefüllt.</div>'}
      ${e?.bemerkung ? `<div class="p-2.5 text-[12.5px] border-t border-line"><span class="text-muted">Bemerkung:</span> ${esc(e.bemerkung)}</div>` : ''}</div></div>`;
  };
  const open = kb.filter(e => !e.abgezeichnet_at && kbSlots(e).some(s => s.thema)).length;
  return `<div class="card p-4 mt-3">
      <div class="text-center font-display font-bold text-[17px]">Dokumentation Trainingsdurchführung</div>
      <div class="mt-3">${gs.length > 1 ? `<label class="lbl" for="kbG">Gruppe</label><select id="kbG" class="field">${gs.map(g => `<option value="${g.id}" ${g.id === gid ? 'selected' : ''}>${esc(orgGName(g))}</option>`).join('')}</select>` : `<div class="text-[15px] font-semibold text-center">${esc(orgGName(gs[0]))}</div>`}</div>
      <div class="flex items-center justify-between gap-2 mt-3"><button class="btn ghost py-2 px-3" id="kbPrev" aria-label="Vorige Woche">‹</button>
        <div class="text-center"><div class="text-[15px] font-bold">Jahr ${von.slice(0, 4)} · KW ${orgKw(von)}</div><div class="text-[12px] text-muted tnum">${fmtDate(von)} – ${fmtDate(qAddDays(von, 6))}</div></div>
        <button class="btn ghost py-2 px-3" id="kbNext" aria-label="Nächste Woche">›</button></div>
      <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[12px] text-muted"><span>${mem.length} Teilnehmende</span>${von !== qMonday(today) ? '<button class="text-accent font-semibold" id="kbToday">zur aktuellen Woche</button>' : ''}<input type="week" id="kbWeek" class="field py-1 text-[12px]" style="width:auto" value="${von.slice(0, 4)}-W${String(orgKw(von)).padStart(2, '0')}" aria-label="Kalenderwoche wählen"><button class="text-accent font-semibold" id="kbMeth">Methoden erklärt</button></div>
    </div>
    ${days.map(day).join('')}
    <div class="grid grid-cols-2 gap-2 mt-4">${open ? `<button class="btn ghost" id="kbSign">Woche abzeichnen (${open})</button>` : ''}<button class="btn ghost ${open ? '' : 'col-span-2'}" id="kbPdf">Woche als PDF</button><button class="btn ghost col-span-2" id="kbMail">PDF per E-Mail senden</button></div>
    <p class="text-[12px] text-muted mt-3">Abgezeichnete Tage sind festgeschrieben. Ändern kann sie danach nur die Koordination.</p>`;
}
function orgKbBind() {
  $('#kbG') && ($('#kbG').onchange = () => { S.org.kbG = $('#kbG').value; go(S.view); });
  $('#kbPrev') && ($('#kbPrev').onclick = () => { S.org.kbW = qAddDays(S.org.kbW, -7); go(S.view); });
  $('#kbNext') && ($('#kbNext').onclick = () => { S.org.kbW = qAddDays(S.org.kbW, 7); go(S.view); });
  $('#kbToday') && ($('#kbToday').onclick = () => { S.org.kbW = qMonday(localDate()); go(S.view); });
  $('#kbWeek') && ($('#kbWeek').onchange = () => { const m = /^(\d{4})-W(\d{2})$/.exec($('#kbWeek').value); if (!m) return; const j4 = new Date(+m[1], 0, 4, 12), mon = qMonday(localDate(j4)); S.org.kbW = qAddDays(mon, (+m[2] - 1) * 7); go(S.view); });
  $('#kbMeth') && ($('#kbMeth').onclick = () => kbMethSheet());
  $$('[data-kbday]').forEach(b => b.onclick = () => kbDaySheet(b.dataset.kbday));
  $('#kbSign') && ($('#kbSign').onclick = e => qConfirm(e.currentTarget, async () => {
    const ids = (S.org.kb || []).filter(x => !x.abgezeichnet_at && kbSlots(x).some(s => s.thema)).map(x => x.id);
    try { await q(sb.from('klassenbuch').update({ abgezeichnet_von: S.me.id, abgezeichnet_at: new Date().toISOString() }).in('id', ids)); toast('Abgezeichnet'); go(S.view); } catch (er) { toast(errText(er)); }
  }, 'Festschreiben? Nochmal tippen'));
  $('#kbPdf') && ($('#kbPdf').onclick = async e => { const btn = e.currentTarget; btn.disabled = true; try { const r = await orgKbPdf(); r.doc.save(r.name); toast('PDF erstellt'); } catch (er) { toast(errText(er)); } finally { btn.disabled = false; PDF_DE = false; } });
  $('#kbMail') && ($('#kbMail').onclick = () => qMailSheet('Klassenbuch per E-Mail', () => orgKbPdf(), `Dokumentation Trainingsdurchführung ${qGruppe(S.org.kbG)?.name || ''}, KW ${orgKw(S.org.kbW)}`));
}
function kbMethSheet() {
  sheetShell('Einsatz der Lehrmethoden', `<div class="flex flex-col gap-3">${KB_METHODEN.map(([k, n, er, vo, za]) => `<div class="card p-4"><div class="font-display font-bold text-[16px]">${n} <span class="text-muted font-normal">(${k})</span></div>
    <div class="text-[13px] mt-2"><span class="text-muted">Erläuterung:</span> ${esc(er)}</div><div class="text-[13px] mt-1.5"><span class="text-muted">Vorteil:</span> ${esc(vo)}</div><div class="text-[13px] mt-1.5"><span class="text-muted">Zu beachten:</span> ${esc(za)}</div></div>`).join('')}</div>`);
}
function kbDaySheet(d) {
  const e0 = (S.org.kb || []).find(x => x.datum === d), locked = !!e0?.abgezeichnet_at && !isAdmin();
  const prev = (S.org.kb || []).filter(x => x.datum < d).sort((a, b) => b.datum.localeCompare(a.datum))[0];
  let slots = kbSlots(e0);
  const art0 = e0?.unterrichtsart || prev?.unterrichtsart || KB_ARTEN[0], doz0 = e0?.dozent || prev?.dozent || S.me.full_name;
  const methOpts = v => `<option value="">– Methodik –</option>${KB_METHODEN.map(([k, n]) => `<option value="${k}" ${v === k || kbMethLabel(v) === `${n} (${k})` ? 'selected' : ''}>${n} (${k})</option>`).join('')}`;
  const rowHTML = (s, i) => `<div class="kb-ed ${kbIsPause(s) ? 'pause' : ''}" data-row="${i}">
      <div class="hd"><b>${s.h}</b>${i ? `<button type="button" data-same="${i}" title="Thema von ${KB_STUNDEN[i - 1]} übernehmen">↑ wie davor</button>` : ''}<button type="button" data-pause="${i}">${kbIsPause(s) ? 'keine Pause' : 'Pause'}</button></div>
      <textarea class="field" rows="2" maxlength="600" data-th="${i}" placeholder="Thema / Stoff / Ausgeführte Arbeiten" aria-label="Thema ${s.h}">${esc(s.thema || '')}</textarea>
      <div class="row2"><select class="field" data-me="${i}" aria-label="Methodik ${s.h}" ${kbIsPause(s) ? 'disabled' : ''}>${methOpts(s.methodik)}</select>
      <input class="field" data-ka="${i}" maxlength="20" placeholder="Kapitel SVP" value="${esc(s.kapitel || '')}" aria-label="Kapitel SVP ${s.h}">
      <input class="field kb-no" data-no="${i}" maxlength="300" placeholder="Notiz (Freitext)" value="${esc(s.notiz || '')}" aria-label="Notiz ${s.h}"></div></div>`;
  sheetShell(`${kbDateLong(d)}`, `<form id="kdForm" class="flex flex-col gap-3">
    ${locked ? `<div class="card p-3 text-[13px] text-muted">Abgezeichnet von ${esc(S.profiles[e0.abgezeichnet_von]?.full_name || '')} am ${fmtDate(e0.abgezeichnet_at)}. Nur die Koordination kann den Tag noch ändern.</div>` : ''}
    <div class="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div><label class="lbl" for="kdA">Unterrichtsart</label><select id="kdA" class="field">${[...new Set([...KB_ARTEN, art0])].map(a => `<option ${a === art0 ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></div>
      <div><label class="lbl" for="kdD">Trainer/Dozent</label><input id="kdD" class="field" maxlength="120" value="${esc(doz0)}"></div></div>
    <div class="text-[12px] text-muted">${esc(kbAnwText(d))}</div>
    <div class="flex items-center justify-between"><div class="eyebrow">Stunden</div><div class="flex gap-3">${!e0 && prev ? '<button type="button" class="text-[12.5px] font-semibold text-accent" id="kdCopy">Inhalte vom ' + fmtDate(prev.datum).slice(0, 6) + ' übernehmen</button>' : ''}</div></div>
    <details class="card p-3"><summary class="text-[13px] font-semibold text-accent cursor-pointer">Methoden erklärt</summary><div class="flex flex-col gap-2 mt-2">${KB_METHODEN.map(([k, n, er, vo, za]) => `<div class="text-[12.5px]"><b>${n} (${k})</b> – ${esc(er)} <span class="text-muted">Vorteil: ${esc(vo)} Zu beachten: ${esc(za)}</span></div>`).join('')}</div></details>
    <div class="flex flex-col gap-2" id="kdRows">${slots.map(rowHTML).join('')}</div>
    <div class="card p-4"><label class="lbl" for="kdB">Bemerkung <span class="font-normal text-muted">(optional)</span></label><input id="kdB" class="field" maxlength="1000" value="${esc(e0?.bemerkung || '')}" placeholder="z. B. Gastreferent, Ausfall, Prüfung"></div>
    ${locked ? '' : '<button class="btn">Speichern</button>'}
    ${e0 && !locked ? '<button type="button" class="btn danger" id="kdDel">Tag leeren</button>' : ''}</form>`);
  const read = () => slots = slots.map((s, i) => ({ h: s.h, thema: $(`[data-th="${i}"]`).value.trim(), methodik: $(`[data-me="${i}"]`).value, kapitel: $(`[data-ka="${i}"]`).value.trim(), notiz: $(`[data-no="${i}"]`).value.trim() }));
  const redraw = () => { $('#kdRows').innerHTML = slots.map(rowHTML).join(''); bindRows(); };
  const bindRows = () => {
    $$('[data-same]').forEach(b => b.onclick = () => { read(); const i = +b.dataset.same; slots[i].thema = slots[i - 1].thema; if (!slots[i].methodik) slots[i].methodik = slots[i - 1].methodik; slots[i].kapitel ||= slots[i - 1].kapitel; redraw(); });
    $$('[data-pause]').forEach(b => b.onclick = () => { read(); const i = +b.dataset.pause; if (kbIsPause(slots[i])) slots[i].thema = ''; else { slots[i].thema = 'Pause'; slots[i].methodik = ''; } redraw(); });
    if (locked) $$('#kdForm input, #kdForm textarea, #kdForm select, #kdRows button').forEach(x => x.disabled = true);
  };
  bindRows();
  $('#kdCopy') && ($('#kdCopy').onclick = () => { slots = kbSlots(prev).map(s => ({ ...s })); $('#kdA').value = prev.unterrichtsart || $('#kdA').value; redraw(); toast('Übernommen – bitte anpassen'); });
  if (locked) return;
  $('#kdForm').onsubmit = async ev => {
    ev.preventDefault(); read();
    const stunden = slots.filter(s => s.thema || s.methodik || s.kapitel || s.notiz).map(s => s.notiz ? s : { h: s.h, thema: s.thema, methodik: s.methodik, kapitel: s.kapitel });
    if (!stunden.length) return toast('Bitte mindestens eine Stunde ausfüllen.');
    const first = stunden.find(s => s.thema && !kbIsPause(s));
    const row = { unterrichtsart: $('#kdA').value, dozent: $('#kdD').value.trim() || null, stunden, bemerkung: $('#kdB').value.trim() || null, thema: first ? first.thema.slice(0, 200) : null,
      art: { 'Virtueller Unterricht': 'O', Werkstattphase: 'W', 'Präsenzunterricht': 'S' }[$('#kdA').value] || null, von: stunden[0].h, bis: qAddHour(stunden[stunden.length - 1].h), updated_at: new Date().toISOString() };
    try {
      if (e0) await q(sb.from('klassenbuch').update(row).eq('id', e0.id));
      else await q(sb.from('klassenbuch').insert({ ...row, datum: d, gruppe_id: S.org.kbG, betrieb_id: S.betrieb?.id || S.me.betrieb_id, trainer_id: S.me.id }));
      closeSheet(); toast('Gespeichert'); go(S.view);
    } catch (er) { toast(errText(er)); }
  };
  $('#kdDel') && ($('#kdDel').onclick = ev => qConfirm(ev.currentTarget, async () => { try { await q(sb.from('klassenbuch').delete().eq('id', e0.id)); closeSheet(); toast('Geleert'); go(S.view); } catch (er) { toast(errText(er)); } }));
}
const qAddHour = h => { const n = (+h.slice(0, 2) + 1) % 24; return String(n).padStart(2, '0') + h.slice(2); };

async function orgKbPdf() {
  const g = qGruppe(S.org.kbG); if (!g) throw new Error('Keine Gruppe gewählt.');
  const von = S.org.kbW, bis = qAddDays(von, 6), kb = S.org.kb || [];
  const P = await qPdfStart(false), { doc, FONT, W, M } = P, title = 'Dokumentation Trainingsdurchführung';
  const BLUE = [214, 225, 244], BLUE2 = [180, 198, 231], GREEN = [226, 239, 218], GREY = [217, 217, 217], YEL = [255, 242, 168];
  // Kopf wie in der Vorlage
  doc.setFillColor(...BLUE2); doc.rect(M, 12, W - 2 * M, 12, 'F');
  doc.setFont(FONT, 'bold'); doc.setFontSize(17); doc.text(pdfSafe(title), W / 2, 20, { align: 'center' });
  doc.setFont(FONT, 'normal'); doc.setFontSize(9.5);
  const info = [['Gruppe', g.name], ['Jahr', von.slice(0, 4)], ['KW', String(orgKw(von))], ['Zeitraum', `${fmtDate(von)} – ${fmtDate(bis)}`], ['Träger', S.hotel || '']];
  let x0 = M; info.forEach(([l, v]) => { const w = l === 'Gruppe' || l === 'Träger' ? 48 : l === 'Zeitraum' ? 44 : 20; doc.setDrawColor(190); doc.setFillColor(255, 248, 225); doc.rect(x0, 27, w - 1.5, 10, 'FD'); doc.setFontSize(7); doc.setTextColor(110); doc.text(pdfSafe(l), x0 + 1.5, 30.2); doc.setTextColor(0); doc.setFontSize(9); doc.text(pdfSafe(v).slice(0, 34), x0 + 1.5, 35); x0 += w; });
  let y = 42;
  const dW = 12, tX = M + dW, zW = 14, mW = 36, kW = 16, nW = 34, thW = W - 2 * M - dW - zW - mW - kW - nW, rowH = 5.6;
  const days = []; for (let i = 0; i < 7; i++) { const d = qAddDays(von, i), wd = new Date(d + 'T12:00:00').getDay(); if ((wd !== 0 && wd !== 6) || kb.some(e => e.datum === d)) days.push(d); }
  days.forEach(d => {
    const e = kb.find(x => x.datum === d), slots = kbSlots(e), blocks = kbBlocks(slots);
    const bh = 6.2 * 2 + 6 + slots.length * rowH + 5.5;
    if (y + bh > 285) { doc.addPage(); y = 14; }
    const y0 = y;
    // Datum senkrecht links
    doc.setFillColor(...GREEN); doc.rect(M, y0, dW, bh, 'F');
    doc.setFont(FONT, 'bold'); doc.setFontSize(10); doc.text(pdfSafe(kbDateLong(d)), M + dW / 2 + 1.5, y0 + bh - 3, { angle: 90 });
    // Unterrichtsart / Trainer
    [['Unterrichtsart:', e?.unterrichtsart || ''], ['Trainer/Dozent:', e?.dozent || S.profiles[e?.trainer_id]?.full_name || '']].forEach(([l, v], i) => {
      const yy = y0 + i * 6.2; doc.setFillColor(...BLUE); doc.rect(tX, yy, W - M - tX, 6.2, 'F'); doc.setDrawColor(255); doc.line(tX, yy + 6.2, W - M, yy + 6.2);
      doc.setFont(FONT, 'bold'); doc.setFontSize(7.5); doc.text(pdfSafe(l), tX + 1.5, yy + 4.2); doc.setFont(FONT, 'normal'); doc.setFontSize(9); doc.text(pdfSafe(v), tX + zW + (W - M - tX - zW) / 2, yy + 4.3, { align: 'center' });
    });
    y = y0 + 12.4;
    // Tabellenkopf
    doc.setFillColor(...GREY); doc.rect(tX, y, W - M - tX, 6, 'F'); doc.setFillColor(...YEL); doc.rect(W - M - nW - kW, y, kW, 6, 'F');
    doc.setFont(FONT, 'bold'); doc.setFontSize(7.5);
    doc.text('Zeit', tX + zW / 2, y + 4, { align: 'center' }); doc.text(pdfSafe('Thema / Stoff / Ausgeführte Arbeiten'), tX + zW + thW / 2, y + 4, { align: 'center' }); doc.text('Methodik', tX + zW + thW + mW / 2, y + 4, { align: 'center' }); doc.setFontSize(7); doc.text('Kapitel SVP', W - M - nW - kW / 2, y + 4, { align: 'center' }); doc.setFontSize(7.5); doc.text('Notiz', W - M - nW / 2, y + 4, { align: 'center' });
    y += 6;
    const ty = y; doc.setFont(FONT, 'normal'); doc.setDrawColor(200);
    slots.forEach((s, i) => { const yy = ty + i * rowH;
      if (kbIsPause(s)) { doc.setFillColor(242, 242, 242); doc.rect(tX, yy, W - M - tX, rowH, 'F'); }
      doc.setFontSize(8); doc.text(s.h.replace(/^0/, ''), tX + zW / 2, yy + 3.8, { align: 'center' });
      doc.setFontSize(7.5); if (!kbIsPause(s)) doc.text(pdfSafe(kbMethLabel(s.methodik)), tX + zW + thW + mW / 2, yy + 3.8, { align: 'center' });
      doc.text(pdfSafe(s.kapitel || ''), W - M - nW - kW / 2, yy + 3.8, { align: 'center' });
      if (s.notiz) { doc.setFontSize(6.3); doc.text(doc.splitTextToSize(pdfSafe(s.notiz), nW - 2).slice(0, 2), W - M - nW + 1, yy + 2.5); doc.setFontSize(7.5); }
      doc.line(tX, yy + rowH, tX + zW, yy + rowH); doc.line(tX + zW + thW, yy + rowH, W - M, yy + rowH); });
    blocks.forEach(b => { const yy = ty + b.i * rowH, h = b.n * rowH;
      doc.line(tX + zW, yy + h, tX + zW + thW, yy + h);
      if (b.thema) { doc.setFontSize(7.5); const ls = doc.splitTextToSize(pdfSafe(b.thema), thW - 3), max = Math.max(1, Math.floor((h - 1.2) / 3.2)); doc.text(ls.slice(0, max), tX + zW + 1.5, yy + 3.4); } });
    doc.line(tX + zW, ty, tX + zW, ty + slots.length * rowH); doc.line(tX + zW + thW, ty, tX + zW + thW, ty + slots.length * rowH); doc.line(W - M - nW - kW, ty, W - M - nW - kW, ty + slots.length * rowH); doc.line(W - M - nW, ty, W - M - nW, ty + slots.length * rowH);
    y = ty + slots.length * rowH;
    doc.setFontSize(7); doc.setTextColor(90); doc.text(pdfSafe(kbAnwText(d) + (e?.bemerkung ? ' · Bemerkung: ' + e.bemerkung : '') + (e?.abgezeichnet_at ? ` · abgezeichnet ${fmtDate(e.abgezeichnet_at)}` : '')).slice(0, 170), tX + 1.5, y + 3.8); doc.setTextColor(0);
    doc.setDrawColor(160); doc.rect(M, y0, W - 2 * M, bh);
    y = y0 + bh + 4;
  });
  if (y > 268) { doc.addPage(); y = 30; }
  y += 12; doc.setDrawColor(120); doc.line(M, y, M + 70, y); doc.line(W - M - 70, y, W - M, y);
  doc.setFontSize(8); doc.setTextColor(90); doc.text(pdfSafe('Datum, Unterschrift Trainer/in'), M, y + 4); doc.text(pdfSafe('Datum, Unterschrift Koordination'), W - M - 70, y + 4); doc.setTextColor(0);
  P.foot('Klassenbuch');
  return { doc, name: `Klassenbuch_${orgAscii(g.name)}_KW${orgKw(von)}_${von.slice(0, 4)}.pdf`, subject: `Dokumentation Trainingsdurchführung ${g.name}, KW ${orgKw(von)}` };
}

/* =====================================================================
   Desk als Unterapp: azubihub-app.de/desk/ (bis zur eigenen Domain)
   Gleiche App und Datenbank, eigenes Erscheinungsbild schon auf der Anmeldeseite.
   ?app=desk schaltet ein, ?app=hub wieder aus.
   ===================================================================== */
function deskOn() {
  const p = new URLSearchParams(location.search).get('app');
  try { if (p === 'desk') localStorage.setItem('azubihub.app', 'desk'); else if (p === 'hub') localStorage.removeItem('azubihub.app'); return p === 'desk' || (p !== 'hub' && localStorage.getItem('azubihub.app') === 'desk'); }
  catch { return p === 'desk'; }
}
(() => {
  if (!deskOn()) return;
  const set = (sel, attr, v) => { const e = document.querySelector(sel); if (e) e.setAttribute(attr, v); };
  set('link[rel=manifest]', 'href', './desk/manifest.webmanifest');
  set('link[rel=apple-touch-icon]', 'href', './brand/desk-192.png');
  set('meta[name=theme-color]', 'content', '#2f3539');
  document.title = 'Desk';
})();
function deskLogin() {
  if (!deskOn()) return;
  try { qBrand(true); } catch {}
  const tx = (sel, v) => { const e = $(sel); if (e) e.textContent = v; };
  tx('#loginText', 'Qualifizierung, Anwesenheit, Klassenbuch und Tests für Trainer und Teilnehmende.');
  tx('[data-auth="betrieb"]', 'Lernstandort anmelden');
  const biz = $('#authForm p[data-biz]'); if (biz) biz.textContent = 'Für Lernstandorte, die Desk neu nutzen: Trag den Freischalt-Code von NovaWorks ein. Du wirst die Koordination und lädst danach Trainer und Teilnehmende ein.';
  $('#bName')?.setAttribute('placeholder', 'z. B. Lernstandort Nord');
  const lic = $('label[for="bLic"]'); if (lic) lic.textContent = 'Freischalt-Code';
  $('#bLic')?.setAttribute('placeholder', 'z. B. DESK-PRO-XXXX-XXXX');
  const az = $('#aRolle option[value="azubi"]'); if (az) az.textContent = 'Teilnehmer/in';
  const cl = $('label[for="aCode"]'); if (cl) cl.textContent = 'Code deines Lernstandorts';
  $('#aCode')?.setAttribute('placeholder', 'bekommst du von deiner Trainerin oder deinem Trainer');
  const info = document.querySelector('#authScreen a[href="./start/"]'); if (info) info.parentElement.hidden = true;
  const bl = $('label[for="bName"]'); if (bl) bl.textContent = 'Name des Lernstandorts';
  $('#bPos')?.setAttribute('placeholder', 'z. B. Koordination, Trainer/in');
  const fix = () => setTimeout(() => { const btn = $('#authBtn'); if (btn && /Betrieb anlegen/.test(btn.textContent)) btn.textContent = 'Lernstandort anlegen'; }, 0);
  $$('[data-auth]').forEach(x => x.addEventListener('click', fix)); fix();
  const demo = $('#demoBtn'); if (demo) demo.onclick = () => { location.href = './?app=desk&demo=c1tt-trainer'; };
}
document.addEventListener('DOMContentLoaded', deskLogin);
