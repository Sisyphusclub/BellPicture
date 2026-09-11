# Nebulens 前端

这是面向 Nebulens 后端的 React 19 + Vite 浏览器界面，使用 React Router、Tailwind CSS 和 beUI/shadcn 组件基础。

## 本地启动

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Vite 开发服务器默认运行在 `http://localhost:5173`。请单独启动后端，并确保 `VITE_API_BASE_URL` 指向后端地址，通常是 `http://localhost:3000`。

生产构建默认留空 `VITE_API_BASE_URL`，通过 nginx 的 `/api` 与 `/v1` 同源代理访问后端，避免把 localhost 地址编译进静态资源。

## beUI Pro 组件

`components.json` 已配置 beUI 与 beUI Pro registry。安装 Pro 组件时只在当前终端提供 Token，不要将 Token 写入仓库：

```powershell
$env:BEUI_PRO_TOKEN = '<your-token>'
npx shadcn@latest add @beui-pro/<component-name>
```

例如组件名可以从 beUI Pro 组件页面的安装命令中获取。项目的 `.gitignore` 已忽略 `.env` 和 `.env.local`。

## 生产构建

```bash
cd frontend
npm run build
npm run preview
```

## 质量检查

```bash
npm run lint
npm run typecheck
npm run test
```
