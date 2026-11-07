// Shared type definitions for email functionality
export interface EmailConfig {
  mailgunApiKey: string
  mailgunDomain: string
  fromEmail: string
  fromName: string
  siteUrl: string
}

export interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: number
}

export interface WaitlistEmailData {
  email: string
  applicationName: string
  joinDate: string
  unsubscribeUrl: string
  siteUrl: string
}