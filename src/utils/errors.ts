export class MDXCompilationError extends Error {
  constructor(message: string, public source?: string) {
    super(message)
    this.name = 'MDXCompilationError'
  }
}

export class MDXRenderError extends Error {
  constructor(message: string, public source?: string) {
    super(message)
    this.name = 'MDXRenderError'
  }
}
