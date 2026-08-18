# Blue Hills Designers — Uganda's Premier Luxury Corporate Menswear Store

Blue Hills Designers is an exquisite corporate ready-to-wear boutique located at Lubowa Shopping Mall on Entebbe Road, Kampala, Uganda. This application is a custom-crafted, full-stack, sarto-inspired electronic commerce platform featuring high-end apparel imported from Turkey, Egypt, China, and the UK.

---

## 🛠️ Tech Stack & Key Architectures

- **Framework**: Next.js 15+ (App Router, Server Components & Dynamic Route Handlers)
- **Frontend Core**: React 19, Tailwind CSS, Motion (formerly Framer Motion), Lucide Icons
- **State Management**: Zustand (Client-side global reactive persistence for carts, wishlist, session)
- **Database & Auth**: Supabase (PostgreSQL with deep audit logs, user profiles, real-time reviews)
- **Security & Schema**: Zod Schema validation for request bodies and environment secrets, Next.js Rate-Limiting middleware
- **Rendering Strategy**: Selective force-dynamic routing on interactive pages to guarantee freshness of inventory status, stock counts, and prices.

---

## 🔑 Environment Variables & Schema Validation

To safeguard server-side API keys and verify correct initialization at startup, the platform employs a rigid **Zod schema validation routine** (`/lib/env.ts`) that runs automatically inside Node.js execution blocks.

### Expected Configuration (`.env`):

Copy the `.env.example` contents to a localized `.env` file:

```env
# Gemini Cognitive Engine API Key (Provided via Google AI Studio)
GEMINI_API_KEY="AI_STUDIO_GEMINI_KEY"

# Public Supabase API Settings (Available in your Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# Server-Only Supabase Master Secret (Needed for elevated bypass operations)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Super Admin Bootstrap Emails
ADMIN_BOOTSTRAP_EMAILS="owner@yourdomain.com"

# Transactional Email (Resend)
RESEND_API_KEY="re_123456789_abcdefghijklmnopqrstuvwxyz"
EMAIL_FROM="Blue Hills Designers <orders@yourdomain.com>"

# Deployment Endpoint
APP_URL="https://your-domain.com"
```

---

## 📧 Transactional Email & Domain DNS Verification (Resend Setup)

Order confirmation emails are dispatched server-side using **Resend**.

1. **Obtain API Key**: Sign up on [Resend](https://resend.com) and copy your API key into `RESEND_API_KEY`.
2. **Domain DNS Verification Checklist**:
   To ensure high inbox deliverability and prevent order emails from being flagged as spam:
   - **SPF Record**: Add TXT record `v=spf1 include:amazonses.com ~all` or Resend SPF record to your DNS host.
   - **DKIM Record**: Add the CNAME / TXT DKIM keys generated in your Resend domain settings dashboard.
   - **DMARC Record**: Add TXT record `_dmarc.yourdomain.com` with value `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`.
3. **Resend Fallback Mode**: If `RESEND_API_KEY` is not set (e.g. during local testing), the platform gracefully logs email dispatches without failing checkout orders.

---

## 🛡️ Distributed Rate Limiting (Upstash Redis Setup)

To support multi-instance / horizontally scaled deployments (e.g. Vercel serverless functions or multiple Cloud Run container replicas):

1. **Configure Upstash Redis**:
   - Create a Redis database on [Upstash Redis](https://upstash.com).
   - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in your server environment variables.
2. **Atomic Sliding Window**:
   - Uses `@upstash/ratelimit` for atomic sliding-window rate limiting across all instance replicas.
3. **Outage Resilience & Failure Strategy**:
   - **Fail Closed**: For security-critical routes (`/api/auth/*`) and high-cost routes (`/api/gemini`), network failures contacting Redis will deny the request to prevent brute-force attacks and key exhaustion.
   - **Fail Open**: For general public routes (`/api/health`, `/api/db`, `/api/storage`, `/api/checkout`), Redis network hiccups allow requests to preserve core user experience and application availability.
4. **Local Fallback Mode**:
   - When Upstash Redis environment variables are absent (e.g. local development), the system automatically falls back to an in-memory sliding window limiter and logs a warning.

---

## 🚀 Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The dev server starts on **Port 3000** (using nginx reverse proxy layers inside virtual containers).

3. **Production Build Compilation**:
   ```bash
   npm run build
   ```

---

## 💾 Database Configuration (Supabase Setup)

To bootstrap your database schema or update an existing database safely, follow these guidelines:

### 1. Initial Greenfield Bootstrap (New / Empty Projects Only)
When setting up a brand-new, empty Supabase project:
1. Navigate to your Supabase Project Dashboard and open the **SQL Editor**.
2. Run `supabase_schema.sql` **ONCE** to create the baseline tables (`profiles`, `products`, `product_images`, `categories`, `orders`, `order_items`, `reviews`, `wishlists`, `coupons`, `audit_logs`, etc.), RLS policies, and authentication triggers.

> ⚠️ **CRITICAL WARNING FOR OPERATORS**:
> **NEVER re-run `supabase_schema.sql` on a live or production database!**
> `supabase_schema.sql` contains `DROP TABLE` statements designed for fresh initializations. Re-running it on a live database will permanently destroy existing data.

### 2. Applying Incremental Migrations (Live & Existing Databases)
To update existing databases or apply schema updates, execute all additive migration files sequentially in the Supabase SQL Editor:
1. `supabase_migration_unique_constraints.sql` (Adds case-insensitive unique indexes for coupon codes, newsletter emails, product/category slugs, and check constraints)
2. `supabase_migration_sizes_colors.sql` (Adds product size and color array columns)
3. `supabase_migration_newsletter_unique.sql` (Adds newsletter unique subscriber index)
4. `supabase_migration_orders_payments_updated_at.sql` (Adds `updated_at` timestamps)
5. `supabase_migration_reviews_guest_support.sql` (Enables guest reviewer details)
6. `supabase_migration_consultations_client_fields.sql` (Adds consultation client contact fields)
7. `supabase_migration_checkout_transaction.sql` (Adds atomic stock reservation and checkout PL/pgSQL function)
8. `supabase_migration_bhd_courier_settings.sql` (Configures courier and app setting defaults)

All `supabase_migration_*.sql` files are **additive-only**, **non-destructive**, and **idempotent** (`IF NOT EXISTS` / safe checks). They can be re-run safely without data loss.

### 3. Authentication & User Lifecycle Management
- **Automatic Profile Creation**: The schema includes SQL trigger functions to automatically create a corresponding record in `public.profiles` whenever a new user registers through Supabase Auth.
- **Admin User Deletion (Hard Delete)**: When an administrator deletes a user via `/api/admin/users/delete`, the system invokes `deleteUser(targetId, false)` to enforce a hard delete of the `auth.users` identity record and cleans any lingering auth identities, ensuring the email can be immediately reused for fresh signups.
- **Resilient Registration Recovery**: The `/api/auth/register` route automatically detects and recovers from soft-deleted or orphaned `auth.users` records (e.g., auth records without corresponding `public.profiles` rows) by hard-deleting the orphan and retrying registration, while safeguarding active accounts.

---

## 🌐 Full Deployment Steps

### 1. Deploying to Vercel (Recommended for Next.js)

1. **Import the Repository**:
   Connect your GitHub repository to your Vercel Account.
2. **Configure Environment Variables**:
   In Vercel project settings, add all variables defined in `.env.example` exactly as shown:
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured so they are bundled for the browser.
   - Keep `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` secret.
3. **Build Settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. **Deploy**:
   Click **Deploy**. Vercel will build the standalone Next.js bundles and serve them globally via its edge CDN.

---

### 2. Deploying to Google Cloud Run (Containerized)

This repository includes custom configuration to compile as a standalone production image optimized for lightweight container execution.

1. **Check Output Configuration**:
   The `next.config.ts` configuration utilizes the `'standalone'` output setting:
   ```typescript
   output: 'standalone'
   ```
   This automatically packs all server files and node_modules into a minimal directory inside `.next/standalone`.

2. **Dockerize**:
   Create a standard multi-stage `Dockerfile` at the root:
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies
   FROM base AS deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci

   # Build source code
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   ENV NEXT_TELEMETRY_DISABLED 1
   RUN npm run build

   # Production runner
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   ENV PORT 3000
   ENV HOSTNAME "0.0.0.0"

   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static

   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

3. **Build & Deploy Image**:
   Use Google Cloud Build or standard Docker commands to build and push the image to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/your-project-id/blue-hills-designers
   ```
4. **Launch Cloud Run**:
   Run the following deployment command, passing the environment variables:
   ```bash
   gcloud run deploy blue-hills-designers \
     --image gcr.io/your-project-id/blue-hills-designers \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-env-vars="GEMINI_API_KEY=your_key,NEXT_PUBLIC_SUPABASE_URL=your_url,NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key,SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
   ```

---

## 🔒 Security Best Practices

1. **Private Server-Side Proxies**:
   All API keys (such as `GEMINI_API_KEY`) are utilized exclusively in the server-side Next.js route handlers (`app/api/*`) and are never exposed to client-side components.
2. **Database Security Rules**:
   Ensure Row Level Security (RLS) is enabled in Supabase for all write-heavy tables. Users should only be allowed to modify their own cart, orders, and profile records.
