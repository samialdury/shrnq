import globalStyleSheetUrl from '#app/styles/global.css'
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
import { Theme, getTheme, setTheme } from '#app/lib/theme.server'
import { ClientHintCheck, getHints, useHints } from '#app/lib/client-hints'
import { honeypot } from '#app/lib/honeypot.server'
import { csrf } from '#app/lib/csrf.server'
import { combineHeaders, getDomainUrl } from '#app/lib/utils'
import { makeTimings } from '#app/lib/timing.server'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { useNonce } from '#app/lib/nonce-provider'
import { useRequestInfo } from '#app/lib/request-info'
import { GeneralErrorBoundary } from '#app/lib/error-boundary'
import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import { z } from 'zod'
import {
    SunIcon,
    MoonIcon,
    ComputerDesktopIcon,
} from '@heroicons/react/24/outline'
import { Link } from '#app/components/ui/link'
import { useCallback } from 'react'
import { TailwindIndicator } from '#app/components/tailwind-indicator'
import { Button } from '#app/components/ui/button'

const ThemeFormSchema = z.object({
    theme: z.enum(['system', 'light', 'dark']),
})

{
    /* <link href="https://fonts.cdnfonts.com/css/mona-sans" rel="stylesheet"> */
}

export const links: LinksFunction = () => [
    {
        rel: 'preconnect',
        href: 'https://rsms.me',
    },
    {
        rel: 'preconnect',
        href: 'https://fonts.cdnfonts.com',
    },
    // Preload CSS as a resource to avoid render blocking
    { rel: 'preload', href: 'https://rsms.me/inter/inter.css', as: 'style' },
    {
        rel: 'preload',
        href: 'https://fonts.cdnfonts.com/css/mona-sans',
        as: 'style',
    },
    { rel: 'preload', href: globalStyleSheetUrl, as: 'style' },
    ...(cssBundleHref
        ? [{ rel: 'preload', href: cssBundleHref, as: 'style' }]
        : []),

    {
        rel: 'stylesheet',
        href: 'https://rsms.me/inter/inter.css',
    },
    {
        rel: 'stylesheet',
        href: 'https://fonts.cdnfonts.com/css/mona-sans',
    },
    { rel: 'stylesheet', href: globalStyleSheetUrl },
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

    return (
        <Document
            nonce={nonce}
            theme={theme}
            //  env={data.ENV}
        >
            <div className="relative flex min-h-screen flex-col">
                <Header
                    userPreferenceTheme={data.requestInfo.userPrefs.theme}
                />

                <div className="flex-1">
                    <Outlet />
                </div>

                <Footer />
            </div>
        </Document>
    )
}

function Header({
    userPreferenceTheme,
}: {
    userPreferenceTheme: Theme | null
}) {
    return (
        <header className="sticky top-0 z-10 border-b border-zinc-950/10 bg-white px-6 py-4 sm:px-8 lg:z-10 lg:flex lg:h-16 lg:items-center lg:py-0 dark:border-white/5 dark:bg-zinc-900">
            <div className="mx-auto flex w-full max-w-xl items-center justify-between lg:max-w-7xl">
                <div>
                    <Link href="/" aria-label="Home">
                        <div className="whitespace-nowrap font-display text-lg font-normal lg:text-2xl">
                            <span>sh</span>
                            <span className="text-cyan-400">rn</span>
                            <span>q</span>
                        </div>
                    </Link>
                </div>
                <div className="flex items-center justify-center">
                    <ThemeSwitch userPreference={userPreferenceTheme} />
                </div>
            </div>
            {/* <div className="mx-auto mt-5 flex max-w-xl lg:hidden"></div> */}
        </header>
    )
}

function Footer() {
    return (
        <footer className="mt-32 w-full">
            <div className="w-full border-t border-zinc-950/10 bg-white py-4 dark:border-white/5 dark:bg-zinc-900">
                <p className="text-balance text-center text-sm leading-loose text-slate-500 dark:text-slate-400">
                    Built by{' '}
                    <a
                        href="https://x.com/samialdury"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-4"
                    >
                        Sami Al-Dury
                    </a>
                    . The source code is available on{' '}
                    <a
                        href="https://github.com/samialdury/shrnq"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-4"
                    >
                        GitHub
                    </a>
                    .
                </p>
            </div>
        </footer>
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

    const getModeLabel = useCallback((mode: Theme | 'system') => {
        const { icon: Icon, label } = {
            light: {
                icon: SunIcon,
                label: 'Light',
            },
            dark: {
                icon: MoonIcon,
                label: 'Dark',
            },
            system: {
                icon: ComputerDesktopIcon,
                label: 'System',
            },
        }[mode]

        return (
            <Icon className="size-5">
                <span className="sr-only">{label}</span>
            </Icon>
        )
    }, [])

    return (
        <fetcher.Form method="POST" {...form.props}>
            <input type="hidden" name="theme" value={nextMode} />

            <Button
                plain
                type="submit"
                title={`Switch to ${nextMode.toLowerCase()}`}
            >
                {getModeLabel(mode)}
            </Button>
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
        <html lang="en" className={`${theme}`}>
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
            <body className="min-h-screen overflow-x-hidden overflow-y-scroll bg-white font-sans text-black antialiased dark:bg-zinc-900 dark:text-white">
                {children}
                <script
                    nonce={nonce}
                    dangerouslySetInnerHTML={{
                        __html: `window.ENV = ${JSON.stringify(env)}`,
                    }}
                />
                <TailwindIndicator />
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
