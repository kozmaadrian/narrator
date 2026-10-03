// Subtitles on the video: the sentence being spoken in the last render, where it plays now (pending timing
// included, voice intro too). The browser draws it as a text track, so it shows in fullscreen as well. The
// track holds a single cue for the current line, kept up to date from the narration clock.
import { computed, ref, watch } from 'vue';
import { last, setStatus } from '../state';
import { placedSentences } from '../lib/timing';
import { usePlayback } from './usePlayback';
import { useTimeline } from './useTimeline';

const { clock } = usePlayback();
const { sched } = useTimeline();
const BRIDGE = 0.6;  // a line stays up through a shorter gap before the next one, so it doesn't flicker between sentences

const subtitlesOn = ref(localStorage.getItem('narrator.subtitles') === '1');
watch(subtitlesOn, (on) => localStorage.setItem('narrator.subtitles', on ? '1' : '0'));

const lines = computed(() => placedSentences(last.value, sched.value).map((s, i, all) => {
  const next = all[i + 1];
  return { ...s, until: next && next.start - s.end <= BRIDGE ? next.start : s.end };
}));
const currentLine = computed(() => lines.value.find((l) => clock.t >= l.start && clock.t < l.until)?.text ?? '');

let bound = false;
function bindSubtitles(video) {
  if (bound || !window.VTTCue || !video.addTextTrack) return;
  bound = true;
  const track = video.addTextTrack('subtitles', 'Narration', document.documentElement.lang || 'en');
  let cue = null;
  // The video's own captions menu turns them on or off too.
  video.textTracks.addEventListener('change', () => { subtitlesOn.value = track.mode === 'showing'; });
  // Chrome shows no cue on a new video until it has played or seeked: a seek to where it is (0:00) fixes that.
  video.addEventListener('loadeddata', () => { if (!video.played.length) video.currentTime = video.currentTime; });
  watch([subtitlesOn, currentLine], ([on, text]) => {
    track.mode = on ? 'showing' : 'hidden';
    if (on && cue && cue.text === text) return;
    if (cue) { track.removeCue(cue); cue = null; }
    if (on && text) {
      cue = new VTTCue(0, 1e7, text);  // spans the whole video; replaced when the line changes
      track.addCue(cue);
    }
  }, { immediate: true });
}

function toggleSubtitles() {
  subtitlesOn.value = !subtitlesOn.value;
  setStatus(subtitlesOn.value ? 'Subtitles on: the video shows the sentence being spoken.' : 'Subtitles off.');
}

const api = { subtitlesOn, currentLine, bindSubtitles, toggleSubtitles };
export const useSubtitles = () => api;
