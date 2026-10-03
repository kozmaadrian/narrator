<!-- What a Start change does to the paragraphs after it: move them along, or keep them in place. -->
<script setup>
import { moveMode, setStatus } from '../../state';

const OPTIONS = [
  { value: 'move', label: 'Move along', title: 'Changing a Start moves every paragraph after it by the same amount. The pauses between them stay as they are.' },
  { value: 'stay', label: 'Stay in place', title: 'Changing a Start keeps the paragraphs after it where they are. Only the pauses before and after the changed paragraph get longer or shorter.' },
];

function choose(value) {
  if (moveMode.value === value) return;
  moveMode.value = value;
  setStatus(value === 'stay'
    ? 'Later paragraphs stay in place: a Start change only resizes the pauses around that paragraph.'
    : 'Later paragraphs move along: a Start change shifts every paragraph after it by the same amount.');
}

function onKey(e) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const k = OPTIONS.findIndex((o) => o.value === moveMode.value), next = OPTIONS[(k + 1) % OPTIONS.length];
  choose(next.value);
  e.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus();
}
</script>

<template>
  <div class="move-mode">
    <span id="move-mode-label" class="label">Later paragraphs</span>
    <div class="seg" role="radiogroup" aria-labelledby="move-mode-label" @keydown="onKey">
      <button
        v-for="o in OPTIONS"
        :key="o.value"
        type="button"
        role="radio"
        :data-value="o.value"
        :aria-checked="moveMode === o.value"
        :tabindex="moveMode === o.value ? 0 : -1"
        :class="{ on: moveMode === o.value }"
        :title="o.title"
        @click="choose(o.value)"
      >{{ o.label }}</button>
    </div>
  </div>
</template>

<style scoped>
.move-mode { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; }
.label { color: var(--muted); font-size: 12px; white-space: nowrap; }
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--surface-3); }
.seg button { height: 24px; padding: 0 10px; border: none; border-radius: 6px; background: none; box-shadow: none; color: var(--muted); font-size: 12px; font-weight: 550; white-space: nowrap; }
.seg button:hover:not(.on) { background: none; color: var(--text); }
.seg button.on, .seg button.on:hover { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgba(16, 24, 40, .08), 0 0 0 1px var(--border); }
.seg button:focus-visible { box-shadow: 0 0 0 3px var(--ring); }
</style>
