# 迁移其他项目用户到本项目

## Goal

将用户从指定源项目安全迁移到 Bellpicture，保留可兼容的登录凭据和基础资料，不覆盖本项目已有账号。

## What I already know

* 本项目使用 Better Auth SQLite 表：`user`、`account`、`session`、`verification`。
* 用户名和邮箱均有唯一约束；账号密码哈希位于 `account.password`。
* 本项目当前新用户默认额度为 0，管理员分配和签到奖励另行处理。
* 用户尚未提供源项目名称、目录或数据库文件路径。

## Open Questions

* 源项目的目录/数据库路径以及需要迁移的范围（仅账号，还是连同额度、历史图片和登录会话）。

## Temporary Requirements

* 默认采用 dry-run、备份、冲突报告、幂等导入，禁止覆盖现有用户。
* 不迁移仍有效的 session/token；导入后要求重新登录。
* 未明确授权的额度、历史图片和第三方 OAuth 凭据暂不迁移。

## Acceptance Criteria

* [ ] 源项目 schema 已确认并生成字段映射。
* [ ] 迁移前自动备份目标数据库并输出冲突报告。
* [ ] 重复执行不会重复创建或覆盖目标用户。
* [ ] 导入用户可使用兼容密码登录，无法兼容的凭据被明确标记。
* [ ] 迁移测试、类型检查、lint 和构建通过。

## Technical Notes

* 目标 schema：`backend/src/db/schema.ts`。
* Better Auth 配置：`backend/src/config/auth.ts`。
* 实现前需要源项目数据库只读检查和用户确认迁移范围。
