FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are baked into the client bundle at build time.
ARG NEXT_PUBLIC_FAUCET_API_BASE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_NETWORK_NAME
ARG NEXT_PUBLIC_EXPLORER_TX_URL_TEMPLATE
ARG NEXT_PUBLIC_ALLOWED_CHAIN_IDS
ENV NEXT_PUBLIC_FAUCET_API_BASE_URL=$NEXT_PUBLIC_FAUCET_API_BASE_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_NETWORK_NAME=$NEXT_PUBLIC_NETWORK_NAME
ENV NEXT_PUBLIC_EXPLORER_TX_URL_TEMPLATE=$NEXT_PUBLIC_EXPLORER_TX_URL_TEMPLATE
ENV NEXT_PUBLIC_ALLOWED_CHAIN_IDS=$NEXT_PUBLIC_ALLOWED_CHAIN_IDS

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

