FROM node:16-alpine3.12

LABEL author="Marcelo Munhoz <me@marcelomunhoz.com>" \
  version="1.0.0" \
  date_created="2021-07-16" \
  deploy="2021-07-16"

ARG APP_PATH=/app

ENV PORT=4242

COPY ["package.json", "yarn.lock", "./"]

RUN yarn global add nuxt \
  && yarn \
  && rm -rf /var/cache/apk/* /tmp/* /var/tmp/* /usr/share/man

WORKDIR $APP_PATH

VOLUME $APP_PATH

ENTRYPOINT ["yarn", "dev"]