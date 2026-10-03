<!-- Render progress: covers the (inert) app until the render ends or is cancelled. -->
<script setup>
import { onMounted, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import { useRender } from '../../composables/useRender';

const { busyView: view, cancelRender } = useRender();
const cancelBtn = ref(null);

onMounted(() => cancelBtn.value?.focus());
</script>

<template>
  <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="busyTitle" aria-describedby="busyDetail">
    <div class="overlay-card">
      <div class="busy-head">
        <span class="logo"><Icon name="mic" /></span>
        <div>
          <h2 id="busyTitle">{{ view.title }}</h2>
          <p id="busyDetail" aria-live="polite">{{ view.detail }}</p>
        </div>
      </div>
      <div
        class="progress"
        :class="{ indeterminate: view.frac == null }"
        role="progressbar"
        aria-labelledby="busyTitle"
        :aria-valuenow="view.frac == null ? null : Math.round(view.frac * 100)"
        :style="view.frac == null ? null : { '--p': `${view.frac * 100}%` }"
      ><span /></div>
      <div class="busy-meta"><span>{{ view.elapsed }}</span><span>{{ view.left }}</span></div>
      <div class="busy-foot">
        <span class="help"><kbd>Esc</kbd> cancels</span>
        <button ref="cancelBtn" :disabled="view.cancelled" @click="cancelRender()">
          <Icon name="x" />{{ view.cancelled ? 'Cancelling…' : 'Cancel' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.busy-head { display: flex; gap: 14px; align-items: center; }
.busy-head .logo { width: 40px; height: 40px; border-radius: 12px; flex: none; animation: pulse 1.6s ease-out infinite; }
.busy-head .logo .i { width: 19px; height: 19px; }
.busy-head h2 { font-size: 15px; font-weight: 650; letter-spacing: -.01em; }
.busy-head p { margin: 2px 0 0; color: var(--muted); font-size: 13px; font-variant-numeric: tabular-nums; }
.progress { height: 6px; border-radius: 6px; background: var(--surface-3); overflow: hidden; }
.progress > span { display: block; width: var(--p, 0%); height: 100%; border-radius: inherit; background: linear-gradient(90deg, #6366f1, #a855f7); transition: width .25s linear; }
.progress.indeterminate > span { width: 30%; transition: none; animation: indeterminate 1.3s ease-in-out infinite; }
.busy-meta { display: flex; justify-content: space-between; gap: 12px; margin-top: -8px; color: var(--subtle); font-size: 12px; font-variant-numeric: tabular-nums; }
.busy-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid var(--border); }
@media (prefers-reduced-motion: reduce) { .busy-head .logo { animation: none; } }
</style>
