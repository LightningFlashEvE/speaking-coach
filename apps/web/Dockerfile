# 前端 Dockerfile
FROM node:24-alpine AS base

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# 安装依赖
RUN pnpm install

# 复制源代码
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# 构建
ARG NEXT_PUBLIC_API_URL=http://localhost:7539
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN cd apps/web && pnpm build

# 生产镜像
FROM node:24-alpine
WORKDIR /app
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/package.json ./apps/web/
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000

WORKDIR /app/apps/web
CMD ["pnpm", "start"]
