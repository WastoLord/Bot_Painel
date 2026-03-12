/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace']
      },
      colors: {
        brand: { 50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1',900:'#0c4a6e' },
        stone: { 50:'#fafaf9',100:'#f5f5f4',200:'#e7e5e4',300:'#d6d3d1',400:'#a8a29e',500:'#78716c',600:'#57534e',700:'#44403c',800:'#292524',900:'#1c1917' }
      }
    }
  },
  plugins: []
}
