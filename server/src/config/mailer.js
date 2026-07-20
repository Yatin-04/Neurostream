import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function buildOtpHtml(heading, code) {
  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 24px;">
      <h2 style="color: #6366f1;">Baud</h2>
      <p>${heading}</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center;">
        ${code}
      </div>
      <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">
        This code expires in 10 minutes. If you didn't request this, ignore this email.
      </p>
    </div>
  `;
}

const FROM = process.env.SMTP_FROM || 'Baud <onboarding@resend.dev>';

export async function sendOtpEmail(to, code) {
  if (!resend) return;
  await resend.emails.send({
    from: process.env.SMTP_FROM || 'onboarding@resend.dev',
    to,
    subject: 'Baud — Your Verification Code',
    html: buildOtpHtml('Your verification code is:', code),
  });
}

export async function sendResetEmail(to, code) {
  if (!resend) return;
  await resend.emails.send({
    from: process.env.SMTP_FROM || 'onboarding@resend.dev',
    to,
    subject: 'Baud — Password Reset Code',
    html: buildOtpHtml('Your password reset code is:', code),
  });
}
