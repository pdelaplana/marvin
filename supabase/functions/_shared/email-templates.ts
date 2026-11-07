import { EmailTemplate } from './types.ts'

export const WELCOME_EMAIL_TEMPLATE: EmailTemplate = {
  subject: "Welcome to {{applicationName}} Waitlist! 🎉",
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to {{applicationName}} Waitlist!</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="background-color: #f8f9fa; padding: 40px 20px; text-align: center;">
    <h1 style="color: #333; margin: 0; font-size: 28px;">You're on the list! 🎉</h1>
  </div>
  
  <div style="padding: 30px 20px;">
    <p style="font-size: 16px; line-height: 1.5; color: #333;">Hi there,</p>
    
    <p style="font-size: 16px; line-height: 1.5; color: #333;">
      Thank you for joining the <strong>{{applicationName}}</strong> waitlist! 
      We're excited to have you aboard.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5; color: #333; margin-top: 20px;">
      <strong>What happens next?</strong>
    </p>
    <ul style="font-size: 16px; line-height: 1.6; color: #333;">
      <li>We'll keep you updated on our progress</li>
      <li>You'll be among the first to know when we launch</li>
      <li>Exclusive early access when available</li>
    </ul>
    
    <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 16px; color: #333;"><strong>Your registration details:</strong></p>
      <p style="margin: 5px 0; font-size: 14px; color: #666;">Email: {{email}}</p>
      <p style="margin: 5px 0; font-size: 14px; color: #666;">Joined: {{joinDate}}</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5; color: #333;">Thanks again for your interest!</p>
    <p style="font-size: 16px; line-height: 1.5; color: #333;">The {{applicationName}} Team</p>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e9ecef;">
    <p style="margin: 0;">
      <a href="{{unsubscribeUrl}}" style="color: #007bff; text-decoration: none;">Unsubscribe</a> | 
      <a href="{{siteUrl}}" style="color: #007bff; text-decoration: none;">Visit our website</a>
    </p>
  </div>
</body>
</html>`,
  textContent: `Welcome to {{applicationName}} Waitlist!

Hi there,

Thank you for joining the {{applicationName}} waitlist! We're excited to have you aboard.

What happens next?
- We'll keep you updated on our progress
- You'll be among the first to know when we launch
- Exclusive early access when available

Your registration details:
Email: {{email}}
Joined: {{joinDate}}

Thanks again for your interest!
The {{applicationName}} Team

Unsubscribe: {{unsubscribeUrl}}
Visit our website: {{siteUrl}}`
}

// Simple template variable replacement function
export function renderTemplate(template: EmailTemplate, data: Record<string, any>): EmailTemplate {
  const rendered: EmailTemplate = {
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent
  }

  // Replace variables in subject, HTML, and text content
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    rendered.subject = rendered.subject.replace(placeholder, String(value))
    rendered.htmlContent = rendered.htmlContent.replace(placeholder, String(value))
    if (rendered.textContent) {
      rendered.textContent = rendered.textContent.replace(placeholder, String(value))
    }
  }

  return rendered
}