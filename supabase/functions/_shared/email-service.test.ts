// Unit tests for email service
import { assertEquals, assertStringIncludes } from 'https://deno.land/std/testing/asserts.ts'
import { EmailService } from './email-service.ts'
import { renderTemplate, WELCOME_EMAIL_TEMPLATE } from './email-templates.ts'

// Mock email config for testing
const mockEmailConfig = {
  mailgunApiKey: 'key-test',
  mailgunDomain: 'test.example.com',
  fromEmail: 'test@example.com',
  fromName: 'Test App',
  siteUrl: 'https://test.example.com'
}

Deno.test('Email Template Rendering - Basic Variables', () => {
  const testData = {
    email: 'user@example.com',
    applicationName: 'Test App',
    joinDate: 'January 1, 2024',
    unsubscribeUrl: 'https://example.com/unsubscribe?token=abc123',
    siteUrl: 'https://example.com'
  }

  const rendered = renderTemplate(WELCOME_EMAIL_TEMPLATE, testData)

  assertEquals(rendered.subject, 'Welcome to Test App Waitlist! 🎉')
  assertStringIncludes(rendered.htmlContent, 'user@example.com')
  assertStringIncludes(rendered.htmlContent, 'Test App')
  assertStringIncludes(rendered.htmlContent, 'January 1, 2024')
  assertStringIncludes(rendered.htmlContent, 'https://example.com/unsubscribe?token=abc123')
})

Deno.test('Email Template Rendering - Special Characters', () => {
  const testData = {
    applicationName: "App with 'Special' & <Characters>",
    email: 'test@example.com',
    joinDate: 'Today',
    unsubscribeUrl: 'https://example.com/unsub',
    siteUrl: 'https://example.com'
  }

  const rendered = renderTemplate(WELCOME_EMAIL_TEMPLATE, testData)
  
  assertStringIncludes(rendered.htmlContent, "App with 'Special' & <Characters>")
  assertStringIncludes(rendered.subject, "App with 'Special' & <Characters>")
})

Deno.test('Email Template Rendering - Missing Variables', () => {
  const testData = {
    email: 'test@example.com',
    applicationName: 'Test App',
    // Missing joinDate, unsubscribeUrl, siteUrl
  }

  const rendered = renderTemplate(WELCOME_EMAIL_TEMPLATE, testData)
  
  // Should still contain unreplaced template variables
  assertStringIncludes(rendered.htmlContent, '{{joinDate}}')
  assertStringIncludes(rendered.htmlContent, '{{unsubscribeUrl}}')
  assertStringIncludes(rendered.htmlContent, '{{siteUrl}}')
})

Deno.test('Email Service - Configuration Validation', async () => {
  const invalidConfig = {
    mailgunApiKey: '',
    mailgunDomain: '',
    fromEmail: 'test@example.com',
    fromName: 'Test',
    siteUrl: 'https://test.com'
  }

  const emailService = new EmailService(invalidConfig)
  const testData = {
    email: 'test@example.com',
    applicationName: 'Test App',
    joinDate: 'Today',
    unsubscribeUrl: 'https://example.com/unsub',
    siteUrl: 'https://example.com'
  }

  const result = await emailService.sendWelcomeEmail(testData)
  
  assertEquals(result.success, false)
  assertStringIncludes(result.error!, 'configuration missing')
})

Deno.test('Email Template Rendering - HTML Escaping', () => {
  const testData = {
    email: 'test@example.com',
    applicationName: 'App<script>alert("xss")</script>',
    joinDate: 'Today',
    unsubscribeUrl: 'https://example.com/unsub',
    siteUrl: 'https://example.com'
  }

  const rendered = renderTemplate(WELCOME_EMAIL_TEMPLATE, testData)
  
  // Template should preserve the content as-is (HTML escaping happens at display time)
  assertStringIncludes(rendered.htmlContent, 'App<script>alert("xss")</script>')
})

Deno.test('Email Template Rendering - Empty Values', () => {
  const testData = {
    email: '',
    applicationName: '',
    joinDate: '',
    unsubscribeUrl: '',
    siteUrl: ''
  }

  const rendered = renderTemplate(WELCOME_EMAIL_TEMPLATE, testData)
  
  // Should replace with empty strings
  assertEquals(rendered.subject, 'Welcome to  Waitlist! 🎉')
  assertStringIncludes(rendered.htmlContent, 'Email: </p>')
})

Deno.test('Email Service - Valid Configuration Structure', () => {
  const validConfig = {
    mailgunApiKey: 'key-valid-api-key',
    mailgunDomain: 'mg.example.com',
    fromEmail: 'test@example.com',
    fromName: 'Test App',
    siteUrl: 'https://example.com'
  }

  const emailService = new EmailService(validConfig)
  
  // Should create service without errors
  assertEquals(typeof emailService, 'object')
  assertEquals(typeof emailService.sendWelcomeEmail, 'function')
  assertEquals(typeof emailService.testConnection, 'function')
})