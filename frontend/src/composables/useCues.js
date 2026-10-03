// The paragraph table: pending Starts (the draft), taps, and what each row shows.
import { computed, watch } from 'vue';
import { draft, last, paraCount, paras, setStatus, tapIndex, videoLoaded } from '../state';
import { fmt } from '../lib/format';
import { paragraphGaps } from '../lib/timing';
import { useTimeline } from './useTimeline';
import { usePlayback } from './usePlayback';

const { base, refStarts, info, pending, playingInfo, rowStarts, lead, narrationEnd, stripEntries } = useTimeline();
const { clock, clockEl, videoTime, seekTo } = usePlayback();

// A draft only lives while it lines up with the paragraphs and still differs from the rendered timing:
// back to the rendered Starts, there is nothing to apply.
watch(() => !!draft.value && (draft.value.length !== paraCount.value || !pending.value.some(Boolean)),
  (drop) => { if (drop) draft.value = null; }, { flush: 'sync' });
watch(paraCount, (n) => { if (tapIndex.value > n) tapIndex.value = n; });

const draftHint = () => (videoLoaded.value && last.value ? 'It plays live now; Apply writes it into the script.' : 'Apply writes it into the script.');

// The draft to edit: the pending one, or else every paragraph pinned at its rendered Start, so moving one
// paragraph doesn't drag the ones after it along. Returned as a copy; assign it back to draft.
function draftCopy() {
  const n = paraCount.value, d = draft.value, ref = refStarts.value;
  if (d && d.length === n) return [...d];
  return ref.length === n ? [...ref] : Array(n).fill(null);
}

const shownStart = (i) => (draft.value ? draft.value[i] : refStarts.value[i]) ?? null;

function setCue(i, t, advance = true) {
  if (i >= paraCount.value || t == null || Number.isNaN(t)) return;
  if (i > 0) t = Math.max(0, t);
  t = Math.round(t * 10) / 10;
  const d = draftCopy();
  d[i] = t;
  draft.value = d;
  if (advance) tapIndex.value = i + 1;
  const what = i === 0 && t < 0 ? `voice starts ${(-t).toFixed(1)}s before the video` : `starts at ${fmt(t)}`;
  setStatus(`¶${i + 1} ${what}. ${draftHint()}`);
}

function nudgeCue(i, delta, fallback = null) {
  if (i < paraCount.value) setCue(i, (shownStart(i) ?? fallback ?? videoTime()) + delta, false);
}

// Empty Start: the paragraph keeps its rendered gap after the paragraph before it.
function clearCue(i) {
  if (i >= paraCount.value) return;
  const d = draftCopy();
  d[i] = null;
  draft.value = d;
  setStatus(`¶${i + 1} follows the paragraph before it, as rendered. ${draftHint()}`);
}

function resetCue(i) {
  const t = refStarts.value[i];
  if (i >= paraCount.value || t == null) return;
  const d = draftCopy();
  d[i] = t;
  draft.value = d;
  setStatus(`¶${i + 1} back to ${fmt(t)}, as rendered.${draft.value ? ` ${draftHint()}` : ''}`);
}

function discardDraft() {
  if (!draft.value) return;
  draft.value = null;
  setStatus('Timing changes discarded.');
}

function canTap() {
  if (clockEl().src) return true;
  setStatus('Load the video (or generate audio) first, then play it and tap.', true);
  return false;
}

function tapNext() {
  if (!canTap()) return;
  if (tapIndex.value >= paraCount.value) return setStatus('That was the last paragraph. Click a paragraph in the table to tap from there again.');
  setCue(tapIndex.value, videoTime());
}

const tapRow = (i) => { if (canTap()) setCue(i, videoTime()); };

// Click on a row: jump to where it plays now, and tap from there.
function selectRow(i) {
  tapIndex.value = i;
  const t = playingInfo.value[i]?.start ?? shownStart(i);
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
      snippet: p.snippet, value: v, est: x.start ?? null, pending: pend[i], rendered: ref[i] ?? null,
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

const changedList = computed(() => pending.value.flatMap((x, i) => (x ? [`¶${i + 1}`] : [])));
const draftSummary = computed(() => (draft.value
  ? `${changedList.value.join(', ')} changed. Apply writes ${changedList.value.length > 1 ? 'them' : 'it'} into the script as [pause …] values.` : ''));
const tapLabel = computed(() => (tapIndex.value < paraCount.value ? `Tap ¶${tapIndex.value + 1}` : 'All set'));

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
  const inf = playingInfo.value, L = lead.value;
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
  rows, gaps, draftSummary, tapLabel, activeSeg, activePara, activeGap,
  setCue, nudgeCue, clearCue, resetCue, discardDraft, tapNext, tapRow, selectRow,
};
export const useCues = () => api;
