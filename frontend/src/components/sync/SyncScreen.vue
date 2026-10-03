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
.sync-screen { display: grid; grid-template-columns: minmax(440px, 1.25fr) minmax(400px, 1fr); }
@media (max-width: 1000px) {
  /* One column: the timing list fills what the player leaves of the window. It keeps its own scroll, so
     following the playhead never moves the video out of view. */
  .sync-screen { display: flex; flex-direction: column; min-height: calc(100dvh - 56px); }
  .sync-screen > .player { flex: none; }
  .sync-screen > .cues { flex: 1 1 0; min-height: 360px; }
}
</style>
