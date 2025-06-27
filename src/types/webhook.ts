export interface AgentCommand {
  userId: string
  action: string
  service: string
  parameters: Record<string, any>
  timestamp?: number
  requestId?: string
}

export interface CommandResult {
  commandId: string
  status: 'success' | 'error' | 'pending'
  data?: any
  error?: string
}

export interface WebhookResponse {
  success: boolean
  commandId: string
  status: string
  result?: any
  error?: string
}
