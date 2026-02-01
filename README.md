# Smoke City Supplies

E-commerce site for bike and scooter parts. Run from this directory.

## Local Setup

1. Set `DATABASE_URL` (PostgreSQL) and optionally `SESSION_SECRET`, `ADMIN_PASSWORD`.
2. `npm install && npm run build && npm run db:push`
3. `npm run start` (or `npm run dev` for development)

## Render Deployment

This project is configured for deployment on Render.

### Quick Deploy

1. Push this repository to GitHub
2. In Render dashboard, create a new **Web Service**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and configure automatically

### Manual Configuration (if not using render.yaml)

**Build Command:**
```bash
npm install && npm run build && npm run db:push
```

**Start Command:**
```bash
npm run start
```

**Environment Variables:**
- `DATABASE_URL` - Automatically set when you add a PostgreSQL database
- `SESSION_SECRET` - Generate with: `openssl rand -base64 32`
- `NODE_ENV` - Set to `production` (auto-set by Render)
- `ADMIN_PASSWORD` - (Optional) Override default admin password

**PostgreSQL Database:**
- Create a PostgreSQL database in Render
- The connection string will be automatically set as `DATABASE_URL`
- SSL is automatically configured for production

**Important Notes:**
- The server binds to `0.0.0.0` and uses the `PORT` environment variable (set by Render)
- Uploaded images are stored in the ephemeral filesystem (lost on restart/deploy)
- For persistent image storage, consider Cloudinary, S3, or Render Disk

## Scripts

- `npm run dev` — development server (port 3000)
- `npm run build` — build client and server
- `npm run start` — production server
- `npm run db:push` — push schema to database (skips if DATABASE_URL not set)