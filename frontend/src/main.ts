import 'element-plus/dist/index.css';
import '@/styles/base.css';

import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';

createApp(App).use(router).mount('#app');
