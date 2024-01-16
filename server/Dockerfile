FROM node:18 AS build_stage

ARG BRANCH
ARG COMMIT

ENV BRANCH=${BRANCH}
ENV COMMIT=${COMMIT}

RUN echo "Image Details: $BRANCH | $COMMIT"

WORKDIR /usr/app/

# Lawsuit prevents the download of this tool
# RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl

# Install Files
COPY ./dist .
COPY ./prisma ./prisma
COPY README.md .
COPY package.json .
COPY package-lock.json .
COPY bin/entrypoint.sh .
COPY bin/youtube-dl /usr/local/bin/youtube-dl

RUN chmod a+rx /usr/local/bin/youtube-dl

RUN npm install --production
RUN npx prisma generate

CMD [ "./entrypoint.sh" ]

ENV PORT 3000
ENV NODE_ENV production

EXPOSE 3000