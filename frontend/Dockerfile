# syntax=docker/dockerfile:1
# Using Chainguard Node image — continuously rebuilt, 0 CVEs
FROM cgr.dev/chainguard/node:latest-dev AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

FROM cgr.dev/chainguard/node:latest-dev AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM cgr.dev/chainguard/node:latest-dev AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Chainguard runs as nonroot by default — no USER directive needed
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
