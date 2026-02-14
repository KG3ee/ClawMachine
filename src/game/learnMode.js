function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export class LearnMode {
  constructor() {
    this.enabled = false;
    this.targetType = 'bunny';
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  chooseTarget(types) {
    if (!types.length) {
      return this.targetType;
    }

    this.targetType = pickRandom(types);
    return this.targetType;
  }

  getPrompt() {
    return `Find the ${this.targetType}!`;
  }

  isTarget(type) {
    return type === this.targetType;
  }
}
