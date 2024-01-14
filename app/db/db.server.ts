import { drizzle } from 'drizzle-orm/d1'
import * as schema from '#/app/db/schema.server'

export function db(database: D1Database) {
    return drizzle(database, {
        schema,
    })
}
