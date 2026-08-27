# 资产空状态使用 Archive Drawer

## Goal

在已登录用户没有任何资产时，用 beUI Pro 的 `Archive drawer` 空状态替代当前单行提示，给出明确的创作入口，同时保持加载、错误、未登录和筛选无结果状态语义准确。

## Requirements

- 在 `components/premium/empty-states` 中接入 source-owned `EmptyStateArchive` 组件。
- 保留 beUI 官方公开预览的等距档案柜线稿、抽屉展开入场和插画悬停延伸动效。
- 组件使用 Nebulens 语境的中文文案：标题“还没有资产”，说明资产会在首次创作后出现在此处，主操作为“开始创作”。
- “开始创作”使用共享 `Button` 并导航至 `/generate`。
- 只在鉴权完成、历史同步完成、没有错误且总资产数为 0 时展示 Archive drawer。
- 有资产但被搜索、收藏集或其他筛选条件过滤为空时，继续显示“暂无符合条件的资产。”。
- 保留加载、未登录、错误、网格、列表、批量选择和详情行为。
- 入场与悬停动画遵守 `prefers-reduced-motion`。

## Acceptance Criteria

- [x] 已登录且资产总数为 0 时显示 `还没有资产`、Archive drawer 插画和 `开始创作`。
- [x] 点击 `开始创作` 后进入 `/generate`。
- [x] 存在资产但筛选结果为 0 时不显示 Archive drawer，仍显示筛选无结果提示。
- [x] Archive drawer 的公开预览 SVG 路径和默认/悬停抽屉位移得到保留。
- [x] 组件在桌面和 390px/320px 视口无溢出、遮挡或布局跳动。
- [x] 组件检查、类型检查、lint、相关测试、全量测试和生产构建通过。

## Definition of Done

- 测试覆盖真正空资产与筛选无结果的分支。
- 浏览器检查桌面、移动端、悬停、导航和控制台。
- beUI 来源记录和前端组件规范按需更新。
- 改动以独立 Git 提交交付。

## Technical Approach

按 beUI Pro 公共预览可见的结构创建 `EmptyStateArchive`，使用 `motion/react` 实现描边、抽屉和内容入场，并通过 `useReducedMotion` 提供静态降级。资产页以 `history.entries.length` 区分真正空资产和筛选无结果，组件通过 `onAction` 回调保持路由解耦。

## Decision (ADR-lite)

**Context**: 官方 Pro registry 需要 `BEUI_PRO_TOKEN`，当前环境未配置，不能通过 `shadcn view` 下载锁定源码；但官方页面公开展示了完整渲染 DOM、SVG 路径、组件导出名与静止/悬停状态。

**Decision**: 以官方公开预览作为可验证来源，保留其 DOM/SVG/动效几何，并按项目规范实现 source-owned 组件；不引入另一套组件库或外部插画。

**Consequences**: 视觉与公开预览一致，业务文案和导航可复用；无法宣称文件与锁定 registry 源码逐字节一致，来源限制会被明确记录。

## Out of Scope

- 不改造筛选无结果为 beUI `Search lens`。
- 不改变资产筛选、排序、收藏集、列表和批量操作。
- 不配置或购买 beUI Pro token。
- 不改动生成页、模板页或管理页的空状态。

## Research References

- [`research/beui-archive-drawer.md`](research/beui-archive-drawer.md) — 官方页面、registry 名称、公开 DOM/SVG 和动效测量。

## Technical Notes

- 主要接入点：`frontend/src/views/HistoryView.tsx`。
- 回归测试：`frontend/tests/views/HistoryView.spec.tsx`。
- beUI 组件来源策略：`frontend/component-provenance.json` 与 `.trellis/spec/frontend/component-guidelines.md`。

## QA Evidence

- Automated: component provenance, typecheck, lint, focused `HistoryView` tests `7/7`, full frontend tests `75/75`, and production build passed.
- Existing warnings only: `sidebar.tsx` Fast Refresh warning and Vite's chunk-size warning.
- Full-repository frontend `format:check` still reports 43 pre-existing files; every changed frontend file passes targeted Prettier checks.
- Browser: 1440px root width `520px`, settled drawer `translate(-18px, 13px)`, hover drawer `translate(-28px, 19px)`, zero horizontal overflow at 1440px, 390px, and 320px, `/generate` navigation verified, and no console warnings/errors.
