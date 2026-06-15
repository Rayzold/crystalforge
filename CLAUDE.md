# Crystal Forge — Claude Memory File

> Session memory for Claude Code. Read this first, every session. Update the **Session Log** at the end before closing.
> Full detail: `PROJECT_CATCHUP.md` (1037 lines). Deep rebuild spec: `SAVEPOINT_RECREATION_SPEC.md`.

---

## One-Sentence Summary

Crystal Forge is a static browser-based fantasy settlement simulator (GM control deck + player view) for running a shared city called "the Drift" — no bundler, no framework, plain ES modules.

---

## Current Version

- `APP_VERSION = "v1.7.9"` — in `content/Config.js`, `boot.js`, and all root HTML files
- `SAVE_VERSION = 12`
- `MANUAL_SAVE_KEY = "crystal-forge-manual-save-v3"`
- Release stage: `preview`
- Last pushed commit: `defb463 Release v1.7.7` (PROJECT_CATCHUP written at v1.7.9)

**Version bump checklist:** `content/Config.js` → `boot.js` → every root `.html` (cache-buster `?v=X.Y.Z`) → `SAVEPOINT_RECREATION_SPEC.md` → add build note.

---

## Tech Stack

- Vanilla JS ES modules — no React, no Vue, no bundler
- Plain HTML entry pages (one per route)
- `app.js` — single shared controller
- `styles.css` — all styling, centralized (large, check cascade carefully)
- Firebase (optional) for realm publishing
- Local: `start-server.ps1` → `http://localhost:8000`

---

## Directory Map

```
content/     Data & config (BuildingCatalog, Config, Rarities, etc.)
systems/     Game logic (ResourceSystem, ExpeditionSystem, etc.)
ui/          DOM renderers & page surfaces (CityPage, HexMap, etc.)
engine/      GameState.js, UIRenderer.js
firebase/    FirebaseSync.js
admin/       AdminConsole.js
assets/      audio/, images/buildings/, images/vehicles/, video/
```

---

## Pages & Key Files

| Page | HTML | Key UI | Key Systems |
|------|------|--------|-------------|
| GM Dashboard | `gm.html` | `ui/HomePage.js`, `ui/CrisisBanner.js` | `GoalSystem.js`, `DecisionInboxSystem.js` |
| Forge | `forge.html` | `ui/ForgePage.js`, `ui/ManifestPanel.js` | `GachaSystem.js`, `CrystalSystem.js` |
| Economy | `economy.html` | `ui/ResourcePanel.js` | `ResourceSystem.js`, `BalanceSystem.js` |
| City | `city.html` | `ui/CityPage.js`, `ui/HexMap.js` | `MapSystem.js`, `ConstructionSystem.js`, `BuildingSystem.js` |
| Citizens | `citizens.html` | `ui/CitizensPage.js` | `CitizenSystem.js`, `WorkforceSystem.js` |
| Expeditions | `expeditions.html` | `ui/ExpeditionsPage.js`, `ui/ExpeditionJourneyModal.js` | `ExpeditionSystem.js` ⚠️ large |
| Vehicles | `vehicles.html` | `ui/VehiclesPage.js` | `content/VehicleConfig.js` |
| Legends | `uniques.html` | `ui/UniqueCitizensPage.js` | `CitizenSystem.js`, `content/UniqueCitizenConfig.js` |
| Chronicle | `chronicle.html` | `ui/ChronicleCalendar.js` | `CalendarSystem.js`, `MonthlyChronicleSystem.js` |
| Player | `player.html` | `ui/PlayerPage.js` | — |
| Help | `help.html` | `ui/HelpPage.js` | `content/GlossaryConfig.js` |

---

## Quick File Lookup

- Config/version/routes → `content/Config.js`
- State shape → `engine/GameState.js`
- Save/load/migrations/test state → `systems/StorageSystem.js`
- All styling → `styles.css`
- App entry → `boot.js` → `app.js`
- Building data → `content/BuildingCatalog.js`
- Rarity rules → `content/Rarities.js`
- Map config → `content/MapConfig.js`
- Calendar/holidays → `content/CalendarConfig.js`
- Release script → `release.ps1`

---

## Known Friction Points

1. **`styles.css` is large** — rules can be overridden lower in the file. Always search before adding.
2. **`systems/ExpeditionSystem.js` is large and tightly coupled** — use narrow edits, smoke after.
3. **City map is performance-sensitive** — never re-render on pointer move. Placement preview is selection-driven. In planner mode, `HexMap` uses `is-placement-lite` (skips roads, district fields, water overlays).
4. **Python may be a Windows Store stub** — if `start-server.ps1` fails, use a Node one-off server.
5. **Version bumps touch many files** — see checklist above.
6. **CSS text floor** — no `font-size` below `0.8rem` / `10px` anywhere in `styles.css`.

---

## Validation Commands

```powershell
# JS syntax sweep
Get-ChildItem -Recurse -Filter *.js | Where-Object { $_.FullName -notmatch '\\node_modules\\' } | ForEach-Object { node --check $_.FullName }

# CSS text floor check (should return 0)
Select-String -Path styles.css -Pattern "font-size:\s*(0\.[0-7][0-9]?rem|0\.[0-7][0-9]?em|[0-9](\.[0-9]+)?px)" | Measure-Object

# Version string scan (replace OLD with previous version)
Select-String -Path *.html,boot.js,SAVEPOINT_RECREATION_SPEC.md,content\Config.js -Pattern "vOLD"

# Git status before any staging
git status --short --branch
```

---

## Work Approach

1. `git status --short --branch` first
2. Read build notes near top of `content/Config.js`
3. Scope: is this content / system logic / UI rendering / CSS / release?
4. Make focused edits
5. Run relevant validation command
6. Bump `APP_VERSION` for meaningful changes
7. Update build notes for user-facing changes
8. **Update Session Log below before closing**

---

## Session Log

> After each session, append an entry. Keep entries short — 3–5 bullet points max. Delete entries older than ~10 sessions.

### 2026-06-15 — CLAUDE.md created
- Created this memory file from `PROJECT_CATCHUP.md` context
- No code changes made
- Current version: `v1.7.9`, last pushed commit: `defb463`
