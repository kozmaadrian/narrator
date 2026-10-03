<!-- The pause before a paragraph, between its card and the one above: how long it is now, what it was in the
     render if a change resized it, and where the rendered pause comes from (the paragraph pause setting or
     [pause …] lines). -->
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
  const now = g.changed ? `${gapLen(g.now)} now, ${delta.value} (Apply writes it into the script), ` : '';
  return `${where}: ${now}${gapLen(g.rendered)} as rendered, from ${src}.`;
});
</script>

<template>
  <div class="gap" :class="{ changed: gap.changed, playing: active, moving }" :title="title">
    <span class="rail" />
    <span class="pill">
      <Icon name="pause" />
      <template v-if="gap.changed"><s class="old">{{ gapLen(gap.rendered) }}</s><Icon name="arrow" class="to" /></template>
      <b>{{ gapLen(gap.now) }}</b>
    </span>
    <span v-if="gap.changed" class="delta">{{ delta }}</span>
    <span class="spacer" />
    <span v-if="auto" class="src">paragraph pause</span>
    <code v-for="(f, k) in gap.from" :key="k" class="src">{{ f }}</code>
    <span v-if="gap.first" class="src">before the voice starts</span>
  </div>
</template>

<style scoped>
/* The rail runs under the number column, the pill lines up with the Start fields. */
.gap { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 0 13px 0 calc(12px + 1px); font-size: 12px; color: var(--muted); }
.rail { align-self: stretch; flex: none; width: 24px; margin-right: 2px; background: linear-gradient(var(--border-strong) 50%, transparent 0) center / 2px 5px repeat-y; transition: opacity .15s; }
.moving .rail { background-image: linear-gradient(var(--accent) 50%, transparent 0); }
.pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px 0 8px; border-radius: 999px; border: 1px solid var(--pause-line); background: var(--pause-bg); color: var(--pause-ink); font: 12px var(--mono); transition: background .15s, color .15s, border-color .15s; }
.pill .i { width: 10px; height: 10px; stroke-width: 2.5; }
.pill .to { width: 12px; height: 12px; stroke-width: 2; opacity: .7; }
.pill b { font-weight: 650; }
.pill .old { text-decoration-thickness: 1px; opacity: .65; }
.delta { padding: 1px 6px; border-radius: 5px; background: var(--wait-bg); color: var(--wait-ink); font: 600 11.5px var(--mono); }
.src { color: var(--subtle); font-size: 11.5px; }
code.src { padding: 1px 6px; border-radius: 5px; background: var(--surface-3); color: var(--muted); font: 11.5px var(--mono); }
.changed .pill { border-color: var(--wait-line); background: var(--wait-bg); color: var(--wait-ink); }
.playing .pill { border-color: var(--pause); background: var(--pause); color: #fff; }
.changed.playing .pill { border-color: var(--wait); background: var(--wait); }
.playing .rail { background-image: linear-gradient(var(--pause) 50%, transparent 0); }
.changed.playing .rail { background-image: linear-gradient(var(--wait) 50%, transparent 0); }
</style>
