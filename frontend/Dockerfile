FROM node:20-alpine AS build
WORKDIR /app

# Build mode: "development" or "production"
# Vite reads .env.development or .env.production based on --mode
ARG VITE_MODE=production

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build -- --mode ${VITE_MODE}

# ── Production: serve with nginx ─────────────────
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
