import { Resend } from "resend";

// ── Resend client (lazy init so builds don't fail without the key) ────
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error(
        "RESEND_API_KEY is not set. Add it to your environment variables."
      );
    }
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Unytea <noreply@unytea.com>";
const APP_URL = process.env.NEXTAUTH_URL || "https://unytea.com";

// ── Types ─────────────────────────────────────────────────────────────
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SessionReminderData {
  userName: string;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  reminderType: "24h" | "1h" | "10m";
  joinLink: string;
  hostName?: string;
  communityName?: string;
}

export interface WelcomeEmailData {
  userName: string;
  dashboardLink?: string;
}

export interface CommunityInviteData {
  userName: string;
  inviterName: string;
  communityName: string;
  communityDescription?: string;
  joinLink: string;
}

export interface SessionRecapData {
  userName: string;
  sessionTitle: string;
  sessionDate: string;
  summary?: string;
  keyInsights?: string[];
  recordingLink?: string;
  communityLink: string;
}

// ── Core send function ────────────────────────────────────────────────
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const resend = getResend();

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Template: Welcome ─────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, data: WelcomeEmailData) {
  const dashboardLink = data.dashboardLink || `${APP_URL}/dashboard`;

  return sendEmail({
    to,
    subject: `Welcome to Unytea, ${data.userName}!`,
    tags: [{ name: "category", value: "welcome" }],
    html: emailLayout(`
      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0;">
        Welcome to Unytea! 🎉
      </h1>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Hey ${data.userName}, we're thrilled to have you. Unytea is where communities
        come alive — with live sessions, courses, gamification, and real human connection.
      </p>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
        Here's what you can do right away:
      </p>
      <ul style="color: #d4d4d8; font-size: 15px; line-height: 2; padding-left: 20px; margin: 0 0 32px 0;">
        <li>Join a community that matches your interests</li>
        <li>Attend live video sessions with experts</li>
        <li>Take courses and earn achievements</li>
        <li>Connect with your community buddy</li>
      </ul>
      ${ctaButton("Explore Your Dashboard", dashboardLink)}
    `),
    text: `Welcome to Unytea, ${data.userName}! Visit your dashboard: ${dashboardLink}`,
  });
}

// ── Template: Session Reminder ────────────────────────────────────────
export async function sendSessionReminderEmail(
  to: string,
  data: SessionReminderData
) {
  const urgencyMap = {
    "24h": { label: "tomorrow", color: "#3b82f6" },
    "1h": { label: "in 1 hour", color: "#f59e0b" },
    "10m": { label: "in 10 minutes", color: "#ef4444" },
  };
  const urgency = urgencyMap[data.reminderType];

  return sendEmail({
    to,
    subject: `⏰ "${data.sessionTitle}" starts ${urgency.label}`,
    tags: [
      { name: "category", value: "session-reminder" },
      { name: "reminder_type", value: data.reminderType },
    ],
    html: emailLayout(`
      <div style="background: ${urgency.color}15; border: 1px solid ${urgency.color}40; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="color: ${urgency.color}; font-size: 14px; font-weight: 600; margin: 0;">
          ⏰ Starting ${urgency.label}
        </p>
      </div>
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0;">
        ${data.sessionTitle}
      </h1>
      <p style="color: #a1a1aa; font-size: 15px; margin: 0 0 24px 0;">
        ${data.sessionDate} at ${data.sessionTime}
        ${data.hostName ? ` · Hosted by ${data.hostName}` : ""}
        ${data.communityName ? ` · ${data.communityName}` : ""}
      </p>
      <p style="color: #d4d4d8; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
        Hey ${data.userName}, don't miss this session! Click below to join when it starts.
      </p>
      ${ctaButton("Join Session", data.joinLink)}
    `),
    text: `"${data.sessionTitle}" starts ${urgency.label}. Join: ${data.joinLink}`,
  });
}

// ── Template: Community Invite ────────────────────────────────────────
export async function sendCommunityInviteEmail(
  to: string,
  data: CommunityInviteData
) {
  return sendEmail({
    to,
    subject: `${data.inviterName} invited you to join ${data.communityName}`,
    tags: [{ name: "category", value: "community-invite" }],
    html: emailLayout(`
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">
        You're Invited! 🤝
      </h1>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Hey ${data.userName}, <strong style="color: #e4e4e7;">${data.inviterName}</strong>
        has invited you to join
        <strong style="color: #e4e4e7;">${data.communityName}</strong> on Unytea.
      </p>
      ${
        data.communityDescription
          ? `<p style="color: #71717a; font-size: 14px; font-style: italic; border-left: 3px solid #7c3aed40; padding-left: 16px; margin: 0 0 32px 0;">
              "${data.communityDescription}"
            </p>`
          : ""
      }
      ${ctaButton("Join Community", data.joinLink)}
    `),
    text: `${data.inviterName} invited you to join ${data.communityName}. Join: ${data.joinLink}`,
  });
}

// ── Template: Session Recap ───────────────────────────────────────────
export async function sendSessionRecapEmail(
  to: string,
  data: SessionRecapData
) {
  const insightsList = data.keyInsights?.length
    ? `<ul style="color: #d4d4d8; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 24px 0;">
        ${data.keyInsights.map((i) => `<li>${i}</li>`).join("")}
      </ul>`
    : "";

  return sendEmail({
    to,
    subject: `Recap: ${data.sessionTitle}`,
    tags: [{ name: "category", value: "session-recap" }],
    html: emailLayout(`
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0;">
        Session Recap 📝
      </h1>
      <p style="color: #a1a1aa; font-size: 15px; margin: 0 0 24px 0;">
        ${data.sessionTitle} · ${data.sessionDate}
      </p>
      ${
        data.summary
          ? `<p style="color: #d4d4d8; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
              ${data.summary}
            </p>`
          : ""
      }
      ${
        data.keyInsights?.length
          ? `<h2 style="color: #e4e4e7; font-size: 16px; margin: 0 0 12px 0;">Key Takeaways</h2>
            ${insightsList}`
          : ""
      }
      ${
        data.recordingLink
          ? ctaButton("Watch Recording", data.recordingLink)
          : ctaButton("Back to Community", data.communityLink)
      }
    `),
    text: `Recap for "${data.sessionTitle}" (${data.sessionDate}). ${data.summary || ""}`,
  });
}

// ── Template: Password Reset ─────────────────────────────────────────
export async function sendPasswordResetEmail(
  to: string,
  data: { userName: string; resetLink: string }
) {
  return sendEmail({
    to,
    subject: "Reset your Unytea password",
    html: emailLayout(`
      <h1 style="color: #f4f4f5; font-size: 22px; font-weight: 700; margin: 0 0 12px 0;">
        Reset Your Password
      </h1>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Hi ${data.userName}, we received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
      </p>
      ${ctaButton("Reset Password", data.resetLink)}
      <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0;">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
    `),
    text: `Hi ${data.userName}, reset your password here: ${data.resetLink} (expires in 1 hour). If you didn't request this, ignore this email.`,
  });
}

// ── Shared Layout ─────────────────────────────────────────────────────
function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>Unytea</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom: 32px; text-align: center;">
              <img
                src="${APP_URL}/unytea-logo.png"
                alt="Unytea"
                width="48"
                height="48"
                style="border-radius: 12px;"
              />
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="color: #52525b; font-size: 13px; margin: 0 0 8px 0;">
                Unytea — Where Communities Unite
              </p>
              <p style="color: #3f3f46; font-size: 12px; margin: 0;">
                <a href="${APP_URL}/settings/notifications" style="color: #7c3aed; text-decoration: none;">
                  Email preferences
                </a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color: #52525b; text-decoration: none;">
                  unytea.com
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── CTA Button Helper ─────────────────────────────────────────────────
function ctaButton(label: string, href: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding-top: 8px;">
          <a
            href="${href}"
            style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 10px; mso-padding-alt: 0;"
          >
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}
