FROM node:24.18.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:24.18.0-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 FOOD_FLOW_DB=/var/lib/food-flow/food-flow.sqlite
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && mkdir -p /var/lib/food-flow && chown node:node /var/lib/food-flow
COPY --from=build /app/dist ./dist
COPY src ./src
COPY server ./server
USER node
EXPOSE 3001
CMD ["node", "server/production.js"]
