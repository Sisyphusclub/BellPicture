# 修复生图历史恢复

## Goal

让生图工作区在页面重新部署、刷新、新标签页或浏览器会话变化后仍能恢复当前账户已有的生成结果，避免后端记录存在但主画布显示为空。

## What I already know

- SQLite 中现有 5 条 `image_records` 和对应输出文件均存在，本次前端部署没有重建后端容器或清理持久化卷。
- 运行日志显示重新进入页面后 `/api/history` 返回 200，历史数据已经成功从后端获取。
- 生图会话列表保存在 `localStorage`，但账户对应的最后会话保存在 `sessionStorage`，新标签页或浏览器会话变化会丢失该入口。
- 裸 `/generate` 路由只恢复记住的本地会话；本地索引缺失时不会依据当前账户的服务端历史恢复画布。

## Requirements

- 将账户对应的最后生图会话持久化到 `localStorage`，并兼容读取旧的 `sessionStorage` 数据。
- 恢复会话前必须用当前账户服务端历史校验本地批次，不能把其他账户的会话显示出来。
- 当最后会话索引缺失但存在匹配的本地会话时，恢复最近的匹配会话。
- 当本地会话索引和会话列表都缺失但服务端存在历史时，从服务端批次重建可浏览的恢复会话。
- 保留失败任务恢复、带提示词跳转、自动生图和显式 `session` URL 的现有行为。

## Acceptance Criteria

- [x] 新标签页进入裸 `/generate` 后可恢复当前账户最近的有效生图会话。
- [x] 清空本地会话索引后，服务端已有图片仍会自动恢复到生图画布。
- [x] 其他账户的本地会话不会被当前账户恢复。
- [x] SQLite 记录和输出文件不做迁移或修改。
- [x] 前端类型、lint、测试、构建和格式检查通过。

## Out of Scope

- 不迁移 SQLite 数据或生成输出文件。
- 不新增服务端“会话”表或改变历史 API 响应结构。
- 不改变资产页、历史删除或生成任务提交行为。

## Technical Notes

- 会话持久化：`frontend/src/hooks/useGenerationSessions.ts`。
- 历史权威数据：`frontend/src/hooks/useImageHistory.ts`。
- 裸路由恢复：`frontend/src/views/GenerateView.tsx`。
- 路由回归：`frontend/tests/App.spec.tsx`。
