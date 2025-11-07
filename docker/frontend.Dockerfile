# Multi-stage Dockerfile for Nexus VTT Frontend

# Stage 1: Development
FROM node:25-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# Stage 2: Builder
FROM node:25-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build


# Stage 3: Production
FROM nginx:alpine AS production

# Copy Railway-optimized nginx configuration
# This config is optimized for Railway's architecture where frontend and backend
# are separate services with their own domains (no reverse proxy needed)
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
