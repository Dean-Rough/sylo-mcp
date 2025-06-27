import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import { SyloLogo } from '@/components/ui/sylo-logo'
import { Shield, Bot, Link2 } from 'lucide-react'
import { iconClass } from '@/lib/utils'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <SyloLogo width={200} height={88} className="text-gray-900" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Headless Agent Configuration Engine
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Security-first OAuth bridge for AI agents to access productivity tools without
            credential exposure
          </p>

          <div className="space-y-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className={iconClass('lg', 'text-blue-600')} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Zero-Credential Exposure</h3>
              <p className="text-gray-600">AI agents never see OAuth tokens</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Bot className={iconClass('lg', 'text-blue-600')} />
              </div>
              <h3 className="text-lg font-semibold mb-2">MCP Standard</h3>
              <p className="text-gray-600">Generate Model Context Protocol configs for any LLM</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Link2 className={iconClass('lg', 'text-blue-600')} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Multi-Service</h3>
              <p className="text-gray-600">Gmail, Asana, Xero unified interface</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
