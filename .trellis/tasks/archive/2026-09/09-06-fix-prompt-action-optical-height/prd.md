# 修正提示词修改按钮视觉高度

## Goal

修正生图页提示词编辑操作区中“修改”按钮视觉上高于“取消”按钮的问题，在保持两者实际点击尺寸一致的前提下统一可见填充高度。

## Requirements

* 保持两个按钮现有 72px 宽度、桌面 36px 高度和移动端 40px 最小高度。
* 保持按钮组 8px 间距、对齐方式和颜色语义不变。
* 将主按钮背景限制在透明边框以内，使其可见填充区域与带边框的次按钮一致。
* 增加样式契约断言，防止光学校正回归。

## Acceptance Criteria

* [x] “修改”和“取消”的外部点击尺寸保持一致。
* [x] “修改”按钮的背景不再绘制到透明边框下方。
* [x] 桌面与移动端的按钮组均无位移或溢出。
* [x] 前端定向测试、类型检查、lint、构建和格式检查通过。

## Technical Approach

为 `.session-batch__prompt-regenerate` 设置 `background-clip: padding-box`。浏览器仍保留共享 Button 的 1px 透明边框和完整点击框，但主色背景只绘制到内边缘，与次按钮被边框占据后的内部填充高度一致。

## Out of Scope

* 不修改共享 Button 的全局 primary/secondary 变体。
* 不改变按钮文案、交互、提交状态或禁用逻辑。

## Technical Notes

* 相关样式位于 `frontend/src/styles/base.css`。
* 现有契约测试位于 `frontend/tests/styles/generatePromptEditorActions.spec.ts`。
