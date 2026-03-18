import { escapeHtml } from "../engine/Utils.js";

const ICONS = {
  gold: `<path d="M17 22c0-5.5 4.5-10 10-10h18c5.5 0 10 4.5 10 10v20c0 5.5-4.5 10-10 10H27c-5.5 0-10-4.5-10-10Z" />
    <path d="M27 22h18v20H27Z" />
    <circle cx="36" cy="32" r="5" />`,
  food: `<path d="M20 46c0-14 8-26 21-32 5 8 6 18 3 27-4 10-13 17-24 19Z" />
    <path d="M24 42c4-9 9-18 17-25" />`,
  materials: `<path d="M18 20h28v28H18Z" />
    <path d="M18 30h28M32 20v28" />`,
  mana: `<path d="m32 8 9 15 15 9-15 9-9 15-9-15-15-9 15-9Z" />
    <circle cx="32" cy="32" r="5" />`,
  population: `<circle cx="24" cy="24" r="7" /><circle cx="40" cy="24" r="7" /><path d="M16 48c0-6 5-11 11-11h10c6 0 11 5 11 11" />`,
  prosperity: `<path d="M16 46V30l10 6 10-16 10 8v18Z" /><path d="M16 46h30" />`,
  defense: `<path d="M32 10 50 18v13c0 12-7 20-18 25-11-5-18-13-18-25V18Z" />`,
  security: `<circle cx="32" cy="24" r="8" /><path d="M20 48c2-8 6-14 12-14s10 6 12 14" />`,
  prestige: `<path d="m14 44 5-18 13 8 13-8 5 18Z" /><path d="m18 20 6 7 8-13 8 13 6-7" />`,
  morale: `<path d="M18 24c0-8 6-14 14-14s14 6 14 14-6 22-14 22-14-14-14-22Z" /><path d="M24 26c2 3 4 4 8 4s6-1 8-4" />`,
  health: `<path d="M28 14h8v12h12v8H36v12h-8V34H16v-8h12Z" />`,
  value: `<path d="M16 44V18h32v26Z" /><path d="M22 28h20M22 35h14" />`,
  upkeep: `<path d="M18 18h28M22 18v-6m20 6v-6M20 24h24l-2 24H22Z" />`,
  building: `<path d="M18 50V18h28v32Z" /><path d="M25 26h6m8 0h6m-20 8h6m8 0h6m-20 8h6m8 0h6" />`,
  completed: `<path d="M16 34 26 44 48 20" />`,
  rarity: `<path d="m32 8 12 12-12 28L20 20Z" />`,
  calendar: `<path d="M18 16h28v30H18Z" /><path d="M18 24h28M24 12v8m16-8v8" />`,
  event: `<path d="m30 10-12 22h10l-2 14 18-24H34l4-12Z" />`,
  history: `<path d="M18 16h24a8 8 0 0 1 8 8v22H26a8 8 0 0 0-8 8Z" /><path d="M26 16v38" />`,
  route: `<path d="M14 46c8-10 16-16 26-20m-8 20c6-8 10-14 10-24" /><circle cx="42" cy="22" r="6" />`,
  citizens: `<circle cx="24" cy="24" r="6" /><circle cx="40" cy="22" r="5" /><path d="M18 46c1-7 5-11 10-11h7c5 0 9 4 10 11" />`,
  forge: `<path d="M18 42 32 12l14 30Z" /><path d="M24 34h16" />`
};

export function renderUiIcon(name, label = "", className = "") {
  const icon = ICONS[name] ?? ICONS.route;
  return `
    <span class="ui-icon ${escapeHtml(className)}" aria-hidden="${label ? "false" : "true"}">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        ${icon}
      </svg>
      ${label ? `<span class="sr-only">${escapeHtml(label)}</span>` : ""}
    </span>
  `;
}
