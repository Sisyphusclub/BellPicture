# 修复生产环境登录与发现页交互

## Goal

让生产环境的 Google 登录状态、登录表单反馈和发现页尺寸选择保持稳定一致，避免用户看到“未配置”、首次操作白色外框、画廊位移或过早的红色校验提示。

## What I already know

* 生产接口 `GET /api/auth/providers` 当前返回 `{"providers":{"google":true}}`，后端容器也已注入 Google 配置。
* 登录按钮是否可用由 `useAuth` 请求 `/api/auth/providers` 决定，`LoginModal` 在未加载成功时显示“Google 登录未配置”。
* 发现页的尺寸选择位于 `LandingGenerationControls`，画廊通过固定图片宽高比渲染瀑布流。
* 登录表单字段在失焦后会立即运行校验并显示红色错误文案。
* `MorphicCardModal` 与通用 `.dialog`、`.beui-select-trigger` 共同控制登录弹层和尺寸选择器的边框/焦点表现。

## Assumptions

* 生产服务当前已使用最新后端环境变量；前端仍需保证 provider 请求异常时可重试，并避免把短暂加载状态误认为未配置。
* 画廊位移来自选择器交互导致的布局/焦点视觉变化，而不是需要重新加载图片数据。
* 用户期望字段在提交前不显示红色错误；失焦可记录 touched，但只有提交后才展示错误。

## Requirements

* Google provider 状态成功返回时，登录按钮可用并显示“使用 Google 继续”。
* 登录 provider 请求失败或未完成时，不泄漏配置细节，不阻塞用户名密码登录。
* 点击尺寸选择并选择新值后，顶部创作输入框和下方画廊保持原有位置与宽度，不出现额外白色外框。
* 登录弹层首次打开、切换字段或输入内容时不显示非必要的白色外框；保留可访问的键盘焦点指示。
* 用户只输入用户名或密码时不显示红色错误；提交后才显示对应字段错误，已触碰字段的失焦不改变此规则。

## Acceptance Criteria

* [x] `GET /api/auth/providers` 在生产返回 Google 已启用，登录按钮不是“未配置”。
* [x] 选择不同尺寸不会改变画廊首屏位置、列宽或图片数量。
* [x] 首次尺寸选择和登录弹层不出现额外白色环绕边框。
* [x] 用户名/密码输入阶段没有红色错误；空提交或无效提交后显示错误。
* [x] 前端 lint、typecheck、测试和生产构建通过。
* [x] 生产容器重新创建后健康检查通过，接口与页面回归验证完成。

## Definition of Done

* Tests added/updated for validation timing and affected UI state.
* Lint / typecheck / build green.
* 部署配置和验证结果记录在任务日志中。
* 代码改动与任务归档分别使用符合规范的中文 Git 提交。

## Out of Scope

* 不更换 Google OAuth 客户端或修改授权范围。
* 不重做画廊数据加载和图片资源。
* 不改变用户名/密码认证接口契约。

## Technical Notes

* 重点文件：`frontend/src/components/auth/LoginModal.tsx`、`frontend/src/components/ui/select-menu.tsx`、`frontend/src/components/premium/morphic-card-modal/morphic-card-modal.tsx`、`frontend/src/styles/base.css`。
* 生产检查：`curl https://pic.apioctiva.com/api/auth/providers`、Docker Compose backend 环境变量存在性、Playwright 页面交互。
* 验证结果：前端 34 个测试/137 个断言通过；后端串行 18 个测试文件/199 个测试通过；移动端 Playwright 无横向溢出，提交前/后校验错误分别为 0/2。
