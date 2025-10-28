import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { validateContactForm, sanitizeContactForm, ContactFormData } from '@/lib/validation';

// Lazy initialization of Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ContactFormData = await request.json();

    // Sanitize input
    const sanitizedData = sanitizeContactForm(body);

    // Validate form data
    const validation = validateContactForm(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    if (!process.env.CONTACT_EMAIL) {
      console.error('CONTACT_EMAIL is not configured');
      return NextResponse.json(
        { error: 'Contact email is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service is not available. Please contact the administrator.' },
        { status: 500 }
      );
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'AckIndex Contact Form <onboarding@resend.dev>', // Resend's test domain
      to: [process.env.CONTACT_EMAIL],
      replyTo: sanitizedData.email,
      subject: `AckIndex Contact Form: Message from ${sanitizedData.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #2e90c6 0%, #1e7eb6 100%);
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .field {
                margin-bottom: 20px;
              }
              .label {
                font-weight: bold;
                color: #2e90c6;
                margin-bottom: 5px;
              }
              .value {
                background: white;
                padding: 10px;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
              }
              .message-box {
                background: white;
                padding: 15px;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
                white-space: pre-wrap;
                word-wrap: break-word;
              }
              .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">New Contact Form Submission</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">AckIndex - Nantucket Civic Data Platform</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">From:</div>
                <div class="value">${sanitizedData.name}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${sanitizedData.email}">${sanitizedData.email}</a></div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${sanitizedData.message}</div>
              </div>
              <div class="footer">
                <p>This message was sent via the AckIndex contact form.</p>
                <p>To reply, use the email address provided above.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
New Contact Form Submission - AckIndex

From: ${sanitizedData.name}
Email: ${sanitizedData.email}

Message:
${sanitizedData.message}

---
This message was sent via the AckIndex contact form.
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Your message has been sent successfully!',
        id: data?.id 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
