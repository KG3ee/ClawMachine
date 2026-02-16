import * as THREE from 'three';

function detectIPad() {
  const userAgent = window.navigator.userAgent || '';
  const touchMac = userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1;
  return /iPad/i.test(userAgent) || touchMac;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class GameRenderer {
  constructor(
    container,
    {
      pixelation = true,
      shadows = false,
      zoom = 1,
      cameraYaw = 0,
      cameraHeight = 7.4,
      cameraDistance = 15.2,
      cameraLookY = 1.8
    } = {}
  ) {
    this.container = container;
    this.pixelation = Boolean(pixelation);
    this.zoom = zoom;
    this.lowResScale = 0.52;

    this.defaultCameraRig = Object.freeze({
      yaw: 0,
      height: 7.4,
      distance: 15.2,
      lookY: 1.8
    });
    this.cameraYaw = cameraYaw;
    this.cameraHeight = cameraHeight;
    this.cameraDistance = cameraDistance;
    this.cameraLookY = cameraLookY;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xb7e5ff, 24, 46);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
    this.baseCameraPosition = new THREE.Vector3(0, 7.4, 15.2);
    this.cameraLookAt = new THREE.Vector3(0, 1.8, -0.3);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.renderer.shadowMap.enabled = Boolean(shadows);
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(0x8fd0ff, 1);

    this.container.appendChild(this.renderer.domElement);

    this.setCameraRig({
      yaw: this.cameraYaw,
      height: this.cameraHeight,
      distance: this.cameraDistance,
      lookY: this.cameraLookY
    });
    this.applyCameraZoom(this.zoom);

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  getCappedDpr() {
    const maxDpr = detectIPad() ? 2 : 2;
    return clamp(window.devicePixelRatio || 1, 1, maxDpr);
  }

  setCameraRig({ yaw, height, distance, lookY } = {}) {
    if (typeof yaw === 'number' && Number.isFinite(yaw)) {
      this.cameraYaw = clamp(yaw, -50, 50);
    }
    if (typeof height === 'number' && Number.isFinite(height)) {
      this.cameraHeight = clamp(height, 5.2, 13.5);
    }
    if (typeof distance === 'number' && Number.isFinite(distance)) {
      this.cameraDistance = clamp(distance, 9, 22);
    }
    if (typeof lookY === 'number' && Number.isFinite(lookY)) {
      this.cameraLookY = clamp(lookY, 0.8, 5.4);
    }

    const yawRad = THREE.MathUtils.degToRad(this.cameraYaw);
    this.baseCameraPosition.set(Math.sin(yawRad) * this.cameraDistance, this.cameraHeight, Math.cos(yawRad) * this.cameraDistance);
    this.cameraLookAt.set(0, this.cameraLookY, -0.3);
    this.applyCameraZoom(this.zoom);
  }

  getDefaultCameraRig() {
    return {
      ...this.defaultCameraRig
    };
  }

  getCameraRig() {
    return {
      yaw: this.cameraYaw,
      height: this.cameraHeight,
      distance: this.cameraDistance,
      lookY: this.cameraLookY
    };
  }

  applyCameraZoom(zoomValue) {
    this.zoom = clamp(Number(zoomValue) || 1, 0.8, 1.4);
    this.camera.position.copy(this.baseCameraPosition.clone().multiplyScalar(this.zoom));
    this.camera.lookAt(this.cameraLookAt);
  }

  setPixelation(enabled) {
    this.pixelation = Boolean(enabled);
    this.resize();
  }

  setShadows(enabled) {
    this.renderer.shadowMap.enabled = Boolean(enabled);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    if (this.pixelation) {
      const renderWidth = Math.max(1, Math.floor(width * this.lowResScale));
      const renderHeight = Math.max(1, Math.floor(height * this.lowResScale));
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(renderWidth, renderHeight, false);
      this.renderer.domElement.style.width = `${width}px`;
      this.renderer.domElement.style.height = `${height}px`;
      this.renderer.domElement.style.imageRendering = 'pixelated';
    } else {
      this.renderer.setPixelRatio(this.getCappedDpr());
      this.renderer.setSize(width, height, false);
      this.renderer.domElement.style.width = `${width}px`;
      this.renderer.domElement.style.height = `${height}px`;
      this.renderer.domElement.style.imageRendering = 'auto';
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
  }
}
