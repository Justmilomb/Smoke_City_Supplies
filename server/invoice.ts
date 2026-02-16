import type { ApiOrder } from "@shared/schema";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function createInvoiceNumber(now = new Date()): string {
  const year = now.getUTCFullYear();
  const sequence = String(Math.floor(now.getTime() / 1000) % 100000).padStart(5, "0");
  return `INV-${year}-${sequence}`;
}

function penceToGbp(pence: number): string {
  return (pence / 100).toFixed(2);
}

export function renderInvoiceHtml(order: ApiOrder): string {
  const address = [order.addressLine1, order.addressLine2, order.city, order.county, order.postcode, order.country]
    .filter(Boolean)
    .join(", ");

  const rows = order.items
    .map((item) => {
      const lineTotalPence = Math.round(item.priceEach * 100) * item.quantity;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.productName)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">GBP ${item.priceEach.toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">GBP ${penceToGbp(lineTotalPence)}</td>
      </tr>`;
    })
    .join("\n");
  const subtotalPence = order.subtotalPence ?? order.totalPence;
  const shippingPence = order.shippingAmountPence ?? Math.max(0, order.totalPence - subtotalPence);

  return `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;color:#111;line-height:1.4;">
    <h1 style="margin:0 0 4px;">Smoke City Supplies</h1>
    <p style="margin:0 0 16px;color:#555;">Invoice / Receipt</p>

    <table style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="vertical-align:top;">
          <strong>Invoice #</strong> ${escapeHtml(order.invoiceNumber ?? "")}
          <br/>
          <strong>Order ID</strong> ${escapeHtml(order.id)}
          <br/>
          <strong>Date</strong> ${escapeHtml(new Date(order.createdAt).toLocaleString())}
        </td>
        <td style="vertical-align:top;text-align:right;">
          <strong>Customer</strong><br/>
          ${escapeHtml(order.customerName ?? "Customer")}<br/>
          ${escapeHtml(order.customerEmail ?? "")}
          ${address ? `<br/>${escapeHtml(address)}` : ""}
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd;">Item</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd;">Qty</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd;">Unit</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table style="width:100%;margin-top:12px;">
      <tr><td style="text-align:right;">Subtotal:</td><td style="text-align:right;width:140px;">GBP ${penceToGbp(subtotalPence)}</td></tr>
      <tr><td style="text-align:right;">Shipping:</td><td style="text-align:right;">GBP ${penceToGbp(shippingPence)}</td></tr>
      <tr><td style="text-align:right;font-size:18px;"><strong>Grand Total:</strong></td><td style="text-align:right;font-size:18px;"><strong>GBP ${penceToGbp(order.totalPence)}</strong></td></tr>
    </table>

    <p style="margin-top:24px;color:#666;font-size:13px;">
      Payment processed securely by Stripe. This document is an automatic invoice/receipt for your records.
    </p>
  </body>
</html>`;
}

// Minimal, text-only PDF payload for attachment without extra dependencies.
export function renderInvoicePdfBuffer(order: ApiOrder): Buffer {
  const lines = [
    "Smoke City Supplies",
    "Invoice / Receipt",
    `Invoice: ${order.invoiceNumber ?? ""}`,
    `Order: ${order.id}`,
    `Date: ${new Date(order.createdAt).toISOString()}`,
    `Customer: ${order.customerName ?? ""}`,
    `Email: ${order.customerEmail ?? ""}`,
    "",
    ...order.items.map((item) => `${item.productName} x${item.quantity} @ GBP ${item.priceEach.toFixed(2)}`),
    "",
    `Subtotal: GBP ${((order.subtotalPence ?? order.totalPence) / 100).toFixed(2)}`,
    `Shipping: GBP ${((order.shippingAmountPence ?? Math.max(0, order.totalPence - (order.subtotalPence ?? order.totalPence))) / 100).toFixed(2)}`,
    `Total: GBP ${(order.totalPence / 100).toFixed(2)}`,
  ];

  const contentStream = `BT /F1 11 Tf 36 780 Td ${lines
    .map((line, idx) => `${idx === 0 ? "" : "0 -14 Td "}(${line.replace(/[()\\]/g, "")}) Tj`)
    .join(" ")} ET`;

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(body.length);
    body += `${obj}\n`;
  }
  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(body, "binary");
}
