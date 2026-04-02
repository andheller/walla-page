export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS room_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    room_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    active_scene_id TEXT,
    current_loop_asset_key TEXT,
    current_loop_volume REAL NOT NULL DEFAULT 0.3,
    current_loop_until INTEGER,
    total_bytes INTEGER NOT NULL DEFAULT 0,
    idle_since INTEGER,
    cleanup_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS pair_tokens (
    token TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS room_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS schedule_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    markup TEXT NOT NULL,
    start_at INTEGER NOT NULL,
    end_at INTEGER NOT NULL,
    audio_asset_key TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_start ON schedule_entries (status, start_at)`
] as const;

export function initializeSchema(sql: SqlStorage, roomId: string, now: number) {
  for (const statement of SCHEMA_STATEMENTS) {
    sql.exec(statement);
  }

  sql.exec(
    `INSERT OR IGNORE INTO room_state (id, room_id, created_at, total_bytes)
     VALUES (1, ?, ?, 0)`,
    roomId,
    now
  );
}

export function row<T extends Record<string, SqlStorageValue>>(cursor: SqlStorageCursor<T>): T | null {
  const rows = cursor.toArray();
  return rows[0] ?? null;
}
