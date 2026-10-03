<!-- The pause before a paragraph, between its row and the one above: how long it is now, how it changed from
     the render, and where the rendered pause comes from (the paragraph pause setting or [pause …] lines). -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import { gapLen } from '../../lib/format';

const props = defineProps({
  gap: { type: Object, required: true },
  index: { type: Number, required: true },
  active: { type: Boolean, default: false },
  moving: { type: Boolean, default: false },
});

const delta = computed(() => {
  const d = Math.round((props.gap.now - props.gap.rendered) * 100) / 100;
  return `${d > 0 ? '+' : '−'}${gapLen(Math.abs(d))}`;
});
const auto = computed(() => !props.gap.from.length && !props.gap.first);
const title = computed(() => {
  const g = props.gap, where = g.first ? `Silence before ¶1's voice starts` : `Pause between ¶${props.index} and ¶${props.index + 1}`;
  const src = g.from.length ? g.from.join(' + ') : g.first ? 'no pause' : 'the Paragraph pause setting';
  const now = g.changed ? `${gapLen(g.now)} now (Apply writes it into the script), ` : '';
  return `${where}: ${now}${gapLen(g.rendered)} as rendered, from ${src}.`;
});
</script>

<template>
  <tr class="gap" :class="{ changed: gap.changed, playing: active, moving }" :title="title">
    <td class="n"><span class="rail" /></td>
    <td colspan="3">
      <div class="line">
        <span class="pill"><Icon name="pause" />{{ gapLen(gap.now) }}</span>
        <template v-if="gap.changed">
          <span class="delta">{{ delta }}</span>
          <span class="was">was {{ gapLen(gap.rendered) }}</span>
        </template>
        <span v-if="auto" class="src">paragraph pause</span>
        <code v-for="(f, k) in gap.from" :key="k" class="src">{{ f }}</code>
        <span v-if="gap.first" class="src">before the voice starts</span>
      </div>
    </td>
  </tr>
</template>

<style scoped>
td { padding: 4px 10px; border-bottom: 1px solid var(--border); background: var(--surface-2); transition: background .15s; }
td.n { width: 1%; padding-left: 16px; }
.rail { display: block; width: 0; height: 16px; margin-left: 10px; border-left: 2px dotted var(--border-strong); }
.line { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; min-height: 22px; font-size: 12px; color: var(--muted); }
.pill { display: inline-flex; align-items: center; gap: 6px; min-width: 78px; height: 22px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--pause-line); background: var(--pause-bg); color: var(--pause-ink); font: 600 12px var(--mono); transition: background .15s, color .15s; }
.pill .i { width: 11px; height: 11px; stroke-width: 2.5; }
.delta { color: var(--wait-ink); font: 600 12px var(--mono); }
.was { text-decoration: line-through; text-decoration-color: var(--subtle); font-variant-numeric: tabular-nums; }
code.src { padding: 1px 6px; border-radius: 5px; background: var(--surface-3); color: var(--muted); font: 11.5px var(--mono); }
tr.changed .pill { border-color: var(--wait-line); background: var(--wait-bg); color: var(--wait-ink); }
tr.moving td { background: color-mix(in srgb, var(--accent-weak) 70%, var(--surface)); }
tr.moving td.n { box-shadow: inset 3px 0 0 var(--accent-line); }
tr.playing td { background: var(--pause-bg); }
tr.playing .pill { border-color: var(--pause); background: var(--pause); color: #fff; }
tr.changed.playing td { background: var(--wait-bg); }
tr.changed.playing .pill { border-color: var(--wait); background: var(--wait); color: #fff; }
</style>
