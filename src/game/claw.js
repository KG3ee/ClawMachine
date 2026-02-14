import * as THREE from 'three';
import { GRID } from './world.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class ClawController {
  constructor({ clawLayer, bounds = GRID, shadows = false }) {
    this.bounds = bounds;
    this.clawLayer = clawLayer;
    this.shadows = Boolean(shadows);

    this.gridX = 0;
    this.gridZ = 0;

    this.currentX = 0;
    this.currentZ = 0;
    this.currentY = bounds.homeY;

    this.horizontalTween = null;
    this.verticalTween = null;

    this.heldToy = null;

    this.carriage = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.35, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xd4dee9, roughness: 0.45, metalness: 0.4 })
    );
    this.clawLayer.add(this.carriage);

    this.cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1, 10),
      new THREE.MeshStandardMaterial({ color: 0x24313d, roughness: 0.62, metalness: 0.2 })
    );
    this.clawLayer.add(this.cable);

    this.hookRoot = new THREE.Group();
    this.clawLayer.add(this.hookRoot);

    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xc3ced9, roughness: 0.45, metalness: 0.42 })
    );
    this.hookRoot.add(hub);

    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x9eacba, roughness: 0.42, metalness: 0.5 });
    const armGeometry = new THREE.BoxGeometry(0.1, 0.65, 0.1);
    const armOffsets = [
      [0.24, -0.32, 0],
      [-0.24, -0.32, 0],
      [0, -0.32, 0.24]
    ];

    armOffsets.forEach(([x, y, z], idx) => {
      const arm = new THREE.Mesh(armGeometry, armMaterial);
      arm.position.set(x, y, z);
      arm.rotation.z = idx === 0 ? 0.15 : idx === 1 ? -0.15 : 0;
      arm.rotation.x = idx === 2 ? -0.15 : 0;
      this.hookRoot.add(arm);
    });

    this.toyAnchor = new THREE.Group();
    this.toyAnchor.position.y = -0.7;
    this.hookRoot.add(this.toyAnchor);

    this.setShadows(shadows);
    this.setGridInstant(0, 0);
  }

  setShadows(enabled) {
    this.shadows = Boolean(enabled);
    [this.carriage, this.cable, this.hookRoot].forEach((node) => {
      node.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = this.shadows;
          child.receiveShadow = this.shadows;
        }
      });
    });
  }

  worldFromGrid(gx, gz) {
    return {
      x: gx * this.bounds.tileSize,
      z: gz * this.bounds.tileSize
    };
  }

  setGridInstant(gx, gz) {
    this.gridX = clamp(gx, this.bounds.minX, this.bounds.maxX);
    this.gridZ = clamp(gz, this.bounds.minZ, this.bounds.maxZ);
    const world = this.worldFromGrid(this.gridX, this.gridZ);

    this.currentX = world.x;
    this.currentZ = world.z;
    this.currentY = this.bounds.homeY;

    this.syncMeshes();
  }

  isBusy() {
    return Boolean(this.horizontalTween || this.verticalTween);
  }

  moveBy(dx, dz, duration = 180) {
    const targetGX = clamp(this.gridX + dx, this.bounds.minX, this.bounds.maxX);
    const targetGZ = clamp(this.gridZ + dz, this.bounds.minZ, this.bounds.maxZ);

    if (targetGX === this.gridX && targetGZ === this.gridZ) {
      return Promise.resolve(false);
    }

    if (this.isBusy()) {
      return Promise.resolve(false);
    }

    return this.moveToGrid(targetGX, targetGZ, duration).then(() => true);
  }

  moveToGrid(targetGX, targetGZ, duration = 220) {
    const nextGX = clamp(targetGX, this.bounds.minX, this.bounds.maxX);
    const nextGZ = clamp(targetGZ, this.bounds.minZ, this.bounds.maxZ);
    const target = this.worldFromGrid(nextGX, nextGZ);

    if (this.currentX === target.x && this.currentZ === target.z) {
      this.gridX = nextGX;
      this.gridZ = nextGZ;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.horizontalTween = {
        fromX: this.currentX,
        fromZ: this.currentZ,
        toX: target.x,
        toZ: target.z,
        duration,
        elapsed: 0,
        resolve,
        targetGX: nextGX,
        targetGZ: nextGZ
      };
    });
  }

  moveVerticalTo(y, duration = 540) {
    if (this.currentY === y) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.verticalTween = {
        fromY: this.currentY,
        toY: y,
        duration,
        elapsed: 0,
        resolve
      };
    });
  }

  getWorldPosition() {
    return {
      x: this.currentX,
      y: this.currentY,
      z: this.currentZ
    };
  }

  getGridPosition() {
    return {
      gx: this.gridX,
      gz: this.gridZ
    };
  }

  attachToy(toy) {
    if (!toy) {
      return;
    }

    this.heldToy = toy;
    toy.root.removeFromParent();
    this.toyAnchor.add(toy.root);
    toy.root.position.set(0, 0, 0);
    toy.root.rotation.set(0, 0, 0);
  }

  consumeHeldToy() {
    if (!this.heldToy) {
      return null;
    }

    const toy = this.heldToy;
    toy.root.removeFromParent();
    this.heldToy = null;
    return toy;
  }

  clearHeldToy() {
    if (!this.heldToy) {
      return;
    }

    this.heldToy.root.removeFromParent();
    this.heldToy = null;
  }

  update(deltaSeconds) {
    const deltaMs = deltaSeconds * 1000;

    if (this.horizontalTween) {
      this.horizontalTween.elapsed += deltaMs;
      const t = clamp(this.horizontalTween.elapsed / this.horizontalTween.duration, 0, 1);
      const eased = easeInOutCubic(t);

      this.currentX = THREE.MathUtils.lerp(this.horizontalTween.fromX, this.horizontalTween.toX, eased);
      this.currentZ = THREE.MathUtils.lerp(this.horizontalTween.fromZ, this.horizontalTween.toZ, eased);

      if (t >= 1) {
        this.currentX = this.horizontalTween.toX;
        this.currentZ = this.horizontalTween.toZ;
        this.gridX = this.horizontalTween.targetGX;
        this.gridZ = this.horizontalTween.targetGZ;
        const done = this.horizontalTween;
        this.horizontalTween = null;
        done.resolve();
      }
    }

    if (this.verticalTween) {
      this.verticalTween.elapsed += deltaMs;
      const t = clamp(this.verticalTween.elapsed / this.verticalTween.duration, 0, 1);
      const eased = easeInOutCubic(t);

      this.currentY = THREE.MathUtils.lerp(this.verticalTween.fromY, this.verticalTween.toY, eased);

      if (t >= 1) {
        this.currentY = this.verticalTween.toY;
        const done = this.verticalTween;
        this.verticalTween = null;
        done.resolve();
      }
    }

    this.syncMeshes();
  }

  syncMeshes() {
    this.carriage.position.set(this.currentX, this.bounds.topY, this.currentZ);

    const cableLength = Math.max(0.2, this.bounds.topY - this.currentY);
    this.cable.position.set(this.currentX, this.currentY + cableLength / 2, this.currentZ);
    this.cable.scale.set(1, cableLength, 1);

    this.hookRoot.position.set(this.currentX, this.currentY, this.currentZ);
  }
}
