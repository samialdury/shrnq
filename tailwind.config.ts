import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import animatePlugin from 'tailwindcss-animate'

export default {
    content: ['./app/**/*.{ts,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
                lead: ['var(--font-lead)', ...defaultTheme.fontFamily.sans],
                display: [
                    ['var(--font-display)', ...defaultTheme.fontFamily.sans],
                    { fontVariationSettings: '"wdth" 125' },
                ],
            },
        },
    },
    plugins: [animatePlugin],
} satisfies Config
