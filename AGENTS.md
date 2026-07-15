# AGENTS.md - Aobe WorkTrack Maintainer Guide

## Non-negotiable product rules

- Keep ordinary use local-first, account-free, tracker-free, API-key-free, and offline capable.
- End users must never need Python, Node.js, Rust, SQLite, a terminal, or development tools.
- Never replace persisted start timestamps with tick counters. Timers must survive refresh/restart/sleep.
- Never store money as unrounded floating-point dollars; persist integer minor units.
- Never render user text as raw HTML or execute imported content. Retain CSV formula-injection protection.
- Never silently classify commuting as business or silently collect GPS.
- Preserve historical rates on stored shifts/trips when defaults change.
- Keep web and desktop behavior aligned through the storage abstraction.

## Setup and commands

```powershell
npm ci
npm run dev
npm run tauri:dev
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
npm run build
npm run icons
npm run tauri:build
```

Run `npm run icons` after changing `public/icon.svg`. Rust/MSVC/WebView2 requirements are in `docs/BUILD_WINDOWS.md`.

## Code ownership

- Domain records/calculations: `src/domain/`
- IndexedDB and SQLite adapters: `src/storage/`
- Backup/import/export/demo: `src/services/`
- Feature UI: `src/features/`
- Shared app state and navigation: `src/app/`
- Desktop permissions/configuration: `src-tauri/`

Do not move calculations into React components. Add a domain test first for time, pay, reimbursement, warning, or rounding changes.

## Required validation

Before release, run every command above. Test timer recovery by starting a shift and trip, fully closing/reloading, confirming elapsed time, and ending them. Test backup by creating mixed data, exporting, clearing a test database, restoring, and comparing all collection counts/settings. Verify PDF visually, XLSX worksheets/date-number types, CSV formula-like text, printable layout, and JSON hash rejection.

Run Playwright desktop and mobile workflows, then test installed and portable binaries on Windows without a development environment. Ensure no console window appears. Test offline PWA after one online load.

## Release

Keep version strings synchronized in `package.json`, `src/config.ts`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`. Run `scripts/package-release.ps1`; inspect `release/checksums.txt`. Use the Windows release workflow for reproducible artifacts, then code-sign public distribution files. Never claim an installer or test passed without observing it.
