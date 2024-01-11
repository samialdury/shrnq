/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

import '@remix-run/cloudflare'

declare module '@remix-run/cloudflare' {
    export interface AppLoadContext {
        env: {
            SHRNQ: KVNamespace
            NODE_ENV: 'development' | 'production'
            BASE_URL: string | undefined
            SESSION_SECRET: string | undefined
            HONEYPOT_SECRET: string | undefined
        }
    }
}
