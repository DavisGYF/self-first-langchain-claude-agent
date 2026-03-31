# Web-Chat 项目上线部署完整记录

> **记录日期**: 2026 年 3 月 30 日
> **项目地址**: https://github.com/DavisGYF/self-first-langchain-claude-agent
> **服务器 IP**: 8.146.205.75
> **部署方式**: PM2 + Node.js (最终成功), Docker (失败)

---

## 📋 一、上线前的准备工作

### 1.1 需要创建的配置文件

#### `.env.local` - 本地环境变量配置

```bash
LLM_API_KEY=sk-(一串数字 你自己真正的key)
LLM_BASE_URL=https://api.deepseek.com/v1

# 阿里云 OCR 配置（可选）
ALIYUN_ACCESS_KEY_ID=<your_access_key_id>
ALIYUN_ACCESS_KEY_SECRET=<your_access_key_secret>
```

**作用说明：**

- `LLM_API_KEY`: AI 模型的 API 密钥，用于调用大模型 API
- `LLM_BASE_URL`: AI 模型的 API 地址，DeepSeek 使用此地址
- `ALIYUN_ACCESS_KEY_ID/SECRET`: 阿里云 OCR 服务的访问密钥（如需要使用 OCR 功能）

**注意事项：**

- 该文件包含敏感信息，**不要提交到 Git**（已在 .gitignore 中忽略）
- 生产环境需要在服务器上创建对应的 `.env.production` 或 `.env.local` 文件

#### `Dockerfile` - Docker 镜像构建文件

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
RUN chown -R nextjs:nodejs /app/.next
RUN chown -R nextjs:nodejs /app/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ocr/server-tesseract || exit 1
CMD ["npm", "start"]
```

**作用说明：**

- **第一阶段 (builder)**: 使用 Node.js 20 基础镜像，安装依赖并构建 Next.js 生产版本
- **第二阶段 (runner)**: 使用轻量级镜像运行应用，创建非 root 用户提高安全性
- **健康检查**: 定期检查 API 是否正常工作

**关键修改点：**

- 最初使用 `node:18-alpine`，但 Next.js 16.x 需要 Node.js 20+，所以升级为 `node:20-alpine`

#### `docker-compose.yml` - Docker 容器编排文件

```yaml
version: "3.8"
services:
  web-chat:
    build:
      context: .
      args:
        USE_CN_APT: "true"
        NPM_REGISTRY: "https://registry.npmmirror.com"
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - projects-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
networks:
  projects-network:
    driver: bridge
```

**作用说明：**

- `build.context`: 指定构建上下文为当前目录
- `args`: 构建参数，配置国内镜像源加速安装
- `ports`: 端口映射，外部 3001 → 内部 3000
- `restart`: 容器崩溃后自动重启
- `logging`: 限制日志文件大小，防止磁盘被占满

#### `tsconfig.json` - TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules", "test-ocr.tsx"]
}
```

**作用说明：**

- `strict: true`: 启用严格类型检查
- `paths`: 配置路径别名 `@/` 指向根目录
- `exclude`: 排除测试文件 `test-ocr.tsx`（该文件引用了不存在的组件）

---

## 🚀 二、服务器部署流程

### 2.1 初始步骤

```bash
# 1. 登录服务器
ssh root@8.146.205.75

# 2. 创建项目目录
mkdir -p /root/self-first-langchain-claude-agent/web-chat
cd /root/self-first-langchain-claude-agent/web-chat

# 3. 拉取代码
git clone git@github.com:DavisGYF/self-first-langchain-claude-agent.git .
cd web-chat
```

### 2.2 遇到的问题及解决方案

---

## ❌ 问题 1: Docker 镜像拉取失败

### 错误现象

```
[internal] load metadata for docker.io/library/node:20-alpine  491.5s
=> => sha256:d7f6aca05b78f475975eeac3898b7ef0a618937174c469650e05e81cbf8c5f46 2.10MB / 43.23MB  491.4s
```

- 卡在拉取 `node:20-alpine` 镜像
- 下载速度极慢，43MB 用了 8 分钟还在下载

### 第一次尝试解决：配置 Docker 镜像加速器

**我的思路：**
之前部署 OCR 项目时，遇到类似问题，通过配置阿里云 Docker 镜像加速器解决了。我认为这次也可以同样处理。

**执行命令：**

```bash
# 获取镜像加速地址（从阿里云控制台）
# 阿里云控制台 → 容器镜像服务 ACR → 镜像工具 → 镜像加速器

sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["https://atmhzs3o.mirror.aliyuncs.com"]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
docker info | grep "Registry Mirrors"
```

**为什么失败：**

1. 配置后 `docker info` 显示没有生效
2. 即使配置了，拉取 `docker.io` 的镜像仍然失败
3. 可能是阿里云镜像加速器对某些镜像不支持，或者网络策略限制

**第二次尝试：更换镜像源**

```bash
# 尝试用阿里云的公共镜像
docker pull registry.cn-hangzhou.aliyuncs.com/library/node:20-alpine
# 报错：pull access denied，需要登录认证

# 尝试其他版本
docker pull node:20-bookworm-slim
# 同样失败
```

**最终放弃原因：**

- 耗时太长（等了 8 分钟还在拉）
- 多次尝试都失败
- 怀疑是阿里云的网络策略限制了对 `docker.io` 的直接访问

---

## ❌ 问题 2: TypeScript 类型错误导致构建失败

### 错误现象

```
./app/api/ocr/tesseract/route.ts:92:21
Type error: Property 'words' does not exist on type 'Page'.

92 |     if (result.data.words) {
   |                     ^

./app/api/ocr/tesseract/route.ts:110:21
Type error: Property 'lines' does not exist on type 'Page'.
```

### 第一次尝试解决：直接注释掉报错代码

**我的思路：**
看到类型错误，我第一时间想到可能是 Tesseract.js 的类型定义有问题。我想直接注释掉相关代码来绕过错误。

**为什么没用：**

- 这不是运行错误，是编译时的类型检查错误
- 注释代码会影响功能完整性
- 更好的方法是添加类型断言

**正确的解决方法：**

```typescript
// 修改前
if (result.data.words) {
  result.data.words.forEach(...)
}

// 修改后
if ((result as any).data?.words) {
  (result as any).data.words.forEach(...)
}
```

**原理说明：**

- `(result as any)`: 将 result 强制转换为 any 类型，绕过类型检查
- `?.`: 可选链操作符，安全访问可能不存在的属性

---

## ❌ 问题 3: 测试文件导致构建失败

### 错误现象

```
./test-ocr.tsx:2:22
Type error: Cannot find module '@/components/ImageOCR' or its corresponding type declarations.
```

### 分析原因

- `test-ocr.tsx` 是一个测试文件，引用了不存在的组件 `ImageOCR`
- 该文件不在正式项目中，只是临时测试用的
- TypeScript 在编译时会检查所有 `.ts` 和 `.tsx` 文件

### 解决方法

在 `tsconfig.json` 中添加排除项：

```json
"exclude": ["node_modules", "test-ocr.tsx"]
```

**为什么第一次没想到：**

1. 只关注了主要代码的错误，忽略了测试文件
2. 没有检查项目目录下是否有不需要编译的文件
3. 应该先查看完整的构建输出，找出所有错误

---

## ❌ 问题 4: 端口被占用

### 错误现象

```
Error: listen EADDRINUSE: address already in use :::3001
```

### 分析原因

- 之前用 `nohup` 启动了服务，进程在后台运行
- 即使关闭了终端，`nohup` 启动的进程不会停止
- 再次启动时端口已被占用

### 解决方法

```bash
# 查看占用端口的进程
lsof -i :3001
# 或
fuser -n tcp 3001

# 杀掉进程
fuser -k 3001/tcp
# 或
pkill -9 -f "npm"
pkill -9 -f "node"

# 重新启动
PORT=3001 HOSTNAME=0.0.0.0 npm start
```

**为什么第一次没想到用 `fuser`：**

1. 只知道 `pkill`，不知道 `fuser` 可以按端口查杀进程
2. 没有理解 `lsof` 和 `fuser` 的区别
3. 应该先学习 Linux 进程管理的基础命令

---

## ❌ 问题 5: 环境变量未生效

### 错误现象

浏览器提示："未配置 API Key"

### 分析原因

1. Next.js 在生产环境下读取的是 `.env.production` 或 `.env.local`
2. 修改了环境变量后，**必须重新构建**才能生效
3. `npm start` 只会读取构建时已经打包进去的环境变量

### 第一次尝试解决：直接重启服务

```bash
pkill -f "next start"
PORT=3001 HOSTNAME=0.0.0.0 npm start
```

**为什么失败：**

- 环境变量是在 `npm run build` 时被打包进代码的
- 只重启服务不会重新读取环境变量文件

**正确的解决方法：**

```bash
# 必须先重新构建
npm run build

# 然后启动
PORT=3001 HOSTNAME=0.0.0.0 npm start
```

**为什么第一次没想到：**

1. 误以为环境变量是运行时读取的
2. 不了解 Next.js 的构建机制
3. 应该先查阅 Next.js 官方文档关于环境变量的说明

---

## ❌ 问题 6: 安全组配置错误

### 错误现象

浏览器访问 `http://8.146.205.75:3001` 显示 HTTP 502 Bad Gateway

### 分析原因

1. 服务器本地访问正常 (`curl http://localhost:3001` 能返回 HTML)
2. 但公网无法访问
3. 阿里云安全组没有放行 3001 端口

### 第一次尝试解决：配置第一个安全组

```bash
# 在阿里云控制台 → 安全组 → 管理规则 → 添加入站规则
# 端口：3001/3001
# 授权对象：0.0.0.0/0
```

**为什么失败：**

- 实例绑定的是第二个安全组（sg-2ze9n...），不是第一个（sg-2ze5a...）
- 应该在绑定的安全组上配置规则

**正确的解决方法：**

1. 查看实例详情，确认绑定的安全组 ID
2. 在该安全组的入方向添加入站规则
3. 等待几秒钟让规则生效

**为什么第一次没想到：**

1. 没有确认实例到底绑定了哪个安全组
2. 看到有多个安全组就随便配了一个
3. 应该先执行 `curl http://100.100.100.200/latest/meta-data/security-groups/` 查看绑定的安全组

---

## ✅ 三、最终成功方案：PM2 部署

### 3.1 部署步骤

```bash
# 1. 进入项目目录
cd /root/self-first-langchain-claude-agent/web-chat

# 2. 确保 .env.local 文件存在且正确
cat .env.local

# 3. 构建项目
npm run build

# 4. 安装 PM2
npm install -g pm2

# 5. 用 PM2 启动
pm2 start npm --name "web-chat" -- start

# 6. 设置开机自启
pm2 startup
pm2 save

# 7. 查看状态
pm2 status

# 8. 查看日志
pm2 logs web-chat
```

### 3.2 PM2 常用命令速查

| 命令                    | 作用             |
| ----------------------- | ---------------- |
| `pm2 start <cmd>`       | 启动应用         |
| `pm2 stop <id/name>`    | 停止应用         |
| `pm2 restart <id/name>` | 重启应用         |
| `pm2 delete <id/name>`  | 删除应用         |
| `pm2 status`            | 查看所有应用状态 |
| `pm2 logs <name>`       | 查看应用日志     |
| `pm2 save`              | 保存当前进程列表 |
| `pm2 startup`           | 配置开机自启     |

---

## 📊 四、问题对比总结

| 问题          | 第一次想法     | 为什么错                | 正确方法                        |
| ------------- | -------------- | ----------------------- | ------------------------------- |
| Docker 镜像慢 | 配置镜像加速器 | 加速器对 docker.io 无效 | 改用 PM2，避免拉镜像            |
| TS 类型错误   | 注释代码       | 影响功能完整性          | 添加类型断言 `(result as any)`  |
| 测试文件报错  | 没发现         | 没检查所有错误源        | 在 tsconfig.json 中排除测试文件 |
| 端口占用      | pkill npm      | 不够精确                | fuser -k 3001/tcp               |
| 环境变量无效  | 重启服务       | 没理解构建机制          | 先 build 再 start               |
| 安全组错误    | 配第一个安全组 | 没确认绑定的安全组      | 查看实例绑定的安全组 ID         |

---

## 💡 五、经验教训

### 5.1 技术层面

1. **先了解机制，再动手**
   - 下次遇到类似问题，先查官方文档
   - 了解 Next.js 的构建和运行时区别

2. **系统性的排查思路**
   - 先看错误日志，定位问题范围
   - 逐步缩小问题，而不是盲目尝试

3. **掌握基础工具**
   - Linux 进程管理：`ps`, `lsof`, `fuser`, `pkill`
   - 网络诊断：`curl`, `netstat`
   - 日志查看：`tail`, `journalctl`

### 5.2 方法论层面

1. **不要重复犯错**
   - 把问题和解决方法记录下来
   - 建立自己的知识库

2. **选择合适方案**
   - 不是越"正统"越好，适合才是最好
   - PM2 虽然不如 Docker 隔离性好，但对于简单项目足够

3. **预留时间余量**
   - Docker 构建预计 30 分钟，实际可能更久
   - 重要部署要预留充足的调试时间

---

## 🔗 六、参考链接

- [Next.js 环境变量文档](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [PM2 官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [阿里云安全组配置](https://help.aliyun.com/document_detail/24606.html)
- [Docker 镜像加速器配置](https://cr.console.aliyun.com/cn-beijing/instances/mirrors)

---

_文档最后更新时间：2026 年 3 月 30 日_
