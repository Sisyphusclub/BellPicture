# 配置谷歌登录

## Goal

让 Nebulens 的 Google OAuth 登录在目标部署环境中可用，并保持现有 Better Auth 用户名/密码登录、当前页面回调和未配置时的禁用状态。

## What I already know

* 后端已在 `backend/src/config/auth.ts` 中按环境变量条件注册 Google provider。
* 后端公开 `GET /api/auth/providers`，前端根据该状态显示或禁用 Google 登录按钮。
* `signInWithGoogle` 使用当前页面作为 `callbackURL` 和 `errorCallbackURL`。
* Docker Compose 从根目录 `.env` 注入 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`BETTER_AUTH_URL`、`FRONTEND_ORIGIN` 与 `CORS_ORIGIN`。
* 当前根目录 `.env` 的 Google 凭据为空，现状会让 Google 按钮保持禁用。
* 管理员账号为用户名 `Blur`（系统按规范化用户名 `blur` 识别），管理员状态存储在后端 `user.isAdmin` 字段中。
* 原公网 `http://` IP 已迁移到 `https://pic.apioctiva.com`，Caddy 负责 TLS 与反向代理。
* Google OAuth 的前后端代码链路已由提交 `3e36fd4` 接通，包括 provider 状态接口、登录按钮、当前页回调和测试。
* 用户明确要求将 Google 账号登录纳入本次交付。

## Assumptions (temporary)

* 真实 Google OAuth 凭据由部署方提供，不进入 Git 历史。

## Open Questions

* Google OAuth Client ID/Secret 尚待部署方提供，并需在 Google Cloud Console 登记精确回调 URI。

## Requirements

* 配置目标环境的 Google Web OAuth Client ID 与 Client Secret。
* 将 Google Cloud Console 的授权重定向 URI 设置为 `https://pic.apioctiva.com/api/auth/callback/google`。
* 保证 `BETTER_AUTH_URL`、`FRONTEND_ORIGIN`、`CORS_ORIGIN` 使用同一可访问 origin，避免 OAuth state/cookie 与 CORS 不匹配。
* 启动后验证 `/api/auth/providers` 返回 `{"providers":{"google":true}}`，并验证前端按钮可用、回调能回到发起登录的页面。
* 不把 Client Secret 写入前端代码、提交历史或日志。
* 启用 Google OAuth 不得改变 `Blur` 的管理员权限，也不得把其他 Google 账号自动提升为管理员。
* `Blur` 继续使用现有用户名/密码登录；Google OAuth 新用户一律作为普通用户，不与 `Blur` 管理员身份自动绑定。
* 本地开发允许使用 `http://localhost:5173`，生产部署必须使用 HTTPS 域名，并将三个公开 origin 配置为同一个地址。

## Acceptance Criteria

* [ ] 目标环境已填写 `GOOGLE_CLIENT_ID` 与 `GOOGLE_CLIENT_SECRET`。
* [ ] Google Cloud OAuth 客户端包含精确回调 URI。
* [ ] `/api/auth/providers` 在配置完成后返回 `google: true`。
* [x] 生产 HTTPS 域名已启用，三个公开 origin 均为 `https://pic.apioctiva.com`。
* [x] 未配置凭据时应用仍能启动，Google 按钮保持禁用。
* [x] 配置变更通过必要的后端/前端测试与启动检查。
* [x] Google OAuth 登录不会基于昵称、姓名或邮箱前缀授予管理员权限。
* [x] Google 登录按钮在 provider 已配置时可用，未配置时明确禁用。
* [x] 自动化测试覆盖 provider 状态、前端按钮状态和 OAuth 回调参数。

## Definition of Done

* 环境配置或模板文档已更新，且不包含真实 Secret。
* 相关测试、lint、typecheck 通过。
* 只提交本任务相关文件。

## Technical Approach

* 沿用 Better Auth 的 `socialProviders.google`，仅在 Client ID 与 Client Secret 同时存在时注册 provider。
* 通过公开的 `/api/auth/providers` 返回布尔能力状态，不向浏览器暴露 Secret。
* 前端通过 Better Auth `signIn.social({ provider: 'google' })` 发起 OAuth，并显式把成功和错误回调设为当前页面。
* 继续由后端持久化的 `user.isAdmin` 判定权限；Google 用户使用默认 `false`。
* 部署时把 HTTPS origin 同步写入 `FRONTEND_ORIGIN`、`CORS_ORIGIN`、`BETTER_AUTH_URL`，并在 Google Cloud Console 登记 `${BETTER_AUTH_URL}/api/auth/callback/google`。

## Out of Scope

* 不创建或代管 Google Cloud 项目、OAuth 客户端或真实凭据。
* 不改变 Better Auth 数据库 schema、用户名登录规则或权限模型。
* 不实现 `Blur` 管理员账号与 Google 账号的绑定、合并或 Google 管理员登录。

## Decision (ADR-lite)

**Context**: Google OAuth 账号可独立创建用户，但管理员 `Blur` 已通过持久化的 `isAdmin` 状态和用户名/密码登录建立明确权限边界。

**Decision**: `Blur` 仅使用用户名/密码登录；Google OAuth 只创建或登录普通用户，不通过昵称、姓名、邮箱前缀或其他可伪造资料推断管理员身份。

**Consequences**: 本次配置无需引入账号绑定或身份合并逻辑；管理员不能使用 Google 按钮进入 `Blur` 身份。

## Technical Notes

* 本地 Compose 回调通常为 `http://localhost:5173/api/auth/callback/google`。
* 直接本地开发后端时回调通常为 `http://localhost:3000/api/auth/callback/google`，但浏览器入口和 cookie origin 应与实际代理拓扑保持一致。
* 相关代码：`backend/src/config/auth.ts`、`backend/src/routes/auth.ts`、`frontend/src/hooks/useAuth.tsx`、`frontend/src/components/auth/LoginModal.tsx`、`docker-compose.yml`、`.env.docker.example`。

## Research References

* [`research/google-oauth-redirect-requirements.md`](research/google-oauth-redirect-requirements.md) — Google Web OAuth 回调必须精确匹配，生产环境要求 HTTPS 且不接受原始公网 IP。

## Implementation Plan

1. 核对并补齐 Google provider、能力状态接口和登录交互。
2. 补齐生产 HTTPS 回调与凭据配置说明，避免误用公网 HTTP IP。
3. 运行后端/前端定向测试及完整质量检查。
4. 使用运行中服务验证未配置凭据时的禁用状态；真实凭据到位后重建服务并验证 `google: true` 与完整回调。

## QA Evidence

* Google OAuth 配置修复提交：`3c3b9a0`。
* `Blur` 管理员修复提交：`5d16ba8`。
* 后端：lint、typecheck、build、format 均通过；全量测试 `197/197` 通过，新增配置测试后定向测试 `13/13` 通过。
* 前端：组件来源检查、lint、typecheck、build、format 均通过；全量测试 `131/131` 通过。
* Compose 配置校验通过；重建后 `/api/health/ready` 返回 `status: ok`。
* 当前未配置 Google 凭据，`/api/auth/providers` 按设计返回 `google: false`。
* 运行数据库已在线备份至数据卷 `app.sqlite.pre-blur-admin-20260905`，现有规范化用户名 `blur` 已回读确认为 `isAdmin=1`。
* DNS `pic.apioctiva.com` 解析到当前服务器；Caddy 配置 `/etc/caddy/sites/pic.apioctiva.com.caddy` 已验证并热重载，Let's Encrypt 证书签发成功。
* `http://pic.apioctiva.com` 返回 308 到 HTTPS；HTTPS 首页和 `/api/health/ready` 返回 200。
* 后端容器已使用 `https://pic.apioctiva.com` 作为 `BETTER_AUTH_URL`、`FRONTEND_ORIGIN`、`CORS_ORIGIN` 重建。
