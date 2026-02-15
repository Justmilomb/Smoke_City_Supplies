# 🚀 Launch Guide - Smoke City Supplies

This guide will take you from code to live production site in a few steps.

## Prerequisites

- [x] Smoke City Supplies codebase (this repo)
- [ ] Stripe account (sign up at https://stripe.com)
- [ ] Render account (sign up at https://render.com)
- [ ] GitHub account (to connect repo to Render)

---

## Step 1: Local Testing (Optional but Recommended)

### Quick Test

```bash
# Install dependencies
npm install

# Run without database (in-memory mode)
npm run dev
```

Visit http://localhost:3000 and verify:
- Homepage loads with Karl's story
- Product catalog works
- Cart functionality
- Admin login (username: `admin`, password: `admin`)

### Test with Stripe (Recommended)

1. Get Stripe test keys:
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy **Publishable key** and **Secret key**

2. Set environment variables:
   ```bash
   export STRIPE_SECRET_KEY=sk_test_...
   export STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. Test checkout:
   - Add items to cart
   - Go through checkout
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry, any CVC
   - Complete payment

---

## Step 2: Prepare for Production

### Get Stripe Live Keys

1. **Activate your Stripe account**
   - Add business details
   - Connect bank account
   - Complete activation steps

2. **Get live API keys**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy **Publishable key** (pk_live_...)
   - Copy **Secret key** (sk_live_...)
   - Save these somewhere secure!

### Generate Secrets

```bash
# Generate a strong session secret
openssl rand -base64 32
```

Save this output - you'll need it for Render.

---

## Step 3: Deploy to Render

### Push to GitHub

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Create Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Render will detect `render.yaml` automatically

### Configure Environment Variables

In Render dashboard → Your service → Environment:

Add these variables:

```
DATABASE_URL          (auto-set when you add PostgreSQL database)
SESSION_SECRET        (paste the output from openssl command above)
ADMIN_PASSWORD        (choose a strong password - NOT "admin"!)
STRIPE_SECRET_KEY     sk_live_... (your live secret key)
STRIPE_PUBLISHABLE_KEY pk_live_... (your live publishable key)
NODE_ENV              production (auto-set by Render)
```

**Do NOT set `STRIPE_WEBHOOK_SECRET` yet** - we'll get this in Step 4.

### Add PostgreSQL Database

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Name it (e.g., "smoke-city-db")
3. Choose a region (same as web service)
4. Click **"Create Database"**
5. Go back to your web service
6. In Environment tab, `DATABASE_URL` should now be set automatically
7. Deploy (or it will auto-deploy)

### First Deployment

Render will:
1. Install dependencies
2. Build frontend and backend
3. Push database schema
4. Start the server

Watch the logs for any errors. First deployment takes 3-5 minutes.

---

## Step 4: Configure Stripe Webhooks

### Get Your Production URL

Once deployed, Render gives you a URL like:
`https://your-app-name.onrender.com`

### Create Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Set endpoint URL to:
   ```
   https://your-app-name.onrender.com/api/stripe/webhook
   ```
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **"Add endpoint"**

### Get Webhook Secret

1. Click on the webhook you just created
2. Click **"Reveal"** next to **Signing secret**
3. Copy the secret (starts with `whsec_...`)

### Add to Render

1. Go back to Render dashboard
2. Your web service → Environment
3. Add new variable:
   ```
   STRIPE_WEBHOOK_SECRET    whsec_... (paste the secret)
   ```
4. Service will auto-redeploy

---

## Step 5: Final Testing

### Test the Live Site

1. Visit your Render URL
2. Browse products
3. Add to cart
4. **DO NOT use test cards** - use a real card with a small amount (like £0.50)
5. Complete checkout
6. Verify:
   - Payment shows in Stripe Dashboard
   - Order appears in admin panel
   - Inventory decrements

### Test Admin Panel

1. Go to `/admin/login`
2. Login with your `ADMIN_PASSWORD`
3. Verify:
   - Products page loads
   - Orders page shows your test order
   - Categories management works

### Monitor

- Check Render logs for errors
- Check Stripe Dashboard for payments
- Verify webhook events are received (green checkmarks in Stripe webhooks page)

---

## Step 6: Customize Content

### Update Contact Information

Edit `/client/src/components/site/SiteLayout.tsx`:
- Phone number: Currently `07597783584`
- Email: Currently `support@smokecitysupplies.com`

### Update Policy Pages

Review and customize:
- `/client/src/pages/privacy.tsx`
- `/client/src/pages/terms.tsx`

Add your business name, registration details, etc.

### Add Real Products

1. Login to `/admin`
2. Go to Products
3. Delete test/seed products
4. Add your real inventory with:
   - Real product images
   - Accurate descriptions
   - Current pricing
   - Stock levels

---

## Step 7: Go Live

### Pre-Launch Checklist

- [ ] Stripe live mode activated
- [ ] Webhook configured and tested
- [ ] Admin password changed from default
- [ ] Contact info updated
- [ ] Policy pages reviewed
- [ ] Real products added
- [ ] Test order placed and verified
- [ ] SSL certificate active (automatic on Render)
- [ ] Mobile responsive tested
- [ ] All links working

### Launch!

1. Announce to customers (email, social media, etc.)
2. Monitor first orders closely
3. Respond promptly to any issues
4. Check Stripe Dashboard daily

---

## Post-Launch

### Daily Tasks

- Check Render logs for errors
- Review Stripe Dashboard for payments
- Process and ship orders
- Respond to customer inquiries

### Weekly Tasks

- Review inventory levels
- Check for low stock items
- Monitor sales performance
- Backup database (Render does this automatically)

### Monthly Tasks

- Review and update products
- Check security updates for dependencies
- Review admin access logs
- Update content/promotions

---

## Troubleshooting

### Payments Not Working

1. Check Stripe Dashboard → Logs
2. Verify live keys are set (not test keys)
3. Check webhook endpoint is configured
4. Review Render logs for errors
5. Ensure `STRIPE_WEBHOOK_SECRET` is set

### Site Not Loading

1. Check Render logs
2. Verify environment variables are set
3. Check database connection
4. Review recent deploys/changes

### Admin Can't Login

1. Verify `ADMIN_PASSWORD` is set correctly
2. Check username is `admin` (lowercase)
3. Review Render logs for auth errors
4. Try resetting admin password in environment variables

---

## Support Resources

### Documentation

- **Stripe Setup**: `/docs/STRIPE_SETUP.md`
- **Deployment Checklist**: `/docs/DEPLOYMENT_CHECKLIST.md`
- **Architecture**: `/docs/ARCHITECTURE.md`
- **Implementation Summary**: `/IMPLEMENTATION_SUMMARY.md`

### External Help

- **Render Support**: https://render.com/support
- **Stripe Support**: https://support.stripe.com
- **Render Community**: https://community.render.com

### Quick Reference

**Admin Access**
- URL: `https://your-site.onrender.com/admin/login`
- Username: `admin`
- Password: Your `ADMIN_PASSWORD` env var

**Database**
- Managed by Render
- Auto-backed up daily
- Access via Render dashboard

**Logs**
- View in Render dashboard
- Real-time streaming
- Search and filter

---

## Success!

You now have a fully functional, production-ready e-commerce site with:

✅ Stripe payment processing
✅ Karl's brand story throughout
✅ Secure admin panel
✅ Professional design
✅ UK-focused motorcycle parts shop

**Karl's mission**: Bringing back old-fashioned service to the motorcycle parts industry.

The site is ready to serve your customers with genuine parts, real expertise, and personal care.

---

**Need help?** Review the documentation in `/docs/` or check the `IMPLEMENTATION_SUMMARY.md` for technical details.

**Ready to ride!** 🏍️
