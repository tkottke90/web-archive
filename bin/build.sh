#! /bin/bash

IMAGE_NAME="web-archive"
LOCAL_IMAGE_NAME="$IMAGE_NAME:local"

# Build Backend
npm run build

# Build Docker Image
docker buildx build --platform linux/amd64 -t finance:local .

# Tag Image with Version
VERSION=$(node -p "require('./package.json').version")
docker tag "$LOCAL_IMAGE" docker.artifacts.tdkottke.com/$IMAGE_NAME:$VERSION

# Tag Image as Latest
docker tag "$LOCAL_IMAGE" docker.artifacts.tdkottke.com/$IMAGE_NAME:latest

# Push to Private Registry
docker push docker.artifacts.tdkottke.com/$IMAGE_NAME:latest
docker push docker.artifacts.tdkottke.com/$IMAGE_NAME:$VERSION

# Cleanup local image
docker rmi "$LOCAL_IMAGE"