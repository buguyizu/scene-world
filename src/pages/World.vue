<script setup>
import { onBeforeUnmount, ref } from "vue";
import { OrbitControls } from "@tresjs/cientos";
import { TresCanvas } from "@tresjs/core";
import { gsap } from "gsap";
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Plane,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3
} from "three";

const cellCount = 1000;
const sphereRadius = 1.42;
const outerSphereRadius = sphereRadius * 1.5;
const innerSphereRadius = sphereRadius * 0.5;
const diskRadius = 0.076;
const innerCircleRadius = diskRadius * (innerSphereRadius / sphereRadius);
const subCircleCount = 1000;
const wallCount = 100;
const wallChildIndices = Array.from({ length: subCircleCount }, (_, index) => index);
for (let index = wallChildIndices.length - 1; index > 0; index -= 1) {
  const randomIndex = Math.floor(Math.random() * (index + 1));
  [wallChildIndices[index], wallChildIndices[randomIndex]] = [
    wallChildIndices[randomIndex],
    wallChildIndices[index]
  ];
}
wallChildIndices.length = wallCount;
wallChildIndices.sort((left, right) => left - right);
const subCircleRadius = diskRadius / 37;
const subCircleOffset = 0.0015;
const diskOffset = 0.008;
const borderWidth = 0.0025;
const circleSegments = 24;
const sampleSubCircleIndex = wallChildIndices[0];
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const subCircleGoldenAngle = Math.PI * (3 - Math.sqrt(5));
const diskPositions = new Float32Array(circleSegments * 9);
const diskNormals = new Float32Array(circleSegments * 9);
const borderPositions = [];
const innerCirclePositions = [];
const wallColors = new Float32Array(wallCount * circleSegments * 18);
const wallPalette = ["#42b49f", "#e0a45c", "#7399d4", "#d27f9a"]
  .map((color) => new Color(color));
const circleCenters = [];
const circleNormals = [];
const circleTangents = [];
const circleBitangents = [];
const controlsRef = ref(null);
const minDistance = ref(1.45);
const showOuterSphere = ref(false);
const raycaster = new Raycaster();
const pointer = new Vector2();
const hitPlane = new Plane();
const hitPoint = new Vector3();
const hitOffset = new Vector3();
let featuredCircleIndex = 0;
let greatestFrontFacing = -Infinity;
for (let index = 0; index < cellCount; index += 1) {
  const y = 1 - 2 * (index + 0.5) / cellCount;
  const ringRadius = Math.sqrt(1 - y * y);
  const frontFacing = Math.sin(index * goldenAngle) * ringRadius;
  if (frontFacing > greatestFrontFacing) {
    greatestFrontFacing = frontFacing;
    featuredCircleIndex = index;
  }
}
const initialFeaturedCircleIndex = featuredCircleIndex;

const subCircleGeometry = new CircleGeometry(1, 8);
const subCircleMaterial = new MeshStandardMaterial({
  color: "#245a5b",
  metalness: 0.12,
  roughness: 0.38
});
const subCircleMesh = new InstancedMesh(
  subCircleGeometry,
  subCircleMaterial,
  subCircleCount
);
subCircleMesh.renderOrder = 4;
const orientationMatrix = new Matrix4();
const instanceMatrix = new Matrix4();
const instanceQuaternion = new Quaternion();
const instancePosition = new Vector3();
const instanceScale = new Vector3(subCircleRadius, subCircleRadius, subCircleRadius);

for (let index = 0; index < cellCount; index += 1) {
  const y = 1 - 2 * (index + 0.5) / cellCount;
  const ringRadius = Math.sqrt(1 - y * y);
  const angle = index * goldenAngle;
  const normal = new Vector3(
    Math.cos(angle) * ringRadius,
    y,
    Math.sin(angle) * ringRadius
  );
  const tangent = Math.abs(normal.y) < 0.9
    ? new Vector3(0, 1, 0).cross(normal).normalize()
    : new Vector3(1, 0, 0).cross(normal).normalize();
  const bitangent = normal.clone().cross(tangent).normalize();
  const diskCenter = normal.clone().multiplyScalar(sphereRadius + diskOffset);
  const innerCircleCenter = normal.clone().multiplyScalar(
    innerSphereRadius + diskOffset * (innerSphereRadius / sphereRadius)
  );
  circleCenters.push(diskCenter);
  circleNormals.push(normal);
  circleTangents.push(tangent);
  circleBitangents.push(bitangent);

  for (let segment = 0; segment < circleSegments; segment += 1) {
    const startAngle = (segment / circleSegments) * Math.PI * 2;
    const endAngle = ((segment + 1) / circleSegments) * Math.PI * 2;
    const innerCircleStart = innerCircleCenter.clone()
      .addScaledVector(tangent, Math.cos(startAngle) * innerCircleRadius)
      .addScaledVector(bitangent, Math.sin(startAngle) * innerCircleRadius);
    const innerCircleEnd = innerCircleCenter.clone()
      .addScaledVector(tangent, Math.cos(endAngle) * innerCircleRadius)
      .addScaledVector(bitangent, Math.sin(endAngle) * innerCircleRadius);
    const innerRingStart = innerCircleCenter.clone()
      .addScaledVector(tangent, Math.cos(startAngle) * (innerCircleRadius - borderWidth / 2))
      .addScaledVector(bitangent, Math.sin(startAngle) * (innerCircleRadius - borderWidth / 2));
    const innerRingEnd = innerCircleCenter.clone()
      .addScaledVector(tangent, Math.cos(endAngle) * (innerCircleRadius - borderWidth / 2))
      .addScaledVector(bitangent, Math.sin(endAngle) * (innerCircleRadius - borderWidth / 2));

    for (const point of [innerRingStart, innerCircleStart, innerCircleEnd, innerRingStart, innerCircleEnd, innerRingEnd]) {
      innerCirclePositions.push(point.x, point.y, point.z);
    }

    if (segment % 2 === 1) continue;

    const start = diskCenter.clone()
      .addScaledVector(tangent, Math.cos(startAngle) * diskRadius)
      .addScaledVector(bitangent, Math.sin(startAngle) * diskRadius);
    const end = diskCenter.clone()
      .addScaledVector(tangent, Math.cos(endAngle) * diskRadius)
      .addScaledVector(bitangent, Math.sin(endAngle) * diskRadius);

    const innerStart = diskCenter.clone()
      .addScaledVector(tangent, Math.cos(startAngle) * (diskRadius - borderWidth))
      .addScaledVector(bitangent, Math.sin(startAngle) * (diskRadius - borderWidth));
    const innerEnd = diskCenter.clone()
      .addScaledVector(tangent, Math.cos(endAngle) * (diskRadius - borderWidth))
      .addScaledVector(bitangent, Math.sin(endAngle) * (diskRadius - borderWidth));

    for (const point of [innerStart, start, end, innerStart, end, innerEnd]) {
      borderPositions.push(point.x, point.y, point.z);
    }
  }
}

const diskGeometry = new BufferGeometry();
diskGeometry.setAttribute("position", new Float32BufferAttribute(diskPositions, 3));
diskGeometry.setAttribute("normal", new Float32BufferAttribute(diskNormals, 3));
const borderGeometry = new BufferGeometry();
borderGeometry.setAttribute("position", new Float32BufferAttribute(borderPositions, 3));
const innerCircleGeometry = new BufferGeometry();
innerCircleGeometry.setAttribute("position", new Float32BufferAttribute(innerCirclePositions, 3));
const wallGeometry = new BufferGeometry();
wallGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(new Float32Array(wallCount * circleSegments * 18), 3)
);
wallGeometry.setAttribute("color", new Float32BufferAttribute(wallColors, 3));

function updateWalls(parentIndex) {
  const normal = circleNormals[parentIndex];
  const tangent = circleTangents[parentIndex];
  const bitangent = circleBitangents[parentIndex];
  const innerWallCenter = normal.clone().multiplyScalar(
    innerSphereRadius + diskOffset * (innerSphereRadius / sphereRadius)
  );
  let focusedPair = null;
  const positionAttribute = wallGeometry.attributes.position;
  const colorAttribute = wallGeometry.attributes.color;
  let vertexIndex = 0;

  for (let wallIndex = 0; wallIndex < wallCount; wallIndex += 1) {
    const childIndex = wallChildIndices[wallIndex];
    const childRadialDistance = (diskRadius - subCircleRadius)
      * Math.sqrt((childIndex + 0.5) / subCircleCount);
    const childAngle = childIndex * subCircleGoldenAngle;
    const middleWallCenter = circleCenters[parentIndex].clone()
      .addScaledVector(tangent, Math.cos(childAngle) * childRadialDistance)
      .addScaledVector(bitangent, Math.sin(childAngle) * childRadialDistance)
      .addScaledVector(normal, subCircleOffset);

    if (childIndex === sampleSubCircleIndex) {
      focusedPair = { innerWallCenter, middleWallCenter };
    }
    const wallColor = wallPalette[wallIndex % wallPalette.length];

    for (let segment = 0; segment < circleSegments; segment += 1) {
      const startAngle = (segment / circleSegments) * Math.PI * 2;
      const endAngle = ((segment + 1) / circleSegments) * Math.PI * 2;
      const innerStart = innerWallCenter.clone()
        .addScaledVector(tangent, Math.cos(startAngle) * innerCircleRadius)
        .addScaledVector(bitangent, Math.sin(startAngle) * innerCircleRadius);
      const innerEnd = innerWallCenter.clone()
        .addScaledVector(tangent, Math.cos(endAngle) * innerCircleRadius)
        .addScaledVector(bitangent, Math.sin(endAngle) * innerCircleRadius);
      const middleStart = middleWallCenter.clone()
        .addScaledVector(tangent, Math.cos(startAngle) * subCircleRadius)
        .addScaledVector(bitangent, Math.sin(startAngle) * subCircleRadius);
      const middleEnd = middleWallCenter.clone()
        .addScaledVector(tangent, Math.cos(endAngle) * subCircleRadius)
        .addScaledVector(bitangent, Math.sin(endAngle) * subCircleRadius);

      for (const point of [innerStart, middleStart, middleEnd, innerStart, middleEnd, innerEnd]) {
        positionAttribute.setXYZ(vertexIndex, point.x, point.y, point.z);
        colorAttribute.setXYZ(vertexIndex, wallColor.r, wallColor.g, wallColor.b);
        vertexIndex += 1;
      }
    }
  }

  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;
  wallGeometry.computeBoundingSphere();
  return focusedPair;
}

function updateFeaturedCircle(index) {
  featuredCircleIndex = index;
  const center = circleCenters[index];
  const normal = circleNormals[index];
  const tangent = circleTangents[index];
  const bitangent = circleBitangents[index];
  let offset = 0;

  for (let segment = 0; segment < circleSegments; segment += 1) {
    const startAngle = (segment / circleSegments) * Math.PI * 2;
    const endAngle = ((segment + 1) / circleSegments) * Math.PI * 2;
    const start = center.clone()
      .addScaledVector(tangent, Math.cos(startAngle) * diskRadius)
      .addScaledVector(bitangent, Math.sin(startAngle) * diskRadius);
    const end = center.clone()
      .addScaledVector(tangent, Math.cos(endAngle) * diskRadius)
      .addScaledVector(bitangent, Math.sin(endAngle) * diskRadius);

    for (const point of [center, start, end]) {
      diskPositions[offset] = point.x;
      diskPositions[offset + 1] = point.y;
      diskPositions[offset + 2] = point.z;
      diskNormals[offset] = normal.x;
      diskNormals[offset + 1] = normal.y;
      diskNormals[offset + 2] = normal.z;
      offset += 3;
    }
  }

  diskGeometry.attributes.position.needsUpdate = true;
  diskGeometry.attributes.normal.needsUpdate = true;
  diskGeometry.computeBoundingSphere();

  orientationMatrix.makeBasis(tangent, bitangent, normal);
  instanceQuaternion.setFromRotationMatrix(orientationMatrix);
  for (let subCircleIndex = 0; subCircleIndex < subCircleCount; subCircleIndex += 1) {
    const radialDistance = (diskRadius - subCircleRadius)
      * Math.sqrt((subCircleIndex + 0.5) / subCircleCount);
    const subCircleAngle = subCircleIndex * subCircleGoldenAngle;
    instancePosition.copy(center)
      .addScaledVector(tangent, Math.cos(subCircleAngle) * radialDistance)
      .addScaledVector(bitangent, Math.sin(subCircleAngle) * radialDistance)
      .addScaledVector(normal, subCircleOffset);
    instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale);
    subCircleMesh.setMatrixAt(subCircleIndex, instanceMatrix);
  }
  subCircleMesh.instanceMatrix.needsUpdate = true;
  subCircleMesh.computeBoundingSphere();
  return updateWalls(index);
}
updateFeaturedCircle(featuredCircleIndex);

function getOrbitControls() {
  const exposedInstance = controlsRef.value?.instance;
  return exposedInstance?.value ?? exposedInstance;
}

function animateFocus(controls, target, position, restoreOverview = false) {
  gsap.killTweensOf(controls.object.position);
  gsap.killTweensOf(controls.target);
  minDistance.value = restoreOverview
    ? 0.05
    : Math.min(minDistance.value, controls.object.position.distanceTo(controls.target) * 0.5);

  gsap.to(controls.object.position, {
    x: position.x,
    y: position.y,
    z: position.z,
    duration: 0.8,
    ease: "power2.inOut",
    onUpdate: () => controls.update()
  });
  gsap.to(controls.target, {
    x: target.x,
    y: target.y,
    z: target.z,
    duration: 0.8,
    ease: "power2.inOut",
    onUpdate: () => controls.update(),
    onComplete: () => {
      controls.update();
      if (restoreOverview) minDistance.value = 1.45;
    }
  });
}

function focusCircle(index, controls, aspect) {
  const { innerWallCenter, middleWallCenter } = updateFeaturedCircle(index);
  const verticalHalfFov = (controls.object.fov * Math.PI) / 360;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const narrowHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
  const wallLength = innerWallCenter.distanceTo(middleWallCenter);
  const focusDistance = wallLength / (2 * Math.tan(narrowHalfFov) * 0.82);
  const target = innerWallCenter.clone().add(middleWallCenter).multiplyScalar(0.5);
  const position = target.clone()
    .addScaledVector(circleNormals[index], focusDistance)
    .addScaledVector(circleTangents[index], focusDistance * 0.35);
  minDistance.value = Math.min(minDistance.value, focusDistance * 0.4);
  animateFocus(controls, target, position);
}

function resetFocus(controls) {
  updateFeaturedCircle(initialFeaturedCircleIndex);
  animateFocus(controls, new Vector3(0, 0, 0), new Vector3(0, 0, 4.5), true);
}

function handleDoubleClick(event) {
  const canvas = event.currentTarget.querySelector("canvas");
  const controls = getOrbitControls();
  if (!canvas || !controls) return;

  const bounds = canvas.getBoundingClientRect();
  pointer.set(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  );
  raycaster.setFromCamera(pointer, controls.object);

  let selectedIndex = -1;
  let nearestDistance = Infinity;
  for (let index = 0; index < cellCount; index += 1) {
    hitPlane.setFromNormalAndCoplanarPoint(circleNormals[index], circleCenters[index]);
    if (!raycaster.ray.intersectPlane(hitPlane, hitPoint)) continue;
    const distance = hitPoint.distanceToSquared(raycaster.ray.origin);
    if (distance >= nearestDistance) continue;
    hitOffset.subVectors(hitPoint, circleCenters[index]);
    if (hitOffset.lengthSq() > diskRadius * diskRadius) continue;
    selectedIndex = index;
    nearestDistance = distance;
  }

  if (selectedIndex < 0) {
    resetFocus(controls);
    return;
  }

  focusCircle(selectedIndex, controls, bounds.width / bounds.height);
}

onBeforeUnmount(() => {
  const controls = getOrbitControls();
  if (controls) {
    gsap.killTweensOf(controls.object.position);
    gsap.killTweensOf(controls.target);
  }
  diskGeometry.dispose();
  borderGeometry.dispose();
  innerCircleGeometry.dispose();
  wallGeometry.dispose();
  subCircleGeometry.dispose();
  subCircleMaterial.dispose();
});
</script>

<template>
  <section class="scene-page">
    <div class="scene-heading">
      <div>
        <p class="scene-eyebrow">SPHERICAL GRID / 001</p>
        <h2>Great-thousand-fold world</h2>
        <p class="scene-description">One sphere circle contains 1,000 smaller circles; the others are empty.</p>
      </div>
      <div class="scene-heading-meta">
        <label class="shell-toggle">
          <input v-model="showOuterSphere" type="checkbox" role="switch" />
          <span>Outer sphere</span>
        </label>
        <div class="cell-counter"><strong>100</strong><span>RANDOM WALLS</span></div>
      </div>
    </div>

    <div
      class="scene-stage"
      aria-label="Interactive concentric spheres. Double-click a circle to focus it."
      @dblclick="handleDoubleClick"
    >
      <TresCanvas class="scene-canvas" :dpr="[1, 1.75]" clear-color="#091923">
        <TresPerspectiveCamera :position="[0, 0, 4.5]" :fov="38" :near="0.01" :far="40" />
        <TresAmbientLight :intensity="1.15" />
        <TresDirectionalLight :position="[3, 4, 5]" :intensity="2.2" color="#e4fff8" />
        <TresDirectionalLight :position="[-4, -2, -3]" :intensity="1.1" color="#58b7ad" />

        <TresMesh :render-order="1">
          <TresSphereGeometry :args="[sphereRadius, 96, 64]" />
          <TresMeshPhysicalMaterial
            color="#80b9b5"
            :transparent="true"
            :opacity="0.3"
            :depth-write="false"
            :metalness="0.24"
            :roughness="0.28"
          />
        </TresMesh>
        <TresMesh :geometry="diskGeometry" :render-order="2">
          <TresMeshStandardMaterial
            color="#9be7d5"
            :transparent="true"
            :opacity="1"
            :depth-write="true"
            :metalness="0.38"
            :roughness="0.26"
          />
        </TresMesh>
        <TresMesh :geometry="borderGeometry" :render-order="3">
          <TresMeshBasicMaterial color="#091b20" :side="2" :transparent="true" :opacity="0.82" />
        </TresMesh>
        <primitive :object="subCircleMesh" />
        <TresMesh :geometry="innerCircleGeometry" :render-order="4.5">
          <TresMeshBasicMaterial
            color="#a5e6d0"
            :side="2"
            :transparent="true"
            :opacity="0.85"
          />
        </TresMesh>
        <TresMesh :geometry="wallGeometry" :render-order="4.75">
          <TresMeshBasicMaterial
            color="#ffffff"
            :side="2"
            :transparent="true"
            :opacity="0.08"
            :depth-write="false"
            :vertex-colors="true"
          />
        </TresMesh>
        <TresMesh :render-order="5" :visible="showOuterSphere">
          <TresSphereGeometry :args="[outerSphereRadius, 64, 48]" />
          <TresMeshBasicMaterial
            color="#75bcb3"
            :wireframe="true"
            :transparent="true"
            :opacity="0.2"
            :depth-write="false"
          />
        </TresMesh>

        <OrbitControls
          ref="controlsRef"
          make-default
          :enable-damping="true"
          :damping-factor="0.06"
          :min-distance="minDistance"
          :max-distance="8"
        />
      </TresCanvas>
      <div class="scene-hint">DRAG TO ROTATE <span>·</span> SCROLL TO ZOOM</div>
    </div>
  </section>
</template>

<style scoped>
.scene-page {
  width: 100%;
}

.scene-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin: 0 4px 18px;
  color: #e6f2ee;
}

.scene-eyebrow {
  margin: 0 0 10px;
  color: #83ddc9;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.scene-heading h1 {
  margin: 0;
  color: #f1f4ec;
  font-size: clamp(2rem, 5vw, 2.65rem);
  font-weight: 500;
  line-height: 1.05;
}

.scene-description {
  margin: 10px 0 0;
  color: rgba(218, 237, 231, 0.7);
  font-size: 0.92rem;
}

.scene-heading-meta {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-shrink: 0;
}

.shell-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: rgba(218, 237, 231, 0.78);
  font-size: 0.76rem;
  cursor: pointer;
  user-select: none;
}

.shell-toggle input {
  appearance: none;
  position: relative;
  width: 34px;
  height: 20px;
  margin: 0;
  border: 1px solid rgba(191, 223, 214, 0.35);
  border-radius: 999px;
  background: #33464b;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.shell-toggle input::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e6f2ee;
  content: "";
  transition: transform 160ms ease;
}

.shell-toggle input:checked {
  border-color: #58b7a5;
  background: #277f72;
}

.shell-toggle input:checked::after {
  transform: translateX(14px);
}

.shell-toggle input:focus-visible {
  outline: 2px solid #83ddc9;
  outline-offset: 3px;
}

.cell-counter {
  display: grid;
  gap: 3px;
  text-align: right;
}

.cell-counter strong {
  color: #8ae2cc;
  font-size: 1.4rem;
  font-weight: 500;
}

.cell-counter span {
  color: rgba(218, 237, 231, 0.58);
  font-size: 0.63rem;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.scene-stage {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: min(68vh, 680px);
  min-height: 420px;
  overflow: hidden;
  border: 1px solid rgba(191, 223, 214, 0.16);
  background:
    radial-gradient(ellipse at 50% 46%, rgba(36, 67, 78, 0.54), transparent 58%),
    #091923;
}

.scene-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.scene-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.scene-hint {
  position: absolute;
  right: 18px;
  bottom: 16px;
  color: rgba(218, 237, 231, 0.58);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  pointer-events: none;
}

.scene-hint span {
  padding: 0 5px;
  color: #83ddc9;
}

@media (max-width: 640px) {
  .scene-heading {
    align-items: flex-start;
  }

  .scene-heading-meta {
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }

  .scene-description {
    max-width: 250px;
  }

  .scene-stage {
    height: 62vh;
    min-height: 400px;
  }
}
</style>
