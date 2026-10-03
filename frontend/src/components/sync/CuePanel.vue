<!-- Paragraph timing: pending changes (Apply / Discard) and the table of paragraph Starts. -->
<script setup>
import DraftBar from './DraftBar.vue';
import CueTable from './CueTable.vue';
import MoveModeToggle from './MoveModeToggle.vue';
import { draft } from '../../state';
</script>

<template>
  <section class="panel cues">
    <div class="panel-head">
      <h2>Paragraph timing</h2>
      <span class="help">Start = where the paragraph begins in the video · <span class="pause-key">⏸</span> = the pause before it</span>
      <MoveModeToggle />
    </div>
    <DraftBar v-if="draft" />
    <CueTable />
  </section>
</template>

<style scoped>
.cues { padding: 0; gap: 0; overflow: hidden; }
.panel-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 14px 16px 12px; }
.panel-head h2 { font-size: 14px; font-weight: 650; }
.pause-key { color: var(--pause-ink); }
</style>
