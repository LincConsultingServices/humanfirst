import Image from 'next/image'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata = {
  title: 'Experience | humanfirstbykk',
  description: 'Step into the experiences built by HumanFirst by KK.',
}

const experiences = [
  {
    title: 'CEO CITY',
    eyebrow: 'A HumanFirst experience',
    description: 'Step into a living environment for entrepreneurial thinking, where leaders make decisions, navigate uncertainty, and build what comes next.',
    href: 'https://ceo-city-website-copy.vercel.app',
    cta: 'Explore CEO City',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dssXmCoi1W75RccwF7VoTv2SdQ9gYK.png',
    imageAlt: 'Isometric CEO City live map with roads, buildings, and company markers',
  },
  {
    title: 'WAR ROOM',
    eyebrow: 'Live business simulation',
    description: 'Make real decisions, experience the consequences, and learn how to think strategically in a live business simulation powered by AI.',
    href: 'https://enterthewarroom.humanfirstbykk.com',
    cta: 'Enter War Room',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-09-28%20231153-zgRkq4x7fjEDDH8kg84pgCehTs8Kjl.png',
    imageAlt: 'Enter the KK War Room artwork with glowing embers',
  },
]

export default function ExperiencePage() {
  return (
    <main className="bg-black text-white min-h-screen">
      <Header />
      <section className="px-4 md:px-6 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-14 md:mb-20">
            <p className="text-sm font-medium tracking-[0.2em] text-[#D4A017] mb-5">HUMANFIRST BY KK</p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] mb-7">EXPERIENCE</h1>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">Step into the experiences built by HumanFirst.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {experiences.map((experience) => (
              <article key={experience.title} className="group overflow-hidden rounded-lg border border-gray-800 bg-[#111]">
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
                  <Image src={experience.image} alt={experience.imageAlt} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 50vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                </div>
                <div className="p-7 md:p-9">
                  <p className="text-xs tracking-[0.18em] text-[#D4A017] mb-3">{experience.eyebrow}</p>
                  <h2 className="text-3xl md:text-4xl font-black mb-4">{experience.title}</h2>
                  <p className="text-gray-300 leading-relaxed mb-7">{experience.description}</p>
                  <a href={experience.href} className="inline-block rounded bg-[#D4A017] px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:scale-105 hover:opacity-90">{experience.cta}</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}

