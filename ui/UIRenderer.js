// Top-level page renderer.
// It selects the correct page shell/content for the current route and injects
// transient overlays like modals, help bubbles, and reveal states.
import { APP_VERSION } from "../content/Config.js?v=v1.7.20-20260615093534";
import { getSeenBuildNotesVersion } from "../systems/StorageSystem.js?v=v1.7.20-20260615093534";
import { renderBuildNotesModal } from "./BuildNotesModal.js?v=v1.7.20-20260615093534";
import { renderChroniclePage } from "./ChroniclePage.js?v=v1.7.20-20260615093534";
import { renderBuildingDetailModal } from "./BuildingDetailModal.js?v=v1.7.20-20260615093534";
import { renderBuildingCatalogModal } from "./BuildingCatalogModal.js?v=v1.7.20-20260615093534";
import { renderCitizensPage } from "./CitizensPage.js?v=v1.7.20-20260615093534";
import { renderCityPage, renderEconomyPage } from "./CityPage.js?v=v1.7.20-20260615093534";
import { renderExpeditionsPage } from "./ExpeditionsPage.js?v=v1.7.20-20260615093534";
import { renderExpeditionJourneyModal } from "./ExpeditionJourneyModal.js?v=v1.7.20-20260615093534";
import { renderForgePage } from "./ForgePage.js?v=v1.7.20-20260615093534";
import { renderHelpPage } from "./HelpPage.js?v=v1.7.20-20260615093534";
import { attachHelpBubbles } from "./HelpBubbles.js?v=v1.7.20-20260615093534";
import { attachListCollapse } from "./CollapsibleList.js?v=v1.7.20-20260615093534";
import { attachHexMapCanvas } from "./HexMapCanvas.js?v=v1.7.20-20260615093534";
import { renderHomePage } from "./HomePage.js?v=v1.7.20-20260615093534";
import { renderHomeHelpModal } from "./HomeHelpModal.js?v=v1.7.20-20260615093534";
import { renderManifestCompleteModal } from "./ManifestCompleteModal.js?v=v1.7.20-20260615093534";
import { ensureMascotBackdrop, renderPageShell } from "./PageShell.js?v=v1.7.20-20260615093534";
import { renderPlayerPage } from "./PlayerPage.js?v=v1.7.20-20260615093534";
import { renderResourceBreakdownModal } from "./ResourceBreakdownModal.js?v=v1.7.20-20260615093534";
import { renderTownFocusCouncilModal } from "./TownFocusCouncilModal.js?v=v1.7.20-20260615093534";
import { renderTurnSummaryModal } from "./TurnSummaryModal.js?v=v1.7.20-20260615093534";
import { renderUniqueCitizensPage } from "./UniqueCitizensPage.js?v=v1.7.20-20260615093534";
import { renderEquipmentSheetPage } from "./EquipmentSheetPage.js?v=v1.7.20-20260615093534";
import { renderVehiclesPage } from "./VehiclesPage.js?v=v1.7.20-20260615093534";
import { renderBehemothsPage } from "./BehemothsPage.js?v=v1.7.20-20260615093534";
import { renderNpcsPage } from "./NpcsPage.js?v=v1.7.20-20260615093534";
import { renderAwakenedPage } from "./AwakenedPage.js?v=v1.7.20-20260615093534";
import { renderArmyPage } from "./ArmyPage.js?v=v1.7.20-20260615093534";
import { renderCraftingPage } from "./CraftingPage.js?v=v1.7.20-20260615093534";
import { renderCooldownsPage } from "./CooldownsPage.js?v=v1.7.20-20260615093534";
import { isCooldownReady } from "../systems/CooldownSystem.js?v=v1.7.20-20260615093534";
import { getMayorSuggestions } from "../systems/TownFocusSystem.js?v=v1.7.20-20260615093534";
import { getDefaultTownFocusPreviewId } from "./TownFocusShared.js?v=v1.7.20-20260615093534";
import { renderTownFocusCeremonyOverlay } from "./TownFocusCeremonyOverlay.js?v=v1.7.20-20260615093534";
import { ModalFocusManager } from "../engine/ModalFocus.js?v=v1.7.20-20260615093534";

export class UIRenderer {
  constructor(root, pageKey = "home") {
    this.root = root;
    this.pageKey = pageKey;
    if (pageKey !== "player") {
      ensureMascotBackdrop();
    }
    this.modalFocus = new ModalFocusManager();
    this.transientUi = {
      hoveredMapCell: null,
      inspectedBuildingId: null,
      catalogOpen: false,
      diceHistoryOpen: false,
      catalogFilters: {
        rarity: "All",
        district: "All",
        status: "All"
      },
      focusEventId: null,
      councilModalOpen: false,
      councilModalCycleKey: null,
      previewTownFocusId: null,
      homeHelpOpen: false,
      homeTownFocusExpanded: false,
      chronicleMonthOffset: null,
      chronicleSelectedDayOffset: null,
      homeShelfTab: "overview",
      cityView: "stream",
      buildingSort: "newest",
      buildingStatusFilter: "All",
      mapPlacementFilter: "All",
      mapOverlay: "District",
      mapLegendOpen: true,
      mapPlannerBuildingId: null,
      mapPlannerMode: null,
      validPlacementMode: false,
      lastPlacement: null,
      mapZoom: 1,
      mapPanX: 0,
      mapPanY: 0,
      mapPlacementPulseCell: null,
      forgeNavCollapsed: true,
      adjacencyPulse: null,
      focusCeremony: null,
      manifestCompleteModal: null,
      expeditionJourneyOpen: false,
      expeditionJourneyTransition: null,
      buildNotesOpen: false,
      buildNotesPromptedVersion: null,
      decisionInboxShowSnoozed: false,
      deferredTurnSummary: null,
      resourceBreakdownKey: null,
      manifestInProgress: false,
      firebasePublishedMeta: null,
      firebaseConnectionState: "idle",
      recentBuildingChanges: {},
      buildingQuickFilter: "All",
      playerHideCompleted: false,
      turnSummaryModal: null,
      projectorMode: false,
      projectorChromeHidden: false,
      expeditionDraft: {
        missionId: null,
        typeId: "rescue",
        vehicleId: "trailBuggy",
        approachId: "balanced",
        durationDays: 7,
        team: {},
        resources: {}
      },
      behemothExpandedIds: [],
      behemothFilter: { query: "", statuses: [] },
      npcExpandedIds: [],
      npcFilter: { query: "", statuses: [] },
      awakenedExpandedIds: [],
      awakenedFilter: { query: "", grades: [], statuses: [] },
      sidebarBuildingQuery: "",
      sidebarBuildingListExpanded: false,
      expeditionTab: "board",
      buildingTextQuery: "",
      craftingFormOpen: false,
      craftingEditItem: null
    };
  }

  syncCouncilModal(state) {
    if (!state.townFocus?.isSelectionPending) {
      if (!this.transientUi.councilModalOpen) {
        this.transientUi.councilModalCycleKey = null;
      }
      return;
    }

    const cycleKey = String(state.townFocus.nextSelectionDayOffset);
    if (this.transientUi.councilModalCycleKey !== cycleKey) {
      this.transientUi.councilModalCycleKey = cycleKey;
      this.transientUi.previewTownFocusId =
        getMayorSuggestions(state)[0]?.focusId ?? getDefaultTownFocusPreviewId(state);
    }
  }

  syncBuildNotesModal() {
    if (this.pageKey === "player") {
      return;
    }
    if (this.transientUi.buildNotesPromptedVersion === APP_VERSION) {
      return;
    }
    if (getSeenBuildNotesVersion() === APP_VERSION) {
      this.transientUi.buildNotesPromptedVersion = APP_VERSION;
      return;
    }
    this.transientUi.buildNotesOpen = true;
    this.transientUi.buildNotesPromptedVersion = APP_VERSION;
  }

  // Detects cooldowns that just transitioned from "cooling" → "ready" since
  // the last render and dispatches a window event per cooldown. The toast
  // listener in app.js turns those events into a "⏱ Foo is ready!" splash.
  // Runs on every page, not just the Cooldowns page, so the GM is alerted
  // even while looking at City / Expeditions / etc.
  checkCooldownReadinessTransitions(state) {
    if (!this._cooldownReadySeen) this._cooldownReadySeen = new Set();
    const dayOffset = state.calendar?.dayOffset ?? 0;
    const cooldowns = Array.isArray(state.cooldowns) ? state.cooldowns : [];
    const currentReadyIds = new Set();
    const newlyReady = [];
    for (const c of cooldowns) {
      if (isCooldownReady(c, dayOffset)) {
        currentReadyIds.add(c.id);
        if (!this._cooldownReadySeen.has(c.id)) newlyReady.push(c);
      }
    }
    // Forget ids that are no longer ready so a re-cool → re-ready cycle
    // fires the toast again the next time it triggers.
    for (const id of this._cooldownReadySeen) {
      if (!currentReadyIds.has(id)) this._cooldownReadySeen.delete(id);
    }
    if (newlyReady.length && typeof window !== "undefined") {
      for (const c of newlyReady) this._cooldownReadySeen.add(c.id);
      // Defer the dispatches so the toast listener fires after this render
      // settles (and after any in-flight click handler returns).
      queueMicrotask(() => {
        for (const c of newlyReady) {
          window.dispatchEvent(new CustomEvent("crystal-forge-cooldown-ready", { detail: { cooldown: c } }));
        }
      });
    }
  }

  resolvePage(state) {
    switch (this.pageKey) {
      case "forge":
        return renderForgePage(state);
      case "city":
        return renderCityPage(state);
      case "economy":
        return renderEconomyPage(state);
      case "citizens":
        return renderCitizensPage(state);
      case "expeditions":
        return renderExpeditionsPage(state);
      case "vehicles":
        return renderVehiclesPage(state);
      case "behemoths":
        return renderBehemothsPage(state);
      case "npcs":
        return renderNpcsPage(state);
      case "awakened":
        return renderAwakenedPage(state);
      case "army":
        return renderArmyPage(state);
      case "uniques":
        return renderUniqueCitizensPage(state);
      case "equipment":
        return renderEquipmentSheetPage(state);
      case "crafting":
        return renderCraftingPage(state);
      case "cooldowns":
        return renderCooldownsPage(state);
      case "chronicle":
        return renderChroniclePage(state);
      case "help":
        return renderHelpPage(state);
      case "player":
        return renderPlayerPage(state);
      case "home":
      default:
        return renderHomePage(state);
    }
  }

  render(state) {
    this.syncCouncilModal(state);
    this.syncBuildNotesModal();
    this.checkCooldownReadinessTransitions(state);
    this.modalFocus.capturePreRender();
    const viewState = {
      ...state,
      transientUi: this.transientUi
    };
    const page = this.resolvePage(viewState);
    const overlays = [
      renderBuildNotesModal(viewState),
      renderBuildingDetailModal(viewState, this.pageKey),
      renderBuildingCatalogModal(viewState),
      renderHomeHelpModal(viewState),
      renderManifestCompleteModal(viewState),
      renderResourceBreakdownModal(viewState),
      renderExpeditionJourneyModal(viewState),
      renderTownFocusCouncilModal(viewState),
      renderTownFocusCeremonyOverlay(viewState),
      renderTurnSummaryModal(viewState)
    ].join("");
    this.root.innerHTML = renderPageShell(viewState, this.pageKey, page, overlays);
    attachHelpBubbles(this.root);
    attachListCollapse(this.root);
    attachHexMapCanvas(this.root, viewState);
    this.modalFocus.applyPostRender();
  }

  setTransientUi(patch, state) {
    this.transientUi = {
      ...this.transientUi,
      ...patch
    };
    this.render(state);
  }
}

