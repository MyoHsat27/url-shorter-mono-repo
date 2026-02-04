FROM node:22-alpine

# Enable pnpm
RUN corepack enable

WORKDIR /app

# Copy monorepo files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service & packages source 
COPY apps/analytics-service/package.json apps/analytics-service/package.json
COPY packages packages

# Install deps 
RUN pnpm install --filter analytics-service...

# Copy source
COPY apps/analytics-service apps/analytics-service

# Build packages
RUN pnpm -r --filter ./packages/** build

# Move into app
WORKDIR /app/apps/analytics-service

EXPOSE 3000
CMD ["pnpm", "start:dev"]
