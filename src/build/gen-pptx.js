"use strict";

const path = require("path");
const fs = require("fs");
const PptxGenJS = require("pptxgenjs");

const SRC = path.join(__dirname, "..");
const DOCS = path.join(__dirname, "..", "..", "docs");
const ICON = path.join(SRC, "assets", "icon.png");
const SHOT_UI = path.join(DOCS, "screenshot-start.png");

const BG = "0F1115";
const PANEL = "171B24";
const PANEL2 = "1F2533";
const ACCENT = "FC5200";
const TEXT = "F4F7FF";
const MUTED = "A6B2D1";

const HF = "Trebuchet MS";
const BF = "Calibri";

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
const W = 13.333;

function slide() {
  const s = pptx.addSlide();
  s.background = { color: BG };
  return s;
}
function title(s, text) {
  s.addText(text, { x: 0.7, y: 0.5, w: W - 1.4, h: 0.9, fontFace: HF, fontSize: 32, bold: true, color: TEXT });
  s.addShape(pptx.ShapeType.ellipse, { x: 0.72, y: 1.32, w: 0.16, h: 0.16, fill: { color: ACCENT } });
}
function card(s, x, y, w, h, fill) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: fill || PANEL }, line: { color: PANEL2, width: 1 } });
  s.addShape(pptx.ShapeType.roundRect, { x, y, w: 0.09, h, rectRadius: 0.04, fill: { color: ACCENT }, line: { type: "none" } });
}

// 1) Titel
(() => {
  const s = slide();
  if (fs.existsSync(ICON)) s.addImage({ path: ICON, x: 1.1, y: 2.3, w: 2.0, h: 2.0 });
  s.addText("Lunyad", { x: 3.5, y: 2.2, w: 8.5, h: 1.1, fontFace: HF, fontSize: 60, bold: true, color: ACCENT });
  s.addText("Backyard-Ultra Live-Dashboard", { x: 3.55, y: 3.3, w: 8.5, h: 0.6, fontFace: HF, fontSize: 24, color: TEXT });
  s.addText("FSST-Projekt", { x: 3.55, y: 3.95, w: 8.5, h: 0.5, fontFace: BF, fontSize: 16, color: MUTED });
  s.addText("Fenkart Benedikt  ·  Sukhrukov Maksym", { x: 1.1, y: 6.4, w: 11, h: 0.5, fontFace: BF, fontSize: 16, color: MUTED });
})();

// 2) Idee
(() => {
  const s = slide();
  title(s, "Die Idee");
  card(s, 0.7, 1.7, 7.0, 4.9, PANEL);
  s.addText(
    [
      { text: "Backyard Ultra\n", options: { bold: true, color: ACCENT, fontSize: 18, breakLine: true } },
      { text: "Jede volle Stunde startet eine neue Runde. Wer die feste Strecke nicht rechtzeitig schafft, scheidet aus – der Letzte gewinnt.\n\n", options: { color: TEXT, fontSize: 15, breakLine: true } },
      { text: "Unsere App\n", options: { bold: true, color: ACCENT, fontSize: 18, breakLine: true } },
      { text: "Zeigt mehrere Strava-Livekarten gleichzeitig und rechnet automatisch Runden, Zeiten, Pace und Ausscheidungen aus – mit Info-Streifen für alle Zuschauer.", options: { color: TEXT, fontSize: 15 } }
    ],
    { x: 1.05, y: 1.95, w: 6.35, h: 4.4, valign: "top", fontFace: BF, lineSpacingMultiple: 1.1 }
  );
  s.addShape(pptx.ShapeType.ellipse, { x: 8.5, y: 2.3, w: 3.8, h: 3.8, fill: { color: PANEL }, line: { color: ACCENT, width: 2 } });
  if (fs.existsSync(ICON)) s.addImage({ path: ICON, x: 9.35, y: 3.15, w: 2.1, h: 2.1 });
})();

// 3) Screenshot
(() => {
  const s = slide();
  title(s, "So sieht die App aus");
  if (fs.existsSync(SHOT_UI)) {
    const w = 8.3, h = 5.335;
    s.addShape(pptx.ShapeType.roundRect, { x: (W - w) / 2 - 0.06, y: 1.5, w: w + 0.12, h: h + 0.12, rectRadius: 0.05, fill: { color: PANEL }, line: { color: ACCENT, width: 1.5 } });
    s.addImage({ path: SHOT_UI, x: (W - w) / 2, y: 1.56, w, h });
  }
  s.addText("Felder & Backyard-Einstellungen oben, die Karten der Läufer darunter.", { x: 0.7, y: 7.0, w: W - 1.4, h: 0.4, fontFace: BF, fontSize: 12, color: MUTED, align: "center" });
})();

// 4) Features
(() => {
  const s = slide();
  title(s, "Was die App kann");
  const feats = [
    "Bis zu 8 Strava-Livekarten gleichzeitig",
    "Werte automatisch aus Strava auslesen",
    "Runden per Timer + Countdown",
    "Pace, Rundenzeit & Diagramm pro Läufer",
    "Ausgeschiedene Läufer anzeigen",
    "Info-Streifen mit Status & Fortschritt"
  ];
  const colW = 5.95, x0 = 0.7, x1 = 0.7 + colW + 0.4, startY = 1.8, rowH = 1.45;
  feats.forEach((f, i) => {
    const x = i < 3 ? x0 : x1;
    const y = startY + (i % 3) * (rowH + 0.18);
    card(s, x, y, colW, rowH, PANEL);
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.28, y: y + 0.42, w: 0.6, h: 0.6, fill: { color: ACCENT } });
    s.addText(String(i + 1), { x: x + 0.28, y: y + 0.42, w: 0.6, h: 0.6, fontFace: HF, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    s.addText(f, { x: x + 1.05, y: y + 0.18, w: colW - 1.3, h: rowH - 0.36, fontFace: BF, fontSize: 15, color: TEXT, valign: "middle" });
  });
})();

// 5) Technologie & Team
(() => {
  const s = slide();
  title(s, "Technologie & Team");
  card(s, 0.7, 1.8, 5.95, 4.6, PANEL);
  s.addText("Technologie", { x: 1.05, y: 2.05, w: 5.4, h: 0.5, fontFace: HF, fontSize: 20, bold: true, color: ACCENT });
  s.addText(
    ["JavaScript", "HTML & CSS", "Electron (Desktop-App)", "Node.js", "Strava Beacon (Daten)", "VS Code, Git, Claude, Cursor"].map((t) => ({ text: t, options: { bullet: { code: "2022" }, color: TEXT, fontSize: 15, paraSpaceAfter: 6 } })),
    { x: 1.15, y: 2.7, w: 5.3, h: 3.5, valign: "top", fontFace: BF }
  );
  card(s, 7.05, 1.8, 5.6, 4.6, PANEL);
  s.addText("Team", { x: 7.4, y: 2.05, w: 5.0, h: 0.5, fontFace: HF, fontSize: 20, bold: true, color: ACCENT });
  s.addText(
    ["Fenkart, Benedikt", "Sukhrukov, Maksym"].map((t) => ({ text: t, options: { bullet: { code: "2022" }, color: TEXT, fontSize: 18, paraSpaceAfter: 12 } })),
    { x: 7.5, y: 2.8, w: 4.9, h: 2.5, valign: "top", fontFace: BF }
  );
})();

// 6) Zahlen + Abschluss
(() => {
  const s = slide();
  s.background = { color: ACCENT };
  s.addText("Zahlen & Abschluss", { x: 0.8, y: 0.6, w: W - 1.6, h: 0.9, fontFace: HF, fontSize: 32, bold: true, color: "FFFFFF" });
  const stats = [
    ["~2.000", "Zeilen Code"],
    ["892", "Zeilen renderer.js"],
    ["3", "Sprachen"],
    ["8", "Läufer gleichzeitig"]
  ];
  const cw = 2.85, gap = 0.3, total = stats.length * cw + (stats.length - 1) * gap, x0 = (W - total) / 2, y = 2.0, hh = 2.6;
  stats.forEach((st, i) => {
    const x = x0 + i * (cw + gap);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: hh, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { type: "none" } });
    s.addText(st[0], { x: x + 0.1, y: y + 0.5, w: cw - 0.2, h: 1.1, fontFace: HF, fontSize: 44, bold: true, color: ACCENT, align: "center" });
    s.addText(st[1], { x: x + 0.1, y: y + 1.65, w: cw - 0.2, h: 0.7, fontFace: BF, fontSize: 14, color: "1A1D26", align: "center" });
  });
  s.addText("Danke fürs Zuhören!", { x: 0.8, y: 5.4, w: W - 1.6, h: 0.8, fontFace: HF, fontSize: 28, bold: true, color: "FFFFFF", align: "center" });
})();

const out = path.join(DOCS, "Praesentation_Lunyad.pptx");
pptx.writeFile({ fileName: out }).then(() => console.log("erstellt:", out));
