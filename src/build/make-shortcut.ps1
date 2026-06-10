# Erstellt eine Lunyad-Verknüpfung (mit Icon) im Projektordner und auf dem Desktop.
# Aufruf:  Rechtsklick -> "Mit PowerShell ausführen"  oder  build\Verknuepfung-erstellen.bat
$ErrorActionPreference = "Stop"

# Dieses Skript liegt in <Stammordner>\app\build\ .
$appRoot = Split-Path -Parent $PSScriptRoot       # ...\app  (alle Dateien)
$outerRoot = Split-Path -Parent $appRoot          # ...\Lunyad (nur Startsymbol)
$target = Join-Path $appRoot "start.bat"
$icon = Join-Path $appRoot "assets\icon.ico"

$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")

$paths = @(
  (Join-Path $outerRoot "Lunyad.lnk"),
  (Join-Path $desktop "Lunyad.lnk")
)

foreach ($lnk in $paths) {
  $sc = $ws.CreateShortcut($lnk)
  $sc.TargetPath = $target
  $sc.WorkingDirectory = $root
  $sc.IconLocation = "$icon,0"
  $sc.Description = "Lunyad - Backyard-Ultra Live-Dashboard"
  $sc.WindowStyle = 7  # minimiert starten
  $sc.Save()
  Write-Host "Verknuepfung erstellt: $lnk"
}
