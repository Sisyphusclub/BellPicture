# 修复新注册用户初始额度

## Goal

确保每个通过用户名注册或社交登录新建的用户在注册完成时就拥有明确的默认永久额度，避免新用户首次进入页面或生成时显示没有额度。

## Requirements

* Better Auth 创建用户后自动初始化一条 `user_quota` 记录。
* 初始永久额度使用 `DAILY_USER_QUOTA` 配置，已用永久额度为 0。
* 初始记录使用当前产品日期，签到字段和签到额度保持未领取状态。
* 初始化必须幂等，不覆盖已有管理员配置或历史额度记录。
* 用户名注册、管理员创建用户和 Google OAuth 新用户共用同一初始化路径。

## Acceptance Criteria

* [x] 用户名注册成功后存在 `user_quota` 记录，永久额度等于默认配置且剩余额度正确。
* [x] Better Auth 创建用户的统一钩子覆盖非用户名的社交注册路径。
* [x] 重复触发初始化不会重置已有额度、使用量或管理员配置。
* [x] 认证回归测试覆盖新用户额度初始化。
* [x] 后端类型检查、lint、测试、构建和格式检查通过。

## Definition of Done

* 代码与回归测试完成。
* 后端质量门禁全部通过，前端既有测试不受影响。
* 变更按仓库规范独立提交，并完成 Trellis 归档与会话记录。

## Technical Approach

在 `backend/src/config/auth.ts` 的 Better Auth `databaseHooks.user.create.after` 中执行 `INSERT ... ON CONFLICT DO NOTHING`，写入 `user_quota` 默认行。使用 `productDateKey()` 和 `env.DAILY_USER_QUOTA`，不覆盖已经存在的额度行。

## Decision (ADR-lite)

**Context**: 额度服务的懒初始化无法保证注册后数据库状态立即完整，且不同注册入口可能绕过业务服务。

**Decision**: 在认证层用户创建生命周期统一初始化额度，保留额度服务的懒初始化作为历史数据兼容兜底。

**Consequences**: 所有 Better Auth 用户创建入口保持一致；已有用户和管理员手动配置不受影响。额度初始化失败会使注册请求失败，避免出现无额度状态的半成品账号。

## Out of Scope

* 不修改默认额度数值或签到奖励配置。
* 不为已有缺失记录用户执行批量迁移；首次读取/签到/生成仍会兼容补全。
* 不调整前端额度展示文案。

## Technical Notes

* `backend/src/config/auth.ts`：Better Auth 配置和用户创建钩子。
* `backend/src/db/schema.ts`：`userQuota` 表字段与外键约束。
* `backend/src/services/userQuota.service.ts`：现有额度快照和懒初始化兜底。
* `backend/tests/routes/auth.spec.ts`：用户名注册集成测试。
* `.trellis/spec/backend/quality-guidelines.md`：后端测试与代码审查要求。
* `.trellis/spec/backend/error-handling.md`：认证与错误处理约束。
