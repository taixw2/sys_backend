# 使用官方 Bun 镜像
FROM oven/bun:1 as base

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 bun.lockb
COPY package.json bun.lockb ./

# 安装依赖
RUN bun install --frozen-lockfile

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN bun run db:generate

# 构建应用
RUN bun run build

# 生产阶段
FROM oven/bun:1-slim

WORKDIR /app

# 复制构建产物和必要文件
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./
COPY --from=base /app/bun.lockb ./
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/generated ./generated

# 安装生产依赖
RUN bun install --frozen-lockfile --production

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bun -u 1001

# 创建日志目录
RUN mkdir -p /var/log/english-admin && chown -R bun:nodejs /var/log/english-admin

# 切换到非 root 用户
USER bun

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

# 启动应用
CMD ["bun", "dist/index.js"] 