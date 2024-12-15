import { D1Database } from '@cloudflare/workers-types'
import type { MDXDocument, StorageAdapter } from './types'

const TABLE_NAME = 'mdx_documents'

export class D1Storage implements StorageAdapter {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  async init() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  async create(doc: Omit<MDXDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<MDXDocument> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await this.db.prepare(`
      INSERT INTO ${TABLE_NAME} (id, title, content, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      doc.title,
      doc.content,
      JSON.stringify(doc.metadata),
      now,
      now
    ).run()

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
    const result = await this.db.prepare(`
      SELECT * FROM ${TABLE_NAME} WHERE id = ?
    `).bind(id).first()

    if (!result) return null

    return {
      id: result.id as string,
      title: result.title as string,
      content: result.content as string,
      metadata: JSON.parse(result.metadata as string),
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string
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

    await this.db.prepare(`
      UPDATE ${TABLE_NAME}
      SET title = ?, content = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      updates.title,
      updates.content,
      updates.metadata,
      updates.updated_at,
      id
    ).run()

    return {
      ...current,
      ...doc,
      updatedAt: now
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare(`
      DELETE FROM ${TABLE_NAME} WHERE id = ?
    `).bind(id).run()
  }

  async list(options: { limit?: number; offset?: number } = {}): Promise<MDXDocument[]> {
    const { limit = 100, offset = 0 } = options

    const results = await this.db.prepare(`
      SELECT * FROM ${TABLE_NAME}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()

    return results.results?.map(row => ({
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      metadata: JSON.parse(row.metadata as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    })) ?? []
  }
}
