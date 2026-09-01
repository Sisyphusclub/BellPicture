# 改造永久额度与签到额度有效期

## Goal

将现有按日重置的用户额度改为两类可用额度：后台设置的永久额度按账户累计消耗、永不过期；每日签到奖励按领取批次保存，领取后 7×24 小时有效。所有生成、查询、签到和管理员展示必须使用同一套有效额度账本。

## Requirements

- 后台设置额度改名为“永久额度”，管理员设置的总额不因日期变化而重置。
- 每日签到仍限制每天领取一次；每次领取 `DAILY_CHECK_IN_REWARD`，该批次在领取后 7 天过期。
- 签到奖励允许在有效期内累积，过期批次不计入总额且不能被生成消耗。
- 额度扣减优先使用最早过期的签到奖励，再使用永久额度，避免短期奖励浪费。
- 生成失败或实际生成数量少于预留数量时，所有预留额度正确退回原来源。
- 额度 API 返回合计可用额度，并提供永久额度、签到额度和最近过期时间，前端继续共享同一额度快照。
- 管理员用户列表显示永久额度总额、已用永久额度、永久剩余和有效签到额度；现有创建、编辑、错误和权限流程保持可用。
- 兼容现有数据库：迁移旧 `daily_total`/`used_today` 数据到永久额度语义，并保留旧请求字段的兼容解析（如适用）。

## Acceptance Criteria

- [x] 永久额度跨产品日期查询仍保持剩余值，不再每日重置。
- [x] 签到奖励领取后 7 天内计入可用额度，过期后自动排除。
- [x] 同一自然日重复签到返回 `claimed: false`，不重复增加奖励。
- [x] 多笔签到奖励可累积，并按最早过期批次优先扣减。
- [x] 生成预留、部分提交和失败释放在永久/签到两个来源上都保持账目一致。
- [x] 管理员设置额度后只改变永久额度总额，不删除或延长签到奖励。
- [x] 额度和管理员 API、前端类型、页面文案同步更新。
- [x] 后端服务/路由测试、前端组件测试覆盖新有效期与展示行为。
- [x] 类型检查、lint、全量测试、构建、格式和空白检查通过（全仓旧文件格式警告除外）。

## Definition of Done

- 数据库 schema、迁移、服务、API、前端展示和回归测试形成独立提交。
- 额度扣减顺序、过期边界和旧数据迁移规则记录到后端数据规范。
- Trellis 任务归档并记录会话，提交推送到 `origin/dev`。

## Technical Approach

在 `user_quota` 中增加永久额度总额与累计使用字段；新增签到奖励批次表，保存用户、数量、剩余数量、领取时间和过期时间。额度服务在事务中清理/忽略过期批次，按最早过期顺序预留签到额度，再预留永久额度，并通过 reservation allocation 记录支持部分提交和释放。快照聚合两类来源并返回明细。管理员服务读取同一账本并更新永久总额。前端保留合计 `total/remaining` 兼容字段，同时展示永久与签到明细。

## Out of Scope

- 不改变签到奖励数量配置、生成接口计费单位或管理员权限模型。
- 不引入新的状态库、队列或外部计费服务。
- 不删除旧数据库字段，迁移后仅将其作为兼容/回填来源，避免破坏已有安装。

## Technical Notes

- 额度核心：`backend/src/services/userQuota.service.ts`、`backend/src/services/quota.service.ts`。
- 管理员 API：`backend/src/services/adminUser.service.ts`、`backend/src/controllers/adminUsers.controller.ts`、`backend/src/routes/adminUsers.ts`。
- 数据库：`backend/src/db/schema.ts`、`backend/drizzle/`。
- 前端类型/API：`frontend/src/types/image.ts`、`frontend/src/types/admin.ts`、`frontend/src/services/api/*`。
- 前端展示：`frontend/src/views/AdminUsersView.tsx`、`frontend/src/components/landing/LandingAccountActions.tsx`、`frontend/src/components/landing/LandingSidebar.tsx`、`frontend/src/views/GenerateView.tsx`。
