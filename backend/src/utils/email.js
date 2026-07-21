import net from "net";
import tls from "tls";
import EmailSetting from "../models/EmailSetting.js";

const command = (socket, value) => new Promise((resolve, reject) => {
  socket.once("data", (data) => {
    const response = data.toString();
    if (/^[23]/.test(response)) resolve(response);
    else reject(new Error(`SMTP rejected request: ${response}`));
  });
  socket.write(`${value}\r\n`);
});
export const sendEmail = async ({ to, subject, text }) => {
  const setting = await EmailSetting.findOne({ singleton: "email" }).select("+password");
  if (!setting?.host || !setting?.fromEmail) throw new Error("Email SMTP is not configured by the administrator");
  const socket = setting.secure ? tls.connect({ host: setting.host, port: setting.port, servername: setting.host }) : net.createConnection({ host: setting.host, port: setting.port });
  await new Promise((resolve, reject) => {
    socket.once("data", (data) => {
      if (/^2/.test(data.toString())) resolve();
      else reject(new Error("Unable to connect to SMTP server"));
    });
    socket.once("error", reject);
  });
  try {
    await command(socket, "EHLO hrsbasket");
    if (setting.username) { await command(socket, "AUTH LOGIN"); await command(socket, Buffer.from(setting.username).toString("base64")); await command(socket, Buffer.from(setting.password || "").toString("base64")); }
    await command(socket, `MAIL FROM:<${setting.fromEmail}>`); await command(socket, `RCPT TO:<${to}>`); await command(socket, "DATA");
    await command(socket, `From: ${setting.fromName} <${setting.fromEmail}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n.`);
  } finally { socket.end("QUIT\r\n"); }
};
