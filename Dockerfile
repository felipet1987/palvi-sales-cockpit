# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM docker.io/library/node:20-alpine AS build
WORKDIR /app

# Cache-friendly: copy lockfile first so npm ci is reused on source-only edits
COPY package.json package-lock.json ./
RUN npm ci

# Sources
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY metrics.json ./
COPY src ./src

RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM docker.io/library/nginx:1.27-alpine AS serve

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
