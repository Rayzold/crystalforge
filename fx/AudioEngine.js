import { AMBIENT_AUDIO_FILE_CANDIDATES, AUDIO_FILE_CANDIDATES } from "../content/Config.js";

const RARITY_AUDIO = {
  Common: { base: 220, duration: 0.14, detune: 0 },
  Uncommon: { base: 260, duration: 0.18, detune: 80 },
  Rare: { base: 320, duration: 0.22, detune: 150 },
  Epic: { base: 180, duration: 0.28, detune: -120 },
  Legendary: { base: 360, duration: 0.34, detune: 220 },
  Beyond: { base: 110, duration: 0.45, detune: -280 }
};

const AMBIENT_PROFILES = {
  home: { frequencies: [164.81, 220, 329.63], type: "sine", gain: 0.015, filter: 900, lfo: 0.12 },
  forge: { frequencies: [110, 220, 277.18], type: "triangle", gain: 0.022, filter: 1200, lfo: 0.18 },
  city: { frequencies: [130.81, 196, 261.63], type: "sine", gain: 0.014, filter: 820, lfo: 0.1 },
  citizens: { frequencies: [174.61, 233.08, 293.66], type: "triangle", gain: 0.013, filter: 760, lfo: 0.08 },
  chronicle: { frequencies: [98, 146.83, 220], type: "sine", gain: 0.012, filter: 620, lfo: 0.07 }
};

export class AudioEngine {
  constructor() {
    this.context = null;
    this.muted = false;
    this.resolvedAudioPaths = {};
    this.pageKey = "home";
    this.ambientSynthPage = null;
    this.ambientNodes = [];
    this.ambientElement = null;
    this.resolvedAmbientPaths = {};
  }

  setMuted(nextValue) {
    this.muted = Boolean(nextValue);
    if (this.muted) {
      this.stopAmbient();
    }
  }

  setPage(pageKey) {
    this.pageKey = pageKey;
    if (!this.muted && (this.context || this.ambientElement)) {
      void this.syncAmbient();
    }
  }

  async ensureContext() {
    if (!this.context) {
      this.context = new window.AudioContext();
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async unlock() {
    if (this.muted) {
      return;
    }
    await this.ensureContext();
    await this.syncAmbient();
  }

  async playManifest(rarity) {
    if (this.muted) {
      return;
    }

    const playedFile = await this.tryPlayAudioFile(rarity);
    if (playedFile) {
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

  async tryPlayAudioFile(rarity) {
    const candidates = this.resolvedAudioPaths[rarity]
      ? [this.resolvedAudioPaths[rarity]]
      : AUDIO_FILE_CANDIDATES[rarity] ?? [];

    for (const path of candidates) {
      const success = await new Promise((resolve) => {
        const audio = new Audio(path);
        audio.volume = 0.9;
        const timer = window.setTimeout(() => resolve(false), 350);
        audio.addEventListener("canplaythrough", async () => {
          try {
            window.clearTimeout(timer);
            await audio.play();
            this.resolvedAudioPaths[rarity] = path;
            resolve(true);
          } catch (error) {
            window.clearTimeout(timer);
            resolve(false);
          }
        }, { once: true });
        audio.addEventListener("error", () => {
          window.clearTimeout(timer);
          resolve(false);
        }, { once: true });
        audio.load();
      });

      if (success) {
        return true;
      }
    }

    return false;
  }

  stopAmbient() {
    if (this.ambientElement) {
      this.ambientElement.pause();
      this.ambientElement.src = "";
      this.ambientElement = null;
    }

    for (const node of this.ambientNodes) {
      try {
        if (typeof node.stop === "function") {
          node.stop();
        } else if (typeof node.disconnect === "function") {
          node.disconnect();
        }
      } catch (error) {
        // Ignore cleanup errors for already-stopped nodes.
      }
    }

    this.ambientNodes = [];
    this.ambientSynthPage = null;
  }

  async syncAmbient() {
    if (this.muted || !this.pageKey) {
      this.stopAmbient();
      return;
    }

    const playedFile = await this.tryPlayAmbientFile(this.pageKey);
    if (playedFile) {
      this.ambientSynthPage = null;
      return;
    }

    await this.ensureContext();
    this.startAmbientSynth(this.pageKey);
  }

  async tryPlayAmbientFile(pageKey) {
    const candidates = this.resolvedAmbientPaths[pageKey]
      ? [this.resolvedAmbientPaths[pageKey]]
      : AMBIENT_AUDIO_FILE_CANDIDATES[pageKey] ?? [];

    for (const path of candidates) {
      const success = await new Promise((resolve) => {
        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = 0.24;
        const timer = window.setTimeout(() => resolve(false), 450);

        audio.addEventListener(
          "canplaythrough",
          async () => {
            try {
              window.clearTimeout(timer);
              if (this.ambientElement && this.ambientElement !== audio) {
                this.ambientElement.pause();
              }
              await audio.play();
              this.ambientElement = audio;
              this.resolvedAmbientPaths[pageKey] = path;
              resolve(true);
            } catch (error) {
              window.clearTimeout(timer);
              resolve(false);
            }
          },
          { once: true }
        );
        audio.addEventListener(
          "error",
          () => {
            window.clearTimeout(timer);
            resolve(false);
          },
          { once: true }
        );
        audio.load();
      });

      if (success) {
        for (const node of this.ambientNodes) {
          try {
            if (typeof node.stop === "function") {
              node.stop();
            }
          } catch (error) {
            // Ignore already-stopped oscillator cleanup.
          }
        }
        this.ambientNodes = [];
        return true;
      }
    }

    return false;
  }

  startAmbientSynth(pageKey) {
    if (this.ambientSynthPage === pageKey && this.ambientNodes.length) {
      return;
    }

    if (!this.context) {
      return;
    }

    if (this.ambientElement) {
      this.ambientElement.pause();
      this.ambientElement = null;
    }

    for (const node of this.ambientNodes) {
      try {
        if (typeof node.stop === "function") {
          node.stop();
        }
      } catch (error) {
        // Ignore already-stopped oscillator cleanup.
      }
    }

    const profile = AMBIENT_PROFILES[pageKey] ?? AMBIENT_PROFILES.home;
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(profile.filter, this.context.currentTime);

    const master = this.context.createGain();
    master.gain.setValueAtTime(profile.gain, this.context.currentTime);

    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(profile.lfo, this.context.currentTime);
    lfoGain.gain.setValueAtTime(profile.gain * 0.45, this.context.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);

    filter.connect(master);
    master.connect(this.context.destination);

    const oscillators = profile.frequencies.map((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = index === 0 ? profile.type : "sine";
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
      gain.gain.setValueAtTime(profile.gain / (index === 0 ? 1.8 : 2.6), this.context.currentTime);
      oscillator.connect(gain);
      gain.connect(filter);
      oscillator.start();
      return { oscillator, gain };
    });

    lfo.start();
    this.ambientNodes = [filter, master, lfo, lfoGain, ...oscillators.map((entry) => entry.gain), ...oscillators.map((entry) => entry.oscillator)];
    this.ambientSynthPage = pageKey;
  }
}
