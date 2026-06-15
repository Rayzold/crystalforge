# Crystal Forge Project Catchup

Last updated: 2026-06-15

Current build: `Preview v1.7.20` (cache-busters use timestamp form `?v=v1.7.20-YYYYMMDDHHMMSS`)

Current save version: `12`

Current pushed commit at time of writing: `9ad0aca docs(claude.md): refresh memory file with session-learned context`. The last tagged release commit is `da3077d Release v1.7.20`; there are ~80 unreleased commits on top of it covering the page redesigns, theming work, and content described below.

Companion documents:

- [SAVEPOINT_RECREATION_SPEC.md](SAVEPOINT_RECREATION_SPEC.md) — long rebuild spec, use when recreating from scratch.
- [CLAUDE.md](CLAUDE.md) — short Claude Code session memory file, refreshed each session.
- [redesign-parchment-theme.md](redesign-parchment-theme.md) — full spec and 8-round fix history of the optional Parchment theme.
- [redesign-admin.md](redesign-admin.md) — admin console redesign brief that drove the v1.7.20-era Admin Console rewrite.
- [SUGGESTIONS.md](SUGGESTIONS.md) — backlog of small UX/QA items.

This document is a human-friendly handoff and follow-up guide for Crystal Forge. It is meant to help a future developer, designer, or Codex session quickly understand what the project is, how it is structured, what has recently changed, and where the next work is likely to happen.

The existing `SAVEPOINT_RECREATION_SPEC.md` is the longer rebuild document. Use that when the goal is to recreate the project from scratch. Use this file when the goal is to catch up quickly and continue working.

## One Sentence Summary

Crystal Forge is a static browser-based fantasy settlement simulator with a GM control surface, a player-facing presentation page, city-building systems, a hex-map placement game, expeditions, vehicles, Legends, relics, a chronicle calendar, and shared state that can be stored locally or published through Firebase.

## What The Game Is About

Crystal Forge is centered on a city called the Drift.

The player or GM manifests buildings from magical crystals, incubates and improves those buildings, places them on a city map, manages citizens and resources, sends expedition crews into the world, recruits named Legends, handles pending decisions, and advances time through days, weeks, months, and years.

The project is not just a simple resource counter. It is a hybrid of:

- City builder.
- Settlement simulator.
- GM dashboard.
- Expedition board.
- Character and Legend roster.
- Player presentation screen.
- Chronicle and calendar tool.
- Long-running session companion.

The tone is systems-rich but playful. The UI is meant to feel like a magical command deck rather than a plain spreadsheet, while still staying readable enough for repeated session use.

## Intended Audience

Crystal Forge appears designed for a person running or guiding a shared fantasy settlement experience.

The GM-facing pages expose lots of controls and state. The Player page presents a cleaner, more readable view that could be projected, screen-shared, or opened by players.

The design assumes:

- One person may operate the GM tools.
- Players may view a cleaner state page.
- The city persists across sessions.
- The app can be updated frequently during development.
- Static hosting and local development matter more than a server-backed application architecture.

## Runtime Model

Crystal Forge is intentionally simple to run.

It is currently:

- Plain JavaScript ES modules.
- Static HTML entry pages.
- One shared `app.js` controller.
- Shared state persisted through browser storage.
- Optional Firebase realm publishing.
- No React.
- No Vue.
- No bundler requirement.
- No package manager requirement for normal use.

In practice, this means most work happens by editing:

- `app.js`
- `styles.css`
- files under `content/`
- files under `systems/`
- files under `ui/`
- the static page entry files such as `city.html`, `gm.html`, and `player.html`

The app should be served over HTTP rather than opened directly from disk, because browser module loading and asset paths are more reliable that way.

## How To Run Locally

The repo includes:

- `start-server.ps1`
- `start-server.bat`

The intended local URL is usually:

```text
http://localhost:8000
```

The PowerShell server script tries `py -m http.server 8000`, then `python -m http.server 8000`.

Important current local note:

- In this workspace, `python.exe` may be the Windows Store stub, so a quick Node static server has sometimes been used for validation instead.

The app itself can be smoke-tested by serving these pages:

- `index.html`
- `gm.html`
- `forge.html`
- `economy.html`
- `city.html`
- `citizens.html`
- `expeditions.html`
- `vehicles.html`
- `uniques.html`
- `chronicle.html`
- `help.html`
- `player.html`

## High-Level Page Map

### `gm.html` / Home

The main GM dashboard. It surfaces summary state, goals, pending decisions, next actions, command strips, event warnings, resource state, and high-level city guidance.

The Home page is the best place to start when trying to understand the current run.

Important UI modules:

- `ui/HomePage.js`
- `ui/PageShell.js`
- `ui/CrisisBanner.js`
- `ui/TownFocusPanel.js`
- `ui/TurnSummaryModal.js`

### `forge.html`

The manifestation page. The player chooses crystals, rolls or manifests buildings, sees reveal effects, and interacts with the core building-generation loop.

Important UI and systems:

- `ui/ForgePage.js`
- `ui/ManifestPanel.js`
- `ui/ManifestCompleteModal.js`
- `systems/GachaSystem.js`
- `systems/CrystalSystem.js`
- `content/BuildingPools.js`
- `content/Rarities.js`

### `economy.html`

The economy reading page. It focuses on resource flows, trends, production, consumption, shortages, and higher-level economy health.

Important systems:

- `systems/ResourceSystem.js`
- `systems/BalanceSystem.js`
- `systems/CityStatsSystem.js`
- `ui/ResourcePanel.js`
- `ui/ResourceBreakdownModal.js`

### `city.html`

The city-building and map page. This is one of the densest areas of the app.

It includes:

- Building stream.
- Active building operations.
- Construction and incubation.
- City workforce.
- Hex map placement.
- District overlays.
- Planner and placement drawer.
- Manual GM building edits.
- Quality controls.
- Map presets.
- Auto placement.

Important files:

- `ui/CityPage.js`
- `ui/HexMap.js`
- `ui/BuildingCard.js`
- `ui/BuildingGrid.js`
- `ui/BuildingDetailModal.js`
- `systems/MapSystem.js`
- `systems/ConstructionSystem.js`
- `systems/BuildingSystem.js`
- `systems/WorkforceSystem.js`
- `content/MapConfig.js`
- `content/BuildingCatalog.js`
- `styles.css`

The city map is performance-sensitive. Recent work in `v1.7.1` removed hover-driven full map re-renders and added a lighter render mode while placement planner mode is armed.

### `citizens.html`

The population and workforce page. It shows citizen classes, workers, support, morale, and related city population state.

Important files:

- `ui/CitizensPage.js`
- `ui/CitizenPanel.js`
- `systems/CitizenSystem.js`
- `systems/WorkforceSystem.js`
- `content/CitizenConfig.js`

### `expeditions.html`

The expedition board and mission-resolution page.

This is now a large subsystem. It includes:

- Mission board.
- Expedition launch.
- Vehicle selection.
- Crew capacity.
- Mission fit.
- Travel time.
- Risk.
- Instant-results toggle.
- Journey debriefs.
- Relic and trophy recovery.
- Unique citizen and Legend discovery.
- Special mission types.

Important files:

- `ui/ExpeditionsPage.js`
- `ui/ExpeditionJourneyModal.js`
- `systems/ExpeditionSystem.js`
- `content/ExpeditionConfig.js`
- `content/VehicleConfig.js`
- `content/UniqueCitizenConfig.js`

Current note:

- Expedition launch has an Instant Results option. When enabled, an expedition can be resolved without advancing the calendar date.

### `vehicles.html`

The fleet page. It displays available land and air vehicles, crew capacity, speed, cargo, mission fit, and vehicle identity.

Important files:

- `ui/VehiclesPage.js`
- `ui/VehicleArt.js`
- `content/VehicleConfig.js`

The current vehicle set includes land buggies and elemental airships.

### `uniques.html` / Legends

This page is labeled Legends in the navigation, even though the file remains `uniques.html`.

It handles named unique citizens and Legends, including:

- Arrival identity.
- Route memory.
- Sigil-style presentation.
- Assignment posts.
- District posts.
- Expedition wings.
- Council seats.
- Relic synergy hooks.

Important files:

- `ui/UniqueCitizensPage.js`
- `content/UniqueCitizenConfig.js`
- `content/UniqueCitizenNamePools.js`
- `systems/CitizenSystem.js`
- `systems/ExpeditionSystem.js`

Recent admin feature:

- Admin can manually add a Legend from the Population tab by choosing archetype, route source, name, title, effect text, and origin notes.

### `chronicle.html`

The calendar and long-form history page.

It includes:

- Calendar view.
- Weather.
- Moon phases.
- Holidays.
- Yearly events.
- City snapshots.
- Day summaries.
- Chronicle notes.
- Jump links from other pages.

Important files:

- `ui/ChroniclePage.js`
- `ui/ChronicleCalendar.js`
- `systems/CalendarSystem.js`
- `systems/MonthlyChronicleSystem.js`
- `systems/CitySnapshotSystem.js`
- `content/CalendarConfig.js`

### `behemoths.html`, `npcs.html`, `awakened.html`

Three roster pages added across the v1.7.10-v1.7.18 cycle. Each follows the same compact-row-then-expanded-sheet pattern with search and status filters and per-record portrait upload that is auto-downscaled to keep saves small.

- **Behemoths** — captured/bonded huge monsters with daily upkeep. Held behemoths subtract their listed food/gold/materials/salvage/mana from the city every day. Owned by `ui/BehemothsPage.js`, content in `content/BehemothConfig.js`.
- **NPCs** — notable people authored as character sheets (image, role, status, core stats, abilities, lore) without resource upkeep. `ui/NpcsPage.js`, `content/NpcConfig.js`.
- **Awakened** — Scarred Lands superhumans with grades F through S, ability archetypes from the world bible, six attributes, recruitment status. `ui/AwakenedPage.js`, `content/AwakenedConfig.js`. Awakened can also be assigned to expeditions for a large power bonus (see Expeditions section).

### `army.html`

A muster page that consolidates the city's fighting strength: martial citizen units split offensive/defensive, Awakened operatives by grade, active defensive structures, the vessel fleet, and held behemoth war beasts. `ui/ArmyPage.js`. Aggregates from existing systems — no separate state.

### `crafting.html`

Date-based item tracking that drains the town economy while items are in progress. Each item has start date, duration in days, daily resource costs, a crafting building (one active item per building), and an optional crafter (Advanced / Experienced / Master speed tiers).

- A library of `CRAFTING_TEMPLATES` auto-fills name, duration, and per-day costs by category (perm / cons / scroll / potion).
- Custom items skip the template and let the user enter everything manually.
- **Batch ×5 / ×10 buttons** apply a time-discount formula (×5 → 50% time per unit, ×10 → 30% time per unit) to both template AND custom items. The custom-item branch lazy-captures the typed name + duration as the base, so toggling between ×1/×5/×10 is fully reversible.

`ui/CraftingPage.js`, batch + template helpers in `app.js`.

### `cooldowns.html`

A page for Seeker / Oracle / NPC / custom cooldowns. Each entry has a start date (day/month/year picker, defaults to today), a length in days, and a "Ready!" indicator + splash toast when it hits 100%. `ui/CooldownsPage.js`, `systems/CooldownSystem.js`. Toast events for cooldown readiness are dispatched globally from `ui/UIRenderer.js` so the splash fires regardless of which page the GM is on.

### `equipment.html`

The Equipment Sheet page — a player-character paperdoll with 13 slots, sigil, identity, notes, and a wealth section (GP plus arbitrary item list). Lives in `ui/EquipmentSheetPage.js` and `systems/PlayerCharacterSystem.js`.

### `help.html`

The reference page.

It includes:

- Help topics.
- Glossary.
- Build notes.
- Rules reference.
- Art filename guidance.
- Release and troubleshooting reference.

Important files:

- `ui/HelpPage.js`
- `content/GlossaryConfig.js`
- `content/BuildingImageFilenameGuide.js`

### Standalone HTML files (no app shell)

A few HTML files in the repo are deliberately standalone — they have their own `<style>` block, do not load `boot.js`, and are not part of the app's state-driven page system. They appear in the top-nav (Craft group) as links rather than app routes.

- **`POWERS_REFERENCE.html` (Ultima)** — the player-facing powers reference. Dark, Georgia-serif. Contains a tier filter UI (1-5), a per-path filter (Knowledge / Purity / Elementalism / Materialism), the powers grid itself, an XP cost panel at the top, and a sticky `← Crystal Forge` back-link strip. Hard-coded as a static doc rather than an app page because the layout/style is intentionally print-friendly and the data does not need to live in game state.
- **`DND_MUSIC_GUIDE.html`** — session music guide.
- **`NOTION_TOC.html`** — campaign index mirrored from Notion.
- **`battle.html`** — battle tool (not yet linked from the nav).
- **`index.html`** — redirect stub that forwards to `gm.html`.

When editing the standalone files, watch for **double-encoded UTF-8 mojibake** (`â€"`, `Â·`, etc.) if the editor isn't UTF-8 safe. The fix pattern is to encode-as-cp1252 then decode-as-utf-8, or do targeted string replacements (see the `redesign-parchment-theme.md` Round 2 notes for the lookup table used on `POWERS_REFERENCE.html`).

### `player.html`

The player-facing presentation surface.

It is intended to be clearer and less control-heavy than GM pages. It shows session state, featured buildings, resources, citizens, holidays, and other player-relevant information.

Important files:

- `ui/PlayerPage.js`
- `ui/PageShell.js`
- `ui/ResourcePanel.js`

## Core State Model

The core state is held in a central game state object and passed through renderers and systems.

Important files:

- `engine/GameState.js`
- `systems/StorageSystem.js`
- `app.js`
- `ui/UIRenderer.js`

The current save version is:

```js
export const SAVE_VERSION = 12;
```

Storage keys and versioning live in:

- `content/Config.js`

Important constants:

- `APP_VERSION = "v1.7.9"`
- `APP_RELEASE_STAGE = "preview"`
- `MANUAL_SAVE_KEY = "crystal-forge-manual-save-v3"`
- `FIREBASE_DEFAULT_REALM_ID = "main"`
- `SPEED_MULTIPLIERS = [0.5, 1, 2, 3, 5, 10]`

The app treats `APP_VERSION` as a monotonic publish-safety number. Do not roll it backward.

## State Persistence And Publishing

Crystal Forge supports browser-local state and Firebase publishing.

Relevant files:

- `systems/StorageSystem.js`
- `firebase/FirebaseSync.js`
- `FIREBASE_GM_RULES.txt`
- `release.ps1`
- `release.bat`

Firebase config is stored in `content/Config.js`.

The release script:

1. Reads `APP_VERSION`.
2. Runs `git add .`.
3. Commits using the version string.
4. Pushes to `origin/main`.

Manual command-line release has also been used.

## Main Content Files

The `content/` directory is mostly data and configuration.

Important files:

- `BuildingCatalog.js`: the main building catalog. This is large and central.
- `BuildingPools.js`: manifestation pool groupings.
- `BuildingImageFilenameGuide.js`: rules for art asset names.
- `CalendarConfig.js`: months, holidays, moon/weather style data.
- `CitizenConfig.js`: citizen classes and population configuration.
- `Config.js`: versioning, routes, build notes, tuning constants, Firebase config.
- `DistrictConfig.js`: district definitions.
- `DriftEvolutionConfig.js`: long-term city evolution settings.
- `EventPools.js`: event pools and city incident material.
- `ExpeditionConfig.js`: mission templates, expedition tuning, callsign pools.
- `GlossaryConfig.js`: help and rules glossary terms.
- `MapConfig.js`: map radius, terrain themes, hex size, placement config.
- `Rarities.js`: rarity order, color, and power scaling.
- `TownFocusConfig.js`: town focus definitions.
- `UniqueCitizenConfig.js`: unique citizen and Legend archetypes.
- `UniqueCitizenNamePools.js`: name pools for Legends and unique citizens.
- `VehicleConfig.js`: vehicle tiers and stats.

## Main System Files

The `systems/` directory contains game logic.

Important systems:

- `BalanceSystem.js`: balance reset and tuning helpers.
- `BuildingSystem.js`: building multipliers and building-level logic.
- `CalendarSystem.js`: calendar advancement, dates, holidays.
- `CitizenSystem.js`: population, unique citizen, Legend logic.
- `CityConditionSystem.js`: warning and crisis conditions.
- `CitySnapshotSystem.js`: snapshot generation for chronicle/calendar views.
- `CityStatsSystem.js`: summary city statistics.
- `ConstructionSystem.js`: incubation, construction progress, growth speeds, support.
- `CrystalSystem.js`: crystal inventory and crystal behavior.
- `DecisionInboxSystem.js`: pending decisions, snooze, resolution, history.
- `DistrictSystem.js`: district summaries.
- `DriftEvolutionSystem.js`: long-term Drift evolution.
- `EventSystem.js`: events, chains, holiday/event interaction.
- `ExpeditionSystem.js`: mission board, launch, resolution, relics, journey stages. This file is very large and should be edited carefully.
- `GachaSystem.js`: manifestation roll logic.
- `GoalSystem.js`: onboarding and realm goals.
- `HistoryLogSystem.js`: shared history log helper.
- `MapSystem.js`: cell lookup, placement legality, adjacency, presets, auto placement.
- `MonthlyChronicleSystem.js`: monthly summaries.
- `ResourceSystem.js`: resource production, consumption, breakdowns, economy summaries.
- `ShardSystem.js`: shard behavior.
- `StorageSystem.js`: save/load, migration, testing state creation.
- `TimeSystem.js`: time steps and time advancement.
- `TownFocusSystem.js`: focus state, effects, ceremonies, council.
- `WorkforceSystem.js`: worker assignment and support.

## Main UI Files

The `ui/` directory contains DOM rendering functions and page surfaces.

Important UI files:

- `PageShell.js`: shared page chrome, navigation, build tag, density controls, global panels.
- `UIRenderer.js`: renderer wrapper and transient UI defaults.
- `HomePage.js`: GM dashboard.
- `ForgePage.js`: forge surface.
- `CityPage.js`: city page, building stream, admin operations.
- `HexMap.js`: SVG map rendering, placement drawer, overlays, map status.
- `ExpeditionsPage.js`: expedition board and launch UI.
- `VehiclesPage.js`: fleet page.
- `UniqueCitizensPage.js`: Legends page.
- `ChroniclePage.js`: chronicle wrapper.
- `ChronicleCalendar.js`: calendar grid and day detail.
- `PlayerPage.js`: player-facing presentation surface.
- `HelpPage.js`: reference and glossary page.
- `BuildingCard.js`: reusable building card.
- `BuildingDetailModal.js`: building dossier modal.
- `ResourceBreakdownModal.js`: resource source/drain modal.
- `BuildNotesModal.js`: build notes modal.
- `TurnSummaryModal.js`: post-time-advance summary modal.
- `ExpeditionJourneyModal.js`: staged expedition return choices.
- `UiIcons.js`: shared icons.

## Styling Model

All styling is currently centralized in:

- `styles.css`

This file is large and has accumulated many component-specific rules. It includes:

- Base theme tokens.
- Dark/light theme variables.
- Shared panels, buttons, cards, nav, modals.
- City-specific UI.
- Map-specific SVG styling.
- Forge-specific UI.
- Home and command strip UI.
- Expedition and vehicle UI.
- Chronicle UI.
- Legends UI.
- Responsive media queries.
- Reduced-motion handling.

Recent important styling change:

- `v1.7.1` raised the app-wide small text floor. The stylesheet should no longer contain font-size rules below `0.8rem` or below `10px`.

When editing CSS:

- Keep text readable.
- Avoid increasing padding just because text got larger.
- Prefer tighter gaps and grid layouts over large empty panels.
- Be careful with density modes. Comfort, Compact, and Dense can override page spacing.
- Check mobile breakpoints after major typography changes.

## The City Map And Placement System

The city map is an SVG hex map.

Key files:

- `ui/HexMap.js`
- `systems/MapSystem.js`
- `content/MapConfig.js`
- `styles.css`

The map includes:

- Reserved forge core.
- City plots.
- Bastion ring for defensive buildings.
- Terrain types.
- District influence.
- Roads.
- Water overlays.
- Resonance overlays.
- Building tokens.
- Placement drawer.
- Planner mode.
- Presets.

Important recent performance fix:

- The map no longer stores hover state on every mouseover/mouseout.
- Moving the mouse over the map should not trigger full UI re-renders.
- Placement preview is selection-driven: click/select a hex to inspect or preview.
- When planner mode is armed, `HexMap` uses `is-placement-lite` and skips heavy decorative groups such as roads, district fields, crests, badges, water overlays, and presets.
- Planner no longer automatically enables the full valid-placement overlay.

Performance smoke used after the fix:

```powershell
node --input-type=module -e "import { createTestingBalanceResetState } from './systems/StorageSystem.js'; import { renderHexMap } from './ui/HexMap.js'; const state = createTestingBalanceResetState(); const cells = state.map.cells.filter((cell) => !cell.isReserved).slice(0, 160); state.buildings = cells.map((cell, index) => ({ id: 'perf-building-' + index, name: 'Perf Building ' + index, displayName: 'Perf Building ' + index, rarity: 'Common', district: index % 2 ? 'Trade District' : 'Residential District', tags: ['civic'], iconKey: 'spire', isComplete: true, quality: 100, mapPosition: { q: cell.q, r: cell.r } })); state.ui.selectedBuildingId = state.buildings[0].id; state.transientUi = { mapOverlay: 'District', mapPlannerBuildingId: state.buildings[0].id, mapPlannerMode: 'chain', validPlacementMode: false }; const start = performance.now(); const html = renderHexMap(state); const elapsed = Math.round(performance.now() - start); if (html.includes('<image')) throw new Error('image tags'); if (html.includes('<clipPath')) throw new Error('clip paths'); if (html.includes('hex-map__district-field')) throw new Error('lite placement still renders district fields'); if (html.includes('hex-map__road--main')) throw new Error('lite placement still renders roads'); if (!html.includes('is-placement-lite')) throw new Error('lite placement class missing'); console.log(JSON.stringify({ placedBuildings: state.buildings.length, elapsedMs: elapsed, bytes: html.length, hasLite: html.includes('is-placement-lite') }));"
```

Typical result after `v1.7.1`:

```json
{"placedBuildings":160,"elapsedMs":19,"bytes":311851,"hasLite":true}
```

## Expeditions In More Detail

Expeditions are a major pillar of the app.

They connect:

- Citizens.
- Vehicles.
- Buildings.
- Mission templates.
- Risk.
- Travel time.
- Rewards.
- Relics.
- Legends.
- Chronicle events.
- Turn summaries.

Important concepts:

- Mission board entries are generated and refreshed.
- Vehicles affect speed, capacity, cargo, and mission fit.
- Buildings can contribute expedition bonuses.
- Crews may return with resources, relics, unique citizens, or Legends.
- Journey resolution can involve staged debrief choices.
- The Instant Results toggle resolves an expedition immediately without changing the date.

Because `systems/ExpeditionSystem.js` is large, use focused edits and tests when changing it.

## Legends And Unique Citizens

The app uses the word Legends for the user-facing page, while some code still says unique citizens.

Legends are named characters with:

- Archetype.
- Route source.
- Title.
- Effect text.
- Origin notes.
- Sigil-style identity.
- Assignment options.
- Potential synergy with relics and city focuses.

Admin can manually add a Legend from Population/Admin tooling.

Relevant files:

- `content/UniqueCitizenConfig.js`
- `content/UniqueCitizenNamePools.js`
- `ui/UniqueCitizensPage.js`
- `systems/CitizenSystem.js`
- `systems/ExpeditionSystem.js`
- `app.js`

## Buildings, Art, And Assets

Buildings are catalog-driven.

The main catalog is:

- `content/BuildingCatalog.js`

Building artwork is expected under:

- `assets/images/buildings/`

Vehicle artwork is expected under:

- `assets/images/vehicles/`

Helpful asset docs:

- `HOW_TO_ADD_BUILDING_IMAGES.txt`
- `BUILDING_IMAGE_FILENAME_MAP.txt`
- `BUILDING_IMAGE_PATHS.csv`
- `BUILDING_IMAGE_PATHS_FOR_ADMIN.txt`
- `MISSING_BUILDING_IMAGES_CHECKLIST.txt`
- `assets/images/buildings/README.md`

Recent performance direction:

- Heavy building images were removed from the hex map.
- The map now uses lightweight icon/token rendering instead of embedding many images in SVG.

This was done because many placed buildings caused severe map lag.

## Audio And Media

Media folders:

- `assets/audio/`
- `assets/video/`

Docs:

- `assets/audio/README.md`
- `assets/video/README.md`

Current mascot config lives in `content/Config.js`:

```js
export const MASCOT_MEDIA = {
  enabled: true,
  videoPath: "./assets/video/drift-mascot.mp4",
  label: "Drift mascot"
};
```

Audio hooks have been added for manifestation, placement, construction, events, holidays, save/load/publish, and other feedback moments.

## Versioning Rules

Versioning lives in:

- `content/Config.js`

Important rules:

- `APP_VERSION` is monotonic.
- Current release stage is `preview`.
- While unreleased, patch updates are preferred.
- Do not reset from `v1.x` back to `v0.x`.
- Update HTML cache-buster tags when changing app JS/CSS behavior.
- Update `boot.js` app entry cache-buster.
- Update `SAVEPOINT_RECREATION_SPEC.md` if the save point should track the new version.
- Add a user-facing build note for meaningful changes.

Current cache-buster pattern:

```html
<link rel="stylesheet" href="./styles.css?v=1.7.9" />
<script src="./boot.js?v=1.7.9"></script>
```

Current boot entry:

```js
const APP_ENTRY = "./app.js?v=1.7.9";
```

## Recent History To Know

The full granular changelog lives in `BUILD_NOTES` near the top of `content/Config.js` (it is the array the build-notes modal reads from). The entries below are the high-level themes per release.

### Unreleased work on top of v1.7.20 (June 2026 sessions)

The branch carries ~80 commits since `da3077d Release v1.7.20`. The big themes:

- **Parchment theme** — optional warm aged-paper theme toggled with the 📜 button in the top-nav. Persists to `localStorage["crystalforge-theme"]`. `data-theme="parchment"` attribute set on BOTH `<html>` and `<body>`, all CSS selectors are scoped with no element prefix so they match either host. Variable swaps cover ~30 CSS vars; structural overrides handle the dozens of components that use hardcoded rgba dark backgrounds. Town Map canvas carries dual palettes (`HEX_PALETTES.dark` / `.parchment`) selected from `document.body.dataset.theme` at draw time. Full 8-round fix history in `redesign-parchment-theme.md`.
- **Ultima page** — `POWERS_REFERENCE.html` added to the Craft top-nav group as a standalone static reference doc. XP cost panel at the top (2 / 3 / 4 paths × 5 levels with Ultima cap highlighted), sticky `← Crystal Forge` back-link strip, and ~700 mojibake characters repaired across two rounds (em-dashes, middle dots, ellipses, box-drawing chars, arrows, math signs, path-icon emoji).
- **350% apex notes** — 46 building catalog entries got polished one-line bonuses that fire at the x3 quality cap (e.g. "Every building in the city gains +1 maximum HP." for Wooden Wall). Required threading `apexNote` through both `defineBuilding()` AND `createCatalogEntry()` in `content/BuildingCatalog.js` — the original schema dropped it silently.
- **Forge page redesigns** — Quick Add Crystals panel with `-1 / +1 / +5` per rarity; crystal level cards / manifest switch / manifest sphere / Reality-Level stat tiles all got parchment overrides; legacy `.game-shell--page-forge { grid-template-columns: 220px 1fr }` collapsed back to single-column after the legacy sidebar was hidden (was breaking the top-nav layout).
- **City Stores Quick Edit** — inline number inputs for all 7 city-store resources.
- **Vehicles roster breathing room** — cards `minmax(180px → 280px)`, stat grid loosened so 7 tiles read cleanly inside each card.
- **Admin Console redesign (Rounds 1-4)** — drove from `redesign-admin.md`, dropped the Set button, added citizen spinners, undo toast, bulk confirm, data-confirming attrs.
- **Global search** — buildings, NPCs, awakened, behemoths, legends, characters (`ui/GlobalSearch.js`).
- **Save safety net** — localStorage auto-save plus file save/load buttons so the GM never loses progress.
- **Top-nav shell** — persistent resource bar, alert strip, group nav, sticky chrome.
- **Crafting batch ×5/×10 for custom items** — works for any item, not only potions, with reversible lazy-base capture.

Once a Release v1.7.21 commit lands, much of this should be grouped into a single tagged release in `BUILD_NOTES`.

### v1.7.20

Primary purpose:

- New Army page consolidates the city's fighting strength in one muster.

Important changes:

- Martial citizen units split offensive/defensive, Awakened operatives grouped by grade, active defensive structures, vessel fleet, and held behemoth war beasts all shown side-by-side.

### v1.7.19

Primary purpose:

- Anti-scrying defense buildings and 350% apex notes infrastructure.

Important changes:

- Three new defense buildings: Prohibition Tower (Rare), Brain Fog Tower (Epic), Privacy Mantle (Legendary).
- Buildings can now carry a GM-authored `apexNote` describing the special bonus they gain at the 350% quality cap, shown on building cards and the dossier.
- Newly shipped buildings auto-merge into existing saves' roll tables (`systems/StorageSystem.js:normalizeRollTables`) so they become rollable without manual admin work. Logic preserves GM removals/moves via a `knownNames` set.

### v1.7.18

Primary purpose:

- Awakened page joins management routes.

Important changes:

- Track Scarred Lands superhumans with power grades F through S, ability archetypes from the world bible, six attributes, recruitment status, portraits, lore.

### v1.7.17

Primary purpose:

- Admin economy controls.

Important changes:

- Building Output Rates editor — set each building's per-day resources with x2/x3 tiers (default doubled/tripled but individually hijackable).
- Daily Resource Adjustments — flat city-wide bonuses or drains (good harvest, strong trade season).

### v1.7.16

Primary purpose:

- Behemoth upkeep + roster scaling + save slots + readability picker.

Important changes:

- Held behemoths (Captured / Bonded) subtract daily upkeep from the city, shown as a Behemoth Upkeep line in resource breakdowns and a Behemoths column in the economy debug table.
- Roster pages (Behemoths, NPCs) collapse into compact rows with search and status filters; expanded sheets span full width; uploaded portraits auto-downscale.
- Local saves expanded to three slots; Legends sidebar badge now only flags unassigned Legends; Text Size picker plus Concise Mode added.

### v1.7.12

Primary purpose:

- Special NPCs page + admin shortcut.

Important changes:

- NPCs page lets GMs author notable people without the daily resource upkeep that behemoths use.
- Backtick (\`) key opens the Admin Console instantly.
- Population tab gains a Random Citizen Generator with per-class checkboxes for exclusions.

### v1.7.11, v1.7.13, v1.7.14, v1.7.15

Internal release bumps — no `BUILD_NOTES` additions in the release commit itself. Refer to git log around the date for incremental fixes.

### v1.7.10

Primary purpose:

- Behemoths page debuts.

Important changes:

- GMs can author huge captured monsters as simple character sheets with image, status, core stats, ability lists, and lore.

### v1.7.9

Primary purpose:

- Tiered building empowerment shard costs.

Important changes:

- Empowerment now treats button amounts as requested quality gain instead of raw shard spend.
- Raising buildings from 100%-199% costs 2 same-rarity shards per 1% quality.
- Raising buildings from 200%-299% costs 3 same-rarity shards per 1% quality.
- Raising buildings from 300%-350% costs 4 same-rarity shards per 1% quality.
- City empowerment buttons and the cap readout now show the computed shard cost for the active building.
- Version/cache-busters updated to `1.7.9`.

### v1.7.8

Primary purpose:

- Expedition supply limits and smoother expedition number entry.

Important changes:

- Each expedition vehicle now has an explicit committed-supply hold.
- Expedition launch validation blocks supply commitments above the selected vehicle's supply capacity.
- Committed supply cards show the selected vehicle's supply hold and each resource has a Max button that fills that resource up to the remaining legal capacity.
- Expedition crew and committed supply inputs now commit on change instead of rerendering after every typed digit, so the field stays focused while someone enters a multi-digit amount.
- Version/cache-busters updated to `1.7.8`.

### v1.7.7

Primary purpose:

- Empowerment roster usability.

Important changes:

- The City empowerment slot now asks for rarity first.
- Eligible buildings now list every 100%-349% building for the selected rarity inside a scrollable roster instead of showing only six.
- Version/cache-busters updated to `1.7.7`.

### v1.7.6

Primary purpose:

- Post-manifest empowerment and manual shard conversion.

Important changes:

- The City page now has one separate empowerment slot for completed buildings.
- Empowerment spends same-rarity shards to raise manifested buildings from 100% toward the 350% quality cap without using the five incubator slots.
- Shards no longer auto-convert at 100; Forge now exposes explicit buttons to convert 100 matching shards into one crystal.
- Version/cache-busters updated to `1.7.6`.

### v1.7.5

Primary purpose:

- Resource breakdown access.

Important changes:

- Home dashboard resource cards now open the existing daily breakdown modal.
- Gold, Food, Materials, Salvage, and Mana can be clicked from the Home snapshot to inspect producers, drains, net flow, top sources, and top consumers.
- Materials, Salvage, and Mana breakdowns now include active construction spending as a daily drain when incubation is consuming those resources.
- Version/cache-busters updated to `1.7.5`.

### v1.7.4

Primary purpose:

- Expedition debrief pacing.

Important changes:

- Expedition journey choices now trigger a short route-tracing loading state before the next debrief stage appears.
- The transition disables repeat choice clicks while the resolution is pending.
- Version/cache-busters updated to `1.7.4`.

### v1.7.3

Primary purpose:

- Expedition input guidance.

Important changes:

- Crew assignment cards now show contextual `?` help explaining each class's added power and fit for the selected mission.
- Committed supply cards now show contextual `?` help explaining what Food, Gold, Materials, and Mana add when spent on launch.
- Version/cache-busters updated to `1.7.3`.

### v1.7.2

Primary purpose:

- Persistent date visibility.

Important changes:

- The shared page chrome now shows the current Drift date in a corner chip.
- The date chip includes both the full fantasy calendar wording and a compact `DD/MM/YYYY` format.
- Version/cache-busters updated to `1.7.2`.

### v1.7.1

Primary purpose:

- Readability and city map performance.

Important changes:

- App-wide small text pass.
- Small labels, chips, badges, sidebar text, admin readouts, player panels, expedition cards, chronicle details, and Legend route pills now use a higher text floor.
- City placement avoids hover re-renders.
- Armed placement map uses lighter DOM/SVG output.
- Planner no longer turns on full valid-placement mode by default.
- Version/cache-busters updated to `1.7.1`.

Commit:

- `df7e4ed Release v1.7.1`

### v1.7.0

Primary purpose:

- Manual Legend creation.
- Expedition instant results.
- Building speed options.
- Map performance cleanup.

Important changes:

- Admin can add a Legend manually.
- Expedition launch has an Instant Results toggle.
- Building growth speed includes `0.5x`.
- Building growth speed no longer includes speeds above `10x`.
- Heavy building map art was removed from map rendering.
- Version/cache-busters updated to `1.7.0`.

Commit:

- `f2cdc14 Release v1.7.0`

## Validation Commands

Use these after meaningful changes.

### Full JS Syntax Sweep

```powershell
Get-ChildItem -Recurse -Filter *.js | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.chrome-headless\\|\\.edge-headless\\' } | ForEach-Object { node --check $_.FullName }
```

### Diff Whitespace Check

```powershell
git diff --check
```

Expect possible LF/CRLF warnings on Windows. Treat actual whitespace errors separately.

### Version String Scan

After a version bump:

```powershell
Select-String -Path *.html,boot.js,SAVEPOINT_RECREATION_SPEC.md,content\Config.js -Pattern "v=1.7.0|v1.7.0|1.7.0"
```

Adjust the version strings for the actual old version.

### Static HTTP Smoke

If Python is available:

```powershell
.\start-server.ps1
```

If Python is not available, a Node one-off server can be used in a test command. The recent smoke tested:

- `index.html`
- `gm.html`
- `city.html`
- `forge.html`
- `player.html`
- `expeditions.html`
- `vehicles.html`
- `uniques.html`
- `chronicle.html`
- `help.html`

### CSS Readability Scan

After the `v1.7.1` readability pass, this should return `0`:

```powershell
Select-String -Path styles.css -Pattern "font-size:\s*(0\.[0-7][0-9]?rem|0\.[0-7][0-9]?em|[0-9](\.[0-9]+)?px)" | Measure-Object
```

## Git And Deployment Notes

Current branch:

- `main`

Current remote:

- `https://github.com/Rayzold/crystalforge.git`

Recent pushed commit:

- `df7e4ed Release v1.7.1`

Common flow:

```powershell
git status --short --branch
git add .
git commit -m "Release vX.Y.Z"
git push origin main
```

There is also `release.ps1`, but manual git commands have been used frequently.

Important caution:

- Do not reset or discard user changes.
- This repo often has generated docs/assets and may have dirty work in progress.
- Always inspect `git status --short --branch` before staging.

## Known Friction Points

### CSS Is Large

`styles.css` is very large and has many page-specific sections. Small changes can be overridden later in the file. Search carefully and check the final cascade.

### City Map Can Get Slow

The map is performance-sensitive. Avoid:

- Per-cell expensive computation during pointer movement.
- Re-rendering the whole app on hover.
- Embedding many images in the SVG.
- Running placement validation for every cell unless the user explicitly asks for a valid-placement overlay.

Prefer:

- Selection-driven preview.
- Lightweight SVG tokens.
- Conditional decorative rendering.
- Cached lookups in `systems/MapSystem.js`.

### Expedition System Is Large

`systems/ExpeditionSystem.js` is large and tightly connected to many systems. When editing it, use narrow tests or focused smoke checks.

### Version Bumps Touch Many Files

A version bump may touch:

- `content/Config.js`
- `boot.js`
- every root HTML file
- `SAVEPOINT_RECREATION_SPEC.md`

Keep this mechanical and verify with a scan.

### Python May Not Actually Be Installed

The Windows `python.exe` in this environment may point to a Store stub. If local HTTP smoke fails, try `py`, install Python, or use a small Node server.

### Catalog Field Propagation Is Two-Step

`content/BuildingCatalog.js` has `defineBuilding({...})` for the BUILDING_DEFINITIONS source-of-truth AND `createCatalogEntry()` that builds the runtime catalog entry. Adding a new field requires touching BOTH — if you only add it to `defineBuilding`, the field is silently dropped before reaching the runtime catalog. This bit the `apexNote` rollout. Pattern test: `import('/content/BuildingCatalog.js').then(m => Object.values(m.createBaseBuildingCatalog())[0])` should show the new field.

### Roll Table Normalization Preserves GM Removals/Moves

`systems/StorageSystem.js:normalizeRollTables` only auto-merges canonical pool entries that don't exist in ANY rarity of a saved table (`knownNames` set). If a building was once in a different rarity in a save, it won't be re-added to the new rarity automatically — appearing to "go missing" from rolls. The Admin Console's Roll Tables editor lets the GM add it back manually. This is intentional behaviour designed to preserve deliberate GM removals.

### Parchment Theme Selectors Need No Element Prefix

When adding a parchment override, write `[data-theme="parchment"] .my-class { … }` — NOT `body[data-theme="parchment"]` or `html[data-theme="parchment"]`. The JS toggle sets `data-theme` on both `<html>` and `<body>` so an unprefixed selector matches either. If a new dark-only component appears in parchment, either add a structural override at the top of `styles.css` or refactor the rule to use `var(--panel)` / `var(--bg-1)` instead of a hardcoded rgba.

### Standalone HTML Files Risk Mojibake

`POWERS_REFERENCE.html`, `battle.html`, `DND_MUSIC_GUIDE.html`, and `NOTION_TOC.html` do not load `boot.js` — they have their own `<style>` blocks and run independently. Editors that aren't UTF-8 safe can introduce double-encoded mojibake (typical signs: `â€"` for em-dash, `Â·` for middle dot, `âš¡` for ⚡, `ðŸŒŠ` for 🌊). Fix pattern is encode-as-cp1252 then decode-as-utf-8, or use the targeted replacement table in `redesign-parchment-theme.md` (Round 2 section).

### `.game-shell--page-X` Can Carry Stale Grid Overrides

Per-page shell overrides in `styles.css` may set a `grid-template-columns` that was sized for a legacy sidebar. If the sidebar is hidden but the columns persist, every top-level shell child (top-nav, resource-bar, alert-strip, main) gets squeezed into the wrong column. Forge hit this — the top-nav visibly split until the override was collapsed back to `minmax(0, 1fr)`.

### Two Cache-Buster Conventions In Flight

Older modules import with `?v=2.0.X` (legacy semver). Newer imports use `?v=v1.7.20-YYYYMMDDHHMMSS` (timestamp form, matches `APP_VERSION` plus an event-time stamp). Bulk-update via PowerShell when bumping a module:

```powershell
$new = 'v1.7.20-YYYYMMDDHHMMSS'
Get-ChildItem -Recurse -Include "*.js","*.html" -File | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.git\\' } | ForEach-Object {
  $c = Get-Content -Raw -LiteralPath $_.FullName
  $n = $c -replace 'MyModule\.js\?v=v[\d\.\-]+', "MyModule.js?v=$new"
  if ($n -ne $c) { Set-Content -LiteralPath $_.FullName -Value $n -Encoding utf8 -NoNewline }
}
```

## Current Pending Suggestions

Refer to `SUGGESTIONS.md` for any saved suggestions waiting.

Quality-pass items left from recent sessions:

- Tag a `v1.7.21` release that captures the ~80 unreleased commits since `da3077d Release v1.7.20`, then consolidate the new BUILD_NOTES entries.
- Retroactively migrate already-manifested buildings in active saves so they pick up the new `apexNote` text on existing instances. Newly manifested buildings get them automatically; old saves carry the previous empty value. Could be a one-time admin action ("Refresh apex notes from catalog").
- Sweep the remaining `?v=2.0.X` cache-buster imports across to the timestamp form for consistency.
- Audit standalone HTML files (`POWERS_REFERENCE.html`, `battle.html`, etc.) for residual mojibake before they get edited again.
- Confirm the parchment theme reads cleanly on every page — the systematic audit script `find-hardcoded-colors.sh` covers most surfaces but a real-browser scan at common breakpoints would catch anything missed.

## Good Follow-Up Tasks

Useful next tasks include:

- Run a real-browser visual QA pass across all pages in BOTH themes (dark + parchment) and at common breakpoints.
- Add more formal automated smoke tests for key flows (manifest, place, manage incubator, launch expedition).
- Split parts of `styles.css` if the project ever gets a build step — currently ~19k lines.
- Add a dev-only diagnostics page for save state health (would have caught the roll-table-merge edge case that hides buildings).
- Improve map virtualization or canvas rendering if city size grows beyond current SVG comfort.
- Add specific expedition regression tests around instant results and journey debrief resolution.
- Add Awakened on expeditions to the regression tests once the system stabilises.
- Refactor more hardcoded `rgba(...)` colors in `styles.css` to use CSS vars so future theme work needs fewer structural overrides.
- Consider an automated CI smoke (GitHub Actions) that loads `gm.html`, `forge.html`, `city.html`, `chronicle.html`, etc. via headless Chrome and asserts zero console errors.
- Keep updating this file and `CLAUDE.md` after major releases so future catchup stays cheap.

## How To Approach Future Work

When picking up a new task:

1. Run `git status --short --branch`.
2. Read `content/Config.js` build notes near the top.
3. Read this file for project shape.
4. Use `SAVEPOINT_RECREATION_SPEC.md` for deeper rebuild context.
5. Identify whether the task is content, system logic, UI rendering, CSS, or version/release.
6. Keep edits scoped.
7. Run the relevant checks.
8. Bump `APP_VERSION` for meaningful changes.
9. Update build notes when user-facing behavior changes.
10. Push only when the user asks.

## File Quick Reference

Use this list when trying to find a feature quickly.

- App boot: `boot.js`, `app.js`
- Shared config / version / routes / build notes: `content/Config.js`
- Styling: `styles.css` (also see `find-hardcoded-colors.sh` for theme audits)
- State engine: `engine/GameState.js`
- Storage / migrations / testing state: `systems/StorageSystem.js`
- Resources / economy: `systems/ResourceSystem.js`, `systems/BalanceSystem.js`
- Construction / incubation: `systems/ConstructionSystem.js`
- Buildings (catalog + lifecycle): `content/BuildingCatalog.js`, `content/BuildingPools.js`, `systems/BuildingSystem.js`
- Manifestation / gacha: `systems/GachaSystem.js`, `ui/ManifestPanel.js`, `ui/CrystalSelector.js`
- City page: `ui/CityPage.js`
- Map: `ui/HexMap.js`, `ui/HexMapCanvas.js`, `systems/MapSystem.js`, `content/MapConfig.js`
- Citizens: `systems/CitizenSystem.js`, `systems/WorkforceSystem.js`, `ui/CitizensPage.js`
- Player characters / equipment: `systems/PlayerCharacterSystem.js`, `ui/EquipmentSheetPage.js`
- Expeditions: `systems/ExpeditionSystem.js`, `ui/ExpeditionsPage.js`, `ui/ExpeditionJourneyModal.js`
- Vehicles: `content/VehicleConfig.js`, `ui/VehiclesPage.js`, `ui/VehicleArt.js`
- Legends: `content/UniqueCitizenConfig.js`, `ui/UniqueCitizensPage.js`
- Behemoths: `content/BehemothConfig.js`, `ui/BehemothsPage.js`
- NPCs: `content/NpcConfig.js`, `ui/NpcsPage.js`
- Awakened: `content/AwakenedConfig.js`, `ui/AwakenedPage.js`
- Army (aggregate muster): `ui/ArmyPage.js`
- Crafting: `ui/CraftingPage.js` (templates + custom items + ×5/×10 batch)
- Cooldowns: `ui/CooldownsPage.js`, `systems/CooldownSystem.js`
- Chronicle / calendar: `systems/CalendarSystem.js`, `systems/MonthlyChronicleSystem.js`, `ui/ChronicleCalendar.js`, `ui/ChroniclePage.js`
- Weather: calm pools in `systems/CalendarSystem.js`, dramatic pools and randomizer in `systems/WeatherSystem.js`
- Help / glossary: `ui/HelpPage.js`, `content/GlossaryConfig.js`
- Player view: `ui/PlayerPage.js`
- Top-nav shell: `ui/PageShell.js` (also drives `TOP_NAV_GROUPS` and global search via `ui/GlobalSearch.js`)
- Standalone pages (no shell): `POWERS_REFERENCE.html` (Ultima), `DND_MUSIC_GUIDE.html`, `NOTION_TOC.html`, `battle.html`
- Firebase: `firebase/FirebaseSync.js`, `firebase/FirebaseSharedState.js`, `firebase/FirebaseConfig.js`
- Admin console: `admin/AdminConsole.js`
- Release script: `release.ps1`
- Audit script (hardcoded dark colors): `find-hardcoded-colors.sh`

## Final Mental Model

Think of Crystal Forge as a persistent fantasy city control deck.

The GM manifests buildings, assigns work, places structures, advances time, resolves warnings, sends expeditions, recruits Legends, and watches the city develop a history. The Player page turns that busy state into a more readable presentation layer.

The codebase is static and direct. The advantage is that it is easy to serve and easy to patch. The cost is that `app.js` and `styles.css` are large and must be edited with care.

Most future work should respect three priorities:

1. Keep the game readable.
2. Keep heavy interactive surfaces fast.
3. Keep the version/build notes accurate so frequent iteration stays understandable.
