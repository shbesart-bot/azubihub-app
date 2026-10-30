/* AzubiHub · Qualifizierungsmodus, Teil 3: Gruppen mit Vertretung, Praktika im Werk mit Rückmeldung in beide Richtungen.
   Wird nach quali2.js und vor dem Hauptskript geladen. */

(() => {
  const css = `
  .rate{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
  .rate button{padding:8px 2px;border-radius:9px;border:1px solid var(--line);background:var(--surface);font:inherit;font-size:13px;font-weight:700;color:var(--muted)}
  .rate button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
  .rate4{grid-template-columns:repeat(4,minmax(0,1fr))}
  .rate4 button{font-size:12.5px;font-weight:600}
  .pk-bar{display:flex;gap:3px}.pk-bar i{flex:1;height:7px;border-radius:3px;background:var(--line)}.pk-bar i.on{background:var(--accent)}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

/* =====================================================================
   Gruppen: laden und Sichtbarkeit (die Datenbank erzwingt dasselbe)
   ===================================================================== */
async function qGroupsLoad() {
  try {
    if (!isQuali()) { S.qgr = null; return; }
    const [g, v, tn] = await Promise.all([
      q(sb.from('quali_gruppen').select('*').order('name')),
      q(sb.from('quali_vertretungen').select('*').gte('bis', localDate(new Date(Date.now() - 30 * 864e5))).order('von')),
      q(sb.from('quali_teilnahmen').select('azubi_id,gruppe_id'))
    ]);
    S.qgr = { g, v, tn: Object.fromEntries(tn.map(r => [r.azubi_id, r.gruppe_id])) };
  } catch { S.qgr = null; }
}
const qVertAktiv = (v, d = localDate()) => v.von <= d && d <= v.bis;
const qGruppe = id => (S.qgr?.g || []).find(g => g.id === id);
function qMyGroupIds() {
  if (!S.qgr || !S.me) return [];
  return S.qgr.g.filter(g => g.trainer_id === S.me.id || S.qgr.v.some(v => v.gruppe_id === g.id && v.trainer_id === S.me.id && qVertAktiv(v))).map(g => g.id);
}
function qSees(p) {
  try {
    if (!S.qgr || !S.qgr.g.length || !S.me || S.me.role !== 'ausbilder' || !p || p.role !== 'azubi' || p.id === S.me.id) return true;
    const gid = S.qgr.tn[p.id]; return !!gid && qMyGroupIds().includes(gid);
  } catch { return true; }
}
const qCanTeam = () => isAdmin() || can('team');
const qGroupLabel = uid => { const g = qGruppe(S.qgr?.tn?.[uid]); return g ? g.name : ''; };

/* =====================================================================
   Reiter-Weiche für quali2.js: Gruppen, Praktika (Trainer), Praktikum (Teilnehmende)
   ===================================================================== */
async function q3Load() {
  const tab = S.quali.tab;
  if (!isAzubi() && tab === 'gruppen') { await qGroupsLoad(); return true; }
  if (!isAzubi() && tab === 'auswertung') { await qAuswLoad(); return true; }
  if (!isAzubi() && tab === 'praktika') { S.quali.pk = await q(sb.from('quali_praktika').select('*').order('von', { ascending: false })); return true; }
  if (isAzubi() && tab === 'praktikum') { S.quali.myPk = await q(sb.rpc('praktika_meine')); return true; }
  return false;
}
function q3HTML() {
  const tab = S.quali?.tab;
  if (!isAzubi() && tab === 'gruppen') return qGruppenHTML();
  if (!isAzubi() && tab === 'auswertung') return qAuswHTML();
  if (!isAzubi() && tab === 'praktika') return qPraktikaHTML();
  if (isAzubi() && tab === 'praktikum') return qMyPraktikaHTML();
  return null;
}
function q3Bind() {
  const tab = S.quali?.tab;
  if (!isAzubi() && tab === 'gruppen') { qGruppenBind(); return true; }
  if (!isAzubi() && tab === 'auswertung') { qAuswBind(); return true; }
  if (!isAzubi() && tab === 'praktika') { qPraktikaBind(); return true; }
  if (isAzubi() && tab === 'praktikum') { $$('[data-pkfb]').forEach(b => b.onclick = () => qTnFeedbackSheet(b.dataset.pkfb)); return true; }
  return false;
}

/* =====================================================================
   Gruppen (Trainer, Koordination)
   ===================================================================== */
function qGruppenHTML() {
  const G = S.qgr || { g: [], v: [], tn: {} }, me = S.me.id, today = localDate();
  const rows = S.quali.rows || [], trainers = Object.values(S.profiles).filter(p => ['ausbilder', 'admin'].includes(p.role) && p.aktiv !== false);
  const members = gid => rows.filter(r => r.gruppe_id === gid).map(r => S.profiles[r.azubi_id]).filter(Boolean).sort((a, b) => a.full_name.localeCompare(b.full_name));
  const ohne = qCanTeam() ? rows.filter(r => !r.gruppe_id).map(r => S.profiles[r.azubi_id]).filter(Boolean) : [];
  const card = g => {
    const tr = g.trainer_id ? S.profiles[g.trainer_id] : null, mine = g.trainer_id === me;
    const vs = G.v.filter(v => v.gruppe_id === g.id && v.bis >= today), meV = vs.find(v => v.trainer_id === me && qVertAktiv(v)), m = members(g.id);
    const canEndV = v => qCanTeam() || v.trainer_id === me || v.created_by === me || mine;
    return `<div class="card p-4 mt-3">
      <div class="flex items-start gap-3"><div class="flex-1 min-w-0"><div class="font-display font-bold text-[17px]">${esc(g.name)}</div>
        <div class="text-[13px] text-muted mt-0.5">${tr ? `Trainer/in: <b class="text-fg">${esc(tr.full_name)}</b>` : '<span style="color:var(--warn)">noch ohne Trainer/in</span>'}${g.notiz ? ' · ' + esc(g.notiz) : ''}</div></div>
        ${mine ? '<span class="chip ok">deine Gruppe</span>' : meV ? `<span class="chip brass">du vertrittst bis ${fmtDate(meV.bis)}</span>` : ''}</div>
      ${m.length ? `<div class="flex flex-wrap gap-1.5 mt-3">${m.map(p => `<span class="chip">${esc(p.full_name)}</span>`).join('')}</div>` : '<div class="text-[13px] text-muted mt-3">Noch keine Teilnehmenden zugeordnet.</div>'}
      ${vs.length ? `<div class="mt-3 flex flex-col gap-1.5">${vs.map(v => `<div class="flex items-center gap-2 text-[13px] p-2 rounded-lg" style="background:var(--sunk)"><span class="flex-1 min-w-0">Vertretung: <b>${esc(S.profiles[v.trainer_id]?.full_name || '')}</b> · ${fmtDate(v.von)}–${fmtDate(v.bis)}${qVertAktiv(v) ? ' · <span style="color:var(--ok)">aktiv</span>' : ''}${v.notiz ? ' · ' + esc(v.notiz) : ''}</span>${canEndV(v) ? `<button class="text-[12px] font-semibold" style="color:var(--crit)" data-gvdel="${v.id}">beenden</button>` : ''}</div>`).join('')}</div>` : ''}
      <div class="flex flex-wrap gap-2 mt-3">
        ${!g.trainer_id && isAusbilder() ? `<button class="btn py-1.5 text-[13px]" data-gtake="${g.id}">Gruppe übernehmen</button>` : ''}
        ${mine ? `<button class="btn ghost py-1.5 text-[13px]" data-gvert="${g.id}">Vertretung eintragen</button><button class="btn ghost py-1.5 text-[13px]" data-ggive="${g.id}">Gruppe abgeben</button>` : ''}
        ${g.trainer_id && !mine && !meV && S.me.role === 'ausbilder' ? `<button class="btn ghost py-1.5 text-[13px]" data-gvself="${g.id}">Ich vertrete diese Gruppe</button>` : ''}
        ${qCanTeam() ? `<button class="btn ghost py-1.5 text-[13px]" data-gedit="${g.id}">Bearbeiten</button>` : ''}
      </div></div>`;
  };
  const mineFirst = G.g.slice().sort((a, b) => (b.trainer_id === me) - (a.trainer_id === me) || a.name.localeCompare(b.name));
  return `${secTitle('Gruppen', qCanTeam() ? '<button id="gNew" class="text-[13px] font-semibold text-accent">+ Neue Gruppe</button>' : '')}
    ${G.g.length ? mineFirst.map(card).join('') : empty(qCanTeam() ? 'Noch keine Gruppen. Lege eine an und ordne Teilnehmende und Trainer zu.' : 'Noch keine Gruppen angelegt. Das übernimmt die Koordination.')}
    ${ohne.length && G.g.length ? `${secTitle('Ohne Gruppe', `<span class="chip warn tnum">${ohne.length}</span>`)}<div class="card p-4 flex flex-wrap gap-1.5">${ohne.map(p => `<span class="chip">${esc(p.full_name)}</span>`).join('')}</div>
      <p class="text-[12px] text-muted mt-2">Diese Teilnehmenden sieht nur die Koordination, bis sie einer Gruppe zugeordnet sind.</p>` : ''}
    <div class="card p-4 mt-4 text-[13px] text-muted flex flex-col gap-2">
      <div>Sobald es Gruppen gibt, sehen Trainerinnen und Trainer nur die Teilnehmenden ihrer Gruppen – Nachweise, Anwesenheit, Tests, Gespräche und Praktika. Die Koordination sieht alle.</div>
      <div>Eine Vertretung gilt nur im eingetragenen Zeitraum. Danach ist die Gruppe für die Vertretung automatisch wieder ausgeblendet.</div></div>`;
}
function qGruppenBind() {
  const after = async msg => { await qGroupsLoad(); toast(msg); renderTabs(); go(S.view); };
  $('#gNew') && ($('#gNew').onclick = () => qGruppeSheet(null));
  $$('[data-gedit]').forEach(b => b.onclick = () => qGruppeSheet(qGruppe(b.dataset.gedit)));
  $$('[data-gtake]').forEach(b => b.onclick = async () => { try { await q(sb.rpc('quali_gruppe_uebernehmen', { p_gruppe: b.dataset.gtake })); await after('Gruppe übernommen'); } catch (e) { toast(errText(e)); } });
  $$('[data-ggive]').forEach(b => b.onclick = () => qConfirm(b, async () => { try { await q(sb.rpc('quali_gruppe_abgeben', { p_gruppe: b.dataset.ggive })); await after('Gruppe abgegeben'); } catch (e) { toast(errText(e)); } }, 'Wirklich abgeben?'));
  $$('[data-gvert]').forEach(b => b.onclick = () => qVertretungSheet(qGruppe(b.dataset.gvert), false));
  $$('[data-gvself]').forEach(b => b.onclick = () => qVertretungSheet(qGruppe(b.dataset.gvself), true));
  $$('[data-gvdel]').forEach(b => b.onclick = () => qConfirm(b, async () => { try { await q(sb.from('quali_vertretungen').delete().eq('id', b.dataset.gvdel)); await after('Vertretung beendet'); } catch (e) { toast(errText(e)); } }, 'Sicher?'));
}
function qVertretungSheet(g, self) {
  if (!g) return;
  const others = Object.values(S.profiles).filter(p => ['ausbilder', 'admin'].includes(p.role) && p.aktiv !== false && p.id !== g.trainer_id).sort((a, b) => a.full_name.localeCompare(b.full_name));
  const t = localDate();
  sheetShell(self ? 'Vertretung übernehmen' : 'Vertretung eintragen', `<form id="gvForm" class="card p-4 flex flex-col gap-3">
    <div class="text-[14px]">Gruppe <b>${esc(g.name)}</b>${g.trainer_id ? ` von ${esc(S.profiles[g.trainer_id]?.full_name || '')}` : ''}</div>
    ${self ? '' : `<div><label class="lbl" for="gvT">Wer vertritt?</label><select id="gvT" class="field" required>${others.map(p => `<option value="${p.id}">${esc(p.full_name)}${p.position ? ' · ' + esc(p.position) : ''}</option>`).join('')}</select></div>`}
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="gvV">Von</label><input id="gvV" type="date" class="field" value="${t}" required></div><div><label class="lbl" for="gvB">Bis</label><input id="gvB" type="date" class="field" value="${qAddDays(t, 4)}" required></div></div>
    <div><label class="lbl" for="gvN">Notiz <span class="font-normal text-muted">(optional)</span></label><input id="gvN" class="field" maxlength="300" placeholder="z. B. Urlaub, Schulung"></div>
    <button class="btn">Speichern</button>
    <p class="text-[12px] text-muted">Im Zeitraum sieht die Vertretung alle Teilnehmenden der Gruppe. Danach nicht mehr.</p></form>`);
  $('#gvForm').onsubmit = async e => {
    e.preventDefault(); const von = $('#gvV').value, bis = $('#gvB').value;
    if (bis < von) return toast('„Bis“ liegt vor „Von“.');
    try { await q(sb.from('quali_vertretungen').insert({ gruppe_id: g.id, trainer_id: self ? S.me.id : $('#gvT').value, von, bis, notiz: $('#gvN').value.trim() || null, created_by: S.me.id }));
      closeSheet(); await qGroupsLoad(); toast('Vertretung eingetragen'); renderTabs(); go(S.view); } catch (er) { toast(errText(er)); }
  };
}
function qGruppeSheet(g0) {
  const g = g0 ? { ...g0 } : { name: '', trainer_id: null, notiz: '' };
  const rows = (S.quali.rows || []).map(r => ({ r, p: S.profiles[r.azubi_id] })).filter(x => x.p).sort((a, b) => a.p.full_name.localeCompare(b.p.full_name));
  const trainers = Object.values(S.profiles).filter(p => ['ausbilder', 'admin'].includes(p.role) && p.aktiv !== false).sort((a, b) => a.full_name.localeCompare(b.full_name));
  sheetShell(g0 ? 'Gruppe bearbeiten' : 'Neue Gruppe', `<form id="gForm" class="flex flex-col gap-3"><div class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="gN">Name</label><input id="gN" class="field" maxlength="80" required value="${esc(g.name)}" placeholder="z. B. TQ Kautschuk Gruppe A"></div>
    <div><label class="lbl" for="gT">Trainer/in</label><select id="gT" class="field"><option value="">– noch offen –</option>${trainers.map(p => `<option value="${p.id}" ${g.trainer_id === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></div>
    <div><label class="lbl" for="gZ">Notiz <span class="font-normal text-muted">(optional)</span></label><input id="gZ" class="field" maxlength="300" value="${esc(g.notiz || '')}" placeholder="z. B. Frühschicht, Standort Nord"></div></div>
    <div class="flex items-center justify-between"><div class="eyebrow">Teilnehmende</div><span class="text-[12px] text-muted">nur mit zugeordneter Maßnahme</span></div>
    <div class="card">${rows.length ? rows.map(({ r, p }, i) => { const other = r.gruppe_id && r.gruppe_id !== g0?.id ? qGruppe(r.gruppe_id) : null; return `<label class="flex items-center gap-3 p-3 ${i ? 'border-t border-line' : ''}"><input type="checkbox" class="cbx" data-gm="${r.id}" ${g0 && r.gruppe_id === g0.id ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)">
      <span class="flex-1 min-w-0"><span class="block text-[14px] font-semibold truncate">${esc(p.full_name)}</span><span class="block text-[12px] text-muted truncate">${esc(Q_KATALOG[r.massnahme]?.kurz || '')}${other ? ` · jetzt in „${esc(other.name)}“` : ''}</span></span></label>`; }).join('') : '<div class="p-4 text-[13px] text-muted">Noch keine Teilnehmenden mit Maßnahme.</div>'}</div>
    <button class="btn">Speichern</button>${g0 ? '<button type="button" class="btn danger" id="gDel">Gruppe löschen</button>' : ''}</form>`);
  $('#gForm').onsubmit = async e => {
    e.preventDefault();
    const row = { name: $('#gN').value.trim(), trainer_id: $('#gT').value || null, notiz: $('#gZ').value.trim() || null };
    if (!row.name) return toast('Bitte einen Namen eingeben.');
    try {
      const saved = g0 ? await q(sb.from('quali_gruppen').update(row).eq('id', g0.id).select().single()) : await q(sb.from('quali_gruppen').insert(row).select().single());
      const want = new Set($$('[data-gm]').filter(c => c.checked).map(c => c.dataset.gm));
      const add = rows.filter(({ r }) => want.has(r.id) && r.gruppe_id !== saved.id).map(({ r }) => r.id);
      const rem = rows.filter(({ r }) => !want.has(r.id) && r.gruppe_id === saved.id).map(({ r }) => r.id);
      if (add.length) await q(sb.from('quali_teilnahmen').update({ gruppe_id: saved.id }).in('id', add));
      if (rem.length) await q(sb.from('quali_teilnahmen').update({ gruppe_id: null }).in('id', rem));
      (S.quali.rows || []).forEach(r => { if (add.includes(r.id)) r.gruppe_id = saved.id; if (rem.includes(r.id)) r.gruppe_id = null; });
      closeSheet(); await qGroupsLoad(); toast('Gruppe gespeichert'); renderTabs(); go(S.view);
    } catch (er) { toast(errText(er)); }
  };
  if ($('#gDel')) $('#gDel').onclick = () => qConfirm($('#gDel'), async () => { try { await q(sb.from('quali_gruppen').delete().eq('id', g0.id)); (S.quali.rows || []).forEach(r => { if (r.gruppe_id === g0.id) r.gruppe_id = null; }); closeSheet(); await qGroupsLoad(); toast('Gruppe gelöscht'); go(S.view); } catch (er) { toast(errText(er)); } }, 'Wirklich löschen? Nochmal tippen');
}

/* =====================================================================
   Praktika im Werk
   ===================================================================== */
const PK_AL = ['Pünktlichkeit und Zuverlässigkeit', 'Arbeitsqualität', 'Arbeitssicherheit und Ordnung', 'Zusammenarbeit im Team', 'Lernbereitschaft', 'Selbstständigkeit'];
const PK_TN = ['Betreuung und Anleitung', 'Abwechslungsreiche Aufgaben', 'Ich habe viel gelernt', 'Aufnahme im Team'];
const PK_SCALE = ['', 'mangelhaft', 'ausreichend', 'befriedigend', 'gut', 'sehr gut'];
const PK_JN = ['Ja', 'Eher ja', 'Eher nein', 'Nein'];
const qPkState = p => { const t = localDate(); if (p.abgesegnet_at) return ['ok', 'abgeschlossen']; if (t < p.von) return ['', 'geplant']; if (t <= p.bis) return ['brass', 'läuft']; return ['warn', 'Rückmeldung / Freigabe']; };
const qPkLink = tok => `${location.origin}${location.pathname.replace(/[^/]*$/, '')}?praktikum=${tok}`;

function qRateHTML(key, labels, vals = {}) {
  return labels.map((l, i) => `<div><div class="text-[14px] font-semibold mb-1.5">${esc(l)}</div><div class="rate" role="radiogroup" aria-label="${esc(l)}">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-pressed="${vals[l] === n}" aria-checked="${vals[l] === n}" data-rk="${key}" data-ri="${i}" data-rv="${n}" title="${PK_SCALE[n]}">${n}</button>`).join('')}</div></div>`).join('')
    + `<p class="text-[12px] text-muted -mt-1">1 = mangelhaft · 3 = befriedigend · 5 = sehr gut</p>`;
}
function qChoiceHTML(key, q0, val) {
  return `<div><div class="text-[14px] font-semibold mb-1.5">${esc(q0)}</div><div class="rate rate4" role="radiogroup" aria-label="${esc(q0)}">${PK_JN.map(o => `<button type="button" role="radio" aria-pressed="${val === o}" aria-checked="${val === o}" data-ck="${key}" data-cv="${o}">${o}</button>`).join('')}</div></div>`;
}
function qRateBind(root = document) {
  root.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { root.querySelectorAll(`[data-rk="${b.dataset.rk}"][data-ri="${b.dataset.ri}"]`).forEach(x => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); }); });
  root.querySelectorAll('[data-ck]').forEach(b => b.onclick = () => { root.querySelectorAll(`[data-ck="${b.dataset.ck}"]`).forEach(x => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); }); });
}
function qRateRead(key, labels, root = document) {
  const o = {}; labels.forEach((l, i) => { const b = root.querySelector(`[data-rk="${key}"][data-ri="${i}"][aria-pressed="true"]`); if (b) o[l] = +b.dataset.rv; }); return o;
}
const qChoiceRead = (key, root = document) => root.querySelector(`[data-ck="${key}"][aria-pressed="true"]`)?.dataset.cv || null;
function qFbViewHTML(fb, labels, jnLabel) {
  if (!fb) return '';
  const k = fb.kriterien || {};
  return `<div class="flex flex-col gap-2">${labels.filter(l => k[l]).map(l => `<div><div class="flex justify-between text-[13px]"><span>${esc(l)}</span><b class="tnum">${k[l]} · ${PK_SCALE[k[l]]}</b></div><div class="pk-bar mt-1">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= k[l] ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}
    ${fb.empfehlung ? `<div class="text-[13px]"><span class="text-muted">${esc(jnLabel)}</span> <b>${esc(fb.empfehlung)}</b></div>` : ''}
    ${fb.staerken ? `<div class="text-[13px]"><div class="text-muted">Stärken</div><div style="white-space:pre-wrap">${esc(fb.staerken)}</div></div>` : ''}
    ${fb.entwicklung ? `<div class="text-[13px]"><div class="text-muted">Entwicklungsfelder</div><div style="white-space:pre-wrap">${esc(fb.entwicklung)}</div></div>` : ''}
    ${fb.kommentar ? `<div class="text-[13px]"><div class="text-muted">Kommentar</div><div style="white-space:pre-wrap">${esc(fb.kommentar)}</div></div>` : ''}
    ${fb.name ? `<div class="text-[12px] text-muted">Ausgefüllt von ${esc(fb.name)}</div>` : ''}</div>`;
}
const AL_JN = 'Wieder in der Abteilung einsetzen:', TN_JN = 'Würde das Praktikum weiterempfehlen:';

/* ---------- Trainer: Übersicht ---------- */
function qPraktikaHTML() {
  const list = (S.quali.pk || []).filter(p => S.profiles[p.azubi_id]), t = localDate();
  const grp = { run: list.filter(p => !p.abgesegnet_at && p.von <= t && t <= p.bis), open: list.filter(p => !p.abgesegnet_at && t > p.bis), plan: list.filter(p => !p.abgesegnet_at && t < p.von), done: list.filter(p => p.abgesegnet_at) };
  const row = (p, i) => { const a = S.profiles[p.azubi_id], s = qPkState(p);
    return `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" data-pk="${p.id}">${avatar(a, 34)}<div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(a.full_name)}</div>
      <div class="text-[12px] text-muted truncate tnum">${esc(p.abteilung)} · ${fmtDate(p.von)}–${fmtDate(p.bis)}</div>
      ${!p.abgesegnet_at && t >= p.von ? `<div class="text-[11px] mt-0.5"><span style="color:${p.fb_al ? 'var(--ok)' : 'var(--muted)'}">${p.fb_al ? '✓' : '○'} Abteilung</span> · <span style="color:${p.fb_tn ? 'var(--ok)' : 'var(--muted)'}">${p.fb_tn ? '✓' : '○'} Teilnehmer/in</span></div>` : ''}</div>
      <span class="chip ${s[0]} flex-none">${s[1]}</span></button>`; };
  const block = (title, arr) => arr.length ? `${secTitle(title, `<span class="chip tnum">${arr.length}</span>`)}<div class="card">${arr.map(row).join('')}</div>` : '';
  return `${secTitle('Praktika im Werk', '<button id="pkNew" class="text-[13px] font-semibold text-accent">+ Praktikum planen</button>')}
    ${list.length ? block('Freigabe offen', grp.open) + block('Läuft gerade', grp.run) + block('Geplant', grp.plan) + block('Abgeschlossen', grp.done) : empty('Noch keine Praktika. Plane eins: Wer, wann und in welcher Abteilung im Werk.')}
    <div class="card p-4 mt-4 text-[13px] text-muted flex flex-col gap-2">
      <div>Die Abteilungsleitung bekommt einen Link und gibt darüber ohne Anmeldung eine Rückmeldung. Die Teilnehmenden geben ihre Rückmeldung in der App.</div>
      <div>Erst wenn du freigibst, sehen die Teilnehmenden die Rückmeldung der Abteilung – und die Abteilung auf Wunsch die Rückmeldung der Teilnehmenden.</div></div>`;
}
function qPraktikaBind() {
  $('#pkNew') && ($('#pkNew').onclick = () => qPkEditSheet(null));
  $$('[data-pk]').forEach(b => b.onclick = () => qPkDetailSheet(b.dataset.pk));
}
function qPkEditSheet(p0) {
  const p = p0 ? { ...p0 } : { azubi_id: '', abteilung: '', ansprechpartner: '', ansprech_email: '', von: localDate(), bis: qAddDays(localDate(), 11), aufgaben: '' };
  const tn = qTnList().filter(x => canSchool(x)), abts = [...new Set((S.quali.pk || []).map(x => x.abteilung))].sort();
  sheetShell(p0 ? 'Praktikum bearbeiten' : 'Praktikum planen', `<form id="pkForm" class="card p-4 flex flex-col gap-3">
    <div><label class="lbl" for="pkA">Teilnehmer/in</label><select id="pkA" class="field" required ${p0 ? 'disabled' : ''}><option value="">– bitte wählen –</option>${tn.map(x => `<option value="${x.id}" ${p.azubi_id === x.id ? 'selected' : ''}>${esc(x.full_name)}${qGroupLabel(x.id) ? ' · ' + esc(qGroupLabel(x.id)) : ''}</option>`).join('')}</select></div>
    <div><label class="lbl" for="pkD">Abteilung im Werk</label><input id="pkD" class="field" list="pkDl" maxlength="120" required value="${esc(p.abteilung)}" placeholder="z. B. Mischsaal, Reifenaufbau Halle 3, Instandhaltung"><datalist id="pkDl">${abts.map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
    <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="pkV">Von</label><input id="pkV" type="date" class="field" required value="${p.von}"></div><div><label class="lbl" for="pkB">Bis</label><input id="pkB" type="date" class="field" required value="${p.bis}"></div></div>
    <div><label class="lbl" for="pkL">Abteilungsleiter/in</label><input id="pkL" class="field" maxlength="120" value="${esc(p.ansprechpartner || '')}" placeholder="Name"></div>
    <div><label class="lbl" for="pkE">E-Mail der Abteilungsleitung <span class="font-normal text-muted">(optional, für den Link)</span></label><input id="pkE" type="email" class="field" maxlength="160" value="${esc(p.ansprech_email || '')}"></div>
    <div><label class="lbl" for="pkT">Aufgaben und Ziele <span class="font-normal text-muted">(optional)</span></label><textarea id="pkT" class="field" rows="3" maxlength="1500" placeholder="z. B. Mischungen vorbereiten, Chargen prüfen, an der Walze mitarbeiten">${esc(p.aufgaben || '')}</textarea></div>
    <button class="btn">${p0 ? 'Speichern' : 'Praktikum anlegen'}</button>
    ${p0 ? '<button type="button" class="btn danger" id="pkDel">Praktikum löschen</button>' : ''}</form>`);
  $('#pkForm').onsubmit = async e => {
    e.preventDefault();
    const row = { abteilung: $('#pkD').value.trim(), von: $('#pkV').value, bis: $('#pkB').value, ansprechpartner: $('#pkL').value.trim() || null, ansprech_email: $('#pkE').value.trim() || null, aufgaben: $('#pkT').value.trim() || null, updated_at: new Date().toISOString() };
    if (!p0) row.azubi_id = $('#pkA').value;
    if (!p0 && !row.azubi_id) return toast('Bitte Teilnehmer/in wählen.');
    if (!row.abteilung) return toast('Bitte die Abteilung eintragen.');
    if (row.bis < row.von) return toast('„Bis“ liegt vor „Von“.');
    try {
      const saved = p0 ? await q(sb.from('quali_praktika').update(row).eq('id', p0.id).select().single()) : await q(sb.from('quali_praktika').insert({ ...row, created_by: S.me.id }).select().single());
      S.quali.pk = (S.quali.pk || []).filter(x => x.id !== saved.id).concat(saved).sort((a, b) => b.von.localeCompare(a.von));
      toast(p0 ? 'Gespeichert' : 'Praktikum angelegt'); render(); qPkDetailSheet(saved.id);
    } catch (er) { toast(errText(er)); }
  };
  if ($('#pkDel')) $('#pkDel').onclick = () => qConfirm($('#pkDel'), async () => { try { await q(sb.from('quali_praktika').delete().eq('id', p0.id)); S.quali.pk = (S.quali.pk || []).filter(x => x.id !== p0.id); closeSheet(); toast('Praktikum gelöscht'); render(); } catch (er) { toast(errText(er)); } }, 'Wirklich löschen? Nochmal tippen');
}
function qPkDetailSheet(id) {
  const p = (S.quali.pk || []).find(x => x.id === id); if (!p) return;
  const a = S.profiles[p.azubi_id], s = qPkState(p), link = qPkLink(p.token), started = localDate() >= p.von;
  const mailBody = `Guten Tag${p.ansprechpartner ? ' ' + p.ansprechpartner : ''},\n\n${a.full_name} ist vom ${fmtDate(p.von)} bis ${fmtDate(p.bis)} zum Praktikum in Ihrer Abteilung (${p.abteilung}). Bitte geben Sie zum Ende des Praktikums eine kurze Rückmeldung. Das dauert etwa drei Minuten und geht ohne Anmeldung:\n\n${link}\n\nVielen Dank!\n${S.me.full_name}`;
  sheetShell(`Praktikum ${a.full_name}`, `
    <div class="card p-4 flex flex-col gap-1.5 text-[14px]"><div class="flex items-center justify-between gap-2"><b>${esc(p.abteilung)}</b><span class="chip ${s[0]}">${s[1]}</span></div>
      <div class="text-muted tnum">${fmtDate(p.von)} – ${fmtDate(p.bis)}${p.ansprechpartner ? ' · ' + esc(p.ansprechpartner) : ''}</div>
      ${p.aufgaben ? `<div class="text-[13px] mt-1" style="white-space:pre-wrap">${esc(p.aufgaben)}</div>` : ''}
      <button class="text-[13px] font-semibold text-accent self-start mt-1" id="pkEdit">Bearbeiten</button></div>
    ${!p.abgesegnet_at ? `<div class="eyebrow mt-4 mb-2">Link für die Abteilungsleitung</div><div class="card p-4 flex flex-col gap-2">
      <input class="field text-[12px]" readonly value="${esc(link)}" id="pkLink" aria-label="Link für die Abteilung">
      <div class="grid grid-cols-2 gap-2"><button class="btn ghost" id="pkCopy">Link kopieren</button><a class="btn ghost text-center" id="pkMail" href="mailto:${encodeURIComponent(p.ansprech_email || '')}?subject=${encodeURIComponent('Rückmeldung zum Praktikum von ' + a.full_name)}&body=${encodeURIComponent(mailBody)}">Per E-Mail</a></div>
      <p class="text-[12px] text-muted">Rückmeldung ist ab Praktikumsbeginn möglich und bis 90 Tage nach dem Ende. Wer den Link hat, kann die Rückmeldung abgeben – also nur an die Abteilungsleitung schicken.</p></div>` : ''}
    <div class="eyebrow mt-4 mb-2">Rückmeldung der Abteilung</div>
    <div class="card p-4">${p.fb_al ? qFbViewHTML(p.fb_al, PK_AL, AL_JN) + `<div class="text-[12px] text-muted mt-2">eingegangen ${fmtDate(localDate(new Date(p.fb_al_at)))}</div>` : `<div class="text-[13px] text-muted">${started ? 'Noch keine Rückmeldung.' : 'Möglich ab Praktikumsbeginn.'}</div>`}</div>
    <div class="eyebrow mt-4 mb-2">Rückmeldung von ${esc(firstName(a.full_name))}</div>
    <div class="card p-4">${p.fb_tn ? qFbViewHTML(p.fb_tn, PK_TN, TN_JN) + `<div class="text-[12px] text-muted mt-2">eingegangen ${fmtDate(localDate(new Date(p.fb_tn_at)))}</div>` : `<div class="text-[13px] text-muted">${started ? 'Noch keine Rückmeldung.' : 'Möglich ab Praktikumsbeginn.'}</div>`}</div>
    <div class="card p-4 mt-4 flex flex-col gap-3">
      ${p.abgesegnet_at ? `<div class="text-[14px]"><b style="color:var(--ok)">Freigegeben</b> am ${fmtDate(localDate(new Date(p.abgesegnet_at)))}${p.abgesegnet_von ? ' von ' + esc(S.profiles[p.abgesegnet_von]?.full_name || '') : ''}. ${esc(firstName(a.full_name))} sieht die Rückmeldung der Abteilung${p.an_abteilung ? ', die Abteilung sieht die Rückmeldung der Teilnehmer/in' : ''}.</div>
        <button class="btn ghost" id="pkUnrel">Freigabe zurücknehmen</button>`
      : `<label class="flex items-start gap-2 text-[14px]"><input type="checkbox" class="cbx" id="pkAn" ${p.an_abteilung ? 'checked' : ''} style="margin-top:3px"> Rückmeldung von ${esc(firstName(a.full_name))} nach der Freigabe auch der Abteilung zeigen</label>
        <button class="btn" id="pkRel" ${started ? '' : 'disabled'}>Prüfen und freigeben</button>
        <p class="text-[12px] text-muted">Mit der Freigabe bestätigst du, dass du beide Rückmeldungen gelesen hast. Danach sind keine Änderungen mehr über den Link oder durch die Teilnehmenden möglich.</p>`}
      <button class="btn ghost" id="pkPdf">Als PDF</button></div>`);
  $('#pkEdit').onclick = () => qPkEditSheet(p);
  if ($('#pkCopy')) $('#pkCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Link kopiert'); } catch { $('#pkLink').select(); toast('Link markiert – jetzt kopieren'); } };
  const upd = async (patch, msg) => { try { const saved = await q(sb.from('quali_praktika').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', p.id).select().single()); S.quali.pk = S.quali.pk.map(x => x.id === p.id ? saved : x); toast(msg); render(); qPkDetailSheet(p.id); } catch (er) { toast(errText(er)); } };
  if ($('#pkRel')) $('#pkRel').onclick = () => { const miss = [!p.fb_al && 'Abteilung', !p.fb_tn && 'Teilnehmer/in'].filter(Boolean);
    qConfirm($('#pkRel'), () => upd({ abgesegnet_at: new Date().toISOString(), abgesegnet_von: S.me.id, an_abteilung: $('#pkAn').checked }, 'Freigegeben'), miss.length ? `Rückmeldung ${miss.join(' und ')} fehlt – trotzdem freigeben?` : 'Jetzt freigeben? Nochmal tippen'); };
  if ($('#pkUnrel')) $('#pkUnrel').onclick = () => upd({ abgesegnet_at: null, abgesegnet_von: null }, 'Freigabe zurückgenommen');
  $('#pkPdf').onclick = async () => { try { const r = await qPkPdf(p); r.doc.save(r.name); toast('PDF erstellt'); } catch (er) { toast(errText(er)); } finally { PDF_DE = false; } };
}
async function qPkPdf(p) {
  const a = S.profiles[p.azubi_id], P = await qPdfStart(false), { doc, FONT, W, M } = P;
  let y = 18; const line = (t, size = 10, bold = false, col = 0) => { doc.setFont(FONT, bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(col); doc.splitTextToSize(pdfSafe(t), W - 2 * M).forEach(l => { if (y > 278) { doc.addPage(); y = 18; } doc.text(l, M, y); y += size * 0.45; }); doc.setTextColor(0); };
  line('Praktikum im Werk', 16, true); y += 2;
  line(`${a.full_name} · ${p.abteilung} · ${fmtDate(p.von)} bis ${fmtDate(p.bis)}${p.ansprechpartner ? ' · Abteilungsleitung: ' + p.ansprechpartner : ''}`, 10, false, 80); y += 3;
  if (p.aufgaben) { line('Aufgaben und Ziele', 11, true); line(p.aufgaben); y += 3; }
  const fb = (title, f, labels, jn) => { line(title, 12, true); y += 1; if (!f) { line('Keine Rückmeldung.', 10, false, 110); y += 3; return; }
    labels.forEach(l => { if (f.kriterien?.[l]) line(`${l}: ${f.kriterien[l]} von 5 (${PK_SCALE[f.kriterien[l]]})`); });
    if (f.empfehlung) line(`${jn} ${f.empfehlung}`); if (f.staerken) { y += 1; line('Stärken', 10, true); line(f.staerken); } if (f.entwicklung) { y += 1; line('Entwicklungsfelder', 10, true); line(f.entwicklung); }
    if (f.kommentar) { y += 1; line('Kommentar', 10, true); line(f.kommentar); } if (f.name) line('Ausgefüllt von ' + f.name, 9, false, 110); y += 4; };
  fb('Rückmeldung der Abteilung', p.fb_al, PK_AL, AL_JN);
  fb(`Rückmeldung von ${a.full_name}`, p.fb_tn, PK_TN, TN_JN);
  line(p.abgesegnet_at ? `Freigegeben am ${fmtDate(localDate(new Date(p.abgesegnet_at)))}${p.abgesegnet_von ? ' von ' + (S.profiles[p.abgesegnet_von]?.full_name || '') : ''}` : 'Noch nicht freigegeben.', 10, true);
  P.foot('Praktikum');
  return { doc, name: `Praktikum_${pdfFile(a.full_name)}_${p.von}.pdf` };
}

/* ---------- Teilnehmende ---------- */
function qMyPraktikaHTML() {
  const list = S.quali.myPk || [], t = localDate();
  if (!list.length) return `${secTitle('Deine Praktika')}${empty('Noch kein Praktikum geplant. Das legt deine Trainerin oder dein Trainer fest.')}`;
  return `${secTitle('Deine Praktika')}${list.map(p => { const s = qPkState(p), can = !p.abgesegnet_at && t >= p.von;
    return `<div class="card p-4 mt-3"><div class="flex items-start gap-2"><div class="flex-1 min-w-0"><div class="font-display font-bold text-[17px]">${esc(p.abteilung)}</div>
      <div class="text-[13px] text-muted tnum">${fmtDate(p.von)} – ${fmtDate(p.bis)}${p.ansprechpartner ? ' · Ansprechpartner/in: ' + esc(p.ansprechpartner) : ''}</div></div><span class="chip ${s[0]} flex-none">${s[1]}</span></div>
      ${p.aufgaben ? `<div class="text-[13px] mt-2" style="white-space:pre-wrap">${esc(p.aufgaben)}</div>` : ''}
      ${can ? `<button class="btn ${p.fb_tn ? 'ghost' : ''} w-full mt-3" data-pkfb="${p.id}">${p.fb_tn ? 'Deine Rückmeldung ändern' : 'Rückmeldung zum Praktikum geben'}</button>` : ''}
      ${p.abgesegnet_at ? (p.fb_al ? `<div class="eyebrow mt-4 mb-2">Rückmeldung der Abteilung</div>${qFbViewHTML(p.fb_al, PK_AL, AL_JN)}` : '<div class="text-[13px] text-muted mt-3">Die Abteilung hat keine Rückmeldung gegeben.</div>')
        : p.fb_al_da ? '<div class="text-[13px] text-muted mt-3">Die Abteilung hat eine Rückmeldung gegeben. Du siehst sie, sobald deine Trainerin oder dein Trainer sie freigegeben hat.</div>' : ''}
    </div>`; }).join('')}`;
}
function qTnFeedbackSheet(id) {
  const p = (S.quali.myPk || []).find(x => x.id === id); if (!p) return;
  const f = p.fb_tn || {};
  sheetShell('Rückmeldung zum Praktikum', `<form id="tfForm" class="flex flex-col gap-4">
    <div class="text-[14px] text-muted -mt-1">${esc(p.abteilung)} · ${fmtDate(p.von)}–${fmtDate(p.bis)}</div>
    <div class="card p-4 flex flex-col gap-4">${qRateHTML('tn', PK_TN, f.kriterien)}${qChoiceHTML('tnjn', 'Würdest du das Praktikum in dieser Abteilung weiterempfehlen?', f.empfehlung)}</div>
    <div><label class="lbl" for="tfK">Was war gut, was könnte besser sein?</label><textarea id="tfK" class="field" rows="4" maxlength="2000">${esc(f.kommentar || '')}</textarea></div>
    <button class="btn">Rückmeldung senden</button>
    <p class="text-[12px] text-muted">Deine Rückmeldung liest zuerst deine Trainerin oder dein Trainer. Ob die Abteilung sie sieht, wird bei der Freigabe entschieden.</p></form>`);
  qRateBind($('#sheet'));
  $('#tfForm').onsubmit = async e => {
    e.preventDefault(); const fb = { kriterien: qRateRead('tn', PK_TN, $('#sheet')), empfehlung: qChoiceRead('tnjn', $('#sheet')), kommentar: $('#tfK').value.trim() || null };
    if (Object.keys(fb.kriterien).length < PK_TN.length) return toast('Bitte alle Punkte bewerten.');
    try { await q(sb.rpc('praktikum_tn_feedback', { p_id: id, p_fb: fb })); closeSheet(); toast('Danke für deine Rückmeldung'); go(S.view); } catch (er) { toast(errText(er)); }
  };
}

/* =====================================================================
   Öffentliche Seite für die Abteilungsleitung: ?praktikum=TOKEN
   ===================================================================== */
async function showPraktikum(tok) {
  const el = $('#careerScreen'); el.hidden = false; $('#authScreen').hidden = true; $('#appScreen').hidden = true;
  try { qBrand(true); } catch {}
  document.title = 'Rückmeldung zum Praktikum';
  el.innerHTML = `<div class="py-10 text-center text-muted">Wird geladen …</div>`;
  let D = null; try { const r = await sb.rpc('praktikum_link', { p_token: tok }); D = r.data; } catch {}
  if (!D) { el.innerHTML = `<div class="card p-5 mt-8"><h1 class="text-[22px] font-bold">Link nicht gültig</h1><p class="text-[14px] text-muted mt-2">Der Link ist abgelaufen oder nicht vollständig. Bitte wenden Sie sich an die Trainerin oder den Trainer.</p></div>`; return; }
  const f = D.fb_al || {}, head = `<div class="pt-6"><div class="eyebrow">${esc(D.betrieb || '')}</div><h1 class="text-[26px] font-bold leading-tight mt-1">Rückmeldung zum Praktikum</h1>
    <div class="card p-4 mt-3 text-[14px] flex flex-col gap-1"><div><b>${esc(D.teilnehmer)}</b>${D.beruf ? ' · ' + esc(D.beruf) : ''}</div><div class="text-muted tnum">${esc(D.abteilung)} · ${fmtDate(D.von)} – ${fmtDate(D.bis)}</div>${D.aufgaben ? `<div class="text-[13px] mt-1" style="white-space:pre-wrap">${esc(D.aufgaben)}</div>` : ''}</div></div>`;
  if (!D.offen) {
    el.innerHTML = head + `<div class="card p-5 mt-4">${D.abgesegnet ? `<div class="font-bold text-[17px]">Vielen Dank – abgeschlossen</div><p class="text-[14px] text-muted mt-1">Die Rückmeldung wurde von der Trainerin oder dem Trainer geprüft und freigegeben.</p>
      ${D.fb_al ? `<div class="eyebrow mt-4 mb-2">Ihre Rückmeldung</div>${qFbViewHTML(D.fb_al, PK_AL, AL_JN)}` : ''}${D.fb_tn ? `<div class="eyebrow mt-4 mb-2">Rückmeldung von ${esc(firstName(D.teilnehmer))} zum Praktikum</div>${qFbViewHTML(D.fb_tn, PK_TN, TN_JN)}` : ''}`
      : D.heute < D.von ? `<div class="font-bold text-[17px]">Noch nicht möglich</div><p class="text-[14px] text-muted mt-1">Die Rückmeldung ist ab dem ${fmtDate(D.von)} möglich.</p>` : `<div class="font-bold text-[17px]">Nicht mehr möglich</div><p class="text-[14px] text-muted mt-1">Der Zeitraum für die Rückmeldung ist abgelaufen.</p>`}</div>`;
    return;
  }
  el.innerHTML = head + `<form id="alForm" class="flex flex-col gap-4 mt-4 pb-10">
    <div class="card p-4 flex flex-col gap-4">${qRateHTML('al', PK_AL, f.kriterien)}${qChoiceHTML('aljn', `Würden Sie ${firstName(D.teilnehmer)} gern wieder in Ihrer Abteilung einsetzen?`, f.empfehlung)}</div>
    <div><label class="lbl" for="alS">Stärken</label><textarea id="alS" class="field" rows="3" maxlength="1500">${esc(f.staerken || '')}</textarea></div>
    <div><label class="lbl" for="alE">Was sollte ${esc(firstName(D.teilnehmer))} noch üben?</label><textarea id="alE" class="field" rows="3" maxlength="1500">${esc(f.entwicklung || '')}</textarea></div>
    <div><label class="lbl" for="alN">Ihr Name</label><input id="alN" class="field" maxlength="120" required value="${esc(f.name || D.ansprechpartner || '')}"></div>
    <button class="btn">${D.fb_al ? 'Rückmeldung aktualisieren' : 'Rückmeldung senden'}</button>
    <p class="text-[12px] text-muted">Die Rückmeldung geht an die Trainerin oder den Trainer und wird dort geprüft, bevor ${esc(firstName(D.teilnehmer))} sie sieht. Bis zur Freigabe können Sie sie über diesen Link ändern.</p></form>`;
  qRateBind(el);
  $('#alForm').onsubmit = async e => {
    e.preventDefault(); const fb = { kriterien: qRateRead('al', PK_AL, el), empfehlung: qChoiceRead('aljn', el), staerken: $('#alS').value.trim() || null, entwicklung: $('#alE').value.trim() || null, name: $('#alN').value.trim() };
    if (Object.keys(fb.kriterien).length < PK_AL.length) return toast('Bitte alle Punkte bewerten.');
    const btn = $('#alForm .btn'); btn.disabled = true;
    try { const { error } = await sb.rpc('praktikum_link_feedback', { p_token: tok, p_fb: fb }); if (error) throw error;
      el.innerHTML = head + `<div class="card p-5 mt-4"><div class="font-bold text-[17px]">Vielen Dank!</div><p class="text-[14px] text-muted mt-1">Ihre Rückmeldung ist angekommen. Bis zur Freigabe können Sie sie über denselben Link noch ändern.</p></div>`;
    } catch (er) { toast(errText(er)); btn.disabled = false; }
  };
}

/* =====================================================================
   Fragen und Antworten übersetzen (Tests, Übungsfragen)
   Die Prüfung bleibt auf Deutsch. Die Übersetzung erscheint klein darunter.
   Nutzt den eingebauten Übersetzer des Browsers (aktuelles Chrome am Computer, ohne Datenversand an uns).
   ===================================================================== */
(() => {
  const st = document.createElement('style');
  st.textContent = `.qtr{display:block;font-size:12.5px;font-weight:500;color:var(--accent);margin-top:3px;line-height:1.35}
  .qtrbar{display:flex;align-items:center;gap:8px;margin:-2px 0 10px;flex-wrap:wrap}.qtrbar button{font:inherit;font-size:13px;font-weight:700;color:var(--accent)}.qtrbar span{font-size:12px;color:var(--muted)}`;
  document.head.appendChild(st);
})();
const Q_TR = { on: false, tr: {}, cache: {} };
async function qTranslator() {
  const l = LANG; if (l === 'de') return null;
  if (Q_TR.tr[l] !== undefined) return Q_TR.tr[l];
  let t = null;
  const work = (async () => {
    if (!('Translator' in self)) return null;
    const av = await self.Translator.availability({ sourceLanguage: 'de', targetLanguage: l });
    if (!av || av === 'unavailable') return null;
    return await self.Translator.create({ sourceLanguage: 'de', targetLanguage: l });
  })();
  try { t = await Promise.race([work, new Promise(r => setTimeout(() => r(null), 15000))]); } catch { t = null; }
  if (t) Q_TR.tr[l] = t; return t;
}
async function qTranslateIn(root) {
  const els = [...root.querySelectorAll('[data-trsrc]')].filter(e => !e.dataset.trdone);
  if (!els.length) return true;
  const t = await qTranslator(); if (!t) return false;
  for (const e of els) {
    const src = e.textContent.trim(); if (!src) continue; e.dataset.trdone = '1';
    const key = LANG + '|' + src;
    try { Q_TR.cache[key] ||= await t.translate(src); } catch { continue; }
    if (!e.isConnected) continue;
    const s = document.createElement('span'); s.className = 'qtr'; s.setAttribute('translate', 'no'); s.dir = LANG === 'ar' ? 'rtl' : 'ltr'; s.lang = LANG; s.textContent = Q_TR.cache[key];
    e.insertAdjacentElement('afterend', s);
  }
  return true;
}
function qTrBar(sheet) {
  if (LANG === 'de' || !sheet.querySelector('[data-trsrc]') || sheet.querySelector('.qtrbar')) return;
  const head = sheet.querySelector('.sheet > div'); if (!head) return;
  const bar = document.createElement('div'); bar.className = 'qtrbar';
  bar.innerHTML = `<button type="button" id="qtrBtn">${Q_TR.on ? 'Übersetzung ausblenden' : 'Übersetzung anzeigen'}</button><span>Die Prüfung ist auf Deutsch. Die Übersetzung hilft beim Verstehen.</span>`;
  head.insertAdjacentElement('afterend', bar);
  bar.querySelector('#qtrBtn').onclick = async () => {
    Q_TR.on = !Q_TR.on;
    if (!Q_TR.on) { sheet.querySelectorAll('.qtr').forEach(x => x.remove()); sheet.querySelectorAll('[data-trdone]').forEach(x => delete x.dataset.trdone); bar.querySelector('#qtrBtn').textContent = t('Übersetzung anzeigen'); return; }
    bar.querySelector('#qtrBtn').textContent = t('Übersetzung wird geladen …');
    const ok = await qTranslateIn(sheet);
    if (ok) bar.querySelector('#qtrBtn').textContent = t('Übersetzung ausblenden');
    if (!ok) { Q_TR.on = false; bar.querySelector('#qtrBtn').textContent = t('Übersetzung anzeigen');
      bar.querySelector('span').textContent = t('Dieser Browser kann Fragen nicht selbst übersetzen. Tipp: In Chrome oben rechts im Menü „Übersetzen“ wählen.'); }
  };
  if (Q_TR.on) qTranslateIn(sheet);
}
document.addEventListener('DOMContentLoaded', () => {
  const sheet = document.getElementById('sheet'); if (!sheet) return;
  new MutationObserver(() => { if (!sheet.hidden) qTrBar(sheet); }).observe(sheet, { childList: true, subtree: true });
});
