# Lunyad / Live Map Wall

Desktop-Dashboard mit mehreren Karten nebeneinander – gedacht für **Strava Beacon**-Live-Links, funktioniert aber mit beliebigen **HTTPS-URLs**, die du in die Felder einträgst.

## Voraussetzungen

- [Node.js](https://nodejs.org) (LTS empfohlen), inklusive `npm`

## Installation

Im Projektordner:

```bash
npm install
```

Unter Windows kannst du alternativ **`start.bat`** doppelklicken: Die Datei prüft Node.js, installiert bei Bedarf Abhängigkeiten und startet die App.

## Start

```bash
npm start
```

Die Anwendung basiert auf [Electron](https://www.electronjs.org/).

## Ordnerstruktur zum Starten

```
Lunyad/
├─ Lunyad.lnk        <- Startsymbol (Doppelklick startet die App)
└─ app/              <- alle Programmdateien (hier liegt dieses README)
   ├─ start.bat, main.js, renderer.js, ...
   ├─ assets/  (icon.ico/.png)
   └─ build/   (Icon-Generator, Verknuepfungs-Skript)
```

Oben liegt also nur das **Startsymbol**, alles Uebrige steckt im Ordner `app/`.

## Per Icon starten

Es gibt ein App-Icon (`assets/icon.ico`, erzeugt mit `npm run icon`).

- **Schnell, ohne Build:** `build/Verknuepfung-erstellen.bat` doppelklicken (oder `build/make-shortcut.ps1` mit PowerShell ausführen). Das legt das **Lunyad-Startsymbol** im übergeordneten Ordner (neben `app/`) **und auf dem Desktop** an – ein Doppelklick startet die App (über `start.bat`).
- **Richtige Installation / portable EXE:** mit [electron-builder](https://www.electron.build/) packen:

  ```bash
  npm install      # installiert auch electron-builder
  npm run dist     # erzeugt Installer (NSIS) + portable EXE im Ordner dist/
  ```

  Der Installer legt automatisch Start­menü- und Desktop-Verknüpfungen mit Icon an. `npm run pack` erstellt nur den entpackten App-Ordner (zum Testen).

## Bedienung

1. **Anzahl Felder** (1–8) wählen und **Felder aktualisieren**.
2. Pro Feld den **Haupt-Link** eintragen (mit oder ohne `https://` – fehlendes Schema wird ergänzt).
3. **Strava Beacon** (`strava.com` und `beacon` in der Adresse): eigenes **Live-Panel** mit **Backyard-Runden** (aktuell **0,5 km** zum Testen in `renderer.js` → `ROUND_DISTANCE_KM`; Produktion: 5,9): Fortschrittsbalken und **Runde 1, 2, …** – die Runde zählt hoch, wenn die Rundenlänge erreicht ist und die Aktivität **pausiert** und danach **wieder gestartet** wird.
4. **Backyard-Modus**: vor dem Live Mode die **Startzeit der ersten Runde** (HH:MM), die **Rundenzeit (Min)** (Standard 60) und die **Rundenstrecke (km)** eintragen und **Werte übernehmen** klicken (startet/scharft den Timer; **Backyard: An/Aus** blendet den Modus um, **Reset** setzt Runden auf 0 und stoppt den Timer). Jedes Läufer-Panel zeigt oben rechts ein kleines **Rundenzeit-Diagramm** (Y = Zeit, X = Runde, ≥ 15 Runden). Der Haupt-Countdown **friert ein, sobald alle ausgeschieden sind**. Die Runde springt **zur eingestellten Zeit** um; ab dann läuft pro Person eine **echte Sekundenuhr** (unabhängig von Strava – ein Strava-Stopp pausiert sie **nicht**), die erst **einfriert, wenn das Rundenziel erreicht ist**. Pace = diese Rundenzeit / Rundenstrecke. Wer das Ziel bis zum Ablauf der Rundenzeit **nicht** erreicht, ist **ausgeschieden** – das Panel zeigt dann über der Karte mittig **Profilbild, Name, „Ausgeschieden"** und die Stats (geschaffte Runden, Strecke der letzten Runde, Ausscheide-Runde). Es erscheint unten ein **Info-Streifen für alle**:
   - linke Hälfte ein **Fortschrittsbalken** (ganz links 0 m, ganz rechts die konfigurierte Rundenlänge `ROUND_DISTANCE_KM`) mit den **Profilbildern** aller Läufer an ihrer aktuellen Position,
   - ein **Countdown**, wie lange noch, bis alle wieder am Start stehen müssen (zur vollen Rundenzeit),
   - die Liste **wer noch dabei ist** (wer das Rundenziel nicht rechtzeitig erreicht, wird ausgegraut),
   - unten rechts die **aktuelle Ortszeit**.
5. **Live Mode** blendet die Steuerleiste aus und schaltet **Vollbild** für Präsentationen oder einen zweiten Monitor.
6. **Hellmodus** schaltet die helle Oberfläche um; die Wahl wird lokal gespeichert.
7. **Escape** beendet zuerst den Fokus eines Pane-Vollbilds, danach den Live Mode – danach sind die Links wieder editierbar.

Hinweis: Einige Webseiten blockieren das Einbetten in fremde Apps; ob Strava-Beacon-Seiten in einem `<webview>` laden, hängt von der jeweiligen Seite und von Strava ab.

## Projektstruktur (Kurzüberblick)

| Datei        | Rolle                          |
| ------------ | ------------------------------ |
| `main.js`    | Electron-Hauptprozess, Fenster |
| `preload.js` | Sichere Brücke zum Renderer    |
| `index.html` | Oberfläche                     |
| `renderer.js`| Logik für Raster, URLs, Modi   |
| `styles.css` | Darstellung                    |
| `start.bat`  | Windows-Schnellstart           |

## Lizenz

Siehe `package.json` (`license`).
