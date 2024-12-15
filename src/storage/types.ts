/**
 * Interface for MDX document storage
 */
export interface MDXDocument {
  id: string
  title: string
  content: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Interface for storage adapters
 */
export interface StorageAdapter {
  /**
   * Create a new MDX document
   */
  create(doc: Omit<MDXDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<MDXDocument>

  /**
   * Read an MDX document by ID
   */
  read(id: string): Promise<MDXDocument | null>

  /**
   * Update an existing MDX document
   */
  update(id: string, doc: Partial<MDXDocument>): Promise<MDXDocument>

  /**
   * Delete an MDX document by ID
   */
  delete(id: string): Promise<void>

  /**
   * List all MDX documents with optional pagination
   */
  list(options?: { limit?: number; offset?: number }): Promise<MDXDocument[]>
}
