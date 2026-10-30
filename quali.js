/* AzubiHub · Qualifizierungsmodus (z. B. C1TT): Teilqualifizierungen und Intensivkurse für erwachsene Beschäftigte
   ohne Berufsabschluss. Statt Berufsschule und IHK-Zwischenprüfung gibt es Module mit IHK-Zertifikat, Theorie bei C1TT
   (virtuell oder im Schulungsraum), Praxis in der Werkstatt und am Ende die Externenprüfung (§ 45 Abs. 2 BBiG).
   Wird vor dem Hauptskript geladen und greift erst zur Laufzeit auf S, APP usw. zu. */

const isQuali = () => { try { return APP?.typ === 'qualifizierung'; } catch { return false; } };
const qCfg = () => { try { return APP.quali || {}; } catch { return {}; } };
/* Frühwarnung, Stimmungs-Check und Stationsfeedback sind im Qualifizierungsmodus aus, bis der Betriebsrat zugestimmt hat */
const qAuswertungAn = () => !isQuali() || qCfg().auswertungen === true;

const Q_KUK = 'Kunststoff- und Kautschuktechnologe/-in', Q_MAF = 'Maschinen- und Anlagenführer/-in';
const Q_IEL = 'Industrieelektriker/-in Betriebstechnik', Q_LAG = 'Fachkraft für Lagerlogistik';
const Q_STD = { zeit: 'Vollzeit, 37,5 Std./Woche, Mo–Fr', zert: 'IHK-Zertifikat nach jedem Modul', abschluss: 'IHK-Berufsabschluss über die Externenprüfung',
  lernorte: 'Je Modul mindestens ein Drittel Praxis in der C1TT-Werkstatt, zwei Drittel Theorie virtuell auf dem iPad oder im Schulungsraum.' };
/* Maßnahmen nach den öffentlichen Angaben auf c1tt.de (Stand Oktober 2026). Modulnamen gekürzt; die genaue Zuordnung
   der Rahmenplan-Positionen zu den Modulen ist ein Vorschlag und muss von C1TT bestätigt werden. */
const Q_KATALOG = {
  'tq-kuk': {
    art: 'Teilqualifizierung', kurz: 'TQ Kunststoff und Kautschuk', beruf: Q_KUK, fachrichtung: 'Mehrschichtkautschukteile',
    zeit: 'Vollzeit, 37,5 Std./Woche, Mo–Fr', dauer: '24 Monate',
    lernorte: 'Je Modul mindestens ein Drittel Praxis in der C1TT-Werkstatt, zwei Drittel Theorie virtuell auf dem iPad oder im Schulungsraum.',
    zert: 'IHK-Zertifikat nach jedem Modul', abschluss: 'IHK-Berufsabschluss über die Externenprüfung', ausbildungsjahre: 3,
    module: [
      { nr: 1, titel: 'Grundlagen: einfache Baugruppen und polymere Werkstoffe', monate: 6, rp: ['A1', 'A2', 'I1', 'I2', 'I3'] },
      { nr: 2, titel: 'Baugruppen herstellen, anlagenbezogene Steuerungstechnik anwenden', monate: 4, rp: ['A3', 'I4', 'I6'] },
      { nr: 3, titel: 'Fertigung vorbereiten, Betriebsmittel warten und instand halten', monate: 4, rp: ['A4', 'A5', 'M4'] },
      { nr: 4, titel: 'Verfahrenstechniken für Formteile, Halbzeuge oder Mehrschichtkautschukteile', monate: 5, rp: ['M1', 'M2', 'M3', 'M5'] },
      { nr: 5, titel: 'Produkt- und Prozessqualität planen, überwachen und optimieren', monate: 5, rp: ['A6', 'A7', 'I5', 'I7'] }
    ]
  },
  'tq-iel': {
    ...Q_STD, art: 'Teilqualifizierung', kurz: 'TQ Betriebselektriker', beruf: Q_IEL, fachrichtung: 'Betriebstechnik', dauer: '16 Monate (mit Urlaubsphasen)', ausbildungsjahre: 2,
    module: [
      { nr: 1, titel: 'Elektronische Komponenten analysieren, auswählen, aufbauen, messen und prüfen', monate: 4, rp: ['E2', 'EI1', 'EI2', 'EI3', 'EI4'] },
      { nr: 2, titel: 'Elektronische Schaltungen erstellen und prüfen, IT-Systeme installieren und konfigurieren', monate: 4, rp: ['E4', 'EI5'] },
      { nr: 3, titel: 'Elektrotechnische Anlagenteile installieren', monate: 3, rp: ['E1', 'B1', 'EI6'] },
      { nr: 4, titel: 'Elektrotechnische Anlagen in Betrieb nehmen', monate: 3, rp: ['E3', 'B2'] },
      { nr: 5, titel: 'Elektrotechnische Anlagen warten und kundenspezifisch anpassen', monate: 3, rp: ['B3', 'EI7'] }
    ]
  },
  'tq-lag': {
    ...Q_STD, art: 'Teilqualifizierung', kurz: 'TQ Lagerlogistik', beruf: Q_LAG, dauer: '24 Monate (um ein Drittel verkürzt)', ausbildungsjahre: 3,
    module: [
      { nr: 1, titel: 'Wareneingang', monate: 4, rp: ['L8', 'L1', 'L2', 'L3', 'L4'] },
      { nr: 2, titel: 'Innerbetrieblicher Transport', monate: 3, rp: ['L7'] },
      { nr: 3, titel: 'Lagern von Gütern', monate: 4, rp: ['L9'] },
      { nr: 4, titel: 'Kommissionierung', monate: 3, rp: ['L10'] },
      { nr: 5, titel: 'Versand', monate: 3, rp: ['L11'] },
      { nr: 6, titel: 'Disponieren', monate: 3, rp: ['L5'] },
      { nr: 7, titel: 'Logistik', monate: 4, rp: ['L6'] }
    ]
  },
  'ik-lag': {
    ...Q_STD, art: 'Intensivkurs', kurz: 'Intensivkurs Lagerlogistik', beruf: Q_LAG, dauer: '4 Monate', ausbildungsjahre: 3,
    lernorte: '81 Tage Theorie virtuell auf dem iPad und 2 Tage Praxis am Schulungsort.',
    zert: 'kein Modul-Zertifikat, der Kurs endet kurz vor der Externenprüfung',
    voraussetzung: 'Mindestens 3 Jahre als Fachlagerist/-in oder 4,5 Jahre im Lager bzw. in der Logistik, vom Betrieb bescheinigt',
    module: [{ nr: 1, titel: 'Intensivkurs: Theorie und Praxis bis zur Externenprüfung', monate: 4, rp: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11'] }]
  },
  'ik-maf': {
    art: 'Intensivkurs', kurz: 'Intensivkurs Maschinen- und Anlagenführer', beruf: Q_MAF,
    zeit: 'Vollzeit, 37,5 Std./Woche, Mo–Fr', dauer: '4 Monate',
    lernorte: '60 Tage Theorie (virtuell auf dem iPad oder im Schulungsraum) und 20 Tage Praxis.',
    zert: 'kein Modul-Zertifikat, der Kurs endet kurz vor der Externenprüfung', abschluss: 'IHK-Berufsabschluss über die Externenprüfung', ausbildungsjahre: 2,
    voraussetzung: 'Mindestens 3 Jahre Tätigkeit als Maschinen- und Anlagenführer/-in, vom Betrieb bescheinigt',
    module: [{ nr: 1, titel: 'Intensivkurs: Theorie und Praxis bis zur Externenprüfung', monate: 4, rp: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14'] }]
  }
};
const qKat = t => Q_KATALOG[t?.massnahme] || null;
const qModStat = { offen: ['', 'geplant'], laeuft: ['brass', 'läuft'], bestanden: ['ok', 'Zertifikat'], wiederholen: ['crit', 'wiederholen'] };
/* Externenprüfung: Schritte bis zur Prüfung */
const Q_PRUEF = [
  ['nachweis', 'Tätigkeitsnachweis', 'Bescheinigung des Betriebs über die Berufserfahrung bzw. die Modul-Zertifikate'],
  ['antrag', 'Antrag auf Zulassung bei der IHK gestellt', 'Zulassung nach § 45 Abs. 2 BBiG'],
  ['zulassung', 'Zulassung der IHK liegt vor', ''],
  ['anmeldung', 'Prüfungstermine bestätigt', 'schriftlich und praktisch']
];

/* Rahmenplan-Positionen (Inhalte für den Rahmenplan-Abgleich im Berichtsheft); lehrjahr = Modul */
const Q_RP = [
  ...[['A1', 'Polymere Werkstoffe sowie Zuschlag- und Hilfsstoffe unterscheiden, zuordnen und handhaben', 1, ['kautschuk', 'polymer', 'elastomer', 'thermoplast', 'füllstoff', 'ruß', 'mischung', 'werkstoff']],
    ['A2', 'Bauteile und Baugruppen herstellen', 1, ['feilen', 'bohren', 'sägen', 'gewinde', 'montier', 'baugruppe', 'bauteil']],
    ['A3', 'Messen, Steuern, Regeln', 2, ['messen', 'sensor', 'steuerung', 'sps', 'regel', 'pneumatik', 'hydraulik']],
    ['A4', 'Betriebsfähigkeit technischer Systeme zur Be- und Verarbeitung polymerer Werkstoffe sicherstellen', 3, ['rüsten', 'anfahren', 'inbetriebnahme', 'anlage einstellen', 'parameter']],
    ['A5', 'Betriebsmittel warten und instand halten', 3, ['wartung', 'warten', 'inspektion', 'schmier', 'instand', 'tpm', 'reinig']],
    ['A6', 'Fertigungsplanung und -steuerung', 5, ['auftrag', 'planung', 'kennzahl', 'oee', 'schichtplan', 'stückzahl']],
    ['A7', 'Vertiefungsphase', 5, ['vertiefung', 'projekt']],
    ['M1', 'Verfahrenstechniken (Fachrichtung Mehrschichtkautschukteile)', 4, ['extrud', 'kalander', 'vulkanis', 'presse', 'reifenaufbau', 'konfektion', 'rohling']],
    ['M2', 'Verfahrensspezifische Steuerungs- und Automatisierungstechnik', 4, ['automatisier', 'roboter', 'heizzeit', 'prozessdaten', 'leitstand']],
    ['M3', 'Polymere Werkstoffe und Festigkeitsträger aufbereiten', 4, ['kneter', 'walzwerk', 'stahlcord', 'cord', 'gewebe', 'festigkeitsträger', 'mischsaal']],
    ['M4', 'Betriebsmittel handhaben', 3, ['werkzeug', 'form', 'heizbalg', 'vorrichtung', 'werkzeugwechsel']],
    ['M5', 'Mehrschichtkautschukteile be- und nachbearbeiten', 4, ['entgrat', 'nacharbeit', 'trimmen', 'endkontrolle', 'sichtprüfung']],
    ['I1', 'Organisation des Ausbildungsbetriebes, Berufsbildung sowie Arbeits- und Tarifrecht', 1, ['tarif', 'betriebsrat', 'arbeitszeit', 'organisation']],
    ['I2', 'Sicherheit und Gesundheit bei der Arbeit', 1, ['arbeitsschutz', 'unterweisung', 'psa', 'gefahrstoff', 'sicherheit', 'not-aus']],
    ['I3', 'Umweltschutz und Nachhaltigkeit', 1, ['umwelt', 'entsorg', 'abfall', 'energie', 'recycling']],
    ['I4', 'Digitalisierte Arbeitswelt', 2, ['digital', 'ipad', 'tablet', 'datenschutz', 'it-sicherheit', 'mes']],
    ['I5', 'Qualitätssichernde Maßnahmen durchführen', 5, ['qualität', 'prüfen', 'regelkarte', 'spc', 'shore', 'messprotokoll', 'reklamation']],
    ['I6', 'Betriebliche und technische Kommunikation', 2, ['zeichnung', 'schichtübergabe', 'dokumentation', 'besprechung']],
    ['I7', 'Arbeit planen und organisieren, Arbeitsergebnisse bewerten', 5, ['5s', 'ordnung', 'kvp', 'verbesserung', 'arbeitsablauf']]
  ].map(([nr, titel, lj, sw], i) => ({ nr, titel, beruf: Q_KUK, lehrjahr: lj, stichworte: sw, abteilungen: [], sort: 900 + i })),
  ...[['F1', 'Berufsbildung, Arbeits- und Tarifrecht', ['tarif', 'arbeitsvertrag', 'betriebsrat']],
    ['F2', 'Aufbau und Organisation des Ausbildungsbetriebes', ['organisation', 'abteilung']],
    ['F3', 'Sicherheit und Gesundheitsschutz bei der Arbeit', ['arbeitsschutz', 'unterweisung', 'psa', 'not-aus']],
    ['F4', 'Umweltschutz', ['umwelt', 'entsorg', 'abfall']],
    ['F5', 'Werk-, Betriebs- und Hilfsstoffe zuordnen und handhaben', ['werkstoff', 'material', 'schmierstoff', 'kautschuk']],
    ['F6', 'Betriebliche und technische Kommunikation', ['zeichnung', 'übergabe', 'dokumentation']],
    ['F7', 'Arbeitsabläufe planen und vorbereiten', ['planen', 'auftrag', 'arbeitsablauf']],
    ['F8', 'Prüfen', ['prüfen', 'messen', 'messschieber', 'shore']],
    ['F9', 'Branchenspezifische Fertigungstechniken', ['extrud', 'presse', 'vulkanis', 'spritzgieß']],
    ['F10', 'Steuerungs- und Regelungstechnik', ['steuerung', 'regel', 'sensor', 'sps']],
    ['F11', 'Produktionsanlagen einrichten und bedienen', ['einricht', 'rüsten', 'bedien', 'anfahren']],
    ['F12', 'Materialfluss steuern', ['materialfluss', 'fifo', 'kanban', 'lager', 'nachschub']],
    ['F13', 'Maschinen und Anlagen warten und inspizieren', ['wartung', 'inspektion', 'schmier', 'tpm']],
    ['F14', 'Qualitätssichernde Maßnahmen durchführen', ['qualität', 'regelkarte', 'stichprobe', 'reklamation']]
  ].map(([nr, titel, sw], i) => ({ nr, titel, beruf: Q_MAF, lehrjahr: 1, stichworte: sw, abteilungen: [], sort: 950 + i })),
  ...[['E1', 'Mechanische Komponenten und elektrische Betriebsmittel bearbeiten, montieren und verbinden', 3, ['montier', 'verdraht', 'klemme', 'kabel', 'leitung', 'schaltschrank']],
    ['E2', 'Elektrische Funktionen und Systeme messen und analysieren', 1, ['messen', 'multimeter', 'oszilloskop', 'spannung', 'strom', 'widerstand', 'bauteil']],
    ['E3', 'Sicherheit elektrischer Anlagen und Betriebsmittel beurteilen', 4, ['vde', 'isolation', 'schutzleiter', 'rcd', 'fi-schalter', 'prüfprotokoll', 'sicherheitsregel']],
    ['E4', 'IT-Systeme installieren und konfigurieren', 2, ['netzwerk', 'ip-adresse', 'konfigur', 'software', 'sps', 'programm']],
    ['B1', 'Technische Auftragsanalyse (Fachrichtung Betriebstechnik)', 3, ['auftrag', 'schaltplan', 'stromlaufplan', 'materialliste', 'planung']],
    ['B2', 'Elektrische Anlagen installieren und in Betrieb nehmen', 4, ['inbetriebnahme', 'anschließ', 'motor', 'drehfeld', 'installier']],
    ['B3', 'Anlagen und Systeme instand halten', 5, ['wartung', 'störung', 'fehlersuche', 'instand', 'thermografie', 'dguv']],
    ['EI1', 'Berufsbildung, Arbeits- und Tarifrecht', 1, ['tarif', 'betriebsrat', 'arbeitszeit']],
    ['EI2', 'Aufbau und Organisation des Betriebes', 1, ['organisation', 'abteilung']],
    ['EI3', 'Sicherheit und Gesundheitsschutz bei der Arbeit', 1, ['arbeitsschutz', 'unterweisung', 'psa', 'erste hilfe']],
    ['EI4', 'Umweltschutz', 1, ['umwelt', 'entsorg', 'elektroschrott', 'energie']],
    ['EI5', 'Betriebliche und technische Kommunikation', 2, ['dokumentation', 'schaltzeichen', 'datenblatt', 'übergabe']],
    ['EI6', 'Arbeit planen und organisieren', 3, ['planen', 'arbeitsablauf', 'werkzeug']],
    ['EI7', 'Qualitätsmanagement', 5, ['qualität', 'protokoll', 'prüfen', 'kunde']]
  ].map(([nr, titel, lj, sw], i) => ({ nr, titel, beruf: Q_IEL, lehrjahr: lj, stichworte: sw, abteilungen: [], sort: 970 + i })),
  ...[['L1', 'Berufsbildung, Arbeits- und Tarifrecht', 1, ['tarif', 'betriebsrat', 'arbeitszeit']],
    ['L2', 'Aufbau und Organisation des Betriebes', 1, ['organisation', 'abteilung']],
    ['L3', 'Sicherheit und Gesundheitsschutz bei der Arbeit', 1, ['arbeitsschutz', 'unterweisung', 'sicherheitsschuhe', 'psa']],
    ['L4', 'Umweltschutz', 1, ['umwelt', 'entsorg', 'verpackungsmüll', 'recycling']],
    ['L5', 'Arbeitsorganisation; Information und Kommunikation', 6, ['disponier', 'bestand', 'meldebestand', 'bestellung', 'lagerverwaltung', 'sap', 'scanner']],
    ['L6', 'Logistische Prozesse; qualitätssichernde Maßnahmen', 7, ['prozess', 'kennzahl', 'qualität', 'just-in-time', 'kvp']],
    ['L7', 'Einsatz von Arbeitsmitteln', 2, ['stapler', 'gabelstapler', 'hubwagen', 'flurförder', 'transport', 'kran']],
    ['L8', 'Annahme von Gütern', 1, ['wareneingang', 'lieferschein', 'annahme', 'entladen', 'prüfen']],
    ['L9', 'Lagerung von Gütern', 3, ['einlager', 'lagerplatz', 'regal', 'fifo', 'inventur', 'gefahrstoff']],
    ['L10', 'Kommissionierung und Verpackung von Gütern', 4, ['kommission', 'picken', 'pick', 'verpack', 'auftrag']],
    ['L11', 'Versand von Gütern', 5, ['versand', 'verlad', 'ladungssicherung', 'tour', 'frachtbrief', 'packliste']]
  ].map(([nr, titel, lj, sw], i) => ({ nr, titel, beruf: Q_LAG, lehrjahr: lj, stichworte: sw, abteilungen: [], sort: 990 + i }))
];

/* ---------- Laufzeit-Anpassungen ---------- */
function qApplyConfig() {
  if (typeof qBrand === 'function') qBrand(isQuali());
  if (!isQuali()) return;
  try {
    const krit = ['Fachkenntnisse', 'Arbeitsqualität', 'Arbeitstempo', 'Zuverlässigkeit & Pünktlichkeit', 'Teamarbeit', 'Umgang mit Maschinen und Anlagen', 'Selbstständigkeit', 'Lernbereitschaft', 'Arbeitssicherheit & Ordnung'];
    BEU_KRIT.splice(0, BEU_KRIT.length, ...krit);
    const i = ABS_TYPES.indexOf('Berufsschule'); if (i >= 0) ABS_TYPES.splice(i, 1);
  } catch {}
}
/* Begriffe im Qualifizierungsmodus: Teilnehmende statt Azubis, Trainer statt Ausbilder, Modul statt Lehrjahr */
const Q_TERMS = [
  [/\bAzubis\b/g, 'Teilnehmende'], [/\bAzubi\b/g, 'Teilnehmer/in'],
  [/\bAusbilder\/innen\b/g, 'Trainer/innen'], [/\bAusbilder\/in\b/g, 'Trainer/in'], [/\bAusbilderin oder deines Ausbilders\b/g, 'Trainerin oder deines Trainers'], [/\bdeine Ausbilderin oder dein Trainer\b/g, 'deine Trainerin oder dein Trainer'], [/\bAusbilderin\b/g, 'Trainerin'], [/\bAktuelle Abteilung\b/g, 'Aktueller Lernort'], [/\bAusbilder\b/g, 'Trainer'],
  [/\bAusbildungsleitung\b/g, 'Koordination'], [/\bAusbildungsteam\b/g, 'Trainerteam'],
  [/(\d)\. LJ\b/g, 'Modul $1'], [/(\d)\. Ausbildungsjahr(es)?\b/g, 'Modul $1'], [/\bAusbildungsjahr(es)?\b/g, 'Modul'], [/\bLehrjahr\b/g, 'Modul'],
  [/\bim Haus\b/g, 'in der Maßnahme'], [/\bDein Berichtsheft\b/g, 'Dein Nachweis'], [/\bStand Berichtsheft\b/g, 'Stand Nachweis']
];
function qTerms(root) {
  if (!isQuali() || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const list = []; while (w.nextNode()) list.push(w.currentNode);
  list.forEach(n => { let s = n.nodeValue, o = s; Q_TERMS.forEach(([re, r]) => { s = s.replace(re, r); }); if (s !== o) n.nodeValue = s; });
}

/* ---------- Daten ---------- */
const qOf = uid => (S.home?.qt || S.quali?.rows || []).find(r => r.azubi_id === uid) || null;
function qMods(t) {
  const k = qKat(t); if (!k) return [];
  return k.module.map(m => ({ ...m, ...((t.module || []).find(x => x.nr === m.nr) || {}), titel: m.titel, monate: m.monate, rp: m.rp }));
}
function qCur(t) { const ms = qMods(t); return ms.find(m => m.status === 'laeuft') || ms.find(m => m.status !== 'bestanden') || ms[ms.length - 1] || null; }
const qDone = t => qMods(t).filter(m => m.status === 'bestanden').length;
function qLine(p) {
  const t = qOf(p.id), k = qKat(t); if (!k) return p.beruf || '';
  const c = qCur(t), n = k.module.length;
  return `${k.kurz}${n > 1 && c ? ` · Modul ${c.nr} von ${n}` : ''}`;
}
async function qLoadAll() {
  const rows = await q(sb.from('quali_teilnahmen').select('*'));
  S.quali = { ...(S.quali || {}), rows };
  return rows;
}

/* ---------- Startseite ---------- */
function qTileHTML() {
  const H = S.home || {}, rows = H.qt || [];
  let chip = ['', 'Qualifizierung'], sub = 'Module, Zertifikate, Externenprüfung';
  if (isAzubi()) {
    const t = rows.find(r => r.azubi_id === S.me.id), k = qKat(t);
    if (k) { const c = qCur(t); chip = k.module.length > 1 ? ['brass', `Modul ${c?.nr || 1}/${k.module.length}`] : ['brass', k.art]; sub = c?.titel || k.kurz; }
  } else {
    const tn = azubis().length, open = rows.filter(r => !qKat(r)).length + (tn - rows.length);
    chip = open > 0 ? ['warn', `${open} ohne Maßnahme`] : ['ok', `${tn} Teilnehmende`];
    sub = 'Module, Zertifikate und Prüfungen aller Teilnehmenden';
  }
  const ex = isAzubi() ? qExamInfo(rows.find(r => r.azubi_id === S.me.id)) : null;
  return `<button class="card modtile" data-go="quali">
      <div class="flex items-center justify-between gap-2"><span class="ico">${svg('school')}</span><span class="chip ${chip[0]} tnum">${esc(chip[1])}</span></div>
      <div><div class="font-display font-bold text-[16px] leading-snug">Qualifizierung</div><div class="text-[13px] text-muted mt-0.5">${esc(sub)}</div></div></button>
    <button class="card modtile" data-go="quali" data-qtab="pruefung">
      <div class="flex items-center justify-between gap-2"><span class="ico brass">${svg('ihk')}</span><span class="chip ${ex?.n != null ? (ex.n <= 30 ? 'crit' : ex.n <= 90 ? 'warn' : '') : ''} tnum">${ex?.n != null ? `in ${ex.n} Tagen` : 'IHK'}</span></div>
      <div><div class="font-display font-bold text-[16px] leading-snug">Externenprüfung</div><div class="text-[13px] text-muted mt-0.5">Zulassung nach § 45 Abs. 2 BBiG, Termine</div></div></button>`;
}
function qExamInfo(t) {
  if (!t) return null;
  const d = [t.pruefung?.schriftlich, t.pruefung?.praktisch].filter(Boolean).sort()[0] || null;
  const done = Q_PRUEF.filter(([k]) => t.pruefung?.[k]).length;
  return { d, n: d ? daysUntil(d) : null, done, total: Q_PRUEF.length };
}
/* Hinweiskarten oben auf der Startseite: Teilnehmende sehen ihren nächsten Schritt, Qualifizierungs-Guides ihre Begleitungen */
function qHomeHTML() {
  if (!isQuali()) return '';
  const H = S.home || {}, rows = H.qt || [];
  if (isAzubi()) {
    const t = rows.find(r => r.azubi_id === S.me.id), k = qKat(t), live = typeof qLiveHomeHTML === 'function' ? qLiveHomeHTML() : ''; if (!k) return live;
    const c = qCur(t), ex = qExamInfo(t), g = t.guide_id ? S.profiles[t.guide_id] : null;
    return `<button class="card w-full p-4 mt-3 text-left" data-go="quali"><div class="eyebrow">${esc(k.art)} · ${esc(k.beruf)}</div>
      <div class="font-semibold text-[15px] mt-0.5">${c && k.module.length > 1 ? `Modul ${c.nr}: ${esc(c.titel)}` : esc(k.kurz)}</div>
      <div class="text-[13px] text-muted mt-0.5 tnum">${c?.bis ? `bis ${fmtDate(c.bis)}` : ''}${ex?.n != null && ex.n >= 0 ? `${c?.bis ? ' · ' : ''}Externenprüfung in ${ex.n} Tagen` : ''}${g ? ` · Guide: ${esc(g.full_name)}` : ''}</div>
      ${k.module.length > 1 ? `<div class="bar w-full mt-2"><i style="width:${pct(qDone(t), k.module.length)}%"></i></div>` : ''}</button>${live}`;
  }
  if (isMA()) {
    const mine = rows.filter(r => r.guide_id === S.me.id); if (!mine.length) return '';
    return `${secTitle('Deine Begleitungen', '<span class="text-[12px] text-muted">Qualifizierungs-Guide</span>')}
      <div class="card">${mine.map((t, i) => { const p = S.profiles[t.azubi_id], k = qKat(t), c = qCur(t), ex = qExamInfo(t); return p ? `<div class="flex items-center gap-3 p-3.5 ${i ? 'border-t border-line' : ''}">${avatar(p, 34)}<div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(p.full_name)}</div><div class="text-[12px] text-muted truncate">${esc(k?.kurz || '')}${c && k?.module.length > 1 ? ` · Modul ${c.nr}` : ''}${ex?.n != null && ex.n >= 0 ? ` · Prüfung in ${ex.n} T.` : ''}</div></div><button class="btn ghost py-1.5 px-3 text-[13px]" data-chat="${p.id}">Schreiben</button></div>` : ''; }).join('')}</div>
      <p class="text-[12px] text-muted mt-2">Du siehst nur den Stand der Maßnahme, keine Berichte und keine Bewertungen.</p>`;
  }
  return '';
}

/* ---------- Ansicht „Qualifizierung“ ---------- */
const QualiView = {
  async load() {
    await qLoadAll();
    S.quali.tab = S.quali.tab || 'stand';
    if (typeof qExtraLoad === 'function') await qExtraLoad();
  },
  html() {
    return isAzubi() ? qMineHTML() : qStaffHTML();
  },
  bind() {
    $$('[data-qtabsel]').forEach(b => b.onclick = () => { S.quali.tab = b.dataset.qtabsel; go('quali'); });
    if (typeof qExtraBind === 'function') qExtraBind();
    $$('[data-qex]').forEach(b => b.onclick = () => qExam(+b.dataset.qex));
    $$('[data-qedit]').forEach(b => b.onclick = () => qEditSheet(b.dataset.qedit));
    bindChatLinks();
  }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-qtab]'); if (b && S.quali) S.quali.tab = b.dataset.qtab; else if (b) S.quali = { tab: b.dataset.qtab }; });

function qSegHTML(tabs) {
  return `<div class="seg mt-4 mb-1">${tabs.map(([k, l]) => `<button aria-pressed="${S.quali.tab === k}" data-qtabsel="${k}">${l}</button>`).join('')}</div>`;
}
function qModListHTML(t, staff) {
  const k = qKat(t), ms = qMods(t), rp = S.content.rp || [];
  return `<div class="card">${ms.map((m, i) => { const st = qModStat[m.status || 'offen'] || qModStat.offen; return `<div class="p-3.5 ${i ? 'border-t border-line' : ''}">
    <div class="flex items-start gap-3"><span class="chip ${m.status === 'bestanden' ? 'ok' : m.status === 'laeuft' ? 'brass' : ''} tnum flex-none">${k.module.length > 1 ? 'TQ ' + m.nr : 'Kurs'}</span>
    <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold">${esc(m.titel)}</div><div class="text-[12px] text-muted tnum">${m.monate} Monate${m.von ? ` · ${fmtDate(m.von)}–${m.bis ? fmtDate(m.bis) : '…'}` : ''}${m.zert_datum ? ` · IHK-Zertifikat ${fmtDate(m.zert_datum)}` : ''}</div></div>
    <span class="chip ${st[0]} flex-none">${st[1]}</span></div>
    <details class="mt-2"><summary class="text-[12px] font-semibold text-accent cursor-pointer">Inhalte nach Rahmenplan</summary><ul class="mt-1.5 text-[12px] text-muted flex flex-col gap-1">${m.rp.map(nr => { const r = rp.find(x => x.nr === nr && x.beruf === k.beruf); return `<li><b class="text-fg">${esc(nr)}</b> ${esc(r ? r.titel : '')}</li>`; }).join('')}</ul></details>
    ${!staff && m.status !== 'bestanden' ? `<button class="btn ghost w-full mt-2 py-1.5 text-[13px]" data-qex="${m.nr}">${k.module.length > 1 ? `Modul ${m.nr} üben` : 'Prüfung üben'}</button>` : ''}</div>`; }).join('')}</div>`;
}
function qPruefHTML(t, staff) {
  const k = qKat(t), pr = t.pruefung || {}, ex = qExamInfo(t);
  const mind = k.ausbildungsjahre * 1.5;
  return `${secTitle('Externenprüfung', `<span class="chip ${ex.done === ex.total ? 'ok' : 'warn'} tnum">${ex.done}/${ex.total}</span>`)}
    <div class="card">${Q_PRUEF.map(([key, l, d], i) => `<div class="flex items-center gap-3 p-3.5 ${i ? 'border-t border-line' : ''}"><span class="chip ${pr[key] ? 'ok' : ''} flex-none">${pr[key] ? '✓' : '○'}</span><div class="flex-1 min-w-0"><div class="text-[14px] font-semibold">${esc(l)}</div><div class="text-[12px] text-muted">${pr[key] ? 'erledigt ' + fmtDate(pr[key]) : esc(d)}</div></div></div>`).join('')}
      <div class="p-3.5 border-t border-line grid grid-cols-3 gap-2 text-[13px]"><div><div class="text-[11px] text-muted">Anmeldeschluss</div><div class="font-semibold tnum">${pr.anmeldeschluss ? fmtDate(pr.anmeldeschluss) : '–'}</div></div><div><div class="text-[11px] text-muted">schriftlich</div><div class="font-semibold tnum">${pr.schriftlich ? fmtDate(pr.schriftlich) : '–'}</div></div><div><div class="text-[11px] text-muted">praktisch</div><div class="font-semibold tnum">${pr.praktisch ? fmtDate(pr.praktisch) : '–'}</div></div></div></div>
    <p class="text-[12px] text-muted mt-2">Zulassung nach § 45 Abs. 2 BBiG: in der Regel das Eineinhalbfache der Ausbildungszeit im Beruf gearbeitet (hier ${String(mind).replace('.', ',')} Jahre) – oder die Berufserfahrung wird auf andere Weise glaubhaft gemacht, z. B. mit den IHK-Zertifikaten der Teilqualifizierung. Über die Zulassung entscheidet die IHK. Keine Rechtsberatung.</p>
    ${!staff ? `<button class="btn w-full mt-3" data-qex="0">Gemischte Prüfung üben</button>` : ''}`;
}
function qMineHTML() {
  const t = (S.quali.rows || []).find(r => r.azubi_id === S.me.id), k = qKat(t);
  if (!k) return `<h1 class="text-[26px] font-bold mt-1">Qualifizierung</h1>${empty('Dir ist noch keine Maßnahme zugeordnet. Das übernimmt die Koordination.')}`;
  const g = t.guide_id ? S.profiles[t.guide_id] : null, done = qDone(t);
  return `<h1 class="text-[26px] font-bold mt-1">Qualifizierung</h1>
    <section class="keycard p-5 mt-3"><div class="text-[13px] sub">${esc(k.art)}${k.fachrichtung ? ' · Fachrichtung ' + esc(k.fachrichtung) : ''}</div>
      <div class="text-[20px] font-bold leading-tight mt-1">${esc(k.beruf)}</div>
      <div class="sub text-[13px] mt-1 tnum">${t.standort ? esc(t.standort) + ' · ' : ''}${t.beginn ? fmtDate(t.beginn) : ''}${t.ende ? ' – ' + fmtDate(t.ende) : ''}</div>
      ${k.module.length > 1 ? `<div class="mt-3 text-[13px] font-semibold tnum">${done} von ${k.module.length} Modulen mit IHK-Zertifikat</div><div class="bar w-full mt-1.5" style="background:rgba(255,255,255,.2)"><i style="width:${pct(done, k.module.length)}%;background:#fff"></i></div>` : ''}</section>
    ${qSegHTML([['stand', 'Module'], ['tests', 'Tests'], ['anw', 'Anwesenheit'], ['pruefung', 'Prüfung'], ['info', 'Ablauf']])}
    ${typeof qExtraHTML === 'function' && qExtraHTML() != null ? qExtraHTML() : S.quali.tab === 'pruefung' ? qPruefHTML(t, false) : S.quali.tab === 'info' ? qInfoHTML(k, g) : `${secTitle('Deine Module')}${qModListHTML(t, false)}
      <p class="text-[12px] text-muted mt-2">Übungsfragen aus der App, keine echten IHK-Prüfungsaufgaben. Falsche Antworten kommen später als Lernkarten wieder.</p>`}`;
}
function qInfoHTML(k, g) {
  return `${secTitle('So läuft deine Maßnahme')}<div class="card p-4 flex flex-col gap-3 text-[14px]">
    <div><div class="text-[12px] text-muted">Zeitmodell</div><div>${esc(k.zeit)} · ${esc(k.dauer)}</div></div>
    <div><div class="text-[12px] text-muted">Lernorte</div><div>${esc(k.lernorte)}</div></div>
    <div><div class="text-[12px] text-muted">Zertifikate</div><div>${esc(k.zert)}</div></div>
    <div><div class="text-[12px] text-muted">Abschluss</div><div>${esc(k.abschluss)}</div></div>
    ${k.voraussetzung ? `<div><div class="text-[12px] text-muted">Voraussetzung</div><div>${esc(k.voraussetzung)}</div></div>` : ''}
    <div class="text-[13px] text-muted">Dein Arbeitsvertrag und dein Tarifgehalt laufen während der Maßnahme weiter.</div></div>
    ${g ? `${secTitle('Dein Qualifizierungs-Guide')}<div class="card p-3.5 flex items-center gap-3">${avatar(g, 38)}<div class="flex-1 min-w-0"><div class="text-[14px] font-semibold">${esc(g.full_name)}</div><div class="text-[12px] text-muted">${esc(g.position || 'Qualifizierungs-Guide')}</div></div><button class="btn ghost py-1.5 px-3 text-[13px]" data-chat="${g.id}">Schreiben</button></div>
      <p class="text-[12px] text-muted mt-2">Dein Guide ist eine Kollegin oder ein Kollege aus dem Werk und hilft bei Fragen rund ums Lernen. Er oder sie sieht nur den Stand deiner Maßnahme.</p>` : ''}`;
}
function qStaffHTML() {
  const rows = S.quali.rows || [], list = azubis();
  const canEdit = isAdmin() || can('team');
  const byK = {}; list.forEach(p => { const t = rows.find(r => r.azubi_id === p.id), key = t?.massnahme || '_'; (byK[key] = byK[key] || []).push({ p, t }); });
  const order = [...Object.keys(Q_KATALOG).filter(k => byK[k]), ...(byK._ ? ['_'] : [])];
  return `<h1 class="text-[26px] font-bold mt-1">Qualifizierung</h1>
    <p class="text-[14px] text-muted mt-1">Teilqualifizierungen und Intensivkurse mit Externenprüfung.</p>
    ${typeof qStaffTabs === 'function' && qStaffTabs().length > 1 ? qSegHTML(qStaffTabs()) : ''}
    ${typeof qExtraHTML === 'function' && qExtraHTML() != null ? qExtraHTML() : `${order.length ? order.map(key => { const k = Q_KATALOG[key]; return `${secTitle(k ? esc(k.kurz) : 'Ohne Maßnahme', `<span class="chip tnum">${byK[key].length}</span>`)}
      <div class="card">${byK[key].map(({ p, t }, i) => { const c = t && qCur(t), ex = qExamInfo(t), n = k?.module.length || 0; return `<button class="w-full flex items-center gap-3 p-3.5 text-left ${i ? 'border-t border-line' : ''}" ${canEdit ? `data-qedit="${p.id}"` : ''}>${avatar(p, 38)}
        <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(p.full_name)}</div>
        <div class="text-[12px] text-muted truncate">${k ? (n > 1 ? `Modul ${c?.nr || 1} von ${n} · ${qDone(t)} ${qDone(t) === 1 ? 'Zertifikat' : 'Zertifikate'}` : esc(k.art)) : 'Maßnahme zuordnen'}${t?.standort ? ' · ' + esc(t.standort) : ''}</div>
        ${k && n > 1 ? `<div class="flex gap-1 mt-1.5">${qMods(t).map(m => `<i title="Modul ${m.nr}: ${(qModStat[m.status || 'offen'] || qModStat.offen)[1]}" style="flex:1;height:6px;border-radius:3px;background:var(--st-${m.status === 'bestanden' ? 'ok' : m.status === 'laeuft' ? 'warn' : m.status === 'wiederholen' ? 'crit' : 'none, var(--line)'})"></i>`).join('')}</div>` : ''}</div>
        ${ex?.n != null && ex.n >= 0 ? `<span class="chip ${ex.n <= 30 ? 'crit' : ex.n <= 90 ? 'warn' : ''} tnum flex-none">Prüfung ${ex.n} T.</span>` : ''}${canEdit ? svg('arrow', 'w-4 h-4 text-muted flex-none') : ''}</button>`; }).join('')}</div>`; }).join('')
      : empty('Noch keine Teilnehmenden registriert. Gib ihnen den Code aus Verwaltung › Team.')}
    ${secTitle('Hinweise')}<div class="card p-4 text-[13px] text-muted flex flex-col gap-2">
      <div>Frühwarnung, Stimmungs-Check und Stationsfeedback sind im Qualifizierungsmodus ausgeschaltet. Einschalten erst nach Abstimmung mit dem Betriebsrat (§ 87 Abs. 1 Nr. 6 BetrVG).</div>
      <div>Qualifizierungs-Guides sehen nur den Stand der Maßnahme ihrer Begleitungen, keine Berichte, Noten oder Beurteilungen.</div>
      <div>Maßnahmen nach den öffentlichen Angaben von C1TT. Die Zuordnung der Rahmenplan-Positionen zu den Modulen ist ein Vorschlag.</div></div>`}`;
}

/* ---------- Bearbeiten (Koordination / Trainer mit Recht „Team“) ---------- */
function qEditSheet(uid) {
  const p = S.profiles[uid]; if (!p) return;
  const t = (S.quali.rows || []).find(r => r.azubi_id === uid) || { azubi_id: uid, massnahme: '', module: [], pruefung: {} };
  const guides = Object.values(S.profiles).filter(x => x.aktiv !== false && x.id !== uid && x.role !== 'azubi').sort((a, b) => a.full_name.localeCompare(b.full_name));
  const draw = () => {
    const k = qKat(t), ms = qMods(t), pr = t.pruefung || {};
    sheetShell(p.full_name, `<form id="qForm" class="flex flex-col gap-3">
      <div class="card p-4 flex flex-col gap-3">
        <div><label class="lbl" for="qM">Maßnahme</label><select id="qM" class="field"><option value="">– bitte wählen –</option>${Object.entries(Q_KATALOG).map(([key, x]) => `<option value="${key}" ${t.massnahme === key ? 'selected' : ''}>${esc(x.art)} · ${esc(x.beruf)}</option>`).join('')}</select></div>
        <div class="grid grid-cols-2 gap-2"><div><label class="lbl" for="qB">Beginn</label><input id="qB" type="date" class="field" value="${t.beginn || ''}"></div><div><label class="lbl" for="qE">Ende</label><input id="qE" type="date" class="field" value="${t.ende || ''}"></div></div>
        <div><label class="lbl" for="qS">C1TT-Standort</label><input id="qS" class="field" maxlength="80" value="${esc(t.standort || '')}"></div>
        <div><label class="lbl" for="qG">Qualifizierungs-Guide</label><select id="qG" class="field"><option value="">– keiner –</option>${guides.map(g => `<option value="${g.id}" ${t.guide_id === g.id ? 'selected' : ''}>${esc(g.full_name)}${g.position ? ' · ' + esc(g.position) : ''}</option>`).join('')}</select></div>
        ${k?.voraussetzung ? `<div><label class="lbl" for="qJ">Berufserfahrung in Jahren</label><input id="qJ" type="number" min="0" step="0.5" class="field" value="${t.erfahrung_jahre ?? ''}"><p class="text-[12px] text-muted mt-1">${esc(k.voraussetzung)}</p></div>` : ''}
      </div>
      ${k ? `<div class="eyebrow">Module</div><div class="card">${ms.map((m, i) => `<div class="p-3.5 ${i ? 'border-t border-line' : ''}"><div class="text-[13px] font-semibold">${k.module.length > 1 ? 'Modul ' + m.nr + ': ' : ''}${esc(m.titel)}</div>
        <div class="grid grid-cols-2 gap-2 mt-2"><select class="field" data-mst="${m.nr}">${Object.entries(qModStat).map(([v, [, l]]) => `<option value="${v}" ${(m.status || 'offen') === v ? 'selected' : ''}>${l}</option>`).join('')}</select><input type="date" class="field" data-mz="${m.nr}" value="${m.zert_datum || ''}" aria-label="Datum IHK-Zertifikat Modul ${m.nr}"></div>
        <div class="grid grid-cols-2 gap-2 mt-2"><input type="date" class="field" data-mv="${m.nr}" value="${m.von || ''}" aria-label="Modul ${m.nr} von"><input type="date" class="field" data-mb="${m.nr}" value="${m.bis || ''}" aria-label="Modul ${m.nr} bis"></div></div>`).join('')}</div>
      <p class="text-[12px] text-muted -mt-1">Je Modul: Status, Datum des IHK-Zertifikats, Zeitraum.</p>
      <div class="eyebrow">Externenprüfung</div><div class="card p-4 flex flex-col gap-2">${Q_PRUEF.map(([key, l]) => `<label class="flex items-center gap-2 text-[14px]"><input type="checkbox" class="cbx" data-pr="${key}" ${pr[key] ? 'checked' : ''}>${esc(l)}</label>`).join('')}
        <div class="grid grid-cols-3 gap-2 mt-1"><div><label class="lbl" for="qPa">Anmeldeschluss</label><input id="qPa" type="date" class="field" value="${pr.anmeldeschluss || ''}"></div><div><label class="lbl" for="qPs">schriftlich</label><input id="qPs" type="date" class="field" value="${pr.schriftlich || ''}"></div><div><label class="lbl" for="qPp">praktisch</label><input id="qPp" type="date" class="field" value="${pr.praktisch || ''}"></div></div></div>` : ''}
      <button class="btn">Speichern</button></form>`);
    $('#qM').onchange = () => { t.massnahme = $('#qM').value; collect(false); draw(); };
    $('#qForm').onsubmit = async e => { e.preventDefault(); collect(true); await save(); };
  };
  const collect = all => {
    t.beginn = $('#qB')?.value || null; t.ende = $('#qE')?.value || null; t.standort = $('#qS')?.value.trim() || null; t.guide_id = $('#qG')?.value || null;
    if ($('#qJ')) t.erfahrung_jahre = $('#qJ').value === '' ? null : +$('#qJ').value;
    if (!all) return;
    const k = qKat(t); if (!k) return;
    t.module = k.module.map(m => ({ nr: m.nr, status: $(`[data-mst="${m.nr}"]`).value, zert_datum: $(`[data-mz="${m.nr}"]`).value || null, von: $(`[data-mv="${m.nr}"]`).value || null, bis: $(`[data-mb="${m.nr}"]`).value || null }));
    const old = t.pruefung || {}, pr = {};
    Q_PRUEF.forEach(([key]) => { if ($(`[data-pr="${key}"]`).checked) pr[key] = old[key] || localDate(); });
    pr.anmeldeschluss = $('#qPa').value || null; pr.schriftlich = $('#qPs').value || null; pr.praktisch = $('#qPp').value || null;
    t.pruefung = pr;
  };
  const save = async () => {
    if (!t.massnahme) return toast('Bitte eine Maßnahme wählen.');
    const row = { azubi_id: uid, massnahme: t.massnahme, beginn: t.beginn, ende: t.ende, standort: t.standort, guide_id: t.guide_id, erfahrung_jahre: t.erfahrung_jahre ?? null, module: t.module || [], pruefung: t.pruefung || {}, updated_at: new Date().toISOString() };
    if (!t.id) row.betrieb_id = S.betrieb?.id || S.me.betrieb_id;
    const saved = t.id ? await q(sb.from('quali_teilnahmen').update(row).eq('id', t.id).select().single()) : await q(sb.from('quali_teilnahmen').insert(row).select().single());
    const k = qKat(saved), upd = {};
    if (k && p.beruf !== k.beruf) upd.beruf = k.beruf;
    const c = qCur(saved); if (c && p.lehrjahr !== c.nr) upd.lehrjahr = c.nr;
    const ap = [saved.pruefung?.schriftlich, saved.pruefung?.praktisch].filter(Boolean).sort()[0] || null; if (ap !== (p.ap_datum || null)) upd.ap_datum = ap;
    if (Object.keys(upd).length) { await q(sb.from('profiles').update(upd).eq('id', uid)); Object.assign(p, upd); }
    S.quali.rows = (S.quali.rows || []).filter(r => r.azubi_id !== uid).concat(saved);
    closeSheet(); toast('Gespeichert'); render();
  };
  draw();
}

/* ---------- Üben ---------- */
function qExam(nr) {
  const t = (S.quali.rows || S.home?.qt || []).find(r => r.azubi_id === S.me.id), k = qKat(t); if (!k) return;
  const m = nr ? k.module.find(x => x.nr === nr) : null;
  const rps = m ? m.rp : k.module.flatMap(x => x.rp);
  const keys = (S.content.rp || []).filter(r => r.beruf === k.beruf && rps.includes(r.nr)).flatMap(r => r.stichworte || []).filter(x => x.length > 3);
  S.lfExamNr = m ? m.nr : null;
  openExam('lernfeld', null, rps, keys, m && k.module.length > 1 ? `Modul ${m.nr} · ${m.titel}` : `${k.beruf} · Prüfung üben`);
}
