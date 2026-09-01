# 修复 BorderGlow 内容区块状伪影

## Goal

修复首页与生图页创作输入框在鼠标靠近边缘时出现的矩形色块和短条伪影，让 React Bits 光效只沿输入框边缘呈现，不侵入文字、工具栏和其余内容区。

## Requirements

- 保留 React Bits `BorderGlow` 的指针边缘感应、方向性彩色描边和外发光。
- 移除会在输入框内容区绘制网格色块的填充层。
- 输入框内部 surface 保持透明，根容器继续作为唯一的石墨色背景。
- 首页与生图页复用同一套修复，不改变输入框布局、功能、菜单、焦点或提交行为。
- 保留 reduced-motion 行为和现有橙色、青色、蓝色配色。

## Acceptance Criteria

- [x] 鼠标靠近任意边缘时，仅边缘描边和外发光可见，输入框中心无矩形或短条色块。
- [x] 鼠标离开后光效平滑消失。
- [x] 首页和 `/generate` 在桌面端与移动端均无内容遮挡、布局位移或横向溢出。
- [x] BorderGlow 组件测试和样式结构测试覆盖“无内容区填充层”。
- [x] 类型检查、lint、相关测试和生产构建通过。

## Definition of Done

- 实现与测试形成独立修复提交。
- 浏览器中实际交互验证通过，无控制台错误。
- 如发现可复用的光效约束，更新前端组件规范。

## Technical Approach

保留 React Bits `BorderGlow` 的组件与交互算法，在共享 beUI Agent Chat Input 集成点将 `fillOpacity` 调整为 `0`。同时将 `::before` mesh gradient 限制在 1px 边缘环内，避免其 padding-box 半透明背景与根容器叠色。这样保留 `.edge-light` 外发光、三色方向性描边、指针角度和边缘接近度算法，同时消除两类内容区伪影。

## Decision (ADR-lite)

**Context**: React Bits 示例的 `::after` 会将网格渐变绘制到卡片内容区，并依赖复杂的多层遮罩。它在宽而矮的创作输入框上产生可见矩形色块，不符合 Nebulens 安静、精确的工作台视觉原则。

**Decision**: 对创作输入框采用 React Bits 的边缘描边与外发光，将集成参数 `fillOpacity` 设为 `0`，并将 `::before` 的绘制范围裁剪为边缘环，不再跨越内容区重复绘制半透明背景。

**Consequences**: 光效更克制且跨浏览器稳定；组件仍保留内容填充能力，其他非输入框场景未来可以按需使用，用户要求的边缘光效完整保留。

## Out of Scope

- 不调整输入框尺寸、间距、文字、按钮或工具栏布局。
- 不改变生成业务逻辑、菜单交互或页面背景。
- 不引入新的光效库或额外依赖。

## Technical Notes

- 主要实现：`frontend/src/components/BorderGlow.css`、`frontend/src/components/BorderGlow.tsx`。
- 集成点：`frontend/src/components/premium/agent-chat-input/agent-chat-input.tsx`。
- 回归测试：`frontend/tests/components/BorderGlow.spec.tsx`、`frontend/tests/styles/borderGlowStructure.spec.ts`。
- 截图中的伪影与 `::after` 的 padding-box mesh gradient / multi-mask fill 层形状一致。

## Verification

- `npm run check:components`: passed。
- `npm run typecheck`: passed。
- `npm run lint`: passed，保留仓库既有 `sidebar.tsx:743` Fast Refresh warning。
- `npm run test`: 25 个测试文件、113 项测试全部通过。
- `npm run build`: passed，保留既有 bundle size warning。
- 本次改动文件 Prettier 与 `git diff --check`: passed。
- 全仓库 `npm run format:check`: 被 39 个与本任务无关的既有文件阻塞。
- Browser QA: 首页和 `/generate` 在 1440 x 813、390 x 844 下检查四边激活状态；内容填充 opacity 为 `0`，无横向溢出，控制台无 warning/error。
