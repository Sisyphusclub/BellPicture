# 历史上云（PR2：image_records 表 + history API + drizzle 接管）

## Goal

把图片生成历史从 per-browser 的 IndexedDB + localStorage 迁移到后端 SQLite，使同一账号能跨浏览器/设备看到自己的历史。本轮只做「记录」上云，图片二进制仍在共享 OUTPUT_DIR（PR3 再按 user 隔离）。同时引入 drizzle-orm + drizzle-kit 接管全部 6 张表的 schema 与 migration。

## Resolved Decisions

| # | 议题 | 答案 |
|---|---|---|
| 1 | 历史数据源 | **纯服务器源** — useImageHistory 改为只调 `GET /api/history`；图片 `src` 指向 `${API_BASE_URL}/api/outputs/<filename>`；删除 `indexedDb.ts` + `localStorageMeta.ts` |
| 2 | 旧本地数据 | **不迁移，静默丢弃** — 不写一次性 import；用户首登后看到的就是后端空列表 |
| 3 | drizzle 接管范围 | **6 张表** — `user` / `session` / `account` / `verification`（Better Auth 切到 `drizzleAdapter`）+ `user_quota` + `image_records` |
| 4 | 删除语义 | **仅删 DB 行** — `OUTPUT_DIR/<filename>` 文件不动，由 PR3 在 per-user 隔离时统一清理 |
| 5 | 分页 | **本轮不分页** — `GET /api/history` 一次返回该用户全部记录，按 `createdAt DESC` 排序；以 20/day quota 估计 6 个月也只 ~3600 行，远低于性能拐点；后续可加 `?limit/offset` |
| 6 | 图片显示 URL | **直连 outputs** — `entry.imageUrl = ${API_BASE_URL}/api/outputs/<filename>`，前端不再 `fetchOutputBlob` |

## Technical Approach

### 数据库

**新增表**：

```ts
// backend/src/db/schema.ts (drizzle)
export const imageRecords = sqliteTable('image_records', {
  id:          text('id').primaryKey(),                       // image filename uuid (matches /api/outputs/<filename>)
  batchId:     text('batch_id').notNull(),
  userId:      text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  prompt:      text('prompt').notNull(),
  model:       text('model').notNull(),
  referenceId: text('reference_id'),
  aspectRatio: text('aspect_ratio'),
  filename:    text('filename').notNull(),                    // = id today; future-proof if we ever split
  mime:        text('mime').notNull(),
  width:       integer('width').notNull(),
  height:      integer('height').notNull(),
  elapsedMs:   integer('elapsed_ms'),
  createdAt:   integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  byUserCreatedAt: index('image_records_user_created_idx').on(t.userId, t.createdAt),
  byBatch:         index('image_records_batch_idx').on(t.batchId),
}));
```

**接管现有表**：

- `user` / `session` / `account` / `verification` 用 Better Auth 提供的 drizzle schema（参考 better-auth.com/docs/adapters/drizzle）；`config/auth.ts` 切换到 `drizzleAdapter(db, { provider: 'sqlite' })`
- `user_quota` 用 drizzle 重写 schema；`userQuota.service.ts` 切到 drizzle queries（保持函数签名）
- 增加 `drizzle-kit generate` 输出第一份 baseline migration（含全部 6 张表 + 索引）；启动时跑 `migrate()` 确保 schema 已建

### 后端 API

**新增 router** `backend/src/routes/history.ts`，挂在 `/api/history`，gated by `requireAuth`：

| Method | Path | 行为 |
|---|---|---|
| GET | `/api/history` | 返回当前用户全部 records，按 `createdAt DESC` |
| DELETE | `/api/history/batch/:batchId` | 删该用户该 batch 的全部 records；不动文件 |
| DELETE | `/api/history/:id` | 删单条 record |

**写入路径**：`controllers/images.controller.generate` 在 `userQuota.consume` 成功之后、构造响应之前 **批量 insert** 进 `image_records`，单事务包住。

**新增依赖**：
- `drizzle-orm`
- `drizzle-kit`（dev）

**新增/修改文件**：
- 新：`backend/src/db/schema.ts` — drizzle schema（6 张表）
- 新：`backend/src/db/index.ts` — 导出 `drizzle(sqlite)` 实例；`migrate()` helper
- 新：`backend/drizzle.config.ts`
- 新：`backend/src/services/history.service.ts` / `services/imageRecord.service.ts`
- 新：`backend/src/controllers/history.controller.ts`
- 新：`backend/src/routes/history.ts`
- 改：`backend/src/db/sqlite.ts`（依然导出底层 `better-sqlite3` 单例，给 drizzle / better-auth 共用）
- 改：`backend/src/config/auth.ts` —— `drizzleAdapter` + schema 引用
- 改：`backend/src/services/userQuota.service.ts` —— 改写为 drizzle queries
- 改：`backend/src/controllers/images.controller.ts` —— generate 路径插入 image_records
- 改：`backend/src/app.ts` —— 挂载 `/api/history` 路由 + 启动时 `migrate()`
- 改：`backend/package.json` —— deps + `db:generate` / `db:migrate` scripts

### 前端

**改造 `useImageHistory.ts`**：
- 移除 `indexedDb` / `localStorageMeta` 依赖
- `hydrate()`：调 `historyApi.list()` → 把 records 写进 ref；entry.imageUrl 改为 `buildApiUrl(/api/outputs/<filename>)`
- `add(record, blob)` → `add(record)`：仅维护本地 ref（生成成功后乐观插入），不再写 IndexedDB
- `remove(id)` / `removeBatch(batchId)` → 调 `historyApi.deleteOne(id)` / `historyApi.deleteBatch(batchId)`
- `refresh()` 重新拉取
- 接口对外保持兼容（`entries` / `batches` / `getEntry` / `getBatch`）

**改造 `useImageGeneration.ts`**：
- 不再 `fetchOutputBlob` 拷贝到本地
- `add(record)` 仅传 record（不传 blob）

**新增** `frontend/src/services/api/historyApi.ts` —— 三个端点的 fetch 包装，沿用 `authedFetch` + `credentials: 'include'`。

**删除**：
- `frontend/src/services/storage/indexedDb.ts`
- `frontend/src/services/storage/localStorageMeta.ts`
- `frontend/tests/services/storage.spec.ts`（如果还存在）
- `frontend/tests/composables/useImageHistory.spec.ts` 改写为 mock fetch

### Cross-Layer 数据流

```
Generate flow:
  Frontend → POST /api/images/generate
         ← { batchId, images: [{id, outputUrl, filename, mime, w, h}, ...] }
  Frontend useImageHistory.add(record)  (record contains filename + meta)
  Frontend img src = ${API_BASE_URL}/api/outputs/<filename>

History page:
  Frontend useImageHistory.hydrate()
    → GET /api/history
    ← [{id, batchId, prompt, model, ..., filename, mime, w, h, createdAt, elapsedMs}, ...]
  imageUrl 由前端构造

Delete:
  Frontend useImageHistory.removeBatch(batchId)
    → DELETE /api/history/batch/:batchId
    ← 204 (or 200)
  Frontend 同步去掉本地 ref
```

## Requirements

1. drizzle 接管全部 6 张表；首次 `db:generate` 产出 baseline migration；`backend/src/index.ts` 启动时 `migrate(db, { migrationsFolder: './drizzle' })`。
2. `GET /api/history` 返回当前用户全部 records（按 createdAt DESC），未登录 → 401。
3. `DELETE /api/history/batch/:batchId` 删该用户该 batch 的所有 records；其它用户的 batch 在 SQL 层就排除（`WHERE userId = ?`），返回 204。
4. `DELETE /api/history/:id` 同上 单条版本。
5. `POST /api/images/generate` 在原有逻辑之后批量 insert image_records，单事务，userId 来自 `req.user.id`。
6. 前端 `useImageHistory` 完全切到 history API；`indexedDb.ts` / `localStorageMeta.ts` 删除；UI 层（`HistoryView` / `HistoryGrid` / `HistoryDetailPanel` / `RecentCreationsMasonry`）无需改动（接口兼容）。
7. 删除 `useImageGeneration` 里的 `fetchOutputBlob` 调用；图片 src 走远端 URL。
8. `backend/spec/database-guidelines.md` 同步更新：drizzle 接管 + image_records schema + migrations 流程；`frontend/spec/state-management.md` 同步更新：history 来源切换。

## Acceptance Criteria

- [ ] **AC1**：未登录 `GET /api/history` → 401 UNAUTHORIZED
- [ ] **AC2**：A 用户生成 1 张 → `GET /api/history` 返回该条；B 用户调同接口返回不含 A 的记录
- [ ] **AC3**：A 用户生成 1 batch 后 `DELETE /api/history/batch/:batchId` → 该 batch 从 A 的列表消失，B 不受影响
- [ ] **AC4**：A 用户 Chrome 生成图片 → Firefox 登录 A → 历史页能看到该次生成
- [ ] **AC5**：从空库 `npm run db:migrate` → 完整 6 张表 + 索引建好；后续 boot 再跑 migrate 是 no-op
- [ ] **AC6**：前端 `npm run typecheck` + `lint` + `vitest` 全绿；后端同
- [ ] **AC7**：现有 e2e smoke（05-12 任务范围）通过，未引入回归

## Definition of Done

- 后端：drizzle schema、migration 文件 committed；history service + controller + router + tests；userQuota / auth 切到 drizzle 后回归测试
- 前端：useImageHistory + useImageGeneration 改造；historyApi + tests；删除 IndexedDB / localStorage 模块；UI 视觉零回归
- spec：backend/database-guidelines.md、frontend/state-management.md、backend/directory-structure.md（新增 db/schema/migrations）、frontend/directory-structure.md（删 storage/ 子模块）同步更新
- README / spec 写明 drizzle 操作（`db:generate`、`db:migrate`）

## Decision (ADR-lite)

**Context**: PR1 把鉴权与 per-user quota 接入后，历史仍滞留在 IndexedDB → 用户换设备/换浏览器即丢全部历史。PR2 目标是把历史搬到后端、让账号成为历史的归属。

**Decision**:
- 纯服务器源（删 IndexedDB），不留双源 / 不留 cache
- 旧本地数据静默丢弃（用户基数小，迁移收益低于成本）
- drizzle 一次性接管全部 6 张表，避免 raw / ORM 混存的长期负担
- 删除只动 DB，文件留给 PR3 处理
- 不分页（量级足够）

**Consequences**:
- 离线无法看历史；用户换设备时空列表 = 正常态
- 性能上限：所有历史一次返回，>10k 行后必须加分页（保留 `?limit/offset` query param 作为后期扩展点）
- OUTPUT_DIR 短期会有孤儿文件（被 DELETE 后），PR3 文件迁移阶段会 GC

## Out of Scope（本任务）

- 图片二进制按 userId 隔离 + outputs 鉴权（PR3）
- 历史搜索 / 标签 / 收藏 / 公开分享
- 软删除 / 回收站
- 服务端缩略图生成
- 旧 IndexedDB 数据迁移
- 分页 / cursor / 无限滚动
- 多端 push（生成后另一设备自动刷新历史）

## Technical Notes

- `useImageHistory` 对外接口保持兼容 → UI 零改动
- drizzle + Better Auth 整合参考 PR1 的 `research/auth-stack.md` + `research/db-orm.md`（已 archived 到 `.trellis/tasks/archive/2026-05/05-13-user-login-auth/research/`）
- Better Auth 提供 `drizzle-adapter` + 推荐的 schema 文件 —— 切换时确保字段类型与现有 SQLite 列对得上（用 `DROP TABLE IF NOT EXISTS` + recreate 不可取，因为现有 user 表里有数据；要写迁移）
- 由于现存 SQLite 已经有 Better Auth 自建的 4 张表 + `user_quota`，drizzle baseline migration 必须 **匹配现状**，不可推空库脚本然后 `npx drizzle-kit push` 强写 —— 否则线上库会被破坏。流程：先 `drizzle-kit introspect` 把现有表抓回 schema，再补 image_records 字段后 `drizzle-kit generate` 出增量 migration。
- 现有 e2e 测试任务（05-12）未完成；本任务实现时注意不要踩它的进行中改动；如果两个任务的 spec 修改有冲突，先沟通
