import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "Unytea <noreply@unytea.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * General send email function
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    
    console.log("✅ Email sent to:", to);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Reset Your Password - Unytea",
      html: getPasswordResetEmailTemplate(name, resetUrl),
    });
    
    console.log("✅ Password reset email sent to:", to);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error);
    throw error;
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to Unytea! 🎉",
      html: getWelcomeEmailTemplate(name),
    });
    
    console.log("✅ Welcome email sent to:", to);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
    // Don't throw - welcome email is not critical
    return { success: false };
  }
}

/**
 * Send session reminder email
 */
export async function sendSessionReminderEmail({
  to,
  name,
  sessionTitle,
  sessionTime,
  sessionUrl,
}: {
  to: string;
  name: string;
  sessionTitle: string;
  sessionTime: string;
  sessionUrl: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reminder: ${sessionTitle} starts soon`,
      html: getSessionReminderTemplate(name, sessionTitle, sessionTime, sessionUrl),
    });
    
    console.log("✅ Session reminder sent to:", to);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send session reminder:", error);
    return { success: false };
  }
}

/**
 * Password Reset Email Template
 */
function getPasswordResetEmailTemplate(name: string, resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🔐 Reset Your Password</h1>
        </div>
        
        <div style="background: #fff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <p style="font-size: 18px; margin-bottom: 20px; color: #333;">Hi ${name},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px; color: #666;">
            We received a request to reset your password for your Unytea account. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #999; margin-bottom: 10px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 13px; color: #667eea; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid #667eea;">
            ${resetUrl}
          </p>
          
          <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #f0f0f0;">
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
              ⚠️ <strong>This link expires in 1 hour</strong> for security reasons.
            </p>
            <p style="font-size: 14px; color: #666;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} Unytea. Where Communities Unite.</p>
          <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:support@unytea.com" style="color: #667eea; text-decoration: none;">support@unytea.com</a></p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Welcome Email Template
 */
function getWelcomeEmailTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Unytea</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🎉 Welcome to Unytea!</h1>
        </div>
        
        <div style="background: #fff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <p style="font-size: 18px; margin-bottom: 20px; color: #333;">Hi ${name},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px; color: #666;">
            Thank you for joining Unytea! We're excited to help you build amazing communities that feel like home. ☕
          </p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 30px; margin: 30px 0;">
            <h2 style="color: white; margin: 0 0 20px 0; font-size: 20px;">✨ What's Next?</h2>
            <ul style="color: white; padding-left: 20px; margin: 0; font-size: 15px; line-height: 1.8;">
              <li>Create your first community</li>
              <li>Customize your profile</li>
              <li>Invite members to join</li>
              <li>Schedule your first video session</li>
              <li>Explore the buddy system</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
              Go to Dashboard
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #f0f0f0;">
            <h3 style="color: #333; font-size: 16px; margin-bottom: 15px;">💡 Pro Tips:</h3>
            <ul style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
              <li>Start with a 14-day free trial to explore all features</li>
              <li>Use the buddy system to increase member engagement</li>
              <li>Enable content sharing in video sessions for better learning</li>
              <li>Check your analytics to track community growth</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} Unytea. Where Communities Unite.</p>
          <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:support@unytea.com" style="color: #667eea; text-decoration: none;">support@unytea.com</a></p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Session Reminder Email Template
 */
function getSessionReminderTemplate(
  name: string,
  sessionTitle: string,
  sessionTime: string,
  sessionUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">📅 Session Starting Soon!</h1>
        </div>
        
        <div style="background: #fff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <p style="font-size: 18px; margin-bottom: 20px; color: #333;">Hi ${name},</p>
          
          <p style="font-size: 16px; margin-bottom: 30px; color: #666;">
            This is a friendly reminder that your session is starting soon:
          </p>
          
          <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 6px;">
            <h2 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">${sessionTitle}</h2>
            <p style="color: #666; margin: 0; font-size: 16px;">
              🕐 ${sessionTime}
            </p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${sessionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
              Join Session
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #f0f0f0;">
            <p style="font-size: 14px; color: #666;">
              💡 <strong>Tip:</strong> Join a few minutes early to test your audio and video setup.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} Unytea. Where Communities Unite.</p>
        </div>
      </body>
    </html>
  `;
}
