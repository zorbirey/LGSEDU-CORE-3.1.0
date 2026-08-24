# ARENA-EDU-CORE-3.1.0 migration inventory

Build `20260824-25` adapts the working 8.2.0 experience without replacing its visuals or legacy content.

- Visible areas retained: Arena/dashboard, six subjects, question solving, daily mini/mock exams, progress, wrong notebook, Zeus guidance, membership plans, OBP, 2026 preference robot, parent tracking demo, rewarded-ad demo, profile, weekly program and review flow.
- Preserved storage keys: `lgsArenaPwaV02`, `lgsArenaPreferenceV1`, `lgsArenaProfileV41`, `lgsArenaReviewV81`, `lgsArenaWeeklyProgramV1`. Migration metadata uses `lgsArenaMigrationV3`; pre-migration recovery uses `lgsArenaRecoveryV3`.
- Recovery exports exclude fields matching token, secret, payment, entitlement, authority, admin, signature and Turnstile. Failure restores the captured legacy values.
- The 228 legacy questions remain usable as `legacy_unverified`; none count as active production questions. Answers and solutions are classified for post-submission delivery only.
- Existing lessons remain in place. The Grade Adapter/package manifest describes the Free/Premium split, but full Premium packages are intentionally reported missing until physical protected packaging exists.
- School dataset: 3,098 rows, visibly identified as 2026 data. Results are informational and not official placement results.
- Zeus AI Teacher stays `reserved-not-live`; no provider, credential, outbound request or client-side authority is configured.
- The service worker caches only the public preview shell, bypasses protected/API paths, and removes only older caches with the migration prefix.

## Evidence-based commercial readiness

Preview/migration engineering readiness is 68%. Commercial production readiness is **34%**: app/PWA continuity, legacy content adapters, data recovery, plan UX, factory blueprint and fail-closed reference API exist; payment/authentication, reviewed curriculum snapshots, 15,000 calibrated questions, protected long-lesson packages, production AI safety/quota infrastructure, store assets and release approvals do not.
