// Goal and reward system.
// This module defines the guided Home goals, short-term realm goals, and the
// tiny completion rewards that make progress feel more tangible over time.
import { getCityTrendSummary } from "./ResourceSystem.js";
import { addHistoryEntry } from "./HistoryLogSystem.js";

const RESOURCE_LABELS = {
  gold: "Gold",
  food: "Food",
  materials: "Materials",
  salvage: "Salvage",
  mana: "Mana",
  prosperity: "Prosperity"
};

const RESOURCE_ORDER = ["gold", "food", "materials", "salvage", "mana", "prosperity"];
const SHARD_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Beyond"];

const ONBOARDING_GOAL_DEFINITIONS = [
  {
    id: "forge-first-building",
    phase: "Phase 1",
    title: "Raise the first foundation",
    details: "Manifest your first structure from the Forge so the city has something real to build around.",
    impact: "This starts the full loop: placement, construction, output, and the first real choices.",
    href: "./forge.html",
    cta: "Manifest First Building",
    target: 1,
    reward: {
      shards: { Common: 10 }
    }
  },
  {
    id: "place-first-building",
    phase: "Phase 2",
    title: "Claim a district",
    details: "Place the first building on the map so the Drift starts taking shape.",
    impact: "Placement turns loose manifests into a city plan and unlocks district thinking early.",
    href: "./city.html",
    cta: "Place First Building",
    target: 1,
    reward: {
      resources: { materials: 20 }
    }
  },
  {
    id: "wake-first-building",
    phase: "Phase 3",
    title: "Wake the first structure",
    details: "Advance time until at least one building is complete and producing real output.",
    impact: "Once a building is active, Economy and City both start telling the truth about the run.",
    href: "./city.html",
    cta: "Advance Construction",
    target: 1,
    reward: {
      resources: { gold: 25 }
    }
  },
  {
    id: "claim-outer-ring",
    phase: "Phase 4",
    title: "Broaden the footprint",
    details: "Place 3 buildings so the city grows past a single test structure.",
    impact: "Three placed buildings is where district identity, staffing pressure, and tradeoffs start to matter.",
    href: "./city.html",
    cta: "Place More Buildings",
    target: 3,
    reward: {
      resources: { food: 30 }
    }
  },
  {
    id: "stabilize-economy",
    phase: "Phase 5",
    title: "Stabilize food and gold",
    details: "Get both food/day and gold/day to zero or better so the early city can breathe.",
    impact: "This is the first real health check. If both stay non-negative, the run becomes much easier to steer.",
    href: "./economy.html",
    cta: "Balance Economy",
    target: 2,
    reward: {
      resources: { prosperity: 4 }
    }
  },
  {
    id: "launch-first-expedition",
    phase: "Phase 6",
    title: "Open the frontier",
    details: "Launch the first expedition so the city starts pulling value from outside the walls.",
    impact: "Expeditions unlock legends, relics, and the longer story loop beyond local construction.",
    href: "./expeditions.html",
    cta: "Launch Expedition",
    target: 1,
    reward: {
      resources: { salvage: 18, mana: 10 }
    }
  }
];

const REALM_GOAL_DEFINITIONS = [
  {
    id: "stabilize-first-district",
    title: "Stabilize the first district",
    details: "Reach 1 active building so the city begins producing real output.",
    href: "./city.html",
    target: 1,
    reward: {
      resources: { gold: 35 }
    }
  },
  {
    id: "claim-outer-ring",
    title: "Claim the outer ring",
    details: "Place 3 buildings to give Drift a usable footprint.",
    href: "./city.html",
    target: 3,
    reward: {
      resources: { materials: 35, prosperity: 2 }
    }
  },
  {
    id: "build-living-record",
    title: "Build a living record",
    details: "Create 5 chronicle entries so the world starts answering back.",
    href: "./chronicle.html",
    target: 5,
    reward: {
      resources: { mana: 18, prosperity: 3 }
    }
  }
];

function joinParts(parts = []) {
  const filtered = parts.filter(Boolean);
  if (!filtered.length) {
    return "No reward";
  }
  if (filtered.length === 1) {
    return filtered[0];
  }
  if (filtered.length === 2) {
    return `${filtered[0]} and ${filtered[1]}`;
  }
  return `${filtered.slice(0, -1).join(", ")}, and ${filtered[filtered.length - 1]}`;
}

function createGoalMetrics(state) {
  const buildings = state.buildings ?? [];
  const placedBuildings = buildings.filter((building) => building.mapPosition).length;
  const activeBuildings = buildings.filter((building) => building.isComplete).length;
  const trends = Object.fromEntries(getCityTrendSummary(state).map((entry) => [entry.key, entry]));
  const stableEconomyChecks = Number((trends.gold?.delta ?? 0) >= 0) + Number((trends.food?.delta ?? 0) >= 0);
  const expeditionFootprint =
    (state.expeditions?.active?.length ?? 0) +
    (state.expeditions?.pending?.length ?? 0) +
    (state.expeditions?.recent?.length ?? 0);

  return {
    hasBuilding: buildings.length > 0,
    hasPlacedBuilding: buildings.some((building) => building.mapPosition),
    placedBuildings,
    activeBuildings,
    stableEconomyChecks,
    expeditionFootprint,
    recordedSignals: state.historyLog?.length ?? 0
  };
}

function getGoalClaimSet(state) {
  return new Set(Array.isArray(state.settings?.claimedGoalRewardIds) ? state.settings.claimedGoalRewardIds.filter(Boolean) : []);
}

function formatGoalRewardLabel(reward = {}) {
  const resourceParts = RESOURCE_ORDER
    .map((resource) => {
      const amount = Number(reward.resources?.[resource] ?? 0) || 0;
      return amount > 0 ? `+${amount} ${RESOURCE_LABELS[resource]}` : "";
    })
    .filter(Boolean);
  const shardParts = SHARD_ORDER
    .map((rarity) => {
      const amount = Number(reward.shards?.[rarity] ?? 0) || 0;
      return amount > 0 ? `+${amount} ${rarity} shard${amount === 1 ? "" : "s"}` : "";
    })
    .filter(Boolean);
  return joinParts([...resourceParts, ...shardParts]);
}

function buildGoalEntry(kind, definition, progress, target, complete, claimed) {
  const safeProgress = Math.max(0, Number(progress) || 0);
  const safeTarget = Math.max(1, Number(target) || 1);
  return {
    ...definition,
    kind,
    claimId: `${kind}:${definition.id}`,
    progress: safeProgress,
    target: safeTarget,
    complete,
    claimed,
    progressText: `${Math.min(safeProgress, safeTarget)} / ${safeTarget}`,
    rewardLabel: formatGoalRewardLabel(definition.reward)
  };
}

export function getOnboardingGoals(state) {
  const metrics = createGoalMetrics(state);
  const claimedGoals = getGoalClaimSet(state);

  return ONBOARDING_GOAL_DEFINITIONS.map((definition) => {
    let progress = 0;
    if (definition.id === "forge-first-building") {
      progress = metrics.hasBuilding ? 1 : 0;
    } else if (definition.id === "place-first-building") {
      progress = metrics.hasPlacedBuilding ? 1 : 0;
    } else if (definition.id === "wake-first-building") {
      progress = Math.min(metrics.activeBuildings, 1);
    } else if (definition.id === "claim-outer-ring") {
      progress = Math.min(metrics.placedBuildings, definition.target);
    } else if (definition.id === "stabilize-economy") {
      progress = metrics.stableEconomyChecks;
    } else if (definition.id === "launch-first-expedition") {
      progress = Math.min(metrics.expeditionFootprint, 1);
    }

    const complete = progress >= definition.target;
    return buildGoalEntry("onboarding", definition, progress, definition.target, complete, claimedGoals.has(`onboarding:${definition.id}`));
  }).map((goal) => ({
    ...goal,
    cta: goal.complete ? (goal.id === "forge-first-building" ? "Open Forge" : goal.id === "place-first-building" ? "Open City" : goal.id === "wake-first-building" ? "Review Active Building" : goal.id === "claim-outer-ring" ? "Review Layout" : goal.id === "stabilize-economy" ? "Review Economy" : "Review Expeditions") : goal.cta
  }));
}

export function getRealmGoals(state) {
  const metrics = createGoalMetrics(state);
  const claimedGoals = getGoalClaimSet(state);

  return REALM_GOAL_DEFINITIONS.map((definition) => {
    let progress = 0;
    if (definition.id === "stabilize-first-district") {
      progress = metrics.activeBuildings;
    } else if (definition.id === "claim-outer-ring") {
      progress = metrics.placedBuildings;
    } else if (definition.id === "build-living-record") {
      progress = metrics.recordedSignals;
    }
    const complete = progress >= definition.target;
    return buildGoalEntry("realm", definition, progress, definition.target, complete, claimedGoals.has(`realm:${definition.id}`));
  });
}

function applyGoalReward(state, reward = {}) {
  const touchedResources = [];
  for (const resource of RESOURCE_ORDER) {
    const amount = Number(reward.resources?.[resource] ?? 0) || 0;
    if (amount <= 0) {
      continue;
    }
    state.resources[resource] = (Number(state.resources?.[resource] ?? 0) || 0) + amount;
    touchedResources.push(resource);
  }

  for (const rarity of SHARD_ORDER) {
    const amount = Number(reward.shards?.[rarity] ?? 0) || 0;
    if (amount <= 0) {
      continue;
    }
    state.shards[rarity] = (Number(state.shards?.[rarity] ?? 0) || 0) + amount;
  }

  return [...new Set(touchedResources)];
}

function claimGoalReward(state, goal, claimedGoalIds) {
  claimedGoalIds.add(goal.claimId);
  const touchedResources = applyGoalReward(state, goal.reward);
  addHistoryEntry(state, {
    category: goal.kind === "realm" ? "Realm Goal" : "Goal Reward",
    title: `${goal.title} complete`,
    details: `${goal.kind === "realm" ? "Realm goal" : "Onboarding goal"} reward granted: ${goal.rewardLabel}.`
  });
  return {
    id: goal.id,
    kind: goal.kind,
    title: goal.title,
    rewardLabel: goal.rewardLabel,
    touchedResources
  };
}

export function applyCompletedGoalRewards(state) {
  if (!state?.settings) {
    return [];
  }

  const claimedGoalIds = getGoalClaimSet(state);
  const claimedRewards = [];
  let guard = 0;

  while (guard < 16) {
    const pendingGoals = [...getOnboardingGoals(state), ...getRealmGoals(state)].filter((goal) => goal.complete && !claimedGoalIds.has(goal.claimId));
    if (!pendingGoals.length) {
      break;
    }

    for (const goal of pendingGoals) {
      claimedRewards.push(claimGoalReward(state, goal, claimedGoalIds));
    }
    guard += 1;
  }

  state.settings.claimedGoalRewardIds = [...claimedGoalIds];
  return claimedRewards;
}
