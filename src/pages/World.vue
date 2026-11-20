<script setup>
import { onBeforeUnmount, ref } from "vue";
import { OrbitControls } from "@tresjs/cientos";
import { TresCanvas } from "@tresjs/core";
import { gsap } from "gsap";
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  LinearFilter,
  Points,
  PointsMaterial,
  Raycaster,
  Sphere,
  Vector2,
  Vector3
} from "three";

const cellCount = 1000;
const innerCoreRadius = 0.355;
const outerSphereRadius = 3.195;
const layerRadiusStep = (outerSphereRadius - innerCoreRadius) / 3;
const innerSphereRadius = innerCoreRadius + layerRadiusStep;
const sphereRadius = innerCoreRadius + layerRadiusStep * 2;
const sphereLayerPointCount = 1_000_000;
const sphereLayerRingPointCount = 1_000;
const sphereLayerRingCosAngle = 1 - 2 * sphereLayerRingPointCount / sphereLayerPointCount;
const sphereLayerRing = {
  radius: sphereRadius * Math.sqrt(1 - sphereLayerRingCosAngle ** 2),
  y: sphereRadius * sphereLayerRingCosAngle,
  tubeRadius: 0.0015
};
const outerLayerPopulation = 1_000_000_000;
const outerLayerPointCount = 1_000_000;
const outerLayerInnerPointCount = 1_000;
const outerLayerCircles = [1_000, 1_000_000].map((pointCount, index) => {
  const cosAngle = 1 - 2 * pointCount / outerLayerPopulation;
  return {
    pointCount,
    cosAngle,
    radius: outerSphereRadius * Math.sqrt(1 - cosAngle ** 2),
    z: outerSphereRadius * cosAngle,
    tubeRadius: index === 0 ? 0.00005 : 0.00008
  };
});
const overviewCameraDistance = 10.5;
const overviewCameraPosition = [0, 0, overviewCameraDistance];
const minimumZoomDistance = 0.05;
const diskRadius = 0.076;
const innerCircleRadius = diskRadius * (innerSphereRadius / sphereRadius);
const wallTargetSampleCount = 1000;
const wallCount = 7;
const wallTargetSampleIndices = Array.from({ length: wallTargetSampleCount }, (_, index) => index);
for (let index = wallTargetSampleIndices.length - 1; index > 0; index -= 1) {
  const randomIndex = Math.floor(Math.random() * (index + 1));
  [wallTargetSampleIndices[index], wallTargetSampleIndices[randomIndex]] = [
    wallTargetSampleIndices[randomIndex],
    wallTargetSampleIndices[index]
  ];
}
wallTargetSampleIndices.length = wallCount;
wallTargetSampleIndices.sort((left, right) => left - right);
const sampleWallTargetIndex = wallTargetSampleIndices[0];
const wallTipOffset = 0.0015;
const diskOffset = 0.008;
const borderWidth = 0.0025;
const circleSegments = 24;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const cellPolygons = [];
const innerCirclePositions = [];
const wallColors = new Float32Array(wallCount * circleSegments * 9);
const wallPalette = ["#42b49f", "#e0a45c", "#7399d4", "#d27f9a"]
  .map((color) => new Color(color));
const circleCenters = [];
const circleNormals = [];
const circleTangents = [];
const circleBitangents = [];
const controlsRef = ref(null);
const minDistance = ref(minimumZoomDistance);
const showFirstLayer = ref(true);
const showSecondLayer = ref(true);
const showThirdLayer = ref(true);
const showFourthLayer = ref(true);
const raycaster = new Raycaster();
const pointer = new Vector2();
const hitPoint = new Vector3();
const middleSurfaceSphere = new Sphere(new Vector3(), sphereRadius + diskOffset);
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

const sphereLayerGeometry = new BufferGeometry();
const sphereLayerPositions = new Float32Array(sphereLayerPointCount * 3);
for (let index = 0; index < sphereLayerPointCount; index += 1) {
  const y = 1 - 2 * (index + 0.5) / sphereLayerPointCount;
  const ringRadius = Math.sqrt(1 - y ** 2);
  const angle = index * goldenAngle;
  const offset = index * 3;
  sphereLayerPositions[offset] = Math.cos(angle) * ringRadius * sphereRadius;
  sphereLayerPositions[offset + 1] = y * sphereRadius;
  sphereLayerPositions[offset + 2] = Math.sin(angle) * ringRadius * sphereRadius;
}
sphereLayerGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(sphereLayerPositions, 3)
);
sphereLayerGeometry.computeBoundingSphere();
const sphereLayerSurfaceArea = 4 * Math.PI * sphereRadius ** 2;
const sphereLayerPointDiameter = Math.sqrt(
  (2 * sphereLayerSurfaceArea) / (Math.sqrt(3) * sphereLayerPointCount)
) * 2.5;
const outerLayerGeometry = new BufferGeometry();
const outerLayerPositions = new Float32Array(outerLayerPointCount * 3);
const innerCircleCosAngle = outerLayerCircles[0].cosAngle;
const outerCircleCosAngle = outerLayerCircles[1].cosAngle;
const outerRingPointCount = outerLayerPointCount - outerLayerInnerPointCount;
const outerLayerCapArea = 2 * Math.PI * outerSphereRadius ** 2
  * (1 - outerCircleCosAngle);
const outerLayerCircleDiameter = Math.sqrt(
  (2 * outerLayerCapArea) / (Math.sqrt(3) * outerLayerPointCount)
) * 2.5;
for (let index = 0; index < outerLayerInnerPointCount; index += 1) {
  const cosAngle = 1 - ((index + 0.5) / outerLayerInnerPointCount)
    * (1 - innerCircleCosAngle);
  const ringRadius = Math.sqrt(1 - cosAngle ** 2);
  const angle = index * goldenAngle;
  const offset = index * 3;
  outerLayerPositions[offset] = Math.cos(angle) * ringRadius * outerSphereRadius;
  outerLayerPositions[offset + 1] = Math.sin(angle) * ringRadius * outerSphereRadius;
  outerLayerPositions[offset + 2] = cosAngle * outerSphereRadius;
}
for (let index = 0; index < outerRingPointCount; index += 1) {
  const cosAngle = innerCircleCosAngle
    - ((index + 0.5) / outerRingPointCount) * (innerCircleCosAngle - outerCircleCosAngle);
  const ringRadius = Math.sqrt(1 - cosAngle ** 2);
  const angle = (index + outerLayerInnerPointCount) * goldenAngle;
  const offset = (index + outerLayerInnerPointCount) * 3;
  outerLayerPositions[offset] = Math.cos(angle) * ringRadius * outerSphereRadius;
  outerLayerPositions[offset + 1] = Math.sin(angle) * ringRadius * outerSphereRadius;
  outerLayerPositions[offset + 2] = cosAngle * outerSphereRadius;
}
outerLayerGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(outerLayerPositions, 3)
);
outerLayerGeometry.computeBoundingSphere();
const outerLayerCircleCanvas = document.createElement("canvas");
outerLayerCircleCanvas.width = 32;
outerLayerCircleCanvas.height = 32;
const outerLayerCircleContext = outerLayerCircleCanvas.getContext("2d");
if (!outerLayerCircleContext) {
  throw new Error("Unable to create the outer-layer circle texture.");
}
outerLayerCircleContext.beginPath();
outerLayerCircleContext.arc(16, 16, 14.5, 0, Math.PI * 2);
outerLayerCircleContext.strokeStyle = "#ffffff";
outerLayerCircleContext.lineWidth = 1;
outerLayerCircleContext.stroke();
const outerLayerCircleTexture = new CanvasTexture(outerLayerCircleCanvas);
outerLayerCircleTexture.generateMipmaps = false;
outerLayerCircleTexture.minFilter = LinearFilter;
outerLayerCircleTexture.magFilter = LinearFilter;
const sphereLayerMaterial = new PointsMaterial({
  color: "#4ac3a6",
  map: outerLayerCircleTexture,
  size: sphereLayerPointDiameter,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.9,
  alphaTest: 0.08
});
const sphereLayerPoints = new Points(sphereLayerGeometry, sphereLayerMaterial);
sphereLayerPoints.renderOrder = 5;
const wallTipGeometry = new BufferGeometry();
wallTipGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(new Float32Array(wallCount * 3), 3)
);
const wallTipMaterial = new PointsMaterial({
  color: "#ffe2a3",
  map: outerLayerCircleTexture,
  size: sphereLayerPointDiameter * 1.7,
  sizeAttenuation: true,
  transparent: true,
  opacity: 1,
  alphaTest: 0.08
});
const wallTipPoints = new Points(wallTipGeometry, wallTipMaterial);
wallTipPoints.renderOrder = 7;
const outerLayerMaterial = new PointsMaterial({
  color: "#4ac3a6",
  map: outerLayerCircleTexture,
  size: outerLayerCircleDiameter,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.9,
  alphaTest: 0.08
});
const outerLayerPoints = new Points(outerLayerGeometry, outerLayerMaterial);
outerLayerPoints.renderOrder = 6;
let wallTipCenters = [];

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

  }
}

function clipCellPolygon(polygon, a, b, limit) {
  if (polygon.length === 0) return polygon;
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const point of polygon) {
    const value = a * point.u + b * point.v;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  if (maximum <= limit + 1e-12) return polygon;
  if (minimum > limit + 1e-12) return [];

  const clipped = [];
  let previous = polygon[polygon.length - 1];
  let previousValue = a * previous.u + b * previous.v;
  let previousInside = previousValue <= limit;
  for (const current of polygon) {
    const currentValue = a * current.u + b * current.v;
    const currentInside = currentValue <= limit;
    if (currentInside !== previousInside) {
      const amount = (limit - previousValue) / (currentValue - previousValue);
      clipped.push({
        u: previous.u + (current.u - previous.u) * amount,
        v: previous.v + (current.v - previous.v) * amount
      });
    }
    if (currentInside) clipped.push(current);
    previous = current;
    previousValue = currentValue;
    previousInside = currentInside;
  }
  return clipped;
}

const cellVertexCache = new Map();
let nextCellVertexId = 0;
function getCellVertex(normal, tangent, bitangent, point) {
  const position = normal.clone()
    .addScaledVector(tangent, point.u)
    .addScaledVector(bitangent, point.v)
    .normalize()
    .multiplyScalar(sphereRadius + diskOffset);
  const snapped = [position.x, position.y, position.z]
    .map((value) => Math.round(value * 1e8) / 1e8);
  const key = snapped.join(",");
  let vertex = cellVertexCache.get(key);
  if (!vertex) {
    vertex = {
      id: nextCellVertexId,
      position: new Vector3(...snapped)
    };
    nextCellVertexId += 1;
    cellVertexCache.set(key, vertex);
  }
  return vertex;
}

for (let index = 0; index < cellCount; index += 1) {
  const normal = circleNormals[index];
  const tangent = circleTangents[index];
  const bitangent = circleBitangents[index];
  let polygon = [
    { u: -1, v: -1 },
    { u: 1, v: -1 },
    { u: 1, v: 1 },
    { u: -1, v: 1 }
  ];

  for (let otherIndex = 0; otherIndex < cellCount && polygon.length > 0; otherIndex += 1) {
    if (otherIndex === index) continue;
    const otherNormal = circleNormals[otherIndex];
    polygon = clipCellPolygon(
      polygon,
      otherNormal.dot(tangent),
      otherNormal.dot(bitangent),
      1 - otherNormal.dot(normal)
    );
  }

  const vertices = polygon.map((point) => getCellVertex(normal, tangent, bitangent, point));
  if (vertices.length < 3) throw new Error(`Spherical cell ${index} has fewer than three vertices`);
  cellPolygons.push(vertices.map((vertex) => vertex.position));
}

const innerCircleGeometry = new BufferGeometry();
innerCircleGeometry.setAttribute("position", new Float32BufferAttribute(innerCirclePositions, 3));
const wallGeometry = new BufferGeometry();
wallGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(new Float32Array(wallCount * circleSegments * 9), 3)
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
    const childIndex = wallTargetSampleIndices[wallIndex];
    const layer3CircleCenter = wallTipCenters[wallIndex];

    if (childIndex === sampleWallTargetIndex) {
      focusedPair = { innerWallCenter, layer3CircleCenter };
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
      for (const point of [innerStart, layer3CircleCenter, innerEnd]) {
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

  const polygon = cellPolygons[index].map((vertex) => {
    const direction = vertex.clone().normalize();
    const projection = normal.dot(direction);
    return {
      u: (tangent.dot(direction) / projection) * (sphereRadius + diskOffset),
      v: (bitangent.dot(direction) / projection) * (sphereRadius + diskOffset)
    };
  });
  const triangles = [];
  let totalArea = 0;
  for (let vertexIndex = 0; vertexIndex < polygon.length; vertexIndex += 1) {
    const first = polygon[vertexIndex];
    const second = polygon[(vertexIndex + 1) % polygon.length];
    const area = Math.abs(first.u * second.v - first.v * second.u) / 2;
    totalArea += area;
    triangles.push({ first, second, cumulativeArea: totalArea });
  }

  const targets = wallTargetSampleIndices.map((sampleIndex) => {
    const triangleAreaTarget = radicalInverse(sampleIndex + 1, 2) * totalArea;
    const triangle = triangles.find((item) => item.cumulativeArea >= triangleAreaTarget);
    if (!triangle) throw new Error("Unable to select a surface-circle target.");
    const radialSample = Math.sqrt(radicalInverse(sampleIndex + 1, 3));
    const edgeSample = radicalInverse(sampleIndex + 1, 5);
    const margin = 0.96;
    const u = margin * radialSample
      * ((1 - edgeSample) * triangle.first.u + edgeSample * triangle.second.u);
    const v = margin * radialSample
      * ((1 - edgeSample) * triangle.first.v + edgeSample * triangle.second.v);
    return center.clone()
      .addScaledVector(tangent, u)
      .addScaledVector(bitangent, v)
      .addScaledVector(normal, wallTipOffset);
  });
  const selectedPointIndices = new Set();
  wallTipCenters = [];
  for (let wallIndex = 0; wallIndex < targets.length; wallIndex += 1) {
    const target = targets[wallIndex];
    let nearestPointIndex = -1;
    let nearestDistanceSquared = Infinity;
    for (let pointIndex = 0; pointIndex < sphereLayerPointCount; pointIndex += 1) {
      if (selectedPointIndices.has(pointIndex)) continue;
      const offset = pointIndex * 3;
      const dx = sphereLayerPositions[offset] - target.x;
      const dy = sphereLayerPositions[offset + 1] - target.y;
      const dz = sphereLayerPositions[offset + 2] - target.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestPointIndex = pointIndex;
      }
    }
    if (nearestPointIndex < 0) throw new Error("Unable to find a Layer 3 surface circle.");
    selectedPointIndices.add(nearestPointIndex);
    const offset = nearestPointIndex * 3;
    const pointCenter = new Vector3(
      sphereLayerPositions[offset],
      sphereLayerPositions[offset + 1],
      sphereLayerPositions[offset + 2]
    );
    const pointNormal = pointCenter.clone().normalize();
    wallTipCenters.push(pointCenter.addScaledVector(pointNormal, wallTipOffset));
    wallTipGeometry.attributes.position.setXYZ(
      wallIndex,
      sphereLayerPositions[offset],
      sphereLayerPositions[offset + 1],
      sphereLayerPositions[offset + 2]
    );
  }
  wallTipGeometry.attributes.position.needsUpdate = true;
  wallTipGeometry.computeBoundingSphere();
  return updateWalls(index);
}

function radicalInverse(index, base) {
  let result = 0;
  let fraction = 1 / base;
  while (index > 0) {
    result += (index % base) * fraction;
    index = Math.floor(index / base);
    fraction /= base;
  }
  return result;
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
      if (restoreOverview) minDistance.value = minimumZoomDistance;
    }
  });
}

function focusCircle(index, controls, aspect) {
  const { innerWallCenter, layer3CircleCenter } = updateFeaturedCircle(index);
  const verticalHalfFov = (controls.object.fov * Math.PI) / 360;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const narrowHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
  const wallLength = innerWallCenter.distanceTo(layer3CircleCenter);
  const focusDistance = wallLength / (2 * Math.tan(narrowHalfFov) * 0.82);
  const target = innerWallCenter.clone().add(layer3CircleCenter).multiplyScalar(0.5);
  const position = target.clone()
    .addScaledVector(circleNormals[index], focusDistance)
    .addScaledVector(circleTangents[index], focusDistance * 0.35);
  minDistance.value = Math.min(minDistance.value, focusDistance * 0.4);
  animateFocus(controls, target, position);
}

function resetFocus(controls) {
  updateFeaturedCircle(initialFeaturedCircleIndex);
  animateFocus(
    controls,
    new Vector3(0, 0, 0),
    new Vector3(0, 0, overviewCameraDistance),
    true
  );
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
  if (
    !showThirdLayer.value
    || !raycaster.ray.intersectSphere(middleSurfaceSphere, hitPoint)
  ) {
    resetFocus(controls);
    return;
  }

  const hitNormal = hitPoint.normalize();
  let selectedIndex = 0;
  let greatestAlignment = -Infinity;
  for (let index = 0; index < cellCount; index += 1) {
    const alignment = circleNormals[index].dot(hitNormal);
    if (alignment > greatestAlignment) {
      greatestAlignment = alignment;
      selectedIndex = index;
    }
  }

  focusCircle(selectedIndex, controls, bounds.width / bounds.height);
}

onBeforeUnmount(() => {
  const controls = getOrbitControls();
  if (controls) {
    gsap.killTweensOf(controls.object.position);
    gsap.killTweensOf(controls.target);
  }
  outerLayerGeometry.dispose();
  sphereLayerGeometry.dispose();
  wallTipGeometry.dispose();
  outerLayerCircleTexture.dispose();
  sphereLayerMaterial.dispose();
  wallTipMaterial.dispose();
  outerLayerMaterial.dispose();
  innerCircleGeometry.dispose();
  wallGeometry.dispose();
});
</script>

<template>
  <section class="scene-page">
    <div class="sphere-controls" role="group" aria-label="Layer visibility">
      <label class="shell-toggle">
        <input v-model="showFirstLayer" type="checkbox" role="switch" />
        <span>Layer 1</span>
      </label>
      <label class="shell-toggle">
        <input v-model="showSecondLayer" type="checkbox" role="switch" />
        <span>Layer 2</span>
      </label>
      <label class="shell-toggle">
        <input v-model="showThirdLayer" type="checkbox" role="switch" />
        <span>Layer 3</span>
      </label>
      <label
        class="shell-toggle"
        title="The large ring contains 1,000,000 generated points; the small ring contains 1,000 of them."
      >
        <input v-model="showFourthLayer" type="checkbox" role="switch" />
        <span>Layer 4</span>
      </label>
    </div>
    <div class="scene-heading">
      <div>
        <p class="scene-eyebrow">SPHERICAL GRID / 001</p>
        <h2>Great-thousand-fold world</h2>
        <p class="scene-description">Layer 1 is the central sphere; Layer 2 has the inner circles; Layer 3 has 1M uniformly distributed surface rings with a yellow circle around 1K; Layer 4 shows 1M points inside the large ring, including 1K inside the small ring.</p>
      </div>
      <div class="scene-heading-meta">
        <div class="cell-counter"><strong>7</strong><span>RANDOM WALLS</span></div>
      </div>
    </div>

    <div
      class="scene-stage"
      aria-label="Interactive concentric spheres. Double-click a circle to focus it."
      @dblclick="handleDoubleClick"
    >
      <TresCanvas class="scene-canvas" :dpr="[1, 1.75]" clear-color="#091923">
        <TresPerspectiveCamera
          :position="overviewCameraPosition"
          :fov="38"
          :near="0.001"
          :far="40"
        />
        <TresAmbientLight :intensity="1.15" />
        <TresDirectionalLight :position="[3, 4, 5]" :intensity="2.2" color="#e4fff8" />
        <TresDirectionalLight :position="[-4, -2, -3]" :intensity="1.1" color="#58b7ad" />

        <template v-if="showThirdLayer">
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
          <primitive :object="sphereLayerPoints" />
          <primitive :object="wallTipPoints" />
          <TresMesh
            :position="[0, sphereLayerRing.y, 0]"
            :rotation="[Math.PI / 2, 0, 0]"
            :render-order="6.5"
          >
            <TresTorusGeometry
              :args="[sphereLayerRing.radius, sphereLayerRing.tubeRadius, 8, 128]"
            />
            <TresMeshBasicMaterial color="#ffe2a3" :side="2" />
          </TresMesh>
          <TresMesh :geometry="wallGeometry" :render-order="4.75">
            <TresMeshBasicMaterial
              color="#ffffff"
              :side="2"
              :transparent="true"
              :opacity="0.36"
              :depth-write="false"
              :vertex-colors="true"
            />
          </TresMesh>
        </template>
        <TresMesh v-if="showFirstLayer" :render-order="0.5">
          <TresSphereGeometry :args="[innerCoreRadius, 48, 32]" />
          <TresMeshPhysicalMaterial
            color="#4b9c91"
            :transparent="true"
            :opacity="0.16"
            :depth-write="false"
            :metalness="0.16"
            :roughness="0.3"
          />
        </TresMesh>
        <TresMesh v-if="showSecondLayer" :geometry="innerCircleGeometry" :render-order="4.5">
          <TresMeshBasicMaterial
            color="#a5e6d0"
            :side="2"
            :transparent="true"
            :opacity="0.85"
          />
        </TresMesh>
        <TresMesh v-if="showFourthLayer" :render-order="5.9">
          <TresSphereGeometry :args="[outerSphereRadius, 96, 64]" />
          <TresMeshBasicMaterial
            color="#477d79"
            :side="2"
            :transparent="true"
            :opacity="0.025"
            :depth-write="false"
          />
        </TresMesh>
        <primitive v-if="showFourthLayer" :object="outerLayerPoints" />
        <template v-if="showFourthLayer">
          <TresMesh
            v-for="circle in outerLayerCircles"
            :key="circle.pointCount"
            :position="[0, 0, circle.z]"
            :render-order="6.5"
          >
            <TresTorusGeometry :args="[circle.radius, circle.tubeRadius, 8, 96]" />
            <TresMeshBasicMaterial
              :color="circle.pointCount === 1000 ? '#ffe2a3' : '#f5a85c'"
              :side="2"
            />
          </TresMesh>
        </template>

        <OrbitControls
          ref="controlsRef"
          make-default
          :enable-damping="true"
          :damping-factor="0.06"
          :zoom-speed="0.45"
          :min-distance="minDistance"
          :max-distance="14"
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

.sphere-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px 22px;
  margin: 0 4px 14px;
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
  .sphere-controls {
    justify-content: flex-start;
  }

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
