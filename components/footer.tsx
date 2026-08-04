'use client'

import Link from 'next/link'
import { Mail, Linkedin, Facebook, Instagram } from 'lucide-react'
import { useState } from 'react'

export function Footer() {
  const [showEmailPopup, setShowEmailPopup] = useState(false)
  return (
    <>
      {/* Email Popup */}
      {showEmailPopup && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-50 cursor-pointer"
            onClick={() => setShowEmailPopup(false)}
          />
          <div className="fixed bottom-32 right-8 bg-white/95 backdrop-blur-sm text-gray-900 rounded-lg shadow-xl p-4 z-50 w-64 animate-slideInUp">
            <div className="text-sm font-semibold mb-2">Email Address</div>
            <div className="flex items-center justify-between">
              <a 
                href="mailto:kk.humanfirst@gmail.com"
                className="text-red-600 hover:text-red-700 font-medium text-sm break-all"
              >
                kk.humanfirst@gmail.com
              </a>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }
      `}</style>

    <footer className="bg-black text-white py-12 md:py-16 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex flex-col items-start">
              <div className="text-xs font-bold tracking-wider">KK</div>
              <div className="text-[10px] font-semibold">humanfirstbykk</div>
            </div>
            <p className="text-xs text-gray-400">
              Build the thinking you wish you had learned earlier.
            </p>
          </div>

          {/* Programs */}
          <div>
            <h3 className="text-sm font-bold mb-4">PROGRAMS</h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><a href="https://warroom-demo-262374983592.us-central1.run.app/" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">War Room</a></li>
              <li><Link href="/start-with-you" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">Start With You</Link></li>
              <li><Link href="/the-garage" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block">The Garage</Link></li>
              
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold mb-4">CONNECT</h3>
            <ul className="space-y-3 text-xs text-gray-400">
              <li>
                <button 
                  onClick={() => setShowEmailPopup(!showEmailPopup)}
                  className="flex items-center gap-2 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-flex cursor-pointer"
                >
                  <Mail size={16} />
                  Email
                </button>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/keerthigak/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-flex">
                  <Linkedin size={16} />
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/profile.php?id=61589693099133" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-flex">
                  <Facebook size={16} />
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/kkkannabiran/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-flex">
                  <Instagram size={16} />
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 transition-all duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © 2026 humanfirstbykk. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-gray-500">
              <Link href="#" className="hover:text-white transition-colors duration-300">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors duration-300">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 transition-all duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight">
              BUILD THE THINKING
              <br />
              YOU WISH YOU HAD
              <br />
              LEARNED EARLIER.
            </h2>
            <a
              href="https://calendly.com/kk-humanfirst/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 md:px-8 py-2 md:py-3 text-black text-sm md:text-base font-medium rounded transition-all duration-300 hover:shadow-lg hover:scale-105 hover:opacity-90 whitespace-nowrap inline-block"
              style={{ backgroundColor: '#D4A017' }}
            >
              BOOK A CALL
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 transition-all duration-300">
          <p className="text-xs text-gray-500 text-center">
            Page Developed by <span className="font-semibold text-gray-400">Mohan</span> &nbsp;|&nbsp; Email:&nbsp;
            <a 
              href="mailto:mohan20051028@gmail.com" 
              className="text-amber-600 hover:text-amber-500 transition-colors duration-300"
            >
              mohan20051028@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
    </>
  )
}
