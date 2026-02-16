# Stripe Integration Setup Guide

This guide will help you set up Stripe payments for Smoke City Supplies.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to your Stripe Dashboard

## Step 1: Get Your API Keys

### For Testing (Development)

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### For Production

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_live_`)
3. Copy your **Secret key** (starts with `sk_live_`)

## Step 2: Set Environment Variables

### Local Development

Create a `.env` file in the project root (or set these in your shell):

```bash
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Production (Render)

In your Render dashboard:

1. Go to your web service
2. Navigate to Environment → Environment Variables
3. Add:
   - `STRIPE_SECRET_KEY` = `sk_live_your_key_here`
   - `STRIPE_PUBLISHABLE_KEY` = `pk_live_your_key_here`

## Step 3: Set Up Webhooks (Important!)

Webhooks notify your server when payments succeed or fail.

### For Production

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.onrender.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled` (optional but recommended)
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to your Render environment variables:
   - `STRIPE_WEBHOOK_SECRET` = `whsec_your_secret_here`

### For Local Testing (Optional)

Use the Stripe CLI for local webhook testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook signing secret to use locally.

## Step 4: Test Payments

### Test Card Numbers

Stripe provides test cards for development:

- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any CVC, and any postal code.

### Testing the Flow

1. Add items to cart
2. Go to checkout
3. Fill in delivery details
4. Click "Continue to Payment"
5. Enter test card details
6. Complete payment
7. Verify webhook event is delivered and order status moves to `paid`
8. Verify invoice email send (or server log fallback when email key is missing)

## Step 5: Go Live Checklist

Before accepting real payments:

- [ ] Switch from test keys to live keys
- [ ] Set up production webhook endpoint
- [ ] Test the entire checkout flow
- [ ] Verify webhook events are being received
- [ ] Review Stripe Dashboard settings (business details, branding)
- [ ] Set up email notifications for successful payments
- [ ] Add your business information to Stripe account

## Security Notes

- **Never commit API keys to version control**
- Use environment variables for all keys
- Webhook secrets prevent replay attacks
- Stripe handles all PCI compliance for card data
- We never store or log card details

## Troubleshooting

### Payment Not Processing

- Check Stripe Dashboard logs
- Verify API keys are correct
- Ensure webhook endpoint is accessible
- Check server logs for errors

### Webhook Not Working

- Verify webhook secret is correct
- Check that endpoint URL is correct
- Ensure server is publicly accessible
- Review Stripe webhook delivery attempts in dashboard

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Contact Karl: support@smokecitysupplies.com

## Next Steps

Once Stripe is configured:

1. Test thoroughly with test cards
2. Review payment flow UX
3. Customize email confirmations
4. Set up refund procedures
5. Monitor payments in Stripe Dashboard
