/// <reference types="@remix-run/dev" />
/// <reference types="@cloudflare/workers-types" />

import '@remix-run/cloudflare'

declare module '@remix-run/cloudflare' {
    export interface AppLoadContext {
        env: {
            SHRNQ_KV: KVNamespace
            SHRNQ_DB: D1Database
            NODE_ENV: 'development' | 'production'
            SESSION_SECRET: string | undefined
            HONEYPOT_SECRET: string | undefined
        }
    }
}
