FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./

RUN npm ci --ignore-scripts

FROM base AS build

COPY . .

RUN npx nx build api --configuration=production

RUN npx nx run api:prune || echo "Prune target not configured; skipping"


FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts || npm install --production --ignore-scripts

COPY --from=build /app/dist/apps/api ./dist/apps/api
EXPOSE 3000
ENV PORT=3000
CMD [ "node", "dist/apps/api/main.js" ]
