# AzubiHub als App (Play Store / App Store)

Diese Hülle (Capacitor) lädt die bestehende Web-App von https://azubihub-app.de.
Alles, was online geändert wird, ist sofort auch in der App – kein neues Store-Update nötig.

## Android (Windows, PowerShell)

Voraussetzung: Node.js und Android Studio sind installiert.

```powershell
cd C:\Users\PC\Desktop\azubihub-app\native
npm install
npx cap add android
npx cap sync
npx cap open android
```

In Android Studio: **Build › Generate Signed App Bundle** (.aab) – das lädst du in der Google Play Console hoch.
Den Signatur-Schlüssel (keystore) gut sichern: Ohne ihn gibt es keine Updates mehr.

## iOS

Braucht einen Mac mit Xcode und ein Apple-Developer-Konto (99 USD/Jahr).

```bash
cd native && npm install && npx cap add ios && npx cap sync && npx cap open ios
```

## Wichtig vor der Einreichung

- **Apple prüft reine Web-Hüllen streng** (Richtlinie 4.2 „Minimum Functionality“). Gute Chancen gibt es, wenn
  native Funktionen dazukommen: Push über APNs (Plugin `@capacitor/push-notifications`), Kamera für Fotos im Wochenbericht,
  Offline-Hinweis. Push auf dem iPhone läuft bis dahin über die Web-App („Zum Home-Bildschirm“).
- **Datenschutz-Angaben** in beiden Stores ausfüllen (Kontaktdaten, Nutzerinhalte, Fotos, Diagnosedaten: nein).
- **Test-Zugang** für die Prüfer anlegen (Demo-Betrieb), sonst wird abgelehnt.
- Icons: `npx @capacitor/assets generate --iconBackgroundColor '#0f5c5f'` mit einer 1024×1024-Grafik in `native/assets/icon.png`.
