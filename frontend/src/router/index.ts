import { createRouter, createWebHistory } from 'vue-router';

import AdminUsersView from '@/views/AdminUsersView.vue';
import GenerateView from '@/views/GenerateView.vue';
import HistoryView from '@/views/HistoryView.vue';

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
      component: HistoryView,
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
    },
  ],
});
