export class Toasts {
  constructor() {
    this.root = document.createElement("div");
    this.root.className = "toast-stack";
    document.body.append(this.root);
  }

  show(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    this.root.append(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }, 2600);
  }
}
