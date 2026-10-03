<!-- One row per paragraph, with the pause before it in a slim row between; the row under the playhead scrolls
     into view while it plays. -->
<script setup>
import { nextTick, watch } from 'vue';
import CueGap from './CueGap.vue';
import CueRow from './CueRow.vue';
import { useCues } from '../../composables/useCues';
import { usePlayback } from '../../composables/usePlayback';

const { rows, gaps, activePara, activeGap } = useCues();
const { clockEl } = usePlayback();
const rowEls = [];

watch(activePara, async (i) => {
  if (i < 0 || clockEl().paused) return;
  await nextTick();
  rowEls[i]?.$el?.scrollIntoView({ block: 'nearest' });
});
</script>

<template>
  <div class="timeline">
    <table>
      <thead>
        <tr>
          <th>¶</th>
          <th title="Where the paragraph starts in the video. ↑/↓ nudge (⇧ = 1 s), empty = keep the rendered gap after the previous paragraph.">Start</th>
          <th>Length</th>
          <th>Text</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, i) in rows" :key="i">
          <CueGap v-if="gaps[i]" :gap="gaps[i]" :index="i" :active="i === activeGap" />
          <CueRow :ref="(el) => { rowEls[i] = el; }" :row="row" :index="i" />
        </template>
        <tr v-if="!rows.length"><td colspan="4" class="empty">No paragraphs yet.</td></tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.timeline { flex: 1; overflow: auto; min-height: 120px; border-top: 1px solid var(--border); }
table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
th { position: sticky; top: 0; z-index: 1; background: var(--surface); text-align: left; font-size: 11px; font-weight: 650; letter-spacing: .07em; text-transform: uppercase; color: var(--subtle); padding: 9px 10px; border-bottom: 1px solid var(--border); }
th:first-child { padding-left: 16px; }
th:last-child { padding-right: 16px; }
@media (max-width: 1000px) {
  .timeline { max-height: 60vh; }
}
</style>
