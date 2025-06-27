import { makeAPICall } from '@/lib/nango/client'

export interface XeroContact {
  ContactID: string
  Name: string
  EmailAddress?: string
  ContactStatus: string
  Addresses?: Array<{
    AddressType: string
    AddressLine1?: string
    City?: string
    Country?: string
  }>
  Phones?: Array<{
    PhoneType: string
    PhoneNumber: string
  }>
}

export interface XeroInvoice {
  InvoiceID: string
  InvoiceNumber: string
  Type: 'ACCREC' | 'ACCPAY' // Accounts Receivable or Accounts Payable
  Status: string
  Date: string
  DueDate: string
  Total: number
  AmountDue: number
  AmountPaid: number
  Contact: {
    ContactID: string
    Name: string
  }
  CurrencyCode: string
}

export interface XeroAccount {
  AccountID: string
  Code: string
  Name: string
  Type: string
  Class: string
  Status: string
  BankAccountNumber?: string
  CurrencyCode?: string
}

export class XeroService {
  private connectionId: string

  constructor(connectionId: string) {
    this.connectionId = connectionId
  }

  async getInvoices(limit = 20): Promise<XeroInvoice[]> {
    try {
      const response = await makeAPICall(
        'xero',
        this.connectionId,
        `/api.xro/2.0/Invoices?page=1&unitdp=2`,
        'GET'
      )

      return response.Invoices || []
    } catch (error) {
      console.error('Failed to fetch Xero invoices:', error)
      throw new Error('Failed to fetch invoices from Xero')
    }
  }

  async getOutstandingInvoices(): Promise<XeroInvoice[]> {
    try {
      const response = await makeAPICall(
        'xero',
        this.connectionId,
        `/api.xro/2.0/Invoices?where=Status="AUTHORISED"&order=Date DESC`,
        'GET'
      )

      const invoices = response.Invoices || []
      return invoices.filter((invoice: XeroInvoice) => invoice.AmountDue > 0)
    } catch (error) {
      console.error('Failed to fetch outstanding Xero invoices:', error)
      return []
    }
  }

  async getOverdueInvoices(): Promise<XeroInvoice[]> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await makeAPICall(
        'xero',
        this.connectionId,
        `/api.xro/2.0/Invoices?where=Status="AUTHORISED"AND DueDate<DateTime(${today})`,
        'GET'
      )

      const invoices = response.Invoices || []
      return invoices.filter((invoice: XeroInvoice) => invoice.AmountDue > 0)
    } catch (error) {
      console.error('Failed to fetch overdue Xero invoices:', error)
      return []
    }
  }

  async getContacts(limit = 20): Promise<XeroContact[]> {
    try {
      const response = await makeAPICall(
        'xero',
        this.connectionId,
        `/api.xro/2.0/Contacts?page=1`,
        'GET'
      )

      return response.Contacts || []
    } catch (error) {
      console.error('Failed to fetch Xero contacts:', error)
      throw new Error('Failed to fetch contacts from Xero')
    }
  }

  async getAccounts(): Promise<XeroAccount[]> {
    try {
      const response = await makeAPICall('xero', this.connectionId, `/api.xro/2.0/Accounts`, 'GET')

      return response.Accounts || []
    } catch (error) {
      console.error('Failed to fetch Xero accounts:', error)
      throw new Error('Failed to fetch accounts from Xero')
    }
  }

  async getFinancialSummary(): Promise<{
    totalReceivables: number
    totalPayables: number
    overdueAmount: number
    overdueCount: number
    totalInvoices: number
    paidInvoices: number
  }> {
    try {
      const [allInvoices, outstandingInvoices, overdueInvoices] = await Promise.all([
        this.getInvoices(100),
        this.getOutstandingInvoices(),
        this.getOverdueInvoices(),
      ])

      const receivableInvoices = allInvoices.filter(inv => inv.Type === 'ACCREC')
      const payableInvoices = allInvoices.filter(inv => inv.Type === 'ACCPAY')

      const totalReceivables = receivableInvoices
        .filter(inv => inv.AmountDue > 0)
        .reduce((sum, inv) => sum + inv.AmountDue, 0)

      const totalPayables = payableInvoices
        .filter(inv => inv.AmountDue > 0)
        .reduce((sum, inv) => sum + inv.AmountDue, 0)

      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.AmountDue, 0)

      const paidInvoices = allInvoices.filter(inv => inv.AmountDue === 0).length

      return {
        totalReceivables,
        totalPayables,
        overdueAmount,
        overdueCount: overdueInvoices.length,
        totalInvoices: allInvoices.length,
        paidInvoices,
      }
    } catch (error) {
      console.error('Failed to get Xero financial summary:', error)
      return {
        totalReceivables: 0,
        totalPayables: 0,
        overdueAmount: 0,
        overdueCount: 0,
        totalInvoices: 0,
        paidInvoices: 0,
      }
    }
  }

  async createContact(contact: Partial<XeroContact>): Promise<XeroContact | null> {
    try {
      const response = await makeAPICall(
        'xero',
        this.connectionId,
        '/api.xro/2.0/Contacts',
        'POST',
        { Contacts: [contact] }
      )

      return response.Contacts?.[0] || null
    } catch (error) {
      console.error('Failed to create Xero contact:', error)
      return null
    }
  }
}
