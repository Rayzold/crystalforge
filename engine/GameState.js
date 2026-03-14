import { deepClone } from "./Utils.js";

export class GameState {
  constructor(initialState) {
    this.state = deepClone(initialState);
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(mutator) {
    const draft = deepClone(this.state);
    const result = mutator(draft) ?? draft;
    this.state = result;
    for (const listener of this.listeners) {
      listener(this.state);
    }
    return this.state;
  }

  replace(nextState) {
    this.state = deepClone(nextState);
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
