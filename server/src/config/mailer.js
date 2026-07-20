import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

let gmail = null;

if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });

  gmail = google.gmail({ version: 'v1', auth: oauth2Client });
}

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

const FROM = process.env.SMTP_FROM || 'Baud <noreply@baud.dev>';

function makeEmailRaw(to, from, subject, message) {
  const str = [
    "Content-Type: text/html; charset=\"UTF-8\"\n",
    "MIME-Version: 1.0\n",
    "Content-Transfer-Encoding: 7bit\n",
    "to: ", to, "\n",
    "from: ", from, "\n",
    "subject: ", subject, "\n\n",
    message
  ].join('');

  return Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
}

export async function sendOtpEmail(to, code) {
  if (!gmail) {
    console.warn('[Mailer] Missing Gmail OAuth credentials.');
    return;
  }
  try {
    const raw = makeEmailRaw(to, FROM, 'Baud — Your Verification Code', buildOtpHtml('Your verification code is:', code));
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
  } catch (err) {
    console.error('[Mailer] Send failed:', err.message);
  }
}

export async function sendResetEmail(to, code) {
  if (!gmail) {
    console.warn('[Mailer] Missing Gmail OAuth credentials.');
    return;
  }
  try {
    const raw = makeEmailRaw(to, FROM, 'Baud — Password Reset Code', buildOtpHtml('Your password reset code is:', code));
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
  } catch (err) {
    console.error('[Mailer] Send failed:', err.message);
  }
}
