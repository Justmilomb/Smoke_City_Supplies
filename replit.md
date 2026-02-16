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
- `R2_BUCKET` - Cloudflare R2 bucket for uploaded images (recommended in production)
- `R2_ACCESS_KEY_ID` - Cloudflare R2 access key ID
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret access key
- `R2_PUBLIC_BASE_URL` - Public base URL for uploaded image files
- `R2_ACCOUNT_ID` - Cloudflare account ID (unless `R2_ENDPOINT` is set)
- `R2_ENDPOINT` - Optional explicit R2 endpoint
- `R2_KEY_PREFIX` - Optional key prefix/folder in the bucket
- `UPLOADS_DIR` - Optional local filesystem fallback path when R2 is not configured
- `PUBLIC_BASE_URL` - Public site URL used in generated feed product links

## Merchant Feed
- Public file feed URL: `/uploads/google-merchant.xml`
- Live fallback feed URL: `/feeds/google-merchant.xml`
- Feed file is auto-rewritten daily and after product create/update/delete.
