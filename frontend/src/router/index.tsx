import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const LandingView = lazy(() =>
  import('@/views/LandingView').then((module) => ({ default: module.LandingView })),
);
const GenerateView = lazy(() =>
  import('@/views/GenerateView').then((module) => ({ default: module.GenerateView })),
);
const TemplatesView = lazy(() =>
  import('@/views/TemplatesView').then((module) => ({ default: module.TemplatesView })),
);
const HistoryView = lazy(() =>
  import('@/views/HistoryView').then((module) => ({ default: module.HistoryView })),
);
const AdminUsersView = lazy(() =>
  import('@/views/AdminUsersView').then((module) => ({ default: module.AdminUsersView })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/generate" element={<GenerateView />} />
        <Route path="/templates" element={<TemplatesView />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/admin/users" element={<AdminUsersView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-label="页面加载中">
      <span aria-hidden="true" />
    </div>
  );
}
