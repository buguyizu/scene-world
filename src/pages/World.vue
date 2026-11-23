<script setup>
import { onBeforeUnmount, ref, watchEffect } from "vue";
import { OrbitControls } from "@tresjs/cientos";
import { TresCanvas } from "@tresjs/core";
import { gsap } from "gsap";
import {
  BufferGeometry,
  CanvasTexture,
  Euler,
  Float32BufferAttribute,
  LinearFilter,
  Points,
  PointsMaterial,
  Quaternion,
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
const sphereLayerOutsidePointStride = 32;
const sphereLayerOutsidePointKeepMask = new Uint8Array(sphereLayerPointCount);

function hashSphereLayerPointIndex(index) {
  let hash = Math.imul(index ^ (index >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

for (let index = 0; index < sphereLayerPointCount; index += 1) {
  sphereLayerOutsidePointKeepMask[index] = Number(
    (hashSphereLayerPointIndex(index) & (sphereLayerOutsidePointStride - 1)) === 0
  );
}

const sphereLayerRing = ref({
  radius: 0,
  position: [0, sphereRadius, 0],
  rotation: [Math.PI / 2, 0, 0],
  tubeRadius: 0.00005
});
const outerLayerPopulation = 1_000_000_000;
const outerLayerPointCount = 1_000_000;
const outerLayerOutsidePointFraction = 0.01;
const outerLayerOutsidePointCount = Math.round(
  outerLayerPointCount * outerLayerOutsidePointFraction
);
const outerLayerInnerPointCount = 1_000;
const outerRingPointCount = outerLayerPointCount - outerLayerInnerPointCount;
const outerRingPointStride = 16;
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
const layerConeSegmentCount = 96;
const layerConeGeometry = new BufferGeometry();
const layerConePositionAttribute = new Float32BufferAttribute(
  new Float32Array(layerConeSegmentCount * 18),
  3
);
layerConeGeometry.setAttribute("position", layerConePositionAttribute);
const fourthLayerConeGeometry = new BufferGeometry();
const fourthLayerConePositionAttribute = new Float32BufferAttribute(
  new Float32Array(layerConeSegmentCount * 18),
  3
);
fourthLayerConeGeometry.setAttribute("position", fourthLayerConePositionAttribute);
const overviewCameraDistance = 10.5;
const overviewCameraPosition = [0, 0, overviewCameraDistance];
const minimumZoomDistance = innerSphereRadius * 1.05;
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
const overviewMapScaleDenominator = 1000;
const cellPolygons = [];
const innerCirclePositions = [];
const circleCenters = [];
const circleNormals = [];
const circleTangents = [];
const circleBitangents = [];
const controlsRef = ref(null);
const mapScaleDenominator = ref(overviewMapScaleDenominator);
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
 new Float32BufferAttribute(sphereLayerPositions.slice(), 3)
);
sphereLayerGeometry.computeBoundingSphere();
const sphereLayerSurfaceArea = 4 * Math.PI * sphereRadius ** 2;
const sphereLayerPointDiameter = Math.sqrt(
  (2 * sphereLayerSurfaceArea) / (Math.sqrt(3) * sphereLayerPointCount)
) * 2.5;
const outerLayerGeometry = new BufferGeometry();
const outerLayerPositions = new Float32Array(outerLayerPointCount * 3);
const outerLayerOutsideGeometry = new BufferGeometry();
const outerLayerOutsidePositions = new Float32Array(outerLayerOutsidePointCount * 3);
const innerCircleCosAngle = outerLayerCircles[0].cosAngle;
const outerCircleCosAngle = outerLayerCircles[1].cosAngle;
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
let renderedOuterRingPointCount = 0;
for (let index = 0; index < outerRingPointCount; index += 1) {
  if (
    (hashSphereLayerPointIndex(index + outerLayerPointCount) & (outerRingPointStride - 1)) !== 0
  ) {
    continue;
  }

  const cosAngle = innerCircleCosAngle
    - ((index + 0.5) / outerRingPointCount) * (innerCircleCosAngle - outerCircleCosAngle);
  const ringRadius = Math.sqrt(1 - cosAngle ** 2);
  const angle = (index + outerLayerInnerPointCount) * goldenAngle;
  const offset = (outerLayerInnerPointCount + renderedOuterRingPointCount) * 3;
  outerLayerPositions[offset] = Math.cos(angle) * ringRadius * outerSphereRadius;
  outerLayerPositions[offset + 1] = Math.sin(angle) * ringRadius * outerSphereRadius;
  outerLayerPositions[offset + 2] = cosAngle * outerSphereRadius;
  renderedOuterRingPointCount += 1;
}
for (let index = 0; index < outerLayerOutsidePointCount; index += 1) {
  const cosAngle = -1
    + ((index + 0.5) / outerLayerOutsidePointCount) * (outerCircleCosAngle + 1);
  const ringRadius = Math.sqrt(1 - cosAngle ** 2);
  const angle = (index + outerLayerPointCount) * goldenAngle;
  const offset = index * 3;
  outerLayerOutsidePositions[offset] = Math.cos(angle) * ringRadius * outerSphereRadius;
  outerLayerOutsidePositions[offset + 1] = Math.sin(angle) * ringRadius * outerSphereRadius;
  outerLayerOutsidePositions[offset + 2] = cosAngle * outerSphereRadius;
}
outerLayerGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(outerLayerPositions, 3)
);
outerLayerGeometry.setDrawRange(
  0,
  outerLayerInnerPointCount + renderedOuterRingPointCount
);
outerLayerGeometry.computeBoundingSphere();
outerLayerOutsideGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(outerLayerOutsidePositions, 3)
);
outerLayerOutsideGeometry.computeBoundingSphere();
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
const coneTipGeometry = new BufferGeometry();
const coneTipPositionAttribute = new Float32BufferAttribute(new Float32Array(3), 3);
coneTipGeometry.setAttribute("position", coneTipPositionAttribute);
const coneTipMaterial = new PointsMaterial({
  color: "#4ac3a6",
  map: outerLayerCircleTexture,
  size: sphereLayerPointDiameter,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.9,
  alphaTest: 0.08,
  depthTest: false,
  depthWrite: false
});
const coneTipPoint = new Points(coneTipGeometry, coneTipMaterial);
coneTipPoint.renderOrder = 6.3;
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
const outerLayerOutsideMaterial = new PointsMaterial({
  color: "#8ae2cc",
  map: outerLayerCircleTexture,
  size: outerLayerCircleDiameter,
  sizeAttenuation: true,
  transparent: true,
  opacity: 1,
  alphaTest: 0.08
});
const outerLayerOutsidePoints = new Points(outerLayerOutsideGeometry, outerLayerOutsideMaterial);
outerLayerOutsidePoints.renderOrder = 6.1;
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

function getFeaturedCirclePair(parentIndex) {
  const normal = circleNormals[parentIndex];
  const innerWallCenter = normal.clone().multiplyScalar(
    innerSphereRadius + diskOffset * (innerSphereRadius / sphereRadius)
  );
  const targetIndex = wallTargetSampleIndices.indexOf(sampleWallTargetIndex);
  const layer3CircleCenter = wallTipCenters[targetIndex];
  if (!layer3CircleCenter) throw new Error("Unable to find the focused Layer 3 circle.");
  return { innerWallCenter, layer3CircleCenter };
}

function updateSphereLayerPointDensity(ringCenter, ringNormal, ringRadius) {
  const positionAttribute = sphereLayerGeometry.attributes.position;
  const renderPositions = positionAttribute.array;
  const radiusSquared = ringRadius ** 2;
  let renderPointIndex = 0;

  for (let pointIndex = 0; pointIndex < sphereLayerPointCount; pointIndex += 1) {
    const sourceOffset = pointIndex * 3;
    const x = sphereLayerPositions[sourceOffset];
    const y = sphereLayerPositions[sourceOffset + 1];
    const z = sphereLayerPositions[sourceOffset + 2];
    const signedDistance = (x - ringCenter.x) * ringNormal.x
      + (y - ringCenter.y) * ringNormal.y
      + (z - ringCenter.z) * ringNormal.z;
    const offsetX = x - ringCenter.x;
    const offsetY = y - ringCenter.y;
    const offsetZ = z - ringCenter.z;
    const projectedDistanceSquared = offsetX ** 2 + offsetY ** 2 + offsetZ ** 2
      - signedDistance ** 2;
    const isInsideRing = x * ringNormal.x + y * ringNormal.y + z * ringNormal.z > 0
      && projectedDistanceSquared <= radiusSquared;
    if (!isInsideRing && !sphereLayerOutsidePointKeepMask[pointIndex]) continue;

    const targetOffset = renderPointIndex * 3;
    renderPositions[targetOffset] = x;
    renderPositions[targetOffset + 1] = y;
    renderPositions[targetOffset + 2] = z;
    renderPointIndex += 1;
  }

  positionAttribute.needsUpdate = true;
  sphereLayerGeometry.setDrawRange(0, renderPointIndex);
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
  let firstTipPosition;
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
    if (wallIndex === 0) firstTipPosition = pointCenter.clone();
    wallTipCenters.push(pointCenter.addScaledVector(pointNormal, wallTipOffset));
  }
  if (!firstTipPosition) throw new Error("Unable to find a Layer 3 circle for the cone tip.");
  coneTipPositionAttribute.setXYZ(
    0,
    firstTipPosition.x,
    firstTipPosition.y,
    firstTipPosition.z
  );
  coneTipPositionAttribute.needsUpdate = true;
  coneTipGeometry.computeBoundingSphere();
  updateFourthLayerCone(firstTipPosition);
  const ringNormal = wallTipCenters
    .reduce((sum, point) => sum.add(point.clone().normalize()), new Vector3())
    .normalize();
  const ringCenter = ringNormal.clone().multiplyScalar(sphereRadius + wallTipOffset + 0.004);
  const ringRadius = Math.max(...wallTipCenters.map((point) => {
    const offset = point.clone().sub(ringCenter);
    return offset.addScaledVector(ringNormal, -offset.dot(ringNormal)).length();
  })) + sphereLayerPointDiameter * 0.85;
  const ringQuaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), ringNormal);
  const ringRotation = new Euler().setFromQuaternion(ringQuaternion);
  const innerWallCenter = normal.clone().multiplyScalar(
    innerSphereRadius + diskOffset * (innerSphereRadius / sphereRadius)
  );
  updateLayerCone(
    innerWallCenter,
    tangent,
    bitangent,
    ringCenter,
    ringQuaternion,
    ringRadius
  );
  sphereLayerRing.value = {
    ...sphereLayerRing.value,
    radius: ringRadius,
    position: ringCenter.toArray(),
    rotation: [ringRotation.x, ringRotation.y, ringRotation.z]
  };
  updateSphereLayerPointDensity(ringCenter, ringNormal, ringRadius);
  return getFeaturedCirclePair(index);
}

function updateLayerCone(innerCenter, innerTangent, innerBitangent, outerCenter, outerRotation, outerRadius) {
  const outerTangent = new Vector3(1, 0, 0).applyQuaternion(outerRotation);
  const outerBitangent = new Vector3(0, 1, 0).applyQuaternion(outerRotation);
  const segmentAngle = (Math.PI * 2) / layerConeSegmentCount;
  for (let index = 0; index < layerConeSegmentCount; index += 1) {
    const startAngle = index * segmentAngle;
    const endAngle = (index + 1) * segmentAngle;
    const innerStart = innerCenter.clone()
      .addScaledVector(innerTangent, Math.cos(startAngle) * innerCircleRadius)
      .addScaledVector(innerBitangent, Math.sin(startAngle) * innerCircleRadius);
    const innerEnd = innerCenter.clone()
      .addScaledVector(innerTangent, Math.cos(endAngle) * innerCircleRadius)
      .addScaledVector(innerBitangent, Math.sin(endAngle) * innerCircleRadius);
    const outerStart = outerCenter.clone()
      .addScaledVector(outerTangent, Math.cos(startAngle) * outerRadius)
      .addScaledVector(outerBitangent, Math.sin(startAngle) * outerRadius);
    const outerEnd = outerCenter.clone()
      .addScaledVector(outerTangent, Math.cos(endAngle) * outerRadius)
      .addScaledVector(outerBitangent, Math.sin(endAngle) * outerRadius);
    const vertexIndex = index * 6;
    layerConePositionAttribute.setXYZ(vertexIndex, innerStart.x, innerStart.y, innerStart.z);
    layerConePositionAttribute.setXYZ(vertexIndex + 1, outerStart.x, outerStart.y, outerStart.z);
    layerConePositionAttribute.setXYZ(vertexIndex + 2, outerEnd.x, outerEnd.y, outerEnd.z);
    layerConePositionAttribute.setXYZ(vertexIndex + 3, innerStart.x, innerStart.y, innerStart.z);
    layerConePositionAttribute.setXYZ(vertexIndex + 4, outerEnd.x, outerEnd.y, outerEnd.z);
    layerConePositionAttribute.setXYZ(vertexIndex + 5, innerEnd.x, innerEnd.y, innerEnd.z);
  }
  layerConePositionAttribute.needsUpdate = true;
  layerConeGeometry.computeBoundingSphere();
}

function updateFourthLayerCone(apex) {
  const baseCircle = outerLayerCircles[0];
  const segmentAngle = (Math.PI * 2) / layerConeSegmentCount;
  for (let index = 0; index < layerConeSegmentCount; index += 1) {
    const startAngle = index * segmentAngle;
    const endAngle = (index + 1) * segmentAngle;
    const startX = Math.cos(startAngle) * baseCircle.radius;
    const startY = Math.sin(startAngle) * baseCircle.radius;
    const endX = Math.cos(endAngle) * baseCircle.radius;
    const endY = Math.sin(endAngle) * baseCircle.radius;
    const vertexIndex = index * 6;
    fourthLayerConePositionAttribute.setXYZ(vertexIndex, startX, startY, baseCircle.z);
    fourthLayerConePositionAttribute.setXYZ(vertexIndex + 1, endX, endY, baseCircle.z);
    fourthLayerConePositionAttribute.setXYZ(vertexIndex + 2, apex.x, apex.y, apex.z);
    fourthLayerConePositionAttribute.setXYZ(vertexIndex + 3, 0, 0, baseCircle.z);
    fourthLayerConePositionAttribute.setXYZ(vertexIndex + 4, endX, endY, baseCircle.z);
    fourthLayerConePositionAttribute.setXYZ(vertexIndex + 5, startX, startY, baseCircle.z);
  }
  fourthLayerConePositionAttribute.needsUpdate = true;
  fourthLayerConeGeometry.computeBoundingSphere();
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

function updateZoomRatio() {
  const controls = getOrbitControls();
  if (!controls) return;

  const distance = controls.object.position.distanceTo(controls.target);
  if (!Number.isFinite(distance) || distance <= 0) return;
  mapScaleDenominator.value = Math.max(
    1,
    Math.round((overviewMapScaleDenominator * distance) / overviewCameraDistance)
  );
}

watchEffect((onCleanup) => {
  const controls = getOrbitControls();
  if (!controls) return;

  controls.addEventListener("change", updateZoomRatio);
  updateZoomRatio();
  onCleanup(() => controls.removeEventListener("change", updateZoomRatio));
});

function zoomScene(factor) {
  const controls = getOrbitControls();
  if (!controls) return;

  const offset = controls.object.position.clone().sub(controls.target);
  const distance = offset.length();
  const nextDistance = Math.min(
    controls.maxDistance,
    Math.max(controls.minDistance, distance * factor)
  );
  if (nextDistance === distance) return;

  gsap.killTweensOf(controls.object.position);
  gsap.killTweensOf(controls.target);
  const destination = controls.target.clone()
    .addScaledVector(offset.normalize(), nextDistance);
  gsap.to(controls.object.position, {
    x: destination.x,
    y: destination.y,
    z: destination.z,
    duration: 0.2,
    ease: "power2.out",
    onUpdate: () => controls.update()
  });
}

function panScene(direction, stepRatio) {
  const controls = getOrbitControls();
  if (!controls) return;

  gsap.killTweensOf(controls.object.position);
  gsap.killTweensOf(controls.target);

  const camera = controls.object;
  const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  let movement;
  switch (direction) {
    case "up":
      movement = up;
      break;
    case "down":
      movement = up.negate();
      break;
    case "left":
      movement = right.negate();
      break;
    case "right":
      movement = right;
      break;
    default:
      throw new Error(`Unknown scene pan direction: ${direction}`);
  }

  const step = controls.getDistance() * stepRatio;
  movement.multiplyScalar(step);
  camera.position.add(movement);
  controls.target.add(movement);
  controls.update();
  updateZoomRatio();
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
  outerLayerOutsideGeometry.dispose();
  sphereLayerGeometry.dispose();
  layerConeGeometry.dispose();
  fourthLayerConeGeometry.dispose();
  coneTipGeometry.dispose();
  outerLayerCircleTexture.dispose();
  sphereLayerMaterial.dispose();
  coneTipMaterial.dispose();
  outerLayerMaterial.dispose();
  outerLayerOutsideMaterial.dispose();
  innerCircleGeometry.dispose();
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
        <p class="scene-description">Layer 1 is the central sphere; Layer 2 has the inner circles and the narrow end of the Layer 2–3 cone. The Layer 3 yellow ring forms its wide end, while a selected green circle connects to the small yellow ring of Layer 4. Layer 4 shows about 62.5K points between the large and small rings, 10K visible circles outside the large ring, and 1K inside the small ring.</p>
      </div>
      <div class="scene-heading-meta">
        <div class="cell-counter"><strong>7</strong><span>RANDOM TIPS</span></div>
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
              :opacity="0.15"
              :depth-write="false"
              :metalness="0.24"
              :roughness="0.28"
            />
          </TresMesh>
          <primitive :object="sphereLayerPoints" />
          <TresMesh
            :position="sphereLayerRing.position"
            :rotation="sphereLayerRing.rotation"
            :render-order="6.5"
          >
            <TresTorusGeometry
              :args="[sphereLayerRing.radius, sphereLayerRing.tubeRadius, 8, 128]"
            />
            <TresMeshBasicMaterial color="#ffe2a3" :side="2" />
          </TresMesh>
          <TresMesh
            v-if="showSecondLayer"
            :geometry="layerConeGeometry"
            :render-order="4.75"
          >
            <TresMeshBasicMaterial
              color="#f5a85c"
              :side="2"
              :transparent="true"
              :opacity="0.32"
              :depth-write="false"
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
        <primitive v-if="showFourthLayer" :object="outerLayerOutsidePoints" />
        <primitive v-if="showFourthLayer" :object="coneTipPoint" />
        <TresMesh
          v-if="showThirdLayer && showFourthLayer"
          :geometry="fourthLayerConeGeometry"
          :render-order="6.2"
        >
          <TresMeshBasicMaterial
            color="#f5a85c"
            :side="2"
            :transparent="true"
            :opacity="0.42"
            :depth-write="false"
            :depth-test="false"
          />
        </TresMesh>
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
          :zoom-speed="0.18"
          :min-distance="minDistance"
          :max-distance="14"
        />
      </TresCanvas>
      <div class="scene-zoom-controls" aria-label="Zoom controls" @dblclick.stop>
        <div
          class="scene-zoom-ratio"
          role="status"
          aria-live="polite"
          title="以初始视图 1:1000 为基准"
        >
          <span>比例尺</span>
          <strong>1:{{ mapScaleDenominator }}</strong>
        </div>
        <div class="scene-pan-controller" role="group" aria-label="Pan controls">
          <div class="scene-pan-wheel">
            <div class="scene-pan-ring pan-ring-coarse" role="group" aria-label="Coarse pan">
              <button class="pan-up" type="button" aria-label="Coarse pan up" title="粗调向上" @click="panScene('up', 0.2)"><span aria-hidden="true">↑</span></button>
              <button class="pan-down" type="button" aria-label="Coarse pan down" title="粗调向下" @click="panScene('down', 0.2)"><span aria-hidden="true">↓</span></button>
              <button class="pan-left" type="button" aria-label="Coarse pan left" title="粗调向左" @click="panScene('left', 0.2)"><span aria-hidden="true">←</span></button>
              <button class="pan-right" type="button" aria-label="Coarse pan right" title="粗调向右" @click="panScene('right', 0.2)"><span aria-hidden="true">→</span></button>
            </div>
            <div class="scene-pan-ring pan-ring-fine" role="group" aria-label="Fine pan">
              <button class="pan-up" type="button" aria-label="Fine pan up" title="细调向上" @click="panScene('up', 0.05)"><span aria-hidden="true">↑</span></button>
              <button class="pan-down" type="button" aria-label="Fine pan down" title="细调向下" @click="panScene('down', 0.05)"><span aria-hidden="true">↓</span></button>
              <button class="pan-left" type="button" aria-label="Fine pan left" title="细调向左" @click="panScene('left', 0.05)"><span aria-hidden="true">←</span></button>
              <button class="pan-right" type="button" aria-label="Fine pan right" title="细调向右" @click="panScene('right', 0.05)"><span aria-hidden="true">→</span></button>
            </div>
            <div class="scene-pan-ring pan-ring-micro" role="group" aria-label="Micro pan">
              <button class="pan-up" type="button" aria-label="Micro pan up" title="微调向上" @click="panScene('up', 0.01)"><span aria-hidden="true">↑</span></button>
              <button class="pan-down" type="button" aria-label="Micro pan down" title="微调向下" @click="panScene('down', 0.01)"><span aria-hidden="true">↓</span></button>
              <button class="pan-left" type="button" aria-label="Micro pan left" title="微调向左" @click="panScene('left', 0.01)"><span aria-hidden="true">←</span></button>
              <button class="pan-right" type="button" aria-label="Micro pan right" title="微调向右" @click="panScene('right', 0.01)"><span aria-hidden="true">→</span></button>
            </div>
            <div class="scene-pan-ring pan-ring-precision" role="group" aria-label="Precision pan">
              <button class="pan-up" type="button" aria-label="Precision pan up" title="精调向上" @click="panScene('up', 0.001)"><span aria-hidden="true">↑</span></button>
              <button class="pan-down" type="button" aria-label="Precision pan down" title="精调向下" @click="panScene('down', 0.001)"><span aria-hidden="true">↓</span></button>
              <button class="pan-left" type="button" aria-label="Precision pan left" title="精调向左" @click="panScene('left', 0.001)"><span aria-hidden="true">←</span></button>
              <button class="pan-right" type="button" aria-label="Precision pan right" title="精调向右" @click="panScene('right', 0.001)"><span aria-hidden="true">→</span></button>
            </div>
          </div>
          <span class="scene-pan-legend">外→内：粗调 · 细调 · 微调 · 精调</span>
        </div>
        <div class="scene-zoom-group zoom-group-coarse" role="group" aria-label="Coarse zoom">
          <button type="button" aria-label="Coarse zoom out" title="粗调缩小" @click="zoomScene(1.25)">−</button>
          <button type="button" aria-label="Coarse zoom in" title="粗调放大" @click="zoomScene(0.8)">+</button>
        </div>
        <div class="scene-zoom-group zoom-group-fine" role="group" aria-label="Fine zoom">
          <button type="button" aria-label="Fine zoom out" title="细调缩小" @click="zoomScene(1.05)">−</button>
          <button type="button" aria-label="Fine zoom in" title="细调放大" @click="zoomScene(0.95)">+</button>
        </div>
        <div class="scene-zoom-group zoom-group-micro" role="group" aria-label="Micro zoom">
          <button type="button" aria-label="Micro zoom out" title="微调缩小" @click="zoomScene(1.01)">−</button>
          <button type="button" aria-label="Micro zoom in" title="微调放大" @click="zoomScene(0.99)">+</button>
        </div>
        <div class="scene-zoom-group zoom-group-precision" role="group" aria-label="Precision zoom">
          <button type="button" aria-label="Precision zoom out" title="精调缩小" @click="zoomScene(1.001)">−</button>
          <button type="button" aria-label="Precision zoom in" title="精调放大" @click="zoomScene(0.999)">+</button>
        </div>
        <span class="scene-zoom-legend">上→下：粗调 · 细调 · 微调 · 精调（−缩小，+放大）</span>
      </div>
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

.scene-zoom-controls {
  position: absolute;
  z-index: 2;
  right: 12px;
  bottom: 42px;
  display: grid;
  gap: 6px;
}

.scene-zoom-ratio {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid rgba(191, 223, 214, 0.24);
  border-radius: 6px;
  color: rgba(218, 237, 231, 0.72);
  background: rgba(7, 25, 34, 0.78);
  font-size: 0.7rem;
  backdrop-filter: blur(8px);
}

.scene-zoom-ratio strong {
  color: #8ae2cc;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.scene-pan-wheel {
  position: relative;
  width: 166px;
  height: 166px;
  justify-self: end;
}

.scene-pan-controller {
  display: grid;
  width: 166px;
  justify-items: center;
  gap: 4px;
}

.scene-pan-ring {
  --pan-ring-color: rgba(191, 223, 214, 0.4);
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.scene-pan-ring::after {
  position: absolute;
  inset: 0;
  border: 1px solid var(--pan-ring-color);
  border-radius: 50%;
  background:
    linear-gradient(
      45deg,
      transparent calc(50% - 0.5px),
      var(--pan-ring-color) 50%,
      transparent calc(50% + 0.5px)
    ),
    linear-gradient(
      -45deg,
      transparent calc(50% - 0.5px),
      var(--pan-ring-color) 50%,
      transparent calc(50% + 0.5px)
    );
  content: "";
  pointer-events: none;
}

.pan-ring-coarse {
  --pan-ring-color: rgba(138, 226, 204, 0.52);
  --pan-button-color: rgba(18, 53, 59, 0.98);
  --pan-inner-left: 23.48%;
  --pan-inner-right: 76.52%;
  --pan-inner-upper: 23.48%;
  --pan-inner-lower: 76.52%;
  --pan-inner-cardinal: 12.5%;
  z-index: 1;
  width: 152px;
  height: 152px;
}

.pan-ring-fine {
  --pan-ring-color: rgba(138, 226, 204, 0.42);
  --pan-button-color: rgba(22, 61, 64, 0.98);
  --pan-inner-left: 26.43%;
  --pan-inner-right: 73.57%;
  --pan-inner-upper: 26.43%;
  --pan-inner-lower: 73.57%;
  --pan-inner-cardinal: 16.67%;
  z-index: 2;
  width: 114px;
  height: 114px;
}

.pan-ring-micro {
  --pan-ring-color: rgba(138, 226, 204, 0.34);
  --pan-button-color: rgba(27, 70, 69, 0.98);
  --pan-inner-left: 32.32%;
  --pan-inner-right: 67.68%;
  --pan-inner-upper: 32.32%;
  --pan-inner-lower: 67.68%;
  --pan-inner-cardinal: 25%;
  z-index: 3;
  width: 76px;
  height: 76px;
}

.pan-ring-precision {
  --pan-button-color: rgba(36, 84, 78, 0.98);
  z-index: 4;
  width: 38px;
  height: 38px;
}

.scene-pan-ring button {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  color: #e6f2ee;
  background: var(--pan-button-color);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
}

.scene-pan-ring button span {
  position: absolute;
  line-height: 1;
  transform: translate(-50%, -50%);
}

.scene-pan-ring .pan-up {
  clip-path: polygon(14.65% 14.65%, 29.3% 3.8%, 50% 0, 70.7% 3.8%, 85.35% 14.65%, var(--pan-inner-right) var(--pan-inner-upper), 50% var(--pan-inner-cardinal), var(--pan-inner-left) var(--pan-inner-upper));
}

.scene-pan-ring .pan-right {
  clip-path: polygon(85.35% 14.65%, 96.2% 29.3%, 100% 50%, 96.2% 70.7%, 85.35% 85.35%, var(--pan-inner-right) var(--pan-inner-lower), var(--pan-inner-cardinal) 50%, var(--pan-inner-right) var(--pan-inner-upper));
}

.scene-pan-ring .pan-down {
  clip-path: polygon(85.35% 85.35%, 70.7% 96.2%, 50% 100%, 29.3% 96.2%, 14.65% 85.35%, var(--pan-inner-left) var(--pan-inner-lower), 50% calc(100% - var(--pan-inner-cardinal)), var(--pan-inner-right) var(--pan-inner-lower));
}

.scene-pan-ring .pan-left {
  clip-path: polygon(14.65% 85.35%, 3.8% 70.7%, 0 50%, 3.8% 29.3%, 14.65% 14.65%, var(--pan-inner-left) var(--pan-inner-upper), var(--pan-inner-cardinal) 50%, var(--pan-inner-left) var(--pan-inner-lower));
}

.scene-pan-ring .pan-up span {
  top: 12%;
  left: 50%;
}

.scene-pan-ring .pan-right span {
  top: 50%;
  right: 12%;
  transform: translate(50%, -50%);
}

.scene-pan-ring .pan-down span {
  bottom: 12%;
  left: 50%;
  transform: translate(-50%, 50%);
}

.scene-pan-ring .pan-left span {
  top: 50%;
  left: 12%;
}

.pan-ring-coarse .pan-up span {
  top: 6.25%;
}

.pan-ring-coarse .pan-down span {
  bottom: 6.25%;
}

.pan-ring-coarse .pan-right span {
  right: 6.25%;
}

.pan-ring-coarse .pan-left span {
  left: 6.25%;
}

.pan-ring-fine .pan-up span {
  top: 8.33%;
}

.pan-ring-fine .pan-down span {
  bottom: 8.33%;
}

.pan-ring-fine .pan-right span {
  right: 8.33%;
}

.pan-ring-fine .pan-left span {
  left: 8.33%;
}

.pan-ring-micro .pan-up span {
  top: 12.5%;
}

.pan-ring-micro .pan-down span {
  bottom: 12.5%;
}

.pan-ring-micro .pan-right span {
  right: 12.5%;
}

.pan-ring-micro .pan-left span {
  left: 12.5%;
}

.pan-ring-precision .pan-up {
  clip-path: polygon(14.65% 14.65%, 29.3% 3.8%, 50% 0, 70.7% 3.8%, 85.35% 14.65%, 50% 50%);
}

.pan-ring-precision .pan-right {
  clip-path: polygon(85.35% 14.65%, 96.2% 29.3%, 100% 50%, 96.2% 70.7%, 85.35% 85.35%, 50% 50%);
}

.pan-ring-precision .pan-down {
  clip-path: polygon(85.35% 85.35%, 70.7% 96.2%, 50% 100%, 29.3% 96.2%, 14.65% 85.35%, 50% 50%);
}

.pan-ring-precision .pan-left {
  clip-path: polygon(14.65% 85.35%, 3.8% 70.7%, 0 50%, 3.8% 29.3%, 14.65% 14.65%, 50% 50%);
}

.pan-ring-precision button span {
  font-size: 0.72rem;
}

.pan-ring-precision .pan-up span {
  top: 25%;
}

.pan-ring-precision .pan-right span {
  right: 25%;
}

.pan-ring-precision .pan-down span {
  bottom: 25%;
}

.pan-ring-precision .pan-left span {
  left: 25%;
}

.scene-pan-legend {
  color: rgba(218, 237, 231, 0.68);
  font-size: 0.62rem;
  text-align: center;
  white-space: nowrap;
}

.scene-zoom-group {
  position: relative;
  display: block;
  justify-self: center;
  width: 166px;
  height: 44px;
  box-sizing: border-box;
  padding: 0;
  border: 1px solid rgba(191, 223, 214, 0.24);
  border-radius: 6px;
  color: rgba(218, 237, 231, 0.72);
  background: rgba(7, 25, 34, 0.72);
  font-size: 0.7rem;
  backdrop-filter: blur(8px);
}

.zoom-group-coarse button:first-of-type {
  left: 5px;
}

.zoom-group-coarse button:last-of-type {
  right: 5px;
}

.zoom-group-fine button:first-of-type {
  left: 23px;
}

.zoom-group-fine button:last-of-type {
  right: 23px;
}

.zoom-group-micro button:first-of-type {
  left: 41px;
}

.zoom-group-micro button:last-of-type {
  right: 41px;
}

.zoom-group-precision button:first-of-type {
  left: 49px;
}

.zoom-group-precision button:last-of-type {
  right: 49px;
}

.scene-zoom-group button {
  position: absolute;
  top: 50%;
  width: 34px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(191, 223, 214, 0.3);
  border-radius: 4px;
  color: #e6f2ee;
  background: rgba(20, 54, 60, 0.82);
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  transform: translateY(-50%);
}

.scene-zoom-legend {
  justify-self: center;
  width: 166px;
  color: rgba(218, 237, 231, 0.68);
  font-size: 0.62rem;
  line-height: 1.2;
  text-align: center;
}

.scene-zoom-group button:hover,
.scene-pan-ring button:hover {
  border-color: #8ae2cc;
  color: #8ae2cc;
  background: rgba(34, 89, 84, 0.9);
}

.scene-zoom-group button:focus-visible {
  outline: 2px solid #8ae2cc;
  outline-offset: 2px;
}

.scene-pan-ring button:focus-visible {
  outline: none;
  filter: brightness(1.5);
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

  .scene-zoom-controls {
    right: 8px;
    bottom: 30px;
    transform: scale(0.85);
    transform-origin: bottom right;
  }
}
</style>
