
# Giai đoạn 1: Build Backend
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Cài công cụ cần thiết cho thư viện native
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Sao chép file quản lý thư viện
COPY package*.json ./

# Cài tất cả thư viện
RUN npm ci --legacy-peer-deps

# Sao chép mã nguồn
COPY . .

# Biên dịch TypeScript
RUN npm run build

# Chỉ giữ lại thư viện cần thiết khi chạy
RUN npm prune --omit=dev --legacy-peer-deps


# Giai đoạn 2: Chạy Backend
FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Sao chép thư viện production từ giai đoạn build
COPY --from=build /app/node_modules ./node_modules

# Sao chép mã nguồn đã biên dịch
COPY --from=build /app/dist ./dist

# Sao chép package.json
COPY --from=build /app/package.json ./package.json

# Backend sử dụng cổng 3001
EXPOSE 3001

# Khởi chạy ứng dụng
CMD ["npm", "run", "start:prod"]
