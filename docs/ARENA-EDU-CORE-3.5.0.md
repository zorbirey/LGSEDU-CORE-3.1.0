# ARENA-EDU-CORE-3.5.0 - Account Bridge

This release connects the approved first-use experience to Firebase Authentication, Cloudflare Turnstile and the server-authoritative Arena security boundary.

## First-use contract

- After ARENAYA GIR, the user chooses Create account, Existing account, or Continue as guest.
- Guest mode preserves existing local learning progress and never grants paid rights.
- Account mode uses Firebase email/password authentication and requires a verified email.
- Passwords are checked as 12-64 ASCII characters with uppercase, lowercase, number and special-character requirements.
- The settings gear opens account state, plan state, profile and sign-out controls.

## Security boundary

- Turnstile is rendered explicitly in the browser and validated by the Cloudflare Worker.
- The Turnstile secret remains only in Worker secrets.
- Firebase ID tokens are accepted only after issuer, audience and verified-email validation.
- Premium, Pro and Pro+ continue to come only from fresh server authority snapshots.
- Existing localStorage learning data is not migrated, renamed or deleted.

## Visual and PWA contract

The locked LGS 2027 STORM first-use portrait and landscape images are used responsively on phones and tablets. Account scripts, styles and both images are part of the versioned service-worker app shell.

Release: 8.4.0
PWA ID: 20260825-03
