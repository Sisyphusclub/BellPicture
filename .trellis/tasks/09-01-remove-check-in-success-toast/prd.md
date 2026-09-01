# 移除签到成功重复提示

## Goal

签到成功后不再在页面顶部显示成功 Toast，避免与签到卡片内的“今日灵感已领取 / 已签到”状态重复反馈。

## Requirements

- 桌面端 `LandingAccountActions` 签到成功后不调用成功通知。
- 移动端 `LandingSidebar` 签到成功后不调用成功通知。
- 签到请求、积分状态刷新、pending 防重复提交和已签到状态保持不变。
- 签到失败和退出登录失败仍使用错误 Toast。

## Acceptance Criteria

- [x] 成功签到后页面中不出现“签到成功”或“今日已签到”的 Toast。
- [x] 桌面签到卡片和移动侧边栏都遵循相同规则。
- [x] 签到失败仍显示“签到失败，请稍后重试。”。
- [x] 类型检查、lint、相关测试和构建通过。

## Technical Approach

在两个签到处理函数中保留 `await onCheckIn()`，删除对成功结果的 `onNotify` 调用。保留 `catch` 分支的错误通知，并用路由测试覆盖桌面和移动签到成功均无 Toast。

## Verification

- `npm run check:components`: passed。
- `npm run typecheck`: passed。
- `npm run lint`: passed，保留仓库既有 `sidebar.tsx:743` Fast Refresh warning。
- `npm run test -- tests/App.spec.tsx`: 25 项测试全部通过。
- `git diff --check`: passed。

## Out of Scope

- 不修改签到 API、积分计算、卡片布局或文案。
- 不移除其他业务操作的成功 Toast。
