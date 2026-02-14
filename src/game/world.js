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

function makeMachineBody() {
  const machine = new THREE.Group();
  const width = (GRID.maxX - GRID.minX + 1) * GRID.tileSize + 2.4;
  const depth = (GRID.maxZ - GRID.minZ + 1) * GRID.tileSize + 2.8;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1, depth),
    new THREE.MeshStandardMaterial({ color: 0x2f88c6, roughness: 0.68, metalness: 0.1 })
  );
  base.position.y = -0.5;
  base.receiveShadow = true;
  machine.add(base);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(width - 1.1, 0.2, depth - 1.1),
    new THREE.MeshStandardMaterial({ color: 0xf6f0d7, roughness: 0.95, metalness: 0 })
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
    new THREE.MeshStandardMaterial({ color: 0x165b8d, roughness: 0.72, metalness: 0.12 })
  );
  topFrame.position.y = GRID.topY + 0.3;
  machine.add(topFrame);

  const railMaterial = new THREE.MeshStandardMaterial({ color: 0xc5ced9, roughness: 0.45, metalness: 0.55 });
  const railX = new THREE.Mesh(new THREE.BoxGeometry(width - 1.5, 0.16, 0.16), railMaterial);
  railX.position.set(0, GRID.topY, 0);
  machine.add(railX);

  const railZ = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, depth - 1.5), railMaterial);
  railZ.position.set(0, GRID.topY, 0);
  machine.add(railZ);

  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.3, 1),
    new THREE.MeshStandardMaterial({ color: 0xf1b847, roughness: 0.72, metalness: 0.08 })
  );
  chute.position.set(0, 0.6, depth / 2 - 0.75);
  machine.add(chute);

  const chuteOpening = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.45, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x2e1f16, roughness: 1, metalness: 0 })
  );
  chuteOpening.position.set(0, 0.8, depth / 2 - 0.47);
  machine.add(chuteOpening);

  machine.userData = { width, depth };

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

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
  keyLight.position.set(5, 9, 6);
  keyLight.castShadow = Boolean(shadows);
  keyLight.shadow.mapSize.set(512, 512);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8acfff, 0.35);
  fillLight.position.set(-4, 7, -5);
  scene.add(fillLight);

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
    bounds: {
      ...GRID,
      width: machine.userData.width,
      depth: machine.userData.depth
    }
  };
}
