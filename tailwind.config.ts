import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
      typography: ({ theme }: { theme: any }) => ({
        DEFAULT: {
          css: {
            // Base styles for `prose` - these should be dark-theme friendly as the app is always dark
            '--tw-prose-body': theme('colors.foreground / 1'),
            '--tw-prose-headings': theme('colors.foreground / 1'),
            '--tw-prose-lead': theme('colors.foreground / 0.9'),
            '--tw-prose-links': theme('colors.primary / 1'),
            '--tw-prose-bold': theme('colors.foreground / 1'),
            '--tw-prose-counters': theme('colors.foreground / 0.7'),
            '--tw-prose-bullets': theme('colors.foreground / 0.5'),
            '--tw-prose-hr': theme('colors.border / 0.5'),
            '--tw-prose-quotes': theme('colors.foreground / 1'),
            '--tw-prose-quote-borders': theme('colors.primary / 1'),
            '--tw-prose-captions': theme('colors.foreground / 0.7'),
            '--tw-prose-code': theme('colors.foreground / 1'), // Inline code text
            '--tw-prose-pre-code': theme('colors.card.foreground / 1'), // Text in code blocks
            '--tw-prose-pre-bg': theme('colors.muted / 1'), // Background for code blocks
            '--tw-prose-th-borders': theme('colors.border / 0.7'),
            '--tw-prose-td-borders': theme('colors.border / 0.5'),

            // Invert styles (applied by `dark:prose-invert` which is active due to html.dark)
            // These explicitly set the colors for the inverted state.
            '--tw-prose-invert-body': theme('colors.foreground / 1'),
            '--tw-prose-invert-headings': theme('colors.foreground / 1'),
            '--tw-prose-invert-lead': theme('colors.foreground / 0.9'),
            '--tw-prose-invert-links': theme('colors.primary / 1'),
            '--tw-prose-invert-bold': theme('colors.foreground / 1'),
            '--tw-prose-invert-counters': theme('colors.foreground / 0.7'),
            '--tw-prose-invert-bullets': theme('colors.foreground / 0.5'),
            '--tw-prose-invert-hr': theme('colors.border / 0.5'),
            '--tw-prose-invert-quotes': theme('colors.foreground / 1'),
            '--tw-prose-invert-quote-borders': theme('colors.primary / 1'),
            '--tw-prose-invert-captions': theme('colors.foreground / 0.7'),
            '--tw-prose-invert-code': theme('colors.foreground / 1'),
            '--tw-prose-invert-pre-code': theme('colors.card.foreground / 1'),
            '--tw-prose-invert-pre-bg': theme('colors.muted / 1'),
            '--tw-prose-invert-th-borders': theme('colors.border / 0.7'),
            '--tw-prose-invert-td-borders': theme('colors.border / 0.5'),
          },
        },
      }),
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
