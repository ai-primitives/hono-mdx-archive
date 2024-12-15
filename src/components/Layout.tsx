/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import { html } from 'hono/html'

const Layout: FC = ({ children }) => {
  const content = html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MDX App</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          .prose { max-width: 65ch; margin: 0 auto; }
          .prose.dark\:prose-invert { color: white; background: #1a1a1a; }
        </style>
      </head>
      <body>
        <main class="container mx-auto px-4 py-8 prose dark:prose-invert">
          <div class="mdx-content">
            ${children}
          </div>
        </main>
      </body>
    </html>
  `
  return content
}

export default Layout
