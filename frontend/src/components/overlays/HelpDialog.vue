<!-- Help: how Narrator works and its shortcuts, opened from the header (? or ⌘/). -->
<script setup>
import { nextTick, ref, watch } from 'vue';
import Icon from '../ui/Icon.vue';
import ShortcutList from './ShortcutList.vue';
import { screen } from '../../state';
import { SHORTCUTS } from '../../lib/shortcuts';
import { useHelp } from '../../composables/useHelp';

const { helpOpen, toggleHelp } = useHelp();
const dialog = ref(null);
const closeBtn = ref(null);
let returnFocus = null;
let downOutside = false;

const sections = [
  {
    screen: 'script', step: 1, name: 'Script', notesTitle: 'Script syntax',
  },
  {
    screen: 'sync', step: 2, name: 'Sync', notesTitle: 'Good to know',
  },
];

watch(helpOpen, async (open) => {
  const d = dialog.value;
  if (open && !d.open) {
    returnFocus = document.activeElement;
    d.showModal();
    await nextTick();
    closeBtn.value.focus();
  } else if (!open && d.open) d.close();
});

function onClose() {
  helpOpen.value = false;
  if (returnFocus && returnFocus !== document.body && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
}

// A click on the dimmed backdrop (which hits the dialog itself, not its card) closes it.
const onPointerdown = (e) => { downOutside = e.target === dialog.value; };
const onClick = (e) => { if (e.target === dialog.value && downOutside) toggleHelp(false); };
</script>

<template>
  <dialog ref="dialog" class="help-dialog" aria-labelledby="helpTitle" @close="onClose" @pointerdown="onPointerdown" @click="onClick">
    <div class="overlay-card help-card">
      <div class="help-head">
        <span class="logo"><Icon name="keyboard" /></span>
        <div>
          <h2 id="helpTitle">Shortcuts & how it works</h2>
          <p>Everything Narrator does, in three steps.</p>
        </div>
        <button ref="closeBtn" class="ghost close" title="Close (Esc)" aria-label="Close" @click="toggleHelp(false)"><Icon name="x" /></button>
      </div>
      <ol class="flow">
        <li><span class="step">1</span><span><b>Write</b>Type the script, pick the voice, then Generate.</span></li>
        <li><span class="step">2</span><span><b>Sync</b>Add your recording and set when each paragraph starts.</span></li>
        <li><span class="step">3</span><span><b>Apply</b>Writes the timing into the script as pause lines and renders again.</span></li>
      </ol>
      <div class="help-cols">
        <section v-for="s in sections" :key="s.screen" class="help-sec" :class="{ current: screen === s.screen }">
          <h3><span class="step">{{ s.step }}</span>{{ s.name }}<span class="here">You're here</span></h3>
          <ShortcutList :items="SHORTCUTS[s.screen]" />
          <h4>{{ s.notesTitle }}</h4>
          <ul v-if="s.screen === 'script'" class="notes">
            <li><code>[pause 2s]</code> <code>[500ms]</code> <code>[1.5]</code> adds silence. It replaces the automatic pause at that spot; <code>[pause 0s]</code> means none. Before the first sentence, it delays the voice.</li>
            <li>A blank line starts a new paragraph.</li>
            <li><code># note</code> lines are not read out.</li>
            <li>Pronunciation: select a word, press Add, and spell it the way it should sound.</li>
          </ul>
          <ul v-else class="notes">
            <li>Click a row to jump there and tap from it, or pause and press the row's timer button.</li>
            <li>The ⏸ row between two paragraphs is the pause before the next one. Green means your change resizes it: the new length, the difference, and what it was.</li>
            <li>The chain button next to a Start links the paragraph to the ones after it: changing its Start moves them all along, and the rows that will move are tinted while you edit. Click it to unlink, so the paragraph moves on its own and only the pauses around it change.</li>
            <li>An empty Start keeps the rendered gap after the paragraph before. The reset button puts back the rendered Start.</li>
            <li>A negative Start on ¶1 starts the voice before the video.</li>
            <li>Changes play live, with or without a video. A paragraph is never cut off: if the one before is still speaking, it waits for it.</li>
          </ul>
        </section>
      </div>
      <div class="help-foot">
        <h4>Anywhere</h4>
        <ShortcutList :items="SHORTCUTS.general" />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.help-dialog { width: min(820px, calc(100vw - 32px)); max-width: none; max-height: calc(100vh - 48px); padding: 0; border: none; background: none; color: var(--text); overflow: visible; }
.help-dialog::backdrop { background: rgba(17, 24, 39, .32); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); animation: fade .18s ease-out; }
.help-card.overlay-card { width: 100%; max-height: calc(100vh - 48px); overflow: auto; gap: 20px; padding: 22px 24px; }
.help-card code { font: 11.5px var(--mono); padding: 1px 5px; border-radius: 5px; background: var(--surface-3); color: var(--text); }
.help-head { display: flex; align-items: center; gap: 14px; }
.help-head .logo { width: 40px; height: 40px; border-radius: 12px; }
.help-head .logo .i { width: 20px; height: 20px; }
.help-head h2 { font-size: 16px; font-weight: 650; letter-spacing: -.01em; }
.help-head p { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.help-head .close { margin-left: auto; align-self: flex-start; width: 32px; height: 32px; padding: 0; }
.flow { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.flow li { display: flex; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-2); color: var(--muted); font-size: 12.5px; line-height: 1.45; }
.flow li b { display: block; margin-bottom: 1px; color: var(--text); font-size: 13px; font-weight: 600; }
.flow .step { flex: none; margin-top: 1px; background: var(--primary); color: #fff; }
.help-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
.help-sec h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 13.5px; font-weight: 650; }
.help-sec.current h3 .step { background: var(--primary); color: #fff; }
.help-sec .here { display: none; margin-left: auto; padding: 1px 8px; border-radius: 999px; background: var(--accent-weak); color: var(--accent); font-size: 11px; font-weight: 600; }
.help-sec.current .here { display: inline-block; }
.help-sec h4, .help-foot h4 { margin: 18px 0 8px; font-size: 11px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; color: var(--subtle); }
.notes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; color: var(--muted); font-size: 12.5px; line-height: 1.5; }
.notes li { position: relative; padding-left: 14px; }
.notes li::before { content: ""; position: absolute; left: 3px; top: .62em; width: 4px; height: 4px; border-radius: 50%; background: var(--subtle); }
.help-foot { padding-top: 2px; border-top: 1px solid var(--border); }
.help-foot h4 { margin-top: 14px; }
.help-foot :deep(.keys) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 28px; }
.help-foot :deep(.keys li) { border-bottom: none; }
@media (max-width: 720px) {
  .flow, .help-cols, .help-foot :deep(.keys) { grid-template-columns: 1fr; }
}
@media (prefers-color-scheme: dark) { .help-dialog::backdrop { background: rgba(0, 0, 0, .5); } }
@media (prefers-reduced-motion: reduce) { .help-dialog::backdrop { animation: none; } }
</style>
