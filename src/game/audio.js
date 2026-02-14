function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class AudioManager {
  constructor({ music = true, sfx = true, musicVolume = 0.35, sfxVolume = 0.65 } = {}) {
    this.musicEnabled = Boolean(music);
    this.sfxEnabled = Boolean(sfx);
    this.musicVolume = clamp(Number(musicVolume) || 0, 0, 1);
    this.sfxVolume = clamp(Number(sfxVolume) || 0, 0, 1);

    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.musicScheduler = null;
    this.nextNoteTime = 0;
    this.musicStep = 0;
    this.unlocked = false;

    this.musicPattern = [
      262, 330, 392, 330,
      294, 349, 440, 349,
      330, 392, 494, 392,
      294, 349, 440, 0
    ];
  }

  async unlock() {
    if (this.unlocked) {
      return true;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return false;
    }

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    await this.ctx.resume();
    this.unlocked = true;

    if (this.musicEnabled) {
      this.startMusic();
    }

    return true;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (!this.unlocked) {
      return;
    }

    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
  }

  setMusicVolume(value) {
    this.musicVolume = clamp(Number(value) || 0, 0, 1);
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.02);
    }
  }

  setSfxVolume(value) {
    this.sfxVolume = clamp(Number(value) || 0, 0, 1);
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
    }
  }

  startMusic() {
    if (!this.unlocked || this.musicScheduler) {
      return;
    }

    this.nextNoteTime = this.ctx.currentTime;
    this.musicScheduler = window.setInterval(() => {
      if (!this.musicEnabled) {
        return;
      }

      while (this.nextNoteTime < this.ctx.currentTime + 0.22) {
        const note = this.musicPattern[this.musicStep % this.musicPattern.length];
        if (note > 0) {
          this.playTone({
            frequency: note,
            duration: 0.18,
            gainNode: this.musicGain,
            wave: 'square',
            volume: 0.12,
            startTime: this.nextNoteTime
          });

          this.playTone({
            frequency: note / 2,
            duration: 0.18,
            gainNode: this.musicGain,
            wave: 'triangle',
            volume: 0.055,
            startTime: this.nextNoteTime
          });
        }

        this.nextNoteTime += 0.22;
        this.musicStep += 1;
      }
    }, 80);
  }

  stopMusic() {
    if (!this.musicScheduler) {
      return;
    }

    window.clearInterval(this.musicScheduler);
    this.musicScheduler = null;
  }

  playTone({ frequency, duration, gainNode, wave = 'square', volume = 0.2, startTime }) {
    if (!this.ctx || !gainNode) {
      return;
    }

    const now = this.ctx.currentTime;
    const toneStart = Math.max(startTime ?? now, now);
    const toneEnd = toneStart + duration;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, toneStart);

    env.gain.setValueAtTime(0.0001, toneStart);
    env.gain.exponentialRampToValueAtTime(volume, toneStart + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    osc.connect(env);
    env.connect(gainNode);

    osc.start(toneStart);
    osc.stop(toneEnd + 0.01);
  }

  playMove() {
    if (!this.unlocked || !this.sfxEnabled) {
      return;
    }

    this.playTone({
      frequency: 540,
      duration: 0.06,
      gainNode: this.sfxGain,
      wave: 'square',
      volume: 0.1
    });
  }

  playDrop() {
    if (!this.unlocked || !this.sfxEnabled) {
      return;
    }

    this.playTone({
      frequency: 250,
      duration: 0.16,
      gainNode: this.sfxGain,
      wave: 'sawtooth',
      volume: 0.12
    });
  }

  playGrab(success) {
    if (!this.unlocked || !this.sfxEnabled) {
      return;
    }

    if (success) {
      this.playTone({
        frequency: 660,
        duration: 0.08,
        gainNode: this.sfxGain,
        wave: 'triangle',
        volume: 0.12
      });
      this.playTone({
        frequency: 820,
        duration: 0.09,
        gainNode: this.sfxGain,
        wave: 'triangle',
        volume: 0.09,
        startTime: this.ctx.currentTime + 0.08
      });
    } else {
      this.playTone({
        frequency: 180,
        duration: 0.13,
        gainNode: this.sfxGain,
        wave: 'square',
        volume: 0.09
      });
    }
  }

  playWin() {
    if (!this.unlocked || !this.sfxEnabled) {
      return;
    }

    const start = this.ctx.currentTime;
    [523, 659, 784, 1046].forEach((frequency, index) => {
      this.playTone({
        frequency,
        duration: 0.16,
        gainNode: this.sfxGain,
        wave: 'square',
        volume: 0.13,
        startTime: start + index * 0.11
      });
    });
  }

  playUiTap() {
    if (!this.unlocked || !this.sfxEnabled) {
      return;
    }

    this.playTone({
      frequency: 430,
      duration: 0.05,
      gainNode: this.sfxGain,
      wave: 'triangle',
      volume: 0.08
    });
  }

  playFallbackCheer() {
    if (!this.unlocked || !this.sfxEnabled) {
      return;
    }

    const start = this.ctx.currentTime;
    [392, 523, 659].forEach((frequency, index) => {
      this.playTone({
        frequency,
        duration: 0.12,
        gainNode: this.sfxGain,
        wave: 'triangle',
        volume: 0.1,
        startTime: start + index * 0.09
      });
    });
  }
}
