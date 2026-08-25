# ARENA Verification Authority 1.0.0

This Worker is the commercial authority for Arena EDU applications. The browser may cache learning progress in `localStorage`, but it cannot grant Premium/Pro access or authoritatively increase a daily quota.

## Security boundary

- Firebase ID tokens are verified on the Worker against the configured project, issuer, signature, expiry and verified-email claim.
- Turnstile is validated on the Worker. `TURNSTILE_SECRET_KEY` must be stored as a Worker secret and never committed.
- Plans, entitlement revisions, daily usage and idempotency records live in D1.
- Paid access is fail-closed: an unverified or offline client is treated as Free.
- Google Play purchase tokens are verified with `purchases.subscriptionsv2.get`, bound to the Firebase user through `obfuscatedExternalAccountId`, acknowledged server-side and stored by token hash.
- AdMob rewarded ads use signed SSV callbacks. Ad unit, reward, session, timestamp and transaction ID are verified before an atomic D1 quota grant.
- Client-only claims such as “purchase complete” or “ad watched” never grant access.
- Provider tokens and service-account credentials never enter PWA files or logs.

## One-time production setup

1. Install dependencies with `npm install`.
2. For a different Cloudflare account, replace the configured D1 ID with that account production database ID.
3. Run `npx wrangler d1 migrations apply lgs-arena-production --remote`.
4. Store the Turnstile secret with `npx wrangler secret put TURNSTILE_SECRET_KEY --env production`.
5. Set `GOOGLE_PLAY_PACKAGE_NAME` and `GOOGLE_PLAY_PRODUCT_PLANS` when Play Console products exist. Example: `{"arena_premium_monthly":"premium","arena_pro_monthly":"pro"}`.
6. Store the complete service-account JSON as the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` Worker secret with least-privilege Play Console permissions.
7. Set `ADMOB_REWARD_AD_UNIT_ID`, `ADMOB_REWARD_ITEM` and `ADMOB_REWARD_AMOUNT`; configure SSV callback as `https://<worker>/v1/ads/admob/ssv`.
8. Deploy with `npx wrangler deploy --env production`.
9. Put the Worker URL in `arena-core.config.js > security.apiBaseUrl`.
10. Connect Firebase Auth through `ArenaSecureAuthority.setTokenProvider()` and Turnstile through `setTurnstileProvider()`.

## Client contract

- Before Play Billing, call `googlePlayAccountBinding()` and pass the returned value as `obfuscatedAccountId`.
- After Play returns a subscription token, call `verifyGooglePlaySubscription(productId, purchaseToken)` and wait for its server snapshot.
- Before a rewarded ad, call `createRewardSession()` and pass its `userId` and `customData` to the Mobile Ads SDK SSV options.
- After the ad closes, poll `rewardSessionStatus(sessionId)` and continue only when `verified` is `true`.
- Never fall back to client-side Premium or rewarded access when the Worker is unavailable.

Do not put payment-provider or Turnstile secrets in PWA files.
