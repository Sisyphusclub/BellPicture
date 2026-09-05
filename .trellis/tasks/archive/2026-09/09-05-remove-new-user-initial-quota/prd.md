# 取消新用户默认额度

## Goal

新用户注册后不自动赠送 20 点初始额度，额度由管理员手动配置；没有额度记录的用户在额度接口中返回 0。

## Requirements

* 删除 Better Auth 注册后的自动额度初始化钩子。
* 没有 `user_quota` 记录时，后端额度快照的永久额度默认为 0。
* 保留已有额度记录、签到奖励和管理员手动分配额度的行为。
* 前端认证请求失败时不得伪造 20 点额度。

## Acceptance Criteria

* [x] 新用户名注册后不创建 `user_quota` 初始额度记录。
* [x] 无额度记录用户的 quota `total` 与 `remaining` 均为 0。
* [x] 管理员分配额度后用户仍能正常获得对应额度。
* [x] 既有额度事务和签到测试通过。
* [x] 后端类型检查、lint、测试、构建和格式检查通过。

## Technical Approach

移除 `databaseHooks.user.create.after` 的额度写入逻辑；将 `userQuota.service.ts` 的无记录 fallback 从 `env.DAILY_USER_QUOTA` 改为 0，并同步管理员用户 DTO 的无记录 fallback。更新认证与额度回归测试。

## Out of Scope

* 不修改 `DAILY_USER_QUOTA` 配置，已有手动配置记录不受影响。
* 不删除已有用户的额度记录。
