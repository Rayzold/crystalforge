export const DRIFT_POPULATION_GOALS = {
  startingPopulation: 420,
  baseSupport: 600,
  optimalPopulation: 42000,
  strainCeiling: 50000
};

export const DRIFT_EVOLUTION_STAGES = [
  {
    id: "forge-seed",
    name: "Forge-Seed Drift",
    threshold: 0,
    constructionSlots: 2,
    constructionSpeedPercent: 0,
    mobility: "Grounded and cautious",
    summary: "The newborn Drift clings to the forge core and can only raise a handful of structures at once.",
    abilities: [
      "Anchored forge-heart with room for a small founding population",
      "Auto-construction supports 2 unfinished buildings at a time",
      "District growth remains slow while the city learns its first rhythms"
    ]
  },
  {
    id: "wakeflight",
    name: "Wakeflight Drift",
    threshold: 5,
    constructionSlots: 3,
    constructionSpeedPercent: 10,
    mobility: "Slow float",
    summary: "The city lightens, lifts, and can begin to hover under its own crystal pressure.",
    abilities: [
      "The Drift can fly / float slowly",
      "Auto-construction expands to 3 unfinished buildings at once",
      "Crystal growth channels accelerate by 10%"
    ]
  },
  {
    id: "skywake",
    name: "Skywake Drift",
    threshold: 15,
    constructionSlots: 4,
    constructionSpeedPercent: 20,
    mobility: "Short guided glides",
    summary: "More districts lock together and the city can hold shape while shifting through the sky.",
    abilities: [
      "The Drift can steer itself through short aerial glides",
      "Auto-construction expands to 4 unfinished buildings at once",
      "Crystal growth channels accelerate by 20%"
    ]
  },
  {
    id: "waycastle",
    name: "Waycastle Drift",
    threshold: 25,
    constructionSlots: 5,
    constructionSpeedPercent: 35,
    mobility: "Stable roaming citadel",
    summary: "Its mass becomes coordinated enough to travel as a true fortress-city rather than a drifting platform.",
    abilities: [
      "The Drift can travel as a stable roaming citadel",
      "Auto-construction expands to 5 unfinished buildings at once",
      "Crystal growth channels accelerate by 35%"
    ]
  },
  {
    id: "cloud-bastion",
    name: "Cloud Bastion",
    threshold: 35,
    constructionSlots: 6,
    constructionSpeedPercent: 50,
    mobility: "Sustained high flight",
    summary: "Outer districts stop feeling temporary and begin acting like permanent aerial wards of the city.",
    abilities: [
      "The Drift sustains high, steady flight",
      "Auto-construction expands to 6 unfinished buildings at once",
      "Crystal growth channels accelerate by 50%"
    ]
  },
  {
    id: "ascendant-drift",
    name: "Ascendant Drift",
    threshold: 45,
    constructionSlots: 7,
    constructionSpeedPercent: 70,
    mobility: "A roaming crystal metropolis",
    summary: "The city becomes a mobile realm in its own right, capable of maintaining many crystal growths in parallel.",
    abilities: [
      "The Drift becomes a roaming crystal metropolis",
      "Auto-construction expands to 7 unfinished buildings at once",
      "Crystal growth channels accelerate by 70%"
    ]
  }
];
