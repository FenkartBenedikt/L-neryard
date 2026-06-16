# -*- coding: utf-8 -*-
"""Erzeugt docs/Code-Erklaerung.pdf. Aufruf: py src/build/gen-code-erklaerung.py"""
import os
from fpdf import FPDF

ACCENT = (252, 82, 0)
DARK = (26, 29, 38)
GREY = (92, 99, 112)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "docs", "Code-Erklaerung.pdf"))
FONTS = r"C:\Windows\Fonts"


class PDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 10, "Lunyad - Code-Erklaerung", align="C")


def usable(pdf):
    return pdf.w - pdf.l_margin - pdf.r_margin


def file_head(pdf, name, role):
    pdf.ln(2)
    pdf.set_font("Arial", "B", 15)
    pdf.set_text_color(*ACCENT)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable(pdf), 7, name)
    pdf.set_font("Arial", "I", 10.5)
    pdf.set_text_color(*GREY)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable(pdf), 5.5, role)
    pdf.ln(1)


def bullet(pdf, text, sub=False):
    pdf.set_font("Arial", "", 10.5)
    pdf.set_text_color(*DARK)
    indent = 10 if sub else 5
    mark = "-  " if sub else "•  "
    pdf.set_x(pdf.l_margin + indent)
    pdf.multi_cell(usable(pdf) - indent, 5.4, mark + text)


def intro(pdf, text):
    pdf.set_font("Arial", "", 11)
    pdf.set_text_color(*DARK)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable(pdf), 6, text)
    pdf.ln(1)


pdf = PDF(format="A4")
pdf.add_font("Arial", "", os.path.join(FONTS, "arial.ttf"))
pdf.add_font("Arial", "B", os.path.join(FONTS, "arialbd.ttf"))
pdf.add_font("Arial", "I", os.path.join(FONTS, "ariali.ttf"))
pdf.set_auto_page_break(True, margin=18)
pdf.add_page()

# Titel
pdf.set_font("Arial", "B", 26)
pdf.set_text_color(*ACCENT)
pdf.cell(0, 12, "Lunyad - Code-Erklaerung", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Arial", "", 11)
pdf.set_text_color(*GREY)
pdf.cell(0, 7, "Was machen die einzelnen Dateien der App?", new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)
intro(pdf, "Die App ist eine Electron-Desktop-App. Vereinfacht: main.js startet das Fenster, "
           "index.html ist das Geruest der Oberflaeche, styles.css macht das Aussehen, und "
           "renderer.js enthaelt die gesamte Logik. preload.js verbindet Fenster und System sicher.")

# index.html
file_head(pdf, "index.html", "Das HTML-Geruest der Oberflaeche (kein Code-Verhalten, nur Aufbau).")
bullet(pdf, "Laedt die Datei styles.css (Design) und renderer.js (Logik).")
bullet(pdf, "Steuerleiste oben: Anzahl Felder, Backyard-Einstellungen (Startzeit, Rundenzeit, Rundenstrecke) und die Buttons (Werte uebernehmen, Backyard An/Aus, Reset, Live Mode, Hellmodus, Strava Stats).")
bullet(pdf, "Der Bereich <div id=\"grid\"> ist der Platz fuer die Karten/Felder der Laeufer.")
bullet(pdf, "Der untere <footer id=\"backyardStrip\"> ist der Info-Streifen: Countdown, Status-Pills, Fortschrittsbalken, Uhr und Teilnehmer-Liste.")
bullet(pdf, "Wichtig: Hier stehen nur die IDs/Klassen. Was passiert, steuert renderer.js; wie es aussieht, styles.css.")

# main.js
file_head(pdf, "main.js", "Der Hauptprozess von Electron - startet und steuert das Fenster.")
bullet(pdf, "createWindow() erstellt das Programmfenster (1400x900), setzt das App-Icon und laedt index.html.")
bullet(pdf, "Aktiviert webviewTag: damit koennen fremde Webseiten (die Strava-Karten) eingebettet werden.")
bullet(pdf, "Bindet preload.js ein (sichere Bruecke) und schaltet gefaehrliche Node-Zugriffe im Fenster ab.")
bullet(pdf, "Registriert die Escape-Taste global und schickt das Signal an das Fenster (zum Verlassen des Live-Modus).")
bullet(pdf, "Reagiert auf Nachrichten aus dem Fenster: set-fullscreen (Vollbild an/aus) und set-chrome-bg (Hintergrundfarbe).")
bullet(pdf, "Schliesst die App, wenn alle Fenster zu sind.")

# package-lock.json
file_head(pdf, "package-lock.json", "Automatisch von npm erzeugt - die genaue Paketliste.")
bullet(pdf, "Haelt exakt fest, welche Pakete in welcher Version installiert wurden (inkl. Unter-Abhaengigkeiten).")
bullet(pdf, "Sorgt dafuer, dass 'npm install' ueberall die gleichen Versionen installiert (reproduzierbar).")
bullet(pdf, "Wird nicht von Hand bearbeitet - npm pflegt die Datei selbst.")

# package.json
file_head(pdf, "package.json", "Die Steckbrief- und Konfigurationsdatei des Projekts.")
bullet(pdf, "Allgemeine Infos: Name, Version, Beschreibung, Lizenz.")
bullet(pdf, "\"main\": \"main.js\" - das ist der Einstiegspunkt, der beim Start ausgefuehrt wird.")
bullet(pdf, "scripts: kurze Befehle, z. B. \"start\" (startet die App mit 'electron .') sowie icon/pack/dist.")
bullet(pdf, "devDependencies: benoetigte Werkzeuge (electron, electron-builder).")
bullet(pdf, "build: Einstellungen zum Verpacken (App-Name, Icon, Windows-Programm).")

# preload.js
file_head(pdf, "preload.js", "Sichere Bruecke zwischen Fenster (renderer) und System (main).")
bullet(pdf, "Stellt im Fenster ein kleines, sicheres Objekt window.desktopApi bereit.")
bullet(pdf, "Funktionen darin: setFullscreen() (Vollbild), setChromeBackground() (Fensterfarbe), onGlobalEscape() (Escape).")
bullet(pdf, "Diese Aufrufe werden per Nachricht an main.js weitergeleitet. So bleibt das Fenster sicher (kein direkter System-Zugriff).")

# renderer.js
file_head(pdf, "renderer.js", "Das Herz der App - die gesamte Logik im Fenster. Die wichtigsten Abschnitte:")
bullet(pdf, "Element-Referenzen & Zustand: holt die HTML-Elemente und merkt sich Variablen (Anzahl Felder, Rundenstrecke, Backyard-Zustand, eine Liste 'participants' fuer alle Laeufer).")
bullet(pdf, "Kleine Helfer: setText() (Text in ein Element schreiben), setAvatar() (Profilbild setzen), escapeHtml(), webviewUrl().")
bullet(pdf, "Formatierung & Parsing: wandelt Texte um - z. B. \"5,2 km\" in eine Zahl, Sekunden in \"m:ss\", Pace, Uhrzeit und Countdown.")
bullet(pdf, "Theme / Live Mode / Stats: Hell-/Dunkelmodus, Vollbild-Modus und Strava-Stats ein-/ausblenden.")
bullet(pdf, "Runden-Tracking ohne Backyard: zaehlt Runden ueber Pause/Neustart der Strava-Aktivitaet (Standardfall).")
bullet(pdf, "Backyard-Teil (Kernstueck):")
bullet(pdf, "getParticipant(): legt pro Laeufer einen Datensatz an (Distanz, Zeiten, ausgeschieden, Rundenzeiten).", sub=True)
bullet(pdf, "backyardOnData(): uebernimmt die von Strava ausgelesenen Werte in diesen Datensatz.", sub=True)
bullet(pdf, "handleRoundChange(): beim Stundenwechsel - wer das Ziel nicht geschafft hat, scheidet aus; danach starten alle wieder bei 0.", sub=True)
bullet(pdf, "renderBackyardPanel(): zeigt pro Laeufer Runde, eine echte Sekundenuhr (laeuft mit, friert beim Ziel ein), Pace und das Diagramm; beim Ausscheiden ein Overlay.", sub=True)
bullet(pdf, "renderRoundChart(): kleines Liniendiagramm der Rundenzeiten (Y = Zeit, X = Runde).", sub=True)
bullet(pdf, "renderRunners / renderParticipants / renderInfo: bauen den unteren Info-Streifen (Balken mit Profilbildern, Status, Countdown, Uhr).", sub=True)
bullet(pdf, "backyardTick(): laeuft jede Sekunde, berechnet die aktuelle Runde und friert den Timer ein, wenn alle ausgeschieden sind.", sub=True)
bullet(pdf, "saveBackyard() / toggleBackyard() / resetBackyard(): die Aktionen der drei Buttons.", sub=True)
bullet(pdf, "Strava-Beacon & Webview: isStravaBeaconUrl() erkennt Strava-Links; buildBeaconScrapeScript() liest Name, Bild, Distanz und Zeit aus der Strava-Seite; ein Poller holt alle 2 Sekunden neue Werte; updateBeaconPanel() schreibt sie in das Panel.")
bullet(pdf, "Raster aufbauen: renderGrid() erzeugt die Felder - leer, als normale Webseite oder als eigenes Strava-Panel.")
bullet(pdf, "Events & Init (am Ende): verbindet die Buttons mit den Funktionen, laedt gespeicherte Einstellungen und baut das Raster auf.")

# start.bat
file_head(pdf, "start.bat", "Windows-Startdatei zum Doppelklicken.")
bullet(pdf, "Prueft, ob Node.js installiert ist (sonst Hinweis zum Download).")
bullet(pdf, "Installiert bei Bedarf einmalig die Abhaengigkeiten (npm install).")
bullet(pdf, "Startet danach die App (npm start).")

# styles.css
file_head(pdf, "styles.css", "Das komplette Design (Aussehen) - hier passiert keine Logik.")
bullet(pdf, "Definiert Farben als Variablen (z. B. --beacon-accent = Orange) und einen hellen Modus (theme-light).")
bullet(pdf, "Gestaltet Steuerleiste und Buttons (mit Hover/Fokus, oranger Primaerbutton) sowie das Raster.")
bullet(pdf, "Gestaltet die Strava-Panels: Kopf mit Profilbild/Name, Karte, Runden-Anzeige, Pace, Diagramm und das Ausgeschieden-Overlay.")
bullet(pdf, "Gestaltet den unteren Info-Streifen: Fortschrittsbalken, Laeufer-Punkte, Status-Pills, Chips und Uhr.")
bullet(pdf, "Regelt den Live-Modus (Steuerleiste ausblenden, alles auf Vollbild).")

pdf.output(OUT)
print("erstellt:", OUT)
