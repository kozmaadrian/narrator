<!-- The recording, the transport with the timeline strip, and the last render's files and warnings. -->
<script setup>
import Icon from '../ui/Icon.vue';
import VideoPanel from './VideoPanel.vue';
import TransportBar from './TransportBar.vue';
import RenderDetails from './RenderDetails.vue';
import { useCues } from '../../composables/useCues';

const { tapLabel, tapNext } = useCues();
</script>

<template>
  <section class="panel player">
    <VideoPanel />
    <TransportBar />
    <div class="row">
      <div class="legend">
        <span><i style="background: var(--speech)" />Paragraph</span>
        <span><i style="background: var(--pause)" />Pause</span>
        <span><i style="background: var(--wait)" />Changed gap</span>
      </div>
      <span class="spacer" />
      <button title="⌥N. While the video plays, sets the highlighted paragraph's start to now" @click="tapNext()">
        <Icon name="timer" /><span>{{ tapLabel }}</span>
      </button>
    </div>
    <RenderDetails />
  </section>
</template>

<style scoped>
.player { overflow: auto; gap: 14px; }
.legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 8px; height: 8px; border-radius: 50%; }
</style>
