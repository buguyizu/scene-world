<script setup>
import { onBeforeUnmount, ref } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import { gsap } from "gsap";

const coreRig = ref();
const orbitRig = ref();
const isPlaying = ref(true);
let motionTimeline;

const particles = Array.from({ length: 48 }, (_, index) => {
  const angle = index * 2.399963229728653;
  const radius = 2.5 + (index % 7) * 0.38;
  return {
    id: index,
    position: [Math.cos(angle) * radius, Math.sin(angle * 1.31) * 2.25, Math.sin(angle) * radius],
    size: index % 5 === 0 ? 0.026 : 0.014
  };
});

function startMotion() {
  if (!coreRig.value || !orbitRig.value) return;

  motionTimeline?.kill();
  motionTimeline = gsap.timeline({ repeat: -1, yoyo: true });
  motionTimeline
    .to(coreRig.value.rotation, { y: Math.PI * 2, duration: 14, ease: "none" }, 0)
    .to(coreRig.value.rotation, { x: Math.PI * 0.42, duration: 7, ease: "sine.inOut" }, 0)
    .to(orbitRig.value.rotation, { y: -Math.PI * 2, duration: 20, ease: "none" }, 0)
    .to(orbitRig.value.rotation, { z: Math.PI * 0.24, duration: 10, ease: "sine.inOut" }, 0);
  isPlaying.value = true;
}

function toggleMotion() {
  if (!motionTimeline) return;
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) motionTimeline.resume();
  else motionTimeline.pause();
}

function restartMotion() {
  if (!motionTimeline) return;
  isPlaying.value = true;
  motionTimeline.restart();
}

onBeforeUnmount(() => {
  motionTimeline?.kill();
});
</script>

<template>
  <section class="orbital-page">
    <div class="orbital-stage" aria-label="Animated three-dimensional orbital scene">
      <TresCanvas class="orbital-canvas" :dpr="[1, 1.75]" clear-color="#071922" shadows @ready="startMotion">
        <TresPerspectiveCamera :position="[0, 0, 7.8]" :fov="39" :near="0.1" :far="80" />
        <TresAmbientLight :intensity="0.8" />
        <TresDirectionalLight :position="[3, 4, 5]" :intensity="3.5" color="#e3fff5" />
        <TresPointLight :position="[-3, -1, 2]" :intensity="24" color="#ff8967" />
        <TresPointLight :position="[0, 3, -3]" :intensity="18" color="#5ddbc5" />

        <TresGroup ref="orbitRig">
          <TresMesh :rotation="[1.08, 0.18, 0.2]">
            <TresTorusGeometry :args="[1.86, 0.014, 8, 180]" />
            <TresMeshBasicMaterial color="#75e1ca" :transparent="true" :opacity="0.62" />
          </TresMesh>
          <TresMesh :rotation="[0.22, 0, 1.14]">
            <TresTorusGeometry :args="[2.12, 0.009, 8, 180]" />
            <TresMeshBasicMaterial color="#eaa66d" :transparent="true" :opacity="0.48" />
          </TresMesh>
          <TresMesh :position="[1.86, 0, 0]">
            <TresSphereGeometry :args="[0.12, 24, 24]" />
            <TresMeshStandardMaterial color="#f1c37f" :emissive="'#985627'" :emissive-intensity="1.2" :metalness="0.55" :roughness="0.24" />
          </TresMesh>
          <TresMesh :position="[-1.48, 0.88, 0.4]">
            <TresSphereGeometry :args="[0.075, 20, 20]" />
            <TresMeshStandardMaterial color="#f28a70" :emissive="'#9f392c'" :emissive-intensity="1.25" :metalness="0.36" :roughness="0.28" />
          </TresMesh>
        </TresGroup>

        <TresGroup ref="coreRig">
          <TresMesh cast-shadow receive-shadow>
            <TresTorusKnotGeometry :args="[1.02, 0.31, 220, 28, 2, 3]" />
            <TresMeshPhysicalMaterial color="#88e5d1" :metalness="0.68" :roughness="0.2" :clearcoat="0.92" :emissive="'#0a5c54'" :emissive-intensity="0.58" />
          </TresMesh>
          <TresMesh :rotation="[1.2, 0.4, 0.1]">
            <TresTorusGeometry :args="[0.48, 0.018, 8, 96]" />
            <TresMeshBasicMaterial color="#f2c17c" :transparent="true" :opacity="0.86" />
          </TresMesh>
        </TresGroup>

        <TresMesh v-for="particle in particles" :key="particle.id" :position="particle.position">
          <TresSphereGeometry :args="[particle.size, 8, 8]" />
          <TresMeshBasicMaterial :color="particle.id % 4 === 0 ? '#f0b77b' : '#91d7ca'" :transparent="true" :opacity="particle.id % 4 === 0 ? 0.9 : 0.48" />
        </TresMesh>

        <OrbitControls make-default :enable-damping="true" :damping-factor="0.06" :min-distance="4.8" :max-distance="12" />
      </TresCanvas>

      <div class="orbital-overlay">
        <div class="orbital-topline">
          <div class="orbital-index"><span>FIELD STUDY</span><strong>01 / 03</strong></div>
          <div class="orbital-actions">
            <button type="button" class="orbital-action" :aria-label="isPlaying ? 'Pause animation' : 'Play animation'" @click="toggleMotion">
              <span class="orbital-action-symbol" aria-hidden="true">{{ isPlaying ? "Ⅱ" : "▶" }}</span>
              {{ isPlaying ? "Pause" : "Play" }}
            </button>
            <button type="button" class="orbital-action" aria-label="Restart animation" @click="restartMotion">
              <span class="orbital-action-symbol" aria-hidden="true">↻</span>
              Restart
            </button>
          </div>
        </div>

        <div class="orbital-caption">
          <p>SPATIAL OBJECT / 001</p>
          <h2>Orbital<br />Resonance</h2>
          <div class="orbital-caption-rule"><span></span> TORUS KNOT · THREE AXES</div>
        </div>

        <div class="orbital-coordinate" aria-hidden="true">
          <span>φ</span>
          <span>1.618</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.orbital-page {
  width: 100%;
}

.orbital-stage {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: min(72vh, 740px);
  min-height: 460px;
  overflow: hidden;
  background: #071922;
}

.orbital-stage::after {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  content: "";
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 46%, transparent 20%, rgba(4, 15, 20, 0.18) 76%),
    linear-gradient(90deg, rgba(7, 25, 34, 0.82), transparent 44%, rgba(7, 25, 34, 0.12));
}

.orbital-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.orbital-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.orbital-overlay {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px 28px 30px;
  pointer-events: none;
  color: #e6f2ee;
}

.orbital-topline,
.orbital-index,
.orbital-actions,
.orbital-caption-rule {
  display: flex;
  align-items: center;
}

.orbital-topline {
  justify-content: space-between;
  gap: 16px;
}

.orbital-index {
  gap: 14px;
  color: rgba(218, 237, 231, 0.72);
  font-size: 0.72rem;
}

.orbital-index strong {
  color: #81ddc8;
  font-weight: 600;
}

.orbital-actions {
  gap: 8px;
  pointer-events: auto;
}

.orbital-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(191, 223, 214, 0.32);
  border-radius: 4px;
  color: #e6f2ee;
  background: rgba(7, 25, 34, 0.4);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.orbital-action:hover {
  border-color: #8ae2cc;
  background: rgba(16, 55, 59, 0.76);
}

.orbital-action-symbol {
  color: #8ae2cc;
}

.orbital-caption {
  max-width: 360px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.38);
}

.orbital-caption p {
  margin: 0 0 10px;
  color: #83ddc9;
  font-size: 0.72rem;
  font-weight: 600;
}

.orbital-caption h2 {
  margin: 0;
  color: #f1f4ec;
  font-size: 2.65rem;
  font-weight: 500;
  line-height: 1.02;
}

.orbital-caption-rule {
  gap: 9px;
  margin-top: 18px;
  color: rgba(218, 237, 231, 0.7);
  font-size: 0.68rem;
}

.orbital-caption-rule span {
  width: 28px;
  height: 1px;
  background: #81ddc8;
}

.orbital-coordinate {
  position: absolute;
  right: 28px;
  bottom: 34px;
  display: grid;
  gap: 2px;
  color: rgba(218, 237, 231, 0.55);
  font-size: 0.68rem;
  text-align: right;
}

.orbital-coordinate span:first-child {
  color: #e8b778;
  font-size: 1.1rem;
}

@media (max-width: 640px) {
  .orbital-stage {
    height: 68vh;
    min-height: 500px;
  }

  .orbital-overlay {
    padding: 16px 14px 22px;
  }

  .orbital-index {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
    font-size: 0.64rem;
  }

  .orbital-actions {
    gap: 6px;
  }

  .orbital-action {
    min-height: 36px;
    padding: 0 9px;
    gap: 6px;
    font-size: 0.76rem;
  }

  .orbital-caption h2 {
    font-size: 2rem;
  }

  .orbital-coordinate {
    right: 14px;
    bottom: 26px;
  }
}
</style>