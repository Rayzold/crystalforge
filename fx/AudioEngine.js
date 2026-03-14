const RARITY_AUDIO = {
  Common: { base: 220, duration: 0.14, detune: 0 },
  Uncommon: { base: 260, duration: 0.18, detune: 80 },
  Rare: { base: 320, duration: 0.22, detune: 150 },
  Epic: { base: 180, duration: 0.28, detune: -120 },
  Legendary: { base: 360, duration: 0.34, detune: 220 },
  Beyond: { base: 110, duration: 0.45, detune: -280 }
};

export class AudioEngine {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  setMuted(nextValue) {
    this.muted = Boolean(nextValue);
  }

  async ensureContext() {
    if (!this.context) {
      this.context = new window.AudioContext();
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async playManifest(rarity) {
    if (this.muted) {
      return;
    }

    await this.ensureContext();
    const profile = RARITY_AUDIO[rarity];
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(rarity === "Beyond" ? 0.18 : 0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
    gain.connect(this.context.destination);

    const osc = this.context.createOscillator();
    osc.type = rarity === "Common" ? "triangle" : rarity === "Epic" ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(profile.base, now);
    osc.detune.setValueAtTime(profile.detune, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + profile.duration);

    if (rarity !== "Common") {
      const overtone = this.context.createOscillator();
      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(profile.base * 1.5, now + 0.03);
      overtone.detune.setValueAtTime(profile.detune / 2, now + 0.03);
      overtone.connect(gain);
      overtone.start(now + 0.03);
      overtone.stop(now + profile.duration);
    }
  }
}
