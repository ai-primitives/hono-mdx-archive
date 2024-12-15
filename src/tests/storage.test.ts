import { describe, it, expect, beforeEach, vi } from 'vitest'
import { D1Storage } from '../storage/d1'
import { ClickhouseStorage } from '../storage/clickhouse'
import type { D1Database } from '@cloudflare/workers-types'

describe('Storage Providers', () => {
  describe('D1 Storage', () => {
    let d1Storage: D1Storage
    const mockDb = {
      exec: vi.fn(),
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(),
      run: vi.fn(),
      all: vi.fn()
    } as unknown as D1Database

    beforeEach(async () => {
      d1Storage = new D1Storage(mockDb)
      await d1Storage.init()
    })

    it('should initialize the database schema', () => {
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS'))
    })

    it('should create and retrieve MDX documents', async () => {
      const doc = {
        title: 'Test Document',
        content: '# Test Content',
        metadata: { author: 'Test Author' }
      }

      mockDb.first.mockResolvedValueOnce({
        id: 'test-uuid',
        title: doc.title,
        content: doc.content,
        metadata: JSON.stringify(doc.metadata),
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      })

      const created = await d1Storage.create(doc)
      expect(created.id).toBeDefined()
      expect(created.title).toBe(doc.title)

      const retrieved = await d1Storage.read(created.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.content).toBe(doc.content)
    })
  })

  describe('Clickhouse Storage', () => {
    let clickhouseStorage: ClickhouseStorage
    const mockClient = {
      exec: vi.fn(),
      query: vi.fn(),
      insert: vi.fn()
    }

    beforeEach(async () => {
      clickhouseStorage = new ClickhouseStorage({
        url: 'http://localhost:8123',
        database: 'test_db'
      })
      // @ts-ignore - Replace client with mock
      clickhouseStorage.client = mockClient
      await clickhouseStorage.init()
    })

    it('should initialize the database schema', () => {
      expect(mockClient.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CREATE TABLE IF NOT EXISTS')
        })
      )
    })

    it('should create and retrieve MDX documents', async () => {
      const doc = {
        title: 'Test Document',
        content: '# Test Content',
        metadata: { author: 'Test Author' }
      }

      mockClient.query.mockResolvedValueOnce({
        json: async () => [{
          id: 'test-uuid',
          title: doc.title,
          content: doc.content,
          metadata: JSON.stringify(doc.metadata),
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }]
      })

      const created = await clickhouseStorage.create(doc)
      expect(created.id).toBeDefined()
      expect(created.title).toBe(doc.title)

      const retrieved = await clickhouseStorage.read(created.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.content).toBe(doc.content)
    })
  })
})
