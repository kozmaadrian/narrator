<!-- One card per paragraph, with the pause before it as a slim connector between. What plays now stays in view. -->
<script setup>
import { ref, watch } from 'vue';
import CueGap from './CueGap.vue';
import CueRow from './CueRow.vue';
import { useCues } from '../../composables/useCues';
import { usePlayback } from '../../composables/usePlayback';

const { rows, gaps, activePara, activeGap, movingFrom, blocked } = useCues();
const { clock } = usePlayback();
const box = ref(null);
const rowEls = [], gapEls = [];
const frame = () => new Promise((r) => requestAnimationFrame(r));

// Scrolls the list (never the page) to what plays now: the paragraph or, during a pause, its ⏸ connector and
// the paragraph after it. Leaves the scroll alone while that is already in view.
function follow() {
  const el = box.value, g = activeGap.value, p = activePara.value;
  const first = g >= 0 ? (gapEls[g] || rowEls[g])?.$el : rowEls[p]?.$el;
  if (!el || !first) return;
  const last = (g >= 0 && rowEls[g]?.$el) || first;
  const origin = el.getBoundingClientRect().top - el.scrollTop;
  const top = first.getBoundingClientRect().top - origin, bottom = last.getBoundingClientRect().bottom - origin;
  const view = el.clientHeight;
  if (top >= el.scrollTop && bottom <= el.scrollTop + view) return;
  // Some room above, so the paragraph before shows too and playback doesn't scroll at every paragraph.
  const above = bottom - top < view ? Math.min((view - (bottom - top)) / 2, 64) : 0;
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollTo({ top: Math.max(0, top - above), behavior: smooth ? 'smooth' : 'auto' });
}

// A move that was blocked: bring its note (between the two paragraphs) into view.
watch(() => blocked.value?.id, () => {
  const el = box.value, note = blocked.value && gapEls[blocked.value.at]?.$el;
  if (!el || !note) return;
  const r = note.getBoundingClientRect(), b = el.getBoundingClientRect();
  if (r.bottom > b.bottom) el.scrollTop += r.bottom - b.bottom + 8;
  else if (r.top < b.top) el.scrollTop -= b.top - r.top + 8;
}, { flush: 'post' });

// After a seek, once the clock has moved there.
watch(() => clock.seeks, async () => { await frame(); await frame(); follow(); });
watch([activePara, activeGap], () => { if (clock.playing) follow(); }, { flush: 'post' });
</script>

<template>
  <div ref="box" class="cards">
    <template v-for="(row, i) in rows" :key="i">
      <CueGap
        v-if="gaps[i] || blocked?.at === i"
        :ref="(el) => { gapEls[i] = el; }"
        :gap="gaps[i]"
        :index="i"
        :active="i === activeGap"
        :moving="i > movingFrom"
        :blocked="blocked?.at === i ? blocked : null"
      />
      <div v-else-if="i" class="joint" :class="{ moving: i > movingFrom }" />
      <CueRow :ref="(el) => { rowEls[i] = el; }" :row="row" :index="i" :moving="i >= movingFrom" />
    </template>
    <p v-if="!rows.length" class="empty">No paragraphs yet.</p>
  </div>
</template>

<style scoped>
.cards { flex: 1; overflow: auto; min-height: 120px; padding: 12px; border-top: 1px solid var(--border); }
.joint { height: 20px; }
.empty { margin: 24px 0; text-align: center; color: var(--muted); }
@media (max-width: 1000px) {
  .cards { max-height: 60vh; }
}
</style>
