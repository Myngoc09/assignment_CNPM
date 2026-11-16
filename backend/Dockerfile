FROM node:22-bookworm-slim

WORKDIR /app

# Công cụ cần thiết để cài các thư viện native như bcrypt, better-sqlite3
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Cài dependencies đúng theo package-lock.json
COPY package*.json ./
RUN npm ci

# Chép source và build NestJS
COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
