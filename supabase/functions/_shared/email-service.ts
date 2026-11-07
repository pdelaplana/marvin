import { EmailConfig, EmailResult, WaitlistEmailData } from './types.ts'
import { WELCOME_EMAIL_TEMPLATE, renderTemplate } from './email-templates.ts'

export class EmailService {
  constructor(private config: EmailConfig) {}

  async sendWelcomeEmail(data: WaitlistEmailData): Promise<EmailResult> {
    try {
      // Validate configuration
      if (!this.config.mailgunApiKey || !this.config.mailgunDomain) {
        return {
          success: false,
          error: 'Mailgun configuration missing'
        }
      }

      // Render template with data
      const renderedTemplate = renderTemplate(WELCOME_EMAIL_TEMPLATE, data)

      // Prepare Mailgun API request
      const formData = new FormData()
      formData.append('from', `${this.config.fromName} <${this.config.fromEmail}>`)
      formData.append('to', data.email)
      formData.append('subject', renderedTemplate.subject)
      formData.append('html', renderedTemplate.htmlContent)
      if (renderedTemplate.textContent) {
        formData.append('text', renderedTemplate.textContent)
      }

      // Add tracking and tags
      formData.append('o:tracking', 'yes')
      formData.append('o:tag', 'waitlist-welcome')
      formData.append('o:tag', 'automated')

      // Send email via Mailgun API
      const response = await fetch(
        `https://api.mailgun.net/v3/${this.config.mailgunDomain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${this.config.mailgunApiKey}`)}`
          },
          body: formData
        }
      )

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: `Mailgun API error: ${responseData.message || 'Unknown error'}`,
          statusCode: response.status
        }
      }

      return {
        success: true,
        messageId: responseData.id
      }

    } catch (error) {
      console.error('Email service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Helper method for testing configuration
  async testConnection(): Promise<EmailResult> {
    try {
      const response = await fetch(
        `https://api.mailgun.net/v3/${this.config.mailgunDomain}`,
        {
          headers: {
            'Authorization': `Basic ${btoa(`api:${this.config.mailgunApiKey}`)}`
          }
        }
      )

      return {
        success: response.ok,
        error: response.ok ? undefined : 'Authentication failed'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }
}