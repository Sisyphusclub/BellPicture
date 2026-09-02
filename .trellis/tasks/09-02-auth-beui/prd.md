# 登录注册统一为 beUI

## Goal

将登录/注册账户弹窗统一到 Nebulens 已采用的 beUI/shadcn 组件体系，保留现有认证能力与中文交互，同时让弹窗、模式切换、字段、错误提示和操作按钮拥有一致的语义、焦点与响应式表现。

## What I already know

- 认证入口集中在 `frontend/src/components/auth/LoginModal.tsx`，当前使用共享 `Button` 与 `Input`，但弹窗、登录/注册切换和错误消息仍为页面级手写结构。
- 项目通过 `components.json` 配置 beUI 与 beUI Pro registry，`src/components/ui` 和 `src/components/premium` 是允许的组件边界。
- 认证逻辑由 `useAuth` 与 `useAuthModal` 提供，不能改变用户名规则、Google 登录、Escape/背景关闭、提交中禁用和现有测试语义。
- 项目设计上下文要求深色、克制、未来感，beUI Pro 是权威组件与交互来源。

## Requirements

- 登录与注册共用一个 beUI 风格的账户弹窗表面，不新增第二套认证流程。
- 使用共享语义组件完成 Dialog、Tabs/segmented mode、Input、Alert/inline error、Button 等可见交互。
- 保持现有中文文案、用户名/密码校验、密码显示切换、Google 登录、pending 状态和认证成功后的关闭行为。
- 保持可访问性：dialog 名称、初始焦点、Escape 关闭、背景安全关闭、键盘 Tab 循环、字段错误关联。
- 登录和注册在桌面与窄屏均可用，字段和按钮不得溢出或错位。

## Acceptance Criteria

- [x] 登录模式默认显示，切换到注册后提交仍调用 `signUpWithUsername`。
- [x] 所有可见控件来自共享 beUI/ui 组件边界，不引入竞争组件库或原生可见控件。
- [x] 字段错误仅在 blur/提交后出现，错误提示和提交中状态保持现有行为。
- [x] 关闭按钮、Escape、背景点击和密码显示按钮可用且有可访问名称。
- [x] 相关组件测试、lint、typecheck、build 与本次文件格式检查通过。
- [x] 在 1440px 和 390px 视口检查弹窗的对齐、可读性和无水平溢出。

## Definition of Done

- 测试覆盖认证交互与组件结构的用户可见行为。
- 前端质量门禁全部通过。
- 只提交本任务相关的代码与测试文件，不夹带工作区其他修改。

## Technical Approach

在现有共享 `Button`/`Input` 基础上增加轻量的 beUI 语义适配组件（Dialog、Tabs、Alert），由 `LoginModal` 组合使用。适配组件只负责语义、焦点和视觉契约，不复制完整外部 registry block，避免把只支持邮箱/姓名的 `signup-form` 误用于当前用户名认证。

## Out of Scope

- 不改变 Better Auth API、后端认证协议或用户名规则。
- 不新增邮箱验证、找回密码、条款勾选等账户能力。
- 不改动其他页面的登录入口或业务权限判断。

## Technical Notes

- 参考 beUI registry：`@beui/signup-form` 提供字段错误、密码显示和提交状态的交互原则；`@beui/morphing-modal` 提供深色 modal 的动效方向，但其内容字段不适合直接复用。
- 相关文件：`frontend/src/components/auth/LoginModal.tsx`、`frontend/src/components/ui/*`、`frontend/src/styles/base.css`、`frontend/tests/components/LoginModal.spec.tsx`。
