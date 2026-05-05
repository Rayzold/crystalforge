# Crystal Forge Project Catchup

Last updated: 2026-05-04

Current build: `Preview v1.7.7`

Current save version: `12`

Current pushed commit at time of writing: `df7e4ed Release v1.7.1`

Primary companion document: [SAVEPOINT_RECREATION_SPEC.md](SAVEPOINT_RECREATION_SPEC.md)

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

- `APP_VERSION = "v1.7.7"`
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
<script src="./boot.js?v=1.7.7"></script>
```

Current boot entry:

```js
const APP_ENTRY = "./app.js?v=1.7.7";
```

## Recent History To Know

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

## Current Pending Suggestions

`SUGGESTIONS.md` currently has no saved suggestions waiting.

At the time this doc was created, the obvious next quality pass was:

- Browser visual skim at desktop and mobile widths after the app-wide font-size lift.
- Confirm no button or badge text wraps awkwardly after the readability pass.
- Confirm city map placement still feels fast in the real browser, not only in render smoke tests.

## Good Follow-Up Tasks

Useful next tasks include:

- Run a real browser visual QA pass across all pages after `v1.7.1`.
- Add more formal automated smoke tests for key flows.
- Split parts of `styles.css` if the project ever gets a build step.
- Add a small dev-only diagnostics page or command for save state health.
- Improve map virtualization or canvas rendering if city size grows beyond current SVG comfort.
- Add specific expedition regression tests around instant results and journey debrief resolution.
- Keep updating this file after major releases so future catchup stays cheap.

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
- Shared config/version/routes: `content/Config.js`
- Styling: `styles.css`
- State engine: `engine/GameState.js`
- Storage/migrations/testing state: `systems/StorageSystem.js`
- Resources/economy: `systems/ResourceSystem.js`
- Construction/incubation: `systems/ConstructionSystem.js`
- Buildings: `content/BuildingCatalog.js`, `systems/BuildingSystem.js`
- Manifestation: `systems/GachaSystem.js`, `ui/ManifestPanel.js`
- City page: `ui/CityPage.js`
- Map: `ui/HexMap.js`, `systems/MapSystem.js`, `content/MapConfig.js`
- Citizens: `systems/CitizenSystem.js`, `ui/CitizensPage.js`
- Expeditions: `systems/ExpeditionSystem.js`, `ui/ExpeditionsPage.js`
- Vehicles: `content/VehicleConfig.js`, `ui/VehiclesPage.js`
- Legends: `content/UniqueCitizenConfig.js`, `ui/UniqueCitizensPage.js`
- Chronicle/calendar: `systems/CalendarSystem.js`, `ui/ChronicleCalendar.js`
- Help/glossary: `ui/HelpPage.js`, `content/GlossaryConfig.js`
- Player view: `ui/PlayerPage.js`
- Firebase: `firebase/FirebaseSync.js`
- Release script: `release.ps1`

## Final Mental Model

Think of Crystal Forge as a persistent fantasy city control deck.

The GM manifests buildings, assigns work, places structures, advances time, resolves warnings, sends expeditions, recruits Legends, and watches the city develop a history. The Player page turns that busy state into a more readable presentation layer.

The codebase is static and direct. The advantage is that it is easy to serve and easy to patch. The cost is that `app.js` and `styles.css` are large and must be edited with care.

Most future work should respect three priorities:

1. Keep the game readable.
2. Keep heavy interactive surfaces fast.
3. Keep the version/build notes accurate so frequent iteration stays understandable.
