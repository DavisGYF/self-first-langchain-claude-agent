# OCR系统部署指南

## 🚀 快速开始

### 前提条件
- 阿里云服务器（推荐2核4G配置）
- Docker和Docker Compose已安装
- 域名（可选，用于HTTPS）
- SSL证书（可选，用于HTTPS）

### 部署步骤

#### 1. 服务器准备

```bash
# 登录阿里云服务器
ssh root@your-server-ip

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
sudo apt install docker.io docker-compose -y

# 添加用户到docker组（避免每次使用sudo）
sudo usermod -aG docker $USER
newgrp docker  # 刷新组权限
```

#### 2. 上传项目文件

```bash
# 在本地打包项目
tar -czf ocr-project.tar.gz . --exclude='node_modules' --exclude='.next'

# 上传到服务器
scp ocr-project.tar.gz root@your-server-ip:/home/

# 在服务器上解压
ssh root@your-server-ip
cd /home
mkdir ocr-app && tar -xzf ocr-project.tar.gz -C ocr-app
cd ocr-app
```

#### 3. 配置环境变量

```bash
# 复制生产环境配置
cp .env.production .env.local

# 编辑配置（根据需要修改）
nano .env.local
```

#### 4. 构建和启动

```bash
# 方法1：直接使用Docker
sudo docker build -t ocr-app .
sudo docker run -d -p 3000:3000 --name ocr-app ocr-app

# 方法2：使用Docker Compose（推荐）
sudo docker-compose up -d

# 查看运行状态
sudo docker ps
sudo docker-compose ps
```

## 🔧 详细配置

### Docker配置说明

#### Dockerfile
- **基础镜像**: node:18-alpine（轻量级）
- **构建阶段**: 分离构建和运行环境
- **安全性**: 使用非root用户运行
- **健康检查**: 自动监控服务状态

#### docker-compose.yml
- **端口映射**: 3000:3000
- **自动重启**: 服务异常时自动重启
- **资源限制**: 内存限制512M
- **健康检查**: 30秒间隔监控

### Nginx配置说明

#### 主要功能
- **反向代理**: 负载均衡和请求转发
- **SSL支持**: HTTPS加密传输
- **Gzip压缩**: 提升传输效率
- **静态缓存**: 优化静态资源加载
- **安全头**: 增强安全性

#### 关键配置项
```nginx
client_max_body_size 10M;  # 限制上传文件大小
proxy_read_timeout 60s;     # API超时设置
expires 1y;                 # 静态资源缓存
```

## 🌐 域名和SSL配置

### 域名解析
1. 登录阿里云控制台
2. 进入域名解析页面
3. 添加A记录：`@ -> 服务器IP`
4. 添加www记录：`www -> 服务器IP`

### SSL证书申请
```bash
# 使用Let's Encrypt免费证书
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# 证书路径
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 证书配置
```bash
# 创建证书目录
mkdir -p ssl

# 复制证书（需要root权限）
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# 设置权限
chmod 600 ssl/*.pem
chown $USER:$USER ssl/*.pem
```

## 📊 监控和维护

### 查看日志
```bash
# Docker日志
sudo docker logs ocr-app
sudo docker logs ocr-app --tail 100 -f

# Docker Compose日志
docker-compose logs -f
docker-compose logs -f ocr-app

# Nginx日志（如果使用了Nginx）
sudo docker-compose logs -f nginx
```

### 服务管理
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建
docker-compose up -d --build

# 查看服务状态
docker-compose ps
```

### 健康检查
```bash
# 检查应用健康状态
curl -f http://localhost:3000/api/ocr/server-tesseract || echo "服务异常"

# 检查容器状态
docker ps --filter "name=ocr-app"

# 检查资源使用
docker stats ocr-app
```

## 🔄 更新和升级

### 代码更新
```bash
# 1. 上传新代码
scp -r ./* root@your-server-ip:/home/ocr-app/

# 2. 重新构建并部署
cd /home/ocr-app
docker-compose down
docker-compose up -d --build

# 3. 验证更新
curl -f http://localhost:3000 || echo "更新失败"
```

### 数据库迁移（如果需要）
```bash
# 进入容器
docker exec -it ocr-app /bin/bash

# 运行迁移命令
npm run migrate
```

## 🚨 故障排除

### 常见问题

#### 1. 端口冲突
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000

# 释放端口
sudo kill -9 <PID>
```

#### 2. 内存不足
```bash
# 查看内存使用
free -h

# 增加交换空间
dd if=/dev/zero of=/swapfile bs=1G count=2
mkswap /swapfile
swapon /swapfile
```

#### 3. 构建失败
```bash
# 清理缓存
docker system prune -a

# 重新构建
docker-compose build --no-cache
```

#### 4. 网络问题
```bash
# 检查网络连接
ping google.com

# 检查DNS
nslookup google.com

# 重启网络服务
sudo systemctl restart networking
```

### 性能优化

#### 1. 调整Docker资源限制
```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

#### 2. Nginx性能优化
```nginx
# 增加工作进程
worker_processes auto;
worker_rlimit_nofile 65536;

# 优化连接数
events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}
```

#### 3. Node.js优化
```bash
# 设置Node.js参数
NODE_OPTIONS="--max-old-space-size=1024"
```

## 📈 监控指标

### 关键监控点
- **服务可用性**: HTTP状态码200
- **响应时间**: API响应<3秒
- **错误率**: <1%
- **资源使用**: CPU<80%, 内存<80%

### 监控命令
```bash
# 服务状态
docker-compose ps

# 资源使用
docker stats

# 日志监控
docker-compose logs -f --tail=50

# 网络连接
netstat -an | grep :3000 | wc -l
```

## 🔒 安全建议

### 1. 服务器安全
- 定期更新系统和软件
- 配置防火墙规则
- 使用强密码策略
- 定期备份数据

### 2. 应用安全
- 使用HTTPS加密传输
- 限制文件上传类型和大小
- 配置CORS策略
- 定期更新依赖包

### 3. Docker安全
- 使用非root用户运行容器
- 定期更新基础镜像
- 扫描镜像漏洞
- 限制容器权限

## 📞 支持

### 获取帮助
1. 查看应用日志：`docker-compose logs -f`
2. 检查系统状态：`docker-compose ps`
3. 验证网络连接：`curl -f http://localhost:3000`

### 紧急恢复
```bash
# 快速重启
docker-compose restart

# 回滚到之前版本
docker-compose down
docker-compose up -d --force-recreate

# 清理并重新部署
docker-compose down -v
docker-compose up -d --build
```

## 🎯 总结

您的OCR系统现在可以安全地部署到阿里云服务器了！部署完成后：

1. **访问地址**: `http://your-domain.com` 或 `http://server-ip:3000`
2. **功能验证**: 上传图片测试OCR识别
3. **性能监控**: 观察资源使用和服务状态
4. **定期维护**: 更新代码和监控系统健康

**祝您部署顺利！** 🚀