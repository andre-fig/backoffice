FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
WORKDIR /app/admin-ui
RUN npx vite build


FROM nginx:1.27-alpine AS runtime

COPY admin-ui/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/admin-ui /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
