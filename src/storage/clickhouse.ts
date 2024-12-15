import { createClient, type ClickHouseClient } from '@clickhouse/client-web'
import type { MDXDocument, StorageAdapter } from './types'

const TABLE_NAME = 'mdx_documents'

export class ClickhouseStorage implements StorageAdapter {
  private client: ClickHouseClient

  constructor(config: { url: string; database: string; username?: string; password?: string }) {
    this.client = createClient({
      host: config.url,
      database: config.database,
      username: config.username,
      password: config.password
    })
  }

  async init() {
    await this.client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id String,
          title String,
          content String,
          metadata String,
          created_at DateTime64(3),
          updated_at DateTime64(3)
        ) ENGINE = MergeTree()
        ORDER BY (created_at, id)
      `
    })
  }


  async create(doc: Omit<MDXDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<MDXDocument> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await this.client.insert({
      table: TABLE_NAME,
      values: [{
        id,
        title: doc.title,
        content: doc.content,
        metadata: JSON.stringify(doc.metadata),
        created_at: now,
        updated_at: now
      }],
      format: 'JSONEachRow'
    })

    return {
      id,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
      createdAt: now,
      updatedAt: now
    }
  }

  async read(id: string): Promise<MDXDocument | null> {
    const result = await this.client.query({
      query: `
        SELECT *
        FROM ${TABLE_NAME}
        WHERE id = {id:String}
        LIMIT 1
      `,
      query_params: {
        id
      },
      format: 'JSONEachRow'
    })

    const row = await result.json()
    if (!row.length) return null

    const doc = row[0]
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      metadata: JSON.parse(doc.metadata),
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    }
  }

  async update(id: string, doc: Partial<MDXDocument>): Promise<MDXDocument> {
    const now = new Date().toISOString()
    const current = await this.read(id)

    if (!current) {
      throw new Error(`Document with id ${id} not found`)
    }

    const updates = {
      title: doc.title ?? current.title,
      content: doc.content ?? current.content,
      metadata: JSON.stringify(doc.metadata ?? current.metadata),
      updated_at: now
    }

    await this.client.exec({
      query: `
        ALTER TABLE ${TABLE_NAME}
        UPDATE
          title = {title:String},
          content = {content:String},
          metadata = {metadata:String},
          updated_at = {updated_at:String}
        WHERE id = {id:String}
      `,
      query_params: {
        ...updates,
        id
      }
    })

    return {
      ...current,
      ...doc,
      updatedAt: now
    }
  }

  async delete(id: string): Promise<void> {
    await this.client.exec({
      query: `
        ALTER TABLE ${TABLE_NAME}
        DELETE WHERE id = {id:String}
      `,
      query_params: {
        id
      }
    })
  }

  async list(options: { limit?: number; offset?: number } = {}): Promise<MDXDocument[]> {
    const { limit = 100, offset = 0 } = options

    const result = await this.client.query({
      query: `
        SELECT *
        FROM ${TABLE_NAME}
        ORDER BY created_at DESC
        LIMIT {limit:UInt32}
        OFFSET {offset:UInt32}
      `,
      query_params: {
        limit,
        offset
      },
      format: 'JSONEachRow'
    })

    const rows = await result.json()
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }
}
