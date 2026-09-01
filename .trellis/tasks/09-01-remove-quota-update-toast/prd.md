# 移除额度更新成功提示

## Goal

管理员保存额度后，页面直接反映新的额度，不再在右上角显示“额度已更新。”成功 Toast；额度更新失败时继续保留错误提示。

## Requirements

- 成功更新任意用户额度后不调用成功 Toast，也不渲染“额度已更新。”。
- 额度更新失败时继续通过现有 `ToastProvider` 展示后端错误或默认错误文案。
- 用户创建、删除、列表加载等其他通知行为保持不变。
- 不新增组件库依赖；当前项目没有独立的 Be UI Toast/Notification 源码组件，现有 `ToastProvider` 为项目共享通知实现。

## Acceptance Criteria

- [x] 保存额度成功后右上角不显示“额度已更新。”。
- [x] 保存额度失败后错误 Toast 仍可见。
- [x] 当前用户额度刷新逻辑保持不变。
- [x] 用户管理页回归测试覆盖成功静默和失败提示路径。
- [x] 类型检查、lint、测试、构建和格式检查通过。

## Definition of Done

- 代码与回归测试形成独立提交。
- Be UI 组件核对结论记录在任务文档中。
- Trellis 任务归档并记录会话。

## Technical Approach

删除 `AdminUsersView.saveQuota` 成功分支中的 `notify('额度已更新。')`，保留 `catch` 分支的错误通知和当前用户额度刷新调用。通过 React Testing Library 从用户可见结果验证成功静默，避免依赖 ToastProvider 内部实现。

## Out of Scope

- 不重构全局 ToastProvider。
- 不替换为新的第三方通知库或新增 Be UI 依赖。
- 不改变额度 API、共享额度缓存或管理员权限逻辑。

## Technical Notes

- 修改入口：`frontend/src/views/AdminUsersView.tsx`。
- 回归测试：`frontend/tests/views/AdminUsersView.spec.tsx`。
- 共享通知实现：`frontend/src/components/common/ToastProvider.tsx`。
- Be UI 核对：`frontend/src/components/ui/` 与 `frontend/src/components/premium/` 未发现 Toast/Notification 组件；项目现有提示样式来自 `frontend/src/styles/base.css` 的 `.toast` 规则。
