# Production Deployment Checklist

Use this checklist before launching Smoke City Supplies to production.

## Pre-Deployment

### Environment Configuration

- [ ] `DATABASE_URL` configured (PostgreSQL on Render)
- [ ] `SESSION_SECRET` generated and set (`openssl rand -base64 32`)
- [ ] `ADMIN_PASSWORD` set (override default 'admin' password)
- [ ] `NODE_ENV` set to `production`
- [ ] `STRIPE_SECRET_KEY` set (live key, not test)
- [ ] `STRIPE_PUBLISHABLE_KEY` set (live key)
- [ ] `STRIPE_WEBHOOK_SECRET` configured

### Stripe Setup

- [ ] Stripe account activated for live payments
- [ ] Business details filled out in Stripe
- [ ] Bank account connected for payouts
- [ ] Webhook endpoint configured (production URL)
- [ ] Tested checkout flow with test cards
- [ ] Reviewed payment success/failure handling

### Database

- [ ] PostgreSQL database created on Render
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Admin user seeded
- [ ] Categories seeded
- [ ] Test data cleaned out

### Security

- [ ] Admin password changed from default
- [ ] Session secret is strong and unique
- [ ] HTTPS enforced (automatic on Render)
- [ ] Security headers configured
- [ ] Rate limiting tested
- [ ] Input validation working

## Content Review

### Legal Pages

- [ ] Privacy Policy reviewed and accurate
- [ ] Terms of Service reviewed
- [ ] Contact information correct
- [ ] Business registration details added

### Site Content

- [ ] Homepage brand story (Karl) reviewed
- [ ] Contact page email/phone verified
- [ ] Footer links all working
- [ ] All product images loading
- [ ] Product descriptions accurate

### Testing

- [ ] Homepage loads correctly
- [ ] Product catalog and filters work
- [ ] Product detail pages display properly
- [ ] Cart functionality tested
- [ ] Checkout flow end-to-end
- [ ] Payment processing verified
- [ ] Order confirmation working
- [ ] Admin login works
- [ ] Admin panels functional (products, orders, categories)
- [ ] Mobile responsive on all pages
- [ ] All links tested (no 404s)

## Post-Deployment

### Monitoring

- [ ] Check Render logs for errors
- [ ] Monitor Stripe Dashboard for payments
- [ ] Test webhook delivery in Stripe
- [ ] Verify email notifications (if configured)
- [ ] Check database connectivity

### SEO & Analytics

- [ ] Sitemap accessible at `/sitemap.xml`
- [ ] Structured data (JSON-LD) present
- [ ] Meta tags on all pages
- [ ] Open Graph tags configured
- [ ] Google Search Console submitted (optional)
- [ ] Analytics configured (optional)

### Performance

- [ ] Page load times acceptable
- [ ] Images optimized
- [ ] No console errors in browser
- [ ] Database queries optimized
- [ ] Rate limiting not too aggressive for real users

## Launch Day

- [ ] DNS configured (if using custom domain)
- [ ] SSL certificate active
- [ ] Send test order to yourself
- [ ] Monitor first real orders closely
- [ ] Have support contact ready (Karl's email/phone)
- [ ] Backup plan if critical issues found

## Ongoing Maintenance

- [ ] Regular Stripe Dashboard checks
- [ ] Monitor order volume and errors
- [ ] Keep dependencies updated
- [ ] Review and respond to customer inquiries
- [ ] Check inventory levels
- [ ] Monitor server performance

## Rollback Plan

If critical issues are found:

1. Check Render logs for errors
2. Review recent commits in git
3. Rollback to previous deployment in Render dashboard
4. Fix issue locally
5. Test thoroughly
6. Redeploy

## Support Contacts

- **Render Support**: https://render.com/support
- **Stripe Support**: https://support.stripe.com
- **Database Issues**: Check Render PostgreSQL logs
- **Payment Issues**: Check Stripe Dashboard

## Notes

- All prices in GBP (£)
- UK delivery only
- Admin default username: `admin`
- Contact: support@smokecitysupplies.com
- Phone: 07597783584 (Karl)
