# Crystal Forge — Claude Memory File

> Session memory for Claude Code. Read this first, every session. Update the **Session Log** at the end before closing.
> Full detail: `PROJECT_CATCHUP.md`. Deep rebuild spec: `SAVEPOINT_RECREATION_SPEC.md`. Theme deep-dive: `redesign-parchment-theme.md`.

---

## One-Sentence Summary

Crystal Forge is a static browser-based fantasy settlement simulator (GM control deck + player view) for running a shared city called "the Drift" — no bundler, no framework, plain ES modules.

---

## Current Version

- `APP_VERSION = "v1.7.20"` — `content/Config.js`. Monotonic, used by Firebase publish safety checks.
- `APP_RELEASE_STAGE = "preview"`
- `SAVE_VERSION = 12`
- `MANUAL_SAVE_KEY = "crystal-forge-manual-save-v3"`
- Last pushed: `1187837 feat(buildings): 46 polished 350% apex notes wired through the catalog`

**Cache-buster:** boot.js entry now uses **timestamp form** `?v=v1.7.20-YYYYMMDDHHMMSS` (current `20260615180000`). Older modules still on the legacy `?v=2.0.X` are gradually being migrated. When bumping, prefer the timestamp form for consistency.

---

## Tech Stack

- Vanilla JS ES modules — no React, no Vue, no bundler
- Plain HTML entry pages (one per route)
- `app.js` — single shared controller (~5500 lines, large)
- `styles.css` — all styling, centralized (~19000 lines, large — check cascade carefully)
- Firebase (optional) for realm publishing
- Local: `start-server.ps1` → `http://localhost:8000`

---

## Directory Map

```
content/     Data & config (BuildingCatalog, BuildingPools, Config, Rarities, VehicleConfig, etc.)
systems/     Game logic (ResourceSystem, ExpeditionSystem, CalendarSystem, WeatherSystem, etc.)
ui/          DOM renderers & page surfaces (CityPage, HexMap, PageShell, etc.)
engine/      GameState.js, UIRenderer.js, ModalFocus.js, Utils.js
firebase/    FirebaseSync.js, FirebaseSharedState.js
admin/       AdminConsole.js
fx/          AnimationEngine.js, AudioEngine.js
assets/      audio/, images/buildings/, images/vehicles/, video/
```

---

## Pages & Key Files

| Page | HTML | Key UI | Key Systems |
|------|------|--------|-------------|
| GM Dashboard | `gm.html` | `ui/HomePage.js`, `ui/CrisisBanner.js` | `GoalSystem.js`, `DecisionInboxSystem.js` |
| Forge | `forge.html` | `ui/ForgePage.js`, `ui/ManifestPanel.js`, `ui/CrystalSelector.js` | `GachaSystem.js`, `CrystalSystem.js` |
| Economy | `economy.html` | `ui/ResourcePanel.js` | `ResourceSystem.js`, `BalanceSystem.js` |
| City | `city.html` | `ui/CityPage.js`, `ui/HexMap.js`, `ui/HexMapCanvas.js` | `MapSystem.js`, `ConstructionSystem.js`, `BuildingSystem.js` |
| Citizens | `citizens.html` | `ui/CitizensPage.js` | `CitizenSystem.js`, `WorkforceSystem.js` |
| Expeditions | `expeditions.html` | `ui/ExpeditionsPage.js`, `ui/ExpeditionJourneyModal.js` | `ExpeditionSystem.js` ⚠️ large |
| Vehicles | `vehicles.html` | `ui/VehiclesPage.js` | `content/VehicleConfig.js` |
| Legends | `uniques.html` | `ui/UniqueCitizensPage.js` | `CitizenSystem.js`, `content/UniqueCitizenConfig.js` |
| Equipment | `equipment.html` | `ui/EquipmentSheetPage.js` | `systems/PlayerCharacterSystem.js` |
| Behemoths | `behemoths.html` | `ui/BehemothsPage.js` | `content/BehemothConfig.js` |
| NPCs | `npcs.html` | `ui/NpcsPage.js` | `content/NpcConfig.js` |
| Awakened | `awakened.html` | `ui/AwakenedPage.js` | `content/AwakenedConfig.js` |
| Army | `army.html` | `ui/ArmyPage.js` | aggregates citizens + awakened + vehicles + behemoths |
| Crafting | `crafting.html` | `ui/CraftingPage.js` | template-based + custom items, batch x1/x5/x10 |
| Cooldowns | `cooldowns.html` | `ui/CooldownsPage.js` | `systems/CooldownSystem.js` |
| Chronicle | `chronicle.html` | `ui/ChronicleCalendar.js`, `ui/ChroniclePage.js` | `CalendarSystem.js`, `MonthlyChronicleSystem.js`, `WeatherSystem.js` |
| Ultima | `POWERS_REFERENCE.html` | **standalone** — own dark theme, no app shell | none — static reference doc with sticky back-link strip |
| Player | `player.html` | `ui/PlayerPage.js` | shared screen for players |
| Help | `help.html` | `ui/HelpPage.js` | `content/GlossaryConfig.js` |

---

## Quick File Lookup

- Config / version / routes / build notes → `content/Config.js`
- State shape → `engine/GameState.js`
- Save/load/migrations/test state → `systems/StorageSystem.js`
- All styling → `styles.css` (huge — grep before editing)
- App entry → `boot.js` → `app.js`
- Building data → `content/BuildingCatalog.js`
- Building roll tables → `content/BuildingPools.js` (per-rarity name lists)
- Rarity rules → `content/Rarities.js`
- Map config → `content/MapConfig.js`
- Calendar / holidays → `content/CalendarConfig.js`
- Weather pools → `systems/CalendarSystem.js` (calm) + `WeatherSystem.js` (dramatic, per Notion)
- Theme system + audit script → `redesign-parchment-theme.md`, `find-hardcoded-colors.sh`
- Release script → `release.ps1`

---

## Known Friction Points

1. **`styles.css` is large (~19k lines)** — rules can be overridden lower in the file. Always `grep` before adding. Layered overrides exist for `body[data-theme=…]`, `body[data-page=…]`, and `.game-shell--page-X` selectors.

2. **`systems/ExpeditionSystem.js` is large and tightly coupled** — narrow edits + smoke test after.

3. **City map is performance-sensitive** — never re-render on pointer move. Placement preview is selection-driven. In planner mode, `HexMap` uses `is-placement-lite` (skips roads, district fields, water overlays). The town map canvas in `ui/HexMapCanvas.js` carries dark + parchment palettes that swap from `document.body.dataset.theme` at draw time.

4. **Python may be a Windows Store stub** — if `start-server.ps1` fails, use a Node one-off server.

5. **CSS text floor** — no `font-size` below `0.8rem` / `10px` anywhere in `styles.css`.

6. **Catalog field propagation is two-step.** `content/BuildingCatalog.js` has `defineBuilding({...})` for source-of-truth definitions AND `createCatalogEntry()` that builds the runtime entry. Adding a new field requires updating BOTH — if you only add it to `defineBuilding`, the field is silently dropped before reaching the runtime catalog. Bit me with `apexNote` in this session.

7. **Roll table normalization preserves GM removals/moves.** `systems/StorageSystem.js:normalizeRollTables` only auto-merges canonical pool entries that don't exist in ANY rarity of the saved table (`knownNames` set). If a building was once in a different rarity in a save, it won't be re-added to the new rarity automatically. To force-add, GM uses Admin Console → Roll Tables editor.

8. **Parchment theme uses `[data-theme="parchment"]` on BOTH `<html>` and `<body>`.** JS in `boot.js`, `app.js` gameState subscriber, boot-time sync, and `toggle-theme` handler all set the attribute on both elements. CSS selectors are `[data-theme="parchment"]` (no element prefix) so they match either host. The toggle persists via `localStorage["crystalforge-theme"]`. Many components use hardcoded rgba dark backgrounds — variable swaps don't reach them; structural overrides live in `styles.css` under the parchment block.

9. **Standalone HTML files (`POWERS_REFERENCE.html`, `battle.html`, `DND_MUSIC_GUIDE.html`, `NOTION_TOC.html`) do NOT load the app shell.** They have their own `<style>` blocks. Editing them with non-UTF-8-safe tools can introduce double-encoded mojibake (e.g. `â€"` for em-dash). Fix pattern: `text.encode(cp1252).decode(utf-8)` or targeted string replace.

10. **`.game-shell--page-X` may override grid layout.** Watch for stale `grid-template-columns` overrides for legacy sidebars that are now `display: none`. Forge page hit this — the 220px sidebar slot persisted and split the top-nav visually until restored to single-column.

11. **Two cache-buster conventions in flight.** Some imports use `?v=2.0.X` (older), others use `?v=v1.7.20-YYYYMMDDHHMMSS` (current). Bulk update via PowerShell when bumping.

---

## Validation Commands

```powershell
# JS syntax sweep
Get-ChildItem -Recurse -Filter *.js | Where-Object { $_.FullName -notmatch '\\node_modules\\' } | ForEach-Object { node --check $_.FullName }

# CSS text floor check (should return 0)
Select-String -Path styles.css -Pattern "font-size:\s*(0\.[0-7][0-9]?rem|0\.[0-7][0-9]?em|[0-9](\.[0-9]+)?px)" | Measure-Object

# Hardcoded dark color audit (parchment theme)
bash find-hardcoded-colors.sh

# Version string scan (replace OLD with previous version)
Select-String -Path *.html,boot.js,SAVEPOINT_RECREATION_SPEC.md,content\Config.js -Pattern "vOLD"

# Bulk cache buster bump for a single module (example: BuildingCatalog.js)
$new = 'v1.7.20-YYYYMMDDHHMMSS'
Get-ChildItem -Recurse -Include "*.js","*.html" -File | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.git\\' } | ForEach-Object {
  $c = Get-Content -Raw -LiteralPath $_.FullName
  $n = $c -replace 'BuildingCatalog\.js\?v=v[\d\.\-]+', "BuildingCatalog.js?v=$new"
  if ($n -ne $c) { Set-Content -LiteralPath $_.FullName -Value $n -Encoding utf8 -NoNewline }
}

# Git status before any staging
git status --short --branch
```

---

## Work Approach

1. `git status --short --branch` first
2. Read build notes near top of `content/Config.js`
3. Scope: is this content / system logic / UI rendering / CSS / release?
4. Make focused edits
5. Run relevant validation command + verify via `preview_start` for browser-observable changes
6. Bump cache busters (timestamp form `?v=v1.7.20-YYYYMMDDHHMMSS`) for changed modules
7. Update build notes in `content/Config.js` for user-facing changes
8. Commit with descriptive message + push
9. **Update Session Log below before closing**

---

## Top-Nav Group Layout

`ui/PageShell.js:TOP_NAV_GROUPS` controls the 4 dropdowns:

- **Core**: home, forge, economy, city
- **People**: citizens, npcs, awakened, uniques, equipment
- **World**: expeditions, vehicles, behemoths, army, chronicle
- **Craft**: crafting, cooldowns, ultima, help

`PAGE_ROUTES` in `content/Config.js` is the canonical list of nav links. To add a page: append to `PAGE_ROUTES`, then add the key to the appropriate TOP_NAV_GROUPS entry.

---

## Theme Toggle Reference

The 📜 / 🌙 button in the top-nav fires `data-action="toggle-theme"`. Implementation lives in `app.js`. Tested fully integrated through 8 rounds documented in `redesign-parchment-theme.md`. If a new dark-only surface appears in parchment, either:
- Add a `[data-theme="parchment"] .selector { background: var(--panel); … }` rule to the structural-overrides block at the top of `styles.css`, OR
- Refactor the original rule to use `var(--panel)` / `var(--bg-1)` instead of a hardcoded rgba.

---

## Session Log

> After each session, append an entry. Keep entries short — 3–5 bullets max. Delete entries older than ~10 sessions.

### 2026-06-15 — Apex notes + housekeeping
- Wired 46 polished 350% apex notes onto the building catalog. Bug: `defineBuilding` and `createCatalogEntry` were not propagating new fields — fixed both.
- Added Ultima page (Craft group) linking to `POWERS_REFERENCE.html`, repaired 384 + 355 double-encoded UTF-8 mojibake sequences in that file, added XP cost panel and sticky back-link strip.
- Crafting batch ×5/×10 now works for custom (no-template) items via lazy-captured base name + duration. Reversible via ×1.
- Last commit: `1187837`. Verified live via preview server (port 8000) — zero console errors.

### 2026-06-15 — Parchment theme (8 rounds)
- Added full parchment theme (`[data-theme="parchment"]` on `<html>` + `<body>`, `localStorage` persistence, 📜 toggle in top-nav, town map canvas palette swap).
- 8 fix rounds documented in `redesign-parchment-theme.md` (button overlays, hardcoded panel/card colors, forge dark surfaces, contrast pass with aged-tan body, etc.).
- Fixed unrelated forge layout bug: legacy `.game-shell--page-forge { grid-template-columns: 220px 1fr }` was breaking the top-nav after the sidebar was hidden — collapsed to single column.
- Vehicles roster gained breathing room (cards `minmax(180px → 280px)`, stat grid loosened).

### 2026-06-15 — CLAUDE.md created
- Created this memory file from `PROJECT_CATCHUP.md` context.
- Current version: `v1.7.9`, last pushed commit: `defb463`.
