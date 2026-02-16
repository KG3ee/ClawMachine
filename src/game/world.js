import * as THREE from 'three';

export const GRID = Object.freeze({
  minX: -3,
  maxX: 3,
  minZ: -3,
  maxZ: 3,
  tileSize: 1.35,
  topY: 7.2,
  homeY: 6,
  dropY: 1.6,
  chuteX: 0,
  chuteZ: 3
});

function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f6f4db';
  ctx.fillRect(0, 0, 64, 64);

  const colors = ['#ff9ecf', '#8bdcff', '#ffe16f', '#89f09b', '#b2a7ff'];
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      ctx.fillStyle = colors[(x / 8 + y / 8) % colors.length];
      ctx.fillRect(x + 1, y + 1, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 4, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

function makeMachineBody() {
  const machine = new THREE.Group();
  const width = (GRID.maxX - GRID.minX + 1) * GRID.tileSize + 2.4;
  const depth = (GRID.maxZ - GRID.minZ + 1) * GRID.tileSize + 2.8;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1, depth),
    new THREE.MeshStandardMaterial({ color: 0x2b88d9, roughness: 0.62, metalness: 0.14 })
  );
  base.position.y = -0.5;
  base.receiveShadow = true;
  machine.add(base);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(width - 1.1, 0.2, depth - 1.1),
    new THREE.MeshStandardMaterial({
      map: createFloorTexture(),
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0
    })
  );
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  machine.add(floor);

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xd3f3ff,
    transparent: true,
    opacity: 0.42,
    roughness: 0.2,
    metalness: 0.06
  });

  const wallThickness = 0.2;
  const wallHeight = 5.5;
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(width - 0.6, wallHeight, wallThickness), glassMaterial.clone());
  backWall.position.set(0, wallHeight / 2, -depth / 2 + wallThickness / 2);
  machine.add(backWall);

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(width - 0.6, wallHeight, wallThickness), glassMaterial.clone());
  frontWall.position.set(0, wallHeight / 2, depth / 2 - wallThickness / 2);
  machine.add(frontWall);

  const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, depth - 0.2), glassMaterial.clone());
  sideWallL.position.set(-width / 2 + wallThickness / 2, wallHeight / 2, 0);
  machine.add(sideWallL);

  const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, depth - 0.2), glassMaterial.clone());
  sideWallR.position.set(width / 2 - wallThickness / 2, wallHeight / 2, 0);
  machine.add(sideWallR);

  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.45, depth),
    new THREE.MeshStandardMaterial({ color: 0xff6fb1, roughness: 0.56, metalness: 0.14 })
  );
  topFrame.position.y = GRID.topY + 0.3;
  machine.add(topFrame);

  const rainbowRail = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.4, 0.12, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x3dd5ff, emissive: 0x204666, emissiveIntensity: 0.4, roughness: 0.34, metalness: 0.2 })
  );
  rainbowRail.position.set(0, GRID.topY + 0.56, depth / 2 - 0.5);
  machine.add(rainbowRail);

  const sideStripeMaterial = new THREE.MeshStandardMaterial({ color: 0x75f3a0, roughness: 0.55, metalness: 0.14 });
  const sideStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.8, 0.28), sideStripeMaterial);
  sideStripeL.position.set(-width / 2 + 0.3, 2.4, depth / 2 - 0.6);
  machine.add(sideStripeL);

  const sideStripeR = sideStripeL.clone();
  sideStripeR.position.x *= -1;
  machine.add(sideStripeR);

  const railMaterial = new THREE.MeshStandardMaterial({ color: 0xc5ced9, roughness: 0.45, metalness: 0.55 });
  const railX = new THREE.Mesh(new THREE.BoxGeometry(width - 1.5, 0.16, 0.16), railMaterial);
  railX.position.set(0, GRID.topY, 0);
  machine.add(railX);

  const railZ = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, depth - 1.5), railMaterial);
  railZ.position.set(0, GRID.topY, 0);
  machine.add(railZ);

  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.3, 1),
    new THREE.MeshStandardMaterial({ color: 0xffbb5a, roughness: 0.62, metalness: 0.1 })
  );
  chute.position.set(0, 0.6, depth / 2 - 0.75);
  machine.add(chute);

  const chuteOpening = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.45, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x2e1f16, roughness: 1, metalness: 0 })
  );
  chuteOpening.position.set(0, 0.8, depth / 2 - 0.47);
  machine.add(chuteOpening);

  const marqueeBulbs = [];
  const bulbColors = [0xfff27c, 0x8ceaff, 0xff92cc, 0xa6ff9b];
  const bulbGeometry = new THREE.SphereGeometry(0.12, 8, 8);
  for (let index = 0; index < 14; index += 1) {
    const t = index / 13;
    const bulb = new THREE.Mesh(
      bulbGeometry,
      new THREE.MeshStandardMaterial({
        color: bulbColors[index % bulbColors.length],
        emissive: bulbColors[index % bulbColors.length],
        emissiveIntensity: 0.85,
        roughness: 0.22,
        metalness: 0.12
      })
    );
    bulb.position.set(-width / 2 + 0.8 + t * (width - 1.6), GRID.topY + 0.55, depth / 2 - 0.35);
    machine.add(bulb);
    marqueeBulbs.push(bulb);
  }

  machine.userData = { width, depth, marqueeBulbs };

  return machine;
}

export function createWorld(scene, { shadows = false } = {}) {
  const root = new THREE.Group();
  scene.add(root);

  const machine = makeMachineBody();
  root.add(machine);

  const toyLayer = new THREE.Group();
  toyLayer.position.y = 0.2;
  root.add(toyLayer);

  const clawLayer = new THREE.Group();
  root.add(clawLayer);

  const ambient = new THREE.AmbientLight(0xffffff, 0.82);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff6e9, 1.05);
  keyLight.position.set(5.4, 8, 6.2);
  keyLight.castShadow = Boolean(shadows);
  keyLight.shadow.mapSize.set(512, 512);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x7dcfff, 0.5);
  fillLight.position.set(-4.8, 6.4, -5.4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xff89c8, 0.35);
  rimLight.position.set(0, 5.4, 7.5);
  scene.add(rimLight);

  const shadowTargets = [];

  function setShadows(enabled) {
    keyLight.castShadow = Boolean(enabled);
    shadowTargets.forEach((mesh) => {
      mesh.castShadow = Boolean(enabled);
      mesh.receiveShadow = Boolean(enabled);
    });
  }

  setShadows(shadows);

  return {
    root,
    machine,
    toyLayer,
    clawLayer,
    shadowTargets,
    setShadows,
    update(elapsed) {
      const bulbs = machine.userData.marqueeBulbs || [];
      bulbs.forEach((bulb, index) => {
        const phase = elapsed * 3.4 + index * 0.45;
        bulb.material.emissiveIntensity = 0.75 + Math.sin(phase) * 0.28;
      });
    },
    bounds: {
      ...GRID,
      width: machine.userData.width,
      depth: machine.userData.depth
    }
  };
}
