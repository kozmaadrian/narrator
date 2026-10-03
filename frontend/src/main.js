import { createApp } from 'vue';
import './styles/base.css';  // before the components, so their styles win ties
import App from './App.vue';

createApp(App).mount('#app');
