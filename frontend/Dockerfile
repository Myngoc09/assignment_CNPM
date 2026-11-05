# Giai đoạn 1: Cài đặt dependencies
FROM node:24-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci


# Giai đoạn 2: Build ứng dụng Next.js
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# Giai đoạn 3: Chạy ứng dụng
FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "run", "start"]