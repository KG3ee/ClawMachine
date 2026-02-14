const PRAISES = [
  'Great job!',
  'Nice!',
  'Awesome!',
  'You did it!',
  'Fantastic!'
];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function withArticle(word) {
  const first = word[0]?.toLowerCase();
  const article = ['a', 'e', 'i', 'o', 'u'].includes(first) ? 'an' : 'a';
  return `${article} ${word}`;
}

export class SpeechManager {
  constructor({ enabled = true, captionsEnabled = true, rateMode = 'slow', onCaption } = {}) {
    this.enabled = Boolean(enabled);
    this.captionsEnabled = Boolean(captionsEnabled);
    this.rateMode = rateMode;
    this.onCaption = onCaption;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  setCaptionsEnabled(value) {
    this.captionsEnabled = Boolean(value);
  }

  setRateMode(value) {
    this.rateMode = value === 'normal' ? 'normal' : 'slow';
  }

  announce(text, { urgent = false } = {}) {
    if (this.captionsEnabled && this.onCaption) {
      this.onCaption(text);
    }

    if (!this.enabled || !this.supported) {
      return false;
    }

    if (urgent) {
      window.speechSynthesis.cancel();
    }

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = this.rateMode === 'slow' ? 0.86 : 1;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  announceWin(type) {
    const text = `You got ${withArticle(type)}! ${pickRandom(PRAISES)}`;
    this.announce(text, { urgent: true });
    return text;
  }

  announceLearnPrompt(type) {
    const text = `Find ${withArticle(type)}!`;
    this.announce(text, { urgent: true });
    return text;
  }
}

export function buildMissText(targetType) {
  return `That's a different toy. Let's try ${targetType}!`;
}
