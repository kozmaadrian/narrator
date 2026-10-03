// The script textarea: its selection, and edits made through the editing stack so ⌘Z undoes them.
import { computed, reactive, shallowRef } from 'vue';
import { beforeReset, draft, pauseLen, script, setStatus } from '../state';
import { paragraphs, previewText as textAround } from '../lib/script';
import { selectedWord as wordIn } from '../lib/pronunciation';

const textarea = shallowRef(null);
const selection = reactive({ start: 0, end: 0 });

function readSelection() {
  const el = textarea.value;
  if (el) Object.assign(selection, { start: el.selectionStart, end: el.selectionEnd });
}

// Every change to the textarea's text comes through here (typing, or the edits below).
function onInput() {
  const text = textarea.value.value;
  if (draft.value && paragraphs(text).length !== draft.value.length) {
    draft.value = null;
    setStatus('Pending timing changes were dropped because the paragraphs changed.', true);
  }
  script.value = text;
  beforeReset.value = null;
  readSelection();
}

// The selection, if it looks like a word or short phrase to add to the pronunciation list.
const selectedWord = computed(() => wordIn(script.value, selection.start, selection.end));

function insertAtCursor(snippet) {
  const el = textarea.value;
  el.focus();
  const s = el.selectionStart, e = el.selectionEnd, v = el.value;
  let text = snippet;
  if (s > 0 && !/\s/.test(v[s - 1])) text = ` ${text}`;
  if (e < v.length && !/\s/.test(v[e])) text = `${text} `;
  let inserted = false;
  try { inserted = document.execCommand('insertText', false, text); } catch { inserted = false; }
  if (!inserted) { el.setRangeText(text, s, e, 'end'); onInput(); }
}

const insertPause = () => insertAtCursor(`[pause ${+pauseLen.value || 1}s]`);

// Replace a range of the script through the editing stack so ⌘Z in the script undoes it.
function replaceScript(start, end, text) {
  const el = textarea.value;
  const prevFocus = document.activeElement;
  const top = el.scrollTop, selS = el.selectionStart, selE = el.selectionEnd;
  el.focus({ preventScroll: true });
  el.setSelectionRange(start, end);
  let ok = false;
  try { ok = document.execCommand('insertText', false, text); } catch { ok = false; }
  if (!ok) { el.setRangeText(text, start, end, 'end'); onInput(); }
  const delta = text.length - (end - start);
  const adj = (x) => (x >= end ? x + delta : x <= start ? x : start + text.length);
  el.setSelectionRange(adj(selS), adj(selE));
  el.scrollTop = top;
  if (prevFocus && prevFocus !== el && prevFocus.isConnected) prevFocus.focus({ preventScroll: true });
  else if (prevFocus !== el) el.blur();
  readSelection();
}

// Puts the cursor at the top of the script.
function toStart() {
  const el = textarea.value;
  el.setSelectionRange(0, 0);
  el.scrollTop = 0;
  readSelection();
}

// What Preview plays: the selection, or else the paragraph around the cursor.
const previewText = () => {
  const el = textarea.value;
  return textAround(el.value, el.selectionStart, el.selectionEnd);
};

document.addEventListener('selectionchange', readSelection);

const api = { textarea, selection, selectedWord, readSelection, onInput, insertAtCursor, insertPause, replaceScript, toStart, previewText };
export const useEditor = () => api;
