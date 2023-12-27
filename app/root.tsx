import {
    json,
    ActionFunctionArgs,
    HeadersFunction,
    LinksFunction,
    LoaderFunctionArgs,
    MetaFunction,
} from '@remix-run/cloudflare'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useFetcher,
    useFetchers,
    useLoaderData,
} from '@remix-run/react'
import { Theme, getTheme, setTheme } from './lib/theme.server'
import { ClientHintCheck, getHints, useHints } from './lib/client-hints'
import { honeypot } from './lib/honeypot.server'
import { csrf } from './lib/csrf.server'
import { combineHeaders, getDomainUrl } from './lib/utils'
import { makeTimings } from './lib/timing.server'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { useNonce } from './lib/nonce-provider'
import { useRequestInfo } from './lib/request-info'
import { GeneralErrorBoundary } from './lib/error-boundary'
import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import { z } from 'zod'

const ThemeFormSchema = z.object({
    theme: z.enum(['system', 'light', 'dark']),
})

export const links: LinksFunction = () => [
    ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
]

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [
        { title: data ? 'shrnq' : 'Error | shrnq' },
        { name: 'description', content: `URL shortener` },
    ]
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
    const headers = {
        'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
    }
    return headers
}

export async function loader({ request }: LoaderFunctionArgs) {
    const timings = makeTimings('root loader')
    // const { toast, headers: toastHeaders } = await getToast(request)
    const honeyProps = honeypot.getInputProps()
    const [csrfToken, csrfCookieHeader] = await csrf.commitToken()

    return json(
        {
            requestInfo: {
                hints: getHints(request),
                origin: getDomainUrl(request),
                path: new URL(request.url).pathname,
                userPrefs: {
                    theme: getTheme(request),
                },
            },
            // toast,
            honeyProps,
            csrfToken,
        },
        {
            headers: combineHeaders(
                { 'Server-Timing': timings.toString() },
                // toastHeaders,
                csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : null,
            ),
        },
    )
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData()
    const submission = parse(formData, {
        schema: ThemeFormSchema,
    })
    if (submission.intent !== 'submit') {
        return json({ status: 'idle', submission } as const)
    }
    if (!submission.value) {
        return json({ status: 'error', submission } as const, { status: 400 })
    }
    const { theme } = submission.value

    const responseInit = {
        headers: { 'set-cookie': setTheme(theme) },
    }
    return json({ success: true, submission }, responseInit)
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
    const hints = useHints()
    const requestInfo = useRequestInfo()
    const optimisticMode = useOptimisticThemeMode()
    if (optimisticMode) {
        return optimisticMode === 'system' ? hints.theme : optimisticMode
    }
    return requestInfo.userPrefs.theme ?? hints.theme
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
    const fetchers = useFetchers()
    const themeFetcher = fetchers.find((f) => f.formAction === '/')

    if (themeFetcher && themeFetcher.formData) {
        const submission = parse(themeFetcher.formData, {
            schema: ThemeFormSchema,
        })
        return submission.value?.theme
    }
}

function App() {
    const data = useLoaderData<typeof loader>()
    const nonce = useNonce()
    const theme = useTheme()

    console.log('\nApp\n', { nonce, theme })

    return (
        <Document
            nonce={nonce}
            theme={theme}
            //  env={data.ENV}
        >
            <div className="flex h-screen flex-col justify-between">
                <header className="container py-6">
                    <nav></nav>
                </header>

                <div className="flex-1">
                    <Outlet />
                </div>

                <footer className="container flex justify-between pb-5">
                    <ThemeSwitch
                        userPreference={data.requestInfo.userPrefs.theme}
                    />
                </footer>
            </div>
        </Document>
    )
}

function ThemeSwitch({ userPreference }: { userPreference?: Theme | null }) {
    const fetcher = useFetcher<typeof action>()

    const [form] = useForm({
        id: 'theme-switch',
        lastSubmission: fetcher.data?.submission,
    })

    const optimisticMode = useOptimisticThemeMode()
    const mode = optimisticMode ?? userPreference ?? 'system'
    const nextMode =
        mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
    const modeLabel = {
        light: (
            <div>
                <span className="sr-only">Light</span>
            </div>
        ),
        dark: (
            <div>
                <span className="sr-only">Dark</span>
            </div>
        ),
        system: (
            <div>
                <span className="sr-only">System</span>
            </div>
        ),
    }

    return (
        <fetcher.Form method="POST" {...form.props}>
            <input type="hidden" name="theme" value={nextMode} />
            <div className="flex gap-2">
                <button
                    type="submit"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center"
                >
                    {modeLabel[mode]}
                </button>
            </div>
            {/* <ErrorList errors={form.errors} id={form.errorId} /> */}
        </fetcher.Form>
    )
}

function Document({
    children,
    nonce,
    theme = 'light',
    env = {},
}: {
    children: React.ReactNode
    nonce: string
    theme?: Theme
    env?: Record<string, string>
}) {
    return (
        <html lang="en" className={`${theme} h-full overflow-x-hidden`}>
            <head>
                <ClientHintCheck nonce={nonce} />
                <Meta />
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1"
                />
                <Links />
            </head>
            <body className="bg-background text-foreground">
                {children}
                <script
                    nonce={nonce}
                    dangerouslySetInnerHTML={{
                        __html: `window.ENV = ${JSON.stringify(env)}`,
                    }}
                />
                <ScrollRestoration nonce={nonce} />
                <Scripts nonce={nonce} />
                <LiveReload nonce={nonce} />
            </body>
        </html>
    )
}

export default function AppWithProviders() {
    const data = useLoaderData<typeof loader>()
    return (
        <AuthenticityTokenProvider token={data.csrfToken}>
            <HoneypotProvider {...data.honeyProps}>
                <App />
            </HoneypotProvider>
        </AuthenticityTokenProvider>
    )
}

export function ErrorBoundary() {
    // the nonce doesn't rely on the loader so we can access that
    const nonce = useNonce()

    // NOTE: you cannot use useLoaderData in an ErrorBoundary because the loader
    // likely failed to run so we have to do the best we can.
    // We could probably do better than this (it's possible the loader did run).
    // This would require a change in Remix.

    // Just make sure your root route never errors out and you'll always be able
    // to give the user a better UX.

    return (
        <Document nonce={nonce}>
            <GeneralErrorBoundary />
        </Document>
    )
}
