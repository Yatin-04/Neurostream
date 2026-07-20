import nodemailer from 'nodemailer';

const transporter = process.env.SMTP_USER
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 465,
      secure: true, // Gmail port 465 requires secure: true
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Force IPv4 explicitly at the socket level to fix Render ENETUNREACH
      family: 4,
    })
  : null;

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

const FROM = process.env.SMTP_FROM || '"Baud" <noreply@baud.dev>';

export async function sendOtpEmail(to, code) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Baud — Your Verification Code',
      html: buildOtpHtml('Your verification code is:', code),
    });
  } catch (err) {
    console.error('[Mailer] Send failed:', err.message);
  }
}

export async function sendResetEmail(to, code) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Baud — Password Reset Code',
      html: buildOtpHtml('Your password reset code is:', code),
    });
    if (error) console.error('[Mailer] Resend error:', error);
  } catch (err) {
    console.error('[Mailer] Send failed:', err.message);
  }
}
