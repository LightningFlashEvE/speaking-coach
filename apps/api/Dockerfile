# 后端 Dockerfile
FROM node:24-alpine AS base

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# 安装依赖
RUN pnpm install

# 复制源代码
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# 生成 Prisma Client
RUN cd apps/api && npx prisma generate

# 编译
RUN pnpm exec tsc --project apps/api/tsconfig.build.json

# 生产镜像
FROM node:24-alpine
WORKDIR /app
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/package.json ./
COPY --from=base /app/apps/api/prisma ./prisma

EXPOSE 7539

CMD ["node", "dist/main.js"]
