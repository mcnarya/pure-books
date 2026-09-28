# Stage 1: Build Frontend
FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3004
ENV DATA_PATH=/data/library.json
ENV AUTH_DATA_PATH=/data/auth.json

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 3004

VOLUME ["/data"]

CMD ["node", "server/index.js"]
