/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'

export const Layout: FC = ({ children }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>MDX App</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css" />
      <link rel="stylesheet" href="https://cdn.tailwindcss.com" />
    </head>
    <body>
      <main className="container mx-auto px-4 py-8">
        <div className="prose dark:prose-invert">
          {children}
        </div>
      </main>
    </body>
  </html>
)
