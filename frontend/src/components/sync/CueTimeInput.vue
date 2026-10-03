<!-- A paragraph's Start: m:ss.s or seconds, ↑/↓ nudges (⇧ = 1 s), empty keeps the rendered gap. -->
<script setup>
import { computed, nextTick, ref } from 'vue';
import { fmt, parseTime } from '../../lib/format';
import { useCues } from '../../composables/useCues';

const props = defineProps({
  index: { type: Number, required: true },
  value: { type: Number, default: null },
  est: { type: Number, default: null },
  pending: { type: Boolean, default: false },
  error: { type: String, default: '' },  // shown by the card, under its text
});
const emit = defineEmits(['focus', 'blur', 'error']);
const { setCue, nudgeCue, clearCue } = useCues();
const el = ref(null);

const shown = computed(() => (props.value != null ? fmt(props.value) : ''));
const placeholder = computed(() => (props.est != null ? `~${fmt(props.est)}` : '—'));
const title = computed(() => `Video time (m:ss.s).${props.index === 0 ? ' Negative = voice starts before the video.' : ''}`
  + ' ↑/↓ nudge (⇧ = 1 s), empty = keep the rendered gap after the previous paragraph.');

// The shown value can stay the same while the typed text differs (e.g. "5" for 0:05.0): write it back.
const refresh = () => nextTick(() => { if (el.value) el.value.value = shown.value; });

function onKeydown(e) {
  if (e.key === 'Enter') { el.value.blur(); return; }
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  const step = e.shiftKey ? 1 : 0.1;
  emit('error', '');
  nudgeCue(props.index, e.key === 'ArrowUp' ? step : -step, props.est);
  nextTick(() => { el.value.value = shown.value; el.value.select(); });
}

function onChange() {
  const raw = el.value.value.trim(), t = raw ? parseTime(raw) : null;
  if (raw && t == null) emit('error', `Can't read "${raw}" as a time. Use m:ss.s (like 1:05.5) or seconds.`);
  else {
    emit('error', '');
    if (raw) setCue(props.index, t, false);
    else clearCue(props.index);
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
    :aria-label="`¶${index + 1} Start`"
    :aria-invalid="error ? 'true' : null"
    :aria-describedby="error ? `start-err-${index}` : null"
    @keydown="onKeydown"
    @change="onChange"
    @focus="emit('focus')"
    @blur="emit('blur')"
  >
</template>

<style scoped>
input.time:not([type=checkbox]) { width: 78px; height: 30px; padding: 0 8px; font: 13px var(--mono); }
input.time.pending { border-color: var(--accent); background: var(--accent-weak); color: var(--accent); }
input.time[aria-invalid=true] { border-color: var(--error); }
</style>
