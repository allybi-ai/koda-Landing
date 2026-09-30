# Production image for allybi.com.br: the designer's source, adapted by deploy/build-public.mjs.
# Build from the repository root: docker build -f deploy/Dockerfile --build-arg SOURCE_REVISION=<commit> .
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS publication
WORKDIR /source
COPY . .
ARG SOURCE_REVISION=unrecorded-local-build
RUN SOURCE_REVISION="$SOURCE_REVISION" node deploy/build-public.mjs /source /publication \
 && cd /publication && npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
WORKDIR /site
COPY --from=publication /publication/ ./
ENV NODE_ENV=production PORT=8080 BASE_DIR=/site
USER node
EXPOSE 8080
CMD ["node", "/site/server.js"]
