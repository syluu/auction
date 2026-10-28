# ---------- build ----------
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate
WORKDIR /app
# manifests first so dependency install is cached between source changes
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @auction/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @auction/shared build \
 && pnpm --filter @auction/api exec prisma generate \
 && pnpm --filter @auction/api build

# ---------- runtime ----------
FROM node:22-alpine
RUN apk add --no-cache wget
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /var/www/uploads && chown -R node:node /var/www/uploads /app
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
