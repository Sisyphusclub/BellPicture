# 修复发现页重复光标

## Goal

发现页顶部 hero 输入框为空且播放流式提示时，只显示蓝色流式 caret，不再同时显示白色原生 caret。

## What I already know

* `AgentChatInput` 在 `streamingPlaceholders` 有值且输入为空时渲染蓝色 `.agent-chat-input__streaming-placeholder-caret`。
* 下方 dock 展开态已通过 `caret-color: transparent` 隐藏空态 contentEditable 的原生 caret。
* 顶部 `.landing-composer-hero` 尚未拥有对应的空态 caret 规则，因此会出现两个光标。

## Assumptions

* 用户输入文字后，流式提示隐藏，原生 caret 应恢复显示。
* 仅调整发现页 hero，不改变 Generate 工作区或下方 dock 的 caret 行为。

## Requirements

* 顶部 hero 输入框 `data-empty="true"` 时隐藏原生 caret。
* 顶部 hero 输入框有文字时保留原生 caret。
* 保留蓝色流式 caret、动画和 reduced-motion 行为。
* 增加样式契约回归测试。

## Acceptance Criteria

* [ ] 发现页顶部空态只显示流式蓝色 caret，不显示白色原生 caret。
* [ ] 输入文字后原生 caret 恢复，流式提示隐藏。
* [ ] 既有发现页动效样式测试通过。
* [ ] 前端 typecheck、lint、test、build、format:check 通过。

## Definition of Done

* 完成最小范围 CSS 与测试改动。
* 通过前端质量门禁和 `git diff --check`。
* 以独立 Git 提交记录修复。

## Out of Scope

* 不修改流式提示文案、颜色、动画速度或输入框布局。
* 不修改 dock、Generate 工作区或通用 AgentChatInput 的其他 caret 规则。

## Technical Notes

* 主要样式：`frontend/src/styles/base.css`。
* 相关组件：`frontend/src/components/premium/agent-chat-input/agent-chat-input.tsx`。
* 回归测试：`frontend/tests/styles/landingComposerMotion.spec.ts`。
