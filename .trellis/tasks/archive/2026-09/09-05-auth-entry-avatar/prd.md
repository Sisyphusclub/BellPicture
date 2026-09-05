# 优化登录入口与默认头像

## Goal

修正未登录状态仍以个人头像作为认证入口的违和感，并让已登录账户优先展示真实头像、可靠回退为简洁的用户名首字母头像，使桌面顶部操作区与移动侧栏拥有一致、清晰的账户语义。

## What I already know

- 用户已确认处理登录入口与默认头像两个问题。
- 未登录桌面入口当前是圆形 `UserRound` 图标，点击后还会先打开账户弹层，再点击“登录 Nebulens”。
- 移动侧栏已有带“登录”文字的按钮，但仍使用账户头像语义图标。
- `AuthUserProfile.image` 已包含 Google 等第三方账号头像地址，当前账户界面没有消费该字段。
- 登录注册弹窗已经采用现有 beUI/shadcn 组件体系，本任务不需要更换认证实现。

## Assumptions

- 未登录入口直接打开现有认证弹窗，不再增加一层空账户弹层。
- 已登录时保留现有账户弹层、积分信息和退出登录行为。
- 头像图片加载失败时使用显示名称首字符回退；不引入新组件依赖。

## Requirements

- 桌面未登录状态显示 `LogIn` 图标和“登录”文字的明确按钮，点击后直接调用现有 `onLogin`。
- 已登录桌面状态继续显示头像按钮并打开账户弹层。
- 已登录账户优先显示 `user.image`；图片缺失或加载失败时显示账户名称首字符。
- 移动侧栏未登录入口使用相同的 `LogIn` 图标与“登录”文案。
- 移动侧栏已登录账户也使用同一头像展示规则。
- 保持现有 Google 登录、用户名登录、签到、退出登录及导航行为不变。
- 发现页输入框下滑进入停靠状态后，始终相对侧栏后的内容轨道居中；移动端保持左右等距。
- 停靠定位不得依赖会被 Motion 布局投影覆盖的独立 `translate` 属性。

## Acceptance Criteria

- [x] 未登录桌面入口可见文本“登录”，且单击一次即可打开登录弹窗。
- [x] 未登录入口不渲染头像或个人账户弹层触发器。
- [x] 有有效头像地址的已登录用户在桌面和移动侧栏均显示真实头像。
- [x] 头像缺失或加载失败时显示账户名称首字符，不出现损坏图片。
- [x] 已登录账户弹层仍展示名称、可用积分与退出登录操作。
- [x] 所有入口保留可访问名称、键盘焦点和触控可用性。
- [x] 前端组件检查、类型检查、lint、测试、构建与格式检查通过。
- [x] 1440px 桌面与 390px 移动视口无重叠或横向溢出。
- [x] 1440px 桌面下滑后，停靠输入框与下滑前的中心点偏差不超过 1px。
- [x] 390px 移动端下滑后，停靠输入框左右边距均为 16px。

## Definition of Done

- Tests added or updated for the changed account-entry behavior.
- Frontend lint, typecheck, tests, build, and format checks pass.
- Desktop and mobile states receive browser visual verification.
- No authentication API or backend behavior changes.

## Out of Scope

- 更换 Better Auth 或 Google OAuth 配置。
- 重做登录注册弹窗字段和认证流程。
- 用户上传、裁剪或管理自定义头像。
- 修改积分、签到或权限规则。

## Technical Notes

- 主要组件：`frontend/src/components/landing/LandingAccountActions.tsx`、`frontend/src/components/landing/LandingSidebar.tsx`。
- 调用方：`frontend/src/components/common/AppHeader.tsx`、`frontend/src/views/LandingView.tsx`、`frontend/src/views/GenerateView.tsx`。
- 样式入口：`frontend/src/styles/base.css`。
- 相关规范：`.trellis/spec/frontend/component-guidelines.md`、`.trellis/spec/frontend/quality-guidelines.md`。
- 既有认证任务 `.trellis/tasks/09-02-auth-beui/prd.md` 明确未覆盖其他页面登录入口，本任务补齐该范围。
- 浏览器复现表明 Motion 在停靠后写入内联 `transform`，原 CSS `translate: -50% 0` 的最终计算值为 `none`，导致宽 `560px` 的输入框从中心点向右展开。

## Verification

- `npm run typecheck`、`npm run lint`、`npm run build`、`npm run format:check`、`git diff --check` 均通过。
- `npm test`：34 个测试文件、135 项测试全部通过。
- 线上 CSP 已包含 `https://lh3.googleusercontent.com`，Google 头像可被浏览器加载。
- Playwright 1440x813：发现页输入框停靠前、紧凑停靠态、展开停靠态中心点均为 779px。
- Playwright 390x844：紧凑与展开停靠态布局视口左右边距均为 16px，无水平溢出。
- 生产地址：`https://pic.apioctiva.com`。
