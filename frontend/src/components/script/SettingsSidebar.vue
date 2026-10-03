<!-- How the narration sounds: voice, speed, pauses and the pronunciation list. -->
<script setup>
import { computed } from 'vue';
import PronunciationList from './PronunciationList.vue';
import { config, settings } from '../../state';
import { voiceGroups } from '../../lib/voices';

const SPEED = { min: 0.7, max: 1.3 };
const groups = computed(() => voiceGroups(config.value?.voices || []));
const speedFill = computed(() => `${((settings.speed - SPEED.min) / (SPEED.max - SPEED.min)) * 100}%`);
</script>

<template>
  <aside class="panel sidebar">
    <div class="group">
      <h2>Sound</h2>
      <div class="field">
        <label for="voice">Voice</label>
        <select id="voice" v-model="settings.voice">
          <optgroup v-for="g in groups" :key="g.label" :label="g.label">
            <option v-for="v in g.voices" :key="v.id" :value="v.id">{{ v.label }}</option>
          </optgroup>
        </select>
      </div>
      <div class="field">
        <label for="speed">Speed <span class="speed-val">{{ (+settings.speed).toFixed(2) }}×</span></label>
        <input
          id="speed" v-model="settings.speed" type="range" :min="SPEED.min" :max="SPEED.max" step="0.05"
          :style="{ '--fill': speedFill }"
        >
      </div>
    </div>

    <div class="group">
      <h2>Pauses</h2>
      <div class="field inline">
        <label for="sentencePause">Between sentences</label>
        <span class="unit"><input id="sentencePause" v-model="settings.sentence_pause" type="number" min="0" max="10" step="0.05">s</span>
      </div>
      <div class="field inline">
        <label for="paragraphPause">Between paragraphs</label>
        <span class="unit"><input id="paragraphPause" v-model="settings.paragraph_pause" type="number" min="0" max="30" step="0.1">s</span>
      </div>
    </div>

    <div class="group">
      <h2>Pronunciation</h2>
      <p class="help" style="margin: 0">
        Select a word in the script and press Add, then spell it the way it should sound. Only the audio changes.
        Press <b>▶</b> to hear it.
      </p>
      <PronunciationList />
    </div>
  </aside>
</template>

<style scoped>
.sidebar { overflow: auto; gap: 0; padding: 0; }
.group { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.group + .group { border-top: 1px solid var(--border); }
h2 { font-size: 11px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; color: var(--subtle); }
.field { display: flex; flex-direction: column; gap: 6px; }
.field > label { font-size: 13px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
.field.inline { flex-direction: row; align-items: center; justify-content: space-between; gap: 8px; }
.field select { width: 100%; }
.speed-val { font: 600 11.5px var(--mono); padding: 1px 6px; border-radius: 5px; background: var(--surface-3); color: var(--muted); }
@media (max-width: 1000px) {
  .sidebar { order: 1; }
}
</style>
