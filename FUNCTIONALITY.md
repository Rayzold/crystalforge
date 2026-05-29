# Crystal Forge — Functionality Reference

This document describes what every page, system, and GM tool in Crystal Forge does. It's written from the user's perspective — what you see, what each control does, and how the pieces fit together. For architecture notes, see `SAVEPOINT_RECREATION_SPEC.md`.

---

## Overview

Crystal Forge is a browser-based GM console for running a fantasy city simulation called **Drift**. The GM advances time day-by-day, manifests buildings from crystals, manages citizens and expeditions, and tracks the lives of named NPCs, captured monsters, and Legends.

The app is multi-page (one HTML file per route) but shares a single save in `sessionStorage` plus an optional manual local save and an optional Firebase realm save. All UI is rendered from a single `gameState` object — the renderer rewrites `#app` innerHTML on every change.

There is no build step. Everything is vanilla ES modules loaded via `boot.js`.

---

## Pages

Every page shares a left **sidebar** with route links (grouped Core / Management) plus a GM Tools panel, and a main stage with a **page hero**, optional **decision strip**, and the page's own content. The PREVIEW build tag and current Drift date chip sit in the top-right.

### Home (`gm.html`)

The dashboard / quick launcher.

- **Season banner** — current season of the year + the next clear step the GM should take.
- **Pending Decisions** strip — surfaces the active decision inbox with priority sorting (Critical / High / Medium / Low), blocking flag, snooze status. Each item has a Resolve and Snooze button. Decision history rolls up below.
- **Mayor's Short List** — 1–2 suggested next moves driven by `getMayorAdvice()`: gaps in food infrastructure, missing housing, etc.
- **Onboarding phase guide** (only on fresh saves until dismissed) — six-phase arc walking a new GM through their first session.
- **Goal cards** — surface long-running objectives; completing one fires a small reward and toast.
- **Holidays** — next upcoming holiday card with countdown and Chronicle jump.

### Forge (`forge.html`)

Where crystals turn into buildings.

- **Rarity selector** — pick which crystal stack you want to roll from (Common → Uncommon → Rare → Epic → Legendary → Beyond).
- **Manifest button** — consumes one crystal of the selected rarity, picks a building from the rarity's roll list, and triggers the manifest reveal (with art, audio, and optional quick-skip).
- **Manifest Shrine** — recent rolls with art.
- **Manifest panel** — the actual gacha animation when you click Manifest. Honors the **Quick Manifestations** toggle (settings → quick-manifest).
- **Total Rolls** — lifetime counter.
- **Catalog** — opens the full building catalog modal.
- **Admin** — quick link to the Admin Console (or press `` ` ``).

### Economy (`economy.html`)

Resource and building production overview.

- **Resource delta strip** — Gold, Food, Materials, Salvage, Mana with their current values and `+/- X per day` deltas. Click any tile to open the daily breakdown modal (producers, consumers, construction spend, net flow).
- **HUD ribbon** — Gold / Food / Materials / Salvage / Mana / Population / Prosperity / Council. Clicking any resource opens the same breakdown modal. Council shows days-until-next-focus or "Focus Due".
- **Sidebar building lists** — Active / Incubating / Available, with ETA pills on incubating buildings.

### City (`city.html`)

Building manifesto, town map, and crisis surface.

- **Crisis banner** — appears when emergencies/alerts are active (food shortage, housing crisis, fortification gap, etc.).
- **Stream view** — flat list of all buildings, grouped by status (Active / Incubating / Available). Buildings can be pinned (📌).
- **Town Map** — hex map view. Place buildings on cells:
  - **Auto Place** — greedy placement honoring district preferences and bastion-only rules. Supports preview/confirm, defense-only / civilian-only passes, district targeting, compact mode, re-roll, locks.
  - **Map overlays** — District / Adjacency / Defense / Pressure.
  - **Zoom & pan** — scroll-wheel zoom (0.75x–1.85x), click-drag to pan, Reset View button.
  - **Building placement drawer** — click an empty hex to choose from unplaced buildings; arm a placement to chain multiple drops.
  - **Layout presets** — save and restore named map layouts.
- **Building cards** — each has rarity, quality %, construction status, multiplier, district, tags, and actions (Pin, Remove, Inspect). When `432!` is unlocked, an inline quality editor plus -10/-1/+1/+10 nudges appear.
- **Building dossier modal** — full detail of a building (inspect-building action).
- **Construction queue panel** — shows what's actively building, priority order, ETA, and supports pause / resume / promote / demote.

### Citizens (`citizens.html`)

Population overview by class.

- **Class cards** — Farmers, Hunters, Druids, Soldiers, Arcanists, etc. — grouped by Provision / Labor & Industry / Trade & Movement / Security / Knowledge & Specialists / Civic Life.
- Each card shows count by rarity (Common / Rare / Epic), production/consumption notes, and flavor.
- All citizen *adjustments* happen in the Admin Console (Population tab).

### Expeditions (`expeditions.html`)

Send crews out to find rewards, resources, recruits, and Legends.

- **Mission Board** — random weekly missions plus optional day-one special missions. Each card shows mission type (Rescue / Recruit / Resource Run / Crystal Hunt / Monster Hunt / Diplomatic / Pilgrimage / Relic Recovery), risk tier (Low / Medium / High), preferred vehicle/approach, and expected rewards.
- **Refresh Mission Board** button — visible to GM; produces a fresh batch of cards.
- **GM Expedition Tools** strip — refresh + (when `432!` is unlocked) debug tools: Force Return, +1 Day, +Vehicle.
- **Mission picker** — choose a mission, choose a vehicle, choose an approach (Cautious / Balanced / Bold), set duration.
- **Crew team** — assign citizens by class. Each citizen class contributes specific power (e.g. Scouts boost scouting, Druids boost survival, Soldiers boost combat).
- **Supply commitments** — Gold / Food / Materials / Mana with Max buttons. Supply power values: Food 0.14, Gold 0.12, Materials 0.10, Mana 0.20 per unit committed.
- **Instant Results toggle** — sends the crew, calculates the return immediately, opens the debrief without moving the calendar.
- **Approach modifiers** — Cautious × 0.85, Balanced × 1, Bold × 1.35 on reward.
- **Risk modifiers** — Low × 1, Medium × 1.05, High × 1.4 on reward.
- **Base multiplier** — × 6 on the reward formula.
- **Journey debrief** — when a mission returns, a staged route-tracing animation runs through 1–3 choice screens before the final reward modal. The GM picks how the crew handled the situation.
- **Mission outcomes** — resources, recruited citizens (sometimes as Legends), relics that slot into the Drift for ongoing bonuses, trophies, intel for new missions.

### Vehicles (`vehicles.html`)

The fleet — vehicles gate how many expeditions can run at once (1 fleet vehicle = 1 expedition).

- **Land Vehicles**
  - **On Foot** — no vehicle (30 crew, 18 supply, slow, stealthy).
  - **Scout Buggy** — 12 crew, 40 supply, fast, scouts well.
  - **Trail Buggy** — 30 crew, 90 supply, balanced.
  - **Siege Buggy** — 100 crew, 160 supply, heavy & safe, poor scouting.
- **Air Vehicles**
  - **Elemental Skiff** — 30 crew, 110 supply, very fast.
  - **Elemental Frigate** — 80 crew, 220 supply, balanced.
  - **Grand Elemental Airship** — 200 crew, 360 supply, flagship.
- Each card shows total, free, assigned, crew capacity, time/cargo/safety/scouting multipliers, and favored mission tags.
- When `432!` is unlocked: +1 / -1 vehicle count adjustments.

### Legends (`uniques.html`)

Named, unique citizens recruited from expeditions or added manually.

- Each Legend has a class, archetype, title, full name, sigil/route memory, origin label, effect text, arrival line.
- **Featured card** — the most recent or pinned Legend, with full route memory.
- **Roster** — all Legends, each a compact card.
- **Assignments** — a Legend can be assigned to a **District Post**, an **Expedition Wing**, or a **Council Seat** for ongoing specialty bonuses. Assignment is set via the inbox / decision flow.
- **Manual Legend** — Admin Console → Population tab → Manual Legend section.

### Behemoths (`behemoths.html`)

GM-authored character sheets for huge monsters captured and held at the Drift.

- **Roster summary** — Total / Wild / Captured / Bonded / Released counts.
- **Filter row** — search by name or kind + status chip toggles (Wild / Captured / Bonded / Released) + Clear button.
- **Collapsed roster row** — image thumb + name + kind/size · status + Delete. Click to expand into the full sheet.
- **Full sheet** (auto-expanded on add):
  - **Image** — file upload, auto-downscaled to ≤400px long edge as JPEG (prevents localStorage exhaustion). Replace / Clear controls.
  - **Header** — name input, Collapse button, Delete button.
  - **Caption** — captured date (current Drift day).
  - **Kind / Type** — free text (e.g. "Sky Leviathan").
  - **Size** — Large / Huge / Gargantuan / Titanic.
  - **Status** — Wild / Captured / Bonded / Released, each with a tooltip describing what it means.
  - **Temperament** — Feral / Guarded / Curious / Loyal.
  - **Core Stats** — Health, Power, Speed, Defense (loose numeric values, GM's call).
  - **Abilities** — flexible list. Each row: name input + description textarea + Remove. Add Ability appends a new blank row.
  - **Daily Upkeep** — list of resources the behemoth eats per day. Each row: resource (Food / Gold / Materials / Salvage / Mana) + amount + Remove. Add Upkeep appends.
  - **Origin & Lore** — origin text + lore textarea.
- All edits commit on blur to preserve cursor across re-renders.

### Special NPCs (`npcs.html`)

GM-authored character sheets for notable non-citizen people — allies, contacts, rivals, faction figures.

Same pattern as Behemoths, with two differences:
- **No Daily Upkeep section** — NPCs don't consume resources.
- **NPC-specific enums:**
  - **Role:** Civilian / Merchant / Crafter / Soldier / Mage / Noble / Scholar / Wanderer / Outsider
  - **Status:** Active / Friendly / Neutral / Hostile / Departed
  - **Disposition:** Cordial / Cautious / Loyal / Scheming
- Caption shows "Met [date]" instead of "Captured [date]".
- Roster summary chips: Total / Active / Friendly / Neutral / Hostile / Departed.

### Chronicle (`chronicle.html`)

Calendar with notes and event jumps.

- **Monthly calendar grid** — current month with prev/next navigation. Days show event markers (holidays, expedition returns, Drift events, council days).
- **Selected day pane** — events recorded for that day plus a player-notes textarea (Save Note button).
- **Next-holiday jump** — header button scrolls to the next holiday, with a pulse highlight.
- **History panel** — chronological log of game-altering actions (manifests, expeditions, citizen edits, etc.).

### Help (`help.html`)

In-app reference material:
- Rules glossary
- Building roles
- Building image filename guide (with copy-able names)
- Release checklist
- Build notes archive

### Player Mode (`index.html`)

Player-facing shared screen. Stripped chrome, big visuals, no GM controls. Use for table projector. Toggleable **Projector Mode** further hides UI chrome.

---

## Systems & Mechanics

### Crystals & Manifestation

- **Crystals** come in six rarities (Common → Beyond), each tied to a roll list of building names.
- **Shards** are smaller fragments of each rarity. They build up from various sources and can be:
  - Converted up the ladder (`convert-shards` action) at fixed rates.
  - Spent on the **City Empowerment Slot** to push a completed building beyond 100% quality (up to the 350% cap).
- **Empowerment shard cost** scales by quality band: 2 shards / 1% in 100–199%, 3 / 1% in 200–299%, 4 / 1% in 300–350%.
- **Crystal Upgrade** — spend N of one rarity to step up to the next, per the upgrade table.
- **Manifest result** — picks a building name from the rarity's roll list, manifests it as a building entry with a starting quality (varies by rarity baseline), and reveals art + plays the rarity's stinger audio.

### Buildings

- **Lifecycle:** Available → Incubating (queued for construction with resources spent over days) → Active (complete, producing).
- **Construction priority** — ordered list of incubating IDs. The top N (where N = Drift evolution stage's slot count) are actively building. Others are paused.
- **Quality %** — every building has an exact quality 100–350. Higher quality multiplies output.
- **Hero / Expert support** — incubating buildings can be boosted with extra resources to finish faster.
- **Empowerment** — uses matching-rarity shards to push completed buildings above 100%.
- **Ruined state** — buildings can be set ruined by GM, removing their output.
- **Auto Place** — bulk placement of unplaced buildings on the town map.

### Citizens

- 22 classes across 6 groups. See `content/CitizenConfig.js` for the full definitions.
- Each class has production (resources generated per citizen per day), consumption (food/gold consumed), and stat contributions (health, morale, security, defense, prestige, prosperity, goods).
- Three rarities: Common (1x output, 1x upkeep), Rare (1.5x output, 1.1x upkeep), Epic (2.25x output, 1.25x upkeep).
- Admin actions: Add / Remove / Set / Promote / Demote / Reset / Bulk JSON / Random Generator.

### Town Focus (Council)

- Every council cycle (run by `getTownFocusAvailability`), the GM picks a Town Focus that grants bonuses for the cycle (e.g. Sky Mariners, Stone Foundries, Pilgrim Roads, Wartime Bastion, Grand Council).
- **Mayor suggestions** — surfaced when a council pick is pending.
- **Council modal** — opens automatically when due; can be reopened anytime from the inbox.
- **Force focus** — admin action to override the active focus.

### Expeditions

- **Mission templates** drawn from rotating pools per mission type, with themed callsigns.
- **Vehicle traits** influence travel time, cargo capacity, safety, scouting, stealth.
- **Building synergies** — certain buildings boost expedition outcomes (e.g. Adventurers' Guildhall, Cartographer's Loft).
- **Journey resolution** — when crew returns, a multi-stage debrief plays with 1–3 GM choices that shift the final reward composition.
- **Relics & trophies** — special items recovered that slot into the Drift's relic slots for ongoing bonuses, with synergy from matching legend posts, town focuses, and building tags.
- **Reward formula** — `successScore × qualityNoise × baseMultiplier(6) × missionRisk.reward × rewardSynergy × journeyMultiplier`.

### Legends (Unique Citizens)

- Drawn from a curated name pool with archetypes (Wall Marshal, Court Mage, Pilgrim Voice, Wing Captain, etc.).
- Earned via expeditions, granted manually by admin, or rolled from specific events.
- **Route memory** — short narrative of how they came to the Drift, tied to their source expedition type.
- **Assignments** — can be assigned to a District Post (building-specific bonus), Expedition Wing (boosts future expeditions), or Council Seat (boosts town focus).

### Behemoths

- Author your own roster. No automatic effects — the GM uses the sheet as a reference during play.
- **Daily Upkeep** is automated: each day you advance, held behemoths (status **Captured** or **Bonded**) subtract their listed resources from the city stockpiles. Wild and Released behemoths don't consume anything. The drain shows up as a "Behemoth Upkeep" line in the resource breakdown modal and a Behemoths column in the admin Economy Debug table.
- Image uploads downscale to ≤400px JPEG.

### Special NPCs

- Same author-it-yourself pattern as Behemoths, without resource upkeep.
- Image uploads same downscale path.

### Pending Decisions

- Priority inbox aggregating:
  - Council picks due
  - Live crises (food deficit, morale crash, defense gap)
  - Snoozed items returning
  - Expedition journey choices ready
  - Legend assignment opportunities
  - Relic slot openings
- Each item: title, detail, urgency (Critical / High / Medium / Low), blocking flag, snooze controls, Resolve action.
- **Decision history** — last few resolved items roll up below the active queue with date and outcome.

### Calendar & Time

- Custom fantasy calendar in `content/CalendarConfig.js` (12 month names, fantasy day names, AC year suffix).
- **Advance Time** — step day-by-day, +N days, or by preset chunks.
- **Speed multiplier** — 0.5x → 10x affects building construction & expedition pacing.
- **Turn summary modal** — opens after time advances, showing what changed (resources, construction completed, citizen shifts, events).
- **Holidays** — themed dates throughout the year with their own glyphs and accents.

### Resources

- 7 tracked: Gold, Food, Materials, Salvage, Mana, Population, Prosperity.
- Daily flow comes from: building production, citizen production/consumption, district bonuses, town focus modifiers, active events, expedition supply spend.
- Emergencies trigger when a resource trends sharply negative or runs out.

---

## GM Tools

### Admin Console

The hidden GM panel. Open by:
- Typing `432!` anywhere (legacy unlock).
- **Pressing the backtick (`` ` ``) key** anywhere (new shortcut).
- Clicking the **Admin Console** button in the sidebar GM Tools panel.

Tabs:
- **Economy** — GM quick crystal grants, full crystal/shard control, resource setters, district-level overrides, building empowerment.
- **Population** — citizen controls per class, Promote/Demote, Bulk JSON, Reset, **Random Citizen Generator**, Manual Legend, Districts.
- **World** — Drift evolution stage override, Town Focus override, Event triggers, Calendar jumps.
- **System** — speed multiplier, save/load, snapshots, view mode, theme.

#### Random Citizen Generator (Population tab)

- **Amount input** — how many citizens to roll.
- **Eligible Classes** — checklist of all 22 classes, grouped by Provision / Labor & Industry / Trade & Movement / Security / Knowledge & Specialists / Civic Life. Default: all on.
- **Enable All / Disable All** — quick toggle for the whole checklist.
- **Generate Citizens** — picks one class at random per citizen from the eligible pool. Excluded classes never appear. Logs the breakdown to the history and shows a toast with the distribution.

### Density, Text Size, and Concise Mode

In the sidebar GM Tools panel:

- **Density picker** — Comfort / Compact / Dense. Adjusts whitespace and visual breathing room.
- **Text Size picker** — Small (15px) / Medium (16px, default) / Large (18px). Sets the root `<html>` font-size so every `rem` value scales proportionally.
- **Concise Mode toggle** — hides editorial filler across the app:
  - Page hero subtitles
  - Panel subtle captions
  - Behemoth/NPC status detail lines
  - Empty-state explainer blocks ("No abilities recorded yet...")
  - Decision strip explainer paragraphs ("This queue ranks blocking items...")
  - Section helper text ("Loose values. Use whatever scale fits your table.")
  - Sidebar manifest-list empty states
  - Mayor focus line on the page hero
- Setting persists in the save.

### Save / Load

- **Session save** — auto-saved to `sessionStorage` on every state change.
- **Local save** — `localStorage`-backed manual save (Save / Load buttons).
- **Firebase save** — optional cloud save tied to a realm ID. Save / Load buttons in GM Tools.
- **Snapshots** — named in-memory snapshots of the current state, recoverable later.
- **Reset paths:**
  - **Live Session reset** — clean session preset.
  - **Testing Balance reset** — fuller starter inventory for balance testing.
  - **Single Common Crystal reset** — bare-bones bootstrap.

### Build Notes / What Changed

- Each release bumps `APP_VERSION` and adds an entry to `BUILD_NOTES` in `content/Config.js`.
- The "What Changed in this build" modal pops once per new version, then hides until next bump.
- Reopen anytime from the PREVIEW build tag in the page chrome.

### View Modes

- **Live Session** — sidebar shows GM Console label, optimized for actively running a game.
- **Deep Review** — sidebar shows Admin Console label, tuned for solo planning / between-session work.
- **Projector Mode** (Player page only) — hides UI chrome, big text and visuals for casting to a shared screen.
- **Fullscreen** (Player page only) — requests browser fullscreen.

### Hotkeys

| Key | Action |
| --- | --- |
| `` ` `` | Open Admin Console |
| `432!` | Legacy admin unlock (typed anywhere) |
| Number keys 1–9, 0 | Page shortcuts (currently disabled — tooltips only) |

### Dice Roller

In the GM Tools panel:
- Amount input (1–20)
- Die type select (d2 / d4 / d6 / d8 / d10 / d12 / d20 / d100)
- Roll button — logs the roll and total to `lastDiceRoll` and the history list.
- History toggle shows recent rolls.

### Audio & Effects

- Manifest stingers per rarity.
- UI accents for soft / confirm / error events.
- Asset-backed effect hooks for placement, move, construction completion, events, holidays, emergencies, save/load/publish feedback.
- Ambient page loops (file-backed if assets exist).
- **Mute toggle** in GM Tools.

### Animation Engine

- Manifest reveal animation (slow by default, can quick-skip with the Quick Manifestations setting).
- Page enter transitions.
- Town focus ceremony overlay when a new focus is selected.
- Map placement burst effects.
- Building card recent-change pulses.

---

## Data Storage Notes

- **Behemoth and NPC images** are stored as base64 data URLs in the save. Uploads are auto-downscaled to a max 400px long edge as JPEG (~30–80 KB each) to fit comfortably under the ~5–10 MB browser quota.
- **localStorage** holds the manual save and the seen-build-notes marker.
- **sessionStorage** holds the auto-save plus a per-tab Firebase client ID.
- **Firebase** writes go to `realms/<realmId>` when configured.

---

## File Map (Where Things Live)

| Area | Key files |
| --- | --- |
| Entry points | `*.html` files, `boot.js`, `app.js` |
| State | `engine/GameState.js`, `systems/StorageSystem.js` |
| Pages | `ui/*Page.js` (HomePage, ForgePage, CityPage, ChroniclePage, etc.) |
| Page chrome | `ui/PageShell.js` (sidebar, hero, command strip, density/text/concise picker) |
| Modals | `ui/*Modal.js` (BuildNotes, ManifestComplete, ExpeditionJourney, ResourceBreakdown, etc.) |
| Systems | `systems/*System.js` (BuildingSystem, CitizenSystem, ExpeditionSystem, BehemothSystem, NpcSystem, etc.) |
| Content | `content/*Config.js` (CitizenConfig, BehemothConfig, NpcConfig, VehicleConfig, ExpeditionConfig, etc.) |
| Admin | `admin/AdminConsole.js` |
| Audio / FX | `fx/AnimationEngine.js`, `fx/AudioEngine.js` |
| Firebase | `firebase/FirebaseConfig.js`, `firebase/FirebaseSharedState.js` |
| Styles | `styles.css` (single file, ~14k lines, scale documented at top) |
| Modal focus | `engine/ModalFocus.js` |

---

## Conventions

- **Vanilla ES modules**, no framework, no bundler. Add new pages by creating an `.html` entry + a renderer in `ui/`.
- **Render cycle:** every state change calls `renderer.render(state)` which rewrites `#app` innerHTML. Inputs commit on `change` (blur) to avoid cursor loss.
- **Modal focus management** is handled by `ModalFocus.js` — captures pre-render selector signatures and restores focus post-render.
- **Class-name reuse** — when a section reuses another's visual layout (NPCs reusing `.behemoth-card` classes), the JS-level data-actions are scoped to the section (e.g. `set-npc-field` vs `set-behemoth-field`).
- **`transientUi`** holds per-session UI state that should NOT persist (open modals, expanded card ids, filter inputs, draft form state). Lives in `UIRenderer.transientUi`, not in the save.
- **`settings`** holds user-level preferences that SHOULD persist (density, text size, concise mode, theme, dice prefs, etc.). Lives in `state.settings`, normalized on load.

---

*Last updated alongside the v1.7.13 release. Bump this doc whenever a new page, system, or major GM tool ships.*
