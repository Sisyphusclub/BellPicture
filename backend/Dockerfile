# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
ENV HUSKY=0
WORKDIR /app/backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
ENV HUSKY=0
WORKDIR /app/backend
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/tsconfig*.json ./
COPY backend/drizzle.config.ts ./
COPY backend/src ./src
COPY backend/drizzle ./drizzle
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app/backend
RUN mkdir -p /app/data /app/tmp/uploads /app/tmp/outputs \
  && chown -R node:node /app /app/data /app/tmp
COPY --from=build --chown=node:node /app/backend/package*.json ./
COPY --from=build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --from=build --chown=node:node /app/backend/drizzle ./drizzle
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
