import { validateCSRF } from '#app/lib/csrf.server'
import { checkHoneypot } from '#app/lib/honeypot.server'
import {
    ActionFunctionArgs,
    json,
    type MetaFunction,
} from '@remix-run/cloudflare'
import { useFetcher } from '@remix-run/react'
import { useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { z } from 'zod'
import { Button } from '#app/components/ui/button'
import { ErrorMessage, Field, Label } from '#app/components/ui/fieldset'
import { Input } from '#app/components/ui/input'
import { CSRFInput } from '#app/lib/csrf'
import { HoneypotInput } from '#app/lib/honeypot'
import { KVStore } from '#app/lib/kv.server'
import {
    ClipboardDocumentIcon,
    ClipboardDocumentCheckIcon,
    ArrowDownIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { getDomainUrl, invariant } from '#app/lib/utils'
import { nanoid } from '#app/lib/id.server'

const FormSchema = z.object({
    url: z
        .string()
        .url()
        .refine((url) => url.startsWith('https://'), {
            message: 'URL must start with https://',
        }),
})

type FormSchema = z.infer<typeof FormSchema>

export const meta: MetaFunction = () => {
    return [
        {
            title: 'shrnq | shorten a URL',
        },
        {
            name: 'description',
            content: 'Yet another URL shortener',
        },
        {
            name: 'keywords',
            content: 'url, shortener, shorten, link, redirect',
        },
        {
            name: 'author',
            content: 'Sami Al-Dury',
        },
        {
            property: 'og:title',
            content: 'shrnq | shorten a URL',
        },
        {
            property: 'og:description',
            content: 'Yet another URL shortener',
        },
    ]
}

async function getUniqueKey(kv: KVStore) {
    const key = nanoid()
    const exists = await kv.get(key)

    if (exists) {
        return getUniqueKey(kv)
    }

    return key
}

export async function action({
    request,
    context: { env },
}: ActionFunctionArgs) {
    invariant(env.SESSION_SECRET, 'Missing SESSION_SECRET')
    invariant(env.HONEYPOT_SECRET, 'Missing HOENYPOT_SECRET')

    const formData = await request.formData()
    await validateCSRF(formData, request.headers, env.SESSION_SECRET)
    checkHoneypot(formData, env.HONEYPOT_SECRET)

    const submission = parse(formData, {
        schema: FormSchema,
    })

    if (submission.intent !== 'submit') {
        return json({ status: 'idle', submission } as const)
    }

    if (!submission.value) {
        return json(
            {
                status: 'error',
                submission,
                error: 'Invalid submission',
            } as const,
            { status: 400 },
        )
    }

    const { url } = submission.value

    try {
        const kv = new KVStore(env.SHRNQ_KV)
        const key = await getUniqueKey(kv)

        await kv.put(key, url)

        const baseUrl = getDomainUrl(request)

        return json({
            status: 'success',
            submission,
            url: `${baseUrl.split('://')[1]}/${key}`,
        } as const)
    } catch (err) {
        console.error(err)
        return json(
            {
                status: 'error',
                submission,
                error: 'Something went wrong',
            } as const,
            { status: 500 },
        )
    }
}

export default function Index() {
    const fetcher = useFetcher<typeof action>()
    const [form, fields] = useForm({
        id: 'shorten-url',
        constraint: getFieldsetConstraint(FormSchema),
        lastSubmission: fetcher.data?.submission,
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        defaultValue: {
            url: '',
        } satisfies FormSchema,
        onValidate({ formData }) {
            return parse(formData, { schema: FormSchema })
        },
    })
    const [copied, setCopied] = useState(false)

    return (
        <main className="flex flex-col items-center justify-center pt-10">
            <h1 className="group text-center font-display text-3xl font-light leading-tight lg:text-5xl">
                <span>Yet another URL shortener</span>
            </h1>
            <fetcher.Form method="POST" {...form.props} className="w-64 py-10">
                <CSRFInput />
                <HoneypotInput />
                <Field>
                    <Label>Original URL</Label>
                    <Input
                        type="text"
                        name={fields.url.name}
                        invalid={!!fields.url.error}
                        onClick={() => {
                            setCopied(false)
                        }}
                    />
                    <div className="min-h-8">
                        {!!fields.url.error && (
                            <ErrorMessage>{fields.url.error}</ErrorMessage>
                        )}
                    </div>
                </Field>
                <Button
                    color="cyan"
                    className="w-full"
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                >
                    Shorten
                </Button>
            </fetcher.Form>
            {fetcher.data?.status === 'success' && (
                <div className="flex flex-col items-center space-y-4">
                    <ArrowDownIcon className="size-6 animate-pulse" />
                    <output className="flex flex-col items-center justify-between gap-2">
                        <pre className="select-all selection:bg-gray-200 dark:selection:bg-gray-600">
                            {fetcher.data.url}
                        </pre>

                        <Button
                            plain
                            className="size-15"
                            aria-label="Copy to clipboard"
                            onClick={() => {
                                if (
                                    navigator.clipboard &&
                                    fetcher.data?.status === 'success'
                                ) {
                                    navigator.clipboard.writeText(
                                        fetcher.data.url,
                                    )
                                    setCopied(true)
                                    setTimeout(() => setCopied(false), 5000)
                                }
                            }}
                        >
                            {copied ? (
                                <ClipboardDocumentCheckIcon />
                            ) : (
                                <ClipboardDocumentIcon />
                            )}
                        </Button>
                    </output>
                </div>
            )}
        </main>
    )
}
