# Multi-stage build: Vite frontend + Go backend → one small image.

FROM node:22-alpine AS frontend
WORKDIR /src
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM golang:1.24-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.20
RUN adduser -D -u 10001 app && mkdir -p /app/data && chown app /app/data
WORKDIR /app
COPY --from=backend /out/server /app/server
COPY --from=frontend /src/dist /app/static
USER app
ENV ADDR=:8080 DB_PATH=/app/data/site.db STATIC_DIR=/app/static CORS_ORIGIN=
EXPOSE 8080
ENTRYPOINT ["/app/server"]
