<!-- One row per paragraph, with the pause before it in a slim row between. What plays now stays in view. -->
<script setup>
import { ref, watch } from 'vue';
import CueGap from './CueGap.vue';
import CueRow from './CueRow.vue';
import { useCues } from '../../composables/useCues';
import { usePlayback } from '../../composables/usePlayback';

const { rows, gaps, activePara, activeGap, movingFrom } = useCues();
const { clock } = usePlayback();
const box = ref(null);
const rowEls = [], gapEls = [];
const frame = () => new Promise((r) => requestAnimationFrame(r));

// Scrolls the table (never the page) to what plays now: the paragraph or, during a pause, its ⏸ row and the
// paragraph after it. Leaves the scroll alone while that is already in view.
function follow() {
  const el = box.value, g = activeGap.value, p = activePara.value;
  const first = g >= 0 ? (gapEls[g] || rowEls[g])?.$el : rowEls[p]?.$el;
  if (!el || !first) return;
  const last = (g >= 0 && rowEls[g]?.$el) || first;
  const origin = el.getBoundingClientRect().top - el.scrollTop;
  const top = first.getBoundingClientRect().top - origin, bottom = last.getBoundingClientRect().bottom - origin;
  const head = el.querySelector('thead')?.offsetHeight || 0, view = el.clientHeight - head;
  if (top >= el.scrollTop + head && bottom <= el.scrollTop + el.clientHeight) return;
  // Some room above, so the paragraph before shows too and playback doesn't scroll at every paragraph.
  const above = bottom - top < view ? Math.min((view - (bottom - top)) / 2, 64) : 0;
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollTo({ top: Math.max(0, top - head - above), behavior: smooth ? 'smooth' : 'auto' });
}

// After a seek, once the clock has moved there.
watch(() => clock.seeks, async () => { await frame(); await frame(); follow(); });
watch([activePara, activeGap], () => { if (clock.playing) follow(); }, { flush: 'post' });
</script>

<template>
  <div ref="box" class="timeline">
    <table>
      <thead>
        <tr>
          <th>¶</th>
          <th title="Where the paragraph starts in the video. ↑/↓ nudge (⇧ = 1 s), empty = keep the rendered gap after the previous paragraph. The chain button: linked, the paragraphs after it move along; unlinked, it moves on its own.">Start</th>
          <th>Length</th>
          <th>Text</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, i) in rows" :key="i">
          <CueGap v-if="gaps[i]" :ref="(el) => { gapEls[i] = el; }" :gap="gaps[i]" :index="i" :active="i === activeGap" :moving="i > movingFrom" />
          <CueRow :ref="(el) => { rowEls[i] = el; }" :row="row" :index="i" :moving="i >= movingFrom" />
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
