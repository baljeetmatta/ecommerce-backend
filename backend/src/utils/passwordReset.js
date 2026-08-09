import crypto from "crypto";
import { sendEmail } from "./email.js";

export const createPasswordReset = () => {
  const code = String(crypto.randomInt(100000, 1000000));
  return {
    code,
    hash: crypto.createHash("sha256").update(code).digest("hex"),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000)
  };
};

export const hashResetCode = (code) => crypto.createHash("sha256").update(String(code || "")).digest("hex");

export const createPasswordResetLink = ({ email }) => {
  const token = crypto.randomBytes(32).toString("hex");
  const adminUrl = String(process.env.ADMIN_APP_URL || "https://admin.hrsbasket.com").replace(/\/+$/, "");
  return { token, hash: hashResetCode(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000), url: `${adminUrl}/#/admin/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}` };
};

export const sendPasswordResetLink = async ({ email, name, url }) => {
  await sendEmail({ to: email, subject: "Reset your HRSBasket admin password", text: `Hello ${name || "Team member"},\n\nUse the secure link below to reset your password. This link expires in 30 minutes and can be used once.\n\n${url}\n\nIf you did not request this change, you can ignore this email.` });
  return true;
};

export const sendPasswordResetCode = async ({ email, name, code, accountType }) => {
  if (!process.env.EMAIL_WEBHOOK_URL) return false;
  const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: email,
      subject: `${accountType} password reset code`,
      template: "password-reset",
      data: { name, code, accountType, expiresInMinutes: 15 }
    })
  });
  if (!response.ok) throw new Error("Unable to send password reset email");
  return true;
};

export const resetCodeResponse = (emailSent, code) => ({
  message: emailSent ? "A password reset code has been sent to the registered email address." : process.env.NODE_ENV === "production" ? "If that account exists, a password reset code has been sent." : "Email delivery is not configured. Use the development reset code shown below.",
  ...(emailSent || process.env.NODE_ENV === "production" ? {} : { resetCode: code })
});
