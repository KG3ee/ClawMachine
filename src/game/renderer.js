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
  constructor(container, { pixelation = true, shadows = false, zoom = 1 } = {}) {
    this.container = container;
    this.pixelation = Boolean(pixelation);
    this.zoom = zoom;
    this.lowResScale = 0.52;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xb7e5ff, 16, 30);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
    this.baseCameraPosition = new THREE.Vector3(0, 8.8, 14.4);
    this.cameraLookAt = new THREE.Vector3(0, 2.6, -0.3);

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

    this.applyCameraZoom(this.zoom);

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  getCappedDpr() {
    const maxDpr = detectIPad() ? 2 : 2;
    return clamp(window.devicePixelRatio || 1, 1, maxDpr);
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
