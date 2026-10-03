// The narration clock. Without a video, the rendered audio plays through a plain <audio> element. With a
// video, the video is the clock and the audio follows the schedule through Web Audio (see syncAudio).
import { reactive } from 'vue';
import { last, setStatus, videoDuration, videoLoaded } from '../state';
import { useTimeline } from './useTimeline';

const { lead, sched } = useTimeline();
const audio = new Audio();
audio.preload = 'auto';
let video = null;           // the <video> (VideoPanel binds it)
let intro = null;           // voice intro, video held on frame 0: { t: narration time, since: performance.now() while playing }
let resumeVideo = false;    // next video 'play' event comes from the end of the intro
let settleUntil = 0;

// What the transport, strip and table draw; updated every frame by tick().
const clock = reactive({ t: 0, playing: false, intro: false });

const clockEl = () => (videoLoaded.value ? video : audio);

// Narration time during the voice intro, while the video holds its first frame.
const introTime = () => (intro.since == null ? intro.t : intro.t + ((performance.now() - intro.since) / 1000) * video.playbackRate);
const introPlaying = () => !!intro && intro.since != null;

// Position on the narration clock (video time + lead). Without a video, the audio position.
function currentTime() {
  if (!videoLoaded.value) return audio.currentTime || 0;
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
  if (!clockEl().src) return;
  t = Math.max(0, t);
  if (!videoLoaded.value) { audio.currentTime = t; return; }
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
  const el = clockEl();
  if (!el.src) return;
  if (el.paused) el.play().catch(() => {}); else el.pause();
}

function pausePlayback() {
  if (introPlaying()) togglePlay();
  if (video && !video.paused) video.pause();
  if (!audio.paused) audio.pause();
}

// Stops the clock without touching the other player (used before a preview plays).
function pauseClock() {
  if (introPlaying()) togglePlay();
  clockEl().pause();
}

// With a video, the rendered audio plays through Web Audio, following the schedule: every segment is a buffer
// source started at its exact moment, so a paragraph that now starts later waits in silence and one that
// starts earlier is jumped to, sample-accurately. (WebKit's <audio> sounds ~0.3s late after every seek.)
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null, gain = null, voiceBuf = null, voiceSrc = '', voices = [], anchor = null;

const updateGain = () => { if (gain) gain.gain.value = audio.muted ? 0 : audio.volume; };

function audioContext() {
  if (!actx && AudioCtx) {
    actx = new AudioCtx();
    gain = actx.createGain();
    gain.connect(actx.destination);
    updateGain();
  }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});  // browsers may need a click first
  return actx;
}

// Decode the rendered audio for the video preview (once per render).
async function loadVoice() {
  const src = audio.src;
  if (!videoLoaded.value || !src || src === voiceSrc || !audioContext()) return;
  voiceSrc = src;
  voiceBuf = null;
  stopVoices();
  try {
    const buf = await actx.decodeAudioData(await (await fetch(src)).arrayBuffer());
    if (voiceSrc === src) { voiceBuf = buf; syncAudio(0); }
  } catch (e) {
    if (voiceSrc === src) { voiceSrc = ''; setStatus(`Could not load the audio for the preview: ${e.message}`, true); }
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
    src.connect(gain);
    src.start(at + (from - t0) / rate, pos, Math.min(seg.t1 - from, voiceBuf.duration - pos));
    voices.push(src);
  }
}

// Called every frame and on player events; tolerance 0 (seeks, rate changes) always reschedules.
// Right after the video starts, WebKit may hold its first frame ~0.1s and then catch up: keep playing through it.
function syncAudio(tolerance = 0.1) {
  if (!videoLoaded.value) return;
  if (!audio.paused) audio.pause();
  if (tolerance > 0 && performance.now() < settleUntil) tolerance = Math.max(tolerance, 0.35);
  const rate = video.playbackRate, s = sched.value;
  const playing = intro ? intro.since != null : !video.paused && !video.seeking && video.readyState >= 3;
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
    if (lead.value > 0 && audio.src && el.currentTime < 0.05) { startIntro(intro ? intro.t : 0); return; }
    intro = null;
    syncAudio(0);
  });
  el.addEventListener('playing', () => syncAudio(0.08));
  el.addEventListener('seeking', () => { if (intro && el.currentTime > 0.01) intro = null; });
  el.addEventListener('seeked', () => syncAudio(0));
  for (const ev of ['pause', 'waiting']) el.addEventListener(ev, () => { if (!introPlaying()) syncAudio(0); });
  el.addEventListener('timeupdate', () => syncAudio());
  el.addEventListener('ratechange', () => syncAudio(0));
  for (const ev of ['loadedmetadata', 'durationchange', 'emptied']) el.addEventListener(ev, () => { videoDuration.value = el.duration; });
}

audio.addEventListener('volumechange', updateGain);
// The last render's file can go missing (output/ cleaned up): say so instead of sitting silent.
audio.addEventListener('error', () => {
  const l = last.value;
  if (!l || !(audio.getAttribute('src') || '').includes(`/${l.name}.wav`)) return;
  setStatus(`The last render's audio (output/${l.name}.wav) is missing. Press Generate on 1 · Script to render it again; voiced sentences are cached, so it's quick.`, true);
});
// Browsers only start Web Audio after a user gesture.
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (videoLoaded.value) audioContext(); }, true);

// A new render: play it from the same video time (resumeAt), or else from the start of the voice.
function loadAudio(src, resumeAt = null) {
  intro = null;
  audio.src = src;
  audio.addEventListener('loadedmetadata', () => {
    if (!videoLoaded.value) audio.currentTime = Math.min(Math.max(0, (resumeAt ?? -lead.value) + lead.value), audio.duration || 0);
  }, { once: true });
  loadVoice();
}

function loadVideo(file) {
  if (!file || !file.type.startsWith('video/')) return setStatus('Please choose a video file.', true);
  if (video.src) URL.revokeObjectURL(video.src);
  audio.pause();
  intro = null;
  video.src = URL.createObjectURL(file);
  videoLoaded.value = true;
  stopVoices();
  loadVoice();
  setStatus(`Loaded video: ${file.name}`);
}

function removeVideo() {
  intro = null;
  video.pause();
  stopVoices();
  URL.revokeObjectURL(video.src);
  video.removeAttribute('src');
  video.load();
  videoLoaded.value = false;
}

const setVideoSound = (on) => { video.muted = !on; };

function tick() {
  if (intro && introTime() >= lead.value) {
    const playing = introPlaying();
    intro = null;
    if (playing) { resumeVideo = true; video.play().catch(() => {}); }
  }
  if (videoLoaded.value) syncAudio();
  clock.t = currentTime();
  clock.intro = !!intro;
  clock.playing = introPlaying() || (!!clockEl().src && !clockEl().paused);
  requestAnimationFrame(tick);
}
const startClock = () => requestAnimationFrame(tick);

const api = {
  clock, clockEl, currentTime, videoTime, seekTo, togglePlay, pausePlayback, pauseClock,
  bindVideo, loadAudio, loadVideo, removeVideo, setVideoSound, startClock,
};
export const usePlayback = () => api;
