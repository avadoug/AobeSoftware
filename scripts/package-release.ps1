param(
  [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Release = Join-Path $Root "release"
$Web = Join-Path $Release "web\production-build"
$Windows = Join-Path $Release "windows"
$Portable = Join-Path $Windows "Aobe-WorkTrack-Portable-$Version"
$Docs = Join-Path $Release "documentation"

foreach ($Path in @($Web, $Windows, $Portable, $Docs)) {
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

Copy-Item -Recurse -Force -Path (Join-Path $Root "dist\*") -Destination $Web

$Installer = Get-ChildItem -Path (Join-Path $Root "src-tauri\target\release\bundle\nsis") -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($Installer) {
  Copy-Item -Force -LiteralPath $Installer.FullName -Destination (Join-Path $Windows "Aobe-WorkTrack-Setup-$Version.exe")
}

$PortableExe = Join-Path $Root "src-tauri\target\release\aobe-worktrack.exe"
if (Test-Path -LiteralPath $PortableExe) {
  Copy-Item -Force -LiteralPath $PortableExe -Destination (Join-Path $Portable "Aobe-WorkTrack-Portable-$Version.exe")
  Copy-Item -Force -LiteralPath (Join-Path $Root "docs\PORTABLE_WINDOWS.md") -Destination (Join-Path $Portable "README.txt")
}

Get-ChildItem -Path (Join-Path $Root "output\pdf") -Filter "*.pdf" -ErrorAction SilentlyContinue | ForEach-Object {
  Copy-Item -Force -LiteralPath $_.FullName -Destination $Docs
}

$Files = Get-ChildItem -Recurse -File -Path $Release | Where-Object { $_.Name -ne "checksums.txt" }
$Checksums = foreach ($File in $Files) {
  $Hash = Get-FileHash -Algorithm SHA256 -LiteralPath $File.FullName
  $Relative = [IO.Path]::GetRelativePath($Release, $File.FullName).Replace("\", "/")
  "$($Hash.Hash.ToLowerInvariant())  $Relative"
}
Set-Content -LiteralPath (Join-Path $Release "checksums.txt") -Value $Checksums -Encoding utf8
