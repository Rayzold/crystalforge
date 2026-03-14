export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededFloat(input, min = 0, max = 1) {
  const hash = hashString(input);
  const normalized = (hash % 10000) / 10000;
  return min + (max - min) * normalized;
}
