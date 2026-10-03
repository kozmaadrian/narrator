// Short renders that only play: the paragraph at the cursor, or one pronunciation rule.
import { shallowRef } from 'vue';
import { busy, pronunciations, setStatus, settingsPayload } from '../state';
import { fileUrl } from '../lib/api';
import { fmt } from '../lib/format';
import { useRender } from './useRender';
import { usePlayback } from './usePlayback';
import { useEditor } from './useEditor';

const { callRender, setBusy } = useRender();
const { pausePlayback } = usePlayback();
const { previewText } = useEditor();

const previewAudio = shallowRef(null);
let wordAudio = null;

function stopPreview() {
  if (!previewAudio.value) return;
  previewAudio.value.pause();
  previewAudio.value = null;
}

async function preview() {
  if (previewAudio.value) return stopPreview();
  if (busy.value) return;
  const text = previewText();
  if (!text.trim()) return;
  pausePlayback();
  setBusy(true, 'Rendering preview');
  try {
    const data = await callRender({ script: text, pronunciations: pronunciations.value, ...settingsPayload.value, preview: true });
    const player = new Audio(fileUrl(data.name, 'wav', true));
    player.addEventListener('ended', stopPreview);
    previewAudio.value = player;
    await player.play();
    setStatus(`Previewing ${fmt(data.duration)}`);
  } catch (e) {
    stopPreview();
    if (e.cancelled) setStatus('Preview cancelled.');
    else setStatus(`Error: ${e.message}`, true);
  } finally {
    setBusy(false);
  }
}

async function hearRule(rule) {
  const text = rule.say.trim() || rule.word.trim();
  if (busy.value || !text) return;
  stopPreview();
  pausePlayback();
  if (wordAudio) wordAudio.pause();
  setBusy(true, 'Rendering word');
  try {
    const data = await callRender({ script: text, pronunciations: '', ...settingsPayload.value, preview: true });
    wordAudio = new Audio(fileUrl(data.name, 'wav', true));
    await wordAudio.play();
    setStatus(rule.say.trim() ? `“${rule.word.trim() || text}” will sound like this.` : `This is how the voice says “${text}” now.`);
  } catch (e) {
    if (e.cancelled) setStatus('Cancelled.');
    else setStatus(`Error: ${e.message}`, true);
  } finally {
    setBusy(false);
  }
}

const api = { previewAudio, preview, stopPreview, hearRule };
export const usePreview = () => api;
