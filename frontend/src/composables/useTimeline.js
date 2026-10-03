// Where the last render plays now: its schedule with the pending Starts, and what the strip and table show.
import { computed } from 'vue';
import { draft, last, paraCount, videoDuration, videoLoaded } from '../state';
import { fixedStarts, placedEntries, renderedStarts, schedule } from '../lib/timing';

const base = computed(() => (last.value ? schedule(last.value, paraCount.value, [], videoLoaded.value) : null));
const sched = computed(() => (draft.value && base.value ? schedule(last.value, paraCount.value, draft.value, videoLoaded.value) : base.value));
const refStarts = computed(() => renderedStarts(last.value, paraCount.value));
const info = computed(() => (sched.value ? sched.value.info : []));
const currentStarts = computed(() => (draft.value ? fixedStarts(draft.value, info.value) : refStarts.value));
// Per paragraph: its Start differs from the rendered one (only while there are pending changes).
const pending = computed(() => {
  const cur = currentStarts.value, ref = refStarts.value;
  return Array.from({ length: paraCount.value }, (_, i) => !!draft.value
    && cur[i] != null && ref[i] != null && Math.abs(cur[i] - ref[i]) > 0.001);
});

// Seconds of narration before the video starts (a negative ¶1 Start).
const lead = computed(() => (sched.value ? sched.value.lead : (last.value && last.value.lead) || 0));
const narrationEnd = computed(() => (sched.value ? sched.value.end : last.value ? last.value.duration : 0));
const totalDuration = computed(() => Math.max(narrationEnd.value, videoLoaded.value ? (videoDuration.value || 0) + lead.value : 0) || 1);
const stripEntries = computed(() => placedEntries(last.value, sched.value));
// Without a video the audio plays as rendered.
const playingInfo = computed(() => (videoLoaded.value || !base.value ? info.value : base.value.info));
// Per paragraph: narration time its speech starts.
const rowStarts = computed(() => Array.from({ length: paraCount.value }, (_, i) => {
  const s = playingInfo.value[i]?.start;
  return s != null ? s + lead.value : null;
}));

const api = { base, sched, refStarts, info, pending, lead, narrationEnd, totalDuration, stripEntries, playingInfo, rowStarts };
export const useTimeline = () => api;
