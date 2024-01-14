import { users } from '#app/db/schema.server'

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
