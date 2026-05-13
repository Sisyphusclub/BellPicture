import 'element-plus/dist/index.css';
import '@/styles/base.css';

import { createApp } from 'vue';

import { useAuthModal } from '@/composables/useAuthModal';
import { registerUnauthorizedHandler } from '@/services/api/imagesApi';

import App from './App.vue';
import { router } from './router';

const { open: openAuthModal } = useAuthModal();
registerUnauthorizedHandler(openAuthModal);

createApp(App).use(router).mount('#app');
