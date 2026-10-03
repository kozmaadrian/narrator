<!-- A paragraph's Start: m:ss.s or seconds, ↑/↓ nudges (⇧ = 1 s), empty keeps the rendered gap. -->
<script setup>
import { computed, nextTick, ref } from 'vue';
import { setStatus } from '../../state';
import { fmt, parseTime } from '../../lib/format';
import { useCues } from '../../composables/useCues';

const props = defineProps({
  index: { type: Number, required: true },
  value: { type: Number, default: null },
  est: { type: Number, default: null },
  pending: { type: Boolean, default: false },
});
const { setCue, nudgeCue, clearCue } = useCues();
const el = ref(null);

const shown = computed(() => (props.value != null ? fmt(props.value) : ''));
const placeholder = computed(() => (props.est != null ? `~${fmt(props.est)}` : '—'));
const title = computed(() => `Video time (m:ss.s).${props.index === 0 ? ' Negative = voice starts before the video.' : ''}`
  + ` ↑/↓ nudge (⇧ = 1 s), empty = keep the rendered gap after the previous paragraph.${props.pending ? ' Changed: Apply writes it into the script.' : ''}`);

// The shown value can stay the same while the typed text differs (e.g. "5" for 0:05.0): write it back.
const refresh = () => nextTick(() => { if (el.value) el.value.value = shown.value; });

function onKeydown(e) {
  if (e.key === 'Enter') { el.value.blur(); return; }
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  const step = e.shiftKey ? 1 : 0.1;
  nudgeCue(props.index, e.key === 'ArrowUp' ? step : -step, props.est);
  nextTick(() => { el.value.value = shown.value; el.value.select(); });
}

function onChange() {
  const raw = el.value.value.trim();
  if (!raw) clearCue(props.index);
  else {
    const t = parseTime(raw);
    if (t == null) setStatus(`Can't read "${raw}". Use m:ss.s or seconds.`, true);
    else setCue(props.index, t, false);
  }
  refresh();
}
</script>

<template>
  <input
    ref="el"
    class="time"
    :class="{ pending }"
    :value="shown"
    :placeholder="placeholder"
    :title="title"
    @keydown="onKeydown"
    @change="onChange"
  >
</template>

<style scoped>
input.time:not([type=checkbox]) { width: 78px; height: 30px; padding: 0 8px; font: 12.5px var(--mono); }
input.time.pending { border-color: var(--accent); background: var(--accent-weak); color: var(--accent); }
</style>
