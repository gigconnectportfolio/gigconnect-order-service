# 1. Define ARG at the top so it's available to all stages
ARG NPM_TOKEN

# -------------------------------------------
FROM node:20-alpine AS build
ARG NPM_TOKEN
ENV NPM_TOKEN_TO_USE=${NPM_TOKEN}
# -------------------------------------------

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.jest.json ./

RUN echo "Creating .npmrc file now." && \
    echo "@kariru-k:registry=https://npm.pkg.github.com/kariru-k" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN_TO_USE}" >> .npmrc

RUN echo "--- .npmrc contents for build stage ---" && cat .npmrc

RUN npm ci

COPY src ./src
COPY nodemon.json ./
RUN npm run build

# -------------------------------------------
FROM node:20-alpine AS production
ARG NPM_TOKEN
ENV NPM_TOKEN_TO_USE=${NPM_TOKEN}
# -------------------------------------------

WORKDIR /app

RUN apk add --no-cache curl && npm install -g pm2

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.jest.json ./
COPY nodemon.json ./

RUN echo "@kariru-k:registry=https://npm.pkg.github.com/kariru-k" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN_TO_USE}" >> .npmrc

RUN echo "--- .npmrc contents for production stage ---" && cat .npmrc

RUN npm ci --omit=dev

COPY --from=build /app/build ./build

EXPOSE 4006
CMD ["npm", "run", "start"]
