# 集成 GPT Image 2 模板图库

## Goal

将 `wuyoscar/GPT-Image2-Skill` 中可复用的 GPT Image 2 图库素材与提示词接入 Nebulens 创作模板，替换现有 12 张模板图，并让模板页与首页模板画廊共享同一份数据，避免图片与提示词漂移。

## What I already know

* 模板数据位于 `frontend/src/data/creationTemplates.ts`，当前有 12 个模板。
* 模板缩略图原来位于 `frontend/public/media/templates/template-01.webp` 至 `template-12.webp`。
* `frontend/src/views/LandingView.tsx` 另有一份重复的 12 项 `TEMPLATE_ENTRIES`，会引用同一批图片但使用不同提示词。
* 模板详情弹窗已经设置 `sharedLayout={false}`；本任务不重新引入图片位移过渡。
* 项目约束要求使用 beUI/shared primitives、稳定图片 URL、每个模板唯一素材、可访问性与 reduced-motion 行为完整。
* 外部仓库 HEAD 为 `068dd9e24aadc8731e46f38548ca4dcd94515d35`，采用 MIT License，包含 `skills/gpt-image`、CLI、提示词参考文档和 `docs/` 成品图库。

## Requirements

* 将 GPT Image 2 Skill `docs/` 下除仓库横幅外的全部 163 张图库图片和对应条目纳入模板清单，替换原有 12 项模板。
* 保留模板收藏/最近使用行为；每个图库条目拥有稳定 ID 和唯一图片 URL。
* 将模板提示词、分类、来源路径和来源链接从仓库清单导入，并保留 GPT Image 2 模型标识。
* 首页模板画廊与创作模板页从同一份 `CREATION_TEMPLATES` 派生图片、提示词和宽高信息。
* 在模板页详情中标识素材来自 GPT Image 2 Prompt Gallery，并提供仓库链接；不增加新的组件系统。
* 模板详情图片保持静态展示，打开/关闭不产生共享布局位移。

## Acceptance Criteria

* [ ] 163 张图库图片均来自外部仓库，模板清单可访问每一项的本地图片 URL。
* [ ] 模板页和首页画廊显示同一批图片和提示词，163 个 URL 全部唯一。
* [ ] 模板详情仍可打开、关闭、复制提示词、收藏和使用模板；图片打开时没有位移过渡。
* [ ] 所有图片具备稳定宽高/比例，桌面和移动布局没有横向溢出。
* [ ] `check:components`、`typecheck`、`lint`、`test`、`build`、`format:check` 与 `git diff --check` 通过。

## Definition of Done

* 代码、素材和来源说明完成并提交。
* 新增/调整的模板数据保持严格类型，未引入运行时远程依赖。
* 完成必要的回归检查，并确认图片详情弹窗的静态行为。

## Out of Scope

* 不在本任务中安装 GPT Image 2 CLI 到用户全局环境。
* 不在运行时调用外部 GPT Image API 自动生成图片。
* 不改动生成工作台的图片详情弹窗动画逻辑，除非模板接入导致回归。

## Technical Approach

* 将仓库 `docs/` 的完整图片清单固化为 `creationTemplates.json`，按分类生成 163 个可复用模板条目；图片转为本地 WebP，避免把约 439 MB 的原始 PNG 复制进前端构建。
* 在 `creationTemplates.ts` 增加来源元数据和显示尺寸，提供 `templateToHistoryEntry` 给首页。
* `LandingView.tsx` 删除重复模板数组，改为从 `CREATION_TEMPLATES` 派生 `HistoryEntry`。
* `TemplatesView.tsx` 在详情元信息区域显示 GPT Image 2 来源链接；继续使用现有 beUI Button、MorphicCardModal 等组件。

## Technical Notes

* 参考仓库：<https://github.com/wuyoscar/GPT-Image2-Skill>
* 选图来源路径与提示词参考：`skills/gpt-image/references/` 下的分类文档。
* 关键文件：`frontend/src/data/creationTemplates.ts`、`frontend/src/views/LandingView.tsx`、`frontend/src/views/TemplatesView.tsx`、`frontend/public/media/templates/`。
