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

## Assumptions (temporary)

* Google OAuth 新用户默认是普通用户，不因 Google 昵称、姓名或邮箱前缀为 `Blur` 而自动获得管理员权限。

## Open Questions

* `Blur` 是否也必须能通过 Google OAuth 登录到同一个管理员身份，还是仅继续使用现有用户名/密码登录。

## Requirements

* 配置目标环境的 Google Web OAuth Client ID 与 Client Secret。
* 将 Google Cloud Console 的授权重定向 URI 设置为 `${BETTER_AUTH_URL}/api/auth/callback/google`。
* 保证 `BETTER_AUTH_URL`、`FRONTEND_ORIGIN`、`CORS_ORIGIN` 使用同一可访问 origin，避免 OAuth state/cookie 与 CORS 不匹配。
* 启动后验证 `/api/auth/providers` 返回 `{"providers":{"google":true}}`，并验证前端按钮可用、回调能回到发起登录的页面。
* 不把 Client Secret 写入前端代码、提交历史或日志。
* 启用 Google OAuth 不得改变 `Blur` 的管理员权限，也不得把其他 Google 账号自动提升为管理员。

## Acceptance Criteria

* [ ] 目标环境已填写 `GOOGLE_CLIENT_ID` 与 `GOOGLE_CLIENT_SECRET`。
* [ ] Google Cloud OAuth 客户端包含精确回调 URI。
* [ ] `/api/auth/providers` 在配置完成后返回 `google: true`。
* [ ] 未配置凭据时应用仍能启动，Google 按钮保持禁用。
* [ ] 配置变更通过必要的后端/前端测试与启动检查。
* [ ] Google OAuth 登录不会基于昵称、姓名或邮箱前缀授予管理员权限。

## Definition of Done

* 环境配置或模板文档已更新，且不包含真实 Secret。
* 相关测试、lint、typecheck 通过。
* 只提交本任务相关文件。

## Out of Scope

* 不创建或代管 Google Cloud 项目、OAuth 客户端或真实凭据。
* 不改变 Better Auth 数据库 schema、用户名登录规则或权限模型。

## Technical Notes

* 本地 Compose 回调通常为 `http://localhost:5173/api/auth/callback/google`。
* 直接本地开发后端时回调通常为 `http://localhost:3000/api/auth/callback/google`，但浏览器入口和 cookie origin 应与实际代理拓扑保持一致。
* 相关代码：`backend/src/config/auth.ts`、`backend/src/routes/auth.ts`、`frontend/src/hooks/useAuth.tsx`、`frontend/src/components/auth/LoginModal.tsx`、`docker-compose.yml`、`.env.docker.example`。
