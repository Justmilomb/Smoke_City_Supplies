# Email & Invoice

## Goal
Sends transactional emails (order confirmation, invoice, shipped notification, admin alert) and generates sequential invoice numbers with HTML/PDF rendering.

## Implementation
`server/email.ts` dispatches via Resend API using `RESEND_API_KEY`. Four email types: order confirmation (customer), invoice (customer), shipped notification (customer), admin order alert. `server/invoice.ts` maintains a sequential invoice counter in the DB and renders invoice HTML. PDF generation is inline HTML sent as attachment. From/reply-to addresses configured via env vars.

## Key Code
```typescript
// Called from Stripe webhook handler after payment confirmed
await sendOrderConfirmation(order, items, customer);
await sendInvoice(order, invoiceHtml);
await sendAdminAlert(order);
```

## Notes
- `INVOICE_FROM_EMAIL` must be a verified Resend sender domain.
- Invoice numbers are sequential and never reused — the counter is stored in the DB.
- If Resend is down, emails silently fail (no retry queue) — consider adding a job queue in Phase 5.
- Admin alert goes to `ADMIN_ORDER_ALERT_EMAIL` — defaults to `support@smokecitysupplies.com`.
