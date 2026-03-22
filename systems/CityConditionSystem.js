function clampMultiplier(value, minimum = 0.5, maximum = 1.5) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getMoraleOutputMultiplier(state) {
  const morale = Number(state.cityStats?.morale ?? 0);
  if (morale <= 8) {
    return 0.7;
  }
  if (morale <= 18) {
    return 0.85;
  }
  if (morale >= 140) {
    return 1.25;
  }
  if (morale >= 90) {
    return 1.12;
  }
  return 1;
}

export function getHealthOutputMultiplier(state) {
  const health = Number(state.cityStats?.health ?? 0);
  if (health <= 10) {
    return 0.75;
  }
  if (health <= 20) {
    return 0.9;
  }
  if (health >= 140) {
    return 1.2;
  }
  if (health >= 80) {
    return 1.1;
  }
  return 1;
}

export function getProsperityOutputMultiplier(state) {
  const prosperity = Number(state.resources?.prosperity ?? 0);
  if (prosperity <= 10) {
    return 0.9;
  }
  if (prosperity >= 150) {
    return 1.2;
  }
  if (prosperity >= 50) {
    return 1.1;
  }
  return 1;
}

export function getGoodsOutputMultiplier(state) {
  return clampMultiplier(
    getMoraleOutputMultiplier(state) * getHealthOutputMultiplier(state) * getProsperityOutputMultiplier(state),
    0.55,
    1.45
  );
}

export function getGoldOutputMultiplier(state) {
  return clampMultiplier(
    getMoraleOutputMultiplier(state) * getProsperityOutputMultiplier(state),
    0.6,
    1.35
  );
}

export function getFoodOutputMultiplier(state) {
  return clampMultiplier(getHealthOutputMultiplier(state), 0.7, 1.25);
}

export function getEventRollModifier(state) {
  const security = Number(state.cityStats?.security ?? 0);
  if (security <= 10) {
    return 0.06;
  }
  if (security <= 25) {
    return 0.03;
  }
  if (security >= 100) {
    return -0.05;
  }
  if (security >= 60) {
    return -0.02;
  }
  return 0;
}

export function getEventTypeWeight(state, eventDefinition) {
  const security = Number(state.cityStats?.security ?? 0);
  const defense = Number(state.cityStats?.defense ?? 0);
  const morale = Number(state.cityStats?.morale ?? 0);
  const type = eventDefinition?.type ?? "";
  let weight = 1;

  if (type === "military" || type === "world") {
    if (defense <= 20) {
      weight *= 1.9;
    } else if (defense <= 35) {
      weight *= 1.4;
    } else if (defense >= 120) {
      weight *= 0.55;
    } else if (defense >= 80) {
      weight *= 0.8;
    }

    if (security <= 10) {
      weight *= 1.35;
    } else if (security <= 25) {
      weight *= 1.15;
    } else if (security >= 100) {
      weight *= 0.7;
    } else if (security >= 60) {
      weight *= 0.88;
    }
  }

  if (type === "social") {
    if (morale <= 8) {
      weight *= 1.3;
    } else if (morale <= 18) {
      weight *= 1.12;
    } else if (morale >= 140) {
      weight *= 0.72;
    } else if (morale >= 90) {
      weight *= 0.9;
    }
  }

  return Math.max(0.1, weight);
}

export function getHousingStrainPenalty(state) {
  const population = Number(state.resources?.population ?? 0);
  const support = Number(state.cityStats?.populationSupport ?? 0);
  const gap = Math.max(0, population - support);
  if (!gap) {
    return { morale: 0, health: 0, prosperity: 0 };
  }

  return {
    morale: Math.min(24, gap * 0.02),
    health: Math.min(14, gap * 0.012),
    prosperity: Math.min(10, gap * 0.01)
  };
}
