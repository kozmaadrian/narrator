<!-- Paragraph timing: what the card buttons do, messages about the cards, pending changes (Apply / Discard)
     and the cards themselves. -->
<script setup>
import Icon from '../ui/Icon.vue';
import StatusBar from '../ui/StatusBar.vue';
import DraftBar from './DraftBar.vue';
import CueTable from './CueTable.vue';
import { draft } from '../../state';
</script>

<template>
  <section class="panel cues" aria-labelledby="cues-title">
    <div class="panel-head">
      <h2 id="cues-title">Paragraph timing</h2>
      <ul class="key" aria-label="What the card symbols mean">
        <li><Icon name="pause" class="pause-key" />Pause before a paragraph</li>
        <li><Icon name="link" />Later paragraphs move along</li>
        <li><Icon name="timer" />Start at the video time</li>
        <li><Icon name="reset" />Put back</li>
      </ul>
    </div>
    <StatusBar where="cues" class="cues-status" />
    <DraftBar v-if="draft" />
    <CueTable />
  </section>
</template>

<style scoped>
.cues { padding: 0; gap: 0; overflow: hidden; }
.panel-head { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px 12px; }
.panel-head h2 { font-size: 14px; font-weight: 650; }
.key { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: 12px; }
.key li { display: inline-flex; align-items: center; gap: 5px; }
.key .i { width: 13px; height: 13px; color: var(--subtle); }
.key .pause-key { color: var(--pause-ink); }
.cues-status.on { margin: 0 12px 12px; }
</style>
