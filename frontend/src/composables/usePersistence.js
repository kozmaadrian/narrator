// The script, settings, pronunciation list, pending timing and unlinked paragraphs survive a reload (localStorage).
// The last render and the screen are stored where they change (useWorkflow).
import { watch } from 'vue';
import { draft, freeParas, paras, pronRules, script, settingsPayload } from '../state';
import { pronText } from '../lib/pronunciation';

let started = false;
export function usePersistence() {
  if (started) return;
  started = true;
  watch(script, (v) => localStorage.setItem('narrator.script', v));
  watch(settingsPayload, (v) => localStorage.setItem('narrator.settings', JSON.stringify(v)));
  // Rows still missing how to say it are kept too.
  watch(() => pronText(pronRules.value, true), (v) => localStorage.setItem('narrator.pron', v));
  // Only the paragraphs still in the script.
  watch([freeParas, paras], ([f, ps]) => localStorage.setItem('narrator.free', JSON.stringify(ps.map((p) => p.snippet).filter((s) => f.has(s)))));
  watch([draft, script], ([d, s]) => localStorage.setItem('narrator.draft', JSON.stringify(d ? { script: s, draft: d } : null)));
}
