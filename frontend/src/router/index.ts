import { createRouter, createWebHistory } from 'vue-router';

import GenerateView from '@/views/GenerateView.vue';
import HistoryView from '@/views/HistoryView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'generate',
      component: GenerateView,
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
    },
  ],
});
