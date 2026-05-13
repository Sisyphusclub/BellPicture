# Research: 鉴权栈选型（OAuth + Session + 库选择）

调研时间：2026-05-13。主会话 inline 调研（sub-agent dispatch 两次 Calcium-Ion 500 panic 后，用户授权 inline 推进；WebSearch / WebFetch 也被同一网关拦截，本文资料以 context7 MCP 为主，配合既有训练知识与官方 llms.txt）。

## 上下文

- **后端**：Node 20+ / Express 4 / TypeScript / ESM (`"type": "module"`)；已有依赖 `express` / `cors` / `multer` / `zod` / `pino`。零 DB。
- **前端**：Vue 3 + Vite + Vue Router SPA（5173 dev / 部署后可能同源也可能跨源）。
- **范围（PR1）**：OAuth 第三方登录 + user 表 + session + 鉴权中间件 + per-user quota；不上图片/历史云端化（PR2/PR3 再做）。
- **诉求**：solo dev，自托管，单实例，少依赖，能快速跑起来。

## 候选评估

### 1. `passport` + `passport-google-oauth20` / `passport-github2`

| 维度 | 评价 |
|---|---|
| 维护 | 老牌，活跃但生态保守 |
| ESM | passport 本体支持，但 strategy 包多为 CommonJS（动态 import 兼容性需要踩坑） |
| 学习成本 | 中等 —— Strategy / Serialize 心智模型老旧 |
| Session | 需要搭配 `express-session` + store；常见模式 |
| 适配多 provider | 每个 provider 一个独立 strategy 包 |

**结论**：能用，但在 ESM-only + 新项目里偏老气；和 zod / pino 等现代栈协调成本高。

### 2. `lucia-auth`（**已停更**）

Lucia 在 2024 年底由作者 pilcrow 宣布停止作为「library」维护，转型为 **开源学习资源**（教如何自己手写 session/OAuth）。仓库仍可用但**不建议新项目引入**。原因：作者认为 auth library 抽象过早；推荐路径是：

- OAuth 部分用 [`arctic`](https://arcticjs.dev)（同作者的轻量 OAuth client 库）
- Session 自己写（cookie + DB 表）

context7 内 `/websites/lucia-auth` 条目（83 snippets，远少于 v2/v3）也佐证这一现状。

### 3. `arctic`（pilcrowonpaper/arctic）

- 轻量 OAuth 2.0 客户端，支持 Google / GitHub / GitLab / Discord / Apple 等数十个 provider
- 仅做 OAuth：`createAuthorizationURL`、`validateAuthorizationCode`、refresh
- 不管 session、不管 DB
- 基于 Fetch API，runtime-agnostic（Node / Bun / Deno / Workers 都跑）
- 维护活跃（context7 `/websites/arcticjs_dev` 918 snippets）

**结论**：lightest 选项。代价：session 表、cookie 签发、CSRF state、PKCE 全部自己写。**对 solo dev 推进 MVP 来说是负担**。

### 4. `better-auth`（**重点候选**）

- 一站式：OAuth providers（内置 Google / GitHub / Apple / Discord / ...）+ session 管理 + DB adapter + 客户端 hooks
- 提供 `toNodeHandler` 直接挂到 Express 路由
- 直接支持 `better-sqlite3` 作为底层存储（也支持 Drizzle / Prisma adapter / Postgres / MongoDB）
- 自动生成 user / session / account / verification 表（CLI 也提供）
- Vue 客户端：`createAuthClient` + `useSession` composable，原生支持 Vue 3
- 内置 trustedOrigins、CORS 友好（cookie + `credentials: 'include'`）
- 维护活跃，2026 中文社区与生态可见度高（context7 多个高分条目）

**Express 集成最小样例**（来自 better-auth.com/llms.txt/docs/integrations/express）：

```typescript
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// ⚠️ 必须在 express.json() 之前
app.all('/api/auth/*', toNodeHandler(auth));
app.use(express.json());
```

**`auth.ts`** 配置：

```typescript
import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,        // http://localhost:3000
  database: new Database('./data/auth.sqlite'),
  trustedOrigins: ['http://localhost:5173'],   // Vite dev
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    // 后续按需追加：github / email magic link 等
  },
});
```

**Vue 客户端**：

```typescript
// frontend/src/lib/authClient.ts
import { createAuthClient } from 'better-auth/vue';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_BASE_URL, // http://localhost:3000
});

// 组件里：
const session = authClient.useSession();
await authClient.signIn.social({ provider: 'google' });
await authClient.signOut();
```

**Express 中间件取 session**：

```typescript
import { fromNodeHeaders } from 'better-auth/node';

export async function requireAuth(req, res, next) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  req.user = session.user;
  next();
}
```

### 5. `@auth/express`（Auth.js for Express）

Next.js 阵营的 Auth.js 推到 Express 的官方适配。功能完整但 Auth.js 的核心心智仍是 Next.js / Server Actions，迁移到 Express 体感稍隔，Vue 侧客户端 SDK 不如 better-auth 原生。**不推荐**。

### 6. 完全自己撸（`openid-client` / `oauth4webapi`）

最透明，控制力最强，但 session 表 / state 防护 / refresh / multi-provider 全要自己写。**Solo dev 推 MVP 不划算**。

## Session 策略对比

| 方案 | 安全 | 复杂度 | 多端 | logout 即时 | 推荐 |
|---|---|---|---|---|---|
| httpOnly cookie + 服务端 session（DB） | XSS 抗性强，CSRF 用 SameSite=Lax + state 防 | 中（DB 表） | ✅ | ✅（删 session 行立即失效） | **PR1 推荐** |
| httpOnly cookie + JWT | 不需 session 表，但「立即吊销」难（要黑名单） | 低 | ✅ | 难 | 不推荐 |
| Authorization header bearer JWT | SPA 友好但需自己存 token（localStorage → XSS 风险） | 低 | ✅ | 难 | 不推荐 |

**Better Auth 默认就是 httpOnly cookie + DB session**，正合所需。

## Recommended for this project

**采用 `better-auth` + `better-sqlite3`**：

| 项 | 选择 |
|---|---|
| OAuth | `better-auth` 内置 Google provider（PR1 起步只接一家） |
| Session | better-auth 默认 httpOnly cookie + DB（自动建 `session` 表） |
| DB | `better-sqlite3` 直接驱动；零额外依赖，无独立 DB 进程 |
| ORM | **PR1 暂不引入 drizzle**；better-auth 自动维护它的 4 张表，per-user quota 可以暂时在内存 Map 里跑 |
| Vue 客户端 | `better-auth/vue` 的 `createAuthClient` + `useSession` |
| 鉴权中间件 | 自定义 `requireAuth(req, res, next)` 调 `auth.api.getSession`，挂到 `/api/images*` |
| 跨域 | CORS `credentials: true` + 前端 fetch `credentials: 'include'` + `trustedOrigins` 列入 Vite origin |

### 理由总结

1. **最小成本拿齐所有零件**：OAuth state/PKCE、cookie 签名、session 表、refresh、Vue composable 一站搞定
2. **可演进**：PR2 加 image_records 时，可在同一个 SQLite DB 上加 drizzle，无迁移负担
3. **可替换 provider**：socialProviders 是 map，后续加 GitHub / Apple 只是改一行配置
4. **稳定的退场路径**：未来若要换 Postgres，Better Auth 提供 Postgres adapter；要换底层 ORM 也提供 drizzle/prisma adapter

### 已知坑位

- `toNodeHandler` 必须挂在 `express.json()` 之前（官方文档强调）
- Vite dev 跨域时 cookie 需要 `SameSite=Lax` 或部署同源；生产建议同源（反向代理把 `/api` 转到 backend）
- Google OAuth client：需要在 Google Cloud Console 配置 OAuth client + 添加重定向 URI（`{BETTER_AUTH_URL}/api/auth/callback/google`）

### 环境变量增量（写入 `.env.example`）

```
# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-me   # openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=replace-me
GOOGLE_CLIENT_SECRET=replace-me

# Frontend origin (CORS)
FRONTEND_ORIGIN=http://localhost:5173
```

## 参考

- Better Auth 官方 llms.txt（context7 `/llmstxt/better-auth_llms_txt`）
- Better Auth Express integration: https://www.better-auth.com/docs/integrations/express
- Better Auth Vue integration: https://www.better-auth.com/docs/integrations/vue
- Better Auth SQLite adapter: https://www.better-auth.com/docs/adapters/sqlite
- Arctic: https://arcticjs.dev
- Lucia（已停更，转学习资源）: https://lucia-auth.com
