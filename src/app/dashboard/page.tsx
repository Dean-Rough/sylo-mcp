import { ServiceConnectionPanel } from '@/components/dashboard/ServiceConnectionPanel'
import { MCPConfigPanel } from '@/components/dashboard/MCPConfigPanel'
import { ContextViewer } from '@/components/dashboard/ContextViewer'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Studio Management Dashboard</h2>
        <p className="text-muted-foreground mt-2 font-normal">
          Monitor and manage your AI agent configuration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceConnectionPanel />
        <MCPConfigPanel />
      </div>

      <ContextViewer />
    </div>
  )
}
