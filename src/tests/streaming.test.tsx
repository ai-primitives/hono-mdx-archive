import { describe, it, expect, vi } from 'vitest'
import { jsx } from 'hono/jsx'
import { createMDXRenderer } from '../components/MDXComponent'
import { Context } from 'hono'

describe('MDX Streaming', () => {
  it('should create streaming renderer', async () => {
    const source = `# Hello World

This is a test paragraph with **bold** text.

- List item 1
- List item 2`

    const renderer = createMDXRenderer(source)
    const mockContext = {
      body: vi.fn().mockReturnValue({ status: 200 })
    } as unknown as Context

    await renderer(mockContext)

    expect(mockContext.body).toHaveBeenCalledWith(
      expect.any(ReadableStream),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'text/html; charset=UTF-8',
          'Transfer-Encoding': 'chunked'
        })
      })
    )
  })

  it('should handle async content in streams', async () => {
    const asyncContent = await new Promise(resolve =>
      setTimeout(() => resolve('Async content loaded!'), 100)
    )

    const source = `# Test Page

## Dynamic Content

${asyncContent}

- This content was loaded asynchronously
- Using Suspense and streaming`

    const renderer = createMDXRenderer(source)
    const mockContext = {
      body: vi.fn().mockReturnValue({ status: 200 })
    } as unknown as Context

    await renderer(mockContext)

    expect(mockContext.body).toHaveBeenCalledWith(
      expect.any(ReadableStream),
      expect.any(Object)
    )
  })
})
