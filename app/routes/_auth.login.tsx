import { authenticator, webAuthnStrategy } from '#app/lib/authenticator.server'
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare'
import { session } from '#/app/lib/session.server'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { handleFormSubmit } from '@samialdury/remix-auth-webauthn'
import { Button } from '#app/components/ui/button'
import { Field, Label } from '#app/components/ui/fieldset'
import { Input } from '#app/components/ui/input'
import { invariant } from '#app/lib/utils'

export async function loader({ request, context }: LoaderFunctionArgs) {
    invariant(context.env.SESSION_SECRET, 'SESSION_SECRET is not set')

    const sessionStorage = session(context.env.SESSION_SECRET)

    const user = await authenticator(sessionStorage).isAuthenticated(request)

    return webAuthnStrategy.generateOptions(
        request,
        sessionStorage,
        user,
        context,
    )
}

export async function action({ request, context }: ActionFunctionArgs) {
    invariant(context.env.SESSION_SECRET, 'SESSION_SECRET is not set')

    const sessionStorage = session(context.env.SESSION_SECRET)

    try {
        await authenticator(sessionStorage).authenticate('webauthn', request, {
            successRedirect: '/',
            context,
        })
        return { error: null }
    } catch (error) {
        // This allows us to return errors to the page without triggering the error boundary.
        if (error instanceof Response && error.status >= 400) {
            return { error: (await error.json()) as { message: string } }
        }
        throw error
    }
}

export default function Login() {
    const options = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    return (
        <Form onSubmit={handleFormSubmit(options)} method="POST">
            <Field>
                <Label>Username</Label>
                <Input type="text" name="username" />
            </Field>
            <Button formMethod="GET" type="submit">
                Check Username
            </Button>
            <Button
                type="submit"
                name="intent"
                value="registration"
                disabled={options.usernameAvailable !== true}
            >
                Register
            </Button>
            <Button type="submit" name="intent" value="authentication">
                Authenticate
            </Button>
            {actionData?.error ? <div>{actionData.error.message}</div> : null}
        </Form>
    )
}
