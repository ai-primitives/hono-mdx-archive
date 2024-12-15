import type { HtmlEscapedString } from 'hono/utils/html'

export type FC<P = {}> = (props: P) => HtmlEscapedString | Promise<HtmlEscapedString>
