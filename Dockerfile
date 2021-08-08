FROM node:14-alpine

LABEL author="Marcelo Munhoz <me@marcelomunhoz.com>" \
  version="1.0.0" \
  date_created="2021-07-16" \
  deploy="2021-07-16"

COPY package.json .

RUN npm i -g nuxt

COPY package-lock.json .

RUN npm up && npm i && npm audit fix