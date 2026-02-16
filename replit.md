# Smoke City Supplies

## Overview
A full-stack e-commerce application for motorcycle and scooter parts and accessories. Built with React frontend and Express backend using TypeScript.

## Branding
- **Colors**: Red primary (#C62828) with green accent (#4A8B4F) - inspired by professional motorcycle parts suppliers
- **Logo**: Geometric square pattern in red and white (similar to Larsson UK style)
- **Typography**: Inter font family, bold headings with "SMOKE CITY" branding
- **Style**: Clean, professional, industrial - like a serious parts supplier, not a generic e-commerce template

## Tech Stack
- **Frontend**: React 19, Vite, TailwindCSS 4, Radix UI components, React Query
- **Backend**: Express 5, TypeScript, Node.js 20
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth

## Project Structure
- `/client` - React frontend application
  - `/src/components/site/Logo.tsx` - Custom logo component
  - `/src/components/site/SiteLayout.tsx` - Main layout with header/footer
- `/server` - Express backend API
- `/shared` - Shared TypeScript types and database schema
- `/script` - Build scripts

## Development
- Run `npm run dev` to start the development server (defaults to port 5000 on Replit)
- Run `npm run db:push` to push database schema changes
- Run `npm run seed:parts` to seed product data

## Database Schema
- `users` - User accounts for admin access
- `categories` - Product categories
- `products` - Product catalog with specs, pricing, stock
- `orders` - Customer orders
- `order_items` - Individual items in orders

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `SEED_PARTS_ON_STARTUP` - Optional (`true`/`false`), controls startup product seeding (defaults on in dev, off in production)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `RESEND_API_KEY` - Resend API key for invoices
- `INVOICE_FROM_EMAIL` - Invoice sender email
- `INVOICE_REPLY_TO` - Invoice reply-to email
- `SHIPPO_API_KEY` - Shippo API key (when enabling labels)
- `SHIP_FROM_NAME` - Sender name for labels
- `SHIP_FROM_ADDRESS_LINE1` - Sender address line 1
- `SHIP_FROM_CITY` - Sender city
- `SHIP_FROM_POSTCODE` - Sender postcode
- `SHIP_FROM_COUNTRY` - Sender country code
- `PUBLIC_BASE_URL` - Public site URL used in generated feed product links

## Merchant Feed
- Public file feed URL: `/uploads/google-merchant.xml`
- Live fallback feed URL: `/feeds/google-merchant.xml`
- Feed file is auto-rewritten daily and after product create/update/delete.
