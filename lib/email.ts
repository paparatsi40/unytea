import { Resend } from "resend";
import { createTranslator } from "next-intl";
import { SITE_URL } from "@/lib/site-url";
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "@/lib/locale";

// ── Resend client (lazy init so builds don't fail without the key) ────
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY is not set. Add it to your environment variables.");
    }
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Unytea <noreply@unytea.com>";
const APP_URL = SITE_URL;

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

export interface VideoUsageWarningData {
  communityName: string;
  /** 80 or 100. Decides the subject line and the tone, nothing else. */
  threshold: 80 | 100;
  usedHours: number;
  capHours: number;
  /** End of the current billing period — when the allowance comes back. */
  resetsAt: Date;
  /** Where to see the number in full. */
  usageLink: string;
  /** The reader's language. Falls back to the default when unsupported. */
  locale?: string;
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
        come alive — with live sessions, courses, and real human connection.
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
export async function sendSessionReminderEmail(to: string, data: SessionReminderData) {
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
        Hi ${data.userName}, your session is starting soon. Click below to join.
      </p>
      ${ctaButton("Join Session", data.joinLink)}
    `),
    text: `"${data.sessionTitle}" starts ${urgency.label}. Join: ${data.joinLink}`,
  });
}

// ── Template: Community Invite ────────────────────────────────────────
export async function sendCommunityInviteEmail(to: string, data: CommunityInviteData) {
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
export async function sendSessionRecapEmail(to: string, data: SessionRecapData) {
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

// ── Template: Password Reset / Password Set ──────────────────────────

export interface PasswordEmailData {
  /** Empty or absent when the account has no name — the copy handles it. */
  userName?: string | null;
  resetLink: string;
  /** Falls back to English, as everywhere else that takes a locale. */
  locale?: string;
}

/**
 * The two halves of the same errand.
 *
 * `reset` is the one that has always existed. `set` is for an account created
 * through Google or GitHub, which has no password at all: `/api/auth/forgot-
 * password` used to answer those with a cheerful "check your inbox" and send
 * nothing, so somebody who had lost access to their provider had no route back
 * in and no way to find out they had been ignored.
 *
 * They share the token, the expiry, the single-use deletion and the
 * destination — `/auth/reset-password` writes the `password` column whether or
 * not one was there before, so no second mechanism is needed and none is built.
 * What differs is only what the message says, and that has to differ: telling
 * someone to "reset" a password they never had is asking them to remember
 * something that never happened.
 *
 * Localized, unlike most templates here, because the copy is new and the rule
 * is parity. The locale arrives as a parameter for the same reason
 * `sendVideoUsageWarningEmail` takes one — this is called from a route handler
 * where next-intl has no `[locale]` segment to read.
 */
async function sendPasswordEmail(to: string, data: PasswordEmailData, mode: "reset" | "set") {
  const locale: SupportedLocale = isSupportedLocale(data.locale) ? data.locale : DEFAULT_LOCALE;
  const messages = (await import(`../locales/${locale}.json`)).default;
  const t = createTranslator({ locale, messages, namespace: "email.password" });

  const name = data.userName?.trim();
  const greeting = name ? t("greeting", { userName: name }) : t("greetingNoName");

  return sendEmail({
    to,
    subject: t(`${mode}.subject`),
    html: emailLayout(`
      <h1 style="color: #f4f4f5; font-size: 22px; font-weight: 700; margin: 0 0 12px 0;">
        ${t(`${mode}.heading`)}
      </h1>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        ${greeting} ${t(`${mode}.intro`)}
      </p>
      ${ctaButton(t(`${mode}.cta`), data.resetLink)}
      <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0;">
        ${t(`${mode}.ignore`)}
      </p>
    `),
    text: `${greeting} ${t(`${mode}.plain`, { link: data.resetLink })}`,
  });
}

/** For an account that has a password and wants a different one. */
export async function sendPasswordResetEmail(to: string, data: PasswordEmailData) {
  return sendPasswordEmail(to, data, "reset");
}

/** For an account that has never had one — see `sendPasswordEmail`. */
export async function sendSetPasswordEmail(to: string, data: PasswordEmailData) {
  return sendPasswordEmail(to, data, "set");
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

// ── Template: Video usage warning ─────────────────────────────────────
/**
 * The first localized email in the product.
 *
 * Every other template here is hardcoded English, which was survivable while
 * they were transactional one-liners. This one lands in an inbox unprompted and
 * talks about someone's allowance, so it goes out in the language the community
 * is run in.
 *
 * `createTranslator` rather than `getTranslations`: this is called from the
 * accrual path — a webhook, a cron sweep, a Server Action — where there is no
 * request scope for next-intl to read a locale from. The messages are imported
 * by hand for the same reason.
 *
 * Nothing in this copy threatens to block anything. B1 has no gate: the cap is
 * measured and reported and that is all it does. An email that says "your
 * sessions will stop" would be describing software that does not exist yet.
 */
export async function sendVideoUsageWarningEmail(to: string, data: VideoUsageWarningData) {
  const locale: SupportedLocale = isSupportedLocale(data.locale) ? data.locale : DEFAULT_LOCALE;
  const messages = (await import(`../locales/${locale}.json`)).default;
  const t = createTranslator({ locale, messages, namespace: "email.videoUsage" });

  const resets = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(data.resetsAt);

  const numbers = {
    community: data.communityName,
    used: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(data.usedHours),
    cap: new Intl.NumberFormat(locale).format(data.capHours),
  };

  const heading = data.threshold === 100 ? t("heading100") : t("heading80");
  const accent = data.threshold === 100 ? "#f59e0b" : "#7c3aed";

  return sendEmail({
    to,
    subject: data.threshold === 100 ? t("subject100", numbers) : t("subject80", numbers),
    tags: [
      { name: "category", value: "video-usage" },
      { name: "threshold", value: String(data.threshold) },
    ],
    html: emailLayout(`
      <div style="background: ${accent}15; border: 1px solid ${accent}40; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="color: ${accent}; font-size: 14px; font-weight: 600; margin: 0;">
          ${heading}
        </p>
      </div>
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">
        ${t("used", numbers)}
      </h1>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
        ${t("unitNote")}
      </p>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        ${t("resets", { date: resets })}
      </p>
      <p style="color: #d4d4d8; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
        ${t("measuredOnly")}
      </p>
      ${ctaButton(t("cta"), data.usageLink)}
    `),
    text: `${t("used", numbers)} ${t("resets", { date: resets })} ${data.usageLink}`,
  });
}
