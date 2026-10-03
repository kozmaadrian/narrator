<!-- Play / pause, the narration clock and the timeline strip. -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import TimelineStrip from './TimelineStrip.vue';
import { last } from '../../state';
import { fmt } from '../../lib/format';
import { usePlayback } from '../../composables/usePlayback';
import { useTimeline } from '../../composables/useTimeline';

const { clock, togglePlay } = usePlayback();
const { lead, totalDuration } = useTimeline();

const time = computed(() => `${clock.intro ? 'intro ' : ''}${fmt(clock.t - lead.value)}`);
const total = computed(() => (last.value ? `of ${fmt(totalDuration.value - lead.value)}` : ''));
</script>

<template>
  <div class="transport">
    <button class="play" title="⌥Space. Play / pause" @click="togglePlay()">
      <Icon v-if="clock.playing" name="pause" />
      <Icon v-else name="play" class="play-icon" />
    </button>
    <div class="time"><span class="clock">{{ time }}</span><span class="total">{{ total }}</span></div>
    <TimelineStrip />
  </div>
</template>

<style scoped>
.transport { display: flex; align-items: center; gap: 12px; flex: none; }
button.play { width: 40px; height: 40px; padding: 0; border-radius: 50%; border: none; background: var(--primary); color: #fff; box-shadow: 0 2px 6px rgba(79, 70, 229, .35); flex: none; }
button.play:hover:not(:disabled) { background: var(--primary-hover); }
button.play .i { width: 16px; height: 16px; fill: currentColor; }
button.play .i.play-icon { margin-left: 2px; }
.time { display: flex; flex-direction: column; min-width: 72px; line-height: 1.25; font-variant-numeric: tabular-nums; }
.clock { font-size: 14px; font-weight: 600; }
.total { font-size: 11.5px; color: var(--muted); }
</style>
