import { db } from '#app/db/db.server'
import { users } from '#app/db/schema.server'
import { nanoid } from '#app/lib/id.server'
import { User } from '#app/modules/user/model.server'

export const userRepo = {
    async getUserById(d1: D1Database, id: string): Promise<User | undefined> {
        return db(d1).query.users.findFirst({
            where: ({ id: userId }, { eq }) => eq(userId, id),
        })
    },
    async getUserByUsername(
        d1: D1Database,
        username: string,
    ): Promise<User | undefined> {
        return db(d1).query.users.findFirst({
            where: ({ username: userUsername }, { eq }) =>
                eq(userUsername, username),
        })
    },
    async createUser(
        d1: D1Database,
        username: string,
    ): Promise<Omit<User, 'createdAt'>> {
        const result = await db(d1)
            .insert(users)
            .values({
                id: nanoid(10),
                username,
            })
            .returning({
                id: users.id,
                username: users.username,
            })
        console.log(result)
        return result[0]
    },
}
