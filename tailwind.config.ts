import type { Config } from 'tailwindcss'

// #90: THE BUILDER WRITES TO app/, components/, lib/ — NEVER to src/.
// This file used to say `content: ['./src/**/*.{ts,tsx}']`. Tailwind therefore
// scanned a directory the product does not use, found nothing, and DISCARDED
// every utility class the Builder had written. RigFile shipped with 77% of its
// CSS missing: no colours, no sizes, no dark mode — a white headline on a
// background that never rendered, and icons at 300px because `h-6 w-6` did not
// exist. It compiled. It returned HTTP 200. QA read the source and scored it
// 180/185. Nobody ever looked at the page.
// Scan everywhere a product can legally put code. A missed glob is a silently
// destroyed product.
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx,mdx}',
    './lib/**/*.{ts,tsx,js,jsx,mdx}',
    './src/**/*.{ts,tsx,js,jsx,mdx}',
    './pages/**/*.{ts,tsx,js,jsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
