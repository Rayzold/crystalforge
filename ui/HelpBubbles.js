import { escapeHtml } from "../engine/Utils.js";

const HELP_TEXT = {
  "Command Center": "Shows the most important session facts at a glance: current date, population, Drift level, and core resources.",
  "Realm Routes": "Quick routes into the main companion flows: manifesting, operating the town, and reviewing the chronicle.",
  "Realm Goals": "Short session goals that help the table understand what the settlement is trying to achieve next.",
  "First Steps Thread": "A compact early-session guide for getting the first manifestations and placements underway.",
  "Featured Structures": "Highlights notable manifested buildings so the table can quickly revisit important pieces of the city.",
  "Policy Memory": "Shows the recent Town Focus choices so you can remember the city's latest strategic direction.",
  "Mayor's Advice": "A short list of the mayor's current recommendations based on shortages, missing city roles, and neglected operations.",
  "Roll Table Review": "Summarizes how many buildings remain unmanifested in each rarity pool.",
  "Command Shelves": "Organizes Home page information into grouped shelves instead of one long dashboard.",
  "Recent Signals": "A short preview of the latest notable events and archive entries before opening Chronicle.",
  "Command Signals": "High-level session status indicators gathered into one lighter overview block.",
  "Session Banner": "A player-facing summary of the current shared date, holiday, weather, moon phase, and published save timing.",
  "Mayor's Priorities": "A lighter read-only list of what the mayor believes the city most urgently needs right now.",
  "Building Roles": "A small legend explaining the main building role profiles used across cards, tags, and summaries.",
  "Build Notes": "A short list of what changed in the current build so testers know what to look for.",
  "Select Your Crystal": "Choose which crystal tier to manifest from. The available count shows how many rolls remain in that tier.",
  "Manifest Shrine": "The ritual chamber where crystal manifestations are revealed and recorded.",
  "Town Statistics": "The fastest summary of the city's operational state, including population, food runway, and defense.",
  "Session Clock": "Advance time, review the current date, and control how quickly the realm progresses.",
  "Drift Raising Queue": "Shows which incomplete buildings are actively being raised and lets you reorder construction priority.",
  "Emergency Watch": "Warns about food, morale, mana, gold, or support problems before they become citywide crises.",
  "City Stores": "Tracks the city's current stockpiles and daily economic flow.",
  "Districts": "Summarizes district levels and their current synergy effects on the settlement.",
  "Hex District Map": "Place buildings onto the outer hexes and inspect terrain, district influence, and adjacency opportunities.",
  "Forge Ledger": "The current building stream, filtered and sorted for quick review outside the map view.",
  "Citizens": "Breaks down the current population classes and the benefits or strain they bring to the city.",
  "Social Fabric": "Frames the Citizens page as a population view instead of a general operations screen.",
  "Population Command": "Shows support usage and where the city's demographic weight is concentrated right now.",
  "Drift Evolution": "Tracks the Drift's current stage, unlocked abilities, and the next evolution threshold.",
  "Calendar Ledger": "A month view for session dates, event timing, and player or GM notes on specific days.",
  "Chain Threads": "Shows event chains that are still unfolding and the echoes they leave in later entries.",
  "Archive Ledger": "The persistent history of manifestations, milestones, monthly chronicles, and notable admin actions.",
  "Active Events": "Lists the disturbances currently affecting the city and the most recent echoes they left behind.",
  "Authored Building Catalog": "Displays the current rollable building catalog with filters, manifestation state, and manifested quality.",
  "Crystal Forge Admin Console": "The GM control layer for crystals, buildings, citizens, events, roll tables, saves, and debugging tools.",
  "Buildings": "Manage direct building creation, exact manifestations, edits, placement, ruin state, and removals.",
  "Roll Tables": "Edit the rollable building pools by rarity, either as full lists or with single-entry tools.",
  "GM Quick Events": "One-click event triggers for common table-side moments during a live session.",
  "Events": "Trigger any specific event manually or clear the currently active event list.",
  "Session Mode": "Switch between a lighter live-session view and a deeper review-oriented layout.",
  "Save Tools": "Use only the four manual save actions: Save and Load for Firebase, plus Local Save and Local Load for this browser.",
  "Crystals": "Grant, remove, or set crystals and shards by rarity.",
  "Resources": "Directly edit the city's main stockpiles and population totals.",
  "Citizen Management": "Directly control citizen counts, promotions, demotions, and bulk class changes.",
  "Town Focus Council": "Pick the settlement's current focus when the council window opens, or review the active policy."
};

export function createHelpBubble(text) {
  return `
    <div class="help-bubble-wrap">
      <button
        class="help-bubble"
        type="button"
        aria-label="${escapeHtml(text)}"
        title="${escapeHtml(text)}"
      >
        ?
      </button>
      <div class="help-bubble__tooltip">${escapeHtml(text)}</div>
    </div>
  `;
}

let globalHelpListenerBound = false;

export function attachHelpBubbles(root) {
  const headings = root.querySelectorAll(".panel__header h3, .modal__header h2");

  for (const heading of headings) {
    const title = heading.textContent?.trim();
    if (!title || !HELP_TEXT[title]) {
      continue;
    }

    const header = heading.closest(".panel__header, .modal__header");
    if (!header || header.querySelector(".help-bubble-wrap")) {
      continue;
    }

    header.insertAdjacentHTML("beforeend", createHelpBubble(HELP_TEXT[title]));
  }

  root.querySelectorAll(".help-bubble-wrap").forEach((wrap) => {
    const button = wrap.querySelector(".help-bubble");
    if (!button || button.dataset.bound === "1") {
      return;
    }

    button.dataset.bound = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      root.querySelectorAll(".help-bubble-wrap.is-open").forEach((entry) => {
        if (entry !== wrap) {
          entry.classList.remove("is-open");
        }
      });

      wrap.classList.toggle("is-open");
    });
  });

  if (!globalHelpListenerBound) {
    document.addEventListener("click", (event) => {
      if (event.target.closest(".help-bubble-wrap")) {
        return;
      }
      document.querySelectorAll(".help-bubble-wrap.is-open").forEach((entry) => entry.classList.remove("is-open"));
    });
    globalHelpListenerBound = true;
  }
}
