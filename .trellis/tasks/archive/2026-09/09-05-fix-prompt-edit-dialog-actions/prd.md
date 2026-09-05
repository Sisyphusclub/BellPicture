# 修复生图提示词编辑弹窗按钮间距

## Goal

调整生图页面生成记录中“编辑提示词”状态的操作按钮，使“取消”和“修改”保持一致尺寸并缩短按钮之间的距离，降低操作区的松散感，同时保留现有提交、取消和键盘交互。

## What I already know

* 生图页面的编辑提示词交互由 `frontend/src/views/GenerateView.tsx` 中的 `EditablePromptBubble` 提供。
* 操作按钮位于 `.session-batch__prompt-edit-actions`，当前使用 `column-gap: 16px` 和 `Button size="compact"`。
* 桌面按钮继承 `.button--compact` 的 36px 高度，移动端覆盖为 40px；两个按钮没有统一宽度约束，因此视觉宽度随文本内容和边框表现而变化。
* 现有 `GenerateView.spec.tsx` 已覆盖编辑、取消、提交、文本域自适应高度和按钮语义。

## Assumptions

* 已确认采用紧凑的 8px 按钮间距，保留清晰的可点击区域。
* 已确认将两个按钮统一为 72px 宽度，使“取消”和“修改”在桌面与移动端视觉一致。

## Requirements

* 缩短提示词编辑操作区中“取消”和“修改”的水平间距。
* 统一两个按钮的可视宽度和高度；移动端现有 40px 高度保持不变。
* 不改变按钮的颜色语义、禁用状态、提交行为、取消行为或键盘快捷键。
* 增加样式契约测试，防止间距和尺寸回归。

## Decision (ADR-lite)

**Context**: 当前操作区的 16px 间距偏松，两个文字按钮按内容宽度渲染，造成按钮大小不一致。

**Decision**: 仅在提示词编辑操作区将间距收紧至 8px，并为两个共享 `.button` 元素设置 72px 固定宽度；移动端继续使用现有 40px 最小高度。

**Consequences**: 桌面和移动端的操作区更紧凑、按钮视觉对齐；未来若增加第三个操作，需重新评估固定宽度是否仍合适。

## Acceptance Criteria

* [x] “取消”和“修改”按钮间距为紧凑值，视觉上不再疏离。
* [x] 两个按钮使用相同的宽度约束和高度规则。
* [x] 现有生图提示词编辑交互测试继续通过。
* [x] 前端测试、类型检查、lint、构建和格式检查通过。

## Definition of Done

* 更新 CSS 与样式回归测试。
* 运行前端完整质量门禁和 `git diff --check`。
* 完成桌面与移动端浏览器检查，确认按钮不溢出且键盘交互不变。
* 记录并归档本次任务。

## Out of Scope

* 不调整提示词编辑弹窗的文本域尺寸、颜色、圆角和布局位置。
* 不修改其他页面或其他对话框按钮组。

## Technical Notes

* 相关样式位于 `frontend/src/styles/base.css` 的 `.session-batch__prompt-edit-actions` 和移动端覆盖规则。
* 相关组件测试位于 `frontend/tests/views/GenerateView.spec.tsx`。
