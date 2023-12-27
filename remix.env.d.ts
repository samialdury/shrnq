/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

import '@remix-run/cloudflare'

declare module '@remix-run/cloudflare' {
    export interface AppLoadContext {
        env: {
            SHRNQ: KVNamespace
        }
    }
}
