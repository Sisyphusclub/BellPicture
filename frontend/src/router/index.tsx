import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminUsersView } from '@/views/AdminUsersView';
import { GenerateView } from '@/views/GenerateView';
import { HistoryView } from '@/views/HistoryView';
import { LandingView } from '@/views/LandingView';
import { TemplatesView } from '@/views/TemplatesView';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingView />} />
      <Route path="/generate" element={<GenerateView />} />
      <Route path="/templates" element={<TemplatesView />} />
      <Route path="/history" element={<HistoryView />} />
      <Route path="/admin/users" element={<AdminUsersView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
