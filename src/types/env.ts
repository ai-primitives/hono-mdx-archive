import type { Env as BaseEnv } from 'hono/types'
import type { D1Database } from '@cloudflare/workers-types'
import type { UserInfo } from '../auth/types'
import type { StorageAdapter } from '../storage/types'

export interface Env extends BaseEnv {
  Bindings: {
    // Auth configuration
    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
    APP_URL: string

    // Storage configuration
    AUTH_DB: D1Database
    CLICKHOUSE_URL?: string
    CLICKHOUSE_DB?: string
    CLICKHOUSE_USER?: string
    CLICKHOUSE_PASSWORD?: string

    // Deployment configuration
    CF_ACCOUNT_ID?: string
    CF_API_TOKEN?: string
  }
  Variables: {
    user?: UserInfo
    storage?: StorageAdapter
  }
}

export type { Env as HonoEnv }
