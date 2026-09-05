# 修复发现页展开输入框文字间距

## Goal

收紧发现页下滑后展开输入框中文字的左侧和顶部留白，让单行提示词在编辑器中更紧凑、视觉中心更自然，同时保持窄态输入框、移动端高度和多行文本行为不变。

## What I already know

* 展开态桌面规则位于 `frontend/src/styles/base.css` 的 `.landing-composer-dock.is-expanded .landing-composer .agent-chat-input__textarea`。
* 当前桌面展开态使用 `padding: 27px 18px 10px`，移动端使用 `padding: 31px 14px 6px`。
* 展开态输入框高度由共享 beUI Agent Chat Input 和 route CSS 控制，文字位置应通过 padding 调整，不能改变固定宽度或 dock 定位。
* 当前工作区存在用户未提交的 `.codex/config.toml`，不属于本任务。

## Requirements

* 仅调整发现页 dock 展开态文字的顶部和左侧内边距。
* 桌面端和移动端分别保持响应式间距，不能影响窄态输入框、工具栏或画廊位置。
* 保留 reduced-motion、键盘焦点和多行文本滚动行为。
* 添加或更新样式契约测试，确保展开态使用新的间距且窄态规则不被覆盖。

## Acceptance Criteria

* [x] 桌面展开态提示词左侧和顶部留白较当前收紧，文字不贴边、不溢出。
* [x] 移动端展开态同样收紧，输入框仍保持 390px 无横向溢出。
* [x] 窄态输入框尺寸和文字位置保持既有行为。
* [x] 前端 typecheck、lint、测试、构建和格式检查通过。
* [x] 浏览器截图确认展开态文字位置自然。

## Definition of Done

* 相关 CSS 与测试完成并通过质量检查。
* 代码改动使用独立的 `fix:` 中文提交。
* 任务归档并记录会话日志。

## Out of Scope

* 不改变发现页 dock 的宽度、定位、切换动画或画廊数据。
* 不修改 Generate 工作台输入框。

## Technical Notes

* 相关文件：`frontend/src/styles/base.css`、`frontend/tests/styles/landingComposerMotion.spec.ts`。
* 浏览器 QA：移动端 390x844，检查展开态文字 Range 中心、输入框边界和横向溢出。
* 验证结果：展开态桌面/移动 padding 分别为 `21px 14px 10px` / `25px 12px 6px`；移动端输入框宽度 352px，页面无横向溢出。
