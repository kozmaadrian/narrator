// The narration clock: the video when one is loaded, else a free-running clock of its own. Either way the
// rendered audio plays through Web Audio, following the schedule (see syncAudio), so timing changes play
// live with or without a video.
import { reactive } from 'vue';
import { last, setStatus, videoDuration, videoLoaded } from '../state';
import { useTimeline } from './useTimeline';

const { lead, sched, narrationEnd } = useTimeline();
let voiceUrl = '';          // the last render's audio
let video = null;           // the <video> (VideoPanel binds it)
let free = { t: 0, since: null };  // the clock without a video: narration time t, performance.now() while playing
let intro = null;           // voice intro, video held on frame 0: { t: narration time, since: performance.now() while playing }
let resumeVideo = false;    // next video 'play' event comes from the end of the intro
let settleUntil = 0;

// What the transport, strip and paragraph cards draw; updated every frame by tick(). seeks counts jumps (strip, keys,
// the video's own scrubber), so the card list can bring the new spot into view.
const clock = reactive({ t: 0, playing: false, intro: false, seeks: 0 });

// Something to play: the video, or else the last render.
const hasMedia = () => (videoLoaded.value ? !!video.src : !!voiceUrl);

const freeTime = () => (free.since == null ? free.t : free.t + (performance.now() - free.since) / 1000);
const freeAt = (t, playing) => { free = { t: Math.min(Math.max(0, t), narrationEnd.value), since: playing ? performance.now() : null }; };

// Narration time during the voice intro, while the video holds its first frame.
const introTime = () => (intro.since == null ? intro.t : intro.t + ((performance.now() - intro.since) / 1000) * video.playbackRate);
const introPlaying = () => !!intro && intro.since != null;

// Position on the narration clock (video time + lead).
function currentTime() {
  if (!videoLoaded.value) return freeTime();
  if (intro) return introTime();
  return (video.currentTime || 0) + lead.value;
}

// Time in the video, which is what paragraph Starts use. Negative during the voice intro.
const videoTime = () => currentTime() - lead.value;

function startIntro(t = 0) {
  if (t >= lead.value - 0.05) t = 0;
  intro = { t, since: performance.now() };
  if (!video.paused) video.pause();
  if (video.currentTime > 0) video.currentTime = 0;
  syncAudio(0);
}

function seekTo(t) {
  if (!hasMedia()) return;
  clock.seeks++;
  t = Math.max(0, t);
  if (!videoLoaded.value) { freeAt(t, free.since != null); syncAudio(0); return; }
  const L = lead.value, playing = intro ? introPlaying() : !video.paused;
  if (t < L) {
    intro = { t, since: playing ? performance.now() : null };
    if (!video.paused) video.pause();
    video.currentTime = 0;
  } else {
    intro = null;
    video.currentTime = t - L;
    if (playing && video.paused) { resumeVideo = true; video.play().catch(() => {}); }
  }
  syncAudio(0);
}

function togglePlay() {
  if (introPlaying()) { intro = { t: introTime(), since: null }; syncAudio(0); return; }
  if (!hasMedia()) return;
  if (videoLoaded.value) {
    if (video.paused) video.play().catch(() => {}); else video.pause();
    return;
  }
  if (free.since != null) freeAt(freeTime(), false);
  else freeAt(free.t >= narrationEnd.value - 0.01 ? 0 : free.t, true);  // from the end, play again from the start
  syncAudio(0);
}

function pausePlayback() {
  if (introPlaying()) togglePlay();
  if (video && !video.paused) video.pause();
  if (free.since != null) freeAt(freeTime(), false);
  syncAudio(0);
}

// The rendered audio plays through Web Audio, following the schedule: every segment is a buffer source started
// at its exact moment, so a paragraph that now starts later waits in silence and one that starts earlier is
// jumped to, sample-accurately. (WebKit's <audio> sounds ~0.3s late after every seek.)
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null, voiceBuf = null, voiceSrc = '', voices = [], anchor = null, waiting = [];

function audioContext() {
  if (!actx && AudioCtx) {
    actx = new AudioCtx();
    waiting.forEach((resolve) => resolve(actx));
    waiting = [];
  }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});  // browsers may need a click first
  return actx;
}

// Browsers only start Web Audio after a user gesture; before the page has had one, wait for it (creating the
// context earlier only gets it suspended, with a console warning).
const contextReady = () => (actx || !AudioCtx || navigator.userActivation?.hasBeenActive !== false
  ? Promise.resolve(audioContext())
  : new Promise((resolve) => waiting.push(resolve)));
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (voiceUrl) audioContext(); }, true);

// Decode the rendered audio (once per render).
async function loadVoice() {
  const src = voiceUrl;
  if (!src || src === voiceSrc) return;
  voiceSrc = src;
  voiceBuf = null;
  stopVoices();
  try {
    const res = await fetch(src);
    const l = last.value;
    if (res.status === 404 && l && src.includes(`/${l.name}.wav`)) {  // output/ cleaned up: say so instead of sitting silent
      throw Object.assign(new Error(`The last render's audio (output/${l.name}.wav) is missing. Press Generate on 1 · Script to render it again; voiced sentences are cached, so it's quick.`), { plain: true });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = await res.arrayBuffer();
    const ctx = await contextReady();
    if (!ctx) throw new Error('this browser has no Web Audio');
    const buf = await ctx.decodeAudioData(bytes);
    if (voiceSrc === src) { voiceBuf = buf; syncAudio(0); }
  } catch (e) {
    if (voiceSrc === src) { voiceSrc = ''; setStatus(e.plain ? e.message : `Could not load the narration audio: ${e.message}`, true); }
  }
}

function stopVoices() {
  for (const v of voices) { try { v.stop(); } catch { /* not started */ } v.disconnect(); }
  voices = [];
  anchor = null;
}

function startVoices(t, rate, key) {
  stopVoices();
  const s = sched.value;
  const at = actx.currentTime + 0.04;  // headroom to get the sources scheduled
  const t0 = t + 0.04 * rate;          // narration time when they start
  anchor = { t: t0, at, rate, key, buf: voiceBuf };
  for (const seg of s.segs) {
    const from = Math.max(t0, seg.t0), pos = from + seg.off;
    if (from >= seg.t1 || pos >= voiceBuf.duration) continue;
    const src = actx.createBufferSource();
    src.buffer = voiceBuf;
    src.playbackRate.value = rate;
    src.connect(actx.destination);
    src.start(at + (from - t0) / rate, pos, Math.min(seg.t1 - from, voiceBuf.duration - pos));
    voices.push(src);
  }
}

// Called every frame and on player events; tolerance 0 (seeks, rate changes) always reschedules.
// Right after the video starts, WebKit may hold its first frame ~0.1s and then catch up: keep playing through it.
function syncAudio(tolerance = 0.1) {
  if (tolerance > 0 && performance.now() < settleUntil) tolerance = Math.max(tolerance, 0.35);
  const withVideo = videoLoaded.value, rate = withVideo ? video.playbackRate : 1, s = sched.value;
  const playing = !withVideo ? free.since != null
    : intro ? intro.since != null : !video.paused && !video.seeking && video.readyState >= 3;
  if (playing) audioContext();
  if (!playing || !voiceBuf || !s || !actx || actx.state !== 'running') { if (voices.length) stopVoices(); return; }
  const t = currentTime(), key = (s.key ??= JSON.stringify(s.segs));
  if (tolerance > 0 && anchor && anchor.key === key && anchor.rate === rate && anchor.buf === voiceBuf
      && Math.abs(anchor.t + (actx.currentTime - anchor.at) * rate - t) <= tolerance) return;
  startVoices(t, rate, key);
}

function bindVideo(el) {
  video = el;
  el.muted = true;
  el.addEventListener('play', () => {
    if (introPlaying()) { el.pause(); return; }  // video stays on its first frame until the intro ends
    settleUntil = performance.now() + 600;
    if (resumeVideo) { resumeVideo = false; syncAudio(0.08); return; }
    if (lead.value > 0 && voiceUrl && el.currentTime < 0.05) { startIntro(intro ? intro.t : 0); return; }
    intro = null;
    syncAudio(0);
  });
  el.addEventListener('playing', () => syncAudio(0.08));
  el.addEventListener('seeking', () => { if (intro && el.currentTime > 0.01) intro = null; clock.seeks++; });
  el.addEventListener('seeked', () => syncAudio(0));
  for (const ev of ['pause', 'waiting']) el.addEventListener(ev, () => { if (!introPlaying()) syncAudio(0); });
  el.addEventListener('timeupdate', () => syncAudio());
  el.addEventListener('ratechange', () => syncAudio(0));
  for (const ev of ['loadedmetadata', 'durationchange', 'emptied']) el.addEventListener(ev, () => { videoDuration.value = el.duration; });
}

// A new render: play it from the same video time (resumeAt), or else from the start of the voice.
function loadAudio(src, resumeAt = null) {
  intro = null;
  voiceUrl = src;
  freeAt((resumeAt ?? -lead.value) + lead.value, false);
  loadVoice();
}

function loadVideo(file) {
  if (!file || !file.type.startsWith('video/')) return setStatus('Please choose a video file.', true);
  if (video.src) URL.revokeObjectURL(video.src);
  if (free.since != null) freeAt(freeTime(), false);
  intro = null;
  video.src = URL.createObjectURL(file);
  videoLoaded.value = true;
  stopVoices();
  loadVoice();
  setStatus(`Loaded video: ${file.name}`);
}

// The narration stays where the video was.
function removeVideo() {
  const t = currentTime();
  intro = null;
  video.pause();
  stopVoices();
  URL.revokeObjectURL(video.src);
  video.removeAttribute('src');
  video.load();
  videoLoaded.value = false;
  freeAt(t, false);
  setStatus('Video removed. The narration plays on its own, with the same timing.');
}

const setVideoSound = (on) => { video.muted = !on; };

function tick() {
  if (intro && introTime() >= lead.value) {
    const playing = introPlaying();
    intro = null;
    if (playing) { resumeVideo = true; video.play().catch(() => {}); }
  }
  if (!videoLoaded.value && free.since != null) {
    if (voiceSrc && !voiceBuf) free.since = performance.now();  // hold until the audio is decoded
    else if (freeTime() >= narrationEnd.value) freeAt(narrationEnd.value, false);
  }
  syncAudio();
  clock.t = currentTime();
  clock.intro = !!intro;
  clock.playing = videoLoaded.value ? introPlaying() || (!!video.src && !video.paused) : free.since != null;
  requestAnimationFrame(tick);
}
const startClock = () => requestAnimationFrame(tick);

const api = {
  clock, hasMedia, currentTime, videoTime, seekTo, togglePlay, pausePlayback,
  bindVideo, loadAudio, loadVideo, removeVideo, setVideoSound, startClock,
};
export const usePlayback = () => api;
