FROM node:20-alpine

# Enable pnpm
RUN corepack enable

WORKDIR /app

# Copy monorepo files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy service package.json
COPY apps/web/package.json apps/web/package.json

# Install deps
RUN pnpm install --filter web...

# Copy source
COPY apps/web apps/web

# Move into app
WORKDIR /app/apps/web

EXPOSE 3000
CMD ["pnpm", "dev"]
