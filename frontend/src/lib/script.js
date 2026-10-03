// Script text rules, mirroring narrate.py: paragraphs, [pause …] directives and the gaps between paragraphs.
import { parseTime } from './format';

// Paragraphs = runs of non-blank, non-# lines (same rule as narrate.py) that have something to say, so a
// standalone [pause 2s] line is not one. Each is { start, end, snippet } with character offsets.
export function paragraphs(text) {
  const out = [];
  let offset = 0, cur = null;
  for (const line of text.split('\n')) {
    const content = line.trim();
    if (content && !content.startsWith('#')) {
      if (!cur) cur = { start: offset + line.search(/\S/) };
      cur.end = offset + line.replace(/\s+$/, '').length;
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
    offset += line.length + 1;
  }
  if (cur) out.push(cur);
  for (const p of out) p.snippet = text.slice(p.start, p.end).replace(/\[[^\[\]\n]*\]/g, ' ').replace(/\s+/g, ' ').trim();
  return out.filter((p) => /[\p{L}\p{N}]/u.test(p.snippet));
}

export const PAUSE_BODY = /^(?:pause|break|p)?\s*(\d+(?:\.\d+)?)\s*(ms|s|sec|secs|seconds)?$/i;  // narrate.py's PAUSE_RE

// The text between paragraph a's last sentence and paragraph b's first (from the script start when a is
// missing): a's trailing directives, blank/comment/pause-only lines, and b's leading directives.
export function gapRange(a, b, text) {
  const from = a ? a.end - text.slice(a.start, a.end).match(/(?:\s*\[[^\[\]\n]*\])*\s*$/)[0].length : 0;
  const to = b.start + text.slice(b.start, b.end).match(/^(?:\[[^\[\]\n]*\]\s*)*/)[0].length;
  return { from, to };
}

// A gap's text without its [pause …] directives (comment lines untouched). A line left empty is removed,
// and so are the extra blank lines that leaves, so a standalone pause between paragraphs disappears cleanly.
// midStart: the gap starts right after a sentence, so its first line is the end of that sentence's line.
export function dropPauses(gap, midStart) {
  const lines = gap.split('\n'), out = [];
  let dropped = false, prevBlank = false;
  lines.forEach((line, j) => {
    const edge = (j === 0 && midStart) || j === lines.length - 1;  // part of a paragraph's line
    if (!edge && !line.trim()) {
      if (dropped && (!out.length || prevBlank)) return;
      out.push(line);
      prevBlank = true;
      return;
    }
    let s = line.trim().startsWith('#') ? line : line.replace(/\[([^\[\]\n]*)\][ \t]*/g, (m, body) => (PAUSE_BODY.test(body.trim()) ? '' : m));
    if (s !== line) {
      if (j !== lines.length - 1) s = s.replace(/\s+$/, '');
      if (!edge && !s.trim()) { dropped = true; return; }
    }
    out.push(s);
    prevBlank = false;
    if (s.trim()) dropped = false;
  });
  return out.join('\n');
}

export const isPauseLine = (line) => /^\s*(?:\[[^\[\]\n]*\]\s*)+$/.test(line)
  && [...line.matchAll(/\[([^\[\]\n]*)\]/g)].every((m) => PAUSE_BODY.test(m[1].trim()));

// A gap's text with a single [pause …] of the given length, on a line of its own between blank lines so it's
// easy to spot: a standalone pause line is updated in place, inline pauses move out of the paragraphs' lines
// (same timing: a standalone pause also replaces the automatic paragraph pause, so [pause 0s] means none).
// A new pause line goes after paragraph a (or right before the first paragraph). A leading gap of 0 s just
// loses its pauses.
export function setPause(gap, seconds, midStart) {
  const tag = `[pause ${+seconds.toFixed(2)}s]`, MARK = '\u0001';
  if (!midStart && seconds < 0.005) return dropPauses(gap, false);
  let lines = gap.split('\n');
  const inner = (j) => (j > 0 || !midStart) && j < lines.length - 1;  // not part of a paragraph's line
  const own = lines.findIndex((l, j) => inner(j) && isPauseLine(l));
  if (own >= 0) lines[own] = MARK;
  lines = dropPauses(lines.join('\n'), midStart).split('\n');
  let k = lines.indexOf(MARK);
  if (k < 0) lines.splice(k = midStart && lines.length > 1 ? 1 : lines.length - 1, 0, MARK);
  lines[k] = tag;
  const blank = (j) => inner(j) && !lines[j].trim();
  if (k > 0 && !blank(k - 1)) lines.splice(k++, 0, '');
  if (!blank(k + 1)) lines.splice(k + 1, 0, '');
  return lines.join('\n');
}

// What Preview plays: the selection, or else the paragraph (blank-line block) around the cursor.
export function previewText(text, selStart, selEnd) {
  if (selEnd > selStart) return text.slice(selStart, selEnd);
  const before = [...text.slice(0, selStart).matchAll(/\n[ \t]*\n/g)].pop();
  const start = before ? before.index + before[0].length : 0;
  const after = text.slice(selStart).match(/\n[ \t]*\n/);
  return text.slice(start, after ? selStart + after.index : text.length);
}

const OLD_HEADER = '# Pauses:  [pause 2s]  [500ms]  [at 1:05] (wait until 1:05 in the video)';
const NEW_HEADER = '# Pauses:  [pause 2s]  [500ms]  [1.5]';
const AT = /\[\s*(?:at|@)\s*(-?\d+(?::\d{1,2}){0,2}(?:\.\d+)?)\s*\][ \t]*/gi;

// Scripts from before [at …] was dropped: take the cues out of the text and keep their times as pending
// Starts, so Apply can turn them into pauses. pend is the stored { script, draft }.
// Returns { script, pend, migrated, draft } (draft only when migrated).
export function migrateCues(text, pend) {
  let script = text;
  if (script.includes(OLD_HEADER)) {
    const fixed = script.replace(OLD_HEADER, NEW_HEADER);
    if (pend && pend.script === script) pend = { ...pend, script: fixed };
    script = fixed;
  }
  const old = script, lines = old.split('\n');
  if (!lines.some((l) => !l.trim().startsWith('#') && l.match(AT))) return { script, pend, migrated: false };
  const cues = paragraphs(old).map((p) => {
    const m = old.slice(p.start, p.end).match(/^(?:\[[^\[\]\n]*\]\s*)*?\[\s*(?:at|@)\s*(-?\d+(?::\d{1,2}){0,2}(?:\.\d+)?)\s*\]/i);
    return m ? parseTime(m[1]) : null;
  });
  script = lines.flatMap((l) => {
    if (l.trim().startsWith('#') || !l.match(AT)) return [l];
    const s = l.replace(AT, '').replace(/\s+$/, '');
    return s.trim() ? [s] : [];
  }).join('\n');
  const n = paragraphs(script).length;
  let draft = pend && pend.script === old && Array.isArray(pend.draft) && pend.draft.length === n ? pend.draft : cues;
  if (draft.length !== n || draft.every((x) => x == null)) draft = null;
  return { script, pend, migrated: true, draft };
}
