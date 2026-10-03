// The help sheet (shortcuts & how it works). HelpDialog opens and closes the <dialog> to match helpOpen.
import { ref } from 'vue';
import { busy } from '../state';

const helpOpen = ref(false);

function toggleHelp(open = !helpOpen.value) {
  if (open === helpOpen.value || busy.value) return;
  helpOpen.value = open;
}

const api = { helpOpen, toggleHelp };
export const useHelp = () => api;
