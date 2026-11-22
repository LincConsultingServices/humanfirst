// Shared class strings for the Future Accelerator and the Business Idea Validator.
// Every value here is copied from the existing HumanFirst components
// (app/experience/page.tsx, components/header.tsx, components/hero-section.tsx)
// so the new screens look native. See docs/FUTURE_ACCELERATOR.md §1.

export const GOLD = '#D4A017'

export const ui = {
  page: 'bg-black text-white min-h-screen',
  container: 'max-w-6xl mx-auto px-4 md:px-6',
  eyebrow: 'text-sm font-medium tracking-[0.2em] text-[#D4A017]',
  eyebrowSm: 'text-xs tracking-[0.18em] text-[#D4A017]',
  h1: 'text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95]',
  h2: 'text-3xl md:text-4xl font-black',
  h3: 'text-xl md:text-2xl font-black',
  body: 'text-gray-300 leading-relaxed',
  muted: 'text-gray-400',
  card: 'rounded-lg border border-gray-800 bg-[#111]',
  btn: 'inline-flex items-center justify-center rounded bg-[#D4A017] px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:scale-105 hover:opacity-90 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed',
  btnSm: 'inline-flex items-center justify-center rounded bg-[#D4A017] px-4 py-2 text-xs md:text-sm font-medium text-black transition-all duration-300 hover:scale-105 hover:opacity-90 disabled:opacity-50 disabled:hover:scale-100',
  btnOutline: 'inline-flex items-center justify-center rounded border-2 border-[#D4A017] px-6 py-3 text-sm font-bold text-[#D4A017] transition-all duration-300 hover:bg-[#D4A017] hover:text-black hover:scale-105 disabled:opacity-50 disabled:hover:scale-100',
  btnOutlineSm: 'inline-flex items-center justify-center rounded border-2 border-[#D4A017] px-4 py-2 text-xs md:text-sm font-bold text-[#D4A017] transition-all duration-300 hover:bg-[#D4A017] hover:text-black disabled:opacity-50',
  btnGhost: 'inline-flex items-center justify-center rounded border border-gray-700 px-4 py-2 text-xs md:text-sm font-medium text-gray-300 transition-all duration-300 hover:border-[#D4A017] hover:text-[#D4A017] disabled:opacity-50',
  input: 'w-full rounded border border-gray-700 bg-black px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#D4A017] focus:outline-none',
  label: 'block text-xs tracking-[0.18em] text-gray-400 mb-2',
  link: 'text-[#D4A017] hover:opacity-80',
}

export function riskClass(risk: string) {
  if (risk === 'Low') return 'bg-[#D4A017] text-black'
  if (risk === 'High') return 'border border-[#FF6B35] text-[#FF6B35]'
  return 'bg-gray-700 text-white'
}

export function recClass(rec: string) {
  if (rec === 'GO') return 'bg-[#D4A017] text-black'
  if (rec === 'NO-GO') return 'border-2 border-[#FF6B35] text-[#FF6B35]'
  return 'border-2 border-[#D4A017] text-[#D4A017]'
}
