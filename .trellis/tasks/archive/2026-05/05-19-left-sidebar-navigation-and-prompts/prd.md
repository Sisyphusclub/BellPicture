# Left sidebar navigation and prompts

## Goal

将现有顶部浮动导航改为参考图中的左侧竖向导航，让主导航项变为 logo、发现、生图、提示词、图片管理、登录；发现进入首页，生图进入生成图片工作区，并新增一个提示词页面展示提示词模板及对应图片，提升首页浏览、生成、素材管理之间的可达性。

## What I already know

* 用户提供了左侧竖向导航参考图，红框内包含 logo、发现、生图、提示词以及底部公告/语言/额度/账户区域。
* 用户要求导航改成：logo、发现、生图、提示词、图片管理、登录。
* 发现对应首页；生图对应生成图片页面。
* 新增提示词导航页面，需要放提示词模板和对应图片。
* 当前前端是 Vue 3 + Vite + TypeScript，用户界面为简体中文。
* `frontend/src/App.vue` 当前负责根布局，渲染 `<AppHeader />` 和 `<RouterView />`。
* `frontend/src/components/common/AppHeader.vue` 当前是顶部居中的浮动 pill 导航，只有“画图”和“图片管理”，并处理登录/账户菜单。
* `frontend/src/router/index.ts` 当前只有 `/` -> `GenerateView` 和 `/history` -> `HistoryView`。
* `frontend/src/views/GenerateView.vue` 当前同时承担首页/生图工作区：hero、生成 composer、最近创作、左侧历史批次等。
* `frontend/src/views/HistoryView.vue` 已是“图片管理”页面。
* 仓库内未发现现成 prompt template 资产或模板数据；提示词页大概率需要新增静态模板数据与展示组件。

## Assumptions (temporary)

* “发现”保留当前首页发现/最近创作体验，对应 `/`。
* “生图”拆为独立路由，对应当前 `GenerateView` 的生成工作区能力，路径 `/generate`。
* 为减少重写风险，优先复用/拆分现有 `GenerateView` 能力，而不是重建生成逻辑。
* “提示词模板和对应图片”在 MVP 中可以使用内置静态模板卡片；不接入后端、不做用户自定义模板管理。
* 登录项沿用现有 `useAuth` / `useAuthModal` 行为：未登录显示“登录”，已登录显示账户入口和退出。

## Open Questions

* None.

## Requirements (evolving)

* 提示词页使用内置精选模板图作为 MVP 数据源，不依赖用户历史或后端接口。
* 将现有顶部导航替换为左侧竖向导航。
* 左侧导航包含 logo、发现、生图、提示词、图片管理、登录。
* 发现导航进入 `/` 首页。
* 生图导航进入独立 `/generate` 生成图片页面。
* 图片管理导航进入现有图片管理页面。
* 新增提示词页面，展示提示词模板和对应图片。
* 保持全部用户可见文案为简体中文。
* 保留现有登录 modal / 账户菜单能力。
* 视觉方向贴近用户截图：窄竖栏、图标在上文字在下或旁侧、半透明浅色玻璃背景、当前项高亮。

## Acceptance Criteria (evolving)

* [ ] 页面不再显示顶部浮动导航，改为左侧固定导航。
* [ ] 左侧导航按顺序展示 logo、发现、生图、提示词、图片管理、登录。
* [ ] 点击“发现”进入 `/` 首页。
* [ ] 点击“生图”进入 `/generate` 生成图片页面。
* [ ] 点击“提示词”进入新增提示词模板页面。
* [ ] 点击“图片管理”进入现有图片管理页面。
* [ ] 未登录点击“登录”打开现有登录弹窗；已登录时提供账户/退出能力。
* [ ] 提示词页展示多张内置精选模板卡片，每张至少包含对应图片、标题/分类和可复用提示词文本。
* [ ] 提示词模板不依赖后端接口；无历史记录时页面仍有内容。
* [ ] `npm run typecheck`、`npm run lint`、`npm run build` 在前端通过。
* [ ] 浏览器 smoke test 覆盖导航跳转、提示词页展示、登录入口和移动端/窄屏表现。

## Definition of Done

* Tests added/updated where appropriate.
* Lint / typecheck / build green for affected frontend package.
* Browser verification confirms navigation and pages work visually.
* Git status reviewed before reporting completion.

## Out of Scope (explicit)

* 不接入后端提示词模板管理。
* 不新增用户自定义/收藏/编辑提示词模板能力，除非用户进一步要求。
* 不重做图片生成 API 或历史持久化逻辑。
* 不引入新的 UI 组件库。

## Technical Notes

* Code inspected: `frontend/src/App.vue`, `frontend/src/components/common/AppHeader.vue`, `frontend/src/router/index.ts`, `frontend/src/views/GenerateView.vue`, `frontend/src/views/HistoryView.vue`.
* Existing route split is insufficient for requested nav: current `/` is generate route; new MVP likely needs `/` discovery/home, `/generate` generation, `/prompts` prompt templates, `/history` image management.
* Existing prompt-related behavior is mainly image history prompt reuse; no reusable template catalogue found.
