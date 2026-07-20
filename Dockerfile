FROM node:24 AS build_stage

ARG BRANCH
ARG COMMIT
ARG VERSION
ARG BUILD_DATE

ENV BRANCH=${BRANCH}
ENV COMMIT=${COMMIT}
ENV VERSION=${VERSION}
ENV BUILD_DATE=${BUILD_DATE}

RUN echo "Image Details: $BRANCH | $COMMIT | $VERSION"

WORKDIR /usr/app/

# ffmpeg is required by yt-dlp to merge video/audio streams and by the transcode job
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Standalone yt-dlp binary (no Python dependency, supports self-update via --update)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
      -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Install Files
COPY ./server/dist .
COPY ./server/prisma ./prisma
COPY ./server/public ./public
COPY ./server/README.md .
COPY ./server/package.json .
COPY ./server/bin/entrypoint.sh .

COPY ./node_modules ./node_modules
COPY ./packages/shared/dist ./packages/shared/dist
COPY ./packages/shared/package.json ./packages/shared/package.json

RUN npx prisma generate

CMD [ "./entrypoint.sh" ]

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000