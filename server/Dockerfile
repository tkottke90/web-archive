FROM node:18 AS build_stage

ARG BRANCH
ARG COMMIT

ENV BRANCH=${BRANCH}
ENV COMMIT=${COMMIT}

RUN echo "Image Details: $BRANCH | $COMMIT"

WORKDIR /usr/app/

COPY ./dist .
COPY ./prisma ./prisma
COPY README.md .
COPY package.json .
COPY package-lock.json .

RUN npm install --production
RUN npx prisma generate

CMD [ "node", "index.js"]

ENV PORT 3000
ENV NODE_ENV production

EXPOSE 3000