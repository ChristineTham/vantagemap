/**
 * Transactional email sender.
 *
 * Provider is selected by environment, keeping the app cloud-agnostic:
 *   - RESEND_API_KEY set  → send via the Resend HTTP API (no SDK dependency).
 *   - otherwise (dev)     → log the message (including links) to the console so
 *                           local flows are testable.
 *
 * In production with no provider configured, the send is skipped with a warning
 * that deliberately omits the body/links, so reset tokens never reach logs.
 */

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "VantageMap <no-reply@vantagemap.local>";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Email send failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    return;
  }

  if (process.env.NODE_ENV === "production") {
    // No provider configured in production — never log tokens/links.
    console.error(
      `[Email] No email provider configured; skipped "${params.subject}" to ${params.to}. ` +
        `Set RESEND_API_KEY to enable delivery.`
    );
    return;
  }

  // Development convenience — safe to show links locally.
  console.log(`\n[Email:dev] To: ${params.to}\nSubject: ${params.subject}\n${params.text}\n`);
}

export interface AuthEmailParams {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

/** Render and send a simple branded call-to-action email (reset, verify, invite). */
export async function sendAuthEmail(params: AuthEmailParams): Promise<void> {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 18px; color: #4a2f4a;">${params.heading}</h1>
      <p style="font-size: 14px; color: #333; line-height: 1.5;">${params.body}</p>
      <p style="margin: 24px 0;">
        <a href="${params.ctaUrl}"
           style="background: #7a4f7a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          ${params.ctaLabel}
        </a>
      </p>
      <p style="font-size: 12px; color: #888;">If the button doesn't work, paste this link into your browser:<br>${params.ctaUrl}</p>
    </div>`;
  const text = `${params.heading}\n\n${params.body}\n\n${params.ctaLabel}: ${params.ctaUrl}`;

  await sendEmail({ to: params.to, subject: params.subject, html, text });
}
