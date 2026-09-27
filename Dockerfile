FROM node:20-alpine AS publication
WORKDIR /source
COPY *.html *.css *.js ./
COPY pages ./pages
COPY translations ./translations
COPY assets/images ./assets/images
COPY deploy ./deploy
ARG SOURCE_REVISION=unrecorded-local-build
RUN SOURCE_REVISION="$SOURCE_REVISION" node deploy/build-public.mjs /source /publication

FROM node:20-alpine
WORKDIR /site
COPY --from=publication /publication/ ./
ENV NODE_ENV=production PORT=8080 BASE_DIR=/site
USER node
EXPOSE 8080
CMD ["node", "/site/server.js"]
