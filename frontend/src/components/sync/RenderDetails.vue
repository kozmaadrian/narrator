<!-- The last render's downloads, voice intro and warnings. -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import { config, last } from '../../state';
import { fileUrl } from '../../lib/api';

const files = computed(() => {
  const l = last.value;
  if (!l) return [];
  return (config.value?.mp3 ? ['wav', 'mp3', 'srt'] : ['wav', 'srt']).map((ext) => ({ ext, name: `${l.name}.${ext}`, href: fileUrl(l.name, ext) }));
});
const offsetInfo = computed(() => (last.value?.lead > 0 ? `Voice intro: the video starts ${last.value.lead.toFixed(2)}s into the audio` : ''));
const warnings = computed(() => last.value?.warnings || []);
</script>

<template>
  <div class="row meta">
    <span class="downloads">
      <template v-if="files.length">
        <span class="label">Download</span>
        <a v-for="f in files" :key="f.ext" :href="f.href" :download="f.name" :title="`Download ${f.name}`">
          <Icon name="download" />{{ f.ext.toUpperCase() }}
        </a>
      </template>
    </span>
    <span class="help">{{ offsetInfo }}</span>
  </div>
  <div v-if="warnings.length" class="warnings">
    <div v-for="(w, i) in warnings" :key="i"><Icon name="alert" /><span>{{ w }}</span></div>
  </div>
</template>

<style scoped>
.meta { min-height: 28px; }
.downloads { display: inline-flex; align-items: center; gap: 6px; }
.downloads .label { color: var(--muted); font-size: 12.5px; margin-right: 2px; }
.downloads a { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 9px; border: 1px solid var(--border-strong); border-radius: 7px; background: var(--surface); color: var(--text); font-size: 11.5px; font-weight: 650; letter-spacing: .03em; text-decoration: none; transition: border-color .12s, color .12s; }
.downloads a .i { width: 13px; height: 13px; }
.downloads a:hover { border-color: var(--accent); color: var(--accent); }
.warnings { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--warn-line); background: var(--warn-bg); color: var(--warn); font-size: 13px; }
.warnings div { display: flex; gap: 8px; }
.warnings .i { margin-top: 2px; }
</style>
