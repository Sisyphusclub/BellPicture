# 重做发现页对话框滚动切换

## Goal

将发现页创作对话框从“同一元素由上方投影移动到底部”的滚动效果，改为上方完整对话框与底部窄对话框之间的离散切换：下滑越过节点后，上方先隐藏，底部再从中心展开；上滑返回时，底部先收拢隐藏，上方再原位显示。

## What I already know

- 用户明确不要对话框从上方瞬移或飞到底部。
- 当前 `LandingView` 使用同一个 `motion.div` 的 `layout` 投影，在 `composerDocked` 改变时同时切换普通流和固定定位。
- 输入内容、参考图、比例、数量、公开状态及额度均由 `LandingView` 持有，可供两种视觉状态共享。
- 当前空输入的底部停靠态为窄框，获得焦点或已有内容时会展开为完整编辑器。
- 项目使用 Motion，并已支持 `prefers-reduced-motion`。

## Assumptions

- 沿用当前滚动触发阈值和防抖动区间，不改变画廊浏览节奏。
- 空输入时底部使用窄框；获得焦点或存在输入/附件时仍可展开。
- 切换期间最多只有一个可访问、可交互的输入框。
- 上方退出与底部进入之间允许一个很短的空白间隔，以消除位置连续性错觉。

## Requirements

- 移除发现页创作对话框的跨位置 `layout` 投影。
- 上方完整对话框保持在文档流原位，只做淡出/淡入，不发生垂直位移。
- 下滑越过触发节点时，上方完成退出后，底部窄对话框从水平中心向两侧展开并淡入。
- 上滑返回触发节点时，底部对话框向水平中心收拢并隐藏，完成后上方对话框原位淡入。
- 两种状态共享 prompt、附件和所有生成设置，切换不得丢失内容。
- 底部输入框保持现有居中规则：桌面相对侧栏后的内容轨道居中，移动端左右各 16px。
- `prefers-reduced-motion` 下取消展开/收拢运动并立即切换，保留功能和状态。
- 保持登录、额度、提交、参考图、滚动恢复和画廊行为不变。

## Acceptance Criteria

- [x] 初始页面只存在上方创作对话框，且没有进入动画。
- [x] 下滑触发后，上方对话框先退出，底部对话框随后从中心展开。
- [x] 上滑返回后，底部对话框先收拢退出，上方对话框随后显示。
- [x] 切换不使用 Motion `layout` / `layoutDependency`，浏览器中无跨位置飞行动画。
- [x] 任一时刻最多有一个可访问的“首页创作提示词”输入框。
- [x] 输入内容及附件在双向切换后保持不变。
- [x] 底部窄框点击后仍能展开编辑，失焦且无内容时仍能收窄。
- [x] 桌面与移动端停靠位置保持居中且无水平溢出。
- [x] 减少动态效果模式下切换立即完成。
- [x] 前端组件检查、类型检查、lint、测试、构建与格式检查通过。

## Definition of Done

- 更新滚动交互与静态样式契约测试。
- Playwright 检查 1440x813 和 390x844 的上下双向切换、位置及唯一输入框。
- 生产构建部署到 `https://pic.apioctiva.com`。
- 独立 Git 提交，不包含 `.codex/config.toml`。

## Out of Scope

- 改变滚动触发节点的位置。
- 重做 Agent Chat Input 内部控件或生成业务。
- 修改发现画廊布局、侧栏宽度或认证功能。
- 为底部展开编辑器重新设计一套控件。

## Technical Notes

- 主要文件：`frontend/src/views/LandingView.tsx`、`frontend/src/styles/base.css`。
- 回归测试：`frontend/tests/App.spec.tsx`、`frontend/tests/styles/landingComposerMotion.spec.ts`。
- 采用两个带不同 key 的互斥 Motion 展示状态，并通过 `AnimatePresence mode="wait"` 顺序退出/进入。
- 底部展开效果使用中心对称 `clip-path`，避免缩放文字和控件。
- 相关规范：`.trellis/spec/frontend/component-guidelines.md`、`.trellis/spec/frontend/quality-guidelines.md`。

## Verification

- Playwright `1440x813`：下滑后上方在约 140ms 内原位淡出，底部随后由左右各 50% 裁切展开至 560px；上滑按相反顺序完成，整个采样序列最多 1 个提示词输入框。
- Playwright `390x844`：下滑与上滑顺序一致，底部框相对滚动内容区左右各 16px，无水平溢出；截图确认中心向外展开且画面无跨位置飞移。
- Playwright 减少动态效果：触发后 20ms 采样已完成互斥切换，`clip-path` 为 `none`。
- 浏览器双向切换后提示词 `共享状态验证` 保留；组件测试同时验证提示词与 `transition-reference.png` 附件保留。
- `npm run typecheck`、`npm run lint`、`npm run build`、`npm run format:check`、`git diff --check` 全部通过。
- `npm test`：34 个测试文件、135 个用例全部通过。
