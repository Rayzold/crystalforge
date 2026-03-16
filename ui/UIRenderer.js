import { renderChroniclePage } from "./ChroniclePage.js";
import { renderBuildingDetailModal } from "./BuildingDetailModal.js";
import { renderBuildingCatalogModal } from "./BuildingCatalogModal.js";
import { renderCitizensPage } from "./CitizensPage.js";
import { renderCityPage } from "./CityPage.js";
import { renderForgePage } from "./ForgePage.js";
import { renderHomePage } from "./HomePage.js";
import { renderPageShell } from "./PageShell.js";
import { renderTownFocusCouncilModal } from "./TownFocusCouncilModal.js";
import { getMayorSuggestions } from "../systems/TownFocusSystem.js";
import { getDefaultTownFocusPreviewId } from "./TownFocusShared.js";

export class UIRenderer {
  constructor(root, pageKey = "home") {
    this.root = root;
    this.pageKey = pageKey;
    this.transientUi = {
      hoveredMapCell: null,
      inspectedBuildingId: null,
      catalogOpen: false,
      focusEventId: null,
      councilModalOpen: false,
      councilModalCycleKey: null,
      previewTownFocusId: null
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
    if (this.transientUi.councilModalCycleKey === cycleKey) {
      return;
    }

    this.transientUi.councilModalCycleKey = cycleKey;
    this.transientUi.councilModalOpen = true;
    this.transientUi.previewTownFocusId =
      getMayorSuggestions(state)[0]?.focusId ?? getDefaultTownFocusPreviewId(state);
  }

  resolvePage(state) {
    switch (this.pageKey) {
      case "forge":
        return renderForgePage(state);
      case "city":
        return renderCityPage(state);
      case "citizens":
        return renderCitizensPage(state);
      case "chronicle":
        return renderChroniclePage(state);
      case "home":
      default:
        return renderHomePage(state);
    }
  }

  render(state) {
    this.syncCouncilModal(state);
    const viewState = {
      ...state,
      transientUi: this.transientUi
    };
    const page = this.resolvePage(viewState);
    const overlays = [
      renderBuildingDetailModal(viewState, this.pageKey),
      renderBuildingCatalogModal(viewState),
      renderTownFocusCouncilModal(viewState)
    ].join("");
    this.root.innerHTML = renderPageShell(viewState, this.pageKey, page, overlays);
  }

  setTransientUi(patch, state) {
    this.transientUi = {
      ...this.transientUi,
      ...patch
    };
    this.render(state);
  }
}
