# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
ENV HUSKY=0
WORKDIR /app/frontend
ARG VITE_API_BASE_URL=http://localhost:5173
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
