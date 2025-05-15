# Development stage
FROM node:22-alpine AS develop

LABEL author="Marcelo Munhoz <me@marcelomunhoz.com>" \
  version="1.0.0" \
  date_created="2023-0-20"

WORKDIR /app

COPY ["./app/package.*", "./"]

RUN apk add exa curl \
  && npm i -g @quasar/cli contentful-cli \
  && npm i \
  && rm -rf /var/cache/apk/* /var/tmp/* /usr/share/man

COPY . .

EXPOSE 3200 3000

# Build stage
FROM develop AS build

RUN npm run build \
  && rm -rf /var/cache/apk/* /tmp/* /var/tmp/* /usr/share/man

# Production stage
FROM nginx:1.28-alpine AS production

COPY --from=build /app/dist/spa /var/www

COPY ./nginx.conf /etc/nginx/

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
