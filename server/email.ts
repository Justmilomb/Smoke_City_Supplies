function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Shared branded email wrapper.
 * All transactional emails use this layout for consistent look.
 */
function emailLayout(options: {
  preheader?: string;
  heading: string;
  heroColor?: string;
  heroIcon?: string;
  body: string;
}): string {
  const {
    preheader = "",
    heading,
    heroColor = "#111827",
    heroIcon,
    body,
  } = options;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(heading)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1f2937;line-height:1.6;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ""}

  <!-- Outer table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr>
            <td style="background-color:${heroColor};padding:28px 32px;text-align:center;">
              ${heroIcon ? `<div style="font-size:36px;margin-bottom:8px;">${heroIcon}</div>` : ""}
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                ${escapeHtml(heading)}
              </h1>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#374151;">Smoke City Supplies</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Motorcycle, Bike &amp; Scooter Parts &bull; UK Delivery
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">
                Questions? Reply to this email or visit our website.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Format pence as GBP string */
function penceToGbp(pence: number): string {
  return `\u00A3${(pence / 100).toFixed(2)}`;
}

/** Render an info row for emails */
function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#6b7280;font-size:14px;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${escapeHtml(value)}</td>
  </tr>`;
}

/** Render an items table for order-related emails */
function itemsTable(items: Array<{ productName: string; quantity: number; priceEach: number }>): string {
  const rows = items
    .map((item) => {
      const lineTotal = (Math.round(item.priceEach * 100) * item.quantity) / 100;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;">${escapeHtml(item.productName)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;">\u00A3${item.priceEach.toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;font-weight:600;">\u00A3${lineTotal.toFixed(2)}</td>
      </tr>`;
    })
    .join("\n");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr style="background-color:#f9fafb;">
        <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Item</th>
        <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Unit</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ─── Core send function using Resend API ───────────────────────────────────────

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
    console.warn("[email] RESEND_API_KEY missing; logging email instead of sending", {
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

// ─── Invoice email ─────────────────────────────────────────────────────────────

export async function sendInvoiceEmail(input: {
  to: string;
  subject: string;
  html: string;
  pdfBase64?: string;
  pdfFilename?: string;
}): Promise<void> {
  return sendEmail(input);
}

// ─── Order Confirmation ────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(input: {
  to: string;
  orderId: string;
  customerName?: string;
  totalPence: number;
  subtotalPence?: number;
  shippingAmountPence?: number;
  shippingServiceLevel?: string;
  dispatchAdvice?: string;
  items?: Array<{ productName: string; quantity: number; priceEach: number }>;
}): Promise<void> {
  const subtotal = input.subtotalPence ?? input.totalPence;
  const shipping = input.shippingAmountPence ?? 0;

  let body = `
    <p style="font-size:16px;color:#374151;">
      Hi${input.customerName ? ` <strong>${escapeHtml(input.customerName)}</strong>` : ""},
    </p>
    <p style="font-size:15px;color:#374151;">
      Thank you for your order! We've received your payment and your order is now being processed.
    </p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">Payment confirmed</p>
      <p style="margin:4px 0 0;font-size:13px;color:#15803d;">Your payment has been processed securely via Stripe.</p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${infoRow("Order ID", input.orderId)}
      ${infoRow("Total", penceToGbp(input.totalPence))}
      ${input.shippingServiceLevel ? infoRow("Shipping", input.shippingServiceLevel) : ""}
    </table>`;

  if (input.items && input.items.length > 0) {
    body += itemsTable(input.items);

    body += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
      <tr>
        <td style="text-align:right;padding:4px 12px;font-size:14px;color:#6b7280;">Subtotal:</td>
        <td style="text-align:right;padding:4px 12px;font-size:14px;width:100px;">${penceToGbp(subtotal)}</td>
      </tr>
      <tr>
        <td style="text-align:right;padding:4px 12px;font-size:14px;color:#6b7280;">Shipping:</td>
        <td style="text-align:right;padding:4px 12px;font-size:14px;">${penceToGbp(shipping)}</td>
      </tr>
      <tr>
        <td style="text-align:right;padding:8px 12px;font-size:18px;font-weight:700;">Total:</td>
        <td style="text-align:right;padding:8px 12px;font-size:18px;font-weight:700;">${penceToGbp(input.totalPence)}</td>
      </tr>
    </table>`;
  }

  if (input.dispatchAdvice) {
    body += `<p style="margin-top:16px;font-size:13px;color:#6b7280;">${escapeHtml(input.dispatchAdvice)}</p>`;
  }

  body += `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <p style="font-size:14px;color:#374151;margin:0;">
        <strong>What happens next?</strong>
      </p>
      <ol style="font-size:13px;color:#6b7280;padding-left:20px;margin:8px 0 0;">
        <li style="margin-bottom:4px;">We'll pick and pack your order</li>
        <li style="margin-bottom:4px;">You'll receive a shipping confirmation with tracking details</li>
        <li>Your items will be on their way!</li>
      </ol>
    </div>`;

  const html = emailLayout({
    preheader: `Order ${input.orderId} confirmed - we're getting your items ready!`,
    heading: "Order Confirmed",
    heroColor: "#059669",
    heroIcon: "&#10004;",
    body,
  });

  return sendEmail({
    to: input.to,
    subject: `Order confirmed #${input.orderId} - Smoke City Supplies`,
    html,
  });
}

// ─── Order Shipped ─────────────────────────────────────────────────────────────

export async function sendOrderShippedEmail(input: {
  to: string;
  orderId: string;
  customerName?: string;
  trackingNumber?: string;
  shippingLabelUrl?: string;
  shippingServiceLevel?: string;
  items?: Array<{ productName: string; quantity: number; priceEach: number }>;
}): Promise<void> {
  let body = `
    <p style="font-size:16px;color:#374151;">
      Hi${input.customerName ? ` <strong>${escapeHtml(input.customerName)}</strong>` : ""},
    </p>
    <p style="font-size:15px;color:#374151;">
      Great news! Your order has been shipped and is on its way to you.
    </p>

    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#1e40af;font-weight:600;">Your parcel is on its way</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1d4ed8;">We've handed your order to the carrier. Delivery is usually within 1-3 working days.</p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${infoRow("Order ID", input.orderId)}
      ${input.trackingNumber && input.trackingNumber !== "MANUAL_PENDING" ? infoRow("Tracking Number", input.trackingNumber) : ""}
      ${input.shippingServiceLevel ? infoRow("Service", input.shippingServiceLevel) : ""}
    </table>`;

  if (input.trackingNumber && input.trackingNumber !== "MANUAL_PENDING") {
    body += `
      <div style="text-align:center;margin:20px 0;">
        <a href="https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(input.trackingNumber)}"
           style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
          Track Your Parcel
        </a>
      </div>`;
  }

  if (input.items && input.items.length > 0) {
    body += `<p style="font-size:14px;font-weight:600;color:#374151;margin:24px 0 8px;">Items in this shipment:</p>`;
    body += itemsTable(input.items);
  }

  body += `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;margin:0;">
        If you have any issues with your delivery, please reply to this email and we'll be happy to help.
      </p>
    </div>`;

  const html = emailLayout({
    preheader: `Your order ${input.orderId} has been shipped!`,
    heading: "Order Shipped",
    heroColor: "#2563eb",
    heroIcon: "&#128666;",
    body,
  });

  return sendEmail({
    to: input.to,
    subject: `Your order has shipped #${input.orderId} - Smoke City Supplies`,
    html,
  });
}

// ─── Order Delivered ───────────────────────────────────────────────────────────

export async function sendOrderDeliveredEmail(input: {
  to: string;
  orderId: string;
  customerName?: string;
  items?: Array<{ productName: string; quantity: number; priceEach: number }>;
}): Promise<void> {
  let body = `
    <p style="font-size:16px;color:#374151;">
      Hi${input.customerName ? ` <strong>${escapeHtml(input.customerName)}</strong>` : ""},
    </p>
    <p style="font-size:15px;color:#374151;">
      Your order has been delivered! We hope everything arrived in perfect condition.
    </p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">Delivery complete</p>
      <p style="margin:4px 0 0;font-size:13px;color:#15803d;">Your order ${escapeHtml(input.orderId)} has been marked as delivered.</p>
    </div>`;

  if (input.items && input.items.length > 0) {
    body += `<p style="font-size:14px;font-weight:600;color:#374151;margin:24px 0 8px;">Items delivered:</p>`;
    body += itemsTable(input.items);
  }

  body += `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <p style="font-size:14px;color:#374151;margin:0 0 8px;font-weight:600;">Need help?</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">
        If anything isn't right with your order, please don't hesitate to get in touch.
        Simply reply to this email and we'll sort it out for you.
      </p>
      <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">
        Thank you for choosing Smoke City Supplies. We appreciate your business!
      </p>
    </div>`;

  const html = emailLayout({
    preheader: `Your order ${input.orderId} has been delivered!`,
    heading: "Order Delivered",
    heroColor: "#059669",
    heroIcon: "&#127881;",
    body,
  });

  return sendEmail({
    to: input.to,
    subject: `Order delivered #${input.orderId} - Smoke City Supplies`,
    html,
  });
}

// ─── Order Cancelled ───────────────────────────────────────────────────────────

export async function sendOrderCancelledEmail(input: {
  to: string;
  orderId: string;
  customerName?: string;
  totalPence: number;
  items?: Array<{ productName: string; quantity: number; priceEach: number }>;
}): Promise<void> {
  let body = `
    <p style="font-size:16px;color:#374151;">
      Hi${input.customerName ? ` <strong>${escapeHtml(input.customerName)}</strong>` : ""},
    </p>
    <p style="font-size:15px;color:#374151;">
      We're writing to let you know that your order has been cancelled.
    </p>

    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">Order cancelled</p>
      <p style="margin:4px 0 0;font-size:13px;color:#b91c1c;">Order ${escapeHtml(input.orderId)} has been cancelled.</p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${infoRow("Order ID", input.orderId)}
      ${infoRow("Refund Amount", penceToGbp(input.totalPence))}
    </table>`;

  if (input.items && input.items.length > 0) {
    body += `<p style="font-size:14px;font-weight:600;color:#374151;margin:24px 0 8px;">Cancelled items:</p>`;
    body += itemsTable(input.items);
  }

  body += `
    <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">About your refund</p>
      <p style="margin:6px 0 0;font-size:13px;color:#78350f;">
        A full refund of <strong>${penceToGbp(input.totalPence)}</strong> will be issued to your original payment method.
        Please allow <strong>3&ndash;5 business days</strong> for the refund to appear on your statement.
        The exact timing depends on your bank or card provider.
      </p>
    </div>

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <p style="font-size:13px;color:#6b7280;margin:0;">
        If you have any questions about your cancellation or refund, please reply to this email and we'll be happy to assist.
      </p>
      <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">
        We hope to serve you again in the future!
      </p>
    </div>`;

  const html = emailLayout({
    preheader: `Your order ${input.orderId} has been cancelled. Your refund is on its way.`,
    heading: "Order Cancelled",
    heroColor: "#dc2626",
    heroIcon: "&#10060;",
    body,
  });

  return sendEmail({
    to: input.to,
    subject: `Order cancelled #${input.orderId} - Smoke City Supplies`,
    html,
  });
}

// ─── Admin Order Alert ─────────────────────────────────────────────────────────

export async function sendAdminOrderAlertEmail(input: {
  to: string;
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  totalPence: number;
  items?: Array<{ productName: string; quantity: number; priceEach: number }>;
}): Promise<void> {
  let body = `
    <p style="font-size:15px;color:#374151;">
      A new order has been paid and is ready for fulfilment.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${infoRow("Order ID", input.orderId)}
      ${input.customerName ? infoRow("Customer", input.customerName) : ""}
      ${input.customerEmail ? infoRow("Email", input.customerEmail) : ""}
      ${infoRow("Total", penceToGbp(input.totalPence))}
    </table>`;

  if (input.items && input.items.length > 0) {
    body += itemsTable(input.items);
  }

  body += `
    <div style="text-align:center;margin:24px 0;">
      <p style="font-size:14px;color:#374151;margin:0;">
        Log in to the admin dashboard to print the packing slip and generate a shipping label.
      </p>
    </div>`;

  const html = emailLayout({
    preheader: `New paid order ${input.orderId} - ${penceToGbp(input.totalPence)}`,
    heading: "New Order Received",
    heroColor: "#7c3aed",
    heroIcon: "&#128230;",
    body,
  });

  return sendEmail({
    to: input.to,
    subject: `New paid order #${input.orderId} - ${penceToGbp(input.totalPence)}`,
    html,
  });
}

// ─── Contact Form ──────────────────────────────────────────────────────────────

export async function sendContactFormEmail(input: {
  to: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const safeSubject = input.subject?.trim() || "General enquiry";

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${infoRow("From", `${input.name} (${input.email})`)}
      ${infoRow("Subject", safeSubject)}
    </table>

    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
    </div>

    <p style="font-size:13px;color:#6b7280;margin:16px 0 0;">
      Reply directly to this email to respond to the customer at ${escapeHtml(input.email)}.
    </p>`;

  const html = emailLayout({
    preheader: `New message from ${input.name}: ${safeSubject}`,
    heading: "New Contact Message",
    heroColor: "#0891b2",
    heroIcon: "&#9993;",
    body,
  });

  return sendEmail({
    to: input.to,
    subject: `Contact form: ${safeSubject} - from ${input.name}`,
    html,
  });
}
