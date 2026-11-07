// Test endpoint for email functionality
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { EmailService } from '../_shared/email-service.ts'
import { EmailConfig, WaitlistEmailData } from '../_shared/types.ts'

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { email, applicationName } = await req.json()

    if (!email || !applicationName) {
      return new Response(
        JSON.stringify({ success: false, message: 'email and applicationName required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test email configuration
    const emailConfig: EmailConfig = {
      mailgunApiKey: Deno.env.get('MAILGUN_API_KEY') ?? '',
      mailgunDomain: Deno.env.get('MAILGUN_DOMAIN') ?? '',
      fromEmail: Deno.env.get('FROM_EMAIL') ?? 'hello@example.com',
      fromName: Deno.env.get('FROM_NAME') ?? applicationName,
      siteUrl: Deno.env.get('SITE_URL') ?? 'https://example.com'
    }

    const emailService = new EmailService(emailConfig)

    // Test connection first
    const connectionTest = await emailService.testConnection()
    if (!connectionTest.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email service connection failed',
          error: connectionTest.error,
          config: {
            hasApiKey: !!emailConfig.mailgunApiKey,
            hasDomain: !!emailConfig.mailgunDomain,
            domain: emailConfig.mailgunDomain || 'not set'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send test email
    const emailData: WaitlistEmailData = {
      email: email,
      applicationName: applicationName,
      joinDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      unsubscribeUrl: `${emailConfig.siteUrl}/unsubscribe?token=test-token-${Date.now()}`,
      siteUrl: emailConfig.siteUrl
    }

    const result = await emailService.sendWelcomeEmail(emailData)

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
        messageId: result.messageId,
        error: result.error,
        config: {
          fromEmail: emailConfig.fromEmail,
          fromName: emailConfig.fromName,
          domain: emailConfig.mailgunDomain,
          siteUrl: emailConfig.siteUrl
        },
        emailData: {
          to: emailData.email,
          applicationName: emailData.applicationName,
          joinDate: emailData.joinDate
        }
      }),
      { 
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Test email error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})