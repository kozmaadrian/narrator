// The app's flow: Generate (1 · Script) → Sync, Apply (timing into the script), screens, reset and startup.
import {
  beforeReset, busy, config, draft, last, pronRules, pronunciations, renderKey, screen, script, setStatus,
  settings, settingsPayload, stale, tapIndex,
} from '../state';
import { fetchConfig, fileUrl } from '../lib/api';
import { fmt } from '../lib/format';
import { migrateCues } from '../lib/script';
import { parsePron, pronText } from '../lib/pronunciation';
import { pauseScript } from '../lib/timing';
import { useTimeline } from './useTimeline';
import { useRender } from './useRender';
import { usePlayback } from './usePlayback';
import { useEditor } from './useEditor';
import { usePreview } from './usePreview';

const { refStarts, info } = useTimeline();
const { callRender, setBusy } = useRender();
const { currentTime, videoTime, pausePlayback, loadAudio, startClock } = usePlayback();
const { replaceScript, toStart } = useEditor();
const { stopPreview } = usePreview();

const loadResult = (resumeAt = null) => loadAudio(fileUrl(last.value.name, 'wav', true), resumeAt);

async function generate({
  lead: L = (last.value && last.value.lead) || 0, note = '', title = 'Generating narration',
  cancelNote = 'Generation cancelled. Sentences voiced so far are cached, so the next Generate resumes quickly.',
} = {}) {
  if (busy.value) return false;
  stopPreview();
  pausePlayback();
  setBusy(true, title);
  const key = renderKey.value, text = script.value;
  const started = performance.now();
  try {
    const data = await callRender({ script: text, pronunciations: pronunciations.value, ...settingsPayload.value, preview: false });
    const resumeAt = last.value && currentTime() > 0.05 ? videoTime() : null;  // at the very start, keep any new intro
    last.value = { ...data, key, script: text, lead: L };
    localStorage.setItem('narrator.last', JSON.stringify(last.value));
    loadResult(resumeAt);
    setScreen('sync');
    setStatus(`${note ? `${note} ` : ''}Rendered ${fmt(data.duration)} of audio in ${((performance.now() - started) / 1000).toFixed(1)}s → output/${data.name}.wav`);
    return true;
  } catch (e) {
    if (e.cancelled) setStatus(cancelNote);
    else setStatus(`Error: ${e.message}`, true);
    return false;
  } finally {
    setBusy(false);
  }
}

function setScreen(name) {
  screen.value = name;
  localStorage.setItem('narrator.screen', name);
  if (name === 'sync') stopPreview(); else pausePlayback();
}

// 2 · Sync always shows the current script, so it renders first when the script changed.
function show(name) {
  if (name === screen.value) return;
  if (name === 'sync' && (!last.value || stale.value)) { generate(); return; }
  setScreen(name);
}

// Write the pending Starts into the script as [pause …] values (a negative ¶1 Start becomes the voice
// intro before the video) and render again.
async function applyDraft() {
  if (busy.value) return;
  if (!draft.value) return setStatus('No timing changes to apply.');
  if (!last.value || stale.value) return setStatus('The script or settings changed since the last render. Generate first, then Apply.', true);
  const starts = info.value.map((x) => x.start ?? null);  // the pending schedule; late ones as they play
  const r0 = refStarts.value[0];
  const L = r0 != null && Math.abs(starts[0] - r0) < 0.001 ? last.value.lead || 0 : Math.max(0, -starts[0]);
  const text = pauseScript(script.value, last.value, starts, L);
  if (text == null) return setStatus('Could not write the timing into the script. Generate and try again.', true);
  const before = { text: script.value, draft: draft.value };
  draft.value = null;
  script.value = text;
  const applied = await generate({
    lead: L, note: 'Timing written into the script as [pause …] values.', title: 'Applying timing',
    cancelNote: 'Apply cancelled. The timing changes are still pending.',
  });
  if (!applied) {
    script.value = before.text;
    draft.value = before.draft;
  }
}

// Native ⌘Z can merge the reset with the last typing burst, so the button offers its own undo.
async function resetScript() {
  if (beforeReset.value != null) {
    const text = beforeReset.value;
    beforeReset.value = null;
    replaceScript(0, script.value.length, text);
    return setStatus('Reset undone.');
  }
  let fresh;
  try {
    fresh = await fetchConfig();
  } catch {
    return setStatus('Cannot reach the server.', true);
  }
  config.value = { ...config.value, default_script: fresh.default_script };
  if (script.value === fresh.default_script) return setStatus('The script already matches the original.');
  const previous = script.value;
  draft.value = null;
  replaceScript(0, script.value.length, fresh.default_script);
  beforeReset.value = previous;  // after replaceScript, whose input event clears it
  toStart();
  tapIndex.value = 0;
  setStatus('Script reset to the original. Press Undo reset to get your version back, or ⌘↵ to regenerate.');
}

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

async function init() {
  let cfg;
  try {
    cfg = await fetchConfig();
  } catch {
    return setStatus('Cannot reach the server.', true);
  }
  config.value = cfg;
  const saved = readJSON('narrator.settings') || {};
  settings.voice = cfg.voices.includes(saved.voice) ? saved.voice : cfg.default_voice;
  if (saved.speed) settings.speed = saved.speed;
  if (saved.sentence_pause != null) settings.sentence_pause = saved.sentence_pause;
  if (saved.paragraph_pause != null) settings.paragraph_pause = saved.paragraph_pause;
  pronRules.value = parsePron(localStorage.getItem('narrator.pron') ?? cfg.default_pronunciations);

  const m = migrateCues(localStorage.getItem('narrator.script') ?? cfg.default_script, readJSON('narrator.draft'));
  const pend = m.pend;
  let pending = null;
  if (m.migrated) pending = m.draft;
  else if (pend && pend.script === m.script && Array.isArray(pend.draft)) pending = pend.draft;
  script.value = m.script;

  // The last render comes before the draft, which only lives while it differs from that render.
  let stored = readJSON('narrator.last');
  if (stored) {
    try {
      // Renders from the old text box: compare their rules the way the list writes them.
      const key = JSON.parse(stored.key);
      if (typeof key.pronunciations === 'string') {
        key.pronunciations = pronText(parsePron(key.pronunciations));
        stored = { ...stored, key: JSON.stringify(key) };
      }
    } catch { stored = null; }
  }
  last.value = stored;
  draft.value = pending;
  if (last.value) loadResult();

  setScreen(localStorage.getItem('narrator.screen') === 'sync' && last.value && !stale.value ? 'sync' : 'script');
  setStatus(m.migrated ? 'The script\'s [at …] cues were removed ([at] is no longer supported); their times are pending changes in 2 · Sync. Generate, then Apply.'
    : 'Ready. Write the script and press Generate (⌘↵).');
  startClock();
}

const api = { generate, setScreen, show, applyDraft, resetScript, init };
export const useWorkflow = () => api;
