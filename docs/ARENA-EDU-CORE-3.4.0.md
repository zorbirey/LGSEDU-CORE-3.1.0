# ARENA-EDU-CORE-3.4.0 — Server Authority

This release introduces the reusable commercial security boundary for every Arena EDU product.

## Guarantees

- Existing browser learning data is preserved.
- `localStorage` cannot activate Premium, Pro or Pro+.
- The PWA accepts a paid plan only from a fresh, verified server snapshot.
- Firebase identities are verified by a Cloudflare Worker.
- D1 is authoritative for entitlements and daily quotas.
- Question reservations are atomic and idempotent.
- Turnstile is checked server-side during account bootstrap.
- Production origins are allowlisted and all authority responses are `no-store`.
- Rewarded-ad rewards remain closed until provider-side verification exists.

## Deliberate boundary

Guest users retain offline/local progress. A guest can reset their own local Free counter, but cannot obtain paid rights. Signed-in accounts use the server quota. A later release may add Firebase anonymous authentication if fully authoritative guest quotas are commercially required.

## Deployment state

The D1 migration and Worker are active at https://dry-hill-ab5b.zorbirey73.workers.dev; the PWA core points to that authority. Each product account UI must still provide its Firebase ID token and Turnstile token. Until a verified token is present, paid rights fail closed rather than trusting local data.
