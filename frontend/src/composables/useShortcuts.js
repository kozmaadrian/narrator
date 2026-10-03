// Keyboard shortcuts (listed in the help sheet, lib/shortcuts.js) and the guards while a render runs.
import { busy, screen } from '../state';
import { typingIn } from '../lib/shortcuts';
import { useRender } from './useRender';
import { usePlayback } from './usePlayback';
import { useEditor } from './useEditor';
import { usePreview } from './usePreview';
import { useCues } from './useCues';
import { useWorkflow } from './useWorkflow';
import { useHelp } from './useHelp';
import { useSubtitles } from './useSubtitles';

const { cancelRender } = useRender();
const { togglePlay, seekTo, currentTime } = usePlayback();
const { insertPause } = useEditor();
const { preview } = usePreview();
const { tapNext } = useCues();
const { generate, applyDraft } = useWorkflow();
const { helpOpen, toggleHelp } = useHelp();
const { toggleSubtitles } = useSubtitles();

function onKeydown(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (busy.value) {
    if (e.key === 'Escape') cancelRender();
    if (e.key === 'Escape' || mod || e.altKey) e.preventDefault();  // no shortcuts until the render ends
    return;
  }
  const helpKey = (mod && !e.altKey && (e.code === 'Slash' || e.key === '/'))
    || (e.key === '?' && !mod && !e.altKey && !typingIn(e.target));
  if (helpOpen.value) {
    if (helpKey) { e.preventDefault(); toggleHelp(false); }
    return;  // the app's shortcuts wait until the help is closed (Esc closes it natively)
  }
  if (helpKey) { e.preventDefault(); toggleHelp(true); return; }
  const sync = screen.value === 'sync';
  if (mod && e.key === 'Enter') {
    e.preventDefault();
    if (sync) applyDraft();
    else if (e.shiftKey) preview();
    else generate();
    return;
  }
  if (!e.altKey || mod) return;
  const actions = sync ? {
    Space: togglePlay, KeyN: tapNext, KeyC: toggleSubtitles,
    KeyJ: () => seekTo(currentTime() - 2), KeyL: () => seekTo(currentTime() + 2),
  } : { KeyP: insertPause };
  if (actions[e.code]) { e.preventDefault(); actions[e.code](); }
}

// While busy, a file dropped anywhere must not make the browser navigate to it.
const blockDrop = (e) => { if (busy.value) e.preventDefault(); };

let installed = false;
export function useShortcuts() {
  if (installed) return;
  installed = true;
  document.addEventListener('keydown', onKeydown);
  for (const type of ['dragover', 'drop']) document.addEventListener(type, blockDrop);
}
