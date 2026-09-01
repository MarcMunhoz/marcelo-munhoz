# Development stage
FROM node:22.22-alpine AS base

LABEL author="Marcelo Munhoz <me@marcelomunhoz.com>" \
  version="2.2.1" \
  date_created="2023-0-20" \
  modified="2026-08-31"

WORKDIR /app

COPY ["./app/package*.json", "./"]

RUN apk add --no-cache eza \
  && npm i -g @quasar/cli contentful-cli \
  && npm install

COPY ./app .

# Develop stage
FROM base AS develop
EXPOSE 1991 3000
CMD [ "npm", "run", "dev" ]

# Production stage
FROM base AS production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# Isolated test stages intentionally exclude local environment files through
# .dockerignore and never use the development compose service.
FROM node:22.22.2-alpine AS test-dependencies

WORKDIR /app

COPY ["./app/package*.json", "./"]

RUN npm ci --ignore-scripts

FROM node:22.22.2-alpine AS test-runtime

WORKDIR /app

COPY --from=test-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node ./app ./

USER node
ENV NODE_ENV=test

# Cypress provides the exact Chrome and Firefox versions selected in the
# OpenSpec compatibility record. Cypress itself is installed only in-image.
FROM cypress/browsers:node-22.21.0-chrome-141.0.7390.107-1-ff-144.0-edge-141.0.3537.92-1 AS test-browser-runtime

WORKDIR /app
ENV CYPRESS_CACHE_FOLDER=/opt/cypress-cache

RUN mkdir -p /opt/cypress-cache \
  && chown 1001:1001 /app /opt/cypress-cache

USER 1001

COPY --chown=1001:1001 ["./app/package*.json", "./"]

RUN npm ci

COPY --chown=1001:1001 ./app ./

ENV NODE_ENV=test
