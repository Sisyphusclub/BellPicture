# 同步管理员更新后的当前用户额度

## Goal

管理员在用户管理页修改自己的每日额度后，右上角个人积分、侧边栏和生图页额度应立即显示后端返回的新值，避免表格与全局额度缓存不一致。

## Requirements

- 管理员保存当前登录账号的额度成功后，刷新共享 `useImageQuota` 缓存。
- 修改其他账号额度时，不覆盖或错误改变当前管理员自己的额度。
- 保存额度的表格状态、错误处理和按钮 pending 状态保持不变。
- 右上角、侧边栏和生成页继续从同一个共享额度状态读取数据。

## Acceptance Criteria

- [x] 保存当前用户额度后调用额度刷新，并让共享额度消费者读取最新值。
- [x] 保存其他用户额度后不触发当前用户额度同步。
- [x] 额度更新失败时不误报同步成功，原错误提示保持不变。
- [x] 覆盖当前用户与其他用户两条路径的回归测试。
- [x] 类型检查、lint、全量测试和生产构建通过。

## Definition of Done

- 代码、测试和共享状态规范形成独立提交。
- 已通过组件回归测试验证管理员更新自己的额度后触发共享额度刷新；其他用户更新不会触发刷新。
- Trellis 任务归档并记录会话。

## Technical Approach

在 `useImageQuota` 暴露一个共享的 `refreshImageQuota` 动作，复用现有的请求代数和错误兜底逻辑。`AdminUsersView.saveQuota` 成功更新表格后，仅当 `target.id === currentUser?.id` 时调用该动作；其他用户更新保持原有局部缓存更新，不额外请求当前用户额度。

## Out of Scope

- 不改变管理员额度 API 的请求或响应格式。
- 不改动后端配额计算、签到奖励或生成扣减逻辑。
- 不引入新的全局状态库或跨页面事件总线。

## Technical Notes

- 共享缓存：`frontend/src/hooks/useImageQuota.ts`。
- 管理员编辑入口：`frontend/src/views/AdminUsersView.tsx`。
- 回归测试：`frontend/tests/views/AdminUsersView.spec.tsx`。
