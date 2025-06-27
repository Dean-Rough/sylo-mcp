import { makeAPICall } from '@/lib/nango/client'

export interface Email {
  id: string
  subject: string
  from: string
  date: Date
  snippet: string
  read?: boolean
  labels?: string[]
}

export interface EmailListResponse {
  messages?: Array<{
    id: string
    threadId: string
  }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

export interface EmailDetailResponse {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{
      name: string
      value: string
    }>
    body?: {
      data?: string
    }
    parts?: Array<{
      body?: {
        data?: string
      }
    }>
  }
  internalDate: string
}

export class GmailService {
  private connectionId: string

  constructor(connectionId: string) {
    this.connectionId = connectionId
  }

  async getEmails(maxResults = 10, query?: string): Promise<Email[]> {
    try {
      // Get list of messages
      let endpoint = `/gmail/v1/users/me/messages?maxResults=${maxResults}`
      if (query) {
        endpoint += `&q=${encodeURIComponent(query)}`
      }

      const listResponse = (await makeAPICall(
        'gmail',
        this.connectionId,
        endpoint,
        'GET'
      )) as EmailListResponse

      if (!listResponse.messages) {
        return []
      }

      // Get details for each message
      const emails = await Promise.all(
        listResponse.messages.map(async message => {
          const detail = await this.getEmailDetail(message.id)
          return {
            id: message.id,
            subject: this.getHeader(detail, 'Subject') || 'No Subject',
            from: this.getHeader(detail, 'From') || 'Unknown Sender',
            date: new Date(parseInt(detail.internalDate)),
            snippet: detail.snippet || '',
            read: !detail.labelIds.includes('UNREAD'),
            labels: detail.labelIds,
          }
        })
      )

      return emails
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      throw new Error('Failed to fetch emails from Gmail')
    }
  }

  async getUnreadEmails(): Promise<Email[]> {
    return this.getEmails(20, 'is:unread')
  }

  async getUrgentEmails(): Promise<Email[]> {
    return this.getEmails(10, 'is:unread (urgent OR ASAP OR priority)')
  }

  private async getEmailDetail(messageId: string): Promise<EmailDetailResponse> {
    const response = await makeAPICall(
      'gmail',
      this.connectionId,
      `/gmail/v1/users/me/messages/${messageId}`,
      'GET'
    )
    return response as EmailDetailResponse
  }

  private getHeader(message: EmailDetailResponse, name: string): string | null {
    const header = message.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())
    return header?.value || null
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      const email = [`To: ${to}`, `Subject: ${subject}`, '', body].join('\n')

      const encodedEmail = Buffer.from(email).toString('base64url')

      await makeAPICall('gmail', this.connectionId, '/gmail/v1/users/me/messages/send', 'POST', {
        raw: encodedEmail,
      })

      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  async getEmailStats(): Promise<{
    total: number
    unread: number
    urgent: number
    todayCount: number
  }> {
    try {
      const [unreadEmails, urgentEmails] = await Promise.all([
        this.getUnreadEmails(),
        this.getUrgentEmails(),
      ])

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayEmails = await this.getEmails(50, `after:${Math.floor(today.getTime() / 1000)}`)

      return {
        total: 0, // Would need additional API call to get total
        unread: unreadEmails.length,
        urgent: urgentEmails.length,
        todayCount: todayEmails.length,
      }
    } catch (error) {
      console.error('Failed to get email stats:', error)
      return {
        total: 0,
        unread: 0,
        urgent: 0,
        todayCount: 0,
      }
    }
  }
}
