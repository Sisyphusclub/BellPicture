# 重设计资产与用户管理页面

## Goal

依据项目现有 beUI Pro 组件映射与 Nebulens 设计规范，重新排版 `/history` 资产页和
`/admin/users` 用户管理页，使两页成为同一套安静、紧凑、可扫描的运营工作台，同时
完整保留现有业务能力、权限边界和交互状态。

## What I Already Know

- 用户明确要求同时重设计资产页和用户管理页，并参考 beUI 相关页面与设计规范。
- 产品服务个人创作者与小型创意团队；视觉气质是精确、安静、未来感的创作工具。
- beUI Pro 是组件与交互权威来源；运营页面应采用石墨色分层、克制强调色和高信息密度，避免营销式大标题与卡片堆叠。
- 资产页已有搜索、日期/可见性/收藏集筛选、排序、网格/列表、批量选择、下载、收藏集分配、公开切换、复用、详情和删除。
- 用户管理页已有创建用户、搜索、分页、额度编辑、刷新和删除保护。
- `design.md` 已将资产浏览映射到 beUI Image Galleries / Data Table，将用户管理映射到 beUI Data Table。

## Confirmed Direction

- 采用完整交互重排，而不是静态视觉稿：所有现有控件、状态和移动端行为都继续可用。
- 不改变后端 API、权限规则、资产数据模型或用户额度语义。
- 两页共用一致的工作台页头、工具条、表格密度、状态反馈和响应式原则，但不强行做成相同内容布局。
- Data Table 采用单一圆角工作面：工具条不单独描边，表头保留一条结构分隔，数据行只使用低对比度分隔和 hover 反馈。

## Requirements

- 资产页以生成媒体为视觉主体，桌面端提供紧凑工具条、收藏集导航、网格/列表视图和稳定的批量操作区。
- 用户管理页以可扫描数据表为主体，创建用户作为明确的次级工作流，不与列表争夺首屏空间。
- 资产页收藏集/选择区域不再堆叠横线；列表模式与用户管理共享 beUI Data Table 的单表面边界层次。
- 创作模板页不做结构重设计，但必须与资产和用户管理页共享全局账户导航下方的顶部安全区，且 sticky 筛选条滚动后不得进入导航占用区。
- 所有 `.workspace-page` 运营路由使用同一个 `1580px` 最大内容宽度并在主区域居中，以及桌面/平板/手机一致的 `32px`、`20px`、`14px` 水平边距；发现和生图保留各自已有的画布留白与内部内容列宽。
- 使用项目已有 Button、Input、SelectMenu、IconTooltip、ConfirmActionModal、ImageGrid 等共享组件，不引入第二套组件系统。
- 保留加载、空、筛选无结果、错误、未登录、无权限、保存中和删除确认状态。
- 在桌面、平板和窄屏上重排而非简单缩小；关键操作不得只在桌面存在。

## Acceptance Criteria

- [x] 两页的层级、间距和控件密度符合 beUI 工作台风格及项目设计规范。
- [x] 资产页所有筛选、视图切换、单项与批量操作保持可用。
- [x] 用户管理页创建、搜索、分页、额度保存、刷新与删除保护保持可用。
- [x] 资产媒体保持页面主视觉，用户表格可快速比较身份、用量和额度。
- [x] 1920px、1440px、1024px、390px 视口无重叠、裁切或横向溢出。
- [x] 模板、资产和用户管理页面在相同视口下具有一致的外框左右边界与响应式水平边距。
- [x] 键盘、焦点、ARIA、禁用/等待和 reduced-motion 行为不回退。
- [x] 相关前端测试、Lint、TypeScript 和生产构建通过。

## Definition of Done

- 两页在真实浏览器中完成桌面与移动端视觉 QA。
- 自动化测试覆盖主要工作流和关键状态。
- 设计规格记录可复用的运营工作台布局约束。
- 相关修改形成独立 Git 提交，不夹带并行任务。

## Out of Scope

- 修改后端 API、数据库或管理员权限模型。
- 新增资产上传、团队空间、角色体系或复杂用户批处理能力。
- 除顶部安全区对齐外，重设计发现、生图或模板页面。

## Technical Notes

- 目标视图：`frontend/src/views/HistoryView.tsx`、`frontend/src/views/AdminUsersView.tsx`。
- 样式入口：`frontend/src/styles/base.css`、`frontend/src/styles/tokens.css`。
- 规范来源：`.impeccable.md`、`design.md`、`.trellis/spec/frontend/component-guidelines.md`。
- beUI 映射：Image Galleries、Data Table、Animated Dropdown、Morphic Tooltip、Morphic Card Modal、Empty States。
- 现有资产测试：`frontend/tests/views/HistoryView.spec.tsx`；用户管理目前主要由 App 路由测试覆盖，需要补页面级回归测试。

## Visual QA (2026-08-29)

- 参考 beUI Data Table 的单一圆角表面，资产列表和用户表格移除工具条、收藏集栏、页头的重复横线。
- `/history` 空状态在桌面端不再出现收藏集区域下方的连续横线；列表模式保留表面边界、表头分隔和低对比行分隔。
- `/admin/users` 使用相同的表面、表头、行 hover 和分页分隔层次；页面级页头不再画整行底边。
- 浏览器检查覆盖资产空状态和用户 populated 状态；交互测试覆盖筛选、列表切换、批量操作、分页、额度保存和删除保护。
