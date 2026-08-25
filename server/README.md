# ARENA Server Authority V1

This Worker is the commercial authority for Arena EDU applications. The browser may cache learning progress in `localStorage`, but it cannot grant Premium/Pro access or authoritatively increase a daily quota.

## Security boundary

- Firebase ID tokens are verified on the Worker against the configured project, issuer, signature, expiry and verified-email claim.
- Turnstile is validated on the Worker. `TURNSTILE_SECRET_KEY` must be stored as a Worker secret and never committed.
- Plans, entitlement revisions, daily usage and idempotency records live in D1.
- Paid access is fail-closed: an unverified or offline client is treated as Free.
- Rewarded-ad credit is deliberately disabled until a real advertising provider's server-side verification is connected.

## One-time production setup

1. Install dependencies with `npm install`.
2. For a different Cloudflare account, replace the configured D1 ID with that account production database ID.
3. Run `npx wrangler d1 migrations apply lgs-arena-production --remote`.
4. Store the Turnstile secret with `npx wrangler secret put TURNSTILE_SECRET_KEY --env production`.
5. Deploy with `npx wrangler deploy --env production`.
6. Put the resulting HTTPS Worker URL in `arena-core.config.js > security.apiBaseUrl`.
7. Connect Firebase Auth in the PWA by passing an ID-token provider to `ArenaSecureAuthority.setTokenProvider()` and a Turnstile token provider to `setTurnstileProvider()`.

Do not put payment-provider or Turnstile secrets in PWA files.
