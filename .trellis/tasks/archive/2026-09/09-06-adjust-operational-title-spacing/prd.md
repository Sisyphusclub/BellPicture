# 调整运营页标题分隔线与间距

## Goal

用户管理、创作模板和资产页使用统一的运营页头部。去掉标题下方的白色横线，并重新校准标题区与下面内容之间的垂直间距，让三页的标题、元信息、操作栏和内容区衔接更自然。

## What I already know

* 三页都使用 `OperationalPageHeader` 和 `.operational-page-header`。
* 横线来自 `.operational-page-header` 的 `border-bottom: 1px solid var(--border-strong)`。
* 当前头部 `min-height: 58px`、`margin-bottom: 12px`；模板和资产页另有 sticky 工具栏/工作台顶部安全距离。
* 资产页和管理员页已有独立容器边界，模板页工具栏自身无外框；本次只调整共享标题头部，不改变下方表格、画廊或工具栏边框。

## Requirements

* 移除用户管理、创作模板、资产页标题下方的 `.operational-page-header` 横线。
* 重新调整标题头部的高度和下方间距，桌面与移动端保持清晰且不产生内容位移异常。
* 保留标题、数量元信息和右侧操作按钮的对齐、可访问名称及响应式行为。
* 增加样式契约测试，锁定无底部边框和新的间距值。

## Acceptance Criteria

* [x] 三个页面的标题头部计算样式 `border-bottom-style` 为 `none`。
* [x] 标题头部与后续工具栏/内容区使用新的统一间距。
* [x] 桌面和 390px 移动端无水平溢出，标题和操作按钮不重叠。
* [x] 现有页面交互测试继续通过。
* [x] 前端测试、类型检查、lint、构建和格式检查通过。

## Definition of Done

* 更新共享运营页头部 CSS 与样式回归测试。
* 完成桌面、移动端浏览器检查并重建前端容器。
* 更新前端规范（若形成新的页面头部间距约定）。
* 归档任务并记录提交和质量检查结果。

## Out of Scope

* 不改变页面标题文案、元信息、筛选器、表格、画廊或卡片样式。
* 不移除资产列表、管理员表格或其他内容容器自身的分隔线。

## Technical Notes

* 组件：`frontend/src/components/common/OperationalPageHeader.tsx`。
* 共享样式：`frontend/src/styles/base.css` 中 `.operational-page-header` 及移动端覆盖规则。
* 样式回归可扩展 `frontend/tests/styles/workspaceLayout.spec.ts`。
