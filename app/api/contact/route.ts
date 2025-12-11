import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    // Validate inputs
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || "support@unytea.com";
    
    await sendEmail({
      to: adminEmail,
      subject: `[Contact Form] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📬 New Contact Form Submission</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #667eea; margin-top: 0;">Contact Details</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #667eea;">${email}</a></p>
                <p><strong>Subject:</strong> ${subject}</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h3 style="color: #667eea; margin-top: 0;">Message</h3>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e;">
                  <strong>Reply to:</strong> <a href="mailto:${email}" style="color: #92400e;">${email}</a>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
              <p>Sent from Unytea Contact Form</p>
            </div>
          </body>
        </html>
      `,
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: "We received your message!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ Message Received</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Hi ${name},</p>
              
              <p>Thank you for reaching out to us! We've received your message and will get back to you as soon as possible.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #667eea; margin-top: 0;">Your Message</h3>
                <p><strong>Subject:</strong> ${subject}</p>
                <p style="white-space: pre-wrap; color: #6b7280;">${message}</p>
              </div>
              
              <p>Our team typically responds within 24-48 hours during business days.</p>
              
              <p style="margin-top: 30px;">Best regards,<br><strong>The Unytea Team</strong></p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
              <p>Unytea - Where Communities Unite</p>
            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json(
      { success: true, message: "Message sent successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
