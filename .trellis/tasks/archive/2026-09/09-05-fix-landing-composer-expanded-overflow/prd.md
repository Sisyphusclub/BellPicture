# 修复发现页输入框溢出并展开全部画廊

## Goal

修复发现页底部窄输入框点击后的宽度覆盖问题，使展开态与上方完整对话框同宽且不溢出；同时让发现页画廊直接显示全部内容，移除“加载更多”按钮。

## What I already know

- 当前底部窄态最大宽度为 560px，展开态设计宽度为 940px。
- 后置的 `.landing-composer-presentation { width: 100% }` 会覆盖底部展开态宽度；线上实测在 1440px 视口达到 1430px，并在移动端越过右边界。
- 展开态和窄态都由 `.landing-composer-dock` 定位，桌面相对侧栏后的内容轨道居中，移动端使用左右各 16px。
- 用户确认展开态宽度应与上方完整对话框一致，且不得超出可视区域。
- 发现页当前先显示 30 个内置作品，再通过“加载更多”逐批显示；用户要求直接全部显示。

## Assumptions

- 保留点击输入框展开完整工具栏的交互，不改为弹窗或新页面。
- 展开态逐断点复用上方对话框的宽度与边距，窄态仍保留现有宽度。
- 公开画廊存在后续分页时自动继续拉取；请求失败后停止，避免重试循环。

## Requirements

- 桌面底部展开态与上方对话框同为最大 940px。
- 展开态宽度必须受侧栏和视口安全宽度约束，不得产生水平溢出。
- 展开态继续相对侧栏后的内容轨道居中。
- 移动端展开态复用上方对话框的响应式边距，并验证点击前后均无水平溢出。
- 保持窄框中心展开入场、提示词状态、附件、工具栏和失焦收窄行为不变。
- 发现页一次渲染全部内置画廊内容，不显示“加载更多”按钮。
- 自动继续获取公开画廊的剩余分页，出现错误后停止。

## Acceptance Criteria

- [x] 1440px 桌面点击后展开宽度为 940px，与上方对话框一致并相对内容轨道居中。
- [x] 中等宽度桌面展开态不超出视口。
- [x] 390px 移动端展开态左右边距保持一致且无水平溢出。
- [x] 展开后完整输入与生成工具栏仍可用。
- [x] 空内容失焦后恢复窄态。
- [x] 发现页首次渲染即显示全部 169 个内置作品，且不存在“加载更多”按钮。
- [x] 类型检查、lint、测试、构建和格式检查通过。

## Definition of Done

- 更新样式与静态契约测试。
- Playwright 检查 1440px、1024px 和 390px 点击前后尺寸及水平溢出。
- 部署到 `https://pic.apioctiva.com`。
- 独立 Git 提交，不包含 `.codex/config.toml`。

## Out of Scope

- 修改滚动触发节点和上下对话框切换顺序。
- 重做 Agent Chat Input 内部控件。
- 修改创作模板页分页、侧栏或认证功能。

## Technical Notes

- 主要样式：`frontend/src/styles/base.css` 的 `.landing-composer-dock` 桌面宽度与负边距。
- 回归测试：`frontend/tests/styles/landingComposerMotion.spec.ts`。
- 相关规范：`.trellis/spec/frontend/component-guidelines.md`、`.trellis/spec/frontend/quality-guidelines.md`。

## Verification

- Playwright `1440x813`：上方与展开态均为 940px，边界均为 `309–1249`；窄态 560px，失焦后恢复。
- Playwright `1024x768`：上方与展开态均为 870px，边界均为 `131–1001`，无水平溢出。
- Playwright `390x844`：上方与展开态均为 352px；展开态边界 `14–366`，窄态边界 `16–364`，工具栏无重叠。
- 三种视口均渲染 169 个内置画廊图片且不存在“加载更多”，控制台与页面异常列表为空。
- 路由测试验证公开画廊存在后续游标时自动调用 `loadMore`，错误状态阻止继续请求。
- `npm run typecheck`、`npm run lint`、`npm run build`、`npm run format:check`、`git diff --check` 通过。
- `npm test`：34 个测试文件、136 个用例全部通过；最终宽度调整后的 8 个相关用例再次通过。
