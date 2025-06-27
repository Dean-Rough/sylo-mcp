import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { SyloLogo } from '@/components/ui/sylo-logo'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <SyloLogo width={100} height={44} className="text-foreground" />
                <Badge variant="outline" className="font-mono">
                  Dashboard
                </Badge>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}
              </div>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'h-8 w-8',
                  },
                }}
              />
            </div>
          </div>
        </nav>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
