import StorefrontSetting from "../models/StorefrontSetting.js";
import { emailBranding } from "./emailBranding.js";
import nodemailer from "nodemailer";
import EmailSetting from "../models/EmailSetting.js";

export const sendEmail = async ({ to, subject, text, html, attachments }) => {
  const setting = await EmailSetting.findOne({ singleton: "email" }).select("+password");
  if (!setting?.host || !setting?.fromEmail) throw new Error("Email SMTP is not configured by the administrator");
  const store = await StorefrontSetting.findOne({ singleton: "storefront" }).select("logoUrl footerLogoUrl shopName");
  const branded = await emailBranding({ html, text, store });
  const emailAttachments = [...(attachments || []), ...branded.attachments];
  // Nodemailer negotiates STARTTLS for submission servers (typically port 587)
  // and handles fragmented/multiline SMTP responses and message encoding.
  const transport = nodemailer.createTransport({
    host: setting.host,
    port: setting.port,
    secure: Boolean(setting.secure),
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    ...(setting.username ? { auth: { user: setting.username, pass: setting.password || "" } } : {})
  });
  try {
    const result = await transport.sendMail({
      from: { name: setting.fromName || "HRSBasket", address: setting.fromEmail },
      to,
      subject,
      text,
      html: branded.html,
      ...(emailAttachments.length ? { attachments: emailAttachments } : {})
    });
    if (!result.accepted?.length || result.rejected?.length) throw new Error("SMTP did not accept the email recipient");
  } finally {
    transport.close();
  }
};
