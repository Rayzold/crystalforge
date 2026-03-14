import { renderChroniclePage } from "./ChroniclePage.js";
import { renderCitizensPage } from "./CitizensPage.js";
import { renderCityPage } from "./CityPage.js";
import { renderForgePage } from "./ForgePage.js";
import { renderHomePage } from "./HomePage.js";
import { renderPageShell } from "./PageShell.js";

export class UIRenderer {
  constructor(root, pageKey = "home") {
    this.root = root;
    this.pageKey = pageKey;
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
    const page = this.resolvePage(state);
    this.root.innerHTML = renderPageShell(state, this.pageKey, page);
  }
}
