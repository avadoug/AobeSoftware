# Build Aobe WorkTrack for Windows

These steps are for a developer or automated build runner. Aobe does not need any of these tools to run the installer.

## Requirements

- Windows 10 or 11 x64
- Node.js 22 LTS and npm
- Rust stable with the MSVC target
- Microsoft C++ Build Tools with Desktop development with C++
- WebView2 (included with current Windows; bootstrapper configured for installation)

## Build

```powershell
npm ci
npm run icons
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run tauri:build
```

Expected native outputs:

```text
src-tauri/target/release/aobe-worktrack.exe
src-tauri/target/release/bundle/nsis/*.exe
```

Create the final folder and checksums:

```powershell
./scripts/package-release.ps1 -Version 1.0.0
```

Expected named outputs:

```text
release/windows/Aobe-WorkTrack-Setup-1.0.0.exe
release/windows/Aobe-WorkTrack-Portable-1.0.0/Aobe-WorkTrack-Portable-1.0.0.exe
release/web/production-build/
release/documentation/
release/checksums.txt
```

The portable binary embeds the frontend but uses Windows WebView2. Its SQLite records live in the user's application-data folder instead of beside the executable. This prevents accidental data loss on read-only or removable media.

## Smoke verification

Install for the current user. Confirm there is no terminal window, Start Menu launch works, skip setup, run a shift and trip, restart during each timer, export every format, restore a backup, uninstall, and confirm the choice about preserving user data. Test the portable executable separately.

The GitHub `Windows release build` workflow performs the reproducible build and artifact checks on `windows-latest`. A `v*` tag attaches outputs to a GitHub Release. Code-sign public production artifacts to avoid Windows reputation warnings.
