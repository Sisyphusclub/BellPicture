<h1 align="center">Nebulens</h1>

<p align="center">免费闭环的 AI 图像生成工作台</p>
<p align="center">提示词生图 · 参考图生图 · 资产历史 · 用户额度管理</p>

<p align="center">
  <a href="#功能亮点">功能亮点</a> ·
  <a href="#页面截图">页面截图</a> ·
  <a href="#docker-compose-快速启动">Docker Compose</a> ·
  <a href="#本地开发">本地开发</a> ·
  <a href="#api-入口">API</a>
</p>

---

Nebulens 面向需要稳定创作、回看、复用和管理 AI 图像结果的个人创作者与小团队。它把发现灵感、生成图片、查看资产、公开作品和管理员额度控制放在同一个产品界面里，尽量减少噪音，保留清晰的创作节奏。

## 页面截图

| 发现页                                   | 生图工作区                                       | 资产页                                      |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| ![发现页截图](docs/screenshots/home.png) | ![生图工作区截图](docs/screenshots/generate.png) | ![资产页截图](docs/screenshots/history.png) |

## 功能亮点

- 提示词生图：支持模型、数量、比例和公开状态配置。
- 参考图生图：上传参考图后由后端接收文件并保存本地输出。
- 发现页灵感输入：内置流式提示词示例，帮助用户快速开始。
- 生图工作区：保留本次会话中的生成记录，方便连续对比。
- 资产页：按日期整理个人生成历史，支持预览详情和删除。
- 公开画廊：通过公开开关控制作品是否进入公开展示。
- 登录体系：Better Auth 用户名/密码登录，可选 Google OAuth。
- 管理员控制台：创建用户、删除普通用户、设置每日生图额度。
- OpenAI-compatible API：提供 `/v1/images/generations` 入口，方便外部客户端复用。

## 技术栈

| 层         | 技术                                                           |
| ---------- | -------------------------------------------------------------- |
| Frontend   | React 19, React Router, TypeScript, Vite, Tailwind CSS, Vitest |
| Backend    | Node.js, Express, TypeScript, Better Auth, SQLite, Drizzle ORM |
| Storage    | SQLite 数据库, 本地上传目录, 本地输出目录                      |
| Deployment | Docker Compose, nginx, persistent Docker volumes               |

## Docker Compose 快速启动

Docker Compose 适合单机本地或轻量生产式部署。后端容器运行编译后的 Express 服务，启动时自动执行 Drizzle migrations；前端容器使用 nginx 托管 Vite 静态产物，并同源代理 `/api` 和 `/v1` 到后端。后端端口默认不暴露到宿主机。

> Compose 只读取仓库根目录 `.env` 进行变量插值，不读取 `backend/.env` 或 `frontend/.env`。

### 1. 准备环境变量

```bash
cp .env.docker.example .env
```

至少填写：

```env
IMAGE_API_BASE_URL=https://api.2api.example
# 可选：管理员 2K/4K 专用上游，例如 Codex 图像通道。
HIGH_RES_IMAGE_API_BASE_URL=
IMAGE_API_KEY=replace-me
# 可选：管理员 2K/4K 专用上游密钥；留空则复用 IMAGE_API_KEY。
HIGH_RES_IMAGE_API_KEY=
OPENAI_COMPAT_API_KEY=replace-me-openai-compat
BETTER_AUTH_SECRET=replace-me-with-a-random-32-byte-secret
```

常用公开访问配置：

```env
FRONTEND_PORT=5173
FRONTEND_ORIGIN=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
BETTER_AUTH_URL=http://localhost:5173
VITE_API_BASE_URL=
TRUST_PROXY_HOPS=1
```

如需启用 Google 登录，在 `.env` 中填写：

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Google OAuth 回调地址配置为：

```text
http://localhost:5173/api/auth/callback/google
```

### 2. 启动服务

```bash
docker compose up --build
```

后台启动：

```bash
docker compose up -d --build
```

如果上游生图服务运行在另一个 Docker 网络中，再显式叠加可选配置：

```bash
PROVIDER_NETWORK=your-provider-network docker compose -f docker-compose.yml -f docker-compose.provider.yml up -d --build
```

启动后访问：

```text
http://localhost:5173
```

查看日志：

```bash
docker compose logs -f backend frontend
```

停止容器但保留数据卷：

```bash
docker compose down
```

如需同时清空数据库、上传参考图和生成结果：

```bash
docker compose down -v
```

## 本地开发

### 1. 安装依赖

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

后端至少需要：

```env
IMAGE_API_BASE_URL=https://api.2api.example
# 可选：管理员 2K/4K 专用上游，例如 Codex 图像通道。
HIGH_RES_IMAGE_API_BASE_URL=
IMAGE_API_KEY=replace-me
# 可选：管理员 2K/4K 专用上游密钥；留空则复用 IMAGE_API_KEY。
HIGH_RES_IMAGE_API_KEY=
OPENAI_COMPAT_API_KEY=replace-me-openai-compat
BETTER_AUTH_SECRET=replace-me-with-a-random-secret
```

常用后端配置：

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3000
SQLITE_PATH=./data/app.sqlite
DAILY_USER_QUOTA=20
```

本地 Google OAuth 回调地址：

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

### 4. 启动前端

```bash
npm --prefix frontend run dev
```

前端默认监听：

```text
http://localhost:5173
```

## 环境变量

| 变量                          | 必需 | 说明                                                                                    |
| ----------------------------- | ---- | --------------------------------------------------------------------------------------- |
| `IMAGE_API_BASE_URL`          | 是   | 图像生成服务地址                                                                        |
| `HIGH_RES_IMAGE_API_BASE_URL` | 否   | 管理员 2K/4K 专用图像生成服务地址；留空则复用 `IMAGE_API_BASE_URL`                      |
| `IMAGE_API_KEY`               | 是   | 图像生成服务密钥                                                                        |
| `HIGH_RES_IMAGE_API_KEY`      | 否   | 管理员 2K/4K 专用图像生成服务密钥；留空则复用 `IMAGE_API_KEY`                           |
| `OPENAI_COMPAT_API_KEY`       | 是   | OpenAI-compatible API 调用密钥                                                          |
| `BETTER_AUTH_SECRET`          | 是   | Better Auth 会话密钥                                                                    |
| `IMAGE_MODEL`                 | 否   | 默认图像模型，默认 `gpt-image-2`                                                        |
| `HIGH_RES_IMAGE_MODEL`        | 否   | 管理员 2K/4K 专用模型名，例如 `codex-gpt-image-2`；留空则沿用请求模型                   |
| `IMAGE_API_TIMEOUT_MS`        | 否   | 图像生成请求超时时间，默认 `300000ms`（5 分钟）                                         |
| `UPLOAD_MAX_BYTES`            | 否   | 参考图上传大小上限；Compose 会同时传给后端与前端代理，代理自动增加 1 MiB multipart 余量 |
| `DAILY_USER_QUOTA`            | 否   | 默认用户永久生图额度（兼容旧环境变量名）                                                |
| `GOOGLE_CLIENT_ID`            | 否   | Google OAuth Client ID                                                                  |
| `GOOGLE_CLIENT_SECRET`        | 否   | Google OAuth Client Secret                                                              |
| `SEED_DEFAULT_ADMIN`          | 否   | 是否启用默认管理员种子                                                                  |

## 页面入口

| 路径           | 说明                                       |
| -------------- | ------------------------------------------ |
| `/`            | 发现页，展示提示词输入、流式示例和公开画廊 |
| `/generate`    | 生图工作区，保留生成记录和结果流           |
| `/history`     | 个人资产页，查看和管理本地生成历史         |
| `/admin/users` | 管理员用户管理页，仅管理员可用             |

## API 入口

| 方法     | 路径                         | 说明                         |
| -------- | ---------------------------- | ---------------------------- |
| `GET`    | `/api/health/live`           | 进程存活检查                 |
| `GET`    | `/api/health/ready`          | SQLite 与存储就绪检查        |
| `POST`   | `/api/images/generate`       | 应用内生图接口               |
| `GET`    | `/api/history`               | 读取当前用户历史             |
| `GET`    | `/api/auth/me`               | 读取当前用户资料和管理员状态 |
| `GET`    | `/api/admin/users`           | 管理员查看用户列表           |
| `POST`   | `/api/admin/users`           | 管理员创建用户               |
| `PATCH`  | `/api/admin/users/:id/quota` | 管理员设置用户永久额度       |
| `DELETE` | `/api/admin/users/:id`       | 管理员删除普通用户           |
| `POST`   | `/v1/images/generations`     | OpenAI-compatible 生图接口   |

## 存储说明

| 场景          | 本地开发默认位置          | Docker Compose 默认位置  |
| ------------- | ------------------------- | ------------------------ |
| SQLite 数据库 | `backend/data/app.sqlite` | `backend-data` volume    |
| 上传参考图    | `backend/tmp/uploads`     | `backend-uploads` volume |
| 生成结果      | `backend/tmp/outputs`     | `backend-outputs` volume |

资产元数据与用户历史统一保存在 SQLite，图片文件保存在输出目录。公开作品可匿名读取；私有作品只允许所有者或管理员读取。删除个人历史时会同步清理对应输出文件。

## 生产部署与备份

- 只向公网开放前端 nginx 或上层反向代理，后端 `3000` 端口保持容器网络内可见。
- 在负载均衡器、Caddy、Traefik 或云网关终止 TLS，并把 `FRONTEND_ORIGIN`、`CORS_ORIGIN`、`BETTER_AUTH_URL` 改为同一个 `https://` 公网域名。
- 根据实际反向代理层数设置 `TRUST_PROXY_HOPS`，并在防火墙中拒绝外部直接访问后端。
- 生产环境保持 `SEED_DEFAULT_ADMIN=false`，使用高强度且互不相同的 `BETTER_AUTH_SECRET`、`OPENAI_COMPAT_API_KEY` 和上游密钥。
- 备份前执行 SQLite checkpoint，再同时备份数据库卷与输出卷；恢复时必须把二者恢复到同一时间点。

```bash
docker compose exec backend node -e "const Database=require('better-sqlite3'); const db=new Database('/app/data/app.sqlite'); db.pragma('wal_checkpoint(TRUNCATE)'); db.close()"
docker run --rm -v nebulens_backend-data:/source -v "$PWD/backups:/backup" alpine tar czf /backup/backend-data.tgz -C /source .
docker run --rm -v nebulens_backend-outputs:/source -v "$PWD/backups:/backup" alpine tar czf /backup/backend-outputs.tgz -C /source .
```

恢复前先停止服务，分别解压到同名数据卷和输出卷，再启动并检查 `/api/health/ready`。卷名前缀随 Compose project name 变化，请先用 `docker volume ls` 确认实际名称。

## 额度与管理员

每个用户有独立的永久额度，管理员设置的总额不会随日期重置；每日签到奖励按领取批次保存并在 7 天后过期。未设置用户级额度时使用 `DAILY_USER_QUOTA` 作为永久额度默认值。

管理员能力由后端校验，前端隐藏入口只作为体验优化。当前管理员可创建用户、设置永久额度和删除普通用户，不能删除自己或受保护管理员账号。

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
npm --prefix backend run storage:report-orphans
```

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
安静克制的 AI 图像生成工作台，支持提示词/参考图生图、本地资产历史、用户额度和管理员账号管理。
```

建议 topics：

```text
react, express, typescript, ai-image-generation, better-auth, sqlite, drizzle, vite
```
