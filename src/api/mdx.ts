import { Hono } from 'hono'
import { StorageAdapter } from '../storage/types'
import { validator } from 'hono/validator'
import { object, string, record, unknown, optional, parse } from 'valibot'
import { MDXRenderError } from '../utils/errors'

const mdxDocumentSchema = object({
  title: string(),
  content: string(),
  metadata: optional(record(unknown()))
})

export function createMDXApi(storage: StorageAdapter) {
  const app = new Hono()

  // Create MDX document
  app.post('/', validator('json', (value) => parse(mdxDocumentSchema, value)), async (c) => {
    try {
      const doc = await storage.create(c.req.valid('json'))
      return c.json(doc, 201)
    } catch (error) {
      console.error('Error creating MDX document:', error)
      throw new MDXRenderError('Failed to create MDX document')
    }
  })

  // Read MDX document
  app.get('/:id', async (c) => {
    try {
      const doc = await storage.read(c.req.param('id'))
      if (!doc) {
        return c.json({ error: 'Document not found' }, 404)
      }
      return c.json(doc)
    } catch (error) {
      console.error('Error reading MDX document:', error)
      throw new MDXRenderError('Failed to read MDX document')
    }
  })

  // Update MDX document
  app.put('/:id', validator('json', (value) => parse(mdxDocumentSchema, value)), async (c) => {
    try {
      const doc = await storage.update(c.req.param('id'), c.req.valid('json'))
      return c.json(doc)
    } catch (error) {
      console.error('Error updating MDX document:', error)
      if (error.message.includes('not found')) {
        return c.json({ error: 'Document not found' }, 404)
      }
      throw new MDXRenderError('Failed to update MDX document')
    }
  })

  // Delete MDX document
  app.delete('/:id', async (c) => {
    try {
      await storage.delete(c.req.param('id'))
      return c.json({ success: true })
    } catch (error) {
      console.error('Error deleting MDX document:', error)
      throw new MDXRenderError('Failed to delete MDX document')
    }
  })

  // List MDX documents
  app.get('/', async (c) => {
    try {
      const limit = parseInt(c.req.query('limit') ?? '100')
      const offset = parseInt(c.req.query('offset') ?? '0')
      const docs = await storage.list({ limit, offset })
      return c.json(docs)
    } catch (error) {
      console.error('Error listing MDX documents:', error)
      throw new MDXRenderError('Failed to list MDX documents')
    }
  })

  return app
}
