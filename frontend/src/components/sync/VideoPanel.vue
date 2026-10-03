<!-- The screen recording: a drop zone until one is chosen, then the (muted) video, with optional subtitles. -->
<script setup>
import { onMounted, ref, watch } from 'vue';
import Icon from '../ui/Icon.vue';
import { videoLoaded } from '../../state';
import { usePlayback } from '../../composables/usePlayback';
import { useSubtitles } from '../../composables/useSubtitles';

const { bindVideo, loadVideo, removeVideo, setVideoSound } = usePlayback();
const { subtitlesOn, bindSubtitles } = useSubtitles();
const video = ref(null);
const fileInput = ref(null);
const over = ref(false);
const withSound = ref(false);

onMounted(() => {
  bindVideo(video.value);
  bindSubtitles(video.value);
});
watch(withSound, (on) => setVideoSound(on));

function onDrop(e) {
  over.value = false;
  loadVideo(e.dataTransfer.files[0]);
}

function onPick(e) {
  loadVideo(e.target.files[0]);
  e.target.value = '';
}
</script>

<template>
  <div
    v-show="!videoLoaded"
    class="drop"
    :class="{ over }"
    title="Drop a video here or click to choose one"
    @click="fileInput.click()"
    @dragover.prevent="over = true"
    @dragleave="over = false"
    @drop.prevent="onDrop"
  >
    <span class="drop-icon"><Icon name="video" /></span>
    <b>Add your screen recording</b>
    <span>Drop a video here to line the narration up with it.</span>
    <!-- Clicks anywhere on the frame choose a video; this button is the keyboard way in. -->
    <button type="button" class="drop-btn" @click.stop="fileInput.click()"><Icon name="upload" />Choose video</button>
    <small>Stays on this computer and plays muted, in sync with the narration.</small>
    <input ref="fileInput" type="file" accept="video/*" hidden @change="onPick">
  </div>
  <div v-show="videoLoaded" class="video-wrap">
    <video ref="video" controls muted playsinline />
    <div class="row">
      <label class="switch"><input v-model="withSound" type="checkbox">Original video sound</label>
      <label class="switch" title="⌥C. Show the sentence being spoken at the bottom of the video, also in fullscreen"><input v-model="subtitlesOn" type="checkbox">Subtitles</label>
      <span class="spacer" />
      <button class="ghost sm" @click="removeVideo()"><Icon name="x" />Remove video</button>
    </div>
  </div>
</template>

<style scoped>
.drop { flex: none; width: 100%; aspect-ratio: 16 / 9; max-height: 58vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 18px; border-radius: 10px; background: radial-gradient(120% 100% at 50% 0%, #1c2030 0%, #0e1015 70%); color: #9aa3b2; text-align: center; cursor: pointer; outline: 1.5px dashed transparent; outline-offset: -12px; transition: outline-color .15s, filter .15s; }
.drop:hover { outline-color: rgba(255, 255, 255, .18); filter: brightness(1.08); }
.drop.over { outline-color: #818cf8; filter: brightness(1.15); }
.drop > * { pointer-events: none; }  /* drag events stay on the frame (no dragleave flicker over the text) */
.drop-icon { width: 56px; height: 56px; margin-bottom: 12px; border-radius: 16px; display: grid; place-items: center; color: #c7cbe0; background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .1); }
.drop-icon .i { width: 26px; height: 26px; stroke-width: 1.6; }
.drop b { color: #f1f2f6; font-size: 16px; font-weight: 600; }
.drop small { font-size: 12px; color: #8a93a3; }
.drop-btn { margin: 12px 0 10px; height: 32px; padding: 0 14px; border: 0; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; background: #f1f2f6; color: #111827; font-size: 13px; font-weight: 600; }
.drop-btn:focus-visible { outline: 2px solid #a5b4fc; outline-offset: 3px; }
.video-wrap { display: flex; flex-direction: column; gap: 10px; }
video { display: block; width: 100%; max-height: 58vh; background: #000; border-radius: 10px; }
video::cue { background: rgba(10, 12, 18, .8); color: #fff; font-family: -apple-system, BlinkMacSystemFont, Inter, "Segoe UI", Roboto, sans-serif; line-height: 1.35; }
</style>
