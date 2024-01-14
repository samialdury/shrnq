import { db } from '#app/db/db.server'
import { authenticators } from '#app/db/schema.server'
import { Authenticator } from '#app/modules/authenticator/model.server'
import { User } from '#app/modules/user/model.server'

export const authenticatorRepo = {
    async getAuthenticatorById(
        d1: D1Database,
        id: string,
    ): Promise<Authenticator | undefined> {
        return db(d1).query.authenticators.findFirst({
            where: ({ credentialID }, { eq }) => eq(credentialID, id),
        })
    },
    async createAuthenticator(
        d1: D1Database,
        authenticator: Omit<Authenticator, 'userId' | 'createdAt'>,
        userId: User['id'],
    ): Promise<void> {
        await db(d1)
            .insert(authenticators)
            .values({
                ...authenticator,
                userId,
            })
    },
    async getUserAuthenticators(
        d1: D1Database,
        userId: User['id'],
    ): Promise<Authenticator[]> {
        return db(d1).query.authenticators.findMany({
            where: (c, { eq }) => eq(c.userId, userId),
        })
    },
}
