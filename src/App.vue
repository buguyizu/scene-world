<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import OrbitalScene from "./pages/OrbitalScene.vue";
import Scene from "./pages/Scene.vue";

const pages = [
  { id: "orbital", label: "Orbital Resonance" },
  { id: "scene", label: "New Scene" }
];

const currentPage = ref(resolvePage(window.location.hash));

function resolvePage(hash) {
  const id = hash.replace(/^#/, "").trim().toLowerCase();
  return pages.some((page) => page.id === id) ? id : "orbital";
}

function syncPageFromHash() {
  currentPage.value = resolvePage(window.location.hash);
}

onMounted(() => {
  syncPageFromHash();
  window.addEventListener("hashchange", syncPageFromHash);
});

onBeforeUnmount(() => {
  window.removeEventListener("hashchange", syncPageFromHash);
});
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <a class="app-brand" href="#orbital">SCENE-WORLD</a>
      <nav class="page-nav" aria-label="Scene pages">
        <a
          v-for="page in pages"
          :key="page.id"
          :href="`#${page.id}`"
          :class="{ active: currentPage === page.id }"
          :aria-current="currentPage === page.id ? 'page' : undefined"
        >
          {{ page.label }}
        </a>
      </nav>
    </header>

    <OrbitalScene v-if="currentPage === 'orbital'" />
    <Scene v-else />
  </main>
</template>
