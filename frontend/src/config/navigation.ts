import {
  Compass,
  FolderOpen,
  ImagePlus,
  LayoutTemplate,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface AppNavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const primaryNavigation = [
  { label: '发现', to: '/', icon: Compass },
  { label: '生图', to: '/generate', icon: ImagePlus },
  { label: '创作模板', to: '/templates', icon: LayoutTemplate },
  { label: '资产', to: '/history', icon: FolderOpen },
] as const satisfies readonly AppNavigationItem[];

const adminNavigation = {
  label: '用户管理',
  to: '/admin/users',
  icon: Users,
} as const satisfies AppNavigationItem;

export function getAppNavigation(isAdmin = false): readonly AppNavigationItem[] {
  return isAdmin ? [...primaryNavigation, adminNavigation] : primaryNavigation;
}
