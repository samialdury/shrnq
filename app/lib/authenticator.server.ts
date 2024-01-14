// /app/authenticator.server.ts
import { WebAuthnStrategy } from '@samialdury/remix-auth-webauthn'
import { Authenticator } from 'remix-auth'
import { session } from '#/app/lib/session.server'
import { invariant } from '#app/lib/utils'
import { authenticatorRepo } from '#app/modules/authenticator/repository.server'
import { userRepo } from '#app/modules/user/repository.server'

interface AuthUser {
    id: string
    username: string
}

export const webAuthnStrategy = new WebAuthnStrategy<AuthUser>(
    {
        // The human-readable name of your app
        // Type: string | (response:Response) => Promise<string> | string
        rpName: 'Remix Auth WebAuthn',
        // The hostname of the website, determines where passkeys can be used
        // See https://www.w3.org/TR/webauthn-2/#relying-party-identifier
        // Type: string | (response:Response) => Promise<string> | string
        rpID: (request) => {
            return new URL(request.url).hostname
        },
        // Website URL (or array of URLs) where the registration can occur
        origin: (request) => {
            return new URL(request.url).origin
        },
        // Return the list of authenticators associated with this user. You might
        // need to transform a CSV string into a list of strings at this step.
        getUserAuthenticators: async (user, context) => {
            invariant(context, 'Context is required')

            const authenticators =
                await authenticatorRepo.getUserAuthenticators(
                    context.env.SHRNQ_DB,
                    user?.id ?? '',
                )

            return authenticators.map((authenticator) => ({
                ...authenticator,
                transports: authenticator.transports.split(','),
            }))
        },
        // Transform the user object into the shape expected by the strategy.
        // You can use a regular username, the users email address, or something else.
        getUserDetails: (user) => {
            return user ? { id: user.id, username: user.username } : null
        },
        // Find a user in the database with their username/email.
        getUserByUsername: async (username, context) => {
            invariant(context, 'Context is required')
            const user = await userRepo.getUserByUsername(
                context.env.SHRNQ_DB,
                username,
            )

            return user ?? null
        },
        getAuthenticatorById: async (id, context) => {
            invariant(context, 'Context is required')
            const authenticator = await authenticatorRepo.getAuthenticatorById(
                context.env.SHRNQ_DB,
                id,
            )

            return authenticator ?? null
        },
    },
    async function verify({ authenticator, type, username, context }) {
        invariant(context, 'Context is required')

        let user: AuthUser | undefined
        const savedAuthenticator = await authenticatorRepo.getAuthenticatorById(
            context.env.SHRNQ_DB,
            authenticator.credentialID,
        )
        if (type === 'registration') {
            // Check if the authenticator exists in the database
            if (savedAuthenticator) {
                throw new Error('Authenticator has already been registered.')
            } else {
                // Username is null for authentication verification,
                // but required for registration verification.
                // It is unlikely this error will ever be thrown,
                // but it helps with the TypeScript checking
                if (!username) throw new Error('Username is required.')
                user = await userRepo.getUserByUsername(
                    context.env.SHRNQ_DB,
                    username,
                )

                // Don't allow someone to register a passkey for
                // someone elses account.
                if (user) throw new Error('User already exists.')

                // Create a new user and authenticator
                user = await userRepo.createUser(context.env.SHRNQ_DB, username)
                await authenticatorRepo.createAuthenticator(
                    context.env.SHRNQ_DB,
                    authenticator,
                    user.id,
                )
            }
        } else if (type === 'authentication') {
            if (!savedAuthenticator) throw new Error('Authenticator not found')
            user = await userRepo.getUserById(
                context.env.SHRNQ_DB,
                savedAuthenticator.userId,
            )
        }

        if (!user) throw new Error('User not found')
        return user
    },
)

export function authenticator(sessionStorage: ReturnType<typeof session>) {
    return new Authenticator<AuthUser>(sessionStorage).use(
        webAuthnStrategy,
    ) as Authenticator<AuthUser>
}
