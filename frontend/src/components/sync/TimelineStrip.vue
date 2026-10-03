<!-- The narration as a strip of speech, pauses and changed gaps; click to seek. -->
<script setup>
import { computed, ref } from 'vue';
import { last, videoDuration, videoLoaded } from '../../state';
import { fmt } from '../../lib/format';
import { usePlayback } from '../../composables/usePlayback';
import { useTimeline } from '../../composables/useTimeline';
import { useCues } from '../../composables/useCues';

const { clock, seekTo } = usePlayback();
const { lead, narrationEnd, totalDuration, stripEntries } = useTimeline();
const { activeSeg } = useCues();
const track = ref(null);

const pct = (t) => `${(t / totalDuration.value) * 100}%`;
const segs = computed(() => (last.value ? stripEntries.value : []).map((e, i) => ({ ...e, i })).filter((e) => e.end > e.start));
const videoOnly = computed(() => !!last.value && videoLoaded.value && videoDuration.value + lead.value > narrationEnd.value);

function onClick(e) {
  const rect = track.value.getBoundingClientRect();
  seekTo(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * totalDuration.value);
}
</script>

<template>
  <div class="strip" title="Click to seek" @click="onClick">
    <div ref="track" class="track">
      <div
        v-for="e in segs"
        :key="e.i"
        class="seg"
        :class="[e.kind, { active: e.i === activeSeg }]"
        :style="{ left: pct(e.start), width: `max(2px, ${pct(e.end - e.start)})` }"
        :title="`${fmt(e.start - lead)}  ${e.text}`"
      />
      <div v-if="last && lead > 0" class="vstart" :style="{ left: pct(lead) }" :title="`Video starts here (voice intro ${lead.toFixed(1)}s)`" />
      <div v-if="videoOnly" class="videoonly" :style="{ left: pct(narrationEnd) }" title="Video continues after narration ends" />
      <div class="playhead" :style="last ? { left: pct(clock.t) } : null" />
    </div>
  </div>
</template>

<style scoped>
.strip { position: relative; flex: 1; min-width: 0; height: 44px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); cursor: pointer; overflow: hidden; transition: border-color .12s; }
.strip:hover { border-color: var(--border-strong); }
/* Inset from the rounded edges so the first and last segments (and the playhead at 0) aren't clipped. */
.track { position: absolute; top: 0; bottom: 0; left: 8px; right: 8px; }
.seg { position: absolute; top: 11px; bottom: 11px; border-radius: 4px; }
.seg.speech { background: var(--speech); opacity: .85; }
.seg.pause { background: var(--pause); opacity: .45; }
.seg.wait { background: var(--wait); opacity: .45; }
.seg.active { opacity: 1; outline: 2px solid var(--text); outline-offset: 1px; }
.videoonly { position: absolute; top: 0; bottom: 0; right: -8px; background: repeating-linear-gradient(45deg, transparent 0 6px, var(--border) 6px 8px); }
.playhead { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--playhead); pointer-events: none; z-index: 1; }
.playhead::before { content: ""; position: absolute; top: 3px; left: -4px; width: 10px; height: 10px; border-radius: 50%; background: var(--playhead); box-shadow: 0 0 0 2px var(--surface-2); }
.vstart { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px dashed var(--text); opacity: .5; }
</style>
