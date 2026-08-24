# Cloudflare quota and security contract

The `dry-hill-ab5b` Worker is the server authority for membership, trusted time and protected quotas. The PWA's existing progress keys remain untouched. Client-side counters continue only as open-shell UX hints and never grant Premium, Pro or protected-question access.

- Production CORS origin: `https://zorbirey.github.io`
- Explicit local origins: ports 4173 and 8787 on `localhost` and `127.0.0.1`
- D1: `lgs-arena-production`, binding `DB`
- Turnstile: Managed widget `lgs-arena-pwa`; server secret binding name `TURNSTILE_SECRET_KEY`
- Sessions: 15-minute HMAC signatures derived with HKDF inside the Worker; revocable D1 session rows; tokens are memory-only in the PWA adapter
- Daily quota boundary: server `Date.now()`, `Europe/Istanbul`, 08:00
- Ads: client claims are stored as untrusted and never grant a reward until a real provider callback is implemented
- Questions: initial payload excludes `correct_index` and `solution`; they are returned only after an authenticated answer submission and quota decision

Not live: payment/subscription ingestion, a real ad-provider callback, production question population, AI teacher provider/moderation and parent-account federation. Missing services fail closed.
