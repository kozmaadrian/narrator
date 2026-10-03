<!-- The pause before a paragraph, between its card and the one above: how long it is now, what it was in the
     render if a change resized it, and where the rendered pause comes from (the paragraph pause setting or
     [pause …] lines). Also where a later Start the paragraph above couldn't take is explained, since this
     paragraph is the one in the way. -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import { gapLen } from '../../lib/format';
import { useCues } from '../../composables/useCues';

const props = defineProps({
  gap: { type: Object, default: null },
  index: { type: Number, required: true },
  active: { type: Boolean, default: false },
  moving: { type: Boolean, default: false },
  blocked: { type: Object, default: null },
});

const { toggleFree, dismissBlocked } = useCues();

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
const linkTitle = computed(() => {
  const p = props.blocked?.para ?? 0;
  return `Link ¶${p + 1}: the paragraphs after it then move along when its Start changes, so it can start later.`;
});
</script>

<template>
  <div class="gap" :class="{ changed: gap?.changed, playing: active, moving, 'is-blocked': blocked }">
    <span class="rail" />
    <div class="body">
      <div v-if="gap" class="line" :title="title">
        <span class="pill">
          <Icon name="pause" />
          <span class="sr-only">{{ gap.first ? 'Silence before the voice starts:' : `Pause before ¶${index + 1}:` }}</span>
          <template v-if="gap.changed"><s class="old">{{ gapLen(gap.rendered) }}</s><span class="sr-only">changed to</span><Icon name="arrow" class="to" /></template>
          <b>{{ gapLen(gap.now) }}</b>
        </span>
        <span v-if="gap.changed" class="delta">{{ delta }}</span>
        <span class="spacer" />
        <span v-if="auto" class="src">paragraph pause</span>
        <code v-for="(f, k) in gap.from" :key="k" class="src">{{ f }}</code>
        <span v-if="gap.first" class="src">before the voice starts</span>
      </div>
      <div v-if="blocked" :key="blocked.id" class="block" role="alert">
        <Icon name="alert" />
        <span class="msg">{{ blocked.text }}</span>
        <button type="button" class="fix" :title="linkTitle" @click="toggleFree(blocked.para)">
          <Icon name="link" />Link ¶{{ blocked.para + 1 }}
        </button>
        <button type="button" class="dismiss" title="Dismiss" aria-label="Dismiss this note" @click="dismissBlocked">
          <Icon name="x" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The rail runs under the number column, the pill lines up with the Start fields. */
.gap { display: flex; gap: 8px; min-height: 54px; padding: 0 13px 0 calc(12px + 1px); font-size: 12px; color: var(--muted); }
.rail { flex: none; width: 24px; margin-right: 2px; background: linear-gradient(var(--border-strong) 50%, transparent 0) center / 2px 5px repeat-y; transition: opacity .15s; }
.moving .rail { background-image: linear-gradient(var(--accent) 50%, transparent 0); }
.body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; padding: 12px 0; }
.line { display: flex; align-items: center; gap: 8px; min-height: 30px; }
.pill { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px 0 8px; border-radius: 999px; border: 1px solid var(--pause-line); background: var(--pause-bg); color: var(--pause-ink); font: 12px var(--mono); transition: background .15s, color .15s, border-color .15s; }
.pill .i { width: 10px; height: 10px; stroke-width: 2.5; }
.pill .to { width: 12px; height: 12px; stroke-width: 2; opacity: .7; }
.pill b { font-weight: 650; }
.pill .old { text-decoration-thickness: 1px; }
.delta { padding: 1px 6px; border-radius: 5px; background: var(--wait-bg); color: var(--wait-ink); font: 600 12px var(--mono); }
.src { color: var(--subtle); font-size: 12px; }
code.src { padding: 1px 6px; border-radius: 5px; background: var(--surface-3); color: var(--muted); font: 12px var(--mono); }
.changed .pill { border-color: var(--wait-line); background: var(--wait-bg); color: var(--wait-ink); }
.playing .pill { border-color: var(--pause-ink); background: var(--pause-ink); color: var(--surface); }
.changed.playing .pill { border-color: var(--wait-ink); background: var(--wait-ink); }
.playing .rail { background-image: linear-gradient(var(--pause) 50%, transparent 0); }
.changed.playing .rail { background-image: linear-gradient(var(--wait) 50%, transparent 0); }

/* A later Start the paragraph above couldn't take: a red stop between the two cards. */
.is-blocked .rail { background-image: linear-gradient(var(--error) 50%, transparent 0); }
.block {
  display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 10px; border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent); background: color-mix(in srgb, var(--error) 7%, var(--surface));
  color: var(--error); font-size: 13px; line-height: 1.4; animation: nudge .32s ease-out;
}
.line + .block { margin-top: 6px; }
.block > .i { flex: none; width: 14px; height: 14px; }
.msg { flex: 1; min-width: 0; font-weight: 550; }
.block button { height: 28px; border: 0; border-radius: 6px; background: transparent; box-shadow: none; color: inherit; font: 600 12px var(--ui-font); }
.block button .i { width: 13px; height: 13px; }
.fix { padding: 0 9px 0 7px; background: color-mix(in srgb, var(--error) 12%, transparent) !important; }
.fix:hover { background: color-mix(in srgb, var(--error) 20%, transparent) !important; }
.dismiss { width: 28px; padding: 0; }
.dismiss:hover { background: color-mix(in srgb, var(--error) 12%, transparent) !important; }
.block button:focus-visible { outline-offset: 0; }
@keyframes nudge {
  0% { opacity: 0; transform: translateX(0); }
  25% { opacity: 1; transform: translateX(-4px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-2px); }
  100% { transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) { .block { animation: none; } }
</style>
