import { createRouter, createWebHistory } from 'vue-router';

import GenerateView from '@/views/GenerateView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'discover',
      component: GenerateView,
      props: { mode: 'discover' },
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
      component: () => import('@/views/HistoryView.vue'),
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/AdminUsersView.vue'),
    },
  ],
});
