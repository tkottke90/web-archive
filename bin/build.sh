#! /bin/bash

IMAGE_NAME="web-archive"
LOCAL_IMAGE_NAME="$IMAGE_NAME:local"

# Build Backend
npm run build

# Remove dev dependencies
npm prune --omit=dev

# Build Docker Image
docker buildx build \
  --platform linux/amd64 \
  --build-arg BRANCH=$(git rev-parse --abbrev-ref HEAD) \
  --build-arg COMMIT=$(git rev-parse --short HEAD) \
  --build-arg VERSION=$(node -p "require('./package.json').version") \
  -t $LOCAL_IMAGE_NAME .

# Tag Image with Version
VERSION=$(node -p "require('./package.json').version")
docker tag "$LOCAL_IMAGE_NAME" docker.artifacts.tdkottke.com/$IMAGE_NAME:$VERSION

# Tag Image as Latest
docker tag "$LOCAL_IMAGE_NAME" docker.artifacts.tdkottke.com/$IMAGE_NAME:latest

# Push to Private Registry
docker push docker.artifacts.tdkottke.com/$IMAGE_NAME:latest
docker push docker.artifacts.tdkottke.com/$IMAGE_NAME:$VERSION

# Cleanup local image
docker rmi "$LOCAL_IMAGE_NAME"

# Reinstall dev dependencies

npm install