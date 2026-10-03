// Paragraph timing against the last render. `last` is the stored render: { name, duration, timeline, warnings,
// key, script, lead }. Times are in seconds; "video time" = narration time − lead.
import { fmt } from './format';
import { paragraphs, gapRange, setPause } from './script';

// Per paragraph of the last render: its speech on the audio clock ({ S, E }).
export function speechBlocks(last) {
  if (!last) return [];
  const ps = paragraphs(last.script), blocks = ps.map(() => ({}));
  for (const e of last.timeline) {
    if (e.kind !== 'speech') continue;
    const b = blocks[ps.findIndex((p) => e.start_char >= p.start && e.start_char <= p.end)];
    if (!b) continue;
    b.S ??= e.start;
    b.E = e.end;
  }
  return blocks;
}

// Per paragraph of the last render: where its speech starts and ends in the video. [] when the paragraphs
// no longer line up with it.
export function renderInfo(last, count) {
  const blocks = speechBlocks(last), L = (last && last.lead) || 0;
  if (blocks.length !== count) return [];
  return blocks.map((b) => (b.S == null ? {} : { start: b.S - L, end: b.E - L }));
}

export const renderedStarts = (last, count) => renderInfo(last, count).map((x) => x.start ?? null);

// Where the rendered audio plays when paragraph Starts differ from the rendered ones. cues[i] is paragraph
// i's Start in video time (null keeps the rendered gap after the previous paragraph). A paragraph that now
// starts later waits in silence; one that starts earlier is jumped to, but never cuts off the paragraph
// before it: if that one is still speaking, it keeps its rendered gap after it and is flagged late (so Apply
// leaves that gap alone rather than gluing it on with [pause 0s]). A negative ¶1 Start makes the voice start
// before the video.
// Narration time = video time + lead; inside a segment, audio position = narration time + off.
// count: paragraphs in the current script. Without a video the audio plays as rendered.
export function schedule(last, count, cues, videoLoaded) {
  const dur = last.duration, L0 = last.lead || 0, blocks = speechBlocks(last);
  const identity = { lead: L0, segs: [{ t0: 0, t1: dur, off: 0 }], waits: [], end: dur, info: renderInfo(last, count), changed: false };
  if (blocks.length !== count) return identity;
  const cueOf = (k) => cues[k] ?? null;
  const first = blocks.findIndex((b) => b.S != null);
  const c0 = first < 0 ? null : cueOf(first), r0 = first < 0 ? null : blocks[first].S - L0;
  const L = c0 == null || Math.abs(c0 - r0) < 0.001 ? L0 : Math.max(0, -c0);
  const segs = [], waits = [], info = Array.from({ length: count }, () => ({}));
  let prevEnd = null, prevE = 0, prevK = -1;
  blocks.forEach((b, k) => {
    if (b.S == null) return;
    const c = cueOf(k), follow = prevEnd == null ? b.S - L0 : prevEnd + (b.S - prevE);
    let V = follow, late = null;  // V: where the paragraph's speech starts now (video time)
    if (c != null && (prevEnd == null || c >= prevEnd - 0.001)) V = c;
    else if (c != null) late = { requested: c, by: follow - c, after: prevK };
    const end = V + b.E - b.S, off = b.S - (V + L), seg = segs[segs.length - 1];
    if (seg && Math.abs(seg.off - off) < 0.005) seg.t1 = end + L;
    else {
      const fromZero = !seg && Math.abs(off) < 0.005;  // audio plays from its start, leading silence included
      const from = prevEnd == null ? 0 : prevEnd + L;
      if (!fromZero && c != null && V + L - from > 0.005) waits.push({ kind: 'wait', start: from, end: V + L, text: `¶${k + 1} starts at ${fmt(V)}` });
      segs.push({ t0: fromZero ? 0 : V + L, t1: end + L, off });
    }
    info[k] = { start: V, end, late };
    prevEnd = end;
    prevE = b.E;
    prevK = k;
  });
  if (!segs.length) return identity;
  const tail = segs[segs.length - 1];
  tail.t1 = Math.max(tail.t1, dur - tail.off);
  const changed = segs.length > 1 || Math.abs(segs[0].off) >= 0.005 || Math.abs(L - L0) >= 0.005;
  if (!changed || !videoLoaded) return { ...identity, info, changed };
  return { lead: L, segs, waits, end: tail.t1, info, changed };
}

// The script with every paragraph's gap set so it starts at starts[i] (video time), with the voice starting
// L seconds before the video. Gaps that already fit keep their text; the others get one [pause …].
export function pauseScript(text, last, starts, L) {
  const v = text, ps = paragraphs(v), blocks = speechBlocks(last);
  if (blocks.length !== ps.length || starts.length !== ps.length || starts.some((s) => s == null) || blocks.some((b) => b.S == null)) return null;
  let out = '', pos = 0, prevEnd = 0;
  ps.forEach((p, i) => {
    const b = blocks[i], { from, to } = gapRange(ps[i - 1], p, v);
    const old = i ? b.S - blocks[i - 1].E : b.S;
    let gap = Math.max(0, Math.round((starts[i] + L - prevEnd) * 100) / 100);
    out += v.slice(pos, from);
    if (Math.abs(gap - old) < 0.005) { gap = old; out += v.slice(from, to); }
    else out += setPause(v.slice(from, to), gap, i > 0);
    pos = to;
    prevEnd += gap + (b.E - b.S);
  });
  return out + v.slice(pos);
}

// Per paragraph: the silence before its speech, after the previous paragraph's (for the first one, from the
// video start). ref and now are schedule infos: as rendered, and with the pending Starts. Each entry is
// { rendered, now, from, first }, or null where unknown; from lists the [pause …] directives the rendered
// silence came from, [] meaning the automatic paragraph pause.
export function paragraphGaps(last, ref, now) {
  const blocks = speechBlocks(last);
  if (!last || blocks.length !== ref.length || blocks.length !== now.length) return [];
  let prev = null, prevE = 0;
  return blocks.map((b, i) => {
    const r = ref[i], n = now[i];
    if (b.S == null || r?.start == null || n?.start == null) return null;
    const from = last.timeline
      .filter((e) => e.kind === 'pause' && !e.auto && e.start >= prevE - 0.005 && e.end <= b.S + 0.005)
      .map((e) => e.text);
    const gap = prev
      ? { rendered: r.start - prev.r, now: n.start - prev.n, from, first: false }
      : { rendered: Math.max(0, r.start), now: Math.max(0, n.start), from, first: true };
    prev = { r: r.end, n: n.end };
    prevE = b.E;
    return gap;
  });
}

// Every paragraph's Start (video time): its pending value, or else where it plays now.
export const fixedStarts = (cues, info) => cues.map((c, i) => c ?? info[i]?.start ?? null);

// The rendered timeline is per sentence; the strip shows one speech entry per paragraph (para: its index).
// A [pause …] between two of a paragraph's sentences keeps its own entry, flagged inner.
function paragraphEntries(last) {
  const ps = paragraphs(last.script), out = [], merged = [];
  for (const e of last.timeline) {
    if (e.kind === 'pause' && e.auto) continue;
    const k = e.kind === 'speech' ? ps.findIndex((p) => e.start_char >= p.start && e.start_char <= p.end) : -1;
    if (k < 0) { out.push({ ...e }); continue; }
    if (merged[k]) { merged[k].end = e.end; merged[k].end_char = e.end_char; continue; }
    merged[k] = { ...e, para: k, text: `¶${k + 1}  ${ps[k].snippet}` };
    out.push(merged[k]);
  }
  for (const e of out) {
    if (e.kind === 'pause') e.inner = merged.some((m) => m && e.start >= m.start - 0.005 && e.end <= m.end + 0.005);
  }
  return out;
}

// Rendered timeline entries placed on the narration clock (moved with their audio), plus waits for moved paragraphs.
export function placedEntries(last, sched) {
  if (!last || !sched) return [];
  const out = [];
  for (const e of paragraphEntries(last)) {
    const seg = sched.segs.find((s) => e.start >= s.t0 + s.off - 0.005 && e.end <= s.t1 + s.off + 0.005);
    if (seg) out.push({ ...e, start: e.start - seg.off, end: e.end - seg.off });
  }
  return out.concat(sched.waits).sort((a, b) => a.start - b.start);
}
