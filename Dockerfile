FROM node:22.16.0-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY vendor ./vendor
RUN npm ci
COPY . .
ARG BUILD_MODE=production
ARG VITE_API_BASE_URL
ARG VITE_PUBLIC_BASE
ARG VITE_CATALOG_REMOTE_URL
ARG VITE_CART_REMOTE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_PUBLIC_BASE=$VITE_PUBLIC_BASE VITE_CATALOG_REMOTE_URL=$VITE_CATALOG_REMOTE_URL VITE_CART_REMOTE_URL=$VITE_CART_REMOTE_URL
RUN npm run typecheck && npm run build -- --mode $BUILD_MODE
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
