FROM node:18 AS build_stage

WORKDIR /usr/build/

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:18

WORKDIR /usr/app/

COPY --from=build_stage /usr/build/dist /usr/app/dist
COPY package*.json ./

COPY ./server .

RUN npm ci

CMD [ "node", "server/index.js"]

ENV PORT 3000
ENV NODE_ENV production

EXPOSE 3000