<!-- 2 · Sync: the player on the left, the paragraph timing on the right. In one column: the player, the
     paragraph timing, then the timing history (PlayerPanel moves it into #sync-after-cues). -->
<script setup>
import PlayerPanel from './PlayerPanel.vue';
import CuePanel from './CuePanel.vue';
</script>

<template>
  <div class="screen sync-screen">
    <PlayerPanel />
    <CuePanel />
    <div id="sync-after-cues" class="panel after-cues" />
  </div>
</template>

<style scoped>
.sync-screen { display: grid; grid-template-columns: minmax(440px, 1.25fr) minmax(400px, 1fr); }
.after-cues { display: none; }
@media (max-width: 1000px) {
  /* One column: the timing list fills what the player leaves of the window. It keeps its own scroll, so
     following the playhead never moves the video out of view. */
  .sync-screen { display: flex; flex-direction: column; min-height: calc(100dvh - 56px); }
  .sync-screen > .player { flex: none; }
  .sync-screen > .cues { flex: 1 1 0; min-height: 360px; }
  .sync-screen > .after-cues { display: flex; flex: none; gap: 14px; padding-top: 8px; }
  /* No history and no message yet: no room taken (the empty live regions stay for screen readers). */
  .after-cues:not(:has(.history, .status-bar.on)) { padding: 0; }
}
</style>
