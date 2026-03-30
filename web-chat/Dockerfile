# 使用官方Node.js运行时作为基础镜像
# 多阶段构建：第一阶段 - 构建应用
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制包管理文件
COPY package*.json ./

# 安装项目依赖
# --frozen-lockfile: 确保使用package-lock.json中的确切版本
RUN echo "📦 Step 1: Installing dependencies..." && npm ci --frozen-lockfile && echo "✅ Step 1 Complete!"

# 复制项目源代码
COPY . .

# 构建生产版本
# --no-cache: 不使用缓存，确保全新构建
RUN echo "🚀 Step 2: Building Next.js application..." && npm run build && echo "✅ Step 2 Complete!"

# 第二阶段 - 运行应用
FROM node:20-alpine AS runner

# 设置工作目录
WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production

# 创建非root用户运行应用（安全性考虑）
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 复制构建结果从builder阶段
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 设置文件权限
RUN chown -R nextjs:nodejs /app/.next
RUN chown -R nextjs:nodejs /app/public

# 切换到非root用户
USER nextjs

# 暴露端口（Next.js默认端口3000）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ocr/server-tesseract || exit 1

# 启动应用
CMD ["npm", "start"]

# 构建命令: docker build -t ocr-app .
# 运行命令: docker run -p 3000:3000 -d ocr-app