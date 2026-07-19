import { Resend } from "resend";

const APP_URL = "https://coach-kennett-app.vercel.app";

// Sends the client onboarding email (login details + add-to-home-screen steps).
// No-ops and returns false if email isn't configured yet (RESEND_API_KEY +
// ONBOARDING_FROM_EMAIL), so client creation still succeeds without it.
export async function sendOnboardingEmail(params: {
  to: string;
  name: string;
  password: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ONBOARDING_FROM_EMAIL; // e.g. "Coach Kennett <lachie@coachkennett.com>"
  if (!apiKey || !from) return false;

  const firstName = params.name.split(" ")[0];
  const resend = new Resend(apiKey);

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.5">
    <p>Hey ${firstName} 👋</p>
    <p>Welcome aboard! Your training app is ready. Here's how to get set up:</p>

    <p style="font-weight:600;margin-bottom:4px">1. Log in</p>
    <div style="background:#f4f6f2;border-radius:8px;padding:12px 14px;margin:0 0 16px">
      🔗 <a href="${APP_URL}" style="color:#4a7c1f">${APP_URL}</a><br/>
      📧 Email: ${params.to}<br/>
      🔑 Password: <strong>${params.password}</strong> (your full name, capitalised, no spaces)
    </div>

    <p style="font-weight:600;margin-bottom:4px">2. Add it to your home screen (so it opens like a real app)</p>
    <p style="margin:0 0 4px"><strong>📱 iPhone (Safari):</strong></p>
    <ul style="margin:0 0 12px;padding-left:20px">
      <li>Open the link above in Safari</li>
      <li>Tap the <strong>Share</strong> button (the square with the arrow ↑)</li>
      <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
      <li>Tap <strong>Add</strong> — done!</li>
    </ul>
    <p style="margin:0 0 4px"><strong>🤖 Android (Chrome):</strong></p>
    <ul style="margin:0 0 16px;padding-left:20px">
      <li>Open the link above in Chrome</li>
      <li>Tap the <strong>⋮</strong> menu (top right)</li>
      <li>Tap <strong>Add to Home screen</strong> → <strong>Add</strong></li>
    </ul>

    <p>Now you'll have the Coach Kennett icon on your phone to tap straight into your program 💪</p>
    <p>Once you're in, you can change your password anytime under Profile. Give me a shout if you have any dramas getting on!</p>
  </div>`;

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: "Your Coach Kennett training app 💪",
      html,
    });
    return !error;
  } catch {
    return false;
  }
}
