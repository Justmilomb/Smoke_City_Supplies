/**
 * Optional email sending via SMTP (Gmail, Outlook, etc.).
 * If SMTP_* env vars are not set, sendEmail no-ops and returns false.
 * Admin can still reply from their own email (mailto) when SMTP is not configured.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { ApiContactSubmission } from "@shared/schema";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter !== null) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn("[email] SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS to send emails from admin)");
    return null;
  }
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
}

export function isEmailConfigured(): boolean {
  return getTransporter() !== null;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@smokecitysupplies.com";
  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, "<br>"),
      replyTo: options.replyTo,
    });
    return true;
  } catch (err) {
    console.error("[email] Send failed:", err);
    return false;
  }
}

export async function sendReplyToCustomer(
  submission: ApiContactSubmission,
  replyBody: string
): Promise<boolean> {
  const subject = `Re: ${submission.subject ?? "Your enquiry"}`;
  const text = `${replyBody}\n\n---\nSmoke City Supplies`;
  return sendEmail({
    to: submission.email,
    subject,
    text,
    replyTo: process.env.SMTP_FROM ?? process.env.SMTP_USER,
  });
}

/** Optional: notify seller of new enquiry so they can reply from Gmail/Outlook */
export async function sendNewEnquiryNotificationToSeller(submission: ApiContactSubmission): Promise<boolean> {
  const notifyEmail = process.env.NOTIFY_ENQUIRY_EMAIL ?? process.env.SMTP_USER;
  if (!notifyEmail) return false;
  const subject = `New enquiry from ${submission.name} – ${submission.subject ?? "General"}`;
  const text = [
    `New contact form submission:`,
    ``,
    `From: ${submission.name} <${submission.email}>`,
    `Subject: ${submission.subject ?? "(none)"}`,
    submission.partNumber ? `Part: ${submission.partNumber}` : null,
    ``,
    submission.message,
    ``,
    `Reply to the customer at: ${submission.email}`,
    `Or reply from the admin panel.`,
  ]
    .filter(Boolean)
    .join("\n");
  return sendEmail({
    to: notifyEmail,
    subject,
    text,
    replyTo: submission.email,
  });
}
