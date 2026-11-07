import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { EmailService } from '../_shared/email-service.ts'
import { EmailConfig, WaitlistEmailData } from '../_shared/types.ts'

interface JoinWaitlistRequest {
  applicationId: string
  email: string
  sourceUrl: string
  country?: string
}

serve(async (req: Request): Promise<Response> => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { applicationId, email, sourceUrl, country }: JoinWaitlistRequest = await req.json()

    // Basic validation
    if (!applicationId || !email || !sourceUrl) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate application exists and get application name for email
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('application_id, application_name')
      .eq('application_id', applicationId)
      .single()

    if (appError || !app) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid application ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomUUID().replace(/-/g, '')
    
    // Insert waitlist entry with unsubscribe token
    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        application_id: applicationId,
        email: email.toLowerCase().trim(),
        source_url: sourceUrl,
        country: country || null,
        unsubscribe_token: unsubscribeToken,
        created_at: new Date().toISOString()
      })
      .select('id, email, unsubscribe_token')
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return new Response(
          JSON.stringify({ success: false, message: 'Email already registered' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    // Send welcome email (async, don't block response)
    sendWelcomeEmailAsync(supabase, data, app, email.toLowerCase().trim())

    return new Response(
      JSON.stringify({ success: true, id: data.id, message: 'Successfully joined waitlist' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Async function to send welcome email without blocking the response
async function sendWelcomeEmailAsync(
  supabase: any,
  waitlistEntry: { id: string; email: string; unsubscribe_token: string },
  application: { application_name: string },
  email: string
) {
  try {
    // Check if emails are enabled via environment variable
    const emailsEnabled = Deno.env.get('ENABLE_WELCOME_EMAILS') !== 'false'
    if (!emailsEnabled) {
      console.log('Welcome emails are disabled via ENABLE_WELCOME_EMAILS environment variable')
      return
    }

    // Initialize email service
    const emailConfig: EmailConfig = {
      mailgunApiKey: Deno.env.get('MAILGUN_API_KEY') ?? '',
      mailgunDomain: Deno.env.get('MAILGUN_DOMAIN') ?? '',
      fromEmail: Deno.env.get('FROM_EMAIL') ?? 'hello@yourdomain.com',
      fromName: Deno.env.get('FROM_NAME') ?? application.application_name,
      siteUrl: Deno.env.get('SITE_URL') ?? 'https://yourdomain.com'
    }

    const emailService = new EmailService(emailConfig)

    // Prepare email data
    const emailData: WaitlistEmailData = {
      email: email,
      applicationName: application.application_name,
      joinDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      unsubscribeUrl: `${emailConfig.siteUrl}/unsubscribe?token=${waitlistEntry.unsubscribe_token}`,
      siteUrl: emailConfig.siteUrl
    }

    // Send email
    const emailResult = await emailService.sendWelcomeEmail(emailData)

    // Update database with email status
    await supabase
      .from('waitlist_entries')
      .update({
        email_sent: emailResult.success,
        email_sent_at: emailResult.success ? new Date().toISOString() : null,
        email_error: emailResult.error || null,
        email_message_id: emailResult.messageId || null
      })
      .eq('id', waitlistEntry.id)

    if (emailResult.success) {
      console.log(`Welcome email sent successfully to ${email}, message ID: ${emailResult.messageId}`)
    } else {
      console.error(`Failed to send welcome email to ${email}: ${emailResult.error}`)
    }

  } catch (error) {
    console.error('Error in sendWelcomeEmailAsync:', error)
    
    // Update database with error
    try {
      await supabase
        .from('waitlist_entries')
        .update({
          email_sent: false,
          email_error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
        .eq('id', waitlistEntry.id)
    } catch (updateError) {
      console.error('Failed to update email error status:', updateError)
    }
  }
}