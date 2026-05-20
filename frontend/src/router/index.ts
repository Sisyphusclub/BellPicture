import { createRouter, createWebHistory } from 'vue-router';

import DiscoverView from '@/views/DiscoverView.vue';
import GenerateView from '@/views/GenerateView.vue';
import HistoryView from '@/views/HistoryView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'discover',
      component: DiscoverView,
    },
    {
      path: '/generate',
      name: 'generate',
      component: GenerateView,
      props: { mode: 'generate' },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
    },
  ],
});
