// The script, settings, pronunciation list and pending timing survive a reload (localStorage). The last
// render and the screen are stored where they change (useWorkflow).
import { watch } from 'vue';
import { draft, pronRules, script, settingsPayload } from '../state';
import { pronText } from '../lib/pronunciation';

let started = false;
export function usePersistence() {
  if (started) return;
  started = true;
  watch(script, (v) => localStorage.setItem('narrator.script', v));
  watch(settingsPayload, (v) => localStorage.setItem('narrator.settings', JSON.stringify(v)));
  // Rows still missing how to say it are kept too.
  watch(() => pronText(pronRules.value, true), (v) => localStorage.setItem('narrator.pron', v));
  watch([draft, script], ([d, s]) => localStorage.setItem('narrator.draft', JSON.stringify(d ? { script: s, draft: d } : null)));
}
