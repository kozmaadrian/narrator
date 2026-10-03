<!-- 2 · Sync: the player on the left, the paragraph timing on the right. -->
<script setup>
import PlayerPanel from './PlayerPanel.vue';
import CuePanel from './CuePanel.vue';
</script>

<template>
  <div class="screen sync-screen">
    <PlayerPanel />
    <CuePanel />
  </div>
</template>

<style scoped>
.sync-screen { display: grid; grid-template-columns: minmax(440px, 1.25fr) minmax(400px, 1fr); gap: 20px; }
@media (max-width: 1000px) {
  .sync-screen { grid-template-columns: 1fr; }
}
</style>
