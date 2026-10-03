// App-wide reactive state. Composables in ./composables build behavior on top of it; components read it
// through them (or directly for plain values).
import { computed, reactive, ref, shallowRef } from 'vue';
import { paragraphs } from './lib/script';
import { pronText } from './lib/pronunciation';

export const config = shallowRef(null);    // GET /api/config
export const last = shallowRef(null);      // the last full render (see lib/timing.js), replaced as a whole
export const script = ref('');
export const draft = shallowRef(null);     // pending Start per paragraph (video time; null = rendered gap) until Apply; replaced as a whole
export const screen = ref('script');       // 'script' | 'sync'
export const busy = ref(false);            // a render runs; the app is inert
export const tapIndex = ref(0);            // paragraph that receives the next tap (⌥N)
export const videoLoaded = ref(false);
export const videoDuration = ref(NaN);
export const pauseLen = ref(1);            // seconds for the toolbar's Pause button
export const beforeReset = ref(null);      // the script before Reset, while Undo reset is offered
export const settings = reactive({ voice: '', speed: 1, sentence_pause: 0.35, paragraph_pause: 0.8 });
export const pronRules = ref([]);          // Pronunciation list: [{ id, word, say }]

export const status = reactive({ text: 'Loading…', error: false, spinning: false });
export function setStatus(text, error = false, spinning = false) {
  Object.assign(status, { text, error, spinning });
}

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
