import type { Config } from 'drizzle-kit'

export default {
    schema: './app/db/schema.server.ts',
    driver: 'd1',
    dbCredentials: {
        dbName: 'shrnq_db',
        wranglerConfigPath: 'wrangler.toml',
    },
    out: './migrations',
    verbose: true,
} satisfies Config
