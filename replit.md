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
- `UPLOADS_DIR` - Optional filesystem path for uploaded images (use a persistent mount in production)

## Merchant Feed
- Public file feed URL: `/feeds/google-merchant.xml`
- Merchant Center can fetch this link on schedule (recommended: daily at 00:00).
