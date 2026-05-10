/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        // Brand & ink scales for the DesignSystem showcase swatches
        { pattern: /^bg-(brand|ink)-(50|100|200|300|400|500|600|700|800|900|950)$/ },
        { pattern: /^text-(brand|ink)-(50|100|200|300|400|500|600|700|800|900|950)$/ },
        { pattern: /^border-(brand|ink)-(50|100|200|300|400|500|600|700|800|900|950)$/ },
        // Semantic colors used dynamically in feedback/chip patterns
        { pattern: /^(bg|text|border)-(emerald|blue|indigo|amber|red|slate)-(50|100|200|500|700|900)$/ },
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            colors: {
                brand: {
                    50:  '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                ink: {
                    50:  '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
            },
            backgroundImage: {
                'brand-gradient': 'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)',
                'brand-gradient-soft': 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
                'brand-glow': 'radial-gradient(60% 60% at 50% 0%, rgba(249,115,22,0.18), transparent 70%)',
                'page-light': 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            },
            boxShadow: {
                'card': '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
                'card-hover': '0 6px 12px -4px rgba(15,23,42,0.08), 0 16px 24px -8px rgba(15,23,42,0.10)',
                'modal': '0 30px 60px -20px rgba(15,23,42,0.30), 0 18px 36px -18px rgba(15,23,42,0.20)',
                'glow-brand': '0 0 0 1px rgba(249,115,22,0.20), 0 10px 30px -8px rgba(249,115,22,0.40)',
                'inner-soft': 'inset 0 1px 0 0 rgba(255,255,255,0.6)',
            },
            borderRadius: {
                'card': '1rem',
                'modal': '1.5rem',
                'pill': '9999px',
            },
            transitionTimingFunction: {
                'soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                'fade-in-up': {
                    '0%':   { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'shimmer': {
                    '0%':   { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                'shimmer':    'shimmer 1.6s linear infinite',
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
