async function sendEmail(input: {
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

export async function sendInvoiceEmail(input: {
  to: string;
  subject: string;
  html: string;
  pdfBase64?: string;
  pdfFilename?: string;
}): Promise<void> {
  return sendEmail(input);
}

export async function sendOrderConfirmationEmail(input: {
  to: string;
  orderId: string;
  totalPence: number;
  shippingServiceLevel?: string;
  dispatchAdvice?: string;
}): Promise<void> {
  const total = (input.totalPence / 100).toFixed(2);
  const html = `
  <h2>Order confirmed</h2>
  <p>Thanks for your order with Smoke City Supplies.</p>
  <p><strong>Order ID:</strong> ${input.orderId}</p>
  <p><strong>Total:</strong> GBP ${total}</p>
  ${input.shippingServiceLevel ? `<p><strong>Shipping:</strong> ${input.shippingServiceLevel}</p>` : ""}
  ${input.dispatchAdvice ? `<p>${input.dispatchAdvice}</p>` : ""}
  <p>We will send your invoice and shipping updates by email.</p>
  `;
  return sendEmail({
    to: input.to,
    subject: `Order confirmation ${input.orderId} - Smoke City Supplies`,
    html,
  });
}

export async function sendOrderShippedEmail(input: {
  to: string;
  orderId: string;
  trackingNumber?: string;
  shippingLabelUrl?: string;
}): Promise<void> {
  const html = `
  <h2>Your order has shipped</h2>
  <p><strong>Order ID:</strong> ${input.orderId}</p>
  ${input.trackingNumber ? `<p><strong>Tracking number:</strong> ${input.trackingNumber}</p>` : ""}
  ${input.shippingLabelUrl ? `<p><a href="${input.shippingLabelUrl}">Open shipping label</a></p>` : ""}
  <p>Thank you for shopping with Smoke City Supplies.</p>
  `;
  return sendEmail({
    to: input.to,
    subject: `Order shipped ${input.orderId} - Smoke City Supplies`,
    html,
  });
}

export async function sendAdminOrderAlertEmail(input: {
  to: string;
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  totalPence: number;
}): Promise<void> {
  const html = `
  <h2>New paid order</h2>
  <p><strong>Order ID:</strong> ${input.orderId}</p>
  ${input.customerName ? `<p><strong>Customer:</strong> ${input.customerName}</p>` : ""}
  ${input.customerEmail ? `<p><strong>Email:</strong> ${input.customerEmail}</p>` : ""}
  <p><strong>Total:</strong> GBP ${(input.totalPence / 100).toFixed(2)}</p>
  <p>Open Admin Orders to print packing slip and shipping label.</p>
  `;
  return sendEmail({
    to: input.to,
    subject: `New order paid ${input.orderId}`,
    html,
  });
}

export async function sendContactFormEmail(input: {
  to: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const safeSubject = input.subject?.trim() || "General enquiry";
  const html = `
  <h2>New contact form message</h2>
  <p><strong>From:</strong> ${input.name} (${input.email})</p>
  <p><strong>Subject:</strong> ${safeSubject}</p>
  <p><strong>Message:</strong></p>
  <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${input.message}</pre>
  `;
  return sendEmail({
    to: input.to,
    subject: `Contact form: ${safeSubject}`,
    html,
  });
}
