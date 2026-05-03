FROM node:22-alpine

# Enable pnpm
RUN corepack enable

WORKDIR /app

# Copy monorepo files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy service & packages source 
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY packages packages

# Install deps 
RUN pnpm install --filter auth-service...

# Copy source
COPY apps/auth-service apps/auth-service

# Build packages
RUN pnpm -r --filter ./packages/** build

# Move into app
WORKDIR /app/apps/auth-service

EXPOSE 3300
CMD ["pnpm", "start:dev"]
