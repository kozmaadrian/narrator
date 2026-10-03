<!-- Shortcut rows: a label and its key combos, with this platform's key names. -->
<script setup>
import { comboKeys } from '../../lib/shortcuts';

defineProps({ items: { type: Array, required: true } });
</script>

<template>
  <ul class="keys">
    <li v-for="[label, combos] in items" :key="label">
      <span>{{ label }}</span>
      <span class="keys-alt">
        <template v-for="(combo, i) in combos" :key="combo">
          <span v-if="i" class="or">/</span>
          <span class="keycombo">
            <kbd v-for="k in comboKeys(combo)" :key="k.name" :class="{ sym: k.sym }">{{ k.name }}</kbd>
          </span>
        </template>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.keys { list-style: none; margin: 0; padding: 0; }
.keys li { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 38px; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.keys li:last-child { border-bottom: none; }
.keys-alt { flex: none; display: inline-flex; align-items: center; gap: 6px; }
.keycombo { display: inline-flex; gap: 3px; }
kbd { display: inline-grid; place-items: center; min-width: 24px; height: 24px; padding: 0 6px; font: 500 12px/1 -apple-system, BlinkMacSystemFont, Inter, "Segoe UI", Roboto, sans-serif; }
kbd.sym { font-size: 14px; }
.or { color: var(--subtle); font-size: 12px; }
</style>
