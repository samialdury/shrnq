import { authenticators } from '#app/db/schema.server'

export type Authenticator = typeof authenticators.$inferSelect
export type NewAuthenticator = typeof authenticators.$inferInsert
