# Crystal Forge — Claude Memory File

> Session memory for Claude Code. Read this first, every session. Update the **Session Log** at the end before closing.
> Full detail: `PROJECT_CATCHUP.md`. Deep rebuild spec: `SAVEPOINT_RECREATION_SPEC.md`. Theme deep-dive: `redesign-parchment-theme.md`.

---

## CSV Rule — read before touching any `.csv`

**Never use a comma as the delimiter.** All CSVs in this folder are **caret-delimited (`^`), UTF-8 with BOM, CRLF**. Comma files import into Excel as a single column on this machine's locale.

Two invariants keep them quote-free, so no field ever splits:

1. delimiter is `^`
2. **no field may contain a `^`** — it never occurs in this prose, so commas and semicolons are both safe inside fields

Readers/writers must pass `delimiter='^'`. `convert-csv-to-caret.py` re-normalises every `dndbeyond-*.csv` and verifies zero quotes and non-ragged rows; run it after any hand edit.

Excel does not auto-detect `^` on double-click — use **Data → From Text/CSV** and set the delimiter to `^`, or add a literal `sep=^` first line to the files (which would then need skipping in every reader).

---

## One-Sentence Summary

Crystal Forge is a static browser-based fantasy settlement simulator (GM control deck + player view) for running a shared city called "the Drift" — no bundler, no framework, plain ES modules.

---

## Current Version

- `APP_VERSION = "v1.7.23"` — `content/Config.js`. Monotonic, used by Firebase publish safety checks.
- `APP_RELEASE_STAGE = "preview"`
- `SAVE_VERSION = 12`
- `MANUAL_SAVE_KEY = "crystal-forge-manual-save-v3"`
- Last pushed: `d81a78c feat(scarred-lands): the Drift's region follows across all three tools; copy-statblock in the catalogue`

**Cache-buster:** the whole tree is now uniform on the **timestamp form** `?v=v1.7.23-20260905130000` (the legacy `?v=2.0.X` tokens are fully gone). Bump by global-replacing the single current token string across all `*.js`/`*.html` (593 occurrences) — one `perl -pi -e` sweep does it — and bump `APP_VERSION` for user-facing changes.

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
| Codex | `codex.html` | `ui/CodexPage.js` | pokédex over `BUILDING_POOLS` + `state.buildings`; filters by rarity / role / discovery |
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

5. **CSS text floor** — aim to keep `font-size` at or above ~`0.72rem` for readable secondary text; captions may dip lower. This is a guideline, not a hard rule: `styles.css` currently has ~85 sub-0.72rem declarations (smallest ~0.58rem), so don't treat any single small value as a regression. Don't add *new* text below ~0.7rem without a reason.

6. **Catalog field propagation is two-step.** `content/BuildingCatalog.js` has `defineBuilding({...})` for source-of-truth definitions AND `createCatalogEntry()` that builds the runtime entry. Adding a new field requires updating BOTH — if you only add it to `defineBuilding`, the field is silently dropped before reaching the runtime catalog. Bit me with `apexNote` in this session.

7. **Roll table normalization preserves GM removals/moves.** `systems/StorageSystem.js:normalizeRollTables` only auto-merges canonical pool entries that don't exist in ANY rarity of the saved table (`knownNames` set). If a building was once in a different rarity in a save, it won't be re-added to the new rarity automatically. To force-add, GM uses Admin Console → Roll Tables editor.

8. **Parchment theme uses `[data-theme="parchment"]` on BOTH `<html>` and `<body>`.** JS in `boot.js`, `app.js` gameState subscriber, boot-time sync, and `toggle-theme` handler all set the attribute on both elements. CSS selectors are `[data-theme="parchment"]` (no element prefix) so they match either host. The toggle persists via `localStorage["crystalforge-theme"]`. Many components use hardcoded rgba dark backgrounds — variable swaps don't reach them; structural overrides live in `styles.css` under the parchment block.

9. **Double-encoded UTF-8 mojibake can hit ANY source file, not just standalone HTML.** Standalone files (`POWERS_REFERENCE.html`, `battle.html`, `DND_MUSIC_GUIDE.html`, `NOTION_TOC.html`) lack the app shell so corruption shows immediately, but `app.js`, `ui/PageShell.js`, `admin/AdminConsole.js`, and several other shell files have been hit too — symptoms like `CORE Â-¾` instead of `CORE ▾` in the top-nav, or `ðŸ'°` instead of `💰` in the resource bar. Cause: source files re-saved through a non-UTF-8 editor. Fix: encode-as-cp1252-with-latin-1-fallback → decode-as-utf-8 over runs that start with `Â`/`Ã`/`â`/`ð`. Algorithm pattern documented in `redesign-parchment-theme.md` Round 2.

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
- **Craft**: crafting, cooldowns, codex, ultima, help

`PAGE_ROUTES` in `content/Config.js` is the canonical list of nav links. To add a page: (1) append to `PAGE_ROUTES`, (2) add the key to the appropriate TOP_NAV_GROUPS entry, (3) import the renderer in `ui/UIRenderer.js` and add a `case` to `resolvePage()`, (4) **bump `UIRenderer.js`'s cache buster in `app.js`** or the browser keeps the old switch statement and your new page silently falls through to `home`.

---

## Theme Toggle Reference

The 📜 / 🌙 button in the top-nav fires `data-action="toggle-theme"`. Implementation lives in `app.js`. Tested fully integrated through 8 rounds documented in `redesign-parchment-theme.md`. If a new dark-only surface appears in parchment, either:
- Add a `[data-theme="parchment"] .selector { background: var(--panel); … }` rule to the structural-overrides block at the top of `styles.css`, OR
- Refactor the original rule to use `var(--panel)` / `var(--bg-1)` instead of a hardcoded rgba.

---

## Session Log

> After each session, append an entry. Keep entries short — 3–5 bullets max. Delete entries older than ~10 sessions.

### 2026-09-05 — Region-sync bridge + copy-statblock (post-publish polish)
- **Same-origin localStorage bridge**: `app.js` `mirrorDriftRegion(state)` writes `settings.driftRegion` → `localStorage["sl_drift_region"]` both in the gameState subscriber AND once at init (subscriber does NOT fire on first load — that gap cost a debug cycle). All `/crystalforge/` pages share this key. The roller (`roller.html` boot + drawRegions) now defaults to and ⛯-marks the Drift's region; the catalogue (`players.html` facetBlock) ⛯-marks it in the Region facet.
- **Copy statblock**: `players.html` NPC detail gains a button → `npcStatblockText(n)` (player-safe plain text) → `navigator.clipboard.writeText`. Works only under real user activation (secure context ✓); verified live via a real click (harness confirmed the OS clipboard write). EN/ΕΛ keys `copySb/copied/copyFail`.
- Verification trap: `computer left_click` with an **emulated** (scaled) viewport lands in the wrong frame — reset to native (`preset:"desktop"`) so screenshot coords map 1:1, then click by coordinate. Programmatic `.click()` and `javascript_tool` calls carry no user activation, so clipboard writes fail there regardless.
- Bumped `APP_VERSION` v1.7.22→v1.7.23 + build note; token sweep to `v1.7.23-20260905130000`. Last commit: `d81a78c`.
- Follow-up (commit `e7c06fd`): catalogue gained **removable filter chips** (all tabs, above results — the mobile win) via `activeChips/chipsBar/bindChips`, and a **🎲 Surprise me** random-NPC button (`data-random`, picks from the filtered pool). players.html only, no token bump (standalone page).
- **Do NOT re-propose sharding the GM roller for speed.** Measured: Pages gzips the NPC CSV to **1.35 MB** (EN) / 1.97 MB (GR) — not the 14 MB on-disk figure — and the char-by-char `parseCSV` does 10k rows in **~100 ms** (a split parser was no faster). The roller already loads in ~1–2s; sharding would add ~14 MB of GM shards or force a pipeline restructure to save ~1s on a single-user tool. Group members are all in-region (0/343 cross-region) if a future need ever makes sharding worthwhile.

### 2026-09-04 — World Catalogue + GM Roller published; the Drift's position bridges the two apps
- New `scarred-lands/players.html` — a faceted, e-commerce-style catalogue over **10,000** player-safe NPCs (8 region shards). Index-driven live-count facets, level slider, region-scoped settlement dropdown, paginated 36/page, sort, `?region=<slug>` URL state, lazy shard-loaded detail, Groups + Settlements tabs, EN/ΕΛ, mobile drawer. **No link to the GM roller.**
- Data pipeline is `build-scarred-lands-players.cjs` (re-runnable, repo root): reads GM CSVs from `scarred-lands/data/`, strips GM-only cols (`Tactics_Note`, `Connections`, groups' `Current_Purpose`), shards by region into `scarred-lands/data-players/`. **User chose to publish BOTH `data/` (GM, secrets included) and `data-players/` publicly** — ~29 MB of CSV now in the repo.
- `scarred-lands/roller.html` (from prior session) auto-fetches `./data/` on load. Bug fixed this session: `afterLoad()` wrote to `#loaded` after `showLoading()` had removed it → caught+mislabeled as "fetch failed". Guarded the write. Region slugs are the shared contract between roller shards, catalogue shards, and the simulator hook.
- Simulator hook: Scarred Lands nav dropdown now = compendium/register/**catalogue/roller**; GM home card sets `settings.driftRegion` (7 world-below regions), persists + publishes, deep-links `players.html?region=<slug>`; player session banner shows it. Handler is `set-drift-region` in app.js (change-delegation, next to `set-dice-type`).
- Bumped `APP_VERSION` v1.7.21→v1.7.22 + build note; global cache-buster sweep (one token, 118 files). Last commit: `b48a1c8`.

### 2026-08-14 — The Drift Register reaches 100 (scarred-lands, not the simulator)
- `scarred-lands/npcs.html` now carries exactly 100 NPCs — 33 heroes / 34 unaligned / 33 villains — assembled by `build-npcs.py` from ten `npc-wave*.py` modules, plus a d100 roll table (heroes 01–33, unaligned 34–67, villains 68–100) and filters by race / class / role / free text / sort.
- 200 portraits generated in ComfyUI (Krea2 turbo, CFG 1.0, 8 steps; busts 832×1216, full-body 768×1344) and converted by `prepare-npc-images.py`. ComfyUI's output dir is `AppData\Local\Comfy-Desktop\ComfyUI-Shared\output`, **not** Documents. Windows Python has no Pillow — run the converter from the Linux sandbox instead.
- Prompt trap, now hit twice (Ushra, then Nis): "fully covered" does not hold when the prompt describes skin in detail and clothing in two words. Name the garments — closed coat, high collar, trousers, boots.
- `check-npc-refs-N.py` caught real errors in every wave; wave 10 alone had six spells assigned to classes whose list does not contain them. Note the Bard list has **no** 9th-level spell in the catalogue at all.
- `.gitignore` covers `npc-wave*.py` and `check-npc-refs*.py` — those files carry every secret, hook and leverage and must never be pushed.
- Last commit: `e7fcdc3`.

### 2026-06-15 — Codex page + source-tree mojibake sweep
- Added Building Codex (`codex.html`, `ui/CodexPage.js`) to the Craft top-nav group: per-rarity progress bars, overall % ring, filters by rarity / role / discovery, discovered cards show art + apex bonus, undiscovered show silhouettes. Verified live with 139 cards (93% discovered on the test save).
- Routing trap caught: when adding a new resolvePage case you MUST bump `UIRenderer.js`'s cache buster in `app.js` (`./ui/UIRenderer.js?v=...`) or the cached switch statement silently sends your new page to the home fallback. Documented in Top-Nav Group Layout section.
- Source-tree mojibake repair: 666 double-encoded sequences swept across 13 files (`app.js` 496, `ui/PageShell.js` 40, `admin/AdminConsole.js` 39, others). Was rendering as `CORE Â-¾`, `ðŸ'°`, etc. in the top-nav and resource bar. Cause: source re-saved through a non-UTF-8 editor. Friction-point #9 expanded.
- Last commit: `1f713f1`.

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
