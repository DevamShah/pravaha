FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy source
COPY . .

# Build TypeScript
RUN npx tsc || true

# Run migrations then start
CMD ["sh", "-c", "npx tsx src/db/migrate.ts && npx tsx src/server.ts"]
