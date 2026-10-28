# Security review – Live Auction Platform (2026-10-27)

Scope: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared`, `deploy/`. Method: checklist review of every endpoint, gateway handler and config, plus live probes against the dev stack.

## Findings and status

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | High | `POST /auth/login` had no throttling → admin password brute force | **Fixed**: 10 attempts/min per IP, 5/min per account (Redis), `429 TOO_MANY_ATTEMPTS` |
| 2 | High | Vulnerable transitive `multer@2.4.0` (DoS via pending upload) pulled by `@nestjs/platform-express` | **Fixed**: workspace override `multer >=2.5.0` |
| 3 | High | `zod@3` advisory (memory exhaustion on oversized constrained collections) | **Fixed**: upgraded to `zod@4.6.7`; arrays also bounded (`images ≤ 20`, `auctionIds ≤ 500`), body limit 100 kB |
| 4 | High | `deepmerge-ts@7` (stack exhaustion) via Prisma CLI | **Fixed**: override `>=8.0.0`, `prisma validate` passes |
| 5 | Medium | Any user could set their display name to `Admin` or to another bidder's name; names are shown unmasked by request | **Fixed**: reserved names rejected, case-insensitive uniqueness against display names and usernames, control characters stripped |
| 6 | Medium | No security headers; `X-Powered-By: Express` / `Next.js` leaked | **Fixed**: `helmet` on the API (CSP, HSTS, nosniff, COOP, frame-ancestors), `poweredByHeader:false` + X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy on the web app |
| 7 | Medium | Socket clients could spam `auction:join` (each join loads a DB snapshot) → cheap DoS | **Fixed**: 30 joins / 10 s per socket, ids validated |
| 8 | Medium | Production could start with a weak `JWT_SECRET` or the seed default `ADMIN_PASSWORD` | **Fixed**: API refuses to boot in production unless `JWT_SECRET` ≥ 32 chars and `ADMIN_PASSWORD` is not a known default |
| 9 | Medium | Behind nginx, per-IP limits would see the proxy IP | **Fixed**: `TRUST_PROXY=true` sets Express `trust proxy`; set in `deploy/docker-compose.prod.yml` |
| 10 | Low | CSV export: cells starting with `= + - @` executed as formulas in Excel/Sheets | **Fixed**: such cells are prefixed with `'` and quoted |
| 11 | Low | `GET /auctions/:id/bids?limit=abc` → 500; `campaignId=abc` silently ignored | **Fixed**: zod-validated query params → 400 |
| 12 | Low | `PUT /admin/campaigns/:id/order` accepted ids from other campaigns (500) | **Fixed**: ids must match the campaign exactly → `400 ORDER_MISMATCH` |
| 13 | Low | No global request ceiling | **Fixed**: 600 req/min per IP middleware (fails open if Redis is down) |
| 14 | Info | `postcss@8.4.31` advisories (4) are pinned inside `next@15.5` | **Accepted**: build-time only, not reachable at runtime; clears when Next bumps its pin |

## Verified OK (no change needed)

* **Secrets**: none in source; `apps/api/.env` is git-ignored; production values come from `deploy/.env`.
* **SQL injection**: all raw SQL uses Prisma tagged templates (parameterised); no string concatenation.
* **Input validation**: every body goes through a zod schema (unknown keys stripped); ids via `ParseIntPipe`.
* **Auth**: JWT in `httpOnly` cookie, `SameSite=Lax`, `Secure` in production, 12 h expiry; socket handshake verifies the same cookie; admin routes guarded by `@AdminOnly()`; `username_only` mode is refused when `NODE_ENV=production`.
* **CSRF**: `SameSite=Lax` cookie + strict CORS origin + JSON bodies; cross-site form posts never carry the session cookie.
* **XSS**: React escaping only, no `dangerouslySetInnerHTML`; SVG uploads are not allowed (extension allow-list), file names are UUIDs.
* **Uploads**: admin only, 8 MB limit, extension allow-list, stored outside the web root and served statically.
* **Bid integrity**: row lock + unique `(auction_id, amount)`; idempotency keys scoped to the user; 3 bids / 2 s per user.
* **Error handling**: generic 500s from Nest, zod issues only on 400s, no stack traces to clients.

## Accepted risks / recommendations before public launch

1. **Content-Security-Policy on the web app**: add a nonce-based policy (Next.js middleware generating a nonce per request) instead of `'unsafe-inline'`. Needed allow-list: `fonts.googleapis.com`/`fonts.gstatic.com`, the API origin for `connect-src` (HTTP + WS), image hosts.
2. **Session revocation**: logout only clears the cookie; a stolen token stays valid up to 12 h. Add a `sessionVersion` on the user checked by the guard, or a Redis deny-list, if that matters for your audience.
3. **Public bid history exposes numeric user ids** (`userId`) alongside display names. Harmless for an internal event; drop the field from the public DTO if the audience is open.
4. **Test auth mode**: in `username_only` mode anyone can log in as any non-admin username. Intended for test campaigns only; switch to `password` (or SSO) for real events.
5. **TLS**: terminate HTTPS at nginx (certbot) so the `Secure` cookie flag and HSTS take effect.
6. Keep `pnpm audit --prod` in CI and bump Next.js when its postcss pin is updated.
