[![codecov](https://codecov.io/gh/hiMunhoz/marcelo-munhoz/branch/develop/graph/badge.svg?token=${CODECOV_BADGE_TK})](https://codecov.io/gh/hiMunhoz/marcelo-munhoz)

# Build Setup (No Docker)

**\* Node 14 is required on hosts without Docker**

```bash
# install dependencies
$ npm i

# serve with hot reload at localhost:4242
$ npm run dev

# build for production and launch server
$ npm run build
$ npm run start

# generate static project
$ npm run generate
```

# Docker

**Development mode:**

```bash
$ docker build -t marcelo-munhoz .

$ docker run -dp 4242:4242 --name marcelo-munhoz-ctn marcelo-munhoz_img sh -c "npm run dev"
```

# Docker Compose

**Development mode:**

```bash
$ docker-compose up -d
```

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).
