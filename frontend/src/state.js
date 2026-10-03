// App-wide reactive state. Composables in ./composables build behavior on top of it; components read it
// through them (or directly for plain values).
import { computed, reactive, ref, shallowRef } from 'vue';
import { paragraphs } from './lib/script';
import { pronText } from './lib/pronunciation';

export const config = shallowRef(null);    // GET /api/config
export const last = shallowRef(null);      // the last full render (see lib/timing.js), replaced as a whole
export const script = ref('');
export const draft = shallowRef(null);     // pending Start per paragraph (video time; null = rendered gap) until Apply; replaced as a whole
// The timing changes since the last render, step by step, to go back (or forward again) to any of them:
// { steps: [{ para, how, from, to, what, more, draft }], at: the step the draft is at }. Step 0 is the
// rendered timing (draft null). A new render, a changed paragraph count or Discard clears it. Replaced as a whole.
export const timingHistory = shallowRef(null);
export const screen = ref('script');       // 'script' | 'sync'
export const busy = ref(false);            // a render runs; the app is inert
export const tapIndex = ref(0);            // paragraph that receives the next tap (⌥N)
export const videoLoaded = ref(false);
export const videoDuration = ref(NaN);
export const pauseLen = ref(1);            // seconds for the toolbar's Pause button
// Paragraphs (by their text) that move on their own: changing their Start leaves the paragraphs after them
// in place. Any other paragraph takes the ones after it along. Replaced as a whole.
export const freeParas = shallowRef(new Set((() => {
  try { return JSON.parse(localStorage.getItem('narrator.free') || '[]'); } catch { return []; }
})()));
export const beforeReset = ref(null);      // the script before Reset, while Undo reset is offered
export const settings = reactive({ voice: '', speed: 1, sentence_pause: 0.35, paragraph_pause: 0.8 });
export const pronRules = ref([]);          // Pronunciation list: [{ id, word, say }]

// The last message for the user, shown where it belongs: 'script', 'sync' (the player) or 'cues' (the paragraph
// timing on 2 · Sync). By default, the screen open when it was set.
export const status = reactive({ text: '', error: false, spinning: false, screen: 'script' });
export function setStatus(text, error = false, spinning = false, where = screen.value) {
  Object.assign(status, { text, error, spinning, screen: where });
}
export const clearStatus = () => { status.text = ''; };

export const paras = computed(() => paragraphs(script.value));
export const paraCount = computed(() => paras.value.length);
export const settingsPayload = computed(() => ({
  voice: settings.voice, speed: +settings.speed,
  sentence_pause: +settings.sentence_pause, paragraph_pause: +settings.paragraph_pause,
}));
export const pronunciations = computed(() => pronText(pronRules.value));
// What a render depends on; the last render stores it to tell when it's out of date.
export const renderKey = computed(() => JSON.stringify({ script: script.value, pronunciations: pronunciations.value, ...settingsPayload.value }));
export const stale = computed(() => !!last.value && last.value.key !== renderKey.value);
