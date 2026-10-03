// The paragraph cards: pending Starts (the draft), Start now (⌥N), and what each card shows.
import { computed, ref, watch } from 'vue';
import { clearStatus, draft, freeParas, last, paraCount, paras, setStatus as say, tapIndex, timingHistory } from '../state';
import { fmt } from '../lib/format';
import { paragraphGaps, schedule } from '../lib/timing';
import { useTimeline } from './useTimeline';
import { usePlayback } from './usePlayback';

const { base, refStarts, info, pending, rowStarts, lead, narrationEnd, stripEntries } = useTimeline();
const { clock, hasMedia, videoTime, seekTo } = usePlayback();

// A draft only lives while it lines up with the paragraphs and still differs from the rendered timing:
// back to the rendered Starts, there is nothing to apply.
watch(() => !!draft.value && (draft.value.length !== paraCount.value || !pending.value.some(Boolean)),
  (drop) => { if (drop) draft.value = null; }, { flush: 'sync' });
watch(paraCount, (n) => { if (tapIndex.value > n) tapIndex.value = n; });
// The history's steps are Starts for these paragraphs since this render.
watch([last, paraCount], () => { timingHistory.value = null; }, { flush: 'sync' });

// Messages about the cards show above them (the Apply bar says what's pending).
const setStatus = (text, error = false) => say(text, error, false, 'cues');

// The draft to edit: the pending one, or else every paragraph pinned at its rendered Start, so the move
// changed paragraph's link alone decides what happens to the ones after it. Returned as a copy; assign it back.
function draftCopy() {
  const n = paraCount.value, d = draft.value, ref = refStarts.value;
  if (d && d.length === n) return [...d];
  return ref.length === n ? [...ref] : Array(n).fill(null);
}

const shownStart = (i) => (draft.value ? draft.value[i] : refStarts.value[i]) ?? null;

const signed = (t) => `${t > 0 ? '+' : '−'}${Math.abs(t).toFixed(1)}s`;

// Each paragraph is linked to the ones after it (a Start change takes them along) unless it is unlinked
// (it moves on its own). Kept by paragraph text, so it survives Apply and edits elsewhere in the script.
const isFree = (i) => !!paras.value[i] && freeParas.value.has(paras.value[i].snippet);
const followers = (i) => { const n = paraCount.value; return i + 2 === n ? `¶${n}` : `¶${i + 2}–¶${n}`; };

function toggleFree(i) {
  const p = paras.value[i];
  if (!p || i >= paraCount.value - 1) return;
  const f = new Set(freeParas.value), free = !f.has(p.snippet);
  if (free) f.add(p.snippet); else f.delete(p.snippet);
  freeParas.value = f;
  setStatus(free ? `¶${i + 1} moves on its own now: a Start change leaves ${followers(i)} where they are.`
    : `¶${i + 1} is linked: a Start change moves ${followers(i)} along with it.`);
}

// The paragraph whose link is pointed at, or else whose Start is being edited: the list tints the cards
// that would move with it.
const linkHover = ref(-1), linkEdit = ref(-1);
const movingFrom = computed(() => {
  const i = linkHover.value >= 0 ? linkHover.value : linkEdit.value;
  return i >= 0 && !isFree(i) ? i + 1 : Infinity;
});

// The last later Start an unlinked paragraph couldn't take, shown between the paragraph in the way and the
// one before it: { para, at: the paragraph in the way, text, id }. Any other timing, link or script change
// clears it.
const blocked = ref(null);
let blockedId = 0;
watch([draft, paras, freeParas], () => { blocked.value = null; }, { flush: 'sync' });
const dismissBlocked = () => { blocked.value = null; };

// Puts ¶i's Start at value (null: the rendered gap after the paragraph before) and takes the paragraphs
// after it along, or keeps them in place when ¶i is unlinked. Positions are where the paragraphs play now,
// so a paragraph pushed along by an overlap gets that position as its Start. Returns what happened:
// { value, delta: how far ¶i moved, blocker: for an unlinked ¶i, the paragraph that capped a later Start }.
function applyMove(i, value) {
  const n = paraCount.value, before = info.value, d = draftCopy(), old = before[i]?.start;
  if (!last.value || before.length !== n || old == null) {
    d[i] = value;
    draft.value = d;
    return { value, delta: 0, blocker: -1 };
  }
  const startsWith = (x) => { const c = [...d]; c[i] = x; return schedule(last.value, n, c).info; };
  const pinned = [];
  for (let j = i + 1; j < n; j++) if (d[j] != null && before[j]?.start != null) pinned.push(j);
  let blocker = -1;
  if (isFree(i)) {
    pinned.forEach((j) => { d[j] = before[j].start; });
    // A later Start can't push the paragraphs after it: take the latest one on the 0.1 s grid that fits.
    const blocks = (x) => { const s = startsWith(x); return pinned.find((j) => s[j].start > before[j].start + 0.001) ?? -1; };
    if (value != null && value > old + 0.001 && (blocker = blocks(value)) >= 0) {
      let lo = Math.ceil(old * 10 - 1e-6), hi = Math.round(value * 10) - 1, best = null;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (blocks(m / 10) < 0) { best = m; lo = m + 1; } else hi = m - 1;
      }
      value = best != null ? best / 10 : old;
    }
    d[i] = value;
  } else {
    d[i] = value;
    const delta = startsWith(value)[i].start - old;
    if (Math.abs(delta) > 0.0005) pinned.forEach((j) => { d[j] = Math.round((before[j].start + delta) * 1000) / 1000; });
  }
  draft.value = d;
  const now = info.value[i]?.start;
  return { value, delta: now != null ? now - old : 0, blocker, blockerAt: blocker >= 0 ? before[blocker].start : null };
}

// How the paragraphs after ¶i took the move, for the message ('' when there are none).
function followersNote(i, r) {
  if (i >= paraCount.value - 1 || Math.abs(r.delta) < 0.05) return '';
  return isFree(i) ? `; ${followers(i)} stay where they are` : `; ${followers(i)} move along with it (${signed(r.delta)})`;
}

// An unlinked paragraph asked to start later than the one after it leaves room for. The note between the two
// cards says so (an alert), so the message above the cards goes.
function blockedStatus(i, r) {
  const where = `¶${r.blocker + 1} stays at ${fmt(r.blockerAt)}`, moved = r.delta > 0.05;
  blocked.value = {
    para: i, at: r.blocker, id: ++blockedId,
    text: `${moved ? `¶${i + 1} can't go past ${fmt(r.value)}` : `¶${i + 1} can't start later`}: ${where}.`,
  };
  clearStatus();
}

// Each change to the draft is a step in the history. how: 'typed', 'now' (Start now), 'nudge', 'clear',
// 'reset'. Nudges of one paragraph in quick succession make one step; a change that changes nothing, none.
const sameDraft = (a, b) => (a == null ? b == null : !!b && a.length === b.length && a.every((x, k) => x === b[k]));
const ORIGIN = { para: -1, how: 'origin', draft: null };
const MAX_STEPS = 60, NUDGE_MERGE_MS = 2000;

// The Start as its card shows it, or else where the paragraph plays.
const cardStart = (i) => shownStart(i) ?? info.value[i]?.start ?? null;

function track(i, how, move) {
  const h = history.value, prev = draft.value, from = cardStart(i);
  const r = move();
  const now = draft.value;
  if (sameDraft(prev, now)) return r;
  let steps = h ? h.steps.slice(0, h.at + 1) : [ORIGIN];
  const top = steps[steps.length - 1], t = Date.now();
  let start = from, carried = Math.abs(r.delta) >= 0.05;
  if (how === 'nudge' && top.how === 'nudge' && top.para === i && h.at === h.steps.length - 1 && t - top.t < NUDGE_MERGE_MS) {
    steps = steps.slice(0, -1);
    start = top.from;
    carried ||= top.carried;
  }
  if (!sameDraft(steps[steps.length - 1].draft, now)) {
    const to = cardStart(i), plays = info.value[i]?.start, moved = start != null && to != null ? to - start : 0;
    const what = { typed: 'typed in', now: 'Start now', nudge: `nudged ${signed(moved)}`, reset: 'back to the rendered Start',
      clear: i > 0 ? `follows ¶${i} as rendered` : 'Start cleared' }[how];
    const more = [];
    if (r.blocker >= 0) more.push(`stopped by ¶${r.blocker + 1}`);
    if (plays != null && to != null && Math.abs(plays - to) >= 0.05) more.push(`plays at ${fmt(plays)}`);
    if (carried && i < paraCount.value - 1) more.push(`${followers(i)} ${isFree(i) ? 'stayed' : 'moved too'}`);
    steps.push({ para: i, how, from: start, to, what, more: more.join(' · '), carried, draft: now, t });
  }
  if (steps.length > MAX_STEPS + 1) steps.splice(1, steps.length - MAX_STEPS - 1);
  timingHistory.value = { steps, at: steps.length - 1 };
  return r;
}

function setCue(i, t, advance = true, how = 'typed') {
  if (i >= paraCount.value || t == null || Number.isNaN(t)) return;
  if (i > 0) t = Math.max(0, t);
  t = Math.round(t * 10) / 10;
  const r = track(i, how, () => applyMove(i, t));
  if (advance) tapIndex.value = i + 1;
  if (r.blocker >= 0) return blockedStatus(i, r);
  const what = i === 0 && t < 0 ? `voice starts ${(-t).toFixed(1)}s before the video` : `starts at ${fmt(t)}`;
  setStatus(`¶${i + 1} ${what}${followersNote(i, r)}.`);
}

function nudgeCue(i, delta, fallback = null) {
  if (i < paraCount.value) setCue(i, (shownStart(i) ?? fallback ?? videoTime()) + delta, false, 'nudge');
}

// Empty Start: the paragraph keeps its rendered gap after the paragraph before it.
function clearCue(i) {
  if (i >= paraCount.value) return;
  const r = track(i, 'clear', () => applyMove(i, null));
  setStatus(`¶${i + 1} follows the paragraph before it, as rendered${followersNote(i, r)}.`);
}

function resetCue(i) {
  const t = refStarts.value[i];
  if (i >= paraCount.value || t == null) return;
  const r = track(i, 'reset', () => applyMove(i, t));
  if (r.blocker >= 0) return blockedStatus(i, r);
  setStatus(`¶${i + 1} back to ${fmt(t)}, as rendered${followersNote(i, r)}.`);
}

function discardDraft() {
  if (!draft.value && !timingHistory.value) return;
  draft.value = null;
  timingHistory.value = null;
  say('Timing changes discarded.', false, false, 'changes');  // under the history, where they were listed
}

function canTap() {
  if (hasMedia()) return true;
  setStatus('Generate the narration first, then play it and press Start now (⌥N) when a paragraph should begin.', true);
  return false;
}

function tapNext() {
  if (!canTap()) return;
  if (tapIndex.value >= paraCount.value) return setStatus('That was the last paragraph. Go to a paragraph (its number) to set Starts from there again.');
  setCue(tapIndex.value, videoTime(), true, 'now');
}

const tapRow = (i) => { if (canTap()) setCue(i, videoTime(), true, 'now'); };

// A card's number (or a click on the card): jump to where it plays now; ⌥N sets Starts from there.
function selectRow(i) {
  tapIndex.value = i;
  const t = info.value[i]?.start ?? shownStart(i);
  if (t != null) seekTo(t + lead.value);
}

function cueNotes(i, v, inf, prev) {
  const notes = [];
  if (v == null) return notes;
  const late = inf.late && Math.abs(inf.late.requested - v) < 0.05;
  if (i > 0 && v < prev - 0.001 && !late) notes.push({ text: 'before previous paragraph', info: false });
  if (late) notes.push({ text: `¶${inf.late.after + 1} is still speaking: plays at ${fmt(inf.start)}, after its usual gap`, info: false });
  if (i === 0 && v < 0) notes.push({ text: `voice intro ${(-v).toFixed(1)}s before video`, info: true });
  return notes;
}

// One row per paragraph: its Start (pending, or as rendered), where it plays, its length and notes.
const rows = computed(() => {
  const d = draft.value, ref = refStarts.value, inf = info.value, pend = pending.value;
  let prev = -Infinity;
  return paras.value.map((p, i) => {
    const v = (d ? d[i] : ref[i]) ?? null, x = inf[i] || {};
    const row = {
      snippet: p.snippet, value: v, est: x.start ?? null, pending: pend[i], rendered: ref[i] ?? null, free: isFree(i),
      length: x.end != null ? `${(x.end - x.start).toFixed(1)}s` : '', notes: cueNotes(i, v, x, prev),
    };
    if (v != null) prev = Math.max(prev, v);
    return row;
  });
});

// The pause before each paragraph, as rendered and as it plays with the pending Starts. Shown between the
// rows, and before ¶1 only when its voice waits.
const gaps = computed(() => paragraphGaps(last.value, base.value?.info || [], info.value).map((g) => {
  if (!g || (g.first && g.rendered < 0.005 && g.now < 0.005)) return null;
  return { ...g, changed: Math.abs(g.now - g.rendered) >= 0.005 };
}));

// "¶2, ¶5–¶9": the changed paragraphs, consecutive ones as a range.
const changedList = computed(() => {
  const runs = [];
  pending.value.forEach((x, i) => {
    if (!x) return;
    const r = runs[runs.length - 1];
    if (r && r[1] === i - 1) r[1] = i; else runs.push([i, i]);
  });
  return runs.map(([a, b]) => (a === b ? `¶${a + 1}` : `¶${a + 1}${b > a + 1 ? '–' : ', '}¶${b + 1}`));
});
const draftSummary = computed(() => (draft.value ? `${changedList.value.join(', ')} changed` : 'Same as the render'));

// The history as listed. A draft from before (a reload of an older version, converted [at …] cues, a new
// render that kept it) is one step after the rendered timing.
const history = computed(() => timingHistory.value
  || (draft.value ? { steps: [ORIGIN, { para: -1, how: 'earlier', what: `${changedList.value.join(', ')} changed`, more: '', draft: draft.value }], at: 1 } : null));

// A step in words, for messages: "step 2 (¶3 0:10.0 → 0:12.0)".
function stepName(k) {
  const s = history.value.steps[k];
  if (s.how === 'origin') return 'the rendered timing';
  if (s.how === 'earlier') return `step ${k} (earlier changes)`;
  return `step ${k} (¶${s.para + 1} ${fmt(s.from)} → ${fmt(s.to)})`;
}

// Back (or forward again) to step k: the draft becomes what it was then. The later steps stay listed until
// the next change.
function goToStep(k) {
  const h = history.value;
  if (!h || k < 0 || k >= h.steps.length || k === h.at) return;
  const name = stepName(k), back = k < h.at;
  timingHistory.value = { steps: h.steps, at: k };
  draft.value = h.steps[k].draft ? [...h.steps[k].draft] : null;
  const later = h.steps.length - 1 - k;
  say(`${back ? 'Back to' : 'Redone up to'} ${name}.${later ? ` ${later === 1 ? 'The step after it stays' : `The ${later} steps after it stay`} listed to redo until the next change.` : ''}`,
    false, false, 'changes');
}

function undoStep() {
  const h = history.value;
  if (!h || h.at === 0) return say('Nothing to undo: the timing is as rendered.', false, false, 'changes');
  goToStep(h.at - 1);
}

function redoStep() {
  const h = history.value;
  if (!h || h.at === h.steps.length - 1) return say('Nothing to redo.', false, false, 'changes');
  goToStep(h.at + 1);
}

// What plays now: the strip segment and the paragraph under the playhead.
const activeSeg = computed(() => (last.value ? stripEntries.value.findIndex((e) => clock.t >= e.start && clock.t < e.end) : -1));
const activePara = computed(() => {
  if (!last.value || clock.t >= narrationEnd.value) return -1;
  let para = -1;
  rowStarts.value.forEach((s, i) => { if (s != null && s <= clock.t + 0.001) para = i; });
  return para;
});

// The paragraph whose leading silence is playing now.
const activeGap = computed(() => {
  if (!last.value || clock.t >= narrationEnd.value) return -1;
  const inf = info.value, L = lead.value;
  let from = 0;
  for (let i = 0; i < inf.length; i++) {
    const x = inf[i];
    if (x?.start == null) continue;
    if (clock.t >= from - 0.001 && clock.t < x.start + L - 0.001) return i;
    from = x.end + L;
  }
  return -1;
});

const api = {
  rows, gaps, draftSummary, history, goToStep, undoStep, redoStep, activeSeg, activePara, activeGap, linkHover, linkEdit, movingFrom,
  blocked, dismissBlocked, setCue, nudgeCue, clearCue, resetCue, discardDraft, tapNext, tapRow, selectRow, toggleFree,
};
export const useCues = () => api;
