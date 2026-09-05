# 修复光标与流式提示文字对齐

## Goal

让 Discover 页面展开输入框中的真实输入光标和流式提示文字使用同一套文字起始位置与行盒，避免用户看到提示文字和光标上下错位。

## Requirements

* 以真实 textarea 的字体、行高和 padding 为唯一对齐基准，不再单独猜测流式提示层的位置。
* 展开态桌面端与移动端都保持文字和光标的同一基线。
* 流式提示层的自定义光标应覆盖真实 textarea 光标，避免同时显示两个不同位置的光标。
* 紧凑态、Studio 输入框、提示轮播和 reduced-motion 行为保持不变。

## Acceptance Criteria

* [x] 展开态桌面端流式文字与输入光标起始位置一致。
* [x] 展开态移动端流式文字与输入光标起始位置一致。
* [x] 展开态流式提示显示时不出现双光标或上下错位的光标。
* [x] 样式契约测试覆盖展开态的字体、行高、padding 和光标覆盖规则。
* [x] 前端类型检查、lint、测试、构建、格式检查和浏览器 QA 通过。

## Definition of Done

* 代码与回归测试完成。
* 390x844 和 1440x813 展开态已通过浏览器测量。
* 变更按仓库规范独立提交，并完成 Trellis 归档记录。

## Technical Approach

在 Discover 展开态覆盖中将流式提示层设置为与 textarea 完全相同的 `font-size`、`line-height` 和 padding 起点，并通过 `caret-color: transparent` 隐藏 textarea 原生光标，仅显示流式提示层的自定义光标。提示层的光标使用与文字相同的行高，不再额外向下 translate。

## Decision (ADR-lite)

**Context**: 绝对定位的提示层和 textarea 的原生光标由不同渲染路径绘制，即使 `top` 与 padding 数值相同，字体行盒和光标偏移仍可能产生视觉差异。

**Decision**: 共享 textarea 的排版参数，并在流式提示激活时以自定义光标作为唯一可见光标。

**Consequences**: 展开态的流式视觉更稳定；真实输入有内容后仍使用浏览器原生光标。提示层光标的 CSS 需与 textarea 排版同步维护。

## Out of Scope

* 不改变流式提示文案轮播速度、文本内容或组件 DOM 结构。
* 不调整紧凑态 dock、登录弹窗或画廊布局。

## Technical Notes

* `frontend/src/styles/base.css`：Discover dock 展开态最终覆盖规则及共享提示层光标规则。
* `frontend/tests/styles/landingComposerMotion.spec.ts`：landing composer 样式契约测试。
* `frontend/src/components/premium/agent-chat-input/agent-chat-input.tsx`：确认 textarea 与流式提示层同时挂载。
* `.trellis/spec/frontend/component-guidelines.md`：Docked Discover Composer Alignment 约束。
* `.trellis/spec/frontend/quality-guidelines.md`：前端质量门禁和视觉 QA 要求。
