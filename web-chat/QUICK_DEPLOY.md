# 🚀 OCR项目快速部署指南

## 🎯 目标
在同一个阿里云服务器上部署第二个OCR项目，实现：
- 项目1：http://服务器IP:3000
- 项目2：http://服务器IP:3001

## 📋 准备工作

### 您需要的条件：
- ✅ 阿里云服务器（已有）
- ✅ 服务器IP地址（已知）
- ✅ 服务器root密码（已知）
- ✅ 项目代码在GitHub上（已有）

## 🛠️ 部署步骤

### 方法1：使用一键部署脚本（推荐）

#### 第1步：给脚本执行权限
```bash
chmod +x deploy-to-server.sh
```

#### 第2步：运行部署脚本
```bash
# 替换 YOUR_SERVER_IP 为您的实际服务器IP
./deploy-to-server.sh YOUR_SERVER_IP

# 例如：
./deploy-to-server.sh 123.123.123.123
```

#### 第3步：等待部署完成
脚本会自动完成以下操作：
- ✅ 在服务器上创建项目目录
- ✅ 克隆GitHub代码
- ✅ 复制配置文件
- ✅ 构建Docker镜像
- ✅ 启动服务
- ✅ 显示访问地址

#### 第4步：测试访问
部署完成后，您可以通过以下地址访问：
- 项目1：http://您的服务器IP:3000
- 项目2：http://您的服务器IP:3001 ✨

### 方法2：手动部署（如果您更喜欢手动操作）

#### 第1步：连接到服务器
```bash
ssh root@您的服务器IP
```

#### 第2步：创建第二个项目目录
```bash
cd /home
mkdir ocr-project-2
cd ocr-project-2
```

#### 第3步：克隆代码
```bash
git clone https://github.com/air/self-firstAgent.git .
```

#### 第4步：上传配置文件
```bash
# 在您的电脑上执行（不是在服务器上）
scp docker-compose-2.yml root@您的服务器IP:/home/ocr-project-2/
scp .env.production root@您的服务器IP:/home/ocr-project-2/.env.local
```

#### 第5步：构建和运行
```bash
cd /home/ocr-project-2
sudo docker-compose -f docker-compose-2.yml build
sudo docker-compose -f docker-compose-2.yml up -d
sudo docker-compose -f docker-compose-2.yml ps
```

## 🔧 管理命令

### 查看服务状态
```bash
# 查看第二个项目状态
ssh root@您的服务器IP "cd /home/ocr-project-2 && sudo docker-compose -f docker-compose-2.yml ps"

# 查看第二个项目日志
ssh root@您的服务器IP "cd /home/ocr-project-2 && sudo docker-compose -f docker-compose-2.yml logs -f"
```

### 服务管理
```bash
# 停止第二个项目
ssh root@您的服务器IP "cd /home/ocr-project-2 && sudo docker-compose -f docker-compose-2.yml down"

# 重启第二个项目
ssh root@您的服务器IP "cd /home/ocr-project-2 && sudo docker-compose -f docker-compose-2.yml restart ocr-app-2"

# 重新构建第二个项目
ssh root@您的服务器IP "cd /home/ocr-project-2 && sudo docker-compose -f docker-compose-2.yml up -d --build"
```

## 📊 监控和维护

### 检查两个项目的状态
```bash
# 检查项目1（假设在3000端口）
curl -f http://您的服务器IP:3000 || echo "项目1异常"

# 检查项目2（在3001端口）
curl -f http://您的服务器IP:3001 || echo "项目2异常"
```

### 查看Docker容器
```bash
# 查看所有运行的容器
ssh root@您的服务器IP "sudo docker ps"

# 查看容器资源使用
ssh root@您的服务器IP "sudo docker stats"
```

## 🚨 故障排除

### 问题1：端口冲突
```bash
# 检查端口是否被占用
ssh root@您的服务器IP "netstat -tlnp | grep :3001"

# 如果被占用，可以修改docker-compose-2.yml中的端口
```

### 问题2：构建失败
```bash
# 清理Docker缓存
ssh root@您的服务器IP "sudo docker system prune -a"

# 重新构建
ssh root@您的服务器IP "cd /home/ocr-project-2 && sudo docker-compose -f docker-compose-2.yml build --no-cache"
```

### 问题3：服务无法访问
```bash
# 检查防火墙设置
ssh root@您的服务器IP "sudo ufw status"

# 开放3001端口
ssh root@您的服务器IP "sudo ufw allow 3001"
```

## 🎯 总结

现在您有了两个独立的OCR项目：
- **项目1**: 3000端口（您原来的项目）
- **项目2**: 3001端口（新部署的项目）

两个项目完全独立，互不影响，可以分别管理和维护！

**推荐使用一键部署脚本，简单快捷！** 🚀