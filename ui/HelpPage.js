import { BUILDING_ROLE_LEGEND } from "../content/BuildingCatalog.js";
import {
  BUILDING_IMAGE_FILENAME_SAMPLES,
  BUILDING_IMAGE_LOOKUP_EXTENSIONS
} from "../content/BuildingImageFilenameGuide.js";
import { APP_DISPLAY_VERSION, BUILD_NOTES, VERSIONING_RULES } from "../content/Config.js";
import { GLOSSARY_TERMS } from "../content/GlossaryConfig.js";
import { escapeHtml } from "../engine/Utils.js";
import { getManualSaveMeta } from "../systems/StorageSystem.js";

function renderSectionNav() {
  const sections = [
    ["start-here", "Start Here"],
    ["core-loop", "Core Loop"],
    ["buildings", "Buildings"],
    ["economy", "Economy"],
    ["glossary", "Glossary"]
  ];

  return `
    <nav class="help-page__nav" aria-label="Help sections">
      ${sections
        .map(
          ([id, label]) => `
            <a class="button button--ghost help-page__nav-link" href="#${id}">${escapeHtml(label)}</a>
          `
        )
        .join("")}
    </nav>
  `;
}

function renderStartHereSection(state) {
  const hasLocalSave = Boolean(getManualSaveMeta()?.manualSavedAt);
  const hasSharedSave = Boolean(state.transientUi?.firebasePublishedMeta?.updatedAtMs);
  const hasPlacedBuilding = state.buildings.some((building) => building.mapPosition);
  const hasCalendarSnapshot = Object.keys(state.dailyCitySnapshots ?? {}).length > 0;

  const steps = [
    {
      title: "1. Manifest a building",
      detail: "Use Forge to create the first structure. If you are new, start there before touching city management.",
      href: "./forge.html",
      cta: "Open Forge"
    },
    {
      title: "2. Place it in the city",
      detail: "Open City, review the incubator stream, and claim a district once the building is ready.",
      href: "./city.html",
      cta: "Open City"
    },
    {
      title: "3. Read the economy",
      detail: "Use Economy for the calm readout: food runway, workforce pressure, and long-term direction.",
      href: "./economy.html",
      cta: "Open Economy"
    },
    {
      title: "4. Check the chronicle",
      detail: "Chronicle confirms whether the realm is actually reacting to your choices over time.",
      href: "./chronicle.html",
      cta: "Open Chronicle"
    }
  ];

  const checklist = [
    {
      label: "Shared Save",
      done: hasSharedSave,
      detail: hasSharedSave ? "Firebase save is present." : "Publish a shared save before a session."
    },
    {
      label: "Local Save",
      done: hasLocalSave,
      detail: hasLocalSave ? "Local backup exists." : "Create a local fallback save."
    },
    {
      label: "Map Placement",
      done: hasPlacedBuilding,
      detail: hasPlacedBuilding ? "At least one building is placed." : "Place one building so the map is live."
    },
    {
      label: "Chronicle Snapshot",
      done: hasCalendarSnapshot,
      detail: hasCalendarSnapshot ? "Chronicle snapshots exist." : "Advance time once to seed chronicle history."
    }
  ];

  return `
    <section class="panel help-page__section" id="start-here">
      <div class="panel__header">
        <div>
          <h3>Start Here</h3>
          <span class="panel__subtle">The shortest path from zero to a readable city.</span>
        </div>
      </div>
      <p class="help-page__section-intro">
        Crystal Forge is easier when each screen has one job. Start in Forge, move to City to incubate and place, then use Economy and Chronicle to read the consequences.
      </p>
      <div class="help-page__card-grid">
        ${steps
          .map(
            (step) => `
              <article class="help-page__action-card">
                <strong>${escapeHtml(step.title)}</strong>
                <p>${escapeHtml(step.detail)}</p>
                <a class="button button--ghost" href="${step.href}">${escapeHtml(step.cta)}</a>
              </article>
            `
          )
          .join("")}
      </div>
      <div class="help-page__split">
        <article class="help-page__callout">
          <h4>Session Check</h4>
          <div class="release-checklist-panel__list">
            ${checklist
              .map(
                (item) => `
                  <article class="release-checklist-panel__item ${item.done ? "is-complete" : ""}">
                    <strong>${item.done ? "Done" : "Check"} / ${escapeHtml(item.label)}</strong>
                    <p>${escapeHtml(item.detail)}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </article>
        <article class="help-page__callout">
          <h4>Build Notes</h4>
          <p class="help-page__guide-link">Current build: <strong>${escapeHtml(APP_DISPLAY_VERSION)}</strong></p>
          <p class="help-page__guide-link">Versioning policy lives in the config now:</p>
          <ul class="build-notes-panel__list">
            ${VERSIONING_RULES.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}
          </ul>
          <p class="help-page__guide-link">Recent release notes:</p>
          <ul class="build-notes-panel__list">
            ${BUILD_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>
  `;
}

function renderCoreLoopSection() {
  const loop = [
    {
      title: "Manifest",
      detail: "Create buildings in Forge. Quality matters because it scales output, and high quality can push above 100%.",
      href: "./forge.html",
      cta: "Open Forge"
    },
    {
      title: "Queue and raise",
      detail: "Use City to reserve up to five incubator queue slots. The next queued building auto-fills an open incubator slot.",
      href: "./city.html",
      cta: "Open City"
    },
    {
      title: "Place and inspect",
      detail: "Once a building is ready, place it on the map and inspect the full detail card when you need exact effects.",
      href: "./city.html",
      cta: "Review Buildings"
    },
    {
      title: "Read outcomes",
      detail: "Economy shows whether the city is healthy. Chronicle shows whether the world is reacting.",
      href: "./economy.html",
      cta: "Read Economy"
    }
  ];

  return `
    <section class="panel help-page__section" id="core-loop">
      <div class="panel__header">
        <div>
          <h3>Core Loop</h3>
          <span class="panel__subtle">What to do, in order.</span>
        </div>
      </div>
      <div class="help-page__card-grid">
        ${loop
          .map(
            (step) => `
              <article class="help-page__action-card">
                <strong>${escapeHtml(step.title)}</strong>
                <p>${escapeHtml(step.detail)}</p>
                <a class="button button--ghost" href="${step.href}">${escapeHtml(step.cta)}</a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderBuildingsSection() {
  return `
    <section class="panel help-page__section" id="buildings">
      <div class="panel__header">
        <div>
          <h3>Buildings</h3>
          <span class="panel__subtle">What buildings do and how to prepare their presentation.</span>
        </div>
      </div>
      <div class="help-page__split">
        <article class="help-page__callout">
          <h4>Building Roles</h4>
          <div class="building-roles-panel__list">
            ${BUILDING_ROLE_LEGEND.map((role) => `
              <article class="building-role-chip">
                <strong>${escapeHtml(`${role.emoji} ${role.label}`)}</strong>
                <span>${escapeHtml(role.detail)}</span>
              </article>
            `).join("")}
          </div>
        </article>
        <article class="help-page__callout">
          <h4>Artwork Filenames</h4>
          <div class="building-image-guide-panel__intro">
            <p>Automatic lookup order: ${BUILDING_IMAGE_LOOKUP_EXTENSIONS.map((extension) => escapeHtml(extension)).join(" -> ")}</p>
            <p>Use exact filenames like the samples below. Crystal Upgrade uses rarity-specific filenames such as Crystal Upgrade__Epic.png.</p>
          </div>
          <div class="building-image-guide-panel__list">
            ${BUILDING_IMAGE_FILENAME_SAMPLES.map((sample) => `<span>${escapeHtml(sample)}</span>`).join("")}
          </div>
          <p class="help-page__guide-link">
            Need the full plain-text list?
            <a href="./AVAILABLE_BUILDING_IMAGE_FILENAMES.txt" target="_blank" rel="noopener noreferrer">Open Building Image Filename Guide</a>.
          </p>
        </article>
      </div>
    </section>
  `;
}

function renderEconomySection() {
  const cards = [
    {
      title: "Food Runway",
      detail: "If food runway starts shrinking, the city is approaching the fastest failure state. Check this first when things feel unstable."
    },
    {
      title: "Gold and Goods",
      detail: "Gold keeps the city flexible. Goods improve trade-tagged gold buildings, so a healthy goods chain quietly boosts income."
    },
    {
      title: "Workforce",
      detail: "Completed buildings create demand. If general or specialist staffing falls behind, output drops even when resources look healthy."
    },
    {
      title: "Council and Focus",
      detail: "Town Focus is the strategic layer. Use council timing to change priorities instead of reacting to every short-term fluctuation."
    }
  ];

  return `
    <section class="panel help-page__section" id="economy">
      <div class="panel__header">
        <div>
          <h3>Economy</h3>
          <span class="panel__subtle">How to read the calm dashboard.</span>
        </div>
        <a class="button button--ghost" href="./economy.html">Open Economy</a>
      </div>
      <p class="help-page__section-intro">
        Economy is the best page for answering one simple question: is the city getting healthier or weaker as time advances?
      </p>
      <div class="help-page__card-grid">
        ${cards
          .map(
            (card) => `
              <article class="help-page__action-card">
                <strong>${escapeHtml(card.title)}</strong>
                <p>${escapeHtml(card.detail)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderGlossarySection() {
  return `
    <section class="panel help-page__section" id="glossary">
      <div class="panel__header">
        <div>
          <h3>Glossary</h3>
          <span class="panel__subtle">Plain-language definitions for the terms the city uses most.</span>
        </div>
      </div>
      <div class="glossary-panel__list">
        ${GLOSSARY_TERMS.map((entry) => `
          <article class="glossary-panel__item">
            <strong>${escapeHtml(entry.term)}</strong>
            <p>${escapeHtml(entry.detail)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function renderHelpPage(state) {
  return {
    title: "Help",
    subtitle: "Start here, then read the loop, systems, and shared language.",
    content: `
      <div class="help-page">
        ${renderSectionNav()}
        ${renderStartHereSection(state)}
        ${renderCoreLoopSection()}
        ${renderBuildingsSection()}
        ${renderEconomySection()}
        ${renderGlossarySection()}
      </div>
    `
  };
}
