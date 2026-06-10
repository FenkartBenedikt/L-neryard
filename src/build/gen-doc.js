"use strict";

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, TableOfContents, PageBreak, ImageRun, Footer, PageNumber
} = require("docx");

const ACCENT = "FC5200";
const DARK = "1A1D26";
const GREY = "5C6370";
const appRoot = path.join(__dirname, "..");
const iconPath = path.join(appRoot, "assets", "icon.png");

// ---------- Hilfsfunktionen ----------
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, ...opts })]
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 40 },
    children: [new TextRun(text)]
  });
}
function bulletBold(label, rest) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text: label, bold: true }), new TextRun(rest)]
  });
}

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 70, bottom: 70, left: 120, right: 120 };

function cell(text, width, { bold = false, fill = null, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, bold })] })]
  });
}

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const headRow = new TableRow({
    tableHeader: true,
    children: headers.map((t, i) => cell(t, widths[i], { bold: true, fill: "FCE3D6" }))
  });
  const bodyRows = rows.map(
    (r) => new TableRow({ children: r.map((t, i) => cell(String(t), widths[i])) })
  );
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headRow, ...bodyRows]
  });
}

// ---------- Titelseite ----------
const titleChildren = [];
if (fs.existsSync(iconPath)) {
  titleChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1400, after: 200 },
      children: [
        new ImageRun({
          type: "png",
          data: fs.readFileSync(iconPath),
          transformation: { width: 130, height: 130 },
          altText: { title: "Lunyad Logo", description: "App-Icon", name: "Logo" }
        })
      ]
    })
  );
}
titleChildren.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "Lunyad", bold: true, size: 60, color: ACCENT })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Backyard-Ultra Live-Dashboard", bold: true, size: 32 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: "FSST – Projektdokumentation", size: 26, color: GREY })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: "Name: ______________________________", size: 24 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: "Klasse: 3. Klasse HTL", size: 24 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Datum: ____________", size: 24 })]
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// ---------- Inhaltsverzeichnis ----------
const tocChildren = [
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Inhaltsverzeichnis", bold: true, size: 30 })] }),
  new TableOfContents("Inhalt", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] })
];

// ---------- 1. Grundkonzept ----------
const sec1 = [
  h1("1. Beschreibung – Grundkonzept & Idee"),
  h2("Was ist ein Backyard Ultra?"),
  p("Ein Backyard Ultra ist ein besonderer Laufwettkampf. Zu jeder vollen Stunde starten alle Läufer gemeinsam an der Startlinie. In dieser Stunde muss jeder eine feste Strecke (eine „Runde“ bzw. ein „Yard“) schaffen. Wer die Strecke nicht rechtzeitig schafft oder nicht pünktlich zur nächsten vollen Stunde wieder am Start steht, scheidet aus. Das geht so lange, bis nur noch eine Person übrig ist – diese gewinnt."),
  h2("Das Problem"),
  p("Bei so einem Rennen will das Publikum live sehen, wer schon im Ziel ist, wer noch läuft und wer ausgeschieden ist. Strava Beacon zeigt zwar die Live-Position und die Distanz jedes Läufers, rechnet aber nicht aus, ob jemand seine Runde rechtzeitig geschafft hat. Außerdem muss man dafür viele Handys/Links einzeln im Auge behalten."),
  h2("Die Idee"),
  p("Lunyad ist eine Desktop-App (für Beamer oder einen zweiten Monitor), die mehrere Strava-Beacon-Livekarten gleichzeitig nebeneinander anzeigt. Die App liest aus jeder Karte die wichtigen Werte (Name, Profilbild, Distanz, Zeit) aus und wertet sie automatisch im Sinne des Backyard-Reglements aus: Sie zählt die Runden, misst die Zeit, berechnet die Pace und markiert ausgeschiedene Läufer. Unten am Bildschirm gibt es einen Info-Streifen für alle Zuschauer."),
  bulletBold("Ziel: ", "Ein übersichtliches, automatisches Live-Dashboard für ein Backyard-Ultra-Rennen."),
  bulletBold("Zielgruppe: ", "Veranstalter und Zuschauer eines Backyard-Laufs."),
  bulletBold("Plattform: ", "Windows-Desktop (Electron-App).")
];

// ---------- 2. Features ----------
const sec2 = [
  h1("2. Feature-Dokumentation"),
  h2("Anzeige & Karten"),
  bullet("1 bis 8 Felder nebeneinander, automatisch als Raster angeordnet."),
  bullet("Pro Feld ein beliebiger HTTPS-Link oder ein Strava-Beacon-Link."),
  bullet("Für Strava-Beacon gibt es ein eigenes Live-Panel mit Profilbild, Name, Distanz, aktiver Zeit, Akku und der Livekarte."),
  bullet("Live Mode: blendet die Bedienleiste aus und schaltet in den Vollbildmodus. Mit Escape wieder zurück."),
  bullet("Hellmodus (heller/dunkler Stil), wird lokal gespeichert."),
  h2("Backyard-Funktionen"),
  bulletBold("Konfiguration vor dem Start: ", "Startzeit der ersten Runde, Rundenzeit in Minuten (Standard 60) und Rundenstrecke in km."),
  bulletBold("Werte übernehmen: ", "startet bzw. „schärft“ den Timer mit den eingegebenen Werten."),
  bulletBold("Backyard An/Aus: ", "blendet den Modus und den Info-Streifen ein oder aus."),
  bulletBold("Reset: ", "setzt die Runden auf 0 und stoppt den Timer (kein Countdown läuft)."),
  bulletBold("Timer-gesteuerte Runden: ", "die Runde springt automatisch um, sobald die eingestellte Zeit erreicht ist."),
  bulletBold("Persönliche Sekundenuhr: ", "ab Rundenstart zählt für jede Person eine echte Uhr hoch – unabhängig von Strava. Ein Strava-Stopp pausiert sie nicht. Sie friert erst ein, wenn das Rundenziel erreicht ist."),
  bulletBold("Pace: ", "wird aus dieser Rundenzeit und der Rundenstrecke berechnet."),
  bulletBold("Ausscheiden: ", "wer das Ziel bis zum Ablauf der Rundenzeit nicht schafft, wird ausgeschieden. Über der Karte erscheint dann eine Anzeige mit Profilbild, Name, Pace, Gesamtstrecke und wie lange die Person durchgehalten hat."),
  bulletBold("Rundenzeit-Diagramm: ", "jedes Panel zeigt ein kleines Diagramm, wie sich die Rundenzeit über die Runden verändert (Y = Zeit, X = Runde, mindestens 15 Runden)."),
  h2("Info-Streifen für alle (unten)"),
  bullet("Großer Countdown, wie lange noch bis alle wieder am Start sein müssen."),
  bullet("Status-Übersicht: wie viele im Ziel sind, wie viele noch laufen und wie viele ausgeschieden sind."),
  bullet("Fortschrittsbalken über die ganze Breite mit den Profilbildern aller Läufer an ihrer aktuellen Position (links 0 m, rechts die Rundenstrecke)."),
  bullet("Liste aller Läufer mit Bild, Name, Status und Zeit."),
  bullet("Aktuelle Ortszeit."),
  bullet("Der Haupttimer friert automatisch ein, wenn alle ausgeschieden sind."),
  h2("Start & Verpackung"),
  bullet("Eigenes App-Icon; die App lässt sich per Verknüpfung (Startsymbol) starten."),
  bullet("Mit electron-builder kann ein Installer oder eine portable EXE erstellt werden.")
];

// ---------- 3. Architektur ----------
const sec3 = [
  h1("3. Technische Architektur"),
  p("Lunyad ist eine Electron-App. Electron erlaubt es, eine Desktop-App mit Web-Technologien (HTML, CSS, JavaScript) zu bauen. Die App besteht aus mehreren Teilen, die jeweils eine eigene Aufgabe haben:"),
  table(
    ["Datei", "Aufgabe"],
    [
      ["main.js", "Hauptprozess: erstellt das Fenster, setzt das Icon, schaltet Vollbild, fängt die Escape-Taste ab."],
      ["preload.js", "Sichere Brücke zwischen Fenster und System (contextBridge) – stellt window.desktopApi bereit."],
      ["index.html", "Aufbau der Oberfläche (Bedienleiste, Raster, Info-Streifen)."],
      ["styles.css", "Aussehen / Design (Farben, Layout, Hell-/Dunkelmodus)."],
      ["renderer.js", "Die eigentliche Logik: Raster, Strava-Auslesen, Backyard-Berechnung, Info-Streifen."],
      ["assets/icon.ico", "App-Icon (mit build/gen-icon.js erzeugt)."]
    ],
    [2600, 6760]
  ),
  h2("Aufbau (Prozesse)"),
  bulletBold("Hauptprozess (main.js): ", "startet das Programmfenster und steuert systemnahe Dinge wie Vollbild und Icon."),
  bulletBold("Renderer (renderer.js): ", "läuft im Fenster und enthält fast die gesamte Programmlogik."),
  bulletBold("Preload (preload.js): ", "verbindet beide sicher, damit der Renderer z. B. Vollbild anfordern kann."),
  h2("Daten aus Strava (Scraping)"),
  p("Jede Strava-Beacon-Karte wird in einem <webview> (eingebettete Webseite) geladen. Alle 2 Sekunden führt die App ein kleines Skript in dieser Webseite aus (executeJavaScript) und liest die angezeigten Werte aus: Name, Profilbild, Distanz, aktive Zeit und Akku. Diese Werte werden dann im eigenen Panel angezeigt und an die Backyard-Berechnung weitergegeben."),
  h2("Backyard-Berechnung"),
  bullet("Ein Timer (1-Sekunden-Takt) prüft laufend die Zeit und berechnet die aktuelle Runde aus Startzeit und Rundenzeit."),
  bullet("Beim Rundenwechsel wird geprüft, wer das Ziel geschafft hat; alle anderen scheiden aus. Danach beginnt für die übrigen Läufer alles wieder bei 0."),
  bullet("Pro Läufer werden Distanz (von Strava) und eine eigene Sekundenuhr (Wall-Clock) verrechnet. Daraus entstehen Rundenzeit, Pace und das Diagramm."),
  h2("Datenfluss (vereinfacht)"),
  p("Strava-Beacon-Seite  →  webview  →  Scraping-Skript (alle 2 s)  →  renderer.js  →  Panel-Anzeige + Backyard-Logik (1-s-Timer)  →  Info-Streifen & Diagramme."),
  h2("Speicherung & Build"),
  bullet("Einstellungen (Hell-/Dunkelmodus, Backyard-Werte) werden im localStorage des Browsers gespeichert."),
  bullet("Das Icon wird mit einem Node-Skript (gen-icon.js) ohne Zusatzprogramme erzeugt (PNG + Multi-Size-ICO)."),
  bullet("Für die Verteilung kann mit electron-builder ein Installer oder eine portable EXE gebaut werden.")
];

// ---------- 4. Testläufe ----------
const sec4 = [
  h1("4. Dokumentierte Testläufe"),
  p("Zum Testen wurden kurze Werte verwendet (z. B. Rundenzeit 1 Minute, Rundenstrecke 0,2 km), damit man mehrere Runden schnell durchspielen kann. Folgende Tests wurden durchgeführt:"),
  table(
    ["Nr.", "Test", "Erwartetes Ergebnis", "Ergebnis"],
    [
      ["1", "App über das Startsymbol (Verknüpfung) starten", "Fenster öffnet sich mit App-Icon", "OK"],
      ["2", "4 Felder wählen, einen Strava-Beacon-Link eintragen", "Live-Panel mit Karte, Name und Profilbild erscheint", "OK"],
      ["3", "Startzeit/Rundenzeit/Strecke setzen und „Werte übernehmen“", "Info-Streifen erscheint, Countdown läuft auf die Startzeit", "OK"],
      ["4", "Rundenstart abwarten (Timer erreicht volle Zeit)", "Runde springt auf 1, persönliche Uhr startet bei 0", "OK"],
      ["5", "Strecke erreichen vor Ablauf der Rundenzeit", "Zeit, Strecke und Pace frieren ein, Status „Im Ziel“ (grün)", "OK"],
      ["6", "Während der Runde auf Strava „Stopp“ drücken", "Persönliche Uhr läuft trotzdem weiter", "OK"],
      ["7", "Rundenzeit ablaufen lassen, ohne das Ziel zu erreichen", "Läufer wird ausgeschieden, Overlay mit Pace/Strecke/Durchgehalten erscheint", "OK"],
      ["8", "Mehrere Runden durchspielen", "Rundenzeit-Diagramm füllt sich Runde für Runde", "OK"],
      ["9", "Reset drücken", "Runden = 0, Timer gestoppt, Ausscheidungen gelöscht", "OK"],
      ["10", "Alle Läufer ausscheiden lassen", "Haupttimer friert ein, Anzeige „Rennen beendet“", "OK"],
      ["11", "Live Mode an / mit Escape wieder aus", "Vollbild an, danach Bedienleiste wieder sichtbar", "OK"],
      ["12", "Hellmodus umschalten und App neu starten", "Heller Stil bleibt gespeichert", "OK"]
    ],
    [620, 3340, 4100, 1300]
  ),
  h2("Beobachtungen"),
  bullet("Da die Distanz nur alle 2 Sekunden von Strava kommt, kann der eingefrorene Zeitpunkt um wenige Sekunden abweichen – für die Anzeige ist das ausreichend genau."),
  bullet("Ob eine Strava-Seite sich einbetten lässt, hängt von Strava ab; im Test hat die Beacon-Seite funktioniert."),
  bullet("Mit kurzen Testwerten lassen sich alle Funktionen in wenigen Minuten überprüfen.")
];

// ---------- Dokument ----------
const doc = new Document({
  creator: "FSST Projekt",
  title: "Lunyad – Projektdokumentation",
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: "222222" } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 280 } } }
          }
        ]
      }
    ]
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Lunyad – FSST Projektdokumentation   |   Seite ", size: 18, color: GREY }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY })
              ]
            })
          ]
        })
      },
      children: [...titleChildren, ...tocChildren, ...sec1, ...sec2, ...sec3, ...sec4]
    }
  ]
});

const outPath = path.join(appRoot, "docs", "Projektdokumentation_Lunyad.docx");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("erstellt:", outPath);
});
