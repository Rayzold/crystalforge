// Top-level page renderer.
// It selects the correct page shell/content for the current route and injects
// transient overlays like modals, help bubbles, and reveal states.
import { APP_VERSION } from "../content/Config.js";
import { getSeenBuildNotesVersion } from "../systems/StorageSystem.js";
import { renderBuildNotesModal } from "./BuildNotesModal.js";
import { renderChroniclePage } from "./ChroniclePage.js";
import { renderBuildingDetailModal } from "./BuildingDetailModal.js";
import { renderBuildingCatalogModal } from "./BuildingCatalogModal.js";
import { renderCitizensPage } from "./CitizensPage.js";
import { renderCityPage, renderEconomyPage } from "./CityPage.js";
import { renderExpeditionsPage } from "./ExpeditionsPage.js";
import { renderExpeditionJourneyModal } from "./ExpeditionJourneyModal.js";
import { renderForgePage } from "./ForgePage.js";
import { renderHelpPage } from "./HelpPage.js";
import { attachHelpBubbles } from "./HelpBubbles.js";
import { renderHomePage } from "./HomePage.js";
import { renderHomeHelpModal } from "./HomeHelpModal.js";
import { renderManifestCompleteModal } from "./ManifestCompleteModal.js";
import { renderPageShell } from "./PageShell.js";
import { renderPlayerPage } from "./PlayerPage.js";
import { renderResourceBreakdownModal } from "./ResourceBreakdownModal.js";
import { renderTownFocusCouncilModal } from "./TownFocusCouncilModal.js";
import { renderTurnSummaryModal } from "./TurnSummaryModal.js";
import { renderUniqueCitizensPage } from "./UniqueCitizensPage.js";
import { renderVehiclesPage } from "./VehiclesPage.js";
import { getMayorSuggestions } from "../systems/TownFocusSystem.js";
import { getDefaultTownFocusPreviewId } from "./TownFocusShared.js";
import { renderTownFocusCeremonyOverlay } from "./TownFocusCeremonyOverlay.js";

export class UIRenderer {
  constructor(root, pageKey = "home") {
    this.root = root;
    this.pageKey = pageKey;
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
      }
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
      case "uniques":
        return renderUniqueCitizensPage(state);
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
  }

  setTransientUi(patch, state) {
    this.transientUi = {
      ...this.transientUi,
      ...patch
    };
    this.render(state);
  }
}
