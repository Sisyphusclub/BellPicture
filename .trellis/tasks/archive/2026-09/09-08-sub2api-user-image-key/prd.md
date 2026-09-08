# 支持用户配置 sub2api 生图分组 Key

## Goal

允许已登录用户在 bellpicture 中保存自己的 sub2api 生图分组 API Key，并在后续生图请求中由
后端安全地使用该 Key 调用现有 sub2api 上游；未配置个人 Key 的用户继续使用平台默认 Key。

## What I Already Know

- 用户希望自行填写“生图分组的 Key”调用生图。
- 现有 `TwoApiImageProvider` 已兼容 sub2api 的图片生成与编辑接口，无需新增一套生图协议。
- sub2api 的 Key 自身已绑定分组，因此本项目不需要让用户额外填写分组 ID。
- 当前生图调用只使用部署级 `IMAGE_API_KEY`，且应用内请求均可确定当前用户。
- 现有用户表、额度表与图片历史都在 SQLite 中，数据库变更使用 Drizzle migration。

## Assumptions (Temporary)

- 用户只能配置 Key，不能配置上游 Base URL、模型映射或分组 ID。
- 每个用户 MVP 仅保存一枚生图 Key，标准分辨率和管理员高分辨率都遵循既有权限规则。
- 个人 Key 无效、额度不足或分组不支持生图时，直接返回可理解的错误，不自动改用平台 Key，避免意外消耗平台额度。

## Open Questions

- 无。

## Requirements (Evolving)

- 已登录用户可查看个人 Key 是否已配置及脱敏尾号。
- 用户可保存、替换和明确删除自己的 Key；服务端不向前端回显已保存的明文或密文。
- 保存或替换 Key 时，后端先使用该 Key 请求 sub2api `/v1/models`；只有鉴权成功且响应包含当前
  `IMAGE_MODEL` 时才加密保存。验证失败不得覆盖已有 Key。
- Key 在 SQLite 中使用服务端独立主密钥进行 AES-256-GCM 认证加密。
- 生图时优先使用当前用户的个人 Key；未配置时沿用 `IMAGE_API_KEY`。
- 使用个人 Key 时不预占或扣除 bellpicture 个人积分，但仍执行现有登录校验和生成频率限制。
- 未配置个人 Key 时继续使用平台 Key，并按现有规则预占与结算 bellpicture 个人积分。
- 用户不能自定义 sub2api Base URL；现有模型、比例、数量、参考图和历史保存能力保持不变。
- 个人 Key 调用失败时不静默回退平台 Key。
- 日志、错误响应和图片历史不得包含 Key 明文或密文。
- 桌面账户菜单和移动侧栏都提供一致的“生图 API Key”设置入口。

## Acceptance Criteria (Evolving)

- [x] 用户 A 保存 Key 后，用户 A 的普通生图请求使用该 Key 作为上游 Bearer Token。
- [x] 用户 B 及未配置 Key 的用户仍使用平台默认 Key，用户之间不能读取或使用彼此的 Key。
- [x] 未配置个人 Key 的用户体验和积分结算行为保持不变。
- [x] 设置读取接口只返回配置状态和脱敏尾号。
- [x] 替换、删除 Key 的语义明确且有自动化测试。
- [x] 无效 Key、不可达上游或不包含当前生图模型时保存失败，且已有 Key 保持不变。
- [x] 数据库、结构化日志、错误响应和前端状态不泄露 Key 明文。
- [x] 个人 Key 上游调用失败时不会再次使用平台 Key 发起请求。
- [x] 使用个人 Key 成功或失败均不改变 bellpicture 个人积分；使用平台 Key 时仍按现有规则结算。
- [x] 文本生图与参考图生图都支持个人 Key。
- [x] 前后端 lint、typecheck、测试和生产构建通过。

## Definition of Done

- 后端 schema、migration、加密服务、设置接口、请求级密钥选择和测试完成。
- 前端设置入口、状态读取、保存/替换/删除交互和错误状态完成。
- 部署文档增加密钥加密主密钥配置与轮换/回滚注意事项。
- 关键桌面与移动视口完成视觉和交互验证。
- 必要的 Trellis 规范更新、质量检查和独立 Git 提交完成。

## Expansion Sweep

### Future Evolution

- 后续可扩展为多 Key、按模型选择 Key 或展示 sub2api 余额；MVP 数据模型先保持单用户单 Key。
- 加密载荷保留版本字段，为未来主密钥轮换预留迁移能力。

### Related Scenarios

- 文本生图和参考图生图需要一致使用个人 Key。
- OpenAI-compatible `/v1` 外部接口没有 bellpicture 用户会话，MVP 继续使用平台 Key，不套用个人 Key。
- 管理员演示缓存命中不调用 sub2api，不应消耗个人 Key 或改变现有缓存行为。

### Failure And Edge Cases

- 错误 Key、失效 Key、sub2api 分组禁用、上游限流和余额不足需要保持稳定的错误映射。
- 解密主密钥缺失或密文损坏应失败关闭，且日志只记录用户 ID、请求 ID 和安全错误码。
- 删除账户时个人 Key 记录应级联删除。

## Technical Approach

采用请求级凭据覆盖：新增一对一用户密钥设置表和认证加密服务；设置 API 负责公共 DTO、
`/v1/models` 验证与密钥写入；
图片控制器在调用编排服务前解析当前用户凭据；`GenerateInput` 把可选凭据传到现有 Provider；Provider
仅在当前请求上覆盖 Bearer Token。Base URL 和其他上游策略继续由服务端环境变量控制。

## Decision (ADR-lite)

**Context**：现有 Provider 已完整兼容 sub2api 图片接口，但凭据固定在单例配置中。

**Decision**：扩展 Provider 的请求输入以支持服务端内部的单次凭据覆盖，而不是在控制器中动态实例化
具体 Provider。个人 Key 加密存储，公共 API 永不返回秘密值。个人 Key 调用不消耗 bellpicture
积分，但仍受现有频率限制约束。

**Consequences**：保持 Provider 抽象和现有调用链稳定，但需要新增独立加密主密钥并明确轮换流程；测试必须
覆盖个人 Key、平台 Key、解密失败和无静默回退。

## Out of Scope

- 用户自定义 sub2api 地址。
- 多 Key 轮询、按模型路由或自动故障切换。
- 在 bellpicture 中创建或管理 sub2api 分组/账号。
- 查询或展示 sub2api 余额、调用日志与分组详情。
- 改变外部 OpenAI-compatible `/v1` 接口的认证与上游 Key。

## Research References

- [`research/sub2api-integration.md`](research/sub2api-integration.md) - 本地两项目接口、权限和密钥存储边界调研。

## Technical Notes

- 相关入口：`backend/src/controllers/images.controller.ts`、
  `backend/src/services/providers/TwoApiImageProvider.ts`、`frontend/src/components/landing/LandingAccountActions.tsx`。
- 相关规范层：`.trellis/spec/backend/`、`.trellis/spec/frontend/` 与跨层思考指南。
