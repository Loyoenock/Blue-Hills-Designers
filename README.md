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

# Deployment Endpoint
APP_URL="https://your-domain.com"
```

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

To bootstrap your database schema and support features like transactional reviews, profile generation, and real-time carts, follow these steps:

1. **Execute DB Schema**:
   Navigate to your Supabase Project Dashboard and open the **SQL Editor**. Copy and execute the contents of `supabase_schema.sql` located at the project root directory. This creates all essential tables:
   - `profiles`
   - `products`
   - `product_images`
   - `categories`
   - `orders`
   - `order_items`
   - `reviews`
   - `wishlists`
   - `coupons`
   - `audit_logs`

2. **Authentication Triggers**:
   The schema includes SQL trigger functions to automatically create a corresponding record in `profiles` whenever a new user registers through Supabase Auth.

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
