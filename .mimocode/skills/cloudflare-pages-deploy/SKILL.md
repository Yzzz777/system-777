---
name: cloudflare-pages-deploy
description: >
  Full automated deployment to Cloudflare Pages for Next.js projects.
  Handles build, secrets, DNS configuration, and deployment in one pass.
  Use when: deploying a Next.js app to Cloudflare Pages, fixing Cloudflare
  deployment errors (522, 404, edge runtime), or setting up a new Cloudflare
  Pages project with custom domain.
---

# Cloudflare Pages Deploy Skill

Complete deployment pipeline for Next.js projects on Cloudflare Pages.
Distilled from 4+ sessions of painful debugging (build failures, DNS issues,
edge runtime crashes, missing secrets).

## Prerequisites

- Node.js 20+ (use `nvm use 20` if available)
- Cloudflare API token with Pages + DNS + Workers permissions
- Project must use `@cloudflare/next-on-pages` adapter (NOT `npx next build` alone)
- Neon/PostgreSQL database URL if the app uses a database

## Step 1: Pre-flight Checks

```bash
# Verify Node.js version
node -v  # Must be 20+

# Verify project structure
ls src/app/  # Next.js App Router expected
cat package.json | grep -E "next|@cloudflare"  # Check deps exist
```

If `@cloudflare/next-on-pages` is not installed:
```bash
npm install -D @cloudflare/next-on-pages
```

## Step 2: Build

```bash
# Standard Cloudflare Pages build (auto-detects prisma if present)
npx @cloudflare/next-on-pages

# Output goes to .vercel/output/static/
ls .vercel/output/static/
```

**CRITICAL PITFALLS:**
- `npx next build` alone does NOT work for Cloudflare Pages — you MUST use `@cloudflare/next-on-pages`
- If Prisma was removed from deps but `prisma/schema.prisma` still exists, the build will try `prisma generate` and fail. Rename it: `mv prisma/schema.prisma prisma/schema.prisma.bak`
- All dynamic routes need `export const runtime = 'edge'` in their `page.tsx` or they return 404 on Cloudflare Pages
- ESLint errors will fail the build — remove ALL unused imports before building

## Step 3: Set Secrets

```bash
# Set each secret via Wrangler
npx wrangler pages secret put DATABASE_URL --project-name=<PROJECT_NAME>
npx wrangler pages secret put AUTH_SECRET --project-name=<PROJECT_NAME>
npx wrangler pages secret put NEXTAUTH_URL --project-name=<PROJECT_NAME>
npx wrangler pages secret put NEXTAUTH_SECRET --project-name=<PROJECT_NAME>
npx wrangler pages secret put NODE_VERSION --project-name=<PROJECT_NAME>
```

**NOTE:** Wrangler v3+ required. If `wrangler` is not installed:
```bash
npm install -g wrangler
```

## Step 4: Deploy

```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy .vercel/output/static \
  --project-name=<PROJECT_NAME> \
  --branch=main
```

## Step 5: DNS Configuration (if using custom domain)

If the domain is on Hostinger and you want to use Cloudflare DNS:

```bash
# Add the domain to Cloudflare (via API or dashboard)
# Then set these DNS records:
# CNAME yourdomain.com -> <PROJECT_NAME>.pages.dev (Proxied)
# CNAME www -> <PROJECT_NAME>.pages.dev (Proxied)
```

**IMPORTANT:** Cloudflare Pages `/pages/create` URL returns 404 — navigate via Workers & Pages menu instead.

## Step 6: Verify

```bash
# Check if the site is reachable
curl -sI https://yourdomain.com

# Common error codes:
# 522 = DNS correct but origin not deployed yet
# 404 = Missing export const runtime = 'edge' on dynamic routes
# Build fails = Check ESLint errors or Prisma leftovers
```

## Edge Runtime Requirements

ALL API routes and dynamic pages MUST have:
```typescript
export const runtime = 'edge';
```

This is the #1 cause of 404s on Cloudflare Pages with Next.js. Without it, pages compile as static but fail at runtime.

## Quick Deploy Script

Save this as `deploy.sh` in your project root:

```bash
#!/bin/bash
set -e

PROJECT_NAME="${1:-system777}"
BRANCH="${2:-main}"

echo "=== Building ==="
npx @cloudflare/next-on-pages

echo "=== Deploying ==="
npx wrangler pages deploy .vercel/output/static \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH"

echo "=== Done ==="
echo "Check: https://${PROJECT_NAME}.pages.dev"
```

```bash
chmod +x deploy.sh
./deploy.sh system777 main
```

## Session-Specific Notes

- This skill was distilled from the SYSTEM 777 project (Next.js 15.3.3 + Neon PostgreSQL)
- The user works on Linux Mint XFCE — all scripts must be bash (.sh), not batch (.bat)
- Neon DB credentials may expire — if you see `P1000 Authentication failed`, the password needs rotating
- User prefers zero manual steps — embed tokens in scripts when possible
