import { Button } from '#app/components/ui/button'
import { GeneralErrorBoundary } from '#app/lib/error-boundary'
import { KVStore } from '#app/lib/kv.server'
import { SEOHandle } from '@nasa-gcn/remix-seo'
import { LoaderFunctionArgs, json, redirect } from '@remix-run/cloudflare'
import { useLocation } from '@remix-run/react'

export async function loader({
    request,
    context: { env },
}: LoaderFunctionArgs) {
    const url = new URL(request.url)

    const key = url.pathname.slice(1)

    const kv = new KVStore(env.SHRNQ_KV)

    const targetUrl = await kv.get(key)

    if (!targetUrl) {
        throw json({ status: 'error', error: 'Not found' } as const, {
            status: 404,
        })
    }

    return redirect(targetUrl, {
        status: 301,
    })
}

export const handle: SEOHandle = {
    getSitemapEntries: () => null,
}

export default function NotFound() {
    return <ErrorBoundary />
}

export function ErrorBoundary() {
    const location = useLocation()
    return (
        <GeneralErrorBoundary
            statusHandlers={{
                404: () => (
                    <div className="flex flex-col items-center justify-center gap-6 pt-20">
                        <h1 className="text-4xl font-semibold">Not found</h1>
                        <p className="text-lg">
                            The slug{' '}
                            <span className="font-mono">
                                {location.pathname}
                            </span>{' '}
                            does not exist.
                        </p>
                        <Button outline href="/">
                            Back to home
                        </Button>
                    </div>
                ),
            }}
        />
    )
}
