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

function toDirectionFromKey(rawKey) {
  const key = rawKey.toLowerCase();
  if (key === 'arrowleft' || key === 'a') {
    return 'left';
  }
  if (key === 'arrowright' || key === 'd') {
    return 'right';
  }
  if (key === 'arrowup' || key === 'w') {
    return 'forward';
  }
  if (key === 'arrowdown' || key === 's') {
    return 'back';
  }
  return null;
}

export function createUI({ initialSettings, initialCollection, icons }) {
  const listeners = new Map();

  const app = document.querySelector('#app');
  const gameContainer = document.querySelector('#game-container');
  const controls = document.querySelector('#controls');
  const joystickArea = document.querySelector('#joystick-area');
  const joystickKnob = document.querySelector('#joystick-knob');
  const dropButton = document.querySelector('#drop-btn');
  const autoplayButton = document.querySelector('#autoplay-btn');
  const controlButtons = [dropButton, autoplayButton];

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
    cameraYaw: document.querySelector('#camera-yaw-slider'),
    cameraHeight: document.querySelector('#camera-height-slider'),
    cameraDistance: document.querySelector('#camera-distance-slider'),
    cameraLookY: document.querySelector('#camera-looky-slider'),
    music: document.querySelector('#music-toggle'),
    musicVolume: document.querySelector('#music-volume'),
    sfx: document.querySelector('#sfx-toggle'),
    sfxVolume: document.querySelector('#sfx-volume')
  };

  let resultTimer = null;
  let captionTimer = null;
  let captionsEnabled = Boolean(initialSettings.captions);

  let controlsEnabled = false;
  let moveRepeatTimer = null;
  let repeatDirection = null;

  let joystickDirection = null;
  let joystickActive = false;
  let joystickPointerId = null;

  let keyboardDirection = null;
  const pressedDirections = new Set();
  let lastPressedDirection = null;

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

  function getJoystickMetrics() {
    const rect = joystickArea.getBoundingClientRect();
    return {
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      radius: Math.min(rect.width, rect.height) * 0.34
    };
  }

  function setKnobOffset(x, y) {
    joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  function resetKnob() {
    joystickKnob.style.transform = 'translate(-50%, -50%)';
  }

  function setKnobFromDirection(direction) {
    if (!direction) {
      resetKnob();
      return;
    }

    const { radius } = getJoystickMetrics();
    const pull = radius * 0.72;

    if (direction === 'left') {
      setKnobOffset(-pull, 0);
    } else if (direction === 'right') {
      setKnobOffset(pull, 0);
    } else if (direction === 'forward') {
      setKnobOffset(0, -pull);
    } else if (direction === 'back') {
      setKnobOffset(0, pull);
    }
  }

  function directionFromVector(x, y, deadZone) {
    const distance = Math.hypot(x, y);
    if (distance < deadZone) {
      return null;
    }

    if (Math.abs(x) > Math.abs(y)) {
      return x > 0 ? 'right' : 'left';
    }

    return y > 0 ? 'back' : 'forward';
  }

  function stopMoveRepeat() {
    if (moveRepeatTimer) {
      window.clearInterval(moveRepeatTimer);
      moveRepeatTimer = null;
    }
    repeatDirection = null;
  }

  function setRepeatDirection(direction) {
    if (direction === repeatDirection) {
      return;
    }

    stopMoveRepeat();

    if (!direction || !controlsEnabled) {
      return;
    }

    repeatDirection = direction;
    emit('move', repeatDirection);
    moveRepeatTimer = window.setInterval(() => {
      if (!controlsEnabled || !repeatDirection) {
        return;
      }
      emit('move', repeatDirection);
    }, 195);
  }

  function refreshMovementDirection() {
    const direction = joystickDirection || keyboardDirection;
    setRepeatDirection(direction);

    if (!joystickActive) {
      setKnobFromDirection(direction);
    }
  }

  function endJoystickInteraction() {
    joystickActive = false;
    joystickPointerId = null;
    joystickDirection = null;
    joystickArea.classList.remove('active');
    refreshMovementDirection();
  }

  function updateJoystickFromPoint(clientX, clientY) {
    const { centerX, centerY, radius } = getJoystickMetrics();
    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      const scale = radius / distance;
      dx *= scale;
      dy *= scale;
    }

    setKnobOffset(dx, dy);
    joystickDirection = directionFromVector(dx, dy, radius * 0.26);
    refreshMovementDirection();
  }

  function setControlsEnabled(enabled) {
    controlsEnabled = Boolean(enabled);
    controls.classList.toggle('disabled', !controlsEnabled);

    controlButtons.forEach((button) => {
      button.disabled = !controlsEnabled;
      button.style.opacity = controlsEnabled ? '1' : '0.55';
    });

    joystickArea.setAttribute('aria-disabled', String(!controlsEnabled));

    if (!controlsEnabled) {
      keyboardDirection = null;
      joystickDirection = null;
      pressedDirections.clear();
      lastPressedDirection = null;
      stopMoveRepeat();
      joystickArea.classList.remove('active');
      resetKnob();
    }
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
    const content = String(text || '').trim();
    captionBox.textContent = content;
    window.clearTimeout(captionTimer);

    if (!captionsEnabled || !content) {
      captionBox.hidden = true;
      return;
    }

    captionBox.hidden = false;
    captionTimer = window.setTimeout(() => {
      if (captionBox.textContent === content) {
        captionBox.textContent = '';
        captionBox.hidden = true;
      }
    }, 3600);
  }

  function setCaptionsVisible(enabled) {
    captionsEnabled = Boolean(enabled);
    captionBox.hidden = !captionsEnabled || !captionBox.textContent.trim();
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
    settingsInputs.cameraYaw.value = String(settings.cameraYaw);
    settingsInputs.cameraHeight.value = String(settings.cameraHeight);
    settingsInputs.cameraDistance.value = String(settings.cameraDistance);
    settingsInputs.cameraLookY.value = String(settings.cameraLookY);
    settingsInputs.music.checked = Boolean(settings.music);
    settingsInputs.musicVolume.value = String(settings.musicVolume);
    settingsInputs.sfx.checked = Boolean(settings.sfx);
    settingsInputs.sfxVolume.value = String(settings.sfxVolume);
    menuLearnMode.checked = Boolean(settings.learnMode);
    setCaptionsVisible(Boolean(settings.captions));
  }

  if ('PointerEvent' in window) {
    joystickArea.addEventListener('pointerdown', (event) => {
      if (!controlsEnabled) {
        return;
      }

      event.preventDefault();
      joystickActive = true;
      joystickPointerId = event.pointerId;
      joystickArea.classList.add('active');
      joystickArea.setPointerCapture(event.pointerId);
      updateJoystickFromPoint(event.clientX, event.clientY);
    });

    joystickArea.addEventListener('pointermove', (event) => {
      if (!joystickActive || event.pointerId !== joystickPointerId) {
        return;
      }

      event.preventDefault();
      updateJoystickFromPoint(event.clientX, event.clientY);
    });

    const stopPointer = (event) => {
      if (event.pointerId !== joystickPointerId) {
        return;
      }
      event.preventDefault();
      endJoystickInteraction();
    };

    joystickArea.addEventListener('pointerup', stopPointer);
    joystickArea.addEventListener('pointercancel', stopPointer);
    joystickArea.addEventListener('lostpointercapture', stopPointer);
  } else {
    let mouseActive = false;

    joystickArea.addEventListener('mousedown', (event) => {
      if (!controlsEnabled) {
        return;
      }

      event.preventDefault();
      joystickActive = true;
      mouseActive = true;
      joystickArea.classList.add('active');
      updateJoystickFromPoint(event.clientX, event.clientY);
    });

    window.addEventListener('mousemove', (event) => {
      if (!mouseActive || !joystickActive) {
        return;
      }
      event.preventDefault();
      updateJoystickFromPoint(event.clientX, event.clientY);
    });

    window.addEventListener('mouseup', () => {
      if (!mouseActive) {
        return;
      }
      mouseActive = false;
      endJoystickInteraction();
    });

    joystickArea.addEventListener(
      'touchstart',
      (event) => {
        if (!controlsEnabled || !event.touches.length) {
          return;
        }

        event.preventDefault();
        joystickActive = true;
        joystickArea.classList.add('active');
        const touch = event.touches[0];
        updateJoystickFromPoint(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    joystickArea.addEventListener(
      'touchmove',
      (event) => {
        if (!joystickActive || !event.touches.length) {
          return;
        }

        event.preventDefault();
        const touch = event.touches[0];
        updateJoystickFromPoint(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    joystickArea.addEventListener(
      'touchend',
      (event) => {
        event.preventDefault();
        endJoystickInteraction();
      },
      { passive: false }
    );

    joystickArea.addEventListener(
      'touchcancel',
      (event) => {
        event.preventDefault();
        endJoystickInteraction();
      },
      { passive: false }
    );
  }

  bindTap(dropButton, () => {
    if (!controlsEnabled) {
      return;
    }
    emit('drop');
  });

  bindTap(autoplayButton, () => {
    if (!controlsEnabled) {
      return;
    }
    emit('autoplay');
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
  bindTap(document.querySelector('#close-settings-x'), () => emit('closeSettings'));
  bindTap(document.querySelector('#close-collection-x'), () => emit('closeCollection'));
  bindTap(document.querySelector('#close-menu-x'), () => emit('closeMenu'));
  bindTap(document.querySelector('#reset-camera'), () => emit('resetCamera'));

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

    const direction = toDirectionFromKey(event.key);
    if (direction) {
      event.preventDefault();
      if (!controlsEnabled) {
        return;
      }

      pressedDirections.add(direction);
      lastPressedDirection = direction;
      keyboardDirection = direction;
      refreshMovementDirection();
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      if (controlsEnabled && !event.repeat) {
        emit('drop');
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    const direction = toDirectionFromKey(event.key);
    if (!direction) {
      return;
    }

    event.preventDefault();
    pressedDirections.delete(direction);

    if (lastPressedDirection === direction) {
      lastPressedDirection = null;
    }

    if (lastPressedDirection && pressedDirections.has(lastPressedDirection)) {
      keyboardDirection = lastPressedDirection;
    } else {
      const remaining = [...pressedDirections];
      keyboardDirection = remaining.length ? remaining[remaining.length - 1] : null;
      lastPressedDirection = keyboardDirection;
    }

    refreshMovementDirection();
  });

  window.addEventListener('blur', () => {
    keyboardDirection = null;
    lastPressedDirection = null;
    pressedDirections.clear();
    refreshMovementDirection();
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
