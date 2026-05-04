# DC Portal

Internal management portal for DC Hosting — integrates Synergy (WHM/cPanel) and QuickBooks Online.

## Features

- **Clients** — manage client contacts with QuickBooks sync
- **Domains** — track domain registrations, expiry dates, auto-renew status
- **DNS Records** — view and sync DNS records from WHM/cPanel
- **Tickets** — internal support ticketing with comments and status management
- **Dashboard** — overview of expiring domains and open tickets

## Tech Stack

- Next.js 14 (App Router)
- PostgreSQL + Prisma
- NextAuth.js (email/password)
- Tailwind CSS
- Railway deployment

## Getting Started

1. Copy `.env.example` to `.env` and fill in your values
2. `npm install`
3. `npm run db:push` — push schema to database
4. `npm run db:seed` — create admin user (`admin@dchosting.com.au` / `admin123!`)
5. `npm run dev`

## Deployment (Railway)

1. Create a Railway project
2. Add a PostgreSQL plugin
3. Set environment variables from `.env.example`
4. Deploy — Railway will run `prisma migrate deploy` on start

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | Full URL of deployed app |
| `WHM_HOST` | WHM server URL (e.g. `https://host:2087`) |
| `WHM_USERNAME` | WHM root username |
| `WHM_API_TOKEN` | WHM API token (create in WHM > API Tokens) |
| `QB_CLIENT_ID` | QuickBooks app client ID |
| `QB_CLIENT_SECRET` | QuickBooks app client secret |
| `QB_ENVIRONMENT` | `sandbox` or `production` |
