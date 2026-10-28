# Live Auction Platform

Campaign-based live auctions: admin lists products, orders them into a campaign, bidders raise the price in real time,
late bids extend the clock, outbid users get a sound + browser notification, and a winners board ranks lots by price gain.

Security review: `docs/security-review.md`. Design docs: `docs/auction-system-design.html` (architecture, data model, bid engine) and `docs/auction-ui-ux-proposals.html` (UI direction **A – Arena Live** was chosen).

## Stack
Next.js 15 (App Router, Tailwind, next-intl) · NestJS 11 (REST + Socket.IO) · PostgreSQL 16 (Prisma) · Redis 7 · pnpm workspace.

```
apps/api        NestJS API: auth, products, campaigns, auctions, bids (row-locked transaction), realtime gateway, 1 s scheduler
apps/web        Next.js UI: /vi (default) and /en routes, main page, auction detail, my bids, login, admin
packages/shared Types, socket event names, zod schemas, money formatting (VND / USD)
load/           k6 script (100 concurrent bidders)
deploy/         production docker-compose + nginx
```

## Run locally
```bash
pnpm install
docker compose up -d postgres redis          # Postgres on :5433, Redis on :6380
pnpm --filter @auction/shared build
cp .env.example apps/api/.env                # already present in dev; edit if needed
cd apps/api && npx prisma migrate dev && npx ts-node prisma/seed.ts && cd ../..
pnpm --filter @auction/api dev               # http://localhost:4000/api
pnpm --filter @auction/web dev               # http://localhost:3000  (redirects to /vi)
```
Seed creates campaign "Đấu giá Mùa Thu 2026" with 10 lots (some ended, some live, some upcoming),
admin `admin` / `admin123`, and users `nguyenan`, `tranbinh`, `lechi`, `hoangdung`, `phamhuy`.

### Auth modes (`AUTH_MODE` in `apps/api/.env`)
* `username_only` (dev/test default): any username logs in and is auto-created; admin accounts still need their password. Refused when `NODE_ENV=production`.
* `password`: username + password for everyone.
* SSO later: implement `AuthProvider` (`apps/api/src/auth/providers/auth-provider.ts`) and bind it in `auth.module.ts`.

### Currency & language
Currency is set per campaign (`VND` default, or `USD`). UI language comes from the URL prefix (`/vi`, `/en`), stored on the user profile when logged in.

## Key behaviours
* **Bids** go through `POST /api/auctions/:id/bids` inside one Postgres transaction holding `SELECT … FOR UPDATE` on the auction row. Two users bidding the same price at the same instant: the first wins, the second gets `409 BID_TOO_LOW` with the new minimum. `UNIQUE(auction_id, amount)` is the backstop.
* **Anti-sniping**: a bid in the last `extend_window_s` seconds adds `extend_by_s` seconds to `current_end_at` (capped by `max_extensions`), decided under the same lock.
* **Auto bid (proxy)**: `PUT /api/auctions/:id/auto-bid { maxPrice }`. Setting a maximum places the user's first step immediately. Afterwards the scheduler replies one step at a time, `AUTO_BID_DELAY_MS` (default 1 s) after the last bid, for the strongest non-leading auto bidder (highest max, then earliest), so a proxy war is visible step by step. Only the two highest maximums matter; the higher one ends up leading at the lower maximum (or one step above it). Auto bids are flagged `isAuto` in history and never extend the clock, so a war still running at the end is decided by whoever leads when the clock stops. Auto bids set on a pending lot fire when it starts. Admin switch: `PUT /api/admin/settings { autoBidEnabled }` (also a toggle in the admin header); when off, new auto bids are rejected and existing ones are paused.
* **Scheduler** (1 s): `pending → live` at `start_at`, `live → ended` at `current_end_at`, writes `auction_results` (winner, final price, price gain).
* **Realtime** rooms: `auction:{id}`, `campaign:{id}`, `user:{id}`. Outbid/won alerts go to the user room.
* **Rate limit** 3 bids / 2 s per user; **idempotency key** per submit (60 s) prevents double bids on retry.
* **Server clock**: every event carries `serverTime`; the UI renders countdowns from the offset.

## Load test
```bash
k6 run -e AUCTION_ID=<live id> load/bids.k6.js        # 100 VUs, 60 s, p95 bid latency < 150 ms
```

## Production
```bash
cp deploy/.env.example deploy/.env && edit it
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```
