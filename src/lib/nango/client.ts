import { Nango } from '@nangohq/node'

// Server-side Nango client
export const nango = new Nango({
  secretKey:
    process.env.NANGO_SECRET_KEY_DEV || process.env.NANGO_SECRET_KEY || 'dev-placeholder-key',
})

// Supported integrations
export const SUPPORTED_INTEGRATIONS = {
  GMAIL: 'gmail',
  ASANA: 'asana',
  XERO: 'xero',
} as const

export type SupportedIntegration =
  (typeof SUPPORTED_INTEGRATIONS)[keyof typeof SUPPORTED_INTEGRATIONS]

// Integration configurations
export const INTEGRATION_CONFIGS = {
  [SUPPORTED_INTEGRATIONS.GMAIL]: {
    name: 'Gmail',
    description: 'Access Gmail messages and send emails',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    icon: 'Mail',
  },
  [SUPPORTED_INTEGRATIONS.ASANA]: {
    name: 'Asana',
    description: 'Manage tasks and projects',
    scopes: ['default'],
    icon: 'CheckSquare',
  },
  [SUPPORTED_INTEGRATIONS.XERO]: {
    name: 'Xero',
    description: 'Access accounting and financial data',
    scopes: ['accounting.transactions', 'accounting.contacts.read'],
    icon: 'DollarSign',
  },
} as const

/**
 * Create a connect session for OAuth authorization
 */
export async function createConnectSession(
  integration: SupportedIntegration,
  endUserId: string,
  userEmail?: string,
  displayName?: string
) {
  try {
    const session = await nango.createConnectSession({
      end_user: {
        id: endUserId,
        email: userEmail,
        display_name: displayName,
      },
      allowed_integrations: [integration],
    })

    return session.data
  } catch (error) {
    console.error(`Failed to create connect session for ${integration}:`, error)
    throw new Error(`Failed to initiate ${integration} authorization`)
  }
}

/**
 * Get connection details for a user's integration
 */
export async function getConnection(integration: SupportedIntegration, connectionId: string) {
  try {
    const connection = await nango.getConnection(integration, connectionId)
    return connection
  } catch (error) {
    console.error(`Failed to get connection for ${integration}:`, error)
    return null
  }
}

/**
 * Delete a connection
 */
export async function deleteConnection(integration: SupportedIntegration, connectionId: string) {
  try {
    await nango.deleteConnection(integration, connectionId)
    return true
  } catch (error) {
    console.error(`Failed to delete connection for ${integration}:`, error)
    return false
  }
}

/**
 * Get access token for making API calls
 */
export async function getAccessToken(integration: SupportedIntegration, connectionId: string) {
  try {
    const token = await nango.getToken(integration, connectionId)
    return token
  } catch (error) {
    console.error(`Failed to get access token for ${integration}:`, error)
    throw new Error(`Failed to get access token for ${integration}`)
  }
}

/**
 * Make an authenticated API call via Nango proxy
 */
export async function makeAPICall(
  integration: SupportedIntegration,
  connectionId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
) {
  try {
    const response = await nango.proxy({
      providerConfigKey: integration,
      connectionId,
      endpoint,
      method,
      data,
    })

    return response.data
  } catch (error) {
    console.error(`API call failed for ${integration}:`, error)
    throw new Error(`API call failed for ${integration}`)
  }
}
