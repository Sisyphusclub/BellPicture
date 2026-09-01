import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// --- Better Auth core tables ---
// Schema mirrors better-auth.com/docs/concepts/database (sqlite + ms timestamps).

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  image: text('image'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    byUser: index('session_user_idx').on(t.userId),
  }),
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    issuer: text('issuer').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    byUser: index('account_user_idx').on(t.userId),
    byProviderAccount: index('account_provider_account_idx').on(t.providerId, t.accountId),
    byIssuerAccount: uniqueIndex('account_issuer_account_idx').on(t.issuer, t.accountId),
  }),
);

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// --- App tables ---

export const userQuota = sqliteTable('user_quota', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  usedToday: integer('used_today').notNull().default(0),
  quotaDate: text('quota_date').notNull(), // ISO 'YYYY-MM-DD' (Asia/Shanghai)
  dailyTotal: integer('daily_total'),
  checkInDate: text('check_in_date'),
  bonusToday: integer('bonus_today').notNull().default(0),
  /** Lifetime quota configured by an administrator. Kept nullable for old rows. */
  permanentTotal: integer('permanent_total'),
  /** Lifetime quota consumed (including active reservations). */
  permanentUsed: integer('permanent_used'),
});

export const quotaGrants = sqliteTable(
  'quota_grants',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    source: text('source').notNull().default('check_in'),
    amount: integer('amount').notNull(),
    remaining: integer('remaining').notNull(),
    grantedAt: integer('granted_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    checkInDate: text('check_in_date').notNull(),
  },
  (t) => ({
    byUserExpiry: index('quota_grants_user_expiry_idx').on(t.userId, t.expiresAt),
    byUserSourceDate: uniqueIndex('quota_grants_user_source_date_idx').on(
      t.userId,
      t.source,
      t.checkInDate,
    ),
  }),
);

export const referenceUploads = sqliteTable(
  'reference_uploads',
  {
    filename: text('filename').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    byUserCreatedAt: index('reference_uploads_user_created_idx').on(t.userId, t.createdAt),
  }),
);

export const imageRecords = sqliteTable(
  'image_records',
  {
    id: text('id').primaryKey(), // = filename uuid (matches /api/outputs/<id>)
    batchId: text('batch_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    prompt: text('prompt').notNull(),
    model: text('model').notNull(),
    referenceId: text('reference_id'),
    referenceIds: text('reference_ids'),
    aspectRatio: text('aspect_ratio'),
    filename: text('filename').notNull(),
    mime: text('mime').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    count: integer('count').notNull().default(1),
    resolution: text('resolution').notNull().default('standard'),
    elapsedMs: integer('elapsed_ms'),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    collection: text('collection'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    byUserCreatedAt: index('image_records_user_created_idx').on(t.userId, t.createdAt),
    byBatch: index('image_records_batch_idx').on(t.batchId),
    byPublicCreatedId: index('image_records_public_created_id_idx').on(
      t.isPublic,
      t.createdAt,
      t.id,
    ),
  }),
);
