import { Honeypot, SpamError } from 'remix-utils/honeypot/server'

const honeypotSecret = 'test'

if (!honeypotSecret) {
    throw new Error('Missing HONEYPOT_SECRET environment variable')
}

export const honeypot = new Honeypot({
	encryptionSeed: honeypotSecret,
})

export function checkHoneypot(formData: FormData) {
	try {
		honeypot.check(formData)
	} catch (error) {
		if (error instanceof SpamError) {
			throw new Response('Form not submitted properly', { status: 400 })
		}
		throw error
	}
}
