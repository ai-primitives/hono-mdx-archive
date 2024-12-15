import type { StorageAdapter } from '@openauthjs/openauth/storage/storage'
import type { D1Database } from '@cloudflare/workers-types'
import { joinKey, splitKey } from '@openauthjs/openauth/storage/storage'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tokens (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tokens_expires ON tokens(expires);
`

export class D1Storage implements StorageAdapter {
  constructor(private db: D1Database) {
    // Initialize schema
    this.db.exec(SCHEMA)
  }

  async get(key: string[]): Promise<Record<string, any> | undefined> {
    const result = await this.db
      .prepare('SELECT value FROM tokens WHERE key = ? AND (expires IS NULL OR expires > ?)')
      .bind(joinKey(key), Date.now())
      .first<{ value: string }>()

    return result ? JSON.parse(result.value) : undefined
  }

  async set(key: string[], value: any, expiry?: Date): Promise<void> {
    const expires = expiry ? expiry.getTime() : null
    await this.db
      .prepare('INSERT OR REPLACE INTO tokens (key, value, expires, created_at) VALUES (?, ?, ?, ?)')
      .bind(joinKey(key), JSON.stringify(value), expires, Date.now())
      .run()
  }

  async remove(key: string[]): Promise<void> {
    await this.db.prepare('DELETE FROM tokens WHERE key = ?').bind(joinKey(key)).run()
  }

  async *scan(prefix: string[]): AsyncIterable<[string[], any]> {
    const prefixStr = joinKey(prefix)
    const stmt = this.db.prepare(
      'SELECT key, value FROM tokens WHERE key LIKE ? || \'%\' AND (expires IS NULL OR expires > ?)'
    )
    const result = await stmt.bind(prefixStr, Date.now()).all<{ key: string; value: string }>()

    if (!result?.results) return

    for (const row of result.results) {
      yield [splitKey(row.key), JSON.parse(row.value)]
    }
  }
}
