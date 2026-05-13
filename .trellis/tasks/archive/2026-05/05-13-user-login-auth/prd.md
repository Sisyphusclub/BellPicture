# 登录功能（PR1：OAuth + 鉴权 + per-user quota）

## Goal

为 Ref2Image Studio 引入 Google OAuth 第三方登录与多用户身份；未登录用户无法消费 `/api/images*`；GPT_POOL_QUOTA 改为 per-user daily quota，避免开放注册下的成本失控。历史与图片二进制留在本地（IndexedDB + 共享 OUTPUT_DIR），分别由后续 PR2 / PR3 处理。

## Resolved Decisions

| # | 议题 | 答案 |
|---|---|---|
| 1 | 登录定位 | 第三方登录（OAuth） |
| 2 | 解锁什么 | 多人使用，每人独立资源 |
| 3 | 历史归属（远期） | 上云 |
| 4 | 本轮 MVP 范围 | PR1：OAuth + user 表 + session + 鉴权中间件 + per-user quota；历史/图片暂留本地 |
| 5 | 鉴权栈 | Approach A — Better Auth + better-sqlite3 + httpOnly cookie session |
| 6 | OAuth provider（PR1） | 仅 Google |
| 7 | 注册策略 | 开放注册（凭 per-user quota 控成本） |
| 8 | per-user quota | **每日重置**（env `DAILY_USER_QUOTA`，记录 `quota_used_today` + `quota_date`） |
| 9 | 登录 UX | 顶栏「登录」按钮 → modal 弹窗 → Continue with Google |
| 10 | 未登录访问受保护路由/调 API | 自动弹出登录 modal（401 时全局拦截亦触发） |

## Research References

- [`research/auth-stack.md`](research/auth-stack.md) — Better Auth Express + Vue 集成、cookie 跨域、Google provider 接入要点
- [`research/db-orm.md`](research/db-orm.md) — better-sqlite3 + WAL 启用；PR1 暂不引入 ORM，PR2 再加 drizzle

## Technical Approach

### 后端

**依赖增量**：
- `better-auth`（鉴权 + session + Google provider）
- `better-sqlite3`（SQLite native driver）

**新增文件**：
- `backend/src/config/auth.ts` — `betterAuth(...)` 实例
- `backend/src/db/sqlite.ts` — `better-sqlite3` 单例，启用 WAL
- `backend/src/middlewares/requireAuth.ts` — 校验 session，挂前注入 `req.user`
- `backend/src/services/userQuota.service.ts` — per-user 每日 quota（替换/补充 `quota.service.ts`）

**修改文件**：
- `backend/src/app.ts` — CORS 加 `credentials: true`、注册 `/api/auth/*` Better Auth handler（必须在 `express.json()` 之前）、images router 前挂 `requireAuth`
- `backend/src/config/env.ts` — 新增 `BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `FRONTEND_ORIGIN` / `SQLITE_PATH` / `DAILY_USER_QUOTA`
- `backend/.env.example` — 同步
- `backend/src/services/quota.service.ts` 或新建 `userQuota.service.ts` —— per-user daily 计数（按 server 当地日期切片）
- `backend/src/controllers/images.controller.ts` — 改用 `req.user.id` 触发 quota 检查与扣减
- `backend/src/routes/images.ts` — 镜像 quota endpoint 改为返回当前用户的 daily quota

**Better Auth 自动建表**：`user` / `session` / `account` / `verification` —— 落在 `SQLITE_PATH` 指向的单一文件。

**Quota 数据模型**（写入同一 SQLite，PR1 用 raw SQL；PR2 切 drizzle）：
```sql
CREATE TABLE user_quota (
  user_id    TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  used_today INTEGER NOT NULL DEFAULT 0,
  quota_date TEXT    NOT NULL              -- ISO date 'YYYY-MM-DD'
);
```

### 前端

**依赖增量**：
- `better-auth/vue`（Better Auth 的 Vue 客户端，随 `better-auth` 同包导出）

**新增文件**：
- `frontend/src/lib/authClient.ts` — `createAuthClient({ baseURL })`
- `frontend/src/composables/useAuth.ts` — 封装 `useSession()` + `signIn` / `signOut` + 错误处理
- `frontend/src/components/auth/LoginModal.vue` — Element Plus dialog + 「Continue with Google」按钮
- `frontend/src/stores/authModal.ts`（或简单 composable）— 全局控制 modal 开关，401 拦截器使用

**修改文件**：
- `frontend/src/services/api/imagesApi.ts` — fetch 加 `credentials: 'include'`；遇 401 触发 modal 打开
- `frontend/src/components/common/AppHeader.vue` — 「登录」按钮在未登录态打开 modal；已登录时显示头像 / 名字 / 退出
- `frontend/src/router/index.ts` — 全局守卫：未登录访问 `/` 与 `/history` 不重定向，但触发全局 modal 显示
- `frontend/src/App.vue` 或 root layout — 挂载 `<LoginModal />` 全局单例

### 跨域 / Cookie

- Dev：Vite 5173 → backend 3000，Better Auth session cookie 走 `SameSite=Lax`；前端 fetch 全部 `credentials: 'include'`；CORS `origin: FRONTEND_ORIGIN, credentials: true`
- Prod 建议同源反向代理 `/api → backend`，cookie 自然 first-party

### 现有 IndexedDB 历史

PR1 不动 `useImageHistory`。已存在的 per-browser 本地历史保持现状；PR2 引入 server-side history 时再迁移策略。

## Requirements

1. **后端 Auth 端点**：`/api/auth/*`（Better Auth 自动处理 Google OAuth 完整流程：发起、callback、session、get-session、signOut）
2. **鉴权中间件**：`requireAuth` 挂在 `/api/images*`；未登录返回 `401 { error: { code: 'UNAUTHORIZED' } }`
3. **per-user daily quota**：每天首次生成时若 `quota_date != today` 则重置为 `DAILY_USER_QUOTA`；超限返回 `402` 或类似业务码（沿用现有 `AppError` 体系）
4. **Quota endpoint**：保留 `/api/images/quota` 但改为返回当前用户的剩余 daily quota
5. **前端 LoginModal**：Element Plus dialog，「Continue with Google」按钮调 `authClient.signIn.social({ provider: 'google' })`；登录成功自动关闭
6. **顶栏切换**：未登录 → 「登录」按钮；已登录 → 头像（Better Auth user 表带 image）+ 名字 + 下拉「退出登录」
7. **401 全局拦截**：`imagesApi` 收到 401 时通过 modal store 打开 modal
8. **PRODUCT.md 同步更新**：「用户」段从单人本地工作流改为「多账号工作台 + 每日额度」定位

## Acceptance Criteria

- [ ] **AC1**：未登录调用 `POST /api/images/generate` → 401 `UNAUTHORIZED`
- [ ] **AC2**：点顶栏「登录」→ modal 弹出 →「Continue with Google」→ Google 授权 → 回到原页面 → 顶栏显示账号
- [ ] **AC3**：A 账号在第 N 天用满 `DAILY_USER_QUOTA`，B 账号同一天仍可生成（quota 隔离）
- [ ] **AC4**：A 账号跨日（server date 切换）后再次调用，`used_today` 自动归零、可继续生成
- [ ] **AC5**：已登录用户点「退出登录」→ session cookie 失效 → 下一次调 API 收到 401
- [ ] **AC6**：未登录用户直接发起生成（如手动调 fetch）→ 全局 401 拦截 → modal 自动弹出
- [ ] **AC7**：backend `vitest` + frontend `vitest` 全绿；`typecheck` + `lint` 全绿
- [ ] **AC8**：`.env.example` 含 7 个新 env；`PRODUCT.md` 同步更新

## Definition of Done

- 单测：`requireAuth` 中间件、`userQuota` 服务（重置 / 扣减 / 隔离）、`useAuth` composable、`LoginModal` 组件
- 集成测：受保护路由 401 / 200；OAuth callback 流程（mock provider 或 better-auth 内置测试工具）
- `vitest` + `typecheck` + `lint` + 既有 e2e smoke（05-12 任务）全绿
- `backend/.env.example`、`PRODUCT.md` 同步更新
- README 或 spec 文件记录 Google Cloud OAuth client 配置步骤（开发者本地需要自己注册）

## Decision (ADR-lite)

**Context**: 项目从「单人本地创作工具」演进为「多账号工作台」。需要在 PR1 完成 OAuth + 鉴权骨架，同时避免一口气把历史/图片全云端化的范围爆炸。

**Decision**:
- 鉴权栈：**Better Auth + better-sqlite3 + httpOnly cookie session**（一站式，最低 ops 成本）
- Provider：**仅 Google**（一站式 + 国际通用）
- 注册：**开放**，凭 per-user daily quota 兜底
- 范围：PR1 不动历史 / 图片二进制 / OUTPUT_DIR，留给 PR2 / PR3

**Consequences**:
- 引入第一份持久化（SQLite 文件），部署增加一个数据目录与备份要求
- Better Auth 是相对新的库，需要锁版本并跟踪 breaking change；好处是退场路径明确（可换 Postgres adapter / drizzle adapter）
- per-user daily quota 用 server 当地日期切片 → 多时区用户可能感知到「重置时间不齐」；PR4 再决定要不要按用户时区
- IndexedDB 本地历史与 server-side user 不绑定，多设备登录看不到对方的历史 —— PR2 后才能修

## Out of Scope（本任务）

- 历史 / 图片 / 元数据上云（PR2、PR3）
- 图片二进制按 userId 隔离目录与鉴权访问（PR3）
- 多 provider（GitHub / 邮箱 magic link）扩展
- 用户头像上传、profile 编辑
- 配额补给后台、付费档位、邀请码
- 多端历史同步、按用户时区切日
- 复杂权限模型（admin / 公开分享）

## Implementation Plan（按顺序提交一个 PR）

1. **后端基建**
   - 安装 `better-auth` + `better-sqlite3`
   - `backend/src/db/sqlite.ts`（DB 单例 + WAL + foreign_keys）
   - `backend/src/config/env.ts` 新增 env；`.env.example` 同步
   - `backend/src/config/auth.ts`（`betterAuth(...)` 配置）
   - `backend/src/app.ts` 挂载 `/api/auth/*`、CORS credentials
2. **鉴权中间件 + 配额改造**
   - `backend/src/middlewares/requireAuth.ts`
   - `backend/src/services/userQuota.service.ts`（建表 + 重置 + 扣减 + getRemaining）
   - 替换 `imagesApi`/controller 内的 quota pool 调用
   - 受保护路由挂上 `requireAuth`
3. **前端 auth 接入**
   - `frontend/src/lib/authClient.ts`、`composables/useAuth.ts`
   - `components/auth/LoginModal.vue` + 全局 store
   - `AppHeader.vue` 已登录态 UI、退出
   - `imagesApi` 加 `credentials: 'include'` + 401 拦截
   - 路由守卫触发 modal
4. **测试 + 文档**
   - backend / frontend unit + integration
   - `PRODUCT.md` 更新；README 写 Google Cloud client 配置步骤

## Technical Notes

- Better Auth Express integration 已知坑：`toNodeHandler` 必须挂在 `express.json()` 之前
- `better-sqlite3` 是 native module —— CI / 部署机需要支持编译或预编译二进制
- WAL 模式下备份：复制 `.sqlite` + `-wal` + `-shm` 三文件，或用 `db.backup()`
- 开发者本地需要先在 Google Cloud Console 创建 OAuth client，授权回调 URI = `{BETTER_AUTH_URL}/api/auth/callback/google`
- 当前 `useImageHistory` 在 IndexedDB；PR1 后多用户共用同一 IndexedDB 库 = 设计缺陷但不在本任务修复

## 环境变量增量（写入 `backend/.env.example`）

```
# --- Better Auth ---
# Base URL of this backend, used by Better Auth to build OAuth callback URLs.
BETTER_AUTH_URL=http://localhost:3000
# Secret for signing session cookies. Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=replace-me

# --- Google OAuth ---
# Configure in Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client.
# Authorized redirect URI: ${BETTER_AUTH_URL}/api/auth/callback/google
GOOGLE_CLIENT_ID=replace-me
GOOGLE_CLIENT_SECRET=replace-me

# --- Frontend origin (CORS) ---
FRONTEND_ORIGIN=http://localhost:5173

# --- SQLite ---
SQLITE_PATH=./data/app.sqlite

# --- Per-user daily quota ---
# Each new day a user's used count is reset to 0; this many generations allowed/day.
DAILY_USER_QUOTA=20
```
