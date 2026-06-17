# -*- coding: utf-8 -*-
"""Erzeugt docs/Dokumentation.pdf (schlicht). Aufruf: py src/build/gen-pdf.py"""
import os
from fpdf import FPDF

ACCENT = (252, 82, 0)
DARK = (26, 29, 38)
GREY = (92, 99, 112)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "docs", "Dokumentation.pdf"))
FONTS = r"C:\Windows\Fonts"


class PDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 10, "Lunyad - Projektdokumentation", align="C")


def usable(pdf):
    return pdf.w - pdf.l_margin - pdf.r_margin


def h1(pdf, text):
    pdf.set_font("Arial", "B", 16)
    pdf.set_text_color(*ACCENT)
    pdf.ln(3)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable(pdf), 8, text)
    pdf.ln(1)


def body(pdf, text):
    pdf.set_font("Arial", "", 11)
    pdf.set_text_color(*DARK)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable(pdf), 6, text)
    pdf.ln(1)


def bullet(pdf, text):
    pdf.set_font("Arial", "", 11)
    pdf.set_text_color(*DARK)
    pdf.set_x(pdf.l_margin + 6)
    pdf.multi_cell(usable(pdf) - 6, 6, "•  " + text)


def table(pdf, rows):
    for i, (a, b) in enumerate(rows):
        head = i == 0
        pdf.set_font("Arial", "B" if head else "", 10)
        pdf.set_fill_color(252, 227, 214) if head else pdf.set_fill_color(245, 246, 248)
        pdf.set_text_color(*DARK)
        pdf.cell(150, 8, a, border=1, align="L", fill=True, new_x="RIGHT", new_y="TOP")
        pdf.cell(30, 8, b, border=1, align="C", fill=True, new_x="LMARGIN", new_y="NEXT")


pdf = PDF(format="A4")
pdf.add_font("Arial", "", os.path.join(FONTS, "arial.ttf"))
pdf.add_font("Arial", "B", os.path.join(FONTS, "arialbd.ttf"))
pdf.set_auto_page_break(True, margin=18)
pdf.add_page()

pdf.ln(6)
pdf.set_font("Arial", "B", 30)
pdf.set_text_color(*ACCENT)
pdf.cell(0, 14, "Lunyad", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Arial", "B", 14)
pdf.set_text_color(*DARK)
pdf.cell(0, 9, "Backyard-Ultra Live-Dashboard", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Arial", "", 11)
pdf.set_text_color(*GREY)
pdf.cell(0, 8, "FSST-Projekt – Projektdokumentation", new_x="LMARGIN", new_y="NEXT")
pdf.ln(4)

h1(pdf, "1. Projektidee & -konzept")
body(pdf, "Lunyad ist ein Live-Dashboard für ein Backyard-Ultra-Rennen.")
body(pdf, "Bei einem Backyard Ultra startet jede volle Stunde eine neue Runde. Wer die feste Strecke nicht rechtzeitig schafft, scheidet aus – der Letzte gewinnt.")
body(pdf, "Strava Beacon zeigt zwar Live-Position und Distanz jedes Läufers, rechnet aber nicht aus, wer seine Runde geschafft hat. Genau das macht unsere App:")
bullet(pdf, "Sie zeigt mehrere Strava-Beacon-Livekarten gleichzeitig (z. B. am Beamer).")
bullet(pdf, "Sie liest automatisch Name, Distanz und Zeit aus.")
bullet(pdf, "Sie berechnet Runden, Pace und Ausscheidungen selbst.")
bullet(pdf, "Unten läuft ein Info-Streifen für alle Zuschauer (Countdown, Status, Uhr).")

h1(pdf, "2. Projektplanung (Feature-Liste)")
body(pdf, "Priorisierung: Muss (wichtig), Soll (geplant), Kann (Extra).")
table(pdf, [
    ("Feature", "Priorität"),
    ("Mehrere Livekarten anzeigen (1–8 Felder)", "Muss"),
    ("Backyard-Konfiguration (Startzeit, Rundenzeit, Strecke)", "Muss"),
    ("Runden über Timer steuern + Countdown", "Muss"),
    ("Ausgeschiedene Läufer erkennen und anzeigen", "Muss"),
    ("Daten automatisch aus Strava auslesen", "Muss"),
    ("Info-Streifen (Status, Fortschrittsbalken, Ortszeit)", "Soll"),
    ("Pace und Rundenzeit pro Person", "Soll"),
    ("Rundenzeit-Diagramm pro Läufer", "Soll"),
    ("Hell-/Dunkelmodus", "Kann"),
    ("Live-Vollbildmodus", "Kann"),
    ("Eigenes Icon / Start per Verknüpfung", "Kann"),
])
pdf.ln(2)

h1(pdf, "3. Technologie Stack")
bullet(pdf, "JavaScript – die gesamte Logik")
bullet(pdf, "HTML & CSS – Oberfläche und Design")
bullet(pdf, "Electron – macht aus Web-Technik eine Desktop-App")
bullet(pdf, "Node.js – Laufzeitumgebung")
bullet(pdf, "Strava Beacon – Datenquelle (Live-Standort)")
bullet(pdf, "Tools: Visual Studio Code, Git, Claude, Cursor")

h1(pdf, "4. Teamauflistung")
bullet(pdf, "Fenkart, Benedikt")
bullet(pdf, "Sukhrukov, Maksym")

h1(pdf, "5. KI-Einsatz & Vorgehen")
body(pdf, "Wir haben das Projekt bewusst mit Unterstützung von Künstlicher Intelligenz umgesetzt, dabei aber großen Wert darauf gelegt, den Code selbst zu verstehen. Unser Vorgehen in Stichpunkten:")
bullet(pdf, "Modell: Claude Opus 4.8 als Programmier-Assistent.")
bullet(pdf, "Iterativ gearbeitet: die App Schritt für Schritt aufgebaut, Feature für Feature – nicht alles auf einmal.")
bullet(pdf, "Klare, präzise Prompts: gewünschte Funktion und erwartetes Verhalten genau beschrieben (z. B. „die Rundenzeit läuft als echte Sekundenuhr ab dem Rundenstart und friert beim Streckenziel ein\").")
bullet(pdf, "Geprüft & getestet: nach jedem Schritt den Code gelesen, die App gestartet und ausprobiert.")
bullet(pdf, "Nachgeschärft: bei falschen Ergebnissen den Prompt verbessert oder gezielt Korrekturen verlangt.")
bullet(pdf, "Reihenfolge: vom Grundgerüst (mehrere Karten anzeigen) über die Strava-Auswertung bis zur kompletten Backyard-Logik.")
bullet(pdf, "Auch für Nebenaufgaben: App-Icon, Dokumentation und Präsentation.")
bullet(pdf, "Verantwortung bei uns: Die KI liefert nur Vorschläge – Entscheidungen und Verständnis bleiben bei uns, damit wir den Code selbst erklären können.")

pdf.output(OUT)
print("erstellt:", OUT)
