# Ref2Image Studio

Ref2Image Studio 是一个面向创作者的 AI 图像生成工作台。它支持提示词生图、参考图生图、公开画廊、本地资产记录、用户登录和管理员额度管理，目标是把生图、回看、复用和管理放在同一个安静、克制的产品界面里。

## 功能概览

- 提示词生成图片，支持选择模型、数量和比例。
- 参考图上传生图，后端负责文件接收和本地输出存储。
- 发现页内置流式提示词示例，帮助用户快速开始创作。
- 生图工作区保留本次会话和历史生成结果，方便连续对比。
- 资产页按日期整理个人生成记录，支持查看详情和删除。
- 公开开关控制作品是否进入公开画廊。
- Better Auth 登录体系，支持用户名/密码登录，并可配置 Google OAuth。
- 管理员用户管理：创建用户、删除普通用户、设置每日生图额度。
- OpenAI-compatible `/v1/images/generations` 入口，方便外部客户端复用后端生成能力。

## 技术栈

### Frontend

- Vue 3
- Vue Router
- TypeScript
- Vite
- Element Plus
- Vitest + Vue Test Utils

### Backend

- Node.js + Express
- TypeScript
- Better Auth
- SQLite + Drizzle ORM
- better-sqlite3
- multer
- Vitest + Supertest

## 项目结构

```text
.
├── frontend/                 # Vue 前端应用
│   ├── src/components/       # 通用组件、登录弹窗、图库/资产组件
│   ├── src/composables/      # 鉴权、历史、管理员用户等组合式逻辑
│   ├── src/services/api/     # 前端 API client
│   ├── src/views/            # 发现/生图、资产、用户管理页面
│   └── tests/                # 前端测试
├── backend/                  # Express 后端服务
│   ├── drizzle/              # Drizzle migration 和 snapshot
│   ├── src/controllers/      # HTTP controller
│   ├── src/routes/           # API 路由
│   ├── src/services/         # 生成、历史、额度、用户管理服务
│   ├── src/db/               # SQLite / Drizzle schema
│   └── tests/                # 后端测试
├── PRODUCT.md                # 产品定位和设计原则
└── README.md
```

## 本地启动

### 1. 安装依赖

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 2. 配置环境变量

复制示例文件：

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

后端至少需要填写：

```env
IMAGE_API_BASE_URL=https://api.2api.example
IMAGE_API_KEY=replace-me
OPENAI_COMPAT_API_KEY=replace-me-openai-compat
BETTER_AUTH_SECRET=replace-me-with-a-random-secret
```

常用配置：

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3000
SQLITE_PATH=./data/app.sqlite
DAILY_USER_QUOTA=20
```

如需启用 Google 登录，配置：

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Google OAuth 回调地址：

```text
http://localhost:3000/api/auth/callback/google
```

本地演示可开启默认管理员种子：

```env
SEED_DEFAULT_ADMIN=true
```

开启后后端启动时会创建或提升默认管理员账号。生产环境不要使用弱默认凭据，请关闭该选项并使用安全账号策略。

### 3. 启动后端

```bash
npm --prefix backend run dev
```

后端默认监听：

```text
http://localhost:3000
```

启动时会自动应用 Drizzle migrations，并创建 SQLite 数据库文件。

### 4. 启动前端

```bash
npm --prefix frontend run dev
```

前端默认监听：

```text
http://localhost:5173
```

## 常用脚本

### Frontend

```bash
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test
```

### Backend

```bash
npm --prefix backend run dev
npm --prefix backend run build
npm --prefix backend run typecheck
npm --prefix backend run lint
npm --prefix backend run test
npm --prefix backend run db:generate
npm --prefix backend run db:migrate
```

## 主要页面

- `/`：发现页，展示提示词输入、流式示例和公开画廊。
- `/generate`：生图工作区，保留生成记录和结果流。
- `/history`：个人资产页，查看和管理本地生成历史。
- `/admin/users`：管理员用户管理页，仅管理员可用。

## 主要 API

- `GET /api/health`：健康检查。
- `POST /api/images/generations`：应用内生图接口。
- `GET /api/history`：读取当前用户历史。
- `POST /api/history`：写入生成历史。
- `GET /api/auth/me`：读取当前登录用户资料和管理员状态。
- `GET /api/admin/users`：管理员查看用户列表。
- `POST /api/admin/users`：管理员创建用户。
- `PATCH /api/admin/users/:id/quota`：管理员设置用户每日额度。
- `DELETE /api/admin/users/:id`：管理员删除普通用户。
- `POST /v1/images/generations`：OpenAI-compatible 生图接口。

## 额度与管理员

每个用户有独立的每日生图额度。后端使用 `user_quota` 表记录当天已用额度和可选的用户级每日总额度；未设置用户级额度时使用 `DAILY_USER_QUOTA`。

管理员能力由后端校验，前端隐藏入口只作为体验优化。当前管理员可创建用户、设置每日额度和删除普通用户，不能删除自己或受保护管理员账号。

## 存储说明

- SQLite 数据库默认位于 `backend/data/app.sqlite`。
- 上传参考图默认位于 `backend/tmp/uploads`。
- 生成结果默认位于 `backend/tmp/outputs`。
- 前端资产历史以浏览器本地状态为主，云端同步仍可继续扩展。

## 质量检查

提交前建议至少运行：

```bash
npm --prefix backend run typecheck
npm --prefix backend run lint
npm --prefix backend run test
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test
```

## GitHub About

建议仓库描述：

```text
A calm Vue + Express AI image generation studio for prompt/reference-image creation, local asset history, quotas, and admin user management.
```

建议 topics：

```text
vue, express, typescript, ai-image-generation, better-auth, sqlite, drizzle, vite
```
