import type { StorageAdapter } from '@openauthjs/openauth/storage/storage'
import { createClient } from '@clickhouse/client-web'
import { joinKey, splitKey } from '@openauthjs/openauth/storage/storage'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tokens (
  key String,
  value String,
  expires DateTime64(3) NULL,
  created_at DateTime64(3)
) ENGINE = MergeTree()
ORDER BY key
`

export class ClickhouseStorage implements StorageAdapter {
  private client

  constructor(url: string, database: string, username: string, password: string) {
    this.client = createClient({
      host: url,
      database,
      username,
      password,
    })
    // Initialize schema
    this.client.exec({ query: SCHEMA })
  }

  async get(key: string[]): Promise<Record<string, any> | undefined> {
    const result = await this.client.query({
      query: `
        SELECT value
        FROM tokens
        WHERE key = {key: String}
        AND (expires IS NULL OR expires > now())
        LIMIT 1
      `,
      query_params: { key: joinKey(key) }
    })
    const rows = await result.json()
    return rows.length > 0 ? JSON.parse(rows[0].value) : undefined
  }

  async set(key: string[], value: any, expiry?: Date): Promise<void> {
    await this.client.exec({
      query: `
        INSERT INTO tokens (key, value, expires, created_at)
        VALUES ({key: String}, {value: String}, {expires: DateTime64(3)}, now())
      `,
      query_params: {
        key: joinKey(key),
        value: JSON.stringify(value),
        expires: expiry?.toISOString() ?? null
      }
    })
  }

  async remove(key: string[]): Promise<void> {
    await this.client.exec({
      query: 'DELETE FROM tokens WHERE key = {key: String}',
      query_params: { key: joinKey(key) }
    })
  }

  async *scan(prefix: string[]): AsyncIterable<[string[], any]> {
    const result = await this.client.query({
      query: `
        SELECT key, value
        FROM tokens
        WHERE key LIKE concat({prefix: String}, '%')
        AND (expires IS NULL OR expires > now())
      `,
      query_params: { prefix: joinKey(prefix) }
    })

    const rows = await result.json()
    for (const row of rows) {
      yield [splitKey(row.key), JSON.parse(row.value)]
    }
  }
}
