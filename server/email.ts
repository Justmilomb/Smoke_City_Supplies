export async function sendInvoiceEmail(input: {
  to: string;
  subject: string;
  html: string;
  pdfBase64?: string;
  pdfFilename?: string;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVOICE_FROM_EMAIL || process.env.SMTP_FROM || "no-reply@smokecitysupplies.com";
  const replyTo = process.env.INVOICE_REPLY_TO || "smokecitycycles@gmail.com";

  if (!resendKey) {
    console.warn("[email] RESEND_API_KEY missing; logging invoice email instead of sending", {
      to: input.to,
      subject: input.subject,
    });
    return;
  }

  const payload: Record<string, unknown> = {
    from: fromEmail,
    to: [input.to],
    reply_to: replyTo,
    subject: input.subject,
    html: input.html,
  };

  if (input.pdfBase64) {
    payload.attachments = [
      {
        filename: input.pdfFilename || "invoice.pdf",
        content: input.pdfBase64,
      },
    ];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend email failed (${res.status}): ${errText || "unknown"}`);
  }
}
