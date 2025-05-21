# Development stage
FROM node:22-alpine AS base

LABEL author="Marcelo Munhoz <me@marcelomunhoz.com>" \
  version="1.0.0" \
  date_created="2023-0-20" \
  modified="2025-19-05"

WORKDIR /app

COPY ["./app/package.*", "./"]

RUN apk add exa \
  && npm i -g @quasar/cli contentful-cli npm@^11.4.0 \
  && npm i \
  && rm -rf /var/cache/apk/* /var/tmp/* /usr/share/man

COPY ./app .

# Develop stage
FROM base AS develop
EXPOSE 4242 3000
CMD [ "npm", "run", "dev" ]

# Production stage
FROM base AS production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]