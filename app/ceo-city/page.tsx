import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata = {
  title: 'CEO City | humanfirstbykk',
  description: 'Enter CEO City, a HumanFirst experience for entrepreneurial thinking.',
}

export default function CEOCityPage() {
  return (
    <main className="bg-black text-white min-h-screen">
      <Header />
      <section className="px-4 md:px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-medium tracking-[0.2em] text-[#D4A017] mb-5">A HUMANFIRST EXPERIENCE</p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] mb-7">CEO CITY</h1>
          <p className="max-w-2xl text-lg md:text-xl text-gray-300 leading-relaxed mb-10">A living environment for entrepreneurial thinking, leadership, and the decisions that shape what comes next.</p>
          <Link href="/experience" className="inline-block rounded bg-[#D4A017] px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:scale-105 hover:opacity-90">Back to Experience</Link>
        </div>
      </section>
      <Footer />
    </main>
  )
}
