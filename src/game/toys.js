import * as THREE from 'three';
import { GRID } from './world.js';

const TOY_TYPES = ['bunny', 'bear', 'star', 'ball', 'car', 'cat', 'dog'];

const TOY_PALETTES = {
  bunny: ['#ffd4f0', '#ff79bf', '#fff6fd', '#ffb8db'],
  bear: ['#ffd39b', '#d08a4e', '#fff0d8', '#8b582f'],
  star: ['#ffe766', '#ffbe32', '#fffcd1', '#ff8f3a'],
  ball: ['#88dcff', '#3db6ff', '#eef8ff', '#3a68d5'],
  car: ['#ff666f', '#ffcf4d', '#fff5de', '#355278'],
  cat: ['#ffc08d', '#ff8f44', '#fff3e2', '#5f412c'],
  dog: ['#d7bf9f', '#b18b60', '#f4e7d3', '#5c4630']
};

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function makePixelTexture(colors) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, 16, 16);

  for (let y = 0; y < 16; y += 2) {
    for (let x = 0; x < 16; x += 2) {
      const shade = colors[(x + y) % colors.length];
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function makeToyIcon(type, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#1a2d40';
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = colors[1];
  ctx.fillRect(8, 8, 48, 48);

  ctx.fillStyle = colors[2];
  for (let y = 12; y < 52; y += 4) {
    for (let x = 12; x < 52; x += 4) {
      if ((x + y) % 8 === 0) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type.slice(0, 1).toUpperCase(), 32, 34);

  return canvas.toDataURL('image/png');
}

function applyShadow(mesh, enabled) {
  mesh.castShadow = enabled;
  mesh.receiveShadow = enabled;
}

function createToyMaterial(type) {
  const texture = makePixelTexture(TOY_PALETTES[type]);
  const emissive = new THREE.Color(TOY_PALETTES[type][1]).multiplyScalar(0.35);
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.06,
    emissive,
    emissiveIntensity: 0.28
  });
}

function createPart(geometry, material, x, y, z, shadowEnabled) {
  const mesh = new THREE.Mesh(geometry, material.clone());
  mesh.position.set(x, y, z);
  applyShadow(mesh, shadowEnabled);
  return mesh;
}

function createFeatureMaterial(color, { roughness = 0.42, metalness = 0.06, emissive = 0x000000, emissiveIntensity = 0 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity
  });
}

function addEyes(group, shadowEnabled, { y, z, spread = 0.13, size = 0.08 }) {
  const eyeMaterial = createFeatureMaterial(0x111111, { roughness: 0.2, metalness: 0.15 });
  group.add(createPart(new THREE.BoxGeometry(size, size, size * 0.8), eyeMaterial, -spread, y, z, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(size, size, size * 0.8), eyeMaterial, spread, y, z, shadowEnabled));
}

function addNose(group, shadowEnabled, { x = 0, y, z, size = 0.08, color = 0xff9abb }) {
  const noseMaterial = createFeatureMaterial(color, { roughness: 0.25, metalness: 0.08 });
  group.add(createPart(new THREE.BoxGeometry(size, size * 0.75, size * 0.75), noseMaterial, x, y, z, shadowEnabled));
}

function buildBunny(material, shadowEnabled) {
  const group = new THREE.Group();
  const innerEarMaterial = createFeatureMaterial(0xffb0d7);
  const footMaterial = createFeatureMaterial(0xffe7f5);

  group.add(createPart(new THREE.BoxGeometry(0.86, 0.68, 0.7), material, 0, 0.39, 0, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.64, 0.54, 0.56), material, 0, 0.92, 0.07, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.17, 0.82, 0.16), material, -0.18, 1.52, 0.06, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.17, 0.82, 0.16), material, 0.18, 1.52, 0.06, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.08, 0.62, 0.08), innerEarMaterial, -0.18, 1.52, 0.13, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.08, 0.62, 0.08), innerEarMaterial, 0.18, 1.52, 0.13, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.2, 0.18, 0.28), footMaterial, -0.17, 0.12, 0.22, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.2, 0.18, 0.28), footMaterial, 0.17, 0.12, 0.22, shadowEnabled));
  group.add(createPart(new THREE.SphereGeometry(0.12, 8, 8), footMaterial, 0, 0.44, -0.36, shadowEnabled));
  addEyes(group, shadowEnabled, { y: 0.98, z: 0.35, spread: 0.12, size: 0.08 });
  addNose(group, shadowEnabled, { y: 0.85, z: 0.37, size: 0.075, color: 0xff92bf });
  return group;
}

function buildBear(material, shadowEnabled) {
  const group = new THREE.Group();
  const muzzleMaterial = createFeatureMaterial(0xf8dfc6);
  const pawMaterial = createFeatureMaterial(0xf5ddc3);

  group.add(createPart(new THREE.BoxGeometry(0.94, 0.74, 0.77), material, 0, 0.41, 0, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.72, 0.62, 0.62), material, 0, 0.95, 0.05, shadowEnabled));
  group.add(createPart(new THREE.SphereGeometry(0.15, 8, 8), material, -0.24, 1.3, 0.02, shadowEnabled));
  group.add(createPart(new THREE.SphereGeometry(0.15, 8, 8), material, 0.24, 1.3, 0.02, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.32, 0.22, 0.24), muzzleMaterial, 0, 0.8, 0.36, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.22, 0.2, 0.24), pawMaterial, -0.2, 0.14, 0.24, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.22, 0.2, 0.24), pawMaterial, 0.2, 0.14, 0.24, shadowEnabled));
  addEyes(group, shadowEnabled, { y: 0.99, z: 0.34, spread: 0.14, size: 0.08 });
  addNose(group, shadowEnabled, { y: 0.78, z: 0.47, size: 0.09, color: 0x3b2a24 });
  return group;
}

function buildStar(material, shadowEnabled) {
  const group = new THREE.Group();
  const pointMaterial = createFeatureMaterial(0xfff4a0, { emissive: 0xffd053, emissiveIntensity: 0.22 });
  const cone = new THREE.ConeGeometry(0.16, 0.42, 4);

  group.add(createPart(new THREE.OctahedronGeometry(0.3, 0), material, 0, 0.62, 0, shadowEnabled));

  const xPos = createPart(cone, pointMaterial, 0.34, 0.62, 0, shadowEnabled);
  xPos.rotation.z = -Math.PI / 2;
  group.add(xPos);

  const xNeg = createPart(cone, pointMaterial, -0.34, 0.62, 0, shadowEnabled);
  xNeg.rotation.z = Math.PI / 2;
  group.add(xNeg);

  const zPos = createPart(cone, pointMaterial, 0, 0.62, 0.34, shadowEnabled);
  zPos.rotation.x = Math.PI / 2;
  group.add(zPos);

  const zNeg = createPart(cone, pointMaterial, 0, 0.62, -0.34, shadowEnabled);
  zNeg.rotation.x = -Math.PI / 2;
  group.add(zNeg);

  const yPos = createPart(cone, pointMaterial, 0, 0.95, 0, shadowEnabled);
  group.add(yPos);
  return group;
}

function buildBall(material, shadowEnabled) {
  const group = new THREE.Group();
  const stripeMaterial = createFeatureMaterial(0xf6fbff, { roughness: 0.4 });
  const bandGeometry = new THREE.TorusGeometry(0.47, 0.05, 8, 16);

  group.add(createPart(new THREE.SphereGeometry(0.5, 10, 10), material, 0, 0.6, 0, shadowEnabled));
  const bandA = createPart(bandGeometry, stripeMaterial, 0, 0.6, 0, shadowEnabled);
  bandA.rotation.x = Math.PI / 2;
  group.add(bandA);

  const bandB = createPart(bandGeometry, stripeMaterial, 0, 0.6, 0, shadowEnabled);
  bandB.rotation.y = Math.PI / 2;
  group.add(bandB);
  return group;
}

function buildCar(material, shadowEnabled) {
  const group = new THREE.Group();
  const wheelMaterial = createFeatureMaterial(0x2b2b36, { roughness: 0.34, metalness: 0.16 });
  const windshieldMaterial = createFeatureMaterial(0xcff6ff, { roughness: 0.2, metalness: 0.12 });
  const lightMaterial = createFeatureMaterial(0xfff49f, { emissive: 0xffe566, emissiveIntensity: 0.4, roughness: 0.22 });

  group.add(createPart(new THREE.BoxGeometry(1.12, 0.32, 0.66), material, 0, 0.33, 0, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.56, 0.28, 0.56), material, -0.05, 0.62, 0, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.38, 0.14, 0.57), windshieldMaterial, 0.03, 0.66, 0, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.2, 0.1, 0.62), lightMaterial, 0.53, 0.35, 0, shadowEnabled));

  const wheelGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.2, 8);
  group.add(createPart(wheelGeometry, wheelMaterial, -0.36, 0.19, -0.29, shadowEnabled));
  group.add(createPart(wheelGeometry, wheelMaterial, 0.36, 0.19, -0.29, shadowEnabled));
  group.add(createPart(wheelGeometry, wheelMaterial, -0.36, 0.19, 0.29, shadowEnabled));
  group.add(createPart(wheelGeometry, wheelMaterial, 0.36, 0.19, 0.29, shadowEnabled));
  group.children.slice(-4).forEach((wheel) => {
    wheel.rotation.z = Math.PI / 2;
  });
  return group;
}

function buildCat(material, shadowEnabled) {
  const group = new THREE.Group();
  const earInnerMaterial = createFeatureMaterial(0xffd0b3);
  const whiskerMaterial = createFeatureMaterial(0xfefefe, { roughness: 0.3 });
  const tailMaterial = createFeatureMaterial(0xffa25f);
  const earGeometry = new THREE.ConeGeometry(0.12, 0.28, 4);

  group.add(createPart(new THREE.BoxGeometry(0.9, 0.6, 0.66), material, 0, 0.36, 0, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.66, 0.5, 0.52), material, 0, 0.84, 0.08, shadowEnabled));

  const earL = createPart(earGeometry, material, -0.19, 1.2, 0.09, shadowEnabled);
  earL.rotation.z = 0.1;
  group.add(earL);
  const earR = createPart(earGeometry, material, 0.19, 1.2, 0.09, shadowEnabled);
  earR.rotation.z = -0.1;
  group.add(earR);
  group.add(createPart(new THREE.ConeGeometry(0.07, 0.18, 4), earInnerMaterial, -0.19, 1.18, 0.14, shadowEnabled));
  group.add(createPart(new THREE.ConeGeometry(0.07, 0.18, 4), earInnerMaterial, 0.19, 1.18, 0.14, shadowEnabled));

  const tail = createPart(new THREE.CylinderGeometry(0.06, 0.08, 0.52, 6), tailMaterial, 0.34, 0.66, -0.25, shadowEnabled);
  tail.rotation.x = -0.95;
  tail.rotation.z = -0.22;
  group.add(tail);

  group.add(createPart(new THREE.BoxGeometry(0.2, 0.03, 0.03), whiskerMaterial, -0.2, 0.8, 0.35, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.2, 0.03, 0.03), whiskerMaterial, 0.2, 0.8, 0.35, shadowEnabled));
  addEyes(group, shadowEnabled, { y: 0.89, z: 0.34, spread: 0.14, size: 0.08 });
  addNose(group, shadowEnabled, { y: 0.77, z: 0.36, size: 0.075, color: 0xff9ba3 });
  return group;
}

function buildDog(material, shadowEnabled) {
  const group = new THREE.Group();
  const earMaterial = createFeatureMaterial(0x9f7853);
  const muzzleMaterial = createFeatureMaterial(0xead8be);
  const pawMaterial = createFeatureMaterial(0xe5d0b1);

  group.add(createPart(new THREE.BoxGeometry(0.98, 0.62, 0.74), material, 0, 0.37, 0, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.68, 0.5, 0.58), material, 0.02, 0.84, 0.06, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.33, 0.2, 0.26), muzzleMaterial, 0.02, 0.74, 0.38, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.12, 0.34, 0.1), earMaterial, -0.27, 0.82, 0.06, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.12, 0.34, 0.1), earMaterial, 0.29, 0.82, 0.06, shadowEnabled));

  const tail = createPart(new THREE.ConeGeometry(0.08, 0.36, 5), earMaterial, 0.32, 0.67, -0.35, shadowEnabled);
  tail.rotation.x = -1.1;
  tail.rotation.z = -0.12;
  group.add(tail);

  group.add(createPart(new THREE.BoxGeometry(0.2, 0.16, 0.24), pawMaterial, -0.2, 0.12, 0.24, shadowEnabled));
  group.add(createPart(new THREE.BoxGeometry(0.2, 0.16, 0.24), pawMaterial, 0.2, 0.12, 0.24, shadowEnabled));
  addEyes(group, shadowEnabled, { y: 0.88, z: 0.33, spread: 0.15, size: 0.08 });
  addNose(group, shadowEnabled, { x: 0.02, y: 0.71, z: 0.51, size: 0.09, color: 0x2f2525 });
  return group;
}

function buildToy(type, material, shadowEnabled) {
  switch (type) {
    case 'bunny':
      return buildBunny(material, shadowEnabled);
    case 'bear':
      return buildBear(material, shadowEnabled);
    case 'star':
      return buildStar(material, shadowEnabled);
    case 'ball':
      return buildBall(material, shadowEnabled);
    case 'car':
      return buildCar(material, shadowEnabled);
    case 'cat':
      return buildCat(material, shadowEnabled);
    case 'dog':
      return buildDog(material, shadowEnabled);
    default:
      return buildBall(material, shadowEnabled);
  }
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(255,255,220,0.95)');
  gradient.addColorStop(0.45, 'rgba(255,245,120,0.55)');
  gradient.addColorStop(1, 'rgba(255,245,120,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export class ToyManager {
  constructor({ scene, toyLayer, bounds = GRID, shadows = false }) {
    this.scene = scene;
    this.toyLayer = toyLayer;
    this.bounds = bounds;
    this.shadowEnabled = Boolean(shadows);

    this.toys = [];
    this.nextId = 1;
    this.highlightedToy = null;

    this.materialByType = Object.fromEntries(TOY_TYPES.map((type) => [type, createToyMaterial(type)]));
    this.iconByType = Object.fromEntries(TOY_TYPES.map((type) => [type, makeToyIcon(type, TOY_PALETTES[type])]));

    this.highlightRing = new THREE.Mesh(
      new THREE.RingGeometry(0.38, 0.65, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfff367,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.highlightRing.rotation.x = -Math.PI / 2;
    this.highlightRing.visible = false;
    this.scene.add(this.highlightRing);

    this.highlightSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlowTexture(),
        color: 0xfff17d,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        depthTest: false
      })
    );
    this.highlightSprite.scale.set(1.6, 1.6, 1);
    this.highlightSprite.visible = false;
    this.scene.add(this.highlightSprite);
  }

  getToyTypes() {
    return [...TOY_TYPES];
  }

  getIcons() {
    return { ...this.iconByType };
  }

  setShadows(enabled) {
    this.shadowEnabled = Boolean(enabled);
    this.toys.forEach((toy) => {
      toy.parts.forEach((part) => applyShadow(part, this.shadowEnabled));
    });
  }

  spawnInitial(count = 18) {
    for (let index = 0; index < count; index += 1) {
      this.spawnToy();
    }
  }

  spawnToy(type = pickRandom(TOY_TYPES)) {
    const position = this.findOpenPosition();
    const root = buildToy(type, this.materialByType[type], this.shadowEnabled);
    root.position.set(position.x, 0.2, position.z);

    const parts = [];
    root.traverse((child) => {
      if (child.isMesh) {
        parts.push(child);
      }
    });

    const toy = {
      id: this.nextId,
      type,
      root,
      parts,
      held: false,
      baseY: 0.2 + THREE.MathUtils.randFloat(0, 0.06),
      bobPhase: THREE.MathUtils.randFloat(0, Math.PI * 2)
    };

    this.nextId += 1;
    this.toyLayer.add(root);
    this.toys.push(toy);
    return toy;
  }

  removeToy(toy) {
    if (!toy) {
      return;
    }

    this.toyLayer.remove(toy.root);
    toy.root.removeFromParent();
    this.toys = this.toys.filter((item) => item.id !== toy.id);

    if (this.highlightedToy && this.highlightedToy.id === toy.id) {
      this.clearHighlight();
    }
  }

  findOpenPosition() {
    const used = this.toys.map((toy) => toy.root.position);

    for (let attempts = 0; attempts < 36; attempts += 1) {
      const gx = THREE.MathUtils.randInt(this.bounds.minX, this.bounds.maxX);
      const gz = THREE.MathUtils.randInt(this.bounds.minZ, this.bounds.maxZ);
      const x = gx * this.bounds.tileSize + THREE.MathUtils.randFloatSpread(0.3);
      const z = gz * this.bounds.tileSize + THREE.MathUtils.randFloatSpread(0.3);

      const collides = used.some((point) => {
        const dx = point.x - x;
        const dz = point.z - z;
        return Math.sqrt(dx * dx + dz * dz) < 0.82;
      });

      if (!collides) {
        return { x, z };
      }
    }

    return {
      x: THREE.MathUtils.randFloat(this.bounds.minX * this.bounds.tileSize, this.bounds.maxX * this.bounds.tileSize),
      z: THREE.MathUtils.randFloat(this.bounds.minZ * this.bounds.tileSize, this.bounds.maxZ * this.bounds.tileSize)
    };
  }

  getAvailableToys() {
    return this.toys.filter((toy) => !toy.held);
  }

  findBestCandidate(reference, radius, preferredType = null) {
    const available = this.getAvailableToys();

    const withinRadius = available
      .map((toy) => {
        const dx = toy.root.position.x - reference.x;
        const dz = toy.root.position.z - reference.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return {
          toy,
          distance
        };
      })
      .filter((entry) => entry.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    if (!withinRadius.length) {
      return null;
    }

    if (preferredType) {
      const preferred = withinRadius.find((entry) => entry.toy.type === preferredType);
      if (preferred) {
        return preferred;
      }
    }

    return withinRadius[0];
  }

  findTargetToy(type, reference = null) {
    const matches = this.getAvailableToys().filter((toy) => toy.type === type);
    if (!matches.length) {
      return null;
    }

    if (!reference) {
      return matches[0];
    }

    return matches
      .map((toy) => {
        const dx = toy.root.position.x - reference.x;
        const dz = toy.root.position.z - reference.z;
        return { toy, distance: Math.sqrt(dx * dx + dz * dz) };
      })
      .sort((a, b) => a.distance - b.distance)[0].toy;
  }

  markHeld(toy) {
    if (toy) {
      toy.held = true;
    }
  }

  getGridForToy(toy) {
    const gx = Math.round(toy.root.position.x / this.bounds.tileSize);
    const gz = Math.round(toy.root.position.z / this.bounds.tileSize);
    return {
      gx: THREE.MathUtils.clamp(gx, this.bounds.minX, this.bounds.maxX),
      gz: THREE.MathUtils.clamp(gz, this.bounds.minZ, this.bounds.maxZ)
    };
  }

  updateHighlight(toy, elapsed) {
    if (this.highlightedToy && this.highlightedToy !== toy) {
      this.highlightedToy.parts.forEach((part) => {
        if (part.material && part.material.emissiveIntensity !== undefined) {
          part.material.emissiveIntensity = 0.28;
        }
      });
    }

    this.highlightedToy = toy;

    if (!toy) {
      this.highlightRing.visible = false;
      this.highlightSprite.visible = false;
      return;
    }

    const pulse = 0.58 + Math.sin(elapsed * 8) * 0.22;
    toy.parts.forEach((part) => {
      if (part.material && part.material.emissiveIntensity !== undefined) {
        part.material.emissiveIntensity = 0.34 + pulse;
      }
    });

    const pos = toy.root.position;
    this.highlightRing.visible = true;
    this.highlightRing.position.set(pos.x, 0.26, pos.z);
    this.highlightRing.material.opacity = 0.8 + Math.sin(elapsed * 8) * 0.15;

    this.highlightSprite.visible = true;
    this.highlightSprite.position.set(pos.x, 0.95, pos.z);
    this.highlightSprite.material.opacity = 0.36 + Math.sin(elapsed * 8) * 0.1;
  }

  clearHighlight() {
    if (this.highlightedToy) {
      this.highlightedToy.parts.forEach((part) => {
        if (part.material && part.material.emissiveIntensity !== undefined) {
          part.material.emissiveIntensity = 0.28;
        }
      });
    }

    this.highlightedToy = null;
    this.highlightRing.visible = false;
    this.highlightSprite.visible = false;
  }

  updateAnimations(elapsed) {
    this.toys.forEach((toy) => {
      if (toy.held) {
        return;
      }

      toy.root.position.y = toy.baseY + Math.sin(elapsed * 1.8 + toy.bobPhase) * 0.045;
      toy.root.rotation.y = Math.sin(elapsed * 0.75 + toy.bobPhase) * 0.08;
    });
  }
}
