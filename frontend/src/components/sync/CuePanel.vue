<!-- Paragraph timing: what the card buttons do and the cards themselves. No message bar: the cards show what a
     change did (screen readers hear it). Discard / Apply for pending changes are in the header. -->
<script setup>
import Icon from '../ui/Icon.vue';
import CueTable from './CueTable.vue';
import { useCues } from '../../composables/useCues';

const { cardNote } = useCues();
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
    <p class="sr-only" role="status">{{ cardNote }}</p>
    <CueTable />
  </section>
</template>

<style scoped>
.cues { padding: 0; gap: 0; overflow: hidden; }
.panel-head { display: flex; flex-direction: column; gap: 6px; padding: 20px 24px 12px; }
.panel-head h2 { font-size: 14px; font-weight: 650; }
.key { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: 12px; }
.key li { display: inline-flex; align-items: center; gap: 5px; }
.key .i { width: 13px; height: 13px; color: var(--subtle); }
.key .pause-key { color: var(--pause-ink); }
</style>
