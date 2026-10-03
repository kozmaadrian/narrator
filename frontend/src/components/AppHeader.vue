<!-- Brand, the two screen tabs and the help button. (Messages show on each screen: see StatusBar.) -->
<script setup>
import Icon from './ui/Icon.vue';
import { draft, screen } from '../state';
import { useWorkflow } from '../composables/useWorkflow';
import { useHelp } from '../composables/useHelp';

const { show } = useWorkflow();
const { toggleHelp } = useHelp();
</script>

<template>
  <header>
    <div class="brand">
      <span class="logo"><Icon name="mic" /></span>
      <h1>Narrator</h1>
    </div>
    <nav class="tabs">
      <button
        :class="{ active: screen === 'script' }"
        :aria-current="screen === 'script' ? 'page' : null"
        title="The narration text and how it sounds"
        @click="show('script')"
      >
        <span class="step">1</span>Script
      </button>
      <button
        class="sync"
        :class="{ active: screen === 'sync', dirty: !!draft }"
        :aria-current="screen === 'sync' ? 'page' : null"
        :title="`Line the narration up with your recording (generates first if needed)${draft ? '. Timing changes are waiting to be applied.' : ''}`"
        @click="show('sync')"
      >
        <span class="step">2</span>Sync<span v-if="draft" class="sr-only">, timing changes pending</span>
      </button>
    </nav>
    <div class="header-end">
      <button
        class="ghost help-btn"
        title="Shortcuts & how it works (?)"
        aria-label="Shortcuts and how it works"
        aria-haspopup="dialog"
        @click="toggleHelp(true)"
      >
        <Icon name="help" />
      </button>
    </div>
  </header>
</template>

<style scoped>
header { height: 56px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; padding: 0 20px; background: var(--surface); border-bottom: 1px solid var(--border); }
.brand { display: flex; align-items: center; gap: 10px; }
.brand h1 { font-size: 16px; font-weight: 650; letter-spacing: -.01em; margin: 0; }
.tabs { display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--surface-3); }
.tabs button { height: 30px; padding: 0 14px 0 8px; border: none; background: none; box-shadow: none; color: var(--muted); font-weight: 550; }
.tabs button:hover:not(:disabled) { background: none; color: var(--text); }
.tabs button.active, .tabs button.active:hover { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgba(16, 24, 40, .08), 0 0 0 1px var(--border); }
.tabs button.active .step { background: var(--primary); color: #fff; }
.tabs .sync { position: relative; }
.tabs .sync.dirty::after { content: ""; position: absolute; top: 5px; right: 5px; width: 6px; height: 6px; border-radius: 50%; background: var(--pause); box-shadow: 0 0 0 2px var(--surface-3); }
.tabs .sync.dirty.active::after { box-shadow: 0 0 0 2px var(--surface); }
.header-end { justify-self: end; display: flex; align-items: center; }
.help-btn { flex: none; width: 32px; height: 32px; padding: 0; border-radius: 50%; }
.help-btn .i { width: 18px; height: 18px; }
@media (max-width: 560px) {
  header { grid-template-columns: auto 1fr auto; gap: 10px; padding: 0 12px; }
  .tabs { justify-self: center; }
}
</style>
