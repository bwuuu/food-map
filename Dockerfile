# Build the map page; a broken commit fails here instead of shipping.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run check && npm run build

# Run the server. Node 24 strips TypeScript types itself: no compile step.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data WEB_DIR=/app/dist
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# All of src/: the server imports shared modules (place.ts, coords.ts) at runtime.
# Copying only src/server once shipped an image that crashed on start (#14).
COPY src src
COPY --from=build /app/dist dist
# uid 1000, the same as the host user who owns ./data.
# ponytail: assumes that uid; add a chown entrypoint (see mindmapp) if the host user differs.
USER node
EXPOSE 8080
CMD ["node", "src/server/index.ts"]
