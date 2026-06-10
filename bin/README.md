# bin – Kompiliertes Programm

Hier liegt das fertig gebaute, lauffähige Programm.

## Lokaler Build
Beim Bauen entsteht hier der Ordner:

```
bin/Lunyad-win32-x64/Lunyad.exe   <- Doppelklick startet die App
```

Dieser Ordner ist **nicht im Git enthalten**, weil die Electron-Laufzeit
(`Lunyad.exe`, ~216 MB) das **100-MB-Datei-Limit von GitHub** überschreitet.

## Programm selbst erzeugen

Im Ordner `../src`:

```bash
npm install
npx @electron/packager . Lunyad --platform=win32 --arch=x64 --out=../bin --overwrite --icon=assets/icon.ico --ignore="(node_modules|build|^/\.|dist)"
```

Danach startet `bin/Lunyad-win32-x64/Lunyad.exe` die App.

## Ohne Build starten
Alternativ direkt aus dem Quellcode:

```bash
cd ../src
npm install
npm start
```

(oder `src/start.bat` doppelklicken)
