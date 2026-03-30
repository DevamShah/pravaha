FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Run
EXPOSE 3000
CMD ["npm", "start"]
