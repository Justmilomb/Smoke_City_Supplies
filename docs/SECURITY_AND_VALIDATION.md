# Security and Validation Review

## Auth and Authorization

- Admin-only endpoints are protected with `requireAuth` in `server/routes.ts`.
- Session auth uses `express-session` + Passport local strategy (`server/auth.ts`).
- Session cookies are `httpOnly`, `sameSite=lax`, and `secure` in production (`server/index.ts`).

## Input Validation

- Public and admin mutations use Zod schemas with `safeParse`.
- Product/category/contact payloads are sanitized in `server/validation.ts`.
- Quantity and category patch endpoints now enforce explicit Zod schemas.

## Abuse Protection

- Rate limiting is applied for auth, contact, API, and order paths (`server/rateLimit.ts`).
- Upload endpoint is size-limited and MIME-restricted through multer config (`server/upload.ts`).

## Transport / Headers

- Security headers and CORS policy are centralized in `server/security.ts`.
- `trust proxy` is enabled for hosted deployment behavior (`server/index.ts`).

## Payments

- Stripe payment intent amount is server-calculated.
- Shipping is server-calculated and included in final payment amount.
- Final order creation verifies successful payment intent/session before persistence.

## SEO / Feed Automation

- Product SEO metadata is generated server-side with NVIDIA API fallback to deterministic local generation.
- Google Merchant feed is generated from live inventory (`/google-shopping.xml`).

## Known Risks and Recommendations

- Rotate any previously exposed keys immediately.
- Keep `.env` out of source control.
- Add webhook signature verification if Stripe webhooks are introduced later.
- Add integration tests for checkout total parity (subtotal + shipping + charged amount).
