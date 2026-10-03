// Keyboard shortcuts as shown in the help sheet, with this platform's key names.
export const IS_MAC = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);

const KEY_NAMES = IS_MAC ? { mod: '⌘', alt: '⌥', shift: '⇧', enter: '↵', space: 'Space', esc: 'Esc' }
  : { mod: 'Ctrl', alt: 'Alt', shift: 'Shift', enter: 'Enter', space: 'Space', esc: 'Esc' };

// [label, combos]: each combo is space-separated key names; alternatives are separate combos.
export const SHORTCUTS = {
  script: [
    ['Generate and open Sync', ['mod enter']],
    ['Preview the paragraph at the cursor', ['shift mod enter']],
    ['Insert a pause at the cursor', ['alt P']],
    ['Pronunciation: next field or row', ['enter']],
  ],
  sync: [
    ['Play / pause', ['alt space']],
    ['Start now: the highlighted paragraph starts at the video time', ['alt N']],
    ['Seek back / forward 2 s', ['alt J', 'alt L']],
    ['On the focused timeline: seek 1 s (5 s with Shift)', ['←', '→']],
    ['Subtitles on the video on / off', ['alt C']],
    ['Nudge a Start by 0.1 s', ['↑', '↓']],
    ['Nudge a Start by 1 s', ['shift ↑', 'shift ↓']],
    ['Apply the timing to the script', ['mod enter']],
  ],
  general: [
    ['Show or hide this help', ['?', 'mod /']],
    ['Close this help · cancel a render', ['esc']],
  ],
};

// A combo's keys as displayed: [{ name, sym }]; sym marks single-symbol keys (drawn a bit larger).
export const comboKeys = (combo) => combo.split(' ').map((k) => {
  const name = KEY_NAMES[k] ?? k;
  return { name, sym: /^[^\p{L}\p{N}]$/u.test(name) };
});

// Whether keys typed into this element are text (so ? types a question mark there).
export const typingIn = (t) => t instanceof HTMLTextAreaElement || t.isContentEditable
  || (t instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button', 'file'].includes(t.type));
