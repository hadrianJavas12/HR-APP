FROM node:20-alpine AS base
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Ensure /app is owned by node user
RUN chown node:node /app

# Copy package files (lock file too if it exists)
COPY --chown=node:node package.json package-lock.json* ./

# Install dependencies (use npm ci if lock file present, else npm install)
RUN if [ -f package-lock.json ]; then \
      npm ci --production=false; \
    else \
      npm install --production=false; \
    fi

# Copy source code
COPY --chown=node:node src/ ./src/

# Verify entry point exists
RUN ls -la src/index.js && node -e "console.log('Node', process.version, 'OK')"

# ── Development ──────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
# Copy remaining files for dev (eslint, jest, etc.)
COPY --chown=node:node . .
EXPOSE 3000
CMD ["dumb-init", "npx", "nodemon", "src/index.js"]

# ── Production ───────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
RUN npm prune --production

# Fix ownership of node_modules after prune
RUN chown -R node:node /app

# Verify critical production dependencies exist
RUN node -e "import('express').then(() => console.log('express OK'))" && \
    node -e "import('knex').then(() => console.log('knex OK'))" && \
    node -e "import('pg').then(() => console.log('pg OK'))" && \
    node -e "import('ioredis').then(() => console.log('ioredis OK'))" && \
    node -e "import('bullmq').then(() => console.log('bullmq OK'))"
EXPOSE 3000
USER node
CMD ["dumb-init", "node", "src/index.js"]
