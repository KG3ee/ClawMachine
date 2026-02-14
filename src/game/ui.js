import { GAME_STATES } from './stateMachine.js';

function bindTap(element, handler) {
  const wrapped = (event) => {
    event.preventDefault();
    handler(event);
  };

  if ('PointerEvent' in window) {
    element.addEventListener('pointerup', wrapped);
  } else {
    element.addEventListener('touchend', wrapped, { passive: false });
    element.addEventListener('click', wrapped);
  }
}

function normalizeToyName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function createUI({ initialSettings, initialCollection, icons }) {
  const listeners = new Map();

  const app = document.querySelector('#app');
  const gameContainer = document.querySelector('#game-container');
  const controls = document.querySelector('#controls');
  const controlButtons = [...document.querySelectorAll('#controls .control-btn')];

  const menuOverlay = document.querySelector('#menu-overlay');
  const menuLearnMode = document.querySelector('#menu-learn-mode');

  const settingsPanel = document.querySelector('#settings-panel');
  const collectionPanel = document.querySelector('#collection-panel');
  const audioOverlay = document.querySelector('#audio-overlay');

  const resultBanner = document.querySelector('#result-banner');
  const captionBox = document.querySelector('#caption-box');
  const learnPrompt = document.querySelector('#learn-prompt');

  const collectionGrid = document.querySelector('#collection-grid');
  const collectionPreview = document.querySelector('#collection-preview');

  const settingsInputs = {
    pixelation: document.querySelector('#pixelation-toggle'),
    shadows: document.querySelector('#shadows-toggle'),
    captions: document.querySelector('#captions-toggle'),
    speech: document.querySelector('#speech-toggle'),
    speechRate: document.querySelector('#speech-rate'),
    zoom: document.querySelector('#zoom-slider'),
    music: document.querySelector('#music-toggle'),
    musicVolume: document.querySelector('#music-volume'),
    sfx: document.querySelector('#sfx-toggle'),
    sfxVolume: document.querySelector('#sfx-volume')
  };

  let resultTimer = null;
  let captionTimer = null;

  function emit(event, payload) {
    const callbacks = listeners.get(event);
    if (!callbacks) {
      return;
    }

    callbacks.forEach((callback) => callback(payload));
  }

  function on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }

    listeners.get(event).add(callback);
    return () => listeners.get(event).delete(callback);
  }

  function showMenu(visible) {
    menuOverlay.hidden = !visible;
  }

  function showSettings(visible) {
    settingsPanel.hidden = !visible;
  }

  function showCollection(visible) {
    collectionPanel.hidden = !visible;
  }

  function showAudioOverlay(visible) {
    audioOverlay.hidden = !visible;
  }

  function setControlsEnabled(enabled) {
    controlButtons.forEach((button) => {
      button.disabled = !enabled;
      button.style.opacity = enabled ? '1' : '0.55';
    });
  }

  function showLearnPrompt(text, visible) {
    learnPrompt.textContent = text;
    learnPrompt.hidden = !visible;
  }

  function showResult(text, success = true, durationMs = 1500) {
    resultBanner.textContent = text;
    resultBanner.classList.toggle('fail', !success);
    resultBanner.hidden = false;

    window.clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => {
      resultBanner.hidden = true;
    }, durationMs);
  }

  function setCaption(text) {
    captionBox.textContent = text;
    window.clearTimeout(captionTimer);
    captionTimer = window.setTimeout(() => {
      if (captionBox.textContent === text) {
        captionBox.textContent = '';
      }
    }, 3600);
  }

  function setCaptionsVisible(enabled) {
    captionBox.style.display = enabled ? 'block' : 'none';
  }

  function setCollectionPreviewText(text) {
    collectionPreview.textContent = text;
  }

  function updateCollection(collection) {
    collectionGrid.innerHTML = '';

    Object.keys(collection).forEach((toyType) => {
      const count = collection[toyType] || 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'collection-card';
      button.innerHTML = `
        <img class="collection-icon" src="${icons[toyType]}" alt="${toyType} icon" />
        <div>${normalizeToyName(toyType)}</div>
        <div>x ${count}</div>
      `;

      bindTap(button, () => {
        emit('collectionSelect', toyType);
      });

      collectionGrid.appendChild(button);
    });
  }

  function setState(state) {
    const isPlaying = state === GAME_STATES.PLAYING;
    setControlsEnabled(isPlaying);
  }

  function applySettings(settings) {
    settingsInputs.pixelation.checked = Boolean(settings.pixelation);
    settingsInputs.shadows.checked = Boolean(settings.shadows);
    settingsInputs.captions.checked = Boolean(settings.captions);
    settingsInputs.speech.checked = Boolean(settings.speech);
    settingsInputs.speechRate.value = settings.speechRate;
    settingsInputs.zoom.value = String(settings.zoom);
    settingsInputs.music.checked = Boolean(settings.music);
    settingsInputs.musicVolume.value = String(settings.musicVolume);
    settingsInputs.sfx.checked = Boolean(settings.sfx);
    settingsInputs.sfxVolume.value = String(settings.sfxVolume);
    menuLearnMode.checked = Boolean(settings.learnMode);
    setCaptionsVisible(Boolean(settings.captions));
  }

  document.querySelectorAll('#controls .control-btn').forEach((button) => {
    bindTap(button, () => {
      const action = button.dataset.action;
      if (action === 'move') {
        emit('move', button.dataset.dir);
      } else if (action === 'drop') {
        emit('drop');
      } else if (action === 'autoplay') {
        emit('autoplay');
      }
    });
  });

  bindTap(document.querySelector('#start-game'), () => {
    emit('startGame', { learnMode: menuLearnMode.checked });
  });

  bindTap(document.querySelector('#menu-open-collection'), () => emit('openCollection'));
  bindTap(document.querySelector('#menu-open-settings'), () => emit('openSettings'));
  bindTap(document.querySelector('#menu-btn'), () => emit('openMenu'));
  bindTap(document.querySelector('#collection-btn'), () => emit('openCollection'));
  bindTap(document.querySelector('#settings-btn'), () => emit('openSettings'));

  bindTap(document.querySelector('#close-settings'), () => emit('closeSettings'));
  bindTap(document.querySelector('#close-collection'), () => emit('closeCollection'));

  bindTap(document.querySelector('#enable-audio'), () => emit('enableAudio'));

  Object.entries(settingsInputs).forEach(([key, input]) => {
    input.addEventListener('input', () => {
      const value = input.type === 'checkbox' ? input.checked : input.value;
      emit('settingChange', { key, value });
    });

    input.addEventListener('change', () => {
      const value = input.type === 'checkbox' ? input.checked : input.value;
      emit('settingChange', { key, value });
    });
  });

  menuLearnMode.addEventListener('change', () => {
    emit('learnToggle', menuLearnMode.checked);
  });

  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'BUTTON'].includes(event.target.tagName)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') {
      event.preventDefault();
      emit('move', 'left');
    } else if (key === 'arrowright' || key === 'd') {
      event.preventDefault();
      emit('move', 'right');
    } else if (key === 'arrowup' || key === 'w') {
      event.preventDefault();
      emit('move', 'forward');
    } else if (key === 'arrowdown' || key === 's') {
      event.preventDefault();
      emit('move', 'back');
    } else if (key === ' ') {
      event.preventDefault();
      emit('drop');
    }
  });

  gameContainer.addEventListener(
    'touchmove',
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );

  app.addEventListener(
    'gesturestart',
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );

  applySettings(initialSettings);
  updateCollection(initialCollection);
  setState(GAME_STATES.MENU);

  return {
    on,
    showMenu,
    showSettings,
    showCollection,
    showAudioOverlay,
    showLearnPrompt,
    showResult,
    setCaption,
    setCaptionsVisible,
    setCollectionPreviewText,
    updateCollection,
    setState,
    applySettings
  };
}
