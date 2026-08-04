'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-black border-b border-gray-800 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 transition-all duration-300">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="relative h-10 md:h-12 w-auto">
            <Image
              src="/humanfirst-logo.png"
              alt="HUMANFIRST BY KK logo"
              height={48}
              width={200}
              className="object-contain h-10 md:h-12 w-auto"
              priority
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="/" className="text-xs md:text-sm font-medium text-gray-300 hover:text-yellow-400 transition-colors duration-300">HOME</Link>
            <a href="https://warroom-demo-262374983592.us-central1.run.app/" className="text-xs md:text-sm font-medium text-gray-300 hover:text-yellow-400 transition-colors duration-300">WAR ROOM</a>
            <Link href="/start-with-you" className="text-xs md:text-sm font-medium text-gray-300 hover:text-yellow-400 transition-colors duration-300">START WITH YOU</Link>
            <Link href="/the-garage" className="text-xs md:text-sm font-medium text-gray-300 hover:text-yellow-400 transition-colors duration-300">THE GARAGE</Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <a href="https://warroom-demo-262374983592.us-central1.run.app/" className="px-4 lg:px-6 py-2 text-black text-xs md:text-sm font-medium rounded transition-all duration-300 hover:shadow-lg hover:scale-105 hover:opacity-90" style={{ backgroundColor: '#D4A017' }}>
              ENTER WAR ROOM
            </a>
            <a href="https://calendly.com/kk-humanfirst/30min" target="_blank" rel="noopener noreferrer" className="px-4 lg:px-6 py-2 text-black text-xs md:text-sm font-medium rounded transition-all duration-300 hover:shadow-lg hover:scale-105 hover:opacity-90" style={{ backgroundColor: '#D4A017' }}>
              BOOK A CALL
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            suppressHydrationWarning={true}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <nav className="md:hidden mt-4 flex flex-col gap-4 pb-4 animate-fadeIn">
            <Link href="/" className="text-sm font-medium text-gray-300 hover:text-yellow-400 transition-colors duration-300">HOME</Link>
            <a href="https://warroom-demo-262374983592.us-central1.run.app/" className="text-sm font-medium text-gray-300 hover:text-yellow-400 transition-colors duration-300">WAR ROOM</a>
            <Link href="/start-with-you" className="text-sm font-medium text-gray-300 hover:text-yellow-400 transition-colors duration-300">START WITH YOU</Link>
            <Link href="/the-garage" className="text-sm font-medium text-gray-300 hover:text-yellow-400 transition-colors duration-300">THE GARAGE</Link>
            <a href="https://calendly.com/kk-humanfirst/30min" target="_blank" rel="noopener noreferrer" className="px-6 py-2 text-black text-sm font-medium rounded w-fit transition-all duration-300 hover:scale-105 hover:opacity-90" style={{ backgroundColor: '#D4A017' }}>
              BOOK A CALL
            </a>
          </nav>
        )}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
        `}</style>
      </div>
    </header>
  )
}
