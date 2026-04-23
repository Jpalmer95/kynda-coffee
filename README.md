[![Live Demo](https://img.shields.io/badge/Live%20Demo-kynda.167.99.125.127.sslip.io-rust?style=flat-square)](https://kynda.167.99.125.127.sslip.io)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe)](https://stripe.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square)](https://web.dev/progressive-web-apps/)

# Kynda Coffee — Digital Platform

Next-gen e-commerce and digital presence for Kynda Coffee, Horseshoe Bay TX.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Database:** Supabase (Postgres + Auth + Storage)
- **Payments:** Stripe (online) + Square (in-store POS)
- **POD Fulfillment:** Printful API
- **AI Generation:** FAL.ai (FLUX model)
- **Email:** Resend
- **SMS:** Twilio

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    (marketing)/          # Public pages (about, menu, catering, contact)
    api/                  # API routes
      checkout/           # Stripe checkout session creation
      webhooks/
        stripe/           # Stripe webhook handler
        square/           # Square webhook handler
      products/           # Product CRUD
      orders/             # Order management
      designs/            # AI design studio API
      marketing/          # Email/SMS campaigns
    shop/                 # E-commerce storefront
    studio/               # AI Design Studio
    account/              # Customer account pages
    admin/                # Admin dashboard
  components/
    layout/               # Header, Footer
    ui/                   # Reusable UI components
    shop/                 # Shop-specific components
    studio/               # Design studio components
    marketing/            # Marketing components
  lib/
    supabase/             # Supabase client
    stripe/               # Stripe client + config
    square/               # Square API client
    printful/             # Printful POD integration
    fal/                  # FAL.ai image generation
    resend/               # Email (Resend) client
  types/                  # TypeScript type definitions
  hooks/                  # React hooks (cart, etc.)
  styles/                 # Global CSS
supabase/
  migrations/             # Database migrations
```

## Key Features

1. **E-Commerce Store** — Coffee beans, merch, subscriptions (Stripe Checkout)
2. **In-Store POS** — Square integration for point-of-sale
3. **AI Design Studio** — Generate custom merch designs with AI
4. **Print-on-Demand** — Printful fulfillment for custom products
5. **QR Code Ordering** — Mobile ordering for in-store customers
6. **Marketing Automation** — Email (Resend) + SMS (Twilio) pipelines
7. **Loyalty Program** — Points, tiers, rewards
8. **Delivery Integration** — DoorDash + Uber Eats via middleware

## Database Setup

Run the migration in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL editor.

## Deploy

```bash
npm run build
npm run start
```

Recommended hosting: Vercel (free tier works for this scale).

---

Built with care in the Texas Hill Country. ☕
