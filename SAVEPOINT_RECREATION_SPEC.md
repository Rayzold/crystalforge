# Crystal Forge Save-Point Recreation Spec

## 1. Purpose Of This File

This document is the project save point for Crystal Forge at build `v1.6.10`.

It exists for one reason: if this repository is ever lost, partially damaged, or needs to be rebuilt from scratch, a future developer should be able to recreate the product, architecture, systems, and deployment workflow without reverse-engineering the entire codebase first.

This is not a short README. It is a descriptive product and technical spec for the current state of the project.

## 2. What Crystal Forge Is

Crystal Forge is a browser-based settlement simulator with a strong "GM control surface + player presentation" split.

The game fantasy is:

- You run a city called the Drift.
- You manifest buildings from crystals.
- You incubate and place those buildings on a hex map.
- Buildings, citizens, districts, expeditions, legends, relics, town focuses, and events all feed a shared city simulation.
- Time advances in discrete steps, causing the economy, construction, chronicle, holidays, events, expedition returns, and emergency conditions to evolve.
- The GM-facing pages are rich management tools.
- The Player page is a cleaner presentation layer for shared or projected play.

Crystal Forge is not built as a backend-heavy web app. It is primarily a static, client-side application that runs from local files served over a simple HTTP server.

## 3. Product Shape At This Save Point

The current build includes:

- A multi-page interface with shared state across pages.
- A Home/GM dashboard.
- A Forge page for manifestation.
- An Economy page for trends, runway, and health reading.
- A City page for the map, placement, incubation, and building operations.
- A Citizens page for the population model.
- An Expeditions page for mission board, departures, returns, relics, and journey resolution.
- A Vehicles page for fleet composition and mission-fit reading.
- A Legends page for unique citizens and assignment roles.
- A Chronicle page for long-form history and calendar-based review.
- A Help page that explains the loop, glossary, build notes, and art filename conventions.
- A Player page for cleaner session display.

Major product pillars in the current design:

- Manifestation loop.
- Construction and incubation loop.
- Placement and map planning loop.
- Economy interpretation loop.
- Expedition frontier loop.
- Chronicle and session-history loop.
- Shared Firebase realm publishing for GM-to-player or shared-browser experiences.

## 4. Core Design Intent

The intended feel of the project is:

- Rich and toy-like for the GM.
- Readable and dramatic for the player-facing view.
- Systems-dense, but still navigable through clear pages and panels.
- Built for long-running session play, not just a one-screen idle game.
- Strongly flavored by districts, legends, routes, rituals, strange buildings, and evolving civic identity.

The design is deliberately hybrid:

- Part city builder.
- Part resource simulator.
- Part expedition game.
- Part chronicle generator.
- Part session control deck for tabletop-adjacent use.

## 5. Technology And Runtime Model

Crystal Forge is currently implemented as:

- Plain JavaScript ES modules.
- Static HTML entry pages.
- One shared `app.js` controller.
- No React, Vue, or build step.
- No package manager requirement for normal local use.
- One shared stylesheet: `styles.css`.
- A small bootstrap loader: `boot.js`.
- Optional Firebase for shared published realm state.

Runtime assumptions:

- The app should be served via a simple HTTP server.
- The included local run scripts use Python's built-in `http.server` on port `8000`.
- Opening pages directly from `file://` is not the preferred mode.
- `boot.js` exists specifically to surface startup failures instead of leaving the boot panel stuck forever.

Current startup path:

1. An HTML page such as `forge.html` or `gm.html` loads.
2. The HTML page contains `data-page="<page key>"` on `<body>`.
3. The page loads `boot.js`.
4. `boot.js` dynamically imports `app.js`.
5. If startup fails, `boot.js` rewrites the loading panel with an actionable error.
6. `app.js` creates the shared runtime objects, loads/migrates state, and renders the correct page through `UIRenderer`.

## 6. Entry Pages And Routing Model

The app uses one HTML file per page instead of a client-side SPA router.

Current route map:

- `gm.html` -> `home`
- `forge.html` -> `forge`
- `economy.html` -> `economy`
- `city.html` -> `city`
- `citizens.html` -> `citizens`
- `expeditions.html` -> `expeditions`
- `vehicles.html` -> `vehicles`
- `uniques.html` -> `uniques`
- `chronicle.html` -> `chronicle`
- `help.html` -> `help`
- `player.html` -> `player`
- `index.html` currently points at the player presentation shell

Important implementation detail:

- Navigation is page-to-page HTML navigation, not virtual route swapping.
- Shared state survives page movement because the session save is rewritten immediately and reloaded on the next page.

## 7. Directory Responsibilities

Top-level folders and what they mean:

- `content/`
  Static game data and configuration. This is the content bible of the project.
- `systems/`
  Simulation and state mutation logic.
- `ui/`
  Rendering functions for pages, panels, modals, and chrome.
- `engine/`
  Small low-level helpers like `GameState`, random, and utility functions.
- `fx/`
  Audio and animation engines.
- `firebase/`
  Optional shared-state sync layer.
- `admin/`
  GM-only admin console implementation.
- `assets/`
  Audio, video, and building artwork.

Top-level root files:

- `app.js` is the orchestration layer.
- `boot.js` is the boot-time error-resilient loader.
- `styles.css` contains the full visual system.
- `start-server.ps1` and `start-server.bat` run the local static server.
- `release.ps1` and `release.bat` handle local commit/push release flow.

## 8. Content Specs

### 8.1 Versioning

Current save point version:

- `APP_VERSION = "v1.6.10"`
- Release stage: `preview`
- `APP_VERSION` is monotonic and is used as the Firebase publish-safety build number.

Versioning rule in practice:

- Every meaningful repo change should bump the version.
- HTML boot query strings and `boot.js` import query strings should move with the version so browsers do not mix old and new startup assets.

### 8.2 Districts

There are 10 district families:

- Agricultural District
- Trade District
- Residential District
- Military District
- Industrial District
- Arcane District
- Religious District
- Harbor District
- Cultural District
- Frontier District

Districts define:

- Display name
- Color
- Description
- Bonus text
- District-level bonuses

District levels are based on thresholds and influence economy, defense, morale, prosperity, mana, materials, or event posture depending on the district.

### 8.3 Citizens

There are 22 citizen classes:

- Farmers
- Hunters
- Fishermen
- Scavengers
- Druids
- Laborers
- Crafters
- Techwrights
- Merchants
- Skycrew
- Scouts
- Defenders
- Soldiers
- Arcanists
- Medics
- Scribes
- Scholars
- Nobles
- Priests
- Entertainers
- Children
- Elderly

Citizen definitions currently include:

- Group classification
- Emoji
- Resource production
- Resource consumption
- Stat contribution
- Flavor text

Citizen rarity tiers:

- Common
- Rare
- Epic

### 8.4 Buildings

Buildings are one of the core identity layers of the game.

The building catalog:

- Lives in `content/BuildingCatalog.js`.
- Is the source of truth for gameplay metadata and flavor.
- Is classification-heavy and district-aware.
- Includes exact profiles for named structures.
- Supports everything from humble city basics to extreme mythic structures.

Buildings currently support:

- Rarity
- District
- Tags
- Emoji/icon identity
- Flavor text
- Optional building art path
- Resource output/input profile
- City stat contribution
- Population support contribution
- Construction support interactions
- Map placement interactions
- Quality and multiplier scaling
- Pinning and inspection

Art convention:

- Building art lives in `assets/images/buildings/`.
- Filenames are exact-match based.
- `Crystal Upgrade` uses rarity-suffixed filenames like `Crystal Upgrade__Epic.png`.

### 8.5 Map

The city uses a hex map.

Current base map spec:

- Radius: 7
- Main city radius: 6
- Fortification ring radius: 7
- Core ring radius: 1

The map system includes:

- Terrain themes
- Bastion/fortification rules
- Terrain affinity bonuses by tag
- Same-district and related-tag adjacency bonuses
- Placement preview
- Placement recommendation logic
- Auto-place support
- Lockable building IDs
- Map presets stored in settings

### 8.6 Expeditions

Expeditions are no longer a side mechanic. They are one of the main long-term loops.

Current expedition system includes:

- Mission board generation
- Mission types
- Mission rarity
- Duration options
- Approaches such as cautious, balanced, and bold
- Vehicle selection
- Team composition
- Resource provisioning
- Departure
- Return
- Pending staged journey resolution
- Rewards
- Unique citizen discovery
- Relics and trophies

Current expedition mission types:

- rescue
- recruit
- resourceRun
- crystalHunt
- relicRecovery
- diplomatic
- monsterHunt
- pilgrimage

### 8.7 Vehicles

Current fleet spec is six vehicles:

- Scout Buggy
- Trail Buggy
- Siege Buggy
- Elemental Skiff
- Elemental Frigate
- Grand Elemental Airship

Each vehicle defines:

- Travel speed multiplier
- Cargo multiplier
- Safety
- Scouting
- Stealth
- Vehicle type (`land` or `air`)
- Mission affinities

### 8.8 Legends And Unique Citizens

The old unique citizen idea has evolved into a more explicit Legends layer.

Legends currently support:

- Arrival memory
- Named identity
- Source type
- Assignment roles
- Post bonuses

Assignments can affect city systems and expedition structure.

### 8.9 Relics

Relics are expedition returns that can be stored or slotted.

Relic behavior currently includes:

- Recovery from missions
- Storage
- Slotting into relic slots
- Synergy bonuses with matching tags, legends, and town focuses

### 8.10 Town Focus

Town focus is the strategic council layer.

Current focus definitions:

- Food Production
- Defense Readiness
- Crystal Expedition
- Trade Drive
- Civic Restoration

Current interval:

- Every 14 days

Town focus contributes:

- Daily resource modifiers
- Shard generation in some cases
- Flat city stat modifiers
- Mayor framing and council flavor

### 8.11 Goals

The Home page contains structured onboarding goals plus realm goals.

The onboarding arc is intentionally six-phase:

1. Manifest the first building
2. Place the first building
3. Wake the first active building
4. Reach three placed buildings
5. Stabilize food and gold
6. Launch the first expedition

Goals grant small rewards so early progress feels materially meaningful.

### 8.12 Chronicle

Chronicle is a real history surface, not just a log dump.

It currently includes:

- Calendar-based browsing
- Daily city snapshots
- Event and holiday surfacing
- Jump targets
- Monthly rhythm
- Shared session memory
- Chronicle notes
- Links from other pages into exact chronicle dates

### 8.13 Emergencies And Warnings

The emergency system is a key readability layer.

It computes:

- Resource runway
- Morale pressure
- Workforce pressure
- Housing strain
- Mana drain
- Treasury drain
- Food deficit

Emergency output powers:

- Crisis banners
- GM guidance
- Pending decision inbox
- Turn summaries
- Player-facing warning surfaces

## 9. State Model

The application keeps one large serializable state object.

At a high level it contains:

- Version
- Selected rarity
- Filters and settings
- Crystals
- Shards
- Resources
- Citizens
- Citizen rarity roster
- Citizen definitions snapshot
- Vehicle fleet
- Expedition state
- Unique citizens
- Buildings
- Roll tables
- Building catalog
- District definitions and overrides
- Map cells
- District summary
- City stats
- Construction queue and pause/active tracking
- Events
- Chronicle notes
- History log
- Calendar day offset
- Daily city snapshots
- Drift evolution
- Town focus
- Session snapshots
- Admin overrides
- UI state

Important state rules:

- Session state is rewritten immediately on load so migrations persist across page changes.
- Save migration is a first-class concern and lives in `systems/StorageSystem.js`.
- The project assumes older save shapes may exist and normalizes aggressively.

## 10. Persistence Model

There are three persistence layers:

### 10.1 Session Save

- Stored in `sessionStorage`
- Used for normal cross-page continuity
- Key: `crystal-forge-session-state-v1`

### 10.2 Manual Save

- Stored in `localStorage`
- Used as a backup/manual save
- Key: `crystal-forge-manual-save-v3`

### 10.3 Build Notes Seen Marker

- Stored in `localStorage`
- Prevents repeating the build notes modal every load

Additional persistence concepts:

- Session snapshots
- Export/import JSON support
- Reset presets
- Live session reset
- Testing reset
- Single-common-crystal reset

## 11. Firebase Shared Realm Publishing

Firebase is optional but important for shared play.

The app currently contains a real Firebase configuration and uses:

- Anonymous auth
- Firestore
- Collection: `realms`
- Default realm ID: `main`

Shared-state model:

- GM browser can publish a serialized realm state to Firestore.
- Player or other browsers can subscribe to that published state.
- The app supports a specific GM publisher UID model.
- Firestore rules can be set so anonymous-authenticated users can read, but only one GM UID can write.

Important implementation detail:

- Firebase SDK loading is lazy.
- Firebase is no longer imported eagerly at startup.
- This was intentionally changed so a failed Firebase CDN load cannot block the entire app from rendering.

Relevant files:

- `firebase/FirebaseConfig.js`
- `firebase/FirebaseSharedState.js`
- `FIREBASE_GM_RULES.txt`

## 12. UI And Rendering Architecture

There is one renderer class: `UIRenderer`.

Its responsibilities:

- Hold transient UI state
- Resolve page by `pageKey`
- Render the page shell
- Render overlays and modals
- Keep build notes behavior version-aware

Rendering model:

- The app is string-rendered HTML.
- UI modules return structured page descriptors or raw HTML fragments.
- `PageShell` composes the global chrome.
- Page files such as `ForgePage.js`, `CityPage.js`, and `ExpeditionsPage.js` generate the page-specific content.

Current shared chrome includes:

- Sidebar route navigation
- Resource readouts
- Decision inbox
- Build tag
- Density controls
- Building lists
- Dice tools
- Mayor/town-focus surfaces
- Crisis banners

## 13. Major Systems And Their Responsibilities

This is the current system map and should be preserved conceptually even if implementation changes:

- `BuildingSystem.js`
  Manifest results, building mutation, ruin/quality handling.
- `ConstructionSystem.js`
  Incubation, queueing, active slots, ETA logic.
- `MapSystem.js`
  Hex map, placement legality, map cells, adjacency bonuses.
- `CityStatsSystem.js`
  Derived city stats and district-informed totals.
- `ResourceSystem.js`
  Daily deltas, emergencies, runway, city trends.
- `CitizenSystem.js`
  Citizen totals, rarity roster, normalization.
- `ExpeditionSystem.js`
  Mission loop, teams, returns, relics, legends, journey stages.
- `GoalSystem.js`
  Onboarding and realm goals plus rewards.
- `TownFocusSystem.js`
  Focus choices, availability, advice, suggestions.
- `EventSystem.js`
  Active/recent/scheduled event logic.
- `CalendarSystem.js`
  Date math and day offsets.
- `CitySnapshotSystem.js`
  Daily historical snapshots for the chronicle.
- `DriftEvolutionSystem.js`
  Progression stage logic based on manifested development.
- `DecisionInboxSystem.js`
  Urgent decisions, snoozing, short history.
- `StorageSystem.js`
  Save/load/migration backbone.
- `HistoryLogSystem.js`
  Session memory and narrative signal log.
- `WorkforceSystem.js`
  Staffing and building-output suppression logic.

## 14. Audio, Animation, And Presentation

The project has a meaningful presentational layer.

Audio:

- Manifestation music by rarity
- Hybrid/direct-play handling
- Ambient loops
- Effect hooks for placement, events, emergencies, save/load, and other actions

Animation:

- Manifest reveal timing
- UI transitions
- Page transitions
- Placement feedback
- Focus ceremony overlays

Presentation notes:

- The project is intentionally stylized and game-like, not admin-plain.
- The Player page is more restrained than the GM pages.

## 15. Local Development Workflow

To run locally:

1. Open the repository root.
2. Run `start-server.ps1` or `start-server.bat`.
3. Open `http://localhost:8000`.
4. Prefer specific pages like `http://localhost:8000/gm.html` or `http://localhost:8000/forge.html`.

Requirements:

- Python available in PATH.
- Modern browser with ES module and dynamic import support.

Important note:

- The app is designed around being served over HTTP, even though it is static.

## 16. Release Workflow

Current release flow:

- The release button/script reads `APP_VERSION` from `content/Config.js`.
- It stages all changes.
- It commits using the version string as the commit message.
- It pushes to `origin main`.

Important recent hardening:

- The release script now checks git exit codes explicitly.
- A failed `git push` should now stop the script instead of printing a false success line.

Relevant files:

- `release.ps1`
- `release.bat`

## 17. Recreation Requirements

If this project had to be rebuilt from scratch, the recreated version should preserve these non-negotiables:

### 17.1 Product Non-Negotiables

- Multi-page GM-plus-player city management experience.
- Building manifestation loop driven by crystal rarity.
- Construction/incubation loop.
- Hex placement and adjacency gameplay.
- Readable economy and emergency interpretation.
- Expedition board with selectable missions, vehicles, and staged return resolution.
- Legends/unique citizen layer.
- Chronicle/history/calendar layer.
- Optional Firebase shared-state publishing.
- Build-notes/version discipline.

### 17.2 Technical Non-Negotiables

- Static-hostable front end.
- Shared state across page navigation.
- Save migration layer.
- Config-driven content pack structure.
- Separate data/content modules from simulation systems.
- Boot-time failure messaging instead of silent stuck loading.
- Versioned build number used for release and Firebase safety.

### 17.3 Content Non-Negotiables

- 10 districts
- 22 citizen classes
- 6 vehicles
- 8 expedition types
- 5 town focuses
- Manifestable building catalog with art conventions
- Chronicle and city snapshot model
- Decision inbox and emergency guidance

## 18. Recommended Rebuild Order

If rebuilding from zero, do it in this order:

1. Recreate the static HTML shell structure with per-page `data-page` values.
2. Recreate `boot.js` and `app.js` startup flow.
3. Recreate shared `GameState` and `StorageSystem`.
4. Recreate config modules under `content/`.
5. Recreate the page renderer and page shell.
6. Recreate the building, construction, map, and resource systems first.
7. Recreate the chronicle and calendar layer.
8. Recreate expeditions, vehicles, legends, and relics.
9. Recreate Firebase shared-state support.
10. Restore art/audio/video assets and filename conventions.
11. Recreate release and local server scripts.
12. Restore build notes and version history discipline.

## 19. Current Save-Point Notes

As of this save point:

- The app uses a resilient `boot.js` loader.
- Firebase SDK loading is lazy so startup is not blocked by remote CDN failure.
- The release script has explicit git exit-code checking.
- The app version should be treated as moving on every future meaningful repo change.

## 20. Files Future Developers Should Read First

If someone opens this repo cold, these are the most important files to read first:

- `SAVEPOINT_RECREATION_SPEC.md`
- `content/Config.js`
- `app.js`
- `systems/StorageSystem.js`
- `ui/UIRenderer.js`
- `ui/PageShell.js`
- `content/BuildingCatalog.js`
- `systems/ExpeditionSystem.js`
- `systems/ResourceSystem.js`
- `release.ps1`

## 21. Final Summary

Crystal Forge is a static-hosted, JavaScript-driven, systems-heavy settlement simulator with strong GM controls, player presentation, expedition gameplay, chronicle history, and optional Firebase-published shared state.

To recreate it faithfully in the future, do not think of it as "just one page with resources and buildings."

It is a layered product made of:

- content packs
- simulation systems
- page-specific control surfaces
- a shared state model
- historical memory
- session-readability tools
- and release/versioning discipline

This file is the preservation document for that whole shape.
