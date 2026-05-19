# Refine prompts page layout and cards

## Goal

优化 `/prompts` 提示词页的产品 UI 密度和层级：降低当前过大的标题字号，把搜索与分类筛选区域上移，并让提示词卡片与图片管理页的卡片视觉语言统一。整体应从偏营销 hero 的展示页，调整为更像创作工作台里的提示词库。

## What I already know

* 用户提供截图并标注：标题“发现无尽创意”文字太大。
* 用户要求：检索和筛选组件上移。
* 用户要求：提示词下方卡片样式跟图片管理的样式统一。
* 用户要求：整体加一个背景卡片。
* 当前页面是 `frontend/src/views/PromptsView.vue`。
* 当前提示词页 hero 使用 `font-size: clamp(52px, 8.8vw, 104px)`，视觉过强，更像营销页。
* 当前搜索框在 hero 统计数字之后，分类筛选在搜索框之后，首屏垂直距离偏大。
* 当前提示词卡片使用较大的 30px 圆角、半透明白底、彩色 chip 和独立操作区。
* 图片管理页 `frontend/src/views/HistoryView.vue` 已有更克制的产品型卡片语言：`history-card` 使用 hairline border、接近实体的 warm surface、无阴影、无装饰 blur。
* Impeccable 产品上下文：Ref2Image Studio 是高端创意工作台，应保持克制、精确、任务优先；避免像营销页、重装饰、过强 display font 或不一致组件词汇。

## Assumptions

* 本任务只调整 `/prompts` 视觉与布局，不改变提示词模板数据、搜索逻辑、分类逻辑、复制/去生成行为。
* “整体加一个背景卡片”指提示词库主内容区增加一个统一的 warm surface 容器，包住搜索、分类和卡片列表，而不是给每个区域叠多层卡片。
* “卡片样式跟图片管理统一”优先统一 surface、边框、圆角、无阴影、信息层级和操作按钮语汇，不要求提示词卡片和历史图片卡片结构完全相同。

## Requirements

* 降低提示词页主标题字号，避免超过当前首屏主体宽度的视觉压迫；桌面端标题应明显小于当前巨型 hero，移动端也不能遮挡主要内容。
* 将搜索组件上移到更靠近标题/副标题的位置，减少 hero stats 与搜索之间的空白和垂直滚动成本。
* 将分类筛选区域与搜索区域组成同一个提示词库控制区，筛选 chips 上移到搜索框附近。
* 给提示词库主体增加一个统一背景卡片/面板，承载搜索、分类、卡片列表和空状态。
* 背景卡片采用与图片管理一致的克制产品 surface：hairline border、warm off-white/solid-ish background、无 box-shadow、避免装饰性 glass blur。
* 提示词卡片改为与图片管理页更统一的卡片风格：更克制圆角、hairline border、warm surface、无装饰阴影/blur，避免过度透明玻璃感。
* 提示词卡片内部保留示例图、模板来源、标题、分类、提示词摘要、复制提示词、去生成。
* 卡片操作按钮与图片管理页按钮语汇保持一致：primary/ghost 的视觉层级清晰，悬停/聚焦可用。
* 保持所有用户可见文案为简体中文；品牌名、模型名等允许保留英文。
* 保持现有搜索、分类过滤、复制提示词、跳转 `/generate?prompt=...` 行为不变。
* 保持响应式体验：桌面至少 3–4 列可用，窄屏单列，背景卡片和搜索/筛选不溢出移动端底部导航。

## Acceptance Criteria

* [ ] `/prompts` 主标题不再使用 `clamp(52px, 8.8vw, 104px)` 级别的巨型字号，桌面和移动端视觉更接近产品页。
* [ ] 搜索框出现在首屏更高位置，位于主体背景卡片/控制区顶部或接近顶部。
* [ ] 分类筛选 chips 与搜索框同属一个控制区，整体位置上移，减少搜索与筛选之间的割裂。
* [ ] 提示词库主体有一个统一背景卡片/面板包裹控制区与卡片列表。
* [ ] 背景卡片和提示词卡片使用与图片管理页一致的 hairline border、warm surface、无 box-shadow、无 decorative blur。
* [ ] 提示词卡片仍展示示例图、来源、标题、分类、提示词摘要和两个操作按钮。
* [ ] 搜索关键词过滤仍可用；分类过滤仍可用；空结果状态仍可读。
* [ ] 复制提示词仍调用剪贴板并显示中文反馈；去生成仍跳转 `/generate` 并携带 prompt query。
* [ ] 移动端截图中标题、搜索、筛选和卡片不横向溢出，不被底部导航遮挡。
* [ ] `npm --prefix frontend run lint`、`typecheck`、相关测试、`build` 通过。
* [ ] 浏览器 smoke test 覆盖 `/prompts` 桌面与移动端视觉。

## Definition of Done

* `PromptsView` 相关测试按视觉/行为变化更新。
* Lint / typecheck / affected tests / build green。
* 浏览器截图确认标题缩小、检索筛选上移、主体背景卡片与卡片风格统一。
* Git status reviewed before completion.

## Out of Scope

* 不新增后端提示词模板接口。
* 不改变提示词模板数据内容或数量。
* 不新增收藏、编辑、自定义模板能力。
* 不重做图片管理页。
* 不修改全局导航结构。
* 不引入新 UI 组件库。

## Technical Notes

* Likely target file: `frontend/src/views/PromptsView.vue`.
* Reference style file: `frontend/src/views/HistoryView.vue` and gallery cards under `frontend/src/components/gallery/HistoryGrid.vue` if needed.
* Existing prompt behavior tests: `frontend/tests/views/PromptsView.spec.ts`.
* Existing history style tests include product-surface expectations in `frontend/tests/views/HistoryView.spec.ts`.
* Impeccable register: product. Design should serve task flow, use restrained color, predictable grids, consistent component vocabulary, and avoid marketing-page hero scale.
