// Awakened roster — the superhuman individuals of the Scarred Lands who may
// join the city. Data sourced from the "Awakened Types — Full Breakdown"
// world-bible page. Awakened powers are innate and uncontrolled at first
// manifestation, and tend to reflect the person's inner nature.

// Power grades, weakest to strongest. The world bible runs F..A; an S grade
// sits above A as the rarest, strongest tier.
export const AWAKENED_GRADES = [
  { id: "F", label: "F", detail: "Latent. Barely manifested — often mistaken for luck or talent." },
  { id: "D", label: "D", detail: "Significant. A match for trained soldiers or small groups." },
  { id: "C", label: "C", detail: "Highly dangerous. A threat to squads, fortifications, and organizations." },
  { id: "B", label: "B", detail: "City-threatening. Capable of turning battles single-handedly." },
  { id: "A", label: "A", detail: "World-altering. Reality-bending. Major factions take note." },
  { id: "S", label: "S", detail: "Singular. The strongest known Awakened — a power unto themselves." }
];

export const AWAKENED_STATUSES = [
  { id: "unknown", label: "Unknown", detail: "Rumored or newly sighted — not yet contacted." },
  { id: "contacted", label: "Contacted", detail: "The city has made contact but no commitment exists." },
  { id: "recruiting", label: "Recruiting", detail: "Active negotiation to bring them into the city." },
  { id: "joined", label: "Joined", detail: "Has joined the city and answers its call." },
  { id: "hostile", label: "Hostile", detail: "Opposed to the city or actively dangerous." },
  { id: "lost", label: "Lost", detail: "Dead, vanished, or beyond reach — kept for the record." }
];

export const AWAKENED_GENDERS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "other", label: "Other" }
];

export const AWAKENED_ORIGIN_CITIES = [
  "Wyldermoor",
  "Memento",
  "New Grandia",
  "Thundermount"
];

// Six attributes, D&D-style. Each Awakened has a primary and secondary attr
// that channel their power, plus an editable score for each.
export const AWAKENED_ATTRIBUTE_KEYS = [
  { id: "STR", label: "STR", name: "Strength" },
  { id: "DEX", label: "DEX", name: "Dexterity" },
  { id: "CON", label: "CON", name: "Constitution" },
  { id: "INT", label: "INT", name: "Intelligence" },
  { id: "WIS", label: "WIS", name: "Wisdom" },
  { id: "CHA", label: "CHA", name: "Charisma" }
];

// The 25 known power archetypes plus the lore-only Machinebreaker. `primary`
// and `secondary` are the archetype's signature attributes; `core` is the
// one-line ability summary from the type glossary.
export const AWAKENED_ABILITY_TYPES = [
  { id: "aegis", label: "Aegis", core: "Protective field projection", primary: "CON", secondary: "WIS", notes: "Shields manifest involuntarily under stress." },
  { id: "blighter", label: "Blighter", core: "Corruption / decay field", primary: "INT", secondary: "CON", notes: "Affects both organic tissue and machinery." },
  { id: "caller", label: "Caller", core: "Dimensional rift summoning", primary: "INT", secondary: "CHA", notes: "Rifts are unstable — what answers the call isn't always what was intended." },
  { id: "conduit", label: "Conduit", core: "Life-force channeling", primary: "WIS", secondary: "CHA", notes: "Healing and striking use the same energy — one depletes the other." },
  { id: "datasphereSensitive", label: "Datasphere-Sensitive", core: "Native Datasphere interface", primary: "INT", secondary: "WIS", notes: "Receives information passively — the world's data layer speaks to her without prompting." },
  { id: "fabricator", label: "Fabricator", core: "Technopathic manifestation", primary: "INT", secondary: "DEX", notes: "Does not build — manifests. Technology responds to intent." },
  { id: "fury", label: "Fury", core: "Rage-fueled adaptive growth", primary: "STR", secondary: "CON", notes: "Power scales with duration and damage received." },
  { id: "fusion", label: "Fusion", core: "Partial machine-fusion / structural assimilation", primary: "INT", secondary: "CON", notes: "Merges with and wears machines; more controlled than total fusion." },
  { id: "ghost", label: "Ghost", core: "Full sensory invisibility", primary: "DEX", secondary: "CHA", notes: "Imperceptible to sight, sound, heat, and Datasphere detection." },
  { id: "ironwall", label: "Ironwall", core: "Density control / kinetic absorption", primary: "CON", secondary: "STR", notes: "Anchors herself; others bounce off." },
  { id: "lancer", label: "Lancer", core: "Arcane energy projection / ranged precision", primary: "DEX", secondary: "INT", notes: "High output at range; fragile up close — the power demands distance." },
  { id: "mindseer", label: "Mindseer", core: "Telepathy / psychic infiltration", primary: "INT", secondary: "CHA", notes: "Reads thoughts; implants impressions; hard to detect." },
  { id: "precog", label: "Precog", core: "Combat precognition", primary: "DEX", secondary: "WIS", notes: "A fraction of a second ahead — enough to survive anything." },
  { id: "puppetmaster", label: "Puppetmaster", core: "Direct psionic thrall control", primary: "CHA", secondary: "INT", notes: "Full override — target acts on her will, not their own." },
  { id: "rageform", label: "Rageform", core: "Combat adaptive regeneration / self-enhancement", primary: "STR", secondary: "CON", notes: "The body becomes something else mid-fight; what it becomes depends on what it endures." },
  { id: "riftborn", label: "Riftborn", core: "Dimensional breach / micro-rift manipulation", primary: "INT", secondary: "DEX", notes: "Rifts don't always close — and don't always stay small." },
  { id: "runebound", label: "Runebound", core: "Magic-inscribed physical enhancement", primary: "STR", secondary: "CHA", notes: "The runes are not chosen or learned — they appear. The Awakened cannot read them." },
  { id: "shaper", label: "Shaper", core: "Cognitive disruption", primary: "INT", secondary: "WIS", notes: "Warps perception and decision-making; non-lethal but deeply unsettling." },
  { id: "skinchanger", label: "Skinchanger", core: "Morphic beast transformation", primary: "CON", secondary: "STR", notes: "Transformations are partly influenced by the Scarring — forms are not always familiar." },
  { id: "soulsapper", label: "Soulsapper", core: "Soul-siphoning drain", primary: "WIS", secondary: "CON", notes: "Self-healing loop; grows harder to kill the more it fights." },
  { id: "sovereign", label: "Sovereign", core: "Arcane will domination", primary: "CHA", secondary: "INT", notes: "Direct and overwhelming — no subtlety, just control." },
  { id: "stormcaller", label: "Stormcaller", core: "Atmospheric manifestation / macro-scale storm command", primary: "CON", secondary: "WIS", notes: "Weather only, but at a scale that makes terrain itself lethal." },
  { id: "strikecaster", label: "Strikecaster", core: "Arcane-kinetic fusion / spellblade", primary: "STR", secondary: "INT", notes: "Every punch, kick, and draw carries a burst of raw arcane energy." },
  { id: "timewalker", label: "Timewalker", core: "Personal time dilation / micro-temporal manipulation", primary: "INT", secondary: "DEX", notes: "Precise and controlled rather than overwhelming." },
  { id: "veilblade", label: "Veilblade", core: "Shadow matter weaponization", primary: "DEX", secondary: "WIS", notes: "Shadows are literal tools — solid when she needs them." },
  { id: "machinebreaker", label: "Machinebreaker", core: "Destroys technology by proximity alone", primary: "CON", secondary: "WIS", notes: "Passive, uncontrollable, and deeply isolating." },
  { id: "other", label: "Other / Custom", core: "Custom or unclassified power", primary: "STR", secondary: "DEX", notes: "Use the description field to define a power outside the known archetypes." }
];

export function getAwakenedGradeDetail(id) {
  return AWAKENED_GRADES.find((entry) => entry.id === id)?.detail ?? "";
}

export function getAwakenedStatusLabel(id) {
  return AWAKENED_STATUSES.find((entry) => entry.id === id)?.label ?? "Unknown";
}

export function getAwakenedStatusDetail(id) {
  return AWAKENED_STATUSES.find((entry) => entry.id === id)?.detail ?? "";
}

export function getAwakenedAbilityType(id) {
  return AWAKENED_ABILITY_TYPES.find((entry) => entry.id === id) ?? null;
}

export function getAwakenedAbilityTypeLabel(id) {
  return getAwakenedAbilityType(id)?.label ?? "Unclassified";
}

export function createDefaultAwakenedAttributes() {
  return AWAKENED_ATTRIBUTE_KEYS.reduce((accumulator, attr) => {
    accumulator[attr.id] = 10;
    return accumulator;
  }, {});
}
