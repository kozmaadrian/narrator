<!-- The recording, the transport with the timeline strip, and the last render's files and warnings. -->
<script setup>
import VideoPanel from './VideoPanel.vue';
import TransportBar from './TransportBar.vue';
import RenderDetails from './RenderDetails.vue';
import StatusBar from '../ui/StatusBar.vue';
</script>

<template>
  <section class="panel player">
    <VideoPanel />
    <TransportBar />
    <div class="legend" aria-hidden="true">
      <span><i class="sw speech" />Paragraph</span>
      <span><i class="sw pause" />Pause</span>
      <span><i class="sw wait" />Added pause</span>
    </div>
    <StatusBar where="sync" />
    <RenderDetails />
  </section>
</template>

<style scoped>
.player { overflow: auto; gap: 14px; }
.legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; width: 14px; height: 8px; }
.sw.speech { background: var(--speech); }
.sw.pause { background: var(--pause); }
.sw.wait { background: var(--wait); }
</style>
