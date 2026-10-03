// Server renders: one at a time, with progress for the busy overlay and a cancel handle.
import { computed, nextTick, ref, shallowReactive, shallowRef, watchEffect } from 'vue';
import { busy, setStatus } from '../state';
import { cancelJob, renderEvents } from '../lib/api';
import { secs } from '../lib/format';

// shallowReactive keeps the AbortController and focused element raw (a proxied abort() throws).
const job = shallowRef(null);
const revealed = ref(false);  // the overlay shows after a short delay, so cached renders don't flash
const now = ref(0);
const cancelledError = () => Object.assign(new Error('Cancelled'), { cancelled: true });

async function callRender(body) {
  const j = job.value;
  try {
    for await (const ev of renderEvents(body, j.controller.signal)) {
      if (ev.type === 'start') j.id = ev.job;
      else if (ev.type === 'progress') { j.progress = ev; j.at = performance.now(); now.value = j.at; }
      else if (ev.type === 'result') { if (j.cancelled) throw cancelledError(); return ev.result; }
      else if (ev.type === 'cancelled') throw cancelledError();
      else if (ev.type === 'error') throw new Error(ev.detail);
    }
    throw new Error('The server stopped responding before the render finished.');
  } catch (e) {
    throw j.cancelled ? cancelledError() : e;
  }
}

function cancelRender() {
  const j = job.value;
  if (!j || j.cancelled) return;
  j.cancelled = true;
  if (j.id) cancelJob(j.id);
  j.controller.abort();  // the UI is free right away; the server stops before its next sentence
}

const busyView = computed(() => {
  const j = job.value;
  if (!j) return null;
  const t = now.value, p = j.progress;
  let detail = 'Preparing…', frac = null, left = '';
  if (p && p.phase === 'waiting') detail = 'Waiting for the previous render to stop…';
  else if (p && p.phase === 'synth') {
    const reused = p.sentences - p.total;
    if (p.done >= p.total) {
      detail = p.total ? 'Writing the audio file…' : `All ${p.sentences} sentences reused from cache. Writing the audio file…`;
      frac = 1;
    } else {
      detail = `Voicing sentence ${p.done + 1} of ${p.total}${reused ? ` · ${reused} reused from cache` : ''}`;
      if (p.rate) {
        const since = (t - j.at) / 1000, current = Math.min(since / p.rate, p.current_chars);
        frac = Math.min(0.99, (p.chars_done + current) / p.chars_total);
        const remaining = (p.chars_total - p.chars_done) * p.rate - since;
        left = remaining < 1 ? 'Almost done' : `About ${secs(remaining)} left`;
      } else left = 'Estimating time left…';
    }
  }
  if (j.cancelled) { detail = 'Cancelling…'; left = ''; }
  return {
    title: j.title, detail, left, frac, cancelled: j.cancelled,
    elapsed: `${secs(Math.max(1, (t - j.started) / 1000))} elapsed`,
  };
});

watchEffect(() => {
  const v = busyView.value;
  document.title = !v ? 'Narrator' : v.frac == null ? `${v.title}… · Narrator` : `${Math.round(v.frac * 100)}% · Narrator`;
});

// While a render runs the app is inert; after a short delay a progress card with Cancel covers it.
function setBusy(on, title) {
  busy.value = on;
  if (on) {
    const started = performance.now();
    now.value = started;
    job.value = shallowReactive({
      id: null, controller: new AbortController(), cancelled: false, started, progress: null, at: 0, title,
      focused: document.activeElement,
      reveal: setTimeout(() => { revealed.value = true; }, 250),
      ticker: setInterval(() => { now.value = performance.now(); }, 200),
    });
    setStatus(`${title}…`, false, true);
  } else if (job.value) {
    const j = job.value;
    clearTimeout(j.reveal);
    clearInterval(j.ticker);
    revealed.value = false;
    job.value = null;
    // Focus comes back once the app is no longer inert, after the next render.
    nextTick(() => {
      if (j.focused && j.focused !== document.body && j.focused.isConnected) j.focused.focus({ preventScroll: true });
    });
  }
}

const api = { busy, busyView, revealed, callRender, cancelRender, setBusy };
export const useRender = () => api;
