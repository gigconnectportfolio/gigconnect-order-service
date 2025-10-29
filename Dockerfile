FROM node:20.15.0-alpine AS build

#Stage 1:
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY .npmrc ./
COPY tsconfig.jest.json ./
COPY nodemon.json ./
COPY src ./src


RUN npm install && npm ci && npm run build

FROM node:20.15.0-alpine

WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
COPY tsconfig.json ./
COPY .npmrc ./
COPY tsconfig.jest.json ./
COPY nodemon.json ./
COPY src ./src
COPY tools ./tools
RUN npm install -g pm2
RUN npm ci --production
COPY --from=build /app/build ./build

EXPOSE 4006
CMD ["npm", "run", "start"]


