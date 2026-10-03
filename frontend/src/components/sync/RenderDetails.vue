<!-- The last render's downloads, voice intro and warnings. -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import { config, draft, last, stale } from '../../state';
import { fileUrl } from '../../lib/api';
import { useWorkflow } from '../../composables/useWorkflow';

const { applyDraft, generate } = useWorkflow();

const files = computed(() => {
  const l = last.value;
  if (!l) return [];
  return (config.value?.mp3 ? ['wav', 'mp3', 'srt'] : ['wav', 'srt']).map((ext) => ({ ext, name: `${l.name}.${ext}`, href: fileUrl(l.name, ext) }));
});
// The files hold the rendered timing only: with pending changes (or a changed script) they'd be the old version.
const locked = computed(() => (stale.value ? 'stale' : draft.value ? 'draft' : ''));
const lockedTitle = computed(() => (locked.value === 'stale'
  ? 'The script changed since this render. Generate again to download the new version.'
  : 'These files have the old timing. Apply the timing changes first; it renders the audio again.'));
const offsetInfo = computed(() => (last.value?.lead > 0 ? `Voice intro: the video starts ${last.value.lead.toFixed(2)}s into the audio` : ''));
const warnings = computed(() => last.value?.warnings || []);
</script>

<template>
  <div class="row meta">
    <span class="downloads">
      <template v-if="files.length">
        <span class="label">Download</span>
        <template v-if="locked">
          <span v-for="f in files" :key="f.ext" class="file off" role="link" aria-disabled="true" :title="lockedTitle">
            <Icon name="download" />{{ f.ext.toUpperCase() }}
          </span>
          <span class="hold">
            <template v-if="locked === 'draft'">
              <button class="link" title="⌘↵. Write the timing into the script and render again" @click="applyDraft()">Apply</button> the timing changes to download
            </template>
            <template v-else>
              <button class="link" title="Render the current script" @click="generate()">Generate</button> again to download
            </template>
          </span>
        </template>
        <a v-for="f in files" v-else :key="f.ext" class="file" :href="f.href" :download="f.name" :title="`Download ${f.name}`">
          <Icon name="download" />{{ f.ext.toUpperCase() }}
        </a>
      </template>
    </span>
    <span v-if="!locked" class="help">{{ offsetInfo }}</span>
  </div>
  <div v-if="warnings.length" class="warnings">
    <div v-for="(w, i) in warnings" :key="i"><Icon name="alert" /><span>{{ w }}</span></div>
  </div>
</template>

<style scoped>
.meta { min-height: 28px; }
.downloads { display: inline-flex; align-items: center; gap: 6px; }
.downloads .label { color: var(--muted); font-size: 12.5px; margin-right: 2px; }
.file { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 9px; border: 1px solid var(--border-strong); border-radius: 7px; background: var(--surface); color: var(--text); font-size: 11.5px; font-weight: 650; letter-spacing: .03em; text-decoration: none; transition: border-color .12s, color .12s; }
.file .i { width: 13px; height: 13px; }
a.file:hover { border-color: var(--accent); color: var(--accent); }
.file.off { opacity: .45; cursor: not-allowed; border-style: dashed; }
.hold { margin-left: 4px; color: var(--muted); font-size: 12.5px; }
.hold .link { padding: 0; height: auto; border: 0; background: none; color: var(--accent); font: inherit; font-weight: 600; cursor: pointer; }
.hold .link:hover:not(:disabled) { background: none; text-decoration: underline; }
.warnings { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--warn-line); background: var(--warn-bg); color: var(--warn); font-size: 13px; }
.warnings div { display: flex; gap: 8px; }
.warnings .i { margin-top: 2px; }
</style>
