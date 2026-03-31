const APP_ENTRY = "./app.js?v=1.6.13";

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
