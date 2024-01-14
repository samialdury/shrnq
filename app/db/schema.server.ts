import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('user', {
    id: text('id').notNull().primaryKey(),
    username: text('username').notNull().unique(),

    createdAt: text('createdAt')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
})

export const authenticators = sqliteTable(
    'authenticator',
    {
        credentialID: text('credentialID').notNull(),
        userId: text('userId')
            .notNull()
            .references(() => users.id),
        credentialPublicKey: text('credentialPublicKey').notNull(),
        counter: integer('counter').notNull(),
        credentialDeviceType: text('credentialDeviceType').notNull(),
        credentialBackedUp: integer('credentialBackedUp', {
            mode: 'boolean',
        }).notNull(),
        transports: text('transports').notNull(),

        createdAt: text('createdAt')
            .notNull()
            .default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => {
        return {
            credentialIDx: index('credentialIDx').on(t.credentialID),
        }
    },
)
