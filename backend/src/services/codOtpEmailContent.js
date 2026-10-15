const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

export function codOtpEmailContent({ name, code }) {
  const greeting = name || "Customer";
  return {
    text: `Hello ${greeting},\n\nConfirm your Cash on Delivery order with HRSBasket.\n\nYour confirmation code is: ${code}\n\nEnter this code at checkout to place your order. It expires in 10 minutes. Payment is collected on delivery.\n\nKeep this code private. HRSBasket will never ask you to share it over a call or message. If you did not request this code, ignore this email.`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Confirm your Cash on Delivery order</title></head>
<body style="margin:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#172b22">
<div style="display:none;max-height:0;overflow:hidden">Enter your confirmation code at checkout. Valid for 10 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e2e8e4;border-radius:16px">
<tr><td style="padding:24px 28px;background:#15803d;color:#fff;font-size:24px;font-weight:bold;border-radius:16px 16px 0 0">HRSBasket</td></tr>
<tr><td style="padding:32px 28px"><p style="margin:0 0 12px;color:#15803d;font-size:12px;letter-spacing:1.5px;font-weight:bold">CASH ON DELIVERY</p>
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.25">One last step to<br>confirm your order</h1>
<p style="font-size:15px;line-height:1.7;color:#526159">Hello ${escapeHtml(greeting)},<br>Enter the code below at checkout to place your Cash on Delivery order.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f8f2;border:1px solid #d7eadc;border-radius:12px"><tr><td align="center" style="padding:24px 12px">
<p style="margin:0 0 12px;font-size:12px;color:#526159">YOUR CONFIRMATION CODE</p>
<p style="margin:0;font-family:Consolas,'Courier New',monospace;font-size:36px;font-weight:bold;letter-spacing:6px;color:#166534">${escapeHtml(code)}</p>
<p style="margin:14px 0 0;font-size:13px;color:#526159">Valid for <strong>10 minutes</strong></p></td></tr></table>
<p style="margin:24px 0;font-size:14px;line-height:1.7;color:#526159"><strong style="color:#172b22">Pay when it arrives.</strong><br>Your order will be placed after verification. Payment is collected on delivery.</p>
<p style="margin:0;padding-top:20px;border-top:1px solid #e2e8e4;font-size:12px;line-height:1.7;color:#64748b">Keep this code private. HRSBasket will never ask you to share it over a call or message.<br><br>Didn't request this code? You can safely ignore this email.</p>
</td></tr><tr><td align="center" style="padding:20px;background:#f8faf9;font-size:12px;color:#64748b">Thank you for shopping with HRSBasket.</td></tr></table></td></tr></table></body></html>`
  };
}
