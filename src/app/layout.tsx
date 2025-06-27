import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import type { Metadata } from 'next'
import { GeistSans, GeistMono } from 'geist/font'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Sylo V2 - Headless Agent Configuration Engine',
  description:
    'Security-first OAuth bridge for AI agents to access productivity tools without credential exposure.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="font-sans">
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
