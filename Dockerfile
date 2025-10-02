# Multi-stage Dockerfile for TimeTask

# Stage 1: Build the client
FROM node:18-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./
RUN npm ci

# Copy client source code
COPY client/ .

# Build client
RUN npm run build

# Stage 2: Build the server
FROM node:18-alpine AS server-builder

WORKDIR /app/server

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy server package files
COPY server/package*.json ./
RUN npm ci

# Copy server source code
COPY server/ .

# Generate Prisma client
RUN npx prisma generate

# Build server
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 3: Production image
FROM node:18-alpine AS production

# Install necessary packages
RUN apk add --no-cache \
    postgresql-client \
    curl \
    tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built client from client-builder
COPY --from=client-builder --chown=nodejs:nodejs /app/client/dist ./client/dist

# Copy built server from server-builder
COPY --from=server-builder --chown=nodejs:nodejs /app/server/dist ./server/dist
COPY --from=server-builder --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --from=server-builder --chown=nodejs:nodejs /app/server/prisma ./server/prisma
COPY --from=server-builder --chown=nodejs:nodejs /app/server/package.json ./server/package.json

# Copy docker entrypoint script
COPY --chown=nodejs:nodejs scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Copy configuration files
COPY --chown=nodejs:nodejs ecosystem.config.js ./
COPY --chown=nodejs:nodejs server/.env.example ./server/.env.example

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs logs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]

# Start the application (the entrypoint will exec this command)
CMD ["node", "server/dist/index.js"]