FROM node:22-alpine

# Enable pnpm
RUN corepack enable

WORKDIR /app

# Copy monorepo files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy app package.json
COPY apps/url-service/package.json apps/url-service/package.json

# Install ONLY url-service deps
RUN pnpm install --filter url-service...

# Copy source
COPY apps/url-service apps/url-service

# Move into app
WORKDIR /app/apps/url-service

EXPOSE 3000
CMD ["pnpm", "start:dev"]
