<!-- Brand, the two screen tabs (2 · Sync counts the paragraphs with pending timing changes), the screen's
     actions and the help button. (Messages show on each screen: see StatusBar.) -->
<script setup>
import { computed } from 'vue';
import Icon from './ui/Icon.vue';
import { draft, screen, stale } from '../state';
import { IS_MAC } from '../lib/shortcuts';
import { useWorkflow } from '../composables/useWorkflow';
import { useHelp } from '../composables/useHelp';
import { useCues } from '../composables/useCues';
import { useTimeline } from '../composables/useTimeline';

const { show, generate, applyDraft } = useWorkflow();
const { toggleHelp } = useHelp();
const { discardDraft } = useCues();
const { pending } = useTimeline();

// Paragraphs whose Start differs from the render while changes wait for Apply.
const changed = computed(() => (draft.value ? pending.value.filter(Boolean).length : 0));
const pendingText = computed(() => {
  if (!draft.value) return '';
  if (!changed.value) return 'Timing changes are waiting to be applied';
  return `${changed.value} paragraph${changed.value === 1 ? ' has' : 's have'} timing changes waiting to be applied`;
});

// Generate on 1 · Script; Apply on 2 · Sync while timing changes are pending (Generate there if the script
// changed since the render, since Apply needs a current render). Same as ⌘↵ on each screen.
const action = computed(() => {
  if (screen.value === 'script' || stale.value) return 'generate';
  return draft.value ? 'apply' : '';
});
// Discard next to it on 2 · Sync while timing changes are pending.
const discard = computed(() => screen.value === 'sync' && !!draft.value);
const enter = IS_MAC ? '⌘↵' : 'Ctrl+Enter';
const generateTitle = computed(() => (screen.value === 'script'
  ? `${enter}. Renders the narration and opens 2 · Sync.`
  : `${enter}. The script changed since this render: renders it again.`));
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
        :title="`Line the narration up with your recording (generates first if needed)${draft ? `. ${pendingText}.` : ''}`"
        @click="show('sync')"
      >
        <span class="step">2</span>Sync
        <template v-if="draft">
          <span class="count" :class="{ dot: !changed }" aria-hidden="true">{{ changed || '' }}</span>
          <span class="sr-only">, {{ pendingText.toLowerCase() }}</span>
        </template>
      </button>
    </nav>
    <div class="header-end">
      <button
        v-if="discard" class="discard" aria-label="Discard timing changes"
        title="Forget the pending timing changes and their history" @click="discardDraft()"
      >
        <Icon name="x" /><span class="label">Discard</span>
      </button>
      <button v-if="action === 'generate'" class="primary action" :title="generateTitle" @click="generate()">
        Generate<Icon name="arrow" />
      </button>
      <button
        v-else-if="action === 'apply'" class="primary action" aria-label="Apply timing changes"
        :title="`${enter}. Writes the timing into the script as [pause …] values and renders again.`" @click="applyDraft()"
      >
        Apply
      </button>
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
/* Pending timing changes: an amber count after the label, mirroring the step number before it. */
.tabs .sync.dirty { padding-right: 8px; }
.tabs .count { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; display: grid; place-items: center; font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; background: var(--warn-bg); color: var(--warn); box-shadow: inset 0 0 0 1px var(--warn-line); }
.tabs .count.dot { min-width: 0; width: 8px; height: 8px; padding: 0; background: var(--pause); box-shadow: none; }
.header-end { justify-self: end; display: flex; align-items: center; gap: 10px; }
.discard .i { width: 14px; height: 14px; }
.help-btn { flex: none; width: 32px; height: 32px; padding: 0; border-radius: 50%; }
.help-btn .i { width: 18px; height: 18px; }
/* Narrow: the name and then the logo give way so the tabs and the action keep their room.
   The h1 stays in the accessibility tree. */
@media (max-width: 560px) {
  header { grid-template-columns: auto 1fr auto; gap: 10px; padding: 0 12px; }
  .tabs { justify-self: center; }
  .brand h1 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
@media (max-width: 420px) {
  header { grid-template-columns: auto 1fr; gap: 8px; }
  .brand { position: absolute; }
  .brand .logo { display: none; }
  .tabs { justify-self: start; }
  .tabs button { padding: 0 10px 0 6px; }
  .tabs .sync.dirty { padding-right: 6px; }
  .action .i { display: none; }
  .discard { width: 34px; padding: 0; justify-content: center; }
  .discard .label { display: none; }
}
@media (max-width: 360px) {
  header { gap: 6px; padding: 0 8px; }
  .header-end { gap: 6px; }
  .tabs button { padding: 0 8px 0 4px; gap: 4px; }
  .tabs .sync.dirty { padding-right: 4px; }
  .tabs .count { min-width: 16px; height: 16px; padding: 0 4px; }
  .action { padding: 0 10px; }
}
</style>
