import '../style.css';
import { AudioManager } from './game/audio.js';
import { ClawController } from './game/claw.js';
import { LearnMode } from './game/learnMode.js';
import { GameRenderer } from './game/renderer.js';
import { SpeechManager, buildMissText } from './game/speech.js';
import { GAME_STATES, StateMachine } from './game/stateMachine.js';
import { addToCollection, loadCollection, loadSettings, saveSettings } from './game/storage.js';
import { ToyManager } from './game/toys.js';
import { createUI } from './game/ui.js';
import { createWorld } from './game/world.js';

const MOVE_MAP = {
  left: [-1, 0],
  right: [1, 0],
  forward: [0, -1],
  back: [0, 1]
};

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const settings = loadSettings();
let collection = loadCollection();

const gameContainer = document.querySelector('#game-container');

const renderer = new GameRenderer(gameContainer, {
  pixelation: settings.pixelation,
  shadows: settings.shadows,
  zoom: settings.zoom,
  cameraYaw: settings.cameraYaw,
  cameraHeight: settings.cameraHeight,
  cameraDistance: settings.cameraDistance,
  cameraLookY: settings.cameraLookY
});

const world = createWorld(renderer.scene, { shadows: settings.shadows });
const toyManager = new ToyManager({
  scene: renderer.scene,
  toyLayer: world.toyLayer,
  bounds: world.bounds,
  shadows: settings.shadows
});

toyManager.spawnInitial(18);

const claw = new ClawController({
  clawLayer: world.clawLayer,
  bounds: world.bounds,
  shadows: settings.shadows
});

const audio = new AudioManager(settings);
const speech = new SpeechManager({
  enabled: settings.speech,
  captionsEnabled: settings.captions,
  rateMode: settings.speechRate,
  onCaption: (text) => ui.setCaption(text)
});

const learnMode = new LearnMode();
learnMode.setEnabled(settings.learnMode);

const ui = createUI({
  initialSettings: settings,
  initialCollection: collection,
  icons: toyManager.getIcons()
});

const stateMachine = new StateMachine(GAME_STATES.MENU);
let overlayReturnState = GAME_STATES.MENU;
let roundRunning = false;
let missStreak = 0;
let elapsed = 0;

function speakWithFallback(text, options = {}) {
  const spoke = speech.announce(text, options);
  if (!spoke && !speech.supported) {
    audio.playFallbackCheer();
  }
  return spoke;
}

function saveAllSettings() {
  saveSettings(settings);
  ui.applySettings(settings);
}

function ensureLearnTarget() {
  if (!settings.learnMode) {
    return null;
  }

  const currentTarget = toyManager.findTargetToy(learnMode.targetType);
  if (currentTarget) {
    return currentTarget;
  }

  const availableTypes = [...new Set(toyManager.getAvailableToys().map((toy) => toy.type))];
  if (!availableTypes.length) {
    return null;
  }

  learnMode.chooseTarget(availableTypes);
  return toyManager.findTargetToy(learnMode.targetType);
}

function refreshLearnPrompt({ announce = false } = {}) {
  if (!settings.learnMode) {
    ui.showLearnPrompt('', false);
    return;
  }

  ensureLearnTarget();
  const prompt = learnMode.getPrompt();
  ui.showLearnPrompt(prompt, true);

  if (announce) {
    speakWithFallback(prompt, { urgent: true });
  }
}

function setState(nextState) {
  stateMachine.setState(nextState);
  ui.setState(nextState);
}

function openMenuOverlay() {
  overlayReturnState = stateMachine.is(GAME_STATES.PLAYING) ? GAME_STATES.PLAYING : GAME_STATES.MENU;
  ui.showMenu(true);
  ui.showSettings(false);
  ui.showCollection(false);
  setState(GAME_STATES.MENU);
}

function closeToReturnState() {
  ui.showSettings(false);
  ui.showCollection(false);

  if (overlayReturnState === GAME_STATES.PLAYING) {
    ui.showMenu(false);
    setState(roundRunning ? stateMachine.current : GAME_STATES.PLAYING);
    refreshLearnPrompt();
  } else {
    ui.showMenu(true);
    setState(GAME_STATES.MENU);
  }
}

function applySetting({ key, value }) {
  if (key === 'pixelation') {
    settings.pixelation = Boolean(value);
    renderer.setPixelation(settings.pixelation);
  } else if (key === 'shadows') {
    settings.shadows = Boolean(value);
    renderer.setShadows(settings.shadows);
    world.setShadows(settings.shadows);
    toyManager.setShadows(settings.shadows);
    claw.setShadows(settings.shadows);
  } else if (key === 'captions') {
    settings.captions = Boolean(value);
    speech.setCaptionsEnabled(settings.captions);
    ui.setCaptionsVisible(settings.captions);
  } else if (key === 'speech') {
    settings.speech = Boolean(value);
    speech.setEnabled(settings.speech);
  } else if (key === 'speechRate') {
    settings.speechRate = value === 'normal' ? 'normal' : 'slow';
    speech.setRateMode(settings.speechRate);
  } else if (key === 'zoom') {
    settings.zoom = Number(value);
    renderer.applyCameraZoom(settings.zoom);
  } else if (key === 'cameraYaw') {
    settings.cameraYaw = Number(value);
    renderer.setCameraRig({ yaw: settings.cameraYaw });
  } else if (key === 'cameraHeight') {
    settings.cameraHeight = Number(value);
    renderer.setCameraRig({ height: settings.cameraHeight });
  } else if (key === 'cameraDistance') {
    settings.cameraDistance = Number(value);
    renderer.setCameraRig({ distance: settings.cameraDistance });
  } else if (key === 'cameraLookY') {
    settings.cameraLookY = Number(value);
    renderer.setCameraRig({ lookY: settings.cameraLookY });
  } else if (key === 'music') {
    settings.music = Boolean(value);
    audio.setMusicEnabled(settings.music);
  } else if (key === 'musicVolume') {
    settings.musicVolume = Number(value);
    audio.setMusicVolume(settings.musicVolume);
  } else if (key === 'sfx') {
    settings.sfx = Boolean(value);
    audio.setSfxEnabled(settings.sfx);
  } else if (key === 'sfxVolume') {
    settings.sfxVolume = Number(value);
    audio.setSfxVolume(settings.sfxVolume);
  }

  saveAllSettings();
}

function findHighlightToy() {
  if (!stateMachine.is(GAME_STATES.PLAYING)) {
    return null;
  }

  if (settings.learnMode) {
    const target = ensureLearnTarget();
    if (target) {
      return target;
    }
  }

  const candidate = toyManager.findBestCandidate(claw.getWorldPosition(), 1.3);
  return candidate?.toy || null;
}

async function runDropSequence() {
  if (!stateMachine.is(GAME_STATES.PLAYING) || roundRunning || claw.isBusy()) {
    return;
  }

  roundRunning = true;

  setState(GAME_STATES.DROPPING);
  audio.playDrop();
  await claw.moveVerticalTo(world.bounds.dropY, 580);

  setState(GAME_STATES.GRABBING);

  const preferredType = settings.learnMode ? learnMode.targetType : null;
  const candidateInfo = toyManager.findBestCandidate(claw.getWorldPosition(), 1.03, preferredType);

  let grabbedToy = null;
  if (candidateInfo) {
    const assistBonus = Math.min(0.24, missStreak * 0.08);
    const alignmentBonus = Math.max(0, 0.18 - candidateInfo.distance * 0.18);
    let chance = 0.74 + assistBonus + alignmentBonus;

    if (settings.learnMode && candidateInfo.toy.type === learnMode.targetType) {
      chance += 0.08;
    }

    chance = Math.min(0.96, chance);

    if (Math.random() < chance) {
      grabbedToy = candidateInfo.toy;
      toyManager.markHeld(grabbedToy);
      claw.attachToy(grabbedToy);
      missStreak = 0;
      audio.playGrab(true);
    } else {
      missStreak += 1;
      audio.playGrab(false);
    }
  } else {
    missStreak += 1;
    audio.playGrab(false);
  }

  await wait(190);

  setState(GAME_STATES.RETURNING);
  await claw.moveVerticalTo(world.bounds.homeY, 580);
  await claw.moveToGrid(world.bounds.chuteX, world.bounds.chuteZ, 460);

  setState(GAME_STATES.RESULT);

  if (grabbedToy) {
    const wonToy = claw.consumeHeldToy();
    const wonType = wonToy.type;

    toyManager.removeToy(wonToy);
    toyManager.spawnToy();
    collection = addToCollection(collection, wonType);
    ui.updateCollection(collection);

    audio.playWin();

    if (settings.learnMode) {
      if (learnMode.isTarget(wonType)) {
        const resultText = `You found the ${wonType}!`;
        ui.showResult(resultText, true, 1650);
        speakWithFallback(`${resultText} Great job!`, { urgent: true });
        learnMode.chooseTarget(toyManager.getToyTypes());
        refreshLearnPrompt({ announce: true });
      } else {
        const message = `That's a ${wonType}. Let's try ${learnMode.targetType}!`;
        ui.showResult(message, false, 1650);
        speakWithFallback(message, { urgent: true });
      }
    } else {
      speech.announceWin(wonType);
      if (!speech.supported) {
        audio.playFallbackCheer();
      }
      ui.showResult(`You got a ${wonType}!`, true, 1650);
    }
  } else {
    const missText = settings.learnMode ? buildMissText(learnMode.targetType) : 'Almost! Try again!';
    ui.showResult(missText, false, 1300);
    speakWithFallback(missText, { urgent: true });
  }

  await wait(780);
  if (stateMachine.is(GAME_STATES.COLLECTION)) {
    roundRunning = false;
    return;
  }

  setState(GAME_STATES.PLAYING);
  refreshLearnPrompt();
  roundRunning = false;
}

ui.on('startGame', ({ learnMode: learnEnabled }) => {
  settings.learnMode = Boolean(learnEnabled);
  learnMode.setEnabled(settings.learnMode);
  saveAllSettings();

  ui.showMenu(false);
  ui.showCollection(false);
  ui.showSettings(false);
  missStreak = 0;

  if (settings.learnMode) {
    learnMode.chooseTarget(toyManager.getToyTypes());
    refreshLearnPrompt({ announce: true });
  } else {
    ui.showLearnPrompt('', false);
  }

  setState(GAME_STATES.PLAYING);
  audio.playUiTap();
});

ui.on('move', async (dir) => {
  if (!stateMachine.is(GAME_STATES.PLAYING) || roundRunning) {
    return;
  }

  const move = MOVE_MAP[dir];
  if (!move) {
    return;
  }

  const moved = await claw.moveBy(move[0], move[1]);
  if (moved) {
    audio.playMove();
  }
});

ui.on('drop', () => {
  void runDropSequence();
});

ui.on('openMenu', () => {
  if (roundRunning) {
    return;
  }
  openMenuOverlay();
});

ui.on('closeMenu', () => {
  if (roundRunning) {
    return;
  }

  if (overlayReturnState === GAME_STATES.PLAYING) {
    closeToReturnState();
    return;
  }

  ui.showMenu(false);
  setState(GAME_STATES.PLAYING);
  refreshLearnPrompt();
});

ui.on('openSettings', () => {
  if (roundRunning) {
    return;
  }
  overlayReturnState = stateMachine.is(GAME_STATES.PLAYING) ? GAME_STATES.PLAYING : GAME_STATES.MENU;
  ui.showMenu(false);
  ui.showCollection(false);
  ui.showSettings(true);
  setState(GAME_STATES.MENU);
  audio.playUiTap();
});

ui.on('closeSettings', () => {
  closeToReturnState();
  audio.playUiTap();
});

ui.on('openCollection', () => {
  if (roundRunning) {
    return;
  }
  overlayReturnState = stateMachine.is(GAME_STATES.PLAYING) ? GAME_STATES.PLAYING : GAME_STATES.MENU;
  ui.showMenu(false);
  ui.showSettings(false);
  ui.showCollection(true);
  setState(GAME_STATES.COLLECTION);
  audio.playUiTap();
});

ui.on('closeCollection', () => {
  closeToReturnState();
  audio.playUiTap();
});

ui.on('settingChange', (change) => {
  applySetting(change);
});

ui.on('resetCamera', () => {
  const defaults = renderer.getDefaultCameraRig();
  settings.cameraYaw = defaults.yaw;
  settings.cameraHeight = defaults.height;
  settings.cameraDistance = defaults.distance;
  settings.cameraLookY = defaults.lookY;
  renderer.setCameraRig(defaults);
  saveAllSettings();
  audio.playUiTap();
});

ui.on('collectionSelect', (toyType) => {
  const count = collection[toyType] || 0;
  const text = `${capitalize(toyType)}: ${count}`;
  ui.setCollectionPreviewText(text);
  speakWithFallback(`${toyType}. You have ${count}.`, { urgent: true });
  audio.playUiTap();
});

ui.on('learnToggle', (enabled) => {
  settings.learnMode = Boolean(enabled);
  learnMode.setEnabled(settings.learnMode);
  saveAllSettings();

  if (stateMachine.is(GAME_STATES.PLAYING)) {
    if (settings.learnMode) {
      learnMode.chooseTarget(toyManager.getToyTypes());
      refreshLearnPrompt({ announce: true });
    } else {
      ui.showLearnPrompt('', false);
    }
  }
});

ui.on('enableAudio', async () => {
  const unlocked = await audio.unlock();
  if (unlocked) {
    ui.showAudioOverlay(false);
    audio.playUiTap();
  }
});

if (!(window.AudioContext || window.webkitAudioContext)) {
  ui.showAudioOverlay(false);
}

if (settings.learnMode) {
  learnMode.chooseTarget(toyManager.getToyTypes());
}

let lastFrameTime = performance.now();
function frame(now) {
  const delta = Math.min(0.06, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  elapsed += delta;

  claw.update(delta);
  toyManager.updateAnimations(elapsed);
  world.update(elapsed);

  const highlightToy = findHighlightToy();
  toyManager.updateHighlight(highlightToy, elapsed);

  renderer.render();
  window.requestAnimationFrame(frame);
}

window.requestAnimationFrame(frame);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration failures.
    });
  });
}
