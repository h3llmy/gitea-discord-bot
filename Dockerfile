FROM oven/bun:1 AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --chown=bun:bun --from=deps /app/node_modules ./node_modules
COPY --chown=bun:bun --from=build /app/dist ./dist
COPY --chown=bun:bun package.json ./
RUN mkdir -p /app/data && chown bun:bun /app/data
USER bun
CMD ["bun", "dist/main.js"]
