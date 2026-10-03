<!-- The last message for this screen, next to the controls it is about. Screen readers hear it: errors right
     away, anything else when they're idle. The live regions stay in the page, empty, so changes are announced. -->
<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import { clearStatus, status } from '../../state';

const props = defineProps({ where: { type: String, required: true } });
const shown = computed(() => !!status.text && status.screen === props.where);
</script>

<template>
  <div class="status-bar" :class="{ on: shown, error: shown && status.error }">
    <div class="msgs">
      <div role="status">
        <p v-if="shown && !status.error" class="msg">
          <span v-if="status.spinning" class="spinner" /><Icon v-else name="info" />
          <span>{{ status.text }}</span>
        </p>
      </div>
      <div role="alert">
        <p v-if="shown && status.error" class="msg"><Icon name="alert" /><span>{{ status.text }}</span></p>
      </div>
    </div>
    <button v-if="shown" class="ghost dismiss" aria-label="Dismiss message" title="Dismiss" @click="clearStatus()">
      <Icon name="x" />
    </button>
  </div>
</template>

<style scoped>
.status-bar { display: flex; align-items: flex-start; gap: 8px; flex: none; }
/* Empty, it stays in the page for the live regions but out of the layout, so it adds no flex gap. */
.status-bar:not(.on) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.status-bar.on { padding: 6px 6px 6px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); }
.status-bar.error { border-color: color-mix(in srgb, var(--error) 30%, transparent); background: color-mix(in srgb, var(--error) 7%, var(--surface)); }
.msgs { flex: 1; min-width: 0; }
.msg { display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 5px 0; color: var(--muted); font-size: 13px; line-height: 1.45; overflow-wrap: anywhere; }
.error .msg { color: var(--error); font-weight: 550; }
.msg .i { width: 14px; height: 14px; margin-top: 2px; }
.msg .spinner { flex: none; margin: 2px 0 0; }
.dismiss { flex: none; width: 30px; height: 30px; padding: 0; color: var(--muted); }
.dismiss .i { width: 14px; height: 14px; }
</style>
