import { GmailService, EmailListResponse, EmailDetailResponse } from '../gmail'
import { makeAPICall } from '@/lib/nango/client'

// Mock the Nango client
jest.mock('@/lib/nango/client', () => ({
  makeAPICall: jest.fn(),
}))

const mockMakeAPICall = makeAPICall as jest.MockedFunction<typeof makeAPICall>

describe('GmailService', () => {
  let gmailService: GmailService
  const mockConnectionId = 'test-connection-id'

  beforeEach(() => {
    gmailService = new GmailService(mockConnectionId)
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getEmails', () => {
    it('should fetch and format emails correctly', async () => {
      const mockListResponse: EmailListResponse = {
        messages: [
          { id: '1', threadId: 'thread1' },
          { id: '2', threadId: 'thread2' },
        ],
        nextPageToken: 'next_token',
        resultSizeEstimate: 2,
      }

      const mockEmailDetail1: EmailDetailResponse = {
        id: '1',
        threadId: 'thread1',
        labelIds: ['INBOX', 'UNREAD'],
        snippet: 'Test email snippet 1',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject 1' },
            { name: 'From', value: 'sender1@example.com' },
          ],
        },
        internalDate: '1640995200000', // Unix timestamp in ms
      }

      const mockEmailDetail2: EmailDetailResponse = {
        id: '2',
        threadId: 'thread2',
        labelIds: ['INBOX'],
        snippet: 'Test email snippet 2',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject 2' },
            { name: 'From', value: 'sender2@example.com' },
          ],
        },
        internalDate: '1640995300000',
      }

      // Mock the API calls
      mockMakeAPICall
        .mockResolvedValueOnce(mockListResponse) // List messages call
        .mockResolvedValueOnce(mockEmailDetail1) // First email detail
        .mockResolvedValueOnce(mockEmailDetail2) // Second email detail

      const emails = await gmailService.getEmails(2)

      expect(emails).toHaveLength(2)
      expect(emails[0]).toEqual({
        id: '1',
        subject: 'Test Subject 1',
        from: 'sender1@example.com',
        date: new Date(1640995200000),
        snippet: 'Test email snippet 1',
        read: false, // UNREAD label present
        labels: ['INBOX', 'UNREAD'],
      })
      expect(emails[1]).toEqual({
        id: '2',
        subject: 'Test Subject 2',
        from: 'sender2@example.com',
        date: new Date(1640995300000),
        snippet: 'Test email snippet 2',
        read: true, // No UNREAD label
        labels: ['INBOX'],
      })

      // Verify API calls
      expect(mockMakeAPICall).toHaveBeenCalledTimes(3)
      expect(mockMakeAPICall).toHaveBeenNthCalledWith(
        1,
        'gmail',
        mockConnectionId,
        '/gmail/v1/users/me/messages?maxResults=2',
        'GET'
      )
      expect(mockMakeAPICall).toHaveBeenNthCalledWith(
        2,
        'gmail',
        mockConnectionId,
        '/gmail/v1/users/me/messages/1',
        'GET'
      )
      expect(mockMakeAPICall).toHaveBeenNthCalledWith(
        3,
        'gmail',
        mockConnectionId,
        '/gmail/v1/users/me/messages/2',
        'GET'
      )
    })

    it('should handle empty message list', async () => {
      const mockListResponse: EmailListResponse = {
        messages: undefined,
        resultSizeEstimate: 0,
      }

      mockMakeAPICall.mockResolvedValueOnce(mockListResponse)

      const emails = await gmailService.getEmails()

      expect(emails).toEqual([])
      expect(mockMakeAPICall).toHaveBeenCalledTimes(1)
    })

    it('should handle missing headers gracefully', async () => {
      const mockListResponse: EmailListResponse = {
        messages: [{ id: '1', threadId: 'thread1' }],
      }

      const mockEmailDetail: EmailDetailResponse = {
        id: '1',
        threadId: 'thread1',
        labelIds: ['INBOX'],
        snippet: 'Test snippet',
        payload: {
          headers: [], // No headers
        },
        internalDate: '1640995200000',
      }

      mockMakeAPICall.mockResolvedValueOnce(mockListResponse).mockResolvedValueOnce(mockEmailDetail)

      const emails = await gmailService.getEmails()

      expect(emails).toHaveLength(1)
      expect(emails[0]).toEqual({
        id: '1',
        subject: 'No Subject',
        from: 'Unknown Sender',
        date: new Date(1640995200000),
        snippet: 'Test snippet',
        read: true,
        labels: ['INBOX'],
      })
    })

    it('should include query parameter when provided', async () => {
      const mockListResponse: EmailListResponse = { messages: [] }
      mockMakeAPICall.mockResolvedValueOnce(mockListResponse)

      await gmailService.getEmails(10, 'is:unread important')

      expect(mockMakeAPICall).toHaveBeenCalledWith(
        'gmail',
        mockConnectionId,
        '/gmail/v1/users/me/messages?maxResults=10&q=is%3Aunread%20important',
        'GET'
      )
    })

    it('should throw error when API call fails', async () => {
      const error = new Error('Gmail API error')
      mockMakeAPICall.mockRejectedValueOnce(error)

      await expect(gmailService.getEmails()).rejects.toThrow('Failed to fetch emails from Gmail')
    })
  })

  describe('getUnreadEmails', () => {
    it('should call getEmails with unread query', async () => {
      const mockListResponse: EmailListResponse = { messages: [] }
      mockMakeAPICall.mockResolvedValueOnce(mockListResponse)

      await gmailService.getUnreadEmails()

      expect(mockMakeAPICall).toHaveBeenCalledWith(
        'gmail',
        mockConnectionId,
        '/gmail/v1/users/me/messages?maxResults=20&q=is%3Aunread',
        'GET'
      )
    })
  })

  describe('getUrgentEmails', () => {
    it('should call getEmails with urgent query', async () => {
      const mockListResponse: EmailListResponse = { messages: [] }
      mockMakeAPICall.mockResolvedValueOnce(mockListResponse)

      await gmailService.getUrgentEmails()

      expect(mockMakeAPICall).toHaveBeenCalledWith(
        'gmail',
        mockConnectionId,
        '/gmail/v1/users/me/messages?maxResults=10&q=is%3Aunread%20(urgent%20OR%20ASAP%20OR%20priority)',
        'GET'
      )
    })
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockMakeAPICall.mockResolvedValueOnce({})

      const result = await gmailService.sendEmail(
        'recipient@example.com',
        'Test Subject',
        'Test Body'
      )

      expect(result).toBe(true)
      expect(mockMakeAPICall).toHaveBeenCalledWith(
        'gmail',
        mockConnectionId,
        '/gmail/v1/users/me/messages/send',
        'POST',
        {
          raw: expect.stringMatching(/^[A-Za-z0-9_-]+$/), // Base64url encoded
        }
      )
    })

    it('should return false when send fails', async () => {
      const error = new Error('Send failed')
      mockMakeAPICall.mockRejectedValueOnce(error)

      const result = await gmailService.sendEmail(
        'recipient@example.com',
        'Test Subject',
        'Test Body'
      )

      expect(result).toBe(false)
    })
  })

  describe('getEmailStats', () => {
    it('should compile email statistics correctly', async () => {
      // Mock the methods that getEmailStats calls
      jest.spyOn(gmailService, 'getUnreadEmails').mockResolvedValue([
        {
          id: '1',
          subject: 'Unread 1',
          from: 'sender1@example.com',
          date: new Date(),
          snippet: 'snippet 1',
          read: false,
        },
        {
          id: '2',
          subject: 'Unread 2',
          from: 'sender2@example.com',
          date: new Date(),
          snippet: 'snippet 2',
          read: false,
        },
      ])

      jest.spyOn(gmailService, 'getUrgentEmails').mockResolvedValue([
        {
          id: '3',
          subject: 'Urgent email',
          from: 'urgent@example.com',
          date: new Date(),
          snippet: 'urgent snippet',
          read: false,
        },
      ])

      jest.spyOn(gmailService, 'getEmails').mockResolvedValue([
        {
          id: '4',
          subject: 'Today 1',
          from: 'today1@example.com',
          date: new Date(),
          snippet: 'today snippet 1',
          read: true,
        },
        {
          id: '5',
          subject: 'Today 2',
          from: 'today2@example.com',
          date: new Date(),
          snippet: 'today snippet 2',
          read: true,
        },
        {
          id: '6',
          subject: 'Today 3',
          from: 'today3@example.com',
          date: new Date(),
          snippet: 'today snippet 3',
          read: true,
        },
      ])

      const stats = await gmailService.getEmailStats()

      expect(stats).toEqual({
        total: 0, // Not implemented in current version
        unread: 2,
        urgent: 1,
        todayCount: 3,
      })
    })

    it('should return zero stats on error', async () => {
      jest.spyOn(gmailService, 'getUnreadEmails').mockRejectedValue(new Error('API error'))

      const stats = await gmailService.getEmailStats()

      expect(stats).toEqual({
        total: 0,
        unread: 0,
        urgent: 0,
        todayCount: 0,
      })
    })
  })
})
