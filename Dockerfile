# Build frontend (VITE_* are baked in at build time)
FROM node:20-alpine AS build
ARG VITE_API_BASE_URL=http://localhost:4000/api
ARG VITE_DEV_API_TARGET=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_DEV_API_TARGET=$VITE_DEV_API_TARGET
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve static build with a tiny runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
RUN addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=2 \
  CMD wget -q --spider http://localhost:4173/ || exit 1
CMD ["serve", "-s", "dist", "-l", "4173"]
