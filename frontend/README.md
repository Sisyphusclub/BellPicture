# Ref2Image Studio 前端

这是面向 Ref2Image 后端的 Vue 3 + Vite 浏览器界面。

## 本地启动

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Vite 开发服务器默认运行在 `http://localhost:5173`。请单独启动后端，并确保 `VITE_API_BASE_URL` 指向后端地址，通常是 `http://localhost:3000`。

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
