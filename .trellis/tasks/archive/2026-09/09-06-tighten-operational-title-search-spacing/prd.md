# 收紧运营页标题与搜索框间距

## Goal

进一步收紧创作模板、资产和用户管理三个运营页面中标题区域与下方搜索/工具栏之间的垂直间距，让页面首屏信息更紧凑，同时保持已移除的标题横线、标题高度和移动端布局不变。

## Requirements

* 将共享 `.operational-page-header` 的底部间距从 20px 调整为 12px。
* 保持标题头部 48px 高度和无底部边框状态。
* 三个页面统一生效，不改变各页面工具栏、资产列表或用户表格自身间距。
* 增加样式契约断言，锁定新的标题间距。

## Acceptance Criteria

* [x] 三个页面标题与下方搜索/工具栏的计算间距为 12px。
* [x] 标题头部仍为 48px，`border-bottom-style` 仍为 `none`。
* [x] 桌面和 390px 移动端无水平溢出、标题和控件不重叠。
* [x] 前端定向测试、完整测试、类型检查、lint、构建和格式检查通过。

## Definition of Done

* 更新共享 CSS 与样式回归测试。
* 完成桌面和移动端浏览器检查并重建前端容器。
* 记录提交、测试和部署验证结果并归档任务。

## Out of Scope

* 不修改标题文字、标题高度、横线状态或页面内容容器布局。
* 不调整生成页、发现页或其他非运营页面的标题间距。

## Technical Notes

* 共享样式位于 `frontend/src/styles/base.css` 的 `.operational-page-header`。
* 现有样式契约位于 `frontend/tests/styles/workspaceLayout.spec.ts`。
