# ---- Stage 1: Build React Frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: Production Server ----
FROM node:20-alpine AS production

# Chromium for Puppeteer PDF export
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built frontend into server's expected location
COPY --from=frontend-build /app/client/dist ./client/dist

# Create uploads directory
RUN mkdir -p ./server/uploads

# OpenShift random UID compatibility: make app files group-writable for GID 0
RUN chgrp -R 0 /app && chmod -R g=u /app

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app/server
CMD ["node", "index.js"]
