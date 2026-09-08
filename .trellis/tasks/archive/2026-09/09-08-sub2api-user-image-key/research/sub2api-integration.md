# sub2api 用户生图 Key 集成调研

## 已确认的现状

- bellpicture 后端已通过 `TwoApiImageProvider` 调用 OpenAI-compatible 的
  `POST /v1/images/generations` 与 `POST /v1/images/edits`，请求使用 Bearer Token。
- 当前 `IMAGE_API_BASE_URL` 与 `IMAGE_API_KEY` 都是服务端全局配置；Provider 在应用启动时
  单例创建。
- 应用内生图接口已经强制登录，并能从 `req.user.id` 获得当前用户；生图前由
  `UserQuotaService` 预占积分，成功后结算，失败时释放。
- sub2api 的图片路由与现有 Provider 协议一致。sub2api API Key 自身绑定分组，服务端会根据
  Key 的 `GroupID` 完成鉴权与账号调度，因此 bellpicture 不需要再保存 sub2api 分组 ID。
- sub2api 的 `GET /v1/models` 同样经过 API Key 鉴权，并按 Key 分组返回可用模型，可用于无生图成本的
  保存前验证；bellpicture 还应检查响应中包含当前 `IMAGE_MODEL`。
- bellpicture 当前没有用户设置表，也没有通用的密钥加密工具；数据库由 Drizzle migration
  管理，运行时使用 SQLite。
- 账户头像 Popover 目前只有退出登录，适合作为桌面端的设置入口；移动端侧栏需要保持同等入口。

## 约束

- 浏览器只在保存时提交明文 Key，读取设置时只能返回 `configured` 和脱敏尾号，不能回显明文或密文。
- sub2api Base URL 继续由部署环境统一控制，用户不能自定义，避免把后端变成任意地址代理。
- Key 不能进入请求日志、错误详情、历史记录、前端持久化存储或截图。
- 数据库存储应使用独立主密钥做认证加密，建议 Node.js 内置 AES-256-GCM；不能把单向哈希用于该场景，
  因为调用上游时必须恢复原始 Key。
- 更新语义应明确区分“保留原 Key”“替换 Key”“删除 Key”，空输入不能隐式删除已有 Key。

## 可行方案

### 方案 A：Provider 支持请求级凭据覆盖（推荐）

- 在用户设置表保存加密后的 sub2api Key。
- 控制器按当前用户读取并解密 Key，通过 `GenerateInput` 传给现有 Provider。
- Provider 的 Base URL、模型、超时策略保持全局配置，只对该次请求覆盖 Bearer Token。

优点：改动集中，复用现有图片协议、超时、错误映射和文件落盘逻辑；测试可直接覆盖请求头选择。

缺点：需要谨慎扩展 Provider 输入类型，确保 OpenAI-compatible 外部接口和演示缓存不误用个人 Key。

### 方案 B：按用户动态创建 Provider

- 控制器读取 Key 后，为每次请求创建 `TwoApiImageProvider` 实例。

优点：不扩展领域输入类型。

缺点：控制器需要知道 Provider 具体实现和部署配置，破坏依赖边界，测试与未来 Provider 替换更复杂。

## 结论

采用方案 A。用户仅管理 sub2api Key，Key 所属生图分组由 sub2api 自己决定。保存前通过
`GET /v1/models` 验证鉴权和模型可用性。未配置个人 Key 时继续使用平台 Key，保证现有用户行为不变；
配置个人 Key 后不扣 bellpicture 积分，只保留频率限制。

## 参考代码

- `backend/src/services/providers/TwoApiImageProvider.ts`
- `backend/src/services/providers/ImageGenerationProvider.ts`
- `backend/src/controllers/images.controller.ts`
- `backend/src/services/imageGeneration.service.ts`
- `backend/src/db/schema.ts`
- `/root/docker/sub2api/custom-src/backend/internal/server/middleware/api_key_auth.go`
- `/root/docker/sub2api/custom-src/backend/internal/service/api_key.go`
- `/root/docker/sub2api/custom-src/backend/internal/server/routes/gateway.go`
