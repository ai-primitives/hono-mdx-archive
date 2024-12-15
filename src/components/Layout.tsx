import { jsx } from 'hono/jsx'
import type { FC, PropsWithChildren } from 'hono/jsx'

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return jsx('div', {
    children: [
      jsx('head', {
        children: [
          jsx('link', {
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css'
          }),
          jsx('script', {
            src: 'https://cdn.tailwindcss.com',
            defer: true
          })
        ]
      }),
      jsx('main', {
        className: 'container mx-auto px-4 py-8',
        children
      })
    ]
  })
}
