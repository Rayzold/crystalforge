const APP_ENTRY = "./app.js?v=v1.7.21-20260628030617";

// Apply persisted theme BEFORE the app boots so the parchment palette doesn't
// flash dark for a frame. The 📜 button in the top-nav writes this key.
// We set the attribute on BOTH <html> and <body> so the CSS variable
// inheritance starts from :root — that way DevTools shows the parchment
// vars on the root element, and any descendant (including <body>) picks
// them up via normal cascade.
try {
  const savedTheme = localStorage.getItem("crystalforge-theme");
  if (savedTheme === "parchment") {
    document.documentElement.dataset.theme = "parchment";
    document.body.dataset.theme = "parchment";
  }
} catch {
  /* localStorage blocked — fall back to default dark theme. */
}

function getBootFailureTitle() {
  const page = String(document.body?.dataset?.page ?? "forge").trim();
  if (page === "player") {
    return "The player screen failed to load.";
  }
  return "The forge failed to load.";
}

function getBootFailureLines(error) {
  const lines = [];
  if (window.location.protocol === "file:") {
    lines.push("This page was opened directly from the file system.");
    lines.push("Run start-server.bat or start-server.ps1, then open http://localhost:8000 instead.");
  } else {
    lines.push("Startup stopped before the app could render.");
    lines.push("Refresh once, then open DevTools if it keeps happening.");
  }

  const message = String(error?.message ?? error ?? "").trim();
  if (message) {
    lines.push(`Startup error: ${message}`);
  }

  return lines;
}

function showBootFailure(error) {
  const panel = document.querySelector(".boot-panel");
  const title = panel?.querySelector(".boot-panel__title");
  if (!panel || !title) {
    return;
  }

  title.textContent = getBootFailureTitle();
  panel.querySelectorAll(".boot-panel__text").forEach((entry) => entry.remove());
  for (const line of getBootFailureLines(error)) {
    const text = document.createElement("p");
    text.className = "boot-panel__text";
    text.textContent = line;
    panel.append(text);
  }
}

void import(APP_ENTRY).catch((error) => {
  console.error(error);
  showBootFailure(error);
});
