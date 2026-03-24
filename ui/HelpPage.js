import { BUILDING_ROLE_LEGEND } from "../content/BuildingCatalog.js";
import {
  BUILDING_IMAGE_FILENAME_SAMPLES,
  BUILDING_IMAGE_LOOKUP_EXTENSIONS
} from "../content/BuildingImageFilenameGuide.js";
import { APP_VERSION, BUILD_NOTES } from "../content/Config.js";
import { GLOSSARY_TERMS } from "../content/GlossaryConfig.js";
import { escapeHtml } from "../engine/Utils.js";
import { getManualSaveMeta } from "../systems/StorageSystem.js";

function renderGlossaryPanel() {
  return `
    <section class="panel glossary-panel">
      <div class="panel__header">
        <h3>Rules Glossary</h3>
        <span class="panel__subtle">Short explanations of the terms the city uses most.</span>
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

function renderBuildingRolesPanel() {
  return `
    <section class="panel building-roles-panel">
      <div class="panel__header">
        <h3>Building Roles</h3>
        <span class="panel__subtle">Quick legend for the main building profiles.</span>
      </div>
      <div class="building-roles-panel__list">
        ${BUILDING_ROLE_LEGEND.map((role) => `
          <article class="building-role-chip">
            <strong>${escapeHtml(`${role.emoji} ${role.label}`)}</strong>
            <span>${escapeHtml(role.detail)}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBuildNotesPanel(buildLabel = APP_VERSION) {
  return `
    <section class="panel build-notes-panel">
      <div class="panel__header">
        <h3>Build Notes</h3>
        <span class="panel__subtle">What changed in ${escapeHtml(buildLabel)}.</span>
      </div>
      <p class="help-page__guide-link">
        Need exact artwork filenames? Open
        <a href="./AVAILABLE_BUILDING_IMAGE_FILENAMES.txt" target="_blank" rel="noopener noreferrer">Building Image Filename Guide</a>.
      </p>
      <ul class="build-notes-panel__list">
        ${BUILD_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderBuildingImageGuidePanel() {
  return `
    <section class="panel building-image-guide-panel">
      <div class="panel__header">
        <h3>Building Image Filenames</h3>
        <span class="panel__subtle">Name artwork to match these samples and place the files in assets/images/buildings/.</span>
      </div>
      <div class="building-image-guide-panel__intro">
        <p>Automatic lookup order: ${BUILDING_IMAGE_LOOKUP_EXTENSIONS.map((extension) => escapeHtml(extension)).join(" -> ")}</p>
        <p>Use the exact filename samples below. Crystal Upgrade uses rarity-specific filenames such as Crystal Upgrade__Epic.png.</p>
      </div>
      <div class="building-image-guide-panel__list">
        ${BUILDING_IMAGE_FILENAME_SAMPLES.map((sample) => `<span>${escapeHtml(sample)}</span>`).join("")}
      </div>
      <p class="help-page__guide-link">
        Prefer the plain text version? Open
        <a href="./AVAILABLE_BUILDING_IMAGE_FILENAMES.txt" target="_blank" rel="noopener noreferrer">Building Image Filename Guide</a>.
      </p>
    </section>
  `;
}

function renderReleaseChecklistPanel(state) {
  const hasLocalSave = Boolean(getManualSaveMeta()?.manualSavedAt);
  const hasSharedSave = Boolean(state.transientUi?.firebasePublishedMeta?.updatedAtMs);
  const hasPlacedBuilding = state.buildings.some((building) => building.mapPosition);
  const hasCalendarSnapshot = Object.keys(state.dailyCitySnapshots ?? {}).length > 0;

  const items = [
    {
      label: "Shared Save",
      done: hasSharedSave,
      detail: hasSharedSave ? "Firebase save is present." : "No shared Firebase save detected yet."
    },
    {
      label: "Local Save",
      done: hasLocalSave,
      detail: hasLocalSave ? "Local backup exists." : "Create a local fallback save."
    },
    {
      label: "Player Page",
      done: true,
      detail: "Open index.html and verify the public table view."
    },
    {
      label: "Calendar",
      done: hasCalendarSnapshot,
      detail: hasCalendarSnapshot ? "Chronicle snapshots exist." : "Advance time once and review Chronicle."
    },
    {
      label: "Map",
      done: hasPlacedBuilding,
      detail: hasPlacedBuilding ? "At least one building is placed." : "Place at least one building on the town map."
    }
  ];

  return `
    <section class="panel release-checklist-panel">
      <div class="panel__header">
        <h3>Release Checklist</h3>
        <span class="panel__subtle">A quick GM pass before a session or push.</span>
      </div>
      <div class="release-checklist-panel__list">
        ${items
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
    </section>
  `;
}

export function renderHelpPage(state) {
  return {
    title: "Help",
    subtitle: "References and checks.",
    content: `
      <div class="help-page">
        ${renderGlossaryPanel()}
        ${renderBuildingRolesPanel()}
        ${renderBuildNotesPanel()}
        ${renderBuildingImageGuidePanel()}
        ${renderReleaseChecklistPanel(state)}
      </div>
    `
  };
}