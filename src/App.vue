<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import World from "./pages/World.vue";
import OrbitalScene from "./pages/OrbitalScene.vue";

const pages = [
  { id: "scene", label: "World", href: "/#scene" },
  { id: "seed", label: "World Seed", href: "/#seed" }
];

const currentPage = ref(resolvePage(window.location.pathname, window.location.hash));

function resolvePage(pathname, hash) {
  const id = hash.replace(/^#/, "").trim().toLowerCase();
  return pages.some((page) => page.id === id) ? id : "seed";
}

function syncPageFromLocation() {
  currentPage.value = resolvePage(window.location.pathname, window.location.hash);
}

onMounted(() => {
  syncPageFromLocation();
  window.addEventListener("hashchange", syncPageFromLocation);
  window.addEventListener("popstate", syncPageFromLocation);
});

onBeforeUnmount(() => {
  window.removeEventListener("hashchange", syncPageFromLocation);
  window.removeEventListener("popstate", syncPageFromLocation);
});
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <a class="app-brand" href="/#seed">SCENE-WORLD</a>
      <nav class="page-nav" aria-label="World pages">
        <a
          v-for="page in pages"
          :key="page.id"
          :href="page.href"
          :class="{ active: currentPage === page.id }"
          :aria-current="currentPage === page.id ? 'page' : undefined"
        >
          {{ page.label }}
        </a>
      </nav>
    </header>

    <OrbitalScene v-if="currentPage === 'seed'" />
    <World v-else />
  </main>
</template>
