import { LandingAccountActions } from '@/components/landing/LandingAccountActions';
import { LandingSidebar } from '@/components/landing/LandingSidebar';
import { useToast } from '@/components/common/ToastProvider';
import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { useImageQuota } from '@/hooks/useImageQuota';
import { getAppNavigation } from '@/config/navigation';

export function AppHeader() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { quota, checkIn } = useImageQuota();
  const { notify } = useToast();
  const accountName = user?.username ?? user?.name ?? '账户';

  return (
    <>
      <LandingSidebar
        accountName={accountName}
        brandLabel="Nebulens"
        creditsRemaining={quota?.remaining ?? '—'}
        ctaLabel="返回发现"
        ctaTo="/"
        checkedInToday={quota?.checkedInToday ?? false}
        dailyCheckInReward={quota?.dailyCheckInReward ?? 5}
        isAuthenticated={isAuthenticated}
        items={getAppNavigation(isAdmin)}
        logoSrc="/brand/logo.png"
        onCheckIn={checkIn}
        onLogin={openAuthModal}
        onNotify={notify}
      />
      <LandingAccountActions
        accountName={accountName}
        checkedInToday={quota?.checkedInToday ?? false}
        creditsRemaining={quota?.remaining ?? '—'}
        dailyCheckInReward={quota?.dailyCheckInReward ?? 5}
        isAuthenticated={isAuthenticated}
        onCheckIn={checkIn}
        onLogin={openAuthModal}
        onLogout={logout}
        onNotify={notify}
      />
    </>
  );
}
