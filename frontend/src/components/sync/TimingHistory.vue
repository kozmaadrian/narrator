<!-- The timing changes since the last render, step by step. A step goes back (or forward again) to it. -->
<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import Icon from '../ui/Icon.vue';
import { fmt } from '../../lib/format';
import { IS_MAC } from '../../lib/shortcuts';
import { useCues } from '../../composables/useCues';

const { history, stepNote, goToStep, draftSummary } = useCues();
const h = computed(() => (history.value?.steps.length > 1 ? history.value : null));
const keys = IS_MAC ? '⌘Z back · ⇧⌘Z forward' : 'Ctrl+Z back · Ctrl+Shift+Z forward';
const state = (k) => (k < h.value.at ? 'done' : k === h.value.at ? 'current' : 'undone');

// Keep the current step in view inside the list (not the page: the video stays where it is).
const list = ref(null);
watch(() => h.value && [h.value.at, h.value.steps.length], async () => {
  await nextTick();
  const box = list.value, el = box?.querySelector('[aria-current]');
  if (!el) return;
  if (el.offsetTop < box.scrollTop) box.scrollTop = el.offsetTop;
  else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight;
}, { immediate: true });
</script>

<template>
  <section v-if="h" class="history" aria-labelledby="history-title">
    <div class="head">
      <h2 id="history-title">Timing history</h2>
      <span class="sum">{{ draftSummary }}</span>
      <span class="spacer" />
      <span class="keys">{{ keys }}</span>
    </div>
    <ol ref="list" class="steps">
      <li v-for="(s, k) in h.steps" :key="k" :class="state(k)" :aria-current="k === h.at ? 'step' : undefined">
        <component
          :is="k === h.at ? 'div' : 'button'" class="hstep"
          v-bind="k === h.at ? {} : { type: 'button', title: k < h.at ? 'Go back to this step' : 'Redo up to this step', onClick: () => goToStep(k) }"
        >
          <span class="mark">
            <Icon v-if="s.how === 'origin'" name="wave" />
            <template v-else><span class="sr-only">Step</span>{{ k }}</template>
          </span>
          <span class="body">
            <template v-if="s.how === 'origin'"><b>As rendered</b><span class="what">the last render's timing</span></template>
            <template v-else-if="s.how === 'earlier'"><b>Earlier changes</b><span class="what">{{ s.what }}</span></template>
            <template v-else>
              <b>¶{{ s.para + 1 }}</b>
              <span class="times">{{ fmt(s.from) }}<span class="sr-only"> to </span><Icon name="arrow" /><b>{{ fmt(s.to) }}</b></span>
              <span class="what">{{ s.what }}<template v-if="s.more"> · {{ s.more }}</template></span>
            </template>
            <span v-if="k > h.at" class="sr-only">(undone)</span>
          </span>
          <span class="act">{{ k === h.at ? 'Now' : k < h.at ? 'Go back' : 'Redo' }}</span>
        </component>
      </li>
    </ol>
    <p class="sr-only" role="status">{{ stepNote }}</p>
  </section>
</template>

<style scoped>
/* Takes the room left under the video and scrolls inside it, so the video and downloads stay put. */
.history { flex: 0 1 auto; display: flex; flex-direction: column; min-height: 0; }
/* A long list never shrinks below about three steps (a short one simply keeps its height). */
.history:has(li:nth-child(4)) { min-height: 160px; }
.head { flex: none; display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; padding: 0 0 8px; }
h2 { margin: 0; font-size: 14px; font-weight: 650; }
.sum, .keys { color: var(--muted); font-size: 12px; }
.steps { position: relative; flex: 0 1 auto; min-height: 0; margin: 0; padding: 4px 0; overflow-y: auto; overscroll-behavior: contain; list-style: none; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
@media (max-width: 1000px) { .history:has(li:nth-child(4)) { min-height: 0; } .steps { max-height: 300px; } }
.steps li { position: relative; }
/* The rail through the step marks: solid up to the current step, dashed after it. */
.steps li::before { content: ""; position: absolute; left: 18px; top: 0; bottom: 0; width: 2px; background: var(--accent-line); }
.steps li:first-child::before { top: 50%; }
.steps li:last-child::before { bottom: 50%; }
.steps li.current::before { bottom: 50%; }
.steps li.current:first-child::before { display: none; }
.steps li.undone::before { background: linear-gradient(var(--border-strong) 50%, transparent 0) 0 0 / 2px 5px repeat-y; }
.hstep { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; height: auto; min-height: 38px; padding: 6px 8px; border: 0; border-radius: 0; background: none; box-shadow: none; color: var(--text); font-weight: 400; text-align: left; white-space: normal; justify-content: stretch; }
button.hstep:hover:not(:disabled) { background: var(--surface-2); }
button.hstep:focus-visible { outline-offset: -2px; }
.current .hstep { background: var(--accent-weak); }
.mark { position: relative; z-index: 1; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--accent-line); background: linear-gradient(var(--accent-weak), var(--accent-weak)) var(--surface); color: var(--accent); font: 650 11px var(--mono); }
.mark .i { width: 12px; height: 12px; }
.current .mark { border-color: var(--primary); background: var(--primary); color: var(--primary-text); }
.undone .mark { border-style: dashed; border-color: var(--border-strong); background: var(--surface); color: var(--subtle); }
.body { display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 8px; min-width: 0; font-size: 13px; }
.body > b { font-weight: 650; }
.times { display: inline-flex; align-items: center; gap: 4px; font: 12px var(--mono); }
.times .i { width: 11px; height: 11px; opacity: .7; }
.times b { font-weight: 650; }
.what { color: var(--muted); font-size: 12px; }
.undone .body, .undone .what { color: var(--subtle); }
.undone .body > b, .undone .times { text-decoration: line-through; text-decoration-thickness: 1px; }
.act { color: var(--accent); font-size: 12px; font-weight: 600; opacity: 0; transition: opacity .12s; }
.current .act, button.hstep:hover .act, button.hstep:focus-visible .act { opacity: 1; }
</style>
