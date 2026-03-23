import { AMBIENT_AUDIO_FILE_CANDIDATES, AUDIO_FILE_CANDIDATES, EFFECT_AUDIO_FILE_CANDIDATES } from "../content/Config.js";

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

const EFFECT_SYNTH_PATTERNS = {
  error: { notes: [246.94, 196, 164.81], type: "sawtooth", gain: 0.04, step: 0.075, noteDuration: 0.14 },
  placement: { notes: [329.63, 493.88], type: "triangle", gain: 0.03, step: 0.06, noteDuration: 0.14 },
  move: { notes: [293.66, 440], type: "triangle", gain: 0.028, step: 0.055, noteDuration: 0.12 },
  "construction-complete": { notes: [392, 523.25, 659.25], type: "triangle", gain: 0.032, step: 0.075, noteDuration: 0.16 },
  event: { notes: [349.23, 440, 587.33], type: "sine", gain: 0.03, step: 0.07, noteDuration: 0.15 },
  emergency: { notes: [220, 174.61, 220], type: "square", gain: 0.038, step: 0.08, noteDuration: 0.16 },
  holiday: { notes: [392, 523.25, 783.99], type: "triangle", gain: 0.032, step: 0.08, noteDuration: 0.18 },
  save: { notes: [392, 587.33], type: "sine", gain: 0.026, step: 0.07, noteDuration: 0.14 },
  load: { notes: [349.23, 523.25], type: "sine", gain: 0.026, step: 0.07, noteDuration: 0.14 },
  publish: { notes: [392, 523.25, 698.46], type: "triangle", gain: 0.03, step: 0.07, noteDuration: 0.16 }
};

export class AudioEngine {
  constructor() {
    this.context = null;
    this.muted = false;
    this.resolvedAudioPaths = {};
    this.manifestAudioElements = {};
    this.resolvedEffectPaths = {};
    this.effectAudioElements = {};
    this.ambientAudioElements = {};
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
    this.preloadManifestAudio();
    this.preloadEffectAudio();
    this.preloadAmbientAudio();
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

  async playUiAccent(kind = "soft") {
    if (this.muted) {
      return;
    }

    const playedFile = await this.tryPlayEffectFile(kind);
    if (playedFile) {
      return;
    }

    await this.playSynthUiAccent(kind);
  }

  async playEffect(effectName) {
    if (this.muted || !effectName) {
      return;
    }

    const playedFile = await this.tryPlayEffectFile(effectName);
    if (playedFile) {
      return;
    }

    if (effectName === "soft" || effectName === "confirm") {
      await this.playSynthUiAccent(effectName);
      return;
    }

    await this.ensureContext();
    this.playSynthPattern(EFFECT_SYNTH_PATTERNS[effectName] ?? EFFECT_SYNTH_PATTERNS.placement);
  }

  async playSynthUiAccent(kind = "soft") {
    await this.ensureContext();

    const now = this.context.currentTime;
    const profile =
      kind === "confirm"
        ? { base: 420, overtone: 630, duration: 0.1, gain: 0.03 }
        : { base: this.pageKey === "chronicle" ? 246.94 : 329.63, overtone: 493.88, duration: 0.08, gain: 0.022 };

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(profile.gain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
    gain.connect(this.context.destination);

    const osc = this.context.createOscillator();
    osc.type = this.pageKey === "chronicle" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(profile.base, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + profile.duration);

    const overtone = this.context.createOscillator();
    overtone.type = "sine";
    overtone.frequency.setValueAtTime(profile.overtone, now + 0.01);
    overtone.connect(gain);
    overtone.start(now + 0.01);
    overtone.stop(now + profile.duration);
  }

  playSynthPattern(pattern) {
    if (!this.context || !pattern?.notes?.length) {
      return;
    }

    const now = this.context.currentTime;
    for (const [index, note] of pattern.notes.entries()) {
      const start = now + index * (pattern.step ?? 0.07);
      const stop = start + (pattern.noteDuration ?? 0.14);
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(pattern.gain ?? 0.028, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);
      gain.connect(this.context.destination);

      const oscillator = this.context.createOscillator();
      oscillator.type = pattern.type ?? "triangle";
      oscillator.frequency.setValueAtTime(note, start);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(stop);
    }
  }

  async tryPlayAudioFile(rarity) {
    const candidates = this.resolvedAudioPaths[rarity]
      ? [this.resolvedAudioPaths[rarity]]
      : AUDIO_FILE_CANDIDATES[rarity] ?? [];

    for (const path of candidates) {
      const success = await new Promise((resolve) => {
        const audio = this.getManifestAudioElement(rarity, path);
        let settled = false;
        const finalize = (result) => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timer);
          audio.removeEventListener("error", handleError);
          resolve(result);
        };
        const handleError = () => finalize(false);
        const timer = window.setTimeout(() => finalize(false), 2500);

        audio.addEventListener("error", handleError, { once: true });

        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          // Ignore media reset failures and fall through to play attempt.
        }

        Promise.resolve(audio.play())
          .then(() => {
            this.resolvedAudioPaths[rarity] = path;
            finalize(true);
          })
          .catch(() => finalize(false));
      });

      if (success) {
        return true;
      }
    }

    return false;
  }

  preloadManifestAudio() {
    for (const [rarity, candidates] of Object.entries(AUDIO_FILE_CANDIDATES)) {
      if (!candidates?.length || this.manifestAudioElements[rarity]) {
        continue;
      }

      const audio = new Audio(candidates[0]);
      audio.preload = "auto";
      audio.volume = 0.9;
      audio.dataset.candidatePath = candidates[0];
      audio.load();
      this.manifestAudioElements[rarity] = audio;
    }
  }

  preloadEffectAudio() {
    for (const [effectName, candidates] of Object.entries(EFFECT_AUDIO_FILE_CANDIDATES)) {
      if (!candidates?.length || this.effectAudioElements[effectName]) {
        continue;
      }

      const audio = new Audio(candidates[0]);
      audio.preload = "auto";
      audio.volume = 0.9;
      audio.dataset.candidatePath = candidates[0];
      audio.load();
      this.effectAudioElements[effectName] = audio;
    }
  }

  preloadAmbientAudio() {
    for (const [pageKey, candidates] of Object.entries(AMBIENT_AUDIO_FILE_CANDIDATES)) {
      if (!candidates?.length || this.ambientAudioElements[pageKey]) {
        continue;
      }

      const audio = new Audio(candidates[0]);
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = 0.24;
      audio.dataset.candidatePath = candidates[0];
      audio.load();
      this.ambientAudioElements[pageKey] = audio;
    }
  }

  getManifestAudioElement(rarity, path) {
    const existing = this.manifestAudioElements[rarity];
    if (existing?.dataset?.candidatePath === path) {
      return existing;
    }

    const audio = new Audio(path);
    audio.preload = "auto";
    audio.volume = 0.9;
    audio.dataset.candidatePath = path;
    this.manifestAudioElements[rarity] = audio;
    return audio;
  }

  async tryPlayEffectFile(effectName) {
    const candidates = this.resolvedEffectPaths[effectName]
      ? [this.resolvedEffectPaths[effectName]]
      : EFFECT_AUDIO_FILE_CANDIDATES[effectName] ?? [];

    for (const path of candidates) {
      const success = await new Promise((resolve) => {
        const audio = this.getEffectAudioElement(effectName, path);
        let settled = false;
        const finalize = (result) => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timer);
          audio.removeEventListener("error", handleError);
          resolve(result);
        };
        const handleError = () => finalize(false);
        const timer = window.setTimeout(() => finalize(false), 2500);

        audio.addEventListener("error", handleError, { once: true });

        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          // Ignore media reset failures and fall through to play attempt.
        }

        Promise.resolve(audio.play())
          .then(() => {
            this.resolvedEffectPaths[effectName] = path;
            finalize(true);
          })
          .catch(() => finalize(false));
      });

      if (success) {
        return true;
      }
    }

    return false;
  }

  getEffectAudioElement(effectName, path) {
    const existing = this.effectAudioElements[effectName];
    if (existing?.dataset?.candidatePath === path) {
      return existing;
    }

    const audio = new Audio(path);
    audio.preload = "auto";
    audio.volume = 0.9;
    audio.dataset.candidatePath = path;
    this.effectAudioElements[effectName] = audio;
    return audio;
  }

  getAmbientAudioElement(pageKey, path) {
    const existing = this.ambientAudioElements[pageKey];
    if (existing?.dataset?.candidatePath === path) {
      existing.loop = true;
      existing.volume = 0.24;
      return existing;
    }

    const audio = new Audio(path);
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 0.24;
    audio.dataset.candidatePath = path;
    this.ambientAudioElements[pageKey] = audio;
    return audio;
  }

  stopAmbient() {
    if (this.ambientElement) {
      this.ambientElement.pause();
      try {
        this.ambientElement.currentTime = 0;
      } catch (error) {
        // Ignore media rewind failures during cleanup.
      }
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
        const audio = this.getAmbientAudioElement(pageKey, path);
        let settled = false;
        const finalize = (result) => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timer);
          audio.removeEventListener("error", handleError);
          resolve(result);
        };
        const handleError = () => finalize(false);
        const timer = window.setTimeout(() => finalize(false), 2500);

        audio.addEventListener("error", handleError, { once: true });

        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          // Ignore media reset failures and fall through to play attempt.
        }

        if (this.ambientElement && this.ambientElement !== audio) {
          this.ambientElement.pause();
        }

        Promise.resolve(audio.play())
          .then(() => {
            this.ambientElement = audio;
            this.resolvedAmbientPaths[pageKey] = path;
            finalize(true);
          })
          .catch(() => finalize(false));
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
