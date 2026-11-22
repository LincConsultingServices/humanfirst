import path from 'node:path'
import { fileURLToPath } from 'node:url'

// This project's own folder. Without this, Next.js picks C:\Users\mohan as the root (there is a
// stray package-lock.json there) and watches far too many files, which makes it very slow.
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  // Emit a self-contained server bundle (.next/standalone) for a small,
  // fast-starting container image on Cloud Run.
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com',
      },
    ],
  },
}

export default nextConfig
