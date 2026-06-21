FROM node:24 AS build_stage

ARG BRANCH
ARG COMMIT

ENV BRANCH=${BRANCH}
ENV COMMIT=${COMMIT}

RUN echo "Image Details: $BRANCH | $COMMIT"

WORKDIR /usr/app/

# Lawsuit prevents the download of this tool
RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl

# Install Files
COPY ./server/dist .
COPY ./server/prisma ./prisma
COPY ./server/public ./public
COPY ./server/README.md .
COPY ./server/package.json .
COPY ./server/package-lock.json .
COPY ./server/bin/entrypoint.sh .
# COPY ./server/bin/youtube-dl /usr/local/bin/youtube-dl

RUN chmod a+rx /usr/local/bin/youtube-dl

RUN npm install --production
RUN npx prisma generate

CMD [ "./entrypoint.sh" ]

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000