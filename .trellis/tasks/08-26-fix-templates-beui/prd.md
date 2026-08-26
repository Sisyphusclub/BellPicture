# 修复创作模板页 beUI 布局

## 目标

修复创作模板页在桌面视口中的页头计数遮挡与工具栏控件间距问题，并保持现有模板筛选、收藏、预览和使用行为不变。

## 方案

- 为紧凑页头的计数区域预留账户快捷操作空间，避免固定定位的账户控件覆盖内容。
- 使用明确的 CSS 网格组织搜索框、beUI `SelectMenu` 和收藏图标按钮，避免 `space-between` 产生不可控的空白占位。
- 在窄屏下将工具栏改为搜索框独占一行、筛选控件并排的响应式布局。

## 验证

- `npm run check:components`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
