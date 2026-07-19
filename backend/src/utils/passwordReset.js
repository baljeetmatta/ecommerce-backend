import crypto from "crypto";

export const createPasswordReset = () => {
  const code = String(crypto.randomInt(100000, 1000000));
  return {
    code,
    hash: crypto.createHash("sha256").update(code).digest("hex"),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000)
  };
};

export const hashResetCode = (code) => crypto.createHash("sha256").update(String(code || "")).digest("hex");

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
