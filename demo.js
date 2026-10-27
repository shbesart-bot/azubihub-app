/* AzubiHub Demo: läuft komplett im Browser mit Beispieldaten. Nichts wird gespeichert. */
(function () {
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const iso = d => d.toISOString();
  const day = (offset, h = 9) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(h, 0, 0, 0); return d; };
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const w = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - w); const y = t.getUTCFullYear(); return { jahr: y, kw: Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7) }; }

  const B = 'demo-betrieb';
  const P = {
    lei: { id: 'demo-lei', full_name: 'Sabine Krämer', role: 'admin', position: 'Inhaberin', kontakt_email: 'sabine@seeblick.example', telefon: '05641 7788-0', abteilung: 'Rezeption' },
    koch: { id: 'demo-koch', full_name: 'Marco Brandt', role: 'ausbilder', position: 'Küchenchef', telefon: '05641 7788-30', rechte: ['berichte', 'lernziele', 'abwesenheiten', 'uebergabe', 'unterweisungen'], bereiche: ['Küche'], abteilung: 'Küche' },
    fom: { id: 'demo-fom', full_name: 'Julia Weber', role: 'ausbilder', position: 'Front Office Managerin', kontakt_email: 'julia@seeblick.example', telefon: '05641 7788-10', rechte: ['berichte', 'lernziele', 'gespraeche', 'abwesenheiten', 'uebergabe', 'ankuendigungen', 'team', 'bewerbungen'], bereiche: ['Rezeption', 'Housekeeping', 'Service'], abteilung: 'Rezeption' },
    lena: { id: 'demo-lena', full_name: 'Lena Petrović', role: 'azubi', beruf: 'Hotelfachmann/-frau', lehrjahr: 1, abteilung: 'Rezeption', start_datum: ymd(day(-66)), betreuer_id: 'demo-fom', zp_datum: ymd(day(160)), unter18: true },
    tom: { id: 'demo-tom', full_name: 'Tom Schneider', role: 'azubi', beruf: 'Koch/Köchin', lehrjahr: 2, abteilung: 'Küche', start_datum: ymd(day(-430)), betreuer_id: 'demo-koch', zp_datum: ymd(day(44)) },
    aylin: { id: 'demo-aylin', full_name: 'Aylin Demir', role: 'azubi', beruf: 'Hotelfachmann/-frau', lehrjahr: 3, abteilung: 'Service', start_datum: ymd(day(-790)), betreuer_id: 'demo-fom', ap_datum: ymd(day(220)) },
    piotr: { id: 'demo-piotr', full_name: 'Piotr Nowak', role: 'mitarbeiter', position: 'Servicekraft', abteilung: 'Service' }
  };
  const base = { betrieb_id: B, aktiv: true, foto: null, rechte: [], bereiche: [], lehrjahr: 1, beruf: '', start_datum: ymd(day(-900)), unter18: false, position: '', kontakt_email: '', telefon: '', betreuer_id: null, zp_datum: null, ap_datum: null, gruppen_leitung: false, sprache: 'de', created_at: iso(day(-900)) };
  const profiles = Object.values(P).map(p => ({ ...base, ...p }));

  const TXT = {
    Rezeption: [['Check-in von Gästen mit Meldeschein', 180], ['Check-out und Rechnungen geprüft', 150], ['Telefon angenommen, Reservierungen angelegt', 120], ['Beschwerde eines Gastes aufgenommen', 30], ['Kasse unter Aufsicht abgerechnet', 45]],
    Küche: [['Mise en place für den Abendservice', 150], ['Fond und Sauce angesetzt', 120], ['Gemüse geputzt und Beilagen vorbereitet', 120], ['Warenannahme, Temperatur geprüft', 45], ['Fisch filetiert', 60], ['Dessert angerichtet', 60]],
    Service: [['Frühstücksbuffet aufgebaut und betreut', 180], ['Tische eingedeckt', 60], ['Getränke an der Bar ausgegeben', 120], ['Bankett für Hochzeit vorbereitet', 150], ['Gäste beraten, Weinempfehlung', 60]],
    Housekeeping: [['Zimmer nach Abreise gereinigt', 240], ['Minibar kontrolliert und aufgefüllt', 60], ['Betten nach Standard bezogen', 120]]
  };
  function week(p, back, status, abt) {
    const w = isoWeek(day(-7 * back));
    const tage = [0, 1, 2, 3, 4, 5, 6].map(i => {
      if (i >= 5) return { tag: i, bereich: 'Frei', eintraege: [] };
      if (i === 2 && back % 3 === 0) return { tag: i, bereich: 'Berufsschule', eintraege: [{ text: 'Rechnungswesen und Englisch', min: 360 }] };
      const list = TXT[abt], a = list[(i + back) % list.length], b = list[(i + back + 2) % list.length];
      return { tag: i, bereich: abt, eintraege: [{ text: a[0], min: a[1] + 60 }, { text: b[0], min: b[1] + 60 }] };
    });
    const signer = abt === 'Küche' ? P.koch.id : P.fom.id;
    return { id: uuid(), betrieb_id: B, user_id: p.id, jahr: w.jahr, kw: w.kw, abteilung: abt, tage, status,
      inhalt: status === 'entwurf' ? '' : 'Diese Woche habe ich viel Routine bekommen und gelernt, worauf es bei unseren Gästen ankommt.',
      feedback: status === 'zurueck' ? 'Bitte ergänze bei Dienstag, was du bei der Sauce gelernt hast.' : status === 'abgezeichnet' && back % 4 === 1 ? 'Sehr gut beschrieben, weiter so!' : null,
      signed_by: status === 'abgezeichnet' ? signer : null, signed_at: status === 'abgezeichnet' ? iso(day(-7 * back + 6)) : null, updated_at: iso(new Date(Math.min(+day(-7 * back + 4), Date.now() - 36e5))) };
  }
  const reports = [];
  for (let b = 1; b <= 9; b++) reports.push(week(P.lena, b, b === 1 ? 'eingereicht' : 'abgezeichnet', b > 6 ? 'Housekeeping' : 'Rezeption'));
  reports.push(week(P.lena, 0, 'entwurf', 'Rezeption'));
  for (let b = 1; b <= 14; b++) reports.push(week(P.tom, b, b === 1 ? 'eingereicht' : b === 3 ? 'zurueck' : 'abgezeichnet', 'Küche'));
  for (let b = 1; b <= 12; b++) if (b !== 2 && b !== 5) reports.push(week(P.aylin, b, b === 1 ? 'eingereicht' : 'abgezeichnet', b > 8 ? 'Rezeption' : 'Service'));
  reports.find(r => r.user_id === P.aylin.id && r.status === 'eingereicht').updated_at = iso(day(-10));

  function sig(name) {
    const c = document.createElement('canvas'); c.width = 450; c.height = 150; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 450, 150); x.strokeStyle = '#14292b'; x.lineWidth = 3; x.beginPath();
    let px = 40, py = 95; x.moveTo(px, py); for (let i = 0; i < name.length * 3; i++) { px += 9; py = 80 + Math.sin(i * 1.7 + name.length) * 22; x.lineTo(px, py); } x.stroke();
    return c.toDataURL('image/png');
  }

  const now = new Date();
  const DB = {
    profiles, reports,
    betriebe: [{ id: B, name: 'Hotel Seeblick', invite_code: 'SEEB-DEMO', aktiv: true, slug: 'hotel-seeblick-demo' }],
    app_config: [],
    learning_goals: [], sops: [], checklists: [], quiz_questions: [], onboarding_tasks: [], bot_faq: [], unterweisungen: [], rahmenplan: [],
    contacts: [{ id: 1, name: 'Sabine Krämer', rolle: 'Inhaberin', erreichbar: 'DW 100', kategorie: 'Ausbildung', sort: 1 }, { id: 2, name: 'Aylin Demir', rolle: 'Dein Buddy', erreichbar: 'über die App', kategorie: 'Buddy', sort: 2 }, { id: 3, name: 'Notruf', rolle: 'Feuerwehr / Rettung', erreichbar: '112', kategorie: 'Notfall', sort: 3 }],
    goal_progress: [], onboarding_done: [], checklist_checks: [], quiz_answers: [], photo_requests: [], push_subscriptions: [],
    absences: [
      { id: uuid(), user_id: P.lena.id, typ: 'Berufsschule', von: ymd(day(9)), bis: ymd(day(13)), notiz: 'Blockunterricht', status: 'genehmigt', created_at: iso(now) },
      { id: uuid(), user_id: P.lena.id, typ: 'Urlaub', von: ymd(day(30)), bis: ymd(day(34)), notiz: 'Familienbesuch', status: 'beantragt', created_at: iso(now) },
      { id: uuid(), user_id: P.tom.id, typ: 'Krank', von: ymd(day(-40)), bis: ymd(day(-37)), notiz: null, status: 'genehmigt', created_at: iso(now) },
      { id: uuid(), user_id: P.tom.id, typ: 'Krank', von: ymd(day(-12)), bis: ymd(day(-10)), notiz: null, status: 'genehmigt', created_at: iso(now) },
      { id: uuid(), user_id: P.aylin.id, typ: 'Urlaub', von: ymd(day(0)), bis: ymd(day(4)), notiz: null, status: 'genehmigt', created_at: iso(now) }
    ],
    talks: [{ id: uuid(), user_id: P.lena.id, author_id: P.fom.id, datum: ymd(day(-20)), anlass: 'Probezeitgespräch', notizen: 'Lena ist sehr freundlich zu Gästen und lernt schnell. Am Telefon noch etwas unsicher.', ziele: 'Telefonleitfaden üben, 5 Check-ins allein', fuer_azubi: true, created_at: iso(day(-20)) }],
    shift_notes: [
      { id: uuid(), author_id: P.lena.id, schicht: 'Frühschicht', abteilung: 'Rezeption', typ: 'liegen', text: 'Zimmer 214 wartet auf Rückruf wegen Rechnung an die Firma.', created_at: iso(day(0, 8)), foto: null },
      { id: uuid(), author_id: P.tom.id, schicht: 'Spätschicht', abteilung: 'Küche', typ: 'beachten', text: 'Kühlraum 2 zeigt 8 °C, Technik ist informiert. Ware vorerst in Kühlraum 1.', created_at: iso(day(-1, 21)), foto: null }
    ],
    open_items: [
      { id: uuid(), created_by: P.lena.id, titel: 'Rückruf Firma Müller wegen Rechnung 214', abteilung: 'Rezeption', prio: 'hoch', done: false, created_at: iso(day(0, 8)) },
      { id: uuid(), created_by: P.piotr.id, titel: 'Weinkühlschrank auffüllen', abteilung: 'Service', prio: 'normal', done: false, created_at: iso(day(-1, 15)) },
      { id: uuid(), created_by: P.tom.id, titel: 'Allergenschilder fürs Buffet drucken', abteilung: 'Küche', prio: 'normal', done: true, done_by: P.lena.id, done_at: iso(day(-1, 10)), created_at: iso(day(-2, 9)) }
    ],
    chat_gruppen: [
      { id: 'demo-g-alle', name: 'Alle', regel: 'alle', abteilung: null, created_at: iso(day(-100)) },
      { id: 'demo-g-azubis', name: 'Azubis', regel: 'azubis', abteilung: null, created_at: iso(day(-100)) },
      { id: 'demo-g-team', name: 'Ausbildungsteam', regel: 'team', abteilung: null, created_at: iso(day(-100)) },
      { id: 'demo-g-kueche', name: 'Küche', regel: 'abteilung', abteilung: 'Küche', created_at: iso(day(-60)) }
    ],
    chat_mitglieder: [], chat_gelesen: [],
    messages: [
      { id: uuid(), sender_id: P.fom.id, recipient_id: P.lena.id, gruppe_id: null, body: 'Hallo Lena, morgen bitte um 6:45 da sein, wir haben 32 Abreisen.', created_at: iso(day(-1, 16)), read_at: iso(day(-1, 17)) },
      { id: uuid(), sender_id: P.lena.id, recipient_id: P.fom.id, gruppe_id: null, body: 'Alles klar, bin pünktlich da!', created_at: iso(day(-1, 17)), read_at: null },
      { id: uuid(), sender_id: P.koch.id, recipient_id: P.tom.id, gruppe_id: null, body: 'Tom, denk an deinen Bericht von letzter Woche. Ich hab dir eine Rückmeldung reingeschrieben.', created_at: iso(day(0, 7)), read_at: null },
      { id: uuid(), sender_id: P.lei.id, recipient_id: null, gruppe_id: 'demo-g-alle', body: 'Danke an alle für das tolle Wochenende mit der Hochzeit! 🎉', created_at: iso(day(-2, 10)), read_at: null },
      { id: uuid(), sender_id: P.aylin.id, recipient_id: null, gruppe_id: 'demo-g-azubis', body: 'Wer tauscht Samstag Frühschicht mit mir?', created_at: iso(day(0, 9)), read_at: null },
      { id: uuid(), sender_id: P.koch.id, recipient_id: null, gruppe_id: 'demo-g-kueche', body: 'Neue Mise-en-place-Liste hängt am Pass.', created_at: iso(day(-1, 14)), read_at: null }
    ],
    ankuendigungen: [
      { id: 'demo-a1', author_id: P.lei.id, titel: 'Neue Allergen-Regeln am Buffet', text: 'Ab Montag hat jede Speise am Buffet ein Allergenschild. Bitte vor Schichtbeginn kontrollieren. Fragen an Marco.', zielgruppe: 'alle', pflicht: true, created_at: iso(day(-1, 11)) },
      { id: 'demo-a2', author_id: P.fom.id, titel: 'Weihnachtsfeier am 12. Dezember', text: 'Wir feiern im Wintergarten ab 19 Uhr. Bitte bis Ende November zusagen.', zielgruppe: 'alle', pflicht: false, created_at: iso(day(-5, 15)) }
    ],
    ankuendigung_gelesen: [{ ankuendigung_id: 'demo-a1', user_id: P.koch.id, gelesen_at: iso(day(-1, 13)) }, { ankuendigung_id: 'demo-a1', user_id: P.aylin.id, gelesen_at: iso(day(-1, 15)) }, { ankuendigung_id: 'demo-a2', user_id: P.lena.id, gelesen_at: iso(day(-4)) }],
    unterweisung_bestaetigungen: [],
    karriere: [{ betrieb_id: B, aktiv: true, titel: 'Deine Ausbildung im Hotel Seeblick', text: 'Direkt am See, familiengeführt, 48 Zimmer. Bei uns lernst du alle Abteilungen kennen und hast vom ersten Tag an feste Ansprechpartner.', berufe: ['Hotelfachmann/-frau', 'Koch/Köchin'], vorteile: ['Feste Ansprechpartner von Tag 1', 'Digitales Berichtsheft in der App', 'Prüfungstraining und Lern-Quiz', 'Personalessen und Fahrtkostenzuschuss'], kontakt: 'bewerbung@seeblick.example', ort: 'Warburg', datenschutz: '' }],
    bewerbungen: [
      { id: 'demo-bew-mia', betrieb_id: B, name: 'Mia Hoffmann', email: 'mia@example.com', telefon: '0151 2345678', beruf: 'Hotelfachmann/-frau', start: 'August 2027', nachricht: 'Ich habe schon ein Praktikum an einer Rezeption gemacht und möchte gern bei Ihnen lernen.', status: 'neu', notiz: '', created_at: iso(day(-1, 18)) },
      { id: uuid(), betrieb_id: B, name: 'Jonas Becker', email: 'jonas@example.com', telefon: '', beruf: 'Koch/Köchin', start: 'sofort', nachricht: 'Kochen ist meine Leidenschaft.', status: 'gespraech', notiz: 'Probearbeiten am Freitag', created_at: iso(day(-6, 12)) }
    ],
    schul_freigaben: [{ id: 'demo-sf1', betrieb_id: B, azubi_id: P.lena.id, token: 'demo', schule: 'Berufsbildende Schulen Warburg', lehrkraft: 'Frau Lehmann', email: 'lehmann@bbs.example', gueltig_bis: ymd(day(300)), widerrufen: false, created_at: iso(day(-30)), last_access: iso(day(-2, 10)) },
      { id: 'demo-sf2', betrieb_id: B, azubi_id: P.tom.id, token: 'demo-tom', schule: 'Berufsbildende Schulen Warburg', lehrkraft: 'Frau Lehmann', email: 'lehmann@bbs.example', gueltig_bis: ymd(day(300)), widerrufen: false, created_at: iso(day(-30)), last_access: iso(day(-2, 10)) },
      { id: 'demo-sf3', betrieb_id: B, azubi_id: P.aylin.id, token: 'demo-aylin', schule: 'Berufsbildende Schulen Warburg', lehrkraft: 'Frau Lehmann', email: 'lehmann@bbs.example', gueltig_bis: ymd(day(300)), widerrufen: false, created_at: iso(day(-30)), last_access: iso(day(-5, 10)) }],
    schul_eintraege: [{ id: uuid(), betrieb_id: B, azubi_id: P.lena.id, freigabe_id: 'demo-sf1', von: 'Frau Lehmann', typ: 'lob', datum: ymd(day(-9)), text: 'Sehr gute Präsentation zum Thema Gästekommunikation.', created_at: iso(day(-9, 14)) }, { id: uuid(), betrieb_id: B, azubi_id: P.tom.id, freigabe_id: 'demo-sf2', von: 'Frau Lehmann', typ: 'fehltag', datum: ymd(day(-3)), text: 'Unentschuldigt gefehlt.', created_at: iso(day(-3, 9)) }],
    messages_dummy: []
  };
  // Persönlicher Ausbildungsplan (Stationen)
  const st = (u, abteilung, a, b, notiz = '', author = P.fom.id) => ({ id: uuid(), betrieb_id: B, azubi_id: u, abteilung, von: ymd(day(a)), bis: ymd(day(b)), notiz, author_id: author, created_at: iso(day(-70)) });
  DB.plan_stationen = [
    st(P.lena.id, 'Housekeeping', -66, -38, 'Einstieg Etage'), st(P.lena.id, 'Rezeption', -37, 18, 'Ansprechperson: Julia Weber'), st(P.lena.id, 'Housekeeping', 19, 74, 'Etagenkontrolle mit der Hausdame'), st(P.lena.id, 'Service', 75, 158),
    st(P.tom.id, 'Küche', -430, -40, 'Posten Garde-manger und Saucier', P.koch.id), st(P.tom.id, 'Service', -39, -12, 'Einblick Restaurant', P.koch.id), st(P.tom.id, 'Küche', -11, 300, 'Posten Entremetier', P.koch.id),
    st(P.aylin.id, 'Rezeption', -790, -600), st(P.aylin.id, 'Housekeeping', -599, -520), st(P.aylin.id, 'Service', -519, -300), st(P.aylin.id, 'Küche', -299, -270), st(P.aylin.id, 'Rezeption', -269, -60), st(P.aylin.id, 'Service', -59, 220)];
  // Ausbildungsverträge, Dienstplan (diese und letzte Woche, mit typischen Verstößen bei Lena, unter 18), Feedback, Eltern-Zugang
  const av = (a, beginn, ende, verg, extra = {}) => ({ id: uuid(), betrieb_id: B, azubi_id: a.id, beginn, ende, probezeit_monate: 4, verguetung: verg, urlaubstage: 26, tage_pro_woche: 5, wochenstunden: 40, vertragsnr: 'OWL-' + (1000 + a.id.length * 37), ihk_eingetragen: beginn, checkliste: {}, updated_at: iso(day(-3)), ...extra });
  DB.ausbildungsvertraege = [
    av(P.lena, ymd(day(-66)), ymd(day(-66 + 3 * 365)), { 1: 1050, 2: 1150, 3: 1250 }, { urlaubstage: 25, zp_anmeldeschluss: ymd(day(40)) }),
    av(P.tom, ymd(day(-430)), ymd(day(-430 + 3 * 365)), { 1: 1050, 2: 1150, 3: 1250 }, { zp_anmeldeschluss: ymd(day(12)), checkliste: { formular: ymd(day(-2)), nachweis: ymd(day(-2)) } }),
    av(P.aylin, ymd(day(-790)), ymd(day(-790 + 3 * 365)), { 1: 1000, 2: 1100, 3: 1200 }, { ap_anmeldeschluss: ymd(day(75)) })];
  const mon = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
  const dd = n => { const d = new Date(mon); d.setDate(d.getDate() + n); return ymd(d); };
  const sh = (u, n, beginn, ende, pause_min = 30, abteilung = u.abteilung) => ({ id: uuid(), betrieb_id: B, user_id: u.id, datum: dd(n), beginn, ende, pause_min, abteilung, notiz: null, created_by: P.fom.id, created_at: iso(day(-8)) });
  DB.dienstplan = [];
  [-7, 0].forEach(o => {
    [0, 1, 3, 4].forEach(i => DB.dienstplan.push(sh(P.lena, o + i, '07:00', '16:00', 60)));
    [1, 2, 3, 4, 5].forEach(i => DB.dienstplan.push(sh(P.tom, o + i, '14:00', '22:30', 30)));
    [0, 1, 2, 4, 5].forEach(i => DB.dienstplan.push(sh(P.aylin, o + i, '11:00', '19:30')));
    [2, 3, 4, 5, 6].forEach(i => DB.dienstplan.push(sh(P.piotr, o + i, '16:00', '23:00', 30)));
  });
  // Diese Woche: Lena (unter 18) am Freitag Spätdienst bis 22:30 und am Samstag früh – Nachtruhe, Ruhezeit und 6. Tag
  DB.dienstplan = DB.dienstplan.filter(r => !(r.user_id === P.lena.id && r.datum === dd(4)));
  DB.dienstplan.push(sh(P.lena, 4, '14:00', '22:30', 60, 'Service'), sh(P.lena, 5, '07:00', '12:00', 30));
  DB.stationen_feedback = [];
  DB.eltern_freigaben = [{ id: uuid(), betrieb_id: B, azubi_id: P.lena.id, token: 'demo', name: 'Mama und Papa', gueltig_bis: ymd(day(300)), widerrufen: false, created_at: iso(day(-20)), last_access: iso(day(-2, 19)) }];
  DB.stimmung = [];
  // Ergebnisse der Prüfungssimulation (Lena: zwei Durchgänge mit Schwächen bei Rezeption und Gästekommunikation)
  DB.exam_results = [
    { id: uuid(), betrieb_id: B, user_id: P.lena.id, teil: 'teil1', punkte: 55, fragen: 20, richtig: 11, by_rp: { I5: [1, 3], H6: [0, 2], I1: [2, 2], H5: [1, 2], I2: [2, 2], '–': [5, 9] }, created_at: iso(day(-12, 18)) },
    { id: uuid(), betrieb_id: B, user_id: P.lena.id, teil: 'teil1', punkte: 65, fragen: 20, richtig: 13, by_rp: { I5: [1, 2], H6: [1, 2], I3: [1, 1], H7: [2, 2], '–': [8, 13] }, created_at: iso(day(-4, 19)) },
    { id: uuid(), betrieb_id: B, user_id: P.tom.id, teil: 'teil2', punkte: 45, fragen: 20, richtig: 9, by_rp: { K8: [0, 2], K3: [1, 2], I5: [2, 3], '–': [6, 13] }, created_at: iso(day(-6, 20)) }];
  // Verlauf der Berichte (in echt schreibt das ein Datenbank-Trigger)
  DB.report_log = [];
  const addLog = (r, aktion, user, at) => DB.report_log.push({ id: DB.report_log.length + 1, report_id: r.id, betrieb_id: B, azubi_id: r.user_id, user_id: user, aktion, at: at || iso(new Date()) });
  reports.forEach(r => {
    const sub = r.signed_at ? new Date(+new Date(r.signed_at) - 2 * 864e5) : new Date(r.updated_at);
    addLog(r, 'erstellt', r.user_id, iso(new Date(+sub - 3 * 864e5)));
    if (r.status === 'entwurf') return;
    addLog(r, 'eingereicht', r.user_id, iso(sub));
    if (r.status === 'zurueck') addLog(r, 'zurueckgegeben', P.koch.id, iso(new Date(+sub + 864e5)));
    if (r.status === 'abgezeichnet') addLog(r, 'abgezeichnet', r.signed_by, r.signed_at);
  });
  const lastMonday = day(-7);
  ['lena', 'tom', 'aylin', 'koch', 'fom', 'lei'].forEach(k => (P[k].role === 'azubi') && [8, 9, 10, 11, 12, 13, 14].forEach(g => DB.goal_progress.push({ user_id: P[k].id, goal_id: g, prozent: Math.min(100, ((g * 13 + k.length * 17) % 70) + (P[k].lehrjahr - 1) * 25), updated_at: iso(now) })));
  [19, 20, 21, 22, 23, 24, 25, 28, 29, 30].forEach(t => DB.onboarding_done.push({ user_id: P.lena.id, task_id: t }));

  async function loadContent() {
    let c = null;
    // Inhalte aus dem Netz holen (max. 6 s). Ohne Netz: letzte geladene Kopie aus diesem Browser, damit die Demo auch am Beamer ohne WLAN läuft.
    const KEY = 'azubihub-demo-content';
    try {
      const r = await Promise.race([window.__realSb.rpc('demo_content'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))]);
      if (r && r.data && r.data.rp) { c = r.data; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} }
    } catch {}
    if (!c) { try { c = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {} }
    c = c || {};
    DB.learning_goals = c.goals || []; DB.sops = c.sops || []; DB.checklists = c.checklists || []; DB.onboarding_tasks = c.tasks || []; DB.bot_faq = c.faq || [];
    DB.unterweisungen = (c.uw || []).map(u => ({ ...u, betrieb_id: B }));
    DB.rahmenplan = c.rp || [];
    DB.beurteilungen = [{ id: uuid(), betrieb_id: B, azubi_id: P.lena.id, abteilung: 'Rezeption', von: ymd(day(-110)), bis: ymd(day(-20)), kriterien: { 'Fachkenntnisse': 4, 'Arbeitsqualität': 4, 'Arbeitstempo': 3, 'Zuverlässigkeit & Pünktlichkeit': 5, 'Teamarbeit': 5, 'Umgang mit Gästen': 5, 'Selbstständigkeit': 3, 'Lernbereitschaft': 5, 'Auftreten & Erscheinungsbild': 4, 'Hygiene & Arbeitssicherheit': 4 }, staerken: 'Sehr herzlich im Gästekontakt, immer pünktlich, fragt nach, wenn etwas unklar ist.', ziele: 'Am Telefon sicherer werden, Check-ins in Stoßzeiten selbstständig übernehmen.', sichtbar: true, author_id: P.fom.id, created_at: iso(day(-19)), gelesen_at: null }];
    DB.rp_vermittelt = [];
    const rpN = n => DB.rahmenplan.find(r => r.nr === n);
    // Praxisaufgaben (Hotelfach) mit Stand bei Lena
    const pa = (titel, nr, lj, beschreibung) => ({ id: uuid(), betrieb_id: B, rp_id: rpN(nr)?.id || null, beruf: 'Hotelfachmann/-frau', titel, beschreibung, lehrjahr: lj, aktiv: true, created_by: P.fom.id, created_at: iso(day(-60)) });
    DB.praxisaufgaben = [pa('5 Gäste selbstständig einchecken', 'H6', 1, 'Meldeschein, Zimmerkarte, Frühstückszeiten erklären – Julia ist in Rufweite.'), pa('Telefonische Reservierung komplett aufnehmen', 'H5', 1, 'Mit Rückbestätigung per E-Mail.'),
      pa('Ein Zimmer nach Standard kontrollieren', 'H3', 1, 'Checkliste Zimmerkontrolle, Mängel ins Übergabebuch.'), pa('Frühstücksbuffet allein auffüllen und HACCP-Liste führen', 'H7', 1, ''), pa('Beschwerde eines Gastes lösen', 'H8', 2, 'Nach dem LAST-Prinzip, danach kurz mit Julia besprechen.')];
    DB.praxis_stand = [{ id: uuid(), betrieb_id: B, aufgabe_id: DB.praxisaufgaben[0].id, azubi_id: P.lena.id, status: 'bestaetigt', notiz: 'Am Dienstag 5 Anreisen allein.', gemeldet_at: iso(day(-12)), bestaetigt_von: P.fom.id, bestaetigt_at: iso(day(-11)) },
      { id: uuid(), betrieb_id: B, aufgabe_id: DB.praxisaufgaben[1].id, azubi_id: P.lena.id, status: 'gemeldet', notiz: 'Reservierung für Familie Braun, 3 Nächte.', gemeldet_at: iso(day(-1)) }];
    DB.lernkarten = []; DB.einladungen = [];
    if (rpN('I1')) DB.rp_vermittelt.push({ id: uuid(), betrieb_id: B, azubi_id: P.lena.id, rp_id: rpN('I1').id, datum: ymd(day(-66)), notiz: 'Einführungstag: Ausbildungsvertrag, Arbeitszeiten, Betriebsrat', von: P.lei.id, created_at: iso(day(-66)) });
    if (rpN('I2')) DB.rp_vermittelt.push({ id: uuid(), betrieb_id: B, azubi_id: P.lena.id, rp_id: rpN('I2').id, datum: ymd(day(-60)), notiz: 'Unterweisung Arbeits- und Brandschutz', von: P.fom.id, created_at: iso(day(-60)) });
    const h6 = rpN('H6'), h8 = rpN('H8');
    DB.reports.filter(r => r.user_id === P.lena.id).forEach((r, k) => (r.tage || []).forEach(d => (d.eintraege || []).forEach((e, j) => { if (d.bereich === 'Rezeption' && j === 0 && h6) e.rp = h6.id; if (d.bereich === 'Rezeption' && j === 1 && h8 && k % 2) e.rp = h8.id; })));
    // Berufsschule: Lernfelder, Schultage, Anwesenheit, Fehltage, Noten, Zeugnisse, Nachrichten
    DB.lernfelder = c.lf || [];
    const wday = (back, wd) => { const d = day(-7 * back, 8); const cur = (d.getDay() + 6) % 7; d.setDate(d.getDate() - cur + wd); return d; };
    const se = (az, f, typ, d, extra = {}) => DB.schul_eintraege.push({ id: uuid(), betrieb_id: B, azubi_id: az, freigabe_id: f, von: 'Frau Lehmann', typ, datum: ymd(d), text: '', created_at: iso(d), status: typ === 'fehltag' ? 'offen' : null, nachweis: null, ...extra });
    const sday = (az, d) => DB.absences.push({ id: uuid(), betrieb_id: B, user_id: az, typ: 'Berufsschule', von: ymd(d), bis: ymd(d), notiz: 'Stundenplan-Import', status: 'genehmigt', created_at: iso(day(-70)) });
    [2, 3, 6].forEach(b => sday(P.lena.id, wday(b, 2)));
    se(P.lena.id, 'demo-sf1', 'anwesend', wday(3, 2));
    se(P.lena.id, 'demo-sf1', 'fehltag', wday(6, 2), { text: 'Ohne Entschuldigung gefehlt.' });
    [1, 2, 4].forEach(b => { sday(P.tom.id, wday(b, 1)); se(P.tom.id, 'demo-sf2', 'anwesend', wday(b, 1)); });
    se(P.tom.id, 'demo-sf2', 'fehltag', wday(3, 1), { status: 'unentschuldigt', entschieden_von: P.koch.id, entschieden_at: iso(wday(3, 3)) });
    se(P.aylin.id, 'demo-sf3', 'fehltag', wday(5, 3), { status: 'entschuldigt', nachweis: 'demo-aylin/au.pdf', entschieden_von: P.fom.id, entschieden_at: iso(wday(5, 4)) });
    const lfs = (az, list) => list.forEach(([nr, status, note]) => DB.schul_lf_stand.push({ id: uuid(), betrieb_id: B, azubi_id: az, lf_nr: nr, status, note: note ?? null, seit: ymd(day(-20)), von: 'Frau Lehmann', updated_at: iso(day(-20)) }));
    DB.schul_lf_stand = [];
    lfs(P.lena.id, [[1, 'abgeschlossen', 2.0], [2, 'abgeschlossen'], [3, 'laeuft']]);
    lfs(P.tom.id, [[1, 'abgeschlossen'], [2, 'abgeschlossen'], [3, 'abgeschlossen', 2.3], [4, 'abgeschlossen'], [5, 'abgeschlossen'], [6, 'abgeschlossen', 3.0], [7, 'laeuft']]);
    lfs(P.aylin.id, [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [n, 'abgeschlossen']).concat([[10, 'laeuft']]));
    const nt = (az, note, d, art, extra = {}) => ({ id: uuid(), betrieb_id: B, azubi_id: az, note, datum: ymd(day(d)), art, quelle: 'schule', von: 'Frau Lehmann', freigabe_id: { [P.lena.id]: 'demo-sf1', [P.tom.id]: 'demo-sf2', [P.aylin.id]: 'demo-sf3' }[az], created_by: null, created_at: iso(day(d, 15)), ...extra });
    DB.schul_noten = [nt(P.lena.id, 2.0, -30, 'klassenarbeit', { lf_nr: 1, titel: 'Ausbildungsvertrag und Arbeitsschutz' }), nt(P.lena.id, 2.7, -12, 'test', { fach: 'Englisch', titel: 'Guest Communication', quelle: 'azubi', von: null, freigabe_id: null, created_by: P.lena.id }),
      nt(P.tom.id, 4.3, -8, 'klassenarbeit', { lf_nr: 7, titel: 'Garmethoden Fleisch' }), nt(P.tom.id, 3.0, -40, 'klassenarbeit', { lf_nr: 6, titel: 'Fonds und Saucen' }),
      nt(P.aylin.id, 1.7, -25, 'klassenarbeit', { lf_nr: 10, titel: 'Nachtaudit und Tagesabschluss' }), nt(P.aylin.id, 2.0, -60, 'zeugnis', { fach: 'Wirtschafts- und Sozialkunde' })];
    DB.schul_zeugnisse = [{ id: uuid(), betrieb_id: B, azubi_id: P.aylin.id, titel: 'Jahreszeugnis 2. Ausbildungsjahr', datum: ymd(day(-95)), datei: 'demo-aylin/zeugnis.pdf', created_by: P.aylin.id, kenntnis_von: P.fom.id, kenntnis_at: iso(day(-90)), created_at: iso(day(-95)) },
      { id: uuid(), betrieb_id: B, azubi_id: P.tom.id, titel: 'Halbjahreszeugnis 2. Ausbildungsjahr', datum: ymd(day(-10)), datei: 'demo-tom/zeugnis.pdf', created_by: P.tom.id, kenntnis_von: null, kenntnis_at: null, created_at: iso(day(-10)) }];
    DB.schul_nachrichten = [{ id: uuid(), betrieb_id: B, azubi_id: P.lena.id, freigabe_id: 'demo-sf1', richtung: 'schule', von: 'Frau Lehmann', text: 'Lena hat am Mittwoch gefehlt. Liegt Ihnen eine Krankmeldung vor?', created_at: iso(wday(6, 3)) },
      { id: uuid(), betrieb_id: B, azubi_id: P.tom.id, freigabe_id: 'demo-sf2', richtung: 'schule', von: 'Frau Lehmann', text: 'Tom hat in der Klassenarbeit LF 7 eine 4,3. Er sollte Garmethoden im Betrieb noch einmal üben.', created_at: iso(day(-7, 16)) },
      { id: uuid(), betrieb_id: B, azubi_id: P.tom.id, freigabe_id: 'demo-sf2', richtung: 'betrieb', user_id: P.koch.id, von: 'Marco Brandt', text: 'Danke! Tom übernimmt nächste Woche die Schmorgerichte am Mittag.', created_at: iso(day(-6, 9)) }];
    const w = isoWeek(new Date());
    DB.quiz_questions = (c.quiz || []).map((q, i) => i < 3 ? { ...q, jahr: w.jahr, kw: w.kw, nur_training: false } : q);
    const uw = DB.unterweisungen, s = n => sig(n);
    const conf = (p, idx, daysAgo) => uw[idx] && DB.unterweisung_bestaetigungen.push({ id: uuid(), unterweisung_id: uw[idx].id, user_id: p.id, name_text: p.full_name, titel_text: uw[idx].titel, unterschrift: s(p.full_name), bestaetigt_at: iso(day(-daysAgo)), betrieb_id: B });
    [0, 1, 2, 3, 4].forEach(i => { conf(P.lei, i, 30); conf(P.koch, i, 40); conf(P.fom, i, 50); conf(P.tom, i, 100); conf(P.piotr, i, 200); });
    conf(P.lena, 0, 60); conf(P.lena, 3, 60); conf(P.lena, 4, 60);
    [0, 1, 3, 4].forEach(i => conf(P.aylin, i, 120)); conf(P.aylin, 2, 400);
  }

  function makeQuery(table, me) {
    let op = 'select', payload = null, opts = {}, filters = [], orders = [], lim = null, single = false, maybe = false, selAfter = false, countOpt = null, head = false, off = 0;
    const rows = () => (DB[table] = DB[table] || []);
    const P = {
      select(cols, o = {}) { if (op === 'select') { countOpt = o.count || null; head = !!o.head; } else selAfter = true; return P; },
      eq(k, v) { filters.push(r => r[k] === v); return P; }, neq(k, v) { filters.push(r => r[k] !== v); return P; },
      in(k, vs) { filters.push(r => vs.includes(r[k])); return P; },
      lt(k, v) { filters.push(r => r[k] < v); return P; }, lte(k, v) { filters.push(r => r[k] <= v); return P; },
      gt(k, v) { filters.push(r => r[k] > v); return P; }, gte(k, v) { filters.push(r => r[k] >= v); return P; },
      is(k, v) { filters.push(r => (r[k] ?? null) === v); return P; },
      or(str) {
        const groups = [...str.matchAll(/and\(([^)]*)\)/g)].map(m => m[1].split(',').map(c => c.split('.')));
        filters.push(r => groups.some(g => g.every(([k, o, ...v]) => o === 'eq' && String(r[k]) === v.join('.'))));
        return P;
      },
      order(k, o = {}) { orders.push([k, o.ascending !== false]); return P; },
      limit(n) { lim = n; return P; }, range(a, b) { off = a; lim = b - a + 1; return P; },
      single() { single = true; return P; }, maybeSingle() { maybe = true; return P; },
      insert(p) { op = 'insert'; payload = p; return P; }, update(p) { op = 'update'; payload = p; return P; },
      upsert(p, o = {}) { op = 'upsert'; payload = p; opts = o; return P; }, delete() { op = 'delete'; return P; },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej); }
    };
    const defaults = () => ({ id: uuid(), created_at: iso(new Date()), betrieb_id: B,
      ...(table === 'eltern_freigaben' ? { azubi_id: me, token: uuid().replace(/-/g, '') + uuid().replace(/-/g, ''), gueltig_bis: ymd(day(365)), widerrufen: false } : {}),
      ...(['stimmung', 'stationen_feedback', 'reports', 'goal_progress', 'onboarding_done', 'checklist_checks', 'quiz_answers', 'photo_requests', 'unterweisung_bestaetigungen', 'ankuendigung_gelesen', 'chat_gelesen', 'push_subscriptions', 'exam_results'].includes(table) ? { user_id: me } : {}),
      ...(table === 'shift_notes' || table === 'ankuendigungen' || table === 'talks' || table === 'plan_stationen' ? { author_id: me } : {}),
      ...(table === 'open_items' || table === 'absences' || table === 'chat_gruppen' || table === 'schul_noten' || table === 'schul_zeugnisse' ? { created_by: me } : {}),
      ...(table === 'messages' ? { sender_id: me, read_at: null } : {}) });
    function fix(row) {
      if (table === 'absences' && !row.status) row.status = 'genehmigt';
      if (table === 'absences') { const prof = DB.profiles.find(p => p.id === me), boss = prof.role === 'admin' || (prof.rechte || []).includes('abwesenheiten'); if (!boss && row.typ === 'Urlaub') row.status = 'beantragt'; else if (!boss) row.status = 'genehmigt'; }
      if (table === 'unterweisung_bestaetigungen') { const p = DB.profiles.find(x => x.id === row.user_id), u = DB.unterweisungen.find(x => x.id === row.unterweisung_id); row.name_text = p?.full_name || ''; row.titel_text = u?.titel || ''; row.bestaetigt_at = iso(new Date()); }
      if (table === 'messages') setTimeout(() => window.__demoRt?.(row), 0);
      return row;
    }
    function keyOf(r, cols) { return cols.map(c => r[c]).join('|'); }
    function run() {
      let data;
      if (op === 'select') {
        data = rows().filter(r => filters.every(f => f(r)));
        const meP = DB.profiles.find(p => p.id === me);
        if (table === 'reports' && meP.role === 'ausbilder' && (meP.bereiche || []).length) data = data.filter(r => r.user_id === me || meP.bereiche.includes(r.abteilung) || (r.tage || []).some(d => meP.bereiche.includes(d.bereich)));
        if (table === 'reports' && meP.role === 'ausbilder' && !(meP.rechte || []).includes('berichte')) data = data.filter(r => r.user_id === me);
        orders.slice().reverse().forEach(([k, asc]) => data.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)));
        if (lim != null) data = data.slice(off || 0, (off || 0) + lim);
        data = data.map(r => ({ ...r }));
        if (head) return { data: null, count: data.length, error: null };
      } else if (op === 'insert') {
        const arr = (Array.isArray(payload) ? payload : [payload]).map(p => fix({ ...defaults(), ...p }));
        rows().push(...arr); data = arr;
        if (table === 'reports') arr.forEach(r => { addLog(r, 'erstellt', me); if (r.status === 'eingereicht') addLog(r, 'eingereicht', me); });
      } else if (op === 'update') {
        data = rows().filter(r => filters.every(f => f(r)));
        data.forEach(r => { const prev = table === 'reports' ? { ...r } : null; Object.assign(r, payload); if (prev) {
          if ('status' in payload && payload.status !== prev.status) addLog(r, { eingereicht: 'eingereicht', zurueck: 'zurueckgegeben', abgezeichnet: 'abgezeichnet', entwurf: 'wieder_geoeffnet' }[r.status], me);
          else if (JSON.stringify([prev.tage, prev.inhalt, prev.abteilung]) !== JSON.stringify([r.tage, r.inhalt, r.abteilung]) && (prev.status === 'abgezeichnet' || !DB.report_log.some(l => l.report_id === r.id && l.aktion === 'geaendert' && l.user_id === me && Date.now() - new Date(l.at) < 36e5))) addLog(r, 'geaendert', me);
        } if (table === 'absences' && 'status' in payload) { r.entschieden_von = me; r.entschieden_at = iso(new Date()); } });
      } else if (op === 'upsert') {
        const cols = (opts.onConflict || 'id').split(',');
        data = (Array.isArray(payload) ? payload : [payload]).map(p => {
          const row = { ...defaults(), ...p }, ex = rows().find(r => keyOf(r, cols) === keyOf(row, cols));
          if (ex) { if (!opts.ignoreDuplicates) Object.assign(ex, p); return ex; }
          rows().push(fix(row)); return row;
        });
      } else if (op === 'delete') {
        const keep = rows().filter(r => !filters.every(f => f(r))); data = rows().filter(r => filters.every(f => f(r))); DB[table] = keep;
        if (table === 'reports') data.forEach(r => addLog(r, 'geloescht', me));
      }
      if (single || maybe) data = (data || [])[0] || null;
      if (single && !data) return { data: null, error: { message: 'Nicht gefunden' } };
      return { data, error: null, count: countOpt ? (data || []).length : null };
    }
    return P;
  }

  window.makeDemoClient = function (role) {
    const meId = ({ azubi: P.lena.id, ausbilder: P.koch.id, leitung: P.lei.id, mitarbeiter: P.piotr.id })[role] || P.lena.id;
    const me = () => DB.profiles.find(p => p.id === meId);
    const RPC = {
      bewerbung_dateien: () => [{ bewerbung_id: 'demo-bew-mia', pfad: 'demo-bew-mia/1700000000000_Lebenslauf_Mia_Hoffmann.pdf', groesse: 284000 }, { bewerbung_id: 'demo-bew-mia', pfad: 'demo-bew-mia/1700000000001_Zeugnis.docx', groesse: 51000 }],
      my_betrieb_status: () => ({ id: B, name: 'Hotel Seeblick', aktiv: true, plattform: false, status: 'aktiv', slug: 'hotel-seeblick-demo', gruppen_leitung: false }),
      my_chats2: () => {
        const out = [], mine = DB.messages.filter(m => !m.gruppe_id && (m.sender_id === meId || m.recipient_id === meId));
        const partners = [...new Set(mine.map(m => m.sender_id === meId ? m.recipient_id : m.sender_id))];
        partners.forEach(pt => { const ms = mine.filter(m => m.sender_id === pt || m.recipient_id === pt).sort((a, b) => b.created_at.localeCompare(a.created_at)); const l = ms[0];
          out.push({ partner: pt, gruppe: null, name: null, last_body: l.body, last_at: l.created_at, last_from_me: l.sender_id === meId, last_sender: l.sender_id, unread: ms.filter(m => m.recipient_id === meId && !m.read_at).length }); });
        const p = me();
        DB.chat_gruppen.filter(g => p.role === 'admin' || g.regel === 'alle' || (g.regel === 'azubis' && p.role === 'azubi') || (g.regel === 'team' && ['ausbilder', 'admin'].includes(p.role)) || (g.regel === 'abteilung' && p.abteilung === g.abteilung) || DB.chat_mitglieder.some(x => x.gruppe_id === g.id && x.user_id === meId)).forEach(g => {
          const ms = DB.messages.filter(m => m.gruppe_id === g.id).sort((a, b) => b.created_at.localeCompare(a.created_at)), l = ms[0];
          const lr = DB.chat_gelesen.find(r => r.gruppe_id === g.id && r.user_id === meId)?.last_read_at || '';
          out.push({ partner: null, gruppe: g.id, name: g.name, last_body: l?.body || null, last_at: l?.created_at || g.created_at, last_from_me: l?.sender_id === meId, last_sender: l?.sender_id, unread: ms.filter(m => m.sender_id !== meId && m.created_at > lr).length });
        });
        return out;
      },
      mark_read: a => { DB.messages.forEach(m => { if (m.recipient_id === meId && m.sender_id === a.partner && !m.read_at) m.read_at = iso(new Date()); }); return null; },
      mark_group_read: a => { const r = DB.chat_gelesen.find(x => x.gruppe_id === a.g && x.user_id === meId); if (r) r.last_read_at = iso(new Date()); else DB.chat_gelesen.push({ gruppe_id: a.g, user_id: meId, last_read_at: iso(new Date()) }); return null; },
      my_quiz_results: a => DB.quiz_answers.filter(x => x.user_id === meId && a.p_ids.includes(x.question_id)).map(x => ({ question_id: x.question_id, wahl: x.wahl, richtig: DB.quiz_questions.find(q => q.id === x.question_id)?.richtig, erklaerung: DB.quiz_questions.find(q => q.id === x.question_id)?.erklaerung })),
      answer_quiz: a => { const q = DB.quiz_questions.find(x => x.id === a.p_question); DB.quiz_answers.push({ user_id: meId, question_id: a.p_question, wahl: a.p_choice, korrekt: q?.richtig === a.p_choice }); return { wahl: a.p_choice, richtig: q?.richtig, erklaerung: q?.erklaerung, korrekt: q?.richtig === a.p_choice }; },
      practice_questions: a => DB.quiz_questions.filter(q => q.nur_training).slice(0, a.p_limit || 10),
      exam_questions2: a => { const me = DB.profiles.find(p => p.id === meId), ok = q => !q.berufe?.length || q.berufe.includes(me?.beruf);
        const lj = q => { const r = DB.rahmenplan.filter(x => x.nr === q.rp_nr && (x.beruf === me?.beruf || x.beruf === 'alle')).map(x => x.lehrjahr || 1); return r.length ? Math.min(...r) : (q.lehrjahr || 1); };
        const pool = DB.quiz_questions.filter(q => ok(q) && (!a.p_nrs || a.p_nrs.includes(q.rp_nr)) && (a.p_max_lj == null || lj(q) <= a.p_max_lj)), mix = l => l.slice().sort(() => Math.random() - .5);
        return [...mix(pool.filter(q => q.rp_nr)), ...mix(pool.filter(q => !q.rp_nr))].slice(0, Math.min(a.p_limit || 20, 40)).map(q => ({ id: q.id, frage: q.frage, optionen: q.optionen, richtig: q.richtig, erklaerung: q.erklaerung, rp_nr: q.rp_nr || null })); },
      exam_questions: a => { const me = DB.profiles.find(p => p.id === meId), ok = q => !q.berufe?.length || q.berufe.includes(me?.beruf); const pool = DB.quiz_questions.filter(ok), tag = pool.filter(q => q.rp_nr), rest = pool.filter(q => !q.rp_nr), mix = l => l.slice().sort(() => Math.random() - .5); return [...mix(tag), ...mix(rest)].slice(0, a.p_limit || 20).sort(() => Math.random() - .5).map(q => ({ id: q.id, frage: q.frage, optionen: q.optionen, richtig: q.richtig, erklaerung: q.erklaerung, rp_nr: q.rp_nr || null })); },
      schule_view: a => {
        const f = DB.schul_freigaben.find(x => x.token === a.p_token && !x.widerrufen); if (!f) return null;
        const az = DB.profiles.find(x => x.id === f.azubi_id), be = DB.profiles.find(x => x.id === az.betreuer_id), bt = DB.betriebe.find(x => x.id === f.betrieb_id);
        f.last_access = iso(new Date());
        return {
          azubi: { name: az.full_name, beruf: az.beruf, lehrjahr: az.lehrjahr, abteilung: az.abteilung, start: az.start_datum, zp: az.zp_datum, ap: az.ap_datum || null },
          betrieb: bt?.name || 'Hotel Seeblick', schule: f.schule, lehrkraft: f.lehrkraft, gueltig_bis: f.gueltig_bis,
          ausbilder: be ? { name: be.full_name, position: be.position, email: be.kontakt_email, telefon: be.telefon } : null,
          berichte: DB.reports.filter(r => r.user_id === az.id && ['eingereicht', 'abgezeichnet'].includes(r.status)).sort((x, y) => y.jahr - x.jahr || y.kw - x.kw).map(r => ({ jahr: r.jahr, kw: r.kw, abteilung: r.abteilung, status: r.status, tage: r.tage, inhalt: r.inhalt, signed_at: r.signed_at })),
          abwesenheiten: DB.absences.filter(x => x.user_id === az.id && x.status === 'genehmigt' && ['Berufsschule', 'Krank', 'Urlaub'].includes(x.typ)).sort((x, y) => y.von.localeCompare(x.von)).map(x => ({ typ: x.typ, von: x.von, bis: x.bis })),
          eintraege: DB.schul_eintraege.filter(e => e.azubi_id === az.id && e.freigabe_id === f.id).sort((x, y) => y.datum.localeCompare(x.datum) || y.created_at.localeCompare(x.created_at)).map(e => ({ id: e.id, typ: e.typ, datum: e.datum, text: e.text, von: e.von, created_at: e.created_at, status: e.status || null, nachweis: !!e.nachweis })),
          noten: (DB.schul_noten || []).filter(n => n.azubi_id === az.id && n.quelle === 'schule' && n.freigabe_id === f.id).sort((x, y) => y.datum.localeCompare(x.datum)).map(n => ({ id: n.id, lf_nr: n.lf_nr || null, fach: n.fach || null, art: n.art, titel: n.titel || null, datum: n.datum, note: n.note, quelle: n.quelle })),
          lernfelder: (DB.lernfelder || []).filter(l => l.beruf === az.beruf).sort((x, y) => x.nr - y.nr).map(l => ({ nr: l.nr, titel: l.titel, lehrjahr: l.lehrjahr, stunden: l.stunden })),
          lf_stand: (DB.schul_lf_stand || []).filter(s => s.azubi_id === az.id).map(s => ({ lf_nr: s.lf_nr, status: s.status, seit: s.seit, note: s.note })),
          nachrichten: (DB.schul_nachrichten || []).filter(m => m.azubi_id === az.id && (!m.freigabe_id || m.freigabe_id === f.id)).sort((x, y) => x.created_at.localeCompare(y.created_at)).map(m => ({ richtung: m.richtung, von: m.von, text: m.text, created_at: m.created_at }))
        };
      },
      schule_add: a => { const f = DB.schul_freigaben.find(x => x.token === a.p_token); if (!f) return null;
        if (['anwesend', 'fehltag'].includes(a.p_typ)) DB.schul_eintraege = DB.schul_eintraege.filter(e => !(e.freigabe_id === f.id && e.datum === a.p_datum && ['anwesend', 'fehltag'].includes(e.typ) && !e.nachweis && e.status !== 'entschuldigt'));
        DB.schul_eintraege.push({ id: uuid(), betrieb_id: B, azubi_id: f.azubi_id, freigabe_id: f.id, von: a.p_von || f.lehrkraft, typ: a.p_typ, datum: a.p_datum, text: a.p_text, created_at: iso(new Date()), status: a.p_typ === 'fehltag' ? 'offen' : null, nachweis: null }); return true; },
      schule_note_add: a => { const f = DB.schul_freigaben.find(x => x.token === a.p_token); if (!f) return null; DB.schul_noten.push({ id: uuid(), betrieb_id: B, azubi_id: f.azubi_id, lf_nr: a.p_lf, fach: a.p_fach || null, art: a.p_art, titel: a.p_titel || null, datum: a.p_datum, note: a.p_note, quelle: 'schule', von: a.p_von || f.lehrkraft, freigabe_id: f.id, created_by: null, created_at: iso(new Date()) }); return true; },
      schule_note_del: a => { const f = DB.schul_freigaben.find(x => x.token === a.p_token); DB.schul_noten = DB.schul_noten.filter(n => !(n.id === a.p_id && n.freigabe_id === f?.id)); return true; },
      schule_lf_set: a => { const f = DB.schul_freigaben.find(x => x.token === a.p_token); if (!f) return null; const ex = DB.schul_lf_stand.find(s => s.azubi_id === f.azubi_id && s.lf_nr === a.p_lf);
        if (!a.p_status) { DB.schul_lf_stand = DB.schul_lf_stand.filter(s => s !== ex); return true; }
        if (ex) Object.assign(ex, { status: a.p_status, von: a.p_von || f.lehrkraft, updated_at: iso(new Date()) }); else DB.schul_lf_stand.push({ id: uuid(), betrieb_id: B, azubi_id: f.azubi_id, lf_nr: a.p_lf, status: a.p_status, note: a.p_note, von: a.p_von || f.lehrkraft, seit: ymd(new Date()), updated_at: iso(new Date()) }); return true; },
      schule_msg: a => { const f = DB.schul_freigaben.find(x => x.token === a.p_token); if (!f) return null; DB.schul_nachrichten.push({ id: uuid(), betrieb_id: B, azubi_id: f.azubi_id, freigabe_id: f.id, richtung: 'schule', von: a.p_von || f.lehrkraft, text: a.p_text, created_at: iso(new Date()) }); return true; },
      ihk_mein: () => ({ ihknr: 108, name: 'Industrie- und Handelskammer Ostwestfalen zu Bielefeld', kurz: 'Bielefeld', street: 'Elsa-Brändström-Straße 1-3', zip: '33602', city: 'Bielefeld', land: 'Nordrhein-Westfalen', phone: '+49 521 554-0', email: 'info@ostwestfalen.ihk.de', homepage: 'https://www.ostwestfalen.ihk.de', quelle: 'Berufsbildende Schulen Warburg' }),
      stimmung_offen: () => me().role === 'azubi' && !DB.stimmung.some(x => x.user_id === meId),
      stimmung_auswertung: () => { const m = k => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k); return ymd(d); }; const own = DB.stimmung.length ? DB.stimmung[0].wert : null;
        return [[0, 4.0, 3], [1, 3.7, 3], [2, 3.3, 3], [3, 3.8, 3], [4, 4.2, 3]].map(([k, v, n]) => ({ monat: m(k), schnitt: k === 0 && own ? Math.round((v * n + own) / (n + 1) * 10) / 10 : v, anzahl: k === 0 && own ? n + 1 : n })); },
      feedback_auswertung: () => [
        { abteilung: 'Küche', anzahl: 4, anleitung: 4.5, aufgaben: 4.3, team: 4.8, kommentare: ['Marco erklärt super, auch wenn viel los ist.', 'Mehr Zeit am Saucenposten wäre gut.'] },
        { abteilung: 'Housekeeping', anzahl: 3, anleitung: 3.0, aufgaben: 2.7, team: 3.7, kommentare: ['Oft nur Betten machen, wenig Neues gelernt.'] },
        { abteilung: 'Rezeption', anzahl: 5, anleitung: 4.2, aufgaben: 4.6, team: 4.4, kommentare: [] },
        ...(DB.stationen_feedback || []).map(f => ({ abteilung: f.abteilung + ' (deins, neu)', anzahl: 1, anleitung: f.anleitung, aufgaben: f.aufgaben, team: f.team, kommentare: f.kommentar ? [f.kommentar] : [] }))],
      exam_questions_lf: a => { const me = DB.profiles.find(p => p.id === meId), ok = q => !q.berufe?.length || q.berufe.includes(me?.beruf), keys = (a.p_keys || []).map(k => k.toLowerCase());
        return DB.quiz_questions.filter(q => ok(q) && ((a.p_nrs || []).includes(q.rp_nr) || keys.some(k => (q.frage + ' ' + (q.erklaerung || '')).toLowerCase().includes(k)))).sort(() => Math.random() - .5).slice(0, a.p_limit || 10)
          .map(q => ({ id: q.id, frage: q.frage, optionen: q.optionen, richtig: q.richtig, erklaerung: q.erklaerung, rp_nr: q.rp_nr || null })); },
      eltern_view: a => {
        const f = DB.eltern_freigaben.find(x => x.token === a.p_token && !x.widerrufen); if (!f) return null;
        const az = DB.profiles.find(x => x.id === f.azubi_id), be = DB.profiles.find(x => x.id === az.betreuer_id), v = DB.ausbildungsvertraege.find(x => x.azubi_id === az.id);
        f.last_access = iso(new Date());
        return { azubi: { name: az.full_name, beruf: az.beruf, lehrjahr: az.lehrjahr, start: az.start_datum, zp: az.zp_datum || null, ap: az.ap_datum || null }, betrieb: 'Hotel Seeblick',
          ausbilder: be ? { name: be.full_name, position: be.position, email: be.kontakt_email, telefon: be.telefon } : null,
          vertrag: v ? { beginn: v.beginn, ende: v.ende, probezeit_monate: v.probezeit_monate } : null,
          berichte: { abgezeichnet: DB.reports.filter(r => r.user_id === az.id && r.status === 'abgezeichnet').length, eingereicht: DB.reports.filter(r => r.user_id === az.id && r.status === 'eingereicht').length },
          fehltage: DB.schul_eintraege.filter(e => e.azubi_id === az.id && e.typ === 'fehltag').sort((x, y) => y.datum.localeCompare(x.datum)).map(e => ({ datum: e.datum, status: e.status || 'offen' })), gueltig_bis: f.gueltig_bis };
      },
      ihk_info: () => RPC.ihk_mein(), ihk_suche: () => [RPC.ihk_mein()],
      schul_nachweis: a => { const e = DB.schul_eintraege.find(x => x.id === a.p_id); if (e) e.nachweis = a.p_path; return true; },
      beurteilung_bestaetigen: a => { const b = DB.beurteilungen.find(x => x.id === a.p_id); if (b) Object.assign(b, { gelesen_at: b.gelesen_at || iso(new Date()), bestaetigt_at: iso(new Date()), azubi_kommentar: a.p_kommentar || null, selbst: a.p_selbst }); return null; },
      gruppe_vergleich: () => [
        { id: B, name: 'Hotel Seeblick', ich_hier: true, azubis: 3, offen: 2, berichte_30: 11, fehltage_90: 3, unentschuldigt_90: 1, noten_schnitt: 2.8, stimmung: 3.9, feedback: 4.1, schichten: 62 },
        { id: 'demo-h2', name: 'Seeblick Stadthotel', ich_hier: false, azubis: 5, offen: 7, berichte_30: 14, fehltage_90: 11, unentschuldigt_90: 4, noten_schnitt: 3.4, stimmung: 3.1, feedback: 3.3, schichten: 95 },
        { id: 'demo-h3', name: 'Seeblick Resort & Spa', ich_hier: false, azubis: 4, offen: 1, berichte_30: 16, fehltage_90: 2, unentschuldigt_90: 0, noten_schnitt: 2.4, stimmung: 4.3, feedback: 4.4, schichten: 80 }],
      public_siegel: () => ({ name: 'Hotel Seeblick', slug: 'hotel-seeblick-demo', azubis: 3, feedback: { anzahl: 12, anleitung: 4.3, aufgaben: 4.1, team: 4.6 }, stimmung: 4.0, abzeichnung_7_tage: 92, seit: 2024, karriere: true, branding: {} }),
      beurteilung_gelesen: a => { const b = DB.beurteilungen.find(x => x.id === a.p_id); if (b) b.gelesen_at = iso(new Date()); return null; },
      admin_users: () => DB.profiles.map(p => ({ id: p.id, email: p.full_name.split(' ')[0].toLowerCase() + '@seeblick.example', last_sign_in_at: iso(day(-1)), created_at: p.created_at })),
      get_invite_code: () => 'SEEB-DEMO', admin_quiz: () => DB.quiz_questions,
      admin_set_password: () => null, admin_set_active: a => { const p = DB.profiles.find(x => x.id === a.p_user); if (p) p.aktiv = a.p_active; return null; },
      admin_photo_decide: () => null, clear_profile_photo: () => null, redeem_code: () => null,
      gruppe_overview: () => [], transfer_user: () => null, switch_betrieb: () => null
    };
    const client = {
      from: t => makeQuery(t, meId),
      rpc: (n, a = {}) => Promise.resolve().then(() => n in RPC ? { data: RPC[n](a), error: null } : { data: null, error: { message: 'In der Demo nicht verfügbar' } }),
      channel: () => { const c = { on() { return c; }, subscribe() { return c; } }; return c; },
      removeChannel() {},
      storage: { from: () => ({ upload: async p => ({ data: { path: p }, error: null }), remove: async () => ({ error: null }), createSignedUrls: async () => ({ data: [], error: null }), createSignedUrl: async () => ({ data: null, error: { message: 'In der Demo nicht verfügbar' } }) }) },
      auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: {} }), signOut: async () => { location.href = location.pathname; return {}; }, updateUser: async () => ({ data: {}, error: null }), resetPasswordForEmail: async () => ({ error: null }) }
    };
    client.ready = loadContent();
    client.userId = meId;
    return client;
  };
})();
