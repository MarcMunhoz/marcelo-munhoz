# Development stage
FROM node:18-alpine as develop

LABEL author="Marcelo Munhoz <me@marcelomunhoz.com>" \
  version="1.0.0" \
  date_created="2023-0-20"

WORKDIR /app

COPY ["package.*", "./"]

RUN apk add exa curl \
  && npm i -g @quasar/cli contentful-cli npm@^9.6.7 \
  && npm i \
  && rm -rf /var/cache/apk/* /var/tmp/* /usr/share/man

COPY . .

# Build stage
FROM develop as build

RUN npm run build \
  && rm -rf /var/cache/apk/* /tmp/* /var/tmp/* /usr/share/man

# Production stage
FROM nginx:1.21-alpine as production

COPY --from=build /app/dist/spa /var/www

COPY ./nginx.conf /etc/nginx/

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
