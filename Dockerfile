# Node 22 on Alpine with build tools for native better-sqlite3 compilation
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# Production runtime stage
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY server ./server
COPY public ./public

# Pre-seed SQLite database
RUN node server/seed.js

EXPOSE 8080
CMD ["node", "server/index.js"]
