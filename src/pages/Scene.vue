<script setup>
import { onBeforeUnmount } from "vue";
import { OrbitControls } from "@tresjs/cientos";
import { TresCanvas } from "@tresjs/core";
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

const cellCount = 1000;
const sphereRadius = 1.42;
const diskRadius = 0.045;
const diskOffset = 0.008;
const borderWidth = 0.0025;
const circleSegments = 24;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const diskPositions = [];
const diskNormals = [];
const borderPositions = [];

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

  for (let segment = 0; segment < circleSegments; segment += 1) {
    const startAngle = (segment / circleSegments) * Math.PI * 2;
    const endAngle = ((segment + 1) / circleSegments) * Math.PI * 2;
    const start = diskCenter.clone()
      .addScaledVector(tangent, Math.cos(startAngle) * diskRadius)
      .addScaledVector(bitangent, Math.sin(startAngle) * diskRadius);
    const end = diskCenter.clone()
      .addScaledVector(tangent, Math.cos(endAngle) * diskRadius)
      .addScaledVector(bitangent, Math.sin(endAngle) * diskRadius);

    for (const point of [diskCenter, start, end]) {
      diskPositions.push(point.x, point.y, point.z);
      diskNormals.push(normal.x, normal.y, normal.z);
    }

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

onBeforeUnmount(() => {
  diskGeometry.dispose();
  borderGeometry.dispose();
});
</script>

<template>
  <section class="scene-page">
    <div class="scene-heading">
      <div>
        <p class="scene-eyebrow">SPHERICAL GRID / 001</p>
        <h1>1000 Circles</h1>
        <p class="scene-description">Equal-sized circular planes distributed across a transparent sphere.</p>
      </div>
      <div class="cell-counter"><strong>1,000</strong><span>EQUAL CIRCLES</span></div>
    </div>

    <div class="scene-stage" aria-label="Interactive 60% transparent sphere with 1000 equal-sized circular planes">
      <TresCanvas class="scene-canvas" :dpr="[1, 1.75]" clear-color="#091923">
        <TresPerspectiveCamera :position="[0, 0, 4.5]" :fov="38" :near="0.1" :far="40" />
        <TresAmbientLight :intensity="1.15" />
        <TresDirectionalLight :position="[3, 4, 5]" :intensity="2.2" color="#e4fff8" />
        <TresDirectionalLight :position="[-4, -2, -3]" :intensity="1.1" color="#58b7ad" />

        <TresMesh :render-order="1">
          <TresSphereGeometry :args="[sphereRadius, 96, 64]" />
          <TresMeshPhysicalMaterial
            color="#80b9b5"
            :transparent="true"
            :opacity="0.6"
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
          <TresMeshBasicMaterial color="#102e38" :side="2" :transparent="true" :opacity="1" />
        </TresMesh>

        <OrbitControls
          make-default
          :enable-damping="true"
          :damping-factor="0.06"
          :min-distance="2.8"
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

  .scene-description {
    max-width: 250px;
  }

  .scene-stage {
    height: 62vh;
    min-height: 400px;
  }
}
</style>
