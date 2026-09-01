import { Bell, BookOpen, Check, LogOut, Sparkles, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from '@/components/motion/popover-morph';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import type { DailyCheckInResponse } from '@/types/image';

interface LandingAccountActionsProps {
  accountName: string;
  checkedInToday: boolean;
  creditsRemaining: number | string;
  dailyCheckInReward: number;
  isAuthenticated: boolean;
  onCheckIn: () => Promise<DailyCheckInResponse>;
  onLogin: () => void;
  onLogout: () => Promise<void>;
  onNotify: (message: string, tone?: 'success' | 'error') => void;
}

export function LandingAccountActions({
  accountName,
  checkedInToday,
  creditsRemaining,
  dailyCheckInReward,
  isAuthenticated,
  onCheckIn,
  onLogin,
  onLogout,
  onNotify,
}: LandingAccountActionsProps) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleCheckIn = async (): Promise<void> => {
    if (!isAuthenticated) {
      setCheckInOpen(false);
      onLogin();
      return;
    }
    if (checkedInToday || checkingIn) return;
    setCheckingIn(true);
    try {
      await onCheckIn();
    } catch {
      onNotify('签到失败，请稍后重试。', 'error');
    } finally {
      setCheckingIn(false);
    }
  };
  const handleLogout = async (): Promise<void> => {
    try {
      await onLogout();
    } catch {
      onNotify('退出登录失败，请稍后重试。', 'error');
    }
  };

  return (
    <aside className="landing-account-actions" aria-label="快捷操作与个人积分">
      <IconTooltip label="创作模板" side="bottom">
        <Button asChild variant="ghost" size="icon" className="landing-account-actions__icon">
          <Link to="/templates" aria-label="打开创作模板">
            <BookOpen aria-hidden="true" />
          </Link>
        </Button>
      </IconTooltip>

      <MorphPopover>
        <MorphPopoverTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="landing-account-actions__icon"
            aria-label="查看通知"
          >
            <Bell aria-hidden="true" />
          </Button>
        </MorphPopoverTrigger>
        <MorphPopoverContent
          className="landing-account-popover landing-notification-popover"
          radius={16}
        >
          <strong>通知</strong>
          <p>暂无新通知</p>
        </MorphPopoverContent>
      </MorphPopover>

      <MorphPopover open={checkInOpen} onOpenChange={setCheckInOpen}>
        <MorphPopoverTrigger>
          <Button
            type="button"
            variant="ghost"
            className="landing-account-actions__credits"
            aria-label={
              isAuthenticated
                ? `个人积分 ${creditsRemaining}${checkedInToday ? '，今日已签到' : '，可签到'}`
                : '个人积分，登录后签到'
            }
          >
            <span>个人积分</span>
            <i aria-hidden="true" />
            <Sparkles aria-hidden="true" />
            <strong>{isAuthenticated ? creditsRemaining : 0}</strong>
          </Button>
        </MorphPopoverTrigger>
        <MorphPopoverContent
          className="landing-account-popover landing-check-in-popover"
          radius={16}
          sideOffset={12}
        >
          <div>
            <strong>{checkedInToday ? '今日灵感已领取' : '赢取每日灵感值！'}</strong>
            <small>
              {isAuthenticated
                ? `每日签到可得 ${dailyCheckInReward} 积分`
                : '登录后即可领取每日积分'}
            </small>
          </div>
          <Button
            type="button"
            disabled={checkingIn || (isAuthenticated && checkedInToday)}
            onClick={() => void handleCheckIn()}
          >
            {checkedInToday ? <Check aria-hidden="true" /> : null}
            {isAuthenticated
              ? checkedInToday
                ? '已签到'
                : checkingIn
                  ? '签到中'
                  : '签到'
              : '登录签到'}
          </Button>
        </MorphPopoverContent>
      </MorphPopover>

      <MorphPopover>
        <MorphPopoverTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="landing-account-actions__avatar"
            aria-label={isAuthenticated ? `账户：${accountName}` : '登录账户'}
          >
            {isAuthenticated ? (
              accountName.slice(0, 1).toUpperCase()
            ) : (
              <UserRound aria-hidden="true" />
            )}
          </Button>
        </MorphPopoverTrigger>
        <MorphPopoverContent
          className="landing-account-popover landing-profile-popover"
          radius={16}
        >
          {isAuthenticated ? (
            <>
              <div>
                <b>{accountName.slice(0, 1).toUpperCase()}</b>
                <span>
                  <strong>{accountName}</strong>
                  <small>{creditsRemaining} 积分可用</small>
                </span>
              </div>
              <Button type="button" variant="ghost" onClick={() => void handleLogout()}>
                <LogOut aria-hidden="true" />
                退出登录
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onLogin}>
              登录 Nebulens
            </Button>
          )}
        </MorphPopoverContent>
      </MorphPopover>
    </aside>
  );
}
