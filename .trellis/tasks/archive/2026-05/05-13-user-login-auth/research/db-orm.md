# Research: DB + ORM 选型

调研时间：2026-05-13。资料来源：context7（Drizzle、Better Auth）+ 主流社区共识。WebSearch 受 Calcium-Ion 网关拦截，无法外联，未做新数据抓取。

## 上下文

- 零 DB → 引入第一份持久化
- PR1 表：仅 `users` / `session` / `account` / `verification`（Better Auth 自动建）+ 内存型 per-user quota
- PR2 表（未来）：`image_records`（千万级潜在量级，索引 `userId + createdAt`）
- 部署：单实例 / 单 VM / solo dev
- 需求：并发 quota 扣减需要事务一致；ESM-only 后端

## DB 选型

| DB | 优势 | 劣势 | 对本项目 |
|---|---|---|---|
| **SQLite (`better-sqlite3`)** | 单文件、零运维、同进程零网络延迟、事务原子且非常快、备份 = 复制文件 | 单写并发（但读多写少 + WAL 模式没问题）；分布式部署不友好 | ✅ 单实例自托管首选 |
| Postgres (`pg`) | 多写并发、丰富类型、跨实例 | 多个独立进程、备份/迁移复杂、运维负担 | 单实例下属过度设计 |
| LibSQL / Turso | SQLite 协议 + 远端复制 | 多了一个第三方依赖、订阅成本 | 当前不需要 |
| DuckDB | 分析强 | OLTP 弱（不适合鉴权写） | 不适用 |

**结论：`better-sqlite3`**。
- 同步 API（在 Node 主线程，但单条 query 微秒级，远低于网络 HTTP / 模型生成的耗时；不会阻塞核心瓶颈）
- WAL 模式开启后读写并发友好
- 单文件备份/迁移简单
- Better Auth 官方推荐的 SQLite driver 就是它

PR1 启用 WAL：

```ts
import Database from 'better-sqlite3';
const db = new Database('./data/app.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
```

## ORM / Query Builder

| 工具 | DX | ESM | 体量 | 锁定 | 评价 |
|---|---|---|---|---|---|
| **drizzle-orm + drizzle-kit** | 一流 type 推断、schema-first、SQL-like API | 原生 ESM | 轻量 (~7kb) | 弱（schema 即 SQL，能直接读懂） | ✅ 推荐 |
| prisma | 优秀，含 Studio | ESM 支持（但 client codegen 大、运行时进程依赖） | 重 | 中等（自己的 DSL + 二进制 engine） | 单实例够用但偏重 |
| kysely | 纯 query builder、类型强 | 原生 ESM | 轻 | 弱 | 没有 schema/migration 工具链，需要自己拼 |
| 原生 `better-sqlite3` + 手写 SQL | 最透明 | OK | 0 抽象 | 无 | 没有 type 安全，可读性 |

### Drizzle + SQLite 起步样例

`backend/src/db/schema.ts`：

```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const imageRecords = sqliteTable('image_records', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').notNull(),
  userId: text('user_id').notNull(),
  prompt: text('prompt').notNull(),
  model: text('model').notNull(),
  referenceId: text('reference_id'),
  aspectRatio: text('aspect_ratio'),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  elapsedMs: integer('elapsed_ms'),
});
```

`backend/src/db/client.ts`：

```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../config/env.js';

const sqlite = new Database(env.SQLITE_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);
```

`drizzle.config.ts`：

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
```

迁移：

```bash
npx drizzle-kit generate     # 生成 SQL 文件
npx drizzle-kit migrate      # 应用迁移
```

## 与 Better Auth 的协作

Better Auth 自带 4 张表（user / session / account / verification），可以通过两种方式协作：

1. **PR1 直接传 `new Database(...)` 给 better-auth**，让 better-auth 用 raw better-sqlite3 adapter。**本项目 app 自有表暂时还没有，不需要 drizzle**。
2. **PR2 引入 drizzle 时**：用 better-auth 的 drizzle adapter，让 better-auth 与 app 共享同一 `db` 实例；`image_records` 等 app 表用 drizzle 定义。

迁移路径丝滑：PR1 用方式 1，PR2 切到方式 2 不需要 data migration（同一 SQLite 文件、表结构不变）。

## Migration 策略

- **PR1**：不需要 migration —— Better Auth 启动时自动 `db.create()`（也可以用其 CLI 生成 schema）
- **PR2**：drizzle-kit 接管迁移；将 better-auth 的 4 张表也合入 drizzle schema（Better Auth 文档提供 drizzle adapter 示范），统一 migration history

## Recommendation for this project

| PR1（本任务） | PR2+（后续任务） |
|---|---|
| `better-sqlite3` 直接传给 `betterAuth({ database: ... })` | 引入 `drizzle-orm` + `drizzle-kit` |
| **不引入 drizzle**，保持依赖最小 | drizzle 接管所有 app 表 + better-auth 切到 drizzle adapter |
| per-user quota 暂时用内存 Map（重启即失） | quota 持久化到 DB 表 |
| SQLite 文件路径写入 `.env.example` | 同上 |

### 理由

- PR1 范围已经够大（OAuth + 鉴权 + 前端登录页 + 路由守卫 + per-user quota refactor），多塞一个 ORM 增加 type/migration 验证成本，**先把端到端跑通**
- Better Auth 自带的 4 张表已经能满足 PR1 所有持久化需求
- PR2 引入 drizzle 时不影响已有数据，迁移代价低

### 已知坑位

- SQLite 文件需要持久化路径（不要落在 ephemeral 容器内 `/tmp`）
- WAL 模式下，备份要复制 `.sqlite` + `-wal` + `-shm` 三个文件，或用 `db.backup()` API
- `better-sqlite3` 是 native module，CI / 部署机需要能编译（或预编译二进制存在）

## 参考

- Drizzle SQLite docs（context7 `/drizzle-team/drizzle-orm-docs`）
- Drizzle + better-sqlite3: https://orm.drizzle.team/docs/get-started-sqlite
- Better Auth SQLite adapter: https://www.better-auth.com/docs/adapters/sqlite
- Better Auth Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle
