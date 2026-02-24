FROM node:20-alpine AS base
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production=false

# Copy source
COPY . .

# ── Development ──────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["dumb-init", "npx", "nodemon", "src/index.js"]

# ── Production ───────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
RUN npm prune --production
EXPOSE 3000
USER node
CMD ["dumb-init", "node", "src/index.js"]
